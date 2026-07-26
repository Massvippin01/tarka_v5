from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class RecommendationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True, slots=True)
class Recommendation:
    title: str
    description: str
    priority: RecommendationPriority
    confidence: float
    expected_impact: float
    rationale: tuple[str, ...]
