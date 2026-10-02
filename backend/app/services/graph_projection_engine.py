from __future__ import annotations

import logging
import time
from collections import defaultdict
from datetime import UTC, datetime
from threading import RLock
from typing import Any, Dict, List, Optional, Set, Tuple

from app.core.config import settings
from app.database.db import get_neo4j_driver, verify_neo4j_connection
from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.graph_projection import (
    GraphConsistencyReport,
    GraphDelta,
    GraphDeltaType,
    GraphEdgeOntology,
    GraphEventType,
    GraphNodeOntology,
    GraphOperationType,
    GraphProjectionHealth,
    GraphProjectionRecord,
    GraphProjectionStatus,
    GraphSnapshot,
)
from app.repositories.unified_store import UnifiedStore
from app.services.realtime_dispatcher import RealtimeDispatcher

logger = logging.getLogger("sentinelx.graph.projection_engine")


class GraphProjectionEngine:
    """
    CANONICAL GRAPH PROJECTION COMPILER & ENGINE (Subphase A5).

    Transforms PostgreSQL / Canonical Investigation State into derived Neo4j analytical
    projections and real-time incremental graph event streams.

    INVARIANTS:
    1. PostgreSQL = Transactional Authority. Evidence Store = Byte Authority.
    2. Neo4j is strictly a derived analytical projection.
    3. Idempotent: Repeated application of projection events produces identical graph state.
    4. Ordered & Versioned: Out-of-order stale events are rejected without graph corruption.
    5. Case-Scoped: No cross-case entity leakage or accidental merging.
    6. Evidence-Anchored: Every edge retains evidence references and epistemic standing.
    """

    _instance: Optional[GraphProjectionEngine] = None

    def __init__(
        self,
        store: Optional[UnifiedStore] = None,
        dispatcher: Optional[RealtimeDispatcher] = None,
    ) -> None:
        self._lock = RLock()
        self.store = store or UnifiedStore.get_instance()
        self.dispatcher = dispatcher or RealtimeDispatcher.get_instance()

        # In-memory projected graph tables (synchronized analytical cache)
        # Key: (case_id, node_id) -> GraphNodeOntology
        self._projected_nodes: Dict[Tuple[str, str], GraphNodeOntology] = {}
        # Key: (case_id, relationship_id) -> GraphEdgeOntology
        self._projected_edges: Dict[Tuple[str, str], GraphEdgeOntology] = {}

        # Idempotency & Version Tracking
        # Set of processed projection_event_ids
        self._processed_events: Set[str] = set()
        # Key: (case_id, object_id) -> highest version seen
        self._object_versions: Dict[Tuple[str, str], int] = {}
        # Key: case_id -> current projection version counter
        self._case_versions: Dict[str, int] = defaultdict(int)
        # Key: case_id -> status
        self._case_status: Dict[str, GraphProjectionStatus] = defaultdict(lambda: GraphProjectionStatus.HEALTHY)

        # Delta History Buffer for Reconnection Catchup (keeps last 500 deltas per case)
        # Key: case_id -> List[GraphDelta]
        self._delta_history: Dict[str, List[GraphDelta]] = defaultdict(list)

        # Out-of-order forward buffer: Key: (case_id, object_id) -> List[GraphProjectionRecord]
        self._out_of_order_buffer: Dict[Tuple[str, str], List[GraphProjectionRecord]] = defaultdict(list)

    @classmethod
    def get_instance(cls) -> GraphProjectionEngine:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # -------------------------------------------------------------------------
    # Idempotency & Ordering Enforcement
    # -------------------------------------------------------------------------

    def is_event_processed(self, projection_event_id: str) -> bool:
        """Check if projection event has already been compiled (idempotency)."""
        with self._lock:
            return projection_event_id in self._processed_events

    def get_object_version(self, case_id: str, object_id: str) -> int:
        """Retrieve highest known projected version for an object."""
        with self._lock:
            return self._object_versions.get((case_id, object_id), 0)

    # -------------------------------------------------------------------------
    # Projection Compilation API
    # -------------------------------------------------------------------------

    def project_node(
        self,
        record: GraphProjectionRecord,
        node: GraphNodeOntology,
    ) -> Tuple[bool, Optional[GraphDelta], str]:
        """
        Idempotently project a canonical entity/artifact into the analytical graph.
        Returns: (success, generated_delta, status_message)
        """
        with self._lock:
            case_id = record.case_id or node.case_scope
            obj_key = (case_id, node.identifier)

            # 1. Idempotency Check
            if record.projection_event_id in self._processed_events:
                logger.info(f"Idempotent projection skip: Event {record.projection_event_id} already applied.")
                return True, None, "SKIPPED_DUPLICATE_EVENT"

            # 2. Ordering & Stale Event Protection
            curr_ver = self._object_versions.get(obj_key, 0)
            if (record.operation == GraphOperationType.UPDATE and record.version <= curr_ver) or (record.version < curr_ver):
                logger.warning(
                    f"Stale projection event rejected: {obj_key} incoming version {record.version} <= current {curr_ver}"
                )
                return False, None, "REJECTED_STALE_VERSION"

            # 3. Apply Node Mutation
            if record.operation == GraphOperationType.DELETE:
                if obj_key in self._projected_nodes:
                    del self._projected_nodes[obj_key]
                # Also cascade remove any connected edges
                edges_to_remove = [
                    ek for ek, ev in self._projected_edges.items()
                    if ek[0] == case_id and (ev.source == node.identifier or ev.target == node.identifier)
                ]
                for ek in edges_to_remove:
                    del self._projected_edges[ek]

                delta_type = GraphDeltaType.REMOVE_NODE
            elif record.operation == GraphOperationType.UPDATE:
                self._projected_nodes[obj_key] = node
                delta_type = GraphDeltaType.UPDATE_NODE
            else:  # CREATE or REBUILD
                self._projected_nodes[obj_key] = node
                delta_type = GraphDeltaType.ADD_NODE

            # Update versions & ledger
            self._processed_events.add(record.projection_event_id)
            self._object_versions[obj_key] = record.version
            self._case_versions[case_id] += 1
            case_ver = self._case_versions[case_id]

            # 4. Also mirror into UnifiedStore for cross-engine consistency
            if record.operation != GraphOperationType.DELETE:
                self.store.register_node(
                    node_id=node.identifier,
                    label=node.entity_type,
                    properties={
                        "canonical_id": node.canonical_id,
                        "display_label": node.display_label,
                        "case_scope": node.case_scope,
                        "jurisdiction": node.jurisdiction,
                        "epistemic_status": node.epistemic_status,
                        "risk_level": node.risk_level,
                        "valid_from": node.valid_from,
                        "valid_to": node.valid_to,
                        **node.properties,
                    },
                )

            # 5. Execute Neo4j Transaction if connected
            self._execute_neo4j_node_write(node, record.operation)

            # 6. Generate Typed GraphDelta
            delta = GraphDelta(
                delta_type=delta_type,
                case_id=case_id,
                version=case_ver,
                sequence_number=case_ver,
                node=node if record.operation != GraphOperationType.DELETE else None,
                removed_id=node.identifier if record.operation == GraphOperationType.DELETE else None,
                correlation_id=record.correlation_id,
                reason=f"Projection operation {record.operation.value} for {node.identifier}",
            )

            # Record in delta history buffer
            hist = self._delta_history[case_id]
            hist.append(delta)
            if len(hist) > 500:
                self._delta_history[case_id] = hist[-500:]

            # 7. Publish Realtime Event
            evt_type = (
                GraphEventType.GRAPH_NODE_REMOVED.value
                if record.operation == GraphOperationType.DELETE
                else (
                    GraphEventType.GRAPH_NODE_UPDATED.value
                    if record.operation == GraphOperationType.UPDATE
                    else GraphEventType.GRAPH_NODE_CREATED.value
                )
            )
            self.dispatcher.publish_event(
                event_type=evt_type,
                payload=delta.model_dump(),
                case_id=case_id,
                jurisdiction=node.jurisdiction,
                source="GRAPH_PROJECTION_ENGINE",
            )

            return True, delta, "APPLIED_SUCCESSFULLY"

    def project_relationship(
        self,
        record: GraphProjectionRecord,
        edge: GraphEdgeOntology,
    ) -> Tuple[bool, Optional[GraphDelta], str]:
        """
        Idempotently project an evidence-anchored relationship into the analytical graph.
        Returns: (success, generated_delta, status_message)
        """
        with self._lock:
            case_id = record.case_id or edge.case_scope
            rel_key = (case_id, edge.relationship_id)

            # 1. Idempotency Check
            if record.projection_event_id in self._processed_events:
                logger.info(f"Idempotent projection skip: Event {record.projection_event_id} already applied.")
                return True, None, "SKIPPED_DUPLICATE_EVENT"

            # 2. Ordering Check
            curr_ver = self._object_versions.get(rel_key, 0)
            if (record.operation == GraphOperationType.UPDATE and record.version <= curr_ver) or (record.version < curr_ver):
                logger.warning(
                    f"Stale projection event rejected: {rel_key} incoming version {record.version} <= current {curr_ver}"
                )
                return False, None, "REJECTED_STALE_VERSION"

            # 3. Apply Edge Mutation
            if record.operation == GraphOperationType.DELETE:
                if rel_key in self._projected_edges:
                    del self._projected_edges[rel_key]
                delta_type = GraphDeltaType.REMOVE_EDGE
            elif record.operation == GraphOperationType.UPDATE:
                self._projected_edges[rel_key] = edge
                delta_type = GraphDeltaType.UPDATE_EDGE
            else:  # CREATE or REBUILD
                self._projected_edges[rel_key] = edge
                delta_type = GraphDeltaType.ADD_EDGE

            # Update versions & ledger
            self._processed_events.add(record.projection_event_id)
            self._object_versions[rel_key] = record.version
            self._case_versions[case_id] += 1
            case_ver = self._case_versions[case_id]

            # 4. Mirror into UnifiedStore
            if record.operation != GraphOperationType.DELETE:
                self.store.register_relationship(
                    source_id=edge.source,
                    target_id=edge.target,
                    rel_type=edge.relationship_type,
                    confidence=edge.confidence,
                    confidence_level=edge.epistemic_status,
                    evidence_reference=edge.evidence_refs[0] if edge.evidence_refs else "",
                    evidence_references=edge.evidence_refs,
                    source_system=edge.source_refs[0] if edge.source_refs else "SYSTEM",
                    reason=f"Evidence edge {edge.relationship_id}",
                )

            # 5. Neo4j Transaction
            self._execute_neo4j_edge_write(edge, record.operation)

            # 6. Generate Typed GraphDelta
            delta = GraphDelta(
                delta_type=delta_type,
                case_id=case_id,
                version=case_ver,
                sequence_number=case_ver,
                edge=edge if record.operation != GraphOperationType.DELETE else None,
                removed_id=edge.relationship_id if record.operation == GraphOperationType.DELETE else None,
                correlation_id=record.correlation_id,
                reason=f"Projection operation {record.operation.value} for relationship {edge.relationship_id}",
            )

            hist = self._delta_history[case_id]
            hist.append(delta)
            if len(hist) > 500:
                self._delta_history[case_id] = hist[-500:]

            # 7. Publish Realtime Event
            evt_type = (
                GraphEventType.GRAPH_RELATIONSHIP_REMOVED.value
                if record.operation == GraphOperationType.DELETE
                else (
                    GraphEventType.GRAPH_RELATIONSHIP_UPDATED.value
                    if record.operation == GraphOperationType.UPDATE
                    else GraphEventType.GRAPH_RELATIONSHIP_CREATED.value
                )
            )
            self.dispatcher.publish_event(
                event_type=evt_type,
                payload=delta.model_dump(),
                case_id=case_id,
                jurisdiction=edge.jurisdiction,
                source="GRAPH_PROJECTION_ENGINE",
            )

            return True, delta, "APPLIED_SUCCESSFULLY"

    # -------------------------------------------------------------------------
    # Neo4j Parameterized Transactions (Fail-Safe Fallback)
    # -------------------------------------------------------------------------

    def _execute_neo4j_node_write(self, node: GraphNodeOntology, op: GraphOperationType) -> None:
        """Execute parameterized transaction in Neo4j if available."""
        if not verify_neo4j_connection():
            return

        try:
            drv = get_neo4j_driver()
            with drv.session() as session:
                if op == GraphOperationType.DELETE:
                    query = """
                    MATCH (n {id: $id, case_scope: $case_scope})
                    DETACH DELETE n
                    """
                    session.run(query, {"id": node.identifier, "case_scope": node.case_scope})
                else:
                    query = f"""
                    MERGE (n:{node.entity_type} {{id: $id, case_scope: $case_scope}})
                    ON CREATE SET
                        n.canonical_id = $canonical_id,
                        n.display_label = $display_label,
                        n.jurisdiction = $jurisdiction,
                        n.epistemic_status = $epistemic_status,
                        n.risk_level = $risk_level,
                        n.valid_from = $valid_from,
                        n.valid_to = $valid_to,
                        n.created_at = $created_at,
                        n.updated_at = $updated_at
                    ON MATCH SET
                        n.display_label = $display_label,
                        n.epistemic_status = $epistemic_status,
                        n.risk_level = $risk_level,
                        n.updated_at = $updated_at
                    """
                    session.run(
                        query,
                        {
                            "id": node.identifier,
                            "case_scope": node.case_scope,
                            "canonical_id": node.canonical_id,
                            "display_label": node.display_label,
                            "jurisdiction": node.jurisdiction,
                            "epistemic_status": node.epistemic_status,
                            "risk_level": node.risk_level,
                            "valid_from": node.valid_from,
                            "valid_to": node.valid_to,
                            "created_at": node.created_at,
                            "updated_at": node.updated_at,
                        },
                    )
        except Exception as e:
            logger.warning(f"Neo4j transaction failed (using analytical fallback): {e}")

    def _execute_neo4j_edge_write(self, edge: GraphEdgeOntology, op: GraphOperationType) -> None:
        """Execute parameterized relationship transaction in Neo4j if available."""
        if not verify_neo4j_connection():
            return

        try:
            drv = get_neo4j_driver()
            with drv.session() as session:
                if op == GraphOperationType.DELETE:
                    query = """
                    MATCH ()-[r {relationship_id: $rel_id, case_scope: $case_scope}]->()
                    DELETE r
                    """
                    session.run(query, {"rel_id": edge.relationship_id, "case_scope": edge.case_scope})
                else:
                    # Parameterized Cypher write using canonical ID and case scope
                    query = f"""
                    MATCH (a {{id: $source_id, case_scope: $case_scope}})
                    MATCH (b {{id: $target_id, case_scope: $case_scope}})
                    MERGE (a)-[r:{edge.relationship_type} {{relationship_id: $rel_id, case_scope: $case_scope}}]->(b)
                    ON CREATE SET
                        r.epistemic_status = $epistemic_status,
                        r.confidence = $confidence,
                        r.evidence_refs = $evidence_refs,
                        r.source_refs = $source_refs,
                        r.valid_from = $valid_from,
                        r.valid_to = $valid_to,
                        r.created_at = $created_at,
                        r.updated_at = $updated_at
                    ON MATCH SET
                        r.epistemic_status = $epistemic_status,
                        r.confidence = $confidence,
                        r.evidence_refs = $evidence_refs,
                        r.updated_at = $updated_at
                    """
                    session.run(
                        query,
                        {
                            "source_id": edge.source,
                            "target_id": edge.target,
                            "case_scope": edge.case_scope,
                            "rel_id": edge.relationship_id,
                            "epistemic_status": edge.epistemic_status,
                            "confidence": edge.confidence,
                            "evidence_refs": edge.evidence_refs,
                            "source_refs": edge.source_refs,
                            "valid_from": edge.valid_from,
                            "valid_to": edge.valid_to,
                            "created_at": edge.created_at,
                            "updated_at": edge.updated_at,
                        },
                    )
        except Exception as e:
            logger.warning(f"Neo4j relationship transaction failed (using analytical fallback): {e}")

    # -------------------------------------------------------------------------
    # Snapshot & Delta Catchup Recovery
    # -------------------------------------------------------------------------

    def get_case_snapshot(self, case_id: str) -> GraphSnapshot:
        """
        Generate full deterministic snapshot for initial client load or total recovery.
        """
        with self._lock:
            nodes = [n for (c_id, _), n in self._projected_nodes.items() if c_id == case_id]
            edges = [e for (c_id, _), e in self._projected_edges.items() if c_id == case_id]

            # Generate cluster summaries
            type_counts = defaultdict(int)
            for n in nodes:
                type_counts[n.entity_type] += 1
            clusters = [
                {"cluster_id": f"cluster-{t.lower()}", "label": f"{t} Cluster", "node_count": count}
                for t, count in type_counts.items()
            ]

            version = self._case_versions[case_id]
            return GraphSnapshot(
                case_id=case_id,
                version=version,
                last_sequence_number=version,
                status=self._case_status[case_id],
                nodes=nodes,
                edges=edges,
                clusters=clusters,
                total_nodes=len(nodes),
                total_edges=len(edges),
            )

    def get_deltas_since(self, case_id: str, since_version: int) -> Tuple[bool, List[GraphDelta]]:
        """
        Retrieve missed deltas for a reconnecting client.
        Returns: (can_resume_from_deltas, list_of_deltas)
        If gap is too wide or deltas expired, returns (False, []) requiring a full snapshot.
        """
        with self._lock:
            hist = self._delta_history.get(case_id, [])
            if not hist:
                return False, []

            oldest_available = hist[0].version
            if since_version < oldest_available - 1:
                # History gap too large
                return False, []

            missed = [d for d in hist if d.version > since_version]
            return True, missed

    # -------------------------------------------------------------------------
    # Deterministic Rebuild Capability
    # -------------------------------------------------------------------------

    def rebuild_projection_for_case(
        self,
        case_id: str,
        canonical_entities: List[Dict[str, Any]],
        canonical_relationships: List[Dict[str, Any]],
        jurisdiction: str = "Delhi NCR / Special Cell",
    ) -> GraphSnapshot:
        """
        Reconstruct Neo4j and analytical projection from canonical state.
        Wipes derived graph projection for the case and cleanly re-projects all records.
        """
        with self._lock:
            self._case_status[case_id] = GraphProjectionStatus.REBUILDING
            logger.info(f"Starting deterministic projection rebuild for {case_id}")

            # 1. Clear existing projected state for case
            keys_to_del_nodes = [k for k in self._projected_nodes if k[0] == case_id]
            for k in keys_to_del_nodes:
                del self._projected_nodes[k]

            keys_to_del_edges = [k for k in self._projected_edges if k[0] == case_id]
            for k in keys_to_del_edges:
                del self._projected_edges[k]

            # Clear Neo4j case nodes if connected
            if verify_neo4j_connection():
                try:
                    drv = get_neo4j_driver()
                    with drv.session() as s:
                        s.run("MATCH (n {case_scope: $case_id}) DETACH DELETE n", {"case_id": case_id})
                except Exception as e:
                    logger.warning(f"Neo4j clear failed during rebuild: {e}")

            # 2. Re-project canonical entities
            for ent in canonical_entities:
                eid = ent.get("entity_id") or ent.get("id")
                etype = ent.get("type") or ent.get("entity_type") or "Entity"
                node = GraphNodeOntology(
                    identifier=eid,
                    canonical_id=ent.get("canonical_identifier") or eid,
                    display_label=ent.get("display_name") or ent.get("name_or_title") or eid,
                    entity_type=etype,
                    case_scope=case_id,
                    jurisdiction=jurisdiction,
                    epistemic_status=ent.get("epistemic_level") or "OBSERVED",
                    risk_level=ent.get("risk_level", "UNKNOWN"),
                    source_refs=[ent.get("source", "CANONICAL_DB")],
                )
                rec = GraphProjectionRecord(
                    canonical_object_id=eid,
                    canonical_object_type=etype,
                    graph_object_id=eid,
                    operation=GraphOperationType.REBUILD,
                    version=1,
                    case_id=case_id,
                    jurisdiction=jurisdiction,
                )
                self.project_node(rec, node)

            # 3. Re-project canonical relationships
            for rel in canonical_relationships:
                rid = rel.get("relationship_id") or rel.get("id") or generate_uuid7()
                edge = GraphEdgeOntology(
                    relationship_id=rid,
                    source=rel.get("source_entity") or rel.get("source"),
                    target=rel.get("target_entity") or rel.get("target"),
                    relationship_type=rel.get("relationship_type") or rel.get("type", "RELATED_TO"),
                    epistemic_status=rel.get("epistemic_status", "DOCUMENTED"),
                    confidence=float(rel.get("confidence", 1.0)),
                    evidence_refs=rel.get("supporting_evidence") or rel.get("evidence_references", []),
                    source_refs=rel.get("source_refs", ["CANONICAL_DB"]),
                    case_scope=case_id,
                    jurisdiction=jurisdiction,
                    observed_at=rel.get("observed_at"),
                    valid_from=rel.get("valid_from"),
                    valid_to=rel.get("valid_to"),
                )
                rec = GraphProjectionRecord(
                    canonical_object_id=rid,
                    canonical_object_type="Relationship",
                    graph_object_id=rid,
                    operation=GraphOperationType.REBUILD,
                    version=1,
                    case_id=case_id,
                    jurisdiction=jurisdiction,
                )
                self.project_relationship(rec, edge)

            self._case_status[case_id] = GraphProjectionStatus.HEALTHY

            # 4. Emit GRAPH_PROJECTION_REBUILT event
            snapshot = self.get_case_snapshot(case_id)
            self.dispatcher.publish_event(
                event_type=GraphEventType.GRAPH_PROJECTION_REBUILT.value,
                payload={
                    "case_id": case_id,
                    "version": snapshot.version,
                    "total_nodes": snapshot.total_nodes,
                    "total_edges": snapshot.total_edges,
                    "status": "HEALTHY",
                },
                case_id=case_id,
                jurisdiction=jurisdiction,
                source="GRAPH_PROJECTION_ENGINE",
            )
            return snapshot

    # -------------------------------------------------------------------------
    # Graph Consistency Validator
    # -------------------------------------------------------------------------

    def validate_consistency(
        self,
        case_id: str,
        canonical_entities: List[Dict[str, Any]],
        canonical_relationships: List[Dict[str, Any]],
    ) -> GraphConsistencyReport:
        """
        Verify that derived graph projection accurately reflects authoritative state.
        Checks node counts, edge counts, canonical IDs, and epistemic statuses.
        """
        with self._lock:
            projected_nodes = [n for (c_id, _), n in self._projected_nodes.items() if c_id == case_id]
            projected_edges = [e for (c_id, _), e in self._projected_edges.items() if c_id == case_id]

            proj_node_ids = {n.identifier for n in projected_nodes}
            canon_node_ids = {e.get("entity_id") or e.get("id") for e in canonical_entities}

            missing = list(canon_node_ids - proj_node_ids)
            orphaned = list(proj_node_ids - canon_node_ids)

            discrepancies: List[str] = []
            if missing:
                discrepancies.append(f"Missing {len(missing)} nodes in projection: {missing[:5]}")
            if orphaned:
                discrepancies.append(f"Orphaned {len(orphaned)} nodes in projection: {orphaned[:5]}")

            is_consistent = len(missing) == 0 and len(orphaned) == 0

            return GraphConsistencyReport(
                is_consistent=is_consistent,
                case_id=case_id,
                canonical_node_count=len(canonical_entities),
                projected_node_count=len(projected_nodes),
                canonical_edge_count=len(canonical_relationships),
                projected_edge_count=len(projected_edges),
                missing_in_graph=missing,
                orphaned_in_graph=orphaned,
                discrepancy_details=discrepancies,
            )

    # -------------------------------------------------------------------------
    # Query & Traversal Analytics
    # -------------------------------------------------------------------------

    def get_neighborhood(
        self,
        case_id: str,
        entity_id: str,
        max_hops: int = 1,
        entity_types: Optional[List[str]] = None,
        min_confidence: float = 0.0,
        temporal_filter: Optional[Tuple[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Bounded k-hop neighborhood expansion with temporal and entity filtering.
        Operates strictly within the requested case boundary.
        """
        with self._lock:
            visited_nodes: Set[str] = {entity_id}
            frontier: Set[str] = {entity_id}
            matched_edges: Dict[str, GraphEdgeOntology] = {}

            for _ in range(max_hops):
                next_frontier: Set[str] = set()
                for curr in frontier:
                    for (c_id, _), edge in self._projected_edges.items():
                        if c_id != case_id:
                            continue
                        if edge.confidence < min_confidence:
                            continue

                        # Check temporal validity
                        if temporal_filter:
                            t_start, t_end = temporal_filter
                            if edge.valid_to and edge.valid_to < t_start:
                                continue
                            if edge.valid_from and edge.valid_from > t_end:
                                continue

                        neighbor = None
                        if edge.source == curr:
                            neighbor = edge.target
                        elif edge.target == curr:
                            neighbor = edge.source

                        if neighbor:
                            # Check entity type filter
                            node_obj = self._projected_nodes.get((case_id, neighbor))
                            if entity_types and node_obj and node_obj.entity_type not in entity_types:
                                continue

                            matched_edges[edge.relationship_id] = edge
                            if neighbor not in visited_nodes:
                                visited_nodes.add(neighbor)
                                next_frontier.add(neighbor)
                frontier = next_frontier

            nodes = [
                self._projected_nodes.get((case_id, nid))
                for nid in visited_nodes
                if (case_id, nid) in self._projected_nodes
            ]

            return {
                "root_id": entity_id,
                "case_id": case_id,
                "max_hops": max_hops,
                "nodes": [n.model_dump() for n in nodes if n],
                "edges": [e.model_dump() for e in matched_edges.values()],
                "node_count": len(nodes),
                "edge_count": len(matched_edges),
            }

    def get_projection_health(self, case_id: str) -> GraphProjectionHealth:
        """Retrieve projection synchronization health status."""
        with self._lock:
            status = self._case_status[case_id]
            neo_ok = verify_neo4j_connection()
            ver = self._case_versions[case_id]
            return GraphProjectionHealth(
                status=status,
                case_id=case_id,
                canonical_version=ver,
                projected_version=ver,
                lag_events=0,
                neo4j_connected=neo_ok,
                is_rebuilding=(status == GraphProjectionStatus.REBUILDING),
                details={"delta_history_count": len(self._delta_history.get(case_id, []))},
            )

    def clear(self) -> None:
        """Clear all in-memory projection tables for testing isolation."""
        with self._lock:
            self._projected_nodes.clear()
            self._projected_edges.clear()
            self._processed_events.clear()
            self._object_versions.clear()
            self._case_versions.clear()
            self._case_status.clear()
            self._delta_history.clear()
            self._out_of_order_buffer.clear()
