from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field, model_validator


class EpistemicStatusEnum(str, Enum):
    OBSERVED = "OBSERVED"
    CORROBORATED = "CORROBORATED"
    CONTRADICTED = "CONTRADICTED"
    INFERRED = "INFERRED"
    UNKNOWN = "UNKNOWN"


class FactCategoryEnum(str, Enum):
    """Forensic distinction between verified facts, inferences, hypotheses, and gaps."""
    VERIFIED_FACT = "VERIFIED_FACT"
    INFERRED_RELATIONSHIP = "INFERRED_RELATIONSHIP"
    PROPOSED_LEAD = "PROPOSED_LEAD"
    CONTRADICTION = "CONTRADICTION"
    UNKNOWN = "UNKNOWN"
    MISSING_EVIDENCE = "MISSING_EVIDENCE"


class ResponseLengthPolicyEnum(str, Enum):
    """Length policy governing spoken and textual disclosure density."""
    MICRO = "MICRO"        # 1 sentence (default for immediate voice feedback)
    SHORT = "SHORT"        # 1-2 sentences (default spoken operational response)
    STANDARD = "STANDARD"  # 2-4 sentences (default display/chat surface)
    DETAILED = "DETAILED"  # In-depth briefing upon explicit investigator request
    FULL = "FULL"          # Complete forensic export / comprehensive dossier


class ResponseGroundingStatus(str, Enum):
    """Grounding validation outcome for response safety."""
    GROUNDED = "GROUNDED"
    UNVERIFIED = "UNVERIFIED"
    RESPONSE_GROUNDING_FAILED = "RESPONSE_GROUNDING_FAILED"
    REFORMULATED = "REFORMULATED"


class CitedArtifactReference(BaseModel):
    """
    Immutable cryptographic reference to a cited forensic artifact.
    """
    artifact_id: str
    sha256_hash: str
    source_type: str
    provenance_type: str
    record_identifier: str


class ValidatedResponse(BaseModel):
    """
    Output of the deterministic Claim-Level Response Grounding Validator.
    Guarantees zero unsupported factual claims, zero prompt injection, and zero epistemic upgrade.
    """
    is_valid: bool = True
    grounding_status: ResponseGroundingStatus = ResponseGroundingStatus.GROUNDED
    voice_text: str = ""
    display_text: str = ""
    rejection_reasons: List[str] = Field(default_factory=list)
    remediation_applied: Optional[str] = None
    validated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class IntelligenceResponseContract(BaseModel):
    """
    Standardized, governed intelligence output contract.
    CRITICAL RULE: Never expose, persist, stream, or return private model chain-of-thought.
    Structured 'investigative_rationale' provides concise, factual, forensic justification.
    """
    response_id: str = Field(default_factory=lambda: f"RESP-{uuid4().hex[:8]}")
    correlation_id: str = ""
    command_id: Optional[str] = None
    case_id: str = "CASE-2026-001"
    jurisdiction: Optional[str] = "Delhi NCR / Special Cell"
    response_type: str = "SUCCESS"  # SUCCESS, SEARCH_RESULT, ENTITY_CONNECTIONS, FILTER_RESULT, CONTRADICTION, EVIDENCE, EVIDENCE_GAP, UNVERIFIED, CLARIFICATION, CONFIRMATION_REQUIRED, POLICY_DENIAL, FAILURE

    summary: str = ""
    facts: List[str] = Field(default_factory=list)
    supporting_evidence: List[CitedArtifactReference] = Field(default_factory=list)
    contradictory_evidence: List[str] = Field(default_factory=list)
    uncertainties: List[str] = Field(default_factory=list)
    fact_category: FactCategoryEnum = FactCategoryEnum.VERIFIED_FACT
    epistemic_status: EpistemicStatusEnum = EpistemicStatusEnum.OBSERVED

    entities: List[str] = Field(default_factory=list)
    relationships: List[str] = Field(default_factory=list)
    next_actions: List[str] = Field(default_factory=list)
    ui_actions: List[Dict[str, Any]] = Field(default_factory=list)

    voice_text: str = ""
    display_text: str = ""
    length_policy: ResponseLengthPolicyEnum = ResponseLengthPolicyEnum.SHORT

    requires_confirmation: bool = False
    requires_clarification: bool = False
    provenance: Dict[str, Any] = Field(default_factory=dict)
    grounding_status: ResponseGroundingStatus = ResponseGroundingStatus.GROUNDED

    # Wave 5 legacy fields (preserved for 100% backwards-compatibility)
    investigative_rationale: str = ""
    investigative_finding: str = ""
    cited_artifacts: List[CitedArtifactReference] = Field(default_factory=list)
    contradictions_identified: List[str] = Field(default_factory=list)
    evidence_gaps_identified: List[str] = Field(default_factory=list)
    recommended_action: Optional[str] = None
    requires_statutory_authority: bool = False
    statutory_code: Optional[str] = None
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.90)
    generated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

    @model_validator(mode="after")
    def synchronize_legacy_and_a4_fields(self) -> IntelligenceResponseContract:
        # Cross-populate summary and investigative_finding
        if not self.summary and self.investigative_finding:
            self.summary = self.investigative_finding
        elif not self.investigative_finding and self.summary:
            self.investigative_finding = self.summary

        # Cross-populate investigative_rationale and facts/summary
        if not self.investigative_rationale:
            self.investigative_rationale = self.summary or "Grounded analytical rationale."

        # Cross-populate cited_artifacts and supporting_evidence
        if not self.supporting_evidence and self.cited_artifacts:
            self.supporting_evidence = list(self.cited_artifacts)
        elif not self.cited_artifacts and self.supporting_evidence:
            self.cited_artifacts = list(self.supporting_evidence)

        # Cross-populate contradictions_identified and contradictory_evidence
        if not self.contradictory_evidence and self.contradictions_identified:
            self.contradictory_evidence = list(self.contradictions_identified)
        elif not self.contradictions_identified and self.contradictory_evidence:
            self.contradictions_identified = list(self.contradictory_evidence)

        # Cross-populate display_text and voice_text
        if not self.display_text:
            self.display_text = self.summary or self.investigative_finding or "Action executed successfully."
        if not self.voice_text:
            self.voice_text = self.summary or self.investigative_finding or "Action executed successfully."

        # Cross-populate created_at and generated_at
        if self.generated_at and not self.created_at:
            self.created_at = self.generated_at
        elif self.created_at and not self.generated_at:
            self.generated_at = self.created_at

        return self
