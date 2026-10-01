from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4


class LearningEventType(str, Enum):
    COMMAND_EXECUTION = "COMMAND_EXECUTION"
    VOICE_INTENT = "VOICE_INTENT"
    HUMAN_CORRECTION = "HUMAN_CORRECTION"
    CLARIFICATION = "CLARIFICATION"
    PIPELINE_FAILURE = "PIPELINE_FAILURE"


class LearningModality(str, Enum):
    VOICE = "VOICE"
    TEXT = "TEXT"
    UI = "UI"
    HYBRID = "HYBRID"


class LearningOutcome(str, Enum):
    SUCCESS = "SUCCESS"
    USER_CORRECTED = "USER_CORRECTED"
    ABORTED = "ABORTED"
    FAILED = "FAILED"


class PrivacyClassification(str, Enum):
    UNRESTRICTED = "UNRESTRICTED"
    DEIDENTIFIED = "DEIDENTIFIED"
    RESTRICTED_PII = "RESTRICTED_PII"
    FORBIDDEN = "FORBIDDEN"


class SafetyViolationType(str, Enum):
    RAW_SENSITIVE_EVIDENCE = "RAW_SENSITIVE_EVIDENCE"
    UNVERIFIED_ALLEGATION = "UNVERIFIED_ALLEGATION"
    GUILT_PREDICTION = "GUILT_PREDICTION"
    IDENTITY_ASSERTION = "IDENTITY_ASSERTION"
    INVESTIGATOR_SPECULATION = "INVESTIGATOR_SPECULATION"
    UNMASKED_PII = "UNMASKED_PII"
    CASE_POLLUTION = "CASE_POLLUTION"
    SCHEMA_VERSION_MISMATCH = "SCHEMA_VERSION_MISMATCH"


@dataclass
class LearningEvent:
    """
    Versioned, minimal learning event capturing safe operational signals
    from investigator interactions without mutating investigative truth.
    """
    schema_version: str  # e.g., "1.0.0"
    event_id: str
    timestamp: datetime
    event_type: LearningEventType
    model_version: str
    modality: LearningModality
    language: str
    normalized_intent: str
    proposed_action: Optional[str]
    actual_action: Optional[str]
    human_correction: Optional[Dict[str, Any]]
    outcome: LearningOutcome
    latency_ms: float
    clarification: Optional[Dict[str, Any]]
    failure_reason: Optional[str]
    privacy_classification: PrivacyClassification
    provenance_hash: str
    parent_audit_id: Optional[str] = None
    case_id: Optional[str] = None  # Strictly isolated, never fed directly into learning features
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_training_feature_dict(self) -> Dict[str, Any]:
        """
        Exports the event as a sanitized training example stripped of all case identifiers,
        case truth assertions, and sensitive evidence.
        """
        return {
            "schema_version": self.schema_version,
            "event_type": self.event_type.value,
            "modality": self.modality.value,
            "language": self.language,
            "normalized_intent": self.normalized_intent,
            "proposed_action": self.proposed_action,
            "actual_action": self.actual_action,
            "human_correction": self.human_correction,
            "outcome": self.outcome.value,
            "latency_ms": self.latency_ms,
            "clarification": self.clarification,
            "privacy_classification": self.privacy_classification.value,
        }


@dataclass
class LearningValidationResult:
    is_valid: bool
    event_id: str
    violations: List[SafetyViolationType] = field(default_factory=list)
    violation_reasons: List[str] = field(default_factory=list)
    sanitized_event: Optional[LearningEvent] = None


@dataclass
class CuratedDataset:
    dataset_id: str
    name: str
    version: str
    schema_version: str
    created_at: datetime
    events: List[LearningEvent]
    dataset_hash: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def size(self) -> int:
        return len(self.events)


@dataclass
class OfflineExperimentResult:
    experiment_id: str
    dataset_id: str
    candidate_model: str
    baseline_model: str
    timestamp: datetime
    metrics: Dict[str, float]
    baseline_metrics: Dict[str, float]
    passed_safety: bool
    regression_detected: bool
    experiment_hash: str


@dataclass
class PromotionDecision:
    decision_id: str
    experiment_id: str
    promoted: bool
    status: str  # "REJECTED_SAFETY", "REJECTED_REGRESSION", "PENDING_HUMAN_GOVERNANCE", "APPROVED_BY_GOVERNANCE"
    reasons: List[str]
    approved_by: Optional[str] = None
    approval_timestamp: Optional[datetime] = None
    audit_record_id: Optional[str] = None
