from app.intelligence.core.weights import DEFAULT_PROFILE, registry


def test_default_profile():

    assert abs(DEFAULT_PROFILE.total - 1.0) < 0.0001


def test_registry():

    profile = registry.get()

    assert profile.person > 0

    assert profile.phone > 0
