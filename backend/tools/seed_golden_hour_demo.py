"""Repeatable one-command demo seeder for TARKA Golden-Hour + 50-Gang Demo.

Usage:
    PYTHONPATH=backend venv/Scripts/python backend/tools/seed_golden_hour_demo.py --rows 1000000 --gangs 50
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import shutil
import sqlite3
import sys
import time
from contextlib import closing
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

# Allow direct invocation from repo root
ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.services.ingestion.derived_store import DerivedStore  # noqa: E402
from app.services.ingestion.device_store import ingest_device_csv  # noqa: E402
from app.services.ingestion.large_evidence_engine import (  # noqa: E402
    IngestionJob,
    IngestionJobManager,
    IngestionStage,
    OperationalClass,
)
from app.services.ingestion.ncrp_complaints import (  # noqa: E402
    NcrpComplaintStore,
    match_complaint_to_case,
    parse_ncrp_csv,
)
from app.services.ingestion.networks import case_networks  # noqa: E402
from app.services.ingestion.projects_store import ProjectsStore  # noqa: E402

BANKS = ["oksbi", "okaxis", "okhdfcbank", "ybl", "ibl", "paytm", "okicici"]
ATMS = [f"ATM CASH WITHDRAWAL {c}" for c in ("JAMTARA 02", "GURUGRAM 09", "NOIDA 14", "MEWAT 07", "KOLKATA 21")]
CRYPTO = ["BINANCE P2P USDT", "WAZIRX CRYPTO"]
START = datetime(2026, 9, 10, 9, 0, 0)


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(65536)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def generate_demo_files(out_dir: Path, rows: int = 1_000_000, gangs: int = 50, seed: int = 42) -> Dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    bank_csv = out_dir / "demo_bank_statements.csv"
    device_csv = out_dir / "demo_device_sightings.csv"
    ncrp_csv = out_dir / "demo_ncrp_complaints.csv"

    rnd = random.Random(seed)
    people = [f"user{i}@{rnd.choice(BANKS)}" for i in range(max(2000, rows // 40))]
    employers = [f"EMPLOYER{i} PAYROLL" for i in range(200)]
    merchants = [f"merchant{i}@{rnd.choice(BANKS)}" for i in range(3000)]
    landlords = [f"landlord{i}@{rnd.choice(BANKS)}" for i in range(400)]

    tx_rows: List[tuple] = []
    dev_rows: List[tuple] = []

    def txn(when: datetime, payer: str, payee: str, amount: float) -> None:
        tx_rows.append((when, payer, payee, round(amount, 2)))

    # Gang 0: flagship gang with 14 mule accounts operated from 2 controller phones
    t0 = START
    g0_victims = [f"victim0_{i}@oksbi" for i in range(6)]
    g0_l1 = [f"mule0_a{i}@okaxis" for i in range(4)]
    g0_l2 = [f"mule0_b{i}@ybl" for i in range(10)]
    g0_mules = g0_l1 + g0_l2  # 14 mule accounts
    g0_sink = "ATM CASH WITHDRAWAL JAMTARA 02"

    v0_total = 0.0
    got0 = {m: 0.0 for m in g0_mules}
    for i, v in enumerate(g0_victims):
        for t_idx in range(2):
            amt = 95_000.0 if (i == 0 and t_idx == 0) else (85_000.0 if (i == 0 and t_idx == 1) else float(rnd.randint(60, 180) * 1000))
            if i == 0:
                v0_total += amt
            target_l1 = g0_l1[i % len(g0_l1)]
            got0[target_l1] += amt
            txn(t0 + timedelta(minutes=5 + i * 7 + t_idx * 4), v, target_l1, amt)

    # Layer forward from L1 -> L2 (~94% forwarded into multiple structuring tranches)
    k = 0
    for a in g0_l1:
        forward = got0[a] * 0.94
        step = forward / 4.0
        for s_idx in range(4):
            m = g0_l2[k % len(g0_l2)]
            k += 1
            amt = round(step, 2)
            got0[m] += amt
            txn(t0 + timedelta(minutes=35 + s_idx * 10), a, m, amt)

    # Cash out ~84% across every L2 mule (so all 14 accounts cross MULE score threshold while leaving ~16%+6% recoverable in LIBR)
    for idx, m in enumerate(g0_l2):
        if got0[m] > 0:
            txn(t0 + timedelta(minutes=80 + idx * 3), m, g0_sink, round(got0[m] * 0.84, 2))

    # Device sightings tying all 14 Gang 0 mules to 2 phones (2 IMEIs) on one shared hotspot BSSID
    for idx, m in enumerate(g0_mules):
        phone_num = f"98110000{idx:02d}"
        imei = "358911090000001" if idx < 7 else "358911090000002"
        dev_rows.append((t0 + timedelta(minutes=idx * 3), m, phone_num, imei, "", "", "aa:bb:cc:44:55:01", "", "UPI_SESSION"))

    # Remaining gangs (1 .. gangs - 1)
    g1_victim_amt = 0.0
    g1_victim_acct = ""
    g1_ts = START
    for g in range(1, gangs):
        tg = START + timedelta(days=rnd.randint(0, 18), hours=rnd.randint(0, 10))
        victims = [f"victim{g}_{i}@{rnd.choice(BANKS)}" for i in range(rnd.randint(2, 4))]
        if g == 1:
            g1_victim_acct = victims[0]
            g1_ts = tg
        l1 = [f"mule{g}_a{i}@{rnd.choice(BANKS)}" for i in range(rnd.randint(1, 2))]
        l2 = [f"mule{g}_b{i}@{rnd.choice(BANKS)}" for i in range(rnd.randint(2, 4))]
        sink = rnd.choice(ATMS + CRYPTO)
        got = {m: 0.0 for m in l1 + l2}
        for i, v in enumerate(victims):
            for _ in range(rnd.randint(1, 2)):
                amt = float(rnd.randint(35, 160) * 1000)
                if g == 1 and i == 0:
                    g1_victim_amt += amt
                got[l1[i % len(l1)]] += amt
                txn(tg + timedelta(minutes=rnd.randint(1, 60)), v, l1[i % len(l1)], amt)
        idx = 0
        for a in l1:
            left = got[a] * 0.85
            while left > 1000:
                amt = min(left, float(rnd.randint(40, 85) * 1000))
                m = l2[idx % len(l2)]
                idx += 1
                got[m] += amt
                txn(tg + timedelta(hours=rnd.uniform(1.2, 3.5)), a, m, amt)
                left -= amt
        for m in l2:
            if got[m] > 0:
                txn(tg + timedelta(hours=rnd.uniform(4.0, 9.0)), m, sink, got[m] * 0.82)
        if g <= 8:
            ctrl_imei = f"35891109000{g:04d}"
            for midx, m in enumerate(l1 + l2):
                dev_rows.append((tg + timedelta(minutes=midx * 4), m, f"9822{g:02d}{midx:04d}", ctrl_imei, f"40445{g:010d}", f"103.50.{g}.9", f"cc:dd:ee:10:{g:02x}:01", f"ctrl-g{g}", "LOGIN"))

    # Background normal activity (including salary->rent look-alikes)
    while len(tx_rows) < rows:
        p = rnd.choice(people)
        day = START + timedelta(days=rnd.randint(0, 25), hours=rnd.randint(0, 12), minutes=rnd.randint(0, 59))
        r = rnd.random()
        if r < 0.10:
            pay = float(rnd.randint(30, 140) * 1000)
            txn(day, rnd.choice(employers), p, pay)
            txn(day + timedelta(hours=rnd.uniform(2, 18)), p, rnd.choice(landlords), pay * rnd.uniform(0.3, 0.45))
            txn(day + timedelta(hours=rnd.uniform(2, 22)), p, rnd.choice(merchants), pay * 0.12)
        elif r < 0.15:
            txn(day, p, rnd.choice(ATMS), float(rnd.randint(2, 15) * 500))
        elif r < 0.45:
            txn(day, p, rnd.choice(people), float(rnd.randint(150, 18000)))
        else:
            txn(day, p, rnd.choice(merchants), float(rnd.randint(80, 6000)))

    rnd.shuffle(tx_rows)
    with open(bank_csv, "w", encoding="utf-8", newline="") as f:
        f.write("txn_date,txn_time,payer,payee,amount,rrn\n")
        for i, (when, payer, payee, amount) in enumerate(tx_rows):
            f.write(f"{when:%d/%m/%Y},{when:%H:%M:%S},{payer},{payee},{amount},{700000000000 + i}\n")

    with open(device_csv, "w", encoding="utf-8", newline="") as f:
        f.write("timestamp,account,phone,imei,imsi,ip,bssid,device_id,event\n")
        for when, acct, phone, imei, imsi, ip, bssid, dev_id, ev in dev_rows:
            f.write(f"{when:%Y-%m-%d %H:%M:%S},{acct},{phone},{imei},{imsi},{ip},{bssid},{dev_id},{ev}\n")

    with open(ncrp_csv, "w", encoding="utf-8", newline="") as f:
        f.write("ack_no,victim_name,phone,account_vpa,amount,date_time,typology\n")
        f.write(f"NCRP-2026-990001,Raghavendra Rao,9810000001,victim0_0@oksbi,{round(v0_total, 2)},{START:%Y-%m-%d %H:%M:%S},Digital Arrest / Mule Layering\n")
        if gangs > 1 and g1_victim_acct:
            f.write(f"NCRP-2026-990002,Meenakshi Iyer,9810000002,{g1_victim_acct},{round(g1_victim_amt, 2)},{g1_ts:%Y-%m-%d %H:%M:%S},Task Fraud\n")
        f.write(f"NCRP-2026-990003,Unmatched Citizen,,unseen.citizen@okicici,50000,{START:%Y-%m-%d %H:%M:%S},Investment Scam\n")

    return {
        "bank_csv": bank_csv,
        "device_csv": device_csv,
        "ncrp_csv": ncrp_csv,
        "rows_written": len(tx_rows),
        "device_rows": len(dev_rows),
        "v0_total": v0_total,
    }


def seed_demo_workspace(
    *,
    base_dir: Path = Path("data/ingestion"),
    out_dir: Path = Path("data/validation/golden_hour_demo"),
    case_id: str = "CASE-DEMO-1M",
    project_name: str = "Operation Jamtara · 50-Gang Demo",
    rows: int = 1_000_000,
    gangs: int = 50,
    owner: str = "usr-supervisor-01",
) -> Dict[str, Any]:
    files = generate_demo_files(out_dir, rows=rows, gangs=gangs)
    bank_csv: Path = files["bank_csv"]
    device_csv: Path = files["device_csv"]
    ncrp_csv: Path = files["ncrp_csv"]

    projects = ProjectsStore(base_dir)
    # Reuse existing project by name or create a new one
    proj = next((p for p in projects.list() if p["name"] == project_name), None)
    if not proj:
        proj = projects.create(project_name, f"{rows:,} transaction rows · {gangs} organized mule gangs · 14 mules on 2 phones", owner)

    case_title = f"{gangs}-Gang Golden-Hour Syndicate ({rows:,} txns)"
    existing_case = next(
        (c["case_id"] for c in projects.all_cases() if c.get("title") == case_title or c["case_id"] == case_id),
        None,
    )
    if existing_case:
        case_id = existing_case
    else:
        created = projects.register_case(
            owner,
            case_title,
            proj["project_id"],
            {"police_station": "Cyber Crime PS, Gurugram", "lead_investigator": "Insp. Vikram Rathore"},
        )
        case_id = created["case_id"]

    # Clean case derived directory so repeated runs stay deterministic and idempotent
    case_derived = base_dir / "derived" / case_id
    if case_derived.exists():
        shutil.rmtree(case_derived)
    case_derived.mkdir(parents=True, exist_ok=True)
    projects.set_case(case_id, proj["project_id"], lifecycle="INVESTIGATING", assignee="Insp. Vikram Rathore", link=True)

    # Stream CSVs through canonical DerivedStore + DeviceStore
    t_ingest0 = time.perf_counter()
    job_bank = f"JOB-DEMO-BANK-{case_id}"
    job_dev = f"JOB-DEMO-DEV-{case_id}"
    bank_stats = DerivedStore(case_derived).ingest_bank_csv(job_bank, bank_csv)
    dev_stats = ingest_device_csv(case_derived, job_dev, device_csv)
    ingest_secs = round(time.perf_counter() - t_ingest0, 2)

    # Record verified SHA-256 upload jobs in IngestionJobManager SQLite so Evidence Ledger & Court Report show real SHA-256s
    mgr = IngestionJobManager(base_dir=base_dir)
    bank_sha = _sha256_file(bank_csv)
    dev_sha = _sha256_file(device_csv)
    for jid, path_obj, sha, summary in (
        (job_bank, bank_csv, bank_sha, {k: v for k, v in bank_stats.items() if k != "date_format_note"}),
        (job_dev, device_csv, dev_sha, dev_stats),
    ):
        size_b = path_obj.stat().st_size
        j = IngestionJob(
            job_id=jid,
            case_id=case_id,
            filename=path_obj.name,
            total_size_bytes=size_b,
            intake_officer=owner,
        )
        j.stage = IngestionStage.STAGE_10_EVIDENCE_AVAILABLE
        j.bytes_uploaded = size_b
        j.sha256_digest = sha
        j.analytics_summary = summary
        mgr._save(j)
        with closing(sqlite3.connect(mgr._db_path)) as db:  # re-seeding must not stack duplicate seal rows
            db.execute("DELETE FROM custody WHERE job_id = ? AND action = 'Evidence sealed'", (jid,))
            db.commit()
        mgr._custody(j, "Evidence sealed", f"SHA-256 {sha} verified and indexed into derived.sqlite", actor=owner)

    # Analyze fraud networks + controller attribution + time-aware paths
    t_net0 = time.perf_counter()
    nets_result = case_networks(base_dir / "derived", case_id, max_members=None)
    analyze_secs = round(time.perf_counter() - t_net0, 2)

    # Import NCRP complaints & start golden-hour clock
    ncrp_store = NcrpComplaintStore(base_dir)
    with closing(sqlite3.connect(ncrp_store.path)) as db:
        db.execute("DELETE FROM ncrp_complaints WHERE case_id = ?", (case_id,))
        db.execute("DELETE FROM golden_hour_steps WHERE case_id = ?", (case_id,))
        db.commit()
    raw_complaints = parse_ncrp_csv(ncrp_csv.read_text(encoding="utf-8"))
    matched_items = []
    for c in raw_complaints:
        m = match_complaint_to_case(base_dir / "derived", case_id, c, nets_result)
        matched_items.append({**c, **m})
    saved_complaints = ncrp_store.save_batch(project_id=proj["project_id"], case_id=case_id, items=matched_items, imported_by=owner)
    now_t = time.time()
    ncrp_store.mark_golden_step(case_id, "uploaded_at", now_t + min(1.0, ingest_secs))
    ncrp_store.mark_golden_step(case_id, "traced_at", now_t + min(2.0, ingest_secs + analyze_secs))
    ncrp_store.mark_golden_step(case_id, "mules_found_at", now_t + min(2.5, ingest_secs + analyze_secs))
    for item in saved_complaints:
        if item["status"] == "MATCHED":
            projects.merge_ncrp_details(case_id, item)
            break

    biggest = max(nets_result["networks"], key=lambda n: n.get("mule_count", 0)) if nets_result["networks"] else None
    return {
        "project_id": proj["project_id"],
        "project_name": proj["name"],
        "case_id": case_id,
        "rows_accepted": bank_stats["rows_accepted"],
        "rows_per_sec": round(bank_stats["rows_accepted"] / max(0.01, ingest_secs)),
        "ingest_secs": ingest_secs,
        "analyze_secs": analyze_secs,
        "networks_found": len(nets_result["networks"]),
        "mules_total": sum(n.get("mule_count", 0) for n in nets_result["networks"]),
        "biggest_network_id": biggest["network_id"] if biggest else None,
        "biggest_network_mules": biggest["mule_count"] if biggest else 0,
        "biggest_network_controllers": len(biggest.get("controllers", [])) if biggest else 0,
        "biggest_network_controller_summaries": [c["summary"] for c in biggest.get("controllers", [])] if biggest else [],
        "complaints_total": len(saved_complaints),
        "complaints_matched": sum(1 for c in saved_complaints if c["status"] == "MATCHED"),
        "ncrp_csv": str(ncrp_csv),
        "bank_sha256": bank_sha,
        "device_sha256": dev_sha,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Seed TARKA Golden-Hour 1M-row / 50-gang demo project.")
    ap.add_argument("--rows", type=int, default=1_000_000)
    ap.add_argument("--gangs", type=int, default=50)
    ap.add_argument("--case-id", default="CASE-DEMO-1M")
    ap.add_argument("--base-dir", default="data/ingestion")
    ap.add_argument("--out-dir", default="data/validation/golden_hour_demo")
    ap.add_argument("--owner", default="usr-supervisor-01")
    args = ap.parse_args()

    res = seed_demo_workspace(
        base_dir=Path(args.base_dir),
        out_dir=Path(args.out_dir),
        case_id=args.case_id,
        rows=args.rows,
        gangs=args.gangs,
        owner=args.owner,
    )
    print(json.dumps(res, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
