"""Batch §106/§107 BNSS bank notices and their acknowledgement trail.

Records live in case.metadata_json["freeze_notices"]; cases that exist only as uploaded evidence (no SQL case row)
keep them in a small SQLite file beside the ingestion jobs, with a hash-chained log. Amounts to freeze are derived on
the client from the case bundle (single source of truth); the only money stored is what a bank reports it actually froze.
"""
from __future__ import annotations

import hashlib
import json
import sqlite3
import time
import uuid
from contextlib import closing
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.database.models import AuditEventModel
from app.domain.auth import UserIdentity
from app.repositories.unit_of_work import UnitOfWork
from app.services.auth_service import AuthService, get_current_user
from app.services.ingestion.large_evidence_engine import IngestionJobManager

router = APIRouter()

NoticeStatus = Literal["SENT", "ACKNOWLEDGED", "FROZEN", "RELEASED", "REFUSED"]
# Allowed forward moves; a bank may freeze or refuse without a separate acknowledgement,
# and a frozen account can later be released on magistrate order or settlement.
TRANSITIONS: Dict[str, set] = {
    "SENT": {"ACKNOWLEDGED", "FROZEN", "REFUSED"},
    "ACKNOWLEDGED": {"FROZEN", "REFUSED"},
    "FROZEN": {"RELEASED"},
    "RELEASED": set(),
    "REFUSED": set(),
}
STAMP = {"ACKNOWLEDGED": "acknowledgedAt", "FROZEN": "frozenAt", "RELEASED": "releasedAt", "REFUSED": "refusedAt"}


class NoticeDraft(BaseModel):
    bank: str = Field(..., min_length=1, max_length=120)
    ifscPrefix: str = Field(..., min_length=1, max_length=11)
    sections: List[str] = Field(..., min_length=1, max_length=4)
    accountIds: List[str] = Field(..., min_length=1, max_length=200)
    referenceNo: str = Field(..., min_length=1, max_length=120)
    networkId: str | None = Field(None, max_length=120)


class IssueNoticesRequest(BaseModel):
    notices: List[NoticeDraft] = Field(..., min_length=1, max_length=100)


class NoticeStatusRequest(BaseModel):
    status: NoticeStatus
    # What the bank says it actually froze (may be less than asked); only with FROZEN.
    frozenInr: float | None = Field(None, ge=0, le=1e12)
    note: str | None = Field(None, max_length=500)


_SCHEMA = """
CREATE TABLE IF NOT EXISTS freeze_notices (case_id TEXT PRIMARY KEY, notices_json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS freeze_notices_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT, actor TEXT, at REAL, action TEXT, details_json TEXT,
  prev_hash TEXT, hash TEXT);
"""


class UploadNoticeStore:
    """Notices for upload-only cases. shortcut: one SQLite file, single backend process; move to the main DB for multi-node."""

    def __init__(self, base_dir):
        self.path = base_dir / "freeze_notices.sqlite"
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript(_SCHEMA)

    def get(self, case_id: str) -> List[Dict[str, Any]]:
        with closing(sqlite3.connect(self.path)) as db:
            row = db.execute("SELECT notices_json FROM freeze_notices WHERE case_id = ?", (case_id,)).fetchone()
        return json.loads(row[0]) if row else []

    def put(self, case_id: str, notices: List[Dict[str, Any]], actor: str, action: str, details: Dict[str, Any]) -> None:
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute("INSERT INTO freeze_notices VALUES (?, ?) ON CONFLICT(case_id) DO UPDATE SET notices_json = excluded.notices_json",
                       (case_id, json.dumps(notices)))
            prev = db.execute("SELECT hash FROM freeze_notices_log WHERE case_id = ? ORDER BY seq DESC LIMIT 1", (case_id,)).fetchone()
            prev_hash = prev[0] if prev else ""
            body = json.dumps({"case_id": case_id, "actor": actor, "action": action, "details": details}, sort_keys=True)
            db.execute("INSERT INTO freeze_notices_log (case_id, actor, at, action, details_json, prev_hash, hash) VALUES (?,?,?,?,?,?,?)",
                       (case_id, actor, time.time(), action, json.dumps(details), prev_hash,
                        hashlib.sha256((prev_hash + body).encode("utf-8")).hexdigest()))


def _upload_store() -> UploadNoticeStore:
    return UploadNoticeStore(IngestionJobManager.get_instance().base_dir)


def _is_upload_case(case_id: str) -> bool:
    return bool(IngestionJobManager.get_instance().list_jobs({case_id}))


class _Notices:
    """Load / save a case's notices from whichever store holds the case."""

    def __init__(self, uow: UnitOfWork, case_id: str, user: UserIdentity):
        self.uow, self.case_id, self.user, self.case = uow, case_id, user, None

    async def load(self) -> List[Dict[str, Any]]:
        self.case = await self.uow.cases.get(self.case_id) or await self.uow.cases.get_by_case_number(self.case_id)
        if self.case:
            self.case_id = self.case.id
            return [dict(n) for n in (self.case.metadata_json or {}).get("freeze_notices", [])]
        if not _is_upload_case(self.case_id):
            raise HTTPException(status_code=404, detail=f"Case '{self.case_id}' not found.")
        return _upload_store().get(self.case_id)

    async def save(self, notices: List[Dict[str, Any]], action: str, resource_id: str, details: Dict[str, Any]) -> None:
        if self.case is None:
            _upload_store().put(self.case_id, notices, self.user.user_id, action, details)
            return
        meta = dict(self.case.metadata_json or {})
        meta["freeze_notices"] = notices
        self.case.metadata_json = meta
        self.case.updated_at = datetime.now(timezone.utc)
        await _audit(self.uow, self.case.id, self.user, action, resource_id, details)
        await self.uow.commit()


