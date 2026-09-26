"""
SentinelX Phase 8 — JWT Authentication, Token Revocation & RBAC Enforcement Tests.
Verifies cryptographic HMAC-SHA256 JWT signing, verification, expiration,
revocation via RedisCacheService, and case scope RBAC policies.
"""

import time
import pytest
from app.services.auth_service import AuthService
from app.domain.auth import UserRoleEnum, AccessPermissionEnum


class TestWave6Phase8JWTRBAC:

    def test_jwt_token_generation_and_verification(self):
        auth = AuthService.get_instance()
        token = auth.create_jwt_token("INVESTIGATOR_DELHI", expires_in_seconds=300)

        assert token is not None
        assert len(token.split(".")) == 3

        payload = auth.verify_jwt_token(token)
        assert payload is not None
        assert payload["sub"] == "usr-delhi-01"
        assert payload["user_key"] == "INVESTIGATOR_DELHI"
        assert "jti" in payload

    def test_jwt_token_tampered_signature_rejected(self):
        auth = AuthService.get_instance()
        token = auth.create_jwt_token("INVESTIGATOR_DELHI", expires_in_seconds=300)

        parts = token.split(".")
        tampered_token = f"{parts[0]}.{parts[1]}.invalid_signature_bytes"

        payload = auth.verify_jwt_token(tampered_token)
        assert payload is None

    def test_jwt_token_expired_rejected(self):
        auth = AuthService.get_instance()
        token = auth.create_jwt_token("INVESTIGATOR_DELHI", expires_in_seconds=-10)

        payload = auth.verify_jwt_token(token)
        assert payload is None

    def test_jwt_token_revocation(self):
        auth = AuthService.get_instance()
        token = auth.create_jwt_token("INVESTIGATOR_DELHI", expires_in_seconds=300)

        # Before revocation: valid
        user_before = auth.authenticate_token(token)
        assert user_before.user_id == "usr-delhi-01"

        # Revoke token
        revoked = auth.revoke_jwt_token(token)
        assert revoked is True

        # Verification fails after revocation
        payload_after = auth.verify_jwt_token(token)
        assert payload_after is None

    def test_rbac_case_access_scope_enforcement(self):
        auth = AuthService.get_instance()
        user_delhi = auth.users["INVESTIGATOR_DELHI"]
        user_supervisor = auth.users["SUPERVISOR_NCR"]

        # Delhi investigator can access C102 but not C481
        assert auth.validate_case_scope(user_delhi, "C102") is True
        assert auth.validate_case_scope(user_delhi, "C481") is False

        # Supervisor can access both C102 and C481
        assert auth.validate_case_scope(user_supervisor, "C102") is True
        assert auth.validate_case_scope(user_supervisor, "C481") is True
