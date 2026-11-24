"""
TARKA-TXBENCH v0.2: Scientific Benchmark Evaluator & Generalisation Test
Executes rigorous evaluation across the 25-scenario TXBENCH v0.2 dataset.
Calculates:
- Manipulation Detection Confusion Matrix (TP, FP, TN, FN)
- Detection Accuracy, Precision, Recall, F1 Score, FPR, FNR
- Localisation IoU for Ground Truth vs Predicted Bounding Boxes
- Multi-field OCR Extraction Accuracies (Amount, UTR, VPA, Status)
- Multi-Source Financial Reconstruction Conflict Resolution & Invariant Integrity
- Latency Distribution (P50, P90, P99, Mean)
"""

import csv
import io
import json
import os
import sys
import time
from pathlib import Path

# Add root and backend to path
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("backend"))

from app.adapters.trace_payment_forensics import TracePaymentForensics


def compute_iou(box_a, box_b):
    if not box_a or not box_b:
        return 0.0
    ymin_a, xmin_a, ymax_a, xmax_a = box_a
    ymin_b, xmin_b, ymax_b, xmax_b = box_b

    inter_ymin = max(ymin_a, ymin_b)
    inter_xmin = max(xmin_a, xmin_b)
    inter_ymax = min(ymax_a, ymax_b)
    inter_xmax = min(xmax_a, xmax_b)

    inter_h = max(0.0, inter_ymax - inter_ymin)
    inter_w = max(0.0, inter_xmax - inter_xmin)
    inter_area = inter_h * inter_w

    area_a = max(0.0, ymax_a - ymin_a) * max(0.0, xmax_a - xmin_a)
    area_b = max(0.0, ymax_b - ymin_b) * max(0.0, xmax_b - xmin_b)

    union_area = area_a + area_b - inter_area
    if union_area <= 0.0:
        return 0.0
    return inter_area / union_area


