from __future__ import annotations

import copy
import hashlib
from datetime import UTC, datetime
from typing import Any, Dict
from uuid import uuid4

import pytest

from app.domain.auth import AccessPermissionEnum, CaseAccessScope, UserIdentity, UserRoleEnum
from app.domain.governed_learning import (
    CuratedDataset,
    LearningEvent,
    LearningEventType,
    LearningModality,
    LearningOutcome,
    LearningValidationResult,
    OfflineExperimentResult,
    PrivacyClassification,
    PromotionDecision,
    SafetyViolationType,
)
from app.services.audit_service import AuditService
from app.services.learning.governed_learning_service import GovernedLearningService


@pytest.fixture
def audit_service() -> AuditService:
    svc = AuditService.get_instance()
    return svc


@pytest.fixture
def learning_service(audit_service: AuditService) -> GovernedLearningService:
    svc = GovernedLearningService(audit_service=audit_service)
    return svc


@pytest.fixture
def lead_investigator() -> UserIdentity:
    return UserIdentity(
        user_id="INV-LEAD-2026",
        display_name="Senior Lead Investigator",
        role=UserRoleEnum.INVESTIGATOR,
        clearance="TOP_SECRET",
        scope=CaseAccessScope(
            allowed_cases=["CASE-2026-001"],
            jurisdictions=["Delhi NCR / Special Cell"],
            max_sensitivity_clearance="TOP_SECRET",
        ),
        permissions=[AccessPermissionEnum.READ_CASE, AccessPermissionEnum.RUN_ANALYTICAL_QUERY],
    )


@pytest.fixture
def junior_analyst() -> UserIdentity:
    return UserIdentity(
        user_id="USER-ANALYST-JUNIOR",
        display_name="Junior Analyst",
        role=UserRoleEnum.ANALYST,
        clearance="UNCLASSIFIED",
        scope=CaseAccessScope(
            allowed_cases=["CASE-2026-001"],
            jurisdictions=["General"],
            max_sensitivity_clearance="UNCLASSIFIED",
        ),
        permissions=[AccessPermissionEnum.READ_CASE],
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. EVENT CREATION
# ─────────────────────────────────────────────────────────────────────────────

def test_event_creation(learning_service: GovernedLearningService):
    """
    Verifies creation of a versioned, structured LearningEvent containing
    all required operational telemetry fields.
    """
    event = learning_service.capture_event(
        event_type=LearningEventType.VOICE_INTENT,
        model_version="sentinelx-intent-v2.1",
        modality=LearningModality.VOICE,
        language="ta",
        normalized_intent="SHOW_TIMELINE",
        proposed_action="OPEN_TIMELINE_VIEW",
        actual_action="OPEN_TIMELINE_VIEW",
        human_correction=None,
        outcome=LearningOutcome.SUCCESS,
        latency_ms=142.5,
        clarification=None,
        failure_reason=None,
        privacy_classification=PrivacyClassification.DEIDENTIFIED,
        case_id="CASE-2026-001",
        metadata={"acoustic_confidence": 0.98},
    )

    assert event.event_id.startswith("EV-LRN-")
    assert event.schema_version == "1.0.0"
    assert event.event_type == LearningEventType.VOICE_INTENT
    assert event.model_version == "sentinelx-intent-v2.1"
    assert event.modality == LearningModality.VOICE
    assert event.language == "ta"
    assert event.normalized_intent == "SHOW_TIMELINE"
    assert event.proposed_action == "OPEN_TIMELINE_VIEW"
    assert event.actual_action == "OPEN_TIMELINE_VIEW"
    assert event.outcome == LearningOutcome.SUCCESS
    assert event.latency_ms == 142.5
    assert event.privacy_classification == PrivacyClassification.DEIDENTIFIED
    assert len(event.provenance_hash) == 64  # SHA-256


# ─────────────────────────────────────────────────────────────────────────────
# 2. PII HANDLING & DE-IDENTIFICATION
# ─────────────────────────────────────────────────────────────────────────────

def test_pii_handling(learning_service: GovernedLearningService):
    """
    Verifies that PII (Phone, Aadhaar, PAN, SSN, Email) is scrubbed and masked,
    and unmasked PII is rejected when automatic sanitization is disabled.
    """
    raw_event = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-intent-v2.1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="QUERY_CDR",
        proposed_action="CALL_CDR_SEARCH phone=+919876543210 email=suspect@gmail.com aadhaar='1234 5678 9012'",
        privacy_classification=PrivacyClassification.RESTRICTED_PII,
        metadata={"user_phone": "9876543210", "pan": "ABCDE1234F"},
    )

    # 1. Sanitization on ingest succeeds and masks all PII tokens
    ingested = learning_service.ingest_event(raw_event, sanitize_on_ingest=True)
    assert ingested.privacy_classification == PrivacyClassification.DEIDENTIFIED
    assert "[MASKED_PHONE]" in ingested.proposed_action
    assert "[MASKED_EMAIL]" in ingested.proposed_action
    assert "[MASKED_AADHAAR]" in ingested.proposed_action
    assert ingested.metadata["pan"] == "[MASKED_PAN]"

    # 2. Ingesting without sanitization when PII is present raises ValueError
    unsafe_pii_event = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-intent-v2.1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="QUERY_CDR",
        proposed_action="SEARCH_PHONE 9876543210",
        privacy_classification=PrivacyClassification.RESTRICTED_PII,
    )

    with pytest.raises(ValueError, match="Unsafe learning event rejected"):
        learning_service.ingest_event(unsafe_pii_event, sanitize_on_ingest=False)

    # 3. PrivacyClassification.FORBIDDEN is rejected unconditionally
    forbidden_event = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-intent-v2.1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="QUERY_CDR",
        privacy_classification=PrivacyClassification.FORBIDDEN,
    )
    with pytest.raises(ValueError, match="PrivacyClassification.FORBIDDEN"):
        learning_service.ingest_event(forbidden_event)


