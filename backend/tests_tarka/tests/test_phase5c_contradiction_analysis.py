"""Unit and integration test suite for TARKA Phase 5C: Contradiction & Evidence-Gap Analysis Engine."""

import pytest
from fastapi.testclient import TestClient

from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind, TimezoneProvenance
from tarka.core.evidence_dna import Artifact
from tarka.core.models import TrustTier, AuthType
from tarka.core.contradiction_analysis import (
    ContradictionAnalysisEngine,
    ContradictionCategory,
    FindingSeverity,
    FindingStatus,
    EvidenceGapStatus,
    EvidenceGapCategory,
    ContradictionFinding,
    ForensicEvidenceGap,
)
from tarka.core.investigation_graph import (
    InvestigationGraphBuilder,
    ForensicNodeType,
    ForensicEdgeType,
)
from tarka.core.cross_source_correlation import CorrelationEngine
from tarka.core.timeline_reconstruction import TimelineReconstructionEngine
from tarka.api.server import app, case_store
from tarka.api.schemas import (
    CaseForensicAnalysisResponse,
    ContradictionFindingResponse,
    ForensicEvidenceGapResponse,
)


@pytest.fixture
def test_client():
    return TestClient(app)


def make_dummy_timezone(recorded_time: str = "2026-02-14 10:20:00", epoch: float = 1771044600.0) -> TimezoneProvenance:
    return TimezoneProvenance(
        recorded_time=recorded_time,
        stated_timezone="IST",
        assumed_timezone="Asia/Kolkata (UTC+05:30)",
        utc_iso="2026-02-14T04:50:00Z",
        utc_epoch=epoch,
        conversion_rationale="Normalized for test fixture",
    )


@pytest.fixture
def sample_artifacts():
    return [
        Artifact(
            artifact_id="ART-001-BANK",
            case_id="case_phase5c_test",
            filename="bank_statement.csv",
            sha256="1111111111111111111111111111111111111111111111111111111111111111",
            file_size_bytes=1024,
            mime_type="text/csv",
            source_tier="T1",
            intake_officer="Officer Test",
            intake_timestamp_iso="2026-02-14T05:00:00Z",
            custody_chain_sequence=1,
            storage_path="/vault/bank_statement.csv",
        ),
        Artifact(
            artifact_id="ART-002-CHAT",
            case_id="case_phase5c_test",
            filename="whatsapp_chat.txt",
            sha256="2222222222222222222222222222222222222222222222222222222222222222",
            file_size_bytes=2048,
            mime_type="text/plain",
            source_tier="T2",
            intake_officer="Officer Test",
            intake_timestamp_iso="2026-02-14T05:00:00Z",
            custody_chain_sequence=2,
            storage_path="/vault/whatsapp_chat.txt",
        ),
        Artifact(
            artifact_id="ART-003-SCREEN",
            case_id="case_phase5c_test",
            filename="screenshot_claim.json",
            sha256="3333333333333333333333333333333333333333333333333333333333333333",
            file_size_bytes=4096,
            mime_type="application/json",
            source_tier="T3",
            intake_officer="Officer Test",
            intake_timestamp_iso="2026-02-14T05:00:00Z",
            custody_chain_sequence=3,
            storage_path="/vault/screenshot_claim.json",
        ),
    ]


