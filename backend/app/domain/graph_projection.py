from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import generate_uuid7


class GraphOperationType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    REBUILD = "REBUILD"
    INVALIDATE = "INVALIDATE"


class GraphEventType(str, Enum):
    GRAPH_NODE_CREATED = "GRAPH_NODE_CREATED"
    GRAPH_NODE_UPDATED = "GRAPH_NODE_UPDATED"
    GRAPH_NODE_REMOVED = "GRAPH_NODE_REMOVED"
    GRAPH_RELATIONSHIP_CREATED = "GRAPH_RELATIONSHIP_CREATED"
    GRAPH_RELATIONSHIP_UPDATED = "GRAPH_RELATIONSHIP_UPDATED"
    GRAPH_RELATIONSHIP_REMOVED = "GRAPH_RELATIONSHIP_REMOVED"
    GRAPH_CLUSTER_UPDATED = "GRAPH_CLUSTER_UPDATED"
    GRAPH_PROJECTION_REBUILT = "GRAPH_PROJECTION_REBUILT"
    GRAPH_PROJECTION_STALE = "GRAPH_PROJECTION_STALE"
    GRAPH_PROJECTION_RECOVERED = "GRAPH_PROJECTION_RECOVERED"


class GraphDeltaType(str, Enum):
    ADD_NODE = "ADD_NODE"
    UPDATE_NODE = "UPDATE_NODE"
    REMOVE_NODE = "REMOVE_NODE"
    ADD_EDGE = "ADD_EDGE"
    UPDATE_EDGE = "UPDATE_EDGE"
    REMOVE_EDGE = "REMOVE_EDGE"
    REPLACE_CLUSTER = "REPLACE_CLUSTER"
    RESET_PROJECTION = "RESET_PROJECTION"


class GraphProjectionStatus(str, Enum):
    HEALTHY = "HEALTHY"
    CATCHING_UP = "CATCHING_UP"
    STALE = "STALE"
    FAILED = "FAILED"
    REBUILDING = "REBUILDING"


class GraphNodeOntology(BaseModel):
    """
    Standardized ontology schema for graph projection nodes.
    Derived strictly from canonical entity or evidence records.
    """
    identifier: str
    canonical_id: str
    display_label: str
    entity_type: str  # Person, Case, Phone, Vehicle, BankAccount, Location, etc.
    case_scope: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    epistemic_status: str = "OBSERVED"  # OBSERVED, VERIFIED, INFERRED, PROPOSED, CONTRADICTED, UNKNOWN
    risk_level: str = "UNKNOWN"
    source_refs: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    cluster_id: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None


class GraphEdgeOntology(BaseModel):
    """
    Standardized ontology schema for graph projection edges.
    Retains immutable lineage to canonical relationship or derived evidence fact.
    """
    relationship_id: str
    source: str
    target: str
    relationship_type: str
    direction: str = "DIRECTED"
    epistemic_status: str = "DOCUMENTED"  # OBSERVED, VERIFIED, INFERRED, PROPOSED, CONTRADICTED
    confidence: float = 1.0
    evidence_refs: List[str] = Field(default_factory=list)
    source_refs: List[str] = Field(default_factory=list)
    case_scope: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    observed_at: Optional[str] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphProjectionRecord(BaseModel):
    """
    Authoritative record of a projection compilation event.
    Tracks lineage from PostgreSQL / Canonical state mutation into Neo4j graph projection.
    """
    projection_event_id: str = Field(default_factory=generate_uuid7)
    canonical_object_id: str
    canonical_object_type: str  # Entity, Relationship, Fact, Artifact, Case
    graph_object_id: str
    operation: GraphOperationType
    version: int = 1
    case_id: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    epistemic_status: str = "DOCUMENTED"
    evidence_refs: List[str] = Field(default_factory=list)
    source_refs: List[str] = Field(default_factory=list)
    occurred_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    projected_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    correlation_id: str = Field(default_factory=generate_uuid7)
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphDelta(BaseModel):
    """
    Atomic incremental change dispatched to realtime clients.
    Allows frontend to mutate graph without resetting viewport, zoom, selection, or filters.
    """
    delta_id: str = Field(default_factory=generate_uuid7)
    delta_type: GraphDeltaType
    case_id: str = "CASE-2026-001"
    version: int = 1
    sequence_number: int = 1
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    node: Optional[GraphNodeOntology] = None
    edge: Optional[GraphEdgeOntology] = None
    removed_id: Optional[str] = None
    cluster_summary: Optional[Dict[str, Any]] = None
    correlation_id: str = Field(default_factory=generate_uuid7)
    reason: Optional[str] = None


class GraphSnapshot(BaseModel):
    """
    Point-in-time full graph projection snapshot for initial load or recovery.
    """
    case_id: str
    version: int
    last_sequence_number: int
    status: GraphProjectionStatus = GraphProjectionStatus.HEALTHY
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    nodes: List[GraphNodeOntology] = Field(default_factory=list)
    edges: List[GraphEdgeOntology] = Field(default_factory=list)
    clusters: List[Dict[str, Any]] = Field(default_factory=list)
    total_nodes: int = 0
    total_edges: int = 0
    correlation_id: str = Field(default_factory=generate_uuid7)


class GraphProjectionHealth(BaseModel):
    """Health and synchronization telemetry of graph projection."""
    status: GraphProjectionStatus
    case_id: str
    canonical_version: int
    projected_version: int
    lag_events: int = 0
    last_sync_time: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    neo4j_connected: bool = False
    is_rebuilding: bool = False
    details: Dict[str, Any] = Field(default_factory=dict)


class GraphConsistencyReport(BaseModel):
    """Detailed audit report comparing canonical transactional state to graph projection."""
    is_consistent: bool
    case_id: str
    checked_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    canonical_node_count: int
    projected_node_count: int
    canonical_edge_count: int
    projected_edge_count: int
    missing_in_graph: List[str] = Field(default_factory=list)
    orphaned_in_graph: List[str] = Field(default_factory=list)
    epistemic_mismatches: List[Dict[str, Any]] = Field(default_factory=list)
    discrepancy_details: List[str] = Field(default_factory=list)
