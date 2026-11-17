"""FastAPI Endpoints for Massive Evidence Ingestion, Resource Admission Control, and Live Pipeline Monitoring."""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, UploadFile, File, status
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService
from app.services.ingestion.large_evidence_engine import (
    MAX_CHUNK_BYTES,
    AdmissionDecision,
    IngestionJob,
    IngestionJobManager,
    OperationalClass,
    ResourceAdmissionController,
    validate_case_id,
)
from app.services.ingestion.derived_store import RAILS, DerivedStore
from app.services.ingestion.large_evidence_engine import ensure_inside
from app.services.ingestion.projects_store import ProjectsStore

logger = logging.getLogger("tarka.api.ingestion")

router = APIRouter()


def get_current_user(authorization: Optional[str] = Header(None)) -> UserIdentity:
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization, strict=True)


def _authorized_job(job_id: str, user: UserIdentity) -> IngestionJob:
    """Look up a job and enforce case access on the job's own case."""
    job = IngestionJobManager.get_instance().jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")
    AuthService.get_instance().enforce_case_access(user, job.case_id)
    return job


def _checked_case_id(case_id: str) -> str:
    try:
        return validate_case_id(case_id)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(ve))


# ────────────────────────────────────────────────────────────────────
# Schemas
# ────────────────────────────────────────────────────────────────────

class ResourceEstimateRequest(BaseModel):
    case_id: str = Field(..., description="Target forensic case identifier")
    filename: str = Field(..., description="Evidence file name with extension")
    file_size_bytes: int = Field(..., ge=0, description="Total file size in bytes")


class CreateIngestionJobRequest(BaseModel):
    case_id: str = Field(..., description="Target forensic case identifier")
    filename: str = Field(..., description="Evidence file name with extension")
    total_size_bytes: int = Field(..., ge=0, description="Total expected size in bytes")


# ────────────────────────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────────────────────────

@router.get("/system-capacity", tags=["Resource Admission Control"])
async def get_system_capacity(
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns real-time host RAM headroom, active worker count, and admission threshold criteria."""
    headroom = ResourceAdmissionController.get_system_memory_headroom()
    mgr = IngestionJobManager.get_instance()
    active_jobs = [j.to_dict() for j in mgr.jobs.values() if not j.is_cancelled and j.stage != "EVIDENCE_AVAILABLE"]
    return {
        "memory_headroom": headroom,
        "max_concurrent_workers": ResourceAdmissionController.DEFAULT_MAX_WORKERS,
        "active_jobs_count": len(active_jobs),
        "threshold_tiers": {
            "SMALL": "< 5 MB (direct sync)",
            "MEDIUM": "5 MB - 50 MB (streaming worker)",
            "LARGE": "50 MB - 500 MB (chunked worker)",
            "VERY_LARGE": "500 MB - 5 GB (columnar disk stream)",
            "BULK_DATASET": "> 5 GB (partitioned queue)",
        },
    }


@router.post("/estimate-resources", tags=["Resource Admission Control"])
async def estimate_resources(
    req: ResourceEstimateRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Computes mathematical resource requirements and dynamic admission decision before upload."""
    AuthService.get_instance().enforce_case_access(user, _checked_case_id(req.case_id))
    mgr = IngestionJobManager.get_instance()
    active_worker_count = len([j for j in mgr.jobs.values() if not j.is_cancelled and j.stage != "EVIDENCE_AVAILABLE"])
    evaluation = ResourceAdmissionController.evaluate_admission(
        file_size_bytes=req.file_size_bytes,
        filename=req.filename,
        current_active_workers=active_worker_count,
    )
    return evaluation


@router.post("/jobs/create", tags=["Massive Evidence Ingestion"])
async def create_ingestion_job(
    req: CreateIngestionJobRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Initializes a resumable chunked ingestion job with bounded disk-backed staging."""
    AuthService.get_instance().enforce_case_access(user, _checked_case_id(req.case_id))

    # Evaluate admission safety
    admission = ResourceAdmissionController.evaluate_admission(
        file_size_bytes=req.total_size_bytes,
        filename=req.filename,
    )
    if admission["decision"] == AdmissionDecision.REJECT_UNSAFE.value:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=admission["reason"],
        )

    mgr = IngestionJobManager.get_instance()
    officer_name = user.display_name or "Forensic Examiner"
    job = mgr.create_job(
        case_id=req.case_id,
        filename=req.filename,
        total_size_bytes=req.total_size_bytes,
        intake_officer=officer_name,
    )
    resp = job.to_dict()
    resp["admission_evaluation"] = admission
    return resp


@router.put("/jobs/{job_id}/chunk", tags=["Massive Evidence Ingestion"])
async def upload_job_chunk(
    job_id: str,
    request: Request,
    offset: int = Query(..., ge=0, description="Byte offset matching the start of this chunk"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Streams a bounded chunk into the job staging buffer."""
    _authorized_job(job_id, user)
    too_large = HTTPException(
        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        detail=f"Chunk exceeds {MAX_CHUNK_BYTES} bytes.",
    )
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > MAX_CHUNK_BYTES:
        raise too_large
    buf = bytearray()
    async for part in request.stream():
        buf.extend(part)
        if len(buf) > MAX_CHUNK_BYTES:
            raise too_large
    chunk_bytes = bytes(buf)

    mgr = IngestionJobManager.get_instance()
    try:
        updated = await mgr.append_chunk(job_id=job_id, offset=offset, chunk_bytes=chunk_bytes)
        return updated
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")
    except OverflowError:
        raise too_large
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ve))
    except Exception as e:
        logger.exception("Failed to append ingestion chunk")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/jobs/{job_id}/status", tags=["Massive Evidence Ingestion"])
