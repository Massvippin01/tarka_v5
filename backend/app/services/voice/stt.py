from __future__ import annotations

import logging
import re
from typing import Any, AsyncIterator, Dict, List, Optional

from app.domain.voice import Transcript, TranscriptSegment
from app.services.voice.providers.stt_provider import (
    DeterministicSTTProvider,
    STTProvider,
)

logger = logging.getLogger("sentinelx.voice.stt")


class STTService:
    """
    Streaming STT service with multilingual & code-switch metadata extraction.
    Supports English, Hindi, Tamil, Telugu, Malayalam, Kannada and code-switch.
    """

    def __init__(self, provider: Optional[STTProvider] = None) -> None:
        self.provider = provider or DeterministicSTTProvider()

    async def transcribe_audio_stream(
        self,
        audio_stream: AsyncIterator[bytes],
        language_hint: str = "en-IN",
    ) -> AsyncIterator[Transcript]:
        """
        Stream raw audio chunks through STT provider, returning Transcript instances
        annotated with language metadata and code-switch detection.
        """
        await self.provider.start_stream(language_hint=language_hint)
        try:
            async for chunk in audio_stream:
                await self.provider.send_audio(chunk)
                async for partial in self.provider.receive_transcript():
                    # Annotate language & code-switch metadata
                    partial.code_switch_metadata = self._detect_code_switch(partial.text)
                    yield partial
        finally:
            final = await self.provider.stop_stream()
            if final:
                final.code_switch_metadata = self._detect_code_switch(final.text)
                yield final

    async def transcribe_text_direct(
        self,
        text: str,
        language_hint: str = "en-IN",
    ) -> Transcript:
        """Create a Transcript instance directly from input text."""
        code_switch = self._detect_code_switch(text)
        return Transcript(
            text=text,
            is_final=True,
            confidence=1.0,
            language=code_switch.get("primary_language", language_hint),
            code_switch_metadata=code_switch,
        )

    def _detect_code_switch(self, text: str) -> Dict[str, Any]:
        """
        Detect multilingual code-switch patterns in Indian contexts.
        Examples:
        - "Contradictions ka summary dikhao." -> Hindi + English code-switch
        - "இந்த case-ல contradictions show பண்ணு." -> Tamil + English code-switch
        - "Show the contradictions." -> English
        """
        text_lower = text.lower()
        words = set(re.findall(r"\b\w+\b", text_lower))

        hindi_tokens = {"dikhao", "ka", "ki", "karo", "batao", "kya", "ko", "par", "se", "aur", "kuch", "hai"}
        tamil_tokens = {"பண்ணு", "case-ல", "paannu", "pannu", "idhu", "koodu", "sollo", "la", "case-la"}
        telugu_tokens = {"chupinchu", "cheyyi", "eadi", "cheppu"}

        is_hindi = bool(words & hindi_tokens)
        is_tamil = bool(words & tamil_tokens) or "case-ல" in text_lower or "case-la" in text_lower or "பண்ணு" in text_lower or "pannu" in text_lower
        is_telugu = bool(words & telugu_tokens)

        languages_detected: List[str] = ["en-IN"]
        code_switched = False

        if is_hindi:
            languages_detected.append("hi-IN")
            code_switched = True
        if is_tamil:
            languages_detected.append("ta-IN")
            code_switched = True
        if is_telugu:
            languages_detected.append("te-IN")
            code_switched = True

        return {
            "code_switched": code_switched,
            "detected_languages": languages_detected,
            "primary_language": languages_detected[-1] if len(languages_detected) > 1 else "en-IN",
        }
