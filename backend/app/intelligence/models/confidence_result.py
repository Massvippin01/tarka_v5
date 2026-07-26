from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class ConfidenceLevel(str, Enum):
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass(frozen=True, slots=True)
class ConfidenceResult:
    """
    Standard confidence object shared across every
    AI engine.
    """

    score: float

    weighted_score: float

    uncertainty: float

    evidence_count: int

    level: ConfidenceLevel

    explanation: list[str] = field(default_factory=list)
