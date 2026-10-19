from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class RealtimeEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"EVT-{uuid4().hex[:8]}")
    event_type: str  # CASE_UPDATED, ENTITY_ADDED, EVIDENCE_ADDED, CONTRADICTION_DETECTED, etc.
    sequence_number: int = 1
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    source: str = "REALTIME_EVENT_FABRIC"
    case_id: Optional[str] = "C102"
    jurisdiction: str = "Delhi NCR / Gurugram"
    payload: Dict[str, Any] = Field(default_factory=dict)
    correlation_id: str = Field(default_factory=lambda: f"CORR-{uuid4().hex[:6]}")
    causation_id: Optional[str] = None
    schema_version: str = "v1.0"
    freshness: str = "LIVE"


class EventSubscriptionScope(BaseModel):
    case_id: Optional[str] = "C102"
    jurisdiction: Optional[str] = "Delhi NCR / Gurugram"
    event_types: List[str] = Field(default_factory=list)


class RealtimeStatusResponse(BaseModel):
    connection_state: str = "LIVE"  # LIVE, RECONNECTING, OFFLINE, STALE, DEGRADED
    last_event_id: Optional[str] = None
    last_sequence_number: int = 0
    active_subscriptions: int = 1
    server_time: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
