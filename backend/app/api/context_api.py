from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.domain.operating_context import (
    ClientEnvironmentReport,
    OnboardingState,
    OperatingContext,
)
from app.services.auth_service import AuthService
from app.services.operating_context_service import OperatingContextService

logger = logging.getLogger("sentinelx.api.context")

router = APIRouter()
context_service = OperatingContextService.get_instance()


def get_current_user(authorization: Optional[str] = Header(None)) -> UserIdentity:
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization, strict=True)


class ContextNegotiateRequest(BaseModel):
    session_id: Optional[str] = None
    requested_case_id: Optional[str] = None
    client_report: Optional[ClientEnvironmentReport] = None


class ContextNegotiateResponse(BaseModel):
    context: OperatingContext
    onboarding: OnboardingState


class ActivateCaseRequest(BaseModel):
    session_id: str
    case_id: str
    route: str = "command"


@router.post("/negotiate", response_model=ContextNegotiateResponse)
def negotiate_operating_context(
    req: ContextNegotiateRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Negotiate operating context upon first open or browser session start.
    Establishes role, allowed cases, voice capabilities, and onboarding options.
    """
    if req.requested_case_id:
        AuthService.get_instance().enforce_case_access(user, req.requested_case_id)
    ctx = context_service.resolve_context(
        user=user,
        client_report=req.client_report,
        session_id=req.session_id,
        requested_case_id=req.requested_case_id,
    )
    onboarding = context_service.get_onboarding_state(ctx)
    return ContextNegotiateResponse(context=ctx, onboarding=onboarding)


@router.get("/operating-context", response_model=ContextNegotiateResponse)
def get_current_operating_context(
    session_id: Optional[str] = None,
    case_id: Optional[str] = None,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Read current operating context and onboarding state for the active session.
    """
    if case_id:
        AuthService.get_instance().enforce_case_access(user, case_id)
    ctx = context_service.resolve_context(
        user=user,
        session_id=session_id,
        requested_case_id=case_id,
    )
    onboarding = context_service.get_onboarding_state(ctx)
    return ContextNegotiateResponse(context=ctx, onboarding=onboarding)


@router.post("/activate-case", response_model=OperatingContext)
def activate_case_scope(
    req: ActivateCaseRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Formally activate an authorized investigation scope from onboarding.
    """
    AuthService.get_instance().enforce_case_access(user, req.case_id)
    try:
        updated_ctx = context_service.activate_scope(
            session_id=req.session_id,
            case_id=req.case_id,
            route=req.route,
        )
        return updated_ctx
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except KeyError as ke:
        raise HTTPException(status_code=404, detail=str(ke))
    except Exception as e:
        logger.error("Failed to activate case scope: %s", e)
        raise HTTPException(status_code=400, detail=str(e))


# ── Subphase A3 Context Fabric Endpoints ─────────────────────────────────────

from app.domain.investigation_context import (
    ContextEvent,
    ContextResolutionResult,
    InvestigationContextSnapshot,
)
from app.services.interaction.context_reference_resolver import ContextReferenceResolver
from app.services.interaction.investigation_context_manager import InvestigationContextManager

ctx_manager = InvestigationContextManager.get_instance()
ref_resolver = ContextReferenceResolver.get_instance()


class ResolveReferenceRequest(BaseModel):
    query: str
    session_id: Optional[str] = "SES-DEFAULT"
    case_id: Optional[str] = "CASE-2026-001"
    correlation_id: Optional[str] = None


class ContextCorrectionRequest(BaseModel):
    session_id: Optional[str] = "SES-DEFAULT"
    case_id: Optional[str] = "CASE-2026-001"
    target_id: str
    target_type: str = "ENTITY"
    correlation_id: Optional[str] = None


class ContextResetRequest(BaseModel):
    session_id: Optional[str] = "SES-DEFAULT"
    new_case_id: str
    jurisdiction: Optional[str] = None
    correlation_id: Optional[str] = None


@router.get("/current", response_model=InvestigationContextSnapshot)
def get_current_investigation_context(
    session_id: str = "SES-DEFAULT",
    case_id: str = "CASE-2026-001",
    user: UserIdentity = Depends(get_current_user),
):
    """
    Retrieve the current authoritative Investigation Context Snapshot.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    return ctx_manager.get_current_snapshot(session_id=session_id, case_id=case_id)


@router.post("/resolve", response_model=ContextResolutionResult)
def resolve_context_reference(
    req: ResolveReferenceRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Deterministically resolve natural language follow-up reference against active context.
    """
    c_id = req.case_id or "CASE-2026-001"
    AuthService.get_instance().enforce_case_access(user, c_id)

    snapshot = ctx_manager.get_current_snapshot(session_id=req.session_id or "SES-DEFAULT", case_id=c_id)
    return ref_resolver.resolve_reference(
        query=req.query,
        snapshot=snapshot,
        correlation_id=req.correlation_id,
    )


@router.post("/correction", response_model=InvestigationContextSnapshot)
def apply_context_correction(
    req: ContextCorrectionRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Apply explicit user correction (e.g. 'No, I meant P002') to the context stack.
    """
    c_id = req.case_id or "CASE-2026-001"
    AuthService.get_instance().enforce_case_access(user, c_id)

    return ctx_manager.apply_correction(
        session_id=req.session_id or "SES-DEFAULT",
        case_id=c_id,
        target_id=req.target_id,
        target_type=req.target_type,
        correlation_id=req.correlation_id,
    )


@router.post("/reset", response_model=InvestigationContextSnapshot)
def reset_case_context(
    req: ContextResetRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Reset case-bound context when investigator switches active case.
    """
    AuthService.get_instance().enforce_case_access(user, req.new_case_id)

    return ctx_manager.reset_case_context(
        session_id=req.session_id or "SES-DEFAULT",
        new_case_id=req.new_case_id,
        jurisdiction=req.jurisdiction,
        correlation_id=req.correlation_id,
    )


@router.get("/history", response_model=List[ContextEvent])
def get_context_audit_history(
    session_id: str = "SES-DEFAULT",
    case_id: str = "CASE-2026-001",
    user: UserIdentity = Depends(get_current_user),
):
    """
    Retrieve immutable audit event trail of all context transitions.
    """
    AuthService.get_instance().enforce_case_access(user, case_id)
    return ctx_manager.get_history(session_id=session_id, case_id=case_id)

