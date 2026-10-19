"""TARKA Phase 7: End-to-End Forensic Traceability & Evidence-Grounded Explanations.

Provides:
1. FindingExplanationEngine:
   - Detailed, evidence-grounded explanation for any case finding, contradiction, or gap.
   - Distinguishes observed facts, extracted fields, derived conclusions, declarative rules,
     human reviews, and epistemic boundaries.
   - Non-accusatory: discrepancy != fraud; correlation != causation; missing != confirmed absent.
2. Bidirectional Provenance Trace:
   - Backward trace: Finding -> Rule -> Facts -> Extracted Fields -> Artifacts -> Custody.
   - Forward trace: Artifact -> Custody -> Evidence DNA -> Facts -> Events -> Rules -> Findings.
   - Cycle detection and handling without infinite recursion.
   - Explicit identification of missing provenance links without fabricating nodes.
3. Counterfactual Explanation:
   - Compares findings between baseline and challenge runs.
   - Explains why a finding transitioned to inactive or survived independently.
   - Verifies whether provenance justifies the transition.
"""

from __future__ import annotations

import hashlib
import json
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field

from tarka.core.models import TrustTier, AuthType
from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind, ExtractedField
from tarka.core.evidence_dna import Artifact, CaseStore, EvidenceDNA
from tarka.core.rule_registry import DEFAULT_RULE_REGISTRY, DeclarativeRule
from tarka.core.custody import CustodyLedger, CustodyEntry
from tarka.core.analysis_run import AnalysisRun, CounterfactualEngine
from tarka.core.contradiction_analysis import (
    ContradictionAnalysisEngine,
    ContradictionFinding,
    ForensicEvidenceGap,
    FindingStatus,
    EvidenceGapStatus,
)
from tarka.core.timeline_reconstruction import TimelineReconstructionEngine, ForensicTimelineEvent


# ==============================================================================
# Domain Models for Explanation & Traceability
# ==============================================================================

class TraceNodeType(str, Enum):
    """Categorical classification of provenance trace nodes."""
    ARTIFACT = "ARTIFACT"
    CUSTODY_BLOCK = "CUSTODY_BLOCK"
    EVIDENCE_DNA = "EVIDENCE_DNA"
    CANONICAL_FACT = "CANONICAL_FACT"
    TIMELINE_EVENT = "TIMELINE_EVENT"
    RULE = "RULE"
    CONTRADICTION = "CONTRADICTION"
    EVIDENCE_GAP = "EVIDENCE_GAP"
    CORRELATION = "CORRELATION"
    FINDING = "FINDING"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    MISSING_REFERENCE = "MISSING_REFERENCE"


class TraceEdgeType(str, Enum):
    """Forensic relationship types connecting provenance stages."""
    SUPPLIES = "SUPPLIES"
    EXTRACTED_FROM = "EXTRACTED_FROM"
    NORMALIZED_FROM = "NORMALIZED_FROM"
    DERIVED_FROM = "DERIVED_FROM"
    SUPPORTED_BY = "SUPPORTED_BY"
    CONTRADICTED_BY = "CONTRADICTED_BY"
    RULE_TRIGGERED_BY = "RULE_TRIGGERED_BY"
    DEPENDS_ON = "DEPENDS_ON"
    REVIEWED_BY = "REVIEWED_BY"
    RECORDED_IN_CUSTODY = "RECORDED_IN_CUSTODY"
    EXPOSES_GAP = "EXPOSES_GAP"
    INFORMS = "INFORMS"
    GENERATED = "GENERATED"


class TraceNode(BaseModel):
    """A node in the bidirectional provenance trace graph."""
    node_id: str = Field(description="Unique stable identifier for the trace node")
    node_type: TraceNodeType = Field(description="Type of forensic entity or derivation step")
    label: str = Field(description="Short human-readable label")
    title: Optional[str] = Field(default=None, description="Detailed title")
    subtitle: Optional[str] = Field(default=None, description="Contextual subtitle (e.g. tier, timestamp)")
    description: Optional[str] = Field(default=None, description="Forensic description")
    status: str = Field(default="ACTIVE", description="ACTIVE, INACTIVE, UNRESOLVED, SURVIVING, BASELINE_ONLY")
    source_artifact_id: Optional[str] = Field(default=None, description="Parent artifact ID if applicable")
    source_location: Optional[str] = Field(default=None, description="Source locator (row:X, line:Y, bbox)")
    raw_value: Optional[Any] = Field(default=None, description="Verbatim raw value from source")
    normalized_value: Optional[Any] = Field(default=None, description="Normalized comparable value")
    confidence: Optional[float] = Field(default=None, description="Extraction or recognition confidence")
    timestamp_iso: Optional[str] = Field(default=None, description="Timestamp in ISO-8601 UTC")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Auditable metadata")


class TraceEdge(BaseModel):
    """A directed dependency relationship in the provenance trace."""
    edge_id: str = Field(description="Unique deterministic edge identifier")
    source_id: str = Field(description="Originating node ID (upstream stage)")
    target_id: str = Field(description="Target node ID (downstream stage)")
    relationship: TraceEdgeType = Field(description="Categorical dependency type")
    label: Optional[str] = Field(default=None, description="Human-readable edge label")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Edge metadata")


class ProvenanceTrace(BaseModel):
    """Bidirectional provenance dependency trace."""
    root_id: str = Field(description="Starting finding or artifact identifier")
    direction: str = Field(description="BACKWARD or FORWARD")
    nodes: List[TraceNode] = Field(default_factory=list, description="All trace nodes")
    edges: List[TraceEdge] = Field(default_factory=list, description="All directed trace edges")
    is_complete: bool = Field(default=True, description="False if any referenced fact or artifact is missing")
    missing_links: List[str] = Field(default_factory=list, description="Unresolved identifiers in the chain")
    has_cycles: bool = Field(default=False, description="True if cyclic dependencies were detected and handled")
    fingerprint: str = Field(default="", description="Deterministic SHA-256 digest of trace structure")


class EvidenceSourceDetail(BaseModel):
    """Detailed evidence source backing or challenging a finding."""
    fact_id: str
    artifact_id: str
    artifact_filename: str
    source_location: str
    raw_value: Optional[Any] = None
    normalized_value: Optional[Any] = None
    source_tier: str
    timestamp: Optional[str] = None
    timestamp_provenance: Optional[Dict[str, Any]] = None
    bounding_box: Optional[List[float]] = None
    confidence: Optional[float] = None
    sha256: Optional[str] = None
    raw_snippet: Optional[str] = None


