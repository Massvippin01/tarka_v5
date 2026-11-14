import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.domain.auth import UserIdentity, UserRoleEnum, CaseAccessScope
from app.services.auth_service import AuthService


@pytest.fixture
def auth_headers():
    auth_service = AuthService.get_instance()
    user = UserIdentity(
        user_id="usr-action-tester",
        display_name="Inspector Actions",
        role=UserRoleEnum.INVESTIGATOR,
        scope=CaseAccessScope(
            allowed_cases=["*"],
            jurisdictions=["National"],
        ),
    )
    auth_service.register_synthetic_identity("ACTION_TESTER", user)
    token = auth_service.create_jwt_token("ACTION_TESTER")
    return {"Authorization": f"Bearer {token}"}


def test_action_loop_end_to_end(auth_headers):
    client = TestClient(app)
    uid = uuid.uuid4().hex[:6].upper()
    c_num = f"CASE-ACT-{uid}"

    # 1. Create a case
    res_case = client.post(
        "/api/v1/cases",
        json={"case_number": c_num, "title": "Action Test Case", "crime_type": "DIGITAL_ARREST"},
        headers=auth_headers,
    )
    assert res_case.status_code == 200, res_case.text
    case_id = res_case.json()["id"]

    # 2. GET Actions list and summary
    resp = client.get(f"/api/v1/cases/{case_id}/actions", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["caseId"] == case_id
    assert len(data["actions"]) >= 3
    assert len(data["notices"]) >= 3
    assert data["summary"]["totalRecoverable"] >= 380000

    # 3. Issue freeze orders for the top Layer-1 mule account
    top_acc = data["actions"][0]
    freeze_resp = client.post(
        f"/api/v1/cases/{case_id}/actions/freeze",
        json={
            "account_ids": [top_acc["accountId"]],
            "document_type": "BNSS_106_FREEZE",
            "officer_badge": "IO-409",
            "notes": "Urgent debit freeze mandated under Section 106 BNSS",
        },
        headers=auth_headers,
    )
    assert freeze_resp.status_code == 200, freeze_resp.text
    freeze_data = freeze_resp.json()
    assert freeze_data["status"] == "SUCCESS"
    assert top_acc["accountId"] in freeze_data["affectedAccounts"]

    # 4. Simulate Bank Response (Hackathon Demo Button)
    sim_resp = client.post(
        f"/api/v1/cases/{case_id}/actions/simulate-response",
        json={
            "account_ids": [top_acc["accountId"]],
            "simulate_status": "FROZEN",
            "frozen_percentage": 1.0,
        },
        headers=auth_headers,
    )
    assert sim_resp.status_code == 200, sim_resp.text
    sim_data = sim_resp.json()
    assert sim_data["status"] == "SUCCESS"
    assert sim_data["summary"]["totalFrozen"] > 0
    assert any(a["status"] == "FROZEN" for a in sim_data["actions"])

    # 5. Correct/Undo Action Status (Mistaken acknowledgement audit trail)
    patch_resp = client.patch(
        f"/api/v1/cases/{case_id}/actions/{top_acc['id']}",
        json={
            "status": "PARTIAL",
            "frozen_amount": 150000.0,
            "reason": "Bank nodal confirmed partial hold due to prior automated clearing debit",
        },
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200, patch_resp.text
    patch_data = patch_resp.json()
    assert patch_data["action"]["status"] == "PARTIAL"
    assert patch_data["action"]["frozenAmount"] == 150000.0

    # 6. Dispatch Statutory Notice
    notice_id = data["notices"][0]["id"]
    dispatch_resp = client.post(
        f"/api/v1/cases/{case_id}/actions/notices/{notice_id}/dispatch",
        headers=auth_headers,
    )
    assert dispatch_resp.status_code == 200, dispatch_resp.text
    dispatch_data = dispatch_resp.json()
    assert dispatch_data["notice"]["status"] == "SENT"
