"""SentinelX Forensic Intelligence API.

Mounted under `/api/v1/forensics`.
Powered by TARKA deterministic forensics engine and Z3 SMT logic.
Strictly adheres to the SentinelX Wave 6 Engineering Constitution:
- Evidence is DATA_ONLY.
- Strict Non-Promotability Invariant for AI inferences.
- Case data and custody isolation enforced.
- 7-Factor RBAC and case-level authorization strictly enforced.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.adapters.tarka_forensics_adapter import TarkaForensicsAdapter
from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService

logger = logging.getLogger("sentinelx.api.forensics")

router = APIRouter()
adapter = TarkaForensicsAdapter()


def get_current_user(authorization: Optional[str] = Header(None)) -> UserIdentity:
    """Enforces strict SentinelX 7-factor RBAC authentication.
    
    Rejects missing or invalid credentials with HTTP 401 UNAUTHORIZED.
    """
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization, strict=True)


# --- Request & Response Models ---

class ChallengeRequest(BaseModel):
    baseline_run_id: str
    excluded_artifact_ids: List[str]
    investigator_note: Optional[str] = "Counterfactual artifact exclusion test"


class ReportRequest(BaseModel):
    run_id: Optional[str] = None
    examiner_name: Optional[str] = "Forensic Officer"
    investigation_purpose: Optional[str] = "Statutory Digital Evidence Inspection"
    fallback_to_baseline: Optional[bool] = False
    fallback_reason: Optional[str] = None


class ReviewActionRequest(BaseModel):
    target_id: str = Field(..., description="Finding ID or Gap ID being reviewed")
    decision: str = Field(..., description="RESOLVE, ACCEPT, REJECT, MARK_UNREADABLE, CONFIRM_ABSENT, or CORRECT")
    reviewed_by: Optional[str] = Field(None, description="Examiner ID / Name (defaults to authenticated user)")
    notes: Optional[str] = Field(None, description="Investigator rationale and observational evidence")
    scope: Optional[str] = Field(None, description="Mandatory examination scope when decision is CONFIRM_ABSENT")
    target_type: Optional[str] = Field(None, description="'finding' or 'gap' (auto-detected if omitted)")


class IngestFilesRequest(BaseModel):
    filenames: List[str] = Field(..., description="List of filenames staged in permitted directory to ingest")
    directory_alias: Optional[str] = Field("Downloads", description="Permitted directory alias: 'Downloads' or 'Staging'")


class CreateCaseRequest(BaseModel):
    case_id: Optional[str] = None
    title: str = Field(..., min_length=3)
    description: Optional[str] = ""
    jurisdiction: Optional[str] = "IN_DELHI"


class WebhookPayloadRequest(BaseModel):
    entry: List[Dict[str, Any]] = Field(default_factory=list)


class SessionRequest(BaseModel):
    username: str = "INVESTIGATOR_DELHI"


# --- Endpoints ---

@router.post("/auth/session", tags=["Forensics Auth"])
def create_forensic_investigator_session(req: SessionRequest) -> Dict[str, Any]:
    """Issues a signed HMAC-SHA256 JWT session token for the specified investigator."""
    auth_service = AuthService.get_instance()
    u = req.username.upper().strip()
    if u not in auth_service.users:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{req.username}' not found in forensic directory.",
        )
    user = auth_service.users[u]
    jwt_token = auth_service.create_jwt_token(u)
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "user_id": user.user_id,
        "display_name": user.display_name,
        "badge_number": user.badge_number,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "allowed_cases": user.scope.allowed_cases if user.scope else [],
    }


@router.get("/health", tags=["Forensics Engine"])
def get_forensics_health() -> Dict[str, Any]:
    """Returns TARKA forensics engine health, Z3 solver status, and active case workspaces."""
    import z3
    cases = adapter.list_cases()
    return {
        "status": "healthy",
        "engine": "TARKA Digital Forensics Engine",
        "version": "1.0.0",
        "solver": f"Z3 SMT v{z3.get_version_string()}",
        "architecture": "Pure Python & Precompiled Deterministic Logic",
        "active_cases_count": len(cases),
        "disclaimer": "Cryptographic hashes verify bitstream preservation. Legal conclusions require human statutory review.",
    }


@router.get("/cases", tags=["Forensics Cases"])
def list_forensic_cases(user: UserIdentity = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Lists isolated forensic case workspaces authorized for the current user."""
    auth_service = AuthService.get_instance()
    cases = adapter.list_cases()
    return [c for c in cases if auth_service.validate_case_scope(user, c.get("case_id", ""))]


