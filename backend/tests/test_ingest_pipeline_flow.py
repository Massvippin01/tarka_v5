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
        user_id="usr-pipeline-tester",
        display_name="Inspector Ingest",
        role=UserRoleEnum.INVESTIGATOR,
        scope=CaseAccessScope(
            allowed_cases=["*"],
            jurisdictions=["National"],
        ),
    )
    auth_service.register_synthetic_identity("PIPELINE_TESTER", user)
    token = auth_service.create_jwt_token("PIPELINE_TESTER")
    return {"Authorization": f"Bearer {token}"}


def test_evidence_manager_and_pipeline_lifecycle(auth_headers):
    client = TestClient(app)
    uid = uuid.uuid4().hex[:6].upper()
    c_num = f"PIPE-{uid}"

    # 1. Create a case
    res_case = client.post(
        "/api/v1/cases",
        json={"case_number": c_num, "title": "Pipeline Test Case", "crime_type": "DIGITAL_ARREST"},
        headers=auth_headers,
    )
    assert res_case.status_code == 200
    case_id = res_case.json()["id"]

    # 2. Check initial pipeline status
    res_status = client.get(f"/api/v1/cases/{case_id}/pipeline-status", headers=auth_headers)
    assert res_status.status_code == 200
    p_status = res_status.json()
    assert p_status["caseId"] == case_id
    assert p_status["status"] in ["IDLE", "COMPLETED"]

    # 3. Ingest an evidence artifact
    art_payload = {
        "id": f"ART-{uid}-001",
        "filename": "sbi_victim_statement.csv",
        "vectorType": "CBS_LEDGER",
        "tier": "TIER_1_CERTIFIED",
        "byteSize": 14200,
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "bip39Words": ["shield", "verdict", "alpha", "ledger", "track", "safe"],
        "ingestedAtIst": "2026-09-22 09:30:00 IST",
        "custodianNode": "SBI Nodal Core Banking",
        "gateStatus": "PASS",
        "gateDetail": "Exact balance conservation across 14 rows",
    }
    res_art = client.post(f"/api/v1/cases/{case_id}/artifacts", json=art_payload, headers=auth_headers)
    assert res_art.status_code == 200
    assert res_art.json()["success"] is True

    # 4. List artifacts
    res_list = client.get(f"/api/v1/cases/{case_id}/artifacts", headers=auth_headers)
    assert res_list.status_code == 200
    arts = res_list.json()
    assert any(a["id"] == f"ART-{uid}-001" for a in arts)

    # 5. Preview artifact
    res_prev = client.get(f"/api/v1/cases/{case_id}/artifacts/ART-{uid}-001/preview", headers=auth_headers)
    assert res_prev.status_code == 200
    prev_data = res_prev.json()
    assert prev_data["filename"] == "sbi_victim_statement.csv"
    assert prev_data["format"] == "tabular"
    assert len(prev_data["rows"]) >= 1

    # 6. Retry / run pipeline
    res_retry = client.post(f"/api/v1/cases/{case_id}/pipeline/retry", headers=auth_headers)
    assert res_retry.status_code == 200
    retry_data = res_retry.json()
    assert retry_data["status"] == "COMPLETED"

    # 7. Check updated pipeline status
    res_status2 = client.get(f"/api/v1/cases/{case_id}/pipeline-status", headers=auth_headers)
    assert res_status2.status_code == 200
    assert res_status2.json()["status"] == "COMPLETED"

    # 8. Soft remove artifact with reason
    res_del_art = client.delete(
        f"/api/v1/cases/{case_id}/artifacts/ART-{uid}-001?reason=Uploaded+incorrect+month",
        headers=auth_headers,
    )
    assert res_del_art.status_code == 200
    assert res_del_art.json()["success"] is True

    # Confirm it is no longer listed
    res_list2 = client.get(f"/api/v1/cases/{case_id}/artifacts", headers=auth_headers)
    assert not any(a["id"] == f"ART-{uid}-001" for a in res_list2.json())