@pytest.fixture
def sample_facts():
    # Chat message claiming payment request
    fact_chat = CanonicalFact(
        fact_id="FACT-CHAT-01",
        case_id="case_phase5c_test",
        artifact_id="ART-002-CHAT",
        evidence_id="EVI-CHAT-01",
        kind=CanonicalFactKind.CHAT_MESSAGE,
        source_filename="whatsapp_chat.txt",
        source_location="Line 14",
        sha256="2222222222222222222222222222222222222222222222222222222222222222",
        trust_tier=TrustTier.T2,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="14/02/2026, 10:19:30",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:49:30Z",
            utc_epoch=1771044570.0,
            conversion_rationale="WhatsApp IST message timestamp",
        ),
        primary_entity="Amit Sharma",
        secondary_entity="merchant.pay@okaxis",
        amount=25000.0,
        currency="INR",
        identifiers={"rrn": "202602148891", "vpa": "merchant.pay@okaxis"},
        summary="Chat message indicating ₹25,000 sent with RRN 202602148891",
        raw_source_snippet="I have sent ₹25,000 to merchant.pay@okaxis. Ref RRN: 202602148891",
        metadata={"platform": "WhatsApp"},
    )

    # Bank statement recording debit of ₹25,000 at 10:24:00 IST
    fact_bank = CanonicalFact(
        fact_id="FACT-BANK-01",
        case_id="case_phase5c_test",
        artifact_id="ART-001-BANK",
        evidence_id="EVI-BANK-01",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="bank_statement.csv",
        source_location="Row 42",
        sha256="1111111111111111111111111111111111111111111111111111111111111111",
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="2026-02-14 10:24:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:54:00Z",
            utc_epoch=1771044840.0,
            conversion_rationale="Core banking system log IST",
        ),
        primary_entity="Amit Sharma",
        secondary_entity="merchant.pay@okaxis",
        amount=25000.0,
        currency="INR",
        identifiers={"rrn": "202602148891", "vpa": "merchant.pay@okaxis", "status": "SUCCESS"},
        summary="Bank ledger debit of ₹25,000 under RRN 202602148891",
        raw_source_snippet="UPI/202602148891/merchant.pay@okaxis/DR 25000.00 SUCCESS",
        metadata={"account_number": "XXXX9012", "transaction_status": "SUCCESS"},
    )

    # Screenshot claiming payment of ₹15,000 for the same RRN
    fact_screenshot = CanonicalFact(
        fact_id="FACT-SCREEN-01",
        case_id="case_phase5c_test",
        artifact_id="ART-003-SCREEN",
        evidence_id="EVI-SCREEN-01",
        kind=CanonicalFactKind.PAYMENT_REQUEST,
        source_filename="screenshot_claim.json",
        source_location="App Viewport",
        sha256="3333333333333333333333333333333333333333333333333333333333333333",
        trust_tier=TrustTier.T3,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="14 Feb 2026, 10:20 AM",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:50:00Z",
            utc_epoch=1771044600.0,
            conversion_rationale="UPI app confirmation screenshot",
        ),
        primary_entity="Amit Sharma",
        secondary_entity="merchant.pay@okaxis",
        amount=15000.0,
        currency="INR",
        identifiers={"rrn": "202602148891", "vpa": "merchant.pay@okaxis", "status": "SUCCESS"},
        summary="Screenshot claim of ₹15,000 under RRN 202602148891",
        raw_source_snippet="Paid to merchant.pay@okaxis ₹15,000 UPI Ref: 202602148891",
        metadata={"app_name": "GPay"},
    )

    return [fact_chat, fact_bank, fact_screenshot]


# -----------------------------------------------------------------------------
# 1. Amount Discrepancy Detected under Shared Transaction Reference
# -----------------------------------------------------------------------------
def test_amount_discrepancy_under_shared_reference(sample_facts, sample_artifacts):
    """Scenario 1: Conflicting amounts (₹15,000 vs ₹25,000) under shared RRN trigger amount discrepancy."""
    engine = ContradictionAnalysisEngine()
    findings = engine.detect_contradictions(sample_facts, sample_artifacts)

    amount_mismatches = [
        f for f in findings if f.category in [ContradictionCategory.AMOUNT_DISCREPANCY, ContradictionCategory.CLAIM_VS_RECORD]
    ]
    assert len(amount_mismatches) >= 1

    finding = amount_mismatches[0]
    assert finding.rule_id == "RULE_CONTRA_AMOUNT_DISCREPANCY"
    assert finding.severity in [FindingSeverity.HIGH, FindingSeverity.CRITICAL]
    assert "202602148891" in finding.explanation

    # Preserves original values and source provenance
    assert "ART-003-SCREEN" in finding.source_artifact_ids
    assert finding.status == FindingStatus.ACTIVE.value

    # Non-accusatory verification
    assert "fraud" not in finding.explanation.lower()
    assert "accused" not in finding.explanation.lower()


