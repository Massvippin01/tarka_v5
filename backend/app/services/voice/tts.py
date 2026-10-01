from __future__ import annotations

import logging
from typing import AsyncIterator, Optional

from app.services.voice.providers.tts_provider import (
    DeterministicTTSProvider,
    TTSProvider,
)

logger = logging.getLogger("sentinelx.voice.tts")


import re

class PronunciationLexicon:
    """
    Pronunciation and transliteration dictionary for Indian legal and forensic terms.
    Normalizes statutory terms, forensic acronyms, and alphanumeric identifiers for natural TTS output.
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
        "ANPR": "A-N-P-R",
        "CAF": "C-A-F",
        "BSS": "B-S-S",
        "Vahan": "Vaahan",
        "panchnama": "paanch-naama",
        "e-Courts": "e Courts",
        "e-Prisons": "e Prisons",
    }

    _DIGIT_WORDS = {
        "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four",
        "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine",
    }

    @classmethod
    def format_digits_spoken(cls, digits: str) -> str:
        """Format a sequence of digits into hyphenated spoken words."""
        return "-".join(cls._DIGIT_WORDS.get(d, d) for d in digits)

    @classmethod
    def format_case_id_spoken(cls, case_id: str) -> str:
        """e.g. CASE-2026-001 -> 'case twenty twenty-six dash zero-zero-one'"""
        match = re.match(r"(?i)CASE-(\d{4})-(\d+)", case_id)
        if match:
            year, num = match.groups()
            year_spoken = "twenty twenty-six" if year == "2026" else cls.format_digits_spoken(year)
            num_spoken = cls.format_digits_spoken(num)
            return f"case {year_spoken} dash {num_spoken}"
        return case_id

    @classmethod
    def format_vehicle_spoken(cls, reg_no: str) -> str:
        """e.g. DL-3C-AQ-9901 -> 'D-L 3-C A-Q nine-nine-zero-one'"""
        match = re.match(r"^([A-Z]{2})[- ]*(\d{1,2}[A-Z]{1,2})[- ]*([A-Z]{1,2})[- ]*(\d{4})$", reg_no.upper().strip())
        if match:
            state, district, series, digits = match.groups()
            state_fmt = "-".join(list(state))
            series_fmt = "-".join(list(series))
            digits_fmt = cls.format_digits_spoken(digits)
            return f"{state_fmt} {district} {series_fmt} {digits_fmt}"
        return reg_no

    @classmethod
    def format_entity_id_spoken(cls, entity_id: str) -> str:
        """e.g. P001 -> 'P-zero-zero-one', V188 -> 'vehicle V-one-eight-eight'"""
        ent = entity_id.strip()
        if re.match(r"^P\d{3}$", ent):
            return f"P-{cls.format_digits_spoken(ent[1:])}"
        if re.match(r"^V\d{3}$", ent):
            return f"vehicle V-{cls.format_digits_spoken(ent[1:])}"
        if re.match(r"^PH\d{3}$", ent):
            return f"phone P-H-{cls.format_digits_spoken(ent[2:])}"
        return ent

    @classmethod
    def normalize_for_speech(cls, text: str) -> str:
        if not text:
            return ""

        # 1. Format Case IDs: CASE-2026-001
        text = re.sub(
            r"\bCASE-(\d{4})-(\d+)\b",
            lambda m: cls.format_case_id_spoken(m.group(0)),
            text,
            flags=re.IGNORECASE,
        )

        # 2. Format Vehicle IDs: V188, V191, V002
        text = re.sub(
            r"\bV(\d{3})\b",
            lambda m: f"vehicle V-{cls.format_digits_spoken(m.group(1))}",
            text,
        )

        # 3. Format Person IDs: P001, P002, P044
        text = re.sub(
            r"\bP(\d{3})\b",
            lambda m: f"P-{cls.format_digits_spoken(m.group(1))}",
            text,
        )

        # 4. Format Phone IDs: PH001, PH002
        text = re.sub(
            r"\bPH(\d{3})\b",
            lambda m: f"phone P-H-{cls.format_digits_spoken(m.group(1))}",
            text,
        )

        # 5. Format Claims and Artifacts: CLM-2026-001
        text = re.sub(
            r"\bCLM-(\d{4})-(\d+)\b",
            lambda m: f"claim twenty twenty-six {cls.format_digits_spoken(m.group(2))}",
            text,
        )

        # 6. Format Evidence IDs: EV-ANPR-001, art-cdr-001
        text = re.sub(
            r"\bEV-([A-Z]+)-(\d+)\b",
            lambda m: f"evidence {cls.LEXICON_MAP.get(m.group(1), m.group(1))} {cls.format_digits_spoken(m.group(2))}",
            text,
        )

        # 7. Format Lexicon Map Terms
        words = text.split()
        normalized = []
        for w in words:
            cleaned = w.strip(".,;:?!()")
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
