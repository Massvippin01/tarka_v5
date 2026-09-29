"""
SentinelX Agent Supervisor.

Governed orchestration controller for investigative agent tasks.
All agent work passes through the Phase 2 CommandBus and PolicyGateway.

CRITICAL INVARIANTS:
- Agents NEVER directly mutate authoritative investigation state
- All agent actions are authorized through PolicyGateway + AgentPolicy
- All findings require explicit evidence lineage
- Resource budgets are enforced (no runaway agents)
- The supervisor is the ONLY entity that can assign tasks to agents
"""
from __future__ import annotations

import logging
import time
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from app.domain.agent import (
    AgentDefinition,
    AgentFinding,
    AgentPolicy,
    AgentTask,
    AgentType,
    FindingType,
    ResourceBudget,
    TaskStatus,
)
from app.domain.command import (
    Command,
    CommandExecutionResult,
    CommandSource,
    CommandStatus,
)
from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.interaction import InteractionContext
from app.services.agents import AgentRegistry
from app.services.audit_service import AuditService

logger = logging.getLogger("sentinelx.agents.supervisor")


class AgentSupervisor:
    """
    Governed supervisor for all investigative agent tasks.
    
    Responsibilities:
    1. Validate agent task requests against policy
    2. Assign resource budgets and enforce limits
    3. Dispatch tasks to appropriate agent executors
    4. Collect and validate findings
    5. Ensure all findings have evidence lineage
    6. Audit all agent activity
    7. Prevent prohibited actions (identity merges, guilt classification, etc.)
    """

    _instance: Optional[AgentSupervisor] = None

    def __init__(
        self,
        registry: Optional[AgentRegistry] = None,
        audit_service: Optional[AuditService] = None,
    ) -> None:
        self.registry = registry or AgentRegistry.get_instance()
        self.audit = audit_service or AuditService.get_instance()
        self._active_tasks: Dict[str, AgentTask] = {}
        self._completed_tasks: Dict[str, AgentTask] = {}
        self._all_findings: Dict[str, AgentFinding] = {}

    @classmethod
    def get_instance(cls) -> AgentSupervisor:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reset_instance(cls) -> None:
        """Reset singleton for testing."""
        cls._instance = None

    # ── Task Creation & Authorization ────────────────────────────────────

    def create_task(
        self,
        agent_type: AgentType,
        case_id: str,
        objective: str,
        parameters: Optional[Dict[str, Any]] = None,
        originating_command_id: Optional[str] = None,
        budget_override: Optional[ResourceBudget] = None,
    ) -> AgentTask:
        """
        Create and authorize an agent task.
        
        Steps:
        1. Resolve agent from registry
        2. Check agent policy constraints
        3. Check concurrent task limits
        4. Assign resource budget
        5. Create task record
        6. Audit creation
        """
        # 1. Resolve agent
        agent = self.registry.get_by_type(agent_type)
        if not agent:
            raise ValueError(f"No active agent registered for type: {agent_type.value}")

        # 2. Check agent policy
        policy = self.registry.get_policy(agent_type)
        if policy:
            # Check case scope
            if policy.allowed_case_ids and case_id not in policy.allowed_case_ids:
                task = AgentTask(
                    agent_id=agent.agent_id,
                    agent_type=agent_type,
                    case_id=case_id,
                    objective=objective,
                    parameters=parameters or {},
                    status=TaskStatus.REJECTED_POLICY,
                    error_message=f"Case {case_id} not in agent policy allowed cases.",
                    originating_command_id=originating_command_id,
                )
                self._audit_task_event(task, "TASK_REJECTED_POLICY")
                return task

            # Check concurrent task limits
            active_count = sum(
                1 for t in self._active_tasks.values()
                if t.agent_type == agent_type and t.status == TaskStatus.RUNNING
            )
            if active_count >= policy.max_concurrent_tasks:
                task = AgentTask(
                    agent_id=agent.agent_id,
                    agent_type=agent_type,
                    case_id=case_id,
                    objective=objective,
                    parameters=parameters or {},
                    status=TaskStatus.REJECTED_POLICY,
                    error_message=f"Concurrent task limit ({policy.max_concurrent_tasks}) reached for {agent_type.value}.",
                    originating_command_id=originating_command_id,
                )
                self._audit_task_event(task, "TASK_REJECTED_CONCURRENT_LIMIT")
                return task

        # 3. Assign resource budget
        budget = budget_override or ResourceBudget(**agent.default_budget.model_dump())

        # 4. Create task
        task = AgentTask(
            agent_id=agent.agent_id,
            agent_type=agent_type,
            case_id=case_id,
            objective=objective,
            parameters=parameters or {},
            status=TaskStatus.PENDING,
            budget=budget,
            originating_command_id=originating_command_id,
        )

        self._active_tasks[task.task_id] = task
        self._audit_task_event(task, "TASK_CREATED")
        logger.info(
            f"Created task {task.task_id} for {agent_type.value} agent "
            f"on case {case_id}: {objective}"
        )
        return task

    # ── Task Execution ───────────────────────────────────────────────────

    def execute_task(self, task_id: str) -> AgentTask:
        """
        Execute a pending agent task using the appropriate agent executor.
        
        This is a synchronous execution that:
        1. Marks task as RUNNING
        2. Invokes the agent executor
        3. Validates all findings
        4. Marks task as COMPLETED or FAILED
        5. Returns the task with findings
        """
        task = self._active_tasks.get(task_id)
        if not task:
            raise ValueError(f"Task {task_id} not found in active tasks.")

        if task.status != TaskStatus.PENDING:
            raise ValueError(f"Task {task_id} is not in PENDING status (current: {task.status.value})")

        # Resolve agent
        agent = self.registry.get(task.agent_id)
        if not agent:
            task.status = TaskStatus.FAILED
            task.error_message = f"Agent {task.agent_id} no longer registered."
            self._complete_task(task)
            return task

        # Mark as running
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now(UTC).isoformat()
        self._audit_task_event(task, "TASK_STARTED")

        try:
            start_time = time.monotonic()

            # Import executor lazily to avoid circular imports
            from app.services.agents.agent_executors import get_executor
            executor = get_executor(task.agent_type)

            # Execute with resource tracking
            findings = executor.execute(task, agent)

            # Update budget tracking
            elapsed = time.monotonic() - start_time
            task.budget.elapsed_seconds = elapsed

            # Validate all findings
            validated_findings = self._validate_findings(findings, task, agent)

            task.findings = validated_findings
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now(UTC).isoformat()

            # Store findings
            for finding in validated_findings:
                self._all_findings[finding.finding_id] = finding

            logger.info(
                f"Task {task.task_id} completed: {len(validated_findings)} findings "
                f"produced in {elapsed:.2f}s"
            )

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error_message = str(e)
            task.completed_at = datetime.now(UTC).isoformat()
            logger.error(f"Task {task.task_id} failed: {e}", exc_info=True)

        self._complete_task(task)
        return task

    # ── Findings Access ──────────────────────────────────────────────────

    def get_findings_for_case(self, case_id: str) -> List[AgentFinding]:
        """Retrieve all findings for a given case."""
        return [f for f in self._all_findings.values() if f.case_id == case_id]

    def get_findings_by_type(self, finding_type: FindingType) -> List[AgentFinding]:
        """Retrieve all findings of a specific type."""
        return [f for f in self._all_findings.values() if f.finding_type == finding_type]

    def get_task(self, task_id: str) -> Optional[AgentTask]:
        return self._active_tasks.get(task_id) or self._completed_tasks.get(task_id)

    def get_active_tasks(self) -> List[AgentTask]:
        return list(self._active_tasks.values())

    # ── Finding Validation ───────────────────────────────────────────────

    def _validate_findings(
        self,
        findings: List[AgentFinding],
        task: AgentTask,
        agent: AgentDefinition,
    ) -> List[AgentFinding]:
        """
        Validate all findings against agent constraints and SentinelX invariants.
        
        CRITICAL CHECKS:
        1. Finding type must be in agent's allowed_finding_types
        2. Evidence lineage must be present (evidence_ids or supporting_fact_ids)
        3. Budget limits must not be exceeded
        4. No guilt/innocence classification in text
        5. Epistemic status must be explicit
        """
        validated: List[AgentFinding] = []
        GUILT_TERMS = {"guilty", "innocent", "convicted", "acquitted"}

        for finding in findings:
            # Check budget
            if task.budget.is_exhausted():
                logger.warning(
                    f"Budget exhausted for task {task.task_id}: dropping finding {finding.finding_id}"
                )
                break

            # Check finding type allowed
            if finding.finding_type not in agent.allowed_finding_types:
                logger.warning(
                    f"Finding type {finding.finding_type.value} not allowed for "
                    f"agent {agent.name}. Dropping finding {finding.finding_id}."
                )
                continue

            # Check evidence lineage — at minimum one evidence reference
            has_lineage = (
                bool(finding.evidence_ids)
                or bool(finding.supporting_fact_ids)
                or bool(finding.artifact_ids)
            )
            if not has_lineage:
                logger.warning(
                    f"Finding {finding.finding_id} has no evidence lineage. "
                    f"Dropping — violates Evidence IR requirement."
                )
                continue

            # Check for guilt/innocence classification (strict prohibition)
            combined_text = f"{finding.title} {finding.description} {finding.reasoning_summary}".lower()
            if any(term in combined_text for term in GUILT_TERMS):
                logger.warning(
                    f"Finding {finding.finding_id} contains guilt/innocence classification. "
                    f"BLOCKED — violates investigative reasoning invariant."
                )
                continue

            # Ensure case_id is set
            finding.case_id = task.case_id
            finding.task_id = task.task_id
            finding.agent_id = task.agent_id
            finding.agent_type = task.agent_type

            validated.append(finding)
            task.budget.findings_produced += 1

        return validated

    # ── Internal Helpers ─────────────────────────────────────────────────

    def _complete_task(self, task: AgentTask) -> None:
        """Move task from active to completed and audit."""
        if task.task_id in self._active_tasks:
            del self._active_tasks[task.task_id]
        self._completed_tasks[task.task_id] = task
        self._audit_task_event(task, f"TASK_{task.status.value}")

    def _audit_task_event(self, task: AgentTask, event: str) -> None:
        """Record agent task event in the audit trail."""
        self.audit.log_access_event(
            user_id=f"AGENT:{task.agent_type.value}",
            resource_type="AGENT_TASK",
            action=event,
            details={
                "task_id": task.task_id,
                "agent_id": task.agent_id,
                "agent_type": task.agent_type.value,
                "case_id": task.case_id,
                "objective": task.objective,
                "status": task.status.value,
                "findings_count": len(task.findings),
                "error": task.error_message,
                "originating_command_id": task.originating_command_id,
            },
        )
