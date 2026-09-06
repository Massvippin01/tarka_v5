from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class NormalizedValue(BaseModel):
    raw_value: Any
    normalized_value: Any
    normalization_method: str
    normalization_version: str = "1.0.0"
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source_reference: Optional[str] = None


class NormalizationService:
    @staticmethod
    def normalize_phone(raw_value: str, country_code: str = "91", source_ref: Optional[str] = None) -> NormalizedValue:
        """
        Normalizes phone numbers to standard numeric format with country prefix.
        e.g., "+91 98765-43210" -> "919876543210"
        """
        if not raw_value:
            return NormalizedValue(
                raw_value=raw_value,
                normalized_value="",
                normalization_method="PHONE_E164_STRIP",
                source_reference=source_ref,
            )

        digits = re.sub(r"\D", "", str(raw_value))
        if len(digits) == 10:
            digits = country_code + digits
        elif len(digits) == 11 and digits.startswith("0"):
            digits = country_code + digits[1:]

        return NormalizedValue(
            raw_value=raw_value,
            normalized_value=digits,
            normalization_method="PHONE_E164_STANDARDIZATION",
            source_reference=source_ref,
        )

    @staticmethod
    def normalize_vehicle_registration(raw_value: str, source_ref: Optional[str] = None) -> NormalizedValue:
        """
        Normalizes vehicle registration numbers by stripping spaces, hyphens, and converting to uppercase.
        e.g., "ka 05-ab 1234" -> "KA05AB1234"
        """
        if not raw_value:
            return NormalizedValue(
                raw_value=raw_value,
                normalized_value="",
                normalization_method="VEHICLE_REG_STRIP",
                source_reference=source_ref,
            )

        cleaned = re.sub(r"[^A-Za-z0-9]", "", str(raw_value)).upper()
        return NormalizedValue(
            raw_value=raw_value,
            normalized_value=cleaned,
            normalization_method="VEHICLE_REG_ALPHA_NUMERIC_UPPERCASE",
            source_reference=source_ref,
        )

    @staticmethod
    def normalize_name(raw_value: str, source_ref: Optional[str] = None) -> NormalizedValue:
        """
        Normalizes person names by removing diacritics, honorifics (Mr., Shri, etc.), extra whitespace, and converting to Title Case.
        """
        if not raw_value:
            return NormalizedValue(
                raw_value=raw_value,
                normalized_value="",
                normalization_method="NAME_CANONICAL",
                source_reference=source_ref,
            )

        # Normalize unicode NFKD to strip accents
        nfkd = unicodedata.normalize("NFKD", str(raw_value))
        ascii_text = nfkd.encode("ASCII", "ignore").decode("utf-8")

        # Remove titles / honorifics
        cleaned = re.sub(r"\b(mr|mrs|ms|dr|shri|shrimati|prof|late|adv)\.?", "", ascii_text, flags=re.IGNORECASE)
        # Remove punctuation and extra spaces
        cleaned = re.sub(r"[^\w\s]", " ", cleaned)
        cleaned = " ".join(cleaned.split()).title()

        return NormalizedValue(
            raw_value=raw_value,
            normalized_value=cleaned,
            normalization_method="NAME_UNICODE_HONORIFIC_STRIP_TITLECASE",
            source_reference=source_ref,
        )

    @staticmethod
    def normalize_alias(raw_value: str, source_ref: Optional[str] = None) -> NormalizedValue:
        """
        Normalizes alias / nickname strings.
        """
        if not raw_value:
            return NormalizedValue(
                raw_value=raw_value,
                normalized_value="",
                normalization_method="ALIAS_CANONICAL",
                source_reference=source_ref,
            )

        cleaned = " ".join(re.sub(r"[^\w\s]", "", str(raw_value)).split()).lower()
        return NormalizedValue(
            raw_value=raw_value,
            normalized_value=cleaned,
            normalization_method="ALIAS_LOWERCASE_CLEAN",
            source_reference=source_ref,
        )

    @staticmethod
    def normalize_address(raw_value: str, source_ref: Optional[str] = None) -> NormalizedValue:
        """
        Normalizes address strings, expanding common abbreviations (St -> Street, Rd -> Road) and standardizing pincodes.
        """
        if not raw_value:
            return NormalizedValue(
                raw_value=raw_value,
                normalized_value="",
                normalization_method="ADDRESS_CANONICAL",
                source_reference=source_ref,
            )

        val = str(raw_value).lower()
        val = re.sub(r"\brd\.?\b", "road", val)
        val = re.sub(r"\bst\.?\b", "street", val)
        val = re.sub(r"\bapt\.?\b", "apartment", val)
        val = re.sub(r"\bno\.?\b", "number", val)
        val = re.sub(r"\bsect?\.?\b", "sector", val)

        cleaned = " ".join(val.split()).title()
        return NormalizedValue(
            raw_value=raw_value,
            normalized_value=cleaned,
            normalization_method="ADDRESS_ABBREVIATION_EXPANSION",
            source_reference=source_ref,
        )

    @staticmethod
    def normalize_location(lat: float, lng: float, precision: int = 4, source_ref: Optional[str] = None) -> NormalizedValue:
        """
        Normalizes geo-coordinates to fixed decimal precision (~11 meters at 4 decimals).
        """
        rounded_lat = round(float(lat), precision)
        rounded_lng = round(float(lng), precision)
        norm_val = f"{rounded_lat},{rounded_lng}"

        return NormalizedValue(
            raw_value={"lat": lat, "lng": lng},
            normalized_value=norm_val,
            normalization_method=f"GEO_COORDINATE_ROUNDING_P{precision}",
            source_reference=source_ref,
        )

    @staticmethod
    def normalize_identifier(id_type: str, raw_value: str, source_ref: Optional[str] = None) -> NormalizedValue:
        """
        Normalizes government / official identifiers (Aadhaar, PAN, DL, Passport).
        """
        if not raw_value:
            return NormalizedValue(
                raw_value=raw_value,
                normalized_value="",
                normalization_method=f"IDENTIFIER_{id_type.upper()}_CLEAN",
                source_reference=source_ref,
            )

        cleaned = re.sub(r"[^A-Za-z0-9]", "", str(raw_value)).upper()
        return NormalizedValue(
            raw_value=raw_value,
            normalized_value=cleaned,
            normalization_method=f"IDENTIFIER_{id_type.upper()}_ALPHANUMERIC_UPPERCASE",
            source_reference=source_ref,
        )

    @staticmethod
    def normalize_organization(raw_value: str, source_ref: Optional[str] = None) -> NormalizedValue:
        """
        Normalizes corporate / organization names by standardizing corporate entity suffixes.
        """
        if not raw_value:
            return NormalizedValue(
                raw_value=raw_value,
                normalized_value="",
                normalization_method="ORG_CANONICAL",
                source_reference=source_ref,
            )

        val = str(raw_value)
        val = re.sub(r"\b(pvt\.?\s*ltd\.?|private\s+limited)\b", "Pvt Ltd", val, flags=re.IGNORECASE)
        val = re.sub(r"\b(ltd\.?|limited)\b", "Ltd", val, flags=re.IGNORECASE)
        val = re.sub(r"\b(inc\.?|incorporated)\b", "Inc", val, flags=re.IGNORECASE)
        val = re.sub(r"\bllp\b", "LLP", val, flags=re.IGNORECASE)

        cleaned = " ".join(val.split())
        return NormalizedValue(
            raw_value=raw_value,
            normalized_value=cleaned,
            normalization_method="ORG_SUFFIX_STANDARDIZATION",
            source_reference=source_ref,
        )