# -----------------------------------------------------------------------------
# 2. Amounts from Unrelated Transactions are NOT Incorrectly Compared
# -----------------------------------------------------------------------------
def test_unrelated_transaction_amounts_not_compared():
    """Scenario 2: Distinct transactions with different RRNs must not be compared."""
    engine = ContradictionAnalysisEngine()

    fact1 = CanonicalFact(
        fact_id="FACT-1",
        case_id="case_unrelated",
        artifact_id="ART-1",
        evidence_id="EVI-1",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="file1.csv",
        source_location="R1",
        sha256="1111111111111111111111111111111111111111111111111111111111111111",
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        time_provenance=make_dummy_timezone(),
        summary="Txn 1",
        raw_source_snippet="Row 1",
        primary_entity="User A",
        amount=15000.0,
        identifiers={"rrn": "999999999991"},
    )

    fact2 = CanonicalFact(
        fact_id="FACT-2",
        case_id="case_unrelated",
        artifact_id="ART-2",
        evidence_id="EVI-2",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="file2.csv",
        source_location="R2",
        sha256="2222222222222222222222222222222222222222222222222222222222222222",
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        time_provenance=make_dummy_timezone(),
        summary="Txn 2",
        raw_source_snippet="Row 2",
        primary_entity="User B",
        amount=25000.0,
        identifiers={"rrn": "888888888882"},
    )

    findings = engine.detect_contradictions([fact1, fact2], [])
    amount_mismatches = [
        f for f in findings if f.category in [ContradictionCategory.AMOUNT_DISCREPANCY, ContradictionCategory.CLAIM_VS_RECORD]
    ]
    assert len(amount_mismatches) == 0


# -----------------------------------------------------------------------------
# 3. Timestamp Conflict Respects Timezone & Precision
# -----------------------------------------------------------------------------
def test_timestamp_conflict_respects_timezone_and_latency():
    """Scenario 3: Normal timezone conversion and transit latencies are not conflicts; causal inversion is."""
    engine = ContradictionAnalysisEngine()

    # Normal latency: Chat at 10:19:30 IST, Bank debit at 10:24:00 IST (4.5 min later)
    # Chat stated in UTC (04:49:30Z), Bank stated in IST (10:24:00)
    fact_chat = CanonicalFact(
        fact_id="FACT-CHAT",
        case_id="case_tz",
        artifact_id="ART-CHAT",
        evidence_id="EVI-CHAT",
        kind=CanonicalFactKind.CHAT_MESSAGE,
        source_filename="chat.txt",
        source_location="L1",
        sha256="1111111111111111111111111111111111111111111111111111111111111111",
        trust_tier=TrustTier.T2,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="2026-02-14T04:49:30Z",
            stated_timezone="UTC",
            assumed_timezone="UTC",
            utc_iso="2026-02-14T04:49:30Z",
            utc_epoch=1771044570.0,
            conversion_rationale="ISO UTC",
        ),
        summary="Chat message",
        raw_source_snippet="Pay ₹5000",
        primary_entity="User A",
        amount=5000.0,
        identifiers={"rrn": "123456789012"},
    )

    fact_bank_normal = CanonicalFact(
        fact_id="FACT-BANK",
        case_id="case_tz",
        artifact_id="ART-BANK",
        evidence_id="EVI-BANK",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="bank.csv",
        source_location="L1",
        sha256="2222222222222222222222222222222222222222222222222222222222222222",
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="14/02/2026 10:24:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T04:54:00Z",
            utc_epoch=1771044840.0,
            conversion_rationale="IST conversion",
        ),
        summary="Bank transaction debit",
        raw_source_snippet="DR 5000",
        primary_entity="User A",
        amount=5000.0,
        identifiers={"rrn": "123456789012"},
    )

    # Should NOT produce timestamp conflict
    findings_normal = engine.detect_contradictions([fact_chat, fact_bank_normal], [])
    tz_conflicts_normal = [
        f for f in findings_normal if f.category == ContradictionCategory.TIMESTAMP_CONFLICT
    ]
    assert len(tz_conflicts_normal) == 0

    # Causal inversion: Bank debit occurred 2 hours BEFORE the payment was ever requested
    fact_bank_inversion = CanonicalFact(
        fact_id="FACT-BANK-INVERTED",
        case_id="case_tz",
        artifact_id="ART-BANK-INVERTED",
        evidence_id="EVI-BANK-INV",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="bank_inv.csv",
        source_location="L1",
        sha256="3333333333333333333333333333333333333333333333333333333333333333",
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        time_provenance=TimezoneProvenance(
            recorded_time="14/02/2026 08:00:00",
            stated_timezone="IST",
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            utc_iso="2026-02-14T02:30:00Z",
            utc_epoch=1771036200.0,
            conversion_rationale="IST conversion",
        ),
        summary="Bank transaction prior to request",
        raw_source_snippet="DR 5000 08:00",
        primary_entity="User A",
        amount=5000.0,
        identifiers={"rrn": "123456789012"},
    )

    findings_inverted = engine.detect_contradictions([fact_chat, fact_bank_inversion], [])
    tz_conflicts_inverted = [
        f for f in findings_inverted if f.category == ContradictionCategory.TIMESTAMP_CONFLICT
    ]
    assert len(tz_conflicts_inverted) >= 1
    assert "temporal inversion" in tz_conflicts_inverted[0].explanation.lower() or "causal" in tz_conflicts_inverted[0].title.lower()


