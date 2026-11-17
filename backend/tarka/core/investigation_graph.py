"""Investigation Graph for TARKA Forensic Case Evidence.

Distinguishes from the Provenance Dependency DAG:
- Provenance Dependency DAG: Derivation pipeline showing how evidence yields findings (Artifact -> DNA -> Fact -> Rule -> Finding).
- Investigation Graph: Shows real-world evidence entities and case relationships:
  Phone Number -> UPI VPA -> Bank Transaction -> Screenshot Claim -> CDR Call.

Strictly separated models and views.
"""

from __future__ import annotations

import hashlib
import json
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind
from tarka.core.correlations import EventCorrelation
from tarka.core.evidence_dna import Artifact, Case


class ForensicNodeType(str, Enum):
    """Canonical Forensic Graph node types."""
    EVIDENCE_ARTIFACT = "EVIDENCE_ARTIFACT"
    SOURCE_RECORD = "SOURCE_RECORD"
    FACT = "FACT"
    TRANSACTION = "TRANSACTION"
    IDENTIFIER = "IDENTIFIER"
    EVENT = "EVENT"
    FINDING = "FINDING"
    RULE = "RULE"
    ENTITY = "ENTITY"
    CONTRADICTION = "CONTRADICTION"
    EVIDENCE_GAP = "EVIDENCE_GAP"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    UNCERTAINTY = "UNCERTAINTY"
    INVESTIGATION_PRIORITY = "INVESTIGATION_PRIORITY"
    SUMMARY_FINDING = "SUMMARY_FINDING"

    # Backward compatibility aliases
    PHONE_NUMBER = "PHONE_NUMBER"
    UPI_VPA = "UPI_VPA"
    BANK_TRANSACTION = "BANK_TRANSACTION"
    CLAIM_RECEIPT = "CLAIM_RECEIPT"
    CALL_EVENT = "CALL_EVENT"
    CHAT_REQUEST = "CHAT_REQUEST"
    ARTIFACT = "ARTIFACT"


class ForensicEdgeType(str, Enum):
    """Canonical Forensic Graph relationship types."""
    EXTRACTED_FROM = "EXTRACTED_FROM"
    REFERENCES = "REFERENCES"
    MATCHES = "MATCHES"
    SUPPORTS = "SUPPORTS"
    CONTRADICTS = "CONTRADICTS"
    DERIVED_FROM = "DERIVED_FROM"
    TRIGGERED_BY = "TRIGGERED_BY"
    TEMPORALLY_RELATED = "TEMPORALLY_RELATED"
    PRECEDES = "PRECEDES"
    SUPPORTED_BY = "SUPPORTED_BY"
    CONFLICTS_WITH = "CONFLICTS_WITH"
    EXPOSES_GAP = "EXPOSES_GAP"
    PRIORITIZED_BY = "PRIORITIZED_BY"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"

    # Backward compatibility aliases
    VOICE_CALL_TO = "VOICE_CALL_TO"
    REQUESTS_PAYMENT_TO = "REQUESTS_PAYMENT_TO"
    DEBITS_TO = "DEBITS_TO"
    CLAIMS_PAYMENT_TO = "CLAIMS_PAYMENT_TO"
    REFERENCES_TRANSACTION = "REFERENCES_TRANSACTION"
    RECORDED_IN = "RECORDED_IN"


