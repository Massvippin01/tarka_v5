"""Per-network status + decisions (Fraud Network page decision bar): persistence, validation, audit chain."""

import sqlite3

from test_ingestion_networks import CASE, CASE2, GANG_CSV, client, upload  # noqa: F401  (fixture reuse)

from app.services.ingestion.network_decisions import NetworkDecisionStore


def _net(client, case_id=CASE):
    return client.get(f"/api/v1/cases/{case_id}/networks").json()["networks"][0]


def test_status_defaults_new_and_decisions_persist(client):
    upload(client, GANG_CSV)
    net = _net(client)
    assert net["triage"]["status"] == "NEW" and net["triage"]["decision"] is None
    url = f"/api/v1/cases/{CASE}/networks/{net['network_id']}/status"

    r = client.put(url, json={"decision": "INVESTIGATE"})
    assert r.status_code == 200 and r.json()["status"] == "UNDER_REVIEW"
    r = client.put(url, json={"status": "FREEZES_SENT"})
    assert r.json()["status"] == "FREEZES_SENT" and r.json()["decision"] == "INVESTIGATE"
    assert _net(client)["triage"]["status"] == "FREEZES_SENT"

    r = client.put(url, json={"decision": "MERGE_FIR", "target_case_id": CASE2})
    assert r.json()["status"] == "CASE_OPENED" and r.json()["target_case_id"] == CASE2

    hist = client.get(f"/api/v1/cases/{CASE}/networks/{net['network_id']}/history").json()
    assert [h["after"]["status"] for h in hist] == ["UNDER_REVIEW", "FREEZES_SENT", "CASE_OPENED"]
    assert hist[0]["before"]["status"] == "NEW" and all(h["actor"] for h in hist)


def test_decision_validation(client):
    upload(client, GANG_CSV)
    net = _net(client)
    url = f"/api/v1/cases/{CASE}/networks/{net['network_id']}/status"
    assert client.put(url, json={"decision": "DISMISS"}).status_code == 422  # reason required
    assert client.put(url, json={"decision": "MERGE_FIR"}).status_code == 422  # target required
    assert client.put(url, json={"decision": "MERGE_FIR", "target_case_id": CASE}).status_code == 422  # itself
    assert client.put(url, json={"decision": "NUKE"}).status_code == 422
    assert client.put(url, json={}).status_code == 422
    assert client.put(f"/api/v1/cases/{CASE}/networks/NET-NOPE/status", json={"decision": "INVESTIGATE"}).status_code == 404
    assert client.put(url, json={"decision": "MERGE_FIR", "target_case_id": "CASE-NOT-MINE-999"}).status_code == 403
    r = client.put(url, json={"decision": "DISMISS", "reason": "Salary + rent look-alike"})
    assert r.status_code == 200 and r.json()["status"] == "CLOSED" and r.json()["reason"] == "Salary + rent look-alike"


def test_audit_chain_detects_tampering(tmp_path):
    store = NetworkDecisionStore(tmp_path)
    store.set("C1", "N1", "u1", decision="INVESTIGATE")
    store.set("C1", "N1", "u1", decision="DISMISS", reason="not a gang")
    store.set("C2", "N1", "u2", status="FREEZES_SENT")
    assert store.verify_chain()
    assert store.get("C2", "N1")["status"] == "FREEZES_SENT" and store.get("C1", "N1")["status"] == "CLOSED"
    with sqlite3.connect(store.path) as db:
        db.execute("UPDATE network_status_log SET after_json = replace(after_json, 'CLOSED', 'NEW') WHERE seq = 2")
    assert not store.verify_chain()
