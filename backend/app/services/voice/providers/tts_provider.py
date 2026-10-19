from __future__ import annotations

import abc
import logging
from typing import AsyncIterator, Optional

logger = logging.getLogger("sentinelx.voice.tts_provider")


class TTSProvider(abc.ABC):
    """Abstract Text-to-Speech Provider interface."""

    @abc.abstractmethod
    async def synthesize_stream(
        self,
        text: str,
        voice_id: str = "sentinel-forensic-voice-s2",
        language: str = "en-IN",
        speed: float = 1.02,
        pitch: float = 1.0,
    ) -> AsyncIterator[bytes]:
        """Yield streaming audio bytes for given text."""

    @abc.abstractmethod
    async def cancel(self) -> None:
        """Cancel active synthesis immediately."""


class DeterministicTTSProvider(TTSProvider):
    """Deterministic TTS provider returning mock audio bytes for test harness."""

    def __init__(self) -> None:
        self._cancelled = False

    def reset(self) -> None:
        self._cancelled = False

    async def synthesize_stream(
        self,
        text: str,
        voice_id: str = "sentinel-forensic-voice-s2",
        language: str = "en-IN",
        speed: float = 1.02,
        pitch: float = 1.0,
    ) -> AsyncIterator[bytes]:
        words = text.split()
        for word in words:
            if self._cancelled:
                logger.info("DeterministicTTS synthesis cancelled.")
                return
            yield b"PCM_MOCK_" + word.encode("utf-8")[:16]

    async def cancel(self) -> None:
        self._cancelled = True


class FishAudioProvider(TTSProvider):
    """Fish Audio S2.1 Pro TTS provider implementation."""

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or "local-fish-audio-key"
        self._cancelled = False

    async def synthesize_stream(
        self,
        text: str,
        voice_id: str = "sentinel-forensic-voice-s2",
        language: str = "en-IN",
        speed: float = 1.02,
        pitch: float = 1.0,
    ) -> AsyncIterator[bytes]:
        self._cancelled = False
        if self._cancelled:
            return
        yield b"FISH_AUDIO_S2_1_STREAM_" + text[:32].encode("utf-8")

    async def cancel(self) -> None:
        self._cancelled = True


class FallbackTTSProvider(TTSProvider):
    """Basic fallback TTS provider."""

    def __init__(self) -> None:
        self._cancelled = False

    async def synthesize_stream(
        self,
        text: str,
        voice_id: str = "sentinel-forensic-voice-s2",
        language: str = "en-IN",
        speed: float = 1.02,
        pitch: float = 1.0,
    ) -> AsyncIterator[bytes]:
        self._cancelled = False
        yield b"FALLBACK_TTS_BYTES"

    async def cancel(self) -> None:
        self._cancelled = True
