from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class FederatedSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    entity_types: List[str] = Field(default_factory=list)
    jurisdiction: Optional[str] = None
    case_id: Optional[str] = None
    time_range_start: Optional[str] = None
    time_range_end: Optional[str] = None
    source_systems: List[str] = Field(default_factory=list)
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    page_size: int = Field(default=20, ge=1, le=100)
    cursor: Optional[str] = None


class ERCandidateSummary(BaseModel):
    candidate_id: str
    match_score: float
    matched_fields: List[str] = Field(default_factory=list)
    status: str = "POSSIBLE_MATCH"


class FederatedSearchResultItem(BaseModel):
    id: str
    entity_type: str
    name: str
    title: Optional[str] = None
    aliases: List[str] = Field(default_factory=list)
    jurisdiction: str = "Delhi NCR"
    related_cases: List[str] = Field(default_factory=list)
    source_systems: List[str] = Field(default_factory=list)
    confidence: float = 1.0
    last_observed: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    synthetic: bool = True
    er_candidates: List[ERCandidateSummary] = Field(default_factory=list)
    snippet: str = ""
    relevance_score: float = 1.0


class SourceCoverageStatus(BaseModel):
    source_system: str
    status: str = "AVAILABLE"  # AVAILABLE, DEGRADED, UNAVAILABLE
    record_count: int = 0


class FederatedSearchResponse(BaseModel):
    query_id: str = Field(default_factory=lambda: str(uuid4()))
    results: List[FederatedSearchResultItem] = Field(default_factory=list)
    total_available: int = 0
    returned_count: int = 0
    next_cursor: Optional[str] = None
    applied_filters: Dict[str, Any] = Field(default_factory=dict)
    is_truncated: bool = False
    truncation_reason: Optional[str] = None
    source_coverage: List[SourceCoverageStatus] = Field(default_factory=list)
    query_duration_ms: float = 0.0