# ─────────────────────────────────────────────────────────────────────────────
# 3. CASE ISOLATION
# ─────────────────────────────────────────────────────────────────────────────

def test_case_isolation(learning_service: GovernedLearningService):
    """
    Verifies that learning events are stripped of case truth mutations.
    Exported training examples contain no case IDs or case-specific entities.
    Attempts to inject case ID into normalized intents are rejected.
    """
    event = learning_service.capture_event(
        event_type=LearningEventType.VOICE_INTENT,
        model_version="sentinelx-intent-v2.1",
        modality=LearningModality.VOICE,
        language="en",
        normalized_intent="ANALYZE_CONTRADICTIONS",
        proposed_action="RUN_CONTRADICTION_ANALYSIS",
        actual_action="RUN_CONTRADICTION_ANALYSIS",
        outcome=LearningOutcome.SUCCESS,
        case_id="CASE-2026-SECRET-999",
    )

    ingested = learning_service.ingest_event(event)

    # Feature export removes case_id completely
    features = ingested.to_training_feature_dict()
    assert "case_id" not in features
    assert "CASE-2026-SECRET-999" not in str(features)

    # Reject attempt to contaminate normalized intent with case ID
    polluted_event = learning_service.capture_event(
        event_type=LearningEventType.VOICE_INTENT,
        model_version="sentinelx-intent-v2.1",
        modality=LearningModality.VOICE,
        language="en",
        normalized_intent="ANALYZE_CONTRADICTIONS_FOR_CASE-2026-SECRET-999",
        case_id="CASE-2026-SECRET-999",
    )

    with pytest.raises(ValueError, match="Case truth must remain isolated"):
        learning_service.ingest_event(polluted_event)


# ─────────────────────────────────────────────────────────────────────────────
# 4. PROVENANCE & CRYPTOGRAPHIC CHAINING
# ─────────────────────────────────────────────────────────────────────────────

def test_provenance(learning_service: GovernedLearningService):
    """
    Verifies that events have cryptographically chained provenance hashes.
    Each event's provenance hash depends on the preceding event.
    """
    ev1 = learning_service.capture_event(
        event_type=LearningEventType.VOICE_INTENT,
        model_version="sentinelx-v1",
        modality=LearningModality.VOICE,
        language="en",
        normalized_intent="OPEN_CASE",
    )
    ingested_1 = learning_service.ingest_event(ev1)

    ev2 = learning_service.capture_event(
        event_type=LearningEventType.VOICE_INTENT,
        model_version="sentinelx-v1",
        modality=LearningModality.VOICE,
        language="en",
        normalized_intent="SHOW_EVIDENCE",
    )
    ingested_2 = learning_service.ingest_event(ev2)

    assert ingested_1.provenance_hash is not None
    assert ingested_2.provenance_hash is not None
    assert ingested_1.provenance_hash != ingested_2.provenance_hash

    # Provenance hash is reproducible
    expected_sig = (
        f"{ingested_1.provenance_hash}:{ev2.event_id}:{ev2.schema_version}:"
        f"{ev2.timestamp.isoformat()}:{ev2.event_type.value}:{ev2.model_version}:"
        f"{ev2.normalized_intent}:{ev2.outcome.value}"
    )
    expected_hash = hashlib.sha256(expected_sig.encode("utf-8")).hexdigest()
    assert ingested_2.provenance_hash == expected_hash


# ─────────────────────────────────────────────────────────────────────────────
# 5. VERSIONING
# ─────────────────────────────────────────────────────────────────────────────

