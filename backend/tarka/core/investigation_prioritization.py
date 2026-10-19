"""TARKA Phase 5D: Evidence Intelligence & Investigation Prioritization Engine.

Forensic Principles:
1. Deterministic Prioritization:
   - Evaluates evidence importance, contradiction severity, missing information, relationship centrality,
     and timeline anomalies using an explicit, auditable scoring formula.
   - Zero LLM-hallucinated or opaque heuristic risk scores.
2. Epistemic Humility & Assistance Posture:
   - Answers: "After analyzing all available evidence, what should the investigator look at next?"
   - Does NOT decide guilt, intent, or fraud.
   - Does NOT draw definitive legal conclusions.
3. Strict Formula:
   Priority = (
       Contradiction Severity Weight
       + Evidence Dependency Count
       + Graph Centrality
       + Evidence Gap Impact
       + Temporal Importance
   ) - Already Reviewed Weight
   Clamped between 0 and 100.
4. Counterfactual Sensitivity:
   - Items dependent on challenged or excluded artifacts are deactivated or down-weighted,
     while independent surviving items maintain priority.
"""

from __future__ import annotations

import hashlib
import json
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from pydantic import BaseModel, Field

from tarka.core.canonical_fact import CanonicalFact
from tarka.core.evidence_dna import Artifact
from tarka.core.analysis_run import AnalysisRun
from tarka.core.contradiction_analysis import (
    CaseForensicAnalysis,
    ContradictionFinding,
    ForensicEvidenceGap,
    FindingSeverity,
    FindingStatus,
    EvidenceGapStatus,
)
from tarka.core.timeline_reconstruction import (
    ForensicTimeline,
    ForensicTimelineEvent,
    TemporalConflict,
)
from tarka.core.investigation_graph import (
    InvestigationGraph,
    InvestigationNode,
    InvestigationEdge,
    ForensicNodeType,
    ForensicEdgeType,
    ForensicNodeStatus,
    compute_investigation_fingerprint,
)


class PriorityLevel(str, Enum):
    """Categorical priority rating for investigator attention."""
    CRITICAL = "CRITICAL"  # >= 75
    HIGH = "HIGH"          # 50 - 74
    MEDIUM = "MEDIUM"      # 25 - 49
    LOW = "LOW"            # < 25


class PriorityTargetType(str, Enum):
    """Type of evidentiary object prioritized for investigation."""
    CONTRADICTION = "CONTRADICTION"
    EVIDENCE_GAP = "EVIDENCE_GAP"
    ARTIFACT = "ARTIFACT"
    TIMELINE_ANOMALY = "TIMELINE_ANOMALY"
    ENTITY = "ENTITY"


class PriorityScoreBreakdown(BaseModel):
    """Deterministic component breakdown of the priority score."""
    contradiction_severity_weight: float = Field(default=0.0, ge=0.0)
    evidence_dependency_count_weight: float = Field(default=0.0, ge=0.0)
    graph_centrality_weight: float = Field(default=0.0, ge=0.0)
    evidence_gap_impact_weight: float = Field(default=0.0, ge=0.0)
    temporal_importance_weight: float = Field(default=0.0, ge=0.0)
    already_reviewed_discount: float = Field(default=0.0, ge=0.0)
    raw_score: float = Field(default=0.0)
    final_score: int = Field(default=0, ge=0, le=100)


