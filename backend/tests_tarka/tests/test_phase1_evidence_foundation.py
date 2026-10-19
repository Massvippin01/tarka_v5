"""Comprehensive Automated Test Suite for Phase 1: TARKA Case and Evidence Foundation.

Validates:
1. SHA-256 file hashing determinism and validation.
2. Case creation, workspace isolation, and metadata.
3. Artifact intake records, source metadata, and custody ledger anchoring.
4. Immutable original source retention (byte-for-byte disk fidelity and raw download).
5. Duplicate artifact handling (deduplication by SHA-256, no redundant custody records).
6. Structured Evidence DNA models (clean separation of raw source, extracted data, and inferred fields).
7. Evidence status transitions, examiner review workflow, and review custody logging.
8. Bitstream integrity verification and discrepancy detection upon bit mutation.
9. Explicit integrity limitation text present across all models and endpoints.
10. End-to-end FastAPI test client flow and security headers.
"""

from __future__ import annotations

import hashlib
import io
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from tarka.core.models import TrustTier, AuthType, FactKind
from tarka.core.evidence_dna import (
    Case,
    Artifact,
    EvidenceDNA,
    CaseStore,
    INTEGRITY_LIMITATION_DISCLOSURE,
    EVIDENCE_DNA_DISCLOSURE,
)
from tarka.api.server import app


@pytest.fixture
def temp_case_store(tmp_path: Path) -> CaseStore:
    return CaseStore(base_dir=tmp_path / "cases")


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_sha256_file_hashing_determinism_and_validation():
    """Validates SHA-256 calculation determinism and strict format validation."""
    content = b"TELECOM_CDR_SAMPLE_2026_KORAMANGALA_BANGALORE"
    expected_hash = hashlib.sha256(content).hexdigest()
    assert len(expected_hash) == 64

    # Valid artifact passes validation
    art = Artifact(
        artifact_id="ART-TEST-001",
        case_id="case_test",
        filename="cdr.csv",
        sha256=expected_hash,
        file_size_bytes=len(content),
        mime_type="text/csv",
        source_tier=TrustTier.T1,
        intake_officer="Officer A",
        intake_timestamp_iso="2026-10-09T10:00:00Z",
        custody_chain_sequence=1,
        storage_path="artifacts/cdr.csv",
    )
    assert art.sha256 == expected_hash

    # Invalid SHA-256 raises ValueError
    with pytest.raises(ValueError, match="Invalid SHA-256 digest"):
        Artifact(
            artifact_id="ART-TEST-002",
            case_id="case_test",
            filename="cdr.csv",
            sha256="not_a_valid_hex_hash",
            file_size_bytes=len(content),
            mime_type="text/csv",
            custody_chain_sequence=1,
            storage_path="artifacts/cdr.csv",
            intake_timestamp_iso="2026-10-09T10:00:00Z",
        )


def test_case_creation_and_workspace_isolation(temp_case_store: CaseStore):
    """Validates case creation, independent directories, and isolated custody ledgers."""
    c1 = temp_case_store.create_case(
        case_id="CASE-2026-ALPHA",
        title="Alpha Incident Investigation",
        description="First case workspace",
        investigator="Insp. Sen",
    )
    assert c1.case_id == "CASE-2026-ALPHA"
    assert c1.title == "Alpha Incident Investigation"
    assert c1.status == "ACTIVE"
    assert c1.custody_chain_head is not None

    c2 = temp_case_store.create_case(
        case_id="CASE-2026-BETA",
        title="Beta Transit Anomaly",
        description="Second case workspace",
        investigator="Insp. Rao",
    )
    assert c2.case_id == "CASE-2026-BETA"

    # Both cases exist in store
    cases = temp_case_store.list_cases()
    ids = [c.case_id for c in cases]
    assert "CASE-2026-ALPHA" in ids
    assert "CASE-2026-BETA" in ids

    # Isolated custody ledgers
    ledger1 = temp_case_store.get_ledger("CASE-2026-ALPHA")
    ledger2 = temp_case_store.get_ledger("CASE-2026-BETA")
    entries1 = ledger1.get_all_entries()
    entries2 = ledger2.get_all_entries()
    assert len(entries1) == 1
    assert entries1[0].action == "CREATE_CASE"
    assert entries1[0].fact_id == "CASE-2026-ALPHA"
    assert entries2[0].fact_id == "CASE-2026-BETA"


