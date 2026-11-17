"""Evidence & Ledger: paged ledger rows with filters/scope, rejected rows with reasons, chain of custody."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.ingestion.large_evidence_engine import IngestionJobManager, IngestionStage

BASE = "/api/v1/ingestion"
CASE = "CASE-2026-002"  # in SUPERVISOR_NCR's scope, not INVESTIGATOR_GURUGRAM's
CSV = (
    "txn_date,txn_time,payer,payee,amount,rrn\n"
    "22/09/2026,09:14:22,victim@oksbi,mule.one@ybl,285000,626509188410\n"
    "22/09/2026,09:18:04,victim@oksbi,mule.one@ybl,215000,626510149921\n"
    "22/09/2026,09:20:00,mule.one@ybl,SBIN0004821 610514882109,300000,NEFT0001\n"
    "not-a-date,10:00:00,x,y,10,BAD1\n"
    "also-bad,10:00:00,x,y,10,BAD2\n"
    ",10:00:00,x,y,10,BAD3\n"
    "22/09/2026,09:25:00,SBIN0004821 610514882109,ATM CASH,120000,626510149923\n"
).encode()


def _headers(user_key: str) -> dict:
    return {"Authorization": f"Bearer {AuthService.get_instance().create_jwt_token(user_key)}"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(IngestionJobManager, "_instance", IngestionJobManager(base_dir=tmp_path))
    return TestClient(app)


@pytest.fixture
def sup():
    return _headers("SUPERVISOR_NCR")


@pytest.fixture
def job_id(client, sup):
    res = client.post(f"{BASE}/jobs/create", json={"case_id": CASE, "filename": "stmt.csv", "total_size_bytes": len(CSV)},
                      headers=sup)
    jid = res.json()["job_id"]
    assert client.put(f"{BASE}/jobs/{jid}/chunk?offset=0", content=CSV, headers=sup).status_code == 200
    assert IngestionJobManager.get_instance().jobs[jid].stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE
    return jid


def test_txns_page_total_and_order(client, sup, job_id):
    body = client.get(f"{BASE}/cases/{CASE}/txns?limit=2", headers=sup).json()
    assert body["total"] == 4 and body["total_inr"] == 920000.0
    assert [r["amount"] for r in body["rows"]] == [285000.0, 215000.0]  # oldest first
    assert body["rows"][0]["filename"] == "stmt.csv" and body["rows"][0]["rail"] == "UPI"
    nxt = client.get(f"{BASE}/cases/{CASE}/txns?limit=2&offset=2", headers=sup).json()
    assert [r["ref"] for r in nxt["rows"]] == ["NEFT0001", "626510149923"]


def test_txns_filters(client, sup, job_id):
    q = lambda qs: client.get(f"{BASE}/cases/{CASE}/txns?{qs}", headers=sup).json()
    assert q("ref=626510149921")["total"] == 1
    assert q("min_amount=200000&max_amount=290000")["total"] == 2
    assert q("rail=NEFT")["rows"][0]["ref"] == "NEFT0001"
    assert q("rail=Cash")["total"] == 1
    assert q(f"job_id={job_id}")["total"] == 4 and q("job_id=JOB-OTHER")["total"] == 0
    assert q("party=MULE.ONE")["total"] == 3  # payer or payee, case-insensitive
    assert q("account=%20Mule.One@ybl%20")["total_inr"] == 800000.0  # exact account key
    assert client.get(f"{BASE}/cases/{CASE}/txns?rail=SWIFT", headers=sup).status_code == 422


def test_rejected_rows_grouped_by_reason(client, sup, job_id):
    body = client.get(f"{BASE}/jobs/{job_id}/rejected", headers=sup).json()
    assert body["total"] == 3
    assert {g["reason"]: g["count"] for g in body["by_reason"]} == {
        "Failed to parse datetime": 2,
        "Missing or empty transaction date field": 1,
    }
    assert [r["line"] for r in body["rows"]] == [5, 6, 7] and "not-a-date" in body["rows"][0]["raw"]


def test_custody_log_in_order(client, sup, job_id):
    events = client.get(f"{BASE}/cases/{CASE}/custody", headers=sup).json()
    actions = [e["action"] for e in events]
    assert actions == ["Upload started", "Upload received", "Fingerprint taken", "Sealed in evidence store", "Ready"]
    assert events[-1]["detail"] == "4 rows accepted, 3 rejected"
    assert events[0]["filename"] == "stmt.csv" and not events[0]["reconstructed"]


def test_case_isolation(client, sup, job_id):
    other = _headers("INVESTIGATOR_GURUGRAM")
    assert client.get(f"{BASE}/cases/{CASE}/txns", headers=other).status_code == 403
    assert client.get(f"{BASE}/jobs/{job_id}/rejected", headers=other).status_code == 403
    assert client.get(f"{BASE}/cases/{CASE}/custody", headers=other).status_code == 403
    assert client.get(f"{BASE}/cases/..%2Fx/txns", headers=sup).status_code in (403, 404, 422)


def test_empty_case_has_no_rows(client, sup):
    assert client.get(f"{BASE}/cases/{CASE}/txns", headers=sup).json()["total"] == 0
