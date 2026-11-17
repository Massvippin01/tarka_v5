import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.domain.auth import UserIdentity, UserRoleEnum, CaseAccessScope
from app.services.auth_service import AuthService

client = TestClient(app)

def auth_headers():
    auth_service = AuthService.get_instance()
    user = UserIdentity(
        user_id="usr-supervisor-tester",
        display_name="Insp. Sharma",
        role=UserRoleEnum.SUPERVISOR,
        scope=CaseAccessScope(
            allowed_cases=["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"],
            jurisdictions=["National"],
        ),
    )
    auth_service.register_synthetic_identity("SUPERVISOR_TESTER", user)
    token = auth_service.create_jwt_token("SUPERVISOR_TESTER")
    return {"Authorization": f"Bearer {token}"}


def test_get_system_audit_feed():
    headers = auth_headers()
    response = client.get("/api/v1/system/audit/feed", headers=headers)
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)
    if len(events) > 0:
        event = events[0]
        assert "event_id" in event
        assert "action" in event
        assert "payload_hash" in event
        assert "timestamp" in event


def test_verify_audit_hash_chain():
    headers = auth_headers()
    response = client.get("/api/v1/system/audit/verify-chain", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["chain_valid"] is True
    assert data["tamper_detected"] is False
    assert "total_records" in data


def test_get_case_specific_audit():
    headers = auth_headers()
    response = client.get("/api/v1/cases/CASE-2026-001/audit", headers=headers)
    assert response.status_code == 200
    events = response.json()
    assert isinstance(events, list)
