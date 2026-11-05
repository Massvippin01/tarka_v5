"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
PHASE 4 M0: CANONICAL V1 CONTRACT DEFINITIONS

Canonical, versioned, interoperable schemas binding Member A (Forensic Intelligence),
Member B (Privacy, Cryptography, Distributed Systems, Claim Compiler), and
Member C (Evidence Platform, Bounded AI, Evaluation).

Operating Doctrine:
AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
"""

from __future__ import annotations

import re
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field, field_validator, model_validator


# ==============================================================================
# 0. COMMON ENUMS AND VALUE OBJECTS
# ==============================================================================

class TrustTier(str, Enum):
    """Forensic trust tier hierarchy under BSA §63."""
    T1 = "T1"  # Bank switch, Telecom BTS/IPDR, signed blockchain ledger
    T2 = "T2"  # Application server log, OS syslog, mail gateway header
    T3 = "T3"  # Screenshot, exported chat, unverified receipt, manual deposition


class CaseStatus(str, Enum):
    OPEN = "OPEN"
    INVESTIGATION = "INVESTIGATION"
    ADJUDICATION = "ADJUDICATION"
    CHARGESHEET_FILED = "CHARGESHEET_FILED"
    CLOSED = "CLOSED"


class EvidenceSourceType(str, Enum):
    BANK_STATEMENT = "BANK_STATEMENT"
    UPI_GATEWAY = "UPI_GATEWAY"
    IPDR_LOG = "IPDR_LOG"
    CDR_TELECOM = "CDR_TELECOM"
    DEVICE_EXTRACTION = "DEVICE_EXTRACTION"
    WHATSAPP_EXPORT = "WHATSAPP_EXPORT"
    CELL_TOWER_DUMP = "CELL_TOWER_DUMP"
    MANUAL_DEPOSITION = "MANUAL_DEPOSITION"


class IntegrityState(str, Enum):
    INTACT = "INTACT"
    TAMPERED = "TAMPERED"
    UNVERIFIED = "UNVERIFIED"
    DISPUTED = "DISPUTED"


class EvidenceClassification(str, Enum):
    PRIMARY = "PRIMARY"
    SECONDARY = "SECONDARY"
    CORROBORATIVE = "CORROBORATIVE"
    HEARSAY = "HEARSAY"


class EntityType(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    COMPANY = "COMPANY"
    MULE_ACCOUNT = "MULE_ACCOUNT"
    TELECOM_SUBSCRIBER = "TELECOM_SUBSCRIBER"
    DEVICE = "DEVICE"
    MERCHANT = "MERCHANT"


class ReviewState(str, Enum):
    PENDING_REVIEW = "PENDING_REVIEW"
    CONFIRMED_MERGE = "CONFIRMED_MERGE"
    REJECTED_MERGE = "REJECTED_MERGE"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    DISPUTED = "DISPUTED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class RelationshipType(str, Enum):
    TRANSFERRED_FUNDS = "TRANSFERRED_FUNDS"
    COMMUNICATED_WITH = "COMMUNICATED_WITH"
    SHARED_DEVICE = "SHARED_DEVICE"
    GEO_PROXIMATE_TO = "GEO_PROXIMATE_TO"
    BENEFICIARY_OF = "BENEFICIARY_OF"
    NOMINEE_OF = "NOMINEE_OF"


class RelationshipNature(str, Enum):
    OBSERVED = "OBSERVED"
    INFERRED = "INFERRED"


class TransactionType(str, Enum):
    UPI_P2P = "UPI_P2P"
    UPI_P2M = "UPI_P2M"
    NEFT = "NEFT"
    RTGS = "RTGS"
    IMPS = "IMPS"
    ATM_CASH_WITHDRAWAL = "ATM_CASH_WITHDRAWAL"
    POS_PURCHASE = "POS_PURCHASE"
    CRYPTO_ONRAMP = "CRYPTO_ONRAMP"


class TransactionValidationState(str, Enum):
    VALID = "VALID"
    INVALID_CHECKSUM = "INVALID_CHECKSUM"
    DUPLICATE_SUSPECT = "DUPLICATE_SUSPECT"
    MALFORMED = "MALFORMED"


class ReconciliationStatus(str, Enum):
    UNRECONCILED = "UNRECONCILED"
    MATCHED_BOTH_BANKS = "MATCHED_BOTH_BANKS"
    ORPHAN_DEBIT = "ORPHAN_DEBIT"
    ORPHAN_CREDIT = "ORPHAN_CREDIT"
    CONTRADICTORY_AMOUNTS = "CONTRADICTORY_AMOUNTS"


class ClaimType(str, Enum):
    ALIBI = "ALIBI"
    FUND_DISSIPATION = "FUND_DISSIPATION"
    MULE_SYNDICATE = "MULE_SYNDICATE"
    IDENTITY_THEFT = "IDENTITY_THEFT"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    PRESENCE_AT_CRIME_SCENE = "PRESENCE_AT_CRIME_SCENE"


class ClaimState(str, Enum):
    SUPPORTED = "SUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    UNCERTAIN = "UNCERTAIN"
    UNSUPPORTED = "UNSUPPORTED"
    NOT_EVALUATED = "NOT_EVALUATED"


class InstitutionEventType(str, Enum):
    EVIDENCE_INGESTED = "EVIDENCE_INGESTED"
    TRANSACTION_FLAGGED = "TRANSACTION_FLAGGED"
    FREEZE_DIRECTIVE_ISSUED = "FREEZE_DIRECTIVE_ISSUED"
    IDENTITY_LINK_PROPOSED = "IDENTITY_LINK_PROPOSED"
    CASE_STATE_UPDATED = "CASE_STATE_UPDATED"
    AUDIT_CHECKPOINT = "AUDIT_CHECKPOINT"


class EventValidationState(str, Enum):
    COMMITTED = "COMMITTED"
    PENDING = "PENDING"
    CONFLICTED = "CONFLICTED"
    QUARANTINED = "QUARANTINED"


class PSIIdentifierType(str, Enum):
    MSISDN = "MSISDN"
    PAN = "PAN"
    UPI_VPA = "UPI_VPA"
    BANK_ACCOUNT = "BANK_ACCOUNT"
    AADHAAR_HASH = "AADHAAR_HASH"


class PSIPermittedOutput(str, Enum):
    CARDINALITY_ONLY = "CARDINALITY_ONLY"
    BLINDED_INTERSECTION = "BLINDED_INTERSECTION"
    MUTUAL_INTERSECTION = "MUTUAL_INTERSECTION"


class PSIResultState(str, Enum):
    SUCCESS = "SUCCESS"
    UNAUTHORIZED = "UNAUTHORIZED"
    TIMEOUT = "TIMEOUT"
    PARAM_MISMATCH = "PARAM_MISMATCH"


class ZKProvingSystem(str, Enum):
    GROTH16_BN254 = "GROTH16_BN254"
    PLONK_CIRCOM = "PLONK_CIRCOM"
    BULLETPROOFS = "BULLETPROOFS"


class AnnotationTargetType(str, Enum):
    EVIDENCE = "EVIDENCE"
    TRANSACTION = "TRANSACTION"
    ENTITY = "ENTITY"
    TIMELINE_INTERVAL = "TIMELINE_INTERVAL"


class HumanApprovalState(str, Enum):
    PROPOSED = "PROPOSED"
    ACCEPTED_BY_IO = "ACCEPTED_BY_IO"
    REJECTED_BY_IO = "REJECTED_BY_IO"
    MODIFIED_BY_IO = "MODIFIED_BY_IO"


class BenchmarkWorkstream(str, Enum):
    MEMBER_A_GRAPH = "MEMBER_A_GRAPH"
    MEMBER_B_CRYPTO_DISTRIBUTED = "MEMBER_B_CRYPTO_DISTRIBUTED"
    MEMBER_C_EVALUATION = "MEMBER_C_EVALUATION"


# Common Helper Sub-models
class TimeInterval(BaseModel):
    """Valid-time interval capturing observed or active boundaries."""
    start_iso: Optional[str] = Field(None, description="ISO 8601 UTC start")
    end_iso: Optional[str] = Field(None, description="ISO 8601 UTC end")


class AcquisitionMetadata(BaseModel):
    officer_name: str
    officer_badge: str
    acquisition_tool: str
    acquisition_timestamp_utc: str
    storage_location: str


class TransformationStep(BaseModel):
    step_number: int
    operation: str
    tool_or_parser: str
    timestamp_utc: str
    output_hash: str


class MatchingFactor(BaseModel):
    attribute: str
    similarity_score: float = Field(ge=0.0, le=1.0)
    algorithm: str


class ReviewerDecision(BaseModel):
    decision: str  # e.g., "ACCEPTED", "REJECTED", "FURTHER_INQUIRY"
    adjudicator_name: str
    timestamp_iso: str
    rationale: str


class CausalityMetadata(BaseModel):
    lamport_ts: int = Field(ge=0)
    vector_clock: Dict[str, int] = Field(default_factory=dict)


# ==============================================================================
# 1. CANONICAL CASE CONTRACT (Contract 1)
# ==============================================================================

class CanonicalCase(BaseModel):
    """Canonical v1 Case Contract binding investigation context."""
    case_id: str = Field(..., description="Unique case identifier (e.g. CASE_2026_149)")
    fir_number: str = Field(..., description="Formal First Information Report string")
    title: str = Field(..., description="Investigative case title")
    description: str = Field(..., description="Case narrative summary")
    primary_io_name: str = Field(..., description="Investigating Officer name")
    primary_io_badge: str = Field(..., description="Investigating Officer official badge number")
    jurisdiction: str = Field(..., description="Legal jurisdiction or police station")
    incident_time_start_utc: Optional[str] = Field(None, description="Alleged incident start (ISO 8601 UTC)")
    incident_time_end_utc: Optional[str] = Field(None, description="Alleged incident end (ISO 8601 UTC)")
    created_timestamp_utc: str = Field(..., description="Case registration timestamp (ISO 8601 UTC)")
    status: CaseStatus = Field(default=CaseStatus.INVESTIGATION)
    schema_version: str = Field(default="v1.0.0")
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# 2. CANONICAL EVIDENCE CONTRACT (Contract 2)
# ==============================================================================

class CanonicalEvidence(BaseModel):
    """Canonical v1 Evidence Contract. Raw exhibits are append-only and immutable."""
    evidence_id: str = Field(..., description="Stable evidence identifier (e.g. EVID_BANK_001)")
    case_id: str = Field(..., description="Owning case reference")
    source_type: EvidenceSourceType = Field(..., description="Type of evidence exhibit")
    source_identifier: str = Field(..., description="Original filename, S3 URI, or ledger source")
    original_object_ref: str = Field(..., description="Cryptographic vault storage URI")
    sha256_digest: str = Field(..., min_length=64, max_length=64, description="Hex digest of raw exhibit bytes")
    acquisition_metadata: AcquisitionMetadata = Field(..., description="Legal chain of custody details")
    original_event_timestamp: Optional[str] = Field(None, description="Original source string timestamp")
    received_timestamp_utc: str = Field(..., description="Vault ingestion timestamp (ISO 8601 UTC)")
    parser_name: str = Field(..., description="Parser adapter used for normalization")
    parser_version: str = Field(..., description="Version of parser adapter")
    transformation_history: List[TransformationStep] = Field(default_factory=list)
    integrity_state: IntegrityState = Field(default=IntegrityState.INTACT)
    evidence_classification: EvidenceClassification = Field(default=EvidenceClassification.PRIMARY)
    access_restrictions: List[str] = Field(default_factory=list)
    trust_tier: TrustTier = Field(default=TrustTier.T1)
    schema_version: str = Field(default="v1.0.0")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @field_validator("sha256_digest")
    @classmethod
    def validate_sha256(cls, v: str) -> str:
        if not re.match(r"^[0-9a-fA-F]{64}$", v):
            raise ValueError(f"sha256_digest must be a 64-character hex string: {v}")
        return v.lower()


# ==============================================================================
# 3. CANONICAL ENTITY CONTRACT (Contract 3)
# ==============================================================================

class CanonicalEntity(BaseModel):
    """Canonical v1 Entity Contract. Represents resolved investigative subjects."""
    entity_id: str = Field(..., description="Stable entity identifier (e.g. ENT_MULE_001)")
    entity_type: EntityType = Field(..., description="Categorical entity type")
    canonical_name: str = Field(..., description="Primary investigative label or name")
    normalised_identifiers: Dict[str, str] = Field(
        default_factory=dict,
        description="Normalized key-value identifiers (msisdn, pan, upi_vpa, account, device_id)"
    )
    source_evidence_refs: List[str] = Field(
        default_factory=list,
        description="List of evidence_ids supporting this entity"
    )
    matching_factors: List[MatchingFactor] = Field(default_factory=list)
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    uncertainty_notes: Optional[str] = Field(None)
    investigator_review_state: ReviewState = Field(default=ReviewState.PENDING_REVIEW)
    reviewed_by: Optional[str] = Field(None)
    valid_time_interval: TimeInterval = Field(default_factory=TimeInterval)
    schema_version: str = Field(default="v1.0.0")
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# 4. CANONICAL RELATIONSHIP CONTRACT (Contract 4)
# ==============================================================================

class CanonicalRelationship(BaseModel):
    """
    Canonical v1 Relationship Contract.
    Invariant: Common ownership can never be inferred solely from shared IP or device observations.
    """
    relationship_id: str = Field(..., description="Stable relationship identifier (e.g. REL_001)")
    source_entity_id: str = Field(..., description="Originating entity reference")
    target_entity_id: str = Field(..., description="Destination entity reference")
    relationship_type: RelationshipType = Field(..., description="Nature of the connection")
    nature: RelationshipNature = Field(default=RelationshipNature.OBSERVED)
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)
    source_evidence_refs: List[str] = Field(default_factory=list)
    matching_criteria: Dict[str, Any] = Field(default_factory=dict)
    valid_time_interval: TimeInterval = Field(default_factory=TimeInterval)
    contradictory_observations: List[Dict[str, Any]] = Field(default_factory=list)
    investigator_review_state: ReviewState = Field(default=ReviewState.PENDING_REVIEW)
    schema_version: str = Field(default="v1.0.0")
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# 5. CANONICAL TRANSACTION CONTRACT (Contract 5)
# ==============================================================================

class CanonicalTransaction(BaseModel):
    """
    Canonical v1 Transaction Contract.
    Preserves raw and normalized timestamps, reconciliation status, and reverse links.
    """
    transaction_id: str = Field(..., description="Unique transaction reference (e.g. TXN_UPI_001)")
    case_id: str = Field(..., description="Owning case reference")
    source_evidence_id: str = Field(..., description="Source exhibit reference")
    origin_entity_id: Optional[str] = Field(None, description="Resolved source entity")
    destination_entity_id: Optional[str] = Field(None, description="Resolved destination entity")
    origin_account_identifier: str = Field(..., description="Source account or VPA")
    destination_account_identifier: str = Field(..., description="Destination account or VPA")
    amount: float = Field(..., ge=0.0, description="Transaction amount")
    currency: str = Field(default="INR", description="Currency code")
    original_timestamp_raw: str = Field(..., description="Exact raw string from source exhibit")
    normalised_timestamp_utc: str = Field(..., description="ISO 8601 UTC normalized timestamp")
    timestamp_uncertainty_sec: float = Field(default=0.0, ge=0.0)
    transaction_type: TransactionType = Field(default=TransactionType.UPI_P2P)
    is_reversal: bool = Field(default=False)
    reversal_of_transaction_id: Optional[str] = Field(None)
    validation_state: TransactionValidationState = Field(default=TransactionValidationState.VALID)
    reconciliation_status: ReconciliationStatus = Field(default=ReconciliationStatus.UNRECONCILED)
    analytical_annotations: Dict[str, Any] = Field(default_factory=dict)
    schema_version: str = Field(default="v1.0.0")
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# 6. CANONICAL CLAIM CONTRACT (Contract 6 - Claim Compiler)
# ==============================================================================

class CanonicalClaim(BaseModel):
    """
    Canonical v1 Claim Contract (Z3/SMT Compiler).
    Invariant: A solver result must never be presented as proof that a real-world allegation is true.
    """
    claim_id: str = Field(..., description="Unique claim identifier (e.g. CLAIM_ALIBI_001)")
    claim_statement: str = Field(..., description="Investigative hypothesis or alibi statement")
    claim_type: ClaimType = Field(..., description="Classification of claim")
    supporting_observations: List[Dict[str, Any]] = Field(default_factory=list)
    contradictory_observations: List[Dict[str, Any]] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    evidence_dependencies: List[str] = Field(default_factory=list)
    transformation_references: List[str] = Field(default_factory=list)
    verification_constraints: List[str] = Field(default_factory=list)
    counterexamples: List[Dict[str, Any]] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    claim_state: ClaimState = Field(default=ClaimState.NOT_EVALUATED)
    reviewer_decision: Optional[ReviewerDecision] = Field(None)
    version_and_replay_reference: str = Field(..., description="Hash/commit for deterministic replay")
    schema_version: str = Field(default="v1.0.0")
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# 7. CANONICAL INSTITUTION EVENT CONTRACT (Contract 7)
# ==============================================================================

class CanonicalInstitutionEvent(BaseModel):
    """
    Canonical v1 Institution Event Contract.
    Maintains separate source timestamp, received timestamp, and causal Lamport/Vector clocks.
    """
    event_id: str = Field(..., description="Unique event identifier")
    institution_id: str = Field(..., description="Originating banking/telco institution ID")
    event_type: InstitutionEventType = Field(..., description="Categorical event type")
    schema_version: str = Field(default="v1.0.0")
    sequence_number: int = Field(..., ge=0)
    source_timestamp_utc: str = Field(..., description="Original event generation time (ISO 8601 UTC)")
    received_timestamp_utc: str = Field(..., description="Event reception time (ISO 8601 UTC)")
    idempotency_key: str = Field(..., description="Unique key for deduplication")
    payload_commitment: str = Field(..., min_length=64, max_length=64, description="SHA-256 payload digest")
    correlation_id: str = Field(..., description="Cross-system correlation ID")
    causality_metadata: CausalityMetadata = Field(..., description="Lamport and vector clock metadata")
    event_validation_state: EventValidationState = Field(default=EventValidationState.COMMITTED)
    prior_event_reference: Optional[str] = Field(None)
    signature_reference: Optional[str] = Field(None)
    payload: Dict[str, Any] = Field(default_factory=dict)


# ==============================================================================
# 8. CANONICAL PSI REQUEST CONTRACT (Contract 8)
# ==============================================================================

class CanonicalPSIRequest(BaseModel):
    """
    Canonical v1 Private Set Intersection (PSI) Request.
    Enforces statutory warrant references and strictly bounded output scopes.
    """
    request_id: str = Field(..., description="Unique PSI query identifier")
    case_id: str = Field(..., description="Investigative case reference")
    requesting_institution_id: str = Field(..., description="Institution initiating the request")
    participating_institution_ids: List[str] = Field(..., min_length=2)
    identifier_type: PSIIdentifierType = Field(..., description="Target correlation identifier type")
    normalisation_profile: str = Field(default="CANONICAL_V1")
    protocol_identifier: str = Field(default="ECDH_SECP256K1_PSI")
    protocol_version: str = Field(default="1.0")
    permitted_output: PSIPermittedOutput = Field(default=PSIPermittedOutput.CARDINALITY_ONLY)
    statutory_authorisation_ref: str = Field(..., description="BSA §63 warrant / statutory order reference")
    audit_reference: str = Field(..., description="Audit ledger index")
    created_timestamp_utc: str = Field(...)
    schema_version: str = Field(default="v1.0.0")


# ==============================================================================
# 9. CANONICAL PSI RESULT CONTRACT (Contract 9)
# ==============================================================================

class CanonicalPSIResult(BaseModel):
    """
    Canonical v1 Private Set Intersection (PSI) Result.
    Never exposes raw un-blinded identifiers or foreign datasets.
    """
    result_id: str = Field(...)
    request_id: str = Field(...)
    participating_institution_ids: List[str] = Field(...)
    result_state: PSIResultState = Field(default=PSIResultState.SUCCESS)
    intersection_cardinality: int = Field(..., ge=0)
    matched_blinded_tokens: List[str] = Field(default_factory=list)
    execution_duration_ms: float = Field(..., ge=0.0)
    audit_ledger_hash: str = Field(..., min_length=64, max_length=64)
    timestamp_utc: str = Field(...)
    schema_version: str = Field(default="v1.0.0")


# ==============================================================================
# 10. CANONICAL ZK PROOF METADATA CONTRACT (Contract 10)
# ==============================================================================

class CanonicalZKProofMetadata(BaseModel):
    """
    Canonical v1 Zero-Knowledge Proof Metadata.
    Never exposes private witnesses or secret scalars.
    """
    proof_id: str = Field(...)
    circuit_identifier: str = Field(...)
    circuit_version: str = Field(...)
    public_inputs: Dict[str, Any] = Field(default_factory=dict)
    commitment_reference: str = Field(..., description="Merkle root or Pedersen commitment")
    proving_system: ZKProvingSystem = Field(default=ZKProvingSystem.GROTH16_BN254)
    verification_key_reference: str = Field(...)
    proof_size_bytes: int = Field(..., ge=0)
    proving_duration_ms: float = Field(..., ge=0.0)
    verification_duration_ms: float = Field(..., ge=0.0)
    verification_result: bool = Field(...)
    setup_assumptions: str = Field(default="POWERS_OF_TAU_TRUSTED_SETUP")
    schema_version: str = Field(default="v1.0.0")


# ==============================================================================
# 11. CANONICAL AI ANNOTATION CONTRACT (Contract 11)
# ==============================================================================

class CanonicalAIAnnotation(BaseModel):
    """
    Canonical v1 AI Annotation Contract.
    Invariant: AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
    Structured rationale only; never logs or exposes private chain-of-thought.
    """
    annotation_id: str = Field(...)
    case_id: str = Field(...)
    target_object_type: AnnotationTargetType = Field(...)
    target_object_id: str = Field(...)
    model_identifier: str = Field(...)
    prompt_template_version: str = Field(...)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    investigative_rationale: str = Field(..., description="Evidence-grounded structured rationale")
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradictions_identified: List[str] = Field(default_factory=list)
    human_approval_state: HumanApprovalState = Field(default=HumanApprovalState.PROPOSED)
    approved_by_officer: Optional[str] = Field(None)
    approval_timestamp_utc: Optional[str] = Field(None)
    schema_version: str = Field(default="v1.0.0")


# ==============================================================================
# 12. CANONICAL BENCHMARK RESULT CONTRACT (Contract 12)
# ==============================================================================

class CanonicalBenchmarkResult(BaseModel):
    """Canonical v1 Empirical Benchmark Result Contract."""
    benchmark_id: str = Field(...)
    suite_name: str = Field(...)
    workstream: BenchmarkWorkstream = Field(...)
    timestamp_utc: str = Field(...)
    total_cases_evaluated: int = Field(..., ge=0)
    throughput_records_per_sec: float = Field(..., ge=0.0)
    latency_p50_ms: float = Field(..., ge=0.0)
    latency_p95_ms: float = Field(..., ge=0.0)
    latency_p99_ms: float = Field(..., ge=0.0)
    hardware_environment: Dict[str, str] = Field(default_factory=dict)
    memory_peak_mb: float = Field(..., ge=0.0)
    metrics_payload: Dict[str, Any] = Field(default_factory=dict)
    schema_version: str = Field(default="v1.0.0")


# ==============================================================================
# 13. COMMON API ENVELOPES AND ERROR STRUCTURES
# ==============================================================================

T = TypeVar("T")


class APIResponseMetadata(BaseModel):
    schema_version: str = "v1.0.0"
    timestamp_utc: str
    correlation_id: str


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: T
    metadata: APIResponseMetadata


class APIErrorDetail(BaseModel):
    code: str
    message: str
    field: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)


class APIErrorBody(BaseModel):
    code: str
    message: str
    details: List[APIErrorDetail] = Field(default_factory=list)
    timestamp_utc: str
    correlation_id: str


class APIErrorResponse(BaseModel):
    success: bool = False
    error: APIErrorBody


class PaginationMetadata(BaseModel):
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=1000)
    total_records: int = Field(ge=0)
    total_pages: int = Field(ge=0)
    has_next: bool
    has_prev: bool


class PaginatedResponse(BaseModel, Generic[T]):
    success: bool = True
    data: List[T]
    pagination: PaginationMetadata
    metadata: APIResponseMetadata

