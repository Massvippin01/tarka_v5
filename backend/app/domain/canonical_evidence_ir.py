from __future__ import annotations

import os
import time
import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


def generate_uuid7() -> str:
    """
    Generate an RFC 9562 / RFC 4122 compliant UUIDv7 string.
    Ensures time-ordered uniqueness (48-bit unix ms timestamp + version 7 + variant 2 + random).
    """
    ms = time.time_ns() // 1_000_000
    rand = os.urandom(10)
    time_low = (ms >> 16) & 0xFFFFFFFF
    time_mid = ms & 0xFFFF
    time_hi_and_version = 0x7000 | (int.from_bytes(rand[:2], "big") & 0x0FFF)
    clock_seq_hi = (int.from_bytes(rand[2:3], "big") & 0x3F) | 0x80
    clock_seq_low = int.from_bytes(rand[3:4], "big")
    node = int.from_bytes(rand[4:10], "big")
    return str(uuid.UUID(fields=(time_low, time_mid, time_hi_and_version, clock_seq_hi, clock_seq_low, node)))


class SourceProvenanceType(str, Enum):
    """
    Mandatory classification explicitly distinguishing live integrations from simulations and synthetic data.
    """
    LIVE_INTEGRATION = "LIVE_INTEGRATION"
    SIMULATED_AUTHORIZED_SOURCE = "SIMULATED_AUTHORIZED_SOURCE"
    SYNTHETIC_DATA = "SYNTHETIC_DATA"
    USER_UPLOADED_EVIDENCE = "USER_UPLOADED_EVIDENCE"


class EvidenceSourceType(str, Enum):
    """
    11 Planned Adapter Families covering authorized exports and investigative streams.
    """
    CCTNS_FIR = "CCTNS_FIR"
    ICJS_RECORD = "ICJS_RECORD"
    EFSL_REPORT = "EFSL_REPORT"
    CDR_TELECOM = "CDR_TELECOM"
    FINANCIAL_TRANSACTION = "FINANCIAL_TRANSACTION"
    MOBILE_FORENSIC_EXPORT = "MOBILE_FORENSIC_EXPORT"
    COMPUTER_FORENSIC_EXPORT = "COMPUTER_FORENSIC_EXPORT"
    CLOUD_AUDIT_LOG = "CLOUD_AUDIT_LOG"
    CCTV_ANPR = "CCTV_ANPR"
    NETWORK_PCAP_LOG = "NETWORK_PCAP_LOG"
    FORENSIC_DOCUMENT = "FORENSIC_DOCUMENT"


class IntegrityStatus(str, Enum):
    VERIFIED = "VERIFIED"
    QUARANTINED = "QUARANTINED"
    MISMATCH = "MISMATCH"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class CustodyEventType(str, Enum):
    ACQUISITION = "ACQUISITION"
    INGESTION_RECEIPT = "INGESTION_RECEIPT"
    HASH_VERIFICATION = "HASH_VERIFICATION"
    QUARANTINE = "QUARANTINE"
    PARSER_EXTRACTION = "PARSER_EXTRACTION"
    TRANSFER_CUSTODY = "TRANSFER_CUSTODY"
    ACCESS_AUDIT = "ACCESS_AUDIT"


class SourceReliability(str, Enum):
    """Admiralty Code Source Reliability Standard"""
    A_COMPLETELY_RELIABLE = "A_COMPLETELY_RELIABLE"
    B_USUALLY_RELIABLE = "B_USUALLY_RELIABLE"
    C_FAIRLY_RELIABLE = "C_FAIRLY_RELIABLE"
    D_NOT_USUALLY_RELIABLE = "D_NOT_USUALLY_RELIABLE"
    E_UNRELIABLE = "E_UNRELIABLE"
    F_RELIABILITY_CANNOT_BE_JUDGED = "F_RELIABILITY_CANNOT_BE_JUDGED"


class CorroborationLevel(str, Enum):
    UNSPECIFIED = "UNSPECIFIED"
    SINGLE_SOURCE = "SINGLE_SOURCE"
    CORROBORATED = "CORROBORATED"
    CONTRADICTED = "CONTRADICTED"


class EpistemicStatus(str, Enum):
    FACT = "FACT"
    INFERENCE = "INFERENCE"
    HYPOTHESIS = "HYPOTHESIS"
    DECISION = "DECISION"


class EvidenceCustodyEvent(BaseModel):
    custody_event_id: str = Field(default_factory=generate_uuid7)
    artifact_id: str
    event_type: CustodyEventType
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    actor_id: str
    actor_role: str
    action_description: str
    content_hash_at_event: str
    storage_location: str
    previous_event_id: Optional[str] = None
    signature: Optional[str] = None


