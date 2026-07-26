from app.intelligence.engines.recommendation_engine import (
    RecommendationEngine,
)
from app.intelligence.models.reasoning import (
    InvestigationPriority,
    ReasoningResult,
)


def test_recommendation_generation():

    engine = RecommendationEngine()

    reasoning = ReasoningResult(
        overall_confidence=0.92,
        similarity_score=0.90,
        supporting_evidence=(),
        contradictions=(),
        recommendations=(),
        matched_features={},
        summary="",
        investigation_priority=InvestigationPriority.CRITICAL,
    )

    recommendations = engine.recommend(reasoning)

    assert len(recommendations) >= 2

    assert recommendations[0].confidence > 0.0
