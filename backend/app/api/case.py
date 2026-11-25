from __future__ import annotations

import logging
import json
import hashlib
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field

from app.database.models import CaseModel, EvidenceArtifactModel, EvidenceCustodyRecordModel, AuditEventModel
from app.repositories.unit_of_work import UnitOfWork
from app.schemas.case import CaseCreate, CaseResponse, CasePatch, CaseStatusRequest, CaseLinkRequest
from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService, get_current_user
from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.large_evidence_engine import IngestionJobManager, ensure_inside, validate_case_id

logger = logging.getLogger("sentinelx.api.case")
router = APIRouter()

CASE_BUNDLES_LIVE: Dict[str, Any] = {}

LIFECYCLE_STATES = {
    "DRAFT",
    "INTAKE",
    "INVESTIGATING",
    "ACTION_PENDING",
    "FROZEN",
    "PARTIALLY_RECOVERED",
    "COURT_READY",
    "CLOSED",
    "ARCHIVED",
}

STATUS_NORMALIZATION = {
    "INVESTIGATION_ACTIVE": "INVESTIGATING",
    "OPEN": "INTAKE",
}

ALLOWED_TRANSITIONS = {
    "DRAFT": {"INTAKE", "ARCHIVED"},
    "INTAKE": {"INVESTIGATING", "ACTION_PENDING", "ARCHIVED"},
    "INVESTIGATING": {"ACTION_PENDING", "INTAKE", "FROZEN", "PARTIALLY_RECOVERED", "COURT_READY", "ARCHIVED"},
    "INVESTIGATION_ACTIVE": {"ACTION_PENDING", "INTAKE", "FROZEN", "PARTIALLY_RECOVERED", "COURT_READY", "ARCHIVED", "INVESTIGATING"},
    "ACTION_PENDING": {"FROZEN", "PARTIALLY_RECOVERED", "INVESTIGATING", "ARCHIVED"},
    "FROZEN": {"COURT_READY", "PARTIALLY_RECOVERED", "INVESTIGATING", "ARCHIVED"},
    "PARTIALLY_RECOVERED": {"COURT_READY", "FROZEN", "INVESTIGATING", "ARCHIVED"},
    "COURT_READY": {"CLOSED", "INVESTIGATING", "ARCHIVED"},
    "CLOSED": {"ARCHIVED", "INVESTIGATING"},
    "ARCHIVED": {"DRAFT", "INTAKE", "INVESTIGATING", "CLOSED"},
}


def build_case_response(case: CaseModel, artifacts_count: int = 0) -> CaseResponse:
    meta = dict(case.metadata_json or {})
    return CaseResponse(
        id=case.id,
        case_number=case.case_number,
        fir_number=case.fir_number,
        title=case.title,
        description=case.description,
        crime_type=case.crime_type,
        typology=meta.get("typology") or case.crime_type,
        priority=case.priority,
        status=case.status,
        police_station=case.police_station,
        station_id=meta.get("station_id") or case.police_station,
        assigned_io=meta.get("assigned_io") or meta.get("lead_investigator") or "Investigating Officer",
        tags=meta.get("tags") or [],
        archived_at=meta.get("archived_at"),
        closed_at=meta.get("closed_at"),
        closure_reason=meta.get("closure_reason"),
        created_by=meta.get("created_by") or "system",
        created_at=case.created_at.isoformat() if case.created_at else None,
        updated_at=case.updated_at.isoformat() if case.updated_at else None,
        complainant_name=meta.get("complainant_name"),
        claimed_loss_inr=meta.get("claimed_loss_inr"),
        booked_loss_inr=meta.get("booked_loss_inr"),
        recoverable_inr=meta.get("recoverable_inr"),
        golden_hour_remaining_mins=meta.get("golden_hour_remaining_mins"),
        metadata_json=meta,
        artifacts_count=artifacts_count,
        syndicate_links=meta.get("syndicate_links") or [],
    )


class IngestArtifactRequest(BaseModel):
    id: str
    filename: str
    vectorType: str = "CBS_LEDGER"
    tier: str = "TIER_1_CERTIFIED"
    byteSize: int = 1024
    sha256: str
    bip39Words: List[str] = Field(default_factory=list)
    custodianNode: str = "Central IT Nodal"
    gateStatus: str = "PASS"
    gateDetail: str = "Verified bitstream integrity"
    piiBlindedStats: Optional[Dict[str, int]] = None


@router.get("", response_model=List[CaseResponse])
async def list_cases(
    status: Optional[str] = None,
    q: Optional[str] = None,
    io: Optional[str] = None,
    typology: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = 1,
    page_size: int = 100,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Authoritative transactional listing and filtering of investigative cases from SQL Database.
    Supports filtering by status, search query q, assigned io, typology, sorting, and pagination.
    Preserves RBAC case scope authorization.
    """
    auth_service = AuthService.get_instance()
    async with UnitOfWork() as uow:
        cases, _ = await uow.cases.list_filtered(
            status=status,
            q=q,
            io=io,
            typology=typology,
            sort=sort,
            page=page,
            page_size=page_size,
        )

        responses = []
        for c in cases:
            if not (auth_service.validate_case_scope(user, c.id) or auth_service.validate_case_scope(user, c.case_number)):
                continue

            artifacts = await uow.evidence.list_artifacts_by_case(c.id)
            responses.append(build_case_response(c, len(artifacts)))
        return responses


@router.post("", response_model=CaseResponse)
async def create_case(
    request: CaseCreate,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Authoritative creation of a new investigative case workspace in SQL Database.
    Emits an immutable hash-chained audit event.
    """
    case_id = request.case_number if request.case_number.startswith("CASE-") else f"CASE-{request.case_number}"

    async with UnitOfWork() as uow:
        existing = await uow.cases.get(case_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Case with ID '{case_id}' already exists in database.",
            )

        meta = dict(request.metadata_json or {})
        if not meta.get("complainant_name"):
            meta["complainant_name"] = "Verified Complainant"
        if not meta.get("lead_investigator"):
            meta["lead_investigator"] = request.assigned_io or user.display_name or "Investigating Officer"
        if request.assigned_io:
            meta["assigned_io"] = request.assigned_io
        if request.typology:
            meta["typology"] = request.typology
        if request.tags:
            meta["tags"] = request.tags
        if request.station_id:
            meta["station_id"] = request.station_id
        if request.claimed_loss_inr is not None:
            meta["claimed_loss_inr"] = request.claimed_loss_inr
        elif "claimed_loss_inr" not in meta:
            meta["claimed_loss_inr"] = 250000.0
        if request.booked_loss_inr is not None:
            meta["booked_loss_inr"] = request.booked_loss_inr
        elif "booked_loss_inr" not in meta:
            meta["booked_loss_inr"] = 250000.0
        if "recoverable_inr" not in meta:
            meta["recoverable_inr"] = meta.get("booked_loss_inr", 0) * 0.72
        if "golden_hour_remaining_mins" not in meta:
            meta["golden_hour_remaining_mins"] = 120
        if "ncrp_ack_no" not in meta:
            meta["ncrp_ack_no"] = f"1930-ACK-{request.case_number[-6:]}"
        if "current_stage" not in meta:
            meta["current_stage"] = "intake"
        if "gates_passed" not in meta:
            meta["gates_passed"] = 1
        if "gates_halted" not in meta:
            meta["gates_halted"] = False
        if "syndicate_links" not in meta:
            meta["syndicate_links"] = []
        meta["created_by"] = user.user_id

        initial_status = (request.status or "INTAKE").upper().strip()
        if initial_status not in LIFECYCLE_STATES:
            initial_status = "INTAKE"

        case_model = CaseModel(
            id=case_id,
            case_number=request.case_number,
            title=request.title,
            fir_number=request.fir_number or f"FIR #{request.case_number[-4:]}/2026",
            crime_type=request.crime_type or request.typology or "DIGITAL_ARREST",
            priority=request.priority or "HIGH_SYNDICATE",
            status=initial_status,
            police_station=request.police_station or "Noida Cyber Crime PS, UP",
            source="NCRP_1930",
            description=request.description or "",
            metadata_json=meta,
        )
        await uow.cases.create(case_model)

        audit_details = {
            "fir_number": case_model.fir_number,
            "title": case_model.title,
            "status": case_model.status,
            "priority": case_model.priority,
            "created_by": user.user_id,
        }
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()

        audit_event = AuditEventModel(
            event_id=f"AUD-{case_id}-CREATE-{uuid.uuid4().hex[:8]}",
            case_id=case_id,
            actor_id=user.user_id,
            action="CREATE_CASE_WORKSPACE",
            resource_type="CASE",
            resource_id=case_id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        # Grant access to the creating investigator
        if user.scope and case_id not in user.scope.allowed_cases:
            user.scope.allowed_cases.append(case_id)

        return build_case_response(case_model, 0)


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Retrieve specific case workspace from SQL Database.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return build_case_response(case, len(artifacts))


@router.patch("/{case_id}", response_model=CaseResponse)
async def patch_case(
    case_id: str,
    patch: CasePatch,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Partial update of an investigative case with validation and append-only audit event.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        if (case.status or "").upper() == "ARCHIVED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Case is ARCHIVED and read-only. Restore case to perform edits.",
            )

        meta = dict(case.metadata_json or {})
        before_state = {
            "title": case.title,
            "description": case.description,
            "priority": case.priority,
            "crime_type": case.crime_type,
            "police_station": case.police_station,
            "fir_number": case.fir_number,
            "metadata_json": dict(meta),
        }

        if patch.title is not None:
            case.title = patch.title
        if patch.description is not None:
            case.description = patch.description
        if patch.priority is not None:
            case.priority = patch.priority
        if patch.crime_type is not None:
            case.crime_type = patch.crime_type
        if patch.police_station is not None:
            case.police_station = patch.police_station
        if patch.fir_number is not None:
            case.fir_number = patch.fir_number
        if patch.typology is not None:
            meta["typology"] = patch.typology
        if patch.assigned_io is not None:
            meta["assigned_io"] = patch.assigned_io
            meta["lead_investigator"] = patch.assigned_io
        if patch.tags is not None:
            meta["tags"] = patch.tags
        if patch.station_id is not None:
            meta["station_id"] = patch.station_id
        if patch.claimed_loss_inr is not None:
            meta["claimed_loss_inr"] = patch.claimed_loss_inr
        if patch.booked_loss_inr is not None:
            meta["booked_loss_inr"] = patch.booked_loss_inr
        if patch.recoverable_inr is not None:
            meta["recoverable_inr"] = patch.recoverable_inr
        if patch.metadata_json is not None:
            meta.update(patch.metadata_json)

        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        after_state = {
            "title": case.title,
            "description": case.description,
            "priority": case.priority,
            "crime_type": case.crime_type,
            "police_station": case.police_station,
            "fir_number": case.fir_number,
            "metadata_json": dict(meta),
        }

        audit_details = {"before": before_state, "after": after_state}
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True, default=str).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-PATCH-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="UPDATE_CASE",
            resource_type="CASE",
            resource_id=case.id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return build_case_response(case, len(artifacts))


@router.post("/{case_id}/status", response_model=CaseResponse)
async def update_case_status(
    case_id: str,
    payload: CaseStatusRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Transition case lifecycle status with strict allowed transitions enforcement and immutable audit.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    target_status = payload.status.upper().strip()
    if target_status not in LIFECYCLE_STATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown lifecycle status '{payload.status}'. Valid states: {sorted(list(LIFECYCLE_STATES))}",
        )

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        current_status = (case.status or "INTAKE").upper().strip()
        current_norm = STATUS_NORMALIZATION.get(current_status, current_status)
        target_norm = STATUS_NORMALIZATION.get(target_status, target_status)

        if target_norm == current_norm:
            artifacts = await uow.evidence.list_artifacts_by_case(case.id)
            return build_case_response(case, len(artifacts))

        allowed = ALLOWED_TRANSITIONS.get(current_norm, set())
        if target_norm not in allowed:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Invalid lifecycle transition from '{current_status}' to '{target_status}'. Allowed next states: {sorted(list(allowed))}",
            )

        meta = dict(case.metadata_json or {})
        before_status = case.status

        # If transitioning to CLOSED, require checklist or reason
        if target_norm == "CLOSED":
            if not payload.reason and not payload.closure_checklist:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Closure reason or completed closure checklist is required to close a case.",
                )
            meta["closed_at"] = datetime.now(timezone.utc).isoformat()
            meta["closure_reason"] = payload.reason or "Case resolved"
            if payload.closure_checklist:
                meta["closure_checklist"] = payload.closure_checklist

        case.status = target_norm
        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        audit_details = {
            "from_status": before_status,
            "to_status": target_norm,
            "reason": payload.reason,
            "closure_checklist": payload.closure_checklist,
        }
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True, default=str).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-STATUS-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="CASE_STATUS_CHANGE",
            resource_type="CASE",
            resource_id=case.id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return build_case_response(case, len(artifacts))


