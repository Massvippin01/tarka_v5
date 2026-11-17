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
        user_id="usr-lifecycle-tester",
        display_name="Inspector Lifecycle",
        role=UserRoleEnum.INVESTIGATOR,
        scope=CaseAccessScope(
            allowed_cases=["*"],
            jurisdictions=["National"],
        ),
    )
    auth_service.register_synthetic_identity("LIFECYCLE_TESTER", user)
    token = auth_service.create_jwt_token("LIFECYCLE_TESTER")
    return {"Authorization": f"Bearer {token}"}


def test_case_lifecycle_crud_and_status_transitions(auth_headers):
    client = TestClient(app)
    uid = uuid.uuid4().hex[:6].upper()
    c_num = f"TEST-LIFE-{uid}"

    # 1. Create a DRAFT case
    create_payload = {
        "case_number": c_num,
        "title": "Suspected Investment Scam",
        "fir_number": f"FIR #{uid}/2026",
        "crime_type": "INVESTMENT_SCAM",
        "typology": "INVESTMENT_SCAM",
        "priority": "P2_HIGH",
        "status": "DRAFT",
        "police_station": "Noida Cyber Crime PS, UP",
        "assigned_io": "Insp. Lifecycle",
        "claimed_loss_inr": 450000.0,
        "booked_loss_inr": 450000.0,
        "tags": ["CRYPTO", "TELEGRAM"],
    }
    res_create = client.post("/api/v1/cases", json=create_payload, headers=auth_headers)
    assert res_create.status_code == 200, res_create.text
    case_data = res_create.json()
    case_id = case_data["id"]
    assert case_id == f"CASE-{c_num}"
    assert case_data["status"] == "DRAFT"
    assert case_data["typology"] == "INVESTMENT_SCAM"
    assert case_data["assigned_io"] == "Insp. Lifecycle"
    assert case_data["booked_loss_inr"] == 450000.0

    # 2. Patch case (partial update)
    res_patch = client.patch(
        f"/api/v1/cases/{case_id}",
        json={"title": "Updated Investment Scam Title", "booked_loss_inr": 500000.0, "priority": "P1_CRITICAL"},
        headers=auth_headers,
    )
    assert res_patch.status_code == 200
    patched_data = res_patch.json()
    assert patched_data["title"] == "Updated Investment Scam Title"
    assert patched_data["booked_loss_inr"] == 500000.0
    assert patched_data["priority"] == "P1_CRITICAL"

    # 3. Test Invalid Transition (DRAFT -> COURT_READY is prohibited)
    res_invalid_trans = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "COURT_READY"},
        headers=auth_headers,
    )
    assert res_invalid_trans.status_code == 409
    assert "Invalid lifecycle transition" in res_invalid_trans.json()["detail"]

    # 4. Valid Transitions: DRAFT -> INTAKE -> INVESTIGATING -> ACTION_PENDING
    res_intake = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "INTAKE", "reason": "FIR verified and registered"},
        headers=auth_headers,
    )
    assert res_intake.status_code == 200
    assert res_intake.json()["status"] == "INTAKE"

    res_invest = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "INVESTIGATING", "reason": "Assigned to team for mule trail tracing"},
        headers=auth_headers,
    )
    assert res_invest.status_code == 200
    assert res_invest.json()["status"] == "INVESTIGATING"

    res_action = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "ACTION_PENDING", "reason": "Identified 3 mule accounts, freeze required"},
        headers=auth_headers,
    )
    assert res_action.status_code == 200
    assert res_action.json()["status"] == "ACTION_PENDING"

    # 5. Transition to FROZEN then COURT_READY
    res_frozen = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "FROZEN", "reason": "Debit freeze achieved on Axis and HDFC accounts"},
        headers=auth_headers,
    )
    assert res_frozen.status_code == 200
    assert res_frozen.json()["status"] == "FROZEN"

    res_court = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "COURT_READY", "reason": "Dossier and BSA §63 certificates generated"},
        headers=auth_headers,
    )
    assert res_court.status_code == 200
    assert res_court.json()["status"] == "COURT_READY"

    # 6. Close case requires reason or checklist
    res_close_fail = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={"status": "CLOSED"},
        headers=auth_headers,
    )
    assert res_close_fail.status_code == 400

    res_close = client.post(
        f"/api/v1/cases/{case_id}/status",
        json={
            "status": "CLOSED",
            "reason": "Court chargesheet filed under BNS §318(4) and §316(2)",
            "closure_checklist": {"chargesheet_filed": True, "recovered_inr": 380000},
        },
        headers=auth_headers,
    )
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "CLOSED"
    assert res_close.json()["closed_at"] is not None

    # 7. Archive case (read-only)
    res_archive = client.post(f"/api/v1/cases/{case_id}/archive", headers=auth_headers)
    assert res_archive.status_code == 200
    assert res_archive.json()["status"] == "ARCHIVED"
    assert res_archive.json()["archived_at"] is not None

    # Verify mutations are disabled when archived
    res_patch_archived = client.patch(
        f"/api/v1/cases/{case_id}",
        json={"title": "Should fail when archived"},
        headers=auth_headers,
    )
    assert res_patch_archived.status_code == 400
    assert "read-only" in res_patch_archived.json()["detail"].lower()

    # 8. Restore case
    res_restore = client.post(f"/api/v1/cases/{case_id}/restore", headers=auth_headers)
    assert res_restore.status_code == 200
    restored = res_restore.json()
    assert restored["status"] == "CLOSED"
    assert restored["archived_at"] is None

    # 9. Audit trail verification
    res_audit = client.get(f"/api/v1/cases/{case_id}/audit", headers=auth_headers)
    assert res_audit.status_code == 200
    audit_events = res_audit.json()
    assert len(audit_events) >= 5
    actions = [e["action"] for e in audit_events]
    assert "CREATE_CASE_WORKSPACE" in actions
    assert "UPDATE_CASE" in actions
    assert "CASE_STATUS_CHANGE" in actions
    assert "CASE_ARCHIVED" in actions
    assert "CASE_RESTORED" in actions
    # Real SHA-256 (64 hex characters)
    for event in audit_events:
        assert len(event["payload_hash"]) == 64


