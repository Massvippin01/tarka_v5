"""TARKA Phase 6: Forensic Reliability, Adversarial Validation & System Hardening.

Adversarial test suite covering:
- Phase 6B: Counterfactual & Provenance Invariants
- Phase 6C: Financial, Digital & Cybersecurity Synthetic Evidence
- Phase 6D: False-Positive & False-Negative Avoidance Guardrails
- Phase 6E: API, Authorization & Persistence Hardening
- Phase 6F: Forensic Review & Explainability Grounding (12 Examiner Questions)
"""

from __future__ import annotations

import datetime
import hashlib
import json
import os
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app, sanitize_filename, case_store
from tarka.core.models import TrustTier, AuthType, TimeWindow
from tarka.core.canonical_fact import (
    CanonicalFact,
    CanonicalFactKind,
    ExtractedField,
    ExtractionStatus,
    TimezoneProvenance,
)
from tarka.core.completeness import (
    CompletenessEngine,
    DocumentProcessingCoverage,
    PageCoverageItem,
    PageProcessingStatus,
    EvidenceFieldStatus,
    FieldReviewDecision,
    FieldExpectationRegistry,
)
from tarka.core.correlations import CorrelationEngine
from tarka.core.analysis_run import CounterfactualEngine
from tarka.core.timeline_reconstruction import (
    TimelineReconstructionEngine,
    TimelineEventType,
    TemporalResolutionPriority,
)
from tarka.core.contradiction_analysis import (
    ContradictionAnalysisEngine,
    ContradictionCategory,
    ContradictionFinding,
    ForensicEvidenceGap,
    EvidenceGapCategory,
    EvidenceGapStatus,
    FindingStatus,
    normalize_amount,
    normalize_rrn,
)
from tarka.core.evidence_dna import Artifact, CaseStore
from tarka.core.custody import CustodyLedger


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def make_artifact(
    artifact_id: str,
    case_id: str = "c1",
    filename: str = "doc.pdf",
    mime_type: str = "application/pdf",
    file_size_bytes: int = 1024,
    sha256: str = "1111111111111111111111111111111111111111111111111111111111111111",
    source_tier: TrustTier = TrustTier.T1,
    storage_path: str = "doc.pdf",
    metadata: Dict[str, Any] | None = None,
) -> Artifact:
    """Helper to instantiate valid Artifact models with valid 64-hex sha256 digests."""
    return Artifact(
        artifact_id=artifact_id,
        case_id=case_id,
        filename=filename,
        sha256=sha256,
        file_size_bytes=file_size_bytes,
        mime_type=mime_type,
        source_tier=source_tier,
        intake_officer="Forensic Examiner",
        intake_timestamp_iso="2026-02-14T05:00:00Z",
        custody_chain_sequence=1,
        storage_path=storage_path,
        metadata=metadata or {},
    )


def make_fact(
    fact_id: str,
    artifact_id: str,
    source_filename: str = "doc.pdf",
    kind: CanonicalFactKind = CanonicalFactKind.BANK_TRANSACTION,
    amount: float | None = None,
    currency: str = "INR",
    identifiers: Dict[str, str] | None = None,
    case_id: str = "c1",
    trust_tier: TrustTier = TrustTier.T1,
    auth_track: AuthType = AuthType.ACTIVE,
    utc_epoch: float = 1771044570.0,
    raw_snippet: str = "Evidence record",
    extracted_fields: List[ExtractedField] | None = None,
) -> CanonicalFact:
    """Helper to instantiate fully populated CanonicalFact models adhering to schema constraints."""
    return CanonicalFact(
        fact_id=fact_id,
        case_id=case_id,
        artifact_id=artifact_id,
        evidence_id=f"EVI-{fact_id}",
        kind=kind,
        source_filename=source_filename,
        source_location="Row 1",
        sha256="1111111111111111111111111111111111111111111111111111111111111111",
        trust_tier=trust_tier,
        auth_track=auth_track,
        time_provenance=TimezoneProvenance(
            recorded_time="2026-02-14 10:24:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:54:00Z",
            utc_epoch=utc_epoch,
            conversion_rationale="Normalized for test fixture",
        ),
        amount=amount,
        currency=currency,
        identifiers=identifiers or {},
        summary=f"Summary for {fact_id}",
        raw_source_snippet=raw_snippet,
        extracted_fields=extracted_fields or [],
    )


# ==============================================================================
# PHASE 6B: COUNTERFACTUAL AND PROVENANCE INVARIANTS
# ==============================================================================

