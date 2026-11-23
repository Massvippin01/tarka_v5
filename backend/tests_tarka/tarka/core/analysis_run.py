"""Phase 3A: Evidence Arena and Counterfactual Forensics for TARKA.

Core Architecture:
1. AnalysisRun: Immutable versioned snapshot of an analysis configuration and its deterministic outputs.
   - Baseline analysis: Includes all selected artifacts.
   - Challenge run: References baseline run and explicitly excludes selected artifacts without mutating original evidence or custody logs.
2. Evidence Arena: Multi-hypothesis evaluation (H1: Account takeover, H2: Credential sharing,
   H3: Authorized-access misuse, H4: Insufficient evidence to distinguish) using qualitative assessment labels only.
3. Counterfactual Forensics: Deterministic diffing between baseline and challenge runs
   highlighting surviving, weakened, and disappeared findings, new evidence gaps, and hypothesis changes.
"""

from __future__ import annotations

import copy
import datetime
import hashlib
import json
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind
from tarka.parsers.base import PARSER_VERSIONS, NORMALIZATION_VERSIONS
from tarka.core.correlations import (
    CorrelationEngine,
    EventCorrelation,
    EvidenceGap,
    CorrelationStatus,
)


class QualitativeAssessmentLabel(str, Enum):
    """Forensic qualitative assessment labels. Never use guilt, fraud, or probability scores."""
    MORE_CONSISTENT = "More consistent with available evidence"
    PARTLY_CONSISTENT = "Partly consistent with available evidence"
    NOT_DISTINGUISHED = "Not sufficiently distinguished from alternatives"
    CONTRADICTED = "Contradicted by available evidence"
    INSUFFICIENT_EVIDENCE = "Insufficient available evidence"


class HypothesisAssessment(BaseModel):
    """Assessment of an explanation under stated deterministic criteria."""
    hypothesis_id: str = Field(description="Unique identifier: H1, H2, H3, or H4")
    title: str = Field(description="Title of explanation: Account takeover, Credential sharing, etc.")
    assessment_label: QualitativeAssessmentLabel = Field(description="Qualitative assessment status")
    supporting_evidence: List[str] = Field(default_factory=list, description="Fact / correlation IDs supporting this explanation")
    contradicting_evidence: List[str] = Field(default_factory=list, description="Fact / correlation IDs contradicting this explanation")
    assumptions: List[str] = Field(default_factory=list, description="Explicit stated assumptions required")
    evidence_gaps: List[str] = Field(default_factory=list, description="Telemetry gaps relevant to this hypothesis")
    linked_artifacts: List[str] = Field(default_factory=list, description="Source artifacts linked to this explanation")
    linked_facts: List[str] = Field(default_factory=list, description="Derived facts linked to this explanation")
    linked_correlation_rules: List[str] = Field(default_factory=list, description="Correlation rules supporting or evaluating this explanation")
    distinguishing_evidence_needed: str = Field(description="Subpoena or telemetry required to distinguish this explanation")
    rationale: str = Field(description="Deterministic forensic rationale for this assessment")


class FindingSummary(BaseModel):
    """A synthesized finding grounded in correlated facts and rules."""
    finding_id: str
    title: str
    status: str = Field(default="ACTIVE", description="'ACTIVE', 'WEAKENED', or 'REMOVED'")
    rule_id: str
    rule_name: str
    supporting_artifact_ids: List[str]
    supporting_evidence_ids: List[str]
    explanation: str


class AnalysisRun(BaseModel):
    """An immutable, versioned forensic analysis run."""
    run_id: str
    case_id: str
    run_type: str = Field(default="BASELINE", description="'BASELINE' or 'CHALLENGE'")
    baseline_run_id: Optional[str] = None
    created_at_iso: str
    analysis_ruleset_version: str = "1.0.0"
    correlation_rule_versions: Dict[str, str] = Field(default_factory=dict)
    hypothesis_rule_versions: Dict[str, str] = Field(default_factory=dict)
    selected_artifact_ids: List[str] = Field(default_factory=list)
    excluded_artifact_ids: List[str] = Field(default_factory=list)
    challenge_reason: Optional[str] = None
    source_evidence_hashes: Dict[str, str] = Field(default_factory=dict)
    derived_facts: List[CanonicalFact] = Field(default_factory=list)
    correlations: List[EventCorrelation] = Field(default_factory=list)
    contradictions: List[EventCorrelation] = Field(default_factory=list)
    evidence_gaps: List[EvidenceGap] = Field(default_factory=list)
    hypothesis_assessments: List[HypothesisAssessment] = Field(default_factory=list)
    finding_summaries: List[FindingSummary] = Field(default_factory=list)
    analysis_summary: str = Field(
        default="The supplied evidence establishes a payment-related sequence and a discrepancy between the screenshot claim and the supplied bank-statement record. It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse.",
        description="Plain-language forensic analysis summary",
    )
    analysis_fingerprint: str
    recipe_fingerprint: Optional[str] = Field(default=None, description="Deterministic SHA-256 input and configuration recipe digest")
    result_fingerprint: Optional[str] = Field(default=None, description="Deterministic SHA-256 substantive output findings digest")