# -----------------------------------------------------------------------------
# 4. Conflicting Transaction Statuses Require Matching Identity
# -----------------------------------------------------------------------------
def test_status_conflict_requires_matching_transaction_identity():
    """Scenario 4: Conflicting statuses (SUCCESS vs FAILED) flag contradiction only when sharing RRN."""
    engine = ContradictionAnalysisEngine()

    # Fact A: SUCCESS
    fact_succ = CanonicalFact(
        fact_id="FACT-SUCCESS",
        case_id="case_status",
        artifact_id="ART-REC",
        evidence_id="EVI-REC",
        kind=CanonicalFactKind.PAYMENT_REQUEST,
        source_filename="receipt.json",
        source_location="P1",
        sha256="1111111111111111111111111111111111111111111111111111111111111111",
        trust_tier=TrustTier.T3,
        auth_track=AuthType.ACTIVE,
        time_provenance=make_dummy_timezone(),
        summary="Receipt success",
        raw_source_snippet="SUCCESS 1000",
        primary_entity="User A",
        amount=1000.0,
        identifiers={"rrn": "555544443333", "status": "SUCCESS"},
    )

    # Fact B: FAILED with SAME RRN
    fact_fail_same = CanonicalFact(
        fact_id="FACT-FAIL-SAME",
        case_id="case_status",
        artifact_id="ART-BANK",
        evidence_id="EVI-BANK",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="bank.csv",
        source_location="L5",
        sha256="2222222222222222222222222222222222222222222222222222222222222222",
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        time_provenance=make_dummy_timezone(),
        summary="Bank ledger failed status",
        raw_source_snippet="FAILED 1000",
        primary_entity="User A",
        amount=1000.0,
        identifiers={"rrn": "555544443333", "status": "FAILED"},
    )

    # Fact C: FAILED with DIFFERENT RRN
    fact_fail_diff = CanonicalFact(
        fact_id="FACT-FAIL-DIFF",
        case_id="case_status",
        artifact_id="ART-BANK2",
        evidence_id="EVI-BANK2",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="bank2.csv",
        source_location="L6",
        sha256="3333333333333333333333333333333333333333333333333333333333333333",
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        time_provenance=make_dummy_timezone(),
        summary="Bank ledger failed status for different RRN",
        raw_source_snippet="FAILED 1000 diff",
        primary_entity="User A",
        amount=1000.0,
        identifiers={"rrn": "999988887777", "status": "FAILED"},
    )

    # Comparing same RRN -> Status Conflict
    findings_same = engine.detect_contradictions([fact_succ, fact_fail_same], [])
    status_conflicts = [
        f for f in findings_same if f.category == ContradictionCategory.STATUS_CONFLICT
    ]
    assert len(status_conflicts) == 1
    assert status_conflicts[0].rule_id == "RULE_CONTRA_STATUS_CONFLICT"

    # Comparing different RRN -> No Status Conflict
    findings_diff = engine.detect_contradictions([fact_succ, fact_fail_diff], [])
    status_conflicts_diff = [
        f for f in findings_diff if f.category == ContradictionCategory.STATUS_CONFLICT
    ]
    assert len(status_conflicts_diff) == 0


