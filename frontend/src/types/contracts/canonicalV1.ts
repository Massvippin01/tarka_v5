/**
 * TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
 * PHASE 4 M0: CANONICAL V1 CONTRACT DEFINITIONS (TYPESCRIPT MIRROR)
 * 
 * Strict 1:1 typed contract definitions reflecting backend Pydantic v1 schemas.
 * Governed by the doctrine:
 * AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
 */

// ==============================================================================
// 0. COMMON ENUMS AND VALUE OBJECTS
// ==============================================================================

export type TrustTier = "T1" | "T2" | "T3";

export type CaseStatus = 
  | "OPEN" 
  | "INVESTIGATION" 
  | "ADJUDICATION" 
  | "CHARGESHEET_FILED" 
  | "CLOSED";

export type EvidenceSourceType =
  | "BANK_STATEMENT"
  | "UPI_GATEWAY"
  | "IPDR_LOG"
  | "CDR_TELECOM"
  | "DEVICE_EXTRACTION"
  | "WHATSAPP_EXPORT"
  | "CELL_TOWER_DUMP"
  | "MANUAL_DEPOSITION";

export type IntegrityState = 
  | "INTACT" 
  | "TAMPERED" 
  | "UNVERIFIED" 
  | "DISPUTED";

export type EvidenceClassification = 
  | "PRIMARY" 
  | "SECONDARY" 
  | "CORROBORATIVE" 
  | "HEARSAY";

export type EntityType = 
  | "PERSON"
  | "INDIVIDUAL" 
  | "BANK_ACCOUNT"
  | "UPI_ID"
  | "PHONE_NUMBER"
  | "DEVICE"
  | "IP_ADDRESS"
  | "COMPANY" 
  | "MULE_ACCOUNT" 
  | "TELECOM_SUBSCRIBER" 
  | "MERCHANT";

export type AmbiguityType =
  | "NONE"
  | "SHARED_HOTSPOT"
  | "CGNAT_POOL"
  | "PUBLIC_WIFI"
  | "CELL_TOWER_SECTOR"
  | "MULTI_USER_DEVICE";

export type ReviewState = 
  | "PENDING_REVIEW" 
  | "CONFIRMED_MERGE" 
  | "REJECTED_MERGE" 
  | "VERIFIED" 
  | "REJECTED" 
  | "DISPUTED" 
  | "INSUFFICIENT_EVIDENCE";

export type RelationshipType = 
  | "TRANSFERRED_FUNDS" 
  | "COMMUNICATED_WITH" 
  | "SHARED_DEVICE" 
  | "SHARED_NETWORK"
  | "CO_LOCATED_IP"
  | "GEO_PROXIMATE_TO" 
  | "BENEFICIARY_OF" 
  | "NOMINEE_OF";

export type RelationshipNature = "OBSERVED" | "INFERRED";

export type TransactionType = 
  | "UPI_P2P" 
  | "UPI_P2M" 
  | "NEFT" 
  | "RTGS" 
  | "IMPS" 
  | "ATM_CASH_WITHDRAWAL" 
  | "POS_PURCHASE" 
  | "CRYPTO_ONRAMP";

export type TransactionValidationState = 
  | "VALID" 
  | "INVALID_CHECKSUM" 
  | "DUPLICATE_SUSPECT" 
  | "MALFORMED";

export type ReconciliationStatus = 
  | "UNRECONCILED" 
  | "MATCHED_BOTH_BANKS" 
  | "ORPHAN_DEBIT" 
  | "ORPHAN_CREDIT" 
  | "CONTRADICTORY_AMOUNTS";

export type ClaimType = 
  | "ALIBI" 
  | "FUND_DISSIPATION" 
  | "MULE_SYNDICATE" 
  | "IDENTITY_THEFT" 
  | "UNAUTHORIZED_ACCESS" 
  | "PRESENCE_AT_CRIME_SCENE";

export type ClaimState = 
  | "SUPPORTED" 
  | "CONTRADICTED" 
  | "UNCERTAIN" 
  | "UNSUPPORTED" 
  | "NOT_EVALUATED";

export type InstitutionEventType = 
  | "EVIDENCE_INGESTED" 
  | "TRANSACTION_FLAGGED" 
  | "FREEZE_DIRECTIVE_ISSUED" 
  | "IDENTITY_LINK_PROPOSED" 
  | "CASE_STATE_UPDATED" 
  | "AUDIT_CHECKPOINT";

export type EventValidationState = 
  | "COMMITTED" 
  | "PENDING" 
  | "CONFLICTED" 
  | "QUARANTINED";

export type PSIIdentifierType = 
  | "MSISDN" 
  | "PAN" 
  | "UPI_VPA" 
  | "BANK_ACCOUNT" 
  | "AADHAAR_HASH";

export type PSIPermittedOutput = 
  | "CARDINALITY_ONLY" 
  | "BLINDED_INTERSECTION" 
  | "MUTUAL_INTERSECTION";

export type PSIResultState = 
  | "SUCCESS" 
  | "UNAUTHORIZED" 
  | "TIMEOUT" 
  | "PARAM_MISMATCH";

