from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class TimelineSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True, slots=True)
class TimelineFinding:
    category: str
    description: str
    severity: TimelineSeverity
    confidence: float


@dataclass(frozen=True, slots=True)
class TimelineAnalysis:
    findings: tuple[TimelineFinding, ...]
    overall_confidence: float
    summary: str
