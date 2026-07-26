from app.intelligence.engines.risk_engine import RiskEngine
from app.intelligence.models.reasoning import (
    InvestigationPriority,
    ReasoningResult,
)


def test_risk_assessment():

    engine = RiskEngine()

    reasoning = ReasoningResult(
        overall_confidence=0.90,
        similarity_score=0.80,
        supporting_evidence=(),
        contradictions=(),
        recommendations=(),
        matched_features={},
        summary="",
        investigation_priority=InvestigationPriority.HIGH,
    )

    assessment = engine.assess(reasoning)

    assert assessment.overall_score > 0

    assert len(assessment.dimensions) == 5

    assert assessment.confidence == 0.90
