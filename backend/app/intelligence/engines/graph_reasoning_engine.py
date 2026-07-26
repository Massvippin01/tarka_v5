from __future__ import annotations

from dataclasses import dataclass

from app.intelligence.engines.entity_similarity_engine import (
    EntitySimilarityEngine,
)
from app.intelligence.models.feature_vector import FeatureVector


@dataclass(frozen=True, slots=True)
class ReasoningResult:
    confidence: float
    supporting_facts: list[str]
    contradictions: list[str]
    recommendations: list[str]


class GraphReasoningEngine:
    """
    Pure reasoning engine.

    No Neo4j.
    No FastAPI.
    No repositories.

    Consumes FeatureVectors and produces explainable
    investigative reasoning.
    """

    def __init__(self) -> None:
        self.similarity = EntitySimilarityEngine()

    def analyze(
        self,
        subject: FeatureVector,
        candidate: FeatureVector,
    ) -> ReasoningResult:

        similarity = self.similarity.compare(subject, candidate)

        support: list[str] = []
        contradictions: list[str] = []
        recommendations: list[str] = []

        if similarity.matched_features["persons"]:
            support.append("Known associates overlap.")

        if similarity.matched_features["phones"]:
            support.append("Shared communication identifiers.")

        if similarity.matched_features["vehicles"]:
            support.append("Vehicle association detected.")

        if similarity.score < 0.30:
            contradictions.append("Insufficient supporting evidence.")

        if similarity.score > 0.70:
            recommendations.append("Prioritize manual investigation.")

        if similarity.score > 0.85:
            recommendations.append("Consider link analysis expansion.")

        return ReasoningResult(
            confidence=similarity.score,
            supporting_facts=support,
            contradictions=contradictions,
            recommendations=recommendations,
        )
