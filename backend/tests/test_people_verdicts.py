"""People & Accounts: "Confirm mule" / "Not a mule" and "Merge" / "Not same" verdicts — persisted, audit-logged,
and respected by the network analysis (totals still reconcile)."""

from test_ingestion_networks import CASE, GANG_CSV, client, upload  # noqa: F401  (fixture reuse)

from app.services.ingestion.account_verdicts import VerdictStore
from app.services.ingestion.networks import analyze

FLOWS = [
    ("victim1@oksbi", "mule.one@ybl", 500000, 1, 0, 0),
    ("victim2@okaxis", "mule.one@ybl", 200000, 1, 1800, 1800),
    ("mule.one@ybl", "mule.two@ibl", 650000, 1, 3600, 3600),
    ("mule.two@ibl", "ATM CASH WITHDRAWAL", 600000, 1, 7200, 7200),
]


def _reconciles(net):
    return abs(net["cashed_out_inr"] + net["recoverable_inr"] + net["unaccounted_inr"] - net["amount_inr"]) < 0.01


def test_not_a_mule_leaves_recoverable_and_still_reconciles():
    base = analyze(FLOWS)["networks"][0]
    assert base["mule_count"] == 2 and base["recoverable_inr"] == 100000 and _reconciles(base)

    out = analyze(FLOWS, verdicts={"mule.two@ibl": "NOT_MULE"})["networks"][0]
    m2 = next(m for m in out["members"] if m["id"] == "mule.two@ibl")
    assert m2["role"] == "UNKNOWN" and m2["verdict"] == "NOT_MULE" and m2["held_inr"] == 0
    assert out["mule_count"] == 1 and out["network_id"] == base["network_id"]  # same gang, same id
    assert out["amount_inr"] == base["amount_inr"] and out["recoverable_inr"] == 50000  # mule.two's 50k left recoverable
    assert _reconciles(out)
    # members carry money in / out for the dossier
    assert (m2["in_inr"], m2["out_inr"]) == (650000, 600000)


def test_confirmed_mule_is_promoted():
    flows = FLOWS + [("victim1@oksbi", "slowmule@ybl", 10000, 1, 0, 0), ("slowmule@ybl", "x@ybl", 1000, 1, 999999, 999999)]
    assert not any(m["id"] == "slowmule@ybl" and m["role"] == "MULE"
                   for n in analyze(flows)["networks"] for m in n["members"])
    out = analyze(flows, verdicts={"slowmule@ybl": "CONFIRMED_MULE"})
    m = next(m for n in out["networks"] for m in n["members"] if m["id"] == "slowmule@ybl")
    assert m["role"] == "MULE" and m["verdict"] == "CONFIRMED_MULE" and m["held_inr"] == 9000
    assert all(_reconciles(n) for n in out["networks"])


def test_account_verdict_api_updates_networks_and_logs(client):
    upload(client, GANG_CSV)
    url = f"/api/v1/cases/{CASE}/accounts/verdict"
    nets = lambda: client.get(f"/api/v1/cases/{CASE}/networks").json()["networks"]  # noqa: E731
    before = nets()[0]

    assert client.put(url, json={"account": "mule.two@ibl", "verdict": "NOT_MULE"}).status_code == 422  # reason
    assert client.put(url, json={"account": "nobody@ybl", "verdict": "CONFIRMED_MULE"}).status_code == 404
    assert client.put(url, json={"account": "mule.two@ibl", "verdict": "BOGUS"}).status_code == 422
    r = client.put(url, json={"account": " Mule.Two@IBL", "verdict": "NOT_MULE", "reason": "Salary account, verified"})
    assert r.status_code == 200 and r.json()["verdict"] == "NOT_MULE"

    after = nets()[0]
    assert after["mule_count"] == before["mule_count"] - 1
    assert after["recoverable_inr"] < before["recoverable_inr"] and _reconciles(after)

    assert client.put(url, json={"account": "mule.two@ibl", "verdict": None}).status_code == 200  # undo
    assert nets()[0]["mule_count"] == before["mule_count"]
    hist = client.get(f"/api/v1/cases/{CASE}/accounts/history", params={"account": "mule.two@ibl"}).json()
    assert [h["after"] and h["after"]["verdict"] for h in hist] == ["NOT_MULE", None]
    assert hist[0]["after"]["reason"] == "Salary account, verified" and all(h["actor"] for h in hist)


def test_pair_verdict_api(client):
    gang = GANG_CSV + b"22/09/2026,12:00:00,REFUND mule.one@ybl,y@ybl,10,6\n"
    upload(client, gang)
    queue = client.get(f"/api/v1/cases/{CASE}/networks").json()["review_queue"]
    assert queue and queue[0]["verdict"] is None and queue[0]["key"]
    a, b = queue[0]["a"], queue[0]["b"]
    url = f"/api/v1/cases/{CASE}/review/verdict"
    assert client.put(url, json={"a": a, "b": b, "verdict": "NOT_SAME"}).status_code == 422  # reason
    assert client.put(url, json={"a": "x", "b": "y", "verdict": "MERGE"}).status_code == 404
    assert client.put(url, json={"a": b, "b": a, "verdict": "MERGE"}).status_code == 200  # order-free
    assert client.get(f"/api/v1/cases/{CASE}/networks").json()["review_queue"][0]["verdict"] == "MERGE"


def test_verdict_audit_chain_detects_tampering(tmp_path):
    import sqlite3

    store = VerdictStore(tmp_path)
    store.set("C1", "account", "a@ybl", "IO1", "NOT_MULE", "verified salary")
    store.set("C1", "pair", "a|b", "IO1", "MERGE")
    assert store.verify_chain()
    with sqlite3.connect(store.path) as db:
        db.execute("UPDATE entity_verdict_log SET after_json = '{}' WHERE seq = 1")
    assert not store.verify_chain()
