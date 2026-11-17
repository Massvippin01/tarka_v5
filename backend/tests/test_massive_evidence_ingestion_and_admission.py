"""Tests for Massive Evidence Ingestion Engine, Resource Admission Controller, and Pipeline Lifecycle."""

import io
import os
import zipfile
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.ingestion.large_evidence_engine import (
    AdmissionDecision,
    ArchiveSafetyQuarantine,
    FormatSignatureValidator,
    IngestionJobManager,
    IngestionStage,
    OperationalClass,
    ResourceAdmissionController,
    StreamingChunkedHasher,
)


@pytest.fixture
def auth_headers():
    token = AuthService.get_instance().create_jwt_token("SUPERVISOR_NCR")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    # Fresh job store per test: the same payload re-uploaded across runs would otherwise be a DUPLICATE.
    monkeypatch.setattr(IngestionJobManager, "_instance", IngestionJobManager(base_dir=tmp_path))
    return TestClient(app)


# ────────────────────────────────────────────────────────────────────
# 1. Resource Admission Controller & Threshold Tests
# ────────────────────────────────────────────────────────────────────

def test_01_workload_classification():
    """Verify mathematical workload tiers based on size."""
    assert ResourceAdmissionController.classify_workload(1024 * 1024) == OperationalClass.SMALL
    assert ResourceAdmissionController.classify_workload(20 * 1024 * 1024) == OperationalClass.MEDIUM
    assert ResourceAdmissionController.classify_workload(250 * 1024 * 1024) == OperationalClass.LARGE
    assert ResourceAdmissionController.classify_workload(2 * 1024 * 1024 * 1024) == OperationalClass.VERY_LARGE
    assert ResourceAdmissionController.classify_workload(10 * 1024 * 1024 * 1024) == OperationalClass.BULK_DATASET


def test_02_resource_budget_estimation():
    """Verify format-specific amplification multiplier calculations."""
    budget_csv = ResourceAdmissionController.estimate_job_resource_budget(10 * 1024 * 1024, "bank_export.csv")
    assert budget_csv["parser_multiplier"] == 2.5
    assert budget_csv["operational_class"] == "MEDIUM"

    budget_pdf = ResourceAdmissionController.estimate_job_resource_budget(10 * 1024 * 1024, "statement.pdf")
    assert budget_pdf["parser_multiplier"] == 3.0

    budget_xlsx = ResourceAdmissionController.estimate_job_resource_budget(10 * 1024 * 1024, "ledger.xlsx")
    assert budget_xlsx["parser_multiplier"] == 4.0


def test_03_admission_decision_logic():
    """Verify dynamic admission control: immediate admission vs rejection when exceeding memory."""
    # Small file: immediate admission
    res = ResourceAdmissionController.evaluate_admission(
        file_size_bytes=2 * 1024 * 1024,
        filename="complaint.pdf",
        current_active_workers=0,
    )
    assert res["decision"] == AdmissionDecision.ADMIT_IMMEDIATE.value

    # Hypothetical astronomical file: safe rejection
    res_huge = ResourceAdmissionController.evaluate_admission(
        file_size_bytes=500 * 1024 * 1024 * 1024,  # 500 GB
        filename="impossible_dump.raw",
    )
    assert res_huge["decision"] in (AdmissionDecision.REJECT_UNSAFE.value, AdmissionDecision.QUEUE_CONSTRAINED.value)


# ────────────────────────────────────────────────────────────────────
# 2. Format Signature & Magic Byte Verification
# ────────────────────────────────────────────────────────────────────

def test_04_format_signature_validation():
    """Verify magic byte matching for authentic digital evidence."""
    # Authentic PDF header
    ok, fmt, _ = FormatSignatureValidator.validate_signature("doc.pdf", b"%PDF-1.7\n%...")
    assert ok is True
    assert fmt == "pdf"

    # Authentic PNG header
    ok, fmt, _ = FormatSignatureValidator.validate_signature("snap.png", b"\x89PNG\r\n\x1a\n\x00\x00")
    assert ok is True
    assert fmt == "png"

    # Plain text UTF-8 CSV
    ok, fmt, _ = FormatSignatureValidator.validate_signature("txn.csv", b"txn_id,amount,timestamp\nTX1,500,2026-01-01")
    assert ok is True
    assert fmt == "csv"

    # Executable header disguised as PDF -> must fail
    ok, fmt, msg = FormatSignatureValidator.validate_signature("malware.pdf", b"MZ\x90\x00\x03\x00\x00\x00")
    assert ok is False


# ────────────────────────────────────────────────────────────────────
# 3. Archive Safety & Zip Bomb Defense
# ────────────────────────────────────────────────────────────────────

