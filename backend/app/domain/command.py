from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.interaction import (
    ActionRiskClass,
    ConfirmationChallenge,
    InteractionContext,
)


class CommandSource(str, Enum):
    """
    All authorized sources that converge into the SentinelX Command Control Plane.
    """
    VOICE = "VOICE"
    CHAT = "CHAT"
    UI = "UI"
    KEYBOARD = "KEYBOARD"
    AUTOMATION = "AUTOMATION"
    AGENT = "AGENT"


class UIActionType(str, Enum):
    """
    Canonical typed UI actions supported by SentinelX workspace.
    Guaranteed minimum set for complete operational control.
    """
    OPEN_CASE = "OPEN_CASE"
    OPEN_ENTITY = "OPEN_ENTITY"
    OPEN_EVIDENCE = "OPEN_EVIDENCE"
    OPEN_GRAPH = "OPEN_GRAPH"
    OPEN_TIMELINE = "OPEN_TIMELINE"
    OPEN_CONTRADICTIONS = "OPEN_CONTRADICTIONS"
    OPEN_GAPS = "OPEN_GAPS"
    OPEN_PROOF = "OPEN_PROOF"

    SEARCH = "SEARCH"
    FILTER = "FILTER"
    FOCUS = "FOCUS"
    EXPAND = "EXPAND"
    COLLAPSE = "COLLAPSE"
    SELECT = "SELECT"
    COMPARE = "COMPARE"
    TRACE_PROVENANCE = "TRACE_PROVENANCE"
    SHOW_SOURCE = "SHOW_SOURCE"
    SHOW_SUPPORT = "SHOW_SUPPORT"
    SHOW_CONTRADICTION = "SHOW_CONTRADICTION"
    SHOW_GAP = "SHOW_GAP"

    # Navigation & Progressive Disclosure Actions (Experience Refinement E1)
    GO_BACK = "GO_BACK"
    SUMMARIZE = "SUMMARIZE"
    SWITCH_LEVEL = "SWITCH_LEVEL"

    # Governed Agent Actions (Phase 3)
    RUN_AGENT_TASK = "RUN_AGENT_TASK"
    SHOW_AGENT_FINDINGS = "SHOW_AGENT_FINDINGS"


class UIActionDescriptor(BaseModel):
    """
    Strongly typed, validated descriptor of an action to be executed by the UI layer.
    Frontend receives this contract and never needs to parse natural language.
    """
    action_id: str = Field(default_factory=generate_uuid7)
    action_type: UIActionType
    arguments: Dict[str, Any] = Field(default_factory=dict)
    risk_class: ActionRiskClass = ActionRiskClass.READ
    expected_ui_effect: str = ""
    audit_event: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class Command(BaseModel):
    """
    Canonical command submitted to the CommandBus.
    Can originate from Voice, Chat, UI clicks, Keyboard, Automation, or governed Agents.
    """
    command_id: str = Field(default_factory=generate_uuid7)
    source: CommandSource
    intent: str
    context: InteractionContext = Field(default_factory=InteractionContext)
    arguments: Dict[str, Any] = Field(default_factory=dict)
    risk_class: ActionRiskClass = ActionRiskClass.READ
    authorization_context: Dict[str, Any] = Field(default_factory=dict)
    correlation_id: str = Field(default_factory=generate_uuid7)
    requested_actions: List[str] = Field(default_factory=list)
    rationale: Optional[str] = None
    investigation_intent: Optional[Any] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class CommandStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    WAITING_CONFIRMATION = "WAITING_CONFIRMATION"
    CANCELLED = "CANCELLED"
    UNAUTHORIZED = "UNAUTHORIZED"


class CommandExecutionResult(BaseModel):
    """
    Authoritative result returned by CommandBus upon executing a command.
    """
    command_id: str
    correlation_id: str
    status: CommandStatus
    ui_actions: List[UIActionDescriptor] = Field(default_factory=list)
    investigation_state_delta: Optional[Dict[str, Any]] = None
    output_data: Optional[Dict[str, Any]] = None
    message: str = ""
    audit_event_id: Optional[str] = None
    requires_confirmation: bool = False
    confirmation_challenge: Optional[ConfirmationChallenge] = None
    executed_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
