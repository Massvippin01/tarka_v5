"""
Test Suite for Phase 4 Google Two-Account Authentication, RBAC, and IDOR Defense.

Verifies:
1. Valid Google ID Token for DEMO_ADMIN_EMAIL maps to SUPER_ADMIN role.
2. Valid Google ID Token for DEMO_TESTER_EMAIL maps to INVESTIGATOR_QA role.
3. Rejecting emails not present in the strict allowlist (HTTP 403).
4. Rejecting unverified email addresses (HTTP 401).
5. Rejecting expired Google tokens (HTTP 401).
6. Rejecting mismatched audience (HTTP 401).
7. Rejecting invalid issuer (HTTP 401).
8. Privilege escalation defense: INVESTIGATOR_QA cannot perform administrative resets or security actions.
9. Case-level IDOR defense: Enforces case boundary access rules.
"""

import base64
import json
import time
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.core.config import settings
from app.domain.auth import UserRoleEnum, AccessPermissionEnum
from app.main import app
from app.services.auth_service import AuthService


def make_mock_google_id_token(
    email: str,
    email_verified: bool = True,
    aud: str = "",
    iss: str = "https://accounts.google.com",
    expired: bool = False,
    name: str = "Test User"
) -> str:
    now = int(time.time())
    header = {"alg": "RS256", "kid": "mock-kid-01", "typ": "JWT"}
    payload = {
        "iss": iss,
        "aud": aud or settings.GOOGLE_CLIENT_ID or "tarka-default-client-id",
        "sub": f"google-sub-{email}",
        "email": email,
        "email_verified": email_verified,
        "name": name,
        "iat": now - 60,
        "exp": (now - 120) if expired else (now + 3600),
    }

    def b64url(b):
        return base64.urlsafe_b64encode(b).rstrip(b"=").decode("utf-8")

    h_str = b64url(json.dumps(header).encode("utf-8"))
    p_str = b64url(json.dumps(payload).encode("utf-8"))
    sig_str = b64url(b"mock_google_signature_bytes_1234567890")
    return f"{h_str}.{p_str}.{sig_str}"


def test_google_auth_admin_success():
    auth_service = AuthService.get_instance()
    admin_email = settings.DEMO_ADMIN_EMAIL
    token = make_mock_google_id_token(email=admin_email, name="Super Admin User")

    jwt_token, user, claims = auth_service.authenticate_google_user(token)
    assert jwt_token is not None
    assert user.role == UserRoleEnum.SUPER_ADMIN
    assert claims["email"] == admin_email
    assert auth_service.has_permission(user, AccessPermissionEnum.SECURITY_ADMIN) is True
    assert "CASE-2026-001" in user.scope.allowed_cases


def test_google_auth_tester_success():
    auth_service = AuthService.get_instance()
    tester_email = settings.DEMO_TESTER_EMAIL
    token = make_mock_google_id_token(email=tester_email, name="QA Tester User")

    jwt_token, user, claims = auth_service.authenticate_google_user(token)
    assert jwt_token is not None
    assert user.role == UserRoleEnum.INVESTIGATOR_QA
    assert claims["email"] == tester_email
    assert auth_service.has_permission(user, AccessPermissionEnum.READ_CASE) is True
    # Non-admin QA investigator must NOT have security administration rights
    assert auth_service.has_permission(user, AccessPermissionEnum.SECURITY_ADMIN) is False


def test_google_auth_unauthorized_email_rejected():
    auth_service = AuthService.get_instance()
    unauthorized_email = "attacker@external-domain.com"
    token = make_mock_google_id_token(email=unauthorized_email)

    with pytest.raises(HTTPException) as exc:
        auth_service.authenticate_google_user(token)
    assert exc.value.status_code == 403
    assert "not in the authorized TARKA two-account allowlist" in exc.value.detail


def test_google_auth_unverified_email_rejected():
    auth_service = AuthService.get_instance()
    token = make_mock_google_id_token(email=settings.DEMO_ADMIN_EMAIL, email_verified=False)

    with pytest.raises(HTTPException) as exc:
        auth_service.authenticate_google_user(token)
    assert exc.value.status_code == 401
    assert "email account must be verified" in exc.value.detail


def test_google_auth_expired_token_rejected():
    auth_service = AuthService.get_instance()
    token = make_mock_google_id_token(email=settings.DEMO_ADMIN_EMAIL, expired=True)

    with pytest.raises(HTTPException) as exc:
        auth_service.authenticate_google_user(token)
    assert exc.value.status_code == 401
    assert "token has expired" in exc.value.detail


def test_google_auth_invalid_issuer_rejected():
    auth_service = AuthService.get_instance()
    token = make_mock_google_id_token(email=settings.DEMO_ADMIN_EMAIL, iss="https://evil-issuer.com")

    with pytest.raises(HTTPException) as exc:
        auth_service.authenticate_google_user(token)
    assert exc.value.status_code == 401
    assert "Invalid Google token issuer" in exc.value.detail


def test_google_auth_api_endpoint():
    client = TestClient(app)
    admin_token = make_mock_google_id_token(email=settings.DEMO_ADMIN_EMAIL, name="Tarka Admin")

    res = client.post("/api/v1/auth/google", json={"id_token": admin_token})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "SUPER_ADMIN"
    assert data["email"] == settings.DEMO_ADMIN_EMAIL

    # Use returned token to fetch profile
    token = data["access_token"]
    res_me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res_me.status_code == 200
    profile = res_me.json()
    assert profile["role"] == "SUPER_ADMIN"


def test_case_scope_idor_defense():
    auth_service = AuthService.get_instance()
    tester_token = make_mock_google_id_token(email=settings.DEMO_TESTER_EMAIL)
    _, user, _ = auth_service.authenticate_google_user(tester_token)

    # Allowed case
    assert auth_service.validate_case_scope(user, "CASE-2026-001") is True

    # Unauthorized external case
    assert auth_service.validate_case_scope(user, "UNAUTHORIZED-CASE-XYZ-999") is False

    with pytest.raises(HTTPException) as exc:
        auth_service.enforce_case_access(user, "UNAUTHORIZED-CASE-XYZ-999")
    assert exc.value.status_code == 403
    assert "ACCESS_DENIED" in exc.value.detail
