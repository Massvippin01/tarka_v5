"""
Automated Test Suite for Workstream B5:
Vector Clocks, Logical Causality, and Desynchronized Clock Skew Compensation.
"""

import pytest
from tarka.distributed.vector_clock import (
    CausalEvent,
    CausalRelation,
    TemporalConsistencyEngine,
    VectorClock,
)


class TestWorkstreamB5VectorClock:
    """Test suite verifying Workstream B5 Vector Clocks and Temporal Consistency."""

    def test_vector_clock_tick_and_merge(self):
        """Verify vector clock increments locally and performs component-wise max on merge."""
        clk_a = VectorClock()
        clk_a.tick("node_A")
        clk_a.tick("node_A")
        assert clk_a.clock == {"node_A": 2}

        clk_b = VectorClock()
        clk_b.tick("node_B")
        assert clk_b.clock == {"node_B": 1}

        # Merge B into A
        clk_a.merge(clk_b, local_node_id="node_A")
        # node_A should be max(2, 0) + 1 = 3, node_B should be max(0, 1) = 1
        assert clk_a.clock == {"node_A": 3, "node_B": 1}

    def test_causal_relations_ordering(self):
        """Verify happens-before, happens-after, concurrent, and identical comparisons."""
        # 1. Happens before: v1 < v2
        v1 = VectorClock(clock={"A": 1, "B": 1})
        v2 = VectorClock(clock={"A": 2, "B": 2})
        assert v1.compare(v2) == CausalRelation.HAPPENS_BEFORE
        assert v2.compare(v1) == CausalRelation.HAPPENS_AFTER

        # 2. Identical: v1 == v3
        v3 = VectorClock(clock={"A": 1, "B": 1})
        assert v1.compare(v3) == CausalRelation.IDENTICAL

        # 3. Concurrent: neither dominates
        # A has seen more of A, B has seen more of B
        v_concurrent_1 = VectorClock(clock={"A": 2, "B": 0})
        v_concurrent_2 = VectorClock(clock={"A": 0, "B": 2})
        assert v_concurrent_1.compare(v_concurrent_2) == CausalRelation.CONCURRENT
        assert v_concurrent_2.compare(v_concurrent_1) == CausalRelation.CONCURRENT

    def test_temporal_paradox_clock_skew_resolution(self):
        """
        Verify that when server B's wall-clock lags behind server A, the engine
        correctly identifies clock skew using vector clocks rather than declaring fraud.
        """
        engine = TemporalConsistencyEngine(allowed_skew_seconds=900.0)

        # Event A: Bank A issues authorization token at wall-clock 14:15:00 (epoch 1000.0)
        event_a = engine.record_local_event(
            node_id="BANK_A",
            event_id="EVT_AUTH_A",
            source_timestamp=1000.0,
            payload={"action": "AUTH_TOKEN_GENERATED"},
        )

        # Event B: Bank B receives token and executes transaction, but Bank B's server RTC
        # is desynchronized and reports wall-clock 14:05:00 (epoch 400.0, 600s in the past!)
        event_b = engine.receive_remote_event(
            local_node_id="BANK_B",
            remote_event=event_a,
        )
        # Record local event at Bank B with skewed local clock
        event_b.source_timestamp = 400.0  # 600 seconds earlier than event A!

        analysis = engine.analyze_event_pair(event_a, event_b)

        # Causal ordering proves A preceded B logically
        assert analysis["causal_relation"] == CausalRelation.HAPPENS_BEFORE.value
        # Wall clock delta is negative (-600s)
        assert analysis["wall_clock_delta_seconds"] == -600.0
        # Apparent temporal paradox flagged with explanatory context
        assert analysis["apparent_temporal_paradox"] is True
        assert "Clock Skew Detected" in analysis["paradox_explanation"]
        assert "NOT fraudulent" in analysis["paradox_explanation"]

    def test_concurrent_independent_events(self):
        """Verify that two independent transactions initiated at different banks are recognized as concurrent."""
        engine = TemporalConsistencyEngine()

        # Complainant deposits cash at Bank A
        ev_a = engine.record_local_event("BANK_A", "EVT_DEP_A", 1000.0, {"amount": 50000})
        # Unrelated merchant swipes card at Bank B concurrently
        ev_b = engine.record_local_event("BANK_B", "EVT_SWIPE_B", 1005.0, {"amount": 250})

        analysis = engine.analyze_event_pair(ev_a, ev_b)
        assert analysis["is_concurrent"] is True
        assert analysis["causal_relation"] == CausalRelation.CONCURRENT.value