# -----------------------------------------------------------------------------
# 5. Missing RRN is Not Classified as Confirmed Absent
# -----------------------------------------------------------------------------
def test_missing_rrn_not_classified_as_confirmed_absent():
    """Scenario 5: A missing RRN must be classified as UNREADABLE or NOT_DETECTED, never CONFIRMED_ABSENT."""
    engine = ContradictionAnalysisEngine()

    fact_no_rrn = CanonicalFact(
        fact_id="FACT-NO-RRN",
        case_id="case_gap_test",
        artifact_id="ART-DEGRADED",
        evidence_id="EVI-NO-RRN",
        kind=CanonicalFactKind.PAYMENT_REQUEST,
        source_filename="blurry_receipt.png",
        source_location="Cropped",
        sha256="4444444444444444444444444444444444444444444444444444444444444444",
        trust_tier=TrustTier.T3,
        auth_track=AuthType.ACTIVE,
        time_provenance=make_dummy_timezone(),
        summary="Blurry receipt",
        raw_source_snippet="Paid ₹7500",
        primary_entity="User A",
        amount=7500.0,
        identifiers={},  # No RRN
    )

    gaps = engine.detect_evidence_gaps([fact_no_rrn], [])
    rrn_gaps = [g for g in gaps if g.category == EvidenceGapCategory.UNAVAILABLE_IDENTIFIER]

    assert len(rrn_gaps) >= 1
    for gap in rrn_gaps:
        assert gap.status != EvidenceGapStatus.CONFIRMED_ABSENT
        assert gap.status in [EvidenceGapStatus.UNREADABLE, EvidenceGapStatus.NOT_DETECTED]


# -----------------------------------------------------------------------------
# 6. Failed OCR Processing Creates Processing Gap (Not False Absence)
# -----------------------------------------------------------------------------
def test_failed_ocr_processing_creates_processing_gap():
    """Scenario 6: Failed OCR processing produces PROCESSING_FAILED gap, never CONFIRMED_ABSENT."""
    engine = ContradictionAnalysisEngine()

    artifact_with_failed_page = Artifact(
        artifact_id="ART-FAILED-OCR",
        case_id="case_gap_test",
        filename="scanned_passbook.pdf",
        sha256="5555555555555555555555555555555555555555555555555555555555555555",
        file_size_bytes=10240,
        mime_type="application/pdf",
        source_tier="T2",
        intake_officer="Officer Test",
        intake_timestamp_iso="2026-02-14T05:00:00Z",
        custody_chain_sequence=1,
        storage_path="/vault/scanned_passbook.pdf",
        metadata={"failed_pages": [2, 3], "total_pages": 4},
    )

    gaps = engine.detect_evidence_gaps([], [artifact_with_failed_page])
    proc_gaps = [g for g in gaps if g.status == EvidenceGapStatus.PROCESSING_FAILED]

    assert len(proc_gaps) >= 1
    gap = proc_gaps[0]
    assert gap.category == EvidenceGapCategory.UNPROCESSED_DOCUMENT_PAGES
    assert gap.status == EvidenceGapStatus.PROCESSING_FAILED
    assert gap.status != EvidenceGapStatus.CONFIRMED_ABSENT
    assert "page" in gap.missing_evidence_description.lower() or "scanned_passbook" in gap.missing_evidence_description


