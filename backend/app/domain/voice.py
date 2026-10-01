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
    VoiceSessionStatus.LISTENING: [VoiceSessionStatus.PROCESSING, VoiceSessionStatus.SPEAKING, VoiceSessionStatus.INTERRUPTED, VoiceSessionStatus.DEGRADED, VoiceSessionStatus.RECONNECTING, VoiceSessionStatus.CLOSING, VoiceSessionStatus.CLOSED, VoiceSessionStatus.FAILED],
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
    transcript_id: str = Field(default_factory=lambda: f"TR-{uuid4().hex[:8]}")
    intent: str
    action: Optional[str] = None
    request_class: str = "NAVIGATION_REQUEST"
    sub_intent: Optional[str] = None
    targets: List[str] = Field(default_factory=list)
    entities: List[str] = Field(default_factory=list)
    evidence_refs: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    parameters: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = 0.95
    language: str = "en-IN"
    transcript_text: str = ""
    is_ambiguous: bool = False
    ambiguity_reason: Optional[str] = None
    clarification_prompt: Optional[str] = None
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


# ────────────────────────────────────────────────────────────────────
# Canonical Ambient Voice State Machine (Subphase A1)
# ────────────────────────────────────────────────────────────────────

class AmbientVoiceState(str, Enum):
    """
    User-facing ambient interaction states.
    Transforms SentinelX into a persistent, context-aware operational assistant.
    """
    READY = "READY"
    LISTENING = "LISTENING"
    USER_SPEAKING = "USER_SPEAKING"
    TRANSCRIBING = "TRANSCRIBING"
    UNDERSTANDING = "UNDERSTANDING"
    EXECUTING = "EXECUTING"
    SHOWING_RESULT = "SHOWING_RESULT"
    SPEAKING = "SPEAKING"
    INTERRUPTED = "INTERRUPTED"
    WAITING_FOR_CLARIFICATION = "WAITING_FOR_CLARIFICATION"
    WAITING_FOR_CONFIRMATION = "WAITING_FOR_CONFIRMATION"
    OFFLINE = "OFFLINE"
    MICROPHONE_DENIED = "MICROPHONE_DENIED"
    ERROR = "ERROR"


class AmbientVoiceEvent(str, Enum):
    """
    Canonical voice lifecycle and turn events triggering ambient transitions.
    """
    VOICE_ACTIVATED = "VOICE_ACTIVATED"
    MIC_PERMISSION_GRANTED = "MIC_PERMISSION_GRANTED"
    MIC_PERMISSION_DENIED = "MIC_PERMISSION_DENIED"
    SPEECH_ONSET = "SPEECH_ONSET"
    SPEECH_END = "SPEECH_END"
    TRANSCRIPTION_STARTED = "TRANSCRIPTION_STARTED"
    TRANSCRIPTION_COMPLETED = "TRANSCRIPTION_COMPLETED"
    UNDERSTANDING_STARTED = "UNDERSTANDING_STARTED"
    INTENT_RESOLVED = "INTENT_RESOLVED"
    CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"
    CONFIRMATION_REQUIRED = "CONFIRMATION_REQUIRED"
    CONFIRMATION_ACCEPTED = "CONFIRMATION_ACCEPTED"
    CONFIRMATION_REJECTED = "CONFIRMATION_REJECTED"
    COMMAND_STARTED = "COMMAND_STARTED"
    COMMAND_COMPLETED = "COMMAND_COMPLETED"
    COMMAND_FAILED = "COMMAND_FAILED"
    RESULT_AVAILABLE = "RESULT_AVAILABLE"
    TTS_STARTED = "TTS_STARTED"
    TTS_COMPLETED = "TTS_COMPLETED"
    USER_INTERRUPTED = "USER_INTERRUPTED"
    OFFLINE_DETECTED = "OFFLINE_DETECTED"
    ONLINE_RESTORED = "ONLINE_RESTORED"
    RECONNECT_STARTED = "RECONNECT_STARTED"
    RECONNECT_COMPLETED = "RECONNECT_COMPLETED"
    ERROR_OCCURRED = "ERROR_OCCURRED"
    RESET = "RESET"


class InvalidAmbientVoiceTransition(Exception):
    """Raised when an invalid ambient voice state transition is attempted."""
    pass