def test_draft_case_deletion_rules(auth_headers):
    client = TestClient(app)
    uid = uuid.uuid4().hex[:6].upper()

    # 1. Create a DRAFT case
    res = client.post(
        "/api/v1/cases",
        json={"case_number": f"DRAFT-{uid}", "title": "Draft Case to Delete", "status": "DRAFT"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    draft_id = res.json()["id"]

    # 2. Delete empty DRAFT case succeeds
    res_del = client.delete(f"/api/v1/cases/{draft_id}", headers=auth_headers)
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # Confirm it is deleted
    res_get = client.get(f"/api/v1/cases/{draft_id}", headers=auth_headers)
    assert res_get.status_code == 404

    # 3. Create a non-DRAFT case and verify deletion returns 409
    res_active = client.post(
        "/api/v1/cases",
        json={"case_number": f"ACTIVE-{uid}", "title": "Active Case Cannot Delete", "status": "INTAKE"},
        headers=auth_headers,
    )
    assert res_active.status_code == 200
    active_id = res_active.json()["id"]

    res_del_active = client.delete(f"/api/v1/cases/{active_id}", headers=auth_headers)
    assert res_del_active.status_code == 409
    assert "Only DRAFT cases can be deleted" in res_del_active.json()["detail"]


def test_case_linking_and_filtering(auth_headers):
    client = TestClient(app)
    uid = uuid.uuid4().hex[:6].upper()

    # 1. Create two cases
    res1 = client.post(
        "/api/v1/cases",
        json={"case_number": f"LINK1-{uid}", "title": f"Mule Ring Alpha {uid}", "crime_type": "DIGITAL_ARREST"},
        headers=auth_headers,
    )
    res2 = client.post(
        "/api/v1/cases",
        json={"case_number": f"LINK2-{uid}", "title": f"Mule Ring Beta {uid}", "crime_type": "INVESTMENT_SCAM"},
        headers=auth_headers,
    )
    assert res1.status_code == 200 and res2.status_code == 200
    case1_id = res1.json()["id"]
    case2_id = res2.json()["id"]

    # 2. Link case 1 to case 2
    res_link = client.post(
        f"/api/v1/cases/{case1_id}/links",
        json={"target_case_id": case2_id, "link_type": "SYNDICATE_OVERLAP", "notes": "Shared Layer 2 mule account"},
        headers=auth_headers,
    )
    assert res_link.status_code == 200
    links = res_link.json()["syndicate_links"]
    assert any(l["target_case_id"] == case2_id for l in links)

    # Check bidirectional link on case 2
    res_get2 = client.get(f"/api/v1/cases/{case2_id}", headers=auth_headers)
    assert res_get2.status_code == 200
    target_links = res_get2.json()["syndicate_links"]
    assert any(l["target_case_id"] == case1_id for l in target_links)

    # 3. Test filtering GET /cases
    res_filtered = client.get(f"/api/v1/cases?q=Alpha+{uid}", headers=auth_headers)
    assert res_filtered.status_code == 200
    items = res_filtered.json()
    assert any(c["id"] == case1_id for c in items)
    assert not any(c["id"] == case2_id for c in items)
