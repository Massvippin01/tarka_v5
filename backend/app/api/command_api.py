from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.domain.command import (
    Command,
    CommandExecutionResult,
    CommandSource,
    CommandStatus,
    UIActionType,
)
from app.domain.interaction import ActionRiskClass, InteractionContext
from app.services.auth_service import AuthService
from app.services.command.command_bus import CommandBus
from app.services.command.ui_action_registry import UIActionRegistry

logger = logging.getLogger("sentinelx.api.command")

router = APIRouter(prefix="/api/v1/command", tags=["Command Control Plane"])

command_bus = CommandBus.get_instance()
action_registry = UIActionRegistry.get_instance()


def get_current_user(authorization: Optional[str] = Header(None)) -> UserIdentity:
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization)


class DispatchCommandRequest(BaseModel):
    source: CommandSource = CommandSource.UI
    intent: str
    case_id: Optional[str] = None
    selected_entity_id: Optional[str] = None
    selected_claim_id: Optional[str] = None
    arguments: Dict[str, Any] = Field(default_factory=dict)
    requested_actions: List[str] = Field(default_factory=list)
    risk_class: ActionRiskClass = ActionRiskClass.READ
    confirmation_token: Optional[str] = None
    correlation_id: Optional[str] = None
    investigation_intent: Optional[Dict[str, Any]] = None


class CancelCommandRequest(BaseModel):
    command_id: str


@router.post("/dispatch", response_model=CommandExecutionResult)
async def dispatch_command(
    req: DispatchCommandRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    CANONICAL COMMAND DISPATCH ENDPOINT.
    Accepts commands from Voice, Chat, UI clicks, Keyboard, Automation, and Agents.
    """
    ctx = InteractionContext(
        user_id=user.user_id,
        user_role=user.role.value,
        clearance=user.clearance,
        case_id=req.case_id or (user.scope.allowed_cases[0] if user.scope and user.scope.allowed_cases else "CASE-2026-001"),
        jurisdiction=user.jurisdiction or "Delhi NCR / Special Cell",
        selected_entity_id=req.selected_entity_id,
        selected_claim_id=req.selected_claim_id,
    )

    auth_ctx: Dict[str, Any] = {}
    if req.confirmation_token:
        auth_ctx["confirmation_token"] = req.confirmation_token

    cmd = Command(
        source=req.source,
        intent=req.intent,
        context=ctx,
        arguments=req.arguments,
        risk_class=req.risk_class,
        authorization_context=auth_ctx,
        requested_actions=req.requested_actions,
    )
    if req.correlation_id:
        cmd.correlation_id = req.correlation_id

    if req.investigation_intent:
        try:
            from app.domain.intent import InvestigationIntent
            cmd.investigation_intent = InvestigationIntent(**req.investigation_intent)
        except Exception as e:
            logger.warning("Failed to parse provided investigation_intent: %s", e)

    result = await command_bus.dispatch(command=cmd, user=user)

    if result.status == CommandStatus.UNAUTHORIZED:
        raise HTTPException(status_code=403, detail=result.message)

    return result


@router.post("/cancel")
def cancel_command(req: CancelCommandRequest, user: UserIdentity = Depends(get_current_user)):
    """Cancel an in-flight command."""
    success = command_bus.cancel_command(req.command_id)
    return {"command_id": req.command_id, "cancelled": success}


@router.get("/actions")
def list_actions():
    """List all supported UI actions and their schemas."""
    return {"actions": action_registry.list_actions()}
