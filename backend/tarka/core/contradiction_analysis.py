"""TARKA Phase 5C: Contradiction & Evidence-Gap Analysis Engine.

Forensic Principles:
1. Deterministic & Explainable Rules:
   - Contradictions are detected strictly via explicit comparison rules across verified canonical facts,
     cross-source correlations, timeline events, and provenance relationships.
   - Zero LLM-hallucinated or probabilistic findings.
2. Epistemic Humility & Non-Accusatory Posture:
   - Never conclude that a person committed fraud merely because records disagree.
   - Clearly designate asserted claims versus verified source-record values.
3. Rigorous Evidence Gap Semantics:
   - Distinguishes NOT_DETECTED, UNREADABLE, NOT_PROVIDED, PROCESSING_FAILED, REVIEW_REQUIRED,
     CONFIRMED_ABSENT, and RESOLVED.
   - Strictly NEVER infers CONFIRMED_ABSENT from a failed search, missing upload, empty OCR result,
     or unavailable source.
4. Counterfactual Sensitivity:
   - Excluding challenged artifacts deactivates dependent findings with an explanatory reason
     (STATUS: INACTIVE, "Derived from excluded artifact ART-XXX"), while independent facts survive.
5. Graph & Audit Integration:
   - Augments the Investigation Graph with CONTRADICTION, EVIDENCE_GAP, and REVIEW_REQUIRED nodes,
     preserving complete provenance links and custody audit history.
"""

from __future__ import annotations

import copy
import datetime
import hashlib
import json
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from pydantic import BaseModel, Field

