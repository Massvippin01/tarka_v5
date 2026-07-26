from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class InvestigationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True, slots=True)
class ReasoningEvidence:
    rule_id: str
    category: str
    description: str
    confidence: float
    impact_score: float
    supporting_entities: tuple[str, ...] = ()


@dataclass(frozen=True, slots=True)
class ReasoningRecommendation:
    priority: InvestigationPriority
    action: str
    explanation: str
    expected_confidence_gain: float


@dataclass(frozen=True, slots=True)
class ReasoningResult:
    overall_confidence: float
    similarity_score: float
    supporting_evidence: tuple[ReasoningEvidence, ...] = field(default_factory=tuple)
    contradictions: tuple[ReasoningEvidence, ...] = field(default_factory=tuple)
    recommendations: tuple[ReasoningRecommendation, ...] = field(default_factory=tuple)
    matched_features: dict[str, int] = field(default_factory=dict)
    summary: str = ""
    investigation_priority: InvestigationPriority = InvestigationPriority.LOW