def test_artifact_intake_record_and_custody_metadata(temp_case_store: CaseStore):
    """Validates artifact registration, metadata recording, and custody chain logging."""
    temp_case_store.create_case("CASE-INTAKE-TEST", title="Intake Test Case")
    sample_csv = b"caller,callee,timestamp,duration,first_cell\n+919876543210,+919811122233,2026-03-15T14:30:00,120,404-45-12345\n"

    art, is_dup, dna_list = temp_case_store.register_artifact(
        case_id="CASE-INTAKE-TEST",
        filename="airtel_cdr_march.csv",
        file_bytes=sample_csv,
        source_tier=TrustTier.T1,
        source_device="Airtel Node Gateway",
        intake_officer="Examiner Sharma",
        intake_notes="Exported under seizure memo #402",
    )

    assert not is_dup
    assert art.filename == "airtel_cdr_march.csv"
    assert art.sha256 == hashlib.sha256(sample_csv).hexdigest()
    assert art.file_size_bytes == len(sample_csv)
    assert art.source_tier == TrustTier.T1
    assert art.source_device == "Airtel Node Gateway"
    assert art.intake_officer == "Examiner Sharma"
    assert art.intake_notes == "Exported under seizure memo #402"
    assert art.status == "PARSED"
    assert art.dna_count == 1
    assert len(dna_list) == 1

    # Custody chain verification
    ledger = temp_case_store.get_ledger("CASE-INTAKE-TEST")
    entries = ledger.get_all_entries()
    # Entry 0: CREATE_CASE, Entry 1: REGISTER_ARTIFACT
    assert len(entries) >= 2
    reg_entry = entries[-1]
    assert reg_entry.action == "REGISTER_ARTIFACT"
    assert reg_entry.fact_id == art.artifact_id
    assert ledger.verify_chain().is_valid is True


def test_immutable_original_source_retention(temp_case_store: CaseStore):
    """Verifies that the original file is preserved byte-for-byte on disk."""
    temp_case_store.create_case("CASE-SOURCE-RETENTION", title="Source Retention Test")
    payload = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"

    art, _, _ = temp_case_store.register_artifact(
        case_id="CASE-SOURCE-RETENTION",
        filename="evidence_photo.png",
        file_bytes=payload,
        source_tier=TrustTier.T3,
        intake_officer="Examiner Patel",
    )

    case_dir = temp_case_store.get_case_dir("CASE-SOURCE-RETENTION")
    saved_file = case_dir / art.storage_path
    assert saved_file.exists(), f"Stored artifact file not found at {saved_file}"

    # Byte-for-byte verification
    stored_bytes = saved_file.read_bytes()
    assert stored_bytes == payload
    assert hashlib.sha256(stored_bytes).hexdigest() == art.sha256


def test_duplicate_artifact_handling(temp_case_store: CaseStore):
    """Validates that registering a file with matching SHA-256 returns duplicate status without redundant custody entries."""
    temp_case_store.create_case("CASE-DUP-TEST", title="Duplicate Handling Test")
    file_bytes = b"timestamp,upi_id,amount,rrn\n2026-03-15T10:00:00,user@okaxis,500.0,412345678901\n"

    # First registration
    art1, is_dup1, _ = temp_case_store.register_artifact(
        case_id="CASE-DUP-TEST",
        filename="banking_export.csv",
        file_bytes=file_bytes,
        intake_officer="Officer 1",
    )
    assert is_dup1 is False
    ledger = temp_case_store.get_ledger("CASE-DUP-TEST")
    count_after_first = len(ledger.get_all_entries())

    # Second registration with same content but different filename
    art2, is_dup2, _ = temp_case_store.register_artifact(
        case_id="CASE-DUP-TEST",
        filename="banking_export_copy.csv",
        file_bytes=file_bytes,
        intake_officer="Officer 2",
    )
    assert is_dup2 is True
    assert art2.artifact_id == art1.artifact_id
    assert art2.sha256 == art1.sha256

    # Custody log was NOT duplicated
    count_after_second = len(ledger.get_all_entries())
    assert count_after_second == count_after_first

    # Artifacts list still has only 1 artifact
    arts = temp_case_store.list_artifacts("CASE-DUP-TEST")
    assert len(arts) == 1


def test_structured_evidence_dna_model_separation(temp_case_store: CaseStore):
    """Validates clear separation between original verbatim source, extracted values, and inferred data."""
    temp_case_store.create_case("CASE-DNA-TEST", title="DNA Structure Test")
    # Date format with ambiguity tokens (04/05/2026) in WhatsApp format
    wa_chat = (
        "04/05/2026, 14:30 - Ravi: I will be meeting at the metro station.\n"
        "04/05/2026, 15:00 - Suresh: Confirmed, see you there.\n"
    ).encode("utf-8")

    art, _, dna_items = temp_case_store.register_artifact(
        case_id="CASE-DNA-TEST",
        filename="chat_export.txt",
        file_bytes=wa_chat,
        source_tier=TrustTier.T3,
    )

    assert len(dna_items) == 2
    dna1 = dna_items[0]

    # 1. Original Source Data (verbatim line preserved)
    assert "04/05/2026, 14:30 - Ravi: I will be meeting at the metro station." in dna1.source_raw_text
    assert dna1.source_line_ref == "line:1"

    # 2. Extracted Data
    assert dna1.kind == FactKind.WA_MESSAGE
    assert dna1.trust_tier == TrustTier.T3
    assert dna1.auth_track == AuthType.ACTIVE

    # 3. Inferred Data (clearly flagged and explained)
    assert dna1.has_inferences is True
    assert "date_ambiguity" in dna1.inferred_attributes
    assert dna1.inference_rationale is not None
    assert "widened" in dna1.inference_rationale.lower()

    # 4. Reviewable Fields
    assert dna1.is_reviewable is True
    assert dna1.review_status == "UNREVIEWED"

    # Convert to canonical Fact preserves audit trails
    fact = dna1.to_fact(source_file=art.filename, sha256=art.sha256)
    assert fact.id == dna1.evidence_id
    assert fact.source_file == art.filename
    assert fact.sha256 == art.sha256
    assert fact.raw_payload["source_raw_text"] == dna1.source_raw_text