class InvestigationPriorityItem(BaseModel):
    """A prioritized investigation recommendation for human examiners."""
    id: str = Field(description="Unique stable priority action ID (e.g. PRIO-CONTRA-AMT-202602148891)")
    title: str = Field(description="Clear, actionable action recommendation")
    priority_score: int = Field(ge=0, le=100, description="Deterministic priority score 0-100")
    priority_level: PriorityLevel = Field(description="CRITICAL, HIGH, MEDIUM, or LOW")
    target_type: PriorityTargetType = Field(description="CONTRADICTION, EVIDENCE_GAP, ARTIFACT, TIMELINE_ANOMALY, or ENTITY")
    target_id: str = Field(description="ID of the underlying finding, gap, artifact, or event")
    reason: str = Field(description="Explainable forensic rationale justifying this priority rank")
    score_breakdown: PriorityScoreBreakdown = Field(description="Mathematical score components")
    supporting_rules: List[str] = Field(default_factory=list, description="Declarative rule IDs governing this priority")
    related_artifacts: List[str] = Field(default_factory=list, description="Linked artifact IDs")
    related_facts: List[str] = Field(default_factory=list, description="Linked canonical fact IDs")
    is_reviewed: bool = Field(default=False, description="True if examiner has already reviewed/acted on this item")
    status: str = Field(default="ACTIVE", description="ACTIVE or INACTIVE (under counterfactual exclusion)")
    inactive_reason: Optional[str] = Field(default=None, description="Reason if deactivated in challenge run")

    def to_graph_node(self) -> InvestigationNode:
        """Converts priority item to an InvestigationNode."""
        node_status = (
            ForensicNodeStatus.INACTIVE.value
            if self.status == "INACTIVE"
            else ForensicNodeStatus.REVIEW_REQUIRED.value
            if self.priority_level == PriorityLevel.CRITICAL
            else ForensicNodeStatus.ACTIVE.value
        )
        return InvestigationNode(
            node_id=f"prio:{self.id}",
            node_type=ForensicNodeType.INVESTIGATION_PRIORITY,
            label=f"Priority: {self.title[:30]}",
            title=self.title,
            subtitle=f"{self.priority_level.value} ({self.priority_score}/100)",
            description=self.reason,
            source_artifact_ids=self.related_artifacts,
            provenance_ids=self.related_artifacts + self.related_facts,
            status=node_status,
            inactive_reason=self.inactive_reason,
            rule_id=self.supporting_rules[0] if self.supporting_rules else "",
            metadata={
                "priority_id": self.id,
                "priority_score": self.priority_score,
                "priority_level": self.priority_level.value,
                "target_type": self.target_type.value,
                "target_id": self.target_id,
                "score_breakdown": self.score_breakdown.model_dump(),
                "supporting_rules": self.supporting_rules,
                "is_reviewed": self.is_reviewed,
            },
        )


class CaseInvestigationPriorities(BaseModel):
    """Complete ranked priority queue of investigative actions for a case."""
    case_id: str
    run_id: Optional[str] = None
    total_items: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    items: List[InvestigationPriorityItem] = Field(default_factory=list)
    fingerprint: str = Field(description="Deterministic SHA-256 digest sealing priority queue")


# -----------------------------------------------------------------------------
# Deterministic Prioritization Engine
# -----------------------------------------------------------------------------

