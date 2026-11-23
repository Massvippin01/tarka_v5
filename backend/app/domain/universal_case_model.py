"""
TARKA Universal Case Model (UCM) & Canonical Contracts.

Document Version: 1.0.0-PROD
Operating Philosophy: AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.
Constitutional Invariant: The Non-Promotability Invariant - machine-generated inferences remain human_verified = False.
Evidence is DATA_ONLY.
"""

from __future__ import annotations

import hashlib
import json
import time
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, field_validator, model_validator

from app.domain.canonical_evidence_ir import generate_uuid7


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class CaseStatus(str, Enum):
    ACTIVE = "ACTIVE"
    UNDER_REVIEW = "UNDER_REVIEW"
    CLOSED = "CLOSED"
    ARCHIVED = "ARCHIVED"


class CaseClassification(str, Enum):
    UNCLASSIFIED = "UNCLASSIFIED"
    CONFIDENTIAL = "CONFIDENTIAL"
    RESTRICTED = "RESTRICTED"
    SECRET = "SECRET"


class EvidenceProcessingStatus(str, Enum):
    RECEIVED = "RECEIVED"
    VALIDATED = "VALIDATED"
    PROCESSING = "PROCESSING"
    EXTRACTED = "EXTRACTED"
    FAILED = "FAILED"
    QUARANTINED = "QUARANTINED"


class ObservationType(str, Enum):
    FINANCIAL_TRANSACTION = "FINANCIAL_TRANSACTION"
    CALL_DETAIL_RECORD = "CALL_DETAIL_RECORD"
    CHAT_MESSAGE = "CHAT_MESSAGE"
    LOCATION_PING = "LOCATION_PING"
    IMAGE_EXIF = "IMAGE_EXIF"
    OCR_TEXT_REGION = "OCR_TEXT_REGION"
    SYSTEM_LOG = "SYSTEM_LOG"


class FindingType(str, Enum):
    DIRECT_OBSERVATION = "DIRECT_OBSERVATION"
    EXTRACTED_INFORMATION = "EXTRACTED_INFORMATION"
    CORRELATION = "CORRELATION"
    INFERENCE = "INFERENCE"
    UNVERIFIED_HYPOTHESIS = "UNVERIFIED_HYPOTHESIS"
    CONTRADICTION = "CONTRADICTION"
    MISSING_EVIDENCE = "MISSING_EVIDENCE"


class FindingStatus(str, Enum):
    OPEN = "OPEN"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    RESOLVED = "RESOLVED"
    UNDER_HUMAN_REVIEW = "UNDER_HUMAN_REVIEW"


class EntityMatchBasis(str, Enum):
    EXACT_IDENTIFIER = "EXACT_IDENTIFIER"
    PROBABLE_MATCH = "PROBABLE_MATCH"
    POSSIBLE_ASSOCIATION = "POSSIBLE_ASSOCIATION"
    UNVERIFIED_RELATIONSHIP = "UNVERIFIED_RELATIONSHIP"


class JobStatus(str, Enum):
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


# ---------------------------------------------------------------------------
# Canonical Contracts (Pydantic v2)
# ---------------------------------------------------------------------------

class AccessPolicy(BaseModel):
    allowed_roles: List[str] = Field(default_factory=lambda: ["INVESTIGATOR", "FORENSIC_LEAD"])
    allowed_jurisdictions: List[str] = Field(default_factory=lambda: ["IN_DELHI", "FEDERAL"])
    minimum_clearance: str = "CONFIDENTIAL"
    requires_statutory_purpose: bool = True