def evaluate_txbench_v02():
    dataset_dir = Path("data/txbench_v02")
    manifest_path = dataset_dir / "manifest.json"

    if not manifest_path.exists():
        print(f"Error: Manifest not found at {manifest_path}")
        return None

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
    vpa_matches = 0
    status_matches = 0

    ious = []
    latencies = []
    case_results = []

    print(f"Starting evaluation of {len(cases)} TXBENCH v0.2 scenarios...")

    for idx, c in enumerate(cases):
        img_path = dataset_dir / c["relative_path"]
        if not img_path.exists():
            print(f"[{idx+1}/{len(cases)}] Missing image: {img_path}")
            continue

        with open(img_path, "rb") as fp:
            img_bytes = fp.read()

        t0 = time.perf_counter()
        exam = engine.examine_screenshot(img_bytes, c["filename"], artifact_id=c["id"])
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        latencies.append(elapsed_ms)

        manip = exam.get("manipulation_analysis", {})
        score = manip.get("composite_anomaly_score", 0.0)
        predicted_bbox = manip.get("manipulated_region_bbox")
        predicted_tampered = score >= 0.28 or manip.get("is_tampered", False)

        actual_tampered = c["tampered"]

        if predicted_tampered and actual_tampered:
            true_positives += 1
        elif predicted_tampered and not actual_tampered:
            false_positives += 1
        elif not predicted_tampered and not actual_tampered:
            true_negatives += 1
        elif not predicted_tampered and actual_tampered:
            false_negatives += 1

        # IoU calculation if ground truth bbox exists
        gt_bbox = c.get("manipulated_region_bbox")
        iou = 0.0
        if gt_bbox and actual_tampered:
            iou = compute_iou(predicted_bbox, gt_bbox)
            ious.append(iou)

        # OCR fields check
        fields = exam.get("ocr_analysis", {}).get("extracted_fields", {})
        gt_fields = c.get("ground_truth_fields", {})

        amt_ok = False
        if fields.get("amount") is not None and gt_fields.get("amount") is not None:
            try:
                amt_ok = abs(float(fields["amount"]) - float(gt_fields["amount"])) < 1.0
            except ValueError:
                amt_ok = False
        if amt_ok:
            amount_matches += 1

        utr_ok = False
        if fields.get("utr_rrn") and gt_fields.get("utr"):
            utr_ok = str(fields["utr_rrn"]).strip() == str(gt_fields["utr"]).strip()
        if utr_ok:
            utr_matches += 1

        vpa_ok = False
        if fields.get("vpa") and gt_fields.get("vpa"):
            vpa_ok = str(fields["vpa"]).lower().strip() == str(gt_fields["vpa"]).lower().strip()
        if vpa_ok:
            vpa_matches += 1

        status_ok = False
        if fields.get("status") and gt_fields.get("status"):
            status_ok = str(fields["status"]).upper().strip() == str(gt_fields["status"]).upper().strip()
        if status_ok:
            status_matches += 1

        case_results.append({
            "case_id": c["id"],
            "filename": c["filename"],
            "category": c.get("tampering_category", "NONE"),
            "benign_transformations": c.get("benign_transformations", []),
            "actual_tampered": actual_tampered,
            "predicted_tampered": predicted_tampered,
            "anomaly_score": round(score, 3),
            "predicted_bbox": predicted_bbox,
            "gt_bbox": gt_bbox,
            "iou": round(iou, 3) if gt_bbox else None,
            "latency_ms": round(elapsed_ms, 2),
            "amount_match": amt_ok,
            "utr_match": utr_ok,
            "vpa_match": vpa_ok,
            "status_match": status_ok,
            "indicators": manip.get("indicators", [])
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
    fpr = false_positives / max(1, false_positives + true_negatives)
    fnr = false_negatives / max(1, false_negatives + true_positives)
    mean_iou = sum(ious) / max(1, len(ious)) if ious else 0.0

    # Multi-source Financial Reconciliation Evaluation
    statement_path = dataset_dir / "statements" / "cbs_statement_q1_2026.csv"
    reconciliation_results = {}
    if statement_path.exists():
        statement_transactions = []
        with open(statement_path, "r", encoding="utf-8") as sfp:
            reader = csv.DictReader(sfp)
            for row in reader:
                statement_transactions.append({
                    "tx_id": row.get("TxID", ""),
                    "value_date": row.get("ValueDate", ""),
                    "clearance_date": row.get("ClearanceDate", ""),
                    "reference_number": row.get("ReferenceNumber", ""),
                    "description": row.get("Description", ""),
                    "debit": float(row.get("Debit") or 0.0),
                    "credit": float(row.get("Credit") or 0.0),
                    "balance": float(row.get("Balance")) if row.get("Balance") else None,
                    "status": row.get("Status", "CLEARED"),
                })

        recon_cases = [c for c in cases if c.get("id", "").startswith("TXB2-REC-")]
        evidence_items = []
        for rc in recon_cases:
            gt_f = rc.get("ground_truth_fields", {})
            evidence_items.append({
                "artifact_id": rc["id"],
                "filename": rc["filename"],
                "extracted_fields": {
                    "amount": gt_f.get("amount"),
                    "utr_rrn": gt_f.get("utr"),
                    "transaction_time": gt_f.get("timestamp"),
                    "vpa": gt_f.get("vpa"),
                    "recipient_name": gt_f.get("recipient_name"),
                    "status": gt_f.get("status")
                }
            })

        recon_summary = engine.reconcile_multi_source_package(
            statement_transactions=statement_transactions,
            receipt_extractions=evidence_items,
        )
        reconciliation_results = recon_summary

    report = {
        "benchmark": "TARKA-TXBENCH v0.2.0-STAGING",
        "evaluation_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_cases_evaluated": total_evaluated,
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "false_positive_rate": round(fpr, 4),
            "false_negative_rate": round(fnr, 4),
            "mean_iou_localization": round(mean_iou, 4),
            "confusion_matrix": {
                "true_positives": true_positives,
                "false_positives": false_positives,
                "true_negatives": true_negatives,
                "false_negatives": false_negatives,
            },
            "ocr_accuracies": {
                "amount": round(amount_matches / max(1, total_evaluated), 4),
                "utr": round(utr_matches / max(1, total_evaluated), 4),
                "vpa": round(vpa_matches / max(1, total_evaluated), 4),
                "status": round(status_matches / max(1, total_evaluated), 4),
            }
        },
        "latency_ms": {
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "p99": round(p99, 2),
            "mean": round(sum(latencies) / max(1, len(latencies)), 2),
        },
        "reconciliation_evaluation": {
            "total_reconciled": reconciliation_results.get("reconciliation_summary", {}).get("total_receipts_evaluated", 0),
            "match_count": reconciliation_results.get("reconciliation_summary", {}).get("exact_matched_count", 0),
            "mismatch_count": reconciliation_results.get("reconciliation_summary", {}).get("discrepancies_count", 0),
            "unmatched_count": reconciliation_results.get("reconciliation_summary", {}).get("missing_from_cbs_count", 0),
            "ambiguous_count": reconciliation_results.get("reconciliation_summary", {}).get("ambiguities_count", 0),
            "inversion_count": reconciliation_results.get("reconciliation_summary", {}).get("temporal_inversions_count", 0),
            "balance_conservation_valid": reconciliation_results.get("balance_conservation", {}).get("status") == "VERIFIED_CONSERVED",
            "auto_reversals_identified": reconciliation_results.get("reconciliation_summary", {}).get("reversals_count", 0),
            "duplicates_identified": reconciliation_results.get("reconciliation_summary", {}).get("duplicates_count", 0),
        },
        "case_details": case_results,
    }

    out_file = Path("data/txbench_v02_evaluation_report.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 65)
    print("TARKA-TXBENCH v0.2.0 EVALUATION SUMMARY")
    print("=" * 65)
    print(f"Total Cases Evaluated        : {total_evaluated}")
    print(f"Detection Accuracy           : {accuracy * 100:.2f}%")
    print(f"Precision                    : {precision:.4f} | Recall: {recall:.4f} | F1: {f1:.4f}")
    print(f"False Positive Rate (FPR)    : {fpr * 100:.2f}%")
    print(f"False Negative Rate (FNR)    : {fnr * 100:.2f}%")
    print(f"Mean Localization IoU        : {mean_iou:.4f}")
    print("-" * 65)
    print(f"OCR Amount Accuracy          : {report['metrics']['ocr_accuracies']['amount'] * 100:.1f}%")
    print(f"OCR UTR Accuracy             : {report['metrics']['ocr_accuracies']['utr'] * 100:.1f}%")
    print(f"OCR VPA Accuracy             : {report['metrics']['ocr_accuracies']['vpa'] * 100:.1f}%")
    print(f"OCR Status Accuracy          : {report['metrics']['ocr_accuracies']['status'] * 100:.1f}%")
    print("-" * 65)
    print(f"Latency P50: {p50:.1f}ms | P90: {p90:.1f}ms | P99: {p99:.1f}ms")
    print(f"Multi-Source Reconciliation  : Mismatches={report['reconciliation_evaluation']['mismatch_count']} | Unmatched={report['reconciliation_evaluation']['unmatched_count']} | Ambiguous={report['reconciliation_evaluation']['ambiguous_count']} | Inversions={report['reconciliation_evaluation']['inversion_count']}")
    print(f"Balance Conservation Valid   : {report['reconciliation_evaluation']['balance_conservation_valid']}")
    print(f"Report saved to              : {out_file}")
    print("=" * 65 + "\n")
    return report


if __name__ == "__main__":
    evaluate_txbench_v02()
