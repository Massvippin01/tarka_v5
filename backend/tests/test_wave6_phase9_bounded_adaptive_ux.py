from __future__ import annotations

import copy
from datetime import UTC, datetime
from typing import Any, Dict
from uuid import uuid4

import pytest

from app.domain.adaptive_ux import (
    AccessibilitySettings,
    AdaptiveLayoutConfig,
    ApprovedLayoutId,
    DetailLevel,
    ModalityPreference,
    NavigationTarget,
    PreferenceSignal,
)
from app.domain.auth import AccessPermissionEnum, CaseAccessScope, UserIdentity, UserRoleEnum
from app.services.audit_service import AuditService
from app.services.ux.adaptive_ux_service import (
    BoundedAdaptiveUXService,
    InvariantViolationError,
    UnapprovedLayoutError,
)


@pytest.fixture
def audit_service() -> AuditService:
    return AuditService.get_instance()


@pytest.fixture
def adaptive_ux_service(audit_service: AuditService) -> BoundedAdaptiveUXService:
    return BoundedAdaptiveUXService(audit_service=audit_service)


@pytest.fixture
def analyst_identity() -> UserIdentity:
    return UserIdentity(
        user_id="ANALYST-UX-01",
        display_name="Intelligence Analyst",
        role=UserRoleEnum.ANALYST,
        clearance="SECRET",
        scope=CaseAccessScope(
            allowed_cases=["CASE-2026-001"],
            jurisdictions=["Delhi NCR"],
            max_sensitivity_clearance="SECRET",
        ),
        permissions=[AccessPermissionEnum.READ_CASE, AccessPermissionEnum.RUN_ANALYTICAL_QUERY],
    )


# ─────────────────────────────────────────────────────────────────────────────
# 1. PERSONALIZATION
# ─────────────────────────────────────────────────────────────────────────────

def test_personalization(adaptive_ux_service: BoundedAdaptiveUXService):
    """
    Verifies that presentation adapts deterministically based on observed signals:
    - Dominant navigation to Timeline adapts to TIMELINE_CENTRIC layout.
    - Repeated actions appear in quick_actions.
    - Language and detail preferences are applied.
    """
    user_id = f"USR-PERS-{uuid4().hex[:6]}"

    # Send 4 timeline navigation signals
    for _ in range(4):
        config = adaptive_ux_service.record_signal(
            PreferenceSignal(
                signal_id=f"SIG-{uuid4().hex[:6]}",
                user_id=user_id,
                signal_type="NAVIGATED",
                timestamp=datetime.now(UTC),
                navigation_target=NavigationTarget.TIMELINE,
            )
        )

    assert config.layout_id == ApprovedLayoutId.TIMELINE_CENTRIC
    assert config.primary_canvas == "TIMELINE"

    # Send repeated action execution signals
    for _ in range(3):
        config = adaptive_ux_service.record_signal(
            PreferenceSignal(
                signal_id=f"SIG-{uuid4().hex[:6]}",
                user_id=user_id,
                signal_type="ACTION_EXECUTED",
                timestamp=datetime.now(UTC),
                action_name="SEARCH_CDR_RECORDS",
            )
        )

    assert "SEARCH_CDR_RECORDS" in config.quick_actions

    # Send detail level and language preferences
    config = adaptive_ux_service.record_signal(
        PreferenceSignal(
            signal_id=f"SIG-{uuid4().hex[:6]}",
            user_id=user_id,
            signal_type="DETAIL_LEVEL_SET",
            timestamp=datetime.now(UTC),
            detail_level=DetailLevel.FORENSIC_EXHAUSTIVE,
            language="ta",
        )
    )

    assert config.detail_level == DetailLevel.FORENSIC_EXHAUSTIVE
    assert config.language == "ta"


# ─────────────────────────────────────────────────────────────────────────────
# 2. RESET
# ─────────────────────────────────────────────────────────────────────────────

