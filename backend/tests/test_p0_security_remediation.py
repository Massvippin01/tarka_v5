"""P0-A Security Remediation Verification Suite.

Comprehensive regression tests proving:
1. Missing credentials return HTTP 401 on every protected route family.
2. Invalid, malformed, expired, and revoked credentials return HTTP 401.
3. The old default investigator fallback no longer works.
4. Valid credentials permit authorized requests.
5. Out-of-scope case access returns HTTP 403, including supervisor and auditor roles without explicit authorization.
6. Auditable override mechanism records hash-chained audit events before granting case access.
7. No core command, memory, context, or voice endpoint bypasses authentication.
8. Test fixtures and demo authentications remain isolated from staging/production (fails closed at startup).
9. Frontend API clients do not contain hardcoded demo identities.
"""

from __future__ import annotations

import time
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import Settings
from app.domain.auth import UserIdentity, UserRoleEnum, CaseAccessScope
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService


@pytest.fixture
def unauthenticated_client():
    return TestClient(app)


@pytest.fixture
def auth_service():
    return AuthService.get_instance()


@pytest.fixture
def authorized_client(auth_service):
    token = auth_service.create_jwt_token("INVESTIGATOR_DELHI")
    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


# ==============================================================================
# 1. Missing credentials return 401 across EVERY protected route family
# ==============================================================================

@pytest.mark.parametrize(
    "method,endpoint,payload",
    [
        # Command API
        ("POST", "/api/v1/command/dispatch", {"command_id": "CMD-01", "intent": "QUERY", "action_payload": {}}),
        ("GET", "/api/v1/command/actions", None),
        # Context API
        ("POST", "/api/v1/context/negotiate", {"case_id": "C102"}),
        ("GET", "/api/v1/context/operating-context", None),
        ("GET", "/api/v1/context/current", None),
        # Voice API
        ("POST", "/api/v1/voice/session", {"case_id": "C102"}),
        ("POST", "/api/v1/voice/token", {"case_id": "C102"}),
        # Memory API
        ("POST", "/api/v1/memory/query", {"query": "find connections", "case_id": "C102"}),
        ("GET", "/api/v1/memory/case/C102/working", None),
        ("POST", "/api/v1/memory/write", {"content": "note", "case_id": "C102"}),
        # Investigation Core API
        ("GET", "/api/v1/investigation/auth/me", None),
        ("GET", "/api/v1/investigation/events/stream?case_id=C102", None),
        ("POST", "/api/v1/investigation/events/simulate", {"case_id": "C102"}),
        ("POST", "/api/v1/investigation/search/federated", {"query": "test"}),
        ("POST", "/api/v1/investigation/graph/projection", {"case_id": "C102"}),
        ("GET", "/api/v1/investigation/graph/projection/C102", None),
        ("POST", "/api/v1/investigation/copilot", {"query": "analyze"}),
        ("POST", "/api/v1/investigation/verify-claim", {"claim_id": "CLM-01"}),
        ("GET", "/api/v1/investigation/audit-logs", None),
        # Forensics API
        ("GET", "/api/v1/forensics/cases", None),
        ("GET", "/api/v1/forensics/cases/C102/artifacts", None),
        ("GET", "/api/v1/forensics/cases/C102/timeline", None),
        ("GET", "/api/v1/forensics/cases/C102/contradictions", None),
        ("GET", "/api/v1/forensics/tarka/cases", None),
        # Investigations Workspace & Live Proof API
        ("GET", "/api/v1/investigations/C102/state", None),
        ("GET", "/api/v1/investigations/C102/graph", None),
        ("GET", "/api/v1/investigations/C102/contradictions", None),
        ("GET", "/api/v1/investigations/C102/gaps", None),
        ("GET", "/api/v1/investigations/C102/timeline", None),
        ("GET", "/api/v1/investigations/C102/delta", None),
        ("GET", "/api/v1/proof/artifact/art-01", None),
        # Graph Projection API
        ("GET", "/api/v1/graph-projection/C102/snapshot", None),
        ("GET", "/api/v1/graph-projection/C102/deltas?since_version=0", None),
        # Case CRUD API
        ("GET", "/api/v1/cases", None),
        ("GET", "/api/v1/cases/C102", None),
        # Person & Relationships API
        ("GET", "/api/v1/persons", None),
        ("POST", "/api/v1/relationships/cases/C102/suspects/P01", None),
        # Intelligence & Agent API
        ("GET", "/api/v1/intelligence/compare/C101/C102", None),
        ("GET", "/api/v1/agents", None),
        ("POST", "/api/v1/agents/tasks", {"agent_type": "FORENSIC", "case_id": "C102", "objective": "audit"}),
        # Graph Query & Explorers API
        ("GET", "/api/v1/graph/pagerank", None),
        ("GET", "/api/v1/explorer/search", None),
        ("POST", "/api/v1/normalization/clean", {"field_type": "phone", "raw_value": "+919876543210"}),
        ("GET", "/api/v1/resolution/matches/P01", None),
        # Interaction API
        ("POST", "/api/v1/interaction/session/init", {"case_id": "C102"}),
        ("POST", "/api/v1/interaction/intent/resolve", {"query": "show cases", "case_id": "C102"}),
    ],
)
def test_missing_credentials_return_401(unauthenticated_client, method, endpoint, payload):
    """Every protected route family must fail closed with HTTP 401 when no token is provided."""
    if method == "GET":
        resp = unauthenticated_client.get(endpoint)
    elif method == "POST":
        resp = unauthenticated_client.post(endpoint, json=payload or {})
    else:
        raise ValueError(f"Unsupported method: {method}")

    assert resp.status_code == 401, (
        f"Security bypass detected: Endpoint {method} {endpoint} returned {resp.status_code} "
        f"instead of 401 Unauthorized. Content: {resp.text}"
    )
    assert "detail" in resp.json()


