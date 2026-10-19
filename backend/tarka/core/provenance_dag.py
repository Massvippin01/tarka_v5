"""Provenance Dependency DAG for TARKA.

Distinguishes:
1. Investigation Graph: Evidence entities and case relationships (phone -> VPA -> transaction -> claim).
2. Provenance Dependency DAG: Shows how TARKA derived a finding:
   Artifact
      ↓ (SUPPLIES)
   Evidence DNA
      ↓ (EXTRACTED_FROM / GENERATED)
   Extracted Fact
      ↓ (TRIGGERED)
   Correlation Rule
      ↓ (GENERATED)
   Correlation / Timeline Event / Contradiction / Evidence Gap
      ↓ (SUPPORTS / CONTRADICTS)
   Finding
      ↓ (INFORMS)
   Hypothesis Assessment

Strict Requirements:
- First-class DAG model generated from actual case and Analysis Run data.
- Required node types: Artifact, Evidence DNA item, Extracted Fact, Correlation Rule,
  Correlation, Timeline Event, Contradiction, Evidence Gap, Finding, Hypothesis Assessment.
- Required edge types: SUPPLIES, EXTRACTED_FROM, TRIGGERED, GENERATED, SUPPORTS, CONTRADICTS,
  INFORMS, EXCLUDED_FROM_ACTIVE_RUN.
- Required node statuses: ACTIVE, INACTIVE, BASELINE_ONLY, SURVIVING.
- Strictly acyclic (enforced & verified).
- Every finding must have verifiable ancestry to at least one preserved source artifact.
- Deterministic DAG fingerprints.
"""

from __future__ import annotations

import hashlib
import json
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind
from tarka.core.correlations import EventCorrelation, EvidenceGap
from tarka.core.evidence_dna import Artifact, EvidenceDNA
from tarka.core.analysis_run import AnalysisRun, FindingSummary, HypothesisAssessment
from tarka.core.rule_registry import DEFAULT_RULE_REGISTRY, DeclarativeRule


class DAGNodeType(str, Enum):
    """Categorical classification of Provenance DAG nodes."""
    ARTIFACT = "Artifact"
    EVIDENCE_DNA = "Evidence DNA item"
    EXTRACTED_FACT = "Extracted Fact"
    CORRELATION_RULE = "Correlation Rule"
    CORRELATION = "Correlation"
    TIMELINE_EVENT = "Timeline Event"
    CONTRADICTION = "Contradiction"
    EVIDENCE_GAP = "Evidence Gap"
    FINDING = "Finding"
    HYPOTHESIS_ASSESSMENT = "Hypothesis Assessment"
    COMPLETENESS_ASSESSMENT = "Completeness Assessment"


class DAGEdgeType(str, Enum):
    """Forensic edge relationship connecting derivation stages."""
    SUPPLIES = "SUPPLIES"
    EXTRACTED_FROM = "EXTRACTED_FROM"
    TRIGGERED = "TRIGGERED"
    GENERATED = "GENERATED"
    SUPPORTS = "SUPPORTS"
    CONTRADICTS = "CONTRADICTS"
    INFORMS = "INFORMS"
    EXCLUDED_FROM_ACTIVE_RUN = "EXCLUDED_FROM_ACTIVE_RUN"
    EVALUATED_BY = "EVALUATED_BY"


