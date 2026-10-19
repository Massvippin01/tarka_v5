"""Automated Tests for TARKA Phase 2: Evidence Normalisation and Explainable Correlation.

Verifies:
1. Parser source pointers and record-level locators.
2. Raw-versus-normalized field separation.
3. Timezone normalization to UTC epoch with preserved display rationale.
4. Exact identifier correlation (phone, UPI VPA, RRN).
5. Weak name-match review requirement (non-silent linking).
6. Hard-veto conflict handling for contradictory identifiers.
7. Discrepancy / contradiction detection (screenshot claim vs bank transaction).
8. Missing corresponding record detection (evidence gap).
9. Deterministic repeatability across multiple runs.
10. End-to-end FastAPI endpoint workflow and examiner correlation review.
"""

from __future__ import annotations

import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from tarka.core.canonical_fact import (
    CanonicalFact,
    CanonicalFactKind,
    ExtractedField,
    ExtractionStatus,
    build_timezone_provenance,
)
from tarka.core.entity_resolution import (
    EntityResolver,
    HardVetoEngine,
    MatchStatus,
    ExaminerReviewState,
    normalize_msisdn,
    normalize_vpa,
    normalize_txn_ref,
    normalize_account_suffix,
    normalize_person_name,
)
from tarka.core.correlations import CorrelationEngine, CorrelationStatus
from tarka.core.evidence_dna import CaseStore, TrustTier
from tarka.api.server import app

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "synthetic_fraud_case"


@pytest.fixture
def temp_case_store(tmp_path: Path) -> CaseStore:
    """Provides an isolated temporary CaseStore."""
    cases_dir = tmp_path / "cases"
    return CaseStore(base_dir=cases_dir)


def test_parser_source_pointers_and_raw_vs_normalized_separation(temp_case_store: CaseStore):
    """Verifies that extracted fields retain exact source pointers and separate raw from normalized values."""
    case = temp_case_store.create_case("CASE-PHASE2-TEST-1", "Test Ingestion Case")

    # Ingest WhatsApp Chat
    chat_file = FIXTURES_DIR / "whatsapp_chat.txt"
    with open(chat_file, "rb") as f:
        chat_bytes = f.read()

    art_chat, _, dna_chat = temp_case_store.register_artifact(
        case_id=case.case_id,
        filename="whatsapp_chat.txt",
        file_bytes=chat_bytes,
        source_tier=TrustTier.T3,
    )

    assert len(dna_chat) > 0
    # Inspect a payment request record
    payment_dna = next((d for d in dna_chat if d.inferred_attributes.get("is_payment_request")), None)
    assert payment_dna is not None, "Expected payment request in chat"

    # Verify source pointer
    assert payment_dna.source_line_ref.startswith("line:")
    assert "25,000" in payment_dna.source_raw_text

    # Verify extracted fields separation
    assert len(payment_dna.extracted_fields) > 0
    amt_field = next((ef for ef in payment_dna.extracted_fields if ef.field_name == "amount"), None)
    assert amt_field is not None
    assert "25,000" in amt_field.raw_source_value
    assert amt_field.normalized_value == 25000.0
    assert amt_field.source_location.startswith("line:")
    assert amt_field.extraction_status == ExtractionStatus.MACHINE_EXTRACTED


def test_timezone_normalization_with_preserved_provenance():
    """Verifies timezone-aware normalization to UTC epoch while preserving display rationale."""
    raw_ist_ts = "14/02/2026, 10:19:30"
    provenance = build_timezone_provenance(raw_ist_ts)

    assert provenance.recorded_time == raw_ist_ts
    assert "Asia/Kolkata" in provenance.assumed_timezone
    assert provenance.utc_iso.endswith("Z") or "+00:00" in provenance.utc_iso
    assert "offset +05:30" in provenance.conversion_rationale
    assert provenance.utc_epoch > 0