from tarka.parsers.base import PARSER_VERSIONS, NORMALIZATION_VERSIONS
from tarka.core.canonical_fact import (
    CanonicalFact,
    CanonicalFactKind,
    get_verified_utc_epoch,
    is_valid_fact_timestamp,
)
from tarka.core.evidence_dna import Artifact
from tarka.core.analysis_run import AnalysisRun
from tarka.core.cross_source_correlation import (
    normalize_amount,
    normalize_rrn,
    normalize_vpa,
    normalize_phone,
)
from tarka.core.timeline_reconstruction import (
    ForensicTimeline,
    ForensicTimelineEvent,
    TimelineEventType,
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


# -----------------------------------------------------------------------------
# Enums
# -----------------------------------------------------------------------------

class ContradictionCategory(str, Enum):
    """Categorical classification of forensic contradictions."""
    AMOUNT_DISCREPANCY = "AMOUNT_DISCREPANCY"
    TIMESTAMP_CONFLICT = "TIMESTAMP_CONFLICT"
    IDENTIFIER_CONFLICT = "IDENTIFIER_CONFLICT"
    STATUS_CONFLICT = "STATUS_CONFLICT"
    CLAIM_VS_RECORD = "CLAIM_VS_RECORD"


class FindingSeverity(str, Enum):
    """Forensic severity weighting based on investigative impact."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFORMATIONAL = "INFORMATIONAL"


class FindingStatus(str, Enum):
    """Status of a finding under active counterfactual analysis."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    RESOLVED = "RESOLVED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"


class EvidenceGapStatus(str, Enum):
    """Rigorous epistemic presence state for evidence gaps."""
    NOT_DETECTED = "NOT_DETECTED"          # Extraction process did not detect the expected information
    UNREADABLE = "UNREADABLE"              # Content appears present but cannot be reliably read
    NOT_PROVIDED = "NOT_PROVIDED"          # Relevant source container was not supplied
    PROCESSING_FAILED = "PROCESSING_FAILED"# Extraction or rendering encountered an error
    REVIEW_REQUIRED = "REVIEW_REQUIRED"    # Ambiguity requires authorized human examiner review
    CONFIRMED_ABSENT = "CONFIRMED_ABSENT"  # Examiner explicitly verified and confirmed absence within defined scope
    RESOLVED = "RESOLVED"                  # Gap addressed with traceable evidence or documented decision


class EvidenceGapCategory(str, Enum):
    """Classification of forensic evidence gaps."""
    MISSING_CORRESPONDING_RECORD = "MISSING_CORRESPONDING_RECORD"
    UNAVAILABLE_IDENTIFIER = "UNAVAILABLE_IDENTIFIER"
    UNRELIABLE_TIMESTAMP = "UNRELIABLE_TIMESTAMP"
    UNVERIFIED_CLAIM = "UNVERIFIED_CLAIM"
    UNPROCESSED_DOCUMENT_PAGES = "UNPROCESSED_DOCUMENT_PAGES"
    UNRESOLVED_OCR_REVIEW = "UNRESOLVED_OCR_REVIEW"
    DEPENDS_ON_EXCLUDED_ARTIFACT = "DEPENDS_ON_EXCLUDED_ARTIFACT"
    MISSING_SOURCE_CATEGORY = "MISSING_SOURCE_CATEGORY"


# -----------------------------------------------------------------------------
# Data Models
# -----------------------------------------------------------------------------

class ContradictionFinding(BaseModel):
    """A deterministic, explainable forensic contradiction between evidence records."""
    finding_id: str = Field(description="Unique stable finding ID, e.g. CONTRA-AMT-202602148891")
    rule_id: str = Field(description="Deterministic rule identifier that triggered the finding")
    rule_version: str = Field(default="1.0.0", description="Semver rule version")
    category: ContradictionCategory = Field(description="Categorical contradiction classification")
    severity: FindingSeverity = Field(description="Finding severity level")
    title: str = Field(description="Concise descriptive title of the contradiction")
    explanation: str = Field(description="Human-readable forensic explanation adhering to non-accusatory language")
    supporting_fact_ids: List[str] = Field(default_factory=list, description="IDs of canonical facts in contradiction")
    source_artifact_ids: List[str] = Field(default_factory=list, description="IDs of source artifacts involved")
    original_values: Dict[str, Any] = Field(
        default_factory=dict,
        description="Verbatim original unnormalized values mapped by source/fact",
    )
    normalized_values: Dict[str, Any] = Field(
        default_factory=dict,
        description="Normalized values used for mathematical or logical comparison",
    )
    provenance_references: List[str] = Field(
        default_factory=list,
        description="Audit provenance links connecting back to source bytes",
    )
    counterfactual_dependencies: List[str] = Field(
        default_factory=list,
        description="Artifact IDs upon which this finding depends; excluding any deactivates this finding",
    )
    status: str = Field(default="ACTIVE", description="ACTIVE, INACTIVE, RESOLVED, or REVIEW_REQUIRED")
    inactive_reason: Optional[str] = Field(
        default=None,
        description="Explanation if finding is deactivated during counterfactual analysis",
    )
    rule_firing_reason: str = Field(description="Exact condition and parameters that caused the rule to evaluate true")
    uncertainties_and_limitations: str = Field(description="Forensic boundary conditions and remaining uncertainties")
    review_state: str = Field(default="UNREVIEWED", description="UNREVIEWED, VERIFIED, FLAGGED, or RESOLVED")
    reviewed_by: Optional[str] = Field(default=None, description="Investigator ID if reviewed")
    review_notes: Optional[str] = Field(default=None, description="Investigator notes and rationale")
    reviewed_at_iso: Optional[str] = Field(default=None, description="ISO-8601 timestamp of review")

    def to_graph_node(self) -> InvestigationNode:
        """Converts contradiction finding to an InvestigationNode for graph visualization."""
        node_status = ForensicNodeStatus.CONTRADICTION.value
        if self.status == FindingStatus.INACTIVE.value:
            node_status = ForensicNodeStatus.INACTIVE.value

        return InvestigationNode(
            node_id=f"find:contra:{self.finding_id}",
            node_type=ForensicNodeType.CONTRADICTION,
            label=f"Contradiction: {self.title[:30]}",
            title=self.title,
            subtitle=f"{self.category.value} · {self.severity.value}",
            description=self.explanation,
            source_artifact_ids=self.source_artifact_ids,
            provenance_ids=self.provenance_references,
            status=node_status,
            inactive_reason=self.inactive_reason,
            rule_id=self.rule_id,
            metadata={
                "finding_id": self.finding_id,
                "category": self.category.value,
                "severity": self.severity.value,
                "rule_id": self.rule_id,
                "rule_version": self.rule_version,
                "original_values": self.original_values,
                "normalized_values": self.normalized_values,
                "rule_firing_reason": self.rule_firing_reason,
                "uncertainties": self.uncertainties_and_limitations,
                "review_state": self.review_state,
            },
        )


class ForensicEvidenceGap(BaseModel):
    """An identified forensic evidence gap or missing investigative corroboration."""
    gap_id: str = Field(description="Unique stable gap ID, e.g. GAP-MISSING-TXN-202602147777")
    category: EvidenceGapCategory = Field(description="Categorical evidence gap type")
    status: EvidenceGapStatus = Field(description="Rigorous epistemic presence state")
    title: str = Field(description="Concise description of the missing evidence")
    why_it_matters: str = Field(description="Forensic rationale explaining why this gap impacts the investigation")
    exposed_by_rule_id: str = Field(description="Deterministic rule or investigative question exposing this gap")
    relevant_fact_ids: List[str] = Field(default_factory=list, description="Associated fact IDs asserting or referencing the gap")
    relevant_event_ids: List[str] = Field(default_factory=list, description="Timeline event IDs affected by this gap")
    relevant_artifact_ids: List[str] = Field(default_factory=list, description="Source artifact IDs linked to this gap")
    missing_evidence_description: str = Field(description="Specific records or data elements required for resolution")
    suggested_remedy: str = Field(description="Actionable forensic recommendation to obtain or inspect missing records")
    is_mandatory_for_resolution: bool = Field(default=True, description="True if resolving this gap is strictly required")
    provenance_ids: List[str] = Field(default_factory=list, description="Audit provenance identifiers")
    counterfactual_dependencies: List[str] = Field(
        default_factory=list,
        description="Artifact IDs this gap depends on; if excluded, gap updates or becomes inactive",
    )
    active_status: str = Field(default="ACTIVE", description="ACTIVE or INACTIVE")
    inactive_reason: Optional[str] = Field(default=None, description="Explanation if deactivated in counterfactual run")
    review_decision: Optional[str] = Field(default=None, description="CONFIRMED_ABSENT, RESOLVED, MARK_UNREADABLE, or REOPEN")
    reviewed_by: Optional[str] = Field(default=None, description="Investigator ID who conducted review")
    review_notes: Optional[str] = Field(default=None, description="Examiner justification and findings")
    reviewed_at_iso: Optional[str] = Field(default=None, description="Timestamp of review")
    review_scope: Optional[str] = Field(
        default=None,
        description="Mandatory defined scope of examination if CONFIRMED_ABSENT was authorized",
    )

    def to_graph_node(self) -> InvestigationNode:
        """Converts evidence gap to an InvestigationNode for graph visualization."""
        node_status = ForensicNodeStatus.REVIEW_REQUIRED.value
        if self.active_status == "INACTIVE":
            node_status = ForensicNodeStatus.INACTIVE.value
        elif self.status == EvidenceGapStatus.RESOLVED:
            node_status = ForensicNodeStatus.ACTIVE.value

        return InvestigationNode(
            node_id=f"find:gap:{self.gap_id}",
            node_type=ForensicNodeType.EVIDENCE_GAP,
            label=f"Gap: {self.title[:30]}",
            title=self.title,
            subtitle=f"{self.category.value} · {self.status.value}",
            description=self.why_it_matters,
            source_artifact_ids=self.relevant_artifact_ids,
            provenance_ids=self.provenance_ids,
            status=node_status,
            inactive_reason=self.inactive_reason,
            rule_id=self.exposed_by_rule_id,
            metadata={
                "gap_id": self.gap_id,
                "category": self.category.value,
                "status": self.status.value,
                "why_it_matters": self.why_it_matters,
                "suggested_remedy": self.suggested_remedy,
                "is_mandatory": self.is_mandatory_for_resolution,
                "review_decision": self.review_decision,
                "reviewed_by": self.reviewed_by,
                "review_scope": self.review_scope,
            },
        )


class CaseForensicAnalysis(BaseModel):
    """Complete case contradiction and evidence gap analysis report."""
    case_id: str
    run_id: Optional[str] = None
    total_contradictions: int
    active_contradictions_count: int
    inactive_contradictions_count: int
    total_gaps: int
    active_gaps_count: int
    review_required_count: int
    resolved_count: int
    contradictions: List[ContradictionFinding] = Field(default_factory=list)
    evidence_gaps: List[ForensicEvidenceGap] = Field(default_factory=list)
    uncertainties: List[str] = Field(default_factory=list)
    informational_observations: List[str] = Field(default_factory=list)
    fingerprint: str = Field(description="Deterministic SHA-256 digest of findings and gaps")
    recipe_fingerprint: Optional[str] = Field(default=None, description="Deterministic SHA-256 input and configuration recipe digest")
    result_fingerprint: Optional[str] = Field(default=None, description="Deterministic SHA-256 substantive output findings digest")


# -----------------------------------------------------------------------------
# Deterministic Contradiction & Evidence-Gap Analysis Engine
# -----------------------------------------------------------------------------

class ContradictionAnalysisEngine:
    """Deterministic, explainable forensic engine analyzing cross-source contradictions and evidence gaps."""

    CONTRADICTION_RULE_VERSIONS: Dict[str, str] = {
        "RULE_CONTRA_AMOUNT_DISCREPANCY": "1.0.0",
        "RULE_CONTRA_STATUS_CONFLICT": "1.0.0",
        "RULE_CONTRA_TIMESTAMP_CONFLICT": "1.0.0",
        "RULE_CONTRA_IDENTIFIER_CONFLICT": "1.0.0",
    }
    PARSER_VERSIONS = copy.deepcopy(PARSER_VERSIONS)
    NORMALIZATION_VERSIONS = copy.deepcopy(NORMALIZATION_VERSIONS)

    def __init__(
        self,
        clock_drift_tolerance_seconds: float = 300.0,
        amount_tolerance: float = 0.01,
    ) -> None:
        self.clock_drift_tolerance_seconds = clock_drift_tolerance_seconds
        self.amount_tolerance = amount_tolerance
        self.CONTRADICTION_RULE_VERSIONS = copy.deepcopy(self.CONTRADICTION_RULE_VERSIONS)
        self.PARSER_VERSIONS = copy.deepcopy(self.PARSER_VERSIONS)
        self.NORMALIZATION_VERSIONS = copy.deepcopy(self.NORMALIZATION_VERSIONS)

    # -------------------------------------------------------------------------
    # 1. Contradiction Detection
    # -------------------------------------------------------------------------

    def detect_contradictions(
        self,
        facts: List[CanonicalFact],
        artifacts: List[Artifact],
        timeline: Optional[ForensicTimeline] = None,
        excluded_artifact_ids: Set[str] = set(),
    ) -> List[ContradictionFinding]:
        """Detects contradictions across facts and timeline events using strict comparison rules."""
        findings: List[ContradictionFinding] = []
        artifacts_map = {a.artifact_id: a for a in artifacts}

        # Index facts by normalized RRN
        rrn_to_facts: Dict[str, List[CanonicalFact]] = {}
        for f in facts:
            rrn = normalize_rrn(f.identifiers.get("rrn"))
            if rrn:
                rrn_to_facts.setdefault(rrn, []).append(f)

        # ---------------------------------------------------------------------
        # Rule 1: Amount Discrepancy under Shared RRN (RULE_CONTRA_AMOUNT_DISCREPANCY)
        # ---------------------------------------------------------------------
        for rrn, fact_list in sorted(rrn_to_facts.items(), key=lambda x: x[0]):
            if len(fact_list) < 2:
                continue

            # Compare pairwise
            for i in range(len(fact_list)):
                for j in range(i + 1, len(fact_list)):
                    f1 = fact_list[i]
                    f2 = fact_list[j]

                    amt1, curr1, raw1 = normalize_amount(f1.amount)
                    amt2, curr2, raw2 = normalize_amount(f2.amount)

                    # Only compare if both amounts are present and numeric
                    if amt1 is not None and amt2 is not None:
                        delta = abs(amt1 - amt2)
                        if delta > self.amount_tolerance:
                            art1 = artifacts_map.get(f1.artifact_id)
                            art2 = artifacts_map.get(f2.artifact_id)
                            src1_name = f1.source_filename or (art1.filename if art1 else f1.artifact_id)
                            src2_name = f2.source_filename or (art2.filename if art2 else f2.artifact_id)

                            is_claim_1 = (
                                f1.kind in [CanonicalFactKind.MEDIA_METADATA, CanonicalFactKind.EXTRACTED_IDENTIFIER]
                                or "screenshot" in src1_name.lower()
                                or "claim" in src1_name.lower()
                            )
                            is_claim_2 = (
                                f2.kind in [CanonicalFactKind.MEDIA_METADATA, CanonicalFactKind.EXTRACTED_IDENTIFIER]
                                or "screenshot" in src2_name.lower()
                                or "claim" in src2_name.lower()
                            )

                            category = (
                                ContradictionCategory.CLAIM_VS_RECORD
                                if (is_claim_1 != is_claim_2)
                                else ContradictionCategory.AMOUNT_DISCREPANCY
                            )

                            finding_id = f"CONTRA-AMT-{rrn}-{f1.fact_id}-{f2.fact_id}"
                            deps = list({f1.artifact_id, f2.artifact_id})
                            is_inactive = bool(set(deps) & excluded_artifact_ids)
                            inactive_reason = (
                                f"Deactivated because dependent artifact(s) "
                                f"{', '.join(sorted(set(deps) & excluded_artifact_ids))} were excluded in challenge run"
                                if is_inactive
                                else None
                            )

                            expl = (
                                f"Under shared transaction reference RRN {rrn}, {src1_name} ({f1.kind.value}) records "
                                f"₹{amt1:,.2f}, whereas {src2_name} ({f2.kind.value}) reports ₹{amt2:,.2f}. "
                                f"Discrepancy delta: ₹{delta:,.2f}."
                            )

                            firing_reason = (
                                f"Matched shared transaction reference RRN='{rrn}'. "
                                f"Amounts differ: ₹{amt1:,.2f} vs ₹{amt2:,.2f} (|delta| = ₹{delta:,.2f} > {self.amount_tolerance:.2f})."
                            )

                            uncertainties = (
                                "Discrepancy indicates conflicting reporting between sources. It does not establish fraud, "
                                "unauthorized manipulation, or criminal intent without independent device and transmission audits."
                            )

                            findings.append(
                                ContradictionFinding(
                                    finding_id=finding_id,
                                    rule_id="RULE_CONTRA_AMOUNT_DISCREPANCY",
                                    rule_version="1.0.0",
                                    category=category,
                                    severity=FindingSeverity.CRITICAL if delta >= 1000.0 else FindingSeverity.HIGH,
                                    title=f"Amount Discrepancy under RRN {rrn}",
                                    explanation=expl,
                                    supporting_fact_ids=[f1.fact_id, f2.fact_id],
                                    source_artifact_ids=deps,
                                    original_values={
                                        src1_name: raw1 or str(f1.amount),
                                        src2_name: raw2 or str(f2.amount),
                                    },
                                    normalized_values={
                                        src1_name: amt1,
                                        src2_name: amt2,
                                    },
                                    provenance_references=[f1.artifact_id, f2.artifact_id, f1.fact_id, f2.fact_id],
                                    counterfactual_dependencies=deps,
                                    status=FindingStatus.INACTIVE.value if is_inactive else FindingStatus.ACTIVE.value,
                                    inactive_reason=inactive_reason,
                                    rule_firing_reason=firing_reason,
                                    uncertainties_and_limitations=uncertainties,
                                )
                            )

        # ---------------------------------------------------------------------
        # Rule 2: Status Conflict under Shared Reference (RULE_CONTRA_STATUS_CONFLICT)
        # ---------------------------------------------------------------------
        for rrn, fact_list in sorted(rrn_to_facts.items(), key=lambda x: x[0]):
            if len(fact_list) < 2:
                continue

            for i in range(len(fact_list)):
                for j in range(i + 1, len(fact_list)):
                    f1 = fact_list[i]
                    f2 = fact_list[j]

                    status1 = (f1.identifiers.get("status") or "").upper()
                    status2 = (f2.identifiers.get("status") or "").upper()

                    # Look for explicit contradictory statuses (e.g. SUCCESS vs FAILED)
                    has_conflict = (
                        ("SUCCESS" in status1 and any(s in status2 for s in ["FAIL", "DECLINED", "REJECTED"]))
                        or ("SUCCESS" in status2 and any(s in status1 for s in ["FAIL", "DECLINED", "REJECTED"]))
                    )

                    if has_conflict:
                        art1 = artifacts_map.get(f1.artifact_id)
                        art2 = artifacts_map.get(f2.artifact_id)
                        src1_name = f1.source_filename or (art1.filename if art1 else f1.artifact_id)
                        src2_name = f2.source_filename or (art2.filename if art2 else f2.artifact_id)

                        finding_id = f"CONTRA-STAT-{rrn}-{f1.fact_id}-{f2.fact_id}"
                        deps = list({f1.artifact_id, f2.artifact_id})
                        is_inactive = bool(set(deps) & excluded_artifact_ids)

                        findings.append(
                            ContradictionFinding(
                                finding_id=finding_id,
                                rule_id="RULE_CONTRA_STATUS_CONFLICT",
                                rule_version="1.0.0",
                                category=ContradictionCategory.STATUS_CONFLICT,
                                severity=FindingSeverity.CRITICAL,
                                title=f"Transaction Status Conflict under RRN {rrn}",
                                explanation=(
                                    f"Contradictory transaction statuses reported for RRN {rrn}: "
                                    f"{src1_name} reports status '{status1}', whereas {src2_name} reports status '{status2}'."
                                ),
                                supporting_fact_ids=[f1.fact_id, f2.fact_id],
                                source_artifact_ids=deps,
                                original_values={src1_name: status1, src2_name: status2},
                                normalized_values={src1_name: status1, src2_name: status2},
                                provenance_references=[f1.artifact_id, f2.artifact_id, f1.fact_id, f2.fact_id],
                                counterfactual_dependencies=deps,
                                status=FindingStatus.INACTIVE.value if is_inactive else FindingStatus.ACTIVE.value,
                                inactive_reason="Deactivated in counterfactual run" if is_inactive else None,
                                rule_firing_reason=f"Status mismatch for RRN={rrn}: '{status1}' vs '{status2}'",
                                uncertainties_and_limitations="Requires gateway settlement logs to confirm terminal state.",
                            )
                        )

        # ---------------------------------------------------------------------
        # Rule 3: Timestamp Inversion / Causal Sequence Conflict (RULE_CONTRA_TIMESTAMP_CONFLICT)
        # ---------------------------------------------------------------------
        for rrn, fact_list in sorted(rrn_to_facts.items(), key=lambda x: x[0]):
            if len(fact_list) < 2:
                continue

            for i in range(len(fact_list)):
                for j in range(i + 1, len(fact_list)):
                    f1 = fact_list[i]
                    f2 = fact_list[j]

                    t1 = get_verified_utc_epoch(f1)
                    t2 = get_verified_utc_epoch(f2)

                    if t1 is not None and t2 is not None:
                        # Causal inversion: Bank payment completed BEFORE chat requested it
                        is_inversion = False
                        f_req, f_comp = None, None
                        if f1.kind == CanonicalFactKind.BANK_TRANSACTION and f2.kind in [CanonicalFactKind.PAYMENT_REQUEST, CanonicalFactKind.CHAT_MESSAGE]:
                            if t1 < t2:
                                is_inversion = True
                                f_comp, f_req = f1, f2
                        elif f2.kind == CanonicalFactKind.BANK_TRANSACTION and f1.kind in [CanonicalFactKind.PAYMENT_REQUEST, CanonicalFactKind.CHAT_MESSAGE]:
                            if t2 < t1:
                                is_inversion = True
                                f_comp, f_req = f2, f1

                        if is_inversion and f_comp and f_req:
                            delta_sec = abs((f_comp.time_provenance.utc_epoch or 0) - (f_req.time_provenance.utc_epoch or 0))
                            finding_id = f"CONTRA-TIME-CAUSAL-{rrn}"
                            deps = list({f_comp.artifact_id, f_req.artifact_id})
                            is_inactive = bool(set(deps) & excluded_artifact_ids)

                            findings.append(
                                ContradictionFinding(
                                    finding_id=finding_id,
                                    rule_id="RULE_CONTRA_TIMESTAMP_CONFLICT",
                                    rule_version="1.0.0",
                                    category=ContradictionCategory.TIMESTAMP_CONFLICT,
                                    severity=FindingSeverity.HIGH,
                                    title=f"Causal Sequence Inversion under RRN {rrn}",
                                    explanation=(
                                        f"Temporal inversion detected under RRN {rrn}: Bank transaction {f_comp.fact_id} "
                                        f"recorded completion at {f_comp.time_provenance.utc_iso}, which chronologically "
                                        f"precedes the payment request {f_req.fact_id} recorded at {f_req.time_provenance.utc_iso} "
                                        f"(Inversion delta: {int(delta_sec)}s)."
                                    ),
                                    supporting_fact_ids=[f_comp.fact_id, f_req.fact_id],
                                    source_artifact_ids=deps,
                                    original_values={
                                        f_comp.source_filename: f_comp.time_provenance.recorded_time,
                                        f_req.source_filename: f_req.time_provenance.recorded_time,
                                    },
                                    normalized_values={
                                        f_comp.source_filename: f_comp.time_provenance.utc_iso,
                                        f_req.source_filename: f_req.time_provenance.utc_iso,
                                    },
                                    provenance_references=[f_comp.artifact_id, f_req.artifact_id, f_comp.fact_id, f_req.fact_id],
                                    counterfactual_dependencies=deps,
                                    status=FindingStatus.INACTIVE.value if is_inactive else FindingStatus.ACTIVE.value,
                                    inactive_reason="Deactivated in counterfactual challenge run" if is_inactive else None,
                                    rule_firing_reason=f"Payment completed timestamp < request timestamp for RRN={rrn}",
                                    uncertainties_and_limitations="Requires verification of handset local clock drift versus server ledger.",
                                )
                            )

        # ---------------------------------------------------------------------
        # Rule 4: Identifier Conflict (RULE_CONTRA_IDENTIFIER_CONFLICT)
        # ---------------------------------------------------------------------
        for rrn, fact_list in sorted(rrn_to_facts.items(), key=lambda x: x[0]):
            if len(fact_list) < 2:
                continue

            for i in range(len(fact_list)):
                for j in range(i + 1, len(fact_list)):
                    f1 = fact_list[i]
                    f2 = fact_list[j]

                    vpa1 = normalize_vpa(f1.identifiers.get("vpa"))
                    vpa2 = normalize_vpa(f2.identifiers.get("vpa"))

                    if vpa1 and vpa2 and vpa1 != vpa2:
                        finding_id = f"CONTRA-IDENT-VPA-{rrn}"
                        deps = list({f1.artifact_id, f2.artifact_id})
                        is_inactive = bool(set(deps) & excluded_artifact_ids)

                        findings.append(
                            ContradictionFinding(
                                finding_id=finding_id,
                                rule_id="RULE_CONTRA_IDENTIFIER_CONFLICT",
                                rule_version="1.0.0",
                                category=ContradictionCategory.IDENTIFIER_CONFLICT,
                                severity=FindingSeverity.HIGH,
                                title=f"Conflicting VPA Payee under RRN {rrn}",
                                explanation=(
                                    f"Conflicting payee VPA identifiers recorded for transaction reference RRN {rrn}: "
                                    f"{f1.source_filename} specifies '{vpa1}', whereas {f2.source_filename} specifies '{vpa2}'."
                                ),
                                supporting_fact_ids=[f1.fact_id, f2.fact_id],
                                source_artifact_ids=deps,
                                original_values={
                                    f1.source_filename: f1.identifiers.get("vpa"),
                                    f2.source_filename: f2.identifiers.get("vpa"),
                                },
                                normalized_values={
                                    f1.source_filename: vpa1,
                                    f2.source_filename: vpa2,
                                },
                                provenance_references=[f1.artifact_id, f2.artifact_id, f1.fact_id, f2.fact_id],
                                counterfactual_dependencies=deps,
                                status=FindingStatus.INACTIVE.value if is_inactive else FindingStatus.ACTIVE.value,
                                inactive_reason="Deactivated in counterfactual challenge run" if is_inactive else None,
                                rule_firing_reason=f"VPA mismatch under same RRN {rrn}: '{vpa1}' != '{vpa2}'",
                                uncertainties_and_limitations="Requires NPCI switch logs to verify routed VPA.",
                            )
                        )

        return findings

    # -------------------------------------------------------------------------
    # 2. Evidence Gap Detection
    # -------------------------------------------------------------------------

    def detect_evidence_gaps(
        self,
        facts: List[CanonicalFact],
        artifacts: List[Artifact],
        timeline: Optional[ForensicTimeline] = None,
        excluded_artifact_ids: Set[str] = set(),
    ) -> List[ForensicEvidenceGap]:
        """Identifies missing evidence, uncorroborated claims, and unreviewed fields."""
        gaps: List[ForensicEvidenceGap] = []
        artifacts_map = {a.artifact_id: a for a in artifacts}

        # Collect all bank transaction RRNs
        bank_rrns = set()
        for f in facts:
            if f.kind == CanonicalFactKind.BANK_TRANSACTION:
                r = normalize_rrn(f.identifiers.get("rrn"))
                if r:
                    bank_rrns.add(r)

        # ---------------------------------------------------------------------
        # Gap Rule 1: Uncorroborated Payment Claim / Missing Bank Entry
        # ---------------------------------------------------------------------
        for f in facts:
            # If claim or payment request asserts an RRN that has no bank statement match
            claim_rrn = normalize_rrn(f.identifiers.get("rrn"))
            is_claim_or_gap = (
                getattr(f, "is_evidence_gap", False)
                or f.kind == CanonicalFactKind.EXTRACTED_IDENTIFIER
                or ("unverified" in (f.source_filename or "").lower())
                or (claim_rrn and claim_rrn not in bank_rrns and f.kind != CanonicalFactKind.BANK_TRANSACTION)
            )

            if is_claim_or_gap and claim_rrn and claim_rrn not in bank_rrns:
                amt, curr, _ = normalize_amount(f.amount)
                amt_str = f" of ₹{amt:,.2f}" if amt is not None else ""
                gap_id = f"GAP-MISSING-BANK-TXN-{claim_rrn}"
                is_inactive = f.artifact_id in excluded_artifact_ids

                existing_gap = next((g for g in gaps if g.gap_id == gap_id), None)
                if existing_gap:
                    if f.fact_id not in existing_gap.relevant_fact_ids:
                        existing_gap.relevant_fact_ids.append(f.fact_id)
                    if f.artifact_id not in existing_gap.relevant_artifact_ids:
                        existing_gap.relevant_artifact_ids.append(f.artifact_id)
                    if f.artifact_id not in existing_gap.provenance_ids:
                        existing_gap.provenance_ids.append(f.artifact_id)
                    if f.fact_id not in existing_gap.provenance_ids:
                        existing_gap.provenance_ids.append(f.fact_id)
                    if f.artifact_id not in existing_gap.counterfactual_dependencies:
                        existing_gap.counterfactual_dependencies.append(f.artifact_id)
                    continue

                gaps.append(
                    ForensicEvidenceGap(
                        gap_id=gap_id,
                        category=EvidenceGapCategory.MISSING_CORRESPONDING_RECORD,
                        status=EvidenceGapStatus.NOT_PROVIDED,
                        title=f"Uncorroborated Payment Claim for RRN {claim_rrn}",
                        why_it_matters=(
                            f"An asserted payment claim{amt_str} references banking reference RRN {claim_rrn}, "
                            f"but search across all supplied bank statements produced zero matching debit records."
                        ),
                        exposed_by_rule_id="RULE_EVIDENCE_GAP_MISSING_TXN",
                        relevant_fact_ids=[f.fact_id],
                        relevant_artifact_ids=[f.artifact_id],
                        missing_evidence_description=f"Official bank statement transaction record corresponding to RRN {claim_rrn}",
                        suggested_remedy=(
                            "Issue evidentiary request for complete originating/receiving bank statements "
                            "covering the transaction timeframe."
                        ),
                        is_mandatory_for_resolution=True,
                        provenance_ids=[f.artifact_id, f.fact_id],
                        counterfactual_dependencies=[f.artifact_id],
                        active_status="INACTIVE" if is_inactive else "ACTIVE",
                        inactive_reason=(
                            f"Derived from excluded artifact {f.artifact_id}" if is_inactive else None
                        ),
                    )
                )

        # ---------------------------------------------------------------------
        # Gap Rule 2: Unavailable / Unreadable Identifier (RRN missing on payment)
        # ---------------------------------------------------------------------
        for f in facts:
            if f.kind in [CanonicalFactKind.BANK_TRANSACTION, CanonicalFactKind.PAYMENT_REQUEST] or f.amount is not None:
                rrn = normalize_rrn(f.identifiers.get("rrn"))
                if not rrn:
                    gap_id = f"GAP-UNAVAIL-RRN-{f.fact_id}"
                    is_inactive = f.artifact_id in excluded_artifact_ids

                    gaps.append(
                        ForensicEvidenceGap(
                            gap_id=gap_id,
                            category=EvidenceGapCategory.UNAVAILABLE_IDENTIFIER,
                            status=EvidenceGapStatus.NOT_DETECTED,
                            title=f"Missing Transaction Reference on Debit {f.fact_id}",
                            why_it_matters="Bank debit record lacks an explicit RRN / UTR, preventing deterministic cross-source linkage.",
                            exposed_by_rule_id="RULE_GAP_UNAVAILABLE_RRN",
                            relevant_fact_ids=[f.fact_id],
                            relevant_artifact_ids=[f.artifact_id],
                            missing_evidence_description="Core banking transaction reference number (RRN/UTR)",
                            suggested_remedy="Request unmasked bank ledger statement with full transaction metadata.",
                            is_mandatory_for_resolution=False,
                            provenance_ids=[f.artifact_id, f.fact_id],
                            counterfactual_dependencies=[f.artifact_id],
                            active_status="INACTIVE" if is_inactive else "ACTIVE",
                        )
                    )

        # ---------------------------------------------------------------------
        # Gap Rule 3: Unreliable / Inferred Timestamp
        # ---------------------------------------------------------------------
        if timeline:
            for evt in timeline.events:
                if evt.is_timestamp_inferred or evt.temporal_priority == 4:
                    gap_id = f"GAP-INFERRED-TIME-{evt.id}"
                    is_inactive = evt.status == "INACTIVE"

                    gaps.append(
                        ForensicEvidenceGap(
                            gap_id=gap_id,
                            category=EvidenceGapCategory.UNRELIABLE_TIMESTAMP,
                            status=EvidenceGapStatus.REVIEW_REQUIRED,
                            title=f"Inferred Timestamp on Timeline Event {evt.id}",
                            why_it_matters=(
                                f"Event '{evt.title}' lacks an explicit file-clock or switch timestamp; "
                                f"its chronological position relies on contextual constraints."
                            ),
                            exposed_by_rule_id="RULE_GAP_INFERRED_TIMESTAMP",
                            relevant_fact_ids=evt.supporting_fact_ids,
                            relevant_event_ids=[evt.id],
                            relevant_artifact_ids=evt.source_artifact_ids,
                            missing_evidence_description="Verified timestamp from system log, network switch, or file clock",
                            suggested_remedy="Inspect carrier switch CDR or source file metadata to anchor timestamp.",
                            is_mandatory_for_resolution=False,
                            provenance_ids=evt.provenance_links,
                            counterfactual_dependencies=evt.source_artifact_ids,
                            active_status="INACTIVE" if is_inactive else "ACTIVE",
                        )
                    )

        # ---------------------------------------------------------------------
        # Gap Rule 4: Unprocessed / Failed Document Pages
        # ---------------------------------------------------------------------
        for art in artifacts:
            # Check metadata or coverage
            failed_pages = 0
            if hasattr(art, "metadata") and art.metadata:
                cov = art.metadata.get("coverage")
                if isinstance(cov, dict):
                    failed_pages = cov.get("failed_pages", 0)
                elif "failed_pages" in art.metadata:
                    fp = art.metadata.get("failed_pages")
                    if isinstance(fp, list):
                        failed_pages = len(fp)
                    elif isinstance(fp, (int, float)):
                        failed_pages = int(fp)

            if failed_pages > 0:
                gap_id = f"GAP-UNPROCESSED-PAGES-{art.artifact_id}"
                is_inactive = art.artifact_id in excluded_artifact_ids

                gaps.append(
                    ForensicEvidenceGap(
                        gap_id=gap_id,
                        category=EvidenceGapCategory.UNPROCESSED_DOCUMENT_PAGES,
                        status=EvidenceGapStatus.PROCESSING_FAILED,
                        title=f"Failed Document Processing on {art.filename}",
                        why_it_matters=f"{failed_pages} page(s) failed text/OCR processing, leaving potential evidence unexamined.",
                        exposed_by_rule_id="RULE_GAP_UNPROCESSED_PAGES",
                        relevant_artifact_ids=[art.artifact_id],
                        missing_evidence_description=f"OCR or extracted text from failed page(s) of {art.filename}",
                        suggested_remedy="Re-render failed PDF pages at higher resolution and re-run OCR engine.",
                        is_mandatory_for_resolution=True,
                        provenance_ids=[art.artifact_id],
                        counterfactual_dependencies=[art.artifact_id],
                        active_status="INACTIVE" if is_inactive else "ACTIVE",
                    )
                )

        # ---------------------------------------------------------------------
        # Gap Rule 5: Unresolved OCR Review / Unreadable Field
        # ---------------------------------------------------------------------
        for f in facts:
            for ef in f.extracted_fields:
                if ef.extraction_status.value in ["review_required", "unreadable"]:
                    gap_id = f"GAP-OCR-REVIEW-{f.artifact_id}-{ef.field_name}"
                    if any(g.gap_id == gap_id for g in gaps):
                        continue
                    is_inactive = f.artifact_id in excluded_artifact_ids
                    gap_status = (
                        EvidenceGapStatus.UNREADABLE
                        if ef.extraction_status.value == "unreadable"
                        else EvidenceGapStatus.REVIEW_REQUIRED
                    )

                    gaps.append(
                        ForensicEvidenceGap(
                            gap_id=gap_id,
                            category=EvidenceGapCategory.UNRESOLVED_OCR_REVIEW,
                            status=gap_status,
                            title=f"Unresolved OCR Field '{ef.field_name}' in {f.source_filename}",
                            why_it_matters=(
                                f"Field '{ef.field_name}' has status '{ef.extraction_status.value}' "
                                f"(Confidence: {int(ef.extraction_confidence * 100)}%). Ambiguity requires human review."
                            ),
                            exposed_by_rule_id="RULE_GAP_UNRESOLVED_OCR",
                            relevant_fact_ids=[f.fact_id],
                            relevant_artifact_ids=[f.artifact_id],
                            missing_evidence_description=f"Examiner determination or high-res verification for {ef.field_name}",
                            suggested_remedy="Review field bounding box in Evidence Inspector and accept/correct value.",
                            is_mandatory_for_resolution=False,
                            provenance_ids=[f.artifact_id, f.fact_id],
                            counterfactual_dependencies=[f.artifact_id],
                            active_status="INACTIVE" if is_inactive else "ACTIVE",
                        )
                    )

        # ---------------------------------------------------------------------
        # Gap Rule 6: Missing Source Category
        # ---------------------------------------------------------------------
        has_bank = any("bank" in (a.filename or "").lower() or a.source_tier.value == "T1" for a in artifacts)
        has_financial_claims = any(f.amount is not None for f in facts)
        if has_financial_claims and not has_bank:
            gaps.append(
                ForensicEvidenceGap(
                    gap_id="GAP-MISSING-CAT-BANK-LEDGER",
                    category=EvidenceGapCategory.MISSING_SOURCE_CATEGORY,
                    status=EvidenceGapStatus.NOT_PROVIDED,
                    title="Missing Core Banking Evidence Category",
                    why_it_matters="Financial payment transactions are asserted, but no official bank statements have been ingested.",
                    exposed_by_rule_id="RULE_GAP_MISSING_SOURCE_CATEGORY",
                    missing_evidence_description="Official core banking account statements / settlement ledgers",
                    suggested_remedy="Intake verified bank statements for all relevant accounts.",
                    is_mandatory_for_resolution=True,
                    active_status="ACTIVE",
                )
            )

        return gaps

    # -------------------------------------------------------------------------
    # 3. Comprehensive Analysis Assembly
    # -------------------------------------------------------------------------

    def analyze_case(
        self,
        case_id: str,
        facts: List[CanonicalFact],
        artifacts: List[Artifact],
        timeline: Optional[ForensicTimeline] = None,
        run: Optional[AnalysisRun] = None,
        excluded_artifact_ids: Optional[Union[List[str], Set[str]]] = None,
        existing_reviews: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> CaseForensicAnalysis:
        """Assembles complete deterministic contradiction and evidence gap analysis."""
        excluded_ids: Set[str] = set()
        if excluded_artifact_ids:
            excluded_ids.update(excluded_artifact_ids)
        if run and run.excluded_artifact_ids:
            excluded_ids.update(run.excluded_artifact_ids)

        # 1. Detect contradictions
        contradictions = self.detect_contradictions(
            facts=facts,
            artifacts=artifacts,
            timeline=timeline,
            excluded_artifact_ids=excluded_ids,
        )

        # 2. Detect evidence gaps
        gaps = self.detect_evidence_gaps(
            facts=facts,
            artifacts=artifacts,
            timeline=timeline,
            excluded_artifact_ids=excluded_ids,
        )

        # 3. Apply human review overlays if provided
        if existing_reviews:
            for contra in contradictions:
                rev = existing_reviews.get(contra.finding_id)
                if rev:
                    contra.review_state = rev.get("decision") or rev.get("status", "UNREVIEWED")
                    contra.reviewed_by = rev.get("reviewed_by")
                    contra.review_notes = rev.get("review_notes")
                    contra.reviewed_at_iso = rev.get("reviewed_at_iso")
                    if rev.get("decision") == "RESOLVED":
                        contra.status = FindingStatus.RESOLVED.value

            for gap in gaps:
                rev = existing_reviews.get(gap.gap_id)
                if rev:
                    decision = rev.get("decision")
                    if decision == "CONFIRM_ABSENT":
                        # Strictly applied ONLY via explicit human review
                        gap.status = EvidenceGapStatus.CONFIRMED_ABSENT
                        gap.review_scope = rev.get("review_scope")
                    elif decision == "RESOLVE":
                        gap.status = EvidenceGapStatus.RESOLVED

                    gap.review_decision = decision
                    gap.reviewed_by = rev.get("reviewed_by")
                    gap.review_notes = rev.get("review_notes")
                    gap.reviewed_at_iso = rev.get("reviewed_at_iso")

        # 4. Compute metrics
        tot_contra = len(contradictions)
        act_contra = sum(1 for c in contradictions if c.status == FindingStatus.ACTIVE.value)
        inact_contra = sum(1 for c in contradictions if c.status == FindingStatus.INACTIVE.value)

        tot_gaps = len(gaps)
        act_gaps = sum(1 for g in gaps if g.active_status == "ACTIVE" and g.status != EvidenceGapStatus.RESOLVED)
        rev_req = sum(1 for g in gaps if g.status == EvidenceGapStatus.REVIEW_REQUIRED)
        resolved = sum(1 for g in gaps if g.status == EvidenceGapStatus.RESOLVED)

        uncertainties = [
            "Contradiction detection strictly evaluates preserved bits and explicit identifier joins.",
            "Normal clock drift and timezone conversions are excluded from contradiction counts.",
            "Confirmed absence is never inferred automatically and requires authorized examiner sign-off.",
        ]

        observations = [
            f"{tot_contra} total contradiction finding(s) cataloged across case evidence.",
            f"{tot_gaps} evidence gap(s) identified across corroborated and uncorroborated records.",
        ]

        # 5. Deterministic fingerprint
        # Result content digest: includes original/normalized values, rules, and explanations, not only IDs
        contra_digests = [
            f"{c.finding_id}:{c.rule_id}:{c.status}:{c.review_state}:{c.category.value}:{sorted(c.original_values.items())}:{sorted(c.normalized_values.items())}:{c.explanation}"
            for c in sorted(contradictions, key=lambda x: x.finding_id)
        ]
        gap_digests = [
            f"{g.gap_id}:{g.exposed_by_rule_id}:{g.status.value}:{g.active_status}:{g.category.value}:{g.why_it_matters}"
            for g in sorted(gaps, key=lambda x: x.gap_id)
        ]
        result_payload = {
            "schema_version": "2.0.0",
            "contradictions": contra_digests,
            "evidence_gaps": gap_digests,
        }
        result_fp_str = json.dumps(result_payload, sort_keys=True)
        result_fingerprint = hashlib.sha256(result_fp_str.encode("utf-8")).hexdigest()

        # Active artifacts and facts respecting excluded scope
        active_artifacts = [a for a in artifacts if a.artifact_id not in excluded_ids]
        active_artifact_hashes = sorted([(a.artifact_id, a.sha256) for a in active_artifacts])

        active_facts = [f for f in facts if f.artifact_id not in excluded_ids]
        fact_digests = []
        for f in active_facts:
            ident_str = ",".join(f"{k}={v}" for k, v in sorted(f.identifiers.items()))
            tp_epoch = getattr(f.time_provenance, "utc_epoch", None)
            tp_inf = getattr(f.time_provenance, "is_inferred", False)
            tp_rec = getattr(f.time_provenance, "recorded_time", None)
            tp_str = f"{tp_epoch}:{tp_inf}:{tp_rec}"
            reg = getattr(f, "region", None)
            if reg is not None:
                if isinstance(reg, dict):
                    lat = reg.get("latitude")
                    lon = reg.get("longitude")
                    rad = reg.get("radius_meters")
                else:
                    lat = getattr(reg, "latitude", None)
                    lon = getattr(reg, "longitude", None)
                    rad = getattr(reg, "radius_meters", None)
                region_str = f"{lat}:{lon}:{rad}"
            else:
                region_str = "NO_REGION"
            f_content = f"{f.fact_id}:{f.kind.value}:{f.amount}:{f.currency}:{tp_str}:{region_str}:{ident_str}:{f.sha256}"
            fact_digests.append(f_content)
        facts_digest = hashlib.sha256("\n".join(sorted(fact_digests)).encode("utf-8")).hexdigest()

        # Recipe digest for contradiction analysis configuration
        recipe_payload = {
            "schema_version": "2.0.0",
            "case_id": case_id,
            "contradiction_rule_versions": sorted(self.CONTRADICTION_RULE_VERSIONS.items()),
            "parser_versions": sorted(self.PARSER_VERSIONS.items()),
            "normalization_versions": sorted(self.NORMALIZATION_VERSIONS.items()),
            "tolerances": {
                "clock_drift_tolerance_seconds": float(self.clock_drift_tolerance_seconds),
                "amount_tolerance": float(self.amount_tolerance),
            },
            "active_artifact_hashes": active_artifact_hashes,
            "excluded_artifact_ids": sorted(list(excluded_ids)),
            "facts_digest": facts_digest,
            "fact_count": len(active_facts),
            "artifact_count": len(active_artifacts),
        }
        recipe_fp_str = json.dumps(recipe_payload, sort_keys=True)
        recipe_fingerprint = hashlib.sha256(recipe_fp_str.encode("utf-8")).hexdigest()

        composite_fp_str = f"v2:{recipe_fingerprint}:{result_fingerprint}"
        fingerprint = hashlib.sha256(composite_fp_str.encode("utf-8")).hexdigest()

        return CaseForensicAnalysis(
            case_id=case_id,
            run_id=run.run_id if run else None,
            total_contradictions=tot_contra,
            active_contradictions_count=act_contra,
            inactive_contradictions_count=inact_contra,
            total_gaps=tot_gaps,
            active_gaps_count=act_gaps,
            review_required_count=rev_req,
            resolved_count=resolved,
            contradictions=contradictions,
            evidence_gaps=gaps,
            uncertainties=uncertainties,
            informational_observations=observations,
            fingerprint=fingerprint,
            recipe_fingerprint=recipe_fingerprint,
            result_fingerprint=result_fingerprint,
        )

    # -------------------------------------------------------------------------
    # 4. Graph Augmentation
    # -------------------------------------------------------------------------

    def integrate_findings_into_graph(
        self,
        graph: InvestigationGraph,
        analysis: CaseForensicAnalysis,
    ) -> InvestigationGraph:
        """Augments an InvestigationGraph with CONTRADICTION and EVIDENCE_GAP nodes and edges."""
        nodes = list(graph.nodes)
        edges = list(graph.edges)
        seen_node_ids = {n.node_id for n in nodes}

        # 1. Add Contradiction Nodes
        for contra in analysis.contradictions:
            c_node = contra.to_graph_node()
            if c_node.node_id not in seen_node_ids:
                seen_node_ids.add(c_node.node_id)
                nodes.append(c_node)

            # Link contradiction to supporting artifacts
            for art_id in contra.source_artifact_ids:
                art_node_id = f"ent:art:{art_id}"
                edges.append(
                    InvestigationEdge(
                        edge_id=f"edge:contra_art:{contra.finding_id}:{art_id}",
                        source_id=c_node.node_id,
                        target_id=art_node_id,
                        edge_type=ForensicEdgeType.CONTRADICTS,
                        label="Contradicts",
                        explanation=f"Contradiction finding involves artifact {art_id}",
                        provenance_ids=[art_id, contra.finding_id],
                        is_contradiction=True,
                        status=contra.status,
                    )
                )

        # 2. Add Evidence Gap Nodes
        for gap in analysis.evidence_gaps:
            g_node = gap.to_graph_node()
            if g_node.node_id not in seen_node_ids:
                seen_node_ids.add(g_node.node_id)
                nodes.append(g_node)

            # Link gap to relevant artifacts
            for art_id in gap.relevant_artifact_ids:
                art_node_id = f"ent:art:{art_id}"
                edges.append(
                    InvestigationEdge(
                        edge_id=f"edge:gap_art:{gap.gap_id}:{art_id}",
                        source_id=g_node.node_id,
                        target_id=art_node_id,
                        edge_type=ForensicEdgeType.REFERENCES,
                        label="Exposes gap in",
                        explanation=gap.why_it_matters,
                        provenance_ids=[art_id, gap.gap_id],
                        status=gap.active_status,
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