class DAGNodeStatus(str, Enum):
    """Forensic activity status of a node within the active analysis run or challenge."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BASELINE_ONLY = "BASELINE_ONLY"
    SURVIVING = "SURVIVING"
    CONTRADICTION = "CONTRADICTION"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class DAGNode(BaseModel):
    """A node in the provenance derivation DAG."""
    node_id: str = Field(description="Unique identifier for the node")
    node_type: DAGNodeType = Field(description="Categorical type of the node")
    label: str = Field(description="Short human-readable label")
    status: DAGNodeStatus = Field(default=DAGNodeStatus.ACTIVE, description="Active status in current run")
    title: Optional[str] = Field(default=None, description="Detailed title or headline")
    description: Optional[str] = Field(default=None, description="Descriptive forensic explanation")
    source_artifact_id: Optional[str] = Field(default=None, description="Parent artifact ID if applicable")
    source_location: Optional[str] = Field(default=None, description="Source locator (row:X, line:Y)")
    rule_id: Optional[str] = Field(default=None, description="Associated declarative rule ID if applicable")
    fact_id: Optional[str] = Field(default=None, description="Associated canonical fact ID if applicable")
    evidence_id: Optional[str] = Field(default=None, description="Associated evidence DNA ID if applicable")
    run_id: Optional[str] = Field(default=None, description="Associated analysis run ID")
    amount: Optional[float] = Field(default=None, description="Financial amount if monetary event")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Arbitrary auditable properties")


class DAGEdge(BaseModel):
    """A directed edge in the provenance derivation DAG."""
    edge_id: str = Field(description="Unique deterministic edge identifier")
    source_id: str = Field(description="Originating node ID (upstream derivation stage)")
    target_id: str = Field(description="Destination node ID (downstream derivation stage)")
    edge_type: DAGEdgeType = Field(description="Relationship type")
    label: Optional[str] = Field(default=None, description="Human-readable edge label")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Edge metadata")


class ProvenanceDAG(BaseModel):
    """First-class Provenance Dependency DAG model."""
    dag_id: str = Field(description="Identifier for this DAG snapshot")
    run_id: str = Field(description="Associated AnalysisRun ID")
    case_id: str = Field(description="Associated Case ID")
    run_type: str = Field(default="BASELINE", description="BASELINE or CHALLENGE")
    nodes: List[DAGNode] = Field(default_factory=list, description="All DAG nodes")
    edges: List[DAGEdge] = Field(default_factory=list, description="All directed DAG edges")
    fingerprint: str = Field(default="", description="Deterministic SHA-256 graph fingerprint")

    def is_acyclic(self) -> bool:
        """Verifies that the graph contains strictly zero cycles using Kahn's algorithm."""
        in_degrees: Dict[str, int] = {n.node_id: 0 for n in self.nodes}
        adj: Dict[str, List[str]] = {n.node_id: [] for n in self.nodes}

        for e in self.edges:
            if e.source_id in adj and e.target_id in in_degrees:
                adj[e.source_id].append(e.target_id)
                in_degrees[e.target_id] += 1

        queue = [n_id for n_id, deg in in_degrees.items() if deg == 0]
        visited_count = 0

        while queue:
            curr = queue.pop(0)
            visited_count += 1
            for nxt in adj.get(curr, []):
                in_degrees[nxt] -= 1
                if in_degrees[nxt] == 0:
                    queue.append(nxt)

        return visited_count == len(self.nodes)

    def get_ancestors(self, node_id: str) -> Set[str]:
        """Returns all ancestor node IDs that have a directed path leading to node_id."""
        parents_map: Dict[str, List[str]] = {n.node_id: [] for n in self.nodes}
        for e in self.edges:
            if e.target_id in parents_map:
                parents_map[e.target_id].append(e.source_id)

        ancestors: Set[str] = set()
        queue = list(parents_map.get(node_id, []))
        while queue:
            curr = queue.pop(0)
            if curr not in ancestors:
                ancestors.add(curr)
                queue.extend(parents_map.get(curr, []))
        return ancestors

    def get_descendants(self, node_id: str) -> Set[str]:
        """Returns all descendant node IDs reachable from node_id."""
        children_map: Dict[str, List[str]] = {n.node_id: [] for n in self.nodes}
        for e in self.edges:
            if e.source_id in children_map:
                children_map[e.source_id].append(e.target_id)

        descendants: Set[str] = set()
        queue = list(children_map.get(node_id, []))
        while queue:
            curr = queue.pop(0)
            if curr not in descendants:
                descendants.add(curr)
                queue.extend(children_map.get(curr, []))
        return descendants

    def has_source_artifact_ancestry(self, finding_node_id: str) -> bool:
        """Verifies that the finding has at least one directed ancestry path back to a source artifact."""
        ancestor_ids = self.get_ancestors(finding_node_id)
        artifact_node_ids = {n.node_id for n in self.nodes if n.node_type == DAGNodeType.ARTIFACT}
        return bool(ancestor_ids.intersection(artifact_node_ids))


