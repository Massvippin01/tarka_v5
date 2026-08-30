from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, List
from uuid import uuid4

from app.domain.enums import ConfidenceLevel, SourceSystem


@dataclass(slots=True)
class SourceRecord:
    record_id: str = field(default_factory=lambda: str(uuid4()))
    source_system: SourceSystem = SourceSystem.SYNTHETIC_ENGINE
    source_record_id: str = ""
    jurisdiction: str = "Delhi NCR"
    observed_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    reliability: str = "HIGH"  # HIGH, MODERATE, UNVERIFIED
    raw_payload: Dict[str, Any] = field(default_factory=dict)
    synthetic: bool = True
    scenario_id: str = "SCENARIO-001"


@dataclass(slots=True)
class Observation:
    observation_id: str = field(default_factory=lambda: str(uuid4()))
    entity_id: str = ""
    observation_type: str = ""  # CALL, TRANSACTION, SIGHTING, REGISTRATION
    description: str = ""
    source_system: str = "SYNTHETIC_ENGINE"
    source_record_id: str = ""
    observed_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    location_id: str | None = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class Contradiction:
    contradiction_id: str = field(default_factory=lambda: str(uuid4()))
    title: str = ""
    observation_a_id: str = ""
    observation_b_id: str = ""
    observation_a_desc: str = ""
    observation_b_desc: str = ""
    conflict_reason: str = ""
    severity: str = "HIGH"  # HIGH, MEDIUM, LOW
    status: str = "UNRESOLVED"  # UNRESOLVED, INVESTIGATING, DISMISSED


@dataclass(slots=True)
class EvidenceGap:
    gap_id: str = field(default_factory=lambda: str(uuid4()))
    title: str = ""
    description: str = ""
    why_it_matters: str = ""
    current_impact: str = ""
    what_would_resolve_it: str = ""
    next_verification: str = ""
    target_entity_id: str = ""
    case_id: str = ""
    severity: str = "CRITICAL"


@dataclass(slots=True)
class Hypothesis:
    hypothesis_id: str = field(default_factory=lambda: str(uuid4()))
    case_id: str = ""
    code: str = "H1"  # H1, H2, H3
    title: str = ""
    description: str = ""
    supporting_evidence_ids: List[str] = field(default_factory=list)
    contradicting_evidence_ids: List[str] = field(default_factory=list)
    neutral_evidence_ids: List[str] = field(default_factory=list)
    unknown_evidence_ids: List[str] = field(default_factory=list)
    confidence: float = 0.5
    status: str = "UNDER_EVALUATION"


@dataclass(slots=True)
class InvestigativeAction:
    action_id: str = field(default_factory=lambda: str(uuid4()))
    case_id: str = ""
    recommendation: str = ""
    target_entity_id: str = ""
    action_type: str = "VERIFY_SUBSCRIBER"
    urgency: str = "HIGH"
    status: str = "PENDING_INVESTIGATOR_REVIEW"
