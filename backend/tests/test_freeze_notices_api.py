import uuid

import pytest
from fastapi.testclient import TestClient

from app.domain.auth import CaseAccessScope, UserIdentity, UserRoleEnum
from app.main import app
from app.services.auth_service import AuthService


@pytest.fixture
def auth_headers():
    svc = AuthService.get_instance()
    svc.register_synthetic_identity("FREEZE_NOTICE_TESTER", UserIdentity(
        user_id="usr-freeze-notice", display_name="Inspector Notices", role=UserRoleEnum.INVESTIGATOR,
        scope=CaseAccessScope(allowed_cases=["*"], jurisdictions=["National"]),
    ))
    return {"Authorization": f"Bearer {svc.create_jwt_token('FREEZE_NOTICE_TESTER')}"}


def test_freeze_notice_lifecycle(auth_headers):
    client = TestClient(app)
    res = client.post("/api/v1/cases", json={"case_number": f"CASE-FN-{uuid.uuid4().hex[:6].upper()}", "title": "Notice test", "crime_type": "UPI_FRAUD"}, headers=auth_headers)
    assert res.status_code == 200, res.text
    case_id = res.json()["id"]
    base = f"/api/v1/cases/{case_id}/freeze-notices"

    assert client.get(base, headers=auth_headers).json()["notices"] == []

    draft = {"bank": "Axis Bank", "ifscPrefix": "UTIB", "sections": ["106"], "accountIds": ["M1"], "referenceNo": "REF-1"}
    res = client.post(base, json={"notices": [draft, {**draft, "bank": "SBI", "ifscPrefix": "SBIN"}]}, headers=auth_headers)
    assert res.status_code == 200, res.text
    created = res.json()["created"]
    assert [n["status"] for n in created] == ["SENT", "SENT"] and created[0]["sentAt"]

    nid = created[0]["id"]
    res = client.patch(f"{base}/{nid}", json={"status": "ACKNOWLEDGED"}, headers=auth_headers)
    assert res.status_code == 200 and res.json()["notice"]["acknowledgedAt"]
    res = client.patch(f"{base}/{nid}", json={"status": "FROZEN"}, headers=auth_headers)
    assert res.json()["notice"]["frozenAt"]
    # Terminal: no going back.
    assert client.patch(f"{base}/{nid}", json={"status": "ACKNOWLEDGED"}, headers=auth_headers).status_code == 409
    assert client.patch(f"{base}/nope", json={"status": "FROZEN"}, headers=auth_headers).status_code == 404

    notices = client.get(base, headers=auth_headers).json()["notices"]
    assert {n["status"] for n in notices} == {"FROZEN", "SENT"}


def test_upload_only_case_notices_frozen_amount_and_reminders(tmp_path, monkeypatch):
    from app.api import freeze_notices_api as fn
    monkeypatch.setattr(fn, "_is_upload_case", lambda cid: cid == "CASE-UPLOAD-ONLY-1")
    monkeypatch.setattr(fn, "_upload_store", lambda: fn.UploadNoticeStore(tmp_path))
    svc = AuthService.get_instance()
    svc.register_synthetic_identity("FREEZE_UPLOAD_TESTER", UserIdentity(
        user_id="usr-freeze-upload", display_name="Inspector Uploads", role=UserRoleEnum.INVESTIGATOR,
        scope=CaseAccessScope(allowed_cases=["CASE-UPLOAD-ONLY-1", "CASE-NO-SUCH-9"], jurisdictions=["National"]),
    ))
    auth_headers = {"Authorization": f"Bearer {svc.create_jwt_token('FREEZE_UPLOAD_TESTER')}"}
    client = TestClient(app)
    base = "/api/v1/cases/CASE-UPLOAD-ONLY-1/freeze-notices"
    assert client.get(base, headers=auth_headers).json()["notices"] == []
    assert client.get("/api/v1/cases/CASE-NO-SUCH-9/freeze-notices", headers=auth_headers).status_code == 404

    draft = {"bank": "UPI handle @ybl (bank not known)", "ifscPrefix": "@ybl", "sections": ["107"],
             "accountIds": ["a@ybl"], "referenceNo": "R-1", "networkId": "NET-1"}
    nid = client.post(base, json={"notices": [draft]}, headers=auth_headers).json()["created"][0]["id"]

    r = client.post(f"{base}/{nid}/reminders", headers=auth_headers)
    assert r.status_code == 200 and len(r.json()["notice"]["reminders"]) == 1
    assert client.patch(f"{base}/{nid}", json={"status": "ACKNOWLEDGED", "frozenInr": 5}, headers=auth_headers).status_code == 422
    n = client.patch(f"{base}/{nid}", json={"status": "FROZEN", "frozenInr": 1200.5}, headers=auth_headers).json()["notice"]
    assert n["frozenInr"] == 1200.5 and n["networkId"] == "NET-1"
    assert client.post(f"{base}/{nid}/reminders", headers=auth_headers).status_code == 409
    # persisted, and every change is in the hash-chained log
    assert client.get(base, headers=auth_headers).json()["notices"][0]["status"] == "FROZEN"
    import sqlite3
    with sqlite3.connect(tmp_path / "freeze_notices.sqlite") as db:
        rows = db.execute("SELECT prev_hash, hash FROM freeze_notices_log ORDER BY seq").fetchall()
    assert len(rows) == 3 and all(rows[i][0] == rows[i - 1][1] for i in range(1, 3))
