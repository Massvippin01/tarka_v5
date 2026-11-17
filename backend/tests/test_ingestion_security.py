"""Phase 1A: upload-path security (traversal, case access, chunk caps, overflow, replay)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.ingestion.large_evidence_engine import (
    MAX_CHUNK_BYTES,
    IngestionJobManager,
    safe_filename,
)

BASE = "/api/v1/ingestion"


def _headers(user_key: str) -> dict:
    return {"Authorization": f"Bearer {AuthService.get_instance().create_jwt_token(user_key)}"}


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def _cancel_leftover_jobs():
    # The job manager is a process-wide singleton; unfinished jobs would count as active workers in other tests.
    mgr = IngestionJobManager.get_instance()
    before = set(mgr.jobs)
    yield
    for job_id in set(mgr.jobs) - before:
        mgr.cancel_job(job_id)


@pytest.fixture
def sup():
    return _headers("SUPERVISOR_NCR")


def _create(client, headers, case_id="CASE-2026-001", filename="stmt.csv", size=10):
    return client.post(
        f"{BASE}/jobs/create",
        json={"case_id": case_id, "filename": filename, "total_size_bytes": size},
        headers=headers,
    )


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("../../etc/passwd", "passwd"),
        ("..\\..\\windows\\win.ini", "win.ini"),
        ("C:\\evil\\x.csv", "x.csv"),
        ("..", "upload.bin"),
        ("ok name (1).csv", "ok name (1).csv"),
    ],
)
def test_safe_filename_strips_paths(raw, expected):
    assert safe_filename(raw) == expected


def test_traversal_filename_stays_in_staging(client, sup):
    res = _create(client, sup, filename="../../../evil.csv")
    assert res.status_code == 200
    job = IngestionJobManager.get_instance().jobs[res.json()["job_id"]]
    assert job.filename == "evil.csv"
    staging = IngestionJobManager.get_instance().staging_dir.resolve()
    assert job.staging_path.is_relative_to(staging)


def test_traversal_case_id_rejected(client, sup):
    assert _create(client, sup, case_id="../../etc").status_code == 422


def test_chunk_requires_access_to_jobs_case(client, sup):
    job_id = _create(client, sup, case_id="CASE-2026-002").json()["job_id"]
    other = _headers("INVESTIGATOR_GURUGRAM")  # scoped to CASE-2026-001 only
    res = client.put(f"{BASE}/jobs/{job_id}/chunk?offset=0", content=b"x" * 10, headers=other)
    assert res.status_code == 403
    assert client.get(f"{BASE}/jobs/{job_id}/status", headers=other).status_code == 403
    assert client.post(f"{BASE}/jobs/{job_id}/cancel", headers=other).status_code == 403


def test_oversized_chunk_rejected(client, sup):
    job_id = _create(client, sup, size=MAX_CHUNK_BYTES * 2).json()["job_id"]
    res = client.put(f"{BASE}/jobs/{job_id}/chunk?offset=0", content=b"x" * (MAX_CHUNK_BYTES + 1), headers=sup)
    assert res.status_code == 413
    assert IngestionJobManager.get_instance().jobs[job_id].bytes_uploaded == 0


def test_bytes_beyond_declared_size_rejected(client, sup):
    job_id = _create(client, sup, size=10).json()["job_id"]
    res = client.put(f"{BASE}/jobs/{job_id}/chunk?offset=0", content=b"x" * 11, headers=sup)
    assert res.status_code == 409
    assert IngestionJobManager.get_instance().jobs[job_id].bytes_uploaded == 0


def test_chunk_after_completion_rejected(client, sup):
    payload = b"a,b\n1,2\n"
    job_id = _create(client, sup, size=len(payload)).json()["job_id"]
    assert client.put(f"{BASE}/jobs/{job_id}/chunk?offset=0", content=payload, headers=sup).status_code == 200
    again = client.put(f"{BASE}/jobs/{job_id}/chunk?offset={len(payload)}", content=b"", headers=sup)
    assert again.status_code == 409