def test_evidence_review_status_transitions(temp_case_store: CaseStore):
    """Validates human review workflow: changing status and logging to custody ledger."""
    temp_case_store.create_case("CASE-REVIEW-TEST", title="Review Workflow Test")
    csv_bytes = b"caller,callee,timestamp\n+919876500001,+919876500002,2026-03-15T12:00:00\n"

    art, _, dna_items = temp_case_store.register_artifact(
        case_id="CASE-REVIEW-TEST",
        filename="cdr.csv",
        file_bytes=csv_bytes,
    )
    evidence_id = dna_items[0].evidence_id

    # Initial status
    initial_dna = temp_case_store.get_evidence_dna("CASE-REVIEW-TEST", evidence_id)
    assert initial_dna.review_status == "UNREVIEWED"

    # Update review to ACCEPTED
    updated = temp_case_store.update_evidence_review(
        case_id="CASE-REVIEW-TEST",
        evidence_id=evidence_id,
        review_status="ACCEPTED",
        reviewed_by="Insp. R. Varma",
        review_notes="Verified against carrier CDR bill record.",
        field_overrides={"notes": "Carrier authenticated"},
    )
    assert updated is not None
    assert updated.review_status == "ACCEPTED"
    assert updated.reviewed_by == "Insp. R. Varma"
    assert updated.review_notes == "Verified against carrier CDR bill record."
    assert updated.review_timestamp_iso is not None

    # Custody log captured review decision
    ledger = temp_case_store.get_ledger("CASE-REVIEW-TEST")
    latest_entry = ledger.get_latest_entry()
    assert latest_entry.action == "UPDATE_DNA_REVIEW"
    assert latest_entry.fact_id == evidence_id
    assert ledger.verify_chain().is_valid is True


def test_integrity_verification_and_mutation_detection(temp_case_store: CaseStore):
    """Validates bitstream re-hashing against disk storage and detection of file mutation."""
    temp_case_store.create_case("CASE-INTEGRITY-TEST", title="Integrity Test")
    data = b"Authentic forensic telemetry records."

    art, _, _ = temp_case_store.register_artifact(
        case_id="CASE-INTEGRITY-TEST",
        filename="log.txt",
        file_bytes=data,
    )

    # Initial integrity check: INTACT
    report1 = temp_case_store.verify_case_integrity("CASE-INTEGRITY-TEST")
    assert report1["overall_integrity_intact"] is True
    assert report1["artifacts"][0]["status"] == "INTACT"

    # Adversarially alter one byte of the stored file
    stored_path = temp_case_store.get_case_dir("CASE-INTEGRITY-TEST") / art.storage_path
    with open(stored_path, "wb") as f:
        f.write(b"Corrupted forensic telemetry records.")

    # Re-verify: must pinpoint hash mismatch
    report2 = temp_case_store.verify_case_integrity("CASE-INTEGRITY-TEST")
    assert report2["overall_integrity_intact"] is False
    assert report2["artifacts"][0]["status"] == "HASH_MISMATCH"
    assert report2["artifacts"][0]["intact"] is False


def test_explicit_integrity_limitation_disclosure_present():
    """Validates that explicit integrity limitation text is present on all models and schemas."""
    # Limitation text must state hashes verify bitstream transfer but do not prove external authenticity
    assert "bitstream" in INTEGRITY_LIMITATION_DISCLOSURE.lower()
    assert "does not establish" in INTEGRITY_LIMITATION_DISCLOSURE.lower() or "not prove" in INTEGRITY_LIMITATION_DISCLOSURE.lower()

    # Banned terms scan on disclosure strings
    for banned in ["culprit", "guilty", "court-ready", "proves identity", "proof of identity"]:
        assert banned not in INTEGRITY_LIMITATION_DISCLOSURE.lower()
        assert banned not in EVIDENCE_DNA_DISCLOSURE.lower()


