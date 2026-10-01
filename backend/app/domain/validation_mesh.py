from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.domain.interaction import ActionRiskClass


class ChamberType(str, Enum):
    AUTHORIZATION = "AUTHORIZATION"
    CASE_SCOPE = "CASE_SCOPE"
    EVIDENCE_INTEGRITY = "EVIDENCE_INTEGRITY"
    PROVENANCE = "PROVENANCE"
    TEMPORAL_SPATIAL = "TEMPORAL_SPATIAL"
    CONTRADICTION = "CONTRADICTION"
    EPISTEMIC_STATE = "EPISTEMIC_STATE"
    HUMAN_CONFIRMATION = "HUMAN_CONFIRMATION"


class ChamberStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    WARNING = "WARNING"
    SKIPPED = "SKIPPED"
    WAITING_CONFIRMATION = "WAITING_CONFIRMATION"
    CANCELLED = "CANCELLED"


class ChamberResult(BaseModel):
    chamber: ChamberType
    status: ChamberStatus
    evidence_refs: List[str] = Field(default_factory=list)
    confidence: float = 1.0
    uncertainty: Dict[str, Any] = Field(default_factory=dict)
    violations: List[str] = Field(default_factory=list)
    required_actions: List[str] = Field(default_factory=list)
    execution_time_ms: float = 0.0


class ValidationTarget(BaseModel):
    """
    Input payload subjected to the Validation Chamber Mesh.
    Represents consequential investigative outputs, commands, claims, or facts.
    """
    target_id: str = Field(default_factory=lambda: f"TGT-{uuid4().hex[:8]}")
    target_type: str = "CONSEQUENTIAL_OUTPUT"  # COMMAND, FACT, CLAIM, OBSERVATION, ARTIFACT, AGENT_OUTPUT
    case_id: str = "CASE-2026-001"
    risk_class: ActionRiskClass = ActionRiskClass.READ
    user: Optional[UserIdentity] = None
    evidence_ids: List[str] = Field(default_factory=list)
    claim: Optional[Dict[str, Any]] = None
    fact: Optional[Dict[str, Any]] = None
    observation: Optional[Dict[str, Any]] = None
    spatio_temporal_points: Optional[List[Dict[str, Any]]] = None
    is_human_confirmed: bool = False
    confirmation_challenge_id: Optional[str] = None
    command_id: Optional[str] = None
    epistemic_claim_standing: Optional[str] = None  # OBSERVED, INFERRED, PROPOSED, VERIFIED
    is_directly_observed: Optional[bool] = None
    is_verified_ground_truth: Optional[bool] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class MeshValidationResult(BaseModel):
    """
    Structured outcome of the 8-Chamber Validation Mesh routing.
    """
    validation_id: str = Field(default_factory=lambda: f"VAL-{uuid4().hex[:8]}")
    target_id: str
    target_type: str
    case_id: str
    risk_class: ActionRiskClass
    overall_status: ChamberStatus
    is_valid: bool
    chambers_executed: List[ChamberType] = Field(default_factory=list)
    chamber_results: Dict[str, ChamberResult] = Field(default_factory=dict)
    violations: List[str] = Field(default_factory=list)
    required_actions: List[str] = Field(default_factory=list)
    evidence_refs: List[str] = Field(default_factory=list)
    audit_record_id: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
