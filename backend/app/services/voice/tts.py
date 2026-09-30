from __future__ import annotations

import logging
from typing import AsyncIterator, Optional

from app.services.voice.providers.tts_provider import (
    DeterministicTTSProvider,
    TTSProvider,
)

logger = logging.getLogger("sentinelx.voice.tts")


class PronunciationLexicon:
    """
    Pronunciation and transliteration dictionary for Indian legal and forensic terms.
    Normalizes statutory terms and forensic acronyms for accurate TTS output.
    """
    LEXICON_MAP = {
        "FIR": "F.I.R.",
        "CCTNS": "C-C-T-N-S",
        "ICJS": "I-C-J-S",
        "NAFIS": "Naafis",
        "CDR": "C.D.R.",
        "IMEI": "Eye-May",
        "BNSS": "B-N-S-S",
        "CrPC": "C-r-P-C",
        "BSA": "B-S-A",
        "IEA": "I-E-A",
        "FSL": "F-S-L",
        "Vahan": "Vaahan",
        "panchnama": "paanch-naama",
    }

    @classmethod
    def normalize_for_speech(cls, text: str) -> str:
        words = text.split()
        normalized = []
        for w in words:
            cleaned = w.strip(".,;:?!")
            if cleaned in cls.LEXICON_MAP:
                rep = cls.LEXICON_MAP[cleaned]
                normalized.append(w.replace(cleaned, rep))
            else:
                normalized.append(w)
        return " ".join(normalized)


class TTSService:
    """Streaming TTS service with prosody normalization and cancellation."""

    def __init__(self, provider: Optional[TTSProvider] = None) -> None:
        self.provider = provider or DeterministicTTSProvider()

    async def synthesize_stream(
        self,
        text: str,
        voice_id: str = "sentinel-forensic-voice-s2",
        language: str = "en-IN",
        speed: float = 1.02,
        pitch: float = 1.0,
    ) -> AsyncIterator[bytes]:

        normalized_text = PronunciationLexicon.normalize_for_speech(text)
        async for chunk in self.provider.synthesize_stream(
            text=normalized_text,
            voice_id=voice_id,
            language=language,
            speed=speed,
            pitch=pitch,
        ):
            yield chunk

    async def cancel(self) -> None:
        """Cancel synthesis immediately."""
        await self.provider.cancel()
