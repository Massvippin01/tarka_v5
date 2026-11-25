"""IBM AMLworld (NeurIPS 2023) independent benchmark loader & evaluator for TARKA.

Dataset: "Realistic Synthetic Financial Transactions for Anti-Money Laundering Models"
  - Official Repo: https://github.com/IBM/AML-Data (Apache-2.0)
  - Official Kaggle: https://www.kaggle.com/datasets/ealtman2019/ibm-transactions-for-anti-money-laundering-aml
  - License: CDLA-Sharing-1.0 (dataset files must NOT be committed to the repository)

Usage:
  PYTHONPATH=backend venv/Scripts/python backend/tools/benchmark_amlworld.py --csv path/to/HI-Small_Trans.csv
  PYTHONPATH=backend venv/Scripts/python backend/tools/benchmark_amlworld.py --csv path/to/HI-Small_Trans.csv --max-rows 500000
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import time
import tracemalloc
from pathlib import Path
from typing import Any, Dict, Optional, Set

from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.networks import analyze_store, canonical

# Approximate FX multipliers to INR when dataset transactions carry USD/EUR/etc.
# Keeps amount-threshold signals (e.g. ₹25k high value) meaningfully scaled across currencies.
_FX_TO_INR = {
    "US Dollar": 83.0,
    "USD": 83.0,
    "Euro": 90.0,
    "EUR": 90.0,
    "UK Pound": 105.0,
    "GBP": 105.0,
    "Indian Rupee": 1.0,
    "INR": 1.0,
}


def convert_amlworld_csv(src_csv: Path, dst_csv: Path, max_rows: Optional[int] = None) -> Dict[str, Any]:
    """Stream-convert IBM AMLworld transaction CSV to TARKA bank statement CSV without loading full file in RAM.

    Returns truth sets: accounts involved in `Is Laundering == 1` edges (`laundering_accounts`,
    `laundering_intermediaries` which appear as both payer and payee on laundering rows, plus row counts).
    """
    dst_csv.parent.mkdir(parents=True, exist_ok=True)
    rows_written = 0
    laundering_rows = 0
    payers_illicit: Set[str] = set()
    payees_illicit: Set[str] = set()
    all_accounts: Set[str] = set()

    with open(src_csv, "r", encoding="utf-8", errors="replace", newline="") as fin, open(
        dst_csv, "w", encoding="utf-8", newline=""
    ) as fout:
        reader = csv.reader(fin)
        header = next(reader, [])
        if not header:
            raise ValueError(f"Empty CSV: {src_csv}")
        norm = [h.strip().lower() for h in header]
        # AMLworld header: Timestamp, From Bank, Account, To Bank, Account.1, Amount Received,
        #                  Receiving Currency, Amount Paid, Payment Currency, Payment Format, Is Laundering
        idx_ts = norm.index("timestamp")
        idx_from_bank = norm.index("from bank")
        idx_from_acct = norm.index("account")
        idx_to_bank = norm.index("to bank")
        # Pandas/CSV duplicates second "Account" as "Account.1" or identical "Account"
        acct_indices = [i for i, h in enumerate(norm) if h in ("account", "account.1")]
        idx_to_acct = acct_indices[1] if len(acct_indices) >= 2 else norm.index("account.1")
        idx_amt = norm.index("amount paid") if "amount paid" in norm else norm.index("amount received")
        idx_curr = norm.index("payment currency") if "payment currency" in norm else -1
        idx_fmt = norm.index("payment format") if "payment format" in norm else -1
        idx_label = norm.index("is laundering")

        fout.write("txn_date,txn_time,payer,payee,amount,rrn\n")
        for i, row in enumerate(reader):
            if max_rows is not None and i >= max_rows:
                break
            if len(row) <= idx_label:
                continue
            ts_raw = row[idx_ts].strip()
            parts = ts_raw.split()
            date_s = parts[0].replace("/", "-") if parts else ts_raw
            time_s = (parts[1] + (":00" if parts[1].count(":") == 1 else "")) if len(parts) > 1 else "00:00:00"
            payer = f"b{row[idx_from_bank].strip()}_{row[idx_from_acct].strip()}"
            payee = f"b{row[idx_to_bank].strip()}_{row[idx_to_acct].strip()}"
            try:
                raw_amt = float(row[idx_amt])
            except ValueError:
                continue
            curr = row[idx_curr].strip() if idx_curr >= 0 and idx_curr < len(row) else "INR"
            amt_inr = round(raw_amt * _FX_TO_INR.get(curr, 1.0), 2)
            fmt = row[idx_fmt].strip().upper() if idx_fmt >= 0 and idx_fmt < len(row) else "TXN"
            if fmt in ("CASH", "WITHDRAWAL"):
                payee = f"{payee} CASH WITHDRAWAL"
            rrn = f"{fmt}_{i}"
            fout.write(f"{date_s},{time_s},{payer},{payee},{amt_inr},{rrn}\n")
            rows_written += 1

            all_accounts.add(canonical(payer))
            all_accounts.add(canonical(payee))
            if row[idx_label].strip() == "1":
                laundering_rows += 1
                payers_illicit.add(canonical(payer))
                payees_illicit.add(canonical(payee))

    all_illicit = payers_illicit | payees_illicit
    intermediaries = payers_illicit & payees_illicit
    return {
        "rows_written": rows_written,
        "laundering_rows": laundering_rows,
        "total_accounts": len(all_accounts),
        "all_illicit_accounts": all_illicit,
        "intermediary_accounts": intermediaries,
    }


def evaluate_amlworld(src_csv: Path, out_dir: Path, max_rows: Optional[int] = None) -> Dict[str, Any]:
    """Run TARKA's real DerivedStore + networks pipeline on an IBM AMLworld CSV and report honest metrics."""
    out_dir.mkdir(parents=True, exist_ok=True)
    norm_csv = out_dir / "amlworld_normalized.csv"
    t0 = time.time()
    prep = convert_amlworld_csv(src_csv, norm_csv, max_rows=max_rows)
    convert_s = time.time() - t0

    store_dir = out_dir / "amlworld_derived"
    db_file = store_dir / "derived.sqlite"
    if db_file.exists():
        db_file.unlink()
    store = DerivedStore(store_dir)

    tracemalloc.start()
    t1 = time.time()
    summary = store.ingest_bank_csv("AMLWORLD", norm_csv)
    ingest_s = time.time() - t1
    _, ingest_peak = tracemalloc.get_traced_memory()
    tracemalloc.reset_peak()

    t2 = time.time()
    res = analyze_store(store, max_members=None)
    analyze_s = time.time() - t2
    _, analyze_peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()

    flagged_mules = {m["id"] for n in res["networks"] for m in n["members"] if m["role"] == "MULE"}
    flagged_any_member = {m["id"] for n in res["networks"] for m in n["members"]}

    illicit_all = prep["all_illicit_accounts"]
    illicit_mids = prep["intermediary_accounts"] or illicit_all

    tp_all = len(flagged_mules & illicit_all)
    tp_mid = len(flagged_mules & illicit_mids)
    tp_network_cover = len(flagged_any_member & illicit_all)

    report = {
        "dataset": "IBM AMLworld (NeurIPS 2023)",
        "license": "CDLA-Sharing-1.0",
        "source_file": str(src_csv.name),
        "rows_processed": summary["rows_read"],
        "laundering_rows": prep["laundering_rows"],
        "total_accounts": prep["total_accounts"],
        "illicit_accounts_all": len(illicit_all),
        "illicit_intermediaries": len(prep["intermediary_accounts"]),
        "flagged_mules": len(flagged_mules),
        "networks_detected": len(res["networks"]),
        "convert_s": round(convert_s, 2),
        "ingest_s": round(ingest_s, 2),
        "analyze_s": round(analyze_s, 2),
        "ingest_peak_mb": round(ingest_peak / 1e6, 2),
        "analyze_peak_mb": round(analyze_peak / 1e6, 2),
        # Honest metrics against both all illicit endpoints and laundering intermediaries (closer to mule role)
        "against_all_illicit_accounts": {
            "true_positives": tp_all,
            "precision": round(tp_all / len(flagged_mules), 4) if flagged_mules else 0.0,
            "recall": round(tp_all / len(illicit_all), 4) if illicit_all else 0.0,
        },
        "against_illicit_intermediaries": {
            "true_positives": tp_mid,
            "precision": round(tp_mid / len(flagged_mules), 4) if flagged_mules else 0.0,
            "recall": round(tp_mid / len(illicit_mids), 4) if illicit_mids else 0.0,
        },
        "network_membership_recall_on_all_illicit": round(tp_network_cover / len(illicit_all), 4) if illicit_all else 0.0,
        "honest_notes": (
            "IBM AMLworld models broader banking AML topologies (cycles, scatter-gather, fan-out across multi-week windows "
            "and multiple currencies) rather than Indian UPI 72h rapid-burst scams; lower recall/precision than TARKA's own "
            "UPI generator highlights domain differences (cycles/slow multi-week peels)."
        ),
    }
    (out_dir / "amlworld_results.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Evaluate TARKA on IBM AMLworld (NeurIPS 2023) CSV")
    ap.add_argument("--csv", type=Path, required=True, help="Local path to HI-Small_Trans.csv or LI-Small_Trans.csv")
    ap.add_argument("--out", type=Path, default=Path("data/validation/independent"))
    ap.add_argument("--max-rows", type=int, default=None, help="Optional row cap for quick iteration")
    args = ap.parse_args(argv)
    if not args.csv.exists():
        print(
            f"Dataset CSV not found: {args.csv}\n"
            "Download HI-Small_Trans.csv from Kaggle (ealtman2019/ibm-transactions-for-anti-money-laundering-aml) "
            "or https://github.com/IBM/AML-Data (CDLA-Sharing-1.0).",
            file=sys.stderr,
        )
        return 2
    report = evaluate_amlworld(args.csv, args.out, max_rows=args.max_rows)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
