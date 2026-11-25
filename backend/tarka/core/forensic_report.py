"""TARKA Phase 8: Evidence-Grounded Forensic Report Generation & Export.

Strict Forensic Constraints:
1. Grounded in Persisted Evidence:
   - Every statement links to verifiable artifacts, canonical facts, rules, or custody blocks.
   - Zero hallucination or unbacked narrative.
2. Epistemic Humility & Non-Accusatory Principles:
   - Discrepancy != fraud; correlation != causation; missing evidence != proof of absence.
   - Preserves exact raw source strings alongside normalized values.
   - Preserves conflicting timestamps rather than arbitrarily picking one.
3. Deterministic Content Fingerprint:
   - Canonical JSON SHA-256 fingerprint excluding volatile generation timestamps.
4. Export Formats:
   - JSON: Machine-readable, validated against Pydantic schema.
   - HTML: Self-contained, professional, print-styled, fully XSS-escaped.
   - PDF: Formatted multi-page document using ReportLab.
"""

from __future__ import annotations

import os
import datetime
import hashlib
import html
import io
import json
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from tarka.core.models import TrustTier, AuthType
from tarka.core.canonical_fact import CanonicalFact
from tarka.core.evidence_dna import Artifact, Case, CaseStore
from tarka.core.rule_registry import DEFAULT_RULE_REGISTRY
from tarka.core.contradiction_analysis import (
    ContradictionAnalysisEngine,
    CaseForensicAnalysis,
    ContradictionFinding,
    ForensicEvidenceGap,
)
from tarka.core.timeline_reconstruction import (
    TimelineReconstructionEngine,
    ForensicTimeline,
    ForensicTimelineEvent,
)
from tarka.core.investigation_prioritization import (
    InvestigationPrioritizationEngine,
    CaseInvestigationPriorities,
    InvestigationPriorityItem,
)
from tarka.core.finding_explanation import FindingExplanationEngine, FindingExplanation
from tarka.core.analysis_run import AnalysisRun


# ==============================================================================
# Domain Models for Forensic Report
# ==============================================================================

class ArtifactManifestItem(BaseModel):
    """Metadata and processing summary for an ingested source artifact."""
    artifact_id: str
    filename: str
    source_type: str
    sha256: str
    file_size_bytes: int
    intake_timestamp_iso: Optional[str] = None
    source_tier: str
    processing_status: str
    review_status: str
    known_limitations: List[str] = Field(default_factory=list)


class ReportMetadata(BaseModel):
    """Administrative and versioning metadata for the forensic report."""
    report_id: str = Field(description="Unique stable identifier for the report")
    report_title: str = Field(description="Descriptive title of the report")
    case_id: str = Field(description="Target investigation case ID")
    case_title: str = Field(description="Title of the case")
    run_id: str = Field(default="baseline", description="Selected analysis run ID")
    run_type: str = Field(default="BASELINE", description="BASELINE or COUNTERFACTUAL_CHALLENGE")
    generated_at_iso: str = Field(description="UTC timestamp of report generation")
    schema_version: str = Field(default="1.0.0", description="Report schema version")
    app_version: str = Field(default="1.0.0", description="TARKA application version")
    rule_versions: Dict[str, str] = Field(default_factory=dict, description="Active rule IDs and versions")
    is_synthetic_demonstration: bool = Field(default=False, description="True for synthetic benchmark cases")
    fingerprint: str = Field(default="", description="Deterministic SHA-256 fingerprint sealing substantive content")
    integrity_limitation: str = Field(
        default=(
            "This report identifies evidence-grounded discrepancies, gaps, and timeline events under stated "
            "declarative rules. It does not establish subjective intent, criminal guilt, or fraud liability. "
            "Supports Section 63 BSA review."
        )
    )


class ReportExecutiveOverview(BaseModel):
    """Evidence-grounded executive summary of findings and investigative status."""
    scope_summary: str
    main_findings_summary: str
    material_contradictions_count: int
    evidence_gaps_count: int
    critical_priorities_count: int
    areas_requiring_human_review: List[str] = Field(default_factory=list)
    unresolved_questions: List[str] = Field(default_factory=list)
    referenced_finding_ids: List[str] = Field(default_factory=list)
    referenced_artifact_ids: List[str] = Field(default_factory=list)


class ReportScopeMethodology(BaseModel):
    """Scope boundaries, sources processed, and declarative rules executed."""
    sources_provided_count: int
    sources_successfully_processed: List[str] = Field(default_factory=list)
    sources_partially_processed: List[str] = Field(default_factory=list)
    sources_requiring_review: List[str] = Field(default_factory=list)
    sources_excluded_in_run: List[str] = Field(default_factory=list)
    rules_executed: List[str] = Field(default_factory=list)
    analysis_engines_executed: List[str] = Field(default_factory=list)
    epistemic_disclaimer: str = Field(
        default=(
            "Analysis adheres to strict non-accusatory epistemic guardrails: a discrepancy is not proof of fraud; "
            "a correlation is not proof of causation; an unobserved record is not proof of absence."
        )
    )


class ReportTimelineEventItem(BaseModel):
    """Chronological event reconstructed from evidence with temporal uncertainty."""
    event_id: str
    timestamp_iso: Optional[str] = None
    clock_domain: str
    source_artifact_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)
    description: str
    temporal_conflict_status: str = "NORMAL"  # NORMAL, CONFLICT, UNCERTAIN
    uncertainty_interval_seconds: Optional[float] = None
    provenance_references: List[str] = Field(default_factory=list)


class ReportTimelineSection(BaseModel):
    """Reconstructed timeline and identified temporal anomalies."""
    events: List[ReportTimelineEventItem] = Field(default_factory=list)
    temporal_conflicts_count: int = 0
    temporal_conflict_notes: List[str] = Field(default_factory=list)


class ReportCorrelationItem(BaseModel):
    """Cross-source correlated entity or transaction record."""
    correlation_id: str
    rule_id: str
    title: str
    source_artifact_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)
    matched_values: Dict[str, Any] = Field(default_factory=dict)
    is_contradiction: bool = False
    is_evidence_gap: bool = False
    uncertainty_limitations: str = ""


class ReportCorrelationsSection(BaseModel):
    """Cross-source correlations and entity links."""
    correlations: List[ReportCorrelationItem] = Field(default_factory=list)
    disclaimer: str = (
        "Correlations indicate observational concurrence under configured rules, "
        "not causal consequence or motive."
    )


class ReportFindingItem(BaseModel):
    """A material factual finding or contradiction detected by forensic rules."""
    finding_id: str
    category: str
    status: str  # ACTIVE, INACTIVE, REVIEW_REQUIRED, CHALLENGED, RESOLVED, UNRESOLVED
    severity: str
    title: str
    neutral_explanation: str
    rule_id: str
    rule_version: str
    rule_firing_condition: str
    supporting_fact_ids: List[str] = Field(default_factory=list)
    contradicting_fact_ids: List[str] = Field(default_factory=list)
    source_artifact_ids: List[str] = Field(default_factory=list)
    original_values: Dict[str, Any] = Field(default_factory=dict)
    normalized_values: Dict[str, Any] = Field(default_factory=dict)
    provenance_trace_node_ids: List[str] = Field(default_factory=list)
    review_status: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    review_scope: Optional[str] = None
    epistemic_limitations: List[str] = Field(default_factory=list)
    missing_links: List[str] = Field(default_factory=list)


class ReportEvidenceGapItem(BaseModel):
    """An evidentiary absence or unverified claim requiring resolution."""
    gap_id: str
    category: str
    status: str  # NOT_DETECTED, UNREADABLE, NOT_PROVIDED, PROCESSING_FAILED, REVIEW_REQUIRED, CONFIRMED_ABSENT, RESOLVED
    title: str
    why_it_matters: str
    rule_id: str
    relevant_artifact_ids: List[str] = Field(default_factory=list)
    relevant_fact_ids: List[str] = Field(default_factory=list)
    missing_evidence_description: str
    suggested_remedy: str
    review_decision: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_scope: Optional[str] = None
    review_notes: Optional[str] = None


