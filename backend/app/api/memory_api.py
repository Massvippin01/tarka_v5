"""
SentinelX Governed Investigation Memory API.

Exposes strictly governed HTTP endpoints for:
- Active Working Memory retrieval and sync
- Policy-Aware Cross-Tier Memory Retrieval (MemoryRetriever)
- Governed Memory Writes & Invalidation
- Snapshot Capture & Deterministic Investigation Rehydration
- Organizational Memory Exploration, Promotion Proposals, and Supervisor Approval
- Telemetry & Metrics Instrumentation

CRITICAL INVARIANTS:
1. All requests pass through OperatingContext & Policy authorization.
2. Memory is strictly DATA_ONLY.
3. No direct database or store mutations bypass MemoryService.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.domain.memory import (
    MemoryEpistemicStatus,
    MemoryQuery,
    MemoryRecord,
    MemoryRetrievalResult,
    MemoryScope,
    MemorySensitivity,
    MemorySnapshot,
    MemoryStatus,
    MemoryTier,
    MemoryWriteRequest,
    MemoryWriteResult,
    OrganizationalMemoryType,
)
from app.domain.operating_context import OperatingContext
from app.services.auth_service import AuthService
from app.services.memory import MemoryService, metrics
from app.services.operating_context_service import OperatingContextService

logger = logging.getLogger("sentinelx.api.memory")

router = APIRouter()
memory_service = MemoryService.get_instance()
context_service = OperatingContextService.get_instance()


def get_current_user(authorization: Optional[str] = Header(None)) -> UserIdentity:
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization, strict=True)


def resolve_request_context(
    user: UserIdentity,
    case_id: Optional[str] = None,
    session_id: Optional[str] = None,
) -> OperatingContext:
    if case_id:
        AuthService.get_instance().enforce_case_access(user, case_id)
    return context_service.resolve_context(
        user=user,
        requested_case_id=case_id,
        session_id=session_id,
    )


# ── Request / Response Payloads ──────────────────────────────────────────────

class SnapshotRequest(BaseModel):
    case_id: str
    session_id: Optional[str] = None


class RehydrateRequest(BaseModel):
    case_id: str
    snapshot_id: Optional[str] = None
    session_id: Optional[str] = None


class RestoreRequest(BaseModel):
    snapshot_id: str
    session_id: Optional[str] = None


class InvalidateRequest(BaseModel):
    memory_id: str
    reason: str
    session_id: Optional[str] = None


class ReconfirmRequest(BaseModel):
    memory_id: str
    additional_evidence_ids: Optional[List[str]] = None
    session_id: Optional[str] = None


class ProposePromotionRequest(BaseModel):
    case_id: str
    knowledge_type: OrganizationalMemoryType
    title: str
    content: str
    structured_pattern: Optional[Dict[str, Any]] = None
    source_memory_ids: Optional[List[str]] = None


class ApprovePromotionRequest(BaseModel):
    proposal_id: str
    jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION"


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/case/{case_id}/working")
def get_case_working_memory(
    case_id: str,
    session_id: Optional[str] = None,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Retrieve active session-scoped working memory for a case.
    Reconstructs from canonical evidence and episodic ledger if not in memory.
    """
    context = resolve_request_context(user, case_id=case_id, session_id=session_id)
    sid = session_id or context.session_id
    wm = memory_service.working_manager.get_or_create(
        session_id=sid,
        case_id=case_id,
        investigator_id=context.investigator_id,
    )
    return {
        "status": "success",
        "case_id": case_id,
        "session_id": sid,
        "working_memory": wm.model_dump(),
    }


