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
    return auth_service.authenticate_token(authorization)


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
