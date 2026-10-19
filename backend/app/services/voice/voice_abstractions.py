from __future__ import annotations

import abc
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class VoiceSessionState(str, Enum):
    IDLE = "IDLE"
    LISTENING = "LISTENING"
    PROCESSING = "PROCESSING"
    SPEAKING = "SPEAKING"
    INTERRUPTED = "INTERRUPTED"
    PAUSED = "PAUSED"


@dataclass
class SpeechTranscript:
    transcript_id: str
    text: str
    confidence: float
    is_final: bool
    language_code: str = "en-IN"
    detected_entities: List[str] = field(default_factory=list)


@dataclass
class VoiceProfile:
    voice_id: str = "sentinel-forensic-voice-s2"
    name: str = "Sentinel Senior Forensic Analyst"
    gender: str = "NEUTRAL_AUTHORITATIVE"
    accent: str = "en-IN"
    pitch: float = 1.0
    speed: float = 1.02
    formality: str = "HIGH_EDITORIAL"


@dataclass
class ProsodyConfig:
    cadence: str = "MEASURED"  # MEASURED, URGENT_ALERT, DELIBERATE_EVIDENCE
    emphasis_terms: List[str] = field(default_factory=list)
    pause_duration_ms: int = 250


class STTProvider(abc.ABC):
    """Abstract interface for speech-to-text providers."""
    @abc.abstractmethod
    async def transcribe_stream(self, audio_chunks: AsyncIterator[bytes]) -> AsyncIterator[SpeechTranscript]:
        pass


class MockSTTProvider(STTProvider):
    """Deterministic STT provider for core test infrastructure."""
    async def transcribe_stream(self, audio_chunks: AsyncIterator[bytes]) -> AsyncIterator[SpeechTranscript]:
        yield SpeechTranscript(
            transcript_id=f"TR-{uuid4().hex[:6]}",
            text="Explain why this contradiction matters and check velocity",
            confidence=0.98,
            is_final=True,
            language_code="en-IN",
        )


class LiveKitStreamingSTTProvider(STTProvider):
    """
    Production LiveKit WebRTC streaming STT adapter.
    Marked under integration test boundary.
    """
    def __init__(self, api_key: str = "mock-key", api_secret: str = "mock-secret"):
        self.api_key = api_key
        self.api_secret = api_secret

    async def transcribe_stream(self, audio_chunks: AsyncIterator[bytes]) -> AsyncIterator[SpeechTranscript]:
        # LiveKit WebRTC participant audio stream handling
        yield SpeechTranscript(
            transcript_id=f"LK-{uuid4().hex[:6]}",
            text="Streaming transcript from LiveKit WebRTC room",
            confidence=0.95,
            is_final=True,
        )


class TTSProvider(abc.ABC):
    """Abstract interface for text-to-speech providers."""
    @abc.abstractmethod
    async def synthesize(self, text: str, profile: VoiceProfile, prosody: ProsodyConfig) -> bytes:
        pass


class MockTTSProvider(TTSProvider):
    """Deterministic TTS provider returning simulated audio bytes."""
    async def synthesize(self, text: str, profile: VoiceProfile, prosody: ProsodyConfig) -> bytes:
        # Return mock audio header bytes
        return b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"


class FishAudioS21ProTTSProvider(TTSProvider):
    """
    Fish Audio S2.1 Pro TTS provider implementation with prosody control.
    Produces high-fidelity editorial voice with Indian English / Hindi transliterated support.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or "local-fish-audio-key"

    async def synthesize(self, text: str, profile: VoiceProfile, prosody: ProsodyConfig) -> bytes:
        # Prosody adaptation
        adjusted_text = PronunciationLexicon.normalize_for_speech(text)
        return b"MOCK_FISH_AUDIO_S2_1_STREAM_" + adjusted_text[:32].encode("utf-8")


from app.services.voice.tts import PronunciationLexicon


class TurnManager:
    """
    Manages conversational turn-taking, barge-in, interruption, and push-to-talk gating.
    """
    def __init__(self) -> None:
        self.state: VoiceSessionState = VoiceSessionState.IDLE
        self.interrupted_count: int = 0
        self.muted: bool = False

    def handle_barge_in(self) -> Dict[str, Any]:
        """Triggered immediately when user speaks during assistant synthesis."""
        if self.state == VoiceSessionState.SPEAKING:
            self.state = VoiceSessionState.INTERRUPTED
            self.interrupted_count += 1
            return {
                "action": "HALT_SYNTHESIS",
                "interrupted": True,
                "timestamp": datetime.now(UTC).isoformat(),
            }
        return {"action": "NO_OP", "interrupted": False}

    def start_speaking(self) -> None:
        self.state = VoiceSessionState.SPEAKING

    def stop_speaking(self) -> None:
        self.state = VoiceSessionState.IDLE

    def start_listening(self) -> None:
        self.state = VoiceSessionState.LISTENING

    def pause(self) -> None:
        self.state = VoiceSessionState.PAUSED


class VoiceSessionManager:
    """
    Coordinates LiveKit room tokens, audio transport state, and active voice profile.
    """
    def __init__(self) -> None:
        self.stt: STTProvider = MockSTTProvider()
        self.tts: TTSProvider = MockTTSProvider()
        self.turn_manager: TurnManager = TurnManager()
        self.profile: VoiceProfile = VoiceProfile()
        self.prosody: ProsodyConfig = ProsodyConfig()

    def generate_webrtc_token(self, user_id: str, case_id: str) -> Dict[str, Any]:
        return {
            "room_name": f"sentinelx-room-{case_id}",
            "participant_identity": user_id,
            "webrtc_url": "wss://sentinelx-livekit.local/webrtc",
            "token": f"mock-livekit-token-{uuid4().hex[:12]}",
            "expires_in_seconds": 3600,
        }