class FindingRuleMetadata(BaseModel):
    """Declarative rule specification that governed the finding."""
    rule_id: str
    rule_version: str
    rule_display_name: str
    rule_purpose: str
    operator: str
    join_key: str
    firing_condition: str
    satisfied_conditions: List[str] = Field(default_factory=list)


class DerivationStep(BaseModel):
    """An explicit, auditable step in the finding derivation path."""
    step_number: int
    stage: str
    description: str
    input_references: List[str] = Field(default_factory=list)
    output_reference: str


class CounterfactualContext(BaseModel):
    """Counterfactual status and impact context for the finding."""
    is_active_in_run: bool
    dependencies: List[str] = Field(default_factory=list, description="Artifact IDs upon which this finding depends")
    excluded_artifacts: List[str] = Field(default_factory=list, description="Artifacts excluded in the evaluated run")
    inactive_reason: Optional[str] = None
    hypothetical_exclusion_effect: str = Field(
        description="Plain-language statement of what happens if dependencies are excluded"
    )


class ReviewAuditDetail(BaseModel):
    """Human examiner determination audit history."""
    review_state: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at_iso: Optional[str] = None
    review_scope: Optional[str] = None


class CustodyEventSummary(BaseModel):
    """Immutable custody chain block sealing evidence used in this finding."""
    sequence: int
    timestamp_iso: str
    action: str
    entry_hash: str
    fact_id: Optional[str] = None
    payload_preview: Optional[str] = None


class FindingExplanation(BaseModel):
    """Complete, evidence-grounded explanation for a forensic finding."""
    case_id: str
    finding_id: str
    finding_type: str = Field(description="CONTRADICTION, EVIDENCE_GAP, or CORRELATION")
    title: str
    category: str
    status: str
    severity: str
    plain_language_summary: str
    rule_metadata: Optional[FindingRuleMetadata] = None
    supporting_evidence: List[EvidenceSourceDetail] = Field(default_factory=list)
    contradicting_evidence: List[EvidenceSourceDetail] = Field(default_factory=list)
    derivation_steps: List[DerivationStep] = Field(default_factory=list)
    counterfactual_context: CounterfactualContext
    epistemic_uncertainties: List[str] = Field(default_factory=list)
    missing_links: List[str] = Field(default_factory=list)
    review_audit: Optional[ReviewAuditDetail] = None
    custody_chain_entries: List[CustodyEventSummary] = Field(default_factory=list)
    backward_trace_node_ids: List[str] = Field(default_factory=list)
    fingerprint: str = Field(description="Deterministic SHA-256 fingerprint sealing this explanation")


class CounterfactualFindingExplanation(BaseModel):
    """Comparative explanation showing finding behavior across baseline and challenge runs."""
    case_id: str
    finding_id: str
    baseline_run_id: str
    challenge_run_id: str
    baseline_status: str
    challenge_status: str
    excluded_artifact_ids: List[str]
    deactivated_dependencies: List[str]
    transition_summary: str
    independent_surviving_findings: List[str] = Field(default_factory=list)
    is_provenance_justified: bool
    baseline_explanation: FindingExplanation
    challenge_explanation: FindingExplanation


# ==============================================================================
# Finding Explanation & Provenance Engine
# ==============================================================================