@router.post("/cases", tags=["Forensics Cases"], status_code=status.HTTP_201_CREATED)
def create_forensic_case(
    req: CreateCaseRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Creates a new isolated forensic case workspace and grants investigator access."""
    auth_service = AuthService.get_instance()
    case_id = req.case_id or f"case_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    case_data = adapter.create_case(
        case_id=case_id,
        title=req.title,
        description=req.description or "",
        investigator=user.display_name or user.user_id,
    )
    if user.scope and case_id not in user.scope.allowed_cases:
        user.scope.allowed_cases.append(case_id)
    for u in auth_service.users.values():
        if u.user_id == user.user_id and u.scope and case_id not in u.scope.allowed_cases:
            u.scope.allowed_cases.append(case_id)

    from app.services.audit_service import AuditService
    audit = AuditService.get_instance()
    audit.record_event(
        actor_id=user.user_id,
        action="CREATE_FORENSIC_CASE",
        resource_type="CASE",
        resource_id=case_id,
        case_id=case_id,
        details={"title": req.title, "jurisdiction": req.jurisdiction},
    )
    return case_data


@router.get("/cases/{case_id}", tags=["Forensics Cases"])
def get_forensic_case(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns metadata, custody chain head, and artifact counts for an authorized case."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    case = adapter.get_case_detail(case_id)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Forensic case '{case_id}' not found.",
        )
    return case


@router.post("/cases/{case_id}/seed-synthetic", tags=["Forensics Cases"])
def seed_synthetic_case(
    case_id: str = "upi_payment_discrepancy",
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Deterministically seeds the canonical SUTRAM 2026 digital fraud investigation case."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        return adapter.ensure_synthetic_case(case_id)
    except PermissionError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )


@router.get("/cases/{case_id}/artifacts", tags=["Evidence Register"])
def list_case_artifacts(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Lists all artifacts in a case with SHA-256 hashes and custody chain sequences."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.list_artifacts(case_id)


@router.get("/cases/{case_id}/artifacts/{artifact_id}/verify", tags=["Evidence Integrity"])
def verify_artifact_bitstream(
    case_id: str,
    artifact_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Cryptographically verifies artifact bitstream on disk against the tamper-evident custody ledger."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    res = adapter.verify_artifact_integrity(case_id, artifact_id)
    if not res.get("verified", True) and "not found" in res.get("error", "").lower():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=res["error"])
    return res


@router.get("/cases/{case_id}/artifacts/{artifact_id}/content", tags=["Evidence Register"])
def get_artifact_content(
    case_id: str,
    artifact_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Safely retrieves and parses artifact content for structured human inspection and preview."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        return adapter.get_artifact_content(case_id, artifact_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception(f"Failed to read artifact content for {artifact_id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to read artifact: {exc}")


@router.get("/cases/{case_id}/artifacts/{artifact_id}/download", tags=["Evidence Register"])
def download_artifact(
    case_id: str,
    artifact_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """Safely streams raw artifact bytes with custody-preserved attachment headers."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        raw_bytes, media_type, filename = adapter.get_artifact_bytes(case_id, artifact_id)
        return Response(
            content=raw_bytes,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception(f"Failed to stream artifact {artifact_id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to stream artifact: {exc}")



@router.get("/cases/{case_id}/timeline", tags=["Forensic Timeline"])
def get_case_timeline(
    case_id: str,
    run_id: Optional[str] = Query(None, description="Optional Analysis Run ID (defaults to baseline)"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Reconstructs chronological multi-tier event timeline with explicit time uncertainty."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.get_timeline(case_id, run_id=run_id)


@router.get("/cases/{case_id}/contradictions", tags=["Contradiction Analysis"])
def get_case_contradictions(
    case_id: str,
    run_id: Optional[str] = Query(None, description="Optional Analysis Run ID (defaults to baseline)"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns isolated contradictions and evidence gaps with Minimal Unsatisfiable Subsets (MUS)."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.get_contradictions(case_id, run_id=run_id)


@router.get("/cases/{case_id}/investigation-graph", tags=["Investigation Graph"])
def get_investigation_graph(
    case_id: str,
    run_id: Optional[str] = Query(None, description="Optional Analysis Run ID (defaults to baseline)"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns SentinelX graph projection of case entities, facts, claims, and correlations."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.export_sentinelx_graph(case_id, run_id=run_id)


@router.get("/cases/{case_id}/provenance-dag", tags=["Provenance & Lineage"])
def get_provenance_dag(
    case_id: str,
    run_id: Optional[str] = Query(None, description="Optional Analysis Run ID (defaults to baseline)"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns directed acyclic provenance graph tracing findings down to source bytes."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.get_provenance_dag(case_id, run_id=run_id)


@router.post("/cases/{case_id}/challenge", tags=["Evidence Robustness Lab"])
def run_counterfactual_challenge(
    case_id: str,
    req: ChallengeRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Executes counterfactual recomputation in the Evidence Robustness Lab by excluding artifacts."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.run_counterfactual_challenge(
        case_id=case_id,
        baseline_run_id=req.baseline_run_id,
        excluded_artifact_ids=req.excluded_artifact_ids,
        investigator_note=req.investigator_note or "",
    )


@router.post("/cases/{case_id}/reports", tags=["Forensic Reporting"])
def generate_statutory_report(
    case_id: str,
    req: ReportRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Generates Section 63 Indian Evidence Act / BSA compliant report."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        return adapter.generate_report(
            case_id=case_id,
            run_id=req.run_id,
            officer=req.examiner_name or "Forensic Officer",
            reason=req.investigation_purpose or "Digital Evidence Audit",
            fallback_to_baseline=bool(req.fallback_to_baseline),
            fallback_reason=req.fallback_reason,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("/cases/{case_id}/reports", tags=["Forensic Reporting"])
def list_statutory_reports(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Lists all previously generated and saved forensic reports for an authorized case."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.list_reports(case_id)


@router.get("/cases/{case_id}/reports/{report_id}", tags=["Forensic Reporting"])
def get_statutory_report(
    case_id: str,
    report_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieves a specific stored forensic report."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    report = adapter.get_report_detail(case_id, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report '{report_id}' not found in case '{case_id}'.",
        )
    return report


@router.get("/cases/{case_id}/reports/{report_id}/export", tags=["Forensic Reporting"])
def export_statutory_report(
    case_id: str,
    report_id: str,
    format: str = Query("pdf", pattern="^(pdf|html|json|PDF|HTML|JSON)$", description="Export format: pdf, html, or json"),
    user: UserIdentity = Depends(get_current_user),
):
    """Exports and downloads an official Section 63 BSA forensic certificate as PDF, HTML, or JSON."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        content, media_type, filename = adapter.export_report_bytes(case_id, report_id, fmt=format)
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to export statutory report")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate export: {exc}")



@router.post("/cases/{case_id}/ingest", tags=["Evidence Ingestion"])
async def ingest_case_evidence(
    case_id: str,
    files: List[UploadFile] = File(...),
    tz: str = Form("Asia/Kolkata"),
    append_to_custody: bool = Form(True),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Ingests raw forensic evidence files into the authorized case workspace."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    from tarka.api.server import ingest_evidence_files
    res = await ingest_evidence_files(
        files=files,
        tz=tz,
        case_id=case_id,
        append_to_custody=append_to_custody,
    )
    return res.model_dump() if hasattr(res, "model_dump") else res


# --- Finding Explainability, Provenance & Examiner Review ---

@router.get("/cases/{case_id}/findings/{finding_id}/explanation", tags=["Finding Explainability"])
def get_finding_explanation(
    case_id: str,
    finding_id: str,
    run_id: Optional[str] = Query(None, description="Optional Analysis Run ID (defaults to baseline)"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns an evidence-grounded, non-accusatory deterministic explanation for a finding."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        return adapter.explain_finding(case_id=case_id, finding_id=finding_id, run_id=run_id)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Finding '{finding_id}' not found in case '{case_id}'.",
        )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/cases/{case_id}/findings/{finding_id}/provenance", tags=["Finding Provenance"])
def get_finding_provenance(
    case_id: str,
    finding_id: str,
    run_id: Optional[str] = Query(None, description="Optional Analysis Run ID (defaults to baseline)"),
    direction: str = Query("BACKWARD", pattern="^(BACKWARD|FORWARD|backward|forward)$", description="Direction of provenance trace"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Returns bidirectional provenance trace linking a finding or artifact to raw bytes and custody."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        return adapter.trace_finding_provenance(
            case_id=case_id,
            target_id=finding_id,
            run_id=run_id,
            direction=direction.upper(),
        )
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target '{finding_id}' not found in case '{case_id}'.",
        )
    except ValueError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/cases/{case_id}/reviews", tags=["Examiner Review"])
def record_examiner_review(
    case_id: str,
    req: ReviewActionRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Records an authorized examiner statutory review action into the tamper-evident custody ledger."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)

    valid_decisions = {"RESOLVE", "ACCEPT", "REJECT", "MARK_UNREADABLE", "CONFIRM_ABSENT", "CORRECT"}
    decision_norm = req.decision.strip().upper()
    if decision_norm not in valid_decisions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review decision '{req.decision}'. Must be one of: {', '.join(sorted(valid_decisions))}",
        )

    if decision_norm == "CONFIRM_ABSENT" and (not req.scope or not req.scope.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mandatory examination scope is required when recording a CONFIRM_ABSENT decision.",
        )

    reviewer = req.reviewed_by or user.display_name or user.user_id or "Lead Forensic Examiner"

    return adapter.record_examiner_review(
        case_id=case_id,
        target_id=req.target_id,
        decision=decision_norm,
        reviewed_by=reviewer,
        notes=req.notes,
        scope=req.scope,
        target_type=req.target_type,
    )


@router.get("/cases/{case_id}/reviews", tags=["Examiner Review"])
def list_examiner_reviews(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Lists examiner reviews recorded for case contradiction findings and evidence gaps."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.list_examiner_reviews(case_id)


# --- Evidence Ingestion, Real-Time Orchestration & Phase 10 Payment Forensics ---

@router.post("/cases/{case_id}/evidence/upload", tags=["Evidence Ingestion"], status_code=status.HTTP_201_CREATED)
async def upload_case_evidence(
    case_id: str,
    file: UploadFile = File(...),
    source_channel: str = Form("DIRECT_UPLOAD"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Admits single evidence file, validates size/format, hashes, immutably stores, registers custody, and extracts observations."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Evidence file is empty.")

    res = adapter.upload_evidence(
        case_id=case_id,
        filename=file.filename or "evidence.bin",
        file_bytes=file_bytes,
        source_channel=source_channel,
        officer=user.display_name or user.user_id,
    )

    from app.services.audit_service import AuditService
    audit = AuditService.get_instance()
    audit.record_event(
        actor_id=user.user_id,
        action="EVIDENCE_ADMITTED",
        resource_type="EVIDENCE",
        resource_id=res["evidence"]["evidence_id"],
        case_id=case_id,
        details={
            "filename": file.filename,
            "sha256": res["evidence"]["sha256"],
            "file_size": res["evidence"]["file_size"],
            "is_duplicate": res["evidence"]["is_duplicate"],
        },
    )
    return res


@router.post("/cases/{case_id}/evidence/multimodal-upload", tags=["Evidence Ingestion"], status_code=status.HTTP_201_CREATED)
async def upload_case_multimodal_evidence(
    case_id: str,
    files: List[UploadFile] = File(...),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Phase 10 Multimodal Gateway: Accepts multiple files (screenshots, bank statements, receipts, exports),
    validates headers/magic bytes, defends against decompression bombs and path traversals,
    writes to isolated storage tiers, registers custody ledger, and enqueues async forensic job.
    """
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No evidence files provided.")

    file_tuples = []
    for f in files:
        b = await f.read()
        if len(b) > 0:
            file_tuples.append((f.filename or "evidence.bin", b))

    if not file_tuples:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="All submitted evidence files were empty.")

    try:
        res = adapter.ingest_multimodal_batch(
            case_id=case_id,
            files=file_tuples,
            officer=user.display_name or user.user_id,
            user_id=user.user_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    from app.services.audit_service import AuditService
    audit = AuditService.get_instance()
    audit.record_event(
        actor_id=user.user_id,
        action="MULTIMODAL_EVIDENCE_INGESTED",
        resource_type="CASE",
        resource_id=case_id,
        case_id=case_id,
        details={
            "job_id": res["job_id"],
            "admitted_count": res["admitted_count"],
            "total_submitted": res["total_submitted"],
        },
    )
    return res


@router.get("/cases/{case_id}/jobs/{job_id}", tags=["Evidence Ingestion"])
def get_case_job(
    case_id: str,
    job_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Tracks status and progress of an asynchronous analysis job."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    job = adapter.get_job(case_id, job_id)
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job '{job_id}' not found.")
    return job


@router.post("/cases/{case_id}/jobs/{job_id}/cancel", tags=["Evidence Ingestion"])
def cancel_case_job(
    case_id: str,
    job_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Cancels an active or queued forensic processing job."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    success = adapter.cancel_job(case_id, job_id)
    return {
        "job_id": job_id,
        "cancelled": success,
        "status": "CANCELLED" if success else "NOT_FOUND_OR_COMPLETED",
    }


@router.get("/cases/{case_id}/events/stream", tags=["Evidence Ingestion"])
async def stream_case_events(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Server-Sent Events (SSE) endpoint providing real-time progressive forensic analysis updates.
    Eliminates client-side polling and streams state transitions immediately.
    """
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)

    return StreamingResponse(
        adapter.job_orchestrator.sse_event_stream(case_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/cases/{case_id}/observations", tags=["Evidence Observations"])
def list_case_observations(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Retrieves atomic forensic observations extracted from admitted case evidence."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    obs = adapter.list_observations(case_id)
    return {
        "case_id": case_id,
        "observations_count": len(obs),
        "observations": obs,
    }


@router.post("/cases/{case_id}/trace/reconcile", tags=["TRACE Financial Engine"])
def reconcile_case_transactions(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Runs TRACE double-entry ledger balance reconciliation and receipt examination."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.reconcile_finances(case_id)


@router.post("/cases/{case_id}/whatsapp/webhook", tags=["WhatsApp Forensics Gateway"])
def receive_whatsapp_webhook(
    case_id: str,
    payload: WebhookPayloadRequest,
    x_hub_signature_256: Optional[str] = Header(None),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Receives and processes incoming WhatsApp webhook payloads."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    raw_payload_bytes = json.dumps(payload.model_dump()).encode("utf-8")
    if not adapter.whatsapp_gateway.verify_webhook_signature(raw_payload_bytes, x_hub_signature_256):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid WhatsApp webhook signature.")

    return adapter.whatsapp_gateway.process_webhook_payload(
        payload=payload.model_dump(),
        case_id=case_id,
        investigator_id=user.user_id,
    )


@router.get("/cases/{case_id}/artifacts/{artifact_id}/examination", tags=["TRACE Payment Forensics"])
def get_artifact_examination(
    case_id: str,
    artifact_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Executes deep TRACE visual and metadata forensics on a payment screenshot:
    OCR polygon extraction, Error Level Analysis (ELA at Q=90), typography discontinuity, and metadata inspection.
    """
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        return adapter.examine_screenshot_artifact(case_id, artifact_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("/cases/{case_id}/hypotheses", tags=["AEGIS Investigative Reasoning"])
def get_competing_hypotheses(
    case_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Generates Analysis of Competing Hypotheses (ACH) matrix (H1 Digital Alteration, H2 Split Sequence, H3 Account Takeover)
    and prioritized evidence gaps under Indian statutory regimes (BNSS 94/105, CrPC 91, IT Act 69).
    """
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.get_case_hypotheses(case_id)


# --- Grounded SLM Assistant & Voice Integration ---


from app.intelligence.local_llm_provider import default_llm_provider


class AssistantQueryRequest(BaseModel):
    query: str
    conversation_history: Optional[List[Dict[str, str]]] = None


class VoiceQueryRequest(BaseModel):
    transcript_or_text: str
    require_confirmation: Optional[bool] = True
    session_id: Optional[str] = None


@router.get("/assistant/runtime", tags=["Grounded Assistant"])
def get_assistant_runtime_status(user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Reports detected local SLM/LLM runtime status, device capabilities, and memory usage."""
    return default_llm_provider.get_runtime_status()


@router.post("/cases/{case_id}/assistant/query", tags=["Grounded Assistant"])
def query_grounded_assistant(
    case_id: str,
    req: AssistantQueryRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Natural-language question answering strictly grounded in verified case evidence."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)

    artifacts = adapter.list_artifacts(case_id)
    facts = adapter.store.list_canonical_facts(case_id)
    contradictions = adapter.get_contradictions(case_id).get("contradictions", [])
    timeline_events = adapter.get_timeline(case_id).get("events", [])
    gaps = adapter.get_contradictions(case_id).get("evidence_gaps", [])

    context = {
        "artifacts": artifacts,
        "facts": [f.model_dump(mode="json") if hasattr(f, "model_dump") else f for f in facts],
        "contradictions": contradictions,
        "timeline_events": timeline_events,
        "evidence_gaps": gaps,
    }

    return default_llm_provider.generate_grounded_response(
        case_id=case_id,
        query=req.query,
        case_context=context,
        conversation_history=req.conversation_history,
    )


@router.post("/cases/{case_id}/voice/interact", tags=["Natural Voice Interface"])
def voice_interact(
    case_id: str,
    req: VoiceQueryRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Voice interaction endpoint returning speech text, citations, and confirmation guardrails."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)

    text = req.transcript_or_text.strip()
    destructive_keywords = ["delete", "drop", "alter custody", "reset all", "purge", "dismiss all"]
    is_destructive = any(w in text.lower() for w in destructive_keywords)

    if is_destructive:
        return {
            "status": "CONFIRMATION_REQUIRED",
            "prompt": f"Action '{text}' has destructive impact. Statutory rules require explicit investigator confirmation. Proceed?",
            "action": text,
            "requires_human_confirmation": True,
        }

    artifacts = adapter.list_artifacts(case_id)
    facts = adapter.store.list_canonical_facts(case_id)
    contradictions = adapter.get_contradictions(case_id).get("contradictions", [])
    timeline_events = adapter.get_timeline(case_id).get("events", [])

    context = {
        "artifacts": artifacts,
        "facts": [f.model_dump(mode="json") if hasattr(f, "model_dump") else f for f in facts],
        "contradictions": contradictions,
        "timeline_events": timeline_events,
    }

    resp = default_llm_provider.generate_grounded_response(
        case_id=case_id,
        query=text,
        case_context=context,
    )

    return {
        "status": "SUCCESS",
        "user_query": text,
        "speech_output": resp.get("speech_text"),
        "answer_markdown": resp.get("answer_markdown"),
        "citations": resp.get("citations", []),
        "uncertainty_disclosure": resp.get("uncertainty_disclosure"),
        "requires_human_confirmation": False,
    }


# --- Sarvam AI Voice & Safe Agent Orchestration ---

from app.intelligence.sarvam_voice_service import (
    sarvam_voice_service,
    SafeForensicAgentOrchestrator,
)

orchestrator = SafeForensicAgentOrchestrator(adapter=adapter, voice_service=sarvam_voice_service)


class SarvamSynthesizeRequest(BaseModel):
    text: str
    target_language_code: Optional[str] = "en-IN"
    speaker: Optional[str] = None
    sample_rate: Optional[int] = 22050


class AgentOrchestrateRequest(BaseModel):
    query: Optional[str] = None
    text: Optional[str] = None
    confirmed: Optional[bool] = False
    tool_override: Optional[str] = None
    session_id: Optional[str] = None
    language_code: Optional[str] = "en-IN"
    speaker: Optional[str] = None


@router.get("/sarvam/status", tags=["Sarvam Voice Agent"])
def get_sarvam_status(user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Reports Sarvam AI voice models, Indic language support, and cloud/offline status."""
    return sarvam_voice_service.get_service_status()


@router.post("/sarvam/transcribe", tags=["Sarvam Voice Agent"])
async def transcribe_speech_sarvam(
    file: UploadFile = File(...),
    language_code: str = Form("en-IN"),
    mode: str = Form("codemix"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Transcribes spoken audio using Sarvam Saaras model with language detection."""
    content = await file.read()
    return sarvam_voice_service.transcribe_audio(
        audio_bytes=content,
        filename=file.filename or "speech.wav",
        content_type=file.content_type or "audio/wav",
        language_code=language_code,
        mode=mode,
    )


@router.post("/sarvam/synthesize", tags=["Sarvam Voice Agent"])
def synthesize_speech_sarvam(
    req: SarvamSynthesizeRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Synthesizes text into high-fidelity Indian speech using Sarvam Bulbul model."""
    return sarvam_voice_service.synthesize_speech(
        text=req.text,
        target_language_code=req.target_language_code or "en-IN",
        speaker=req.speaker,
        sample_rate=req.sample_rate or 22050,
    )


@router.post("/cases/{case_id}/agent/orchestrate", tags=["Safe Agent Orchestration"])
def orchestrate_agent_action(
    case_id: str,
    req: AgentOrchestrateRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Executes safe, allowlisted forensic actions through the 6-state pipeline with confirmation guardrails."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)

    raw_query = req.query or req.text or ""
    interpreted = orchestrator.interpret_investigator_query(
        raw_query,
        active_case_id=case_id,
        session_id=req.session_id,
    )
    tool_name = req.tool_override or interpreted["tool_name"]
    args = interpreted["args"]
    is_confirmed = req.confirmed or interpreted.get("confirmed", False)

    execution = orchestrator.execute_tool(
        tool_name=tool_name,
        args=args,
        user=user,
        confirmed=is_confirmed,
        session_id=req.session_id,
        query=raw_query,
        language_code=req.language_code or "en-IN",
        speaker=req.speaker,
    )


    return {
        "status": execution.get("state"),
        "tool_executed": tool_name,
        "tool": tool_name,
        "intent_summary": interpreted.get("intent_summary"),
        "pipeline_stages": execution.get("pipeline", []),
        "result": execution.get("result"),
        "confirmation_prompt": execution.get("confirmation_prompt"),
        "requires_confirmation": execution.get("state") == "CONFIRMATION_REQUIRED",
        "cancelled": interpreted.get("cancelled", False),
        "spoken_text": execution.get("spoken_text"),
        "presentation": execution.get("presentation"),
        "preview_artifact_id": execution.get("preview_artifact_id"),
        "speech": execution.get("speech"),
        "navigation_view": execution.get("navigation_view"),
        "language_code": execution.get("language_code", req.language_code or "en-IN"),
        "execution_latency_ms": execution.get("execution_latency_ms"),
        "error": execution.get("error"),
    }


# --- Narrow Safe Permitted File Discovery & Voice Ingestion (Phase 5) ---

@router.get("/cases/{case_id}/files/search", tags=["Safe File Staging Bridge"])
def search_permitted_files(
    case_id: str,
    query: str = Query("case 1", description="Case search query"),
    directory_alias: str = Query("Downloads", description="'Downloads' or 'Staging'"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Scans user-approved permitted directory for matching case evidence files without executing code."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.search_permitted_local_files(query=query, directory_alias=directory_alias)


@router.get("/cases/{case_id}/files/preview", tags=["Safe File Staging Bridge"])
def preview_permitted_file(
    case_id: str,
    filename: str = Query(..., description="Staged filename to preview safely"),
    directory_alias: str = Query("Downloads", description="'Downloads' or 'Staging'"),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Safely previews an un-ingested file from a permitted directory without executing code."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        return adapter.preview_selected_file(filename=filename, directory_alias=directory_alias)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except FileNotFoundError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


@router.post("/cases/{case_id}/files/ingest", tags=["Safe File Staging Bridge"])
def ingest_permitted_files(
    case_id: str,
    req: IngestFilesRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Ingests specified files from permitted directory into canonical CaseStore with bitstream SHA-256 verification."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    return adapter.ingest_selected_evidence(
        filenames=req.filenames,
        case_id=case_id,
        directory_alias=req.directory_alias or "Downloads",
        officer=user.display_name or "Lead Forensic Examiner",
    )


# --- Section 63 BSA Report Verification (Phase 8 & 10) ---

@router.get("/cases/{case_id}/reports/{report_id}/verify", tags=["Forensics Reports"])
def verify_statutory_report(
    case_id: str,
    report_id: str,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Verifies Section 63 BSA statutory report integrity, comparing persisted PDF hash to custody ledger seal."""
    auth_service = AuthService.get_instance()
    auth_service.enforce_case_access(user, case_id)
    try:
        return adapter.verify_report(case_id=case_id, report_id=report_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# --- System Status & Verification Engine Health ---

@router.get("/system/status", tags=["Forensics Engine"])
def get_system_operational_status() -> Dict[str, Any]:
    """Returns end-to-end system status for formal reasoning, voice service, and evidence store."""
    return adapter.get_system_status()