class UniversalCase(BaseModel):
    schema_version: str = "1.0.0"
    case_id: str = Field(default_factory=generate_uuid7)
    case_type: str = "CYBER_FINANCIAL_FRAUD"
    title: str
    description: Optional[str] = ""
    jurisdiction: str = "IN_DELHI"
    organisation_id: str = "DELHI_CYBER_CRIME_UNIT"
    created_by: str = "INVESTIGATOR_DELHI"
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    status: CaseStatus = CaseStatus.ACTIVE
    classification: CaseClassification = CaseClassification.CONFIDENTIAL
    access_policy: AccessPolicy = Field(default_factory=AccessPolicy)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UniversalEvidence(BaseModel):
    schema_version: str = "1.0.0"
    evidence_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    original_filename: str
    media_type: str
    file_size: int = Field(ge=0)
    sha256: str = Field(..., min_length=64, max_length=64)
    storage_reference: str = Field(..., description="CAS URI: cas://sha256/<hash> or s3://...")
    source_channel: str = "DIRECT_UPLOAD"  # DIRECT_UPLOAD, WHATSAPP, TELECOM_EXPORT, BANK_EXPORT
    submitted_by: str = "INVESTIGATOR_DELHI"
    received_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    claimed_capture_time: Optional[str] = None
    processing_status: EvidenceProcessingStatus = EvidenceProcessingStatus.RECEIVED
    evidence_classification: CaseClassification = CaseClassification.CONFIDENTIAL
    custody_reference: str = Field(default_factory=generate_uuid7)
    access_policy: AccessPolicy = Field(default_factory=AccessPolicy)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("sha256")
    def validate_hash_format(cls, v: str) -> str:
        clean = v.strip().lower()
        if len(clean) != 64 or not all(c in "0123456789abcdef" for c in clean):
            raise ValueError(f"Invalid SHA-256 digest format: {v}")
        return clean


class ExtractedObservation(BaseModel):
    schema_version: str = "1.0.0"
    observation_id: str = Field(default_factory=generate_uuid7)
    evidence_id: str
    case_id: str
    observation_type: ObservationType
    extracted_value: Dict[str, Any]
    source_region: Optional[Dict[str, Any]] = None  # line_number, bounding_box, page_number
    extraction_method: str = "PARSER_DETERMINISTIC"  # PARSER_DETERMINISTIC, OCR_TESSERACT, SMT_SYNTHESIS
    extraction_version: str = "1.0.0"
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    human_verified: bool = Field(default=False, description="Strict non-promotability invariant")


class UniversalFinding(BaseModel):
    schema_version: str = "1.0.0"
    finding_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    finding_type: FindingType
    description: str
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradictory_evidence_ids: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    confidence_metadata: Dict[str, Any] = Field(default_factory=dict)
    human_verified: bool = Field(default=False, description="Strict non-promotability invariant")
    status: FindingStatus = FindingStatus.OPEN
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class UniversalEntity(BaseModel):
    schema_version: str = "1.0.0"
    entity_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    entity_type: str  # PERSON, BANK_ACCOUNT, UPI_VPA, PHONE, VEHICLE, LOCATION
    name_or_title: str
    canonical_identifier: Optional[str] = None
    source_references: List[str] = Field(default_factory=list)
    match_basis: EntityMatchBasis = EntityMatchBasis.POSSIBLE_ASSOCIATION
    uncertainty_score: float = Field(default=0.0, ge=0.0, le=1.0)
    properties: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class UniversalRelationship(BaseModel):
    schema_version: str = "1.0.0"
    relationship_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    match_basis: EntityMatchBasis = EntityMatchBasis.POSSIBLE_ASSOCIATION
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradictory_evidence_ids: List[str] = Field(default_factory=list)
    uncertainty_score: float = Field(default=0.0, ge=0.0, le=1.0)
    human_verified: bool = Field(default=False)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class AnalysisJob(BaseModel):
    schema_version: str = "1.0.0"
    job_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    evidence_ids: List[str]
    engine: str  # TRACE, AEGIS, Z3_SOLVER, FORENSIC_REPORT
    engine_version: str = "1.0.0"
    status: JobStatus = JobStatus.QUEUED
    progress: float = Field(default=0.0, ge=0.0, le=1.0)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    results_summary: Dict[str, Any] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class UniversalAuditEvent(BaseModel):
    schema_version: str = "1.0.0"
    event_id: str = Field(default_factory=generate_uuid7)
    case_id: Optional[str] = None
    actor_id: str
    action: str
    resource_type: str
    resource_id: str
    previous_event_hash: str
    event_hash: str
    payload_hash: str
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    details: Dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def compute_event_hash(
        cls,
        prev_hash: str,
        actor_id: str,
        action: str,
        res_type: str,
        res_id: str,
        payload_hash: str,
        timestamp: str,
    ) -> str:
        blob = f"{prev_hash}|{actor_id}|{action}|{res_type}|{res_id}|{payload_hash}|{timestamp}"
        return hashlib.sha256(blob.encode("utf-8")).hexdigest()
