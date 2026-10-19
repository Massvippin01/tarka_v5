"""
SentinelX Agent API.

REST API for governed multi-agent control plane.
All agent operations are audited and pass through the AgentSupervisor.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.domain.agent import AgentType, FindingType
from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService, get_current_user

logger = logging.getLogger("sentinelx.api.agents")

router = APIRouter()


class AgentTaskRequest(BaseModel):
    agent_type: str
    case_id: str = "CASE-2026-001"
    objective: str = "Analyze case evidence"
    parameters: Dict[str, Any] = Field(default_factory=dict)


class AgentTaskResponse(BaseModel):
    task_id: str
    agent_type: str
    case_id: str
    status: str
    findings_count: int
    findings: List[Dict[str, Any]]
    error: Optional[str] = None


@router.get("/agents")
def list_agents(user: UserIdentity = Depends(get_current_user)):
    """List all registered investigative agents and their status."""
    from app.services.agents import AgentRegistry
    registry = AgentRegistry.get_instance()
    return {"agents": registry.list_agents()}


@router.post("/agents/tasks", response_model=AgentTaskResponse)
def dispatch_agent_task(
    request: AgentTaskRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Dispatch a governed investigative agent task.
    
    The task is authorized, resource-bounded, and all findings
    are validated for evidence lineage before being returned.
    """
    AuthService.get_instance().enforce_case_access(user, request.case_id)
    from app.services.agents.agent_supervisor import AgentSupervisor

    try:
        agent_type = AgentType(request.agent_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown agent type: '{request.agent_type}'. "
                   f"Valid types: {[t.value for t in AgentType]}",
        )

    supervisor = AgentSupervisor.get_instance()

    try:
        task = supervisor.create_task(
            agent_type=agent_type,
            case_id=request.case_id,
            objective=request.objective,
            parameters=request.parameters,
        )

        if task.status.value == "REJECTED_POLICY":
            return AgentTaskResponse(
                task_id=task.task_id,
                agent_type=request.agent_type,
                case_id=request.case_id,
                status=task.status.value,
                findings_count=0,
                findings=[],
                error=task.error_message,
            )

        completed = supervisor.execute_task(task.task_id)

        return AgentTaskResponse(
            task_id=completed.task_id,
            agent_type=request.agent_type,
            case_id=request.case_id,
            status=completed.status.value,
            findings_count=len(completed.findings),
            findings=[
                {
                    "finding_id": f.finding_id,
                    "finding_type": f.finding_type.value,
                    "title": f.title,
                    "description": f.description,
                    "confidence": f.confidence,
                    "epistemic_status": f.epistemic_status.value,
                    "evidence_ids": f.evidence_ids,
                    "supporting_fact_ids": f.supporting_fact_ids,
                    "requires_human_review": f.requires_human_review,
                    "recommended_action": f.recommended_action,
                    "reasoning_summary": f.reasoning_summary,
                }
                for f in completed.findings
            ],
            error=completed.error_message,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Agent task dispatch error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Agent task execution error: {str(e)}")


@router.get("/agents/findings")
def get_agent_findings(
    case_id: str = Query(default="CASE-2026-001"),
    finding_type: Optional[str] = Query(default=None),
    user: UserIdentity = Depends(get_current_user),
):
    """Retrieve governed agent findings for a case."""
    AuthService.get_instance().enforce_case_access(user, case_id)
    from app.services.agents.agent_supervisor import AgentSupervisor
    supervisor = AgentSupervisor.get_instance()

    if finding_type:
        try:
            ft = FindingType(finding_type)
            findings = supervisor.get_findings_by_type(ft)
            findings = [f for f in findings if f.case_id == case_id]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown finding type: '{finding_type}'")
    else:
        findings = supervisor.get_findings_for_case(case_id)

    return {
        "case_id": case_id,
        "findings_count": len(findings),
        "findings": [
            {
                "finding_id": f.finding_id,
                "finding_type": f.finding_type.value,
                "title": f.title,
                "description": f.description,
                "confidence": f.confidence,
                "epistemic_status": f.epistemic_status.value,
                "agent_type": f.agent_type.value,
                "evidence_ids": f.evidence_ids,
                "requires_human_review": f.requires_human_review,
                "recommended_action": f.recommended_action,
            }
            for f in findings
        ],
    }


@router.get("/agents/tasks/{task_id}")
def get_task_status(task_id: str, user: UserIdentity = Depends(get_current_user)):
    """Get the status and findings of a specific agent task."""
    from app.services.agents.agent_supervisor import AgentSupervisor
    supervisor = AgentSupervisor.get_instance()

    task = supervisor.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    AuthService.get_instance().enforce_case_access(user, task.case_id)

    return {
        "task_id": task.task_id,
        "agent_type": task.agent_type.value,
        "case_id": task.case_id,
        "status": task.status.value,
        "objective": task.objective,
        "findings_count": len(task.findings),
        "error": task.error_message,
        "created_at": task.created_at,
        "completed_at": task.completed_at,
        "budget": task.budget.remaining_summary(),
    }