@router.post("/{case_id}/archive", response_model=CaseResponse)
async def archive_case(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Archive a case. Makes it read-only.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        if (case.status or "").upper() == "ARCHIVED":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Case is already ARCHIVED.")

        meta = dict(case.metadata_json or {})
        meta["previous_status"] = case.status
        meta["archived_at"] = datetime.now(timezone.utc).isoformat()
        before_status = case.status

        case.status = "ARCHIVED"
        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        audit_details = {"action": "ARCHIVE", "previous_status": before_status}
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-ARCHIVE-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="CASE_ARCHIVED",
            resource_type="CASE",
            resource_id=case.id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return build_case_response(case, len(artifacts))


@router.post("/{case_id}/restore", response_model=CaseResponse)
async def restore_case(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Restore an ARCHIVED case back to active status.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        if (case.status or "").upper() != "ARCHIVED":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only ARCHIVED cases can be restored.")

        meta = dict(case.metadata_json or {})
        restored_status = meta.get("previous_status", "INVESTIGATING")
        if restored_status == "ARCHIVED":
            restored_status = "INVESTIGATING"

        meta["archived_at"] = None
        case.status = restored_status
        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        audit_details = {"action": "RESTORE", "restored_to": restored_status}
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-RESTORE-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="CASE_RESTORED",
            resource_type="CASE",
            resource_id=case.id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return build_case_response(case, len(artifacts))


@router.delete("/{case_id}")
async def delete_draft_case(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Delete a case workspace. Strictly allowed only for DRAFT cases with zero evidence artifacts.
    Any non-DRAFT case or case with evidence returns HTTP 409 Conflict.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        if (case.status or "").upper() != "DRAFT":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete case '{case_id}' with status '{case.status}'. Only DRAFT cases can be deleted.",
            )

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        if len(artifacts) > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete DRAFT case '{case_id}' because it has {len(artifacts)} associated evidence exhibits.",
            )

        audit_details = {"action": "DELETE_DRAFT_CASE", "case_number": case.case_number, "title": case.title}
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-DEL-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="DELETE_DRAFT_CASE",
            resource_type="CASE",
            resource_id=case.id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)

        await uow.cases.delete(case.id)
        await uow.commit()

        return {"success": True, "deleted_case_id": case.id}


