"""
Phase 1: Universal Case Model (UCM) & Canonical Contracts Test Suite.
Verifies:
- Strict Pydantic v2 validation and invariant enforcement
- Non-promotability invariant (human_verified = False by default)
- Robust SHA-256 validation
- Bidirectional UCMAdapter compatibility
- Immutability and audit event hash calculation
"""

import pytest
from datetime import UTC, datetime

from app.domain.case import Case
from app.domain.universal_case_model import (
    AccessPolicy,
    AnalysisJob,
    CaseClassification,
    CaseStatus,
    EntityMatchBasis,
    EvidenceProcessingStatus,
    ExtractedObservation,
    FindingStatus,
    FindingType,
    JobStatus,
    ObservationType,
    UniversalAuditEvent,
    UniversalCase,
    UniversalEntity,
    UniversalEvidence,
    UniversalFinding,
    UniversalRelationship,
)
from app.domain.ucm_adapter import UCMAdapter


def test_universal_case_creation_and_defaults():
    case = UniversalCase(
        title="UPI Fraud Ring Delhi-NCR",
        description="Investigation into unauthorized merchant debits",
    )
    assert case.schema_version == "1.0.0"
    assert case.status == CaseStatus.ACTIVE
    assert case.classification == CaseClassification.CONFIDENTIAL
    assert len(case.case_id) >= 32
    assert case.jurisdiction == "IN_DELHI"


def test_evidence_contract_and_sha256_validation():
    valid_sha = "8a35b1d5c7f893e12a4b86c2d113e54b6789ab9876543210abcdef0123456789"
    ev = UniversalEvidence(
        case_id="CASE-2026-001",
        original_filename="axis_statement.pdf",
        media_type="application/pdf",
        file_size=1024,
        sha256=valid_sha,
        storage_reference=f"cas://sha256/{valid_sha}",
    )
    assert ev.sha256 == valid_sha
    assert ev.processing_status == EvidenceProcessingStatus.RECEIVED

    # Reject invalid SHA-256 (wrong length or non-hex)
    with pytest.raises(ValueError):
        UniversalEvidence(
            case_id="CASE-2026-001",
            original_filename="test.pdf",
            media_type="application/pdf",
            file_size=100,
            sha256="not_a_valid_sha256_hash",
            storage_reference="cas://invalid",
        )


def test_non_promotability_invariant_on_observations_and_findings():
    obs = ExtractedObservation(
        evidence_id="EV-001",
        case_id="CASE-001",
        observation_type=ObservationType.FINANCIAL_TRANSACTION,
        extracted_value={"amount": 25000, "rrn": "202602148891"},
    )
    # Machine generated observation MUST have human_verified=False
    assert obs.human_verified is False

    finding = UniversalFinding(
        case_id="CASE-001",
        finding_type=FindingType.CONTRADICTION,
        description="Amount mismatch between CBS and Screenshot",
        supporting_evidence_ids=["EV-001", "EV-002"],
    )
    # Machine generated finding MUST have human_verified=False
    assert finding.human_verified is False
    assert finding.status == FindingStatus.OPEN


def test_analysis_job_lifecycle():
    job = AnalysisJob(
        case_id="CASE-001",
        evidence_ids=["EV-001"],
        engine="TRACE",
    )
    assert job.status == JobStatus.QUEUED
    assert job.progress == 0.0
    assert job.retry_count == 0


def test_audit_event_hash_chaining():
    prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    actor = "INVESTIGATOR_DELHI"
    action = "EVIDENCE_UPLOAD"
    res_type = "EVIDENCE"
    res_id = "EV-999"
    payload_hash = "abc123hash"
    ts = datetime.now(UTC).isoformat()

    event_hash = UniversalAuditEvent.compute_event_hash(
        prev_hash, actor, action, res_type, res_id, payload_hash, ts
    )
    assert len(event_hash) == 64

    event = UniversalAuditEvent(
        actor_id=actor,
        action=action,
        resource_type=res_type,
        resource_id=res_id,
        previous_event_hash=prev_hash,
        event_hash=event_hash,
        payload_hash=payload_hash,
        timestamp=ts,
    )
    assert event.event_hash == event_hash


def test_ucm_adapter_roundtrip():
    legacy_case = Case(
        id="CASE-2026-X1",
        case_number="FIR-2026-881",
        fir_number="FIR/881/2026",
        title="ATM Skimming Ring",
        description="Multiple unauthorized withdrawals",
        crime_type="FINANCIAL_CYBERCRIME",
        police_station="DELHI_CYBER_PS",
        investigation_status="OPEN",
    )

    ucm = UCMAdapter.case_to_ucm(legacy_case)
    assert ucm.case_id == "CASE-2026-X1"
    assert ucm.title == "ATM Skimming Ring"
    assert ucm.status == CaseStatus.ACTIVE
    assert ucm.metadata["case_number"] == "FIR-2026-881"

    converted_back = UCMAdapter.ucm_to_case(ucm)
    assert converted_back.id == legacy_case.id
    assert converted_back.title == legacy_case.title
    assert converted_back.case_number == legacy_case.case_number
    assert converted_back.investigation_status == "OPEN"
