/**
 * TARKA Digital Forensics Engine & SentinelX Nexus Integration Types
 * Section 63 Indian Evidence Act / BSA Section 63 Compliant Data Models
 */

export type TrustTier = "T1" | "T2" | "T3";
export type AuthType = "ACTIVE" | "PASSIVE" | "THIRD_PARTY" | "UNAUTHENTICATED";
export type ExtractionStatus = "RAW_EXTRACTED" | "NORMALIZED" | "VERIFIED" | "DISPUTED";

export interface ArtifactIntake {
  artifact_id: string;
  case_id: string;
  filename: string;
  sha256: string;
  file_size_bytes: number;
  mime_type: string;
  source_tier: TrustTier;
  source_device?: string;
  intake_officer: string;
  intake_timestamp_iso: string;
  custody_chain_sequence: number;
  storage_path: string;
  intake_notes?: string;
  status: "REGISTERED" | "PARSED" | "INACTIVE" | "DISPUTED";
  dna_count: number;
}

export interface ExtractedField {
  case_id: string;
  artifact_id: string;
  field_name: string;
  parser_name: string;
  raw_value: string;
  normalized_value: unknown;
  confidence_score: number;
  source_location?: string;
  extraction_status: ExtractionStatus;
}

export interface EvidenceDNAItem {
  evidence_id: string;
  artifact_id: string;
  case_id: string;
  record_index: number;
  kind: string;
  source_raw_text: string;
  source_line_ref: string;
  source_device_id?: string;
  clock_id?: string;
  reported_timestamp_iso?: string;
  normalized_timestamp_iso?: string;
  timestamp_uncertainty_sec?: number;
  time_window_start_iso?: string;
  time_window_end_iso?: string;
  latitude?: number;
  longitude?: number;
  geo_radius_meters?: number;
  primary_entity?: string;
  secondary_entities?: string[];
  amount?: number;
  currency?: string;
  trust_tier: TrustTier;
  auth_track: AuthType;
  extracted_fields?: ExtractedField[];
  inferred_attributes?: Record<string, unknown>;
  inference_rationale?: string;
  has_inferences: boolean;
  review_status: string;
  reviewed_by?: string;
  review_notes?: string;
}

export interface CanonicalFact {
  fact_id: string;
  case_id: string;
  artifact_id: string;
  source_file: string;
  source_sha256: string;
  source_location: string;
  fact_kind: string;
  primary_entity?: string;
  related_entities: string[];
  reported_timestamp_iso?: string;
  normalized_timestamp_iso?: string;
  uncertainty_window_seconds: number;
  trust_tier: TrustTier;
  auth_type: AuthType;
  identifiers: Record<string, string>;
  raw_payload: Record<string, unknown>;
  is_active: boolean;
  derived_from_fact_ids: string[];
}

export type DAGNodeType = "ARTIFACT" | "EVIDENCE_DNA" | "CANONICAL_FACT" | "CORRELATION" | "CONTRADICTION" | "EVIDENCE_GAP" | "FINDING";

export type DAGNodeStatus = 
  | "ACTIVE" 
  | "INACTIVE" 
  | "BASELINE_ONLY" 
  | "SURVIVING" 
  | "CONTRADICTION" 
  | "REVIEW_REQUIRED";

export interface DAGNode {
  node_id: string;
  label: string;
  node_type: DAGNodeType;
  status: DAGNodeStatus;
  rule_id?: string;
  artifact_id?: string;
  metadata?: Record<string, unknown>;
}

export interface DAGEdge {
  edge_id: string;
  source: string;
  target: string;
  edge_type: string;
  rule_id?: string;
  status?: string;
}

export interface ProvenanceDAG {
  dag_id: string;
  run_id: string;
  nodes: DAGNode[];
  edges: DAGEdge[];
  fingerprint: string;
}

export interface FindingSummary {
  finding_id: string;
  contradiction_id?: string;
  title: string;
  category: string;
  status: "ACTIVE" | "INACTIVE" | "SURVIVING" | "REMOVED" | "NEW";
  rule_id?: string;
  summary_text: string;
  participating_fact_ids: string[];
  participating_artifact_ids: string[];
  is_contradiction: boolean;
  confidence_score: number;
}

export interface ContradictionFinding {
  finding_id: string;
  contradiction_id?: string;
  title: string;
  rule_id: string;
  category: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: "DETECTED" | "REVIEW_REQUIRED" | "CONFIRMED_ABSENCE" | "DISMISSED";
  competing_facts: CanonicalFact[];
  competing_artifacts: ArtifactIntake[];
  mus_reasoning: string;
  surviving_hypothesis?: string;
}

export interface AnalysisRun {
  run_id: string;
  case_id: string;
  run_type: "BASELINE" | "CHALLENGE" | "REANALYSIS";
  created_at_iso: string;
  excluded_artifact_ids: string[];
  findings: FindingSummary[];
  contradictions_count: number;
  fingerprint: string;
  investigator_note?: string;
}

export interface CounterfactualComparison {
  baseline_run_id: string;
  challenge_run_id: string;
  excluded_artifact_ids: string[];
  surviving_findings: FindingSummary[];
  removed_findings: FindingSummary[];
  new_findings: FindingSummary[];
  dissolved_contradictions: FindingSummary[];
  plain_language_summary?: string;
  comparison?: {
    plain_language_summary?: string;
    [key: string]: unknown;
  };
}

export interface LocalModelStatus {
  runtime_available: boolean;
  runtime_name: string;
  active_model?: string;
  device: string;
  memory_allocated_mb: number;
  latency_ms: number;
  supports_streaming: boolean;
}

export interface GroundedCitation {
  citation_id: string;
  artifact_id: string;
  source_filename: string;
  sha256_short: string;
  source_location: string;
  trust_tier: TrustTier;
  snippet: string;
  extraction_method: string;
}

export interface AssistantMessage {
  id: string;
  sender: "user" | "assistant" | "system";
  content: string;
  timestamp_iso: string;
  citations?: GroundedCitation[];
  uncertainty_disclosure?: string;
  audio_url?: string;
}
