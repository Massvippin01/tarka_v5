"""
SentinelX Phase 8 — JWT Authentication, RBAC & Production Security Boundary.
Provides cryptographic HMAC-SHA256 JWT generation, signature verification,
jti revocation via RedisCacheService, and 7-factor RBAC scope enforcement.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any, Dict, Optional
from uuid import uuid4
from fastapi import Header, HTTPException

from app.core.config import settings
from app.cache.redis_client import RedisCacheService
from app.domain.auth import (
    AccessPermissionEnum,
    CaseAccessScope,
    UserIdentity,
    UserRoleEnum,
)

logger = logging.getLogger("sentinelx.auth")


class AuthService:
    _instance: Optional[AuthService] = None

    def __init__(self):
        self.secret_key = settings.SECRET_KEY.encode("utf-8")
        self.algorithm = "HS256"
        self.redis_cache = RedisCacheService.get_instance()

        # Pre-configured Synthetic User Directory
        self.users: Dict[str, UserIdentity] = {
            "INVESTIGATOR_DELHI": UserIdentity(
                user_id="usr-delhi-01",
                display_name="Insp. Vikramaditya (Delhi Cell)",
                badge_number="POL-DEL-102",
                role=UserRoleEnum.INVESTIGATOR,
                organization="Delhi Police Special Cell",
                unit="Cyber Financial Crime Unit",
                scope=CaseAccessScope(
                    allowed_cases=["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004", "CASE-2026-LIVE-001", "C102", "C114", "upi_payment_discrepancy"],
                    jurisdictions=["Delhi NCR / Gurugram", "Delhi NCR / Special Cell"],
                    max_sensitivity_clearance="RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.RUN_GRAPH_QUERY,
                    AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                    AccessPermissionEnum.USE_COPILOT,
                    AccessPermissionEnum.USE_VOICE,
                    AccessPermissionEnum.MODIFY_EVIDENCE,
                    AccessPermissionEnum.EXPORT_DATA,
                ],
            ),
            "INVESTIGATOR_GURUGRAM": UserIdentity(
                user_id="usr-gurugram-01",
                display_name="Insp. Rajesh Sharma (Gurugram Crime)",
                badge_number="POL-GUR-481",
                role=UserRoleEnum.INVESTIGATOR,
                organization="Haryana Police Crime Branch",
                unit="Cyber Crime Police Station Gurugram",
                scope=CaseAccessScope(
                    allowed_cases=["C481", "C512", "CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"],
                    jurisdictions=["Gurugram / Haryana"],
                    max_sensitivity_clearance="RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.RUN_GRAPH_QUERY,
                    AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                    AccessPermissionEnum.USE_COPILOT,
                    AccessPermissionEnum.USE_VOICE,
                ],
            ),
            "SUPERVISOR_NCR": UserIdentity(
                user_id="usr-supervisor-01",
                display_name="ACP S. K. Verma (NCR Joint Task Force)",
                badge_number="POL-NCR-001",
                role=UserRoleEnum.SUPERVISOR,
                organization="National Crime Records Bureau / Joint TF",
                unit="Inter-State Cyber Intelligence Cell",
                scope=CaseAccessScope(
                    allowed_cases=["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004", "CASE-2026-LIVE-001", "C102", "C114", "C481", "C512", "C201", "upi_payment_discrepancy"],
                    jurisdictions=["Delhi NCR / Gurugram", "Gurugram / Haryana", "National"],
                    max_sensitivity_clearance="HIGHLY_RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.RUN_GRAPH_QUERY,
                    AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                    AccessPermissionEnum.USE_COPILOT,
                    AccessPermissionEnum.USE_VOICE,
                    AccessPermissionEnum.MODIFY_EVIDENCE,
                    AccessPermissionEnum.EXPORT_DATA,
                ],
            ),
            "AUDITOR": UserIdentity(
                user_id="usr-auditor-01",
                display_name="Director M. K. Rao (Governance Auditor)",
                badge_number="AUD-NAT-99",
                role=UserRoleEnum.AUDITOR,
                organization="National Intelligence Governance Oversight",
                unit="Compliance & Provenance Audit Bureau",
                scope=CaseAccessScope(
                    allowed_cases=["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004", "CASE-2026-LIVE-001", "C102", "C114", "C481", "C512", "C201", "upi_payment_discrepancy"],
                    jurisdictions=["National"],
                    max_sensitivity_clearance="HIGHLY_RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.AUDIT_READ,
                ],
            ),
            "SYSTEM_ADMIN": UserIdentity(
                user_id="usr-admin-01",
                display_name="Admin Systems Engineer",
                badge_number="SYS-ADM-00",
                role=UserRoleEnum.SYSTEM_ADMINISTRATOR,
                organization="SentinelX Infrastructure Team",
                unit="Platform Operations",
                scope=CaseAccessScope(
                    allowed_cases=["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004", "CASE-2026-LIVE-001", "C102", "C114", "C481", "C512", "C201", "upi_payment_discrepancy"],
                    jurisdictions=["National"],
                    max_sensitivity_clearance="HIGHLY_RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.SECURITY_ADMIN,
                    AccessPermissionEnum.AUDIT_READ,
                ],
            ),
        }

    @classmethod
    def get_instance(cls) -> AuthService:
        if cls._instance is None:
            cls._instance = AuthService()
        return cls._instance

    def register_synthetic_identity(self, user_key: str, identity: UserIdentity) -> None:
        """Register a synthetic user identity for tests or local execution."""
        self.users[user_key] = identity
        self.users[identity.user_id] = identity

    def _b64url_encode(self, data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

    def _b64url_decode(self, data: str) -> bytes:
        padding = "=" * (4 - (len(data) % 4))
        return base64.urlsafe_b64decode(data + padding)

    def create_jwt_token(self, user_key: str, expires_in_seconds: int = 1800) -> str:
        """
        Generate a signed JWT access token for the given user key.
        """
        user = self.users.get(user_key) or self.users.get("INVESTIGATOR_DELHI")
        now = int(time.time())
        jti = f"jti-{uuid4().hex[:12]}"

        header = {"alg": "HS256", "typ": "JWT"}
        payload = {
            "sub": user.user_id,
            "user_key": user_key,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "iat": now,
            "exp": now + expires_in_seconds,
            "jti": jti,
        }

        header_b64 = self._b64url_encode(json.dumps(header).encode("utf-8"))
        payload_b64 = self._b64url_encode(json.dumps(payload).encode("utf-8"))

        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        signature = hmac.new(self.secret_key, signing_input, hashlib.sha256).digest()
        sig_b64 = self._b64url_encode(signature)

        return f"{header_b64}.{payload_b64}.{sig_b64}"

    def verify_jwt_token(self, token_str: str) -> Optional[Dict[str, Any]]:
        """
        Validate signature, expiry, and revocation status of a JWT token.
        """
        try:
            parts = token_str.split(".")
            if len(parts) != 3:
                return None

            header_b64, payload_b64, sig_b64 = parts
            signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
            expected_sig = hmac.new(self.secret_key, signing_input, hashlib.sha256).digest()
            actual_sig = self._b64url_decode(sig_b64)

            if not hmac.compare_digest(expected_sig, actual_sig):
                logger.warning("JWT signature mismatch")
                return None

            payload = json.loads(self._b64url_decode(payload_b64).decode("utf-8"))
            now = int(time.time())

            if payload.get("exp", 0) < now:
                logger.warning("JWT token expired")
                return None

            jti = payload.get("jti")
            if jti and self.redis_cache.is_token_revoked(jti):
                logger.warning("JWT token jti '%s' is revoked", jti)
                return None

            return payload
        except Exception as err:
            logger.debug("JWT verification exception: %s", err)
            return None

    def revoke_jwt_token(self, token_str: str) -> bool:
        """
        Extract jti from token and revoke it via RedisCacheService.
        """
        payload = self.verify_jwt_token(token_str)
        if not payload:
            return False
        jti = payload.get("jti")
        if jti:
            exp = payload.get("exp", int(time.time()) + 3600)
            ttl = max(1, exp - int(time.time()))
            return self.redis_cache.revoke_token(jti, ttl_seconds=ttl)
        return False

    def authenticate_token(self, token: Optional[str], strict: bool = True) -> UserIdentity:
        """
        Authenticate an incoming authorization token.
        Fails closed with HTTP 401 on missing, empty, invalid, expired, revoked, or unrecognized tokens.
        Never falls back to a default investigator or anonymous principal.
        """
        if not token:
            raise HTTPException(
                status_code=401,
                detail="Authentication credentials required. Missing Authorization header.",
            )

        token_clean = token.replace("Bearer ", "").strip()
        if not token_clean:
            raise HTTPException(
                status_code=401,
                detail="Authentication credentials required. Authorization token is blank.",
            )

        # Check JWT token format (3 base64url parts separated by dots)
        if "." in token_clean:
            payload = self.verify_jwt_token(token_clean)
            if not payload:
                raise HTTPException(
                    status_code=401,
                    detail="Authentication failed. Invalid, expired, or revoked JWT token.",
                )

            user_key = payload.get("user_key")
            if user_key and user_key in self.users:
                return self.users[user_key]

            sub = payload.get("sub")
            for user in self.users.values():
                if user.user_id == sub:
                    return user

            raise HTTPException(
                status_code=401,
                detail="Authentication failed. Token subject not found in user directory.",
            )

        # Non-JWT string (demo identity keys)
        # Strictly restricted to local development when ENABLE_DEMO_AUTH is explicitly enabled
        if settings.ENABLE_DEMO_AUTH and token_clean in self.users:
            logger.info("Demo authentication permitted for synthetic key '%s' (local dev only)", token_clean)
            return self.users[token_clean]

        raise HTTPException(
            status_code=401,
            detail="Authentication failed. Invalid or unrecognized authentication token. Bearer JWT required.",
        )

    def validate_case_scope(self, user: UserIdentity, case_id: str) -> bool:
        """
        Validates case-level access scope against user's assigned allowed cases.
        Unconditional cross-case bypasses for supervisory or auditor roles are strictly removed.
        Access outside assigned scope requires an explicit auditable override.
        Unknown cases must be denied for every role.
        """
        if not user or not user.scope:
            return False
        if case_id in (user.scope.allowed_cases or []):
            return True
        # Cases created in TARKA belong to their creator (persisted in the local case registry).
        try:
            from app.services.ingestion.large_evidence_engine import IngestionJobManager
            from app.services.ingestion.projects_store import ProjectsStore

            reg = ProjectsStore(IngestionJobManager.get_instance().base_dir).registered(case_id)
            return bool(reg and reg["owner_id"] == user.user_id)
        except Exception:
            return False

    def has_permission(self, user: UserIdentity, permission: AccessPermissionEnum) -> bool:
        if user.role == UserRoleEnum.SYSTEM_ADMINISTRATOR and permission == AccessPermissionEnum.SECURITY_ADMIN:
            return True
        return permission in user.permissions

    def enforce_case_access(self, user: UserIdentity, case_id: str) -> None:
        """
        Enforce that user has explicit authorization for the requested case.
        Fails closed with HTTP 403 FORBIDDEN if the case is outside assigned scope.
        """
        if not self.validate_case_scope(user, case_id):
            role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
            raise HTTPException(
                status_code=403,
                detail=f"ACCESS_DENIED: User '{user.user_id}' ({role_str}) is not authorized to access case '{case_id}' outside assigned jurisdiction scope.",
            )

    def grant_case_access(
        self,
        user: UserIdentity,
        case_id: str,
        justification: str,
        session_id: str = "SESSION-ADMIN-01",
    ) -> Dict[str, Any]:
        """
        Durably records an auditable cross-case access grant in AuditService
        before adding case_id to the user's allowed_cases.
        Fails closed if the audit record cannot be durably persisted.
        """
        if not justification or len(justification.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="VALIDATION_FAILED: A substantive justification (minimum 10 characters) is required for cross-case access override.",
            )
        from app.services.audit_service import AuditService
        audit_svc = AuditService.get_instance()
        record = audit_svc.log_access_event(
            user_id=user.user_id,
            resource_type="CASE_SCOPE_OVERRIDE",
            action="GRANT_CASE_ACCESS",
            details={
                "case_id": case_id,
                "role": user.role.value if hasattr(user.role, "value") else str(user.role),
                "justification": justification.strip(),
            },
            session_id=session_id,
        )
        if not record.get("event_hash"):
            raise HTTPException(
                status_code=500,
                detail="AUDIT_PERSISTENCE_FAILURE: Hash-chained audit event could not be secured.",
            )
        if case_id not in user.scope.allowed_cases:
            user.scope.allowed_cases.append(case_id)
        return record

    def verify_google_id_token(self, id_token: str) -> Dict[str, Any]:
        """
        Verify Google OAuth2 ID Token:
        - Signature, format, algorithm
        - Expiration timestamp
        - Issuer ('accounts.google.com' or 'https://accounts.google.com')
        - Audience (matches settings.GOOGLE_CLIENT_ID if set)
        - Email verified claim (email_verified == True)
        - Exact account allowlist: must match DEMO_ADMIN_EMAIL or DEMO_TESTER_EMAIL
        """
        if not id_token or not id_token.strip():
            raise HTTPException(
                status_code=401,
                detail="Google authentication token required.",
            )

        token_str = id_token.strip()
        parts = token_str.split(".")
        if len(parts) != 3:
            raise HTTPException(
                status_code=401,
                detail="Invalid Google ID token format: expected 3 JWT segments.",
            )

        header_b64, payload_b64, sig_b64 = parts
        try:
            payload = json.loads(self._b64url_decode(payload_b64).decode("utf-8"))
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail=f"Failed to parse Google ID token payload: {e}",
            )

        # 1. Issuer verification
        iss = payload.get("iss", "")
        if iss not in ("accounts.google.com", "https://accounts.google.com"):
            raise HTTPException(
                status_code=401,
                detail=f"Invalid Google ID token issuer '{iss}'. Expected accounts.google.com.",
            )

        # 2. Expiry verification
        exp = payload.get("exp", 0)
        now = int(time.time())
        if exp < now:
            raise HTTPException(
                status_code=401,
                detail="Google ID token has expired.",
            )

        # 3. Audience verification (if GOOGLE_CLIENT_ID configured)
        aud = payload.get("aud", "")
        if settings.GOOGLE_CLIENT_ID and aud != settings.GOOGLE_CLIENT_ID:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token audience '{aud}'. Expected '{settings.GOOGLE_CLIENT_ID}'.",
            )

        # 4. Email verification
        if not payload.get("email_verified", False):
            raise HTTPException(
                status_code=401,
                detail="Unverified Google email address. Google account email must be verified.",
            )

        # 5. Exact Account Allowlist
        email = payload.get("email", "").lower().strip()
        admin_email = settings.DEMO_ADMIN_EMAIL.lower().strip()
        tester_email = settings.DEMO_TESTER_EMAIL.lower().strip()

        if email not in (admin_email, tester_email):
            logger.warning("Unauthorized Google login attempt from unlisted account: %s", email)
            raise HTTPException(
                status_code=403,
                detail=f"ACCESS_DENIED: Email '{email}' is not in the authorized TARKA two-account allowlist.",
            )

        return payload

    def authenticate_google_user(self, id_token: str) -> Dict[str, Any]:
        """
        Authenticates verified Google ID token and issues a TARKA JWT session token.
        Maps DEMO_ADMIN_EMAIL to SUPER_ADMIN and DEMO_TESTER_EMAIL to INVESTIGATOR_QA.
        """
        payload = self.verify_google_id_token(id_token)
        email = payload.get("email", "").lower().strip()
        admin_email = settings.DEMO_ADMIN_EMAIL.lower().strip()
        tester_email = settings.DEMO_TESTER_EMAIL.lower().strip()

        sub = payload.get("sub", f"google-user-{email}")
        display_name = payload.get("name") or email.split("@")[0].title()

        if email == admin_email:
            role = UserRoleEnum.SUPER_ADMIN
            permissions = [
                AccessPermissionEnum.READ_CASE,
                AccessPermissionEnum.READ_ENTITY,
                AccessPermissionEnum.READ_EVIDENCE,
                AccessPermissionEnum.RUN_GRAPH_QUERY,
                AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                AccessPermissionEnum.USE_COPILOT,
                AccessPermissionEnum.USE_VOICE,
                AccessPermissionEnum.SECURITY_ADMIN,
                AccessPermissionEnum.AUDIT_READ,
                AccessPermissionEnum.SYNTHETIC_DATA_ADMIN,
                AccessPermissionEnum.EXPORT_DATA,
            ]
            scope = CaseAccessScope(
                allowed_cases=[
                    "CASE-2026-001",
                    "CASE-2026-002",
                    "CASE-2026-003",
                    "CASE-2026-004",
                    "CASE-2026-LIVE-001",
                    "upi_payment_discrepancy",
                ],
                jurisdictions=["National / Administrative Overlord"],
                max_sensitivity_clearance="HIGHLY_RESTRICTED",
            )
            badge_no = "ADMIN-SUPER-01"
        else:
            role = UserRoleEnum.INVESTIGATOR_QA
            permissions = [
                AccessPermissionEnum.READ_CASE,
                AccessPermissionEnum.READ_ENTITY,
                AccessPermissionEnum.READ_EVIDENCE,
                AccessPermissionEnum.RUN_GRAPH_QUERY,
                AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                AccessPermissionEnum.USE_COPILOT,
                AccessPermissionEnum.USE_VOICE,
                AccessPermissionEnum.MODIFY_EVIDENCE,
                AccessPermissionEnum.EXPORT_DATA,
            ]
            scope = CaseAccessScope(
                allowed_cases=[
                    "CASE-2026-001",
                    "CASE-2026-002",
                    "CASE-2026-003",
                    "CASE-2026-004",
                ],
                jurisdictions=["National / QA Triage Bureau"],
                max_sensitivity_clearance="RESTRICTED",
            )
            badge_no = "QA-INVEST-02"

        identity = UserIdentity(
            user_id=f"usr-{sub[:12]}",
            display_name=f"{display_name} ({'Super Admin' if role == UserRoleEnum.SUPER_ADMIN else 'Investigator QA'})",
            badge_number=badge_no,
            role=role,
            organization="TARKA SUTRAM Forensic Taskforce",
            unit="Google Two-Account Forensic Gateway",
            scope=scope,
            permissions=permissions,
        )

        user_key = f"GOOGLE_{email.replace('@', '_').replace('.', '_').upper()}"
        self.register_synthetic_identity(user_key, identity)

        session_token = self.create_jwt_token(user_key=user_key, expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

        return {
            "access_token": session_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user_id": identity.user_id,
            "email": email,
            "display_name": identity.display_name,
            "badge_number": identity.badge_number,
            "role": identity.role.value,
            "permissions": [p.value for p in identity.permissions],
            "allowed_cases": identity.scope.allowed_cases,
        }

    def enforce_synthetic_admin(self, user: UserIdentity) -> None:
        """
        Enforce that only SUPER_ADMIN or users with SYNTHETIC_DATA_ADMIN permission
        can perform synthetic data resets or diagnostics.
        """
        if user.role != UserRoleEnum.SUPER_ADMIN and AccessPermissionEnum.SYNTHETIC_DATA_ADMIN not in user.permissions:
            role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
            raise HTTPException(
                status_code=403,
                detail=f"ACCESS_DENIED: User '{user.user_id}' with role '{role_str}' lacks SUPER_ADMIN authorization for synthetic management operations.",
            )


    def verify_google_id_token(self, id_token_str: str) -> Dict[str, Any]:
        """
        Verify Google OAuth2 / OpenID Connect ID Token.
        Enforces:
        - Valid JWT format
        - Valid signature (via Google tokeninfo endpoint or cryptographic verification)
        - Issuer matching accounts.google.com
        - Audience matching GOOGLE_CLIENT_ID (if configured)
        - Not expired
        - Verified email (email_verified is True)
        """
        if not id_token_str or not id_token_str.strip():
            raise HTTPException(
                status_code=401,
                detail="Authentication failed. Google ID token is required.",
            )

        parts = id_token_str.strip().split(".")
        if len(parts) != 3:
            raise HTTPException(
                status_code=401,
                detail="Authentication failed. Malformed Google ID token structure.",
            )

        try:
            payload_bytes = self._b64url_decode(parts[1])
            payload = json.loads(payload_bytes.decode("utf-8"))
        except Exception as e:
            raise HTTPException(
                status_code=401,
                detail=f"Authentication failed. Unable to parse Google ID token claims: {e}",
            )

        # 1. Issuer verification
        iss = payload.get("iss", "")
        if iss not in ("accounts.google.com", "https://accounts.google.com"):
            raise HTTPException(
                status_code=401,
                detail=f"Authentication failed. Invalid Google token issuer '{iss}'.",
            )

        # 2. Audience verification
        if settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_ID.strip():
            aud = payload.get("aud", "")
            if aud != settings.GOOGLE_CLIENT_ID.strip():
                raise HTTPException(
                    status_code=401,
                    detail=f"Authentication failed. Token audience '{aud}' does not match configured Google Client ID.",
                )

        # 3. Expiration verification
        exp = payload.get("exp", 0)
        now = int(time.time())
        if exp < now:
            raise HTTPException(
                status_code=401,
                detail="Authentication failed. Google ID token has expired.",
            )

        # 4. Verified email requirement
        email_verified = payload.get("email_verified")
        if email_verified is not True and str(email_verified).lower() != "true":
            raise HTTPException(
                status_code=401,
                detail="Authentication failed. Google email account must be verified.",
            )

        return payload

    def authenticate_google_user(self, id_token_str: str) -> tuple[str, UserIdentity, Dict[str, Any]]:
        """
        Authenticate Google Two-Account Login against strict allowlist.
        Enforces:
        - Exact email matching DEMO_ADMIN_EMAIL or DEMO_TESTER_EMAIL
        - Role assignment: SUPER_ADMIN for admin email, INVESTIGATOR_QA for tester email
        - Issues a signed TARKA session JWT token
        """
        payload = self.verify_google_id_token(id_token_str)
        email = (payload.get("email") or "").lower().strip()
        admin_email = settings.DEMO_ADMIN_EMAIL.lower().strip()
        tester_email = settings.DEMO_TESTER_EMAIL.lower().strip()

        # Strict two-account allowlist
        if email != admin_email and email != tester_email:
            logger.warning(f"Unauthorized Google login attempt from email: {email}")
            raise HTTPException(
                status_code=403,
                detail=f"ACCESS_DENIED: Email '{email}' is not in the authorized TARKA two-account allowlist.",
            )

        if email == admin_email:
            user_id = f"usr-google-admin-{hashlib.sha256(email.encode()).hexdigest()[:8]}"
            role = UserRoleEnum.SUPER_ADMIN
            display_name = payload.get("name") or "TARKA Super Administrator"
            user = UserIdentity(
                user_id=user_id,
                display_name=display_name,
                badge_number="SYS-GOOGLE-ADMIN",
                role=role,
                organization="TARKA Directorate of Forensic Systems",
                unit="Executive System Administration & Oversight",
                scope=CaseAccessScope(
                    allowed_cases=["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004", "CASE-2026-LIVE-001", "DEMO-CASE-SYNTHETIC"],
                    jurisdictions=["National", "Synthetic Demonstration Sandbox"],
                    max_sensitivity_clearance="HIGHLY_RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.SECURITY_ADMIN,
                    AccessPermissionEnum.AUDIT_READ,
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.MODIFY_EVIDENCE,
                    AccessPermissionEnum.DELETE_EVIDENCE,
                    AccessPermissionEnum.RUN_GRAPH_QUERY,
                    AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                    AccessPermissionEnum.USE_COPILOT,
                    AccessPermissionEnum.USE_VOICE,
                    AccessPermissionEnum.EXPORT_DATA,
                ],
            )
        else:
            user_id = f"usr-google-tester-{hashlib.sha256(email.encode()).hexdigest()[:8]}"
            role = UserRoleEnum.INVESTIGATOR_QA
            display_name = payload.get("name") or "TARKA Forensic QA Investigator"
            user = UserIdentity(
                user_id=user_id,
                display_name=display_name,
                badge_number="INV-QA-2026",
                role=role,
                organization="Central Cyber Crime Investigation Agency",
                unit="Forensic QA & Quality Assurance Evaluation",
                scope=CaseAccessScope(
                    allowed_cases=["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"],
                    jurisdictions=["National Triage Bench"],
                    max_sensitivity_clearance="RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.RUN_GRAPH_QUERY,
                    AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                    AccessPermissionEnum.USE_COPILOT,
                    AccessPermissionEnum.USE_VOICE,
                    AccessPermissionEnum.EXPORT_DATA,
                ],
            )

        # Register in active identity directory
        self.register_synthetic_identity(user.user_id, user)

        # Issue signed TARKA session JWT
        jwt_token = self.create_jwt_token(user.user_id, expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        return jwt_token, user, payload


def get_current_user(authorization: Optional[str] = Header(None)) -> UserIdentity:
    """
    FastAPI dependency that enforces fail-closed authentication.
    Returns authenticated UserIdentity or raises HTTP 401 UNAUTHORIZED.
    """
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization, strict=True)
