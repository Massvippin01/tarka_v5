from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.domain.interaction import (
    ActionRiskClass,
    InteractionContext,
    InteractionIntent,
    InteractionModality,
    SentinelSession,
    TaskPlan,
)
from app.domain.intelligence_contract import IntelligenceResponseContract
from app.domain.memory import StructuredInvestigationMemory
from app.services.auth_service import AuthService
from app.services.interaction.intent_resolver import IntentResolver
from app.services.interaction.response_planner import ResponsePlanner
from app.services.interaction.runner_service import RunnerService
from app.services.interaction.task_planner import TaskPlanner
from app.services.interaction.tool_registry import ToolRegistry

logger = logging.getLogger("sentinelx.api.interaction")

router = APIRouter()

# Service instances
tool_registry = ToolRegistry.get_instance()
runner_service = RunnerService(tool_registry=tool_registry)
intent_resolver = IntentResolver()
task_planner = TaskPlanner()
response_planner = ResponsePlanner()

# In-memory sessions & memory store
sessions: Dict[str, SentinelSession] = {}
memories: Dict[str, StructuredInvestigationMemory] = {}


def get_current_user(authorization: Optional[str] = Header(None)) -> UserIdentity:
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization)


class SessionInitRequest(BaseModel):
    case_id: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    clearance: str = "RESTRICTED"
    voice_language: str = "en-IN"
    theme: str = "forensic-paper"


class IntentResolveRequest(BaseModel):
    query: str
    case_id: str = "CASE-2026-001"
    modality: InteractionModality = InteractionModality.VOICE
    selected_entity_id: Optional[str] = None
    selected_claim_id: Optional[str] = None


class PlanCreateRequest(BaseModel):
    intent: InteractionIntent
    case_id: str = "CASE-2026-001"


class RunnerStepRequest(BaseModel):
    plan_id: str
    confirmation_token: Optional[str] = None
    purpose: Optional[str] = None


class RunnerSkipRequest(BaseModel):
    plan_id: str
    step_index: int


class ThemeSwitchRequest(BaseModel):
    theme: str  # forensic-paper, night-ops, high-contrast
    session_id: Optional[str] = None


@router.post("/session/init", response_model=SentinelSession)
def initialize_session(req: SessionInitRequest, user: UserIdentity = Depends(get_current_user)):
    session = SentinelSession(
        investigator_id=user.user_id,
        context=InteractionContext(
            user_id=user.user_id,
            user_role=user.role.value,
            case_id=req.case_id,
            jurisdiction=req.jurisdiction,
            clearance=req.clearance,
        ),
        voice_language=req.voice_language,
        active_theme=req.theme,
        open_contradictions=["CTR-2026-001"],
        open_gaps=["GAP-2026-001"],
    )
    sessions[session.session_id] = session

    if req.case_id not in memories:
        memories[req.case_id] = StructuredInvestigationMemory(case_id=req.case_id)

    return session


@router.get("/session/{session_id}", response_model=SentinelSession)
def get_session(session_id: str):
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    return session


# LEGACY_INTERACTION_PATH: Converged via CommandBus; retained for backward compatibility
@router.post("/intent/resolve", response_model=InteractionIntent)
async def resolve_interaction_intent(req: IntentResolveRequest, user: UserIdentity = Depends(get_current_user)):
    ctx = InteractionContext(
        user_id=user.user_id,
        user_role=user.role.value,
        case_id=req.case_id,
        selected_entity_id=req.selected_entity_id,
        selected_claim_id=req.selected_claim_id,
    )
    mem = memories.get(req.case_id)
    intent = await intent_resolver.resolve_intent(
        query=req.query,
        context=ctx,
        modality=req.modality,
        memory=mem,
    )
    return intent


# LEGACY_INTERACTION_PATH: Converged via CommandBus; retained for backward compatibility
@router.post("/plan", response_model=TaskPlan)
async def create_task_plan(req: PlanCreateRequest, user: UserIdentity = Depends(get_current_user)):
    ctx = InteractionContext(
        user_id=user.user_id,
        user_role=user.role.value,
        case_id=req.case_id,
    )
    plan = await task_planner.plan(req.intent, ctx)
    runner_service.register_plan(plan)
    return plan


# LEGACY_INTERACTION_PATH: Converged via CommandBus; retained for backward compatibility
@router.post("/runner/step")
def execute_runner_step(req: RunnerStepRequest, user: UserIdentity = Depends(get_current_user)):
    ctx = InteractionContext(
        user_id=user.user_id,
        user_role=user.role.value,
        case_id="CASE-2026-001",
    )
    allowed_cases = user.scope.allowed_cases if user.scope else ["CASE-2026-001", "C102"]
    allowed_jurisdictions = user.scope.jurisdictions if user.scope else ["Delhi NCR / Gurugram", "Delhi NCR / Special Cell"]

    result = runner_service.execute_next_step(
        plan_id=req.plan_id,
        context=ctx,
        allowed_cases=allowed_cases,
        allowed_jurisdictions=allowed_jurisdictions,
        confirmation_token=req.confirmation_token,
    )
    return result


@router.post("/runner/skip")
def skip_runner_step(req: RunnerSkipRequest, user: UserIdentity = Depends(get_current_user)):
    try:
        res = runner_service.skip_step(
            plan_id=req.plan_id,
            step_index=req.step_index,
            officer_role=user.role.value,
        )
        return res
    except PermissionError as pe:
        raise HTTPException(status_code=403, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/runner/pause")
def pause_runner(plan_id: str = Query(...)):
    return runner_service.pause_plan(plan_id)


@router.post("/runner/resume")
def resume_runner(plan_id: str = Query(...)):
    return runner_service.resume_plan(plan_id)


@router.post("/runner/cancel")
def cancel_runner(plan_id: str = Query(...)):
    return runner_service.cancel_plan(plan_id)


@router.post("/response", response_model=IntelligenceResponseContract)
async def generate_response(prompt: str = Query(...), case_id: str = "CASE-2026-001", user: UserIdentity = Depends(get_current_user)):
    ctx = InteractionContext(user_id=user.user_id, user_role=user.role.value, case_id=case_id)
    contract = await response_planner.plan_response(prompt, ctx)
    return contract


@router.post("/theme/switch")
def switch_theme(req: ThemeSwitchRequest):
    applied = tool_registry.execute_tool("set_workspace_theme", {"theme": req.theme})
    if req.session_id and req.session_id in sessions:
        sessions[req.session_id].active_theme = applied["theme"]
    return applied
