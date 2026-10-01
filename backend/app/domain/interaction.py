from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import generate_uuid7


class ActionRiskClass(str, Enum):
    """
    Four strict action risk classes governing autonomous execution.
    - READ: Autonomous, read-only information retrieval.
    - ANALYZE: Autonomous, evidence-grounded inference and consistency checks.
    - PREPARE: Autonomous draft/generation, mandatory human review before commitment.
    - EXECUTE: High-risk action requiring explicit statutory authorization and confirmation.
    """
    READ = "READ"
    ANALYZE = "ANALYZE"
    PREPARE = "PREPARE"
    EXECUTE = "EXECUTE"


class InteractionModality(str, Enum):
    """Control surfaces interacting with the unified semantic interaction engine."""
    VOICE = "VOICE"
    KEYBOARD = "KEYBOARD"
    POINTER = "POINTER"
    UI_DIRECT = "UI_DIRECT"


class VoiceStateEnum(str, Enum):
    """9 explicit states of the Sentinel Voice OS state machine."""
    READY = "READY"
    LISTENING = "LISTENING"
    TRANSCRIBING = "TRANSCRIBING"
    UNDERSTANDING = "UNDERSTANDING"
    PLANNING = "PLANNING"
    EXECUTING = "EXECUTING"
    VERIFYING = "VERIFYING"
    CONFIRMATION = "CONFIRMATION"
    RESPONDING = "RESPONDING"


class InteractionIntent(BaseModel):
    """
    Typed interaction intent parsed from natural language or direct UI triggers.
    All model completions must validate into this typed schema before execution.
    """
    intent_id: str = Field(default_factory=lambda: f"INT-{uuid4().hex[:8]}")
    intent_name: str
    target_domain: str  # CASES, EVIDENCE, ENTITIES, TIMELINE, CONTRADICTIONS, GAPS, PROOF, WORKSPACE, THEME, STATUTORY
    parameters: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.95
    raw_query: str = ""
    modality: InteractionModality = InteractionModality.VOICE
    risk_class: ActionRiskClass = ActionRiskClass.READ
    requires_confirmation: bool = False
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class InteractionContext(BaseModel):
    """
    Unified operational context maintained across all control modalities.
    """
    session_id: str = "SES-DEFAULT"
    user_id: str = "INVESTIGATOR_DELHI"
    user_role: str = "INVESTIGATOR"
    case_id: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    clearance: str = "RESTRICTED"
    active_route: str = "command"
    active_screen: str = "briefing"
    selected_entity_id: Optional[str] = None
    selected_relationship_id: Optional[str] = None
    selected_evidence_id: Optional[str] = None
    selected_claim_id: Optional[str] = None
    selected_hypothesis_id: Optional[str] = None
    active_filters: List[str] = Field(default_factory=list)
    time_window: Optional[List[str]] = Field(default_factory=lambda: ["2026-08-01", "2026-08-30"])
    recent_actions: List[str] = Field(default_factory=list)
    pending_actions: List[str] = Field(default_factory=list)
    known_unknowns: List[str] = Field(default_factory=list)


class ToolDefinition(BaseModel):
    """
    Typed tool definition registered in ToolRegistry.
    Raw backend endpoints are NEVER exposed directly to models.
    """
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    required_role: str = "INVESTIGATOR"
    required_clearance: str = "RESTRICTED"
    risk_class: ActionRiskClass = ActionRiskClass.READ
    confirmation_required: bool = False
    case_scope_required: bool = True
    audit_level: str = "MANDATORY"
    statutory_power_code: Optional[str] = None


class TypedToolInvocation(BaseModel):
    """
    Validated, immutable invocation payload for tool execution.
    """
    invocation_id: str = Field(default_factory=generate_uuid7)
    tool_name: str
    arguments: Dict[str, Any]
    risk_class: ActionRiskClass
    purpose: str
    case_id: str
    investigator_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class PlanStepStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    PAUSED = "PAUSED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    BLOCKED_ON_CONFIRMATION = "BLOCKED_ON_CONFIRMATION"


class PlanStep(BaseModel):
    """
    A single step in a multi-step investigative plan.
    """
    step_id: str = Field(default_factory=lambda: f"STEP-{uuid4().hex[:6]}")
    step_index: int
    tool_name: str
    description: str
    status: PlanStepStatus = PlanStepStatus.PENDING
    mandatory: bool = True  # If true, skip_step() is rejected by policy
    requires_confirmation: bool = False
    risk_class: ActionRiskClass = ActionRiskClass.READ
    input_params: Dict[str, Any] = Field(default_factory=dict)
    output_summary: Optional[str] = None
    evidence_retrieved: List[str] = Field(default_factory=list)
    verification_status: Optional[str] = None
    blockers: List[str] = Field(default_factory=list)


class TaskPlan(BaseModel):
    """
    Structured multi-step plan produced by TaskPlanner.
    Runner manages execution state of this plan.
    """
    plan_id: str = Field(default_factory=lambda: f"PLAN-{uuid4().hex[:8]}")
    case_id: str
    objective: str
    steps: List[PlanStep] = Field(default_factory=list)
    current_step_index: int = 0
    status: str = "PENDING"  # PENDING, RUNNING, PAUSED, COMPLETED, CANCELLED, FAILED, WAITING_CONFIRMATION
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    completed_at: Optional[str] = None


class ConfirmationChallenge(BaseModel):
    """
    Challenge issued by ConfirmationGate when an action requires authorized confirmation.
    """
    challenge_id: str = Field(default_factory=lambda: f"CONF-{uuid4().hex[:8]}")
    nonce: str = Field(default_factory=lambda: uuid4().hex)
    risk_class: ActionRiskClass
    tool_name: str
    arguments: Dict[str, Any]
    prompt_message: str
    statutory_reference: Optional[str] = None
    issuing_authority: Optional[str] = None
    expires_at: str
    status: str = "PENDING"  # PENDING, CONFIRMED, REJECTED, EXPIRED


class SentinelSession(BaseModel):
    """
    Active investigator session binding context, structured memory, and voice settings.
    """
    session_id: str = Field(default_factory=lambda: f"SES-{uuid4().hex[:8]}")
    investigator_id: str
    context: InteractionContext = Field(default_factory=InteractionContext)
    active_plan: Optional[TaskPlan] = None
    open_contradictions: List[str] = Field(default_factory=list)
    open_gaps: List[str] = Field(default_factory=list)
    voice_language: str = "en-IN"  # en-IN, hi-IN, hinglish
    voice_mode: str = "PTT"  # PTT, HANDS_FREE
    active_theme: str = "forensic-paper"  # forensic-paper, night-ops, high-contrast
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    last_interaction_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