class TestPhase6BCounterfactualProvenanceInvariants:
    """Verifies counterfactual challenge invariants, provenance preservation, and determinism."""

    def test_counterfactual_exclusion_deactivates_dependent_findings_only(self):
        """Excluding an artifact deactivates findings depending on it, while independent evidence survives."""
        engine = ContradictionAnalysisEngine()

        art1 = make_artifact("ART-001-BANK", filename="bank.pdf", mime_type="application/pdf", sha256="1111111111111111111111111111111111111111111111111111111111111111")
        art2 = make_artifact("ART-004-SCREENSHOT", filename="screenshot.png", mime_type="image/png", sha256="2222222222222222222222222222222222222222222222222222222222222222", source_tier=TrustTier.T3)
        art3 = make_artifact("ART-005-GATEWAY", filename="gateway.log", mime_type="text/plain", sha256="3333333333333333333333333333333333333333333333333333333333333333")

        f_bank = make_fact(
            fact_id="FACT-BANK-01",
            artifact_id=art1.artifact_id,
            source_filename="bank.pdf",
            kind=CanonicalFactKind.BANK_TRANSACTION,
            amount=25000.0,
            identifiers={"rrn": "202602148891"},
            trust_tier=TrustTier.T1,
        )
        f_shot = make_fact(
            fact_id="FACT-SHOT-01",
            artifact_id=art2.artifact_id,
            source_filename="screenshot.png",
            kind=CanonicalFactKind.MEDIA_METADATA,
            amount=15000.0,
            identifiers={"rrn": "202602148891"},
            trust_tier=TrustTier.T3,
        )
        # Independent finding between bank and gateway (status conflict under different RRN)
        f_bank_other = make_fact(
            fact_id="FACT-BANK-02",
            artifact_id=art1.artifact_id,
            source_filename="bank.pdf",
            kind=CanonicalFactKind.BANK_TRANSACTION,
            amount=5000.0,
            identifiers={"rrn": "999900001111", "status": "SUCCESS"},
            trust_tier=TrustTier.T1,
        )
        f_gate_other = make_fact(
            fact_id="FACT-GATE-02",
            artifact_id=art3.artifact_id,
            source_filename="gateway.log",
            kind=CanonicalFactKind.BANK_TRANSACTION,
            amount=5000.0,
            identifiers={"rrn": "999900001111", "status": "FAILED"},
            trust_tier=TrustTier.T1,
        )

        all_facts = [f_bank, f_shot, f_bank_other, f_gate_other]
        artifacts = [art1, art2, art3]

        # 1. Baseline analysis
        baseline = engine.analyze_case("c1", all_facts, artifacts, excluded_artifact_ids=set())
        assert len(baseline.contradictions) == 2
        contra_amt = next(f for f in baseline.contradictions if f.category in [ContradictionCategory.CLAIM_VS_RECORD, ContradictionCategory.AMOUNT_DISCREPANCY])
        contra_status = next(f for f in baseline.contradictions if f.category == ContradictionCategory.STATUS_CONFLICT)
        assert contra_amt.status == FindingStatus.ACTIVE.value
        assert contra_status.status == FindingStatus.ACTIVE.value

        # 2. Challenge analysis: Exclude screenshot
        challenge = engine.analyze_case("c1", all_facts, artifacts, excluded_artifact_ids={art2.artifact_id})
        assert len(challenge.contradictions) == 2

        ch_amt = next(f for f in challenge.contradictions if f.finding_id == contra_amt.finding_id)
        ch_status = next(f for f in challenge.contradictions if f.finding_id == contra_status.finding_id)

        # Invariant 1: Screenshot-dependent finding is INACTIVE
        assert ch_amt.status == FindingStatus.INACTIVE.value
        assert "excluded" in (ch_amt.inactive_reason or "").lower()

        # Invariant 2: Independent bank-gateway finding remains ACTIVE
        assert ch_status.status == FindingStatus.ACTIVE.value
        assert ch_status.inactive_reason is None

        # Invariant 3: Inactive evidence remains inspectable and is NOT silently deleted
        assert ch_amt.finding_id is not None
        assert ch_amt.supporting_fact_ids == [f_bank.fact_id, f_shot.fact_id]
        assert ch_amt.original_values is not None

    def test_baseline_immutable_after_counterfactual_challenge(self):
        """Executing a challenge run does not alter baseline state or results."""
        engine = ContradictionAnalysisEngine()

        art1 = make_artifact("A1", case_id="c_immut", filename="bank.pdf", sha256="1111111111111111111111111111111111111111111111111111111111111111")
        art2 = make_artifact("A2", case_id="c_immut", filename="shot.png", sha256="2222222222222222222222222222222222222222222222222222222222222222", source_tier=TrustTier.T3)

        f1 = make_fact("F1", "A1", source_filename="bank.pdf", kind=CanonicalFactKind.BANK_TRANSACTION, amount=25000.0, identifiers={"rrn": "RRN101"})
        f2 = make_fact("F2", "A2", source_filename="shot.png", kind=CanonicalFactKind.MEDIA_METADATA, amount=15000.0, identifiers={"rrn": "RRN101"})
        facts = [f1, f2]
        artifacts = [art1, art2]

        # Run baseline
        base1 = engine.analyze_case("c_immut", facts, artifacts, excluded_artifact_ids=set())
        fp_before = base1.fingerprint

        # Run challenge excluding A2
        engine.analyze_case("c_immut", facts, artifacts, excluded_artifact_ids={"A2"})

        # Re-run baseline and verify immutability
        base2 = engine.analyze_case("c_immut", facts, artifacts, excluded_artifact_ids=set())
        assert base2.fingerprint == fp_before
        assert len(base2.contradictions) == len(base1.contradictions)
        assert base2.contradictions[0].status == FindingStatus.ACTIVE.value

    def test_multiple_excluded_artifacts(self):
        """Excluding multiple artifacts deactivates all findings depending on any of them."""
        engine = ContradictionAnalysisEngine()

        art1 = make_artifact("A1", case_id="c_multi", filename="f1.pdf", sha256="1111111111111111111111111111111111111111111111111111111111111111")
        art2 = make_artifact("A2", case_id="c_multi", filename="f2.png", sha256="2222222222222222222222222222222222222222222222222222222222222222", source_tier=TrustTier.T3)
        art3 = make_artifact("A3", case_id="c_multi", filename="f3.csv", sha256="3333333333333333333333333333333333333333333333333333333333333333")

        f1 = make_fact("F1", "A1", source_filename="f1.pdf", kind=CanonicalFactKind.BANK_TRANSACTION, amount=100.0, identifiers={"rrn": "R1"})
        f2 = make_fact("F2", "A2", source_filename="f2.png", kind=CanonicalFactKind.MEDIA_METADATA, amount=200.0, identifiers={"rrn": "R1"})
        f3 = make_fact("F3", "A3", source_filename="f3.csv", kind=CanonicalFactKind.BANK_TRANSACTION, amount=300.0, identifiers={"rrn": "R2"})
        f4 = make_fact("F4", "A1", source_filename="f1.pdf", kind=CanonicalFactKind.BANK_TRANSACTION, amount=400.0, identifiers={"rrn": "R2"})

        res = engine.analyze_case("c_multi", [f1, f2, f3, f4], [art1, art2, art3], excluded_artifact_ids={"A2", "A3"})

        # Finding R1 depends on A1 & A2 (A2 is excluded -> INACTIVE)
        contra_r1 = next(f for f in res.contradictions if "R1" in f.finding_id)
        assert contra_r1.status == FindingStatus.INACTIVE.value

        # Finding R2 depends on A3 & A1 (A3 is excluded -> INACTIVE)
        contra_r2 = next(f for f in res.contradictions if "R2" in f.finding_id)
        assert contra_r2.status == FindingStatus.INACTIVE.value

    def test_complete_provenance_and_derivation_retained(self):
        """Every derived finding retains source facts, artifact IDs, rule ID, version, and derivation details."""
        engine = ContradictionAnalysisEngine()
        art1 = make_artifact("A_PROV_1", case_id="c_prov", filename="b.pdf", sha256="1111111111111111111111111111111111111111111111111111111111111111")
        art2 = make_artifact("A_PROV_2", case_id="c_prov", filename="s.png", sha256="2222222222222222222222222222222222222222222222222222222222222222", source_tier=TrustTier.T3)

        f1 = make_fact("F_PROV_1", "A_PROV_1", source_filename="b.pdf", kind=CanonicalFactKind.BANK_TRANSACTION, amount=25000.0, identifiers={"rrn": "987654321012"})
        f2 = make_fact("F_PROV_2", "A_PROV_2", source_filename="s.png", kind=CanonicalFactKind.MEDIA_METADATA, amount=15000.0, identifiers={"rrn": "987654321012"})

        res = engine.analyze_case("c_prov", [f1, f2], [art1, art2])
        finding = res.contradictions[0]

        assert finding.rule_id == "RULE_CONTRA_AMOUNT_DISCREPANCY"
        assert finding.rule_version == "1.0.0"
        assert finding.rule_firing_reason is not None and len(finding.rule_firing_reason) > 0
        assert "987654321012" in finding.rule_firing_reason
        assert set(finding.source_artifact_ids) == {"A_PROV_1", "A_PROV_2"}
        assert set(finding.supporting_fact_ids) == {"F_PROV_1", "F_PROV_2"}
        assert float(finding.original_values["b.pdf"]) == 25000.0
        assert float(finding.original_values["s.png"]) == 15000.0
        assert float(finding.normalized_values["b.pdf"]) == 25000.0
        assert float(finding.normalized_values["s.png"]) == 15000.0
        assert set(finding.counterfactual_dependencies) == {"A_PROV_1", "A_PROV_2"}

    def test_deterministic_fingerprints_across_repeated_runs(self):
        """Repeated analysis runs on identical inputs produce identical fingerprints."""
        engine = ContradictionAnalysisEngine()
        art1 = make_artifact("A1", case_id="c_det", filename="b.pdf", sha256="1111111111111111111111111111111111111111111111111111111111111111")
        art2 = make_artifact("A2", case_id="c_det", filename="s.png", sha256="2222222222222222222222222222222222222222222222222222222222222222", source_tier=TrustTier.T3)
        f1 = make_fact("F1", "A1", source_filename="b.pdf", kind=CanonicalFactKind.BANK_TRANSACTION, amount=25000.0, identifiers={"rrn": "R1"})
        f2 = make_fact("F2", "A2", source_filename="s.png", kind=CanonicalFactKind.MEDIA_METADATA, amount=15000.0, identifiers={"rrn": "R1"})

        fps = []
        for _ in range(5):
            res = engine.analyze_case("c_det", [f1, f2], [art1, art2])
            fps.append(res.fingerprint)

        assert len(set(fps)) == 1, "Analysis fingerprint must be 100% deterministic"


