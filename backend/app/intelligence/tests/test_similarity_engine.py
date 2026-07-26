from app.intelligence.core.feature_vector import FeatureVectorBuilder
from app.intelligence.engines.entity_similarity_engine import (
    EntitySimilarityEngine,
)


def test_similarity():

    builder = FeatureVectorBuilder()

    first = builder.build(
        persons={"P1"},
        phones={"111"},
        vehicles={"TN01"},
    )

    second = builder.build(
        persons={"P1"},
        phones={"111"},
        vehicles={"TN99"},
    )

    engine = EntitySimilarityEngine()

    result = engine.compare(first, second)

    assert result.score > 0.0

    assert result.matched_features["persons"] == 1

    assert result.matched_features["phones"] == 1
