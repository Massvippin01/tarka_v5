"""
TARKA × SentinelX — Founder-Led Forensic Validation Lab API.
Exposes REST endpoints for:
- Creating and managing validation sessions
- Safe real-evidence intake with provenance tagging and PII warning
- Listing and inspecting the 49-scenario catalogue
- Building and executing blinded test cases against production engines
- Inspecting intermediate observations, diffs, and examiner notes
- Real-time validation dashboard metrics and reproducible report export
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel

from app.domain.validation_lab import (
    ValidationSession,
    TestCase,
    RealEvidenceIntakeRecord,
    TransmissionChannel,
    EngineType,
    TestCategory,
)
from app.services.validation_lab_service import ValidationLabService

router = APIRouter()
lab_service = ValidationLabService()


class CreateSessionRequest(BaseModel):
    session_name: str
    mode: str = "REAL_EVIDENCE"  # "REAL_EVIDENCE" or "SYNTHETIC_LAB"
    examiner_id: str = "FOUNDER_VALIDATOR"
    notes: str = ""


class CreateTestCaseRequest(BaseModel):
    case_id: str
    test_category: TestCategory
    scenario_id: str
    scenario_description: str
    engine: EngineType = EngineType.FULL_WORKFLOW
    evidence_file_ids: List[str] = []
    ground_truth_manifest_id: Optional[str] = None
    expected_behaviour: str = ""
    examiner_notes: str = ""


@router.post("/sessions", response_model=ValidationSession)
def create_session(req: CreateSessionRequest):
    return lab_service.create_session(
        session_name=req.session_name,
        mode=req.mode,
        examiner_id=req.examiner_id,
        notes=req.notes,
    )


@router.get("/sessions", response_model=List[ValidationSession])
def list_sessions():
    return lab_service.list_sessions()


@router.get("/sessions/{session_id}", response_model=ValidationSession)
def get_session(session_id: str):
    sess = lab_service.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Validation session not found")
    return sess


@router.post("/sessions/{session_id}/evidence", response_model=RealEvidenceIntakeRecord)
async def upload_real_evidence(
    session_id: str,
    case_id: str = Form(...),
    source_name: str = Form(...),
    acquisition_method: str = Form(...),
    acquisition_timestamp: Optional[str] = Form(None),
    claimed_transaction_timestamp: Optional[str] = Form(None),
    transmission_channel: str = Form("DIRECT_EXPORT"),
    transformation_flags: Optional[str] = Form(None),
    redaction_notes: str = Form("Examiner verified citizen PII redacted."),
    file: UploadFile = File(...),
):
    """
    Safely ingests genuine evidence into REAL_EVIDENCE mode.
    Enforces pre-hashing, CAS write-verification, anti-malware, and synthetic rejection.
    """
    sess = lab_service.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Validation session not found")

    content = await file.read()
    try:
        channel_enum = TransmissionChannel(transmission_channel.upper())
    except Exception:
        channel_enum = TransmissionChannel.UNKNOWN

    flags = [f.strip() for f in transformation_flags.split(",")] if transformation_flags else []

    try:
        record = lab_service.intake_service.ingest_real_evidence(
            session_id=session_id,
            case_id=case_id,
            filename=file.filename or "uploaded_evidence",
            content=content,
            source_name=source_name,
            acquisition_method=acquisition_method,
            acquisition_timestamp=acquisition_timestamp,
            claimed_transaction_timestamp=claimed_transaction_timestamp,
            transmission_channel=channel_enum,
            transformation_flags=flags,
            redaction_notes=redaction_notes,
            is_synthetic=False,
        )
        # Update session evidence index
        if record.evidence_id not in sess.evidence_ids:
            sess.evidence_ids.append(record.evidence_id)
            lab_service._save_session(sess)
        return record
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.get("/sessions/{session_id}/evidence", response_model=List[RealEvidenceIntakeRecord])
def list_session_evidence(session_id: str):
    return lab_service.intake_service.list_evidence_records(session_id=session_id)


@router.post("/sessions/{session_id}/tests", response_model=TestCase)
def create_test_case(session_id: str, req: CreateTestCaseRequest):
    sess = lab_service.get_session(session_id)
    if not sess:
        raise HTTPException(status_code=404, detail="Validation session not found")

    return lab_service.create_test_case(
        session_id=session_id,
        case_id=req.case_id,
        test_category=req.test_category,
        scenario_id=req.scenario_id,
        scenario_description=req.scenario_description,
        engine=req.engine,
        evidence_file_ids=req.evidence_file_ids,
        ground_truth_manifest_id=req.ground_truth_manifest_id,
        expected_behaviour=req.expected_behaviour,
        examiner_notes=req.examiner_notes,
    )


@router.get("/sessions/{session_id}/tests", response_model=List[TestCase])
def list_session_tests(session_id: str):
    return lab_service.list_test_cases(session_id=session_id)


@router.post("/tests/{test_id}/execute", response_model=TestCase)
def execute_test(test_id: str):
    try:
        return lab_service.execute_test_case(test_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.get("/scenarios")
def list_scenarios(category: Optional[str] = None):
    cat_enum = None
    if category:
        try:
            cat_enum = TestCategory(category.upper())
        except Exception:
            pass
    scenarios = lab_service.catalogue_service.list_scenarios(cat_enum)
    return [
        {
            "scenario_id": s.scenario_id,
            "title": s.title,
            "category": s.category.value,
            "engine": s.engine.value,
            "objective": s.objective,
            "expected_behaviour": s.expected_behaviour,
            "failure_conditions": s.failure_conditions,
        }
        for s in scenarios
    ]


@router.get("/sessions/{session_id}/report")
def export_session_report(session_id: str):
    try:
        return lab_service.export_validation_report(session_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@router.get("/dashboard")
def get_validation_dashboard():
    """Returns aggregated real-world testing dashboard data."""
    sessions = lab_service.list_sessions()
    all_tests = lab_service.list_test_cases()
    all_evidence = lab_service.intake_service.list_evidence_records()

    real_evidence_count = sum(1 for e in all_evidence if not e.is_synthetic)
    synthetic_evidence_count = sum(1 for e in all_evidence if e.is_synthetic)

    durations = [t.processing_duration_ms for t in all_tests if t.processing_duration_ms > 0]
    operational_metrics = lab_service.metrics_engine.compute_operational_latencies(durations)

    confusion_counts = {"TP": 0, "TN": 0, "FP": 0, "FN": 0}
    for t in all_tests:
        if t.confusion_classification.value in confusion_counts:
            confusion_counts[t.confusion_classification.value] += 1

    classification_metrics = lab_service.metrics_engine.compute_image_classification_metrics(confusion_counts)

    return {
        "total_validation_sessions": len(sessions),
        "total_cases": len(set(t.case_id for t in all_tests)),
        "total_evidence_files": len(all_evidence),
        "real_evidence_count": real_evidence_count,
        "synthetic_evidence_count": synthetic_evidence_count,
        "completed_tests": sum(1 for t in all_tests if t.execution_status == "PASSED"),
        "failed_tests": sum(1 for t in all_tests if t.execution_status == "FAILED"),
        "inconclusive_tests": sum(1 for t in all_tests if t.execution_status == "INCONCLUSIVE"),
        "classification_metrics": classification_metrics,
        "operational_metrics": operational_metrics,
        "active_sessions": [s.model_dump() for s in sessions[:5]],
        "recent_tests": [t.model_dump() for t in all_tests[:10]],
    }
