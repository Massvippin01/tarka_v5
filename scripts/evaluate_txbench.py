"""
TARKA-TXBENCH: Scientific Benchmark Evaluator
Executes rigorous evaluation across the TARKA-TXBENCH dataset.
Calculates:
- OCR Field Extraction Recall & Precision
- Amount Discrepancy Detection Accuracy
- UTR/RRN Match Rate
- Error Level Analysis (ELA) & Resampling Manipulation Precision / Recall / F1
- Execution Latency Distribution (P50, P90, P99)
"""

import json
import os
import sys
import time
from pathlib import Path

# Add root and backend to path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))

from app.adapters.trace_payment_forensics import TracePaymentForensics


def evaluate_txbench():
    dataset_dir = Path("data/txbench")
    manifest_path = dataset_dir / "manifest.json"

    if not manifest_path.exists():
        print("Manifest not found. Generating benchmark dataset first...")
        import scripts.generate_txbench_dataset as gen
        gen.generate_benchmark_dataset()

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    engine = TracePaymentForensics()
    cases = manifest.get("cases", [])

    true_positives = 0
    false_positives = 0
    true_negatives = 0
    false_negatives = 0

    amount_matches = 0
    utr_matches = 0
    latencies = []

    case_results = []

    for c in cases:
        img_path = dataset_dir / c["relative_path"]
        if not img_path.exists():
            print(f"Skipping missing image: {img_path}")
            continue

        with open(img_path, "rb") as fp:
            img_bytes = fp.read()

        t0 = time.perf_counter()
        exam = engine.examine_screenshot(img_bytes, c["filename"], artifact_id=c["id"])
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(elapsed_ms)

        manip = exam.get("manipulation_analysis", {})
        score = manip.get("composite_anomaly_score", 0.0)
        predicted_tampered = score >= 0.35  # Calibrated decision threshold (matches POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES)

        actual_tampered = c["tampered"]

        if predicted_tampered and actual_tampered:
            true_positives += 1
        elif predicted_tampered and not actual_tampered:
            false_positives += 1
        elif not predicted_tampered and not actual_tampered:
            true_negatives += 1
        elif not predicted_tampered and actual_tampered:
            false_negatives += 1

        fields = exam.get("ocr_analysis", {}).get("extracted_fields", {})
        extracted_amt = fields.get("amount")
        extracted_utr = fields.get("utr_rrn")

        amt_ok = (extracted_amt is not None and abs(float(extracted_amt) - float(c["ground_truth_amount"])) < 1.0)
        utr_ok = (extracted_utr is not None and str(extracted_utr) == str(c["ground_truth_utr"]))

        if amt_ok:
            amount_matches += 1
        if utr_ok:
            utr_matches += 1

        case_results.append({
            "case_id": c["id"],
            "filename": c["filename"],
            "actual_tampered": actual_tampered,
            "predicted_tampered": predicted_tampered,
            "anomaly_score": score,
            "verdict": manip.get("classification"),
            "latency_ms": round(elapsed_ms, 2),
            "amount_match": amt_ok,
            "utr_match": utr_ok,
        })

    total_evaluated = len(latencies)
    latencies.sort()
    p50 = latencies[int(len(latencies) * 0.50)] if latencies else 0
    p90 = latencies[int(len(latencies) * 0.90)] if latencies else 0
    p99 = latencies[int(len(latencies) * 0.99)] if latencies else 0

    precision = true_positives / max(1, true_positives + false_positives)
    recall = true_positives / max(1, true_positives + false_negatives)
    f1 = 2 * (precision * recall) / max(1e-6, precision + recall)
    accuracy = (true_positives + true_negatives) / max(1, total_evaluated)

    report = {
        "benchmark": "TARKA-TXBENCH v1.0.0",
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_cases_evaluated": total_evaluated,
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "confusion_matrix": {
                "true_positives": true_positives,
                "false_positives": false_positives,
                "true_negatives": true_negatives,
                "false_negatives": false_negatives,
            },
            "amount_extraction_accuracy": round(amount_matches / max(1, total_evaluated), 4),
            "utr_extraction_accuracy": round(utr_matches / max(1, total_evaluated), 4),
        },
        "latency_ms": {
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "p99": round(p99, 2),
            "mean": round(sum(latencies) / max(1, len(latencies)), 2),
        },
        "case_details": case_results,
    }

    out_file = Path("data/txbench_evaluation_report.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 60)
    print("TARKA-TXBENCH EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Total Cases Evaluated: {total_evaluated}")
    print(f"Manipulation Detection Accuracy : {accuracy * 100:.2f}%")
    print(f"Precision: {precision:.4f} | Recall: {recall:.4f} | F1: {f1:.4f}")
    print(f"Latency P50: {p50:.1f}ms | P90: {p90:.1f}ms | P99: {p99:.1f}ms")
    print(f"Results written to: {out_file}")
    print("=" * 60 + "\n")
    return report


if __name__ == "__main__":
    evaluate_txbench()
