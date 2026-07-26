from app.intelligence.core.confidence import ConfidenceEngine
from app.intelligence.models import (
    ConfidenceLevel,
    Evidence,
    EvidenceType,
)


def test_empty():

    engine = ConfidenceEngine()

    result = engine.evaluate([])

    assert result.score == 0.0

    assert result.level == ConfidenceLevel.VERY_LOW


def test_single():

    engine = ConfidenceEngine()

    evidence = [
        Evidence(
            id="1",
            evidence_type=EvidenceType.PHONE,
            value="9876543210",
            source="cdr",
            confidence=1.0,
            weight=1.0,
            explanation="Phone matched",
        )
    ]

    result = engine.evaluate(evidence)

    assert result.score == 1.0

    assert result.level == ConfidenceLevel.VERY_HIGH


def test_multiple():

    engine = ConfidenceEngine()

    evidence = [
        Evidence(
            id="1",
            evidence_type=EvidenceType.PHONE,
            value="1",
            source="cdr",
            confidence=1,
            weight=0.4,
        ),
        Evidence(
            id="2",
            evidence_type=EvidenceType.VEHICLE,
            value="2",
            source="rto",
            confidence=0.5,
            weight=0.6,
        ),
    ]

    result = engine.evaluate(evidence)

    assert result.score > 0

    assert result.evidence_count == 2
