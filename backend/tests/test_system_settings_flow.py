import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.domain.auth import UserIdentity, UserRoleEnum, CaseAccessScope


@pytest.fixture
def auth_headers():
    auth_service = AuthService.get_instance()
    user = UserIdentity(
        user_id="usr-admin-tester",
        display_name="Inspector Admin",
        role=UserRoleEnum.SYSTEM_ADMINISTRATOR,
        scope=CaseAccessScope(
            allowed_cases=["*"],
            jurisdictions=["National"],
        ),
    )
    auth_service.register_synthetic_identity("ADMIN_TESTER", user)
    token = auth_service.create_jwt_token("ADMIN_TESTER")
    return {"Authorization": f"Bearer {token}"}


def test_system_settings_read_update_flow(auth_headers):
    client = TestClient(app)

    # 1. Read default settings
    res = client.get("/api/v1/system/settings")
    assert res.status_code == 200
    data = res.json()
    assert "station" in data
    assert "scoring_weights" in data
    assert "investigation_defaults" in data
    assert "ai_config" in data

    # 2. Update settings (change station and weights)
    update_payload = {
        "station": {
            "station_name": "Special Cell Cyber Command, New Delhi",
            "district": "New Delhi",
            "state": "Delhi NCT",
            "letterhead_title": "DELHI POLICE SPECIAL CELL",
            "letterhead_subtitle": "CYBER CRIME UNIT, MANDIR MARG, NEW DELHI",
            "default_io_name": "ACP Anil Roy",
            "default_io_badge": "DL-CC-1092",
            "show_national_emblem": True,
        },
        "scoring_weights": {
            "velocity": 0.40,
            "fan_out": 0.30,
            "structuring": 0.15,
            "account_tenure": 0.15,
        },
    }

    put_res = client.put("/api/v1/system/settings", json=update_payload, headers=auth_headers)
    assert put_res.status_code == 200
    updated = put_res.json()
    assert updated["station"]["station_name"] == "Special Cell Cyber Command, New Delhi"
    assert updated["scoring_weights"]["velocity"] == 0.40

    # Verify persistence
    get_res2 = client.get("/api/v1/system/settings")
    assert get_res2.status_code == 200
    assert get_res2.json()["station"]["station_name"] == "Special Cell Cyber Command, New Delhi"


def test_system_health_endpoint():
    client = TestClient(app)
    res = client.get("/api/v1/system/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ("HEALTHY", "DEGRADED")
    assert data["database"]["status"] == "OK"
    assert "ollama" in data


def test_system_reset_demo_flow(auth_headers):
    client = TestClient(app)
    res = client.post("/api/v1/system/reset-demo", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["cases_restored"] == 4
