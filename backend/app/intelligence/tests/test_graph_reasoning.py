from app.intelligence.core.feature_vector import FeatureVectorBuilder
from app.intelligence.engines.graph_reasoning_engine import (
    GraphReasoningEngine,
)


def test_reasoning():

    builder = FeatureVectorBuilder()

    subject = builder.build(
        persons={"P1"},
        phones={"111"},
    )

    candidate = builder.build(
        persons={"P1"},
        phones={"111"},
        vehicles={"TN01"},
    )

    engine = GraphReasoningEngine()

    result = engine.analyze(
        subject,
        candidate,
    )

    assert result.confidence > 0.0

    assert len(result.supporting_facts) > 0