class EvidenceArtifact(BaseModel):
    """
    Canonical representation of any digital forensic artifact or authorized export.
    Artifact ID is a UUIDv7, while Content Hash is the full SHA-256 cryptographic digest.
    Original evidence is immutable and append-only.
    """
    artifact_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    source_id: str
    source_type: EvidenceSourceType
    provenance_type: SourceProvenanceType = SourceProvenanceType.SYNTHETIC_DATA
    record_id: str  # Source/external record ID
    artifact_type: str  # e.g., "RAW_EXPORT", "EXTRACTED_IMAGE", "JSON_PAYLOAD", "PDF_DOCUMENT"
    content_hash: str  # Full 64-char SHA-256
    hash_algorithm: str = "SHA-256"
    file_size_bytes: int
    mime_type: str
    storage_uri: str
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    observed_at: Optional[str] = None
    acquired_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    acquisition_method: str = "AUTOMATED_ADAPTER_INGESTION"
    operator_id: str = "SYSTEM_INGEST_GATEWAY"
    jurisdiction: str = "NATIONAL_JURISDICTION"
    classification: str = "CONFIDENTIAL_LAW_ENFORCEMENT"
    parent_artifact_id: Optional[str] = None
    parser: Optional[str] = None
    parser_version: Optional[str] = None
    integrity_status: IntegrityStatus = IntegrityStatus.VERIFIED
    custody_chain: List[EvidenceCustodyEvent] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvidenceObservation(BaseModel):
    """
    Atomic raw observation extracted directly from an artifact by a source adapter parser.
    """
    observation_id: str = Field(default_factory=generate_uuid7)
    artifact_id: str
    case_id: str
    source_location: str  # Page, line, byte offset, record index, JSON path
    observation_type: str  # CALL_RECORD, VEHICLE_SIGHTING, BANK_TRANSFER, CHAT_MESSAGE, etc.
    observed_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    location_label: Optional[str] = None
    geo_point: Optional[Dict[str, float]] = None  # {"lat": ..., "lng": ...}
    raw_data: Dict[str, Any] = Field(default_factory=dict)
    extraction_method: str = "DETERMINISTIC_PARSER"
    parser_version: str = "1.0.0"


class EvidenceFact(BaseModel):
    """
    Immutable extracted factual statement.
    CRITICAL RULE: Never detach a derived fact from its source evidence artifact.
    """
    fact_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    subject: str  # Entity ID or Canonical Key (e.g. "P001", "PH001")
    predicate: str  # Relationship or attribute (e.g. "CONTACTED", "TRANSFERRED_FUNDS", "OWNS")
    object: str  # Target Entity ID or Literal (e.g. "PH002", "125000.00")
    source_artifact_id: str
    source_observation_id: Optional[str] = None
    source_location: str
    observed_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    extraction_method: str = "DETERMINISTIC_EXTRACTION"
    
    # Strictly separated epistemological & analytical dimensions:
    extraction_confidence: float = 1.0  # Parser extraction certainty (0.0 - 1.0)
    source_reliability: SourceReliability = SourceReliability.A_COMPLETELY_RELIABLE
    corroboration_level: CorroborationLevel = CorroborationLevel.SINGLE_SOURCE
    epistemic_status: EpistemicStatus = EpistemicStatus.FACT
    
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradicting_evidence_ids: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    version: int = 1  # Append-only versioning


class EvidenceProvenance(BaseModel):
    """
    Complete cryptographic pedigree of an artifact and its derived facts.
    """
    provenance_id: str = Field(default_factory=generate_uuid7)
    artifact_id: str
    root_artifact_hash: str
    provenance_type: SourceProvenanceType
    source_system: str
    acquisition_audit_id: str
    lineage_steps: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class ClaimStatus(str, Enum):
    PROPOSED = "PROPOSED"
    SUPPORTED = "SUPPORTED"
    CORROBORATED = "CORROBORATED"
    CONTRADICTED = "CONTRADICTED"
    UNVERIFIED = "UNVERIFIED"
    RESOLVED = "RESOLVED"
    SUPERSEDED = "SUPERSEDED"


class ContradictionType(str, Enum):
    TEMPORAL = "TEMPORAL"
    SPATIAL = "SPATIAL"
    IDENTITY = "IDENTITY"
    DOCUMENT = "DOCUMENT"
    SOURCE = "SOURCE"
    METADATA = "METADATA"
    RELATIONSHIP = "RELATIONSHIP"
    CHAIN_OF_CUSTODY = "CHAIN_OF_CUSTODY"


class ContradictionSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class GapType(str, Enum):
    IDENTITY_VERIFICATION = "IDENTITY_VERIFICATION"
    SOURCE_CORROBORATION = "SOURCE_CORROBORATION"
    TIMELINE_VERIFICATION = "TIMELINE_VERIFICATION"
    LOCATION_VERIFICATION = "LOCATION_VERIFICATION"
    OWNERSHIP_VERIFICATION = "OWNERSHIP_VERIFICATION"
    CHAIN_OF_CUSTODY = "CHAIN_OF_CUSTODY"
    AUTHENTICITY_VERIFICATION = "AUTHENTICITY_VERIFICATION"
    MISSING_ARTIFACT = "MISSING_ARTIFACT"
    MISSING_METADATA = "MISSING_METADATA"
    TEMPORAL_COVERAGE = "TEMPORAL_COVERAGE"
    RELATIONSHIP_CORROBORATION = "RELATIONSHIP_CORROBORATION"


class EvidenceClaim(BaseModel):
    """
    Epistemic claim generated by analytical reasoning or investigator assertions.
    Traceable directly to supporting and contradicting evidence facts.
    Statuses strictly avoid TRUE/FALSE/GUILTY/INNOCENT.
    """
    claim_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    assertion_text: str
    status: ClaimStatus = ClaimStatus.PROPOSED
    epistemic_status: EpistemicStatus = EpistemicStatus.INFERENCE
    supporting_fact_ids: List[str] = Field(default_factory=list)
    contradicting_fact_ids: List[str] = Field(default_factory=list)
    supporting_artifact_ids: List[str] = Field(default_factory=list)
    contradicting_artifact_ids: List[str] = Field(default_factory=list)
    source_reliability: SourceReliability = SourceReliability.B_USUALLY_RELIABLE
    corroboration: CorroborationLevel = CorroborationLevel.UNSPECIFIED
    confidence_score: float = 0.5
    analytical_method: str = "GRAPH_CORRELATION"
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

    @property
    def fact_ids(self) -> List[str]:
        """Backward compatibility helper combining supporting and contradicting facts."""
        return self.supporting_fact_ids + self.contradicting_fact_ids


class EvidenceContradiction(BaseModel):
    """
    First-class contradiction record detecting conflicts without silently resolving them.
    """
    contradiction_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    claim_id: Optional[str] = None
    fact_a: str  # ID or description of first fact
    fact_b: str  # ID or description of conflicting fact
    contradiction_type: ContradictionType
    reason: str
    severity: ContradictionSeverity = ContradictionSeverity.HIGH
    detector: str = "TEMPORAL_SPATIAL_CONSISTENCY_ENGINE"
    detector_version: str = "1.0.0"
    uncertainty: float = 0.0
    status: str = "OPEN"  # OPEN, UNDER_VERIFICATION, RESOLVED, DISMISSED
    required_verification: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    resolved_at: Optional[str] = None


class EvidenceGap(BaseModel):
    """
    First-class investigative gap synthesized from missing evidence requirements.
    """
    gap_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    gap_type: GapType
    title: str
    description: str
    hypothesis_id: Optional[str] = None
    required_evidence_type: str = ""
    available_evidence_ids: List[str] = Field(default_factory=list)
    missing_evidence_description: str = ""
    impact: str = ""
    recommended_action: str = ""
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    status: str = "OPEN"    # OPEN, IN_PROGRESS, RESOLVED, WAIVED
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    resolved_at: Optional[str] = None


class EvidenceHypothesis(BaseModel):
    """
    Investigative hypothesis evaluated against ground truth evidence facts and gaps.
    """
    hypothesis_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    code: str = "H1"
    title: str
    description: str
    supporting_fact_ids: List[str] = Field(default_factory=list)
    contradicting_fact_ids: List[str] = Field(default_factory=list)
    open_gap_ids: List[str] = Field(default_factory=list)
    status: str = "PROPOSED"
    confidence_score: float = 0.5
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class InvestigationSnapshot(BaseModel):
    """
    Point-in-time snapshot of the investigation graph and evidence state.
    """
    snapshot_id: str = Field(default_factory=generate_uuid7)
    case_id: str
    snapshot_timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    artifact_count: int
    fact_count: int
    entity_count: int
    relationship_count: int
    open_contradictions_count: int
    open_gaps_count: int
    state_hash: str

