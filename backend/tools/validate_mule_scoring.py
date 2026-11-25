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
from app.services.ingestion.device_store import ingest_device_csv
from app.services.ingestion.networks import DEFAULT_FEATURE_WEIGHTS, analyze_store, canonical

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


def generate_extended(
    path: Path,
    device_path: Path,
    rows: int,
    gangs: int,
    seed: int = 11,
) -> dict:
    """Generate comprehensive benchmark CSV + device log CSV covering:
    - Classic rapid-burst gangs (victims -> L1 -> L2 -> cash-out)
    - Controller groups (mule accounts operated from shared IMEIs, plus >25 carrier-NAT IP noise)
    - Slow / dormant mules (small txn 45 days earlier, then sudden 72h burst)
    - Structuring mules (just-below-limit transfers ₹49,500 / ₹9,950, near-identical splits, rapid fan-out)
    - Time-impossible negative links (transfer fired BEFORE victim credit arrives)
    - Ordinary salary-then-rent look-alikes & shared ATMs
    """
    rnd = random.Random(seed)
    people = [f"user{i}@{rnd.choice(BANKS)}" for i in range(max(2000, rows // 40))]
    employers = [f"EMPLOYER{i} PAYROLL" for i in range(200)]
    merchants = [f"merchant{i}@{rnd.choice(BANKS)}" for i in range(3000)]
    landlords = [f"landlord{i}@{rnd.choice(BANKS)}" for i in range(400)]

    key: dict = {
        "gangs": [],
        "mules": [],
        "dormant_mules": [],
        "structuring_mules": [],
        "controller_mules": [],
        "controller_groups": [],
        "time_impossible_pairs": [],
        "nat_noise_accounts": [],
        "victims": [],
        "rows": 0,
    }
    out = []
    dev_rows = []

    def txn(when: datetime, payer: str, payee: str, amount: float):
        out.append((when, payer, payee, round(amount, 2)))

    for g in range(gangs):
        t0 = START + timedelta(days=rnd.randint(0, 20), hours=rnd.randint(8, 20))
        victims = [f"victim{g}_{i}@{rnd.choice(BANKS)}" for i in range(rnd.randint(2, 5))]
        l1 = [f"mule{g}_a{i}@{rnd.choice(BANKS)}" for i in range(2)]
        l2 = [f"mule{g}_b{i}@{rnd.choice(BANKS)}" for i in range(2, 6)]
        sink = rnd.choice(ATMS + CRYPTO)
        stolen = 0.0
        got = {m: 0.0 for m in l1 + l2}
        for i, v in enumerate(victims):
            amt = rnd.randint(50, 250) * 1000
            stolen += amt
            got[l1[i % len(l1)]] += amt
            txn(t0 + timedelta(minutes=rnd.randint(0, 60)), v, l1[i % len(l1)], amt)
        k = 0
        for a in l1:
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
        gang_mules = l1 + l2
        if g % 3 == 0:
            # Shared handset attribution across gang mules (2 phones running the gang)
            imei1 = f"35209900{g:04d}001"
            imei2 = f"35209900{g:04d}002"
            for idx_m, mm in enumerate(gang_mules):
                dev_rows.append((t0 + timedelta(minutes=idx_m * 5), mm, imei1 if idx_m % 2 == 0 else imei2, "", "LOGIN"))
            key["controller_groups"].append(sorted(canonical(m) for m in gang_mules[::2]))
            key["controller_groups"].append(sorted(canonical(m) for m in gang_mules[1::2]))
            key["controller_mules"].extend(gang_mules)
        key["gangs"].append({"victims": victims, "mules": gang_mules, "cash_out": sink, "stolen_inr": stolen})
        key["mules"] += gang_mules
        key["victims"] += victims

    # Dormant-then-burst mules (quiet 45 days earlier, then 72h burst)
    n_dormant = max(4, gangs // 2)
    for i in range(n_dormant):
        dm = f"dormant_mule_{i}@oksbi"
        dv = f"dormant_victim_{i}@okaxis"
        ds = rnd.choice(ATMS)
        txn(START - timedelta(days=45), f"friend_d_{i}@ybl", dm, 400.0)
        txn(START - timedelta(days=45, hours=-1), dm, f"shop_d_{i}@ybl", 300.0)
        t_burst = START + timedelta(days=12, hours=10)
        txn(t_burst, dv, dm, 180_000.0)
        txn(t_burst + timedelta(hours=2), dm, ds, 171_000.0)
        key["dormant_mules"].append(dm)
        key["mules"].append(dm)
        key["victims"].append(dv)

    # Structuring / rapid-fan-out mules (below-limit ₹49,500 / near-identical splits / fast fan-out)
    n_struct = max(4, gangs // 2)
    for i in range(n_struct):
        sm = f"struct_mule_{i}@okicici"
        sv = f"struct_victim_{i}@ybl"
        t_s = START + timedelta(days=8, hours=14)
        # Structurer active over 4 days (span > 72h) so structuring + fan-out drives detection
        txn(t_s - timedelta(days=4), f"warm_{i}@okaxis", sm, 5000.0)
        txn(t_s, sv, sm, 198_000.0)
        for j in range(4):
            sub_m = f"struct_leaf_{i}_{j}@paytm"
            txn(t_s + timedelta(minutes=3 * (j + 1)), sm, sub_m, 49_500.0)
            txn(t_s + timedelta(minutes=30 + j), sub_m, rnd.choice(CRYPTO), 48_000.0)
            key["mules"].append(sub_m)
        key["structuring_mules"].append(sm)
        key["mules"].append(sm)
        key["victims"].append(sv)

    # Planted time-impossible control link: debit happens BEFORE victim credit arrives
    t_imp = START + timedelta(days=15, hours=12)
    iv, im1, im2 = "imp_victim@oksbi", "imp_mule_1@ybl", "imp_mule_2@okaxis"
    txn(t_imp - timedelta(hours=6), im1, im2, 60_000.0)  # TOO EARLY: no victim credit yet
    txn(t_imp, iv, im1, 100_000.0)
    txn(t_imp + timedelta(hours=2), im1, ATMS[0], 95_000.0)
    key["time_impossible_pairs"].append([canonical(im1), canonical(im2)])
    key["mules"].append(im1)
    key["victims"].append(iv)

    # > 25 ordinary accounts sharing one carrier-NAT public IP (must NOT become a controller cluster!)
    for idx_n, p in enumerate(people[:35]):
        dev_rows.append((START + timedelta(days=1, minutes=idx_n), p, "", "49.36.99.1", "LOGIN"))
        key["nat_noise_accounts"].append(canonical(p))

    while len(out) < rows:
        p = rnd.choice(people)
        day = START + timedelta(days=rnd.randint(0, 29), hours=rnd.randint(7, 22), minutes=rnd.randint(0, 59))
        r = rnd.random()
        if r < 0.10:
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
            f.write(f"{when:%d/%m/%Y},{when:%H:%M:%S},{payer},{payee},{amount},{700000000000 + i}\n")

    with open(device_path, "w", encoding="utf-8", newline="") as f:
        f.write("timestamp,account,imei,client_ip,event\n")
        for when, acct, imei, ip, ev in dev_rows:
            f.write(f"{when:%d/%m/%Y %H:%M:%S},{acct},{imei},{ip},{ev}\n")

    key["rows"] = len(out)
    key["device_rows"] = len(dev_rows)
    return key


def evaluate_ablation(store: DerivedStore, key: dict) -> dict:
    """Measure precision/recall incrementally per signal + controller attribution + time-impossible rejection."""
    truth = {canonical(m) for m in key["mules"]}

    def _eval_weights(weights: dict) -> dict:
        res = analyze_store(store, max_members=None, feature_weights=weights, scoring_meta={"mode": "default", "verdicts_used": 0, "label": "ablation"})
        pred = {m["id"] for n in res["networks"] for m in n["members"] if m["role"] == "MULE"}
        tp = len(pred & truth)
        return {
            "flagged": len(pred),
            "tp": tp,
            "precision": round(tp / len(pred), 3) if pred else 0.0,
            "recall": round(tp / len(truth), 3) if truth else 0.0,
        }

    # Incremental signal stages
    zero = {k: 0.0 for k in DEFAULT_FEATURE_WEIGHTS}
    w_pt_burst = {**zero, "passthrough": 0.35, "burst_72h": 0.35, "high_value": 0.15, "multi_sender": 0.15}
    w_struct = {**w_pt_burst, "below_limit_structuring": 0.20, "near_identical_splits": 0.15, "rapid_fan_out": 0.20, "round_amounts": 0.05}
    w_full = dict(DEFAULT_FEATURE_WEIGHTS)

    res_full = analyze_store(store, max_members=None)
    pred_full = {m["id"] for n in res_full["networks"] for m in n["members"] if m["role"] == "MULE"}
    dormant_truth = {canonical(x) for x in key.get("dormant_mules", [])}
    struct_truth = {canonical(x) for x in key.get("structuring_mules", [])}

    controllers_found = [cg["accounts"] for n in res_full["networks"] for cg in (n.get("controllers") or [])]
    ctrl_accts_found = {a for g in controllers_found for a in g}
    nat_noise = set(key.get("nat_noise_accounts", []))
    ctrl_truth = {canonical(x) for x in key.get("controller_mules", [])}

    # Check time-impossible link did NOT produce victim trace edge or hop taint on imp_mule_2
    all_traces = [p["hops"] for n in res_full["networks"] for vt in (n.get("traces") or []) for p in vt.get("paths", [])]
    impossible_linked = any(
        pair[0] in hops and pair[1] in hops
        for pair in key.get("time_impossible_pairs", [])
        for hops in all_traces
    )

    return {
        "mules_true": len(truth),
        "ablation": {
            "base_passthrough_burst_hv_sender": _eval_weights(w_pt_burst),
            "plus_structuring_signals": _eval_weights(w_struct),
            "full_engine_with_device_attribution": _eval_weights(w_full),
        },
        "dormant_mule_recall": round(len(pred_full & dormant_truth) / len(dormant_truth), 3) if dormant_truth else None,
        "structuring_mule_recall": round(len(pred_full & struct_truth) / len(struct_truth), 3) if struct_truth else None,
        "controller_attribution": {
            "controller_mules_true": len(ctrl_truth),
            "controller_mules_attributed": len(ctrl_accts_found & ctrl_truth),
            "nat_noise_falsely_attributed": len(ctrl_accts_found & nat_noise),
            "groups_found": len(controllers_found),
        },
        "time_impossible_link_rejected": not impossible_linked,
    }


def main(argv=None) -> dict:
    ap = argparse.ArgumentParser()
    ap.add_argument("--rows", type=int, default=200_000)
    ap.add_argument("--gangs", type=int, default=20)
    ap.add_argument("--out", type=Path, default=Path("data/validation"))
    ap.add_argument("--extended", action="store_true", help="Include dormant, structuring, controller, and time-impossible tests + ablation")
    args = ap.parse_args(argv)
    args.out.mkdir(parents=True, exist_ok=True)
    csv_path = args.out / f"planted_{args.rows}.csv"
    dev_path = args.out / f"planted_{args.rows}_devices.csv"

    t = time.time()
    key = generate_extended(csv_path, dev_path, args.rows, args.gangs) if args.extended else generate(csv_path, args.rows, args.gangs)
    (args.out / f"planted_{args.rows}_answer_key.json").write_text(json.dumps(key, indent=1))
    gen_s = time.time() - t

    store_dir = args.out / f"derived_{args.rows}"
    if (store_dir / "derived.sqlite").exists():
        (store_dir / "derived.sqlite").unlink()
    store = DerivedStore(store_dir)
    tracemalloc.start()
    t = time.time()
    summary = store.ingest_bank_csv("VALIDATION", csv_path)
    if args.extended and dev_path.exists():
        ingest_device_csv(store_dir, "VALIDATION_DEV", dev_path)
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
    if args.extended:
        report["extended"] = evaluate_ablation(store, key)
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
