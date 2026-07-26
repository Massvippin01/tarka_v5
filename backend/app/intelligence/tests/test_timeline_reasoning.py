from datetime import datetime, timedelta

from app.intelligence.engines.timeline_reasoning_engine import (
    TimelineReasoningEngine,
)


def test_normal_timeline():

    engine = TimelineReasoningEngine()

    now = datetime.now()

    events = [
        {"timestamp": now},
        {"timestamp": now + timedelta(hours=1)},
    ]

    result = engine.analyze(events)

    assert len(result.findings) == 0


def test_impossible_sequence():

    engine = TimelineReasoningEngine()

    now = datetime.now()

    events = [
        {"timestamp": now},
        {"timestamp": now - timedelta(hours=1)},
    ]

    result = engine.analyze(events)

    assert any(finding.category == "sequence" for finding in result.findings)


def test_large_gap():

    engine = TimelineReasoningEngine()

    now = datetime.now()

    events = [
        {"timestamp": now},
        {"timestamp": now + timedelta(days=2)},
    ]

    result = engine.analyze(events)

    assert any(finding.category == "gap" for finding in result.findings)


def test_recurring_location():

    engine = TimelineReasoningEngine()

    now = datetime.now()

    events = [
        {
            "timestamp": now,
            "location": "Chennai",
        },
        {
            "timestamp": now + timedelta(hours=1),
            "location": "Chennai",
        },
    ]

    result = engine.analyze(events)

    assert any(finding.category == "location" for finding in result.findings)


def test_recurring_pattern():

    engine = TimelineReasoningEngine()

    now = datetime.now()

    events = [
        {
            "timestamp": now,
            "modus_operandi": "Forced Entry",
        },
        {
            "timestamp": now + timedelta(hours=1),
            "modus_operandi": "Forced Entry",
        },
    ]

    result = engine.analyze(events)

    assert any(finding.category == "modus_operandi" for finding in result.findings)