class InvestigationPrioritizationEngine:
    """Computes deterministic priority scores and ranks investigation paths."""

    def __init__(
        self,
        critical_contra_weight: float = 45.0,
        high_contra_weight: float = 25.0,
        medium_contra_weight: float = 15.0,
        low_contra_weight: float = 5.0,
        mandatory_gap_weight: float = 20.0,
        optional_gap_weight: float = 10.0,
        temporal_anomaly_weight: float = 15.0,
        reviewed_discount: float = 35.0,
    ) -> None:
        self.critical_contra_weight = critical_contra_weight
        self.high_contra_weight = high_contra_weight
        self.medium_contra_weight = medium_contra_weight
        self.low_contra_weight = low_contra_weight
        self.mandatory_gap_weight = mandatory_gap_weight
        self.optional_gap_weight = optional_gap_weight
        self.temporal_anomaly_weight = temporal_anomaly_weight
        self.reviewed_discount = reviewed_discount

    def prioritize_case(
        self,
        case_id: str,
        artifacts: List[Artifact],
        facts: List[CanonicalFact],
        analysis: CaseForensicAnalysis,
        timeline: Optional[ForensicTimeline] = None,
        graph: Optional[InvestigationGraph] = None,
        run: Optional[AnalysisRun] = None,
        excluded_artifact_ids: Optional[Union[List[str], Set[str]]] = None,
    ) -> CaseInvestigationPriorities:
        """Evaluates all evidence components and yields deterministic ranked priorities."""
        excluded_ids: Set[str] = set()
        if excluded_artifact_ids:
            excluded_ids.update(excluded_artifact_ids)
        if run and run.excluded_artifact_ids:
            excluded_ids.update(run.excluded_artifact_ids)

        items: List[InvestigationPriorityItem] = []

        # Build graph node degree mapping if graph is provided
        node_degrees: Dict[str, int] = {}
        if graph:
            for edge in graph.edges:
                node_degrees[edge.source_id] = node_degrees.get(edge.source_id, 0) + 1
                node_degrees[edge.target_id] = node_degrees.get(edge.target_id, 0) + 1

        # ---------------------------------------------------------------------
        # 1. Prioritize Contradictions
        # ---------------------------------------------------------------------
        for contra in analysis.contradictions:
            deps = contra.source_artifact_ids
            is_inactive = bool(set(deps) & excluded_ids) or contra.status == FindingStatus.INACTIVE.value

            # Severity Weight
            sev_weight = 0.0
            if contra.severity == FindingSeverity.CRITICAL or contra.severity == "CRITICAL":
                sev_weight = self.critical_contra_weight
            elif contra.severity == FindingSeverity.HIGH or contra.severity == "HIGH":
                sev_weight = self.high_contra_weight
            elif contra.severity == FindingSeverity.MEDIUM or contra.severity == "MEDIUM":
                sev_weight = self.medium_contra_weight
            else:
                sev_weight = self.low_contra_weight

            # Dependency Count Weight: number of supporting facts and artifacts
            dep_count = len(contra.supporting_fact_ids) + len(contra.source_artifact_ids)
            dep_weight = min(20.0, float(dep_count) * 4.0)

            # Graph Centrality: degree of related nodes
            deg = 0
            for art_id in contra.source_artifact_ids:
                deg += node_degrees.get(f"ent:art:{art_id}", 0)
            centrality_weight = min(20.0, float(deg) * 2.5)

            # Temporal Importance: if it involves timeline conflict or timestamp conflict
            temporal_weight = 0.0
            if contra.category == "TIMESTAMP_CONFLICT":
                temporal_weight = self.temporal_anomaly_weight
            elif timeline and any(
                bool(e.identifiers.get("rrn") and e.identifiers.get("rrn") in contra.finding_id)
                for e in timeline.events
            ):
                temporal_weight = 8.0

            # Evidence Gap Impact: if any related artifact has an unaddressed gap
            gap_weight = 0.0
            has_related_gap = any(
                bool(set(g.relevant_artifact_ids) & set(contra.source_artifact_ids))
                for g in analysis.evidence_gaps
            )
            if has_related_gap:
                gap_weight = 12.0

            # Already Reviewed Discount
            is_rev = contra.review_state not in ["UNREVIEWED", "", None]
            discount = self.reviewed_discount if is_rev else 0.0

            raw_score = (sev_weight + dep_weight + centrality_weight + gap_weight + temporal_weight) - discount
            if is_inactive:
                raw_score = max(0.0, raw_score * 0.15)  # Deactivated items drop to low priority

            final_score = int(round(max(0.0, min(100.0, raw_score))))
            level = self._score_to_level(final_score)

            # Rules triggered
            rules = ["RULE_PRIORITY_CRITICAL_CONTRADICTION"]
            if contra.rule_id:
                rules.append(contra.rule_id)
            if not is_rev:
                rules.append("RULE_PRIORITY_REVIEW_PENDING")

            items.append(
                InvestigationPriorityItem(
                    id=f"PRIO-CONTRA-{contra.finding_id}",
                    title=f"Resolve Discrepancy: {contra.title}",
                    priority_score=final_score,
                    priority_level=level,
                    target_type=PriorityTargetType.CONTRADICTION,
                    target_id=contra.finding_id,
                    reason=(
                        f"High-impact discrepancy ({contra.category}) between source records. "
                        f"Discrepancy involves {len(contra.source_artifact_ids)} artifact(s) and {len(contra.supporting_fact_ids)} fact(s). "
                        f"Examiner determination {'pending' if not is_rev else 'already logged'}."
                    ),
                    score_breakdown=PriorityScoreBreakdown(
                        contradiction_severity_weight=sev_weight,
                        evidence_dependency_count_weight=dep_weight,
                        graph_centrality_weight=centrality_weight,
                        evidence_gap_impact_weight=gap_weight,
                        temporal_importance_weight=temporal_weight,
                        already_reviewed_discount=discount,
                        raw_score=raw_score,
                        final_score=final_score,
                    ),
                    supporting_rules=rules,
                    related_artifacts=contra.source_artifact_ids,
                    related_facts=contra.supporting_fact_ids,
                    is_reviewed=is_rev,
                    status="INACTIVE" if is_inactive else "ACTIVE",
                    inactive_reason=contra.inactive_reason if is_inactive else None,
                )
            )

        # ---------------------------------------------------------------------
        # 2. Prioritize Evidence Gaps
        # ---------------------------------------------------------------------
        for gap in analysis.evidence_gaps:
            deps = gap.relevant_artifact_ids
            is_inactive = (
                bool(set(deps) & excluded_ids)
                or gap.active_status == "INACTIVE"
            )

            # Gap Impact Weight
            gap_weight = (
                self.mandatory_gap_weight
                if gap.is_mandatory_for_resolution
                else self.optional_gap_weight
            )

            # Dependency Weight
            dep_count = len(gap.relevant_fact_ids) + len(gap.relevant_artifact_ids)
            dep_weight = min(15.0, float(dep_count) * 4.0)

            # Centrality Weight
            deg = 0
            for art_id in gap.relevant_artifact_ids:
                deg += node_degrees.get(f"ent:art:{art_id}", 0)
            centrality_weight = min(15.0, float(deg) * 2.0)

            # Contradiction Weight: if gap relates to an active contradiction
            contra_weight = 0.0
            related_contra = any(
                bool(set(c.source_artifact_ids) & set(gap.relevant_artifact_ids))
                for c in analysis.contradictions
            )
            if related_contra:
                contra_weight = 15.0

            # Temporal Weight
            temporal_weight = 0.0
            if gap.category == "UNRELIABLE_TIMESTAMP":
                temporal_weight = self.temporal_anomaly_weight

            # Review Discount: if resolved or confirmed absent
            is_rev = gap.status in [EvidenceGapStatus.RESOLVED, EvidenceGapStatus.CONFIRMED_ABSENT]
            discount = self.reviewed_discount if is_rev else 0.0

            raw_score = (contra_weight + dep_weight + centrality_weight + gap_weight + temporal_weight) - discount
            if is_inactive:
                raw_score = max(0.0, raw_score * 0.15)

            final_score = int(round(max(0.0, min(100.0, raw_score))))
            level = self._score_to_level(final_score)

            rules = ["RULE_PRIORITY_EVIDENCE_GAP"]
            if gap.exposed_by_rule_id:
                rules.append(gap.exposed_by_rule_id)
            if not is_rev:
                rules.append("RULE_PRIORITY_REVIEW_PENDING")

            items.append(
                InvestigationPriorityItem(
                    id=f"PRIO-GAP-{gap.gap_id}",
                    title=f"Address Evidence Gap: {gap.title}",
                    priority_score=final_score,
                    priority_level=level,
                    target_type=PriorityTargetType.EVIDENCE_GAP,
                    target_id=gap.gap_id,
                    reason=(
                        f"Evidentiary absence ({gap.status.value}): {gap.why_it_matters} "
                        f"Suggested investigative remedy: {gap.suggested_remedy}"
                    ),
                    score_breakdown=PriorityScoreBreakdown(
                        contradiction_severity_weight=contra_weight,
                        evidence_dependency_count_weight=dep_weight,
                        graph_centrality_weight=centrality_weight,
                        evidence_gap_impact_weight=gap_weight,
                        temporal_importance_weight=temporal_weight,
                        already_reviewed_discount=discount,
                        raw_score=raw_score,
                        final_score=final_score,
                    ),
                    supporting_rules=rules,
                    related_artifacts=gap.relevant_artifact_ids,
                    related_facts=gap.relevant_fact_ids,
                    is_reviewed=is_rev,
                    status="INACTIVE" if is_inactive else "ACTIVE",
                    inactive_reason=gap.inactive_reason if is_inactive else None,
                )
            )

        # ---------------------------------------------------------------------
        # 3. Prioritize Timeline Anomalies
        # ---------------------------------------------------------------------
        if timeline and timeline.temporal_conflicts:
            for tc in timeline.temporal_conflicts:
                tc_event_ids = tc.get("event_ids", []) if isinstance(tc, dict) else getattr(tc, "event_ids", [])
                tc_conflict_id = tc.get("conflict_id", "") if isinstance(tc, dict) else getattr(tc, "conflict_id", "")
                tc_conflict_type = tc.get("conflict_type", "TEMPORAL_CONFLICT") if isinstance(tc, dict) else getattr(tc, "conflict_type", "TEMPORAL_CONFLICT")
                tc_explanation = tc.get("explanation", "") if isinstance(tc, dict) else getattr(tc, "explanation", "")

                deps = []
                for eid in tc_event_ids:
                    evt = next((e for e in timeline.events if e.event_id == eid or getattr(e, "id", None) == eid), None)
                    if evt:
                        deps.extend(evt.source_artifact_ids)
                deps = list(set(deps))
                is_inactive = bool(set(deps) & excluded_ids)

                raw_score = self.temporal_anomaly_weight + self.high_contra_weight + min(15.0, len(tc_event_ids) * 5.0)
                if is_inactive:
                    raw_score = max(0.0, raw_score * 0.15)

                final_score = int(round(max(0.0, min(100.0, raw_score))))
                level = self._score_to_level(final_score)

                items.append(
                    InvestigationPriorityItem(
                        id=f"PRIO-TIME-{tc_conflict_id}",
                        title=f"Investigate Timeline Anomaly: {tc_conflict_type}",
                        priority_score=final_score,
                        priority_level=level,
                        target_type=PriorityTargetType.TIMELINE_ANOMALY,
                        target_id=tc_conflict_id,
                        reason=f"Chronological conflict: {tc_explanation}",
                        score_breakdown=PriorityScoreBreakdown(
                            contradiction_severity_weight=self.high_contra_weight,
                            evidence_dependency_count_weight=float(len(tc_event_ids) * 3),
                            graph_centrality_weight=5.0,
                            evidence_gap_impact_weight=0.0,
                            temporal_importance_weight=self.temporal_anomaly_weight,
                            already_reviewed_discount=0.0,
                            raw_score=raw_score,
                            final_score=final_score,
                        ),
                        supporting_rules=["RULE_PRIORITY_TIMELINE_ANOMALY"],
                        related_artifacts=deps,
                        related_facts=[],
                        is_reviewed=False,
                        status="INACTIVE" if is_inactive else "ACTIVE",
                        inactive_reason="Derived from excluded artifact" if is_inactive else None,
                    )
                )

        # ---------------------------------------------------------------------
        # 4. Prioritize High-Centrality Conflicted Artifacts
        # ---------------------------------------------------------------------
        for art in artifacts:
            is_excluded = art.artifact_id in excluded_ids
            # Calculate how many contradictions and gaps point to this artifact
            involved_contras = [c for c in analysis.contradictions if art.artifact_id in c.source_artifact_ids]
            involved_gaps = [g for g in analysis.evidence_gaps if art.artifact_id in g.relevant_artifact_ids]

            if len(involved_contras) > 0 or len(involved_gaps) > 0:
                has_crit = any(c.severity in [FindingSeverity.CRITICAL, "CRITICAL"] for c in involved_contras)
                sev_weight = self.critical_contra_weight if has_crit else (self.high_contra_weight if involved_contras else 5.0)
                dep_weight = min(20.0, float(len(involved_contras) * 6 + len(involved_gaps) * 4))
                cent_weight = min(20.0, float(node_degrees.get(f"ent:art:{art.artifact_id}", 0)) * 2.0)
                gap_w = 15.0 if involved_gaps else 0.0

                raw_score = sev_weight + dep_weight + cent_weight + gap_w
                if is_excluded:
                    raw_score = max(0.0, raw_score * 0.1)

                final_score = int(round(max(0.0, min(100.0, raw_score))))
                level = self._score_to_level(final_score)

                items.append(
                    InvestigationPriorityItem(
                        id=f"PRIO-ART-{art.artifact_id}",
                        title=f"Verify Artifact Integrity: {art.filename}",
                        priority_score=final_score,
                        priority_level=level,
                        target_type=PriorityTargetType.ARTIFACT,
                        target_id=art.artifact_id,
                        reason=(
                            f"Artifact {art.filename} ({art.artifact_id}) is linked to {len(involved_contras)} contradiction(s) "
                            f"and {len(involved_gaps)} evidence gap(s). Source tier: {art.source_tier.value}."
                        ),
                        score_breakdown=PriorityScoreBreakdown(
                            contradiction_severity_weight=sev_weight,
                            evidence_dependency_count_weight=dep_weight,
                            graph_centrality_weight=cent_weight,
                            evidence_gap_impact_weight=gap_w,
                            temporal_importance_weight=0.0,
                            already_reviewed_discount=0.0,
                            raw_score=raw_score,
                            final_score=final_score,
                        ),
                        supporting_rules=["RULE_PRIORITY_CRITICAL_CONTRADICTION"] if has_crit else ["RULE_PRIORITY_EVIDENCE_GAP"],
                        related_artifacts=[art.artifact_id],
                        related_facts=[],
                        is_reviewed=False,
                        status="INACTIVE" if is_excluded else "ACTIVE",
                        inactive_reason="Artifact is excluded in challenge run" if is_excluded else None,
                    )
                )

        # ---------------------------------------------------------------------
        # 5. Deterministic Sort & Fingerprinting
        # ---------------------------------------------------------------------
        # Sort primary: priority_score DESC, secondary: status (ACTIVE before INACTIVE), tertiary: id ASC
        items.sort(
            key=lambda x: (
                x.status == "ACTIVE",
                x.priority_score,
                -len(x.related_artifacts),
                x.id,
            ),
            reverse=True,
        )

        critical_count = sum(1 for i in items if i.priority_level == PriorityLevel.CRITICAL and i.status == "ACTIVE")
        high_count = sum(1 for i in items if i.priority_level == PriorityLevel.HIGH and i.status == "ACTIVE")
        medium_count = sum(1 for i in items if i.priority_level == PriorityLevel.MEDIUM and i.status == "ACTIVE")
        low_count = sum(1 for i in items if i.priority_level == PriorityLevel.LOW or i.status == "INACTIVE")

        # Deterministic SHA-256 fingerprint
        canonical_str = json.dumps(
            [
                {
                    "id": item.id,
                    "score": item.priority_score,
                    "level": item.priority_level.value,
                    "status": item.status,
                }
                for item in items
            ],
            sort_keys=True,
        )
        fingerprint = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()

        return CaseInvestigationPriorities(
            case_id=case_id,
            run_id=run.run_id if run else None,
            total_items=len(items),
            critical_count=critical_count,
            high_count=high_count,
            medium_count=medium_count,
            low_count=low_count,
            items=items,
            fingerprint=fingerprint,
        )

    def integrate_priorities_into_graph(
        self,
        graph: InvestigationGraph,
        priorities: CaseInvestigationPriorities,
    ) -> InvestigationGraph:
        """Augments an InvestigationGraph with INVESTIGATION_PRIORITY nodes and PRIORITIZED_BY edges."""
        nodes = list(graph.nodes)
        edges = list(graph.edges)
        seen_node_ids = {n.node_id for n in nodes}

        # Select top priorities (e.g. up to top 10 items)
        for item in priorities.items[:12]:
            p_node = item.to_graph_node()
            if p_node.node_id not in seen_node_ids:
                seen_node_ids.add(p_node.node_id)
                nodes.append(p_node)

            # Link priority node to target finding/artifact/gap
            target_node_id = None
            if item.target_type == PriorityTargetType.CONTRADICTION:
                target_node_id = f"find:contra:{item.target_id}"
            elif item.target_type == PriorityTargetType.EVIDENCE_GAP:
                target_node_id = f"find:gap:{item.target_id}"
            elif item.target_type == PriorityTargetType.ARTIFACT:
                target_node_id = f"ent:art:{item.target_id}"
            elif item.target_type == PriorityTargetType.TIMELINE_ANOMALY:
                target_node_id = f"evt:{item.target_id}"

            if target_node_id and target_node_id in seen_node_ids:
                edges.append(
                    InvestigationEdge(
                        edge_id=f"edge:prio_target:{item.id}:{item.target_id}",
                        source_id=target_node_id,
                        target_id=p_node.node_id,
                        edge_type=ForensicEdgeType.PRIORITIZED_BY,
                        label=f"Prioritized ({item.priority_score})",
                        explanation=f"Item prioritized for examiner review: {item.reason[:80]}",
                        provenance_ids=item.related_artifacts,
                        status=item.status,
                    )
                )

            # If critical and unreviewed, link with REQUIRES_REVIEW
            if item.priority_level == PriorityLevel.CRITICAL and not item.is_reviewed:
                for art_id in item.related_artifacts:
                    art_node_id = f"ent:art:{art_id}"
                    if art_node_id in seen_node_ids:
                        edges.append(
                            InvestigationEdge(
                                edge_id=f"edge:req_rev:{item.id}:{art_id}",
                                source_id=p_node.node_id,
                                target_id=art_node_id,
                                edge_type=ForensicEdgeType.REQUIRES_REVIEW,
                                label="Requires Review",
                                explanation="Examiner review required to resolve priority conflict",
                                provenance_ids=[art_id],
                                status=item.status,
                            )
                        )

        fingerprint = compute_investigation_fingerprint(nodes, edges)

        return InvestigationGraph(
            graph_id=graph.graph_id,
            case_id=graph.case_id,
            nodes=nodes,
            edges=edges,
            fingerprint=fingerprint,
        )

    def _score_to_level(self, score: int) -> PriorityLevel:
        if score >= 75:
            return PriorityLevel.CRITICAL
        elif score >= 50:
            return PriorityLevel.HIGH
        elif score >= 25:
            return PriorityLevel.MEDIUM
        return PriorityLevel.LOW