def compute_dag_fingerprint(nodes: List[DAGNode], edges: List[DAGEdge]) -> str:
    """Computes a deterministic SHA-256 fingerprint from canonical node and edge structures."""
    sorted_nodes = sorted(
        [
            {
                "id": n.node_id,
                "type": n.node_type.value,
                "status": n.status.value,
                "label": n.label,
                "rule_id": n.rule_id,
                "fact_id": n.fact_id,
            }
            for n in nodes
        ],
        key=lambda x: x["id"],
    )
    sorted_edges = sorted(
        [
            {
                "id": e.edge_id,
                "source": e.source_id,
                "target": e.target_id,
                "type": e.edge_type.value,
            }
            for e in edges
        ],
        key=lambda x: x["id"],
    )
    payload = json.dumps({"nodes": sorted_nodes, "edges": sorted_edges}, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


class ProvenanceDAGBuilder:
    """Constructs auditable provenance dependency DAGs from AnalysisRun and Case data."""

    @classmethod
    def build_run_dag(
        cls,
        run: AnalysisRun,
        artifacts: List[Artifact],
        evidence_dna_items: Optional[List[EvidenceDNA]] = None,
        completeness_reports: Optional[List[Any]] = None,
    ) -> ProvenanceDAG:
        """Constructs a ProvenanceDAG for a specific AnalysisRun (baseline or challenge)."""
        nodes: List[DAGNode] = []
        edges: List[DAGEdge] = []
        seen_node_ids: Set[str] = set()
        seen_edge_keys: Set[Tuple[str, str, str]] = set()
        edge_count = 0

        def add_node(n: DAGNode) -> None:
            if n.node_id not in seen_node_ids:
                seen_node_ids.add(n.node_id)
                nodes.append(n)

        def add_edge(src: str, dst: str, etype: DAGEdgeType, label: str) -> None:
            nonlocal edge_count
            key = (src, dst, etype.value)
            if key not in seen_edge_keys:
                seen_edge_keys.add(key)
                edge_count += 1
                edges.append(
                    DAGEdge(
                        edge_id=f"edge-{edge_count:04d}",
                        source_id=src,
                        target_id=dst,
                        edge_type=etype,
                        label=label,
                    )
                )

        excluded_ids = set(run.excluded_artifact_ids)
        dna_map: Dict[str, EvidenceDNA] = {d.evidence_id: d for d in (evidence_dna_items or [])}

        # 1. Artifact Nodes
        for art in sorted(artifacts, key=lambda a: a.artifact_id):
            is_excluded = art.artifact_id in excluded_ids
            status = DAGNodeStatus.INACTIVE if is_excluded else DAGNodeStatus.ACTIVE
            add_node(
                DAGNode(
                    node_id=f"art:{art.artifact_id}",
                    node_type=DAGNodeType.ARTIFACT,
                    label=art.filename,
                    status=status,
                    title=f"Preserved Artifact: {art.filename}",
                    description=f"Recorded SHA-256: {art.sha256[:16]}... (Trust Tier: {art.source_tier.value})",
                    source_artifact_id=art.artifact_id,
                    run_id=run.run_id,
                    metadata={
                        "sha256": art.sha256,
                        "file_size_bytes": art.file_size_bytes,
                        "source_tier": art.source_tier.value,
                        "intake_timestamp": art.intake_timestamp_iso,
                        "is_excluded": is_excluded,
                    },
                )
            )

        # 1.5 Completeness Assessment Nodes (Optional Phase 4C derivation tracking)
        if completeness_reports:
            for rep in completeness_reports:
                art_id = getattr(rep, "artifact_id", None)
                if not art_id:
                    continue
                is_excluded = art_id in excluded_ids
                status = DAGNodeStatus.INACTIVE if is_excluded else DAGNodeStatus.ACTIVE
                c_idx = getattr(rep, "completeness_index", 0.0)
                is_doc_complete = getattr(rep, "document_level_complete", False)
                comp_node_id = f"comp:{art_id}"
                add_node(
                    DAGNode(
                        node_id=comp_node_id,
                        node_type=DAGNodeType.COMPLETENESS_ASSESSMENT,
                        label=f"Completeness {c_idx}%",
                        status=status,
                        title=f"Completeness Assessment: {art_id}",
                        description=f"Completeness Index: {c_idx}%. Document-level complete: {is_doc_complete}.",
                        source_artifact_id=art_id,
                        run_id=run.run_id,
                        metadata={
                            "completeness_index": c_idx,
                            "document_level_complete": is_doc_complete,
                            "total_expected_fields": getattr(rep, "total_expected_fields", 0),
                            "extracted_count": getattr(rep, "extracted_count", 0),
                        },
                    )
                )
                add_edge(
                    src=f"art:{art_id}",
                    dst=comp_node_id,
                    etype=DAGEdgeType.EVALUATED_BY,
                    label="EVALUATED_BY completeness engine",
                )

        # 2. Evidence DNA Nodes
        # Build DNA nodes for facts present in run or belonging to registered artifacts
        seen_dna: Set[str] = set()
        for fact in sorted(run.derived_facts, key=lambda f: f.fact_id):
            dna_id = fact.evidence_id
            if dna_id and dna_id not in seen_dna:
                seen_dna.add(dna_id)
                dna_obj = dna_map.get(dna_id)
                dna_label = dna_obj.source_line_ref if dna_obj else fact.source_location
                is_art_excluded = fact.artifact_id in excluded_ids
                status = DAGNodeStatus.INACTIVE if is_art_excluded else DAGNodeStatus.ACTIVE

                add_node(
                    DAGNode(
                        node_id=f"dna:{dna_id}",
                        node_type=DAGNodeType.EVIDENCE_DNA,
                        label=f"DNA {dna_id.split('-')[-1]} ({dna_label})",
                        status=status,
                        title=f"Evidence DNA: {dna_id}",
                        description=f"Extracted verbatim from {fact.source_filename} at {fact.source_location}",
                        source_artifact_id=fact.artifact_id,
                        evidence_id=dna_id,
                        source_location=fact.source_location,
                        run_id=run.run_id,
                        metadata={
                            "source_raw_text": dna_obj.source_raw_text if dna_obj else fact.raw_source_snippet,
                            "kind": fact.kind.value,
                        },
                    )
                )

                # Edge Artifact -> Evidence DNA
                add_edge(
                    src=f"art:{fact.artifact_id}",
                    dst=f"dna:{dna_id}",
                    etype=DAGEdgeType.SUPPLIES,
                    label="SUPPLIES raw bitstream",
                )

        # 3. Extracted Fact Nodes
        for fact in sorted(run.derived_facts, key=lambda f: f.fact_id):
            is_art_excluded = fact.artifact_id in excluded_ids
            status = DAGNodeStatus.INACTIVE if is_art_excluded else DAGNodeStatus.ACTIVE
            amt_label = f" ₹{fact.amount:,.2f}" if fact.amount is not None else ""
            add_node(
                DAGNode(
                    node_id=f"fact:{fact.fact_id}",
                    node_type=DAGNodeType.EXTRACTED_FACT,
                    label=f"{fact.kind.value}{amt_label}",
                    status=status,
                    title=f"Canonical Fact: {fact.kind.value}",
                    description=fact.summary,
                    source_artifact_id=fact.artifact_id,
                    fact_id=fact.fact_id,
                    evidence_id=fact.evidence_id,
                    source_location=fact.source_location,
                    run_id=run.run_id,
                    amount=fact.amount,
                    metadata={
                        "identifiers": fact.identifiers,
                        "utc_iso": fact.time_provenance.utc_iso,
                        "trust_tier": fact.trust_tier.value,
                    },
                )
            )

            # Edge Evidence DNA -> Extracted Fact
            add_edge(
                src=f"dna:{fact.evidence_id}",
                dst=f"fact:{fact.fact_id}",
                etype=DAGEdgeType.EXTRACTED_FROM,
                label="EXTRACTED_FROM verbatim record",
            )

        # 4. Correlation Rule Nodes (Rules triggered by active run correlations / gaps)
        active_rule_ids: Set[str] = set()
        for corr in run.correlations:
            active_rule_ids.add(corr.rule_id)
        for gap in run.evidence_gaps:
            active_rule_ids.add(gap.rule_id)
        # Direct bank finding rule if present
        if any(f.finding_id == "FINDING-04" for f in run.finding_summaries):
            active_rule_ids.add("SUPPLIED_BANK_STATEMENT_RECORD")

        for r_id in sorted(active_rule_ids):
            decl_rule = DEFAULT_RULE_REGISTRY.get_rule(r_id)
            rule_name = decl_rule.display_name if decl_rule else r_id
            rule_purpose = decl_rule.purpose if decl_rule else "Correlation evaluation"
            rule_op = decl_rule.operator.value if decl_rule else "exact_match"
            add_node(
                DAGNode(
                    node_id=f"rule:{r_id}",
                    node_type=DAGNodeType.CORRELATION_RULE,
                    label=rule_name,
                    status=DAGNodeStatus.ACTIVE,
                    title=f"Rule: {r_id} ({rule_op})",
                    description=rule_purpose,
                    rule_id=r_id,
                    run_id=run.run_id,
                    metadata={
                        "operator": rule_op,
                        "join_key": decl_rule.join_key if decl_rule else None,
                        "field_paths": decl_rule.field_paths if decl_rule else [],
                        "version": decl_rule.version if decl_rule else "1.0.0",
                        "time_window": decl_rule.time_window if decl_rule else None,
                    },
                )
            )

        # 5. Correlation & Contradiction Nodes (use distinct set from run.correlations)
        distinct_corrs = {c.correlation_id: c for c in run.correlations}
        for corr in sorted(distinct_corrs.values(), key=lambda c: c.correlation_id):
            c_type = DAGNodeType.CONTRADICTION if corr.is_contradiction else DAGNodeType.CORRELATION
            add_node(
                DAGNode(
                    node_id=f"corr:{corr.correlation_id}",
                    node_type=c_type,
                    label=corr.rule_name,
                    status=DAGNodeStatus.ACTIVE,
                    title=f"{c_type.value}: {corr.correlation_id}",
                    description=corr.explanation_text,
                    rule_id=corr.rule_id,
                    run_id=run.run_id,
                    metadata={
                        "rule_version": corr.rule_version,
                        "time_window": corr.time_window,
                        "rejection_reason": corr.rejection_reason,
                    },
                )
            )

            # Edge Rule -> Correlation
            add_edge(
                src=f"rule:{corr.rule_id}",
                dst=f"corr:{corr.correlation_id}",
                etype=DAGEdgeType.GENERATED,
                label="GENERATED by rule evaluation",
            )

            # Edges Facts -> Rule (Triggered)
            for f in run.derived_facts:
                if f.evidence_id in corr.evidence_inputs:
                    add_edge(
                        src=f"fact:{f.fact_id}",
                        dst=f"rule:{corr.rule_id}",
                        etype=DAGEdgeType.TRIGGERED,
                        label="TRIGGERED rule evaluation",
                    )

        # 6. Evidence Gap Nodes
        for gap in sorted(run.evidence_gaps, key=lambda g: g.gap_id):
            add_node(
                DAGNode(
                    node_id=f"gap:{gap.gap_id}",
                    node_type=DAGNodeType.EVIDENCE_GAP,
                    label=f"Gap: {gap.expected_evidence_type}",
                    status=DAGNodeStatus.ACTIVE,
                    title=f"Evidence Gap: {gap.gap_id}",
                    description=gap.explanation,
                    rule_id=gap.rule_id,
                    source_artifact_id=gap.artifact_id,
                    fact_id=gap.claiming_fact_id,
                    evidence_id=gap.claiming_evidence_id,
                    run_id=run.run_id,
                    metadata={"search_parameters": gap.search_parameters},
                )
            )

            # Edge Rule -> Gap
            add_edge(
                src=f"rule:{gap.rule_id}",
                dst=f"gap:{gap.gap_id}",
                etype=DAGEdgeType.GENERATED,
                label="GENERATED by rule search",
            )

            # Edge Claiming Fact -> Rule
            add_edge(
                src=f"fact:{gap.claiming_fact_id}",
                dst=f"rule:{gap.rule_id}",
                etype=DAGEdgeType.TRIGGERED,
                label="TRIGGERED missing check",
            )

        # 7. Finding Nodes
        for finding in sorted(run.finding_summaries, key=lambda f: f.finding_id):
            add_node(
                DAGNode(
                    node_id=f"finding:{finding.finding_id}",
                    node_type=DAGNodeType.FINDING,
                    label=f"{finding.finding_id}: {finding.rule_name}",
                    status=DAGNodeStatus.ACTIVE if finding.status == "ACTIVE" else DAGNodeStatus.INACTIVE,
                    title=finding.title,
                    description=finding.explanation,
                    rule_id=finding.rule_id,
                    run_id=run.run_id,
                    metadata={
                        "supporting_artifacts": finding.supporting_artifact_ids,
                        "supporting_evidence": finding.supporting_evidence_ids,
                    },
                )
            )

            # Connect Finding to its generating Correlation, Contradiction, Evidence Gap, or Fact
            for corr in distinct_corrs.values():
                if corr.rule_id == finding.rule_id:
                    add_edge(
                        src=f"corr:{corr.correlation_id}",
                        dst=f"finding:{finding.finding_id}",
                        etype=DAGEdgeType.SUPPORTS if not corr.is_contradiction else DAGEdgeType.CONTRADICTS,
                        label="SUPPORTS finding" if not corr.is_contradiction else "CONTRADICTS receipt claim",
                    )

            for gap in run.evidence_gaps:
                if gap.rule_id == finding.rule_id:
                    add_edge(
                        src=f"gap:{gap.gap_id}",
                        dst=f"finding:{finding.finding_id}",
                        etype=DAGEdgeType.SUPPORTS,
                        label="SUPPORTS gap finding",
                    )

            # If finding is direct bank observation (FINDING-04)
            if finding.finding_id == "FINDING-04":
                # Link rule SUPPLIED_BANK_STATEMENT_RECORD to finding
                if "rule:SUPPLIED_BANK_STATEMENT_RECORD" in seen_node_ids:
                    add_edge(
                        src="rule:SUPPLIED_BANK_STATEMENT_RECORD",
                        dst=f"finding:{finding.finding_id}",
                        etype=DAGEdgeType.GENERATED,
                        label="GENERATED observation finding",
                    )
                # Link bank fact to rule
                for f in run.derived_facts:
                    if f.kind == CanonicalFactKind.BANK_TRANSACTION:
                        add_edge(
                            src=f"fact:{f.fact_id}",
                            dst="rule:SUPPLIED_BANK_STATEMENT_RECORD",
                            etype=DAGEdgeType.TRIGGERED,
                            label="TRIGGERED bank observation",
                        )

        # 8. Hypothesis Assessment Nodes
        for hyp in sorted(run.hypothesis_assessments, key=lambda h: h.hypothesis_id):
            add_node(
                DAGNode(
                    node_id=f"hyp:{hyp.hypothesis_id}",
                    node_type=DAGNodeType.HYPOTHESIS_ASSESSMENT,
                    label=f"{hyp.hypothesis_id}: {hyp.title}",
                    status=DAGNodeStatus.ACTIVE,
                    title=f"{hyp.hypothesis_id}: {hyp.title}",
                    description=hyp.rationale,
                    run_id=run.run_id,
                    metadata={
                        "assessment_label": hyp.assessment_label.value,
                        "distinguishing_needed": hyp.distinguishing_evidence_needed,
                    },
                )
            )

            # Connect relevant findings to hypothesis
            hyp_finding_map = {
                "H1": ["FINDING-01", "FINDING-04"],
                "H2": ["FINDING-01", "FINDING-04"],
                "H3": ["FINDING-02", "FINDING-04"],
                "H4": ["FINDING-01", "FINDING-02", "FINDING-03"],
            }
            target_findings = hyp_finding_map.get(hyp.hypothesis_id, [])
            for f_id in target_findings:
                if f"finding:{f_id}" in seen_node_ids:
                    add_edge(
                        src=f"finding:{f_id}",
                        dst=f"hyp:{hyp.hypothesis_id}",
                        etype=DAGEdgeType.INFORMS,
                        label="INFORMS hypothesis assessment",
                    )

        fingerprint = compute_dag_fingerprint(nodes, edges)

        dag = ProvenanceDAG(
            dag_id=f"dag_{run.run_id}",
            run_id=run.run_id,
            case_id=run.case_id,
            run_type=run.run_type,
            nodes=nodes,
            edges=edges,
            fingerprint=fingerprint,
        )

        return dag

    @classmethod
    def build_challenge_impact_dag(
        cls,
        baseline_run: AnalysisRun,
        challenge_run: AnalysisRun,
        artifacts: List[Artifact],
        evidence_dna_items: Optional[List[EvidenceDNA]] = None,
    ) -> ProvenanceDAG:
        """Constructs a Counterfactual Impact DAG comparing baseline run with challenge run.
        
        Highlights:
        - Inactive nodes (excluded screenshot, derived facts, amount-mismatch contradiction, dependent finding).
        - Surviving nodes (bank transaction, causal payment flow, uncorroborated claim).
        - Edge labeled EXCLUDED_FROM_ACTIVE_RUN from excluded artifact.
        """
        # Start from baseline DAG as foundational graph
        base_dag = cls.build_run_dag(baseline_run, artifacts, evidence_dna_items)
        challenge_dag = cls.build_run_dag(challenge_run, artifacts, evidence_dna_items)

        active_challenge_node_ids = {n.node_id for n in challenge_dag.nodes if n.status == DAGNodeStatus.ACTIVE}
        excluded_artifact_ids = set(challenge_run.excluded_artifact_ids)

        # Classify each node in baseline DAG
        annotated_nodes: List[DAGNode] = []
        for node in base_dag.nodes:
            new_node = node.model_copy(deep=True)
            # Check if this node is an excluded artifact
            if node.node_type == DAGNodeType.ARTIFACT and node.source_artifact_id in excluded_artifact_ids:
                new_node.status = DAGNodeStatus.INACTIVE
                new_node.metadata["challenge_impact"] = "EXCLUDED_FROM_ACTIVE_RUN"
            elif node.node_type in [DAGNodeType.EVIDENCE_DNA, DAGNodeType.EXTRACTED_FACT] and node.source_artifact_id in excluded_artifact_ids:
                new_node.status = DAGNodeStatus.INACTIVE
                new_node.metadata["challenge_impact"] = "DEACTIVATED_BY_CHALLENGE"
            elif node.node_type in [DAGNodeType.CONTRADICTION, DAGNodeType.CORRELATION]:
                # Find matching correlation in baseline run
                base_corr = next((c for c in baseline_run.correlations if f"corr:{c.correlation_id}" == node.node_id), None)
                if base_corr and any(aid in excluded_artifact_ids for aid in (base_corr.artifact_inputs or [])):
                    new_node.status = DAGNodeStatus.INACTIVE
                    new_node.metadata["challenge_impact"] = "DEACTIVATED_BY_CHALLENGE"
                else:
                    has_matching_challenge = any(
                        c.rule_id == node.rule_id and set(c.evidence_inputs) == set(base_corr.evidence_inputs if base_corr else [])
                        for c in challenge_run.correlations
                    )
                    if not has_matching_challenge:
                        new_node.status = DAGNodeStatus.INACTIVE
                        new_node.metadata["challenge_impact"] = "DEACTIVATED_BY_CHALLENGE"
                    else:
                        new_node.status = DAGNodeStatus.SURVIVING
                        new_node.metadata["challenge_impact"] = "SURVIVING_INDEPENDENT_EVIDENCE"
            # Check if this node was removed in challenge run
            elif node.node_id not in active_challenge_node_ids:
                new_node.status = DAGNodeStatus.INACTIVE
                new_node.metadata["challenge_impact"] = "DEACTIVATED_BY_CHALLENGE"
            else:
                # Present in both runs!
                new_node.status = DAGNodeStatus.SURVIVING
                new_node.metadata["challenge_impact"] = "SURVIVING_INDEPENDENT_EVIDENCE"
            annotated_nodes.append(new_node)

        # Annotate edges
        annotated_edges: List[DAGEdge] = []
        for edge in base_dag.edges:
            new_edge = edge.model_copy(deep=True)
            # If edge connects from an excluded artifact or inactive node
            src_node = next((n for n in annotated_nodes if n.node_id == edge.source_id), None)
            dst_node = next((n for n in annotated_nodes if n.node_id == edge.target_id), None)
            if src_node and src_node.status == DAGNodeStatus.INACTIVE:
                if src_node.node_type == DAGNodeType.ARTIFACT and src_node.source_artifact_id in excluded_artifact_ids:
                    new_edge.edge_type = DAGEdgeType.EXCLUDED_FROM_ACTIVE_RUN
                    new_edge.label = "EXCLUDED_FROM_ACTIVE_RUN"
            annotated_edges.append(new_edge)

        fingerprint = compute_dag_fingerprint(annotated_nodes, annotated_edges)

        return ProvenanceDAG(
            dag_id=f"impact_dag_{challenge_run.run_id}",
            run_id=challenge_run.run_id,
            case_id=challenge_run.case_id,
            run_type="CHALLENGE_IMPACT",
            nodes=annotated_nodes,
            edges=annotated_edges,
            fingerprint=fingerprint,
        )

    @classmethod
    def build_artifact_derivation_dag(
        cls,
        artifact_id: str,
        run: AnalysisRun,
        artifacts: List[Artifact],
        evidence_dna_items: Optional[List[EvidenceDNA]] = None,
    ) -> ProvenanceDAG:
        """Constructs a scoped derivation sub-DAG originating strictly from a single artifact."""
        full_dag = cls.build_run_dag(run, artifacts, evidence_dna_items)
        root_node_id = f"art:{artifact_id}"

        # Get all downstream descendants reachable from this artifact
        descendant_ids = full_dag.get_descendants(root_node_id)
        scoped_node_ids = {root_node_id}.union(descendant_ids)

        scoped_nodes = [n for n in full_dag.nodes if n.node_id in scoped_node_ids]
        scoped_edges = [
            e for e in full_dag.edges if e.source_id in scoped_node_ids and e.target_id in scoped_node_ids
        ]

        fingerprint = compute_dag_fingerprint(scoped_nodes, scoped_edges)

        return ProvenanceDAG(
            dag_id=f"derivation_dag_{artifact_id}_{run.run_id}",
            run_id=run.run_id,
            case_id=run.case_id,
            run_type=run.run_type,
            nodes=scoped_nodes,
            edges=scoped_edges,
            fingerprint=fingerprint,
        )
