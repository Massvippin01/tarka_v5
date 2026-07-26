from __future__ import annotations

from app.intelligence.models.reasoning import ReasoningResult
from app.intelligence.models.risk import (
    RiskAssessment,
    RiskDimension,
    RiskLevel,
)


class RiskEngine:

    def assess(
        self,
        reasoning: ReasoningResult,
    ) -> RiskAssessment:

        dimensions = (
            self._flight(reasoning),
            self._violence(reasoning),
            self._tampering(reasoning),
            self._network(reasoning),
            self._recidivism(reasoning),
        )

        overall = sum(d.score for d in dimensions) / len(dimensions)

        return RiskAssessment(
            overall_score=overall,
            overall_level=self._level(overall),
            confidence=reasoning.overall_confidence,
            dimensions=dimensions,
            recommended_actions=self._actions(overall),
        )

    def _flight(self, reasoning: ReasoningResult) -> RiskDimension:

        score = min(reasoning.overall_confidence * 0.85, 1.0)

        return RiskDimension(
            "Flight Risk",
            score,
            self._level(score),
            ("High investigative interest",),
        )

    def _violence(self, reasoning: ReasoningResult) -> RiskDimension:

        score = reasoning.similarity_score * 0.60

        return RiskDimension(
            "Violence Risk",
            score,
            self._level(score),
            ("Behavioral assessment",),
        )

    def _tampering(self, reasoning: ReasoningResult) -> RiskDimension:

        score = 0.80 if reasoning.contradictions else 0.25

        return RiskDimension(
            "Evidence Tampering",
            score,
            self._level(score),
            ("Evidence consistency evaluation",),
        )

    def _network(self, reasoning: ReasoningResult) -> RiskDimension:

        score = min(
            len(reasoning.supporting_evidence) * 0.20,
            1.0,
        )

        return RiskDimension(
            "Network Influence",
            score,
            self._level(score),
            ("Connected criminal associations",),
        )

    def _recidivism(self, reasoning: ReasoningResult) -> RiskDimension:

        score = reasoning.similarity_score * 0.75

        return RiskDimension(
            "Recidivism",
            score,
            self._level(score),
            ("Historical similarity",),
        )

    @staticmethod
    def _level(score: float) -> RiskLevel:

        if score >= 0.85:
            return RiskLevel.CRITICAL
        if score >= 0.65:
            return RiskLevel.HIGH
        if score >= 0.40:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    @staticmethod
    def _actions(score: float) -> tuple[str, ...]:

        if score >= 0.80:
            return (
                "Immediate monitoring",
                "Escalate investigation",
            )

        if score >= 0.60:
            return ("Increase surveillance",)

        return ("Continue investigation",)