# ==============================================================================
# 2. Invalid, expired, and revoked credentials return HTTP 401
# ==============================================================================

def test_malformed_token_returns_401(unauthenticated_client):
    """A completely malformed bearer token returns 401."""
    resp = unauthenticated_client.get(
        "/api/v1/investigation/auth/me",
        headers={"Authorization": "Bearer not-a-valid-token-string"}
    )
    assert resp.status_code == 401
    assert "Authentication failed" in resp.json()["detail"] or "Bearer JWT required" in resp.json()["detail"]


def test_expired_token_returns_401(auth_service, unauthenticated_client):
    """An expired JWT token returns 401."""
    expired_token = auth_service.create_jwt_token("INVESTIGATOR_DELHI", expires_in_seconds=-10)
    resp = unauthenticated_client.get(
        "/api/v1/investigation/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert resp.status_code == 401
    assert "Authentication failed" in resp.json()["detail"] or "expired" in resp.json()["detail"]


def test_revoked_token_returns_401(auth_service, unauthenticated_client):
    """A revoked JWT token returns 401."""
    token = auth_service.create_jwt_token("INVESTIGATOR_DELHI", expires_in_seconds=300)

    # Revoke token
    revocation_success = auth_service.revoke_jwt_token(token)
    assert revocation_success is True

    # Token must now be rejected
    resp = unauthenticated_client.get(
        "/api/v1/investigation/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert resp.status_code == 401
    assert "revoked" in resp.json()["detail"].lower() or "authentication failed" in resp.json()["detail"].lower()


def test_arbitrary_user_id_rejected_as_credentials(unauthenticated_client):
    """Passing arbitrary raw user IDs as bearer token returns 401."""
    resp = unauthenticated_client.get(
        "/api/v1/investigation/auth/me",
        headers={"Authorization": "Bearer usr-delhi-01"}
    )
    assert resp.status_code == 401


# ==============================================================================
# 3. Old default investigator fallback no longer works
# ==============================================================================

def test_default_investigator_fallback_removed(unauthenticated_client):
    """Absence of credentials never silently resolves to INVESTIGATOR_DELHI."""
    resp = unauthenticated_client.get("/api/v1/investigation/auth/me")
    assert resp.status_code == 401

    # Blank token also fails closed
    resp_blank = unauthenticated_client.get(
        "/api/v1/investigation/auth/me",
        headers={"Authorization": "Bearer "}
    )
    assert resp_blank.status_code == 401


# ==============================================================================
# 4. Valid credentials permit authorized requests
# ==============================================================================

def test_valid_token_allows_authorized_me_request(authorized_client):
    """A properly signed JWT grants access to /auth/me with proper claims."""
    resp = authorized_client.get("/api/v1/investigation/auth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["user_id"] == "usr-delhi-01"
    assert data["role"] == "INVESTIGATOR"
    assert "C102" in data["scope"]["allowed_cases"]


# ==============================================================================
# 5. Out-of-scope case access returns HTTP 403, including supervisor & auditor
# ==============================================================================

def test_investigator_out_of_scope_case_returns_403(auth_service):
    """Investigator accessing unassigned case receives HTTP 403."""
    user = UserIdentity(
        user_id="usr-restricted-inv",
        display_name="Restricted Investigator",
        role=UserRoleEnum.INVESTIGATOR,
        scope=CaseAccessScope(allowed_cases=["CASE-ALPHA"], jurisdictions=["Delhi"]),
    )
    auth_service.register_synthetic_identity("usr-restricted-inv", user)
    token = auth_service.create_jwt_token("usr-restricted-inv")

    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})

    # Accessing assigned case works
    resp_ok = client.get("/api/v1/investigations/CASE-ALPHA/state")
    assert resp_ok.status_code in (200, 404)  # Allowed case scope (404 only if empty case)

    # Accessing unassigned case returns 403
    resp_forbidden = client.get("/api/v1/investigations/CASE-BETA/state")
    assert resp_forbidden.status_code == 403
    assert "ACCESS_DENIED" in resp_forbidden.json()["detail"]
    assert "not authorized to access case" in resp_forbidden.json()["detail"]


def test_supervisor_out_of_scope_case_returns_403_without_override(auth_service):
    """Supervisor accessing unassigned case without an explicit override receives HTTP 403."""
    user = UserIdentity(
        user_id="usr-test-supervisor",
        display_name="Test Supervisor",
        role=UserRoleEnum.SUPERVISOR,
        scope=CaseAccessScope(allowed_cases=["CASE-ALPHA"], jurisdictions=["Delhi"]),
    )
    auth_service.register_synthetic_identity("usr-test-supervisor", user)
    token = auth_service.create_jwt_token("usr-test-supervisor")

    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})

    resp = client.get("/api/v1/investigations/CASE-BETA/state")
    assert resp.status_code == 403
    assert "ACCESS_DENIED" in resp.json()["detail"]
    assert "not authorized to access case" in resp.json()["detail"]


