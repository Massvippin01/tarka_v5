from __future__ import annotations

import abc
import logging
from typing import AsyncIterator, List, Optional
from uuid import uuid4

from app.domain.voice import Transcript, TranscriptSegment

logger = logging.getLogger("sentinelx.voice.stt_provider")


class STTProvider(abc.ABC):
    """Abstract Speech-to-Text Provider interface."""

    @abc.abstractmethod
    async def start_stream(self, language_hint: str = "en-IN") -> None:
        """Initialize audio stream."""

    @abc.abstractmethod
    async def send_audio(self, chunk: bytes) -> None:
        """Send raw audio bytes into streaming pipeline."""

    @abc.abstractmethod
    async def receive_transcript(self) -> AsyncIterator[Transcript]:
        """Yield streaming partial/final transcripts."""

    @abc.abstractmethod
    async def stop_stream(self) -> Optional[Transcript]:
        """Stop audio stream and return final transcript."""

    @abc.abstractmethod
    async def cancel(self) -> None:
        """Cancel streaming transcription."""


class DeterministicSTTProvider(STTProvider):
    """
    Deterministic STT provider for unit/integration testing and fallback execution.
    Can be seeded with expected transcript text.
    """

    def __init__(self, predefined_transcripts: Optional[List[str]] = None) -> None:
        self._transcripts = predefined_transcripts or [
            "Show contradictions."
        ]
        self._current_idx = 0
        self._cancelled = False
        self._active = False
        self.language_hint = "en-IN"

    async def start_stream(self, language_hint: str = "en-IN") -> None:
        self._cancelled = False
        self._active = True
        self.language_hint = language_hint

    async def send_audio(self, chunk: bytes) -> None:
        pass  # In deterministic mode, audio content is ignored

    async def receive_transcript(self) -> AsyncIterator[Transcript]:
        if not self._active or self._cancelled:
            return

        text = (
            self._transcripts[self._current_idx]
            if self._current_idx < len(self._transcripts)
            else "Show contradictions."
        )
        self._current_idx = (self._current_idx + 1) % len(self._transcripts)

        # Yield partial
        yield Transcript(
            transcript_id=f"TR-{uuid4().hex[:8]}",
            text=text,
            is_final=False,
            confidence=0.85,
            language=self.language_hint,
        )

        # Yield final
        yield Transcript(
            transcript_id=f"TR-{uuid4().hex[:8]}",
            text=text,
            is_final=True,
            confidence=0.98,
            language=self.language_hint,
        )

    async def stop_stream(self) -> Optional[Transcript]:
        self._active = False
        if self._cancelled or not self._transcripts:
            return None
        return Transcript(
            transcript_id=f"TR-{uuid4().hex[:8]}",
            text=self._transcripts[0],
            is_final=True,
            confidence=0.98,
            language=self.language_hint,
        )

    async def cancel(self) -> None:
        self._cancelled = True
        self._active = False


class DeepgramProvider(STTProvider):
    """Deepgram Streaming STT Provider."""

    def __init__(self, api_key: str = "mock-deepgram-key") -> None:
        self.api_key = api_key
        self._cancelled = False
        self._active = False
        self.language_hint = "en-IN"
        self._buffer: List[bytes] = []

    async def start_stream(self, language_hint: str = "en-IN") -> None:
        self._active = True
        self._cancelled = False
        self.language_hint = language_hint
        self._buffer = []

    async def send_audio(self, chunk: bytes) -> None:
        if self._active and not self._cancelled:
            self._buffer.append(chunk)

    async def receive_transcript(self) -> AsyncIterator[Transcript]:
        if not self._active or self._cancelled:
            return

        # Deepgram integration stub — returns structured transcript
        yield Transcript(
            transcript_id=f"DG-{uuid4().hex[:8]}",
            text="Deepgram streaming transcript sample",
            is_final=True,
            confidence=0.96,
            language=self.language_hint,
        )

    async def stop_stream(self) -> Optional[Transcript]:
        self._active = False
        return Transcript(
            transcript_id=f"DG-{uuid4().hex[:8]}",
            text="Deepgram streaming transcript sample",
            is_final=True,
            confidence=0.96,
            language=self.language_hint,
        )

    async def cancel(self) -> None:
        self._cancelled = True
        self._active = False


class OpenAIProvider(STTProvider):
    """OpenAI Whisper STT Provider."""

    def __init__(self, api_key: str = "mock-openai-key") -> None:
        self.api_key = api_key
        self._cancelled = False
        self._active = False
        self.language_hint = "en-IN"

    async def start_stream(self, language_hint: str = "en-IN") -> None:
        self._active = True
        self._cancelled = False
        self.language_hint = language_hint

    async def send_audio(self, chunk: bytes) -> None:
        pass

    async def receive_transcript(self) -> AsyncIterator[Transcript]:
        if not self._active or self._cancelled:
            return

        yield Transcript(
            transcript_id=f"OAI-{uuid4().hex[:8]}",
            text="OpenAI Whisper transcript sample",
            is_final=True,
            confidence=0.95,
            language=self.language_hint,
        )

    async def stop_stream(self) -> Optional[Transcript]:
        self._active = False
        return Transcript(
            transcript_id=f"OAI-{uuid4().hex[:8]}",
            text="OpenAI Whisper transcript sample",
            is_final=True,
            confidence=0.95,
            language=self.language_hint,
        )

    async def cancel(self) -> None:
        self._cancelled = True
        self._active = False
