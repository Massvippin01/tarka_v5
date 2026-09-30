from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


# ────────────────────────────────────────────────────────────────────
# Voice Session Lifecycle & Turn Status Enums
# ────────────────────────────────────────────────────────────────────

class VoiceSessionStatus(str, Enum):
    CREATED = "CREATED"
    CONNECTING = "CONNECTING"
    CONNECTED = "CONNECTED"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    SPEAKING = "SPEAKING"
    INTERRUPTED = "INTERRUPTED"
    RECONNECTING = "RECONNECTING"
    DEGRADED = "DEGRADED"
    CLOSING = "CLOSING"
    CLOSED = "CLOSED"
    FAILED = "FAILED"


class VoiceTurnStatus(str, Enum):
    CREATED = "CREATED"
    LISTENING = "LISTENING"
    TRANSCRIBING = "TRANSCRIBING"
    INTERPRETING = "INTERPRETING"
    EXECUTING = "EXECUTING"
    SPEAKING = "SPEAKING"
    INTERRUPTED = "INTERRUPTED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    FAILED = "FAILED"


# Valid state transitions for VoiceSessionStatus
VALID_SESSION_TRANSITIONS: Dict[VoiceSessionStatus, List[VoiceSessionStatus]] = {
    VoiceSessionStatus.CREATED: [VoiceSessionStatus.CONNECTING, VoiceSessionStatus.FAILED, VoiceSessionStatus.CLOSED],
    VoiceSessionStatus.CONNECTING: [VoiceSessionStatus.CONNECTED, VoiceSessionStatus.DEGRADED, VoiceSessionStatus.FAILED, VoiceSessionStatus.CLOSED],
    VoiceSessionStatus.CONNECTED: [VoiceSessionStatus.LISTENING, VoiceSessionStatus.DEGRADED, VoiceSessionStatus.RECONNECTING, VoiceSessionStatus.CLOSING, VoiceSessionStatus.CLOSED, VoiceSessionStatus.FAILED],
    VoiceSessionStatus.LISTENING: [VoiceSessionStatus.PROCESSING, VoiceSessionStatus.INTERRUPTED, VoiceSessionStatus.DEGRADED, VoiceSessionStatus.RECONNECTING, VoiceSessionStatus.CLOSING, VoiceSessionStatus.CLOSED, VoiceSessionStatus.FAILED],
    VoiceSessionStatus.PROCESSING: [VoiceSessionStatus.SPEAKING, VoiceSessionStatus.LISTENING, VoiceSessionStatus.CONNECTED, VoiceSessionStatus.INTERRUPTED, VoiceSessionStatus.DEGRADED, VoiceSessionStatus.RECONNECTING, VoiceSessionStatus.CLOSING, VoiceSessionStatus.CLOSED, VoiceSessionStatus.FAILED],
    VoiceSessionStatus.SPEAKING: [VoiceSessionStatus.LISTENING, VoiceSessionStatus.INTERRUPTED, VoiceSessionStatus.CONNECTED, VoiceSessionStatus.DEGRADED, VoiceSessionStatus.RECONNECTING, VoiceSessionStatus.CLOSING, VoiceSessionStatus.CLOSED, VoiceSessionStatus.FAILED],
    VoiceSessionStatus.INTERRUPTED: [VoiceSessionStatus.LISTENING, VoiceSessionStatus.PROCESSING, VoiceSessionStatus.CONNECTED, VoiceSessionStatus.CLOSING, VoiceSessionStatus.CLOSED, VoiceSessionStatus.FAILED],
    VoiceSessionStatus.RECONNECTING: [VoiceSessionStatus.CONNECTED, VoiceSessionStatus.DEGRADED, VoiceSessionStatus.FAILED, VoiceSessionStatus.CLOSED],
    VoiceSessionStatus.DEGRADED: [VoiceSessionStatus.CONNECTED, VoiceSessionStatus.RECONNECTING, VoiceSessionStatus.CLOSING, VoiceSessionStatus.CLOSED, VoiceSessionStatus.FAILED],
    VoiceSessionStatus.CLOSING: [VoiceSessionStatus.CLOSED],
    VoiceSessionStatus.CLOSED: [],
    VoiceSessionStatus.FAILED: [VoiceSessionStatus.CLOSING, VoiceSessionStatus.CLOSED],
}


class InvalidVoiceStateTransition(Exception):
    pass


# ────────────────────────────────────────────────────────────────────
# Domain Value Objects & Entities
# ────────────────────────────────────────────────────────────────────

class AudioChunkMetadata(BaseModel):
    chunk_id: str = Field(default_factory=lambda: f"CHK-{uuid4().hex[:8]}")
    session_id: str
    sequence_number: int
    sample_rate: int = 16000
    channels: int = 1
    format: str = "pcm_s16le"
    duration_ms: float = 100.0
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class TranscriptSegment(BaseModel):
    text: str
    start_time_ms: float = 0.0
    end_time_ms: float = 0.0
    confidence: float = 1.0
    speaker: Optional[str] = None


