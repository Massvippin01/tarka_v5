"""
TARKA × SentinelX — 49-Scenario Catalogue Verification Script.
Executes all 49 scenarios (T01-T25, A01-A12, P01-P12) through the production
ValidationLabService and BlindValidationEngine, recording detailed forensic
metrics, confusion classifications, and execution durations.
"""

import sys
import json
import time
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.domain.validation_lab import (
    TestCategory,
    EngineType,
    TestStatus,
    ConfusionType,
)
from app.services.validation_lab_service import ValidationLabService


def run_49_scenario_verification():
    print("=" * 80)
    print("TARKA × SENTINELX — 49-SCENARIO FORENSIC CATALOGUE VERIFICATION")
    print("=" * 80)

    val_lab = ValidationLabService(base_dir="data/validation_lab")
    session = val_lab.create_session(
        session_name="49-Scenario Catalogue Full Verification Run",
        mode="CONTROLLED_EVALUATION",
    )
    print(f"\n[+] Created Session: {session.session_id} ('{session.session_name}')")

    catalogue = val_lab.catalogue_service
    all_scenarios = catalogue.list_scenarios()
    print(f"[+] Loaded {len(all_scenarios)} scenarios from catalogue.")

    results_table = []
    category_counts = {"TRACE": 0, "AEGIS": 0, "PLATFORM": 0}
    status_counts = {"PASSED": 0, "FAILED": 0, "INCONCLUSIVE": 0, "BLOCKED": 0}
    confusion_counts = {"TP": 0, "TN": 0, "FP": 0, "FN": 0, "NA": 0}
    total_duration_ms = 0.0

    print("\nExecuting scenarios under Blind Validation...")
    print("-" * 80)
    print(f"{'ID':<6} {'Category':<10} {'Engine':<12} {'Status':<10} {'Confusion':<10} {'Time (ms)':<10} {'Title'}")
    print("-" * 80)

    for sc in all_scenarios:
        # Register ground truth manifest out-of-band
        val_lab.blind_engine.register_ground_truth(sc.manifest)

        # Create test case
        tc = val_lab.create_test_case(
            session_id=session.session_id,
            case_id=f"CASE-{sc.scenario_id}",
            test_category=sc.category,
            scenario_id=sc.scenario_id,
            scenario_description=sc.title,
            engine=sc.engine,
            ground_truth_manifest_id=sc.manifest.manifest_id,
            expected_behaviour=sc.expected_behaviour,
        )

        # Execute test case
        executed = val_lab.execute_test_case(tc.test_id)

        # Tally metrics
        cat_name = sc.category.value if hasattr(sc.category, "value") else str(sc.category)
        st_name = executed.execution_status.value if hasattr(executed.execution_status, "value") else str(executed.execution_status)
        cf_name = executed.confusion_classification.value if hasattr(executed.confusion_classification, "value") else str(executed.confusion_classification)

        category_counts[cat_name] = category_counts.get(cat_name, 0) + 1
        status_counts[st_name] = status_counts.get(st_name, 0) + 1
        if cf_name in confusion_counts:
            confusion_counts[cf_name] += 1
        else:
            confusion_counts["NA"] += 1

        total_duration_ms += executed.processing_duration_ms

        print(
            f"{sc.scenario_id:<6} {cat_name:<10} {sc.engine.value:<12} {st_name:<10} {cf_name:<10} "
            f"{executed.processing_duration_ms:>8.1f}   {sc.title[:35]}"
        )

        results_table.append({
            "scenario_id": sc.scenario_id,
            "title": sc.title,
            "category": cat_name,
            "engine": sc.engine.value,
            "status": st_name,
            "confusion": cf_name,
            "duration_ms": executed.processing_duration_ms,
            "actual_output": executed.actual_output,
            "failures": executed.actual_output.get("evaluation_details", {}).get("assertion_failures", []),
        })

    print("-" * 80)

    # Export full validation report
    report = val_lab.export_validation_report(session.session_id)
    out_file = Path("data/validation_lab/catalogue_49_execution_record.json")
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\n[+] Full report exported to: {out_file.resolve()}")
    print("\n" + "=" * 80)
    print("SUMMARY OF 49-SCENARIO EXECUTION")
    print("=" * 80)
    print(f"Total Scenarios Evaluated: {len(all_scenarios)}")
    print(f"  - TRACE Scenarios (T01 - T25)    : {category_counts['TRACE']}")
    print(f"  - AEGIS Scenarios (A01 - A12)    : {category_counts['AEGIS']}")
    print(f"  - PLATFORM Scenarios (P01 - P12) : {category_counts['PLATFORM']}")
    print(f"\nExecution Outcomes:")
    print(f"  - PASSED        : {status_counts['PASSED']}")
    print(f"  - FAILED        : {status_counts['FAILED']}")
    print(f"  - INCONCLUSIVE  : {status_counts['INCONCLUSIVE']}")
    print(f"  - BLOCKED       : {status_counts['BLOCKED']}")
    print(f"\nImage Manipulation Confusion Matrix (TRACE):")
    print(f"  - True Positives  (TP) : {confusion_counts['TP']}")
    print(f"  - True Negatives  (TN) : {confusion_counts['TN']}")
    print(f"  - False Positives (FP) : {confusion_counts['FP']}")
    print(f"  - False Negatives (FN) : {confusion_counts['FN']}")
    print(f"  - N/A (Non-Image/Platform): {confusion_counts['NA']}")
    print(f"\nOperational Performance:")
    print(f"  - Total Execution Time : {total_duration_ms / 1000.0:.2f} s")
    print(f"  - Mean Latency         : {total_duration_ms / len(all_scenarios):.1f} ms")
    print("=" * 80)

    return status_counts["FAILED"] == 0


if __name__ == "__main__":
    success = run_49_scenario_verification()
    sys.exit(0 if success else 1)
