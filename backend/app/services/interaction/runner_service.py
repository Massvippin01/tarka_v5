from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.domain.interaction import (
    ActionRiskClass,
    ConfirmationChallenge,
    InteractionContext,
    PlanStep,
    PlanStepStatus,
    TaskPlan,
)
from app.services.audit_service import AuditService
from app.services.governance.policy_gateway import PolicyDecision, PolicyGateway
from app.services.interaction.tool_registry import ToolRegistry

logger = logging.getLogger("sentinelx.interaction.runner")


class RunnerService:
    """
    Stateful execution manager for TaskPlans.
    CRITICAL ARCHITECTURAL BOUNDARIES:
    1. Runner manages solely workflow execution state. Waves 1-4 remain canonical sources of truth.
    2. Runner NEVER hides tool execution.
    3. skip_step() is strictly policy-aware: mandatory steps, verification checks,
       and statutory requisitions CANNOT be silently skipped.
    """

    def __init__(
        self,
        tool_registry: Optional[ToolRegistry] = None,
        policy_gateway: Optional[PolicyGateway] = None,
        audit_service: Optional[AuditService] = None,
    ) -> None:
        self.tools = tool_registry or ToolRegistry.get_instance()
        self.policy = policy_gateway or PolicyGateway.get_instance()
        self.audit = audit_service or AuditService.get_instance()
        self.active_plans: Dict[str, TaskPlan] = {}
        self.pending_confirmations: Dict[str, ConfirmationChallenge] = {}

    def register_plan(self, plan: TaskPlan) -> str:
        self.active_plans[plan.plan_id] = plan
        return plan.plan_id

    def get_plan(self, plan_id: str) -> Optional[TaskPlan]:
        return self.active_plans.get(plan_id)

    def execute_next_step(
        self,
        plan_id: str,
        context: InteractionContext,
        allowed_cases: List[str],
        allowed_jurisdictions: List[str],
        confirmation_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        plan = self.active_plans.get(plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found.")

        if plan.status in ["PAUSED", "CANCELLED", "COMPLETED"]:
            return {
                "plan_id": plan_id,
                "status": plan.status,
                "message": f"Execution halted: plan is {plan.status}.",
            }

        if plan.current_step_index >= len(plan.steps):
            plan.status = "COMPLETED"
            plan.completed_at = datetime.now(UTC).isoformat()
            return {"plan_id": plan_id, "status": "COMPLETED", "message": "All plan steps completed."}

        step: PlanStep = plan.steps[plan.current_step_index]
        tool_def = self.tools.get_tool(step.tool_name)
        if not tool_def:
            step.status = PlanStepStatus.FAILED
            step.blockers.append(f"Tool '{step.tool_name}' not registered in ToolRegistry.")
            plan.status = "FAILED"
            return {"plan_id": plan_id, "status": "FAILED", "failed_step": step.step_index, "error": step.blockers[-1]}

        # 1. 7-Factor Policy Gateway Evaluation
        decision: PolicyDecision = self.policy.evaluate(
            tool_def=tool_def,
            officer_role=context.user_role,
            officer_clearance=context.clearance,
            case_id=plan.case_id,
            allowed_cases=allowed_cases,
            jurisdiction=context.jurisdiction,
            allowed_jurisdictions=allowed_jurisdictions,
            operational_purpose=f"Executing plan {plan.plan_id} step {step.step_index}: {step.description}",
            confirmation_token=confirmation_token,
        )

        if decision.requires_confirmation:
            step.status = PlanStepStatus.BLOCKED_ON_CONFIRMATION
            step.requires_confirmation = True
            plan.status = "WAITING_CONFIRMATION"

            challenge = ConfirmationChallenge(
                challenge_id=decision.confirmation_challenge_id or f"CONF-{uuid4().hex[:8]}",
                risk_class=tool_def.risk_class,
                tool_name=tool_def.name,
                arguments=step.input_params,
                prompt_message=f"Action '{tool_def.name}' requires authorized confirmation: {step.description}",
                statutory_reference=tool_def.statutory_power_code,
                expires_at=datetime.now(UTC).isoformat(),
            )
            self.pending_confirmations[challenge.challenge_id] = challenge

            return {
                "plan_id": plan_id,
                "status": "WAITING_CONFIRMATION",
                "challenge": challenge.model_dump(),
                "step_index": step.step_index,
                "message": decision.reason,
            }

        if not decision.allowed:
            step.status = PlanStepStatus.FAILED
            step.blockers.append(f"Policy evaluation rejected step: {decision.reason}")
            plan.status = "FAILED"
            return {
                "plan_id": plan_id,
                "status": "FAILED",
                "step_index": step.step_index,
                "error": decision.reason,
            }

        # 2. Tool Execution via Canonical Engine
        step.status = PlanStepStatus.RUNNING
        plan.status = "RUNNING"
        try:
            result = self.tools.execute_tool(step.tool_name, step.input_params)
            step.status = PlanStepStatus.COMPLETED
            step.output_summary = f"Successfully executed {step.tool_name}."
            if isinstance(result, dict) and "supporting_evidence" in result:
                step.evidence_retrieved.extend(result["supporting_evidence"])
            step.verification_status = "VERIFIED_CANONICAL"

            plan.current_step_index += 1
            if plan.current_step_index >= len(plan.steps):
                plan.status = "COMPLETED"
                plan.completed_at = datetime.now(UTC).isoformat()

            return {
                "plan_id": plan_id,
                "status": plan.status,
                "completed_step_index": step.step_index,
                "tool_result": result,
                "next_step_index": plan.current_step_index if plan.status != "COMPLETED" else None,
            }
        except Exception as e:
            step.status = PlanStepStatus.FAILED
            step.blockers.append(str(e))
            plan.status = "FAILED"
            return {"plan_id": plan_id, "status": "FAILED", "step_index": step.step_index, "error": str(e)}

    def skip_step(self, plan_id: str, step_index: int, officer_role: str) -> Dict[str, Any]:
        """
        Policy-aware step skipping.
        Required verification checks, mandatory analytical steps, and high-risk statutory
        requisitions CANNOT be silently skipped.
        """
        plan = self.active_plans.get(plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found.")

        if step_index < 0 or step_index >= len(plan.steps):
            raise IndexError("Step index out of range.")

        step = plan.steps[step_index]

        # Policy Rule: Mandatory steps cannot be skipped
        if step.mandatory:
            raise PermissionError(
                f"POLICY_VIOLATION: Step {step_index} ('{step.description}') is marked MANDATORY and cannot be skipped."
            )

        if step.risk_class in [ActionRiskClass.PREPARE, ActionRiskClass.EXECUTE]:
            raise PermissionError(
                f"POLICY_VIOLATION: High-risk step {step_index} with risk class {step.risk_class} cannot be skipped without formal case administrator authorization."
            )

        step.status = PlanStepStatus.SKIPPED
        step.output_summary = f"Skipped by officer with role {officer_role}."
        if plan.current_step_index == step_index:
            plan.current_step_index += 1

        self.audit.log_access_event(
            user_id=officer_role,
            resource_type=f"PLAN_{plan_id}_STEP_{step_index}",
            action="STEP_SKIPPED",
            details={"step_index": step_index, "description": step.description},
        )

        return {"plan_id": plan_id, "step_index": step_index, "status": "SKIPPED"}

    def pause_plan(self, plan_id: str) -> Dict[str, Any]:
        plan = self.active_plans.get(plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found.")
        plan.status = "PAUSED"
        return {"plan_id": plan_id, "status": "PAUSED"}

    def resume_plan(self, plan_id: str) -> Dict[str, Any]:
        plan = self.active_plans.get(plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found.")
        plan.status = "RUNNING"
        return {"plan_id": plan_id, "status": "RUNNING"}

    def cancel_plan(self, plan_id: str) -> Dict[str, Any]:
        plan = self.active_plans.get(plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found.")
        plan.status = "CANCELLED"
        return {"plan_id": plan_id, "status": "CANCELLED"}