@router.post("/query", response_model=MemoryRetrievalResult)
def query_memory(
    query: MemoryQuery,
    session_id: Optional[str] = None,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Execute governed policy-aware retrieval over the 4 memory tiers.
    Order: Authorization -> Scope -> Temporal Validity -> Epistemic Filter -> Relevance.
    """
    context = resolve_request_context(user, case_id=query.case_id, session_id=session_id)
    result = memory_service.query(query, context)
    return result


@router.post("/write", response_model=MemoryWriteResult)
def write_memory(
    request: MemoryWriteRequest,
    session_id: Optional[str] = None,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Governed memory write through the 8-stage memory validation pipeline.
    """
    context = resolve_request_context(user, case_id=request.case_id, session_id=session_id)
    return memory_service.write(request, context)


@router.post("/snapshot")
def capture_snapshot(
    req: SnapshotRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Capture an immutable investigation memory snapshot.
    """
    context = resolve_request_context(user, case_id=req.case_id, session_id=req.session_id)
    snapshot = memory_service.snapshot(case_id=req.case_id, context=context)
    return {
        "status": "success",
        "snapshot_id": snapshot.snapshot_id,
        "case_id": snapshot.case_id,
        "checksum": snapshot.checksum,
        "created_at": snapshot.created_at,
    }


@router.post("/rehydrate")
def rehydrate_case(
    req: RehydrateRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Rehydrate working investigation context from authoritative state + snapshot.
    """
    context = resolve_request_context(user, case_id=req.case_id, session_id=req.session_id)
    result = memory_service.rehydrate(
        case_id=req.case_id,
        context=context,
        snapshot_id=req.snapshot_id,
    )
    return {
        "status": "success",
        "rehydration": result,
    }


@router.post("/restore")
def restore_snapshot(
    req: RestoreRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Restore investigation memory from a specific snapshot ID.
    """
    context = resolve_request_context(user, session_id=req.session_id)
    result = memory_service.restore(snapshot_id=req.snapshot_id, context=context)
    return {
        "status": "success",
        "restoration": result,
    }


@router.post("/invalidate")
def invalidate_memory(
    req: InvalidateRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Mark memory record as INVALIDATED. Never deletes historical evidence lineage.
    """
    context = resolve_request_context(user, session_id=req.session_id)
    success = memory_service.invalidate(
        memory_id=req.memory_id,
        reason=req.reason,
        context=context,
    )
    if not success:
        raise HTTPException(status_code=400, detail="Invalidation rejected or unauthorized")
    return {"status": "success", "memory_id": req.memory_id, "invalidated": True}


@router.post("/reconfirm")
def reconfirm_memory(
    req: ReconfirmRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Reconfirm memory record with additional evidence or verification.
    """
    context = resolve_request_context(user, session_id=req.session_id)
    record = memory_service.reconfirm(
        memory_id=req.memory_id,
        context=context,
        additional_evidence_ids=req.additional_evidence_ids,
    )
    if not record:
        raise HTTPException(status_code=400, detail="Reconfirmation rejected or unauthorized")
    return {"status": "success", "memory_id": req.memory_id, "epistemic_status": record.epistemic_status.value}


@router.get("/organizational")
def get_organizational_knowledge(
    user: UserIdentity = Depends(get_current_user),
):
    """
    Retrieve approved institutional memory records (playbooks, procedures, templates).
    """
    context = resolve_request_context(user)
    query = MemoryQuery(
        tiers=[MemoryTier.ORGANIZATIONAL],
        limit=50,
    )
    return memory_service.query(query, context)


@router.post("/organizational/propose")
def propose_organizational_promotion(
    req: ProposePromotionRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Propose case knowledge for institutional promotion with automated PII scrub verification.
    """
    proposal = memory_service.org_manager.propose_promotion(
        case_id=req.case_id,
        proposed_by=user.username,
        knowledge_type=req.knowledge_type,
        title=req.title,
        content=req.content,
        structured_pattern=req.structured_pattern,
        source_memory_ids=req.source_memory_ids,
    )
    return {
        "status": "success",
        "proposal": proposal.model_dump(),
    }


@router.post("/organizational/approve")
def approve_organizational_promotion(
    req: ApprovePromotionRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Supervisor approval of institutional knowledge promotion.
    Requires SUPERVISOR / ADMINISTRATOR role and clean PII scan.
    """
    if user.role not in ("SUPERVISOR", "ADMINISTRATOR"):
        raise HTTPException(status_code=403, detail="Supervisor role required to approve organizational memory")

    success, record, error = memory_service.org_manager.approve_promotion(
        proposal_id=req.proposal_id,
        approver_id=user.username,
        jurisdiction=req.jurisdiction,
    )
    if not success or not record:
        raise HTTPException(status_code=400, detail=error or "Promotion approval failed")

    # Persist the newly approved organizational record
    memory_service.store.save_record(record)
    metrics.promotion_count += 1

    return {
        "status": "success",
        "memory_id": record.memory_id,
        "title": record.structured_payload.get("title"),
    }


@router.get("/metrics")
def get_memory_telemetry(
    user: UserIdentity = Depends(get_current_user),
):
    """
    Retrieve memory subsystem observability telemetry and latency metrics.
    """
    return {
        "status": "success",
        "metrics": metrics.get_summary(),
    }
