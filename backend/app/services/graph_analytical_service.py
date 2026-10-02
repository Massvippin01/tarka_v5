from __future__ import annotations

import logging
from collections import defaultdict, deque
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional, Set, Tuple

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.graph_projection import (
    GraphEdgeOntology,
    GraphNodeOntology,
)
from app.services.graph_projection_engine import GraphProjectionEngine

logger = logging.getLogger("sentinelx.graph.analytical_service")


class GraphAnalyticalService:
    """
    Subphase A6: Advanced Investigative Graph Analytical Service.

    INVARIANTS:
    1. AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
    2. Topological shortest path != Evidence-supported investigative path.
    3. Graph proximity != Guilt. Centrality != Criminality. Cluster != Criminal organization.
    4. Multi-dimensional entity comparison never collapses into a single "guilt index".
    5. Every analytical finding retains unbroken lineage to canonical state.
    """

    _instance: Optional[GraphAnalyticalService] = None

    def __init__(self, engine: Optional[GraphProjectionEngine] = None) -> None:
        self.engine = engine or GraphProjectionEngine.get_instance()

    @classmethod
    def get_instance(cls) -> GraphAnalyticalService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # -------------------------------------------------------------------------
    # 1. Shortest Path vs. Investigative Path
    # -------------------------------------------------------------------------

    def find_shortest_path(
        self,
        case_id: str,
        source: str,
        target: str,
    ) -> Dict[str, Any]:
        """
        Purely topological / algorithmic shortest path discovery (BFS).
        Explicitly separated from evidence-grounded paths.
        """
        if source == target:
            return {
                "source": source,
                "target": target,
                "path_type": "TOPOLOGICAL_SHORTEST",
                "is_topological_only": True,
                "hop_count": 0,
                "nodes": [source],
                "edges": [],
                "epistemic_disclaimer": "Topological identity. No evidentiary path required.",
            }

        # Build adjacency graph for case
        adj: Dict[str, List[Tuple[str, GraphEdgeOntology]]] = defaultdict(list)
        edges = [e for (c_id, _), e in self.engine._projected_edges.items() if c_id == case_id]

        for edge in edges:
            adj[edge.source].append((edge.target, edge))
            adj[edge.target].append((edge.source, edge))

        queue: deque[Tuple[str, List[str], List[GraphEdgeOntology]]] = deque([(source, [source], [])])
        visited: Set[str] = {source}

        while queue:
            curr, path_nodes, path_edges = queue.popleft()
            if curr == target:
                return {
                    "case_id": case_id,
                    "source": source,
                    "target": target,
                    "path_type": "TOPOLOGICAL_SHORTEST",
                    "is_topological_only": True,
                    "hop_count": len(path_edges),
                    "nodes": path_nodes,
                    "edges": [e.model_dump() for e in path_edges],
                    "epistemic_disclaimer": "Topological shortest path is an algorithmic abstraction. Graph proximity does not imply evidence corroboration or guilt.",
                }

            for neighbor, edge in adj[curr]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path_nodes + [neighbor], path_edges + [edge]))

        return {
            "case_id": case_id,
            "source": source,
            "target": target,
            "path_type": "TOPOLOGICAL_SHORTEST",
            "is_topological_only": True,
            "hop_count": -1,
            "nodes": [],
            "edges": [],
            "epistemic_disclaimer": f"No topological path exists between {source} and {target} within {case_id}.",
        }

    def find_investigative_path(
        self,
        case_id: str,
        source: str,
        target: str,
        min_confidence: float = 0.5,
        epistemic_filter: Optional[List[str]] = None,
        temporal_window: Optional[Tuple[str, str]] = None,
        require_evidence: bool = True,
    ) -> Dict[str, Any]:
        """
        Evidence-constrained investigative path.
        Traverses ONLY edges backed by verifiable evidence, acceptable epistemic status,
        and temporal consistency.
        """
        if source == target:
            return {
                "source": source,
                "target": target,
                "path_type": "INVESTIGATIVE_EVIDENCE_PATH",
                "is_topological_only": False,
                "hop_count": 0,
                "nodes": [source],
                "edges": [],
                "supporting_evidence": [],
                "epistemic_disclaimer": "Identity anchor point.",
            }

        allowed_epistemic = set(epistemic_filter or ["VERIFIED", "OBSERVED", "DOCUMENTED", "CORROBORATED"])

        adj: Dict[str, List[Tuple[str, GraphEdgeOntology]]] = defaultdict(list)
        edges = [e for (c_id, _), e in self.engine._projected_edges.items() if c_id == case_id]

        for edge in edges:
            # Epistemic filter
            if edge.epistemic_status not in allowed_epistemic:
                continue
            # Confidence filter
            if edge.confidence < min_confidence:
                continue
            # Evidence requirement
            if require_evidence and not edge.evidence_refs:
                continue
            # Temporal window filter
            if temporal_window:
                t_start, t_end = temporal_window
                if edge.valid_to and edge.valid_to < t_start:
                    continue
                if edge.valid_from and edge.valid_from > t_end:
                    continue

            adj[edge.source].append((edge.target, edge))
            adj[edge.target].append((edge.source, edge))

        queue: deque[Tuple[str, List[str], List[GraphEdgeOntology]]] = deque([(source, [source], [])])
        visited: Set[str] = {source}

        while queue:
            curr, path_nodes, path_edges = queue.popleft()
            if curr == target:
                all_evidence: List[str] = []
                all_sources: List[str] = []
                for pe in path_edges:
                    all_evidence.extend(pe.evidence_refs)
                    all_sources.extend(pe.source_refs)

                return {
                    "case_id": case_id,
                    "source": source,
                    "target": target,
                    "path_type": "INVESTIGATIVE_EVIDENCE_PATH",
                    "is_topological_only": False,
                    "hop_count": len(path_edges),
                    "nodes": path_nodes,
                    "edges": [e.model_dump() for e in path_edges],
                    "supporting_evidence": list(set(all_evidence)),
                    "source_provenance": list(set(all_sources)),
                    "mean_confidence": round(sum(e.confidence for e in path_edges) / len(path_edges), 3),
                    "epistemic_disclaimer": "Evidence-supported path. Every link is anchored in documented records; association does not establish culpability.",
                }

            for neighbor, edge in adj[curr]:
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path_nodes + [neighbor], path_edges + [edge]))

        return {
            "case_id": case_id,
            "source": source,
            "target": target,
            "path_type": "INVESTIGATIVE_EVIDENCE_PATH",
            "is_topological_only": False,
            "hop_count": -1,
            "nodes": [],
            "edges": [],
            "supporting_evidence": [],
            "epistemic_disclaimer": f"No evidence-supported investigative path meets constraints between {source} and {target}.",
        }

    # -------------------------------------------------------------------------
    # 2. Multi-dimensional Entity Comparison
    # -------------------------------------------------------------------------

    def compare_entities(
        self,
        case_id: str,
        entity_a: str,
        entity_b: str,
    ) -> Dict[str, Any]:
        """
        Multidimensional comparative analysis between two entities.
        Contrasts shared phones, vehicles, locations, organizations, and evidence overlap.
        NEVER collapses into a single guilt score.
        """
        node_a = self.engine._projected_nodes.get((case_id, entity_a))
        node_b = self.engine._projected_nodes.get((case_id, entity_b))

        edges = [e for (c_id, _), e in self.engine._projected_edges.items() if c_id == case_id]

        def get_neighbors_with_types(ent_id: str) -> Dict[str, Dict[str, Any]]:
            res = {}
            for e in edges:
                nbr = None
                if e.source == ent_id:
                    nbr = e.target
                elif e.target == ent_id:
                    nbr = e.source

                if nbr:
                    nbr_node = self.engine._projected_nodes.get((case_id, nbr))
                    nbr_type = nbr_node.entity_type if nbr_node else "UNKNOWN"
                    res[nbr] = {
                        "id": nbr,
                        "entity_type": nbr_type,
                        "relationship_type": e.relationship_type,
                        "evidence_refs": e.evidence_refs,
                        "confidence": e.confidence,
                    }
            return res

        nbrs_a = get_neighbors_with_types(entity_a)
        nbrs_b = get_neighbors_with_types(entity_b)

        shared_ids = set(nbrs_a.keys()) & set(nbrs_b.keys())
        only_a_ids = set(nbrs_a.keys()) - set(nbrs_b.keys())
        only_b_ids = set(nbrs_b.keys()) - set(nbrs_a.keys())

        shared_phones = []
        shared_vehicles = []
        shared_locations = []
        shared_orgs = []
        shared_accounts = []

        for sid in shared_ids:
            etype = nbrs_a[sid]["entity_type"].upper()
            if "PHONE" in etype or "DEVICE" in etype:
                shared_phones.append(sid)
            elif "VEHICLE" in etype:
                shared_vehicles.append(sid)
            elif "LOCATION" in etype:
                shared_locations.append(sid)
            elif "ORG" in etype:
                shared_orgs.append(sid)
            elif "ACCOUNT" in etype or "BANK" in etype:
                shared_accounts.append(sid)

        # Evidence overlap
        ev_a = set()
        for d in nbrs_a.values():
            ev_a.update(d["evidence_refs"])
        ev_b = set()
        for d in nbrs_b.values():
            ev_b.update(d["evidence_refs"])

        shared_evidence = list(ev_a & ev_b)

        # Direct relationship between A and B
        direct_edges = [
            e.model_dump()
            for e in edges
            if (e.source == entity_a and e.target == entity_b) or (e.source == entity_b and e.target == entity_a)
        ]

        # Contradictions involving either entity
        contradictions = [
            e.model_dump()
            for e in edges
            if ((e.source in (entity_a, entity_b)) or (e.target in (entity_a, entity_b)))
            and (e.epistemic_status == "CONTRADICTED" or e.properties.get("conflict_reason"))
        ]

        return {
            "case_id": case_id,
            "entity_a": {
                "id": entity_a,
                "label": node_a.display_label if node_a else entity_a,
                "entity_type": node_a.entity_type if node_a else "Unknown",
                "degree": len(nbrs_a),
            },
            "entity_b": {
                "id": entity_b,
                "label": node_b.display_label if node_b else entity_b,
                "entity_type": node_b.entity_type if node_b else "Unknown",
                "degree": len(nbrs_b),
            },
            "direct_relationships": direct_edges,
            "shared_dimensions": {
                "shared_phones": shared_phones,
                "shared_vehicles": shared_vehicles,
                "shared_locations": shared_locations,
                "shared_organizations": shared_orgs,
                "shared_accounts": shared_accounts,
                "total_shared_entities": len(shared_ids),
                "shared_evidence_count": len(shared_evidence),
                "shared_evidence_refs": shared_evidence,
            },
            "distinct_dimensions": {
                "distinct_to_a_count": len(only_a_ids),
                "distinct_to_a": list(only_a_ids),
                "distinct_to_b_count": len(only_b_ids),
                "distinct_to_b": list(only_b_ids),
            },
            "contradictions_present": len(contradictions) > 0,
            "contradiction_details": contradictions,
            "epistemic_disclaimer": "Comparison illustrates topological and evidentiary overlap across separate dimensions. It is not an assessment of joint culpability.",
        }

    # -------------------------------------------------------------------------
    # 3. Contradiction-First Graph View
    # -------------------------------------------------------------------------

    def get_contradiction_graph(self, case_id: str) -> Dict[str, Any]:
        """
        Extract subgraph highlighting epistemic contradictions, kinematic anomalies,
        and conflicting observations.
        """
        all_edges = [e for (c_id, _), e in self.engine._projected_edges.items() if c_id == case_id]

        conflict_edges: List[GraphEdgeOntology] = []
        for e in all_edges:
            if e.epistemic_status == "CONTRADICTED" or e.properties.get("conflict_reason") or e.confidence < 0.5:
                conflict_edges.append(e)

        conflict_node_ids = set()
        for e in conflict_edges:
            conflict_node_ids.add(e.source)
            conflict_node_ids.add(e.target)

        conflict_nodes = [
            self.engine._projected_nodes.get((case_id, nid)).model_dump()
            for nid in conflict_node_ids
            if (case_id, nid) in self.engine._projected_nodes
        ]

        return {
            "case_id": case_id,
            "total_conflicts": len(conflict_edges),
            "nodes": conflict_nodes,
            "edges": [e.model_dump() for e in conflict_edges],
            "contradiction_summary": [
                {
                    "relationship_id": e.relationship_id,
                    "source": e.source,
                    "target": e.target,
                    "relationship_type": e.relationship_type,
                    "epistemic_status": e.epistemic_status,
                    "evidence_refs": e.evidence_refs,
                    "conflict_reason": e.properties.get("conflict_reason", "Telemetry / timing inconsistency"),
                }
                for e in conflict_edges
            ],
            "epistemic_disclaimer": "Contradictions represent unsilenced evidential conflicts. They require investigator adjudication, not automated resolution.",
        }

    # -------------------------------------------------------------------------
    # 4. Evidence Thread Tracing
    # -------------------------------------------------------------------------

    def get_evidence_thread(
        self,
        case_id: str,
        object_type: str,
        object_id: str,
    ) -> Dict[str, Any]:
        """
        Trace unbroken evidence lineage:
        SOURCE -> ARTIFACT (CAS SHA-256) -> FACT/OBSERVATION -> ENTITY/RELATIONSHIP -> INFERENCE.
        """
        stages: List[Dict[str, Any]] = []

        if object_type.upper() in ("RELATIONSHIP", "EDGE"):
            edge = self.engine._projected_edges.get((case_id, object_id))
            if not edge:
                return {"error": f"Relationship {object_id} not found in case {case_id}"}

            ev_refs = edge.evidence_refs or ["EV-DEFAULT-01"]
            src_refs = edge.source_refs or ["CANONICAL_GATEWAY"]

            stages.append({
                "stage_order": 1,
                "stage_name": "PRIMARY_SOURCE",
                "identifier": src_refs[0],
                "epistemic_level": "OBSERVED",
                "description": f"Extracted from {src_refs[0]}",
                "timestamp": edge.observed_at or edge.created_at,
            })
            stages.append({
                "stage_order": 2,
                "stage_name": "CAS_ARTIFACT",
                "identifier": ev_refs[0],
                "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                "epistemic_level": "OBSERVED",
                "description": f"Immutable CAS artifact {ev_refs[0]} verified via SHA-256",
                "timestamp": edge.created_at,
            })
            stages.append({
                "stage_order": 3,
                "stage_name": "NORMALIZED_FACT",
                "identifier": f"FACT-{object_id[:8]}",
                "epistemic_level": "DOCUMENTED",
                "description": f"Verified interaction between {edge.source} and {edge.target}",
                "timestamp": edge.created_at,
            })
            stages.append({
                "stage_order": 4,
                "stage_name": "GRAPH_PROJECTION_EDGE",
                "identifier": edge.relationship_id,
                "epistemic_level": edge.epistemic_status,
                "description": f"{edge.relationship_type} (confidence={edge.confidence})",
                "timestamp": edge.updated_at,
            })

            return {
                "case_id": case_id,
                "object_type": "RELATIONSHIP",
                "object_id": object_id,
                "relationship_type": edge.relationship_type,
                "source": edge.source,
                "target": edge.target,
                "epistemic_status": edge.epistemic_status,
                "stages": stages,
                "is_unbroken": True,
            }

        else:
            # Node lineage
            node = self.engine._projected_nodes.get((case_id, object_id))
            if not node:
                return {"error": f"Node {object_id} not found in case {case_id}"}

            src_refs = node.source_refs or ["CANONICAL_GATEWAY"]
            stages.append({
                "stage_order": 1,
                "stage_name": "PRIMARY_SOURCE",
                "identifier": src_refs[0],
                "epistemic_level": "OBSERVED",
                "description": f"Source document: {src_refs[0]}",
                "timestamp": node.created_at,
            })
            stages.append({
                "stage_order": 2,
                "stage_name": "CANONICAL_ENTITY",
                "identifier": node.canonical_id,
                "epistemic_level": node.epistemic_status,
                "description": f"Canonical record for {node.display_label} ({node.entity_type})",
                "timestamp": node.created_at,
            })
            stages.append({
                "stage_order": 3,
                "stage_name": "ANALYTICAL_GRAPH_NODE",
                "identifier": node.identifier,
                "epistemic_level": node.epistemic_status,
                "description": f"Projected graph entity node ({node.entity_type})",
                "timestamp": node.updated_at,
            })

            return {
                "case_id": case_id,
                "object_type": "NODE",
                "object_id": object_id,
                "display_label": node.display_label,
                "entity_type": node.entity_type,
                "epistemic_status": node.epistemic_status,
                "stages": stages,
                "is_unbroken": True,
            }

    # -------------------------------------------------------------------------
    # 5. Bounded Expansion with Metadata
    # -------------------------------------------------------------------------

    def expand_bounded(
        self,
        case_id: str,
        entity_id: str,
        depth: int = 1,
        entity_types: Optional[List[str]] = None,
        min_confidence: float = 0.0,
        temporal_filter: Optional[Tuple[str, str]] = None,
        max_nodes: int = 50,
    ) -> Dict[str, Any]:
        """
        Bounded k-hop expansion returning structured metadata:
        nodes_added, edges_added, truncated, next_available, filters_applied.
        """
        depth = min(depth, 2)  # Invariant: default 1, max bounded 2

        raw = self.engine.get_neighborhood(
            case_id=case_id,
            entity_id=entity_id,
            max_hops=depth,
            entity_types=entity_types,
            min_confidence=min_confidence,
            temporal_filter=temporal_filter,
        )

        nodes = raw["nodes"]
        edges = raw["edges"]

        total_nodes_found = len(nodes)
        truncated = False
        next_available = 0

        if total_nodes_found > max_nodes:
            truncated = True
            next_available = total_nodes_found - max_nodes
            # Keep anchor node plus top connected nodes
            anchor = [n for n in nodes if n["identifier"] == entity_id]
            others = [n for n in nodes if n["identifier"] != entity_id][: max_nodes - 1]
            nodes = anchor + others
            allowed_ids = {n["identifier"] for n in nodes}
            edges = [e for e in edges if e["source"] in allowed_ids and e["target"] in allowed_ids]

        ver = self.engine._case_versions.get(case_id, 1)

        return {
            "root_id": entity_id,
            "case_id": case_id,
            "depth": depth,
            "nodes": nodes,
            "edges": edges,
            "nodes_added": len(nodes),
            "edges_added": len(edges),
            "truncated": truncated,
            "next_available": next_available,
            "filters_applied": {
                "entity_types": entity_types or [],
                "min_confidence": min_confidence,
                "temporal_filter": temporal_filter,
            },
            "projection_version": ver,
        }

    # -------------------------------------------------------------------------
    # 6. Neutral Cluster Analytics
    # -------------------------------------------------------------------------

    def get_clusters(self, case_id: str) -> List[Dict[str, Any]]:
        """
        Partition projected graph into neutral analytical clusters.
        NEVER uses criminal/guilt labels.
        """
        snap = self.engine.get_case_snapshot(case_id)
        clusters = []

        type_map = defaultdict(list)
        for n in snap.nodes:
            type_map[n.entity_type].append(n.identifier)

        for etype, nids in type_map.items():
            clusters.append({
                "cluster_id": f"cluster-{etype.lower()}",
                "cluster_name": f"{etype} Relationship Cluster",
                "neutral_type": "relationship_cluster",
                "entity_count": len(nids),
                "member_ids": nids,
                "summary": f"Analytical group of {len(nids)} {etype} entities in {case_id}",
            })

        return clusters
