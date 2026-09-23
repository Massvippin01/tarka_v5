from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class EpistemicStatusEnum(str, Enum):
    OBSERVED = "OBSERVED"
    CORROBORATED = "CORROBORATED"
    CONTRADICTED = "CONTRADICTED"
    INFERRED = "INFERRED"
    UNKNOWN = "UNKNOWN"


class CitedArtifactReference(BaseModel):
    """
    Immutable cryptographic reference to a cited forensic artifact.
    """
    artifact_id: str
    sha256_hash: str
    source_type: str
    provenance_type: str
    record_identifier: str


class IntelligenceResponseContract(BaseModel):
    """
    Standardized, governed intelligence output contract.
    CRITICAL RULE: Never expose, persist, stream, or return private model chain-of-thought.
    Structured 'investigative_rationale' provides concise, factual, forensic justification.
    """
    response_id: str = Field(default_factory=lambda: f"RESP-{uuid4().hex[:8]}")
    investigative_rationale: str  # Structured, factual forensic justification (Zero CoT)
    investigative_finding: str   # Core factual finding grounded strictly in evidence
    epistemic_status: EpistemicStatusEnum = EpistemicStatusEnum.OBSERVED
    cited_artifacts: List[CitedArtifactReference] = Field(default_factory=list)
    contradictions_identified: List[str] = Field(default_factory=list)
    evidence_gaps_identified: List[str] = Field(default_factory=list)
    recommended_action: Optional[str] = None
    requires_statutory_authority: bool = False
    statutory_code: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.90)
    generated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