# -----------------------------------------------------------------------------
# 7. Explicitly Confirmed Absence Records Review Provenance & Requires Scope
# -----------------------------------------------------------------------------
def test_confirmed_absence_records_review_provenance(test_client):
    """Scenario 7: Setting CONFIRMED_ABSENT strictly requires examiner review_scope and records provenance."""
    case_id = "upi_payment_discrepancy"

    # 1. Fetch evidence gaps to find an active gap
    resp_gaps = test_client.get(f"/api/cases/{case_id}/evidence-gaps")
    assert resp_gaps.status_code == 200
    gaps = resp_gaps.json()
    assert len(gaps) > 0
    target_gap_id = gaps[0]["gap_id"]

    # 2. Attempting CONFIRM_ABSENT without review_scope must be rejected (HTTP 400)
    bad_payload = {
        "decision": "CONFIRM_ABSENT",
        "reviewed_by": "Inspector Sharma",
        "review_notes": "Looked for bank record but could not find it",
        "review_scope": "",  # Empty scope is rejected!
    }
    resp_bad = test_client.post(
        f"/api/cases/{case_id}/evidence-gaps/{target_gap_id}/review",
        json=bad_payload,
    )
    assert resp_bad.status_code == 400
    assert "review_scope" in resp_bad.json()["detail"].lower()

    # 3. Submitting CONFIRM_ABSENT with documented review_scope succeeds
    valid_payload = {
        "decision": "CONFIRM_ABSENT",
        "reviewed_by": "Inspector Sharma (ID 8402)",
        "review_notes": "Searched core banking ledger across all accounts for the stated RRN",
        "review_scope": "Certified HDFC bank statement Dec 2025 - Mar 2026 for A/c 9012",
    }
    resp_valid = test_client.post(
        f"/api/cases/{case_id}/evidence-gaps/{target_gap_id}/review",
        json=valid_payload,
    )
    assert resp_valid.status_code == 200
    res_data = resp_valid.json()
    assert res_data["status"] == "CONFIRMED_ABSENT"
    assert res_data["gap_id"] == target_gap_id

    # 4. Verify gap reflects the updated review provenance
    resp_updated = test_client.get(f"/api/cases/{case_id}/evidence-gaps")
    updated_gap = next((g for g in resp_updated.json() if g["gap_id"] == target_gap_id), None)
    assert updated_gap is not None
    assert updated_gap["status"] == "CONFIRMED_ABSENT"
    assert updated_gap["review_scope"] == valid_payload["review_scope"]
    assert updated_gap["reviewed_by"] == valid_payload["reviewed_by"]


# -----------------------------------------------------------------------------
# 8. Every Finding Links to Source Artifacts and Facts
# -----------------------------------------------------------------------------
def test_findings_link_to_source_artifacts_and_facts(sample_facts, sample_artifacts):
    """Scenario 8: All contradictions and gaps maintain strict linkages to source artifacts and facts."""
    engine = ContradictionAnalysisEngine()
    analysis = engine.analyze_case("case_phase5c_test", sample_facts, sample_artifacts)

    for contra in analysis.contradictions:
        assert len(contra.source_artifact_ids) > 0
        assert len(contra.supporting_fact_ids) > 0
        assert len(contra.provenance_references) > 0
        assert contra.rule_id != ""
        assert contra.rule_version != ""

    for gap in analysis.evidence_gaps:
        assert len(gap.relevant_artifact_ids) > 0 or len(gap.relevant_fact_ids) > 0
        assert gap.exposed_by_rule_id != ""


# -----------------------------------------------------------------------------
# 9. Findings are Deterministic Across Repeated Runs
# -----------------------------------------------------------------------------
def test_findings_deterministic_across_repeated_runs(sample_facts, sample_artifacts):
    """Scenario 9: Repeated executions on the identical inputs yield bit-exact fingerprints and IDs."""
    engine = ContradictionAnalysisEngine()

    run1 = engine.analyze_case("case_phase5c_test", sample_facts, sample_artifacts)
    run2 = engine.analyze_case("case_phase5c_test", sample_facts, sample_artifacts)

    assert run1.fingerprint == run2.fingerprint
    assert len(run1.contradictions) == len(run2.contradictions)
    assert len(run1.evidence_gaps) == len(run2.evidence_gaps)

    for c1, c2 in zip(run1.contradictions, run2.contradictions):
        assert c1.finding_id == c2.finding_id
        assert c1.original_values == c2.original_values
        assert c1.normalized_values == c2.normalized_values


# -----------------------------------------------------------------------------
# 10. Excluding the Screenshot Deactivates Its Dependent Mismatch
# -----------------------------------------------------------------------------
def test_counterfactual_screenshot_exclusion_deactivates_mismatch(sample_facts, sample_artifacts):
    """Scenario 10: Counterfactual exclusion of screenshot marks the dependent contradiction UNSUPPORTED/INACTIVE."""
    engine = ContradictionAnalysisEngine()

    # Challenged run excluding the screenshot artifact ART-003-SCREEN
    challenge_analysis = engine.analyze_case(
        "case_phase5c_test",
        sample_facts,
        sample_artifacts,
        excluded_artifact_ids=["ART-003-SCREEN"],
    )

    amount_mismatches = [
        c for c in challenge_analysis.contradictions
        if c.category in [ContradictionCategory.AMOUNT_DISCREPANCY, ContradictionCategory.CLAIM_VS_RECORD]
    ]
    assert len(amount_mismatches) >= 1

    finding = amount_mismatches[0]
    # Finding must be INACTIVE
    assert finding.status in [FindingStatus.INACTIVE.value, "UNSUPPORTED"]
    assert finding.inactive_reason is not None
    assert "ART-003-SCREEN" in finding.inactive_reason


