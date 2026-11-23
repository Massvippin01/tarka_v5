import pytest
from fastapi.testclient import TestClient

from app.domain.auth import UserIdentity, UserRoleEnum, CaseAccessScope, AccessPermissionEnum
from app.domain.operating_context import (
    ClientEnvironmentReport,
    InteractionModeEnum,
    MicPermissionStateEnum,
    OnboardingIntentEnum,
)
from app.main import app
from app.services.auth_service import AuthService
from app.services.operating_context_service import OperatingContextService


@pytest.fixture
def client(auth_headers):
    return TestClient(app, headers=auth_headers)


@pytest.fixture
def auth_service():
    return AuthService.get_instance()


@pytest.fixture
def context_service():
    service = OperatingContextService.get_instance()
    service.active_contexts.clear()
    return service


def test_first_open_context_negotiation(client):
    """
    Test that a fresh session negotiates context, detecting first-open state
    without assuming a hardcoded case, and returns all 6 actionable choices.
    """
    resp = client.post("/api/v1/context/negotiate", json={})
    assert resp.status_code == 200
    data = resp.json()

    ctx = data["context"]
    onboarding = data["onboarding"]

    # Verify first-open state
    assert ctx["is_first_open"] is True
    assert ctx["current_case_id"] is None
    assert ctx["current_route"] == "onboarding"
    assert ctx["is_authenticated"] is True
    assert ctx["role"] == "INVESTIGATOR"

    # Verify actionable onboarding options
    assert onboarding["is_first_open"] is True
    assert onboarding["greeting_title"] == "Welcome to SentinelX."
    assert onboarding["greeting_prompt"] == "What would you like to investigate?"

    intents = [opt["intent_code"] for opt in onboarding["action_options"]]
    assert OnboardingIntentEnum.START_INVESTIGATION.value in intents
    assert OnboardingIntentEnum.OPEN_CASE.value in intents
    assert OnboardingIntentEnum.SEARCH_ENTITY.value in intents
    assert OnboardingIntentEnum.REVIEW_EVIDENCE.value in intents
    assert OnboardingIntentEnum.CONTINUE_INVESTIGATION.value in intents
    assert OnboardingIntentEnum.OTHER.value in intents


def test_existing_session_bypasses_first_open(client):
    """
    Test that an existing session or an explicit case request bypasses first-open onboarding.
    """
    # 1. Request with explicit authorized case
    resp = client.post(
        "/api/v1/context/negotiate",
        json={"requested_case_id": "CASE-2026-001"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["context"]["is_first_open"] is False
    assert data["context"]["current_case_id"] == "CASE-2026-001"
    assert data["context"]["current_route"] == "command"

    session_id = data["context"]["session_id"]

    # 2. Subsequent call with session_id reuses active context
    resp2 = client.get(f"/api/v1/context/operating-context?session_id={session_id}")
    assert resp2.status_code == 200
    assert resp2.json()["context"]["is_first_open"] is False
    assert resp2.json()["context"]["current_case_id"] == "CASE-2026-001"


def test_authorization_scope_enforcement(client, auth_service):
    """
    Test that allowed cases reflect user clearance and out-of-scope activation fails closed.
    """
    token = auth_service.create_jwt_token("INVESTIGATOR_DELHI")
    headers = {"Authorization": f"Bearer {token}"}

    # Negotiate context
    resp = client.post("/api/v1/context/negotiate", json={}, headers=headers)
    assert resp.status_code == 200
    ctx = resp.json()["context"]
    session_id = ctx["session_id"]
    allowed = [c["case_id"] for c in ctx["allowed_cases"]]

    assert "C102" in allowed

    # Attempt to activate unauthorized case
    resp_unauth = client.post(
        "/api/v1/context/activate-case",
        json={"session_id": session_id, "case_id": "C999_RESTRICTED_UNKNOWN"},
        headers=headers,
    )
    assert resp_unauth.status_code == 403


def test_safe_capability_negotiation_no_fingerprinting(client):
    """
    Verify client environment report enables voice without intrusive device fingerprinting.
    """
    report = {
        "has_audio_input": True,
        "mic_permission": "GRANTED",
        "browser_family": "Firefox / Chromium",
        "preferred_language": "en-IN",
    }
    resp = client.post("/api/v1/context/negotiate", json={"client_report": report})
    assert resp.status_code == 200
    ctx = resp.json()["context"]

    assert "VOICE" in ctx["supported_interaction_modes"]
    assert ctx["microphone_state"] == "GRANTED"


def test_activate_case_scope_endpoint(client):
    """
    Test that activating an authorized case scope transitions session state.
    """
    init_resp = client.post("/api/v1/context/negotiate", json={})
    session_id = init_resp.json()["context"]["session_id"]

    act_resp = client.post(
        "/api/v1/context/activate-case",
        json={"session_id": session_id, "case_id": "CASE-2026-001", "route": "graph"},
    )
    assert act_resp.status_code == 200
    updated_ctx = act_resp.json()

    assert updated_ctx["is_first_open"] is False
    assert updated_ctx["current_case_id"] == "CASE-2026-001"
    assert updated_ctx["current_route"] == "graph"