class Transcript(BaseModel):
    transcript_id: str = Field(default_factory=lambda: f"TR-{uuid4().hex[:8]}")
    text: str
    is_final: bool = True
    confidence: float = 0.95
    segments: List[TranscriptSegment] = Field(default_factory=list)
    language: str = "en-IN"
    code_switch_metadata: Dict[str, Any] = Field(default_factory=dict)
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class VoiceCommandCandidate(BaseModel):
    candidate_id: str = Field(default_factory=lambda: f"VCC-{uuid4().hex[:8]}")
    transcript_id: str
    intent: str
    action: Optional[str] = None
    parameters: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.95
    language: str = "en-IN"
    transcript_text: str = ""
    is_ambiguous: bool = False
    requested_action: Optional[str] = None
    requires_confirmation: bool = False
    risk_class: str = "READ"
    confirmation_message: Optional[str] = None


class VoiceTurn(BaseModel):
    turn_id: str = Field(default_factory=lambda: f"VT-{uuid4().hex[:8]}")
    session_id: str
    sequence_number: int = 1
    started_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    ended_at: Optional[str] = None
    transcript: Optional[Transcript] = None
    language: str = "en-IN"
    confidence: float = 0.95
    command_id: Optional[str] = None
    execution_status: str = "PENDING"
    status: VoiceTurnStatus = VoiceTurnStatus.CREATED


class VoiceSession(BaseModel):
    session_id: str = Field(default_factory=lambda: f"VS-{uuid4().hex[:8]}")
    investigator_id: str
    operating_context_id: str = "CTX-DEFAULT"
    case_id: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    started_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    last_activity_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    status: VoiceSessionStatus = VoiceSessionStatus.CREATED
    language: str = "en-IN"
    provider: str = "livekit"
    correlation_id: str = Field(default_factory=lambda: f"CORR-{uuid4().hex[:8]}")
    turns: List[VoiceTurn] = Field(default_factory=list)

    def transition_to(self, new_status: VoiceSessionStatus) -> None:
        """Validate state transition according to official state machine."""
        allowed = VALID_SESSION_TRANSITIONS.get(self.status, [])
        if new_status not in allowed and new_status != self.status:
            raise InvalidVoiceStateTransition(
                f"Cannot transition VoiceSession from {self.status} to {new_status}. Allowed: {allowed}"
            )
        self.status = new_status
        self.last_activity_at = datetime.now(UTC).isoformat()


class VoiceResponse(BaseModel):
    response_id: str = Field(default_factory=lambda: f"VR-{uuid4().hex[:8]}")
    session_id: str
    turn_id: str
    response_type: str = "SUCCESS"  # SUCCESS, REJECTION, AMBIGUITY, FAILURE, POLICY_DENIAL, EVIDENCE_LIMITATION, AGENT_FINDING, CONFIRMATION_REQUIRED
    spoken_text: str = ""
    display_text: str = ""
    command_execution_result: Optional[Dict[str, Any]] = None
    agent_finding: Optional[Dict[str, Any]] = None
    structured_reference: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class VoiceInterruption(BaseModel):
    interruption_id: str = Field(default_factory=lambda: f"VINT-{uuid4().hex[:8]}")
    session_id: str
    turn_id: str
    interrupted_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    interrupted_speaking_turn_id: str = ""
    reason: str = "BARGE_IN_SPEECH_DETECTED"


class VoiceProviderStatus(BaseModel):
    provider: str = "livekit"
    is_available: bool = True
    transport_status: str = "READY"
    stt_status: str = "READY"
    tts_status: str = "READY"
    error_message: Optional[str] = None


# ────────────────────────────────────────────────────────────────────
# Legacy Compatibility Contracts
# ────────────────────────────────────────────────────────────────────

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
    intent: str
    action: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.95
    requires_confirmation: bool = False
    risk_level: str = "LOW"
    confirmation_message: Optional[str] = None


class VoiceCommandRequest(BaseModel):
    command_id: str = Field(default_factory=lambda: f"VCMD-{uuid4().hex[:8]}")
    transcript: str = Field(..., min_length=1)
    locale: str = "en-IN"
    confidence: float = 0.95
    active_case_id: Optional[str] = "CASE-2026-001"
    selected_entity_id: Optional[str] = None
    selected_relationship_id: Optional[str] = None
    time_range: Optional[List[str]] = None
    jurisdiction: Optional[str] = "Delhi NCR / Gurugram"


class VoiceCommandResponse(BaseModel):
    command_id: str
    transcript: str
    state: VoiceStateEnum = VoiceStateEnum.COMPLETED
    interpretation: VoiceInterpretation
    execution_status: str = "SUCCESS"
    resulting_domain_events: List[str] = Field(default_factory=list)
    audit_event_id: Optional[str] = None
    error: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
