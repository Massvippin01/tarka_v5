from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class InvestigatorDecision(BaseModel):
    decision_id: str = Field(default_factory=lambda: f"DEC-{uuid4().hex[:8]}")
    investigator_id: str
    decision_type: str  # ENDORSE_FINDING, REJECT_FINDING, OVERRIDE_MERGE, FREEZE_SNAPSHOT, CONFIRM_STATUTORY_NOTICE
    target_id: str
    rationale: str
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class AttentionFocusWindow(BaseModel):
    focused_entity_ids: List[str] = Field(default_factory=list)
    focused_contradiction_ids: List[str] = Field(default_factory=list)
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    geographical_scope: Optional[str] = None


class StructuredInvestigationMemory(BaseModel):
    """
    Structured memory persisting working hypotheses, attention focus,
    decision ledger, and human identity overrides across interaction turns and sessions.
    """
    case_id: str
    active_hypotheses: Dict[str, Any] = Field(default_factory=dict)
    working_claims: List[Dict[str, Any]] = Field(default_factory=list)
    attention_focus: AttentionFocusWindow = Field(default_factory=AttentionFocusWindow)
    decision_ledger: List[InvestigatorDecision] = Field(default_factory=list)
    identity_overrides: Dict[str, str] = Field(default_factory=dict)  # e.g. {"Bikram Sing": "DO_NOT_MERGE_WITH_Vikram_Singh"}
    session_notes: List[Dict[str, Any]] = Field(default_factory=list)
    last_updated: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

    def add_override(self, entity_raw: str, instruction: str) -> None:
        self.identity_overrides[entity_raw] = instruction
        self.last_updated = datetime.now(UTC).isoformat()

    def record_decision(self, decision: InvestigatorDecision) -> None:
        self.decision_ledger.append(decision)
        self.last_updated = datetime.now(UTC).isoformat()