def test_api_endpoints_full_phase1_flow(client: TestClient):
    """End-to-end integration test across all Phase 1 FastAPI endpoints."""
    import shutil
    from tarka.api.server import CASES_DIR
    test_case_id = "CASE-E2E-2026"
    test_case_dir = CASES_DIR / test_case_id
    if test_case_dir.exists():
        shutil.rmtree(test_case_dir, ignore_errors=True)

    try:
        # 1. Create a Case
        case_payload = {
            "case_id": test_case_id,
            "title": "E2E Digital Evidence Case",
            "description": "Integration testing case",
            "investigator": "Lead Forensic Examiner",
            "jurisdiction": "Cyber Operations Cell",
        }
        r = client.post("/api/cases", json=case_payload)
        assert r.status_code == 200
        case_resp = r.json()
        assert case_resp["case_id"] == test_case_id
        assert case_resp["status"] == "ACTIVE"
        assert "bitstream" in case_resp["integrity_limitation"].lower()

        # Verify Scope header
        assert r.headers.get("x-forensic-scope") == "Local-Synthetic-Demo-Only"

        # 2. Register Artifact
        csv_content = b"caller,callee,timestamp,duration\n+919988776655,+919988776644,2026-03-15T16:00:00,45\n"
        files = {"file": ("e2e_cdr.csv", csv_content, "text/csv")}
        data = {
            "source_tier": "T1",
            "source_device": "Telco CDR Switch #9",
            "intake_officer": "Insp. Kumar",
            "intake_notes": "Seized via formal request",
        }
        r_reg = client.post(f"/api/cases/{test_case_id}/artifacts", files=files, data=data)
        assert r_reg.status_code == 200
        reg_data = r_reg.json()
        assert reg_data["status"] == "REGISTERED"
        assert reg_data["is_duplicate"] is False
        art_id = reg_data["artifact"]["artifact_id"]
        assert len(reg_data["evidence_dna"]) == 1
        evidence_id = reg_data["evidence_dna"][0]["evidence_id"]

        # 3. Test Duplicate Handling via API
        r_dup = client.post(f"/api/cases/{test_case_id}/artifacts", files=files, data=data)
        assert r_dup.status_code == 200
        dup_data = r_dup.json()
        assert dup_data["status"] == "DUPLICATE_ARTIFACT"
        assert dup_data["is_duplicate"] is True
        assert dup_data["artifact"]["artifact_id"] == art_id

        # 4. List Artifacts
        r_list = client.get(f"/api/cases/{test_case_id}/artifacts")
        assert r_list.status_code == 200
        artifacts_list = r_list.json()
        assert len(artifacts_list) == 1
        assert artifacts_list[0]["artifact_id"] == art_id

        # 5. Get Artifact Detail
        r_detail = client.get(f"/api/cases/{test_case_id}/artifacts/{art_id}")
        assert r_detail.status_code == 200
        detail_data = r_detail.json()
        assert detail_data["integrity_intact"] is True
        assert detail_data["artifact"]["sha256"] == hashlib.sha256(csv_content).hexdigest()
        assert len(detail_data["evidence_dna"]) == 1

        # 6. Raw Artifact Download
        r_raw = client.get(f"/api/cases/{test_case_id}/artifacts/{art_id}/raw")
        assert r_raw.status_code == 200
        assert r_raw.content == csv_content

        # 7. List Evidence DNA
        r_ev_list = client.get(f"/api/cases/{test_case_id}/evidence")
        assert r_ev_list.status_code == 200
        ev_list = r_ev_list.json()
        assert len(ev_list) == 1
        assert ev_list[0]["evidence_id"] == evidence_id
        assert ev_list[0]["source_raw_text"].strip() == "+919988776655,+919988776644,2026-03-15T16:00:00,45"

        # 8. Examiner Review of Evidence DNA
        review_body = {
            "review_status": "ACCEPTED",
            "reviewed_by": "Senior Examiner Verma",
            "review_notes": "Corroborated with primary billing ledger",
        }
        r_rev = client.patch(f"/api/cases/{test_case_id}/evidence/{evidence_id}/review", json=review_body)
        assert r_rev.status_code == 200
        rev_data = r_rev.json()
        assert rev_data["review_status"] == "ACCEPTED"
        assert rev_data["reviewed_by"] == "Senior Examiner Verma"

        # 9. Verify Case Integrity Report
        r_integ = client.get(f"/api/cases/{test_case_id}/integrity")
        assert r_integ.status_code == 200
        integ_data = r_integ.json()
        assert integ_data["overall_integrity_intact"] is True
        assert integ_data["total_artifacts_verified"] == 1
        assert integ_data["custody_ledger_valid"] is True
    finally:
        if test_case_dir.exists():
            shutil.rmtree(test_case_dir, ignore_errors=True)