# Deterministic State Transition Matrix for Ambient Voice
VALID_AMBIENT_TRANSITIONS: Dict[AmbientVoiceState, Dict[AmbientVoiceEvent, AmbientVoiceState]] = {
    AmbientVoiceState.READY: {
        AmbientVoiceEvent.SPEECH_ONSET: AmbientVoiceState.USER_SPEAKING,
        AmbientVoiceEvent.VOICE_ACTIVATED: AmbientVoiceState.LISTENING,
        AmbientVoiceEvent.MIC_PERMISSION_DENIED: AmbientVoiceState.MICROPHONE_DENIED,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
    },
    AmbientVoiceState.LISTENING: {
        AmbientVoiceEvent.SPEECH_ONSET: AmbientVoiceState.USER_SPEAKING,
        AmbientVoiceEvent.TRANSCRIPTION_STARTED: AmbientVoiceState.TRANSCRIBING,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.READY,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.USER_SPEAKING: {
        AmbientVoiceEvent.SPEECH_END: AmbientVoiceState.TRANSCRIBING,
        AmbientVoiceEvent.TRANSCRIPTION_STARTED: AmbientVoiceState.TRANSCRIBING,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.READY,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.TRANSCRIBING: {
        AmbientVoiceEvent.TRANSCRIPTION_COMPLETED: AmbientVoiceState.UNDERSTANDING,
        AmbientVoiceEvent.UNDERSTANDING_STARTED: AmbientVoiceState.UNDERSTANDING,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.INTERRUPTED,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.UNDERSTANDING: {
        AmbientVoiceEvent.INTENT_RESOLVED: AmbientVoiceState.EXECUTING,
        AmbientVoiceEvent.COMMAND_STARTED: AmbientVoiceState.EXECUTING,
        AmbientVoiceEvent.CLARIFICATION_REQUIRED: AmbientVoiceState.WAITING_FOR_CLARIFICATION,
        AmbientVoiceEvent.CONFIRMATION_REQUIRED: AmbientVoiceState.WAITING_FOR_CONFIRMATION,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.INTERRUPTED,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.WAITING_FOR_CLARIFICATION: {
        AmbientVoiceEvent.SPEECH_ONSET: AmbientVoiceState.USER_SPEAKING,
        AmbientVoiceEvent.TRANSCRIPTION_STARTED: AmbientVoiceState.TRANSCRIBING,
        AmbientVoiceEvent.UNDERSTANDING_STARTED: AmbientVoiceState.UNDERSTANDING,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.READY,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.WAITING_FOR_CONFIRMATION: {
        AmbientVoiceEvent.CONFIRMATION_ACCEPTED: AmbientVoiceState.EXECUTING,
        AmbientVoiceEvent.CONFIRMATION_REJECTED: AmbientVoiceState.READY,
        AmbientVoiceEvent.SPEECH_ONSET: AmbientVoiceState.USER_SPEAKING,
        AmbientVoiceEvent.TRANSCRIPTION_STARTED: AmbientVoiceState.TRANSCRIBING,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.READY,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.EXECUTING: {
        AmbientVoiceEvent.COMMAND_COMPLETED: AmbientVoiceState.SHOWING_RESULT,
        AmbientVoiceEvent.RESULT_AVAILABLE: AmbientVoiceState.SHOWING_RESULT,
        AmbientVoiceEvent.COMMAND_FAILED: AmbientVoiceState.ERROR,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.INTERRUPTED,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.SHOWING_RESULT: {
        AmbientVoiceEvent.TTS_STARTED: AmbientVoiceState.SPEAKING,
        AmbientVoiceEvent.TTS_COMPLETED: AmbientVoiceState.READY,
        AmbientVoiceEvent.SPEECH_ONSET: AmbientVoiceState.USER_SPEAKING,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.READY,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.SPEAKING: {
        AmbientVoiceEvent.TTS_COMPLETED: AmbientVoiceState.READY,
        AmbientVoiceEvent.USER_INTERRUPTED: AmbientVoiceState.INTERRUPTED,
        AmbientVoiceEvent.SPEECH_ONSET: AmbientVoiceState.INTERRUPTED,  # Barge-in detected!
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.INTERRUPTED: {
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.SPEECH_ONSET: AmbientVoiceState.USER_SPEAKING,
        AmbientVoiceEvent.VOICE_ACTIVATED: AmbientVoiceState.READY,
        AmbientVoiceEvent.TTS_COMPLETED: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.OFFLINE: {
        AmbientVoiceEvent.ONLINE_RESTORED: AmbientVoiceState.READY,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.MICROPHONE_DENIED: {
        AmbientVoiceEvent.MIC_PERMISSION_GRANTED: AmbientVoiceState.READY,
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.ERROR_OCCURRED: AmbientVoiceState.ERROR,
    },
    AmbientVoiceState.ERROR: {
        AmbientVoiceEvent.RESET: AmbientVoiceState.READY,
        AmbientVoiceEvent.VOICE_ACTIVATED: AmbientVoiceState.READY,
        AmbientVoiceEvent.MIC_PERMISSION_GRANTED: AmbientVoiceState.READY,
        AmbientVoiceEvent.OFFLINE_DETECTED: AmbientVoiceState.OFFLINE,
    },
}


class AmbientVoiceTransitionRecord(BaseModel):
    """
    Auditable transition record capturing state machine movements.
    """
    transition_id: str = Field(default_factory=lambda: f"AVTR-{uuid4().hex[:8]}")
    current_state: AmbientVoiceState
    event: AmbientVoiceEvent
    next_state: AmbientVoiceState
    is_valid: bool = True
    session_id: Optional[str] = None
    turn_id: Optional[str] = None
    correlation_id: str = Field(default_factory=lambda: f"CORR-{uuid4().hex[:8]}")
    case_id: Optional[str] = "CASE-2026-001"
    rejection_reason: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AmbientVoiceTransitionResult(BaseModel):
    """
    Result of a state machine transition evaluation.
    """
    success: bool
    current_state: AmbientVoiceState
    event: AmbientVoiceEvent
    next_state: AmbientVoiceState
    rejection_reason: Optional[str] = None
    record: AmbientVoiceTransitionRecord


class AmbientVoiceStateMachine:
    """
    Pure, deterministic state transition engine for Ambient Voice.
    
    RESPONSIBILITIES:
    - Enforces valid/forbidden transition rules.
    - Fails closed on invalid transitions (state does not mutate).
    - Preserves session, case, and correlation identifiers.
    - Emits auditable transition records.
    - Pure transition logic: no business logic, no evidence mutation, no authorization alteration.
    """

    @classmethod
    def is_valid_transition(cls, current_state: AmbientVoiceState, event: AmbientVoiceEvent) -> bool:
        return event in VALID_AMBIENT_TRANSITIONS.get(current_state, {})

    @classmethod
    def get_next_state(cls, current_state: AmbientVoiceState, event: AmbientVoiceEvent) -> Optional[AmbientVoiceState]:
        return VALID_AMBIENT_TRANSITIONS.get(current_state, {}).get(event)

    @classmethod
    def get_allowed_events(cls, current_state: AmbientVoiceState) -> List[AmbientVoiceEvent]:
        return list(VALID_AMBIENT_TRANSITIONS.get(current_state, {}).keys())

    @classmethod
    def transition(
        cls,
        current_state: AmbientVoiceState,
        event: AmbientVoiceEvent,
        session_id: Optional[str] = None,
        turn_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        case_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        fail_closed: bool = True,
    ) -> AmbientVoiceTransitionResult:
        cid = correlation_id or f"CORR-{uuid4().hex[:8]}"
        meta = metadata or {}

        allowed_map = VALID_AMBIENT_TRANSITIONS.get(current_state, {})
        next_st = allowed_map.get(event)

        if next_st is None:
            reason = (
                f"Invalid transition: Cannot transition AmbientVoiceState from '{current_state.value}' "
                f"via event '{event.value}'. Allowed events: {[e.value for e in allowed_map.keys()]}"
            )
            record = AmbientVoiceTransitionRecord(
                current_state=current_state,
                event=event,
                next_state=current_state,
                is_valid=False,
                session_id=session_id,
                turn_id=turn_id,
                correlation_id=cid,
                case_id=case_id,
                rejection_reason=reason,
                metadata=meta,
            )
            if fail_closed:
                # Still returns structured failure object without mutating state
                return AmbientVoiceTransitionResult(
                    success=False,
                    current_state=current_state,
                    event=event,
                    next_state=current_state,
                    rejection_reason=reason,
                    record=record,
                )
            raise InvalidAmbientVoiceTransition(reason)

        record = AmbientVoiceTransitionRecord(
            current_state=current_state,
            event=event,
            next_state=next_st,
            is_valid=True,
            session_id=session_id,
            turn_id=turn_id,
            correlation_id=cid,
            case_id=case_id,
            metadata=meta,
        )

        return AmbientVoiceTransitionResult(
            success=True,
            current_state=current_state,
            event=event,
            next_state=next_st,
            record=record,
        )


def map_session_and_turn_to_ambient_state(
    session_status: VoiceSessionStatus,
    turn_status: Optional[VoiceTurnStatus] = None,
    is_offline: bool = False,
    mic_denied: bool = False,
    has_error: bool = False,
    is_clarifying: bool = False,
    is_confirming: bool = False,
) -> AmbientVoiceState:
    """
    Explicit boundary relationship between:
    - VoiceSessionStatus (transport/session lifecycle)
    - VoiceTurnStatus (individual conversational turn)
    - AmbientVoiceState (user-facing interaction state)
    """
    if is_offline:
        return AmbientVoiceState.OFFLINE
    if mic_denied:
        return AmbientVoiceState.MICROPHONE_DENIED
    if has_error or session_status == VoiceSessionStatus.FAILED:
        return AmbientVoiceState.ERROR
    if is_clarifying:
        return AmbientVoiceState.WAITING_FOR_CLARIFICATION
    if is_confirming:
        return AmbientVoiceState.WAITING_FOR_CONFIRMATION

    if session_status == VoiceSessionStatus.INTERRUPTED or (turn_status and turn_status == VoiceTurnStatus.INTERRUPTED):
        return AmbientVoiceState.INTERRUPTED

    if turn_status is not None:
        if turn_status == VoiceTurnStatus.CREATED:
            return AmbientVoiceState.LISTENING
        elif turn_status == VoiceTurnStatus.LISTENING:
            return AmbientVoiceState.USER_SPEAKING
        elif turn_status == VoiceTurnStatus.TRANSCRIBING:
            return AmbientVoiceState.TRANSCRIBING
        elif turn_status == VoiceTurnStatus.INTERPRETING:
            return AmbientVoiceState.UNDERSTANDING
        elif turn_status == VoiceTurnStatus.EXECUTING:
            return AmbientVoiceState.EXECUTING
        elif turn_status == VoiceTurnStatus.SPEAKING:
            return AmbientVoiceState.SPEAKING
        elif turn_status == VoiceTurnStatus.FAILED:
            return AmbientVoiceState.ERROR

    if session_status == VoiceSessionStatus.SPEAKING:
        return AmbientVoiceState.SPEAKING
    elif session_status == VoiceSessionStatus.LISTENING:
        return AmbientVoiceState.LISTENING
    elif session_status == VoiceSessionStatus.PROCESSING:
        return AmbientVoiceState.UNDERSTANDING
    elif session_status in [VoiceSessionStatus.CONNECTED, VoiceSessionStatus.CREATED]:
        return AmbientVoiceState.READY

    return AmbientVoiceState.READY


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
    ambient_state: AmbientVoiceState = AmbientVoiceState.READY
    ambient_transitions: List[AmbientVoiceTransitionRecord] = Field(default_factory=list)

    def transition_ambient(self, event: AmbientVoiceEvent, metadata: Optional[Dict[str, Any]] = None) -> AmbientVoiceTransitionResult:
        res = AmbientVoiceStateMachine.transition(
            current_state=self.ambient_state,
            event=event,
            session_id=self.session_id,
            turn_id=self.turns[-1].turn_id if self.turns else None,
            correlation_id=self.correlation_id,
            case_id=self.case_id,
            metadata=metadata,
        )
        if res.success:
            self.ambient_state = res.next_state
            self.last_activity_at = datetime.now(UTC).isoformat()
        self.ambient_transitions.append(res.record)
        return res

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