async def _audit(uow: UnitOfWork, case_id: str, user: UserIdentity, action: str, resource_id: str, details: Dict[str, Any]) -> None:
    payload_hash = hashlib.sha256(json.dumps(details, sort_keys=True).encode("utf-8")).hexdigest()
    await uow.audit.append_event(AuditEventModel(
        event_id=f"AUD-{case_id}-{action}-{uuid.uuid4().hex[:12]}",
        case_id=case_id,
        actor_id=user.user_id,
        action=action,
        resource_type="FREEZE_NOTICE",
        resource_id=resource_id,
        payload_hash=payload_hash,
        details_json=details,
    ))


@router.get("/{case_id}/freeze-notices")
async def list_freeze_notices(case_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    AuthService.get_instance().enforce_case_access(user, case_id)
    async with UnitOfWork() as uow:
        store = _Notices(uow, case_id, user)
        notices = await store.load()
        return {"caseId": store.case_id, "notices": notices}


@router.post("/{case_id}/freeze-notices")
async def issue_freeze_notices(case_id: str, payload: IssueNoticesRequest, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    AuthService.get_instance().enforce_case_access(user, case_id)
    async with UnitOfWork() as uow:
        store = _Notices(uow, case_id, user)
        notices = await store.load()
        now = datetime.now(timezone.utc).isoformat()
        created = []
        for d in payload.notices:
            rec = {
                "id": f"FN-{uuid.uuid4().hex[:10].upper()}",
                **d.model_dump(),
                "status": "SENT",
                "sentAt": now,
                "acknowledgedAt": None,
                "frozenAt": None,
                "releasedAt": None,
                "refusedAt": None,
                "frozenInr": None,
                "note": None,
                "reminders": [],
                "issuedBy": user.user_id,
            }
            notices.append(rec)
            created.append(rec)
        await store.save(notices, "FREEZE_NOTICES_ISSUED", store.case_id,
                         {"notices": [{"id": n["id"], "bank": n["bank"], "accountIds": n["accountIds"]} for n in created]})
        try:
            from app.services.ingestion.large_evidence_engine import IngestionJobManager
            from app.services.ingestion.ncrp_complaints import NcrpComplaintStore
            NcrpComplaintStore(IngestionJobManager.get_instance().base_dir).mark_golden_step(store.case_id, "freeze_drafted_at")
        except Exception:
            pass
        return {"caseId": store.case_id, "created": created, "notices": notices}


def _find(notices: List[Dict[str, Any]], notice_id: str) -> Dict[str, Any]:
    target = next((n for n in notices if n["id"] == notice_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Notice '{notice_id}' not found.")
    return target


@router.patch("/{case_id}/freeze-notices/{notice_id}")
async def update_freeze_notice(case_id: str, notice_id: str, payload: NoticeStatusRequest, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    AuthService.get_instance().enforce_case_access(user, case_id)
    if payload.frozenInr is not None and payload.status != "FROZEN":
        raise HTTPException(status_code=422, detail="An amount frozen can only be recorded with status FROZEN.")
    async with UnitOfWork() as uow:
        store = _Notices(uow, case_id, user)
        notices = await store.load()
        target = _find(notices, notice_id)
        before = target["status"]
        if payload.status not in TRANSITIONS.get(before, set()):
            raise HTTPException(status_code=409, detail=f"Cannot move a notice from {before} to {payload.status}.")
        target["status"] = payload.status
        target[STAMP[payload.status]] = datetime.now(timezone.utc).isoformat()
        if payload.frozenInr is not None:
            target["frozenInr"] = payload.frozenInr
        if payload.note is not None and payload.note.strip():
            target["note"] = payload.note.strip()
        await store.save(notices, "FREEZE_NOTICE_STATUS", notice_id,
                         {"notice_id": notice_id, "before": before, "after": payload.status, "frozenInr": payload.frozenInr, "note": target.get("note")})
        return {"caseId": store.case_id, "notice": target, "notices": notices}


@router.post("/{case_id}/freeze-notices/{notice_id}/reminders")
async def remind_freeze_notice(case_id: str, notice_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Record that a reminder went to a bank that has not answered yet."""
    AuthService.get_instance().enforce_case_access(user, case_id)
    async with UnitOfWork() as uow:
        store = _Notices(uow, case_id, user)
        notices = await store.load()
        target = _find(notices, notice_id)
        if target["status"] not in ("SENT", "ACKNOWLEDGED"):
            raise HTTPException(status_code=409, detail="This bank has already answered; no reminder needed.")
        target["reminders"] = [*target.get("reminders", []), datetime.now(timezone.utc).isoformat()]
        await store.save(notices, "FREEZE_NOTICE_REMINDER", notice_id, {"notice_id": notice_id, "reminder": len(target["reminders"])})
        return {"caseId": store.case_id, "notice": target, "notices": notices}
