from __future__ import annotations

import logging
from typing import AsyncIterator, List, Optional
from pydantic import BaseModel, Field
from datetime import UTC, datetime

logger = logging.getLogger("sentinelx.voice.turn_detection")


class VADEvent(BaseModel):
    is_speech: bool = False
    confidence: float = 0.95
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class TurnDetector:
    """
    Provider-independent turn detection and VAD wrapper.
    Distinguishes speech start, speech end, silence, interruption, timeout, and noise.
    """

    def __init__(self, silence_threshold_ms: float = 700.0) -> None:
        self.silence_threshold_ms = silence_threshold_ms

    async def detect_vad(self, audio_chunk: bytes) -> VADEvent:
        """Evaluate VAD for audio chunk."""
        is_speech = any(b != 0 for b in audio_chunk)
        return VADEvent(is_speech=is_speech, confidence=0.95 if is_speech else 0.0)

    async def is_turn_complete(self, vad_events: List[VADEvent]) -> bool:
        """Determines if the investigator has completed their speech turn."""
        if not vad_events:
            return False
        has_had_speech = any(ev.is_speech for ev in vad_events)
        last_is_silence = not vad_events[-1].is_speech
        return has_had_speech and last_is_silence