class FindingExplanationEngine:
    """Deterministic engine generating verifiable, evidence-grounded explanations and bidirectional traces."""

    def __init__(self, case_store: CaseStore) -> None:
        self.case_store = case_store
        self.contradiction_engine = ContradictionAnalysisEngine()
        self.timeline_engine = TimelineReconstructionEngine()

    def explain_finding(
        self,
        case_id: str,
        finding_id: str,
        run_id: Optional[str] = None,
    ) -> FindingExplanation:
        """Generates an evidence-grounded, non-accusatory explanation for any finding in a case."""
        case = self.case_store.get_case(case_id)
        if not case:
            raise ValueError(f"Case '{case_id}' not found.")

        artifacts = self.case_store.list_artifacts(case_id)
        facts = self.case_store.list_canonical_facts(case_id)
        artifacts_by_id = {a.artifact_id: a for a in artifacts}
        facts_by_id = {f.fact_id: f for f in facts}

        run: Optional[AnalysisRun] = None
        excluded_ids: Set[str] = set()
        if run_id:
            if run_id == "baseline":
                run = self.case_store.get_or_create_baseline_run(case_id)
            else:
                run = self.case_store.get_analysis_run(case_id, run_id)
                if not run:
                    raise ValueError(f"Analysis run '{run_id}' not found.")
            excluded_ids = set(run.excluded_artifact_ids)

        # Run analysis to fetch findings & gaps in context
        finding_reviews = self.case_store.get_finding_reviews(case_id)
        gap_reviews = self.case_store.get_gap_reviews(case_id)
        combined_reviews = {**finding_reviews, **gap_reviews}

        timeline = self.timeline_engine.build_timeline(
            case_id=case_id,
            facts=facts,
            artifacts=artifacts,
            run=run,
        )

        analysis = self.contradiction_engine.analyze_case(
            case_id=case_id,
            facts=facts,
            artifacts=artifacts,
            timeline=timeline,
            run=run,
            existing_reviews=combined_reviews,
        )

        # Locate the finding (Contradiction Finding, Evidence Gap, or Correlation)
        contra_target = next((c for c in analysis.contradictions if c.finding_id == finding_id), None)
        gap_target = next((g for g in analysis.evidence_gaps if g.gap_id == finding_id), None)

        if contra_target:
            return self._explain_contradiction(
                case_id=case_id,
                finding=contra_target,
                artifacts_by_id=artifacts_by_id,
                facts_by_id=facts_by_id,
                excluded_ids=excluded_ids,
                run_id=run.run_id if run else None,
            )
        elif gap_target:
            return self._explain_evidence_gap(
                case_id=case_id,
                gap=gap_target,
                artifacts_by_id=artifacts_by_id,
                facts_by_id=facts_by_id,
                excluded_ids=excluded_ids,
                run_id=run.run_id if run else None,
            )
        else:
            # Fallback: check if finding_id corresponds to a baseline finding summary (e.g. FINDING-01)
            if run and run.findings:
                summary_target = next((f for f in run.findings if f.finding_id == finding_id), None)
                if summary_target:
                    return self._explain_finding_summary(
                        case_id=case_id,
                        summary=summary_target,
                        artifacts_by_id=artifacts_by_id,
                        facts_by_id=facts_by_id,
                        excluded_ids=excluded_ids,
                        run_id=run.run_id,
                    )

            raise KeyError(f"Finding '{finding_id}' not found in case '{case_id}'.")

    # --------------------------------------------------------------------------
    # Contradiction Finding Explanation
    # --------------------------------------------------------------------------

    def _explain_contradiction(
        self,
        case_id: str,
        finding: ContradictionFinding,
        artifacts_by_id: Dict[str, Artifact],
        facts_by_id: Dict[str, CanonicalFact],
        excluded_ids: Set[str],
        run_id: Optional[str] = None,
    ) -> FindingExplanation:
        rule = DEFAULT_RULE_REGISTRY.get_rule(finding.rule_id)
        rule_meta = None
        if rule:
            satisfied = [
                f"Operator '{rule.operator.value}' evaluated true under join key '{rule.join_key}'",
                finding.rule_firing_reason,
            ]
            rule_meta = FindingRuleMetadata(
                rule_id=rule.rule_id,
                rule_version=rule.version,
                rule_display_name=rule.display_name,
                rule_purpose=rule.purpose,
                operator=rule.operator.value,
                join_key=rule.join_key,
                firing_condition=finding.rule_firing_reason,
                satisfied_conditions=satisfied,
            )

        supporting_evidence: List[EvidenceSourceDetail] = []
        contradicting_evidence: List[EvidenceSourceDetail] = []
        missing_links: List[str] = []

        # Partition facts into side 1 and side 2 for clarity
        fact_objs = []
        for fid in finding.supporting_fact_ids:
            if fid in facts_by_id:
                fact_objs.append(facts_by_id[fid])
            else:
                missing_links.append(f"Referenced fact '{fid}' could not be resolved from stored case facts")

        for aid in finding.source_artifact_ids:
            if aid not in artifacts_by_id:
                missing_links.append(f"Referenced source artifact '{aid}' could not be resolved from case artifacts")

        for idx, f in enumerate(fact_objs):
            art = artifacts_by_id.get(f.artifact_id)
            if not art and f.artifact_id not in finding.source_artifact_ids:
                missing_links.append(f"Referenced artifact '{f.artifact_id}' could not be resolved from case artifacts")

            norm_val = finding.normalized_values.get(f.source_filename) or finding.normalized_values.get(f.fact_id) or f.amount
            raw_val = finding.original_values.get(f.source_filename) or finding.original_values.get(f.fact_id) or f.raw_source_snippet

            detail = EvidenceSourceDetail(
                fact_id=f.fact_id,
                artifact_id=f.artifact_id,
                artifact_filename=art.filename if art else (f.source_filename or f.artifact_id),
                source_location=f.source_location,
                raw_value=raw_val,
                normalized_value=norm_val,
                source_tier=f.trust_tier.value if hasattr(f.trust_tier, "value") else str(f.trust_tier),
                timestamp=f.time_provenance.recorded_time if f.time_provenance else None,
                timestamp_provenance=f.time_provenance.model_dump(mode="json") if f.time_provenance else None,
                confidence=1.0,
                sha256=art.sha256 if art else f.sha256,
                raw_snippet=f.raw_source_snippet,
            )

            # In contradiction, first side is primary supporting observation, second side is the conflicting observation
            if idx == 0:
                supporting_evidence.append(detail)
            else:
                contradicting_evidence.append(detail)

        # Build auditable derivation steps
        derivation_steps: List[DerivationStep] = [
            DerivationStep(
                step_number=1,
                stage="EVIDENCE_INTAKE_AND_SEALING",
                description="Original evidence files registered with SHA-256 bitstream sealing into immutable custody ledger.",
                input_references=finding.source_artifact_ids,
                output_reference=f"Registered artifacts: {', '.join(finding.source_artifact_ids)}",
            ),
            DerivationStep(
                step_number=2,
                stage="CANONICAL_FACT_EXTRACTION",
                description="Parsed financial transactions and media text into normalized CanonicalFact representations.",
                input_references=finding.source_artifact_ids,
                output_reference=f"Canonical facts: {', '.join(finding.supporting_fact_ids)}",
            ),
            DerivationStep(
                step_number=3,
                stage="DECLARATIVE_RULE_EVALUATION",
                description=f"Rule '{finding.rule_id}' (v{finding.rule_version}) evaluated comparison: {finding.rule_firing_reason}.",
                input_references=finding.supporting_fact_ids,
                output_reference=f"Contradiction Finding: {finding.finding_id}",
            ),
        ]

        if finding.review_state and finding.review_state != "UNREVIEWED":
            derivation_steps.append(
                DerivationStep(
                    step_number=4,
                    stage="EXAMINER_DETERMINATION",
                    description=(
                        f"Examiner '{finding.reviewed_by or 'Investigator'}' recorded decision '{finding.review_state}' "
                        f"with rationale: {finding.review_notes or 'Documented review determination.'}"
                    ),
                    input_references=[finding.finding_id],
                    output_reference=f"Review State: {finding.review_state}",
                )
            )

        # Counterfactual context
        deps = finding.counterfactual_dependencies or finding.source_artifact_ids
        is_active = finding.status == FindingStatus.ACTIVE.value
        hypothetical_effect = (
            f"Excluding any of the supporting artifacts ({', '.join(sorted(deps))}) deactivates this contradiction, "
            f"as the factual conflict requires observations from both independent evidence containers."
        )

        counterfactual_ctx = CounterfactualContext(
            is_active_in_run=is_active,
            dependencies=deps,
            excluded_artifacts=sorted(list(excluded_ids)),
            inactive_reason=finding.inactive_reason,
            hypothetical_exclusion_effect=hypothetical_effect,
        )

        # Custody chain entries sealing relevant artifacts
        custody_entries = self._get_custody_summaries(case_id, finding.source_artifact_ids, finding.finding_id)

        # Review audit
        review_audit = None
        if finding.review_state and finding.review_state != "UNREVIEWED":
            review_audit = ReviewAuditDetail(
                review_state=finding.review_state,
                reviewed_by=finding.reviewed_by,
                review_notes=finding.review_notes,
                reviewed_at_iso=finding.reviewed_at_iso,
            )

        # Non-accusatory plain language summary
        plain_summary = (
            f"The system detected a factual contradiction ({finding.category.value}) between "
            f"{', '.join(finding.source_artifact_ids)}. Specifically, {finding.explanation}. "
            "Forensic Note: Factual discrepancies between presentation screenshots and bank records indicate "
            "conflicting reporting. They do not automatically establish fraud or culpability without independent transmission auditing."
        )

        uncertainties = [
            finding.uncertainties_and_limitations,
            "Discrepancies indicate reporting conflicts; they do not prove malicious intent or identity of a perpetrator.",
            "SHA-256 confirms bitstream preservation; does not prove original author authenticity.",
        ]

        fingerprint = self._compute_explanation_fingerprint(
            finding_id=finding.finding_id,
            status=finding.status,
            rule_id=finding.rule_id,
            fact_ids=finding.supporting_fact_ids,
            artifact_ids=finding.source_artifact_ids,
            original_values=finding.original_values,
        )

        return FindingExplanation(
            case_id=case_id,
            finding_id=finding.finding_id,
            finding_type="CONTRADICTION",
            title=finding.title,
            category=finding.category.value,
            status=finding.status,
            severity=finding.severity.value,
            plain_language_summary=plain_summary,
            rule_metadata=rule_meta,
            supporting_evidence=supporting_evidence,
            contradicting_evidence=contradicting_evidence,
            derivation_steps=derivation_steps,
            counterfactual_context=counterfactual_ctx,
            epistemic_uncertainties=uncertainties,
            missing_links=missing_links,
            review_audit=review_audit,
            custody_chain_entries=custody_entries,
            backward_trace_node_ids=[f"find:{finding.finding_id}"] + [f"fact:{fid}" for fid in finding.supporting_fact_ids] + [f"art:{aid}" for aid in finding.source_artifact_ids],
            fingerprint=fingerprint,
        )

    # --------------------------------------------------------------------------
    # Evidence Gap Explanation
    # --------------------------------------------------------------------------

    def _explain_evidence_gap(
        self,
        case_id: str,
        gap: ForensicEvidenceGap,
        artifacts_by_id: Dict[str, Artifact],
        facts_by_id: Dict[str, CanonicalFact],
        excluded_ids: Set[str],
        run_id: Optional[str] = None,
    ) -> FindingExplanation:
        rule = DEFAULT_RULE_REGISTRY.get_rule(gap.exposed_by_rule_id)
        rule_meta = None
        if rule:
            rule_meta = FindingRuleMetadata(
                rule_id=rule.rule_id,
                rule_version=rule.version,
                rule_display_name=rule.display_name,
                rule_purpose=rule.purpose,
                operator=rule.operator.value,
                join_key=rule.join_key,
                firing_condition=f"Unsatisfied evidentiary requirement: {gap.missing_evidence_description}",
                satisfied_conditions=[f"Exposed by declarative rule {gap.exposed_by_rule_id}"],
            )

        supporting_evidence: List[EvidenceSourceDetail] = []
        missing_links: List[str] = []

        for fid in gap.relevant_fact_ids:
            if fid in facts_by_id:
                f = facts_by_id[fid]
                art = artifacts_by_id.get(f.artifact_id)
                supporting_evidence.append(
                    EvidenceSourceDetail(
                        fact_id=f.fact_id,
                        artifact_id=f.artifact_id,
                        artifact_filename=art.filename if art else f.artifact_id,
                        source_location=f.source_location,
                        raw_value=f.raw_source_snippet,
                        normalized_value=f.amount or f.identifiers.get("rrn"),
                        source_tier=f.trust_tier.value if hasattr(f.trust_tier, "value") else str(f.trust_tier),
                        timestamp=f.time_provenance.recorded_time if f.time_provenance else None,
                        confidence=1.0,
                        sha256=art.sha256 if art else f.sha256,
                        raw_snippet=f.raw_source_snippet,
                    )
                )
            else:
                missing_links.append(f"Referenced fact '{fid}' could not be resolved from case facts")

        for aid in gap.relevant_artifact_ids:
            if aid not in artifacts_by_id:
                missing_links.append(f"Referenced artifact '{aid}' could not be resolved from case artifacts")

        derivation_steps = [
            DerivationStep(
                step_number=1,
                stage="EVIDENCE_GAP_DETECTION",
                description=f"Rule '{gap.exposed_by_rule_id}' identified an absence or unverified claim: {gap.why_it_matters}",
                input_references=gap.relevant_artifact_ids + gap.relevant_fact_ids,
                output_reference=f"Evidence Gap: {gap.gap_id}",
            ),
            DerivationStep(
                step_number=2,
                stage="REMEDY_RECOMMENDATION",
                description=f"Actionable investigative remedy: {gap.suggested_remedy}",
                input_references=[gap.gap_id],
                output_reference=f"Mandatory resolution required: {gap.is_mandatory_for_resolution}",
            ),
        ]

        if gap.review_decision:
            derivation_steps.append(
                DerivationStep(
                    step_number=3,
                    stage="EXAMINER_GAP_REVIEW",
                    description=(
                        f"Examiner '{gap.reviewed_by or 'Investigator'}' recorded decision '{gap.review_decision}' "
                        f"(Scope: {gap.review_scope or 'Standard examination'}). Notes: {gap.review_notes or 'None.'}"
                    ),
                    input_references=[gap.gap_id],
                    output_reference=f"Decision: {gap.review_decision}",
                )
            )

        deps = gap.counterfactual_dependencies or gap.relevant_artifact_ids
        is_active = gap.active_status == "ACTIVE"
        hypothetical_effect = (
            f"Excluding the asserting artifact(s) ({', '.join(sorted(deps))}) removes the claim that created this gap, "
            f"transitioning the gap to INACTIVE."
        )

        counterfactual_ctx = CounterfactualContext(
            is_active_in_run=is_active,
            dependencies=deps,
            excluded_artifacts=sorted(list(excluded_ids)),
            inactive_reason=gap.inactive_reason,
            hypothetical_exclusion_effect=hypothetical_effect,
        )

        custody_entries = self._get_custody_summaries(case_id, gap.relevant_artifact_ids, gap.gap_id)

        review_audit = None
        if gap.review_decision:
            review_audit = ReviewAuditDetail(
                review_state=gap.review_decision,
                reviewed_by=gap.reviewed_by,
                review_notes=gap.review_notes,
                reviewed_at_iso=gap.reviewed_at_iso,
                review_scope=gap.review_scope,
            )

        plain_summary = (
            f"An investigative evidence gap ({gap.category.value}) was identified: {gap.title}. "
            f"Why it matters: {gap.why_it_matters}. Status: {gap.status.value}. "
            "Epistemic Note: Unsupplied or unread evidence constitutes a collection gap, not proof of factual absence."
        )

        uncertainties = [
            f"Current epistemic status: {gap.status.value}.",
            "Missing evidence is not equivalent to confirmed absence without explicit scope-bounded verification.",
            f"Recommended next investigative action: {gap.suggested_remedy}",
        ]

        fingerprint = self._compute_explanation_fingerprint(
            finding_id=gap.gap_id,
            status=gap.status.value,
            rule_id=gap.exposed_by_rule_id,
            fact_ids=gap.relevant_fact_ids,
            artifact_ids=gap.relevant_artifact_ids,
            original_values={"gap_status": gap.status.value},
        )

        return FindingExplanation(
            case_id=case_id,
            finding_id=gap.gap_id,
            finding_type="EVIDENCE_GAP",
            title=gap.title,
            category=gap.category.value,
            status=gap.active_status,
            severity="MEDIUM" if not gap.is_mandatory_for_resolution else "HIGH",
            plain_language_summary=plain_summary,
            rule_metadata=rule_meta,
            supporting_evidence=supporting_evidence,
            contradicting_evidence=[],
            derivation_steps=derivation_steps,
            counterfactual_context=counterfactual_ctx,
            epistemic_uncertainties=uncertainties,
            missing_links=missing_links,
            review_audit=review_audit,
            custody_chain_entries=custody_entries,
            backward_trace_node_ids=[f"gap:{gap.gap_id}"] + [f"fact:{fid}" for fid in gap.relevant_fact_ids] + [f"art:{aid}" for aid in gap.relevant_artifact_ids],
            fingerprint=fingerprint,
        )

    # --------------------------------------------------------------------------
    # AnalysisRun Finding Summary Explanation
    # --------------------------------------------------------------------------

    def _explain_finding_summary(
        self,
        case_id: str,
        summary: Any,
        artifacts_by_id: Dict[str, Artifact],
        facts_by_id: Dict[str, CanonicalFact],
        excluded_ids: Set[str],
        run_id: str,
    ) -> FindingExplanation:
        fid = getattr(summary, "finding_id", "FINDING")
        title = getattr(summary, "title", "Case Finding")
        status = getattr(summary, "status", "ACTIVE")
        rule_id = getattr(summary, "rule_id", "RULE_SUMMARY")

        deps = getattr(summary, "counterfactual_dependencies", []) or getattr(summary, "source_artifact_ids", [])
        is_active = status == "ACTIVE"
        hypothetical_effect = f"Excluding artifacts ({', '.join(sorted(deps))}) affects this finding summary."

        counterfactual_ctx = CounterfactualContext(
            is_active_in_run=is_active,
            dependencies=deps,
            excluded_artifacts=sorted(list(excluded_ids)),
            inactive_reason=getattr(summary, "inactive_reason", None),
            hypothetical_exclusion_effect=hypothetical_effect,
        )

        plain_summary = (
            f"Finding {fid}: {getattr(summary, 'narrative', title)}. "
            "Grounded in verified case facts and declarative rules."
        )

        fingerprint = self._compute_explanation_fingerprint(
            finding_id=fid,
            status=status,
            rule_id=rule_id,
            fact_ids=getattr(summary, "supporting_fact_ids", []),
            artifact_ids=deps,
            original_values={},
        )

        return FindingExplanation(
            case_id=case_id,
            finding_id=fid,
            finding_type="FINDING",
            title=title,
            category="ANALYSIS_FINDING",
            status=status,
            severity=getattr(summary, "severity", "MEDIUM"),
            plain_language_summary=plain_summary,
            counterfactual_context=counterfactual_ctx,
            epistemic_uncertainties=["Finding derived under current analysis run configuration."],
            fingerprint=fingerprint,
        )

    # --------------------------------------------------------------------------
    # Feature B: Bidirectional Provenance Trace
    # --------------------------------------------------------------------------

    def get_backward_trace(
        self,
        case_id: str,
        finding_id: Optional[str] = None,
        run_id: Optional[str] = None,
        explanation: Optional[FindingExplanation] = None,
    ) -> ProvenanceTrace:
        """Traces backward from a finding to its rule, facts, fields, artifacts, and custody entries."""
        if explanation:
            expl = explanation
        else:
            if not finding_id:
                raise ValueError("finding_id or explanation is required.")
            expl = self.explain_finding(case_id, finding_id, run_id=run_id)

        nodes: List[TraceNode] = []
        edges: List[TraceEdge] = []
        seen_nodes: Set[str] = set()
        seen_edges: Set[Tuple[str, str, str]] = set()
        edge_seq = 0
        missing_links: List[str] = list(expl.missing_links)
        has_cycles = False

        def add_node(n: TraceNode) -> None:
            if n.node_id not in seen_nodes:
                seen_nodes.add(n.node_id)
                nodes.append(n)

        def add_edge(src: str, dst: str, rel: TraceEdgeType, label: Optional[str] = None) -> None:
            nonlocal edge_seq
            key = (src, dst, rel.value)
            if key not in seen_edges:
                seen_edges.add(key)
                edge_seq += 1
                edges.append(
                    TraceEdge(
                        edge_id=f"trace-edge-{edge_seq:04d}",
                        source_id=src,
                        target_id=dst,
                        relationship=rel,
                        label=label or rel.value,
                    )
                )

        # 1. Root Finding Node
        finding_node_id = f"find:{expl.finding_id}"
        add_node(
            TraceNode(
                node_id=finding_node_id,
                node_type=TraceNodeType.CONTRADICTION if expl.finding_type == "CONTRADICTION" else (
                    TraceNodeType.EVIDENCE_GAP if expl.finding_type == "EVIDENCE_GAP" else TraceNodeType.FINDING
                ),
                label=expl.title[:35],
                title=expl.title,
                subtitle=f"{expl.category} · {expl.status}",
                description=expl.plain_language_summary,
                status=expl.status,
                metadata={"severity": expl.severity, "category": expl.category},
            )
        )

        # 2. Rule Node
        if expl.rule_metadata:
            rule_node_id = f"rule:{expl.rule_metadata.rule_id}"
            add_node(
                TraceNode(
                    node_id=rule_node_id,
                    node_type=TraceNodeType.RULE,
                    label=expl.rule_metadata.rule_id,
                    title=expl.rule_metadata.rule_display_name,
                    subtitle=f"v{expl.rule_metadata.rule_version} · Op: {expl.rule_metadata.operator}",
                    description=expl.rule_metadata.rule_purpose,
                    status="ACTIVE",
                    metadata={"operator": expl.rule_metadata.operator, "join_key": expl.rule_metadata.join_key},
                )
            )
            add_edge(rule_node_id, finding_node_id, TraceEdgeType.RULE_TRIGGERED_BY, "EVALUATED_BY_RULE")

        # 3. Supporting & Contradicting Facts
        all_evidence = expl.supporting_evidence + expl.contradicting_evidence
        for ev in all_evidence:
            fact_node_id = f"fact:{ev.fact_id}"
            is_contradicting = ev in expl.contradicting_evidence
            edge_type = TraceEdgeType.CONTRADICTED_BY if is_contradicting else TraceEdgeType.SUPPORTED_BY

            add_node(
                TraceNode(
                    node_id=fact_node_id,
                    node_type=TraceNodeType.CANONICAL_FACT,
                    label=f"Fact: {ev.fact_id}",
                    title=f"Source: {ev.artifact_filename}",
                    subtitle=f"Tier: {ev.source_tier} | Loc: {ev.source_location}",
                    description=ev.raw_snippet or f"Value: {ev.normalized_value}",
                    status="ACTIVE" if ev.artifact_id not in expl.counterfactual_context.excluded_artifacts else "INACTIVE",
                    source_artifact_id=ev.artifact_id,
                    source_location=ev.source_location,
                    raw_value=ev.raw_value,
                    normalized_value=ev.normalized_value,
                    confidence=ev.confidence,
                    timestamp_iso=ev.timestamp,
                    metadata={"source_tier": ev.source_tier},
                )
            )
            # Edge connects Fact to Rule (or directly to finding)
            if expl.rule_metadata:
                add_edge(fact_node_id, f"rule:{expl.rule_metadata.rule_id}", edge_type, edge_type.value)
            else:
                add_edge(fact_node_id, finding_node_id, edge_type, edge_type.value)

            # 4. Artifact Node
            art = self.case_store.get_artifact(case_id, ev.artifact_id)
            if art:
                art_node_id = f"art:{art.artifact_id}"
                is_excluded = art.artifact_id in expl.counterfactual_context.excluded_artifacts
                add_node(
                    TraceNode(
                        node_id=art_node_id,
                        node_type=TraceNodeType.ARTIFACT,
                        label=art.filename,
                        title=f"Artifact: {art.filename}",
                        subtitle=f"Tier: {art.source_tier.value} | {art.file_size_bytes}B",
                        description=f"Preserved SHA-256: {art.sha256[:16]}...",
                        status="INACTIVE" if is_excluded else "ACTIVE",
                        source_artifact_id=art.artifact_id,
                        timestamp_iso=art.intake_timestamp_iso,
                        metadata={"sha256": art.sha256, "mime_type": art.mime_type},
                    )
                )
                add_edge(art_node_id, fact_node_id, TraceEdgeType.SUPPLIES, "EXTRACTED_FROM")
            else:
                missing_node_id = f"missing:art:{ev.artifact_id}"
                add_node(
                    TraceNode(
                        node_id=missing_node_id,
                        node_type=TraceNodeType.MISSING_REFERENCE,
                        label=f"Missing Artifact: {ev.artifact_id}",
                        status="UNRESOLVED",
                        description="Referenced artifact file is missing from case repository.",
                    )
                )
                add_edge(missing_node_id, fact_node_id, TraceEdgeType.SUPPLIES, "UNRESOLVED_REFERENCE")

        # 5. Custody Chain Blocks
        for c in expl.custody_chain_entries[:5]:  # include primary custody blocks
            cust_node_id = f"cust:seq_{c.sequence}"
            add_node(
                TraceNode(
                    node_id=cust_node_id,
                    node_type=TraceNodeType.CUSTODY_BLOCK,
                    label=f"Custody #{c.sequence}: {c.action}",
                    title=f"Action: {c.action}",
                    subtitle=c.timestamp_iso,
                    description=f"Hash: {c.entry_hash[:16]}...",
                    status="ACTIVE",
                    metadata={"sequence": c.sequence, "entry_hash": c.entry_hash},
                )
            )
            if c.fact_id:
                target_ref = f"art:{c.fact_id}" if f"art:{c.fact_id}" in seen_nodes else finding_node_id
                add_edge(cust_node_id, target_ref, TraceEdgeType.RECORDED_IN_CUSTODY, "SEALED_IN_CUSTODY")

        # 6. Human Review Node (if verified or resolved)
        if expl.review_audit:
            rev_node_id = f"rev:{expl.finding_id}"
            add_node(
                TraceNode(
                    node_id=rev_node_id,
                    node_type=TraceNodeType.HUMAN_REVIEW,
                    label=f"Determination: {expl.review_audit.review_state}",
                    title=f"Examiner: {expl.review_audit.reviewed_by or 'Investigator'}",
                    subtitle=expl.review_audit.reviewed_at_iso or "Audited",
                    description=expl.review_audit.review_notes or "Human review determination",
                    status="ACTIVE",
                    metadata={"review_state": expl.review_audit.review_state},
                )
            )
            add_edge(rev_node_id, finding_node_id, TraceEdgeType.REVIEWED_BY, "HUMAN_DETERMINATION")

        # 7. Explicit Missing Reference Nodes for unresolved items in provenance chain
        for idx, missing_item in enumerate(expl.missing_links):
            missing_node_id = f"missing:ref:{idx+1}"
            add_node(
                TraceNode(
                    node_id=missing_node_id,
                    node_type=TraceNodeType.MISSING_REFERENCE,
                    label=f"Missing Reference: {missing_item[:30]}...",
                    status="UNRESOLVED",
                    description=missing_item,
                )
            )
            add_edge(missing_node_id, finding_node_id, TraceEdgeType.DEPENDS_ON, "UNRESOLVED_REFERENCE")

        # Verify acyclicity and handle potential cycles safely
        has_cycles = self._detect_cycles(nodes, edges)

        fp_payload = json.dumps({"nodes": [n.node_id for n in nodes], "edges": [(e.source_id, e.target_id) for e in edges]}, sort_keys=True)
        fingerprint = hashlib.sha256(fp_payload.encode("utf-8")).hexdigest()

        return ProvenanceTrace(
            root_id=expl.finding_id,
            direction="BACKWARD",
            nodes=nodes,
            edges=edges,
            is_complete=len(missing_links) == 0,
            missing_links=missing_links,
            has_cycles=has_cycles,
            fingerprint=fingerprint,
        )

    def get_forward_trace(
        self,
        case_id: str,
        artifact_id: Optional[str] = None,
        root_id: Optional[str] = None,
        run_id: Optional[str] = None,
    ) -> ProvenanceTrace:
        """Traces forward from an artifact to its extracted facts, events, rules, and findings."""
        target_id = artifact_id or root_id
        if not target_id:
            raise ValueError("artifact_id or root_id is required for forward trace.")

        case = self.case_store.get_case(case_id)
        if not case:
            raise ValueError(f"Case '{case_id}' not found.")

        art = self.case_store.get_artifact(case_id, target_id)
        if not art:
            raise KeyError(f"Artifact '{target_id}' not found in case '{case_id}'.")

        artifacts = self.case_store.list_artifacts(case_id)
        facts = self.case_store.list_canonical_facts(case_id)
        run = self.case_store.get_analysis_run(case_id, run_id) if (run_id and run_id != "baseline") else self.case_store.get_or_create_baseline_run(case_id)
        excluded_ids = set(run.excluded_artifact_ids) if run else set()

        analysis = self.contradiction_engine.analyze_case(
            case_id=case_id,
            facts=facts,
            artifacts=artifacts,
            run=run,
        )

        nodes: List[TraceNode] = []
        edges: List[TraceEdge] = []
        seen_nodes: Set[str] = set()
        seen_edges: Set[Tuple[str, str, str]] = set()
        edge_seq = 0

        def add_node(n: TraceNode) -> None:
            if n.node_id not in seen_nodes:
                seen_nodes.add(n.node_id)
                nodes.append(n)

        def add_edge(src: str, dst: str, rel: TraceEdgeType, label: Optional[str] = None) -> None:
            nonlocal edge_seq
            key = (src, dst, rel.value)
            if key not in seen_edges:
                seen_edges.add(key)
                edge_seq += 1
                edges.append(
                    TraceEdge(
                        edge_id=f"fwd-edge-{edge_seq:04d}",
                        source_id=src,
                        target_id=dst,
                        relationship=rel,
                        label=label or rel.value,
                    )
                )

        # 1. Root Artifact Node
        art_node_id = f"art:{art.artifact_id}"
        is_excluded = art.artifact_id in excluded_ids
        add_node(
            TraceNode(
                node_id=art_node_id,
                node_type=TraceNodeType.ARTIFACT,
                label=art.filename,
                title=f"Source: {art.filename}",
                subtitle=f"Tier: {art.source_tier.value}",
                description=f"Preserved SHA-256: {art.sha256[:16]}...",
                status="INACTIVE" if is_excluded else "ACTIVE",
                source_artifact_id=art.artifact_id,
                timestamp_iso=art.intake_timestamp_iso,
                metadata={"sha256": art.sha256, "file_size": art.file_size_bytes},
            )
        )

        # 2. Custody Intake Block
        ledger = self.case_store.get_ledger(case_id)
        custody_entries = [e for e in ledger.get_all_entries() if (e.fact_id and (e.fact_id == art.artifact_id or art.artifact_id in e.fact_id))]
        for c in custody_entries[:3]:
            c_node_id = f"cust:seq_{c.seq}"
            add_node(
                TraceNode(
                    node_id=c_node_id,
                    node_type=TraceNodeType.CUSTODY_BLOCK,
                    label=f"Custody #{c.seq}: {c.action}",
                    subtitle=c.timestamp_iso,
                    status="ACTIVE",
                )
            )
            add_edge(c_node_id, art_node_id, TraceEdgeType.RECORDED_IN_CUSTODY, "SEALED_INTAKE")

        # 3. Facts derived from this artifact
        artifact_facts = [f for f in facts if f.artifact_id == art.artifact_id]
        for f in artifact_facts:
            f_node_id = f"fact:{f.fact_id}"
            add_node(
                TraceNode(
                    node_id=f_node_id,
                    node_type=TraceNodeType.CANONICAL_FACT,
                    label=f"Fact: {f.fact_id}",
                    title=f.summary[:35] if f.summary else f"Fact {f.fact_id}",
                    subtitle=f"Kind: {f.kind.value}",
                    description=f.raw_source_snippet,
                    status="INACTIVE" if is_excluded else "ACTIVE",
                    source_artifact_id=art.artifact_id,
                    source_location=f.source_location,
                    amount=f.amount,
                    raw_value=f.raw_source_snippet,
                    normalized_value=f.amount or f.identifiers.get("rrn"),
                    timestamp_iso=f.time_provenance.utc_iso if f.time_provenance else None,
                )
            )
            add_edge(art_node_id, f_node_id, TraceEdgeType.SUPPLIES, "EXTRACTED_FROM")

            # 4. Findings that depend on this fact or artifact
            dependent_contradictions = [
                c for c in analysis.contradictions
                if f.fact_id in c.supporting_fact_ids or art.artifact_id in c.source_artifact_ids
            ]
            for c in dependent_contradictions:
                c_node_id = f"find:{c.finding_id}"
                add_node(
                    TraceNode(
                        node_id=c_node_id,
                        node_type=TraceNodeType.CONTRADICTION,
                        label=c.title[:35],
                        title=c.title,
                        subtitle=f"{c.category.value} · {c.status}",
                        description=c.explanation,
                        status=c.status,
                    )
                )
                add_edge(f_node_id, c_node_id, TraceEdgeType.GENERATED, "CONTRIBUTES_TO")

            dependent_gaps = [
                g for g in analysis.evidence_gaps
                if f.fact_id in g.relevant_fact_ids or art.artifact_id in g.relevant_artifact_ids
            ]
            for g in dependent_gaps:
                g_node_id = f"gap:{g.gap_id}"
                add_node(
                    TraceNode(
                        node_id=g_node_id,
                        node_type=TraceNodeType.EVIDENCE_GAP,
                        label=g.title[:35],
                        title=g.title,
                        subtitle=f"{g.category.value} · {g.status.value}",
                        description=g.why_it_matters,
                        status=g.active_status,
                    )
                )
                add_edge(f_node_id, g_node_id, TraceEdgeType.EXPOSES_GAP, "EXPOSES_GAP")

        has_cycles = self._detect_cycles(nodes, edges)

        fp_payload = json.dumps({"nodes": [n.node_id for n in nodes], "edges": [(e.source_id, e.target_id) for e in edges]}, sort_keys=True)
        fingerprint = hashlib.sha256(fp_payload.encode("utf-8")).hexdigest()

        return ProvenanceTrace(
            root_id=art.artifact_id,
            direction="FORWARD",
            nodes=nodes,
            edges=edges,
            is_complete=True,
            missing_links=[],
            has_cycles=has_cycles,
            fingerprint=fingerprint,
        )

    # --------------------------------------------------------------------------
    # Feature C: Counterfactual Explanation
    # --------------------------------------------------------------------------

    def explain_counterfactual(
        self,
        case_id: str,
        finding_id: str,
        challenge_run_id: str,
        baseline_run_id: Optional[str] = None,
    ) -> CounterfactualFindingExplanation:
        """Explains finding differences between baseline and a counterfactual challenge run."""
        case = self.case_store.get_case(case_id)
        if not case:
            raise ValueError(f"Case '{case_id}' not found.")

        chlg_run = self.case_store.get_analysis_run(case_id, challenge_run_id)
        if not chlg_run:
            raise KeyError(f"Challenge run '{challenge_run_id}' not found in case '{case_id}'.")

        base_run_id = baseline_run_id or "baseline"

        base_expl = self.explain_finding(case_id, finding_id, run_id=base_run_id)
        chlg_expl = self.explain_finding(case_id, finding_id, run_id=challenge_run_id)

        excluded_ids = chlg_run.excluded_artifact_ids or []
        finding_deps = set(base_expl.counterfactual_context.dependencies)
        deactivated_deps = sorted(list(finding_deps.intersection(set(excluded_ids))))

        # Determine transition rationale
        if base_expl.status == "ACTIVE" and chlg_expl.status == "INACTIVE":
            transition_summary = (
                f"Finding '{finding_id}' was ACTIVE in baseline but transitioned to INACTIVE in challenge run '{challenge_run_id}' "
                f"because its supporting artifact(s) ({', '.join(deactivated_deps)}) were excluded from the active evidence set. "
                "Excluding the challenged source removed the factual basis for the discrepancy."
            )
            is_justified = len(deactivated_deps) > 0
        elif base_expl.status == "ACTIVE" and chlg_expl.status == "ACTIVE":
            transition_summary = (
                f"Finding '{finding_id}' remained ACTIVE across challenge run '{challenge_run_id}'. "
                f"None of its supporting artifacts were excluded, demonstrating that this finding is supported by independent evidence."
            )
            is_justified = len(deactivated_deps) == 0
        else:
            transition_summary = (
                f"Finding '{finding_id}' has baseline status '{base_expl.status}' and challenge status '{chlg_expl.status}'. "
                f"Excluded artifacts: {', '.join(excluded_ids) if excluded_ids else 'None'}."
            )
            is_justified = True

        # Find independent surviving findings in challenge run
        facts = self.case_store.list_canonical_facts(case_id)
        artifacts = self.case_store.list_artifacts(case_id)
        ch_analysis = self.contradiction_engine.analyze_case(
            case_id=case_id,
            facts=facts,
            artifacts=artifacts,
            run=chlg_run,
        )
        surviving = [
            c.finding_id for c in ch_analysis.contradictions
            if c.status == FindingStatus.ACTIVE.value and c.finding_id != finding_id
        ]

        return CounterfactualFindingExplanation(
            case_id=case_id,
            finding_id=finding_id,
            baseline_run_id=base_run_id,
            challenge_run_id=challenge_run_id,
            baseline_status=base_expl.status,
            challenge_status=chlg_expl.status,
            excluded_artifact_ids=excluded_ids,
            deactivated_dependencies=deactivated_deps,
            transition_summary=transition_summary,
            independent_surviving_findings=surviving,
            is_provenance_justified=is_justified,
            baseline_explanation=base_expl,
            challenge_explanation=chlg_expl,
        )

    # --------------------------------------------------------------------------
    # Helper Utilities
    # --------------------------------------------------------------------------

    def _get_custody_summaries(
        self,
        case_id: str,
        artifact_ids: List[str],
        finding_id: str,
    ) -> List[CustodyEventSummary]:
        ledger = self.case_store.get_ledger(case_id)
        entries = ledger.get_all_entries()
        summaries: List[CustodyEventSummary] = []
        target_ids = set(artifact_ids) | {finding_id}

        for e in entries:
            is_relevant = (
                (e.fact_id is not None and e.fact_id in target_ids)
                or any(aid in str(e.fact_id or "") for aid in artifact_ids)
                or (e.fact_id is not None and finding_id in e.fact_id)
            )
            if is_relevant or len(summaries) < 5:
                summaries.append(
                    CustodyEventSummary(
                        sequence=e.seq,
                        timestamp_iso=e.timestamp_iso,
                        action=e.action,
                        entry_hash=e.entry_hash,
                        fact_id=e.fact_id,
                        payload_preview=f"{e.action} (hash: {e.payload_sha256[:10]}...)",
                    )
                )

        return summaries

    @staticmethod
    def _detect_cycles(nodes: List[TraceNode], edges: List[TraceEdge]) -> bool:
        """Kahn's topological sort cycle detector."""
        node_ids = {n.node_id for n in nodes}
        in_degrees: Dict[str, int] = {nid: 0 for nid in node_ids}
        adj: Dict[str, List[str]] = {nid: [] for nid in node_ids}

        for e in edges:
            if e.source_id in adj and e.target_id in in_degrees:
                adj[e.source_id].append(e.target_id)
                in_degrees[e.target_id] += 1

        queue = [nid for nid, deg in in_degrees.items() if deg == 0]
        visited_count = 0

        while queue:
            curr = queue.pop(0)
            visited_count += 1
            for nxt in adj.get(curr, []):
                in_degrees[nxt] -= 1
                if in_degrees[nxt] == 0:
                    queue.append(nxt)

        return visited_count < len(nodes)

    @staticmethod
    def _compute_explanation_fingerprint(
        finding_id: str,
        status: str,
        rule_id: str,
        fact_ids: List[str],
        artifact_ids: List[str],
        original_values: Dict[str, Any],
    ) -> str:
        payload = json.dumps(
            {
                "finding_id": finding_id,
                "status": status,
                "rule_id": rule_id,
                "fact_ids": sorted(fact_ids),
                "artifact_ids": sorted(artifact_ids),
                "original_values": dict(sorted(original_values.items())),
            },
            sort_keys=True,
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()