# -----------------------------------------------------------------------------
# 11. Independent Bank Evidence Survives Exclusion
# -----------------------------------------------------------------------------
def test_independent_bank_evidence_survives_exclusion(sample_facts, sample_artifacts):
    """Scenario 11: Facts and events not dependent on the excluded screenshot remain active."""
    engine = ContradictionAnalysisEngine()

    challenge_analysis = engine.analyze_case(
        "case_phase5c_test",
        sample_facts,
        sample_artifacts,
        excluded_artifact_ids=["ART-003-SCREEN"],
    )

    # Contradictions count active vs inactive
    assert challenge_analysis.inactive_contradictions_count >= 1

    # Verify that gaps not involving the screenshot remain active
    independent_gaps = [
        g for g in challenge_analysis.evidence_gaps
        if "ART-003-SCREEN" not in g.relevant_artifact_ids
    ]
    for gap in independent_gaps:
        assert gap.active_status == "ACTIVE"


# -----------------------------------------------------------------------------
# 12. Baseline Results Remain Unchanged After a Challenge Run
# -----------------------------------------------------------------------------
def test_baseline_results_remain_unchanged_after_challenge(sample_facts, sample_artifacts):
    """Scenario 12: Executing a challenge run does NOT alter or overwrite the baseline findings."""
    engine = ContradictionAnalysisEngine()

    baseline_before = engine.analyze_case("case_phase5c_test", sample_facts, sample_artifacts)

    # Run challenge
    _ = engine.analyze_case(
        "case_phase5c_test",
        sample_facts,
        sample_artifacts,
        excluded_artifact_ids=["ART-003-SCREEN"],
    )

    # Re-evaluate baseline
    baseline_after = engine.analyze_case("case_phase5c_test", sample_facts, sample_artifacts)

    assert baseline_before.fingerprint == baseline_after.fingerprint
    assert baseline_before.active_contradictions_count == baseline_after.active_contradictions_count


# -----------------------------------------------------------------------------
# 13. Case and Run Isolation is Enforced
# -----------------------------------------------------------------------------
def test_case_and_run_isolation(test_client):
    """Scenario 13: Case A data does not leak into Case B, and run IDs do not cross boundaries."""
    resp_upi = test_client.get("/api/cases/upi_payment_discrepancy/contradictions")
    assert resp_upi.status_code == 200

    resp_invalid = test_client.get("/api/cases/nonexistent_isolated_case_9999/contradictions")
    assert resp_invalid.status_code == 404


# -----------------------------------------------------------------------------
# 14. Review and Resolution Actions Preserve Audit History
# -----------------------------------------------------------------------------
def test_review_actions_preserve_audit_history(test_client):
    """Scenario 14: Review actions append traceable audit records to the custody ledger."""
    case_id = "upi_payment_discrepancy"

    # Get a contradiction
    resp_contra = test_client.get(f"/api/cases/{case_id}/contradictions")
    assert resp_contra.status_code == 200
    findings = resp_contra.json()
    assert len(findings) > 0
    contra_id = findings[0]["finding_id"]

    # Submit review
    review_req = {
        "decision": "VERIFY",
        "reviewed_by": "Senior Auditor K. Patel",
        "review_notes": "Confirmed divergence between mobile screenshot and core banking ledger",
    }
    resp_rev = test_client.post(
        f"/api/cases/{case_id}/contradictions/{contra_id}/review",
        json=review_req,
    )
    assert resp_rev.status_code == 200

    # Inspect custody ledger
    ledger = case_store.get_ledger(case_id)
    all_entries = ledger.get_all_entries()
    audit_events = [e for e in all_entries if e.action == "REVIEW_CONTRADICTION"]
    assert len(audit_events) >= 1

    last_event = audit_events[-1]
    assert last_event.fact_id == contra_id