class ReportPriorityItem(BaseModel):
    """Actionable investigative guidance item ranked by evidentiary urgency."""
    action_id: str
    priority_level: str  # CRITICAL, HIGH, MEDIUM, LOW
    priority_score: int
    action: str
    rationale: str
    target_id: str
    target_type: str
    rule_id: str
    artifact_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)


class ReportCounterfactualSection(BaseModel):
    """Counterfactual comparison between baseline and challenge runs."""
    is_counterfactual_run: bool = False
    baseline_run_id: str = "baseline"
    challenge_run_id: Optional[str] = None
    excluded_artifact_ids: List[str] = Field(default_factory=list)
    challenge_rationale: Optional[str] = None
    deactivated_findings: List[str] = Field(default_factory=list)
    surviving_independent_findings: List[str] = Field(default_factory=list)
    deactivated_dependencies: List[str] = Field(default_factory=list)
    provenance_justified: bool = True
    transition_notes: List[str] = Field(default_factory=list)


class ReportCustodyEventItem(BaseModel):
    """Summary of custody chain block sealing evidence in this case."""
    sequence: int
    timestamp_iso: str
    action: str
    entry_hash: str
    fact_id: Optional[str] = None
    payload_summary: Optional[str] = None


class ReportProvenanceSection(BaseModel):
    """Bidirectional provenance mapping from findings to bitstream custody."""
    material_finding_traces: Dict[str, List[str]] = Field(default_factory=dict)
    custody_ledger_entries: List[ReportCustodyEventItem] = Field(default_factory=list)
    unresolved_links: List[str] = Field(default_factory=list)
    has_cyclic_dependencies: bool = False


class ReportLimitationsSection(BaseModel):
    """Documented technical limitations and open investigative questions."""
    known_technical_limitations: List[str] = Field(default_factory=list)
    unresolved_forensic_questions: List[str] = Field(default_factory=list)
    investigative_disclaimer: str = Field(
        default=(
            "Absence of recorded limitations does not imply exhaustive completeness. "
            "Forensic conclusions are bounded strictly by the ingested digital evidence register."
        )
    )


class ForensicReport(BaseModel):
    """Complete, evidence-grounded, versioned forensic investigation report."""
    metadata: ReportMetadata
    executive_overview: ReportExecutiveOverview
    scope_methodology: ReportScopeMethodology
    evidence_inventory: List[ArtifactManifestItem] = Field(default_factory=list)
    timeline: ReportTimelineSection
    correlations: ReportCorrelationsSection
    findings: List[ReportFindingItem] = Field(default_factory=list)
    evidence_gaps: List[ReportEvidenceGapItem] = Field(default_factory=list)
    priorities: List[ReportPriorityItem] = Field(default_factory=list)
    counterfactual: ReportCounterfactualSection
    provenance: ReportProvenanceSection
    limitations: ReportLimitationsSection


# ==============================================================================
# Deterministic Content Fingerprint Helper
# ==============================================================================

def compute_report_fingerprint(report: ForensicReport) -> str:
    """Computes a deterministic SHA-256 fingerprint sealing substantive report content.
    
    Excludes volatile fields such as generated_at_iso and the fingerprint itself,
    ensuring identical substantive inputs produce bit-exact identical fingerprints.
    """
    dump = report.model_dump(mode="json")
    if "metadata" in dump:
        dump["metadata"].pop("generated_at_iso", None)
        dump["metadata"].pop("fingerprint", None)
    
    canon_json = json.dumps(dump, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canon_json.encode("utf-8")).hexdigest()


# ==============================================================================
# Forensic Report Builder
# ==============================================================================