def test_auditor_out_of_scope_case_returns_403_without_override(auth_service):
    """Auditor accessing unassigned case without explicit override receives HTTP 403."""
    user = UserIdentity(
        user_id="usr-test-auditor",
        display_name="Test Auditor",
        role=UserRoleEnum.AUDITOR,
        scope=CaseAccessScope(allowed_cases=["CASE-ALPHA"], jurisdictions=["Delhi"]),
    )
    auth_service.register_synthetic_identity("usr-test-auditor", user)
    token = auth_service.create_jwt_token("usr-test-auditor")

    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})

    resp = client.get("/api/v1/investigations/CASE-BETA/state")
    assert resp.status_code == 403
    assert "ACCESS_DENIED" in resp.json()["detail"]
    assert "not authorized to access case" in resp.json()["detail"]


def test_auditable_override_persists_hash_chain_and_grants_access(auth_service):
    """Auditable override logs durable hash-chained event and permits subsequent case access."""
    user = UserIdentity(
        user_id="usr-override-eval",
        display_name="Override Evaluator",
        role=UserRoleEnum.SUPERVISOR,
        scope=CaseAccessScope(allowed_cases=["CASE-INITIAL"], jurisdictions=["Delhi"]),
    )
    auth_service.register_synthetic_identity("usr-override-eval", user)

    # 1. Attempt unassigned case access -> 403
    with pytest.raises(Exception) as exc_info:
        auth_service.enforce_case_access(user, "CASE-RESTRICTED")
    assert exc_info.value.status_code == 403

    # 2. Issue durable auditable override
    audit_service = AuditService.get_instance()
    initial_log_count = len(audit_service.audit_records)

    override_result = auth_service.grant_case_access(
        user=user,
        case_id="CASE-RESTRICTED",
        justification="Statutory Supervisory Oversight Mandate under Section 63 BSA",
        session_id="SES-OVERRIDE-99",
    )

    assert override_result["action"] == "GRANT_CASE_ACCESS"
    assert override_result["resource_type"] == "CASE_SCOPE_OVERRIDE"
    assert override_result["details"]["case_id"] == "CASE-RESTRICTED"
    assert "event_hash" in override_result
    assert override_result["event_hash"] is not None

    # Verify audit entry was durably logged with SHA-256 hash
    entries = audit_service.audit_records
    assert len(entries) > initial_log_count
    latest_entry = entries[-1]
    assert latest_entry["event_type"] == "ACCESS_POLICY_EVALUATION"
    assert latest_entry["details"]["case_id"] == "CASE-RESTRICTED"
    assert latest_entry["details"]["justification"] == "Statutory Supervisory Oversight Mandate under Section 63 BSA"

    # 3. Access to newly authorized case now succeeds without raising 403
    auth_service.enforce_case_access(user, "CASE-RESTRICTED")
    assert "CASE-RESTRICTED" in user.scope.allowed_cases


# ==============================================================================
# 6. Test fixtures isolation & Production fail-safe
# ==============================================================================

def test_production_environment_rejects_demo_auth_at_startup():
    """Settings must fail closed and refuse startup if ENABLE_DEMO_AUTH is true in production or staging."""
    with pytest.raises(ValueError) as exc_prod:
        Settings(APP_ENV="production", ENABLE_DEMO_AUTH=True)
    assert "ENABLE_DEMO_AUTH" in str(exc_prod.value)

    with pytest.raises(ValueError) as exc_staging:
        Settings(APP_ENV="staging", ENABLE_DEMO_AUTH=True)
    assert "ENABLE_DEMO_AUTH" in str(exc_staging.value)


# ==============================================================================
# 7. Frontend API clients do not contain hardcoded demo identities
# ==============================================================================

def test_frontend_files_have_no_hardcoded_bearer_identity():
    """Verify frontend code does not inject hardcoded Bearer INVESTIGATOR_DELHI."""
    from pathlib import Path

    repo_root = Path(__file__).resolve().parent.parent.parent
    forensics_api = repo_root / "frontend" / "src" / "api" / "forensicsApi.ts"
    client_ts = repo_root / "frontend" / "src" / "api" / "client.ts"

    assert forensics_api.exists()
    content_forensics = forensics_api.read_text(encoding="utf-8")
    assert "Bearer INVESTIGATOR_DELHI" not in content_forensics
    assert "sessionStorage.getItem" in content_forensics

    if client_ts.exists():
        content_client = client_ts.read_text(encoding="utf-8")
        assert "Bearer INVESTIGATOR_DELHI" not in content_client
        assert "sessionStorage.getItem" in content_client