async def get_job_status(
    job_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns live 10-stage status, throughput, SHA-256 hash, and analytical summary."""
    return _authorized_job(job_id, user).to_dict()


@router.post("/jobs/{job_id}/pause", tags=["Massive Evidence Ingestion"])
async def pause_job(
    job_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Pauses an active ingestion pipeline job."""
    _authorized_job(job_id, user)
    mgr = IngestionJobManager.get_instance()
    try:
        return mgr.pause_job(job_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")


@router.post("/jobs/{job_id}/resume", tags=["Massive Evidence Ingestion"])
async def resume_job(
    job_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Resumes an interrupted or paused ingestion job from last verified checkpoint."""
    _authorized_job(job_id, user)
    mgr = IngestionJobManager.get_instance()
    try:
        return mgr.resume_job(job_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")


@router.post("/jobs/{job_id}/cancel", tags=["Massive Evidence Ingestion"])
async def cancel_job(
    job_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Cancels job and purges temporary staging buffers."""
    _authorized_job(job_id, user)
    mgr = IngestionJobManager.get_instance()
    try:
        return mgr.cancel_job(job_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")



class ColumnMappingRequest(BaseModel):
    columns: Dict[str, str] = Field(..., description="{date, amount, payer?, payee?, time?, ref?: header name}")
    template_name: Optional[str] = Field(None, description="Save this mapping as a per-bank template")


@router.get("/jobs", tags=["Massive Evidence Ingestion"])
async def list_jobs(
    case_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    user: UserIdentity = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Jobs for a case or a project's cases (newest first), limited to cases the user may see."""
    mgr = IngestionJobManager.get_instance()
    case_ids = None
    if case_id:
        case_ids = {_checked_case_id(case_id)}
    if project_id:
        in_project = ProjectsStore(mgr.base_dir).case_ids(project_id)
        case_ids = in_project if case_ids is None else case_ids & in_project
    auth = AuthService.get_instance()
    return [j.to_dict() for j in mgr.list_jobs(case_ids) if auth.validate_case_scope(user, j.case_id)]


@router.post("/jobs/{job_id}/mapping", tags=["Massive Evidence Ingestion"])
async def map_job_columns(
    job_id: str,
    req: ColumnMappingRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Apply an investigator's column mapping to a NEEDS_MAPPING file and re-run processing."""
    _authorized_job(job_id, user)
    try:
        return await IngestionJobManager.get_instance().apply_mapping(
            job_id, req.columns, req.template_name, actor=user.display_name or None)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(ve))


@router.get("/mapping-templates", tags=["Massive Evidence Ingestion"])
async def list_mapping_templates(user: UserIdentity = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return IngestionJobManager.get_instance().templates()


# ────────────────────────────────────────────────────────────────────
# Evidence & Ledger: paged rows, rejected rows, chain of custody
# ────────────────────────────────────────────────────────────────────

def _case_store(case_id: str, user: UserIdentity) -> Optional[DerivedStore]:
    case_id = _checked_case_id(case_id)
    AuthService.get_instance().enforce_case_access(user, case_id)
    mgr = IngestionJobManager.get_instance()
    case_dir = ensure_inside(mgr.derived_dir, mgr.derived_dir / case_id)
    return DerivedStore(case_dir) if (case_dir / "derived.sqlite").exists() else None


@router.get("/cases/{case_id}/txns", tags=["Evidence Ledger"])
async def case_txns(
    case_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    network_id: Optional[str] = Query(None, description="Only rows touching this network's accounts"),
    account: Optional[str] = Query(None, description="Only rows where this account (exact, any case) pays or is paid"),
    party: str = Query("", max_length=120, description="Account name / UPI id contains"),
    min_amount: Optional[float] = Query(None, ge=0),
    max_amount: Optional[float] = Query(None, ge=0),
    from_ts: Optional[float] = Query(None),
    to_ts: Optional[float] = Query(None),
    rail: str = Query(""),
    ref: str = Query("", max_length=64, description="UTR / RRN / reference contains"),
    job_id: str = Query("", max_length=40, description="Only rows read from this uploaded file"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Ledger rows from every uploaded statement in the case, oldest first, scoped to a network or account."""
    if rail and rail not in RAILS:
        raise HTTPException(status_code=422, detail=f"rail must be one of {', '.join(RAILS)}")
    store = _case_store(case_id, user)
    empty = {"total": 0, "total_inr": 0, "rows": [], "scope_accounts": None, "scope_accounts_total": None}
    if store is None:
        return empty
    keys, scope_total = None, None
    if network_id:
        from app.services.ingestion.networks import case_networks

        mgr = IngestionJobManager.get_instance()
        net = next((n for n in case_networks(mgr.derived_dir, case_id)["networks"] if n["network_id"] == network_id), None)
        if net is None:
            raise HTTPException(status_code=404, detail=f"Network '{network_id}' is not in case {case_id}.")
        # shortcut: the network's members as listed (top 200 by mule score); list all members for huge gangs.
        keys, scope_total = {m["id"] for m in net["members"]}, net["member_count"]
    if account:
        keys = {account.strip().lower()}  # an account is narrower than its network
    page = await asyncio.to_thread(
        store.query_txns, offset=offset, limit=limit, keys=keys, party=party.strip(), min_amount=min_amount,
        max_amount=max_amount, from_ts=from_ts, to_ts=to_ts, rail=rail, ref=ref.strip(), job_id=job_id,
    )
    names = {j.job_id: j.filename for j in IngestionJobManager.get_instance().list_jobs({case_id})}
    for r in page["rows"]:
        r["filename"] = names.get(r["job_id"], r["job_id"])
    page["scope_accounts"] = len(keys) if keys is not None else None
    page["scope_accounts_total"] = scope_total
    return page


@router.get("/cases/{case_id}/devices", tags=["Devices"])
async def case_devices_view(
    case_id: str,
    account: Optional[str] = Query(None, max_length=120, description="Source rows for this account / phone"),
    kind: Optional[str] = Query(None, description="imei | imsi | ip | bssid | device_id"),
    value: Optional[str] = Query(None, max_length=120, description="Source rows for this identifier"),
    limit: int = Query(500, ge=1, le=2000),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Phones, SIMs, IPs and Wi-Fi seen with the case's accounts: shared-identifier clusters, SIM changes, source rows."""
    from app.services.ingestion.device_store import DEVICE_KINDS, case_devices

    if kind and kind not in DEVICE_KINDS:
        raise HTTPException(status_code=422, detail=f"kind must be one of {', '.join(DEVICE_KINDS)}")
    case_id = _checked_case_id(case_id)
    AuthService.get_instance().enforce_case_access(user, case_id)
    mgr = IngestionJobManager.get_instance()
    out = await asyncio.to_thread(case_devices, ensure_inside(mgr.derived_dir, mgr.derived_dir / case_id), account, kind, value, limit)
    if out["rows"]:
        names = {j.job_id: j.filename for j in mgr.list_jobs({case_id})}
        for r in out["rows"]:
            r["filename"] = names.get(r["job_id"], r["job_id"])
    return out


@router.get("/jobs/{job_id}/rejected", tags=["Evidence Ledger"])
async def job_rejected_rows(
    job_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Rows of one file that could not be read, with the reason and the raw line, plus counts per reason."""
    job = _authorized_job(job_id, user)
    store = _case_store(job.case_id, user)
    if store is None:
        return {"total": 0, "by_reason": [], "rows": []}
    return await asyncio.to_thread(store.rejected_page, job_id, offset, limit)


@router.get("/cases/{case_id}/custody", tags=["Evidence Ledger"])
async def case_custody(case_id: str, user: UserIdentity = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Chain of custody for every file in the case: who did what, when (oldest first)."""
    case_id = _checked_case_id(case_id)
    AuthService.get_instance().enforce_case_access(user, case_id)
    mgr = IngestionJobManager.get_instance()
    names = {j.job_id: j.filename for j in mgr.list_jobs({case_id})}
    return [{**e, "filename": names.get(e["job_id"], "")} for e in mgr.custody_events(case_id)]
