from __future__ import annotations

import logging
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.command import Command, CommandSource, UIActionType
from app.domain.interaction import ActionRiskClass, InteractionContext

logger = logging.getLogger("sentinelx.domain.intent")


class InvestigationDetailLevel(str, Enum):
    """Level of detail requested by investigator or agent."""
    SUMMARY = "SUMMARY"
    STANDARD = "STANDARD"
    DEEP_FORENSIC = "DEEP_FORENSIC"


class InvestigationIntent(BaseModel):
    """
    CANONICAL INVESTIGATION INTENT CONTRACT.

    Unified semantic contract representing an investigator's intention across
    all interaction surfaces (VOICE, TEXT/CHAT, UI, KEYBOARD, AGENT).

    Converges into CommandBus without duplicating modality-specific business logic.
    """
    intent_id: str = Field(default_factory=generate_uuid7)
    intent_name: str
    target_case: Optional[str] = None
    target_entity: Optional[str] = None
    target_evidence: Optional[str] = None
    target_claim: Optional[str] = None
    modality: CommandSource = CommandSource.UI
    language: str = "en-IN"
    risk_class: ActionRiskClass = ActionRiskClass.READ
    authorization_context: Dict[str, Any] = Field(default_factory=dict)
    requested_detail_level: InvestigationDetailLevel = InvestigationDetailLevel.STANDARD
    temporal_constraints: Optional[Dict[str, Any]] = None
    spatial_constraints: Optional[Dict[str, Any]] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    ambiguity: bool = False
    ambiguity_reason: Optional[str] = None
    clarification_prompt: Optional[str] = None
    correlation_id: str = Field(default_factory=generate_uuid7)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    raw_input: Optional[str] = None
    requires_confirmation: bool = False
    statutory_power_code: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

    def to_command(self, context: Optional[InteractionContext] = None) -> Command:
        """
        Convert canonical InvestigationIntent into a Command ready for CommandBus dispatch.
        """
        ctx = context or InteractionContext(
            case_id=self.target_case or "CASE-2026-001",
            selected_entity_id=self.target_entity,
            selected_evidence_id=self.target_evidence,
            selected_claim_id=self.target_claim,
        )

        args = dict(self.parameters)
        if self.target_case and "case_id" not in args:
            args["case_id"] = self.target_case
        if self.target_entity and "entity_id" not in args:
            args["entity_id"] = self.target_entity
        if self.target_evidence and "evidence_id" not in args:
            args["evidence_id"] = self.target_evidence
        if self.target_claim and "claim_id" not in args:
            args["claim_id"] = self.target_claim
        if self.temporal_constraints and "temporal_constraints" not in args:
            args["temporal_constraints"] = self.temporal_constraints
        if self.spatial_constraints and "spatial_constraints" not in args:
            args["spatial_constraints"] = self.spatial_constraints
        if self.requested_detail_level and "detail_level" not in args:
            args["detail_level"] = self.requested_detail_level.value

        # Determine requested actions if intent maps directly to UIActionType
        requested_actions: List[str] = []
        try:
            act_type = UIActionType(self.intent_name)
            requested_actions.append(act_type.value)
        except ValueError:
            pass

        cmd = Command(
            command_id=self.intent_id,
            source=self.modality,
            intent=self.intent_name,
            context=ctx,
            arguments=args,
            risk_class=self.risk_class,
            authorization_context=self.authorization_context,
            correlation_id=self.correlation_id,
            requested_actions=requested_actions,
            rationale=f"InvestigationIntent [{self.modality.value}:{self.intent_name}]",
            investigation_intent=self,
            timestamp=self.timestamp,
        )
        return cmd
