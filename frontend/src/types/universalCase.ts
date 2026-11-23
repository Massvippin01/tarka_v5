/**
 * TARKA Universal Case Model (UCM) & Canonical Frontend Contracts.
 * Document Version: 1.0.0-PROD
 * Operating Philosophy: AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.
 * Non-Promotability Invariant: human_verified defaults to false.
 */

export type CaseStatus = "ACTIVE" | "UNDER_REVIEW" | "CLOSED" | "ARCHIVED";
export type CaseClassification = "UNCLASSIFIED" | "CONFIDENTIAL" | "RESTRICTED" | "SECRET";
export type EvidenceProcessingStatus = "RECEIVED" | "VALIDATED" | "PROCESSING" | "EXTRACTED" | "FAILED" | "QUARANTINED";

export type ObservationType =
  | "FINANCIAL_TRANSACTION"
  | "CALL_DETAIL_RECORD"
  | "CHAT_MESSAGE"
  | "LOCATION_PING"
  | "IMAGE_EXIF"
  | "OCR_TEXT_REGION"
  | "SYSTEM_LOG";

export type FindingType =
  | "DIRECT_OBSERVATION"
  | "EXTRACTED_INFORMATION"
  | "CORRELATION"
  | "INFERENCE"
  | "UNVERIFIED_HYPOTHESIS"
  | "CONTRADICTION"
  | "MISSING_EVIDENCE";

export type FindingStatus = "OPEN" | "ACCEPTED" | "REJECTED" | "RESOLVED" | "UNDER_HUMAN_REVIEW";

export type EntityMatchBasis =
  | "EXACT_IDENTIFIER"
  | "PROBABLE_MATCH"
  | "POSSIBLE_ASSOCIATION"
  | "UNVERIFIED_RELATIONSHIP";

export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface AccessPolicy {
  allowed_roles: string[];
  allowed_jurisdictions: string[];
  minimum_clearance: string;
  requires_statutory_purpose: boolean;
}

export interface UniversalCase {
  schema_version: string;
  case_id: string;
  case_type: string;
  title: string;
  description?: string;
  jurisdiction: string;
  organisation_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: CaseStatus;
  classification: CaseClassification;
  access_policy: AccessPolicy;
  metadata: Record<string, unknown>;
}

export interface UniversalEvidence {
  schema_version: string;
  evidence_id: string;
  case_id: string;
  original_filename: string;
  media_type: string;
  file_size: number;
  sha256: string;
  storage_reference: string;
  source_channel: string;
  submitted_by: string;
  received_at: string;
  claimed_capture_time?: string;
  processing_status: EvidenceProcessingStatus;
  evidence_classification: CaseClassification;
  custody_reference: string;
  access_policy: AccessPolicy;
  metadata: Record<string, unknown>;
}

export interface ExtractedObservation {
  schema_version: string;
  observation_id: string;
  evidence_id: string;
  case_id: string;
  observation_type: ObservationType;
  extracted_value: Record<string, unknown>;
  source_region?: Record<string, unknown>;
  extraction_method: string;
  extraction_version: string;
  confidence: number;
  created_at: string;
  human_verified: boolean;
}

export interface UniversalFinding {
  schema_version: string;
  finding_id: string;
  case_id: string;
  finding_type: FindingType;
  description: string;
  supporting_evidence_ids: string[];
  contradictory_evidence_ids: string[];
  assumptions: string[];
  limitations: string[];
  confidence_metadata: Record<string, unknown>;
  human_verified: boolean;
  status: FindingStatus;
  created_at: string;
}

export interface UniversalEntity {
  schema_version: string;
  entity_id: string;
  case_id: string;
  entity_type: string;
  name_or_title: string;
  canonical_identifier?: string;
  source_references: string[];
  match_basis: EntityMatchBasis;
  uncertainty_score: number;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface UniversalRelationship {
  schema_version: string;
  relationship_id: string;
  case_id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  match_basis: EntityMatchBasis;
  valid_from?: string;
  valid_to?: string;
  supporting_evidence_ids: string[];
  contradictory_evidence_ids: string[];
  uncertainty_score: number;
  human_verified: boolean;
  created_at: string;
}

export interface AnalysisJob {
  schema_version: string;
  job_id: string;
  case_id: string;
  evidence_ids: string[];
  engine: string;
  engine_version: string;
  status: JobStatus;
  progress: number;
  started_at?: string;
  completed_at?: string;
  error_code?: string;
  error_message?: string;
  retry_count: number;
  results_summary: Record<string, unknown>;
  created_at: string;
}

export interface UniversalAuditEvent {
  schema_version: string;
  event_id: string;
  case_id?: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  previous_event_hash: string;
  event_hash: string;
  payload_hash: string;
  timestamp: string;
  details: Record<string, unknown>;
}
