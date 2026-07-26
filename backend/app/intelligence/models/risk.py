from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True, slots=True)
class RiskDimension:
    name: str
    score: float
    level: RiskLevel
    rationale: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class RiskAssessment:
    overall_score: float
    overall_level: RiskLevel
    confidence: float
    dimensions: tuple[RiskDimension, ...]
    recommended_actions: tuple[str, ...]
