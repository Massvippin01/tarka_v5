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


class InvestigationRequestClass(str, Enum):
    """
    Eight canonical request classes for general investigative interaction.
    Never silently force an arbitrary request into a narrow legacy command slot.
    """
    EXECUTABLE_INVESTIGATION_REQUEST = "EXECUTABLE_INVESTIGATION_REQUEST"
    INFORMATIONAL_REQUEST = "INFORMATIONAL_REQUEST"
    NAVIGATION_REQUEST = "NAVIGATION_REQUEST"
    CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"
    CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
    UNAUTHORIZED_REQUEST = "UNAUTHORIZED_REQUEST"
    UNSUPPORTED_REQUEST = "UNSUPPORTED_REQUEST"
    OUT_OF_SCOPE_REQUEST = "OUT_OF_SCOPE_REQUEST"


class InvestigationIntent(BaseModel):
    """
    CANONICAL INVESTIGATION INTENT CONTRACT.

    Unified semantic contract representing an investigator's intention across
    all interaction surfaces (VOICE, TEXT/CHAT, UI, KEYBOARD, AGENT).

    Converges into CommandBus without duplicating modality-specific business logic.
    """
    intent_id: str = Field(default_factory=generate_uuid7)
    intent_name: str
    request_class: InvestigationRequestClass = InvestigationRequestClass.NAVIGATION_REQUEST
    sub_intent: Optional[str] = None

    # Target & Scope Identification
    target_case: Optional[str] = None
    case_id: Optional[str] = None
    target_entity: Optional[str] = None
    target_evidence: Optional[str] = None
    target_claim: Optional[str] = None
    targets: List[str] = Field(default_factory=list)
    entities: List[str] = Field(default_factory=list)
    evidence_refs: List[str] = Field(default_factory=list)
    jurisdiction: Optional[str] = None

    # Temporal & Spatial Constraints
    temporal_constraints: Optional[Dict[str, Any]] = None
    time_range: Optional[Dict[str, Any]] = None
    spatial_constraints: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None

    # Analytical Shaping & Query Attributes
    filters: Dict[str, Any] = Field(default_factory=dict)
    grouping: Optional[str] = None
    comparison: Optional[Dict[str, Any]] = None
    requested_output: Optional[str] = None
    requested_detail_level: InvestigationDetailLevel = InvestigationDetailLevel.STANDARD

    # Interaction & Governance Context
    modality: CommandSource = CommandSource.UI
    language: str = "en-IN"
    risk_class: ActionRiskClass = ActionRiskClass.READ
    authorization_context: Dict[str, Any] = Field(default_factory=dict)
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

    def __init__(self, **data: Any) -> None:
        # Backward-compatible field synchronization
        c_id = data.get("case_id") or data.get("target_case")
        if c_id:
            data["case_id"] = c_id
            data["target_case"] = c_id

        t_range = data.get("time_range") or data.get("temporal_constraints")
        if t_range:
            data["time_range"] = t_range
            data["temporal_constraints"] = t_range

        loc = data.get("location") or data.get("spatial_constraints")
        if loc:
            data["location"] = loc
            data["spatial_constraints"] = loc

        ents = list(data.get("entities") or [])
        t_ent = data.get("target_entity")
        if t_ent and t_ent not in ents:
            ents.insert(0, t_ent)
        elif ents and not t_ent:
            t_ent = ents[0]
        data["entities"] = ents
        data["target_entity"] = t_ent

        evs = list(data.get("evidence_refs") or [])
        t_ev = data.get("target_evidence")
        if t_ev and t_ev not in evs:
            evs.insert(0, t_ev)
        elif evs and not t_ev:
            t_ev = evs[0]
        data["evidence_refs"] = evs
        data["target_evidence"] = t_ev

        tgts = list(data.get("targets") or [])
        for item in ents + evs:
            if item and item not in tgts:
                tgts.append(item)
        data["targets"] = tgts

        # Synchronize ambiguity and confirmation flags with request_class if specified
        req_class = data.get("request_class")
        if req_class == InvestigationRequestClass.CLARIFICATION_REQUIRED or req_class == "CLARIFICATION_REQUIRED":
            data["ambiguity"] = True
        elif req_class == InvestigationRequestClass.CONFIRMATION_REQUIRED or req_class == "CONFIRMATION_REQUIRED":
            data["requires_confirmation"] = True

        super().__init__(**data)

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

        args["request_class"] = self.request_class.value
        if self.sub_intent:
            args["sub_intent"] = self.sub_intent
        if self.targets:
            args["targets"] = self.targets
        if self.entities:
            args["entities"] = self.entities
        if self.evidence_refs:
            args["evidence_refs"] = self.evidence_refs
        if self.filters:
            args["filters"] = self.filters
        if self.grouping:
            args["grouping"] = self.grouping
        if self.comparison:
            args["comparison"] = self.comparison
        if self.requested_output:
            args["requested_output"] = self.requested_output
        if self.jurisdiction:
            args["jurisdiction"] = self.jurisdiction

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
