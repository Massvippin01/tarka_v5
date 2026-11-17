"""
TARKA SUTRAM 2026 — WORKSTREAM B (DISTRIBUTED SYSTEMS & EVENT FABRIC)
Package exports for Distributed Event Envelope, Event Fabric, Vector Clocks,
PBFT Consensus, and Claim Recomputation Bridge.
"""

from tarka.distributed.event_envelope import (
    EventEnvelope,
    EventStatus,
    EventType,
    create_event,
    create_canonical_institution_event,
)
from tarka.distributed.event_store import (
    DistributedEventFabric,
    EventStore,
)
from tarka.distributed.vector_clock import (
    CausalEvent,
    CausalRelation,
    TemporalConsistencyEngine,
    VectorClock,
)
from tarka.distributed.pbft_consensus import (
    PBFTConsensusNetwork,
    PBFTMessage,
    PBFTPhase,
    PBFTValidatorNode,
)
from tarka.distributed.claim_bridge import (
    ClaimRecomputationBridge,
    ClaimRecomputationReport,
    RecomputedClaimResult,
)

__all__ = [
    "EventEnvelope",
    "EventStatus",
    "EventType",
    "create_event",
    "create_canonical_institution_event",
    "DistributedEventFabric",
    "EventStore",
    "CausalEvent",
    "CausalRelation",
    "TemporalConsistencyEngine",
    "VectorClock",
    "PBFTConsensusNetwork",
    "PBFTMessage",
    "PBFTPhase",
    "PBFTValidatorNode",
    "ClaimRecomputationBridge",
    "ClaimRecomputationReport",
    "RecomputedClaimResult",
]