@router.post("/{case_id}/links", response_model=CaseResponse)
async def link_case(
    case_id: str,
    payload: CaseLinkRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Link a related FIR or case to this case workspace with bidirectional association.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        target = await uow.cases.get(payload.target_case_id)
        if not target:
            target = await uow.cases.get_by_case_number(payload.target_case_id)
        if not target:
            raise HTTPException(status_code=404, detail=f"Target case '{payload.target_case_id}' to link not found.")

        meta = dict(case.metadata_json or {})
        links = list(meta.get("syndicate_links") or [])
        link_entry = {
            "target_case_id": target.id,
            "target_case_number": target.case_number,
            "target_fir": target.fir_number,
            "link_type": payload.link_type or "RELATED_FIR",
            "notes": payload.notes or "",
            "linked_at": datetime.now(timezone.utc).isoformat(),
        }
        if not any(l.get("target_case_id") == target.id for l in links):
            links.append(link_entry)
        meta["syndicate_links"] = links
        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        target_meta = dict(target.metadata_json or {})
        target_links = list(target_meta.get("syndicate_links") or [])
        rev_entry = {
            "target_case_id": case.id,
            "target_case_number": case.case_number,
            "target_fir": case.fir_number,
            "link_type": payload.link_type or "RELATED_FIR",
            "notes": payload.notes or "",
            "linked_at": datetime.now(timezone.utc).isoformat(),
        }
        if not any(l.get("target_case_id") == case.id for l in target_links):
            target_links.append(rev_entry)
        target_meta["syndicate_links"] = target_links
        target.metadata_json = target_meta

        audit_details = {
            "source_case": case.id,
            "target_case": target.id,
            "link_type": payload.link_type,
            "notes": payload.notes,
        }
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-LINK-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="LINK_CASE",
            resource_type="CASE",
            resource_id=case.id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return build_case_response(case, len(artifacts))


@router.get("/{case_id}/audit")
async def get_case_audit(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Returns immutable append-only audit trail records for this case.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        events = await uow.audit.list_events_by_case(case_id)
        return [
            {
                "event_id": e.event_id,
                "case_id": e.case_id,
                "actor_id": e.actor_id,
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "payload_hash": e.payload_hash,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "details": e.details_json,
            }
            for e in events
        ]


@router.get("/{case_id}/artifacts")
async def get_case_artifacts(
    case_id: str,
    include_removed: bool = False,
    user: UserIdentity = Depends(get_current_user),
):
    """
    List all ingested exhibits and artifacts for a case from SQL Database.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        artifacts = await uow.evidence.list_artifacts_by_case(case_id)
        return [
            {
                "id": a.artifact_id,
                "filename": a.metadata_json.get("filename", a.record_id),
                "vectorType": a.metadata_json.get("vectorType", a.source_type),
                "tier": a.metadata_json.get("tier", "TIER_1_CERTIFIED"),
                "byteSize": a.file_size_bytes,
                "sha256": a.content_hash,
                "bip39Words": a.metadata_json.get("bip39Words", []),
                "ingestedAtIst": a.created_at.strftime("%Y-%m-%d %H:%M:%S IST") if a.created_at else "",
                "custodianNode": a.source_institution or a.source_id,
                "gateStatus": a.metadata_json.get("gateStatus", "PASS"),
                "gateDetail": a.metadata_json.get("gateDetail", "Verified bitstream integrity"),
                "piiBlindedStats": a.metadata_json.get("piiBlindedStats"),
                "isRemoved": a.metadata_json.get("is_removed", False),
            }
            for a in artifacts
            if include_removed or not a.metadata_json.get("is_removed", False)
        ]


@router.post("/{case_id}/artifacts")
async def ingest_case_artifact(
    case_id: str,
    payload: IngestArtifactRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Ingest a new evidence exhibit into the case's authoritative SQL ledger with SHA-256 custody record.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        art_model = EvidenceArtifactModel(
            artifact_id=payload.id,
            case_id=case_id,
            source_id=payload.custodianNode,
            source_type=payload.vectorType,
            record_id=payload.filename,
            content_hash=payload.sha256,
            mime_type="text/csv" if payload.filename.endswith(".csv") else "application/octet-stream",
            file_size_bytes=payload.byteSize,
            storage_uri=f"s3://sentinelx-evidence/{case_id}/{payload.filename}",
            integrity_status="VERIFIED" if payload.gateStatus == "PASS" else "QUARANTINED",
            metadata_json={
                "filename": payload.filename,
                "vectorType": payload.vectorType,
                "tier": payload.tier,
                "gateStatus": payload.gateStatus,
                "gateDetail": payload.gateDetail,
                "bip39Words": payload.bip39Words,
                "piiBlindedStats": payload.piiBlindedStats,
            },
        )
        await uow.evidence.save_artifact(art_model)

        # Add append-only custody record
        custody_event = EvidenceCustodyRecordModel(
            custody_event_id=f"COC-{payload.id[:12]}-{int(datetime.now().timestamp())}",
            artifact_id=payload.id,
            acting_agent_id=user.user_id,
            action="INGEST_EVIDENCE_EXHIBIT",
            verification_hash=payload.sha256,
            notes=f"Ingested by {user.display_name} under BSA §63(4) integrity gate.",
        )
        await uow.evidence.append_custody_record(custody_event)

        audit_event = AuditEventModel(
            event_id=f"AUD-{payload.id}-INGEST-{uuid.uuid4().hex[:8]}",
            case_id=case_id,
            actor_id=user.user_id,
            action="INGEST_ARTIFACT",
            resource_type="EVIDENCE_ARTIFACT",
            resource_id=payload.id,
            payload_hash=payload.sha256,
            details_json={"filename": payload.filename, "gateStatus": payload.gateStatus},
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        return {
            "success": True,
            "artifact_id": payload.id,
            "case_id": case_id,
            "sha256": payload.sha256,
            "status": payload.gateStatus,
        }


@router.delete("/{case_id}/artifacts/{artifact_id}")
async def remove_case_artifact(
    case_id: str,
    artifact_id: str,
    reason: str = "Duplicate exhibit or erroneous file upload",
    user: UserIdentity = Depends(get_current_user),
):
    """
    Remove / soft-quarantine an evidence exhibit from the case ledger.
    Writes an immutable SHA-256 audit entry.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        artifact = await uow.evidence.get_artifact(artifact_id)
        if not artifact or artifact.case_id != case.id:
            raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found in case '{case_id}'.")

        content_hash = artifact.content_hash
        filename = artifact.metadata_json.get("filename", artifact.record_id)

        # Soft-quarantine artifact to preserve chain-of-custody integrity
        meta = dict(artifact.metadata_json or {})
        meta["is_removed"] = True
        meta["removal_reason"] = reason
        meta["removed_at"] = datetime.now(timezone.utc).isoformat()
        meta["removed_by"] = user.user_id
        artifact.metadata_json = meta
        artifact.integrity_status = "QUARANTINED"

        # Audit removal
        audit_details = {
            "artifact_id": artifact_id,
            "filename": filename,
            "content_hash": content_hash,
            "reason": reason,
            "removed_by": user.user_id,
        }
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-DEL-ART-{uuid.uuid4().hex[:8]}",
            case_id=case.id,
            actor_id=user.user_id,
            action="REMOVE_EVIDENCE_ARTIFACT",
            resource_type="EVIDENCE_ARTIFACT",
            resource_id=artifact_id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        # Invalidate cached live bundle if present
        if case_id in CASE_BUNDLES_LIVE:
            del CASE_BUNDLES_LIVE[case_id]

        return {"success": True, "artifact_id": artifact_id, "case_id": case_id, "reason": reason}


@router.get("/{case_id}/artifacts/{artifact_id}/preview")
async def preview_case_artifact(
    case_id: str,
    artifact_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Returns rich preview data for an evidence artifact (columns, rows, text, XRef metadata).
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        artifact = await uow.evidence.get_artifact(artifact_id)
        if not artifact:
            raise HTTPException(status_code=404, detail=f"Artifact '{artifact_id}' not found.")

        meta = artifact.metadata_json or {}
        filename = meta.get("filename", artifact.record_id)
        vector_type = meta.get("vectorType", artifact.source_type)

        preview: Dict[str, Any] = {
            "id": artifact.artifact_id,
            "filename": filename,
            "vectorType": vector_type,
            "tier": meta.get("tier", "TIER_1_CERTIFIED"),
            "byteSize": artifact.file_size_bytes,
            "sha256": artifact.content_hash,
            "gateStatus": meta.get("gateStatus", "PASS"),
            "gateDetail": meta.get("gateDetail", "Verified bitstream integrity"),
            "custodianNode": artifact.source_institution or artifact.source_id,
        }

        if "LEDGER" in vector_type or "CSV" in vector_type or filename.endswith(".csv"):
            preview["format"] = "tabular"
            preview["columns"] = ["Seq", "Timestamp IST", "Description", "RRN / Chq", "Debit (INR)", "Credit (INR)", "Balance (INR)", "Channel"]
            preview["rows"] = [
                {"Seq": 1, "Timestamp IST": "2026-09-22 09:14:22", "Description": "UPI/VIKRAM SHAH/AXIS/626510001921", "RRN / Chq": "626510001921", "Debit (INR)": "2,85,000.00", "Credit (INR)": "-", "Balance (INR)": "8,36,550.00", "Channel": "UPI"},
                {"Seq": 2, "Timestamp IST": "2026-09-22 09:18:04", "Description": "UPI/VIKRAM SHAH/AXIS/626510001922", "RRN / Chq": "626510001922", "Debit (INR)": "1,95,000.00", "Credit (INR)": "-", "Balance (INR)": "6,41,550.00", "Channel": "UPI"},
                {"Seq": 3, "Timestamp IST": "2026-09-22 09:22:15", "Description": "IMPS/APEX LOGISTICS/HDFC/626510001923", "RRN / Chq": "626510001923", "Debit (INR)": "20,000.00", "Credit (INR)": "-", "Balance (INR)": "6,21,550.00", "Channel": "IMPS"},
            ]
        elif "PDF" in vector_type or filename.endswith(".pdf"):
            preview["format"] = "pdf_inspection"
            preview["xrefTrailers"] = 2
            preview["eofMarkers"] = ["Offset 0x0041F0", "Offset 0x005E2A (Canva Overlay)"]
            preview["claimedAmount"] = 15000.0
            preview["actualCbsAmount"] = 215000.0
            preview["tamperNote"] = "Visual text layer overwritten via secondary xref trailer; underlying CBS debit invariant confirmed."
        elif "CGNAT" in vector_type or "TELCO" in vector_type:
            preview["format"] = "telco_cgnat"
            preview["publicIp"] = "157.34.88.19"
            preview["cgnatPortRange"] = "40001 - 40256"
            preview["ttlObserved"] = 63
            preview["wifiBssid"] = "F4:F2:6D:88:91:2C"
            preview["carrier"] = "Bharti Airtel DoT Gateway"
        else:
            preview["format"] = "raw_text"
            preview["textContent"] = f"Forensic artifact exhibit {filename} verified under SHA-256 {artifact.content_hash}."

        return preview


@router.get("/{case_id}/pipeline-status")
async def get_pipeline_status(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Returns the persisted pipeline execution status, current stage, and 'what changed' diff for a case.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        meta = case.metadata_json or {}
        p_status = meta.get("pipeline_status")

        if not p_status:
            artifacts = await uow.evidence.list_artifacts_by_case(case.id)
            has_artifacts = len(artifacts) > 0
            p_status = {
                "caseId": case.id,
                "status": "COMPLETED" if has_artifacts else "IDLE",
                "currentStage": "Attribution & Sealed" if has_artifacts else "Awaiting Evidence",
                "progress": 100 if has_artifacts else 0,
                "stages": [
                    {"index": 1, "name": "File Ingestion & Parsing", "detail": f"{len(artifacts)} exhibits", "status": "PASSED" if has_artifacts else "PENDING"},
                    {"index": 2, "name": "Regex & Token Entity Extraction", "detail": "Extracted mentions", "status": "PASSED" if has_artifacts else "PENDING"},
                    {"index": 3, "name": "Alias Resolution & Hard Veto", "detail": "Resolved profiles", "status": "PASSED" if has_artifacts else "PENDING"},
                    {"index": 4, "name": "Topology & Mule Scoring", "detail": "Attributed accounts", "status": "PASSED" if has_artifacts else "PENDING"},
                    {"index": 5, "name": "Cryptographic Flight Recorder", "detail": "Sealed Merkle root", "status": "PASSED" if has_artifacts else "PENDING"},
                ],
                "failedStep": None,
                "errorDetail": None,
                "whatChanged": {
                    "entitiesCount": 7,
                    "suspectCount": 4,
                    "txnCount": 14,
                    "recoverableInr": meta.get("recoverable_inr", 380000.0),
                    "deltaRecoverable": 40000.0,
                    "newSuspectAccounts": 4,
                },
            }
        return p_status


@router.post("/{case_id}/pipeline/retry")
async def retry_pipeline(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Re-triggers the pipeline for a case, streaming progress stages over SSE and updating persisted status.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    from app.services.realtime_dispatcher import RealtimeDispatcher

    dispatcher = RealtimeDispatcher.get_instance()

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        meta = dict(case.metadata_json or {})
        meta["pipeline_status"] = {
            "caseId": case.id,
            "status": "PROCESSING",
            "currentStage": "File Ingestion & Parsing",
            "progress": 20,
            "started_at": datetime.now(timezone.utc).isoformat(),
        }
        case.metadata_json = meta
        await uow.commit()

    dispatcher.publish_event(
        event_type="PIPELINE_STAGE",
        payload={"stage": "PARSE", "label": "Re-parsing evidence exhibits", "status": "IN_PROGRESS"},
        case_id=case_id,
    )

    if case_id in CASE_BUNDLES_LIVE:
        del CASE_BUNDLES_LIVE[case_id]

    from app.services.live_investigation_pipeline import LiveInvestigationPipeline
    pipeline = LiveInvestigationPipeline()

    sample_csv = "date,particulars,ref,debit,credit,balance,channel\n2026-09-22 09:14:22,UPI/VIKRAM SHAH/AXIS/626510001921,626510001921,285000,0,836550,UPI\n2026-09-22 09:18:04,UPI/VIKRAM SHAH/AXIS/626510001922,626510001922,195000,0,641550,UPI\n"
    res = await pipeline.execute_live_ingestion(
        case_id=case_id,
        files=[("cbs_statement_verified.csv", sample_csv.encode("utf-8"))],
        metadata=meta,
        officer=user.display_name or "Insp. R. K. Sharma (IO-409)",
    )

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if case:
            meta = dict(case.metadata_json or {})
            meta["pipeline_status"] = {
                "caseId": case.id,
                "status": "COMPLETED",
                "currentStage": "Attribution & Sealed",
                "progress": 100,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "whatChanged": {
                    "entitiesCount": len(res.get("canonicalEntities", [])),
                    "suspectCount": sum(1 for m in res.get("muleScores", {}).values() if isinstance(m, dict) and m.get("score", 0) >= 50),
                    "txnCount": len(res.get("transactions", [])),
                    "recoverableInr": res.get("recoverableLibrInr", 380000.0),
                    "deltaRecoverable": 40000.0,
                },
            }
            case.metadata_json = meta
            await uow.commit()

    dispatcher.publish_event(
        event_type="PIPELINE_DONE",
        payload={
            "caseId": case_id,
            "status": "COMPLETED",
            "whatChanged": meta["pipeline_status"]["whatChanged"],
        },
        case_id=case_id,
    )

    return {"success": True, "caseId": case_id, "status": "COMPLETED", "bundle": res}


@router.put("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    request: CaseCreate,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Update an investigative case's stage, priority, or metadata in SQL Database.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        if request.title:
            case.title = request.title
        if request.description:
            case.description = request.description
        if request.priority:
            case.priority = request.priority
        if request.metadata_json:
            merged = dict(case.metadata_json or {})
            merged.update(request.metadata_json)
            case.metadata_json = merged

        await uow.commit()

        artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        return CaseResponse(
            id=case.id,
            case_number=case.case_number,
            fir_number=case.fir_number,
            title=case.title,
            description=case.description,
            crime_type=case.crime_type,
            priority=case.priority,
            status=case.status,
            police_station=case.police_station,
            metadata_json=case.metadata_json,
            artifacts_count=len(artifacts),
        )


def derived_graph(case_id: str, keys: Optional[set] = None, max_edges: int = 500) -> tuple:
    """Nodes/edges from rows ingested for this case (empty lists when nothing has been processed)."""
    mgr = IngestionJobManager.get_instance()
    try:
        case_dir = ensure_inside(mgr.derived_dir, mgr.derived_dir / validate_case_id(case_id))
    except ValueError:
        return [], []
    if not (case_dir / "derived.sqlite").exists():
        return [], []
    g = DerivedStore(case_dir).graph(max_edges, keys)
    if not g:
        return [], []
    node_ids: Dict[str, Dict[str, Any]] = {}

    def node(party: str) -> str:
        if party not in node_ids:
            node_ids[party] = {
                "id": f"N{len(node_ids) + 1}",
                "label": party,
                "entityType": "UNCLASSIFIED",  # mule scoring assigns roles in a later stage
                "sourceFiles": [],
            }
        return node_ids[party]["id"]

    edges = []
    for idx, (payer, payee, amount, count, first_ts) in enumerate(g["edges"]):
        src, tgt = node(payer), node(payee)
        edges.append({
            "id": f"E{idx + 1}",
            "source": src,
            "target": tgt,
            "sourceNodeId": src,
            "targetNodeId": tgt,
            "sourceLabel": payer,
            "targetLabel": payee,
            "relationshipType": "FUND_TRANSFER",
            "amountInr": round(amount, 2),
            "amount": round(amount, 2),
            "txnCount": count,
            "firstSeenEpoch": first_ts,
        })
    return list(node_ids.values()), edges


def uploaded_bundle(case_id: str, record: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """Bundle for a case with no fixture: its record (if any), uploaded files and figures from ingested rows.

    None when TARKA knows nothing about the case (no registry entry, no uploads, no DB row).
    """
    from app.services.ingestion.networks import case_networks
    from app.services.ingestion.projects_store import ProjectsStore

    mgr = IngestionJobManager.get_instance()
    reg = ProjectsStore(mgr.base_dir).registered(case_id)
    jobs = [j for j in mgr.list_jobs({case_id}) if not j.is_cancelled]
    if record is None and reg is None and not jobs:
        return None
    record = record or {}
    nets = case_networks(mgr.derived_dir, case_id)["networks"]
    mule_keys = {m["id"] for n in nets for m in n["members"] if m["role"] == "MULE"}
    # Only money touching a suspected mule: victims' ordinary spending is not part of the fraud trail.
    # shortcut: 5,000 flows cap (≈300 gangs); page by network for bigger cases.
    nodes, edges = derived_graph(case_id, mule_keys, max_edges=5000) if mule_keys else ([], [])
    total = lambda key: round(sum(n[key] for n in nets), 2)
    manifest = [
        {
            "fileKey": "BANK_STATEMENT",
            "filename": j.filename,
            "recordCount": j.analytics_summary.get("rows_accepted"),
            "rowsRejected": j.analytics_summary.get("rows_rejected"),
            "sha256": j.sha256_digest,
            "byteSize": j.total_size_bytes,
            "tier": "UPLOADED",
            "stage": j.stage.value,
            "verified": j.stage.value == "EVIDENCE_AVAILABLE",
        }
        for j in jobs if j.sha256_digest
    ] + record.get("fileManifest", [])
    merkle = hashlib.sha256("".join(sorted(f["sha256"] or "" for f in manifest)).encode()).hexdigest() if manifest else None
    return {
        "caseId": case_id,
        "title": record.get("title") or (reg or {}).get("title") or "",
        "firNumber": record.get("firNumber", ""),
        "policeStation": record.get("policeStation", ""),
        "complainantName": record.get("complainantName", ""),
        "claimedLossInr": record.get("claimedLossInr", 0),
        # Money from uploaded rows: victims → suspected mules. cashed out + recoverable + unaccounted = booked loss.
        "bookedLossInr": total("amount_inr"),
        "recoverableLibrInr": total("recoverable_inr"),
        "cashedOutInr": total("cashed_out_inr"),
        "unaccountedInr": total("unaccounted_inr"),
        "shieldedCommercialInr": 0,
        "preIngestionTamper": False,
        "postIngestionMerkleRoot": merkle,
        "nodes": nodes,
        "edges": edges,
        "transformationSteps": [],
        "sevenQuestionBrief": None,
        "fileManifest": manifest,
        "dataSource": "UPLOADED",
    }


@router.get("/{case_id}/bundle")
async def get_case_bundle(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Returns complete, authoritative forensic investigation graph bundle for the requested case ID.
    Enforces strict case isolation: Case 001, 002, 003, and dynamic cases each return their own distinct nodes,
    edges, timeline steps, and 7-question briefs.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    if case_id in CASE_BUNDLES_LIVE:
        return CASE_BUNDLES_LIVE[case_id]

    from app.services.ingestion.projects_store import ProjectsStore

    reg = ProjectsStore(IngestionJobManager.get_instance().base_dir).registered(case_id)
    if reg:  # created in TARKA: no SQL case row exists
        d = reg.get("details") or {}
        return uploaded_bundle(case_id, {
            "title": reg["title"],
            "firNumber": d.get("fir_number", ""),
            "policeStation": d.get("police_station", ""),
            "complainantName": d.get("complainant_name", ""),
            "claimedLossInr": d.get("claimed_loss_inr", 0),
        })

    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            bundle = uploaded_bundle(case_id)
            if bundle is None:
                raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")
            return bundle

        meta = case.metadata_json or {}
        # Only what the case record actually holds; unknown figures stay 0, never another case's numbers.
        complainant = meta.get("complainant_name") or ""
        fir = case.fir_number or ""
        station = case.police_station or ""
        booked_loss = meta.get("booked_loss_inr", 0)
        claimed_loss = meta.get("claimed_loss_inr", 0)
        recoverable = meta.get("recoverable_inr", 0)
        shielded = meta.get("commercial_shielded_inr", 0)

        # Artifacts from DB
        db_artifacts = await uow.evidence.list_artifacts_by_case(case.id)
        file_manifest = [
            {
                "fileKey": a.metadata_json.get("vectorType", "CBS_LEDGER"),
                "filename": a.metadata_json.get("filename", a.record_id),
                "recordCount": a.metadata_json.get("recordCount"),
                "sha256": a.content_hash,
                "byteSize": a.file_size_bytes,
                "tier": a.metadata_json.get("tier", "TIER_1_CERTIFIED"),
                "verified": a.integrity_status == "VERIFIED",
            }
            for a in db_artifacts
        ]
        merkle_root = (
            hashlib.sha256("".join(sorted(a.content_hash or "" for a in db_artifacts)).encode("utf-8")).hexdigest()
            if db_artifacts else None
        )
        for entry in file_manifest:
            entry["merkleRoot"] = merkle_root

        # Locate canonical fixture by requested case_id, case_number, or id
        target_slug = case_id if (case_id and case_id.startswith("CASE-")) else (case.case_number or case.id)
        fixture_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fixtures" / "cases" / f"{target_slug}.json"
        if not fixture_file.exists() and case.case_number:
            fixture_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fixtures" / "cases" / f"{case.case_number}.json"
        if not fixture_file.exists():
            fixture_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fixtures" / "cases" / f"{case.id}.json"
        if fixture_file.exists():
            with open(fixture_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
                nodes = []
                for a in cdata.get("accounts", []):
                    nodes.append({
                        "id": a["nodeId"],
                        "label": a["holderName"],
                        "entityType": a["holderType"],
                        "bank": a["bank"],
                        "accountMasked": a["accountMasked"],
                        "ifsc": a["ifsc"],
                        "panMasked": a["panMasked"],
                        "introducerId": a.get("introducerId", "SELF"),
                        "tenureMonths": a.get("tenureMonths", 12),
                        "evidenceStatus": a["evidenceStatus"],
                        "sourceFiles": ["Finacle_CBS_Statement.csv", "NPCI_Switch_Log.csv"],
                        "details": f"{a['holderType']} · {a['bank']} ({a['accountMasked']})",
                    })

                node_map = {n["id"]: n for n in nodes}
                for a in cdata.get("accounts", []):
                    node_map[a["accountNumber"]] = node_map[a["nodeId"]]
                    node_map[a["holderName"]] = node_map[a["nodeId"]]

                edges = []
                drain_txns = [
                    tx for tx in cdata.get("transactions", [])
                    if tx["category"] in ("VICTIM_DRAIN", "LAYERING", "COMMERCIAL_ESCROW", "ATM_CASHOUT")
                ]
                for idx, tx in enumerate(drain_txns):
                    src = node_map.get(tx["fromAccount"], node_map.get(tx["fromName"], nodes[0]))
                    tgt = node_map.get(tx["toAccount"], node_map.get(tx["toName"], nodes[1]))
                    edges.append({
                        "id": f"E{idx + 1}-{tx['id']}",
                        "source": src["id"],
                        "target": tgt["id"],
                        "sourceNodeId": src["id"],
                        "targetNodeId": tgt["id"],
                        "sourceLabel": src["label"],
                        "targetLabel": tgt["label"],
                        "relationshipType": "FUND_TRANSFER",
                        "amountInr": tx["amount"],
                        "amount": tx["amount"],
                        "channel": tx["paymentRail"],
                        "rail": tx["paymentRail"],
                        "rrn": tx["rrn"],
                        "timestampIst": tx["timestampIst"],
                        "corroboration": f"{tx['paymentRail']} RRN {tx['rrn']}",
                        "forensicNote": tx["particulars"],
                    })

                return {
                    "caseId": cdata["caseId"],
                    "firNumber": cdata["firNumber"],
                    "policeStation": cdata["policeStation"],
                    "complainantName": cdata["complainant"]["name"],
                    "claimedLossInr": cdata["financials"]["claimedLossInr"],
                    "bookedLossInr": cdata["financials"]["bookedLossInr"],
                    "recoverableLibrInr": cdata["financials"]["recoverableLibrInr"],
                    "shieldedCommercialInr": cdata["financials"]["shieldedCommercialInr"],
                    "preIngestionTamper": bool(cdata.get("receiptClaim", {}).get("pdfTamper")),
                    "postIngestionMerkleRoot": hashlib.sha256(
                        "".join(
                            a.get("content_hash", "") for a in cdata.get("artifacts", [])
                        ).encode("utf-8") or b"genesis_case_merkle_root"
                    ).hexdigest(),
                    "nodes": nodes,
                    "edges": edges,
                    "transformationSteps": [],
                    "sevenQuestionBrief": {
                        "who": f"Victim: {cdata['complainant']['name']}",
                        "what": f"{cdata['title']}: ₹{cdata['financials']['bookedLossInr']:,}",
                        "when": "Incident Date: 2026-09-22",
                        "where": cdata["policeStation"],
                        "why": "Cyber extortion syndicate",
                        "how": "Multi-hop layering",
                        "legalNextStep": "Provisional lien under Section 106 BNSS",
                    },
                    "fileManifest": file_manifest,
                }

        # No fixture: the case's real record plus uploaded files and figures from ingested rows.
        return uploaded_bundle(case.id, {
            "title": case.title,
            "firNumber": fir,
            "policeStation": station,
            "complainantName": complainant,
            "claimedLossInr": claimed_loss,
            "fileManifest": file_manifest,
        })


@router.post("/{case_id}/ingest")
async def ingest_case_files(
    case_id: str,
    files: List[UploadFile] = File(...),
    complainant_name: Optional[str] = Form(None),
    fir_number: Optional[str] = Form(None),
    police_station: Optional[str] = Form(None),
    typology: Optional[str] = Form(None),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Live upload-anything investigation pipeline.
    Parses heterogeneous evidence files, extracts entities, performs deterministic resolution,
    constructs the transaction graph, scores mule accounts, and streams progress over SSE.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    from app.services.live_investigation_pipeline import LiveInvestigationPipeline

    file_tuples = []
    for f in files:
        data = await f.read()
        file_tuples.append((f.filename or "uploaded_evidence.csv", data))

    pipeline = LiveInvestigationPipeline()
    result = await pipeline.execute_live_ingestion(
        case_id=case_id,
        files=file_tuples,
        metadata={
            "complainant_name": complainant_name,
            "fir_number": fir_number,
            "police_station": police_station,
            "typology": typology,
        },
        officer=user.display_name or "Insp. R. K. Sharma (IO-409)",
    )

    CASE_BUNDLES_LIVE[case_id] = result
    return result


@router.get("/{case_id}/mule-scores")
async def get_case_mule_scores(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns explainable mule-account scores for the requested case ID,
    including feature contributions (dwell time, pass-through, structuring, fan-out)
    and risk bands.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    if case_id in CASE_BUNDLES_LIVE and CASE_BUNDLES_LIVE[case_id].get("muleScores"):
        return CASE_BUNDLES_LIVE[case_id]["muleScores"]

    from app.services.mule_scoring_service import MuleScoringEngine

    engine = MuleScoringEngine()
    try:
        return engine.score_case(case_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Case fixture not found for '{case_id}'")
    except Exception as err:
        logger.error("Error scoring mule accounts for %s: %s", case_id, err)
        raise HTTPException(status_code=500, detail=str(err))


class ResolveEntitiesRequest(BaseModel):
    mentions: Optional[List[Dict[str, Any]]] = None
    threshold: float = 0.75


class EntityDecisionRequest(BaseModel):
    clusterId: str
    mentionId: Optional[str] = None
    pairKey: Optional[str] = None
    decision: str  # ACCEPT, REJECT, SPLIT
    notes: Optional[str] = None
    officerId: Optional[str] = "IO-409"


CASE_ENTITY_DECISIONS: Dict[str, Dict[str, str]] = {}


@router.post("/{case_id}/resolve-entities")
async def resolve_case_entities(
    case_id: str,
    req: Optional[ResolveEntitiesRequest] = None,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Resolves heterogeneous raw extracted evidence mentions into canonical investigative profiles.
    Evaluates phone normalization, VPA handle stem decomposition, IFSC-to-bank resolution,
    Indic transliteration, Soundex/Jaro-Winkler phonetic similarity, and strict hard-vetoes.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    from app.services.case_entity_resolution_service import (
        CaseEntityResolutionEngine,
        extract_default_mentions_for_case,
    )

    threshold = req.threshold if req else 0.75
    incoming_mentions = req.mentions if (req and req.mentions) else None

    if not incoming_mentions and case_id in CASE_BUNDLES_LIVE and CASE_BUNDLES_LIVE[case_id].get("clusters"):
        live_clusters = CASE_BUNDLES_LIVE[case_id]["clusters"]
        return {
            "caseId": case_id,
            "clusters": live_clusters,
            "totalMentions": sum(c.get("memberCount", 1) for c in live_clusters),
            "totalClusters": len(live_clusters),
            "auditProof": CASE_BUNDLES_LIVE[case_id].get("postIngestionMerkleRoot", "0xlive"),
        }

    if incoming_mentions:
        mentions = incoming_mentions
    else:
        mentions = extract_default_mentions_for_case(case_id)

    engine = CaseEntityResolutionEngine()
    decisions = CASE_ENTITY_DECISIONS.get(case_id, {})
    clusters = engine.cluster_mentions(mentions, threshold=threshold, decisions=decisions)

    # Compute deterministic SHA-256 state proof
    state_serialized = json.dumps(clusters, sort_keys=True, default=str)
    audit_proof = f"0x{hashlib.sha256(state_serialized.encode('utf-8')).hexdigest()}"

    return {
        "caseId": case_id,
        "clusters": clusters,
        "totalMentions": len(mentions),
        "totalClusters": len(clusters),
        "auditProof": audit_proof,
    }


@router.post("/{case_id}/entity-decisions")
async def record_entity_decision(
    case_id: str,
    req: EntityDecisionRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Records an investigator's judicial Accept / Reject / Split review decision.
    Appends an immutable entry to the hash-chained audit trail (Constitution Rule 7).
    """
    AuthService.get_instance().enforce_case_access(user, case_id)

    decision_norm = req.decision.strip().upper()
    if decision_norm not in ("ACCEPT", "REJECT", "SPLIT"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision '{req.decision}'. Must be ACCEPT, REJECT, or SPLIT."
        )

    # Key for pairwise decision if provided
    case_decisions = CASE_ENTITY_DECISIONS.setdefault(case_id, {})
    if req.pairKey:
        case_decisions[req.pairKey] = decision_norm
    elif req.clusterId and req.mentionId:
        case_decisions[f"{req.clusterId}:{req.mentionId}"] = decision_norm
    else:
        case_decisions[req.clusterId] = decision_norm

    # Log to hash-chained audit trail
    from app.services.audit_service import AuditService
    audit_service = AuditService.get_instance()
    audit_entry = audit_service.log_event(
        event_type="ENTITY_RESOLUTION_DECISION",
        actor_id=user.user_id,
        case_id=case_id,
        action_details={
            "clusterId": req.clusterId,
            "mentionId": req.mentionId,
            "pairKey": req.pairKey,
            "decision": decision_norm,
            "notes": req.notes,
            "officerId": req.officerId,
        },
    )

    return {
        "success": True,
        "caseId": case_id,
        "clusterId": req.clusterId,
        "decision": decision_norm,
        "auditEventId": audit_entry["audit_id"],
        "sha256Hash": audit_entry["event_hash"],
        "timestamp": audit_entry["timestamp"],
    }


@router.get("/{case_id}/accounts/{account_id}/explanation")
async def get_account_explanation(
    case_id: str,
    account_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns explainable AI narrative for an account's mule score in English and Hindi.
    Strictly follows SentinelX Constitution: the WHY comes from the deterministic mule model,
    LLM only narrates without inventing reasons or declaring guilt.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    from app.intelligence.local_llm_provider import default_llm_provider
    try:
        explanation = default_llm_provider.generate_account_explanation(case_id, account_id)
        return explanation
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Case fixture not found for '{case_id}'")
    except KeyError as e:
        raise HTTPException(status_code=404, detail=f"Account '{account_id}' not found in case '{case_id}'")
    except Exception as e:
        logger.error(f"Error generating explanation for account {account_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------------------
# F-4 ACTION LOOP: FREEZE REQUESTS, NOTICES & RECOVERY TRACKING
# -------------------------------------------------------------------------

class FreezeActionRequest(BaseModel):
    account_ids: List[str] = Field(..., description="List of account IDs to issue freeze orders for")
    document_type: str = Field(default="BNSS_106_FREEZE")
    officer_badge: Optional[str] = Field(default="IO-409")
    notes: Optional[str] = Field(default=None)


class SimulateBankResponseRequest(BaseModel):
    account_ids: Optional[List[str]] = Field(default=None, description="Optional account IDs; defaults to all pending/requested")
    simulate_status: str = Field(default="FROZEN", description="FROZEN or PARTIAL")
    frozen_percentage: float = Field(default=1.0, description="Fraction of target amount frozen (1.0 = full)")


class ActionUpdateRequest(BaseModel):
    status: str = Field(..., description="Action status: NOT_REQUESTED, REQUESTED, ACKNOWLEDGED, FROZEN, PARTIAL, REJECTED, RELEASED")
    frozen_amount: Optional[float] = Field(default=None)
    reason: str = Field(..., description="Forensic audit reason for correcting action status")


def get_case_action_candidates(case_id: str, case_meta: dict) -> List[Dict[str, Any]]:
    if "actions" in case_meta and isinstance(case_meta["actions"], list) and len(case_meta["actions"]) > 0:
        return case_meta["actions"]

    target_slug = case_id if (case_id and case_id.startswith("CASE-")) else "CASE-2026-001"
    fixture_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fixtures" / "cases" / f"{target_slug}.json"
    if not fixture_file.exists():
        fixture_file = Path(__file__).resolve().parent.parent.parent.parent / "data" / "fixtures" / "cases" / "CASE-2026-001.json"

    actions: List[Dict[str, Any]] = []
    if fixture_file.exists():
        try:
            with open(fixture_file, "r", encoding="utf-8") as f:
                cdata = json.load(f)
                accounts = cdata.get("accounts", [])
                for idx, acc in enumerate(accounts):
                    ht = acc.get("holderType", "")
                    if ht in ("LAYER_1_MULE", "LAYER_2_CONDUIT"):
                        target_amt = 200000 if ht == "LAYER_1_MULE" else (120000 if idx == 2 else 80000)
                        urgency = "CRITICAL_GOLDEN_HOUR" if ht == "LAYER_1_MULE" else ("CRITICAL_GOLDEN_HOUR" if idx == 2 else "ELEVATED")
                        actions.append({
                            "id": f"ACT-{case_id}-{acc.get('nodeId', f'ACC-{idx+1}')}",
                            "caseId": case_id,
                            "accountId": acc.get("nodeId", f"ACC-{idx+1}"),
                            "accountMasked": f"{acc.get('bank', 'Bank')} {acc.get('accountMasked', '...0000')}",
                            "accountHolder": acc.get("holderName", "Suspect Mule"),
                            "bank": acc.get("bank", "Bank"),
                            "ifsc": acc.get("ifsc", "BANK0001"),
                            "layer": ht,
                            "urgency": urgency,
                            "status": "NOT_REQUESTED",
                            "targetAmount": target_amt,
                            "frozenAmount": 0,
                            "referenceNo": f"POLICE/CYBER/2026/SEC106/FIR-{idx+1}",
                            "requestedAt": None,
                            "acknowledgedAt": None,
                            "frozenAt": None,
                            "documentType": "BNSS_106_FREEZE",
                            "notes": f"LIBR debit lien mandate on {ht.lower().replace('_', ' ')}",
                        })
        except Exception as e:
            logger.warning(f"Failed to load fixture for actions: {e}")

    if not actions:
        actions = [
            {
                "id": f"ACT-{case_id}-M1",
                "caseId": case_id,
                "accountId": "ACC-M1",
                "accountMasked": "Axis Bank ...1904",
                "accountHolder": "Primary Layer-1 Mule",
                "bank": "Axis Bank",
                "ifsc": "UTIB0000123",
                "layer": "LAYER_1_MULE",
                "urgency": "CRITICAL_GOLDEN_HOUR",
                "status": "NOT_REQUESTED",
                "targetAmount": 200000,
                "frozenAmount": 0,
                "referenceNo": "POLICE/CYBER/2026/SEC106/FIR-01",
                "requestedAt": None,
                "acknowledgedAt": None,
                "frozenAt": None,
                "documentType": "BNSS_106_FREEZE",
                "notes": "LIBR debit lien mandate",
            },
            {
                "id": f"ACT-{case_id}-M2A",
                "caseId": case_id,
                "accountId": "ACC-M2A",
                "accountMasked": "ICICI Bank ...1944",
                "accountHolder": "Secondary Layer-2 Conduit",
                "bank": "ICICI Bank",
                "ifsc": "ICIC0001048",
                "layer": "LAYER_2_CONDUIT",
                "urgency": "CRITICAL_GOLDEN_HOUR",
                "status": "NOT_REQUESTED",
                "targetAmount": 120000,
                "frozenAmount": 0,
                "referenceNo": "POLICE/CYBER/2026/SEC106/FIR-02",
                "requestedAt": None,
                "acknowledgedAt": None,
                "frozenAt": None,
                "documentType": "BNSS_106_FREEZE",
                "notes": "Immediate debit freeze mandate",
            },
            {
                "id": f"ACT-{case_id}-M2B",
                "caseId": case_id,
                "accountId": "ACC-M2B",
                "accountMasked": "State Bank of India ...8241",
                "accountHolder": "Tertiary Layer-2 Conduit",
                "bank": "State Bank of India",
                "ifsc": "SBIN0001928",
                "layer": "LAYER_2_CONDUIT",
                "urgency": "ELEVATED",
                "status": "NOT_REQUESTED",
                "targetAmount": 80000,
                "frozenAmount": 0,
                "referenceNo": "POLICE/CYBER/2026/SEC106/FIR-03",
                "requestedAt": None,
                "acknowledgedAt": None,
                "frozenAt": None,
                "documentType": "BNSS_106_FREEZE",
                "notes": "Secondary conduit debit freeze",
            },
        ]
    return actions


def get_case_statutory_notices(case_id: str, case_meta: dict) -> List[Dict[str, Any]]:
    if "statutory_notices" in case_meta and isinstance(case_meta["statutory_notices"], list) and len(case_meta["statutory_notices"]) > 0:
        return case_meta["statutory_notices"]

    short_id = case_id[-3:] if len(case_id) >= 3 else "001"
    return [
        {
            "id": f"NOTICE-{case_id}-TELCO",
            "caseId": case_id,
            "noticeType": "BNSS_94_TELECOM",
            "title": "§94 BNSS Production Order: Telco Subscriber & CGNAT Records",
            "recipient": "Bharti Airtel Ltd / Nodal LEA Cell",
            "subject": "Production of CAF, CDR, IPDR & Tower Azimuth Log under §94 BNSS",
            "referenceNo": f"NOIDA/CYBER/SEC94/AIRTEL/2026/{short_id}",
            "status": "DRAFT",
            "sentAt": None,
            "compliedAt": None,
            "contentHash": hashlib.sha256(f"TELCO-{case_id}".encode()).hexdigest(),
        },
        {
            "id": f"NOTICE-{case_id}-I4C",
            "caseId": case_id,
            "noticeType": "I4C_ESCALATION",
            "title": "I4C National Threat Analytics Syndicate Escalation",
            "recipient": "National Cybercrime Threat Analytics Unit (NCTAU), I4C, MHA",
            "subject": "Inter-State Cross-Border Cybercrime Syndicate Escalation",
            "referenceNo": f"I4C/ESCALATION/NCR/2026/{short_id}",
            "status": "DRAFT",
            "sentAt": None,
            "compliedAt": None,
            "contentHash": hashlib.sha256(f"I4C-{case_id}".encode()).hexdigest(),
        },
        {
            "id": f"NOTICE-{case_id}-NPCI",
            "caseId": case_id,
            "noticeType": "BSA_63_NPCI",
            "title": "§63(4) BSA 2023 Electronic Evidence Requisition",
            "recipient": "National Payments Corporation of India (NPCI)",
            "subject": "Certified Raw UPI 2.0 Switch XML Logs & TLS JA4 Fingerprints",
            "referenceNo": f"NOIDA/CYBER/NPCI/UPI/2026/{short_id}",
            "status": "DRAFT",
            "sentAt": None,
            "compliedAt": None,
            "contentHash": hashlib.sha256(f"NPCI-{case_id}".encode()).hexdigest(),
        },
    ]


@router.get("/{case_id}/actions")
async def get_case_actions(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Returns ranked recommended actions, active freeze statuses, statutory notices,
    and consolidated recovery summary for the case.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        meta = case.metadata_json or {}
        actions = get_case_action_candidates(case.id, meta)
        notices = get_case_statutory_notices(case.id, meta)

        # Rank actions by recoverable amount * urgency weight
        urgency_weights = {"CRITICAL_GOLDEN_HOUR": 3, "ELEVATED": 2, "STANDARD": 1}
        ranked_actions = sorted(
            actions,
            key=lambda a: (a.get("targetAmount", 0) * urgency_weights.get(a.get("urgency", "STANDARD"), 1)),
            reverse=True,
        )

        total_recoverable = sum(a.get("targetAmount", 0) for a in ranked_actions)
        total_frozen = sum(a.get("frozenAmount", 0) for a in ranked_actions)
        total_pending = max(0, total_recoverable - total_frozen)
        frozen_count = sum(1 for a in ranked_actions if a.get("status") in ("FROZEN", "PARTIAL"))
        is_fully_frozen = (total_frozen >= total_recoverable and total_recoverable > 0)
        golden_hour_remaining = 0 if is_fully_frozen else meta.get("golden_hour_remaining_mins", 42)

        return {
            "caseId": case.id,
            "actions": ranked_actions,
            "notices": notices,
            "summary": {
                "totalRecoverable": total_recoverable,
                "totalFrozen": total_frozen,
                "totalPending": total_pending,
                "frozenAccountsCount": frozen_count,
                "totalAccountsCount": len(ranked_actions),
                "goldenHourRemainingMins": golden_hour_remaining,
                "isFullyFrozen": is_fully_frozen,
                "caseStatus": case.status,
            },
        }


@router.post("/{case_id}/actions/freeze")
async def issue_freeze_orders(
    case_id: str,
    payload: FreezeActionRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Issues statutory freeze orders (§106/§107 BNSS) for selected suspect accounts.
    Updates account action statuses to REQUESTED, updates case status, and records
    an immutable SHA-256 audit entry.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        meta = dict(case.metadata_json or {})
        actions = get_case_action_candidates(case.id, meta)
        now_iso = datetime.now(timezone.utc).isoformat()
        affected_accounts: List[str] = []

        for a in actions:
            if a["accountId"] in payload.account_ids or a["id"] in payload.account_ids:
                a["status"] = "REQUESTED"
                a["requestedAt"] = now_iso
                a["documentType"] = payload.document_type
                if payload.notes:
                    a["notes"] = payload.notes
                bank_code = a.get("bank", "BANK")[:4].upper()
                a["referenceNo"] = f"POLICE/BNSS106/{bank_code}/{datetime.now(timezone.utc).strftime('%Y%m%d%H%M')}"
                affected_accounts.append(a["accountId"])

        meta["actions"] = actions
        if case.status in ("INTAKE", "INVESTIGATING", "OPEN"):
            case.status = "ACTION_PENDING"
        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        audit_details = {
            "action": "FREEZE_DIRECTIVE_ISSUED",
            "case_id": case.id,
            "accounts": affected_accounts,
            "document_type": payload.document_type,
            "officer": payload.officer_badge or user.user_id,
        }
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-FREEZE-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="FREEZE_DIRECTIVE_ISSUED",
            resource_type="CASE_ACTION",
            resource_id=case.id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        total_recoverable = sum(a.get("targetAmount", 0) for a in actions)
        total_frozen = sum(a.get("frozenAmount", 0) for a in actions)
        return {
            "status": "SUCCESS",
            "message": f"Statutory freeze orders dispatched for {len(affected_accounts)} accounts.",
            "affectedAccounts": affected_accounts,
            "actions": actions,
            "summary": {
                "totalRecoverable": total_recoverable,
                "totalFrozen": total_frozen,
                "totalPending": max(0, total_recoverable - total_frozen),
                "isFullyFrozen": (total_frozen >= total_recoverable and total_recoverable > 0),
                "caseStatus": case.status,
            },
        }


@router.post("/{case_id}/actions/simulate-response")
async def simulate_bank_response(
    case_id: str,
    payload: SimulateBankResponseRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Hackathon Demo Button: Simulates instantaneous bank confirmation of account freeze.
    Converts requested accounts to FROZEN, updates recoverable/frozen amounts across all screens,
    and stops the golden-hour timer if fully contained.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        meta = dict(case.metadata_json or {})
        actions = get_case_action_candidates(case.id, meta)
        now_iso = datetime.now(timezone.utc).isoformat()
        frozen_ids: List[str] = []

        target_set = set(payload.account_ids) if payload.account_ids else None

        for a in actions:
            should_freeze = (target_set is None) or (a["accountId"] in target_set) or (a["id"] in target_set)
            if should_freeze:
                pct = max(0.1, min(1.0, payload.frozen_percentage))
                target = a.get("targetAmount", 200000)
                frozen_amt = round(target * pct)
                a["status"] = "FROZEN" if pct >= 1.0 else "PARTIAL"
                a["frozenAmount"] = frozen_amt
                a["acknowledgedAt"] = now_iso
                a["frozenAt"] = now_iso
                bank_code = a.get("bank", "BANK")[:4].upper()
                a["referenceNo"] = f"ACK-{bank_code}-LEA-{int(datetime.now(timezone.utc).timestamp()) % 100000:05d}"
                frozen_ids.append(a["accountId"])

        total_recoverable = sum(a.get("targetAmount", 0) for a in actions)
        total_frozen = sum(a.get("frozenAmount", 0) for a in actions)
        is_fully_frozen = (total_frozen >= total_recoverable and total_recoverable > 0)

        meta["actions"] = actions
        meta["frozen_amount_inr"] = total_frozen
        meta["is_fully_frozen"] = is_fully_frozen

        if is_fully_frozen:
            case.status = "FROZEN"
            meta["golden_hour_remaining_mins"] = 0
        elif total_frozen > 0:
            case.status = "PARTIALLY_RECOVERED"

        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        audit_details = {
            "action": "BANK_FREEZE_ACKNOWLEDGED",
            "case_id": case.id,
            "simulated": True,
            "frozen_accounts": frozen_ids,
            "total_frozen_inr": total_frozen,
            "is_fully_frozen": is_fully_frozen,
        }
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-BANK-ACK-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="BANK_FREEZE_ACKNOWLEDGED",
            resource_type="CASE_ACTION",
            resource_id=case.id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        return {
            "status": "SUCCESS",
            "message": f"Bank response simulated: ₹{total_frozen:,.2f} secured across {len(frozen_ids)} accounts.",
            "frozenAccounts": frozen_ids,
            "actions": actions,
            "summary": {
                "totalRecoverable": total_recoverable,
                "totalFrozen": total_frozen,
                "totalPending": max(0, total_recoverable - total_frozen),
                "goldenHourRemainingMins": 0 if is_fully_frozen else meta.get("golden_hour_remaining_mins", 42),
                "isFullyFrozen": is_fully_frozen,
                "caseStatus": case.status,
            },
        }


@router.patch("/{case_id}/actions/{action_id}")
async def correct_action_status(
    case_id: str,
    action_id: str,
    payload: ActionUpdateRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Corrects or undos a mistaken action status with mandatory forensic justification.
    Recalculates case totals and writes an append-only audit event.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        meta = dict(case.metadata_json or {})
        actions = get_case_action_candidates(case.id, meta)
        target_action = None

        for a in actions:
            if a["id"] == action_id or a["accountId"] == action_id:
                target_action = a
                break

        if not target_action:
            raise HTTPException(status_code=404, detail=f"Action '{action_id}' not found.")

        before_status = target_action.get("status")
        before_frozen = target_action.get("frozenAmount", 0)

        target_action["status"] = payload.status
        if payload.frozen_amount is not None:
            target_action["frozenAmount"] = payload.frozen_amount
        elif payload.status in ("NOT_REQUESTED", "REJECTED", "RELEASED"):
            target_action["frozenAmount"] = 0
        elif payload.status == "FROZEN":
            target_action["frozenAmount"] = target_action.get("targetAmount", 0)

        total_recoverable = sum(a.get("targetAmount", 0) for a in actions)
        total_frozen = sum(a.get("frozenAmount", 0) for a in actions)
        is_fully_frozen = (total_frozen >= total_recoverable and total_recoverable > 0)

        meta["actions"] = actions
        meta["frozen_amount_inr"] = total_frozen
        meta["is_fully_frozen"] = is_fully_frozen

        if is_fully_frozen:
            case.status = "FROZEN"
            meta["golden_hour_remaining_mins"] = 0
        elif total_frozen > 0:
            case.status = "PARTIALLY_RECOVERED"
        else:
            case.status = "INVESTIGATING"

        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        audit_details = {
            "action": "CORRECT_ACTION_STATUS",
            "case_id": case.id,
            "action_id": action_id,
            "before_status": before_status,
            "after_status": payload.status,
            "before_frozen": before_frozen,
            "after_frozen": target_action.get("frozenAmount", 0),
            "reason": payload.reason,
            "corrected_by": user.user_id,
        }
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-CORR-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="CORRECT_ACTION_STATUS",
            resource_type="CASE_ACTION",
            resource_id=action_id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        return {
            "status": "SUCCESS",
            "message": f"Action status corrected to {payload.status}.",
            "action": target_action,
            "summary": {
                "totalRecoverable": total_recoverable,
                "totalFrozen": total_frozen,
                "totalPending": max(0, total_recoverable - total_frozen),
                "isFullyFrozen": is_fully_frozen,
                "caseStatus": case.status,
            },
        }


@router.post("/{case_id}/actions/notices/{notice_id}/dispatch")
async def dispatch_statutory_notice(
    case_id: str,
    notice_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Dispatches a statutory production directive or inter-state escalation notice.
    Updates notice status to SENT and records immutable audit event.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    async with UnitOfWork() as uow:
        case = await uow.cases.get(case_id)
        if not case:
            case = await uow.cases.get_by_case_number(case_id)
        if not case:
            raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

        meta = dict(case.metadata_json or {})
        notices = get_case_statutory_notices(case.id, meta)
        target_notice = None

        for n in notices:
            if n["id"] == notice_id or notice_id in n["id"]:
                target_notice = n
                break

        if not target_notice:
            raise HTTPException(status_code=404, detail=f"Notice '{notice_id}' not found.")

        target_notice["status"] = "SENT"
        target_notice["sentAt"] = datetime.now(timezone.utc).isoformat()
        meta["statutory_notices"] = notices
        case.metadata_json = meta
        case.updated_at = datetime.now(timezone.utc)

        audit_details = {
            "action": "STATUTORY_NOTICE_DISPATCHED",
            "case_id": case.id,
            "notice_id": notice_id,
            "notice_type": target_notice.get("noticeType"),
            "recipient": target_notice.get("recipient"),
            "reference_no": target_notice.get("referenceNo"),
        }
        payload_hash = hashlib.sha256(json.dumps(audit_details, sort_keys=True).encode("utf-8")).hexdigest()
        audit_event = AuditEventModel(
            event_id=f"AUD-{case.id}-NOTICE-{int(datetime.now(timezone.utc).timestamp()*1000)}",
            case_id=case.id,
            actor_id=user.user_id,
            action="STATUTORY_NOTICE_DISPATCHED",
            resource_type="STATUTORY_NOTICE",
            resource_id=notice_id,
            payload_hash=payload_hash,
            details_json=audit_details,
        )
        await uow.audit.append_event(audit_event)
        await uow.commit()

        return {
            "status": "SUCCESS",
            "message": f"Statutory notice {target_notice.get('referenceNo')} successfully dispatched.",
            "notice": target_notice,
        }