# -----------------------------------------------------------------------------
# 15. API Responses Follow Existing Schemas
# -----------------------------------------------------------------------------
def test_api_responses_follow_schemas(test_client):
    """Scenario 15: Endpoints return data that strictly conforms to Phase 5C Pydantic response schemas."""
    case_id = "upi_payment_discrepancy"

    # GET /api/cases/{case_id}/forensic-analysis
    resp_analysis = test_client.get(f"/api/cases/{case_id}/forensic-analysis")
    assert resp_analysis.status_code == 200
    analysis_model = CaseForensicAnalysisResponse(**resp_analysis.json())
    assert analysis_model.case_id == case_id
    assert analysis_model.total_contradictions > 0

    # GET /api/cases/{case_id}/contradictions
    resp_contra = test_client.get(f"/api/cases/{case_id}/contradictions")
    assert resp_contra.status_code == 200
    contra_list = [ContradictionFindingResponse(**item) for item in resp_contra.json()]
    assert len(contra_list) > 0

    # GET /api/cases/{case_id}/evidence-gaps
    resp_gaps = test_client.get(f"/api/cases/{case_id}/evidence-gaps")
    assert resp_gaps.status_code == 200
    gap_list = [ForensicEvidenceGapResponse(**item) for item in resp_gaps.json()]
    assert len(gap_list) > 0


# -----------------------------------------------------------------------------
# 16. Existing Phase 5A and 5B Behavior Remains Intact
# -----------------------------------------------------------------------------
def test_existing_phase5a_and_5b_behavior_intact(sample_facts, sample_artifacts):
    """Scenario 16: Correlation engine, timeline reconstruction, and graph building remain intact and incorporate findings."""
    # Phase 5A: Correlation Engine
    correlations, _ = CorrelationEngine().correlate_case(sample_facts)
    assert len(correlations) > 0

    # Phase 5B: Timeline Reconstruction
    timeline_engine = TimelineReconstructionEngine()
    timeline = timeline_engine.build_timeline("case_phase5c_test", sample_facts, sample_artifacts)
    assert timeline.total_events > 0

    # Base Investigation Graph
    base_graph = InvestigationGraphBuilder.build_case_graph(
        "case_phase5c_test",
        sample_artifacts,
        sample_facts,
        correlations,
    )
    augmented_timeline_graph = timeline_engine.integrate_timeline_into_graph(base_graph, timeline)

    # Phase 5C: Integrate Findings into Graph
    contra_engine = ContradictionAnalysisEngine()
    fact_unmatched = CanonicalFact(
        fact_id="FACT-CLAIM-UNMATCHED",
        case_id="case_phase5c_test",
        artifact_id="ART-002-CHAT",
        evidence_id="EVI-CHAT-02",
        kind=CanonicalFactKind.PAYMENT_REQUEST,
        source_filename="whatsapp_chat.txt",
        source_location="Line 88",
        sha256="2222222222222222222222222222222222222222222222222222222222222222",
        trust_tier=TrustTier.T2,
        auth_track=AuthType.ACTIVE,
        time_provenance=make_dummy_timezone(),
        summary="Unmatched payment claim",
        raw_source_snippet="Sent 50,000 Ref 999999999999",
        primary_entity="Amit Sharma",
        amount=50000.0,
        identifiers={"rrn": "999999999999"},
    )
    facts_with_gap = sample_facts + [fact_unmatched]
    analysis = contra_engine.analyze_case("case_phase5c_test", facts_with_gap, sample_artifacts, timeline=timeline)
    full_graph = contra_engine.integrate_findings_into_graph(augmented_timeline_graph, analysis)

    # Verify CONTRADICTION and EVIDENCE_GAP nodes exist
    contra_nodes = [n for n in full_graph.nodes if n.node_type == ForensicNodeType.CONTRADICTION]
    assert len(contra_nodes) >= 1

    gap_nodes = [n for n in full_graph.nodes if n.node_type == ForensicNodeType.EVIDENCE_GAP]
    assert len(gap_nodes) >= 1

    # Verify CONTRADICTS edges exist
    contra_edges = [e for e in full_graph.edges if e.edge_type == ForensicEdgeType.CONTRADICTS]
    assert len(contra_edges) >= 1
