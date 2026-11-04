"""
TARKA SUTRAM 2026 — WORKSTREAM B5
Vector Clocks and Causal Event Ordering Engine.

Provides causal event ordering and desynchronized clock skew compensation
across independently operated financial institutions and telecom towers.
Prevents misclassifying clock skew or asynchronous network delays as fraud.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple


class CausalRelation(str, Enum):
    HAPPENS_BEFORE = "HAPPENS_BEFORE"  # A -> B
    HAPPENS_AFTER = "HAPPENS_AFTER"    # B -> A
    CONCURRENT = "CONCURRENT"          # A || B
    IDENTICAL = "IDENTICAL"            # A == B


@dataclass
class VectorClock:
    """
    Vector clock tracking logical causality across distributed institutional nodes.
    Map of {node_id: counter}.
    """
    clock: Dict[str, int] = field(default_factory=dict)

    def copy(self) -> VectorClock:
        return VectorClock(clock=dict(self.clock))

    def tick(self, node_id: str) -> VectorClock:
        """Increments the logical counter for a given node."""
        self.clock[node_id] = self.clock.get(node_id, 0) + 1
        return self

    def merge(self, other: VectorClock, local_node_id: Optional[str] = None) -> VectorClock:
        """
        Component-wise maximum merge: V[k] = max(V[k], V'[k]).
        Optionally increments local_node_id counter if specified.
        """
        all_keys = set(self.clock.keys()).union(set(other.clock.keys()))
        new_clock = {}
        for k in all_keys:
            new_clock[k] = max(self.clock.get(k, 0), other.clock.get(k, 0))
        if local_node_id:
            new_clock[local_node_id] = new_clock.get(local_node_id, 0) + 1
        self.clock = new_clock
        return self

    def compare(self, other: VectorClock) -> CausalRelation:
        """
        Compares this vector clock with another to determine causal precedence.
        """
        all_keys = set(self.clock.keys()).union(set(other.clock.keys()))
        less_or_equal = True
        greater_or_equal = True

        for k in all_keys:
            v1 = self.clock.get(k, 0)
            v2 = other.clock.get(k, 0)
            if v1 > v2:
                less_or_equal = False
            if v1 < v2:
                greater_or_equal = False

        if less_or_equal and greater_or_equal:
            return CausalRelation.IDENTICAL
        elif less_or_equal and not greater_or_equal:
            return CausalRelation.HAPPENS_BEFORE
        elif greater_or_equal and not less_or_equal:
            return CausalRelation.HAPPENS_AFTER
        else:
            return CausalRelation.CONCURRENT

    def to_dict(self) -> Dict[str, int]:
        return dict(self.clock)


@dataclass
class CausalEvent:
    event_id: str
    node_id: str
    source_timestamp: float
    received_timestamp: float
    vector_clock: VectorClock
    payload: Dict[str, Any] = field(default_factory=dict)


class TemporalConsistencyEngine:
    """
    Evaluates temporal causality and distinguishes genuine chronological anomalies
    from benign clock drift across desynchronized servers.
    """

    def __init__(self, allowed_skew_seconds: float = 900.0):  # Default 15-minute tolerance
        self.allowed_skew_seconds = allowed_skew_seconds
        self._clocks: Dict[str, VectorClock] = {}

    def get_or_create_clock(self, node_id: str) -> VectorClock:
        if node_id not in self._clocks:
            self._clocks[node_id] = VectorClock(clock={node_id: 0})
        return self._clocks[node_id]

    def record_local_event(
        self,
        node_id: str,
        event_id: str,
        source_timestamp: float,
        payload: Optional[Dict[str, Any]] = None,
    ) -> CausalEvent:
        """Ticks local vector clock and creates a causal event."""
        clk = self.get_or_create_clock(node_id)
        clk.tick(node_id)
        return CausalEvent(
            event_id=event_id,
            node_id=node_id,
            source_timestamp=source_timestamp,
            received_timestamp=time.time(),
            vector_clock=clk.copy(),
            payload=payload or {},
        )

    def receive_remote_event(
        self,
        local_node_id: str,
        remote_event: CausalEvent,
    ) -> CausalEvent:
        """Merges remote vector clock upon message delivery."""
        local_clk = self.get_or_create_clock(local_node_id)
        local_clk.merge(remote_event.vector_clock, local_node_id)
        return CausalEvent(
            event_id=f"RECV-{remote_event.event_id}",
            node_id=local_node_id,
            source_timestamp=remote_event.source_timestamp,
            received_timestamp=time.time(),
            vector_clock=local_clk.copy(),
            payload=remote_event.payload,
        )

    def analyze_event_pair(self, event_a: CausalEvent, event_b: CausalEvent) -> Dict[str, Any]:
        """
        Analyzes the causal and temporal relationship between two events.
        Distinguishes causal ordering from wall-clock skew.
        """
        causal_order = event_a.vector_clock.compare(event_b.vector_clock)
        wall_clock_diff = event_b.source_timestamp - event_a.source_timestamp

        # Detect apparent paradoxes (e.g., A causally causes B, but B has older wall-clock time)
        apparent_paradox = False
        paradox_explanation = None

        if causal_order == CausalRelation.HAPPENS_BEFORE and wall_clock_diff < 0:
            apparent_paradox = True
            paradox_explanation = (
                f"Clock Skew Detected: Event {event_a.event_id} causally preceded {event_b.event_id}, "
                f"yet Event {event_b.event_id} has an earlier wall-clock timestamp (skew = {abs(wall_clock_diff):.2f}s). "
                f"This reflects server RTC desynchronization, NOT fraudulent retroactive modification."
            )

        skew_anomaly = abs(wall_clock_diff) > self.allowed_skew_seconds

        return {
            "causal_relation": causal_order.value,
            "wall_clock_delta_seconds": round(wall_clock_diff, 3),
            "apparent_temporal_paradox": apparent_paradox,
            "paradox_explanation": paradox_explanation,
            "is_concurrent": causal_order == CausalRelation.CONCURRENT,
            "is_skew_anomaly": skew_anomaly,
            "safe_interpretation": (
                "Logical vector clock causality takes precedence over wall-clock timestamps "
                "under desynchronized multi-party evidence ingestion."
            ),
        }

