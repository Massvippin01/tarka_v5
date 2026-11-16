"""FastAPI Endpoints for Massive Evidence Ingestion, Resource Admission Control, and Live Pipeline Monitoring."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, UploadFile, File, status
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService
from app.services.ingestion.large_evidence_engine import (
    AdmissionDecision,
    IngestionJobManager,
    OperationalClass,
    ResourceAdmissionController,
)

logger = logging.getLogger("tarka.api.ingestion")

router = APIRouter()


def get_current_user(authorization: Optional[str] = Header(None)) -> UserIdentity:
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization, strict=True)


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
    AuthService.get_instance().enforce_case_access(user, req.case_id)
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
    AuthService.get_instance().enforce_case_access(user, req.case_id)

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
    mgr = IngestionJobManager.get_instance()
    chunk_bytes = await request.body()
    if not chunk_bytes and offset == 0:
        chunk_bytes = b""

    try:
        updated = await mgr.append_chunk(job_id=job_id, offset=offset, chunk_bytes=chunk_bytes)
        return updated
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")
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
    mgr = IngestionJobManager.get_instance()
    job = mgr.jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")
    return job.to_dict()


@router.post("/jobs/{job_id}/pause", tags=["Massive Evidence Ingestion"])
async def pause_job(
    job_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Pauses an active ingestion pipeline job."""
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
    mgr = IngestionJobManager.get_instance()
    try:
        return mgr.cancel_job(job_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")