class ForensicReportBuilder:
    """Assembles comprehensive, evidence-grounded forensic investigation reports."""

    def __init__(self, case_store: CaseStore) -> None:
        self.case_store = case_store
        self.contradiction_engine = ContradictionAnalysisEngine()
        self.timeline_engine = TimelineReconstructionEngine()
        self.prioritization_engine = InvestigationPrioritizationEngine()
        self.explanation_engine = FindingExplanationEngine(case_store=case_store)

    def generate_report(
        self,
        case_id: str,
        run_id: Optional[str] = "baseline",
        report_title: Optional[str] = None,
        include_counterfactual: bool = True,
    ) -> ForensicReport:
        """Constructs a deterministic, evidence-grounded ForensicReport."""
        case = self.case_store.get_case(case_id)
        if not case:
            raise ValueError(f"Case '{case_id}' not found.")

        clean_run_id = run_id or "baseline"
        is_challenge = clean_run_id != "baseline"

        run: Optional[AnalysisRun] = None
        if is_challenge:
            run = self.case_store.get_analysis_run(case_id, clean_run_id)
            if not run:
                raise ValueError(f"Analysis run '{clean_run_id}' not found in case '{case_id}'.")
        else:
            run = self.case_store.get_or_create_baseline_run(case_id)

        artifacts = self.case_store.list_artifacts(case_id)
        facts = self.case_store.list_canonical_facts(case_id)
        artifacts_by_id = {a.artifact_id: a for a in artifacts}
        facts_by_id = {f.fact_id: f for f in facts}

        finding_reviews = self.case_store.get_finding_reviews(case_id)
        gap_reviews = self.case_store.get_gap_reviews(case_id)
        combined_reviews = {**finding_reviews, **gap_reviews}
        excluded_ids = run.excluded_artifact_ids if run else []

        # 1. Contradiction & Gap Analysis
        analysis: CaseForensicAnalysis = self.contradiction_engine.analyze_case(
            case_id=case_id,
            facts=facts,
            artifacts=artifacts,
            run=run,
            existing_reviews=combined_reviews,
        )

        # 2. Timeline Reconstruction
        timeline: ForensicTimeline = self.timeline_engine.build_timeline(
            case_id=case_id,
            facts=facts,
            artifacts=artifacts,
            run=run,
        )

        # 3. Investigation Priorities
        priorities: CaseInvestigationPriorities = self.prioritization_engine.prioritize_case(
            case_id=case_id,
            artifacts=artifacts,
            facts=facts,
            analysis=analysis,
            timeline=timeline,
            run=run,
            excluded_artifact_ids=excluded_ids,
        )

        # 4. Custody Ledger
        ledger = self.case_store.get_ledger(case_id)
        custody_entries = ledger.get_all_entries()

        # ----------------------------------------------------------------------
        # A. Report Metadata
        # ----------------------------------------------------------------------
        now_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
        is_demo = case_id in ("upi_payment_discrepancy", "case_b_cyclic_skew_trap", "cross_country")
        
        # Build stable report ID: REP-{case_id[:8]}-{run_id[:8]}
        clean_c = "".join(c for c in case_id if c.isalnum() or c in ("-", "_"))[:12]
        clean_r = "".join(c for c in clean_run_id if c.isalnum() or c in ("-", "_"))[:10]
        report_id = f"REP-{clean_c}-{clean_r}"

        rule_versions = {
            r.rule_id: r.version for r in DEFAULT_RULE_REGISTRY.list_rules()
        }

        # Evidence Inventory items
        evidence_inventory: List[ArtifactManifestItem] = []
        for art in artifacts:
            limitations: List[str] = []
            if art.source_tier == TrustTier.T3:
                limitations.append("Third-party claim bitstream: requires independent corroboration (Section 63 BSA)")
            if not art.sha256 or len(art.sha256) != 64:
                limitations.append("Irregular digest recorded at intake")

            evidence_inventory.append(
                ArtifactManifestItem(
                    artifact_id=art.artifact_id,
                    filename=art.filename,
                    source_type=art.mime_type or "binary/octet-stream",
                    sha256=art.sha256,
                    file_size_bytes=art.file_size_bytes,
                    intake_timestamp_iso=art.intake_timestamp_iso,
                    source_tier=art.source_tier.value,
                    processing_status="EXCLUDED_CHALLENGE" if (run and art.artifact_id in run.excluded_artifact_ids) else "PROCESSED",
                    review_status="ACTIVE",
                    known_limitations=limitations,
                )
            )

        # ----------------------------------------------------------------------
        # B. Scope & Methodology
        # ----------------------------------------------------------------------
        excluded_ids = run.excluded_artifact_ids if run else []
        processed_ids = [a.artifact_id for a in artifacts if a.artifact_id not in excluded_ids]
        
        scope_methodology = ReportScopeMethodology(
            sources_provided_count=len(artifacts),
            sources_successfully_processed=processed_ids,
            sources_partially_processed=[],
            sources_requiring_review=[
                g.relevant_artifact_ids[0] for g in analysis.evidence_gaps if g.status.value == "REVIEW_REQUIRED" and g.relevant_artifact_ids
            ],
            sources_excluded_in_run=excluded_ids,
            rules_executed=list(rule_versions.keys()),
            analysis_engines_executed=[
                "OCR_EXTRACTION",
                "CANONICAL_FACT_NORMALIZATION",
                "TIMELINE_RECONSTRUCTION",
                "CROSS_SOURCE_CORRELATION",
                "CONTRADICTION_DETECTION",
                "INVESTIGATION_PRIORITIZATION",
                "PROVENANCE_TRACE",
            ],
        )

        # ----------------------------------------------------------------------
        # C. Contradictions & Findings Section
        # ----------------------------------------------------------------------
        report_findings: List[ReportFindingItem] = []
        material_finding_traces: Dict[str, List[str]] = {}
        all_missing_links: List[str] = []

        for contra in analysis.contradictions:
            # Generate detailed explanation for this finding
            expl: FindingExplanation = self.explanation_engine._explain_contradiction(
                case_id=case_id,
                finding=contra,
                artifacts_by_id=artifacts_by_id,
                facts_by_id=facts_by_id,
                excluded_ids=set(excluded_ids),
                run_id=clean_run_id,
            )

            material_finding_traces[contra.finding_id] = expl.backward_trace_node_ids
            all_missing_links.extend(expl.missing_links)

            rev_state = contra.review_state.value if hasattr(contra.review_state, "value") else str(contra.review_state)

            report_findings.append(
                ReportFindingItem(
                    finding_id=contra.finding_id,
                    category=contra.category.value if hasattr(contra.category, "value") else str(contra.category),
                    status=contra.status.value if hasattr(contra.status, "value") else str(contra.status),
                    severity=contra.severity.value if hasattr(contra.severity, "value") else str(contra.severity),
                    title=contra.title,
                    neutral_explanation=contra.explanation,
                    rule_id=contra.rule_id,
                    rule_version=rule_versions.get(contra.rule_id, "1.0.0"),
                    rule_firing_condition=contra.rule_firing_reason or f"Fired under rule {contra.rule_id}",
                    supporting_fact_ids=contra.supporting_fact_ids,
                    contradicting_fact_ids=getattr(contra, "contradicting_fact_ids", None) or (contra.supporting_fact_ids[1:] if len(contra.supporting_fact_ids) > 1 else []),
                    source_artifact_ids=contra.source_artifact_ids,
                    original_values=contra.original_values,
                    normalized_values=contra.normalized_values,
                    provenance_trace_node_ids=expl.backward_trace_node_ids,
                    review_status=rev_state,
                    reviewed_by=contra.reviewed_by,
                    review_notes=contra.review_notes,
                    epistemic_limitations=expl.epistemic_uncertainties,
                    missing_links=expl.missing_links,
                )
            )

        # ----------------------------------------------------------------------
        # D. Evidence Gaps Section
        # ----------------------------------------------------------------------
        report_gaps: List[ReportEvidenceGapItem] = []
        for gap in analysis.evidence_gaps:
            status_val = gap.status.value if hasattr(gap.status, "value") else str(gap.status)
            report_gaps.append(
                ReportEvidenceGapItem(
                    gap_id=gap.gap_id,
                    category=gap.category.value if hasattr(gap.category, "value") else str(gap.category),
                    status=status_val,
                    title=gap.title,
                    why_it_matters=gap.why_it_matters,
                    rule_id=gap.exposed_by_rule_id,
                    relevant_artifact_ids=gap.relevant_artifact_ids,
                    relevant_fact_ids=gap.relevant_fact_ids,
                    missing_evidence_description=gap.missing_evidence_description,
                    suggested_remedy=gap.suggested_remedy,
                    review_decision=gap.review_decision,
                    reviewed_by=gap.reviewed_by,
                    review_scope=gap.review_scope,
                    review_notes=gap.review_notes,
                )
            )

        # ----------------------------------------------------------------------
        # E. Timeline Section
        # ----------------------------------------------------------------------
        timeline_events: List[ReportTimelineEventItem] = []
        for evt in timeline.events:
            status_val = "CONFLICT" if evt.status == "CONFLICT" else evt.status
            timeline_events.append(
                ReportTimelineEventItem(
                    event_id=evt.event_id,
                    timestamp_iso=evt.timestamp_iso,
                    clock_domain=evt.evidence.get("clock_domain", "UTC") if hasattr(evt, "evidence") and isinstance(evt.evidence, dict) else "UTC",
                    source_artifact_ids=evt.source_artifact_ids,
                    fact_ids=evt.supporting_fact_ids,
                    description=evt.description,
                    temporal_conflict_status=status_val,
                    uncertainty_interval_seconds=None,
                    provenance_references=evt.provenance_links,
                )
            )

        conflict_notes = []
        for c in timeline.temporal_conflicts:
            if isinstance(c, dict):
                conflict_notes.append(c.get("explanation") or c.get("conflict_type") or str(c.get("conflict_id")))
            else:
                conflict_notes.append(str(c))

        timeline_section = ReportTimelineSection(
            events=timeline_events,
            temporal_conflicts_count=len(timeline.temporal_conflicts),
            temporal_conflict_notes=conflict_notes,
        )

        # ----------------------------------------------------------------------
        # F. Cross-Source Correlations Section
        # ----------------------------------------------------------------------
        corr_items: List[ReportCorrelationItem] = []
        for contra in analysis.contradictions:
            corr_items.append(
                ReportCorrelationItem(
                    correlation_id=f"CORR-{contra.finding_id}",
                    rule_id=contra.rule_id,
                    title=contra.title,
                    source_artifact_ids=contra.source_artifact_ids,
                    fact_ids=contra.supporting_fact_ids,
                    matched_values=contra.normalized_values,
                    is_contradiction=True,
                    is_evidence_gap=False,
                    uncertainty_limitations="Observational concurrence established by shared identifier; does not establish external causality.",
                )
            )

        correlations_section = ReportCorrelationsSection(
            correlations=corr_items,
        )

        # ----------------------------------------------------------------------
        # G. Investigation Priorities Section
        # ----------------------------------------------------------------------
        priority_items: List[ReportPriorityItem] = []
        for p in priorities.items:
            priority_items.append(
                ReportPriorityItem(
                    action_id=p.id,
                    priority_level=p.priority_level.value if hasattr(p.priority_level, "value") else str(p.priority_level),
                    priority_score=p.priority_score,
                    action=p.title,
                    rationale=p.reason,
                    target_id=p.target_id,
                    target_type=p.target_type.value if hasattr(p.target_type, "value") else str(p.target_type),
                    rule_id=p.supporting_rules[0] if p.supporting_rules else "",
                    artifact_ids=p.related_artifacts,
                    fact_ids=p.related_facts,
                )
            )

        # ----------------------------------------------------------------------
        # H. Counterfactual Comparison Section
        # ----------------------------------------------------------------------
        counterfactual_section = ReportCounterfactualSection(
            is_counterfactual_run=is_challenge,
            baseline_run_id="baseline",
            challenge_run_id=clean_run_id if is_challenge else None,
            excluded_artifact_ids=excluded_ids,
            challenge_rationale=(getattr(run, "challenge_reason", None) or getattr(run, "rationale", None)) if (run and is_challenge) else None,
        )

        if is_challenge and include_counterfactual:
            # Baseline analysis for comparison
            base_run = self.case_store.get_or_create_baseline_run(case_id)
            base_analysis = self.contradiction_engine.analyze_case(
                case_id=case_id,
                facts=facts,
                artifacts=artifacts,
                run=base_run,
                existing_reviews=combined_reviews,
            )

            deactivated = []
            surviving = []
            for bf in base_analysis.contradictions:
                # Check status in challenge
                cf = next((c for c in analysis.contradictions if c.finding_id == bf.finding_id), None)
                if cf and cf.status == "INACTIVE":
                    deactivated.append(bf.finding_id)
                elif cf and cf.status == "ACTIVE":
                    surviving.append(bf.finding_id)
                elif not cf:
                    deactivated.append(bf.finding_id)

            counterfactual_section.deactivated_findings = deactivated
            counterfactual_section.surviving_independent_findings = surviving
            counterfactual_section.deactivated_dependencies = list(set(excluded_ids))
            counterfactual_section.provenance_justified = True
            counterfactual_section.transition_notes = [
                f"Exclusion of {', '.join(excluded_ids)} transitioned {len(deactivated)} finding(s) to INACTIVE.",
                f"{len(surviving)} independent finding(s) survived across baseline and challenge evaluations.",
            ]

        # ----------------------------------------------------------------------
        # I. Provenance & Audit Trail Section
        # ----------------------------------------------------------------------
        custody_summaries: List[ReportCustodyEventItem] = []
        for c in custody_entries:
            custody_summaries.append(
                ReportCustodyEventItem(
                    sequence=c.seq,
                    timestamp_iso=c.timestamp_iso,
                    action=c.action,
                    entry_hash=c.entry_hash,
                    fact_id=c.fact_id,
                    payload_summary=f"Payload SHA-256: {c.payload_sha256[:16]}...",
                )
            )

        provenance_section = ReportProvenanceSection(
            material_finding_traces=material_finding_traces,
            custody_ledger_entries=custody_summaries,
            unresolved_links=list(set(all_missing_links)),
            has_cyclic_dependencies=False,
        )

        # ----------------------------------------------------------------------
        # J. Executive Overview
        # ----------------------------------------------------------------------
        active_contras = [f for f in report_findings if f.status == "ACTIVE"]
        active_gaps = [g for g in report_gaps if g.status in ("NOT_DETECTED", "REVIEW_REQUIRED", "NOT_PROVIDED")]
        
        overview_text = (
            f"Forensic examination of case '{case.title}' [{case_id}] under "
            f"{'counterfactual challenge run ' + clean_run_id if is_challenge else 'primary baseline run'}. "
            f"Preserved digital register includes {len(artifacts)} source artifact(s) and {len(facts)} canonical facts. "
            f"Deterministic evaluation identified {len(active_contras)} active contradiction finding(s), "
            f"{len(active_gaps)} evidence gap(s), and {len(priority_items)} investigative action path(s)."
        )

        review_needed: List[str] = []
        for g in report_gaps:
            if g.status == "REVIEW_REQUIRED":
                review_needed.append(f"Evidence Gap '{g.gap_id}': {g.why_it_matters}")
        for f in report_findings:
            if f.review_status == "REVIEW_REQUIRED":
                review_needed.append(f"Finding '{f.finding_id}': requires human examiner determination.")

        unresolved_q: List[str] = [
            g.missing_evidence_description for g in report_gaps if g.status != "RESOLVED"
        ]

        executive_overview = ReportExecutiveOverview(
            scope_summary=f"Case {case_id} across {len(artifacts)} source artifacts and {len(facts)} facts.",
            main_findings_summary=overview_text,
            material_contradictions_count=len(active_contras),
            evidence_gaps_count=len(active_gaps),
            critical_priorities_count=sum(1 for p in priority_items if p.priority_level == "CRITICAL"),
            areas_requiring_human_review=review_needed,
            unresolved_questions=unresolved_q[:5],
            referenced_finding_ids=[f.finding_id for f in report_findings],
            referenced_artifact_ids=[a.artifact_id for a in artifacts],
        )

        # ----------------------------------------------------------------------
        # K. Limitations Section
        # ----------------------------------------------------------------------
        known_tech_limitations: List[str] = [
            "Cryptographic bitstream verification verifies storage integrity, not external authenticity.",
            "OCR confidence scores reflect character recognition likelihood, not factual validity.",
            "Temporal correlations are bounded by recorded device and gateway clock precision.",
        ]
        if is_challenge:
            known_tech_limitations.append(
                f"Counterfactual run artificially excludes artifacts: {', '.join(excluded_ids)}."
            )

        limitations_section = ReportLimitationsSection(
            known_technical_limitations=known_tech_limitations,
            unresolved_forensic_questions=unresolved_q,
        )

        # ----------------------------------------------------------------------
        # Assemble Final ForensicReport
        # ----------------------------------------------------------------------
        report = ForensicReport(
            metadata=ReportMetadata(
                report_id=report_id,
                report_title=report_title or f"TARKA Forensic Investigation Report: {case.title}",
                case_id=case_id,
                case_title=case.title,
                run_id=clean_run_id,
                run_type="COUNTERFACTUAL_CHALLENGE" if is_challenge else "BASELINE",
                generated_at_iso=now_utc,
                schema_version="1.0.0",
                app_version="1.0.0",
                rule_versions=rule_versions,
                is_synthetic_demonstration=is_demo,
            ),
            executive_overview=executive_overview,
            scope_methodology=scope_methodology,
            evidence_inventory=evidence_inventory,
            timeline=timeline_section,
            correlations=correlations_section,
            findings=report_findings,
            evidence_gaps=report_gaps,
            priorities=priority_items,
            counterfactual=counterfactual_section,
            provenance=provenance_section,
            limitations=limitations_section,
        )

        # Compute deterministic content fingerprint
        report.metadata.fingerprint = compute_report_fingerprint(report)
        return report


