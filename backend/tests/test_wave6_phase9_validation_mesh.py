from __future__ import annotations

import pytest
import pytest_asyncio
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.domain.auth import AccessPermissionEnum, CaseAccessScope, UserIdentity, UserRoleEnum
from app.domain.interaction import ActionRiskClass
from app.domain.validation_mesh import (
    ChamberResult,
    ChamberStatus,
    ChamberType,
    MeshValidationResult,
    ValidationTarget,
)
from app.repositories.unified_store import UnifiedStore
from app.services.audit_service import AuditService
from app.services.command.command_bus import CommandBus
from app.services.validation.validation_chamber_mesh import ValidationChamberMesh


@pytest.fixture
def store() -> UnifiedStore:
    return UnifiedStore.get_instance()


@pytest.fixture
def audit_service() -> AuditService:
    return AuditService.get_instance()


@pytest.fixture
def command_bus() -> CommandBus:
    return CommandBus.get_instance()


@pytest.fixture
def validation_mesh() -> ValidationChamberMesh:
    return ValidationChamberMesh.get_instance()


@pytest.fixture
def lead_investigator() -> UserIdentity:
    return UserIdentity(
        user_id="INV-LEAD-2026",
        display_name="Senior Lead Investigator",
        role=UserRoleEnum.INVESTIGATOR,
        clearance="TOP_SECRET",
        scope=CaseAccessScope(
            allowed_cases=["CASE-2026-001", "C102"],
            jurisdictions=["Delhi NCR / Special Cell"],
            max_sensitivity_clearance="TOP_SECRET",
        ),
        permissions=[AccessPermissionEnum.READ_CASE, AccessPermissionEnum.RUN_ANALYTICAL_QUERY],
    )