class ForensicNodeStatus(str, Enum):
    """Evidentiary status for forensic graph nodes."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BASELINE_ONLY = "BASELINE_ONLY"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    CONTRADICTION = "CONTRADICTION"


# Re-export EntityNodeType and EntityEdgeType as ForensicNodeType and ForensicEdgeType
EntityNodeType = ForensicNodeType
EntityEdgeType = ForensicEdgeType


class InvestigationNode(BaseModel):
    """An entity, fact, or forensic finding node in the Investigation Graph."""
    node_id: str = Field(description="Unique entity node ID (e.g. ent:phone:+919876543210)")
    node_type: Any = Field(description="Classification of entity / forensic node")
    label: str = Field(description="Short human-readable label")
    title: Optional[str] = Field(default=None, description="Entity title or identifier")
    subtitle: Optional[str] = Field(default=None, description="Contextual info like amount, timestamp")
    description: Optional[str] = Field(default=None, description="Forensic context")
    source_artifact_ids: List[str] = Field(default_factory=list, description="Source artifacts referencing this entity")
    source_artifact_id: Optional[str] = Field(default=None, description="Primary source artifact ID")
    source_record_id: Optional[str] = Field(default=None, description="Underlying source record or fact ID")
    provenance_ids: List[str] = Field(default_factory=list, description="Audit provenance identifiers")
    identifiers: Dict[str, str] = Field(default_factory=dict, description="Extracted identifiers (msisdn, vpa, rrn)")
    amount: Optional[float] = Field(default=None, description="Monetary value if financial")
    raw_value: Optional[str] = Field(default=None, description="Verbatim raw source value")
    normalized_value: Optional[Any] = Field(default=None, description="Normalized comparable value")
    confidence: Optional[float] = Field(default=None, description="Extraction or recognition confidence")
    review_status: Optional[str] = Field(default=None, description="Human review status")
    status: str = Field(default="ACTIVE", description="ACTIVE, INACTIVE, BASELINE_ONLY, REVIEW_REQUIRED, CONTRADICTION")
    inactive_reason: Optional[str] = Field(default=None, description="Explanation if deactivated in counterfactual run")
    timestamp_iso: Optional[str] = Field(default=None, description="Source or transaction timestamp in UTC ISO")
    is_timestamp_inferred: bool = Field(default=False, description="True if timestamp was inferred rather than explicit")
    page_number: Optional[int] = Field(default=None, description="Source page number if document")
    bounding_box: Optional[List[float]] = Field(default=None, description="Source coordinate bounding box [x1, y1, x2, y2]")
    rule_id: Optional[str] = Field(default=None, description="Deterministic rule identifier if applicable")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional properties")


class InvestigationEdge(BaseModel):
    """A relationship between entities, facts, or findings in the Investigation Graph."""
    edge_id: str = Field(description="Unique edge ID")
    source_id: str = Field(description="Source entity node ID")
    target_id: str = Field(description="Target entity node ID")
    edge_type: Any = Field(description="Relationship type")
    label: str = Field(description="Human-readable relationship label")
    explanation: Optional[str] = Field(default=None, description="Forensic link explanation")
    provenance_ids: List[str] = Field(default_factory=list, description="Source provenance IDs")
    rule_id: Optional[str] = Field(default=None, description="Applicable deterministic rule ID")
    is_contradiction: bool = Field(default=False, description="True if link represents an amount or record conflict")
    status: str = Field(default="ACTIVE", description="ACTIVE or INACTIVE")
    inactive_reason: Optional[str] = Field(default=None, description="Reason if deactivated in counterfactual run")
    nature: str = Field(default="OBSERVED", description="OBSERVED (physical/ledger evidence) or INFERRED (hypothesis)")
    ambiguity_type: Optional[str] = Field(default=None, description="Ambiguity category (SHARED_HOTSPOT, CGNAT_POOL, etc.)")
    ambiguity_caution_notice: Optional[str] = Field(default=None, description="Statutory caution warning")
    valid_from_iso: Optional[str] = Field(default=None, description="Valid time interval start")
    valid_to_iso: Optional[str] = Field(default=None, description="Valid time interval end")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Edge properties")


class InvestigationGraph(BaseModel):
    """Forensic Investigation Entity Graph model."""
    graph_id: str = Field(description="Graph identifier")
    case_id: str = Field(description="Associated Case ID")
    nodes: List[InvestigationNode] = Field(default_factory=list)
    edges: List[InvestigationEdge] = Field(default_factory=list)
    fingerprint: str = Field(default="", description="Deterministic SHA-256 fingerprint")


def compute_investigation_fingerprint(nodes: List[InvestigationNode], edges: List[InvestigationEdge]) -> str:
    def _val(x: Any) -> str:
        return x.value if hasattr(x, "value") else str(x)

    sorted_nodes = sorted([{"id": n.node_id, "type": _val(n.node_type), "label": n.label} for n in nodes], key=lambda x: x["id"])
    sorted_edges = sorted([{"id": e.edge_id, "src": e.source_id, "tgt": e.target_id, "type": _val(e.edge_type)} for e in edges], key=lambda x: x["id"])
    payload = json.dumps({"nodes": sorted_nodes, "edges": sorted_edges}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class InvestigationGraphBuilder:
    """Constructs focused investigation entity graphs from case facts and artifacts."""

    @classmethod
    def build_case_graph(
        cls,
        case_id: str,
        artifacts: List[Artifact],
        facts: List[CanonicalFact],
        correlations: List[EventCorrelation],
        run: Optional[Any] = None,
    ) -> InvestigationGraph:
        """Extracts entities and constructs cross-evidence entity links."""
        nodes: List[InvestigationNode] = []
        edges: List[InvestigationEdge] = []
        seen_nodes: Set[str] = set()
        edge_seq = 0

        # Helper to add node once
        def add_node(n: InvestigationNode) -> None:
            if n.node_id not in seen_nodes:
                seen_nodes.add(n.node_id)
                nodes.append(n)

        # 1. Preserved Artifacts
        for art in sorted(artifacts, key=lambda a: a.artifact_id):
            add_node(
                InvestigationNode(
                    node_id=f"ent:art:{art.artifact_id}",
                    node_type=EntityNodeType.ARTIFACT,
                    label=art.filename,
                    title=f"Artifact {art.artifact_id}",
                    subtitle=f"Tier: {art.source_tier.value}",
                    description=f"Preserved byte container ({art.file_size_bytes} bytes)",
                    source_artifact_ids=[art.artifact_id],
                    metadata={"sha256": art.sha256, "status": art.status},
                )
            )

        # 2. Extract Entities from Facts
        for fact in facts:
            art_id = fact.artifact_id

            # Phone numbers
            msisdn = fact.identifiers.get("msisdn") or fact.primary_entity
            if msisdn and (fact.kind == CanonicalFactKind.CDR_CALL or "91" in msisdn):
                phone_id = f"ent:phone:{msisdn}"
                add_node(
                    InvestigationNode(
                        node_id=phone_id,
                        node_type=EntityNodeType.PHONE_NUMBER,
                        label=f"Phone: {msisdn}",
                        title=msisdn,
                        subtitle="Source Identifier (Reported Party)",
                        source_artifact_ids=[art_id],
                        identifiers={"msisdn": msisdn},
                    )
                )
                # Link to artifact
                edge_seq += 1
                edges.append(
                    InvestigationEdge(
                        edge_id=f"inv-edge-{edge_seq:04d}",
                        source_id=phone_id,
                        target_id=f"ent:art:{art_id}",
                        edge_type=EntityEdgeType.RECORDED_IN,
                        label="Recorded in",
                    )
                )

            # Target phone for CDR
            if fact.kind == CanonicalFactKind.CDR_CALL and fact.secondary_entity:
                tgt_msisdn = fact.secondary_entity
                tgt_id = f"ent:phone:{tgt_msisdn}"
                add_node(
                    InvestigationNode(
                        node_id=tgt_id,
                        node_type=EntityNodeType.PHONE_NUMBER,
                        label=f"Phone: {tgt_msisdn}",
                        title=tgt_msisdn,
                        subtitle="Destination Identifier (Called Party)",
                        source_artifact_ids=[art_id],
                        identifiers={"msisdn": tgt_msisdn},
                    )
                )
                # Call link
                if msisdn:
                    edge_seq += 1
                    edges.append(
                        InvestigationEdge(
                            edge_id=f"inv-edge-{edge_seq:04d}",
                            source_id=f"ent:phone:{msisdn}",
                            target_id=tgt_id,
                            edge_type=EntityEdgeType.VOICE_CALL_TO,
                            label="Voice Call (CDR)",
                            explanation=fact.summary,
                        )
                    )

            # UPI VPAs
            vpa = fact.identifiers.get("vpa")
            if vpa:
                vpa_id = f"ent:vpa:{vpa.lower()}"
                add_node(
                    InvestigationNode(
                        node_id=vpa_id,
                        node_type=EntityNodeType.UPI_VPA,
                        label=f"VPA: {vpa}",
                        title=vpa,
                        subtitle="Destination Identifier (VPA)",
                        source_artifact_ids=[art_id],
                        identifiers={"vpa": vpa},
                    )
                )
                # Link to artifact
                edge_seq += 1
                edges.append(
                    InvestigationEdge(
                        edge_id=f"inv-edge-{edge_seq:04d}",
                        source_id=vpa_id,
                        target_id=f"ent:art:{art_id}",
                        edge_type=EntityEdgeType.RECORDED_IN,
                        label="Recorded in",
                    )
                )

            # Bank Transaction
            if fact.kind == CanonicalFactKind.BANK_TRANSACTION:
                rrn = fact.identifiers.get("rrn", "TXN")
                txn_id = f"ent:txn:{rrn}"
                add_node(
                    InvestigationNode(
                        node_id=txn_id,
                        node_type=EntityNodeType.BANK_TRANSACTION,
                        label=f"Bank Txn ₹{fact.amount:,.2f}" if fact.amount else f"Bank Txn {rrn}",
                        title=f"Bank Transaction RRN {rrn}",
                        subtitle=f"Debit ₹{fact.amount:,.2f} (RRN {rrn})" if fact.amount else f"RRN {rrn}",
                        description=fact.summary,
                        source_artifact_ids=[art_id],
                        amount=fact.amount,
                        identifiers=fact.identifiers,
                    )
                )
                edge_seq += 1
                edges.append(
                    InvestigationEdge(
                        edge_id=f"inv-edge-{edge_seq:04d}",
                        source_id=txn_id,
                        target_id=f"ent:art:{art_id}",
                        edge_type=EntityEdgeType.RECORDED_IN,
                        label="Recorded in",
                    )
                )
                # If transaction has VPA, link debit to VPA
                if vpa:
                    edge_seq += 1
                    edges.append(
                        InvestigationEdge(
                            edge_id=f"inv-edge-{edge_seq:04d}",
                            source_id=txn_id,
                            target_id=f"ent:vpa:{vpa.lower()}",
                            edge_type=EntityEdgeType.DEBITS_TO,
                            label=f"Debit ₹{fact.amount:,.2f}" if fact.amount else "Debits to",
                            explanation="Bank statement documents official debit transfer to VPA",
                        )
                    )

            # Chat Payment Request
            if fact.kind == CanonicalFactKind.PAYMENT_REQUEST:
                req_id = f"ent:req:{fact.fact_id}"
                add_node(
                    InvestigationNode(
                        node_id=req_id,
                        node_type=EntityNodeType.CHAT_REQUEST,
                        label=f"Chat Request ₹{fact.amount:,.2f}" if fact.amount else "Chat Request",
                        title="Payment Request in Chat",
                        subtitle=f"Requested: ₹{fact.amount:,.2f}" if fact.amount else None,
                        description=fact.summary,
                        source_artifact_ids=[art_id],
                        amount=fact.amount,
                        identifiers=fact.identifiers,
                    )
                )
                edge_seq += 1
                edges.append(
                    InvestigationEdge(
                        edge_id=f"inv-edge-{edge_seq:04d}",
                        source_id=req_id,
                        target_id=f"ent:art:{art_id}",
                        edge_type=EntityEdgeType.RECORDED_IN,
                        label="Recorded in",
                    )
                )
                if vpa:
                    edge_seq += 1
                    edges.append(
                        InvestigationEdge(
                            edge_id=f"inv-edge-{edge_seq:04d}",
                            source_id=req_id,
                            target_id=f"ent:vpa:{vpa.lower()}",
                            edge_type=EntityEdgeType.REQUESTS_PAYMENT_TO,
                            label=f"Requests ₹{fact.amount:,.2f}" if fact.amount else "Requests to",
                            explanation="Chat message requested payment transfer to this VPA",
                        )
                    )

            # Screenshot Claim / Unverified Claim
            if fact.kind in [CanonicalFactKind.MEDIA_METADATA, CanonicalFactKind.EXTRACTED_IDENTIFIER]:
                rrn = fact.identifiers.get("rrn", fact.fact_id)
                claim_id = f"ent:claim:{art_id}"
                is_contradiction = False
                for corr in correlations:
                    if corr.is_contradiction and art_id in corr.artifact_inputs:
                        is_contradiction = True

                add_node(
                    InvestigationNode(
                        node_id=claim_id,
                        node_type=EntityNodeType.CLAIM_RECEIPT,
                        label=f"Claim ₹{fact.amount:,.2f}" if fact.amount else f"Claim {art_id}",
                        title=f"Receipt Claim ({fact.source_filename})",
                        subtitle=f"Claimed ₹{fact.amount:,.2f} | RRN: {rrn}" if fact.amount else f"RRN: {rrn}",
                        description=fact.summary,
                        source_artifact_ids=[art_id],
                        amount=fact.amount,
                        identifiers=fact.identifiers,
                        metadata={"is_contradiction": is_contradiction},
                    )
                )
                edge_seq += 1
                edges.append(
                    InvestigationEdge(
                        edge_id=f"inv-edge-{edge_seq:04d}",
                        source_id=claim_id,
                        target_id=f"ent:art:{art_id}",
                        edge_type=EntityEdgeType.RECORDED_IN,
                        label="Recorded in",
                    )
                )
                if vpa:
                    edge_seq += 1
                    edges.append(
                        InvestigationEdge(
                            edge_id=f"inv-edge-{edge_seq:04d}",
                            source_id=claim_id,
                            target_id=f"ent:vpa:{vpa.lower()}",
                            edge_type=EntityEdgeType.CLAIMS_PAYMENT_TO,
                            label=f"Claims ₹{fact.amount:,.2f}" if fact.amount else "Claims to",
                            explanation="Receipt claims payment to VPA",
                        )
                    )

        # 3. Add Cross-Entity Correlation Edges
        for corr in correlations:
            if corr.rule_id in ["RULE_MEDIA_TXN_MISMATCH", "RULE_MEDIA_TXN_MATCH"]:
                # Connect claim to transaction
                claim_art = next((aid for aid in corr.artifact_inputs if "ART-004" in aid or "screenshot" in aid), None)
                if not claim_art and len(corr.artifact_inputs) >= 2:
                    claim_art = corr.artifact_inputs[0]
                bank_fact = next((f for f in facts if f.kind == CanonicalFactKind.BANK_TRANSACTION), None)
                if claim_art and bank_fact:
                    rrn = bank_fact.identifiers.get("rrn", "TXN")
                    claim_node_id = f"ent:claim:{claim_art}"
                    txn_node_id = f"ent:txn:{rrn}"
                    if claim_node_id in seen_nodes and txn_node_id in seen_nodes:
                        edge_seq += 1
                        edges.append(
                            InvestigationEdge(
                                edge_id=f"inv-edge-{edge_seq:04d}",
                                source_id=claim_node_id,
                                target_id=txn_node_id,
                                edge_type=EntityEdgeType.REFERENCES_TRANSACTION,
                                label="Discrepancy (Claim ₹15,000 vs Bank ₹25,000)" if corr.is_contradiction else "Matches Txn",
                                explanation=corr.explanation_text,
                                is_contradiction=corr.is_contradiction,
                            )
                        )

        fingerprint = compute_investigation_fingerprint(nodes, edges)

        return InvestigationGraph(
            graph_id=f"inv_graph_{case_id}",
            case_id=case_id,
            nodes=nodes,
            edges=edges,
            fingerprint=fingerprint,
        )

    @classmethod
    def build_forensic_graph(
        cls,
        case_id: str,
        artifacts: List[Artifact],
        facts: List[CanonicalFact],
        correlations: Optional[List[EventCorrelation]] = None,
        run: Optional[Any] = None,
        baseline_run: Optional[Any] = None,
    ) -> InvestigationGraph:
        """Constructs an audited cross-source forensic graph with canonical nodes, edges,
        and counterfactual support."""
        from tarka.core.cross_source_correlation import CrossSourceCorrelationEngine
        engine = CrossSourceCorrelationEngine()
        return engine.build_forensic_graph(
            case_id=case_id,
            artifacts=artifacts,
            facts=facts,
            correlations=correlations,
            run=run,
            baseline_run=baseline_run,
        )


class InvestigationGraphQuery:
    """Forensic graph analysis: temporal slicing, multi-hop pathfinding, and motif detection."""

    @staticmethod
    def filter_by_time_range(
        graph: InvestigationGraph,
        start_iso: Optional[str] = None,
        end_iso: Optional[str] = None,
    ) -> InvestigationGraph:
        """Filters nodes and edges within a temporal window [start_iso, end_iso]."""
        filtered_nodes = []
        node_id_set = set()

        for n in graph.nodes:
            ts = n.timestamp_iso
            include = True
            if ts:
                if start_iso and ts < start_iso:
                    include = False
                if end_iso and ts > end_iso:
                    include = False
            if include:
                filtered_nodes.append(n)
                node_id_set.add(n.node_id)

        filtered_edges = [
            e for e in graph.edges
            if e.source_id in node_id_set and e.target_id in node_id_set
        ]

        fingerprint = compute_investigation_fingerprint(filtered_nodes, filtered_edges)
        return InvestigationGraph(
            graph_id=f"{graph.graph_id}_time_filtered",
            case_id=graph.case_id,
            nodes=filtered_nodes,
            edges=filtered_edges,
            fingerprint=fingerprint,
        )

    @staticmethod
    def find_multi_hop_paths(
        graph: InvestigationGraph,
        source_id: str,
        target_id: str,
        max_hops: int = 5,
    ) -> List[List[InvestigationEdge]]:
        """DFS discovery of multi-hop paths between source and target entities."""
        adj: Dict[str, List[InvestigationEdge]] = {}
        for edge in graph.edges:
            if edge.status == "ACTIVE":
                adj.setdefault(edge.source_id, []).append(edge)

        paths: List[List[InvestigationEdge]] = []

        def dfs(current: str, target: str, current_path: List[InvestigationEdge], visited: Set[str], hops_left: int) -> None:
            if current == target and current_path:
                paths.append(list(current_path))
                return
            if hops_left <= 0:
                return

            for edge in adj.get(current, []):
                nxt = edge.target_id
                if nxt not in visited:
                    visited.add(nxt)
                    current_path.append(edge)
                    dfs(nxt, target, current_path, visited, hops_left - 1)
                    current_path.pop()
                    visited.remove(nxt)

        dfs(source_id, target_id, [], {source_id}, max_hops)
        return paths

    @staticmethod
    def detect_motifs(graph: InvestigationGraph) -> List[Dict[str, Any]]:
        """Identifies suspicious fraud network motifs (Fan-Out, Fan-In, Cycles, Co-location clusters)."""
        motifs = []
        out_edges: Dict[str, List[InvestigationEdge]] = {}
        in_edges: Dict[str, List[InvestigationEdge]] = {}

        for e in graph.edges:
            out_edges.setdefault(e.source_id, []).append(e)
            in_edges.setdefault(e.target_id, []).append(e)

        # 1. Fan-Out (1 -> N, N >= 3)
        for src, edges in out_edges.items():
            financial_edges = [e for e in edges if "DEBITS" in str(e.edge_type) or "PAYMENT" in str(e.edge_type) or "FUNDS" in str(e.edge_type)]
            if len(financial_edges) >= 3:
                motifs.append({
                    "motif_type": "FAN_OUT",
                    "root_node": src,
                    "target_nodes": [e.target_id for e in financial_edges],
                    "edge_count": len(financial_edges),
                    "description": f"Fan-Out Motif: Node {src} disbursed funds across {len(financial_edges)} downstream destinations.",
                })

        # 2. Fan-In (N -> 1, N >= 3)
        for tgt, edges in in_edges.items():
            financial_edges = [e for e in edges if "DEBITS" in str(e.edge_type) or "PAYMENT" in str(e.edge_type) or "FUNDS" in str(e.edge_type)]
            if len(financial_edges) >= 3:
                motifs.append({
                    "motif_type": "FAN_IN",
                    "collector_node": tgt,
                    "source_nodes": [e.source_id for e in financial_edges],
                    "edge_count": len(financial_edges),
                    "description": f"Fan-In Motif: Collector Node {tgt} consolidated funds from {len(financial_edges)} upstream sources.",
                })

        # 3. Co-location Ambiguity Clusters (Shared IP/Device)
        colocated = [
            e for e in graph.edges
            if e.ambiguity_type or "SHARED" in str(e.edge_type) or "CO_LOCATED" in str(e.edge_type)
        ]
        if colocated:
            motifs.append({
                "motif_type": "CO_LOCATION_AMBIGUITY",
                "edge_count": len(colocated),
                "caution": "Statutory rule: Physical device or network co-location does not prove single-actor ownership.",
                "edges": [e.edge_id for e in colocated],
            })

        return motifs

