"""
SentinelX Voice Provider Abstractions — Phase 5 Realtime Voice Foundation

Five independently replaceable provider interfaces:
  1. RealtimeTransportProvider — WebRTC/LiveKit session & audio transport
  2. StreamingSTTProvider — streaming speech-to-text with partial/final transcripts
  3. VADProvider — voice activity detection (speech start/end/silence)
  4. TurnDetectionProvider — conversational turn boundary detection
  5. TTSProvider — text-to-speech synthesis with prosody control

Design invariants:
  - SentinelX domain logic never depends on a specific commercial provider.
  - The Sentinel voice identity belongs to SentinelX, not to any provider.
  - Provider implementations must be replaceable via config without code changes.
  - No business logic in the transport layer.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional
from uuid import uuid4


# ────────────────────────────────────────────────────────────────────
# Value Objects
# ────────────────────────────────────────────────────────────────────

class TranscriptType(str, Enum):
    """Whether a transcript is partial (streaming) or finalized."""
    PARTIAL = "PARTIAL"
    FINAL = "FINAL"


class VADEvent(str, Enum):
    """Voice Activity Detection events."""
    SPEECH_START = "SPEECH_START"
    SPEECH_END = "SPEECH_END"
    SILENCE = "SILENCE"


class TurnState(str, Enum):
    """
    Turn lifecycle states.
    Preserves Wave 5 VoiceSessionState semantics while adding
    production states for the full pipeline.
    """
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    TRANSCRIBING = "TRANSCRIBING"
    THINKING = "THINKING"
    TOOL_EXECUTION = "TOOL_EXECUTION"
    SPEAKING = "SPEAKING"
    INTERRUPTED = "INTERRUPTED"
    ERROR = "ERROR"
    CANCELLED = "CANCELLED"


@dataclass
class StreamingTranscript:
    """A speech-to-text transcript chunk."""
    transcript_id: str = field(default_factory=lambda: f"TR-{uuid4().hex[:8]}")
    text: str = ""
    confidence: float = 0.0
    transcript_type: TranscriptType = TranscriptType.PARTIAL
    language_code: str = "en-IN"
    is_final: bool = False
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


@dataclass
class SynthesizedAudio:
    """TTS output chunk for streaming delivery."""
    audio_bytes: bytes = b""
    sample_rate: int = 24000
    channels: int = 1
    format: str = "pcm_s16le"
    is_final: bool = False
    text_segment: str = ""


@dataclass
class TransportSession:
    """Represents an active voice transport session (e.g., a LiveKit room)."""
    session_id: str = field(default_factory=lambda: f"VS-{uuid4().hex[:8]}")
    room_name: str = ""
    participant_identity: str = ""
    transport_url: str = ""
    access_token: str = ""
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    expires_in_seconds: int = 3600
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VADResult:
    """Result from voice activity detection."""
    event: VADEvent = VADEvent.SILENCE
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    confidence: float = 0.0
    speech_duration_ms: int = 0


# ────────────────────────────────────────────────────────────────────
# Abstract Provider Interfaces
# ────────────────────────────────────────────────────────────────────

class RealtimeTransportProvider(abc.ABC):
    """
    WebRTC/LiveKit session and audio transport provider.
    Manages room creation, participant lifecycle, and audio streaming.
    This is TRANSPORT INFRASTRUCTURE only — not investigation logic.
    """

    @abc.abstractmethod
    async def create_session(
        self,
        user_id: str,
        case_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TransportSession:
        """Create a new voice transport session."""

    @abc.abstractmethod
    async def close_session(self, session_id: str) -> None:
        """Cleanly close a voice transport session."""

    @abc.abstractmethod
    async def stream_audio_in(self, session_id: str) -> AsyncIterator[bytes]:
        """
        Yield incoming audio chunks from the investigator's microphone.
        Transport-level only; no business logic.
        """

    @abc.abstractmethod
    async def stream_audio_out(
        self, session_id: str, audio_chunks: AsyncIterator[bytes]
    ) -> None:
        """
        Push synthesized audio chunks to the investigator's speaker.
        """

    @abc.abstractmethod
    async def cancel_audio_out(self, session_id: str) -> None:
        """
        Immediately cancel any in-progress outbound audio delivery.
        Required for barge-in / interruption support.
        """


class StreamingSTTProvider(abc.ABC):
    """
    Streaming speech-to-text provider.
    Supports partial transcripts, finalized transcripts, interruption,
    cancellation, silence, provider failure, reconnect, and
    language identification where supported.
    """

    @abc.abstractmethod
    async def transcribe_stream(
        self,
        audio_chunks: AsyncIterator[bytes],
        language_hint: str = "en-IN",
    ) -> AsyncIterator[StreamingTranscript]:
        """
        Yield streaming transcripts from audio input.
        Must support partial + final transcripts.
        """

    @abc.abstractmethod
    async def cancel(self) -> None:
        """Cancel an in-progress transcription."""


class VADProvider(abc.ABC):
    """
    Voice Activity Detection provider.
    Detects speech start, speech end, and silence events.
    """

    @abc.abstractmethod
    async def detect(
        self, audio_chunks: AsyncIterator[bytes]
    ) -> AsyncIterator[VADResult]:
        """Yield VAD events from raw audio stream."""


class TurnDetectionProvider(abc.ABC):
    """
    Conversational turn boundary detection.
    Determines when the investigator has finished speaking
    and when Sentinel should begin responding.
    """

    @abc.abstractmethod
    async def detect_turn_boundary(
        self,
        vad_events: AsyncIterator[VADResult],
        transcripts: AsyncIterator[StreamingTranscript],
    ) -> bool:
        """
        Returns True when a turn boundary is detected
        (investigator has finished speaking).
        """

    @abc.abstractmethod
    async def detect_interruption(
        self,
        vad_events: AsyncIterator[VADResult],
        current_state: TurnState,
    ) -> bool:
        """
        Returns True if the investigator is interrupting
        during SPEAKING state (barge-in detection).
        """


class TTSProvider(abc.ABC):
    """
    Text-to-speech synthesis provider with prosody control.
    The Sentinel voice identity belongs to SentinelX, not to the provider.
    """

    @abc.abstractmethod
    async def synthesize_stream(
        self,
        text: str,
        voice_id: str = "sentinel-forensic-voice-s2",
        language: str = "en-IN",
        speed: float = 1.02,
        pitch: float = 1.0,
    ) -> AsyncIterator[SynthesizedAudio]:
        """
        Yield streaming audio chunks for the given text.
        Must support cancellation via cancel().
        """

    @abc.abstractmethod
    async def cancel(self) -> None:
        """Cancel an in-progress synthesis."""


# ────────────────────────────────────────────────────────────────────
# Deterministic Mock Implementations (for tests and development)
# ────────────────────────────────────────────────────────────────────

class MockRealtimeTransportProvider(RealtimeTransportProvider):
    """Deterministic transport provider for test infrastructure."""

    def __init__(self) -> None:
        self._sessions: Dict[str, TransportSession] = {}

    async def create_session(
        self,
        user_id: str,
        case_id: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> TransportSession:
        session = TransportSession(
            room_name=f"sentinelx-room-{case_id}",
            participant_identity=user_id,
            transport_url="wss://sentinelx-livekit.local/webrtc",
            access_token=f"mock-token-{uuid4().hex[:12]}",
            metadata=metadata or {},
        )
        self._sessions[session.session_id] = session
        return session

    async def close_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    async def stream_audio_in(self, session_id: str) -> AsyncIterator[bytes]:
        # Yield deterministic silent PCM frames for testing
        for _ in range(3):
            yield b"\x00" * 1600  # 100ms of 16kHz mono 16-bit PCM silence

    async def stream_audio_out(
        self, session_id: str, audio_chunks: AsyncIterator[bytes]
    ) -> None:
        # Consume and discard in mock
        async for _ in audio_chunks:
            pass

    async def cancel_audio_out(self, session_id: str) -> None:
        pass  # No-op in mock


class MockStreamingSTTProvider(StreamingSTTProvider):
    """
    Deterministic STT provider for core test infrastructure.
    Returns a configurable transcript sequence.
    """

    def __init__(self, transcripts: Optional[List[str]] = None) -> None:
        self._transcripts = transcripts or [
            "Explain why this contradiction matters and check velocity"
        ]
        self._cancelled = False

    async def transcribe_stream(
        self,
        audio_chunks: AsyncIterator[bytes],
        language_hint: str = "en-IN",
    ) -> AsyncIterator[StreamingTranscript]:
        # Consume audio (required by interface contract)
        async for _ in audio_chunks:
            pass

        if self._cancelled:
            return

        for i, text in enumerate(self._transcripts):
            is_last = i == len(self._transcripts) - 1
            # Yield partial first
            if not is_last:
                yield StreamingTranscript(
                    text=text,
                    confidence=0.85,
                    transcript_type=TranscriptType.PARTIAL,
                    language_code=language_hint,
                    is_final=False,
                )
            # Yield final
            yield StreamingTranscript(
                text=text,
                confidence=0.98,
                transcript_type=TranscriptType.FINAL,
                language_code=language_hint,
                is_final=True,
            )

    async def cancel(self) -> None:
        self._cancelled = True


class MockVADProvider(VADProvider):
    """Deterministic VAD provider for testing."""

    async def detect(
        self, audio_chunks: AsyncIterator[bytes]
    ) -> AsyncIterator[VADResult]:
        # Simulate: speech start, then speech end after consuming audio
        yield VADResult(
            event=VADEvent.SPEECH_START,
            confidence=0.95,
            speech_duration_ms=0,
        )
        async for _ in audio_chunks:
            pass
        yield VADResult(
            event=VADEvent.SPEECH_END,
            confidence=0.95,
            speech_duration_ms=2500,
        )


class MockTurnDetectionProvider(TurnDetectionProvider):
    """Deterministic turn detection for testing."""

    async def detect_turn_boundary(
        self,
        vad_events: AsyncIterator[VADResult],
        transcripts: AsyncIterator[StreamingTranscript],
    ) -> bool:
        # In mock, always detect a turn boundary after SPEECH_END
        async for event in vad_events:
            if event.event == VADEvent.SPEECH_END:
                return True
        return False

    async def detect_interruption(
        self,
        vad_events: AsyncIterator[VADResult],
        current_state: TurnState,
    ) -> bool:
        if current_state != TurnState.SPEAKING:
            return False
        async for event in vad_events:
            if event.event == VADEvent.SPEECH_START:
                return True
        return False


class MockTTSProvider(TTSProvider):
    """
    Deterministic TTS provider returning simulated PCM audio bytes.
    """

    def __init__(self) -> None:
        self._cancelled = False

    async def synthesize_stream(
        self,
        text: str,
        voice_id: str = "sentinel-forensic-voice-s2",
        language: str = "en-IN",
        speed: float = 1.02,
        pitch: float = 1.0,
    ) -> AsyncIterator[SynthesizedAudio]:
        self._cancelled = False
        # Split text into word chunks for streaming simulation
        words = text.split()
        for i, word in enumerate(words):
            if self._cancelled:
                return
            is_last = i == len(words) - 1
            yield SynthesizedAudio(
                audio_bytes=b"MOCK_PCM_" + word.encode("utf-8")[:16],
                sample_rate=24000,
                channels=1,
                format="pcm_s16le",
                is_final=is_last,
                text_segment=word,
            )

    async def cancel(self) -> None:
        self._cancelled = True