@pytest.fixture
def restricted_analyst() -> UserIdentity:
    return UserIdentity(
        user_id="USER-ANALYST-RESTRICTED",
        display_name="Junior Analyst",
        role=UserRoleEnum.ANALYST,
        clearance="UNCLASSIFIED",
        scope=CaseAccessScope(
            allowed_cases=["CASE-2026-999"],
            jurisdictions=["External"],
            max_sensitivity_clearance="UNCLASSIFIED",
        ),
        permissions=[AccessPermissionEnum.READ_CASE],
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. VALID EVIDENCE PATH
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_valid_evidence_path(validation_mesh: ValidationChamberMesh, lead_investigator: UserIdentity):
    """
    Consequential output with valid evidence reference, authorized user, and valid scope
    must pass all executed chambers and return is_valid=True.
    """
    now = datetime.now(UTC)
    target = ValidationTarget(
        target_id="TGT-VALID-01",
        target_type="FACT",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.ANALYZE,
        user=lead_investigator,
        evidence_ids=["EV-ANPR-001"],
        spatio_temporal_points=[
            {"timestamp": (now - timedelta(minutes=30)).isoformat(), "lat": 28.4595, "lng": 77.0266, "label": "Gurugram"},
            {"timestamp": now.isoformat(), "lat": 28.5355, "lng": 77.3910, "label": "Noida"},
        ],
        epistemic_claim_standing="OBSERVED",
        is_directly_observed=True,
    )

    result = await validation_mesh.validate(target)

    assert result.is_valid is True
    assert result.overall_status == ChamberStatus.PASSED
    assert len(result.violations) == 0
    assert ChamberType.AUTHORIZATION in result.chambers_executed
    assert ChamberType.CASE_SCOPE in result.chambers_executed
    assert ChamberType.EVIDENCE_INTEGRITY in result.chambers_executed
    assert ChamberType.PROVENANCE in result.chambers_executed
    assert ChamberType.TEMPORAL_SPATIAL in result.chambers_executed
    assert ChamberType.CONTRADICTION in result.chambers_executed
    assert ChamberType.EPISTEMIC_STATE in result.chambers_executed


# ─────────────────────────────────────────────────────────────────────────────
# 2. MISSING EVIDENCE
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_missing_evidence(validation_mesh: ValidationChamberMesh, lead_investigator: UserIdentity):
    """
    Evidence referencing a non-existent or unindexed artifact must fail Chamber 3 (Evidence Integrity).
    """
    target = ValidationTarget(
        target_id="TGT-MISSING-EV",
        target_type="FACT",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.ANALYZE,
        user=lead_investigator,
        evidence_ids=["EV-NONEXISTENT-9999"],
    )

    result = await validation_mesh.validate(target)

    assert result.is_valid is False
    assert result.overall_status == ChamberStatus.FAILED
    assert any("Missing evidence" in v for v in result.violations)
    ev_chamber = result.chamber_results[ChamberType.EVIDENCE_INTEGRITY.value]
    assert ev_chamber.status == ChamberStatus.FAILED


# ─────────────────────────────────────────────────────────────────────────────
# 3. CONTRADICTORY EVIDENCE
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_contradictory_evidence(validation_mesh: ValidationChamberMesh, lead_investigator: UserIdentity):
    """
    Consequential output referencing unresolved contradictions must fail Chamber 6 (Contradiction).
    """
    target = ValidationTarget(
        target_id="TGT-CONTRA-01",
        target_type="AGENT_OUTPUT",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.ANALYZE,
        user=lead_investigator,
        evidence_ids=["EV-ANPR-001"],
        payload={
            "has_contradiction": True,
            "contradiction_reason": "Subject claims Mumbai presence at 11:30 PM, but EV-ANPR-001 places vehicle at Delhi Expressway at 11:42 PM.",
        },
    )

    result = await validation_mesh.validate(target)

    assert result.is_valid is False
    assert result.overall_status == ChamberStatus.FAILED
    assert any("Contradictory evidence" in v for v in result.violations)
    assert ChamberType.CONTRADICTION.value in result.chamber_results
    assert result.chamber_results[ChamberType.CONTRADICTION.value].status == ChamberStatus.FAILED


# ─────────────────────────────────────────────────────────────────────────────
# 4. UNAUTHORIZED REQUEST
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_unauthorized_request(validation_mesh: ValidationChamberMesh, restricted_analyst: UserIdentity):
    """
    Requests lacking required clearance or permissions must fail Chamber 1 (Authorization).
    """
    # 1. Completely unauthenticated (None user)
    target_no_user = ValidationTarget(
        target_id="TGT-NO-USER",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.READ,
        user=None,
    )
    res_no_user = await validation_mesh.validate(target_no_user)
    assert res_no_user.is_valid is False
    assert res_no_user.chamber_results[ChamberType.AUTHORIZATION.value].status == ChamberStatus.FAILED

    # 2. Insufficient clearance (Analyst UNCLASSIFIED requesting TOP_SECRET data)
    target_high_clearance = ValidationTarget(
        target_id="TGT-HIGH-CLEARANCE",
        case_id="CASE-2026-999",
        risk_class=ActionRiskClass.READ,
        user=restricted_analyst,
        payload={"required_clearance": "TOP_SECRET"},
    )
    res_clearance = await validation_mesh.validate(target_high_clearance)
    assert res_clearance.is_valid is False
    assert any("Insufficient clearance" in v for v in res_clearance.violations)


# ─────────────────────────────────────────────────────────────────────────────
# 5. WRONG CASE (CASE SCOPE VIOLATION)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_wrong_case(validation_mesh: ValidationChamberMesh, lead_investigator: UserIdentity):
    """
    Target referencing a case outside the user's allowed case scope must fail Chamber 2 (Case Scope).
    """
    target = ValidationTarget(
        target_id="TGT-WRONG-CASE",
        case_id="CASE-FORBIDDEN-999",  # Not in allowed_cases ["CASE-2026-001", "C102"]
        risk_class=ActionRiskClass.READ,
        user=lead_investigator,
    )

    result = await validation_mesh.validate(target)

    assert result.is_valid is False
    assert result.overall_status == ChamberStatus.FAILED
    assert any("Case scope violation" in v for v in result.violations)
    assert result.chamber_results[ChamberType.CASE_SCOPE.value].status == ChamberStatus.FAILED


# ─────────────────────────────────────────────────────────────────────────────
# 6. INFERRED VS OBSERVED
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_inferred_vs_observed(validation_mesh: ValidationChamberMesh, lead_investigator: UserIdentity):
    """
    An inferred statement derived by reasoning cannot be asserted as directly OBSERVED fact.
    Must fail Chamber 7 (Epistemic State).
    """
    target = ValidationTarget(
        target_id="TGT-EPISTEMIC-INFER",
        target_type="FACT",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.ANALYZE,
        user=lead_investigator,
        evidence_ids=["EV-ANPR-001"],
        epistemic_claim_standing="OBSERVED",
        is_directly_observed=False,  # Inferred, not raw observation
        payload={"is_inference": True},
    )

    result = await validation_mesh.validate(target)

    assert result.is_valid is False
    assert result.overall_status == ChamberStatus.FAILED
    assert any("Inferred claim cannot be asserted as directly OBSERVED" in v for v in result.violations)
    assert result.chamber_results[ChamberType.EPISTEMIC_STATE.value].status == ChamberStatus.FAILED


# ─────────────────────────────────────────────────────────────────────────────
# 7. PROPOSED VS VERIFIED
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_proposed_vs_verified(validation_mesh: ValidationChamberMesh, lead_investigator: UserIdentity):
    """
    An agent hypothesis or proposed finding cannot be asserted as VERIFIED ground truth prior to formal corroboration.
    Must fail Chamber 7 (Epistemic State).
    """
    target = ValidationTarget(
        target_id="TGT-EPISTEMIC-PROP",
        target_type="AGENT_OUTPUT",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.ANALYZE,
        user=lead_investigator,
        evidence_ids=["EV-ANPR-001"],
        epistemic_claim_standing="VERIFIED",
        is_verified_ground_truth=False,  # Still proposed
        payload={"is_proposed": True},
    )

    result = await validation_mesh.validate(target)

    assert result.is_valid is False
    assert result.overall_status == ChamberStatus.FAILED
    assert any("Proposed agent hypothesis cannot be treated as VERIFIED" in v for v in result.violations)
    assert result.chamber_results[ChamberType.EPISTEMIC_STATE.value].status == ChamberStatus.FAILED


# ─────────────────────────────────────────────────────────────────────────────
# 8. HIGH-RISK CONFIRMATION
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_high_risk_confirmation(validation_mesh: ValidationChamberMesh, lead_investigator: UserIdentity):
    """
    High-risk EXECUTE actions require explicit human confirmation.
    Returns WAITING_CONFIRMATION when unconfirmed, and passes when confirmed.
    """
    # 1. Unconfirmed high-risk action
    target_unconfirmed = ValidationTarget(
        target_id="TGT-EXECUTE-UNCONFIRMED",
        target_type="COMMAND",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.EXECUTE,
        user=lead_investigator,
        is_human_confirmed=False,
    )

    res_unconfirmed = await validation_mesh.validate(target_unconfirmed)

    assert res_unconfirmed.is_valid is False
    assert res_unconfirmed.overall_status == ChamberStatus.WAITING_CONFIRMATION
    conf_chamber = res_unconfirmed.chamber_results[ChamberType.HUMAN_CONFIRMATION.value]
    assert conf_chamber.status == ChamberStatus.WAITING_CONFIRMATION
    assert any("requires explicit human confirmation" in v for v in conf_chamber.violations)

    # 2. Confirmed high-risk action
    target_confirmed = ValidationTarget(
        target_id="TGT-EXECUTE-CONFIRMED",
        target_type="COMMAND",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.EXECUTE,
        user=lead_investigator,
        is_human_confirmed=True,
    )

    res_confirmed = await validation_mesh.validate(target_confirmed)
    assert res_confirmed.is_valid is True
    assert res_confirmed.overall_status == ChamberStatus.PASSED
    assert res_confirmed.chamber_results[ChamberType.HUMAN_CONFIRMATION.value].status == ChamberStatus.PASSED


# ─────────────────────────────────────────────────────────────────────────────
# 9. FAILED CHAMBER FAILS CLOSED
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_failed_chamber_fails_closed(validation_mesh: ValidationChamberMesh, lead_investigator: UserIdentity):
    """
    If ANY executed chamber fails (e.g. Kinematic Impossible Speed in Chamber 5),
    the overall mesh MUST fail closed (is_valid=False, status=FAILED).
    """
    now = datetime.now(UTC)
    # Travel from Delhi to Mumbai (1400km) in 10 minutes (8400 km/h) -> Kinematic Impossibility
    target_impossible_speed = ValidationTarget(
        target_id="TGT-KINEMATIC-FAIL",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.ANALYZE,
        user=lead_investigator,
        spatio_temporal_points=[
            {"timestamp": (now - timedelta(minutes=10)).isoformat(), "lat": 28.6139, "lng": 77.2090, "label": "Delhi"},
            {"timestamp": now.isoformat(), "lat": 19.0760, "lng": 72.8777, "label": "Mumbai"},
        ],
    )

    result = await validation_mesh.validate(target_impossible_speed)

    assert result.is_valid is False
    assert result.overall_status == ChamberStatus.FAILED
    assert result.chamber_results[ChamberType.TEMPORAL_SPATIAL.value].status == ChamberStatus.FAILED
    assert any("Kinematic impossibility" in v for v in result.violations)


# ─────────────────────────────────────────────────────────────────────────────
# 10. CANCELLATION
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cancellation(validation_mesh: ValidationChamberMesh, command_bus: CommandBus, lead_investigator: UserIdentity):
    """
    Validation must halt immediately and return CANCELLED when the associated command is marked cancelled.
    """
    cmd_id = f"CMD-CANCEL-{uuid4().hex[:6]}"
    command_bus.cancel_command(cmd_id)

    target = ValidationTarget(
        target_id="TGT-CANCELLED",
        command_id=cmd_id,
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.ANALYZE,
        user=lead_investigator,
    )

    result = await validation_mesh.validate(target)

    assert result.is_valid is False
    assert result.overall_status == ChamberStatus.CANCELLED
    assert any("cancelled" in v.lower() for v in result.violations)


# ─────────────────────────────────────────────────────────────────────────────
# 11. AUDIT RECORD
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_audit_record(validation_mesh: ValidationChamberMesh, audit_service: AuditService, lead_investigator: UserIdentity):
    """
    Every mesh validation must emit a parent hash-chained audit record into AuditService.
    """
    initial_audit_count = len(audit_service.audit_records)

    target = ValidationTarget(
        target_id="TGT-AUDIT-VERIFY",
        case_id="CASE-2026-001",
        risk_class=ActionRiskClass.READ,
        user=lead_investigator,
        evidence_ids=["EV-ANPR-001"],
    )

    result = await validation_mesh.validate(target)

    assert result.audit_record_id is not None
    assert len(audit_service.audit_records) == initial_audit_count + 1

    last_record = audit_service.audit_records[-1]
    assert last_record["audit_id"] == result.audit_record_id
    assert "event_hash" in last_record
    assert "previous_hash" in last_record


# ─────────────────────────────────────────────────────────────────────────────
# 12. MANDATORY SAFETY CHAMBERS CANNOT BE SKIPPED
# ─────────────────────────────────────────────────────────────────────────────

def test_mandatory_safety_chambers_never_skipped(validation_mesh: ValidationChamberMesh):
    """
    Invariant: Mandatory safety chambers (Authorization, Case Scope, Evidence Integrity)
    must NEVER be skipped even when learned optimization shortcuts are requested.
    """
    # Request learned optimization skipping optional chambers across all risk classes
    for risk in [ActionRiskClass.READ, ActionRiskClass.ANALYZE, ActionRiskClass.PREPARE, ActionRiskClass.EXECUTE]:
        chambers = validation_mesh.get_required_chambers(risk, skip_optional=True)
        assert ChamberType.AUTHORIZATION in chambers, f"Authorization missing for {risk}"
        assert ChamberType.CASE_SCOPE in chambers, f"Case Scope missing for {risk}"
        assert ChamberType.EVIDENCE_INTEGRITY in chambers, f"Evidence Integrity missing for {risk}"
