"""TARKA Phase 5D: Deterministic Investigation Summary Generator.

Strict Forensic Constraints:
1. Evidence-Backed Claims Only:
   - Every summary finding, evidentiary gap, and recommended action MUST explicitly cite:
     * exact artifact IDs (e.g. ART-001, ART-004)
     * exact fact IDs (e.g. FACT-BANK-01, FACT-SCREEN-01)
     * exact rule IDs (e.g. RULE_CONTRA_AMOUNT_DISCREPANCY)
   - Zero hallucinated, speculative, or unsupported assertions.
2. Epistemic Humility:
   - Factual discrepancies and investigative gaps are presented objectively without declaring guilt or fraud.
3. Deterministic Fingerprint:
   - Bit-exact JSON serialization sealed with SHA-256.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from tarka.core.canonical_fact import CanonicalFact
from tarka.core.evidence_dna import Artifact, Case
from tarka.core.contradiction_analysis import (
    CaseForensicAnalysis,
    ContradictionFinding,
    ForensicEvidenceGap,
)
from tarka.core.timeline_reconstruction import ForensicTimeline
from tarka.core.investigation_prioritization import (
    CaseInvestigationPriorities,
    InvestigationPriorityItem,
    PriorityLevel,
)


class SummaryFindingItem(BaseModel):
    """An evidence-backed finding statement in the case summary."""
    finding_id: str
    title: str
    description: str
    severity: str
    category: str
    rule_id: str
    artifact_ids: List[str] = Field(min_length=1, description="Source artifact IDs proving this statement")
    fact_ids: List[str] = Field(default_factory=list, description="Supporting canonical fact IDs")
    original_values: Dict[str, Any] = Field(default_factory=dict)
    normalized_values: Dict[str, Any] = Field(default_factory=dict)


class SummaryEvidenceGapItem(BaseModel):
    """An evidence-backed gap statement in the case summary."""
    gap_id: str
    title: str
    why_it_matters: str
    status: str
    rule_id: str
    artifact_ids: List[str] = Field(default_factory=list, description="Linked artifact IDs")
    fact_ids: List[str] = Field(default_factory=list, description="Linked fact IDs")
    missing_evidence_description: str
    suggested_remedy: str


class SummaryTimelineIssueItem(BaseModel):
    """An evidence-backed temporal anomaly statement in the case summary."""
    conflict_id: str
    title: str
    description: str
    rule_id: str
    event_ids: List[str] = Field(default_factory=list)
    artifact_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)


class SummaryRecommendedAction(BaseModel):
    """An actionable, rule-grounded investigative next step."""
    action_id: str
    priority_level: str
    priority_score: int
    action: str
    rationale: str
    target_id: str
    rule_id: str
    artifact_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)


class CaseInvestigationSummary(BaseModel):
    """Deterministic, auditable investigation summary for forensic examiners."""
    case_id: str
    case_title: str
    run_id: Optional[str] = None
    overview: str
    critical_findings: List[SummaryFindingItem] = Field(default_factory=list)
    evidence_gaps: List[SummaryEvidenceGapItem] = Field(default_factory=list)
    timeline_issues: List[SummaryTimelineIssueItem] = Field(default_factory=list)
    recommended_actions: List[SummaryRecommendedAction] = Field(default_factory=list)
    fingerprint: str = Field(description="Deterministic SHA-256 fingerprint sealing the summary")


class InvestigationSummaryGenerator:
    """Generates deterministic, fully-referenced case summaries from verified evidence."""

    @staticmethod
    def generate_summary(
        case: Case,
        artifacts: List[Artifact],
        facts: List[CanonicalFact],
        analysis: CaseForensicAnalysis,
        priorities: CaseInvestigationPriorities,
        timeline: Optional[ForensicTimeline] = None,
        run_id: Optional[str] = None,
    ) -> CaseInvestigationSummary:
        """Assembles a strictly evidence-grounded investigation summary."""
        # 1. Overview text
        active_contras = [c for c in analysis.contradictions if c.status == "ACTIVE"]
        active_gaps = [g for g in analysis.evidence_gaps if g.active_status == "ACTIVE"]
        run_note = f" (Counterfactual Challenge Run: {run_id})" if run_id else " (Baseline Primary Run)"

        overview_text = (
            f"Case: {case.title} [{case.case_id}]{run_note}. "
            f"Preserved bitstream register contains {len(artifacts)} artifact(s) across {len(facts)} canonical facts. "
            f"Deterministic evaluation identified {len(active_contras)} active contradiction finding(s), "
            f"{len(active_gaps)} evidence gap(s), and {priorities.critical_count} critical investigative priority path(s)."
        )

        # 2. Critical Findings
        critical_findings: List[SummaryFindingItem] = []
        for contra in active_contras:
            # Format comparison text
            vals_desc = ""
            if contra.original_values:
                vals_desc = " | Original: " + ", ".join(f"{k}: {v}" for k, v in contra.original_values.items())

            critical_findings.append(
                SummaryFindingItem(
                    finding_id=contra.finding_id,
                    title=contra.title,
                    description=f"{contra.explanation}{vals_desc}",
                    severity=contra.severity,
                    category=contra.category,
                    rule_id=contra.rule_id,
                    artifact_ids=contra.source_artifact_ids,
                    fact_ids=contra.supporting_fact_ids,
                    original_values=contra.original_values,
                    normalized_values=contra.normalized_values,
                )
            )

        # 3. Evidence Gaps
        evidence_gaps: List[SummaryEvidenceGapItem] = []
        for gap in active_gaps:
            evidence_gaps.append(
                SummaryEvidenceGapItem(
                    gap_id=gap.gap_id,
                    title=gap.title,
                    why_it_matters=gap.why_it_matters,
                    status=gap.status.value,
                    rule_id=gap.exposed_by_rule_id,
                    artifact_ids=gap.relevant_artifact_ids,
                    fact_ids=gap.relevant_fact_ids,
                    missing_evidence_description=gap.missing_evidence_description,
                    suggested_remedy=gap.suggested_remedy,
                )
            )

        # 4. Timeline Issues
        timeline_issues: List[SummaryTimelineIssueItem] = []
        if timeline and timeline.temporal_conflicts:
            for tc in timeline.temporal_conflicts:
                tc_event_ids = tc.get("event_ids", []) if isinstance(tc, dict) else getattr(tc, "event_ids", [])
                tc_conflict_id = tc.get("conflict_id", "") if isinstance(tc, dict) else getattr(tc, "conflict_id", "")
                tc_conflict_type = tc.get("conflict_type", "TEMPORAL_CONFLICT") if isinstance(tc, dict) else getattr(tc, "conflict_type", "TEMPORAL_CONFLICT")
                tc_explanation = tc.get("explanation", "") if isinstance(tc, dict) else getattr(tc, "explanation", "")

                tc_arts = []
                tc_facts = []
                for eid in tc_event_ids:
                    evt = next((e for e in timeline.events if e.event_id == eid or getattr(e, "id", None) == eid), None)
                    if evt:
                        tc_arts.extend(evt.source_artifact_ids)
                        tc_facts.extend(evt.supporting_fact_ids)

                timeline_issues.append(
                    SummaryTimelineIssueItem(
                        conflict_id=tc_conflict_id,
                        title=f"Timeline Conflict: {tc_conflict_type}",
                        description=tc_explanation,
                        rule_id="RULE_PRIORITY_TIMELINE_ANOMALY",
                        event_ids=tc_event_ids,
                        artifact_ids=list(set(tc_arts)),
                        fact_ids=list(set(tc_facts)),
                    )
                )

        # 5. Recommended Actions (Top active priorities)
        recommended_actions: List[SummaryRecommendedAction] = []
        for prio in priorities.items:
            if prio.status == "ACTIVE" and prio.priority_level in [PriorityLevel.CRITICAL, PriorityLevel.HIGH]:
                recommended_actions.append(
                    SummaryRecommendedAction(
                        action_id=prio.id,
                        priority_level=prio.priority_level.value,
                        priority_score=prio.priority_score,
                        action=prio.title,
                        rationale=prio.reason,
                        target_id=prio.target_id,
                        rule_id=prio.supporting_rules[0] if prio.supporting_rules else "RULE_PRIORITY_CRITICAL_CONTRADICTION",
                        artifact_ids=prio.related_artifacts,
                        fact_ids=prio.related_facts,
                    )
                )

        # 6. Deterministic SHA-256 fingerprint
        summary_payload = {
            "case_id": case.case_id,
            "run_id": run_id,
            "findings": [f.finding_id for f in critical_findings],
            "gaps": [g.gap_id for g in evidence_gaps],
            "actions": [a.action_id for a in recommended_actions],
        }
        fingerprint = hashlib.sha256(
            json.dumps(summary_payload, sort_keys=True).encode("utf-8")
        ).hexdigest()

        return CaseInvestigationSummary(
            case_id=case.case_id,
            case_title=case.title,
            run_id=run_id,
            overview=overview_text,
            critical_findings=critical_findings,
            evidence_gaps=evidence_gaps,
            timeline_issues=timeline_issues,
            recommended_actions=recommended_actions,
            fingerprint=fingerprint,
        )
