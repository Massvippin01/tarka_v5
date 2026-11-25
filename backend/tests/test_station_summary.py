"""GET /api/v1/station/summary: the one-request Station overview must agree with each case's own pages."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.ingestion.large_evidence_engine import IngestionJobManager
from tests.test_ingestion_networks import GANG_CSV, SECOND_GANG_CSV, upload

# shares mule.two@ibl with GANG_CSV, so both cases carry one cross-case hit
SHARED_CSV = (
    "txn_date,txn_time,payer,payee,amount,rrn\n"
    "25/09/2026,10:00:00,victim9@ybl,mule.two@ibl,150000,21\n"
    "25/09/2026,10:30:00,mule.two@ibl,WAZIRX CRYPTO,140000,22\n"
).encode()


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(IngestionJobManager, "_instance", IngestionJobManager(base_dir=tmp_path))
    c = TestClient(app)
    c.headers["Authorization"] = f"Bearer {AuthService.get_instance().create_jwt_token('SUPERVISOR_NCR')}"
    return c


def _case(client, title, *files):
    case_id = client.post("/api/v1/projects/cases", json={"title": title}).json()["case_id"]
    for i, payload in enumerate(files):
        assert upload(client, payload, case_id=case_id, filename=f"s{i}.csv")["stage"] == "EVIDENCE_AVAILABLE"
    return case_id


def _rows(client):
    body = client.get("/api/v1/station/summary").json()
    return body, {r["caseId"]: r for r in body["cases"]}


def test_summary_matches_case_pages(client):
    a = _case(client, "Gang A", GANG_CSV, SECOND_GANG_CSV)
    b = _case(client, "Gang B", SHARED_CSV)
    body, rows = _rows(client)

    for case_id in (a, b):
        bundle = client.get(f"/api/v1/cases/{case_id}/bundle").json()
        nets = client.get(f"/api/v1/cases/{case_id}/networks").json()
        row = rows[case_id]
        assert row["analysis"] == "ready"
        assert row["title"] == bundle["title"]
        assert row["bookedLossInr"] == bundle["bookedLossInr"] > 0
        assert row["recoverableInr"] == bundle["recoverableLibrInr"]
        assert row["cashedOutInr"] == bundle["cashedOutInr"]
        assert row["unaccountedInr"] == bundle["unaccountedInr"]
        assert row["networks"] == len(nets["networks"])
        assert row["mules"] == sum(n["mule_count"] for n in nets["networks"])
        assert row["crossCaseHits"] == len(nets["cross_case_hits"]) == 1
    assert body["totals"]["bookedLossInr"] == sum(r["bookedLossInr"] for r in rows.values())
    assert body["totals"]["cases"] == 2 and rows[a]["lifecycle"] == "INVESTIGATING"


def test_summary_follows_data_and_respects_access(client):
    a = _case(client, "Gang A", GANG_CSV)
    _, rows = _rows(client)
    assert rows[a]["bookedLossInr"] == 700000 and rows[a]["crossCaseHits"] == 0

    _case(client, "Gang B", SHARED_CSV)  # new data anywhere invalidates the cached summary
    _, rows = _rows(client)
    assert rows[a]["crossCaseHits"] == 1

    other = {"Authorization": f"Bearer {AuthService.get_instance().create_jwt_token('INVESTIGATOR_DELHI')}"}
    assert client.get("/api/v1/station/summary", headers=other).json()["cases"] == []  # not their cases
    assert client.get("/api/v1/station/summary", headers={"Authorization": "Bearer nope"}).status_code in (401, 403)
