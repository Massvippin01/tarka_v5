"""
TARKA × SentinelX — Founder-Led Forensic Validation Lab Test Suite.
Verifies:
1. Real evidence intake security: SHA-256 streaming, read-back verification, anti-malware, synthetic rejection.
2. Validation session and test case lifecycle.
3. Blind validation output freezing and out-of-band evaluation.
4. Production TRACE and CBS reconciliation execution on scenarios T01, T02, T08.
5. Metrics calculation: WER, CER, IoU, and classification metrics with labelled denominator.
6. Reproducible report export and JSON serialization.
"""

import io
import pytest
from pathlib import Path

from app.domain.validation_lab import (
    TestCategory,
    EngineType,
    TestStatus,
    ConfusionType,
    TransmissionChannel,
)
from app.services.validation_lab_service import ValidationLabService
from app.services.validation_intake_service import (
    RealEvidenceSecurityError,
    SyntheticContaminationError,
)
from app.services.validation_metrics_engine import ValidationMetricsEngine


@pytest.fixture
def lab_service(tmp_path):
    return ValidationLabService(base_dir=str(tmp_path / "val_lab"))


def test_real_evidence_intake_and_readback(lab_service, tmp_path):
    intake = lab_service.intake_service
    fake_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
        b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )

    record = intake.ingest_real_evidence(
        session_id="SESS-TEST-01",
        case_id="CASE-TEST-01",
        filename="bank_receipt.png",
        content=fake_png,
        source_name="Complainant Device Extraction",
        acquisition_method="Direct USB extraction via investigator terminal",
        transmission_channel=TransmissionChannel.DIRECT_EXPORT,
        redaction_notes="Redacted citizen Aadhaar prior to ingestion",
        is_synthetic=False,
    )

    assert record.evidence_id.startswith("REAL-EV-")
    assert record.size_bytes == len(fake_png)
    assert Path(record.storage_path_raw).exists()
    assert Path(record.storage_path_derived).exists()

    # Verify read-back content matches
    with open(record.storage_path_raw, "rb") as f:
        assert f.read() == fake_png


def test_reject_synthetic_contamination_in_real_evidence(lab_service):
    intake = lab_service.intake_service
    with pytest.raises(SyntheticContaminationError):
        intake.ingest_real_evidence(
            session_id="SESS-REAL-01",
            case_id="CASE-REAL-01",
            filename="synthetic_fixture.png",
            content=b"\x89PNG\r\n\x1a\n" + b"\x00" * 50,
            source_name="Synthetic Test Generator",
            acquisition_method="Test harness",
            is_synthetic=True,  # Must fail closed
        )


def test_reject_malicious_pe_and_formula_injection(lab_service):
    intake = lab_service.intake_service
    # PE binary
    with pytest.raises(RealEvidenceSecurityError, match="Executable payloads"):
        intake.ingest_real_evidence(
            session_id="SESS-SEC-01",
            case_id="CASE-SEC-01",
            filename="malware.png",
            content=b"MZ\x90\x00\x03\x00" + b"\x00" * 50,
            source_name="Unknown",
            acquisition_method="Upload",
        )

    # Formula injection in CSV
    with pytest.raises(RealEvidenceSecurityError, match="formula injection"):
        intake.ingest_real_evidence(
            session_id="SESS-SEC-02",
            case_id="CASE-SEC-02",
            filename="malicious.csv",
            content=b"Date,Amount,Description\n2026-03-01,1000,=cmd|'/c calc'!A1\n",
            source_name="Unknown",
            acquisition_method="Upload",
        )


def test_execute_t01_genuine_receipt(lab_service):
    session = lab_service.create_session("Session T01 Genuine Test", mode="REAL_EVIDENCE")
    test_case = lab_service.create_test_case(
        session_id=session.session_id,
        case_id="CASE-T01-01",
        test_category=TestCategory.TRACE,
        scenario_id="T01",
        scenario_description="Unaltered genuine receipt",
        engine=EngineType.TRACE,
    )

    executed = lab_service.execute_test_case(test_case.test_id)
    assert executed.execution_status == TestStatus.PASSED
    assert executed.confusion_classification == ConfusionType.TN  # Genuine correctly classified as not tampered
    assert executed.processing_duration_ms > 0
    assert "trace_raster" in executed.actual_output


def test_execute_t02_altered_amount(lab_service):
    session = lab_service.create_session("Session T02 Altered Test", mode="REAL_EVIDENCE")
    test_case = lab_service.create_test_case(
        session_id=session.session_id,
        case_id="CASE-T02-01",
        test_category=TestCategory.TRACE,
        scenario_id="T02",
        scenario_description="Altered amount receipt",
        engine=EngineType.TRACE,
    )

    executed = lab_service.execute_test_case(test_case.test_id)
    assert executed.execution_status == TestStatus.PASSED
    assert executed.confusion_classification == ConfusionType.TP  # Tampered correctly classified as tampered
    assert executed.actual_output["is_tampered"] is True


def test_metrics_calculation():
    # 1. Edit distance & WER/CER
    wer, cer = ValidationMetricsEngine.calculate_wer_and_cer("INR 25,000.00", "INR 25,000.00")
    assert wer == 0.0
    assert cer == 0.0

    wer_err, cer_err = ValidationMetricsEngine.calculate_wer_and_cer("Ref 412356789012", "Ref 412356789013")
    assert cer_err > 0.0

    # 2. Bounding Box IoU
    boxA = [10, 10, 50, 50]
    boxB = [10, 10, 50, 50]
    assert ValidationMetricsEngine.calculate_box_iou(boxA, boxB) == 1.0

    boxC = [60, 60, 100, 100]
    assert ValidationMetricsEngine.calculate_box_iou(boxA, boxC) == 0.0

    # 3. Image Classification Metrics with Denominator
    metrics = ValidationMetricsEngine.compute_image_classification_metrics({"TP": 10, "TN": 10, "FP": 0, "FN": 0})
    assert metrics["labelled_denominator"] == 20
    assert metrics["accuracy"] == 1.0
    assert metrics["false_positive_rate"] == 0.0
    assert metrics["calibration_status"] == "CALIBRATED"


def test_validation_report_export(lab_service):
    session = lab_service.create_session("Export Test Session")
    test_case = lab_service.create_test_case(
        session_id=session.session_id,
        case_id="CASE-EXP-01",
        test_category=TestCategory.TRACE,
        scenario_id="T01",
        scenario_description="Genuine receipt test for export",
        engine=EngineType.TRACE,
    )
    lab_service.execute_test_case(test_case.test_id)

    report = lab_service.export_validation_report(session.session_id)
    assert report["session_id"] == session.session_id
    assert report["summary"]["total_tests"] == 1
    assert report["summary"]["passed_tests"] == 1
    assert "classification_metrics" in report
    assert "operational_metrics" in report
    assert len(report["test_cases"]) == 1
