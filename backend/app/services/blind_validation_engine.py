"""
TARKA × SentinelX — Blind Validation Engine.
Implements Phase 4 requirements:
- Ground-truth manifests stored strictly out-of-band under data/validation_lab/ground_truth/
- Production analysis engines (TRACE, AEGIS, Gateway) execute with complete blindness
- Zero ground-truth leakage via filenames, metadata, UTRs, VPAs, or test fixtures
- Output freezing: actual outputs and intermediate findings are sealed with SHA-256 fingerprint
- Post-execution unblinding: compares sealed output against ground-truth manifest
- Generates unmodifiable evaluation run records
"""

import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timezone

from app.domain.validation_lab import (
    GroundTruthManifest,
    ConfusionType,
    TestStatus,
)


class BlindValidationEngine:
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or "data/validation_lab")
        self.ground_truth_dir = self.base_dir / "ground_truth"
        self.frozen_runs_dir = self.base_dir / "frozen_runs"

        self.ground_truth_dir.mkdir(parents=True, exist_ok=True)
        self.frozen_runs_dir.mkdir(parents=True, exist_ok=True)

    def register_ground_truth(self, manifest: GroundTruthManifest) -> str:
        """Stores a ground-truth manifest completely isolated from the execution engine."""
        path = self.ground_truth_dir / f"{manifest.manifest_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            f.write(manifest.model_dump_json(indent=2))
        return manifest.manifest_id

    def get_ground_truth(self, manifest_id: str) -> Optional[GroundTruthManifest]:
        path = self.ground_truth_dir / f"{manifest_id}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return GroundTruthManifest(**json.load(f))

    def freeze_engine_output(self, test_id: str, actual_output: Dict[str, Any]) -> Tuple[str, str]:
        """
        Freezes the raw engine output with a cryptographic hash before unblinding.
        Returns (output_hash, storage_path).
        """
        timestamp = datetime.now(timezone.utc).isoformat()
        canonical_payload = json.dumps(actual_output, sort_keys=True)
        output_hash = hashlib.sha256(canonical_payload.encode()).hexdigest()

        frozen_record = {
            "test_id": test_id,
            "output_hash": output_hash,
            "timestamp": timestamp,
            "actual_output": actual_output,
        }

        path = self.frozen_runs_dir / f"{test_id}_{output_hash[:12]}.json"
        with open(path, "w", encoding="utf-8") as f:
            f.write(json.dumps(frozen_record, indent=2))

        return output_hash, str(path)

    def evaluate_blinded_results(
        self,
        actual_output: Dict[str, Any],
        manifest: GroundTruthManifest,
    ) -> Tuple[TestStatus, ConfusionType, Dict[str, Any]]:
        """
        Post-execution unblinding evaluation.
        Compares frozen engine output against ground truth.
        """
        evaluation_details: Dict[str, Any] = {
            "evaluated_at": datetime.now(timezone.utc).isoformat(),
            "assertions_checked": [],
            "assertion_failures": [],
            "metrics": {},
        }

        # 1. Image Manipulation Confusion Evaluation
        confusion = ConfusionType.NOT_APPLICABLE
        if manifest.is_manipulated is not None:
            # Check actual output for manipulation determination
            # TRACE uses composite_score > 0.05 or anomaly flags or discrepancies
            actual_is_tampered = actual_output.get("is_tampered", False) or actual_output.get("manipulation_detected", False)
            if "composite_score" in actual_output:
                if actual_output["composite_score"] > 0.05:
                    actual_is_tampered = True

            expected_is_tampered = manifest.is_manipulated

            if expected_is_tampered and actual_is_tampered:
                confusion = ConfusionType.TP
            elif not expected_is_tampered and not actual_is_tampered:
                confusion = ConfusionType.TN
            elif not expected_is_tampered and actual_is_tampered:
                confusion = ConfusionType.FP
            elif expected_is_tampered and not actual_is_tampered:
                confusion = ConfusionType.FN

            evaluation_details["metrics"]["confusion_classification"] = confusion.value

        # 2. Financial Amount & UTR Checks
        if manifest.expected_amount is not None:
            actual_amount = actual_output.get("extracted_amount") or actual_output.get("ocr_amount")
            # Tolerate float representation
            if actual_amount is not None:
                delta = abs(float(actual_amount) - float(manifest.expected_amount))
                evaluation_details["assertions_checked"].append("amount_match")
                if delta > 0.01:
                    evaluation_details["assertion_failures"].append(
                        f"Amount mismatch: Expected {manifest.expected_amount}, got {actual_amount}"
                    )
            else:
                evaluation_details["assertion_failures"].append(
                    f"Amount missing: Expected {manifest.expected_amount}, got None"
                )

        if manifest.expected_utr is not None:
            actual_utr = actual_output.get("extracted_utr") or actual_output.get("ocr_utr")
            evaluation_details["assertions_checked"].append("utr_match")
            if str(actual_utr).strip() != str(manifest.expected_utr).strip():
                evaluation_details["assertion_failures"].append(
                    f"UTR mismatch: Expected {manifest.expected_utr}, got {actual_utr}"
                )

        # 3. Reconciliation Discrepancy Checks
        if manifest.expected_discrepancy_delta is not None:
            actual_delta = actual_output.get("discrepancy_delta", 0.0)
            diff = abs(float(actual_delta) - float(manifest.expected_discrepancy_delta))
            evaluation_details["assertions_checked"].append("reconciliation_delta")
            if diff > 0.01:
                evaluation_details["assertion_failures"].append(
                    f"Delta mismatch: Expected {manifest.expected_discrepancy_delta}, got {actual_delta}"
                )

        # Determine Final Test Status
        if len(evaluation_details["assertion_failures"]) == 0:
            status = TestStatus.PASSED
        else:
            status = TestStatus.FAILED

        return status, confusion, evaluation_details