def test_reset(adaptive_ux_service: BoundedAdaptiveUXService):
    """
    Verifies that reset_preferences immediately clears all accumulated signals
    and restores factory default operational presentation.
    """
    user_id = f"USR-RESET-{uuid4().hex[:6]}"

    # Train user model with personalized signals
    for _ in range(4):
        adaptive_ux_service.record_signal(
            PreferenceSignal(
                signal_id=f"SIG-{uuid4().hex[:6]}",
                user_id=user_id,
                signal_type="NAVIGATED",
                timestamp=datetime.now(UTC),
                navigation_target=NavigationTarget.GRAPH,
                action_name="PIN_ENTITY",
                language="tanglish",
            )
        )

    adapted = adaptive_ux_service.compute_layout_config(user_id)
    assert adapted.layout_id == ApprovedLayoutId.GRAPH_INTELLIGENCE
    assert adapted.language == "tanglish"

    # Reset preferences
    reset_config = adaptive_ux_service.reset_preferences(user_id)

    assert reset_config.layout_id == ApprovedLayoutId.DEFAULT_OPERATIONAL
    assert reset_config.primary_canvas == "DEFAULT"
    assert reset_config.language == "en"
    assert reset_config.detail_level == DetailLevel.STANDARD
    assert len(reset_config.quick_actions) == 0


# ─────────────────────────────────────────────────────────────────────────────
# 3. DETERMINISTIC BEHAVIOR
# ─────────────────────────────────────────────────────────────────────────────

def test_deterministic_behavior(adaptive_ux_service: BoundedAdaptiveUXService):
    """
    Verifies that feeding the exact same sequence of signals yields identical
    layout decisions and identical configuration hashes (no stochasticity).
    """
    user_1 = f"USR-DET-1-{uuid4().hex[:6]}"
    user_2 = f"USR-DET-2-{uuid4().hex[:6]}"

    signal_sequence = [
        ("NAVIGATED", NavigationTarget.DOSSIER, None),
        ("NAVIGATED", NavigationTarget.DOSSIER, None),
        ("ACTION_EXECUTED", None, "CORROBORATE_CLAIM"),
        ("NAVIGATED", NavigationTarget.DOSSIER, None),
        ("ACTION_EXECUTED", None, "CORROBORATE_CLAIM"),
        ("NAVIGATED", NavigationTarget.DOSSIER, None),
    ]

    for sig_type, nav, act in signal_sequence:
        adaptive_ux_service.record_signal(
            PreferenceSignal(
                signal_id=f"SIG-{uuid4().hex[:6]}",
                user_id=user_1,
                signal_type=sig_type,
                timestamp=datetime.now(UTC),
                navigation_target=nav,
                action_name=act,
            )
        )
        adaptive_ux_service.record_signal(
            PreferenceSignal(
                signal_id=f"SIG-{uuid4().hex[:6]}",
                user_id=user_2,
                signal_type=sig_type,
                timestamp=datetime.now(UTC),
                navigation_target=nav,
                action_name=act,
            )
        )

    cfg1 = adaptive_ux_service.compute_layout_config(user_1)
    cfg2 = adaptive_ux_service.compute_layout_config(user_2)

    assert cfg1.layout_id == cfg2.layout_id == ApprovedLayoutId.DOSSIER_EVIDENCE
    assert cfg1.primary_canvas == cfg2.primary_canvas == "DOSSIER"
    assert cfg1.quick_actions == cfg2.quick_actions
    assert cfg1.detail_level == cfg2.detail_level
    # Note: user_id is in config_hash, but internal configuration options match exactly


# ─────────────────────────────────────────────────────────────────────────────
# 4. AUTHORIZATION INVARIANTS
# ─────────────────────────────────────────────────────────────────────────────