export type ZKProvingSystem = 
  | "GROTH16_BN254" 
  | "PLONK_CIRCOM" 
  | "BULLETPROOFS";

export type AnnotationTargetType = 
  | "EVIDENCE" 
  | "TRANSACTION" 
  | "ENTITY" 
  | "TIMELINE_INTERVAL";

export type HumanApprovalState = 
  | "PROPOSED" 
  | "ACCEPTED_BY_IO" 
  | "REJECTED_BY_IO" 
  | "MODIFIED_BY_IO";

export type BenchmarkWorkstream = 
  | "MEMBER_A_GRAPH" 
  | "MEMBER_B_CRYPTO_DISTRIBUTED" 
  | "MEMBER_C_EVALUATION";

// Common Helper Interfaces
export interface TimeInterval {
  start_iso?: string | null;
  end_iso?: string | null;
}

export interface AcquisitionMetadata {
  officer_name: string;
  officer_badge: string;
  acquisition_tool: string;
  acquisition_timestamp_utc: string;
  storage_location: string;
}

export interface TransformationStep {
  step_number: number;
  operation: string;
  tool_or_parser: string;
  timestamp_utc: string;
  output_hash: string;
}

export interface MatchingFactor {
  attribute: string;
  similarity_score: number;
  algorithm: string;
}

export interface ReviewerDecision {
  decision: string;
  adjudicator_name: string;
  timestamp_iso: string;
  rationale: string;
}

export interface CausalityMetadata {
  lamport_ts: number;
  vector_clock: Record<string, number>;
}

// ==============================================================================
// 1. CANONICAL CASE CONTRACT (Contract 1)
// ==============================================================================

export interface CanonicalCase {
  case_id: string;
  fir_number: string;
  title: string;
  description: string;
  primary_io_name: string;
  primary_io_badge: string;
  jurisdiction: string;
  incident_time_start_utc?: string | null;
  incident_time_end_utc?: string | null;
  created_timestamp_utc: string;
  status: CaseStatus;
  schema_version: string;
  metadata?: Record<string, unknown>;
}

// ==============================================================================
// 2. CANONICAL EVIDENCE CONTRACT (Contract 2)
// ==============================================================================

export interface CanonicalEvidence {
  evidence_id: string;
  case_id: string;
  source_type: EvidenceSourceType;
  source_identifier: string;
  original_object_ref: string;
  sha256_digest: string;
  acquisition_metadata: AcquisitionMetadata;
  original_event_timestamp?: string | null;
  received_timestamp_utc: string;
  parser_name: string;
  parser_version: string;
  transformation_history: TransformationStep[];
  integrity_state: IntegrityState;
  evidence_classification: EvidenceClassification;
  access_restrictions: string[];
  trust_tier: TrustTier;
  schema_version: string;
  metadata?: Record<string, unknown>;
}

// ==============================================================================
// 3. CANONICAL ENTITY CONTRACT (Contract 3)
// ==============================================================================

export interface EntityProvenance {
  source_evidence_id: string;
  attribute_name: string;
  observed_raw_value: string;
  normalized_value: string;
  acquisition_tool?: string;
  confidence_score: number;
  timestamp_utc: string;
}

export interface CanonicalEntity {
  entity_id: string;
  entity_type: EntityType;
  canonical_name: string;
  normalised_identifiers: Record<string, string>;
  source_evidence_refs: string[];
  matching_factors: MatchingFactor[];
  confidence_score: number;
  uncertainty_notes?: string | null;
  entity_provenance?: EntityProvenance[];
  historical_identifiers?: Record<string, Array<Record<string, unknown>>>;
  investigator_review_state: ReviewState;
  reviewed_by?: string | null;
  valid_time_interval: TimeInterval;
  schema_version: string;
  metadata?: Record<string, unknown>;
}

// ==============================================================================
// 4. CANONICAL RELATIONSHIP CONTRACT (Contract 4)
// ==============================================================================

export interface CanonicalRelationship {
  relationship_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: RelationshipType;
  nature: RelationshipNature;
  confidence_score: number;
  source_evidence_refs: string[];
  matching_criteria: Record<string, unknown>;
  ambiguity_type?: AmbiguityType;
  ambiguity_caution_notice?: string | null;
  valid_time_interval: TimeInterval;
  contradictory_observations: Record<string, unknown>[];
  investigator_review_state: ReviewState;
  schema_version: string;
  metadata?: Record<string, unknown>;
}

// ==============================================================================
// 5. CANONICAL TRANSACTION CONTRACT (Contract 5)
// ==============================================================================

export interface CanonicalTransaction {
  transaction_id: string;
  case_id: string;
  source_evidence_id: string;
  origin_entity_id?: string | null;
  destination_entity_id?: string | null;
  origin_account_identifier: string;
  destination_account_identifier: string;
  amount: number;
  currency: string;
  original_timestamp_raw: string;
  normalised_timestamp_utc: string;
  timestamp_uncertainty_sec: number;
  transaction_type: TransactionType;
  is_reversal: boolean;
  reversal_of_transaction_id?: string | null;
  validation_state: TransactionValidationState;
  reconciliation_status: ReconciliationStatus;
  analytical_annotations: Record<string, unknown>;
  schema_version: string;
  metadata?: Record<string, unknown>;
}

