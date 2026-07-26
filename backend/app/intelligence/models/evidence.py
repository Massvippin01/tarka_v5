"""
SentinelX AI Platform

Evidence Models

These models represent individual pieces of evidence used by every AI
engine inside SentinelX.

No business logic should exist here.

These classes are immutable value objects.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class EvidenceType(str, Enum):
    PHONE = "phone"
    VEHICLE = "vehicle"
    LOCATION = "location"
    PERSON = "person"
    ORGANIZATION = "organization"
    TIMELINE = "timeline"
    COMMUNICATION = "communication"
    FINANCIAL = "financial"
    MODUS_OPERANDI = "modus_operandi"
    DOCUMENT = "document"
    DIGITAL = "digital"
    DNA = "dna"
    FINGERPRINT = "fingerprint"
    FACE = "face"
    OTHER = "other"


@dataclass(frozen=True, slots=True)
class Evidence:
    """
    Immutable evidence object.

    Attributes
    ----------
    id
        Unique identifier.

    evidence_type
        Category of evidence.

    value
        Raw extracted value.

    source
        Origin of the evidence.

    confidence
        Confidence supplied by extractor.

    weight
        Domain-specific importance.

    explanation
        Human-readable explanation.
    """

    id: str

    evidence_type: EvidenceType

    value: str

    source: str

    confidence: float

    weight: float

    explanation: str = ""

    @property
    def weighted_score(self) -> float:
        """
        Returns weighted contribution.
        """
        return self.confidence * self.weight
