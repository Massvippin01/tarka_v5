"""Comprehensive tests for TARKA Engine Upgrade:
1. Controller attribution (CONTROLLER_GROUP, >25 NAT exclusion, /attribution API)
2. Time-aware LIBR forward-only tracing (rejects transfer before credit arrives)
3. Slow / dormant mules (sliding 72h burst catches dormant reactivation, protects salary-then-rent)
4. Structuring / layering signals (below-limit, near-identical splits, rapid fan-out, round amounts)
5. Freeze value (held_inr * retention_likelihood decay with hours since last outflow)
6. Sub-groups via Louvain community detection for > 200 member networks + paged /members API
7. LogisticRegression verdict weight tuning (>= 30 verdicts) & model_tune_log
8. IBM AMLworld CSV schema loader & honest evaluation
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.services.ingestion.account_verdicts import VerdictStore
from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.device_store import ingest_device_csv
from app.services.ingestion.large_evidence_engine import IngestionJobManager
from app.services.ingestion.networks import analyze, analyze_store

CASE = "CASE-2026-001"


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(IngestionJobManager, "_instance", IngestionJobManager(base_dir=tmp_path))
    token = AuthService.get_instance().create_jwt_token("SUPERVISOR_NCR")
    c = TestClient(app)
    c.headers["Authorization"] = f"Bearer {token}"
    return c


def _upload(client: TestClient, payload: bytes, filename: str, case_id: str = CASE) -> dict:
    job = client.post(
        "/api/v1/ingestion/jobs/create",
        json={"case_id": case_id, "filename": filename, "total_size_bytes": len(payload)},
    ).json()
    res = client.put(f"/api/v1/ingestion/jobs/{job['job_id']}/chunk?offset=0", content=payload)
    assert res.status_code == 200, res.text
    return client.get(f"/api/v1/ingestion/jobs/{job['job_id']}/status").json()


def test_controller_attribution_groups_and_api(client):
    """14 mule accounts sharing 2 handsets produce CONTROLLER_GROUP attribution while >25 NAT IP is excluded."""
    lines = ["txn_date,txn_time,payer,payee,amount,rrn"]
    dev_lines = ["timestamp,account,imei,client_ip,event"]
    for i in range(14):
        m = f"ctrl_mule_{i:02d}@ybl"
        lines.append(f"22/09/2026,09:{i:02d}:00,victim_ctrl@oksbi,{m},50000,{100 + i}")
        lines.append(f"22/09/2026,10:{i:02d}:00,{m},ATM CASH CTRL,48000,{200 + i}")
        imei = "352099001111111" if i < 7 else "352099002222222"
        dev_lines.append(f"22/09/2026 09:{i:02d}:30,{m},{imei},10.0.0.{i},LOGIN")
    # Overlap link bridging imei1 and imei2 on one mule so they share 1 network of 14 mules on 2 phones
    dev_lines.append("22/09/2026 09:50:00,ctrl_mule_06@ybl,352099002222222,10.0.0.99,LOGIN")
    # 30 unrelated accounts on a carrier NAT IP — must NOT be attributed as one controller
    for j in range(30):
        dev_lines.append(f"22/09/2026 11:{j % 59:02d}:00,nat_user_{j}@oksbi,,49.36.200.1,LOGIN")

    _upload(client, "\n".join(lines).encode(), "txns.csv")
    _upload(client, "\n".join(dev_lines).encode(), "devices.csv")

    res = client.get(f"/api/v1/cases/{CASE}/networks").json()
    net = res["networks"][0]
    controllers = net.get("controllers") or []
    assert len(controllers) == 1
    cg = controllers[0]
    assert cg["role"] == "CONTROLLER_GROUP"
    assert cg["account_count"] == 14
    assert cg["device_count"] == 2
    assert "14 mule accounts are operated from 2 phones" in cg["summary"]
    assert len(cg["evidence_rows"]) > 0
    # Carrier NAT IP accounts not mixed in
    assert not any(a.startswith("nat_user_") for a in cg["accounts"])

    attr = client.get(f"/api/v1/cases/{CASE}/attribution").json()
    assert len(attr["controllers"]) == 1
    assert attr["controllers"][0]["controller_id"] == cg["controller_id"]


def test_time_aware_libr_rejects_impossible_link():
    """A transfer occurring BEFORE any victim credit arrives at account u MUST NOT be linked or traced."""
    raw = [
        (1000.0, "mule_early@ybl", "later_acct@ibl", 20_000.0),  # 5.5h BEFORE any victim credit arrives!
        (21_600.0, "victim_t@oksbi", "mule_early@ybl", 100_000.0),  # victim credit arrives later
        (25_200.0, "mule_early@ybl", "ATM CASH TIME", 70_000.0),  # valid outflow after credit
    ]
    flows = [
        ("mule_early@ybl", "later_acct@ibl", 20_000.0, 1, 1000.0, 1000.0),
        ("victim_t@oksbi", "mule_early@ybl", 100_000.0, 1, 21_600.0, 21_600.0),
        ("mule_early@ybl", "ATM CASH TIME", 70_000.0, 1, 25_200.0, 25_200.0),
    ]
    out = analyze(flows, raw_txns=raw)
    net = out["networks"][0]
    members = {m["id"]: m for m in net["members"]}
    assert members["victim_t@oksbi"]["hop"] == 0
    assert members["mule_early@ybl"]["hop"] == 1
    # later_acct@ibl was paid BEFORE victim_t paid mule_early -> cannot get victim hop distance or trace link
    assert members["later_acct@ibl"]["hop"] is None
    assert not any(a == "mule_early@ybl" and b == "later_acct@ibl" for a, b, _ in net["links"])
    all_hops = [h for vt in net["traces"] for p in vt["paths"] for h in p["hops"]]
    assert "later_acct@ibl" not in all_hops
    # LIBR balance preserved: 100k paid in, 70k cashed out -> remaining net/victim held = 10k (or 30k LIBR capped at net 10k)
    assert members["mule_early@ybl"]["held_inr"] == 10_000.0
    assert net["cashed_out_inr"] == 70_000.0


def test_dormant_mule_caught_via_sliding_72h_while_salary_earner_safe():
    """Account idle for 60 days after small txn then bursting in 72h is flagged; salary-then-rent stays unflagged."""
    day = 86_400.0
    t0 = 1_780_000_000.0
    raw = [
        # Dormant mule: minor activity day 0, dormant 60 days, then ₹2,00,000 fraud burst in 2 hours
        (t0, "friend@oksbi", "dormant@ybl", 500.0),
        (t0 + 3600, "dormant@ybl", "cafe@okaxis", 400.0),
        (t0 + 60 * day, "vic1@oksbi", "dormant@ybl", 200_000.0),
        (t0 + 60 * day + 7200, "dormant@ybl", "ATM CASH SLEEP", 190_000.0),
        # Ordinary salary earner across 30 days: payroll once + rent 40% + groceries 10% each, scattered txns
        (t0, "ACME PAYROLL", "salaried@okaxis", 100_000.0),
        (t0 + 3600, "salaried@okaxis", "landlord@okhdfc", 42_000.0),
        (t0 + 7200, "salaried@okaxis", "grocer@ybl", 6_500.0),
        (t0 + 14 * day, "salaried@okaxis", "friend2@ybl", 8_000.0),
    ]
    flows = [(a, b, amt, 1, ts, ts) for ts, a, b, amt in raw]
    out = analyze(flows, raw_txns=raw)
    flagged_ids = {m["id"] for n in out["networks"] for m in n["members"] if m["role"] == "MULE"}
    assert "dormant@ybl" in flagged_ids
    assert "salaried@okaxis" not in flagged_ids


def test_structuring_signals_and_freeze_value_decay():
    """Structuring tranches below limits + identical splits + rapid fan-out score and explain clearly; freeze value decays."""
    t0 = 1_780_000_000.0
    raw = [
        # Structuring mule spreads across 5 days so sliding burst isn't trivially <72h alone, relying on structuring
        (t0, "warm@oksbi", "struct@okicici", 5_000.0),
        (t0 + 5 * 86_400.0, "victim_st@oksbi", "struct@okicici", 198_000.0),
        (t0 + 5 * 86_400.0 + 300, "struct@okicici", "leaf1@ybl", 49_500.0),
        (t0 + 5 * 86_400.0 + 600, "struct@okicici", "leaf2@ybl", 49_500.0),
        (t0 + 5 * 86_400.0 + 900, "struct@okicici", "leaf3@ybl", 49_500.0),
        (t0 + 5 * 86_400.0 + 1200, "struct@okicici", "leaf4@ybl", 49_500.0),
        # Both pass 82% (₹18k held) so both qualify as MULE, but fresh_mule moved funds 6 days more recently
        (t0 + 6 * 86_400.0, "victim_fr@oksbi", "fresh_mule@ybl", 100_000.0),
        (t0 + 6 * 86_400.0 + 1800, "fresh_mule@ybl", "ATM CASH FV1", 82_000.0),
        (t0, "victim_st2@oksbi", "stale_mule@ybl", 100_000.0),
        (t0 + 1800, "stale_mule@ybl", "ATM CASH FV2", 82_000.0),
    ]
    flows = [(a, b, amt, 1, ts, ts) for ts, a, b, amt in raw]
    out = analyze(flows, raw_txns=raw)
    all_members = {m["id"]: m for n in out["networks"] for m in n["members"]}

    sm = all_members["struct@okicici"]
    assert sm["role"] == "MULE"
    assert sm["features"]["below_limit_structuring"] == 1.0
    assert sm["features"]["near_identical_splits"] == 1.0
    assert sm["features"]["rapid_fan_out"] == 1.0
    assert "reporting thresholds" in sm["why"]

    # Both hold ₹18,000, but fresh_mule had outflow 6 days more recently than stale_mule
    fresh = all_members["fresh_mule@ybl"]
    stale = all_members["stale_mule@ybl"]
    assert fresh["held_inr"] == 18_000.0 and stale["held_inr"] == 18_000.0
    assert fresh["freeze_value_inr"] > stale["freeze_value_inr"]
    assert fresh["retention_likelihood"] > stale["retention_likelihood"]


def test_giant_network_louvain_subgroups_and_paged_members(client, tmp_path):
    """Network with > 200 members triggers Louvain community detection and supports paged /members endpoint."""
    rows = ["txn_date,txn_time,payer,payee,amount,rrn"]
    # Build 220+ accounts connected around two 85%+ pass-through mules -> single connected component > 200 members
    rows.append("22/09/2026,09:00:00,vic_g@oksbi,core_mule_a@ybl,100000,9001")
    rows.append("22/09/2026,09:10:00,core_mule_a@ybl,core_mule_b@ybl,95000,9002")
    for i in range(110):
        rows.append(f"22/09/2026,09:20:00,sub_vic_a_{i}@oksbi,core_mule_a@ybl,50000,{9100 + i}")
        rows.append(f"22/09/2026,10:00:00,core_mule_a@ybl,leaf_a_{i}@okaxis,46000,{9300 + i}")
    for i in range(110):
        rows.append(f"22/09/2026,09:25:00,sub_vic_b_{i}@oksbi,core_mule_b@ybl,50000,{9500 + i}")
        rows.append(f"22/09/2026,10:05:00,core_mule_b@ybl,leaf_b_{i}@okaxis,46000,{9700 + i}")

    _upload(client, "\n".join(rows).encode(), "giant.csv")
    res = client.get(f"/api/v1/cases/{CASE}/networks").json()
    net = res["networks"][0]
    assert net["member_count"] > 200
    assert len(net["subgroups"]) >= 2

    nid = net["network_id"]
    sg0 = net["subgroups"][0]["subgroup_id"]
    p1 = client.get(f"/api/v1/cases/{CASE}/networks/{nid}/members?offset=0&limit=50").json()
    p2 = client.get(f"/api/v1/cases/{CASE}/networks/{nid}/members?offset=50&limit=50").json()
    assert p1["total"] == net["member_count"]
    assert len(p1["items"]) == 50 and len(p2["items"]) == 50
    assert {x["id"] for x in p1["items"]}.isdisjoint({x["id"] for x in p2["items"]})

    sg_page = client.get(f"/api/v1/cases/{CASE}/networks/{nid}/members?subgroup_id={sg0}&limit=500").json()
    assert sg_page["total"] == net["subgroups"][0]["member_count"]
    assert all(m["subgroup_id"] == sg0 for m in sg_page["items"])


def test_logistic_regression_learns_from_30_verdicts(client):
    """Weights stay default below 30 verdicts; at 30+ verdicts LogisticRegression fits, logs re-tune, and activates."""
    # Seed 32 mule-like/victim/neighbour accounts across 16 small bursts so >=30 verdictable accounts exist
    lines = ["txn_date,txn_time,payer,payee,amount,rrn"]
    for i in range(16):
        t_h = 9 + (i % 10)
        lines.append(f"22/09/2026,{t_h:02d}:00:00,v_{i}@oksbi,m_a_{i}@ybl,100000,{3000 + i}")
        lines.append(f"22/09/2026,{t_h:02d}:15:00,m_a_{i}@ybl,m_b_{i}@ibl,98000,{4000 + i}")
        lines.append(f"22/09/2026,{t_h:02d}:30:00,m_b_{i}@ibl,ATM CASH L{i},95000,{5000 + i}")
    _upload(client, "\n".join(lines).encode(), "verdicts_seed.csv")

    initial = client.get(f"/api/v1/cases/{CASE}/networks").json()
    assert initial["scoring_meta"]["mode"] == "default"
    assert "0/30 verdicts" in initial["scoring_meta"]["label"]

    all_mules = [
        m["id"]
        for n in initial["networks"]
        for m in n["members"]
        if m["role"] == "MULE"
    ]
    assert len(all_mules) >= 30

    # Submit 29 verdicts -> must stay default
    for idx, acct in enumerate(all_mules[:29]):
        v = "CONFIRMED_MULE" if idx < 18 else "NOT_MULE"
        r = client.put(
            f"/api/v1/cases/{CASE}/accounts/verdict",
            json={"account": acct, "verdict": v, "reason": "bench review" if v == "NOT_MULE" else ""},
        )
        assert r.status_code == 200, r.text
        assert r.json()["scoring_meta"]["mode"] == "default"

    # 30th verdict triggers LogisticRegression re-tune & logs it
    r30 = client.put(
        f"/api/v1/cases/{CASE}/accounts/verdict",
        json={"account": all_mules[29], "verdict": "CONFIRMED_MULE"},
    )
    assert r30.status_code == 200, r30.text
    body30 = r30.json()
    assert body30["model_retuned"]["mode"] == "calibrated"
    assert body30["scoring_meta"]["mode"] == "calibrated"
    assert body30["scoring_meta"]["label"] == "weights last tuned on 30 verdicts"

    hist = client.get(f"/api/v1/cases/{CASE}/weights/history").json()
    assert hist["active"]["mode"] == "calibrated"
    assert len(hist["history"]) >= 1
    assert hist["history"][0]["verdicts_count"] == 30


def test_amlworld_loader_parses_schema_and_evaluates(tmp_path):
    """IBM AMLworld schema loader converts AMLworld CSV to DerivedStore and computes honest precision/recall."""
    tools_dir = Path(__file__).resolve().parents[1] / "tools"
    if str(tools_dir) not in sys.path:
        sys.path.insert(0, str(tools_dir))
    import benchmark_amlworld

    aml_csv = tmp_path / "HI-Small_Sample.csv"
    aml_csv.write_text(
        "Timestamp,From Bank,Account,To Bank,Account.1,Amount Received,Receiving Currency,Amount Paid,Payment Currency,Payment Format,Is Laundering\n"
        "2022/09/01 09:00,001,V001,002,M001,2000.0,US Dollar,2000.0,US Dollar,ACH,1\n"
        "2022/09/01 09:30,002,M001,003,M002,1950.0,US Dollar,1950.0,US Dollar,ACH,1\n"
        "2022/09/01 10:00,003,M002,004,OUT1,1900.0,US Dollar,1900.0,US Dollar,Cash,1\n"
        "2022/09/02 12:00,005,N001,006,N002,50.0,US Dollar,50.0,US Dollar,Cheque,0\n",
        encoding="utf-8",
    )
    report = benchmark_amlworld.evaluate_amlworld(aml_csv, tmp_path / "out")
    assert report["rows_processed"] == 4
    assert report["laundering_rows"] == 3
    assert report["illicit_intermediaries"] == 2
    assert (tmp_path / "out" / "amlworld_results.json").exists()