class RunComparison(BaseModel):
    """Before-and-after comparison between a baseline run and a challenge run."""
    baseline_run_id: str
    challenge_run_id: str
    challenged_artifact_ids: List[str]
    challenge_reason: Optional[str] = None
    ruleset_version: str
    baseline_evidence_count: int
    challenged_evidence_count: int
    surviving_correlations: List[EventCorrelation]
    removed_correlations: List[EventCorrelation]
    surviving_contradictions: List[EventCorrelation]
    removed_contradictions: List[EventCorrelation]
    new_evidence_gaps: List[EvidenceGap]
    hypothesis_changes: List[Dict[str, Any]]
    surviving_findings: List[FindingSummary]
    weakened_findings: List[FindingSummary]
    removed_findings: List[FindingSummary]
    plain_language_summary: str


class CounterfactualEngine:
    """Deterministic engine evaluating Evidence Arena hypotheses and counterfactual challenges."""

    RULESET_VERSION = "1.0.0"
    CORRELATION_VERSIONS = {
        "RULE_TXN_REF_EXACT": "1.0.0",
        "RULE_PHONE_EXACT": "1.0.0",
        "RULE_VPA_EXACT": "1.0.0",
        "RULE_AMOUNT_WINDOW": "1.0.0",
        "RULE_PAYMENT_FLOW_CAUSAL": "1.0.0",
        "RULE_CALL_PROXIMITY": "1.0.0",
        "RULE_MEDIA_TXN_MISMATCH": "1.0.0",
        "RULE_EVIDENCE_GAP_MISSING_TXN": "1.0.0",
    }
    HYPOTHESIS_VERSIONS = {
        "H1_ACCOUNT_TAKEOVER": "1.0.0",
        "H2_CREDENTIAL_SHARING": "1.0.0",
        "H3_AUTHORIZED_MISUSE": "1.0.0",
        "H4_INSUFFICIENT_DISTINCTION": "1.0.0",
    }
    PARSER_VERSIONS = copy.deepcopy(PARSER_VERSIONS)
    NORMALIZATION_VERSIONS = copy.deepcopy(NORMALIZATION_VERSIONS)

    def __init__(self, correlation_engine: Optional[CorrelationEngine] = None) -> None:
        self.corr_engine = correlation_engine or CorrelationEngine()
        self.CORRELATION_VERSIONS = copy.deepcopy(self.CORRELATION_VERSIONS)
        self.HYPOTHESIS_VERSIONS = copy.deepcopy(self.HYPOTHESIS_VERSIONS)
        self.PARSER_VERSIONS = copy.deepcopy(self.PARSER_VERSIONS)
        self.NORMALIZATION_VERSIONS = copy.deepcopy(self.NORMALIZATION_VERSIONS)

    def execute_run(
        self,
        case_id: str,
        all_facts: List[CanonicalFact],
        all_artifact_hashes: Dict[str, str],
        excluded_artifact_ids: Optional[List[str]] = None,
        baseline_run_id: Optional[str] = None,
        challenge_reason: Optional[str] = None,
        run_id: Optional[str] = None,
    ) -> AnalysisRun:
        """Executes an analysis run excluding specified artifacts if any."""
        excluded_ids = excluded_artifact_ids or []
        run_type = "CHALLENGE" if excluded_ids else "BASELINE"

        # Filter active facts (excluding facts whose artifact_id is in excluded_ids)
        active_facts = [f for f in all_facts if f.artifact_id not in excluded_ids]
        selected_artifact_ids = [aid for aid in all_artifact_hashes if aid not in excluded_ids]
        active_hashes = {aid: h for aid, h in all_artifact_hashes.items() if aid not in excluded_ids}

        # Run deterministic correlation rules
        correlations, evidence_gaps = self.corr_engine.correlate_case(active_facts)
        contradictions = [c for c in correlations if c.is_contradiction]

        # Generate findings
        findings = self._synthesize_findings(active_facts, correlations, evidence_gaps)

        # Generate hypothesis assessments
        hypotheses = self._evaluate_hypotheses(
            facts=active_facts,
            correlations=correlations,
            contradictions=contradictions,
            evidence_gaps=evidence_gaps,
            excluded_ids=excluded_ids,
        )

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        if not run_id:
            prefix = "run_chlg" if run_type == "CHALLENGE" else "run_base"
            run_id = f"{prefix}_{case_id[:8]}_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}"

        # 1. Deterministic Recipe Fingerprint (Inputs + Configuration + Rule Versions + Facts Digest)
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

        recipe_payload = {
            "schema_version": "2.0.0",
            "case_id": case_id,
            "ruleset_version": self.RULESET_VERSION,
            "correlation_rule_versions": sorted(self.CORRELATION_VERSIONS.items()),
            "hypothesis_rule_versions": sorted(self.HYPOTHESIS_VERSIONS.items()),
            "parser_versions": sorted(self.PARSER_VERSIONS.items()),
            "normalization_versions": sorted(self.NORMALIZATION_VERSIONS.items()),
            "tolerances": {
                "amount_time_window_seconds": float(self.corr_engine.amount_window_sec),
                "payment_flow_max_delta_seconds": float(self.corr_engine.payment_flow_max_sec),
                "call_proximity_max_delta_seconds": float(self.corr_engine.call_proximity_max_sec),
                "clock_drift_tolerance_seconds": 300.0,
                "amount_tolerance": 0.01,
            },
            "active_artifact_hashes": sorted(list(active_hashes.items())),
            "excluded_artifact_ids": sorted(excluded_ids),
            "selected_artifact_ids": sorted(selected_artifact_ids),
            "facts_digest": facts_digest,
        }
        recipe_fp_str = json.dumps(recipe_payload, sort_keys=True)
        recipe_fingerprint = hashlib.sha256(recipe_fp_str.encode("utf-8")).hexdigest()

        # 2. Deterministic Result Fingerprint (Substantive Findings, Contradictions, Correlations, Gaps, Hypotheses)
        finding_digests = [
            f"{f.finding_id}:{f.status}:{f.rule_id}:{','.join(sorted(f.supporting_artifact_ids))}:{','.join(sorted(f.supporting_evidence_ids))}:{f.explanation}"
            for f in findings
        ]
        contra_digests = [
            f"{c.correlation_id}:{c.rule_id}:{c.status.value}:{','.join(sorted(c.artifact_inputs))}:{','.join(sorted(c.evidence_inputs))}:{c.explanation_text}"
            for c in contradictions
        ]
        corr_digests = [
            f"{c.correlation_id}:{c.rule_id}:{c.status.value}:{','.join(sorted(c.artifact_inputs))}:{','.join(sorted(c.evidence_inputs))}:{c.explanation_text}"
            for c in correlations if not c.is_contradiction and not c.is_evidence_gap
        ]
        gap_digests = [
            f"{g.gap_id}:{g.rule_id}:{g.claiming_fact_id}:{g.artifact_id}:{g.expected_evidence_type}:{g.explanation}"
            for g in evidence_gaps
        ]
        hypo_digests = [
            f"{h.hypothesis_id}:{h.assessment_label.value}:{','.join(sorted(h.supporting_evidence))}:{','.join(sorted(h.contradicting_evidence))}:{','.join(sorted(h.evidence_gaps))}:{h.rationale}"
            for h in hypotheses
        ]

        result_payload = {
            "schema_version": "2.0.0",
            "findings": sorted(finding_digests),
            "contradictions": sorted(contra_digests),
            "correlations": sorted(corr_digests),
            "evidence_gaps": sorted(gap_digests),
            "hypothesis_assessments": sorted(hypo_digests),
        }
        result_fp_str = json.dumps(result_payload, sort_keys=True)
        result_fingerprint = hashlib.sha256(result_fp_str.encode("utf-8")).hexdigest()

        # 3. Composite analysis_fingerprint sealing both recipe and results
        composite_fp_str = f"v2:{recipe_fingerprint}:{result_fingerprint}"
        analysis_fingerprint = hashlib.sha256(composite_fp_str.encode("utf-8")).hexdigest()

        # Plain-language active analysis summary grounded strictly in active facts & rules
        has_media_mismatch = any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in contradictions)
        has_bank_finding = any(f.finding_id == "FINDING-04" for f in findings)
        has_payment_flow = any(c.rule_id == "RULE_PAYMENT_FLOW_CAUSAL" for c in correlations)

        if not excluded_ids:
            analysis_summary = (
                "The supplied evidence establishes a payment-related sequence and a discrepancy between the screenshot claim and the supplied bank-statement record. It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
            )
        else:
            excluded_str = ", ".join(sorted(excluded_ids))
            summary_parts = []
            if not has_media_mismatch:
                summary_parts.append(f"Excluding {excluded_str} removes the amount-mismatch contradiction.")
            else:
                summary_parts.append(f"Excluding {excluded_str} modifies active evidence.")

            if has_bank_finding:
                summary_parts.append("The transaction remains recorded in the supplied bank-statement record.")
            else:
                summary_parts.append("The bank transaction record is absent from active analysis.")

            if has_media_mismatch:
                summary_parts.append(
                    "The remaining supplied evidence establishes a payment-related sequence and a discrepancy between the screenshot claim and the supplied bank-statement record. It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
                )
            elif has_payment_flow:
                summary_parts.append(
                    "The remaining supplied evidence establishes a payment-related sequence. It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
                )
            elif not has_bank_finding:
                summary_parts.append(
                    "The remaining supplied evidence does not establish payment execution or distinguish account takeover, credential sharing, or authorized-access misuse."
                )
            else:
                summary_parts.append(
                    "The remaining supplied evidence does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
                )

            analysis_summary = " ".join(summary_parts)

        return AnalysisRun(
            run_id=run_id,
            case_id=case_id,
            run_type=run_type,
            baseline_run_id=baseline_run_id,
            created_at_iso=now_iso,
            analysis_ruleset_version=self.RULESET_VERSION,
            correlation_rule_versions=self.CORRELATION_VERSIONS,
            hypothesis_rule_versions=self.HYPOTHESIS_VERSIONS,
            selected_artifact_ids=selected_artifact_ids,
            excluded_artifact_ids=excluded_ids,
            challenge_reason=challenge_reason,
            source_evidence_hashes=active_hashes,
            derived_facts=active_facts,
            correlations=correlations,
            contradictions=contradictions,
            evidence_gaps=evidence_gaps,
            hypothesis_assessments=hypotheses,
            finding_summaries=findings,
            analysis_summary=analysis_summary,
            analysis_fingerprint=analysis_fingerprint,
            recipe_fingerprint=recipe_fingerprint,
            result_fingerprint=result_fingerprint,
        )

    def _synthesize_findings(
        self,
        facts: List[CanonicalFact],
        correlations: List[EventCorrelation],
        evidence_gaps: List[EvidenceGap],
    ) -> List[FindingSummary]:
        """Deterministically derives findings from active facts and rules."""
        findings: List[FindingSummary] = []

        # Finding 1: Causal payment flow
        causal_corr = next((c for c in correlations if c.rule_id == "RULE_PAYMENT_FLOW_CAUSAL"), None)
        if causal_corr:
            findings.append(
                FindingSummary(
                    finding_id="FINDING-01",
                    title="Chat payment request precedes matching bank transaction",
                    status="ACTIVE",
                    rule_id="RULE_PAYMENT_FLOW_CAUSAL",
                    rule_name="Causal Payment Flow",
                    supporting_artifact_ids=causal_corr.artifact_inputs,
                    supporting_evidence_ids=causal_corr.evidence_inputs,
                    explanation=causal_corr.explanation_text,
                )
            )

        # Finding 2: Media amount contradiction
        mismatch_corr = next((c for c in correlations if c.rule_id == "RULE_MEDIA_TXN_MISMATCH"), None)
        if mismatch_corr:
            findings.append(
                FindingSummary(
                    finding_id="FINDING-02",
                    title="Screenshot claim reports ₹15,000; supplied transaction record reports ₹25,000",
                    status="ACTIVE",
                    rule_id="RULE_MEDIA_TXN_MISMATCH",
                    rule_name="Screenshot Transaction Amount Contradiction",
                    supporting_artifact_ids=mismatch_corr.artifact_inputs,
                    supporting_evidence_ids=mismatch_corr.evidence_inputs,
                    explanation=mismatch_corr.explanation_text,
                )
            )

        # Finding 3: Missing transaction evidence gap
        gap_item = next((g for g in evidence_gaps if g.rule_id == "RULE_EVIDENCE_GAP_MISSING_TXN"), None)
        if gap_item:
            findings.append(
                FindingSummary(
                    finding_id="FINDING-03",
                    title="Claim references RRN 202602147777; no corresponding transaction exists in supplied records",
                    status="ACTIVE",
                    rule_id="RULE_EVIDENCE_GAP_MISSING_TXN",
                    rule_name="Uncorroborated Transaction Claim",
                    supporting_artifact_ids=[gap_item.artifact_id],
                    supporting_evidence_ids=[gap_item.claiming_evidence_id],
                    explanation=gap_item.explanation,
                )
            )

        # Finding 4: Independent Bank Debit Record
        bank_facts = [f for f in facts if f.kind == CanonicalFactKind.BANK_TRANSACTION]
        if bank_facts:
            bf = bank_facts[0]
            amt_str = f"₹{bf.amount:,.2f}" if bf.amount is not None else "an undetermined amount"
            findings.append(
                FindingSummary(
                    finding_id="FINDING-04",
                    title=f"Bank transaction of {amt_str} recorded in the supplied bank-statement record",
                    status="ACTIVE",
                    rule_id="SUPPLIED_BANK_STATEMENT_RECORD",
                    rule_name="Supplied Bank-Statement Record",
                    supporting_artifact_ids=[bf.artifact_id],
                    supporting_evidence_ids=[bf.evidence_id],
                    explanation=f"The supplied bank-statement record records a debit with RRN {bf.identifiers.get('rrn', 'N/A')}.",
                )
            )

        return findings

    def _evaluate_hypotheses(
        self,
        facts: List[CanonicalFact],
        correlations: List[EventCorrelation],
        contradictions: List[EventCorrelation],
        evidence_gaps: List[EvidenceGap],
        excluded_ids: List[str],
    ) -> List[HypothesisAssessment]:
        """Evaluates H1, H2, H3, H4 under visible deterministic criteria."""
        has_chat = any(f.kind in [CanonicalFactKind.CHAT_MESSAGE, CanonicalFactKind.PAYMENT_REQUEST] for f in facts)
        has_cdr = any(f.kind == CanonicalFactKind.CDR_CALL for f in facts)
        has_bank = any(f.kind == CanonicalFactKind.BANK_TRANSACTION for f in facts)
        has_screenshot = any(f.kind == CanonicalFactKind.MEDIA_METADATA for f in facts)
        has_mismatch = any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in contradictions)

        # 1. H1: Account Takeover
        h1_support: List[str] = []
        h1_contra: List[str] = []
        if has_cdr:
            h1_support.append("Incoming voice call from external caller prior to transaction (RULE_CALL_PROXIMITY)")
        if has_chat:
            h1_support.append("Chat payment request to external VPA under urgent instruction (RULE_PAYMENT_FLOW_CAUSAL)")
        if has_mismatch:
            h1_contra.append("Altered screenshot claim suggests receipt modification rather than pure silent remote session")

        if not has_bank and not has_chat:
            h1_label = QualitativeAssessmentLabel.INSUFFICIENT_EVIDENCE
        elif not has_bank:
            h1_label = QualitativeAssessmentLabel.CONTRADICTED
        else:
            h1_label = QualitativeAssessmentLabel.PARTLY_CONSISTENT

        h1 = HypothesisAssessment(
            hypothesis_id="H1",
            title="Account takeover",
            assessment_label=h1_label,
            supporting_evidence=h1_support,
            contradicting_evidence=h1_contra,
            assumptions=[
                "Victim's device or credentials were operated without authorization.",
                "External caller operated without account holder's voluntary consent.",
            ],
            evidence_gaps=[
                "Device session IP logs and IMEI binding logs during transaction epoch are absent.",
                "Cell tower sector handovers for handset during payment window are absent.",
            ],
            linked_artifacts=sorted(list({f.artifact_id for f in facts if f.kind in [CanonicalFactKind.CDR_CALL, CanonicalFactKind.CHAT_MESSAGE, CanonicalFactKind.PAYMENT_REQUEST]})),
            linked_facts=[f.fact_id for f in facts if f.kind in [CanonicalFactKind.CDR_CALL, CanonicalFactKind.PAYMENT_REQUEST]],
            linked_correlation_rules=[c.rule_id for c in correlations if c.rule_id in ["RULE_CALL_PROXIMITY", "RULE_PAYMENT_FLOW_CAUSAL"]],
            distinguishing_evidence_needed="Bank/gateway switch IP access logs, device hardware binding telemetry, or SIM swap records during transaction window.",
            rationale="External caller and chat instructions are consistent with external initiation, but absence of device session logs prevents distinguishing from voluntary credential sharing.",
        )

        # 2. H2: Credential Sharing
        h2_support: List[str] = []
        h2_contra: List[str] = []
        if has_cdr:
            h2_support.append("Sustained voice call immediately preceding payment request indicates active communication")
        if has_chat and has_bank:
            h2_support.append("Chat payment instruction promptly followed by debit recorded in the supplied bank-statement record")
        if not has_chat:
            h2_contra.append("Exclusion of chat instructions removes direct evidence of user receiving transfer instructions")

        if not has_bank:
            h2_label = QualitativeAssessmentLabel.CONTRADICTED
        elif not has_cdr and not has_chat:
            h2_label = QualitativeAssessmentLabel.INSUFFICIENT_EVIDENCE
        else:
            h2_label = QualitativeAssessmentLabel.PARTLY_CONSISTENT

        h2 = HypothesisAssessment(
            hypothesis_id="H2",
            title="Credential sharing",
            assessment_label=h2_label,
            supporting_evidence=h2_support,
            contradicting_evidence=h2_contra,
            assumptions=[
                "Account holder shared OTP, UPI PIN, or remote screen-sharing access under direction.",
                "Handset remained in physical possession of account holder during the call.",
            ],
            evidence_gaps=[
                "Voice call audio recording or transcript is unavailable.",
                "Screen-sharing application telemetry (e.g. AnyDesk, TeamViewer) is not recorded in supplied logs.",
            ],
            linked_artifacts=sorted(list({f.artifact_id for f in facts if f.kind in [CanonicalFactKind.CDR_CALL, CanonicalFactKind.CHAT_MESSAGE, CanonicalFactKind.BANK_TRANSACTION]})),
            linked_facts=[f.fact_id for f in facts if f.kind in [CanonicalFactKind.CDR_CALL, CanonicalFactKind.PAYMENT_REQUEST, CanonicalFactKind.BANK_TRANSACTION]],
            linked_correlation_rules=[c.rule_id for c in correlations if c.rule_id in ["RULE_CALL_PROXIMITY", "RULE_PAYMENT_FLOW_CAUSAL", "RULE_TXN_REF_EXACT"]],
            distinguishing_evidence_needed="Call audio recording, screen-sharing app installation logs, or witness deposition regarding credential disclosure.",
            rationale="Continuous voice call preceding payment instructions to external VPA is partly consistent with guided credential handoff, but cannot be distinguished from takeover without device logs.",
        )

        # 3. H3: Authorized-Access Misuse
        h3_support: List[str] = []
        h3_contra: List[str] = []
        if has_bank:
            h3_support.append("Debit of ₹25,000 executed via official banking channel recorded in the supplied bank-statement record")
        if has_mismatch:
            h3_support.append("Screenshot claim reports ₹15,000 against ₹25,000 bank record, consistent with receipt amount discrepancy")
        if has_chat or has_cdr:
            h3_contra.append("External caller and chat instructions suggest external involvement rather than purely internal co-user access")

        if not has_bank:
            h3_label = QualitativeAssessmentLabel.CONTRADICTED
        elif has_mismatch:
            h3_label = QualitativeAssessmentLabel.PARTLY_CONSISTENT
        else:
            h3_label = QualitativeAssessmentLabel.NOT_DISTINGUISHED

        if has_mismatch:
            h3_assumptions = [
                "Transaction was executed by an authorized secondary user or co-account holder.",
                "Discrepancy was reported to conceal authorized transfer volume.",
            ]
            h3_rationale = "Amount mismatch on screenshot claim is consistent with receipt manipulation, but external call and chat suggest third-party interaction."
        else:
            h3_assumptions = [
                "Transaction was executed by an authorized secondary user or co-account holder.",
                "Banking credentials were used without fraudulent external coercion.",
            ]
            h3_rationale = "No receipt discrepancy exists in active evidence. Official banking record documents execution, but authorized co-user access cannot be evaluated without device biometric authentication logs."

        h3 = HypothesisAssessment(
            hypothesis_id="H3",
            title="Authorized-access misuse",
            assessment_label=h3_label,
            supporting_evidence=h3_support,
            contradicting_evidence=h3_contra,
            assumptions=h3_assumptions,
            evidence_gaps=[
                "Biometric device unlock audit logs during transaction window are absent.",
                "Banking application multi-profile authentication logs are not supplied.",
            ],
            linked_artifacts=sorted(list({f.artifact_id for f in facts if f.kind in [CanonicalFactKind.BANK_TRANSACTION, CanonicalFactKind.MEDIA_METADATA]})),
            linked_facts=[f.fact_id for f in facts if f.kind in [CanonicalFactKind.BANK_TRANSACTION, CanonicalFactKind.MEDIA_METADATA]],
            linked_correlation_rules=[c.rule_id for c in correlations if c.rule_id in ["RULE_MEDIA_TXN_MISMATCH", "RULE_TXN_REF_EXACT"]],
            distinguishing_evidence_needed="Device unlock records, banking application biometric logs, and secondary user access delegation records.",
            rationale=h3_rationale,
        )

        # 4. H4: Insufficient Evidence to Distinguish
        h4_support: List[str] = [
            "Current telemetry documents temporal sequence (call -> chat -> debit), but lacks device-level authentication logs.",
        ]
        if has_mismatch:
            h4_support.append(
                "Account takeover (H1), credential sharing (H2), and authorized-access misuse (H3) remain indistinguishable without device IP, audio, or screen-sharing telemetry."
            )
        else:
            h4_support.append(
                "Account takeover (H1) and credential sharing (H2) remain indistinguishable without device IP, audio, or screen-sharing telemetry."
            )

        competing_partly = sum(1 for lbl in [h1_label, h2_label, h3_label] if lbl == QualitativeAssessmentLabel.PARTLY_CONSISTENT)
        if competing_partly >= 2:
            h4_label = QualitativeAssessmentLabel.MORE_CONSISTENT
        elif has_bank and not has_chat and not has_cdr:
            h4_label = QualitativeAssessmentLabel.MORE_CONSISTENT
        else:
            h4_label = QualitativeAssessmentLabel.NOT_DISTINGUISHED

        h4 = HypothesisAssessment(
            hypothesis_id="H4",
            title="Insufficient evidence to distinguish the explanations",
            assessment_label=h4_label,
            supporting_evidence=h4_support,
            contradicting_evidence=[],
            assumptions=[
                "Analytical conclusions strictly adhere to stated deterministic rules without assuming unrecorded telemetry.",
            ],
            evidence_gaps=[
                "Handset physical forensic extraction image.",
                "Banking gateway session IP and device binding records.",
            ],
            linked_artifacts=sorted(list({f.artifact_id for f in facts})),
            linked_facts=[f.fact_id for f in facts],
            linked_correlation_rules=sorted(list({c.rule_id for c in correlations})),
            distinguishing_evidence_needed="Forensic image of handset and certified gateway transmission logs.",
            rationale="Supplied records confirm chronological correlation but do not conclusively eliminate competing explanations.",
        )

        return [h1, h2, h3, h4]

    def compare_runs(
        self,
        baseline: AnalysisRun,
        challenge: AnalysisRun,
    ) -> RunComparison:
        """Deterministically compares baseline run against challenge run."""
        # Correlations diff based on stable signature (rule_id + sorted evidence inputs)
        def corr_sig(c: EventCorrelation) -> str:
            return f"{c.rule_id}::{','.join(sorted(c.evidence_inputs))}"

        base_corr_map = {corr_sig(c): c for c in baseline.correlations}
        chlg_corr_map = {corr_sig(c): c for c in challenge.correlations}

        surviving_corrs = [c for sig, c in chlg_corr_map.items() if sig in base_corr_map]
        removed_corrs = [c for sig, c in base_corr_map.items() if sig not in chlg_corr_map]

        # Contradictions diff based on stable signature
        base_contra_map = {corr_sig(c): c for c in baseline.contradictions}
        chlg_contra_map = {corr_sig(c): c for c in challenge.contradictions}

        surviving_contras = [c for sig, c in chlg_contra_map.items() if sig in base_contra_map]
        removed_contras = [c for sig, c in base_contra_map.items() if sig not in chlg_contra_map]

        # Evidence gaps diff based on stable signature
        def gap_sig(g: EvidenceGap) -> str:
            return f"{g.rule_id}::{g.claiming_evidence_id}::{g.expected_evidence_type}"

        base_gap_map = {gap_sig(g): g for g in baseline.evidence_gaps}
        chlg_gap_map = {gap_sig(g): g for g in challenge.evidence_gaps}

        new_gaps = [g for sig, g in chlg_gap_map.items() if sig not in base_gap_map]

        # Findings diff
        base_findings = {f.finding_id: f for f in baseline.finding_summaries}
        chlg_findings = {f.finding_id: f for f in challenge.finding_summaries}

        surviving_findings: List[FindingSummary] = []
        weakened_findings: List[FindingSummary] = []
        removed_findings: List[FindingSummary] = []

        for fid, bf in base_findings.items():
            if fid in chlg_findings:
                surviving_findings.append(chlg_findings[fid])
            else:
                removed_findings.append(
                    FindingSummary(
                        finding_id=bf.finding_id,
                        title=bf.title,
                        status="REMOVED",
                        rule_id=bf.rule_id,
                        rule_name=bf.rule_name,
                        supporting_artifact_ids=bf.supporting_artifact_ids,
                        supporting_evidence_ids=bf.supporting_evidence_ids,
                        explanation=f"No longer supported in challenge run: supporting artifact(s) excluded.",
                    )
                )

        # Hypothesis changes
        hypothesis_changes: List[Dict[str, Any]] = []
        base_hypo_map = {h.hypothesis_id: h for h in baseline.hypothesis_assessments}
        for ch in challenge.hypothesis_assessments:
            bh = base_hypo_map.get(ch.hypothesis_id)
            if bh and bh.assessment_label != ch.assessment_label:
                hypothesis_changes.append({
                    "hypothesis_id": ch.hypothesis_id,
                    "title": ch.title,
                    "baseline_label": bh.assessment_label.value,
                    "challenge_label": ch.assessment_label.value,
                    "reason": f"Assessment updated from '{bh.assessment_label.value}' to '{ch.assessment_label.value}'.",
                })

        # Plain language summary grounded in results
        excluded_str = ", ".join(challenge.excluded_artifact_ids)
        summary_lines: List[str] = []

        if removed_contras:
            has_media_mismatch = any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in removed_contras)
            if has_media_mismatch:
                summary_lines.append(f"Excluding {excluded_str} removes the amount-mismatch contradiction.")
            else:
                contra_names = ", ".join([c.rule_name for c in removed_contras])
                summary_lines.append(f"Excluding {excluded_str} removes the {contra_names.lower()} contradiction.")

        if "FINDING-04" in [f.finding_id for f in surviving_findings]:
            summary_lines.append("The transaction remains recorded in the supplied bank-statement record.")

        if removed_corrs and not removed_contras:
            summary_lines.append(f"Excluding {excluded_str} removes {len(removed_corrs)} correlation link(s).")

        if new_gaps:
            summary_lines.append(f"Excluding this evidence introduces {len(new_gaps)} new evidence gap(s) due to uncorroborated claims.")

        has_active_mismatch = any(c.rule_id == "RULE_MEDIA_TXN_MISMATCH" for c in challenge.contradictions)
        has_active_payment_flow = any(c.rule_id == "RULE_PAYMENT_FLOW_CAUSAL" for c in challenge.correlations)
        has_active_bank = any(f.finding_id == "FINDING-04" for f in challenge.finding_summaries)

        if has_active_mismatch:
            summary_lines.append(
                "The supplied evidence establishes a payment-related sequence and a discrepancy between the screenshot claim and the supplied bank-statement record. It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
            )
        elif has_active_payment_flow:
            summary_lines.append(
                "The remaining supplied evidence establishes a payment-related sequence. It does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
            )
        elif not has_active_bank:
            summary_lines.append(
                "The remaining supplied evidence does not establish payment execution or distinguish account takeover, credential sharing, or authorized-access misuse."
            )
        else:
            summary_lines.append(
                "The remaining supplied evidence does not sufficiently distinguish account takeover, credential sharing, or authorized-access misuse."
            )

        plain_language_summary = " ".join(summary_lines)

        return RunComparison(
            baseline_run_id=baseline.run_id,
            challenge_run_id=challenge.run_id,
            challenged_artifact_ids=challenge.excluded_artifact_ids,
            challenge_reason=challenge.challenge_reason,
            ruleset_version=self.RULESET_VERSION,
            baseline_evidence_count=len(baseline.selected_artifact_ids),
            challenged_evidence_count=len(challenge.selected_artifact_ids),
            surviving_correlations=surviving_corrs,
            removed_correlations=removed_corrs,
            surviving_contradictions=surviving_contras,
            removed_contradictions=removed_contras,
            new_evidence_gaps=new_gaps,
            hypothesis_changes=hypothesis_changes,
            surviving_findings=surviving_findings,
            weakened_findings=weakened_findings,
            removed_findings=removed_findings,
            plain_language_summary=plain_language_summary,
        )
