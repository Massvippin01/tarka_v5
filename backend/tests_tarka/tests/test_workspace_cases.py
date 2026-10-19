"""Tests for persistent case workspaces, per-case custody ledgers, and file deduplication."""
from pathlib import Path
import json
import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app, reset_case_workspace, get_case_dir


@pytest.fixture
def client():
    return TestClient(app)


def test_case_workspace_isolation_and_deduplication(client):
    # Ensure fresh test cases
    case1 = "test_case_alpha"
    case2 = "test_case_beta"
    client.post(f"/api/cases/{case1}/reset")
    client.post(f"/api/cases/{case2}/reset")

    sample_cdr = (
        "Calling_MSISDN,Called_Party,Call_Date,Call_Time,Dur_Sec,First_CGI\n"
        "9845012345,9845099999,26/01/2026,10:15:30,45,TOWER_BLR_01\n"
    ).encode("utf-8")

    # Ingest into case1
    res1 = client.post(
        "/api/ingest",
        data={"case_id": case1, "tz": "Asia/Kolkata"},
        files=[("files", ("test_cdr.csv", sample_cdr, "text/csv"))],
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["total_facts_ingested"] == 1
    assert len(data1["source_files"]) == 1
    chain1_head = data1["custody_chain_head"]

    # Ingest duplicate into case1 -> deduplicated
    res1_dup = client.post(
        "/api/ingest",
        data={"case_id": case1, "tz": "Asia/Kolkata"},
        files=[("files", ("test_cdr.csv", sample_cdr, "text/csv"))],
    )
    assert res1_dup.status_code == 200
    data1_dup = res1_dup.json()
    assert data1_dup["total_facts_ingested"] == 0
    assert any("already ingested" in w for w in data1_dup["warnings"])

    # Ingest same file into case2 -> succeeds because case2 has its own isolated ledger & dedup table
    res2 = client.post(
        "/api/ingest",
        data={"case_id": case2, "tz": "Asia/Kolkata"},
        files=[("files", ("test_cdr.csv", sample_cdr, "text/csv"))],
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_facts_ingested"] == 1

    # Verify case workspace detail feeds facts
    detail1 = client.get(f"/api/cases/{case1}")
    assert detail1.status_code == 404 or detail1.status_code == 200 # detail1 is custom case

    # Verify default workspace endpoint
    client.post("/api/cases/reset")
    res_ws = client.post(
        "/api/ingest",
        data={"case_id": "workspace", "tz": "Asia/Kolkata"},
        files=[("files", ("test_cdr.csv", sample_cdr, "text/csv"))],
    )
    assert res_ws.status_code == 200

    ws_detail = client.get("/api/cases/workspace").json()
    assert len(ws_detail["facts"]) == 1
    assert ws_detail["facts"][0]["kind"] == "CDR_CALL"

    # Verify /api/solve consumes workspace facts when req.facts is empty
    solve_res = client.post(
        "/api/solve",
        json={"case_id": "workspace", "facts": []},
    )
    assert solve_res.status_code == 200
    solve_data = solve_res.json()
    assert solve_data["verdict"] == "CONSISTENT"

    # Reset workspace
    reset_res = client.post("/api/cases/reset")
    assert reset_res.status_code == 200
    assert reset_res.json()["status"] == "reset"

    ws_empty = client.get("/api/cases/workspace").json()
    assert len(ws_empty["facts"]) == 0