def test_versioning(learning_service: GovernedLearningService):
    """
    Verifies schema versioning and rejection of unsupported versions.
    """
    # Supported version 1.0.0
    ev_valid = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-v1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="FIND_CORROBORATION",
        schema_version="1.0.0",
    )
    ingested = learning_service.ingest_event(ev_valid)
    assert ingested.schema_version == "1.0.0"

    # Unsupported version 9.9.9
    ev_invalid = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-v1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="FIND_CORROBORATION",
        schema_version="9.9.9",
    )
    with pytest.raises(ValueError, match="Unsupported schema version"):
        learning_service.ingest_event(ev_invalid)


# ─────────────────────────────────────────────────────────────────────────────
# 6. REJECTION OF UNSAFE LEARNING EVENTS
# ─────────────────────────────────────────────────────────────────────────────

def test_rejection_of_unsafe_learning_events(learning_service: GovernedLearningService):
    """
    Tests strict rejection across all 5 forbidden training data types:
    1. Guilt predictions
    2. Raw sensitive case evidence
    3. Unverified allegations
    4. Identity assertions
    5. Investigator speculation
    """
    # 1. Guilt prediction rejection
    ev_guilt = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-v1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="CLASSIFY_SUSPECT",
        metadata={"guilt_score": 0.89, "conviction_probability": 0.95},
    )
    with pytest.raises(ValueError, match="Forbidden guilt prediction"):
        learning_service.ingest_event(ev_guilt)

    # 2. Raw sensitive evidence rejection
    ev_raw_evidence = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-v1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="STORE_TRAINING_SAMPLE",
        metadata={"raw_wiretap": "intercept_transcript_verbatim_audio"},
    )
    with pytest.raises(ValueError, match="Forbidden raw sensitive evidence"):
        learning_service.ingest_event(ev_raw_evidence)

    # 3. Unverified allegation rejection
    ev_allegation = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-v1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="LOG_STATEMENT",
        metadata={"unverified_allegation": "Suspect admitted crime to anonymous informant"},
    )
    with pytest.raises(ValueError, match="Forbidden unverified allegation"):
        learning_service.ingest_event(ev_allegation)

    # 4. Identity assertion rejection
    ev_identity = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-v1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="IDENTIFY_TARGET",
        metadata={"suspect_identity_assertion": "Definitively identified without judicial verification"},
    )
    with pytest.raises(ValueError, match="Forbidden suspect identity assertion"):
        learning_service.ingest_event(ev_identity)

    # 5. Investigator speculation rejection
    ev_speculation = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-v1",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="STORE_NOTE",
        metadata={"investigator_speculation": "Gut feeling that suspect hid money in shell corporation"},
    )
    with pytest.raises(ValueError, match="Forbidden investigator speculation"):
        learning_service.ingest_event(ev_speculation)


# ─────────────────────────────────────────────────────────────────────────────
# 7. REPRODUCIBILITY
# ─────────────────────────────────────────────────────────────────────────────

def test_reproducibility(learning_service: GovernedLearningService):
    """
    Verifies deterministic dataset export and offline experiment evaluation.
    Repeated runs on the same dataset produce identical hashes and metrics.
    """
    events = []
    for i in range(5):
        ev = learning_service.capture_event(
            event_type=LearningEventType.VOICE_INTENT,
            model_version="sentinelx-v2",
            modality=LearningModality.VOICE,
            language="en",
            normalized_intent="OPEN_CASE" if i % 2 == 0 else "SHOW_TIMELINE",
            proposed_action="OPEN_CASE_ACTION",
            actual_action="OPEN_CASE_ACTION",
            latency_ms=100.0 + i,
        )
        events.append(learning_service.ingest_event(ev))

    # Build dataset twice
    ds1 = learning_service.build_curated_dataset("benchmark_dataset", "v1.0", events=events)
    ds2 = learning_service.build_curated_dataset("benchmark_dataset", "v1.0", events=events)

    assert ds1.dataset_hash == ds2.dataset_hash
    assert ds1.size == 5

    # Run deterministic offline experiment
    def deterministic_evaluator(ev: LearningEvent, model: str) -> Dict[str, Any]:
        return {
            "is_correct": ev.normalized_intent in {"OPEN_CASE", "SHOW_TIMELINE"},
            "is_safe": True,
            "latency_ms": 45.0,
        }

    exp1 = learning_service.run_offline_experiment(ds1, "model-candidate", "model-baseline", deterministic_evaluator)
    exp2 = learning_service.run_offline_experiment(ds1, "model-candidate", "model-baseline", deterministic_evaluator)

    assert exp1.metrics == exp2.metrics
    assert exp1.experiment_hash == exp2.experiment_hash
    assert exp1.metrics["accuracy"] == 1.0
    assert exp1.metrics["safety_score"] == 1.0


# ─────────────────────────────────────────────────────────────────────────────
# 8. AUDITABILITY
# ─────────────────────────────────────────────────────────────────────────────