def test_exact_identifier_correlation(temp_case_store: CaseStore):
    """Verifies deterministic correlation across chat payment request, bank transaction, and CDR call."""
    case = temp_case_store.create_case("CASE-FRAUD-E2E", "Cyber Fraud Incident Investigation")

    # 1. Ingest WhatsApp Chat
    with open(FIXTURES_DIR / "whatsapp_chat.txt", "rb") as f:
        temp_case_store.register_artifact(
            case_id=case.case_id,
            filename="whatsapp_chat.txt",
            file_bytes=f.read(),
            source_tier=TrustTier.T3,
        )

    # 2. Ingest Bank Statement CSV
    with open(FIXTURES_DIR / "bank_statement.csv", "rb") as f:
        temp_case_store.register_artifact(
            case_id=case.case_id,
            filename="bank_statement.csv",
            file_bytes=f.read(),
            source_tier=TrustTier.T1,
        )

    # 3. Ingest CDR CSV
    with open(FIXTURES_DIR / "cdr_records.csv", "rb") as f:
        temp_case_store.register_artifact(
            case_id=case.case_id,
            filename="cdr_records.csv",
            file_bytes=f.read(),
            source_tier=TrustTier.T1,
        )

    correlations, gaps = temp_case_store.get_case_correlations(case.case_id)
    assert len(correlations) > 0

    rule_ids = {c.rule_id for c in correlations}

    # Verify exact RRN correlation
    assert "RULE_TXN_REF_EXACT" in rule_ids
    rrn_corr = next(c for c in correlations if c.rule_id == "RULE_TXN_REF_EXACT" and "202602148891" in c.explanation_text)
    assert "202602148891" in rrn_corr.explanation_text
    assert rrn_corr.status == CorrelationStatus.SUPPORTED


    # Verify exact VPA correlation
    assert "RULE_VPA_EXACT" in rule_ids
    vpa_corr = next(c for c in correlations if c.rule_id == "RULE_VPA_EXACT")
    assert "merchant.pay@okaxis" in vpa_corr.explanation_text

    # Verify causal payment flow
    assert "RULE_PAYMENT_FLOW_CAUSAL" in rule_ids

    # Verify CDR phone cross-link
    assert "RULE_PHONE_EXACT" in rule_ids
    phone_corr = next(c for c in correlations if c.rule_id == "RULE_PHONE_EXACT")
    assert "+919876543210" in phone_corr.explanation_text


def test_weak_name_match_review_requirement():
    """Verifies that person name matches alone are flagged as proposed and require examiner review."""
    resolver = EntityResolver()
    records = [
        {"entity_id": "ENT-1", "name": "Rajesh Kumar", "phone": "+919876543210"},
        {"entity_id": "ENT-2", "name": "Rajesh Kumar"},  # No phone corroboration
    ]

    _, matches = resolver.match_entities_explainable(records)
    name_match = next((m for m in matches if m.deterministic_rule_applied == "WEAK_NAME_MATCH"), None)

    assert name_match is not None
    assert name_match.match_status == MatchStatus.PROPOSED
    assert name_match.examiner_review_state == ExaminerReviewState.REVIEW_REQUIRED
    assert "weak non-unique signal" in name_match.conflict_or_veto_reason


def test_hard_veto_on_conflicting_identifiers():
    """Verifies that matching names with conflicting phone numbers or VPAs produce a hard veto rejection."""
    resolver = EntityResolver()
    records = [
        {"entity_id": "ENT-A", "name": "Vikram Singh", "phone": "+919876543210", "vpa": "vikram@okhdfc"},
        {"entity_id": "ENT-B", "name": "Vikram Singh", "phone": "+919123456789", "vpa": "vikram2@oksbi"},
    ]

    _, matches = resolver.match_entities_explainable(records)
    veto_match = next((m for m in matches if m.match_status == MatchStatus.REJECTED), None)

    assert veto_match is not None
    assert "HARD_VETO" in veto_match.deterministic_rule_applied
    assert veto_match.examiner_review_state == ExaminerReviewState.REVIEW_REQUIRED
    assert "Hard identifier conflict" in veto_match.conflict_or_veto_reason


def test_screenshot_contradiction_detection(temp_case_store: CaseStore):
    """Verifies that a screenshot claiming ₹15,000 for an RRN that actually debited ₹25,000 triggers a contradiction."""
    case = temp_case_store.create_case("CASE-CONTRADICTION-TEST", "Contradiction Audit")

    # Ingest Bank Statement (Records ₹25,000 for RRN 202602148891)
    with open(FIXTURES_DIR / "bank_statement.csv", "rb") as f:
        temp_case_store.register_artifact(
            case_id=case.case_id,
            filename="bank_statement.csv",
            file_bytes=f.read(),
        )

    # Ingest Screenshot Claim (Claims ₹15,000 for RRN 202602148891)
    with open(FIXTURES_DIR / "screenshot_claim.json", "rb") as f:
        temp_case_store.register_artifact(
            case_id=case.case_id,
            filename="screenshot_claim.json",
            file_bytes=f.read(),
        )

    correlations, _ = temp_case_store.get_case_correlations(case.case_id)
    contradiction = next((c for c in correlations if c.is_contradiction), None)

    assert contradiction is not None
    assert contradiction.rule_id == "RULE_MEDIA_TXN_MISMATCH"
    assert contradiction.status == CorrelationStatus.REJECTED
    assert contradiction.examiner_review_state == "REVIEW_REQUIRED"
    assert "10,000" in contradiction.explanation_text  # Delta ₹10,000


