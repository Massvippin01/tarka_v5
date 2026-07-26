"""
SentinelX AI Platform

Confidence Engine

Responsible for converting weighted evidence into
a normalized confidence score.

This module MUST NOT depend on Neo4j, repositories,
FastAPI, or services.

It is pure deterministic business logic.
"""

from __future__ import annotations

from collections.abc import Iterable

from app.intelligence.models import (
    ConfidenceLevel,
    ConfidenceResult,
    Evidence,
)


class ConfidenceEngine:
    """
    Computes explainable confidence values from evidence.

    The engine guarantees:

    • normalized output (0–1)

    • deterministic behaviour

    • explainability

    • reproducibility
    """

    MIN_WEIGHT = 1e-9

    def evaluate(
        self,
        evidence: Iterable[Evidence],
    ) -> ConfidenceResult:

        evidence = list(evidence)

        if not evidence:
            return ConfidenceResult(
                score=0.0,
                weighted_score=0.0,
                uncertainty=1.0,
                evidence_count=0,
                level=ConfidenceLevel.VERY_LOW,
                explanation=["No evidence supplied."],
            )

        total_weight = sum(item.weight for item in evidence)

        weighted_score = sum(item.weighted_score for item in evidence)

        normalized_score = weighted_score / max(
            total_weight,
            self.MIN_WEIGHT,
        )

        normalized_score = max(
            0.0,
            min(
                1.0,
                normalized_score,
            ),
        )

        return ConfidenceResult(
            score=normalized_score,
            weighted_score=weighted_score,
            uncertainty=1.0 - normalized_score,
            evidence_count=len(evidence),
            level=self._confidence_level(normalized_score),
            explanation=[item.explanation for item in evidence if item.explanation],
        )

    @staticmethod
    def _confidence_level(
        score: float,
    ) -> ConfidenceLevel:

        if score >= 0.95:
            return ConfidenceLevel.VERY_HIGH

        if score >= 0.80:
            return ConfidenceLevel.HIGH

        if score >= 0.60:
            return ConfidenceLevel.MEDIUM

        if score >= 0.30:
            return ConfidenceLevel.LOW

        return ConfidenceLevel.VERY_LOW
