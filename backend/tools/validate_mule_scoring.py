"""Phase 1D: planted-gang validation of the ingestion pipeline and mule scoring.

Generates a bank/UPI CSV with ordinary activity plus planted fraud gangs, writes the answer key,
runs the real pipeline (DerivedStore.ingest_bank_csv → networks.analyze) and reports
mule precision / recall, gang separation, throughput and peak memory.

    PYTHONPATH=backend venv/Scripts/python backend/tools/validate_mule_scoring.py --rows 1000000 --gangs 25

Look-alikes are planted on purpose: salary earners who pay rent and bills within a day
(pass-through + fast dwell + fan-out) and people who withdraw cash at the same ATMs gangs use.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
import tracemalloc
from datetime import datetime, timedelta
from pathlib import Path

from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.networks import analyze_store, canonical

BANKS = ["oksbi", "okaxis", "okhdfcbank", "ybl", "ibl", "paytm", "okicici"]
ATMS = [f"ATM CASH WITHDRAWAL {c}" for c in ("GURUGRAM 09", "NOIDA 14", "JAMTARA 02", "MEWAT 07", "KOLKATA 21")]
CRYPTO = ["BINANCE P2P USDT", "WAZIRX CRYPTO"]
START = datetime(2026, 9, 1)


def generate(path: Path, rows: int, gangs: int, seed: int = 7) -> dict:
    rnd = random.Random(seed)
    people = [f"user{i}@{rnd.choice(BANKS)}" for i in range(max(2000, rows // 40))]
    employers = [f"EMPLOYER{i} PAYROLL" for i in range(200)]
    merchants = [f"merchant{i}@{rnd.choice(BANKS)}" for i in range(3000)]
    landlords = [f"landlord{i}@{rnd.choice(BANKS)}" for i in range(400)]

    key = {"gangs": [], "mules": [], "victims": [], "rows": 0}
    out = []

    def txn(when: datetime, payer: str, payee: str, amount: float):
        out.append((when, payer, payee, round(amount, 2)))

    # Planted gangs: victims → L1 mule → L2 mules → cash-out, all within hours.
    for g in range(gangs):
        t0 = START + timedelta(days=rnd.randint(0, 25), hours=rnd.randint(8, 20))
        victims = [f"victim{g}_{i}@{rnd.choice(BANKS)}" for i in range(rnd.randint(2, 6))]
        l1 = [f"mule{g}_a{i}@{rnd.choice(BANKS)}" for i in range(rnd.randint(1, 2))]
        l2 = [f"mule{g}_b{i}@{rnd.choice(BANKS)}" for i in range(rnd.randint(2, 5))]
        sink = rnd.choice(ATMS + CRYPTO)
        stolen = 0.0
        got = {m: 0.0 for m in l1 + l2}
        for i, v in enumerate(victims):
            for _ in range(rnd.randint(1, 3)):
                amt = rnd.randint(40, 300) * 1000
                stolen += amt
                got[l1[i % len(l1)]] += amt
                txn(t0 + timedelta(minutes=rnd.randint(0, 90)), v, l1[i % len(l1)], amt)
        k = 0
        for a in l1:  # each L1 forwards 97% of what it got, structured into sub-₹1 L tranches
            left = got[a] * 0.97
            while left > 1:
                amt = min(left, rnd.randint(45, 99) * 1000)
                m = l2[k % len(l2)]
                k += 1
                got[m] += amt
                txn(t0 + timedelta(hours=rnd.uniform(1.5, 4)), a, m, amt)
                left -= amt
        for m in l2:
            if got[m]:
                txn(t0 + timedelta(hours=rnd.uniform(5, 12)), m, sink, got[m] * 0.95)
        key["gangs"].append({"victims": victims, "mules": l1 + l2, "cash_out": sink, "stolen_inr": stolen})
        key["mules"] += l1 + l2
        key["victims"] += victims

    # Ordinary life until the row budget is used.
    while len(out) < rows:
        p = rnd.choice(people)
        day = START + timedelta(days=rnd.randint(0, 29), hours=rnd.randint(7, 22), minutes=rnd.randint(0, 59))
        r = rnd.random()
        if r < 0.10:  # salary, then rent + bills within a day (the hardest look-alike)
            pay = rnd.randint(25, 150) * 1000
            txn(day, rnd.choice(employers), p, pay)
            txn(day + timedelta(hours=rnd.uniform(1, 20)), p, rnd.choice(landlords), pay * rnd.uniform(0.3, 0.5))
            for _ in range(rnd.randint(1, 3)):
                txn(day + timedelta(hours=rnd.uniform(1, 23)), p, rnd.choice(merchants), pay * rnd.uniform(0.05, 0.15))
        elif r < 0.15:
            txn(day, p, rnd.choice(ATMS), rnd.randint(1, 20) * 500)
        elif r < 0.45:
            txn(day, p, rnd.choice(people), rnd.randint(100, 20000))
        else:
            txn(day, p, rnd.choice(merchants), rnd.randint(50, 8000))

    rnd.shuffle(out)
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write("txn_date,txn_time,payer,payee,amount,rrn\n")
        for i, (when, payer, payee, amount) in enumerate(out):
            f.write(f"{when:%d/%m/%Y},{when:%H:%M:%S},{payer},{payee},{amount},{600000000000 + i}\n")
    key["rows"] = len(out)
    return key


def evaluate(key: dict, result: dict) -> dict:
    predicted = {m["id"] for n in result["networks"] for m in n["members"] if m["role"] == "MULE"}
    truth = {canonical(m) for m in key["mules"]}
    tp = len(predicted & truth)
    member_net = {m["id"]: n["network_id"] for n in result["networks"] for m in n["members"]}
    mules_per_net: dict = {}
    for m in key["mules"]:
        net = member_net.get(canonical(m))
        mules_per_net[net] = mules_per_net.get(net, 0) + 1
    # A gang is separated when all its people share one network that holds no other gang's mules.
    separated = 0
    for g in key["gangs"]:
        nets = {member_net.get(canonical(x)) for x in g["mules"] + g["victims"]}
        if len(nets) == 1 and mules_per_net.get(next(iter(nets))) == len(g["mules"]):
            separated += 1
    return {
        "mules_true": len(truth),
        "mules_flagged": len(predicted),
        "true_positives": tp,
        "precision": round(tp / len(predicted), 3) if predicted else 0.0,
        "recall": round(tp / len(truth), 3) if truth else 0.0,
        "gangs_in_own_network": f"{separated}/{len(key['gangs'])}",
        "networks": len(result["networks"]),
        "largest_network": max((n["member_count"] for n in result["networks"]), default=0),
    }


def main(argv=None) -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", type=int, default=200_000)
    ap.add_argument("--gangs", type=int, default=20)
    ap.add_argument("--out", type=Path, default=Path("data/validation"))
    args = ap.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    csv_path = args.out / f"planted_{args.rows}.csv"

    t = time.time()
    key = generate(csv_path, args.rows, args.gangs)
    (args.out / f"planted_{args.rows}_answer_key.json").write_text(json.dumps(key, indent=1))
    gen_s = time.time() - t

    store_dir = args.out / f"derived_{args.rows}"
    if (store_dir / "derived.sqlite").exists():
        (store_dir / "derived.sqlite").unlink()
    store = DerivedStore(store_dir)
    tracemalloc.start()
    t = time.time()
    summary = store.ingest_bank_csv("VALIDATION", csv_path)
    ingest_s = time.time() - t
    _, ingest_peak = tracemalloc.get_traced_memory()
    tracemalloc.reset_peak()
    t = time.time()
    result = analyze_store(store, max_members=None)
    analyze_s = time.time() - t
    _, analyze_peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    report = {
        "rows": summary["rows_read"],
        "file_mb": round(csv_path.stat().st_size / 1e6, 1),
        "generate_s": round(gen_s, 1),
        "ingest_s": round(ingest_s, 1),
        "ingest_rows_per_s": int(summary["rows_read"] / max(ingest_s, 1e-6)),
        "ingest_peak_mb": round(ingest_peak / 1e6, 1),
        "analyze_s": round(analyze_s, 1),
        "analyze_peak_mb": round(analyze_peak / 1e6, 1),  # Python heap only; SQLite memory is in process_peak_mb
        **evaluate(key, result),
    }
    try:
        import psutil

        mem = psutil.Process().memory_info()
        # whole run, including the generator, which keeps every row in memory before writing
        report["process_peak_mb"] = round(getattr(mem, "peak_wset", mem.rss) / 1e6, 1)
    except ImportError:
        pass
    print(json.dumps(report, indent=1))
    return report


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