def test_authorization_invariants(
    adaptive_ux_service: BoundedAdaptiveUXService,
    analyst_identity: UserIdentity,
):
    """
    Invariant Guard: Adaptive UX must NEVER alter:
    - user clearance
    - user role
    - permissions
    - case scope
    """
    before_state = {
        "role": analyst_identity.role.value,
        "clearance": analyst_identity.clearance,
        "permissions": [p.value for p in analyst_identity.permissions],
        "allowed_cases": list(analyst_identity.scope.allowed_cases),
    }

    config = adaptive_ux_service.compute_layout_config(analyst_identity.user_id)

    # Valid invariant check
    assert adaptive_ux_service.validate_authorization_invariants(
        analyst_identity, before_state, config, case_id="CASE-2026-001"
    ) is True

    # 1. Reject elevated clearance
    tampered_clearance = copy.deepcopy(analyst_identity)
    tampered_clearance.scope.max_sensitivity_clearance = "TOP_SECRET"
    with pytest.raises(InvariantViolationError, match="cannot alter clearance"):
        adaptive_ux_service.validate_authorization_invariants(tampered_clearance, before_state, config)

    # 2. Reject elevated role
    tampered_role = copy.deepcopy(analyst_identity)
    tampered_role.role = UserRoleEnum.SUPERVISOR
    with pytest.raises(InvariantViolationError, match="cannot alter user role"):
        adaptive_ux_service.validate_authorization_invariants(tampered_role, before_state, config)

    # 3. Reject permission elevation
    tampered_perms = copy.deepcopy(analyst_identity)
    tampered_perms.permissions.append(AccessPermissionEnum.SECURITY_ADMIN)
    with pytest.raises(InvariantViolationError, match="cannot elevate permissions"):
        adaptive_ux_service.validate_authorization_invariants(tampered_perms, before_state, config)

    # 4. Reject out-of-scope case access
    with pytest.raises(InvariantViolationError, match="cannot grant access to out-of-scope case"):
        adaptive_ux_service.validate_authorization_invariants(
            analyst_identity, before_state, config, case_id="CASE-FORBIDDEN-999"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 5. CASE ISOLATION
# ─────────────────────────────────────────────────────────────────────────────

def test_case_isolation(adaptive_ux_service: BoundedAdaptiveUXService):
    """
    Verifies that preference adaptations are strictly isolated to individual users
    and never mutate case records or bleed into other users.
    """
    user_a = f"USR-A-{uuid4().hex[:6]}"
    user_b = f"USR-B-{uuid4().hex[:6]}"

    # User A triggers voice hub preference
    for _ in range(4):
        adaptive_ux_service.record_signal(
            PreferenceSignal(
                signal_id=f"SIG-{uuid4().hex[:6]}",
                user_id=user_a,
                signal_type="MODALITY_USED",
                timestamp=datetime.now(UTC),
                modality=ModalityPreference.VOICE_PRIMARY,
            )
        )

    cfg_a = adaptive_ux_service.compute_layout_config(user_a)
    cfg_b = adaptive_ux_service.compute_layout_config(user_b)

    assert cfg_a.layout_id == ApprovedLayoutId.VOICE_COMMAND_HUB
    assert cfg_b.layout_id == ApprovedLayoutId.DEFAULT_OPERATIONAL


# ─────────────────────────────────────────────────────────────────────────────
# 6. ACCESSIBILITY OVERRIDES
# ─────────────────────────────────────────────────────────────────────────────

def test_accessibility(adaptive_ux_service: BoundedAdaptiveUXService):
    """
    Verifies that accessibility preferences strictly override standard presentation
    and enforce accessible layout templates.
    """
    user_id = f"USR-A11Y-{uuid4().hex[:6]}"

    # Even if user had heavy timeline navigation:
    for _ in range(5):
        adaptive_ux_service.record_signal(
            PreferenceSignal(
                signal_id=f"SIG-{uuid4().hex[:6]}",
                user_id=user_id,
                signal_type="NAVIGATED",
                timestamp=datetime.now(UTC),
                navigation_target=NavigationTarget.TIMELINE,
            )
        )

    # Setting high contrast accessibility overrides timeline layout
    cfg_contrast = adaptive_ux_service.record_signal(
        PreferenceSignal(
            signal_id=f"SIG-{uuid4().hex[:6]}",
            user_id=user_id,
            signal_type="ACCESSIBILITY_SET",
            timestamp=datetime.now(UTC),
            accessibility=AccessibilitySettings(high_contrast=True),
        )
    )
    assert cfg_contrast.layout_id == ApprovedLayoutId.ACCESSIBLE_HIGH_CONTRAST
    assert cfg_contrast.primary_canvas == "HIGH_CONTRAST"

    # Setting screen reader optimized overrides everything
    cfg_sr = adaptive_ux_service.record_signal(
        PreferenceSignal(
            signal_id=f"SIG-{uuid4().hex[:6]}",
            user_id=user_id,
            signal_type="ACCESSIBILITY_SET",
            timestamp=datetime.now(UTC),
            accessibility=AccessibilitySettings(screen_reader_optimized=True),
        )
    )
    assert cfg_sr.layout_id == ApprovedLayoutId.ACCESSIBLE_SCREEN_READER
    assert cfg_sr.primary_canvas == "LINEAR_SEMANTIC"


# ─────────────────────────────────────────────────────────────────────────────
# 7. NO LAYOUT INSTABILITY (HYSTERESIS)
# ─────────────────────────────────────────────────────────────────────────────

def test_no_layout_instability(adaptive_ux_service: BoundedAdaptiveUXService):
    """
    Verifies that isolated or one-off actions do NOT cause layout thrashing/jitter.
    A layout transition requires sustained signals meeting the dominance ratio.
    """
    user_id = f"USR-STABLE-{uuid4().hex[:6]}"

    # 1. Single action does NOT trigger layout adaptation (threshold is >= 3)
    c1 = adaptive_ux_service.record_signal(
        PreferenceSignal(
            signal_id=f"SIG-1",
            user_id=user_id,
            signal_type="NAVIGATED",
            timestamp=datetime.now(UTC),
            navigation_target=NavigationTarget.GRAPH,
        )
    )
    assert c1.layout_id == ApprovedLayoutId.DEFAULT_OPERATIONAL

    # 2. Add two more to reach threshold and dominance
    adaptive_ux_service.record_signal(
        PreferenceSignal(
            signal_id=f"SIG-2",
            user_id=user_id,
            signal_type="NAVIGATED",
            timestamp=datetime.now(UTC),
            navigation_target=NavigationTarget.GRAPH,
        )
    )
    c3 = adaptive_ux_service.record_signal(
        PreferenceSignal(
            signal_id=f"SIG-3",
            user_id=user_id,
            signal_type="NAVIGATED",
            timestamp=datetime.now(UTC),
            navigation_target=NavigationTarget.GRAPH,
        )
    )
    assert c3.layout_id == ApprovedLayoutId.GRAPH_INTELLIGENCE

    # 3. An isolated single click on Timeline does NOT thrash the layout
    c4 = adaptive_ux_service.record_signal(
        PreferenceSignal(
            signal_id=f"SIG-4",
            user_id=user_id,
            signal_type="NAVIGATED",
            timestamp=datetime.now(UTC),
            navigation_target=NavigationTarget.TIMELINE,
        )
    )
    # Stays on GRAPH_INTELLIGENCE! No layout instability.
    assert c4.layout_id == ApprovedLayoutId.GRAPH_INTELLIGENCE


# ─────────────────────────────────────────────────────────────────────────────
# 8. REPEATED FAILED ACTIONS TRIGGER ASSISTED GUIDANCE
# ─────────────────────────────────────────────────────────────────────────────

def test_repeated_failed_actions_trigger_assistance(adaptive_ux_service: BoundedAdaptiveUXService):
    """
    Verifies that repeated failed actions trigger ASSISTED_GUIDANCE layout
    and populate active_helpers with contextual support.
    """
    user_id = f"USR-FAIL-{uuid4().hex[:6]}"

    for _ in range(3):
        cfg = adaptive_ux_service.record_signal(
            PreferenceSignal(
                signal_id=f"SIG-{uuid4().hex[:6]}",
                user_id=user_id,
                signal_type="ACTION_FAILED",
                timestamp=datetime.now(UTC),
                action_name="EXECUTE_CYBER_PROBE",
                failure_reason="Authentication timeout",
            )
        )

    assert cfg.layout_id == ApprovedLayoutId.ASSISTED_GUIDANCE
    assert any("EXECUTE_CYBER_PROBE" in h for h in cfg.active_helpers)