// ==============================================================================
// 6. CANONICAL CLAIM CONTRACT (Contract 6)
// ==============================================================================

export interface CanonicalClaim {
  claim_id: string;
  claim_statement: string;
  claim_type: ClaimType;
  supporting_observations: Record<string, unknown>[];
  contradictory_observations: Record<string, unknown>[];
  assumptions: string[];
  evidence_dependencies: string[];
  transformation_references: string[];
  verification_constraints: string[];
  counterexamples: Record<string, unknown>[];
  limitations: string[];
  claim_state: ClaimState;
  reviewer_decision?: ReviewerDecision | null;
  version_and_replay_reference: string;
  schema_version: string;
  metadata?: Record<string, unknown>;
}

// ==============================================================================
// 7. CANONICAL INSTITUTION EVENT CONTRACT (Contract 7)
// ==============================================================================

export interface CanonicalInstitutionEvent {
  event_id: string;
  institution_id: string;
  event_type: InstitutionEventType;
  schema_version: string;
  sequence_number: number;
  source_timestamp_utc: string;
  received_timestamp_utc: string;
  idempotency_key: string;
  payload_commitment: string;
  correlation_id: string;
  causality_metadata: CausalityMetadata;
  event_validation_state: EventValidationState;
  prior_event_reference?: string | null;
  signature_reference?: string | null;
  payload: Record<string, unknown>;
}

// ==============================================================================
// 8. CANONICAL PSI REQUEST CONTRACT (Contract 8)
// ==============================================================================

export interface CanonicalPSIRequest {
  request_id: string;
  case_id: string;
  requesting_institution_id: string;
  participating_institution_ids: string[];
  identifier_type: PSIIdentifierType;
  normalisation_profile: string;
  protocol_identifier: string;
  protocol_version: string;
  permitted_output: PSIPermittedOutput;
  statutory_authorisation_ref: string;
  audit_reference: string;
  created_timestamp_utc: string;
  schema_version: string;
}

// ==============================================================================
// 9. CANONICAL PSI RESULT CONTRACT (Contract 9)
// ==============================================================================

export interface CanonicalPSIResult {
  result_id: string;
  request_id: string;
  participating_institution_ids: string[];
  result_state: PSIResultState;
  intersection_cardinality: number;
  matched_blinded_tokens: string[];
  execution_duration_ms: number;
  audit_ledger_hash: string;
  timestamp_utc: string;
  schema_version: string;
}

// ==============================================================================
// 10. CANONICAL ZK PROOF METADATA CONTRACT (Contract 10)
// ==============================================================================

export interface CanonicalZKProofMetadata {
  proof_id: string;
  circuit_identifier: string;
  circuit_version: string;
  public_inputs: Record<string, unknown>;
  commitment_reference: string;
  proving_system: ZKProvingSystem;
  verification_key_reference: string;
  proof_size_bytes: number;
  proving_duration_ms: number;
  verification_duration_ms: number;
  verification_result: boolean;
  setup_assumptions: string;
  schema_version: string;
}

// ==============================================================================
// 11. CANONICAL AI ANNOTATION CONTRACT (Contract 11)
// ==============================================================================

export interface CanonicalAIAnnotation {
  annotation_id: string;
  case_id: string;
  target_object_type: AnnotationTargetType;
  target_object_id: string;
  model_identifier: string;
  prompt_template_version: string;
  confidence_score: number;
  investigative_rationale: string;
  supporting_evidence_ids: string[];
  contradictions_identified: string[];
  human_approval_state: HumanApprovalState;
  approved_by_officer?: string | null;
  approval_timestamp_utc?: string | null;
  schema_version: string;
}

// ==============================================================================
// 12. CANONICAL BENCHMARK RESULT CONTRACT (Contract 12)
// ==============================================================================

export interface CanonicalBenchmarkResult {
  benchmark_id: string;
  suite_name: string;
  workstream: BenchmarkWorkstream;
  timestamp_utc: string;
  total_cases_evaluated: number;
  throughput_records_per_sec: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  hardware_environment: Record<string, string>;
  memory_peak_mb: number;
  metrics_payload: Record<string, unknown>;
  schema_version: string;
}

// ==============================================================================
// 13. COMMON API ENVELOPES
// ==============================================================================

export interface APIResponseMetadata {
  schema_version: string;
  timestamp_utc: string;
  correlation_id: string;
}

export interface APIResponse<T> {
  success: boolean;
  data: T;
  metadata: APIResponseMetadata;
}

export interface APIErrorDetail {
  code: string;
  message: string;
  field?: string;
  context?: Record<string, unknown>;
}

export interface APIErrorBody {
  code: string;
  message: string;
  details: APIErrorDetail[];
  timestamp_utc: string;
  correlation_id: string;
}

export interface APIErrorResponse {
  success: false;
  error: APIErrorBody;
}

export interface PaginationMetadata {
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMetadata;
  metadata: APIResponseMetadata;
}