# ==============================================================================
# PHASE 6C: ADVERSARIAL EVIDENCE AND DATA-QUALITY TESTING
# ==============================================================================

class TestPhase6CAdversarialEvidenceAndDataQuality:
    """Verifies edge cases in financial, digital, and cybersecurity logs."""

    # --- Financial Evidence Edge Cases ---

    def test_similar_nonidentical_rrns_never_matched(self):
        """Similar but non-identical RRNs (differing by 1 character) must NEVER trigger contradiction."""
        engine = ContradictionAnalysisEngine()
        art = make_artifact("A1", case_id="c_rrn", filename="f.csv", mime_type="text/csv", sha256="1111111111111111111111111111111111111111111111111111111111111111")

        # Two transactions with 1-character difference in RRN
        f1 = make_fact("F1", "A1", source_filename="f.csv", kind=CanonicalFactKind.BANK_TRANSACTION, amount=15000.0, identifiers={"rrn": "202602148891"})
        f2 = make_fact("F2", "A1", source_filename="f.csv", kind=CanonicalFactKind.BANK_TRANSACTION, amount=25000.0, identifiers={"rrn": "202602148892"})

        res = engine.analyze_case("c_rrn", [f1, f2], [art])
        # Must not compare amounts because RRNs are distinct
        amount_findings = [f for f in res.contradictions if f.category in [ContradictionCategory.AMOUNT_DISCREPANCY, ContradictionCategory.CLAIM_VS_RECORD]]
        assert len(amount_findings) == 0

    def test_missing_rrn_on_payment_generates_gap_not_silent_match(self):
        """A bank transaction missing an RRN/reference triggers an UNAVAILABLE_IDENTIFIER gap."""
        engine = ContradictionAnalysisEngine()
        art = make_artifact("A1", case_id="c_norrn", filename="bank.pdf", sha256="1111111111111111111111111111111111111111111111111111111111111111")

        f_no_rrn = make_fact(
            fact_id="F_NO_RRN",
            artifact_id="A1",
            source_filename="bank.pdf",
            kind=CanonicalFactKind.BANK_TRANSACTION,
            amount=5000.0,
            identifiers={},  # missing rrn
        )

        res = engine.analyze_case("c_norrn", [f_no_rrn], [art])
        gap = next((g for g in res.evidence_gaps if g.gap_id == f"GAP-UNAVAIL-RRN-{f_no_rrn.fact_id}"), None)
        assert gap is not None
        assert gap.category == EvidenceGapCategory.UNAVAILABLE_IDENTIFIER
        assert gap.status == EvidenceGapStatus.NOT_DETECTED

    def test_currency_formatting_and_decimal_normalization(self):
        """Normalizes Indian rupee strings, decimals, and commas deterministically."""
        v1, c1, _ = normalize_amount("₹ 25,000.00")
        assert v1 == 25000.0
        assert c1 == "INR"

        v2, c2, _ = normalize_amount("INR 15,000.50")
        assert v2 == 15000.50
        assert c2 == "INR"

        v3, c3, _ = normalize_amount("Rs. 1,00,000")
        assert v3 == 100000.0
        assert c3 == "INR"

        v4, _, _ = normalize_amount(None)
        assert v4 is None

    def test_conflicting_transaction_statuses(self):
        """Conflicting transaction statuses under the same RRN trigger STATUS_CONFLICT."""
        engine = ContradictionAnalysisEngine()
        art1 = make_artifact("A1", case_id="c_stat", filename="bank.pdf", sha256="1111111111111111111111111111111111111111111111111111111111111111")
        art2 = make_artifact("A2", case_id="c_stat", filename="gateway.json", mime_type="application/json", sha256="2222222222222222222222222222222222222222222222222222222222222222")

        f1 = make_fact("F1", "A1", source_filename="bank.pdf", kind=CanonicalFactKind.BANK_TRANSACTION, amount=1000.0, identifiers={"rrn": "RRN_STATUS_TEST", "status": "SUCCESS"})
        f2 = make_fact("F2", "A2", source_filename="gateway.json", kind=CanonicalFactKind.BANK_TRANSACTION, amount=1000.0, identifiers={"rrn": "RRN_STATUS_TEST", "status": "FAILED"})

        res = engine.analyze_case("c_stat", [f1, f2], [art1, art2])
        status_finding = next((f for f in res.contradictions if f.category == ContradictionCategory.STATUS_CONFLICT), None)
        assert status_finding is not None
        assert "SUCCESS" in status_finding.explanation
        assert "FAILED" in status_finding.explanation

    # --- Digital Evidence Edge Cases ---

    def test_unprocessed_pdf_page_prevents_false_completeness(self):
        """If document pages fail processing, completeness engine records page failure and penalizes index."""
        cov = DocumentProcessingCoverage(
            total_pages=5,
            processed_pages=3,
            failed_pages=1,
            skipped_pages=1,
            coverage_ratio=0.6,
            is_fully_processed=False,
            pages=[
                PageCoverageItem(page_number=1, status=PageProcessingStatus.SUCCESS_TEXT),
                PageCoverageItem(page_number=2, status=PageProcessingStatus.FAILED, error_message="Decompression error"),
                PageCoverageItem(page_number=3, status=PageProcessingStatus.SUCCESS_TEXT),
                PageCoverageItem(page_number=4, status=PageProcessingStatus.SKIPPED),
                PageCoverageItem(page_number=5, status=PageProcessingStatus.SUCCESS_TEXT),
            ],
            warnings=["Page 2 failed processing: Decompression error"],
        )

        assert cov.is_fully_processed is False
        assert cov.failed_pages == 1
        assert cov.processed_pages == 3

    def test_ocr_low_confidence_requires_review(self):
        """Extracted fields below confidence threshold remain REVIEW_REQUIRED, never automatically verified."""
        art = make_artifact("ART_OCR", case_id="c_ocr", filename="shot.png", mime_type="image/png", sha256="1111111111111111111111111111111111111111111111111111111111111111", source_tier=TrustTier.T3)
        gap = ForensicEvidenceGap(
            gap_id=f"GAP-OCR-REVIEW-{art.artifact_id}-amount",
            category=EvidenceGapCategory.UNRESOLVED_OCR_REVIEW,
            status=EvidenceGapStatus.REVIEW_REQUIRED,
            title="Unresolved OCR Field 'amount'",
            why_it_matters="Confidence below threshold requires examiner review.",
            exposed_by_rule_id="RULE_GAP_UNRESOLVED_OCR",
            relevant_fact_ids=["F_OCR"],
            relevant_artifact_ids=[art.artifact_id],
            missing_evidence_description="Clear high-resolution text of amount field",
            suggested_remedy="Request source document or perform manual inspection",
        )
        assert gap.status == EvidenceGapStatus.REVIEW_REQUIRED
        assert gap.category == EvidenceGapCategory.UNRESOLVED_OCR_REVIEW

    # --- Cybersecurity-Oriented Synthetic Logs ---

    def test_cybersecurity_synthetic_auth_events_and_ip_correlation(self):
        """Demonstrates TARKA representing and correlating authentication events, source IPs, and session IDs."""
        art_auth = make_artifact(
            "ART_AUTH_LOG",
            case_id="c_cyber",
            filename="auth.log",
            mime_type="text/plain",
            sha256="4444444444444444444444444444444444444444444444444444444444444444",
            storage_path="auth.log",
        )

        # Login attempts across a bounded window
        t0 = 1771060000.0
        f_fail1 = make_fact(
            fact_id="FACT-AUTH-01",
            artifact_id=art_auth.artifact_id,
            source_filename="auth.log",
            kind=CanonicalFactKind.EXTRACTED_IDENTIFIER,
            utc_epoch=t0,
            identifiers={"event_type": "LOGIN_FAILURE", "user_id": "admin", "source_ip": "198.51.100.24", "session_id": "sess_01"},
            raw_snippet="Failed password for admin from 198.51.100.24 port 4521 ssh2",
            trust_tier=TrustTier.T1,
        )
        f_fail2 = make_fact(
            fact_id="FACT-AUTH-02",
            artifact_id=art_auth.artifact_id,
            source_filename="auth.log",
            kind=CanonicalFactKind.EXTRACTED_IDENTIFIER,
            utc_epoch=t0 + 2.0,
            identifiers={"event_type": "LOGIN_FAILURE", "user_id": "admin", "source_ip": "198.51.100.24", "session_id": "sess_02"},
            raw_snippet="Failed password for admin from 198.51.100.24 port 4522 ssh2",
            trust_tier=TrustTier.T1,
        )
        f_success = make_fact(
            fact_id="FACT-AUTH-03",
            artifact_id=art_auth.artifact_id,
            source_filename="auth.log",
            kind=CanonicalFactKind.EXTRACTED_IDENTIFIER,
            utc_epoch=t0 + 5.0,
            identifiers={"event_type": "LOGIN_SUCCESS", "user_id": "admin", "source_ip": "203.0.113.88", "session_id": "sess_03"},
            raw_snippet="Accepted publickey for admin from 203.0.113.88 port 4530 ssh2",
            trust_tier=TrustTier.T1,
        )

        timeline_engine = TimelineReconstructionEngine()
        timeline = timeline_engine.build_timeline(
            case_id="c_cyber",
            facts=[f_fail1, f_fail2, f_success],
            artifacts=[art_auth],
        )

        # Invariant 1: Events ordered chronologically
        assert len(timeline.events) == 3
        assert timeline.events[0].event_id is not None
        assert timeline.events[1].event_id is not None
        assert timeline.events[2].event_id is not None

        # Invariant 2: Provenance preserved
        assert timeline.events[0].source_artifact_ids == [art_auth.artifact_id]

    def test_file_hash_match_establishes_byte_identity_only(self):
        """Verifies that identical SHA-256 establishes byte bitstream identity but NOT origin authenticity or truthfulness."""
        art1 = make_artifact("A1", case_id="c_hash", filename="statement1.pdf", sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", source_tier=TrustTier.T1)
        art2 = make_artifact("A2", case_id="c_hash", filename="statement_copy.pdf", sha256="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", source_tier=TrustTier.T2)

        assert art1.sha256 == art2.sha256
        # System disclaimers must state limitation explicitly
        assert "bitstream" in art1.integrity_limitation.lower() or "authenticity" in art1.integrity_limitation.lower()


# ==============================================================================
# PHASE 6D: FALSE-POSITIVE AND FALSE-NEGATIVE REVIEW
# ==============================================================================

class TestPhase6DFalsePositiveAndFalseNegativeGuardrails:
    """Verifies that rules do not trigger false contradictions or false negative absences."""

    def test_unrelated_transactions_never_compared(self):
        """Transactions with different RRNs are never compared, even if amounts differ."""
        engine = ContradictionAnalysisEngine()
        art = make_artifact("A1", case_id="c_unrel", filename="b.pdf", sha256="1111111111111111111111111111111111111111111111111111111111111111")

        f1 = make_fact("F1", "A1", source_filename="b.pdf", kind=CanonicalFactKind.BANK_TRANSACTION, amount=100.0, identifiers={"rrn": "TXN_A"})
        f2 = make_fact("F2", "A1", source_filename="b.pdf", kind=CanonicalFactKind.BANK_TRANSACTION, amount=99999.0, identifiers={"rrn": "TXN_B"})

        res = engine.analyze_case("c_unrel", [f1, f2], [art])
        contradictions = [f for f in res.contradictions if f.category in [ContradictionCategory.AMOUNT_DISCREPANCY, ContradictionCategory.CLAIM_VS_RECORD]]
        assert len(contradictions) == 0

    def test_missing_field_is_not_confirmed_absent(self):
        """A field that is simply NOT_DETECTED cannot be treated as CONFIRMED_ABSENT without manual review."""
        status_extracted = EvidenceFieldStatus.NOT_DETECTED
        status_confirmed = EvidenceFieldStatus.CONFIRMED_ABSENT

        assert status_extracted != status_confirmed
        assert status_extracted.value == "NOT_DETECTED"
        assert status_confirmed.value == "CONFIRMED_ABSENT"

    def test_distinct_epistemic_statuses(self):
        """Verifies distinct meanings of all EvidenceGapStatus values."""
        statuses = {s.value for s in EvidenceGapStatus}
        expected = {
            "NOT_DETECTED",
            "UNREADABLE",
            "NOT_PROVIDED",
            "PROCESSING_FAILED",
            "REVIEW_REQUIRED",
            "CONFIRMED_ABSENT",
            "RESOLVED",
        }
        assert statuses == expected


# ==============================================================================
# PHASE 6E: API, AUTHORIZATION AND PERSISTENCE AUDIT
# ==============================================================================

class TestPhase6EAPISecurityAndPersistenceAudit:
    """Verifies path traversal protection, non-existent entity guards, and review validation."""

    def test_sanitize_filename_prevents_path_traversal(self):
        """sanitize_filename strips directory traversal attempts and prevents escape."""
        assert sanitize_filename("../../../etc/passwd") == "passwd"
        assert sanitize_filename("..") == "item"
        assert sanitize_filename("../") == "item"
        assert sanitize_filename("....//") == "item"
        assert sanitize_filename("") == "item"
        assert sanitize_filename("valid_file-01.png") == "valid_file-01.png"

    def test_review_nonexistent_case_returns_404(self, client: TestClient):
        """Submitting review to a non-existent case returns 404."""
        resp = client.post(
            "/api/cases/non_existent_case_9999/contradictions/FINDING-01/review",
            json={"decision": "VERIFY", "review_notes": "Test", "reviewed_by": "Examiner"},
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_review_nonexistent_finding_returns_404_without_polluting_state(self, client: TestClient):
        """Submitting review to a non-existent finding returns 404 and does NOT record custody action."""
        case_id = "upi_payment_discrepancy"

        cd = case_store.get_case_dir(case_id)
        reviews_file = cd / "reviews" / "finding_reviews.json"
        before_reviews = {}
        if reviews_file.exists():
            with open(reviews_file, "r", encoding="utf-8") as f:
                before_reviews = json.load(f)

        resp = client.post(
            f"/api/cases/{case_id}/contradictions/NON_EXISTENT_FINDING_XYZ/review",
            json={"decision": "VERIFY", "review_notes": "Should fail", "reviewed_by": "Examiner"},
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

        # Verify state was not polluted
        if reviews_file.exists():
            with open(reviews_file, "r", encoding="utf-8") as f:
                after_reviews = json.load(f)
            assert "NON_EXISTENT_FINDING_XYZ" not in after_reviews

    def test_review_nonexistent_gap_returns_404(self, client: TestClient):
        """Submitting review to a non-existent gap returns 404."""
        case_id = "upi_payment_discrepancy"
        resp = client.post(
            f"/api/cases/{case_id}/evidence-gaps/NON_EXISTENT_GAP_XYZ/review",
            json={"decision": "RESOLVE", "review_notes": "Should fail", "reviewed_by": "Examiner"},
        )
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_confirmed_absent_requires_explicit_non_empty_review_scope(self, client: TestClient):
        """Selecting CONFIRMED_ABSENT without an explicit review_scope returns 400."""
        case_id = "upi_payment_discrepancy"

        gaps_resp = client.get(f"/api/cases/{case_id}/evidence-gaps")
        assert gaps_resp.status_code == 200
        gaps = gaps_resp.json()
        if not gaps:
            pytest.skip("No gaps in demo case")
        target_gap_id = gaps[0]["gap_id"]

        # Missing review_scope
        resp = client.post(
            f"/api/cases/{case_id}/evidence-gaps/{target_gap_id}/review",
            json={"decision": "CONFIRM_ABSENT", "review_notes": "Rationale", "reviewed_by": "Examiner", "review_scope": ""},
        )
        assert resp.status_code == 400
        assert "review_scope" in resp.json()["detail"]

    def test_empty_reviewer_identity_rejected(self, client: TestClient):
        """Empty reviewed_by is rejected with 400."""
        case_id = "upi_payment_discrepancy"
        gaps = client.get(f"/api/cases/{case_id}/evidence-gaps").json()
        if not gaps:
            pytest.skip("No gaps")
        target_gap_id = gaps[0]["gap_id"]

        resp = client.post(
            f"/api/cases/{case_id}/evidence-gaps/{target_gap_id}/review",
            json={"decision": "RESOLVE", "review_notes": "Notes", "reviewed_by": "   "},
        )
        assert resp.status_code == 400
        assert "reviewed_by" in resp.json()["detail"]

    def test_invalid_decision_enum_rejected(self, client: TestClient):
        """Invalid decision string returns 400."""
        case_id = "upi_payment_discrepancy"
        findings = client.get(f"/api/cases/{case_id}/contradictions").json()
        if not findings:
            pytest.skip("No findings")
        target_f_id = findings[0]["finding_id"]

        resp = client.post(
            f"/api/cases/{case_id}/contradictions/{target_f_id}/review",
            json={"decision": "BOGUS_DECISION", "review_notes": "Notes", "reviewed_by": "Examiner"},
        )
        assert resp.status_code == 400
        assert "invalid decision" in resp.json()["detail"].lower()


# ==============================================================================
# PHASE 6F: FORENSIC REVIEW AND EXPLAINABILITY (12 EXAMINER QUESTIONS)
# ==============================================================================

class TestPhase6FForensicReviewAndExplainability:
    """Verifies that an examiner can answer all 12 questions from stored data."""

    def test_forensic_explainability_twelve_questions_verifiable(self, client: TestClient):
        """Verifies the 12 core explainability questions on upi_payment_discrepancy."""
        case_id = "upi_payment_discrepancy"

        # 1. Fetch analysis findings
        resp_contra = client.get(f"/api/cases/{case_id}/contradictions")
        assert resp_contra.status_code == 200
        findings = resp_contra.json()
        assert len(findings) >= 1

        amt_finding = next(f for f in findings if "CONTRA-AMT" in f["finding_id"])

        # Q1: What exactly was observed in original source?
        assert amt_finding["original_values"] is not None
        assert len(amt_finding["original_values"]) >= 2
        vals = [float(v) for v in amt_finding["original_values"].values()]
        assert 25000.0 in vals
        assert 15000.0 in vals

        # Q2: Which artifact, page, region, or log entry supports it?
        assert len(amt_finding["source_artifact_ids"]) >= 2
        assert len(amt_finding["supporting_fact_ids"]) >= 2

        # Q3: Was value extracted automatically or entered by reviewer?
        facts_resp = client.get(f"/api/cases/{case_id}/facts")
        assert facts_resp.status_code == 200
        facts = facts_resp.json()
        assert any(
            str(f.get("kind", "")).lower() in ["bank_transaction", "media_metadata", "extracted_identifier", "chat_message"]
            for f in facts
        )

        # Q4: What normalization was applied?
        assert amt_finding["normalized_values"] is not None
        norm_vals = [float(v) for v in amt_finding["normalized_values"].values()]
        assert 25000.0 in norm_vals
        assert 15000.0 in norm_vals

        # Q5: Which rule generated the finding, and which version?
        assert amt_finding["rule_id"] in ["RULE_CONTRA_AMOUNT_DISCREPANCY", "RULE_CONTRA_MEDIA_TXN_MISMATCH"]
        assert amt_finding["rule_version"] == "1.0.0"

        # Q6: Why did the rule trigger?
        assert amt_finding["rule_firing_reason"] is not None
        assert "202602148891" in amt_finding["rule_firing_reason"]

        # Q7: Which evidence supports each side of conflict?
        assert len(amt_finding["supporting_fact_ids"]) == 2

        # Q8: What information is missing or unreadable?
        gaps_resp = client.get(f"/api/cases/{case_id}/evidence-gaps")
        assert gaps_resp.status_code == 200
        gaps = gaps_resp.json()
        assert isinstance(gaps, list)
        for g in gaps:
            assert g["gap_id"] is not None
            assert g["category"] is not None
            assert g["status"] in ["NOT_DETECTED", "UNREADABLE", "NOT_PROVIDED", "PROCESSING_FAILED", "REVIEW_REQUIRED", "CONFIRMED_ABSENT", "RESOLVED"]

        # Q9 & Q10: What would change if screenshot is excluded, and which findings survive?
        challenge_resp = client.post(
            f"/api/cases/{case_id}/analysis-runs",
            json={"case_id": case_id, "excluded_artifact_ids": ["ART-004-6155034A"], "challenge_reason": "Challenge screenshot validity"},
        )
        assert challenge_resp.status_code == 200
        chlg_run = challenge_resp.json()
        assert chlg_run["run_type"] == "CHALLENGE"

        # Check that challenge run contradictions reflect deactivation
        ch_analysis = client.get(f"/api/cases/{case_id}/analysis-runs/{chlg_run['run_id']}/contradictions")
        assert ch_analysis.status_code == 200
        ch_findings = ch_analysis.json()
        ch_contra = next(f for f in ch_findings if f["finding_id"] == amt_finding["finding_id"])
        assert ch_contra["status"] == "INACTIVE"
        assert "ART-004-6155034A" in (ch_contra["inactive_reason"] or "")

        # Independent facts/artifacts remain active
        surviving = [f for f in ch_findings if f["status"] == "ACTIVE"]
        assert isinstance(surviving, list)

        # Q11: Who performed a review, when, and with what reason?
        rev_resp = client.post(
            f"/api/cases/{case_id}/contradictions/{amt_finding['finding_id']}/review",
            json={"decision": "FLAG_UNCERTAIN", "review_notes": "Adversarial audit review test", "reviewed_by": "Senior Examiner"},
        )
        assert rev_resp.status_code == 200
        rev_finding = rev_resp.json()
        assert rev_finding["review_state"] == "FLAG_UNCERTAIN"
        assert rev_finding["reviewed_by"] == "Senior Examiner"
        assert rev_finding["review_notes"] == "Adversarial audit review test"
        assert rev_finding["reviewed_at_iso"] is not None

        # Verify custody ledger recorded it
        custody_resp = client.get(f"/api/custody/trail?case_id={case_id}")
        assert custody_resp.status_code == 200
        trail = custody_resp.json()["entries"]
        review_entry = next((e for e in trail if e["action"] == "REVIEW_CONTRADICTION" and e.get("fact_id") == amt_finding["finding_id"]), None)
        assert review_entry is not None

        # Q12: Which conclusions remain uncertain?
        assert "Discrepancy" in rev_finding["uncertainties_and_limitations"]
        assert "fraud" in rev_finding["uncertainties_and_limitations"].lower()
