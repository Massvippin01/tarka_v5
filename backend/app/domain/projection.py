from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class GraphProjectionRequest(BaseModel):
    case_id: Optional[str] = "C102"
    root_entity_id: Optional[str] = None
    jurisdiction: Optional[str] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    entity_types: List[str] = Field(default_factory=list)
    relationship_types: List[str] = Field(default_factory=list)
    max_hops: int = Field(default=2, ge=1, le=5)
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    max_nodes: int = Field(default=500, ge=1, le=2000)
    max_edges: int = Field(default=1000, ge=1, le=5000)


class TruncationMetadata(BaseModel):
    is_truncated: bool = False
    total_available_nodes: int = 0
    returned_nodes: int = 0
    total_available_edges: int = 0
    returned_edges: int = 0
    truncation_reason: Optional[str] = None


class FreshnessMetadata(BaseModel):
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    data_status: str = "CURRENT"
    synthetic: bool = True


class QueryTelemetry(BaseModel):
    query_id: str = Field(default_factory=lambda: str(uuid4()))
    query_duration_ms: float = 0.0
    serialization_duration_ms: float = 0.0
    memory_used_mb: float = 0.0


class GraphProjectionResponse(BaseModel):
    query_id: str = Field(default_factory=lambda: str(uuid4()))
    requested_scope: Dict[str, Any] = Field(default_factory=dict)
    applied_scope: Dict[str, Any] = Field(default_factory=dict)
    nodes: List[Dict[str, Any]] = Field(default_factory=list)
    edges: List[Dict[str, Any]] = Field(default_factory=list)
    clusters: List[Dict[str, Any]] = Field(default_factory=list)
    truncation: TruncationMetadata = Field(default_factory=TruncationMetadata)
    freshness: FreshnessMetadata = Field(default_factory=FreshnessMetadata)
    telemetry: QueryTelemetry = Field(default_factory=QueryTelemetry)
