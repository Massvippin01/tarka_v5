from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class AnalyticalSignal(BaseModel):
    signal_id: str = Field(default_factory=lambda: f"SIG-{uuid4().hex[:8]}")
    signal_type: str  # NETWORK, CROSS_CASE, TEMPORAL, MOBILITY, FINANCIAL, BEHAVIORAL, ANOMALY
    title: str
    description: str
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    confidence: float = 0.85
    epistemic_status: str = "INFERRED"  # CONFIRMED, DOCUMENTED, OBSERVED, REPORTED, INFERRED, POTENTIAL
    subject_entities: List[str] = Field(default_factory=list)
    related_cases: List[str] = Field(default_factory=list)
    supporting_observations: List[str] = Field(default_factory=list)
    contradicting_observations: List[str] = Field(default_factory=list)
    evidence_references: List[str] = Field(default_factory=list)
    analytical_method: str = "MULTI_FEATURE_DETERMINISTIC_RULES"
    feature_summary: Dict[str, Any] = Field(default_factory=dict)
    time_window: str = "2026-08-01 to 2026-08-30"
    jurisdiction: str = "Delhi NCR / Gurugram"
    source_systems: List[str] = Field(default_factory=list)
    evidence_gaps: List[str] = Field(default_factory=list)
    alternative_explanations: List[str] = Field(default_factory=list)
    recommended_verification: str = "Investigator review required."
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    model_version: str = "v2.3-deterministic-nexus"
    review_status: str = "UNREVIEWED"


class NetworkCommunity(BaseModel):
    community_id: str = Field(default_factory=lambda: f"COMM-{uuid4().hex[:6]}")
    title: str = "CANDIDATE NETWORK"
    member_count: int
    key_entities: List[str] = Field(default_factory=list)
    central_entities: List[str] = Field(default_factory=list)
    shared_attributes: List[str] = Field(default_factory=list)
    case_coverage: List[str] = Field(default_factory=list)
    confidence: float = 0.85
    evidence_coverage: float = 0.90


class MobilityPoint(BaseModel):
    location_id: str
    name: str
    lat: float
    lng: float
    timestamp: str
    observation_type: str  # OBSERVED, INFERRED_ROUTE
    camera_or_tower_id: Optional[str] = None


class MobilitySequence(BaseModel):
    vehicle_id: str
    sequence: List[MobilityPoint] = Field(default_factory=list)
    observation_count: int
    first_seen: str
    last_seen: str
    cross_jurisdiction: bool = True


class FinancialAnomaly(BaseModel):
    pattern_type: str = "UNUSUAL FINANCIAL PATTERN"
    source_account: str
    target_account: str
    amount: float
    transfer_count: int
    rapid_mule_score: float
    supporting_evidence: List[str] = Field(default_factory=list)


class AnalyticsResponse(BaseModel):
    case_id: Optional[str] = None
    entity_id: Optional[str] = None
    signals: List[AnalyticalSignal] = Field(default_factory=list)
    candidate_networks: List[NetworkCommunity] = Field(default_factory=list)
    mobility_sequences: List[MobilitySequence] = Field(default_factory=list)
    financial_anomalies: List[FinancialAnomaly] = Field(default_factory=list)
    query_duration_ms: float = 0.0
