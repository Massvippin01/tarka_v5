from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class VoiceStateEnum(str, Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    TRANSCRIPT_READY = "TRANSCRIPT_READY"
    COMMAND_INTERPRETED = "COMMAND_INTERPRETED"
    CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
    EXECUTING = "EXECUTING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ERROR = "ERROR"
    UNAVAILABLE = "UNAVAILABLE"
    PERMISSION_DENIED = "PERMISSION_DENIED"


class VoiceInterpretation(BaseModel):
    intent: str  # NAVIGATE, SEARCH, FILTER, ANALYZE, COPILOT, MODIFY_RECORD
    action: str  # OPEN_CASE, FOCUS_ENTITY, SHOW_TIMELINE, SHOW_CONTRADICTIONS, SHOW_GAPS, SWITCH_MODE, ASK_COPILOT, DELETE_RECORD
    parameters: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.95
    requires_confirmation: bool = False
    risk_level: str = "LOW"  # LOW, HIGH
    confirmation_message: Optional[str] = None


class VoiceCommandRequest(BaseModel):
    command_id: str = Field(default_factory=lambda: f"VCMD-{uuid4().hex[:8]}")
    transcript: str = Field(..., min_length=1)
    locale: str = "en-IN"
    confidence: float = 0.95
    active_case_id: Optional[str] = "C102"
    selected_entity_id: Optional[str] = None
    selected_relationship_id: Optional[str] = None
    time_range: Optional[List[str]] = None
    jurisdiction: Optional[str] = "Delhi NCR / Gurugram"


class VoiceCommandResponse(BaseModel):
    command_id: str
    transcript: str
    state: VoiceStateEnum = VoiceStateEnum.COMPLETED
    interpretation: VoiceInterpretation
    execution_status: str = "SUCCESS"  # SUCCESS, CONFIRMATION_REQUIRED, REJECTED, FAILED
    resulting_domain_events: List[str] = Field(default_factory=list)
    audit_event_id: Optional[str] = None
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