def test_05_archive_safety_quarantine(tmp_path):
    """Verify protection against zip bombs and directory traversal."""
    # 1. Normal safe zip
    safe_zip_path = tmp_path / "safe.zip"
    with zipfile.ZipFile(safe_zip_path, "w") as zf:
        zf.writestr("evidence_log.txt", "Normal transaction evidence log content")
    ok, msg, telemetry = ArchiveSafetyQuarantine.audit_archive_file(safe_zip_path)
    assert ok is True
    assert telemetry["file_count"] == 1

    # 2. Directory traversal attempt
    traversal_zip_path = tmp_path / "traversal.zip"
    with zipfile.ZipFile(traversal_zip_path, "w") as zf:
        zf.writestr("../../../etc/shadow", "malicious payload")
    ok, msg, _ = ArchiveSafetyQuarantine.audit_archive_file(traversal_zip_path)
    assert ok is False
    assert "Directory traversal" in msg

    # 3. Zip bomb ratio threshold (>10:1 ratio)
    bomb_zip_path = tmp_path / "bomb.zip"
    with zipfile.ZipFile(bomb_zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        # 12 MB of zeroes compresses to ~12 KB -> ratio > 100:1
        zf.writestr("huge_zeroes.dat", b"\x00" * (12 * 1024 * 1024))
    ok, msg, _ = ArchiveSafetyQuarantine.audit_archive_file(bomb_zip_path)
    assert ok is False
    assert "ratio" in msg.lower() or "bomb" in msg.lower()


# ────────────────────────────────────────────────────────────────────
# 4. Streaming Chunked Hasher Tests
# ────────────────────────────────────────────────────────────────────

def test_06_streaming_chunked_hasher():
    """Verify chunked incremental SHA-256 matches monolithic hash."""
    import hashlib
    data = os.urandom(256 * 1024)  # 256 KB random bytes
    expected_sha256 = hashlib.sha256(data).hexdigest()

    hasher = StreamingChunkedHasher()
    # Stream in 64 KB pieces
    for i in range(0, len(data), 64 * 1024):
        hasher.update(data[i : i + 64 * 1024])

    assert hasher.hexdigest == expected_sha256
    assert len(hasher.chunk_manifest) == 4


# ────────────────────────────────────────────────────────────────────
# 5. Full REST API Ingestion Pipeline Execution (10 Stages)
# ────────────────────────────────────────────────────────────────────

def test_07_rest_api_full_ingestion_lifecycle(client, auth_headers):
    """Verify complete 10-stage lifecycle via REST APIs."""
    case_id = "CASE-2026-001"
    filename = "cbs_statement_bank_verified.csv"
    payload = b"transaction_id,amount,utr,account,date\nTXN-001,8500000,UTR8492049,ACC-9921,2026-11-14T10:00:00Z\n"
    total_size = len(payload)

    # 1. Capacity check
    cap_res = client.get("/api/v1/ingestion/system-capacity", headers=auth_headers)
    assert cap_res.status_code == 200
    assert "memory_headroom" in cap_res.json()

    # 2. Resource estimate
    est_res = client.post(
        "/api/v1/ingestion/estimate-resources",
        json={"case_id": case_id, "filename": filename, "file_size_bytes": total_size},
        headers=auth_headers,
    )
    assert est_res.status_code == 200
    assert est_res.json()["decision"] == "ADMIT_IMMEDIATE"

    # 3. Create ingestion job
    create_res = client.post(
        "/api/v1/ingestion/jobs/create",
        json={"case_id": case_id, "filename": filename, "total_size_bytes": total_size},
        headers=auth_headers,
    )
    assert create_res.status_code == 200
    job_data = create_res.json()
    job_id = job_data["job_id"]
    assert job_data["stage"] == "FILE_RECEIVED"

    # 4. Stream chunk
    chunk_res = client.put(
        f"/api/v1/ingestion/jobs/{job_id}/chunk?offset=0",
        content=payload,
        headers=auth_headers,
    )
    assert chunk_res.status_code == 200
    assert chunk_res.json()["bytes_uploaded"] == total_size

    # 5. Poll status until pipeline completes or reaches EVIDENCE_AVAILABLE
    import time
    final_status = None
    for _ in range(20):
        time.sleep(0.08)
        st_res = client.get(f"/api/v1/ingestion/jobs/{job_id}/status", headers=auth_headers)
        assert st_res.status_code == 200
        data = st_res.json()
        if data["stage"] in ("EVIDENCE_AVAILABLE", "ANALYTICAL_PROCESSING_COMPLETED"):
            final_status = data
            break

    assert final_status is not None
    assert final_status["sha256"] is not None
    assert final_status["admitted_artifact_id"] is not None
    summary = final_status["analytics_summary"]
    assert summary["rows_accepted"] == 1 and summary["rows_rejected"] == 0
    assert summary["row_accounting"] == "ALL_ROWS_ACCOUNTED"


def test_08_pause_resume_cancel_job(client, auth_headers):
    """Verify pause, resume, and cancellation mechanics for ingestion jobs."""
    case_id = "CASE-2026-001"
    create_res = client.post(
        "/api/v1/ingestion/jobs/create",
        json={"case_id": case_id, "filename": "large_archive.zip", "total_size_bytes": 1000000},
        headers=auth_headers,
    )
    job_id = create_res.json()["job_id"]

    # Pause
    pause_res = client.post(f"/api/v1/ingestion/jobs/{job_id}/pause", headers=auth_headers)
    assert pause_res.status_code == 200
    assert pause_res.json()["is_paused"] is True

    # Resume
    resume_res = client.post(f"/api/v1/ingestion/jobs/{job_id}/resume", headers=auth_headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["is_paused"] is False
    assert resume_res.json()["retry_count"] == 1

    # Cancel
    cancel_res = client.post(f"/api/v1/ingestion/jobs/{job_id}/cancel", headers=auth_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["is_cancelled"] is True

