"""
SentinelX AI Platform

Recommendation Engine

Converts reasoning output into
investigator actions.

Pure business logic.

No Neo4j.
No FastAPI.
"""

from __future__ import annotations

from app.intelligence.models.reasoning import (
    InvestigationPriority,
    ReasoningResult,
)
from app.intelligence.models.recommendation import (
    Recommendation,
    RecommendationPriority,
)


class RecommendationEngine:

    def recommend(
        self,
        reasoning: ReasoningResult,
    ) -> tuple[Recommendation, ...]:

        recommendations: list[Recommendation] = []

        recommendations.extend(self._critical(reasoning))

        recommendations.extend(self._high(reasoning))

        recommendations.extend(self._medium(reasoning))

        recommendations.extend(self._low(reasoning))

        return tuple(self._sort(self._deduplicate(recommendations)))

    def _critical(
        self,
        reasoning: ReasoningResult,
    ) -> list[Recommendation]:

        items = []

        if reasoning.investigation_priority == InvestigationPriority.CRITICAL:

            items.append(
                Recommendation(
                    title="Immediate Investigation",
                    description="Escalate case immediately.",
                    priority=RecommendationPriority.CRITICAL,
                    confidence=reasoning.overall_confidence,
                    expected_impact=0.95,
                    rationale=("Critical AI assessment",),
                )
            )

        return items

    def _high(
        self,
        reasoning: ReasoningResult,
    ) -> list[Recommendation]:

        items = []

        if reasoning.similarity_score >= 0.80:

            items.append(
                Recommendation(
                    title="Expand Graph",
                    description="Expand neighborhood to 3 hops.",
                    priority=RecommendationPriority.HIGH,
                    confidence=reasoning.similarity_score,
                    expected_impact=0.82,
                    rationale=("High similarity detected",),
                )
            )

        if reasoning.supporting_evidence:

            items.append(
                Recommendation(
                    title="Collect CDR",
                    description="Analyze communication records.",
                    priority=RecommendationPriority.HIGH,
                    confidence=0.90,
                    expected_impact=0.88,
                    rationale=("Shared communication",),
                )
            )

        return items

    def _medium(
        self,
        reasoning: ReasoningResult,
    ) -> list[Recommendation]:

        if reasoning.contradictions:

            return [
                Recommendation(
                    title="Verify Statements",
                    description="Review contradictory evidence.",
                    priority=RecommendationPriority.MEDIUM,
                    confidence=0.80,
                    expected_impact=0.72,
                    rationale=("Contradiction detected",),
                )
            ]

        return []

    def _low(
        self,
        reasoning: ReasoningResult,
    ) -> list[Recommendation]:

        if reasoning.overall_confidence < 0.50:

            return [
                Recommendation(
                    title="Collect Additional Evidence",
                    description="Gather more supporting evidence.",
                    priority=RecommendationPriority.LOW,
                    confidence=0.60,
                    expected_impact=0.55,
                    rationale=("Low confidence",),
                )
            ]

        return []

    @staticmethod
    def _deduplicate(
        recommendations: list[Recommendation],
    ) -> list[Recommendation]:

        unique = {}

        for recommendation in recommendations:

            unique[recommendation.title] = recommendation

        return list(unique.values())

    @staticmethod
    def _sort(
        recommendations: list[Recommendation],
    ) -> list[Recommendation]:

        order = {
            RecommendationPriority.CRITICAL: 4,
            RecommendationPriority.HIGH: 3,
            RecommendationPriority.MEDIUM: 2,
            RecommendationPriority.LOW: 1,
        }

        return sorted(
            recommendations,
            key=lambda item: order[item.priority],
            reverse=True,
        )
