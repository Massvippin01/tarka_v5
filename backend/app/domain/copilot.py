from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class CopilotQueryScope(BaseModel):
    case_id: Optional[str] = "C102"
    jurisdiction: str = "Delhi NCR / Gurugram"
    time_window: str = "2026-08-01 to 2026-08-30"
    entity_id: Optional[str] = None
    relationship_id: Optional[str] = None
    result_limit: int = 50


class CopilotToolExecution(BaseModel):
    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    result_summary: str
    status: str = "SUCCESS"  # SUCCESS, DEGRADED, FAILED
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class CopilotClaim(BaseModel):
    claim_id: str = Field(default_factory=lambda: f"CLM-{uuid4().hex[:6]}")
    text: str
    claim_type: str = "FACT"  # FACT, INFERENCE, HYPOTHESIS
    subject_entity_id: Optional[str] = None
    target_entity_id: Optional[str] = None
    evidence_reference: Optional[str] = None
    confidence: float = 1.0
    epistemic_status: str = "DOCUMENTED"
    verification_status: str = "VERIFIED"  # VERIFIED, UNCONFIRMED, REJECTED
    verification_reason: str = "Ground truth matched in system of record."


class InvestigatorVerificationRequest(BaseModel):
    claim_id: str
    action: str  # CONFIRMED, DISMISSED, REQUIRES_REVIEW
    investigator_notes: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class VerificationSummary(BaseModel):
    total_claims: int = 0
    verified_claims: int = 0
    unconfirmed_claims: int = 0
    rejected_claims: int = 0
    claim_verification_rate: float = 1.0


class CopilotResponse(BaseModel):
    response_id: str = Field(default_factory=lambda: f"RESP-{uuid4().hex[:8]}")
    query: str
    answer: str
    confidence: float = 0.95
    confidence_level: str = "INFERRED"
    claims: List[CopilotClaim] = Field(default_factory=list)
    evidence_references: List[str] = Field(default_factory=list)
    inferences: List[str] = Field(default_factory=list)
    uncertainty_notes: List[str] = Field(default_factory=list)
    contradictions: List[str] = Field(default_factory=list)
    evidence_gaps: List[str] = Field(default_factory=list)
    alternative_explanations: List[str] = Field(default_factory=list)
    tool_calls: List[CopilotToolExecution] = Field(default_factory=list)
    supporting_records: List[Dict[str, Any]] = Field(default_factory=list)
    query_scope: CopilotQueryScope = Field(default_factory=CopilotQueryScope)
    verification_summary: VerificationSummary = Field(default_factory=VerificationSummary)
    analytical_disclaimer: str = "This response is an AI intelligence aid. Investigator verification required prior to legal action."
    data_freshness: str = "CURRENT (SYNTHETIC SIMULATION)"
    model_version: str = "v2.4-governed-copilot"
    provenance: Dict[str, Any] = Field(default_factory=lambda: {"source": "SENTINELX_AI_COPILOT", "method": "GOVERNED_AI_ENGINE", "review_status": "PENDING_INVESTIGATOR_REVIEW"})
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