def test_evidence_gap_detection(temp_case_store: CaseStore):
    """Verifies that a payment claim lacking a corresponding bank entry is identified as an evidence gap."""
    case = temp_case_store.create_case("CASE-GAP-TEST", "Evidence Gap Audit")

    # Ingest unverified claim asserting payment for RRN 202602147777 (not in bank statement)
    with open(FIXTURES_DIR / "unverified_claim.json", "rb") as f:
        temp_case_store.register_artifact(
            case_id=case.case_id,
            filename="unverified_claim.json",
            file_bytes=f.read(),
        )

    correlations, gaps = temp_case_store.get_case_correlations(case.case_id)

    assert len(gaps) == 1
    assert gaps[0].rule_id == "RULE_EVIDENCE_GAP_MISSING_TXN"
    assert "202602147777" in gaps[0].explanation

    gap_corr = next((c for c in correlations if c.is_evidence_gap), None)
    assert gap_corr is not None
    assert gap_corr.status == CorrelationStatus.PROPOSED


def test_deterministic_repeatability_across_runs(temp_case_store: CaseStore):
    """Verifies that running analysis repeatedly yields bit-exact deterministic output."""
    case = temp_case_store.create_case("CASE-DETERMINISTIC", "Repeatability Verification")

    with open(FIXTURES_DIR / "whatsapp_chat.txt", "rb") as f:
        temp_case_store.register_artifact(case.case_id, "chat.txt", f.read())
    with open(FIXTURES_DIR / "bank_statement.csv", "rb") as f:
        temp_case_store.register_artifact(case.case_id, "bank.csv", f.read())

    run1 = temp_case_store.get_case_analysis(case.case_id)
    run2 = temp_case_store.get_case_analysis(case.case_id)

    str1 = json.dumps(run1, sort_keys=True)
    str2 = json.dumps(run2, sort_keys=True)

    assert str1 == str2, "Case analysis output must be strictly deterministic across repeated runs"


def test_api_phase2_endpoints_e2e(temp_case_store: CaseStore, monkeypatch):
    """Verifies full FastAPI workflow for Phase 2 endpoints."""
    # Monkeypatch global case_store in server.py
    import tarka.api.server as srv
    monkeypatch.setattr(srv, "case_store", temp_case_store)

    client = TestClient(app)

    # 1. Create Case
    res = client.post("/api/cases", json={"case_id": "CASE-API-P2", "title": "API Test Case"})
    assert res.status_code == 200

    # 2. Register WhatsApp Artifact
    with open(FIXTURES_DIR / "whatsapp_chat.txt", "rb") as f:
        res = client.post(
            "/api/cases/CASE-API-P2/artifacts",
            files={"file": ("whatsapp_chat.txt", f, "text/plain")},
            data={"source_tier": "T3"},
        )
    assert res.status_code == 200

    # 3. Register Bank Artifact
    with open(FIXTURES_DIR / "bank_statement.csv", "rb") as f:
        res = client.post(
            "/api/cases/CASE-API-P2/artifacts",
            files={"file": ("bank_statement.csv", f, "text/csv")},
            data={"source_tier": "T1"},
        )
    assert res.status_code == 200

    # 4. Query Case Analysis endpoint
    res = client.get("/api/cases/CASE-API-P2/analysis")
    assert res.status_code == 200
    analysis = res.json()
    assert len(analysis["facts"]) > 0
    assert len(analysis["event_links"]) > 0
    assert "integrity_limitation" in analysis

    # 5. Query Facts endpoint
    res = client.get("/api/cases/CASE-API-P2/facts")
    assert res.status_code == 200
    facts = res.json()
    assert len(facts) > 0
    assert "time_provenance" in facts[0]

    # 6. Query Correlations endpoint
    res = client.get("/api/cases/CASE-API-P2/correlations")
    assert res.status_code == 200
    corrs = res.json()
    assert len(corrs) > 0

    # 7. Review Correlation
    first_corr_id = corrs[0]["correlation_id"]
    res = client.patch(
        f"/api/cases/CASE-API-P2/correlations/{first_corr_id}/review",
        json={"examiner_review_state": "CONFIRMED", "examiner_notes": "Corroborated by bank statement"},
    )
    assert res.status_code == 200
    reviewed_corr = res.json()
    assert reviewed_corr["examiner_review_state"] == "CONFIRMED"
    assert reviewed_corr["examiner_notes"] == "Corroborated by bank statement"
