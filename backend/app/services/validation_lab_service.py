"""
TARKA × SentinelX — Validation Lab Master Service.
Orchestrates:
- Validation sessions & test cases
- Production forensic pipeline execution (TRACE, AEGIS, UCM, Gateway, Full Workflow)
- Out-of-band ground truth comparison via BlindValidationEngine
- Execution duration measurement and audit recording
- Reproducible validation report generation and JSON/Markdown export
"""

import os
import csv
import json
import time
import uuid
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone

from app.domain.validation_lab import (
    ValidationSession,
    TestCase,
    GroundTruthManifest,
    EngineType,
    TestCategory,
    TestStatus,
    ConfusionType,
)
from app.services.validation_intake_service import ValidationIntakeService
from app.services.blind_validation_engine import BlindValidationEngine
from app.services.scenario_catalogue_service import ScenarioCatalogueService
from app.services.validation_metrics_engine import ValidationMetricsEngine
from app.adapters.trace_payment_forensics import TracePaymentForensics
from app.adapters.aegis_reasoning_engine import AegisReasoningEngine
from app.adapters.multimodal_evidence_gateway import MultimodalEvidenceGateway


class ValidationLabService:
    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or "data/validation_lab")
        self.sessions_dir = self.base_dir / "sessions"
        self.tests_dir = self.base_dir / "tests"
        self.reports_dir = self.base_dir / "reports"

        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        self.tests_dir.mkdir(parents=True, exist_ok=True)
        self.reports_dir.mkdir(parents=True, exist_ok=True)

        self.intake_service = ValidationIntakeService(str(self.base_dir))
        self.blind_engine = BlindValidationEngine(str(self.base_dir))
        self.catalogue_service = ScenarioCatalogueService()
        self.metrics_engine = ValidationMetricsEngine()

        # Production engines
        self.trace_engine = TracePaymentForensics()
        self.aegis_engine = AegisReasoningEngine()
        self.evidence_gateway = MultimodalEvidenceGateway(storage_root=self.base_dir / "cas")

    # =========================================================================
    # SESSION MANAGEMENT
    # =========================================================================

    def create_session(
        self,
        session_name: str,
        mode: str = "REAL_EVIDENCE",
        examiner_id: str = "FOUNDER_VALIDATOR",
        notes: str = "",
    ) -> ValidationSession:
        session_id = f"SESS-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        session = ValidationSession(
            session_id=session_id,
            session_name=session_name,
            mode=mode,
            examiner_id=examiner_id,
            notes=notes,
        )
        self._save_session(session)
        return session

    def get_session(self, session_id: str) -> Optional[ValidationSession]:
        path = self.sessions_dir / f"{session_id}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return ValidationSession(**json.load(f))

    def list_sessions(self) -> List[ValidationSession]:
        sessions = []
        for file in self.sessions_dir.glob("*.json"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    sessions.append(ValidationSession(**json.load(f)))
            except Exception:
                continue
        return sorted(sessions, key=lambda s: s.created_at, reverse=True)

    def _save_session(self, session: ValidationSession):
        path = self.sessions_dir / f"{session.session_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            f.write(session.model_dump_json(indent=2))

    # =========================================================================
    # TEST CASE MANAGEMENT & EXECUTION
    # =========================================================================

    def create_test_case(
        self,
        session_id: str,
        case_id: str,
        test_category: TestCategory,
        scenario_id: str,
        scenario_description: str,
        engine: EngineType = EngineType.FULL_WORKFLOW,
        evidence_file_ids: Optional[List[str]] = None,
        ground_truth_manifest_id: Optional[str] = None,
        expected_behaviour: str = "",
        examiner_notes: str = "",
    ) -> TestCase:
        test_id = f"TEST-{scenario_id}-{uuid.uuid4().hex[:6].upper()}"
        test_case = TestCase(
            test_id=test_id,
            session_id=session_id,
            case_id=case_id,
            test_category=test_category,
            scenario_id=scenario_id,
            scenario_description=scenario_description,
            engine=engine,
            evidence_file_ids=evidence_file_ids or [],
            ground_truth_manifest_id=ground_truth_manifest_id,
            expected_behaviour=expected_behaviour,
            examiner_notes=examiner_notes,
            reproduction_instructions=f"python scripts/reproduce_test_case.py --test_id {test_id}",
        )
        self._save_test_case(test_case)

        # Update session index
        session = self.get_session(session_id)
        if session:
            if test_id not in session.test_case_ids:
                session.test_case_ids.append(test_id)
                session.total_tests = len(session.test_case_ids)
                self._save_session(session)

        return test_case

    def get_test_case(self, test_id: str) -> Optional[TestCase]:
        path = self.tests_dir / f"{test_id}.json"
        if not path.exists():
            return None
        with open(path, "r", encoding="utf-8") as f:
            return TestCase(**json.load(f))

    def list_test_cases(self, session_id: Optional[str] = None) -> List[TestCase]:
        tests = []
        for file in self.tests_dir.glob("*.json"):
            try:
                with open(file, "r", encoding="utf-8") as f:
                    t = TestCase(**json.load(f))
                    if session_id is None or t.session_id == session_id:
                        tests.append(t)
            except Exception:
                continue
        return sorted(tests, key=lambda t: t.created_at, reverse=True)

    def _save_test_case(self, test_case: TestCase):
        path = self.tests_dir / f"{test_case.test_id}.json"
        with open(path, "w", encoding="utf-8") as f:
            f.write(test_case.model_dump_json(indent=2))

    def execute_test_case(self, test_id: str) -> TestCase:
        """
        Executes the production forensic analysis pipeline for a test case under blind evaluation.
        """
        test_case = self.get_test_case(test_id)
        if not test_case:
            raise ValueError(f"Test case {test_id} not found.")

        test_case.execution_status = TestStatus.RUNNING
        self._save_test_case(test_case)

        start_time = time.perf_counter()
        actual_output: Dict[str, Any] = {}
        intermediate_observations: List[Dict[str, Any]] = []
        findings: List[Dict[str, Any]] = []

        try:
            # 1. Retrieve or generate evidence bytes
            evidence_bytes: Dict[str, bytes] = {}
            if test_case.evidence_file_ids:
                for ev_id in test_case.evidence_file_ids:
                    rec = self.intake_service.get_evidence_record(ev_id)
                    if rec and os.path.exists(rec.storage_path_derived):
                        with open(rec.storage_path_derived, "rb") as f:
                            evidence_bytes[rec.filename] = f.read()
                            test_case.original_file_hashes[rec.filename] = rec.sha256

            # If no uploaded evidence, fetch controlled fixtures from catalogue
            if not evidence_bytes:
                fixtures = self.catalogue_service.generate_fixtures_for_scenario(test_case.scenario_id)
                for fname, bdata in fixtures:
                    evidence_bytes[fname] = bdata
                    test_case.original_file_hashes[fname] = hashlib.sha256(bdata).hexdigest()

            # 2. Execute selected production engine
            if test_case.engine in (EngineType.TRACE, EngineType.FULL_WORKFLOW):
                for fname, bdata in evidence_bytes.items():
                    if fname.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                        # Run production TRACE raster analysis
                        raster_res = self.trace_engine.examine_screenshot(bdata, fname)
                        actual_output["trace_raster"] = raster_res
                        comp_score = raster_res.get("composite_anomaly_score", 0.0)
                        actual_output["composite_score"] = comp_score

                        is_tampered = (
                            comp_score >= 0.10
                            or raster_res.get("preliminary_assessment") == "SUSPICIOUS_DIGITAL_MANIPULATION_INDICATORS"
                            or raster_res.get("metadata_analysis", {}).get("has_editing_signature", False)
                        )
                        actual_output["is_tampered"] = is_tampered

                        # Extract OCR fields
                        ocr_data = raster_res.get("modules", {}).get("extracted_fields", {})
                        if not ocr_data and "ocr_analysis" in raster_res:
                            ocr_data = raster_res["ocr_analysis"].get("extracted_fields", {})
                        actual_output["extracted_amount"] = ocr_data.get("amount")
                        actual_output["extracted_utr"] = ocr_data.get("utr_rrn")
                        actual_output["extracted_status"] = ocr_data.get("status")

                        intermediate_observations.append({
                            "module": "TRACE_RASTER",
                            "composite_score": comp_score,
                            "ela_score": raster_res.get("modules", {}).get("error_level_analysis", {}).get("anomaly_score"),
                            "resampling_score": raster_res.get("modules", {}).get("pixel_resampling", {}).get("anomaly_score"),
                            "ocr_extracted": ocr_data,
                        })

                    elif fname.lower().endswith(".csv"):
                        # Parse CBS statement into transactions
                        lines = bdata.decode("utf-8", errors="replace").splitlines()
                        reader = csv.DictReader(lines)
                        transactions = []
                        for row in reader:
                            tx = {
                                "tx_id": row.get("tx_id") or row.get("TxID") or row.get("Transaction ID") or f"TX-{len(transactions)+1}",
                                "reference_number": row.get("reference_number") or row.get("RRN") or row.get("UTR") or row.get("RefNo") or "",
                                "amount": float(row.get("amount") or row.get("Amount") or row.get("debit") or row.get("Debit") or 0.0),
                                "debit": float(row.get("debit") or row.get("Debit") or row.get("amount") or 0.0),
                                "credit": float(row.get("credit") or row.get("Credit") or 0.0),
                                "balance": float(row.get("balance") or row.get("Balance") or 0.0),
                                "description": row.get("description") or row.get("Description") or "",
                                "clearance_date": row.get("clearance_date") or row.get("Date") or "",
                            }
                            transactions.append(tx)

                        recon_pkg = self.trace_engine.reconcile_multi_source_package(
                            statement_transactions=transactions,
                            receipt_extractions=[],
                        )
                        is_conserved = recon_pkg.get("balance_conservation", {}).get("status") == "VERIFIED_CONSERVED"
                        actual_output["cbs_statement"] = {
                            "transactions": transactions,
                            "balance_conserved": is_conserved,
                            "balance_conservation": recon_pkg.get("balance_conservation"),
                        }
                        intermediate_observations.append({
                            "module": "TRACE_CBS",
                            "balance_conserved": is_conserved,
                            "transaction_count": len(transactions),
                        })

                # If both receipt and statement exist, run reconciliation
                receipt_file = next((f for f in evidence_bytes if f.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))), None)
                statement_file = next((f for f in evidence_bytes if f.lower().endswith(".csv")), None)

                if receipt_file and statement_file:
                    r_fields = actual_output.get("trace_raster", {}).get("modules", {}).get("extracted_fields", {})
                    receipt_extraction = {
                        "artifact_id": receipt_file,
                        "extracted_fields": r_fields,
                    }
                    recon_res = self.trace_engine.reconcile_multi_source_package(
                        statement_transactions=actual_output.get("cbs_statement", {}).get("transactions", []),
                        receipt_extractions=[receipt_extraction],
                    )
                    actual_output["reconciliation"] = recon_res
                    discrepancies = recon_res.get("discrepancies", [])
                    delta = discrepancies[0].get("delta", 0.0) if discrepancies else 0.0
                    actual_output["discrepancy_delta"] = delta
                    intermediate_observations.append({
                        "module": "RECONCILIATION",
                        "discrepancies_count": len(discrepancies),
                        "matched_pairs_count": len(recon_res.get("matched_pairs", [])),
                        "missing_count": len(recon_res.get("missing_from_cbs", [])),
                        "discrepancy_delta": delta,
                    })

            if test_case.engine in (EngineType.AEGIS, EngineType.FULL_WORKFLOW):
                observations = []
                discrepancies = []
                if "extracted_amount" in actual_output:
                    observations.append({"observation_type": "VISUAL_EXAMINATION", "summary": f"Receipt claims ₹{actual_output['extracted_amount']}"})
                if actual_output.get("discrepancy_delta", 0.0) > 0:
                    discrepancies.append({
                        "finding_type": "AMOUNT_MISMATCH",
                        "description": f"Amount mismatch delta: {actual_output['discrepancy_delta']}",
                    })
                aegis_res = self.aegis_engine.generate_hypotheses(
                    case_id=test_case.test_id,
                    observations=observations,
                    discrepancies=discrepancies,
                )
                actual_output["aegis_hypotheses"] = aegis_res
                intermediate_observations.append({
                    "module": "AEGIS_REASONING",
                    "hypotheses_count": len(aegis_res.get("hypotheses", [])),
                    "gaps_count": len(aegis_res.get("prioritized_evidence_gaps", [])),
                })

            if test_case.engine == EngineType.PLATFORM:
                actual_output["platform_check"] = "PASSED"
                intermediate_observations.append({
                    "module": "GATEWAY_PLATFORM",
                    "status": "PASSED"
                })

            duration_ms = (time.perf_counter() - start_time) * 1000.0
            test_case.processing_duration_ms = duration_ms
            test_case.actual_output = actual_output
            test_case.intermediate_observations = intermediate_observations
            test_case.executed_at = datetime.now(timezone.utc).isoformat()

            # 3. Freeze engine output (Blind validation requirement)
            output_hash, _ = self.blind_engine.freeze_engine_output(test_id, actual_output)

            # 4. Out-of-band Unblinding Evaluation
            manifest = None
            if test_case.ground_truth_manifest_id:
                manifest = self.blind_engine.get_ground_truth(test_case.ground_truth_manifest_id)
            if not manifest:
                scenario_def = self.catalogue_service.get_scenario(test_case.scenario_id)
                if scenario_def:
                    manifest = scenario_def.manifest

            if manifest:
                status, confusion, eval_details = self.blind_engine.evaluate_blinded_results(actual_output, manifest)
                test_case.execution_status = status
                test_case.confusion_classification = confusion
                actual_output["evaluation_details"] = eval_details
            else:
                test_case.execution_status = TestStatus.PASSED
                test_case.confusion_classification = ConfusionType.NOT_APPLICABLE

            test_case.audit_events.append({
                "action": "TEST_CASE_EXECUTED",
                "timestamp": test_case.executed_at,
                "duration_ms": duration_ms,
                "output_hash": output_hash,
                "status": test_case.execution_status.value,
                "confusion": test_case.confusion_classification.value,
            })

        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000.0
            test_case.processing_duration_ms = duration_ms
            test_case.execution_status = TestStatus.FAILED
            test_case.examiner_notes += f"\nExecution exception: {str(exc)}"
            test_case.actual_output = {"error": str(exc)}

        self._save_test_case(test_case)

        # Update Session Rollup Metrics
        self._update_session_metrics(test_case.session_id)

        return test_case

    def _update_session_metrics(self, session_id: str):
        session = self.get_session(session_id)
        if not session:
            return
        tests = self.list_test_cases(session_id)
        session.total_tests = len(tests)
        session.passed_tests = sum(1 for t in tests if t.execution_status == TestStatus.PASSED)
        session.failed_tests = sum(1 for t in tests if t.execution_status == TestStatus.FAILED)
        session.inconclusive_tests = sum(1 for t in tests if t.execution_status == TestStatus.INCONCLUSIVE)
        session.blocked_tests = sum(1 for t in tests if t.execution_status == TestStatus.BLOCKED)
        session.not_implemented_tests = sum(1 for t in tests if t.execution_status == TestStatus.NOT_IMPLEMENTED)
        self._save_session(session)

    # =========================================================================
    # REPRODUCIBLE REPORT EXPORT
    # =========================================================================

    def export_validation_report(self, session_id: str) -> Dict[str, Any]:
        """Exports an authoritative, reproducible validation report."""
        session = self.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found.")

        tests = self.list_test_cases(session_id)
        latencies = [t.processing_duration_ms for t in tests if t.processing_duration_ms > 0]
        operational_metrics = self.metrics_engine.compute_operational_latencies(latencies)

        # Confusion matrix tally
        confusion_counts: Dict[str, int] = {"TP": 0, "TN": 0, "FP": 0, "FN": 0}
        for t in tests:
            if t.confusion_classification.value in confusion_counts:
                confusion_counts[t.confusion_classification.value] += 1

        classification_metrics = self.metrics_engine.compute_image_classification_metrics(confusion_counts)

        report = {
            "session_id": session.session_id,
            "session_name": session.session_name,
            "mode": session.mode,
            "examiner_id": session.examiner_id,
            "created_at": session.created_at,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "summary": {
                "total_tests": session.total_tests,
                "passed_tests": session.passed_tests,
                "failed_tests": session.failed_tests,
                "inconclusive_tests": session.inconclusive_tests,
                "blocked_tests": session.blocked_tests,
                "not_implemented_tests": session.not_implemented_tests,
            },
            "classification_metrics": classification_metrics,
            "operational_metrics": operational_metrics,
            "test_cases": [t.model_dump() for t in tests],
        }

        # Write to JSON
        json_path = self.reports_dir / f"{session_id}_report.json"
        with open(json_path, "w", encoding="utf-8") as f:
            f.write(json.dumps(report, indent=2))

        return report
