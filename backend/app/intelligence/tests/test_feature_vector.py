from app.intelligence.core.feature_vector import FeatureVectorBuilder


def test_builder():

    builder = FeatureVectorBuilder()

    vector = builder.build(
        persons={"P1", "P2"},
        phones={"9999999999"},
        vehicles={"TN01AB1234"},
    )

    assert len(vector.persons) == 2

    assert len(vector.phones) == 1

    assert len(vector.vehicles) == 1
