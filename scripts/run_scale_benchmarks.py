"""
TARKA x SentinelX - Phase 9 Performance & Scale Benchmark Engine
Measures actual wall-clock parsing throughput, double-entry reconciliation latency,
P50/P95/P99 percentiles, and memory delta across scale thresholds: 1,000, 10,000, 50,000.
"""

import sys
import os
import time
import io
import csv
import json
import psutil
import statistics
import numpy as np
from decimal import Decimal
from typing import List, Dict, Any

from app.adapters.trace_engine import TraceEngine

def generate_synthetic_bank_csv(row_count: int, seed_balance: Decimal = Decimal("100000.00")) -> bytes:
    """Generates a valid bank statement CSV with row_count double-entry transactions."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Description", "Withdrawal", "Deposit", "Balance"])

    curr_balance = seed_balance
    base_time = 1729000000

    for i in range(row_count):
        dt_str = time.strftime("%Y-%m-%d", time.gmtime(base_time + i * 3600))
        # Alternate withdrawals and deposits
        if i % 3 == 0:
            dep = Decimal("5000.00")
            curr_balance += dep
            writer.writerow([dt_str, f"Deposit {i}", "", f"{dep:.2f}", f"{curr_balance:.2f}"])
        else:
            wth = Decimal("2500.00")
            curr_balance -= wth
            writer.writerow([dt_str, f"Transfer {i}", f"{wth:.2f}", "", f"{curr_balance:.2f}"])

    return output.getvalue().encode("utf-8")

def run_scale_benchmarks() -> Dict[str, Any]:
    print("=" * 75)
    print("TARKA x SENTINELX -- SCALE & PERFORMANCE RECONCILIATION BENCHMARKS")
    print("=" * 75)

    process = psutil.Process(os.getpid())
    scale_levels = [1_000, 10_000, 50_000]
    benchmark_results = {}

    for count in scale_levels:
        print(f"\n>>> Benchmarking Scale Tier: {count:,} Transactions...")
        
        # 1. Generation & In-memory Size
        mem_before = process.memory_info().rss / (1024 * 1024)
        t_gen_start = time.perf_counter()
        csv_bytes = generate_synthetic_bank_csv(count)
        t_gen_end = time.perf_counter()
        
        byte_size = len(csv_bytes)
        gen_duration = t_gen_end - t_gen_start

        # 2. Parsing & TRACE Reconciliation Runs (5 iterations to measure P50, P95, P99)
        latencies = []
        parsed_tx_counts = []
        engine = TraceEngine()

        for run_idx in range(5):
            t0 = time.perf_counter()
            csv_str = csv_bytes.decode("utf-8")
            transactions = engine.parse_bank_statement_csv(csv_str)
            summary = engine.reconcile_balance(
                transactions=transactions,
                stated_opening=Decimal("100000.00"),
                stated_closing=None,
            )
            t1 = time.perf_counter()
            latencies.append((t1 - t0) * 1000.0)  # ms
            parsed_tx_counts.append(len(transactions))

        mem_after = process.memory_info().rss / (1024 * 1024)
        mem_delta = max(0.0, mem_after - mem_before)

        # Statistical Aggregations
        p50 = statistics.median(latencies)
        p95 = np.percentile(latencies, 95)
        p99 = np.percentile(latencies, 99)
        avg_latency_s = (statistics.mean(latencies)) / 1000.0
        rows_per_sec = count / avg_latency_s if avg_latency_s > 0 else 0

        res_tier = {
            "transaction_count": count,
            "byte_size_mb": round(byte_size / (1024 * 1024), 2),
            "rows_per_second": round(rows_per_sec, 1),
            "p50_latency_ms": round(p50, 2),
            "p95_latency_ms": round(p95, 2),
            "p99_latency_ms": round(p99, 2),
            "mean_latency_ms": round(statistics.mean(latencies), 2),
            "memory_delta_mb": round(mem_delta, 2),
            "process_rss_mb": round(mem_after, 2),
        }
        benchmark_results[str(count)] = res_tier

        print(f"    Payload Size:     {res_tier['byte_size_mb']} MB")
        print(f"    Throughput:       {res_tier['rows_per_second']:,} rows/sec")
        print(f"    P50 Latency:      {res_tier['p50_latency_ms']} ms")
        print(f"    P95 Latency:      {res_tier['p95_latency_ms']} ms")
        print(f"    P99 Latency:      {res_tier['p99_latency_ms']} ms")
        print(f"    Memory Delta:     +{res_tier['memory_delta_mb']} MB (Current RSS: {res_tier['process_rss_mb']} MB)")

    print("\n" + "=" * 75)
    print("BENCHMARK SUMMARY TABLE:")
    print(f"{'Scale Tier':<12} | {'Size (MB)':<10} | {'Throughput (r/s)':<18} | {'P50 (ms)':<10} | {'P95 (ms)':<10} | {'Mem Delta':<10}")
    print("-" * 75)
    for count, b in benchmark_results.items():
        print(f"{int(count):<12,} | {b['byte_size_mb']:<10} | {b['rows_per_second']:<18,} | {b['p50_latency_ms']:<10} | {b['p95_latency_ms']:<10} | +{b['memory_delta_mb']} MB")
    print("=" * 75)

    os.makedirs("data", exist_ok=True)
    with open("data/benchmark_results.json", "w", encoding="utf-8") as f:
        json.dump(benchmark_results, f, indent=2)
    print("Wrote results to data/benchmark_results.json")

    return benchmark_results

if __name__ == "__main__":
    run_scale_benchmarks()
