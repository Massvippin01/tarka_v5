"""
TARKA Phase 11B: Complete Scientific Forensic Diagnostic & Ablation Evaluator
Generates:
1. Exhaustive per-sample forensic metrics table across all 25 TXBENCH v0.2 scenarios.
2. Complete sub-engine ablation study (ELA alone, Resampling alone, Typography alone, OCR alone, Combined).
3. Scientific ELA distribution comparison (Genuine vs Tampered).
4. Error analysis on all false positives and false negatives.
"""

import json
import os
import sys
import time
from pathlib import Path
import numpy as np
import cv2
from PIL import Image

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


def run_full_diagnostic():
    dataset_dir = Path("data/txbench_v02")
    manifest_path = dataset_dir / "manifest.json"

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    engine = TracePaymentForensics()
    cases = manifest.get("cases", [])

    diagnostic_rows = []

    # Ablation trackers: list of (pred_tampered, actual_tampered)
    ablation_results = {
        "ela_alone": [],
        "resampling_alone": [],
        "typography_alone": [],
        "ocr_metadata_alone": [],
        "combined_pipeline": [],
    }

    for c in cases:
        img_path = dataset_dir / c["relative_path"]
        with open(img_path, "rb") as fp:
            img_bytes = fp.read()

        # 1. Image array and low-level resampling checks
        nparr = np.frombuffer(img_bytes, np.uint8)
        cv_img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        diff_rows = float(np.mean(np.abs(cv_img[::2, :] - cv_img[1::2, :]))) if cv_img.shape[0] > 64 else 0.0
        diff_cols = float(np.mean(np.abs(cv_img[:, ::2] - cv_img[:, 1::2]))) if cv_img.shape[1] > 64 else 0.0
        lap_var = float(cv2.Laplacian(cv_img, cv2.CV_64F).var())

        # 2. Run modular forensic engines
        meta = engine.inspect_screenshot_metadata(img_bytes, c["filename"], c["id"])
        ocr = engine.extract_payment_fields_from_ocr(img_bytes, artifact_id=c["id"], case_id="CASE-DIAG")
        ela = engine.perform_error_level_analysis(img_bytes)
        resample = engine.detect_pixel_discontinuities_and_resampling(img_bytes)
        typo = engine.inspect_typography_and_layout(
            ocr["extracted_fields"], meta, raw_text_corpus=ocr.get("raw_text_sample", "")
        )
        full_exam = engine.examine_payment_screenshot(img_bytes, c["filename"], artifact_id=c["id"], case_id="CASE-DIAG")

        # 3. Macroblock ELA 16x16 max block
        pil_orig = Image.open(img_path).convert("RGB")
        arr_orig = np.array(pil_orig).astype(np.float32)
        import io
        buf = io.BytesIO()
        pil_orig.save(buf, format="JPEG", quality=90)
        buf.seek(0)
        resaved = np.array(Image.open(buf)).astype(np.float32)
        diff = np.abs(arr_orig - resaved)
        h, w, _ = diff.shape
        bs = 16
        blk_means = [np.mean(diff[y:y+bs, x:x+bs]) for y in range(0, h-bs, bs) for x in range(0, w-bs, bs)]
        max_blk_16 = float(max(blk_means)) if blk_means else 0.0

        # Ground truth and predictions
        actual_tampered = c["tampered"]
        gt_class = "TAMPERED" if actual_tampered else "GENUINE"

        # Predictions per ablation module
        pred_ela = ela.get("anomaly_score", 0.0) >= 0.25 or ela.get("is_anomalous", False)
        pred_resamp = resample.get("resample_detected", False) or resample.get("anomaly_score", 0.0) >= 0.50
        pred_typo = typo.get("anomaly_score", 0.0) >= 0.35
        pred_ocr_meta = meta.get("has_editing_signature", False)
        
        # Combined prediction
        combined_score = full_exam.get("composite_anomaly_score", 0.0)
        pred_combined = combined_score >= 0.35
        pred_class = "TAMPERED" if pred_combined else "GENUINE"
        is_correct = (pred_combined == actual_tampered)

        # Localization IoU
        gt_bbox = c.get("manipulated_region_bbox")
        pred_bbox = full_exam.get("manipulated_region_bbox")
        iou = compute_iou(pred_bbox, gt_bbox) if (gt_bbox and actual_tampered) else None

        # OCR extracted values
        ocr_fields = ocr.get("extracted_fields", {})
        ocr_amt = ocr_fields.get("amount")
        ocr_utr = ocr_fields.get("utr_rrn")
        amt_prov = ocr_fields.get("field_provenance", {}).get("amount", {})
        ocr_conf = amt_prov.get("confidence", 0.0)

        ablation_results["ela_alone"].append((pred_ela, actual_tampered))
        ablation_results["resampling_alone"].append((pred_resamp, actual_tampered))
        ablation_results["typography_alone"].append((pred_typo, actual_tampered))
        ablation_results["ocr_metadata_alone"].append((pred_ocr_meta, actual_tampered))
        ablation_results["combined_pipeline"].append((pred_combined, actual_tampered))

        diagnostic_rows.append({
            "sample_id": c["id"],
            "filename": c["filename"],
            "category": c.get("tampering_category", "NONE"),
            "benign_transforms": c.get("benign_transformations", []),
            "ground_truth_classification": gt_class,
            "predicted_classification": pred_class,
            "is_correct": is_correct,
            "error_type": "NONE" if is_correct else ("FALSE_POSITIVE" if pred_combined else "FALSE_NEGATIVE"),
            "ela_mean": round(float(ela.get("mean_error", 0.0)), 3),
            "ela_std": round(float(ela.get("std_error", 0.0)), 3),
            "ela_max_block_16": round(max_blk_16, 2),
            "ela_anomalous_blocks": ela.get("hotspots_count", 0),
            "ela_score": round(float(ela.get("anomaly_score", 0.0)), 3),
            "horizontal_resample_diff": round(diff_rows, 3),
            "vertical_resample_diff": round(diff_cols, 3),
            "resample_detected": resample.get("resample_detected", False),
            "resample_score": round(float(resample.get("anomaly_score", 0.0)), 3),
            "typography_score": round(float(typo.get("anomaly_score", 0.0)), 3),
            "typography_anomalies": [a.get("issue") for a in typo.get("detected_anomalies", [])],
            "metadata_signature": meta.get("has_editing_signature", False),
            "ocr_amount": ocr_amt,
            "ocr_utr": ocr_utr,
            "ocr_confidence": round(float(ocr_conf), 2),
            "composite_score": round(float(combined_score), 3),
            "predicted_bbox": pred_bbox,
            "ground_truth_bbox": gt_bbox,
            "localization_iou": round(iou, 3) if iou is not None else None,
            "final_decision": full_exam.get("preliminary_assessment"),
        })

    # Compute ablation metrics
    def calc_metrics(pairs):
        tp = sum(1 for p, a in pairs if p and a)
        fp = sum(1 for p, a in pairs if p and not a)
        tn = sum(1 for p, a in pairs if not p and not a)
        fn = sum(1 for p, a in pairs if not p and a)
        total = len(pairs)
        acc = (tp + tn) / max(1, total)
        prec = tp / max(1, tp + fp)
        rec = tp / max(1, tp + fn)
        f1 = 2 * prec * rec / max(1e-6, prec + rec)
        fpr = fp / max(1, fp + tn)
        fnr = fn / max(1, fn + tp)
        return {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1_score": round(f1, 4),
            "fpr": round(fpr, 4),
            "fnr": round(fnr, 4),
            "tp": tp, "fp": fp, "tn": tn, "fn": fn
        }

    ablation_summary = {k: calc_metrics(v) for k, v in ablation_results.items()}

    # ELA Distribution Analysis
    genuine_ela_means = [r["ela_mean"] for r in diagnostic_rows if r["ground_truth_classification"] == "GENUINE"]
    genuine_ela_stds = [r["ela_std"] for r in diagnostic_rows if r["ground_truth_classification"] == "GENUINE"]
    genuine_ela_maxs = [r["ela_max_block_16"] for r in diagnostic_rows if r["ground_truth_classification"] == "GENUINE"]

    tampered_ela_means = [r["ela_mean"] for r in diagnostic_rows if r["ground_truth_classification"] == "TAMPERED"]
    tampered_ela_stds = [r["ela_std"] for r in diagnostic_rows if r["ground_truth_classification"] == "TAMPERED"]
    tampered_ela_maxs = [r["ela_max_block_16"] for r in diagnostic_rows if r["ground_truth_classification"] == "TAMPERED"]

    ela_distribution_stats = {
        "genuine": {
            "mean_of_means": round(float(np.mean(genuine_ela_means)), 3),
            "std_of_means": round(float(np.std(genuine_ela_means)), 3),
            "min_mean": round(float(min(genuine_ela_means)), 3),
            "max_mean": round(float(max(genuine_ela_means)), 3),
            "mean_of_stds": round(float(np.mean(genuine_ela_stds)), 3),
            "mean_of_max_blocks": round(float(np.mean(genuine_ela_maxs)), 2),
            "min_max_block": round(float(min(genuine_ela_maxs)), 2),
            "max_max_block": round(float(max(genuine_ela_maxs)), 2),
        },
        "tampered": {
            "mean_of_means": round(float(np.mean(tampered_ela_means)), 3),
            "std_of_means": round(float(np.std(tampered_ela_means)), 3),
            "min_mean": round(float(min(tampered_ela_means)), 3),
            "max_mean": round(float(max(tampered_ela_means)), 3),
            "mean_of_stds": round(float(np.mean(tampered_ela_stds)), 3),
            "mean_of_max_blocks": round(float(np.mean(tampered_ela_maxs)), 2),
            "min_max_block": round(float(min(tampered_ela_maxs)), 2),
            "max_max_block": round(float(max(tampered_ela_maxs)), 2),
        }
    }

    full_output = {
        "execution_metadata": {
            "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "benchmark_dataset": "TARKA-TXBENCH v0.2.0-STAGING",
            "total_scenarios": len(diagnostic_rows),
            "git_branch": "fix/ci-post-merge-repair",
            "baseline_freeze_commit": "7d34482 (phase10-baseline-freeze)",
        },
        "ablation_summary": ablation_summary,
        "ela_distribution_stats": ela_distribution_stats,
        "diagnostic_table": diagnostic_rows,
    }

    out_file = Path("data/txbench_v02_diagnostic_table.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(full_output, f, indent=2)

    print("=" * 70)
    print("TARKA Phase 11B Complete Diagnostic Table & Ablation Study Generated")
    print(f"Total Scenarios Evaluated: {len(diagnostic_rows)}")
    print("=" * 70)
    print("\nSUB-ENGINE ABLATION METRICS:")
    for mod, m in ablation_summary.items():
        print(f"  {mod:<22} | Acc: {m['accuracy']*100:.1f}% | Prec: {m['precision']:.3f} | Rec: {m['recall']:.3f} | F1: {m['f1_score']:.3f} | FPR: {m['fpr']*100:.1f}% | FNR: {m['fnr']*100:.1f}%")
    print("\nResults saved to:", out_file)
    print("=" * 70)
    return full_output


if __name__ == "__main__":
    run_full_diagnostic()