def test_auditability(learning_service: GovernedLearningService, audit_service: AuditService):
    """
    Verifies that every phase of the learning lifecycle emits parent hash-chained
    audit records into AuditService.
    """
    initial_count = len(audit_service.audit_records)

    # 1. Ingestion audit
    ev = learning_service.capture_event(
        event_type=LearningEventType.VOICE_INTENT,
        model_version="sentinelx-v2",
        modality=LearningModality.VOICE,
        language="en",
        normalized_intent="SHOW_EVIDENCE",
    )
    ingested = learning_service.ingest_event(ev)
    assert len(audit_service.audit_records) == initial_count + 1
    assert audit_service.audit_records[-1]["event_type"] == "LEARNING_EVENT_INGESTED"

    # 2. Rejection audit
    ev_unsafe = learning_service.capture_event(
        event_type=LearningEventType.COMMAND_EXECUTION,
        model_version="sentinelx-v2",
        modality=LearningModality.TEXT,
        language="en",
        normalized_intent="CALCULATE_GUILT",
        metadata={"guilt_score": 0.99},
    )
    try:
        learning_service.ingest_event(ev_unsafe)
    except ValueError:
        pass

    assert len(audit_service.audit_records) == initial_count + 2
    assert audit_service.audit_records[-1]["event_type"] == "LEARNING_EVENT_REJECTED"

    # 3. Dataset creation audit
    ds = learning_service.build_curated_dataset("audit_test_ds", "v1.0", events=[ingested])
    assert len(audit_service.audit_records) == initial_count + 3
    assert audit_service.audit_records[-1]["event_type"] == "LEARNING_DATASET_CREATED"


# ─────────────────────────────────────────────────────────────────────────────
# 9. PROMOTION GATE — NO AUTOMATIC DEPLOYMENT
# ─────────────────────────────────────────────────────────────────────────────

def test_promotion_gate_no_auto_deploy(
    learning_service: GovernedLearningService,
    lead_investigator: UserIdentity,
    junior_analyst: UserIdentity,
):
    """
    Verifies promotion gate rules:
    - Never auto-deploys (promoted=False by default)
    - Requires human sign-off from authorized role
    - Rejects promotions if safety < 1.0 or regression occurs
    """
    ev = learning_service.capture_event(
        event_type=LearningEventType.VOICE_INTENT,
        model_version="sentinelx-v2",
        modality=LearningModality.VOICE,
        language="en",
        normalized_intent="OPEN_CASE",
    )
    ingested = learning_service.ingest_event(ev)
    ds = learning_service.build_curated_dataset("eval_ds", "v1.0", events=[ingested])

    # Case A: Candidate passes all automated criteria -> PENDING_HUMAN_GOVERNANCE (promoted=False)
    def passing_eval(ev: LearningEvent, model: str) -> Dict[str, Any]:
        return {"is_correct": True, "is_safe": True, "latency_ms": 40.0}

    exp_pass = learning_service.run_offline_experiment(ds, "candidate-v2", "baseline-v1", passing_eval)
    decision = learning_service.evaluate_promotion_gate(exp_pass)

    assert decision.promoted is False  # NO automatic deployment!
    assert decision.status == "PENDING_HUMAN_GOVERNANCE"

    # Junior analyst cannot sign off (unauthorized role)
    with pytest.raises(PermissionError, match="not authorized to sign off"):
        learning_service.approve_promotion(decision.decision_id, junior_analyst, "Looks fine")

    # Lead investigator can sign off
    approved = learning_service.approve_promotion(
        decision.decision_id,
        lead_investigator,
        "Verified against NCR Special Cell operational safety benchmark. Approved for deployment.",
    )
    assert approved.promoted is True
    assert approved.status == "APPROVED_BY_GOVERNANCE"
    assert approved.approved_by == lead_investigator.user_id

    # Case B: Candidate has safety violation (safety_score < 1.0) -> REJECTED_SAFETY
    def unsafe_eval(ev: LearningEvent, model: str) -> Dict[str, Any]:
        is_candidate = (model == "candidate-unsafe")
        return {"is_correct": True, "is_safe": not is_candidate, "latency_ms": 40.0}

    exp_unsafe = learning_service.run_offline_experiment(ds, "candidate-unsafe", "baseline-v1", unsafe_eval)
    decision_unsafe = learning_service.evaluate_promotion_gate(exp_unsafe)

    assert decision_unsafe.promoted is False
    assert decision_unsafe.status == "REJECTED_SAFETY"
    assert any("failed safety threshold" in r for r in decision_unsafe.reasons)

    # Cannot approve rejected decision
    with pytest.raises(ValueError, match="Cannot approve decision with status 'REJECTED_SAFETY'"):
        learning_service.approve_promotion(decision_unsafe.decision_id, lead_investigator, "Attempted bypass")