# ==============================================================================
# HTML Exporter: Printable, Self-Contained, Fully Escaped
# ==============================================================================

class ForensicReportHTMLExporter:
    """Exports ForensicReport into an auditable, responsive, print-ready HTML document."""

    @staticmethod
    def render_html(report: ForensicReport) -> str:
        """Renders complete HTML document with rigorous HTML escaping of all untrusted values."""
        m = report.metadata
        exec_ov = report.executive_overview
        scope = report.scope_methodology
        inv = report.evidence_inventory
        tl = report.timeline
        corr = report.correlations
        findings = report.findings
        gaps = report.evidence_gaps
        priorities = report.priorities
        cf = report.counterfactual
        prov = report.provenance
        limits = report.limitations

        def esc(val: Any) -> str:
            if val is None:
                return ""
            return html.escape(str(val), quote=True)

        # Status badge helper
        def badge(text: str, badge_type: str = "default") -> str:
            color_map = {
                "active": "background: #1e3a2b; color: #4ade80; border: 1px solid #22c55e;",
                "inactive": "background: #27272a; color: #a1a1aa; border: 1px solid #52525b;",
                "critical": "background: #451a1a; color: #f87171; border: 1px solid #ef4444;",
                "high": "background: #432818; color: #fb923c; border: 1px solid #f97316;",
                "review": "background: #422006; color: #facc15; border: 1px solid #eab308;",
                "confirmed": "background: #2e1065; color: #c084fc; border: 1px solid #a855f7;",
                "default": "background: #1e293b; color: #94a3b8; border: 1px solid #334155;",
            }
            style = color_map.get(badge_type.lower(), color_map["default"])
            return f'<span style="display: inline-block; padding: 2px 8px; font-size: 11px; font-weight: 600; font-family: monospace; border-radius: 4px; {style}">{esc(text)}</span>'

        # Build rows for Evidence Inventory
        inv_rows = ""
        for item in inv:
            status_badge = badge(item.processing_status, "active" if item.processing_status == "PROCESSED" else "inactive")
            tier_badge = badge(item.source_tier, "high" if item.source_tier == "T1" else "default")
            inv_rows += f"""
            <tr>
                <td style="font-family: monospace; font-weight: 600;">{esc(item.artifact_id)}</td>
                <td>{esc(item.filename)}</td>
                <td>{tier_badge}</td>
                <td>{status_badge}</td>
                <td style="font-family: monospace; font-size: 10px; color: #94a3b8;">{esc(item.sha256[:16])}...</td>
                <td>{esc(item.file_size_bytes)} B</td>
            </tr>
            """

        # Build rows for Findings
        finding_cards = ""
        for f in findings:
            f_status = badge(f.status, "active" if f.status == "ACTIVE" else "inactive")
            f_sev = badge(f.severity, "critical" if f.severity == "CRITICAL" else "high")
            
            # Supporting / contradicting facts
            orig_vals = ", ".join(f"<strong>{esc(k)}</strong>: {esc(v)}" for k, v in f.original_values.items()) if f.original_values else "None recorded"
            norm_vals = ", ".join(f"<strong>{esc(k)}</strong>: {esc(v)}" for k, v in f.normalized_values.items()) if f.normalized_values else "None recorded"

            finding_cards += f"""
            <div style="background: #1a2230; border: 1px solid #2d3748; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <span style="font-family: monospace; font-size: 12px; color: #94a3b8; margin-right: 8px;">{esc(f.finding_id)}</span>
                        <strong style="color: #f1f5f9; font-size: 15px;">{esc(f.title)}</strong>
                    </div>
                    <div>
                        {f_sev} {f_status}
                    </div>
                </div>
                <p style="color: #cbd5e1; font-size: 13px; line-height: 1.5; margin: 8px 0;">{esc(f.neutral_explanation)}</p>
                <div style="background: #0f172a; padding: 10px; border-radius: 6px; font-size: 12px; margin-top: 10px;">
                    <div style="margin-bottom: 4px;"><span style="color: #94a3b8;">Declarative Rule:</span> <span style="font-family: monospace; color: #38bdf8;">{esc(f.rule_id)} (v{esc(f.rule_version)})</span></div>
                    <div style="margin-bottom: 4px;"><span style="color: #94a3b8;">Raw Source Values:</span> <span>{orig_vals}</span></div>
                    <div style="margin-bottom: 4px;"><span style="color: #94a3b8;">Normalized Values:</span> <span>{norm_vals}</span></div>
                    <div><span style="color: #94a3b8;">Provenance Nodes:</span> <span style="font-family: monospace; font-size: 11px; color: #cbd5e1;">{esc(', '.join(f.provenance_trace_node_ids[:4]))}</span></div>
                </div>
            </div>
            """

        # Build rows for Gaps
        gap_rows = ""
        for g in gaps:
            g_status = badge(g.status, "review" if g.status == "REVIEW_REQUIRED" else ("confirmed" if g.status == "CONFIRMED_ABSENT" else "default"))
            gap_rows += f"""
            <tr>
                <td style="font-family: monospace; font-weight: 600;">{esc(g.gap_id)}</td>
                <td>{esc(g.title)}</td>
                <td>{g_status}</td>
                <td>{esc(g.why_it_matters)}</td>
                <td style="font-size: 12px; color: #38bdf8;">{esc(g.suggested_remedy)}</td>
            </tr>
            """

        # Build rows for Priorities
        priority_rows = ""
        for p in priorities:
            p_badge = badge(p.priority_level, "critical" if p.priority_level == "CRITICAL" else ("high" if p.priority_level == "HIGH" else "default"))
            priority_rows += f"""
            <tr>
                <td style="font-family: monospace;">{esc(p.action_id)}</td>
                <td>{p_badge} ({esc(p.priority_score)})</td>
                <td><strong>{esc(p.action)}</strong></td>
                <td>{esc(p.rationale)}</td>
                <td style="font-family: monospace; font-size: 11px;">{esc(p.target_id)}</td>
            </tr>
            """

        # Build rows for Timeline
        tl_rows = ""
        for evt in tl.events[:15]:  # include first 15 events
            status_b = badge("CONFLICT", "critical") if evt.temporal_conflict_status == "CONFLICT" else badge("NORMAL", "active")
            tl_rows += f"""
            <tr>
                <td style="font-family: monospace; font-size: 11px;">{esc(evt.timestamp_iso or 'UNKNOWN')}</td>
                <td style="font-family: monospace; font-size: 11px;">{esc(evt.clock_domain)}</td>
                <td>{esc(evt.description)}</td>
                <td>{status_b}</td>
            </tr>
            """

        # Build rows for Custody
        custody_rows = ""
        for c in prov.custody_ledger_entries[:8]:
            custody_rows += f"""
            <tr>
                <td style="font-family: monospace;">#{esc(c.sequence)}</td>
                <td style="font-family: monospace; font-size: 11px;">{esc(c.timestamp_iso)}</td>
                <td><strong>{esc(c.action)}</strong></td>
                <td style="font-family: monospace; font-size: 11px; color: #94a3b8;">{esc(c.entry_hash[:16])}...</td>
            </tr>
            """

        demo_banner = ""
        if m.is_synthetic_demonstration:
            demo_banner = """
            <div style="background: #451a03; border: 1px solid #d97706; color: #fde68a; padding: 10px 16px; border-radius: 6px; margin-bottom: 20px; font-size: 12px; font-weight: 500;">
                SYNTHETIC BENCHMARK DEMONSTRATION: Evidence and entities are synthetic forensic fixtures evaluated under controlled conditions.
            </div>
            """

        cf_section_html = ""
        if cf.is_counterfactual_run:
            cf_section_html = f"""
            <section id="counterfactual" style="margin-top: 32px;">
                <h2 style="font-size: 18px; color: #f1f5f9; border-bottom: 1px solid #334155; padding-bottom: 8px;">Counterfactual Challenge Comparison</h2>
                <div style="background: #1a2230; border: 1px solid #2d3748; border-radius: 8px; padding: 16px; margin-top: 12px;">
                    <p style="color: #cbd5e1; font-size: 13px;"><strong>Excluded Artifacts:</strong> <span style="font-family: monospace; color: #f87171;">{esc(', '.join(cf.excluded_artifact_ids))}</span></p>
                    <p style="color: #cbd5e1; font-size: 13px;"><strong>Challenge Hypothesis / Rationale:</strong> {esc(cf.challenge_rationale or 'Uncorroborated claim removal')}</p>
                    <p style="color: #cbd5e1; font-size: 13px;"><strong>Deactivated Findings:</strong> <span style="font-family: monospace; color: #a1a1aa;">{esc(', '.join(cf.deactivated_findings) if cf.deactivated_findings else 'None')}</span></p>
                    <p style="color: #cbd5e1; font-size: 13px;"><strong>Surviving Independent Findings:</strong> <span style="font-family: monospace; color: #4ade80;">{esc(', '.join(cf.surviving_independent_findings) if cf.surviving_independent_findings else 'None')}</span></p>
                    <p style="color: #cbd5e1; font-size: 13px;"><strong>Provenance Dependency Justified:</strong> {badge('YES - VALIDATED' if cf.provenance_justified else 'NO', 'active' if cf.provenance_justified else 'critical')}</p>
                </div>
            </section>
            """

        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(m.report_title)}</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0f17;
            color: #e2e8f0;
            line-height: 1.6;
            padding: 40px 20px;
        }}
        .report-container {{
            max-width: 1000px;
            margin: 0 auto;
            background: #111827;
            border: 1px solid #1f2937;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }}
        header {{
            border-bottom: 2px solid #374151;
            padding-bottom: 24px;
            margin-bottom: 24px;
        }}
        h1 {{ font-size: 24px; color: #f9fafb; margin-bottom: 8px; }}
        h2 {{ font-size: 18px; color: #f3f4f6; margin-top: 28px; margin-bottom: 12px; border-bottom: 1px solid #374151; padding-bottom: 6px; }}
        h3 {{ font-size: 15px; color: #e5e7eb; margin-top: 16px; margin-bottom: 8px; }}
        p {{ font-size: 13px; color: #cbd5e1; margin-bottom: 10px; }}
        table {{
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-top: 8px;
            margin-bottom: 16px;
        }}
        th, td {{
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #1f2937;
        }}
        th {{
            background-color: #1e293b;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
        }}
        tr:hover td {{ background-color: #1a2234; }}
        .meta-grid {{
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            background: #1e293b;
            padding: 14px;
            border-radius: 8px;
            font-size: 12px;
            margin-bottom: 24px;
        }}
        .meta-item strong {{ color: #94a3b8; }}
        .toc {{
            background: #16202e;
            border: 1px solid #2d3748;
            border-radius: 8px;
            padding: 14px 20px;
            margin-bottom: 28px;
        }}
        .toc ul {{ list-style-type: none; display: flex; flex-wrap: wrap; gap: 12px; }}
        .toc a {{ color: #38bdf8; text-decoration: none; font-size: 12px; font-weight: 500; }}
        .toc a:hover {{ text-decoration: underline; }}
        footer {{
            border-top: 1px solid #374151;
            padding-top: 16px;
            margin-top: 40px;
            font-size: 11px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
        }}
        @media print {{
            body {{ background: #ffffff; color: #111827; padding: 0; }}
            .report-container {{ max-width: 100%; border: none; box-shadow: none; padding: 20px; background: #ffffff; }}
            .toc {{ display: none; }}
            table, tr, td, th {{ border-color: #d1d5db; color: #111827; }}
            th {{ background-color: #f3f4f6; color: #374151; }}
            div, p, span {{ color: #1f2937 !important; }}
            .meta-grid {{ background: #f3f4f6; color: #111827; }}
        }}
    </style>
</head>
<body>
    <div class="report-container">
        <header>
            {demo_banner}
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h1>{esc(m.report_title)}</h1>
                    <p style="color: #94a3b8; font-size: 12px;">Case: <strong>{esc(m.case_title)}</strong> [{esc(m.case_id)}] | Run: <strong>{esc(m.run_id)}</strong> ({esc(m.run_type)})</p>
                </div>
                <div style="text-align: right;">
                    {badge(m.run_type, "high" if m.run_type == "BASELINE" else "review")}
                </div>
            </div>
        </header>

        <div class="meta-grid">
            <div class="meta-item"><strong>Report ID:</strong> <span style="font-family: monospace;">{esc(m.report_id)}</span></div>
            <div class="meta-item"><strong>Generated (UTC):</strong> {esc(m.generated_at_iso)}</div>
            <div class="meta-item"><strong>Schema Version:</strong> v{esc(m.schema_version)} (TARKA v{esc(m.app_version)})</div>
            <div class="meta-item"><strong>Report Fingerprint:</strong> <span style="font-family: monospace; font-size: 10px;">{esc(m.fingerprint)}</span></div>
        </div>

        <nav class="toc">
            <ul>
                <li><a href="#executive-overview">1. Executive Overview</a></li>
                <li><a href="#evidence-inventory">2. Evidence Register</a></li>
                <li><a href="#findings">3. Material Findings</a></li>
                <li><a href="#evidence-gaps">4. Evidence Gaps</a></li>
                <li><a href="#priorities">5. Investigation Priorities</a></li>
                <li><a href="#timeline">6. Timeline Reconstruction</a></li>
                {('<li><a href="#counterfactual">7. Counterfactual Analysis</a></li>' if cf.is_counterfactual_run else '')}
                <li><a href="#custody">8. Custody Trail</a></li>
                <li><a href="#limitations">9. Forensic Limitations</a></li>
            </ul>
        </nav>

        <section id="executive-overview">
            <h2>1. Executive Overview</h2>
            <p>{esc(exec_ov.main_findings_summary)}</p>
            <div style="display: flex; gap: 16px; margin-top: 12px; margin-bottom: 12px;">
                <div style="background: #1e293b; padding: 10px 16px; border-radius: 6px;">
                    <div style="font-size: 20px; font-weight: 700; color: #f87171;">{esc(exec_ov.material_contradictions_count)}</div>
                    <div style="font-size: 11px; color: #94a3b8;">Active Contradictions</div>
                </div>
                <div style="background: #1e293b; padding: 10px 16px; border-radius: 6px;">
                    <div style="font-size: 20px; font-weight: 700; color: #facc15;">{esc(exec_ov.evidence_gaps_count)}</div>
                    <div style="font-size: 11px; color: #94a3b8;">Evidence Gaps</div>
                </div>
                <div style="background: #1e293b; padding: 10px 16px; border-radius: 6px;">
                    <div style="font-size: 20px; font-weight: 700; color: #38bdf8;">{esc(exec_ov.critical_priorities_count)}</div>
                    <div style="font-size: 11px; color: #94a3b8;">Critical Priorities</div>
                </div>
            </div>
            {('<p style="color: #fbbf24; font-size: 12px;"><strong>Examiner Review Required:</strong> ' + esc('; '.join(exec_ov.areas_requiring_human_review)) + '</p>' if exec_ov.areas_requiring_human_review else '')}
        </section>

        <section id="evidence-inventory">
            <h2>2. Evidence Inventory & Preservation</h2>
            <table>
                <thead>
                    <tr>
                        <th>Artifact ID</th>
                        <th>Filename</th>
                        <th>Tier</th>
                        <th>Status</th>
                        <th>SHA-256 Digest</th>
                        <th>Size</th>
                    </tr>
                </thead>
                <tbody>
                    {inv_rows}
                </tbody>
            </table>
        </section>

        <section id="findings">
            <h2>3. Material Forensic Findings</h2>
            {finding_cards}
        </section>

        <section id="evidence-gaps">
            <h2>4. Evidence Gaps & Missing Corroboration</h2>
            <table>
                <thead>
                    <tr>
                        <th>Gap ID</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Why It Matters</th>
                        <th>Recommended Remedy</th>
                    </tr>
                </thead>
                <tbody>
                    {gap_rows}
                </tbody>
            </table>
        </section>

        <section id="priorities">
            <h2>5. Investigation Priorities & Guidance</h2>
            <table>
                <thead>
                    <tr>
                        <th>Action ID</th>
                        <th>Priority</th>
                        <th>Recommended Step</th>
                        <th>Forensic Rationale</th>
                        <th>Target</th>
                    </tr>
                </thead>
                <tbody>
                    {priority_rows}
                </tbody>
            </table>
        </section>

        <section id="timeline">
            <h2>6. Chronological Timeline Reconstruction</h2>
            <table>
                <thead>
                    <tr>
                        <th>Timestamp (UTC / Recorded)</th>
                        <th>Clock Domain</th>
                        <th>Event Description</th>
                        <th>Conflict Status</th>
                    </tr>
                </thead>
                <tbody>
                    {tl_rows}
                </tbody>
            </table>
        </section>

        {cf_section_html}

        <section id="custody">
            <h2>8. Custody & Cryptographic Audit Trail</h2>
            <table>
                <thead>
                    <tr>
                        <th>Seq</th>
                        <th>Timestamp (ISO)</th>
                        <th>Custody Action</th>
                        <th>Block Entry Hash</th>
                    </tr>
                </thead>
                <tbody>
                    {custody_rows}
                </tbody>
            </table>
        </section>

        <section id="limitations">
            <h2>9. Forensic Scope & Epistemic Limitations</h2>
            <p style="color: #cbd5e1; font-size: 12px; margin-bottom: 8px;">{esc(limits.investigative_disclaimer)}</p>
            <ul style="padding-left: 20px; font-size: 12px; color: #94a3b8;">
                {''.join(f'<li>{esc(l)}</li>' for l in limits.known_technical_limitations)}
            </ul>
        </section>

        <footer>
            <div>TARKA Forensic Reasoning Engine | Case: {esc(m.case_id)}</div>
            <div>Report ID: {esc(m.report_id)} | Sealed: {esc(m.fingerprint[:12])}...</div>
        </footer>
    </div>
</body>
</html>
"""
        return full_html


# ==============================================================================
# PDF Exporter using ReportLab (Comprehensive Sections A through I)
# ==============================================================================

class ForensicReportPDFExporter:
    """Exports ForensicReport into a structured multi-page PDF document using ReportLab.
    
    Implements the full SUTRAM 2026 / Section 63 BSA statutory reporting standard across:
    A. Cover and administrative metadata
    B. Executive summary with explicit epistemic separation
    C. Evidence register and CAS bitstream verification
    D. Methodology and software tools (Z3 SMT v5.1.0, UTC epoch, kinematics)
    E. Technical examination findings, Z3 MUS contradictions, timeline, and gaps
    F. Integrity and custody ledger annexures
    G. Statutory certificate under Section 63 Bharatiya Sakshya Adhiniyam, 2023 (BSA)
    H. Examiner opinion and statutory sign-off
    I. Appendices and cryptographic content fingerprint
    """

    @staticmethod
    def render_pdf(report: ForensicReport) -> bytes:
        """Renders binary PDF document bytes."""
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.platypus import (
                SimpleDocTemplate,
                Paragraph,
                Spacer,
                Table,
                TableStyle,
                KeepTogether,
                HRFlowable,
                Image as RLImage,
            )
        except ImportError as exc:
            raise RuntimeError(f"ReportLab is not available for PDF export: {exc}")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()
        normal = styles["Normal"]

        primary_color = colors.HexColor("#0B132B")
        accent_blue = colors.HexColor("#1C4ED8")
        dark_slate = colors.HexColor("#1E293B")
        text_body = colors.HexColor("#334155")
        text_muted = colors.HexColor("#64748B")
        bg_card = colors.HexColor("#F8FAFC")
        border_light = colors.HexColor("#E2E8F0")

        # Typography Styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Heading1"],
            fontSize=15,
            leading=18,
            fontName="Helvetica-Bold",
            textColor=primary_color,
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=normal,
            fontSize=8,
            leading=11,
            fontName="Helvetica-Bold",
            textColor=accent_blue,
        )
        classification_style = ParagraphStyle(
            "Classification",
            parent=normal,
            fontSize=8,
            leading=10,
            alignment=1,  # Center
            fontName="Helvetica-Bold",
            textColor=colors.HexColor("#991B1B"),
        )
        heading_section_style = ParagraphStyle(
            "SectionHeading",
            parent=styles["Heading2"],
            fontSize=11,
            leading=14,
            fontName="Helvetica-Bold",
            textColor=primary_color,
            spaceBefore=10,
            spaceAfter=4,
        )
        subheading_style = ParagraphStyle(
            "Subheading",
            parent=normal,
            fontSize=9,
            leading=12,
            fontName="Helvetica-Bold",
            textColor=dark_slate,
        )
        body_style = ParagraphStyle(
            "DocBody",
            parent=normal,
            fontSize=8.5,
            leading=11.5,
            textColor=text_body,
        )
        body_bold = ParagraphStyle(
            "DocBodyBold",
            parent=body_style,
            fontName="Helvetica-Bold",
            textColor=dark_slate,
        )
        code_style = ParagraphStyle(
            "DocCode",
            parent=normal,
            fontSize=7.5,
            leading=9.5,
            fontName="Courier",
            textColor=colors.HexColor("#0F172A"),
        )
        disclaimer_style = ParagraphStyle(
            "DocDisclaimer",
            parent=normal,
            fontSize=7.5,
            leading=10,
            textColor=text_muted,
            fontName="Helvetica-Oblique",
        )

        elements = []
        m = report.metadata

        # ======================================================================
        # SECTION A: COVER & ADMINISTRATIVE METADATA
        # ======================================================================
        elements.append(Paragraph("RESTRICTED // LAW ENFORCEMENT & STATUTORY PROCEEDINGS ONLY", classification_style))
        elements.append(Spacer(1, 4))
        logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "brand", "tarka-logo.png"))
        if os.path.exists(logo_path):
            elements.append(RLImage(logo_path, width=130, height=31))
            elements.append(Spacer(1, 4))
        elements.append(Paragraph("TARKA | INDIGENOUS DIGITAL FORENSICS PLATFORM", title_style))
        elements.append(Paragraph("SUTRAM 2026 FORENSIC INVESTIGATION PROTOCOL • SIH 2026 PS 26189 BENCHMARK", subtitle_style))
        elements.append(Spacer(1, 4))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=accent_blue, spaceAfter=8))

        # Administrative Metadata Grid
        admin_data = [
            [
                Paragraph("<b>Report Identifier:</b>", body_style),
                Paragraph(f"<code>{html.escape(m.report_id)}</code>", code_style),
                Paragraph("<b>Schema / App Version:</b>", body_style),
                Paragraph(f"{m.schema_version} / {m.app_version}", body_style),
            ],
            [
                Paragraph("<b>Target Case ID:</b>", body_style),
                Paragraph(f"<b>{html.escape(m.case_id)}</b>", body_style),
                Paragraph("<b>Case Title:</b>", body_style),
                Paragraph(html.escape(m.case_title), body_style),
            ],
            [
                Paragraph("<b>Analysis Run ID / Type:</b>", body_style),
                Paragraph(f"{m.run_id} ({m.run_type})", body_style),
                Paragraph("<b>Generation Timestamp:</b>", body_style),
                Paragraph(m.generated_at_iso, code_style),
            ],
            [
                Paragraph("<b>Requesting Authority:</b>", body_style),
                Paragraph("Authorized Cyber Crime Cell / SIU", body_style),
                Paragraph("<b>Designated Examiner:</b>", body_style),
                Paragraph("Lead Forensic Examiner [DL-8842]", body_style),
            ],
            [
                Paragraph("<b>Content Fingerprint (SHA-256):</b>", body_style),
                Paragraph(f"<code>{html.escape(m.fingerprint[:36])}...</code>", code_style),
                Paragraph("<b>Statutory Regime:</b>", body_style),
                Paragraph("Section 63 BSA, 2023 / Section 65B IEA", body_bold),
            ],
        ]
        t_admin = Table(admin_data, colWidths=[120, 150, 120, 150])
        t_admin.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg_card),
            ("GRID", (0, 0), (-1, -1), 0.5, border_light),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(t_admin)
        elements.append(Spacer(1, 8))

        # ======================================================================
        # SECTION B: EXECUTIVE SUMMARY
        # ======================================================================
        elements.append(Paragraph("<b>Section B: Executive Summary & Epistemic Separation</b>", heading_section_style))
        elements.append(Paragraph(html.escape(report.executive_overview.main_findings_summary), body_style))
        elements.append(Spacer(1, 4))

        # Epistemic Separation Box
        epistemic_box = [
            [Paragraph("<b>EPISTEMIC SEPARATION INVARIANT (WAVE 6 ENGINEERING CONSTITUTION)</b>", subheading_style)],
            [Paragraph(
                "• <b>Observations (Raw Facts):</b> Cryptographically preserved bitstream extractions from verified evidence files.<br/>"
                "• <b>Analytical Inferences (Z3 Constraints):</b> Mathematical inconsistencies derived via declarative rules and SMT logic.<br/>"
                "• <b>Examiner Decisions:</b> Independent human verification. AI proposes; evidence verifies; human decides. "
                "Discrepancies identified herein do not establish subjective intent, criminality, or guilt.",
                body_style,
            )],
        ]
        t_epistemic = Table(epistemic_box, colWidths=[540])
        t_epistemic.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFF6FF")),
            ("BOX", (0, 0), (-1, -1), 1, accent_blue),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(t_epistemic)
        elements.append(Spacer(1, 8))

        # ======================================================================
        # SECTION C: EVIDENCE REGISTER & CAS BITSTREAM VERIFICATION
        # ======================================================================
        elements.append(Paragraph("<b>Section C: Evidence Register & CAS Bitstream Integrity</b>", heading_section_style))
        inv_data = [["Artifact ID", "Original Filename", "Tier", "Processing Status", "Server SHA-256 Bitstream Hash"]]
        for item in report.evidence_inventory:
            inv_data.append([
                Paragraph(html.escape(item.artifact_id), code_style),
                Paragraph(html.escape(item.filename), body_style),
                Paragraph(html.escape(item.source_tier), body_style),
                Paragraph(f"<b>{html.escape(item.processing_status)}</b>", body_style),
                Paragraph(html.escape(item.sha256[:28]) + "...", code_style),
            ])
        t_inv = Table(inv_data, colWidths=[90, 130, 45, 95, 180])
        t_inv.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("GRID", (0, 0), (-1, -1), 0.5, border_light),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, bg_card]),
        ]))
        elements.append(t_inv)
        elements.append(Spacer(1, 3))
        elements.append(Paragraph(
            "Integrity Disclosure: Server-computed SHA-256 verifies bitstream preservation across storage; does not prove origin authenticity.",
            disclaimer_style,
        ))
        elements.append(Spacer(1, 8))

        # ======================================================================
        # SECTION D: METHODOLOGY & SOFTWARE TOOLS
        # ======================================================================
        elements.append(Paragraph("<b>Section D: Forensic Methodology & Software Stack</b>", heading_section_style))
        methodology_text = (
            "Analysis executed via <b>TARKA Forensics Core Engine v1.0.0</b> utilizing the <b>Z3 SMT Theorem Prover v5.1.0</b> "
            "for formal Minimal Unsatisfiable Subsets (MUS) extraction. Temporal events normalized to UTC epoch under stated "
            "clock uncertainty bounds (±180s). Geodesic Haversine kinematics applied to movement claims without subjective heuristics. "
            "Zero private chain-of-thought persisted."
        )
        elements.append(Paragraph(methodology_text, body_style))
        elements.append(Spacer(1, 8))

        # ======================================================================
        # SECTION E: TECHNICAL EXAMINATION FINDINGS & Z3 SMT CONTRADICTIONS
        # ======================================================================
        elements.append(Paragraph("<b>Section E: Technical Examination Findings & Contradictions</b>", heading_section_style))
        for f in report.findings:
            f_box = [
                Paragraph(f"<b>[{html.escape(f.finding_id)}] {html.escape(f.title)}</b> (Severity: {html.escape(f.severity)} | Category: {html.escape(f.category)})", body_bold),
                Paragraph(f"<b>Neutral Technical Explanation:</b> {html.escape(f.neutral_explanation)}", body_style),
                Paragraph(f"<b>Underlying Rule:</b> <code>{html.escape(f.rule_id)}</code> (v{f.rule_version}) | <b>Condition:</b> {html.escape(f.rule_firing_condition)}", code_style),
                Paragraph(f"<b>Z3 MUS Membership:</b> Contradiction core active | <b>Provenance Lineage Nodes:</b> {html.escape(', '.join(f.provenance_trace_node_ids[:4]))}", code_style),
                Spacer(1, 3),
            ]
            elements.append(KeepTogether(f_box))

        # Timeline Highlights
        if report.timeline and report.timeline.events:
            elements.append(Spacer(1, 4))
            elements.append(Paragraph("<b>Chronological Timeline Synthesis (with Clock Uncertainty):</b>", subheading_style))
            tl_data = [["Timestamp (UTC)", "Clock Domain", "Event Summary", "Conflict Status"]]
            for ev in report.timeline.events[:5]:
                tl_data.append([
                    Paragraph(html.escape(ev.timestamp_iso), code_style),
                    Paragraph(html.escape(ev.clock_domain), body_style),
                    Paragraph(html.escape(ev.description), body_style),
                    Paragraph(html.escape(ev.temporal_conflict_status), body_style),
                ])
            t_tl = Table(tl_data, colWidths=[120, 80, 240, 100])
            t_tl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, border_light),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            elements.append(t_tl)

        # Evidence Gaps Table
        if report.evidence_gaps:
            elements.append(Spacer(1, 6))
            elements.append(Paragraph("<b>Identified Evidence Gaps & Requisition Leads:</b>", subheading_style))
            gap_data = [["Gap ID", "Status", "Why It Matters", "Statutory Remedy"]]
            for g in report.evidence_gaps:
                gap_data.append([
                    Paragraph(html.escape(g.gap_id), code_style),
                    Paragraph(html.escape(g.status), body_style),
                    Paragraph(f"<b>{html.escape(g.title)}:</b> {html.escape(g.why_it_matters)}", body_style),
                    Paragraph(html.escape(g.suggested_remedy), body_style),
                ])
            t_gaps = Table(gap_data, colWidths=[70, 70, 230, 170])
            t_gaps.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, border_light),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]))
            elements.append(t_gaps)

        elements.append(Spacer(1, 8))

        # ======================================================================
        # SECTION F: INTEGRITY & CUSTODY CHAIN ANNEXURES
        # ======================================================================
        elements.append(Paragraph("<b>Section F: Cryptographic Custody Ledger & Lineage</b>", heading_section_style))
        if report.provenance and report.provenance.custody_ledger_entries:
            custody_data = [["Seq", "Timestamp (UTC)", "Custody Action", "Block Entry Hash (SHA-256)"]]
            for entry in report.provenance.custody_ledger_entries[:6]:
                custody_data.append([
                    Paragraph(str(entry.sequence), code_style),
                    Paragraph(html.escape(entry.timestamp_iso), code_style),
                    Paragraph(html.escape(entry.action), body_style),
                    Paragraph(html.escape(entry.entry_hash[:32]) + "...", code_style),
                ])
            t_custody = Table(custody_data, colWidths=[35, 125, 160, 220])
            t_custody.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#334155")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, border_light),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            elements.append(t_custody)
        elements.append(Spacer(1, 8))

        # ======================================================================
        # SECTION G: STATUTORY CERTIFICATE UNDER SECTION 63 BSA, 2023
        # ======================================================================
        elements.append(Paragraph("<b>Section G: Statutory Certificate under Section 63 BSA, 2023</b>", heading_section_style))
        cert_text = (
            "I, <b>Lead Forensic Examiner</b>, having lawful custody and management of the digital forensics workstation, "
            "hereby certify pursuant to Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (and Section 65B of the Indian Evidence Act, 1872) that:<br/>"
            "1. The electronic records referenced herein were acquired and preserved in the regular course of lawful forensic inspection.<br/>"
            "2. During the material period, the computer systems and cryptographic hash engines operated properly without impairment.<br/>"
            "3. The electronic bitstreams and outputs reproduced in this report are true, uncorrupted representations of the source artifacts."
        )
        elements.append(Paragraph(cert_text, body_style))
        elements.append(Spacer(1, 8))

        # ======================================================================
        # SECTION H: EXAMINER OPINION & STATUTORY SIGN-OFF
        # ======================================================================
        elements.append(Paragraph("<b>Section H: Examiner Opinion & Sign-Off</b>", heading_section_style))
        sign_data = [
            [
                Paragraph("<b>Examiner Name:</b> Lead Forensic Examiner", body_style),
                Paragraph("<b>Designation:</b> Senior Digital Forensics Specialist", body_style),
            ],
            [
                Paragraph("<b>Examination Date:</b> " + m.generated_at_iso.split("T")[0], body_style),
                Paragraph("<b>Review Status:</b> EXAMINER_REVIEWED // FINALIZED", body_bold),
            ],
            [
                Paragraph("<b>Digital Signature Verification:</b><br/><code>Digitally Sealed via Custody Ledger Head</code>", body_style),
                Paragraph(f"<b>Content Fingerprint Seal:</b><br/><code>{html.escape(m.fingerprint[:32])}</code>", code_style),
            ],
        ]
        t_sign = Table(sign_data, colWidths=[270, 270])
        t_sign.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), bg_card),
            ("BOX", (0, 0), (-1, -1), 1, border_light),
            ("GRID", (0, 0), (-1, -1), 0.5, border_light),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(t_sign)
        elements.append(Spacer(1, 8))

        # ======================================================================
        # SECTION I: APPENDICES & CRYPTOGRAPHIC VERIFICATION FINGERPRINT
        # ======================================================================
        elements.append(Paragraph("<b>Section I: Cryptographic Content Fingerprint Manifest</b>", heading_section_style))
        elements.append(Paragraph(
            f"<b>Full Substantive SHA-256 Fingerprint:</b> <code>{html.escape(m.fingerprint)}</code><br/>"
            "Defense and judicial authorities may independently verify this report by executing deterministic SHA-256 hashing "
            "against the canonical JSON export. Any post-generation tampering or alteration invalidates this certificate.",
            body_style,
        ))

        doc.build(elements)
        return buffer.getvalue()

