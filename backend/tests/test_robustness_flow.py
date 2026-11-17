"""
Test TARKA F-8 Robustness Flow:
- Consistent Error Schema ({code, message, detail, request_id})
- Extended System Health Telemetry
- Demo Authentication Session Token Minting
- X-Request-ID traceability
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import AuthService


@pytest.fixture
def client():
    return TestClient(app)


def test_system_health_extended(client):
    res = client.get("/api/v1/system/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("HEALTHY", "DEGRADED")
    assert "api" in data
    assert data["api"]["status"] == "OK"
    assert "database" in data
    assert "graph" in data
    assert "fixtures" in data
    assert data["fixtures"]["count"] == 4
    assert "CASE-2026-001" in data["fixtures"]["canonical_cases"]
    assert "sse_pipeline" in data


def test_consistent_error_schema(client):
    # 1. 401 Unauthorized without auth headers
    res_401 = client.get("/api/v1/cases/CASE-2026-001")
    assert res_401.status_code == 401
    err_401 = res_401.json()
    assert err_401["code"] == "UNAUTHORIZED"
    assert "message" in err_401
    assert "request_id" in err_401
    assert res_401.headers.get("X-Request-ID") is not None

    # 2. 403 Forbidden for unauthorized case
    auth = AuthService.get_instance()
    token = auth.create_jwt_token("INVESTIGATOR_GURUGRAM") # Only allowed C481, C512, CASE-2026-001
    headers = {"Authorization": f"Bearer {token}"}
    res_403 = client.get("/api/v1/cases/CASE-2026-002", headers=headers)
    assert res_403.status_code == 403
    err_403 = res_403.json()
    assert err_403["code"] == "FORBIDDEN"
    assert "message" in err_403
    assert "request_id" in err_403

    # 3. 404 Not Found on unknown API route
    res_404 = client.get("/api/v1/unknown-route-endpoint")
    assert res_404.status_code == 404
    err_404 = res_404.json()
    assert err_404["code"] == "NOT_FOUND"
    assert "message" in err_404
    assert "request_id" in err_404
    assert res_404.headers.get("X-Request-ID") is not None




def test_demo_auth_session_minting(client):
    # Investigator
    res_inv = client.post("/api/v1/forensics/auth/session", json={"username": "INVESTIGATOR_DELHI"})
    assert res_inv.status_code == 200
    data_inv = res_inv.json()
    assert "access_token" in data_inv
    assert data_inv["display_name"] == "Insp. Vikramaditya (Delhi Cell)"

    # Supervisor
    res_sup = client.post("/api/v1/forensics/auth/session", json={"username": "SUPERVISOR_NCR"})
    assert res_sup.status_code == 200
    data_sup = res_sup.json()
    assert "access_token" in data_sup
    assert "ACP S. K. Verma" in data_sup["display_name"]

    # Verify token
    auth = AuthService.get_instance()
    user = auth.authenticate_token(f"Bearer {data_sup['access_token']}", strict=True)
    assert user.role.value == "SUPERVISOR"
