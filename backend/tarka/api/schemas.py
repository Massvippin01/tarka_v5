"""Pydantic schemas for the TARKA forensic API bridge."""

from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    chain_head_hash: str
    ledger_entries_count: int
    genesis_anchor_valid: bool


class CaseSummary(BaseModel):
    id: str
    title: str
    description: str
    fact_count: int
    expected_status: str


class CaseDetail(BaseModel):
    id: str
    title: str
    description: str
    facts: List[Dict[str, Any]]
    clock_bounds: Dict[str, float]
    speed_config: Dict[str, Any]
    expected_status: str


class SpeedConfigInput(BaseModel):
    ground_max_speed_kmh: float = 140.0
    rail_max_speed_kmh: float = 180.0
    air_max_speed_kmh: float = 900.0
    air_min_distance_km: float = 80.0
    air_overhead_minutes: float = 75.0
    road_factor: float = 0.85


class SolveRequest(BaseModel):
    facts: List[Dict[str, Any]] = Field(default_factory=list)
    clock_bounds: Dict[str, float] = Field(default_factory=dict)
    case_id: Optional[str] = None
    speed_config: Optional[SpeedConfigInput] = None
    handset_with_third_party: bool = Field(
        default=False,
        description="Toggle: Handset stayed with the claimant (False) vs Handset was with third party (True)",
    )
    max_cores: int = 50
    source_weights: Optional[Dict[str, int]] = Field(
        default=None,
        description="Optional custom reliability weights per source type for minimal correction ranking",
    )


class BoundVsGapItem(BaseModel):
    pair: str
    nominal_s: float
    skew_s: float
    avail_s: float
    dist_km: float
    req_s: float
    gap_s: float
    mode: str
    status: str


class MarginBreakdown(BaseModel):
    is_initially_satisfiable: bool
    overall_skew_margin_seconds: float
    breakdown_margins: Dict[str, float]


class SolveResponse(BaseModel):
    verdict: str  # "CONSISTENT" | "INCONSISTENT" | "INCONCLUSIVE"
    verdict_label: str
    model_stated_banner: str = "Results hold strictly under the stated model"
    mus_fact_ids: List[List[str]]
    mss_scenarios: List[List[str]]
    is_truncated: bool
    corroboration_counts: Dict[str, int]
    leave_one_out: Dict[str, bool]
    leave_one_out_disclaimer: str = (
        "Omitting a fact that dissolves a conflict core indicates that the fact was critical "
        "to the inconsistency under the stated model; it does not prove or imply that the omitted fact is unreliable or fabricated."
    )
    bound_vs_gap: List[BoundVsGapItem]
    margin_breakdown: Optional[MarginBreakdown] = None
    hypotheses: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Ranked minimal correction hypotheses ('To restore consistency, ONE of these must be wrong: ...')",
    )
    leave_one_out_sensitivity: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Detailed per-fact sensitivity in conflict cores including whether removal flips verdict",
    )
    cost_model: Dict[str, int] = Field(
        default_factory=dict,
        description="Reliability cost model applied across source categories",
    )
    track_decoupling_hypothesis: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Dual-track hypothesis ('device present, person not' due to relay, SIM swap, or remote access)",
    )
    clock_skew_inference: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Solver-inferred minimal per-device/per-clock offsets required to reconcile the timeline",
    )
    execution_time_ms: float
    total_solver_calls: int
    recipe_fingerprint: Optional[str] = Field(
        default=None,
        description="Deterministic SHA-256 digest of solver configuration, facts, clock bounds, and speed assumptions",
    )
    result_fingerprint: Optional[str] = Field(
        default=None,
        description="Deterministic SHA-256 digest of substantive solver outcomes, MUS cores, and margins",
    )
    solver_fingerprint: Optional[str] = Field(
        default=None,
        description="Composite versioned SHA-256 fingerprint sealing both recipe and result digests",
    )


class CustodyEntryResponse(BaseModel):
    sequence: int
    timestamp_utc: str
    action: str
    fact_id: Optional[str] = None
    payload_hash: str
    prev_hash: str
    entry_hash: str


class CustodyTrailResponse(BaseModel):
    entries: List[CustodyEntryResponse]
    chain_head_hash: str
    is_valid: bool
    total_entries: int


class AlterOneByteDemoResponse(BaseModel):
    operation: str = "Alter one byte (demo copy)"
    is_valid: bool
    status_label: str  # "Integrity check failed" or "Integrity check passed"
    detected_at_sequence: Optional[int] = None
    details: str


class SourceFileSummary(BaseModel):
    filename: str
    sha256: str
    size_bytes: int
    parsed_facts_count: int
    rejected_rows_count: int
    parser_type: str
    is_date_ambiguous: bool = False


class RejectedRowModel(BaseModel):
    source_file: str
    line_number: int
    raw_content: str
    reason: str


class IngestResponse(BaseModel):
    source_files: List[SourceFileSummary]
    facts: List[Dict[str, Any]]
    rejected_rows: List[RejectedRowModel]
    warnings: List[str]
    total_facts_ingested: int
    total_rejected_rows: int
    custody_chain_head: str
    legal_disclaimer: str = (
        "Extraction identifies chronological and spatial bounds under the stated parser rules; "
        "it does not verify identity or establish authenticity. Supports Section 63 BSA review."
    )


class CSVPreviewResponse(BaseModel):
    filename: str
    sha256: str
    total_lines: int
    headers: List[str]
    sample_rows: List[Dict[str, str]]
    suggested_mapping: Dict[str, Optional[str]]


class CustomCSVIngestRequest(BaseModel):
    timestamp_col: str
    timestamp_format: Optional[str] = None
    lat_col: Optional[str] = None
    lon_col: Optional[str] = None
    radius_meters: float = 1000.0
    entity_col: Optional[str] = None
    kind_col: Optional[str] = None
    default_kind: str = "CDR_DATA"
    trust_tier: str = "T2"
    auth_type: str = "passive"
    clock_id: str = "clk_custom_csv"
    append_to_custody: bool = True


class CaseResetResponse(BaseModel):
    status: str = "reset"
    case_id: str
    chain_head_hash: str
    total_facts: int = 0


# ==============================================================================
# Phase 1: Case & Evidence Foundation Schemas
# ==============================================================================

class CaseCreateRequest(BaseModel):
    case_id: str = Field(description="Unique case identifier (e.g. CASE-2026-001)")
    title: str = Field(description="Descriptive title of the case")
    description: Optional[str] = Field(default="", description="Case context or incident description")
    investigator: Optional[str] = Field(default="Forensic Examiner", description="Lead investigator name or ID")
    jurisdiction: Optional[str] = Field(default="Cyber Crime Branch", description="Jurisdiction or police branch")


class CaseResponse(BaseModel):
    case_id: str
    title: str
    description: str
    investigator: str
    jurisdiction: str
    created_at_iso: str
    status: str
    artifact_count: int
    dna_count: int
    custody_chain_head: Optional[str] = None
    integrity_limitation: str


class ArtifactResponse(BaseModel):
    artifact_id: str
    case_id: str
    filename: str
    sha256: str
    file_size_bytes: int
    mime_type: str
    source_device: Optional[str] = None
    source_tier: str
    intake_officer: str
    intake_timestamp_iso: str
    custody_chain_sequence: int
    storage_path: str
    intake_notes: Optional[str] = None
    status: str
    dna_count: int
    integrity_limitation: str


class EvidenceDNAResponse(BaseModel):
    evidence_id: str
    artifact_id: str
    case_id: str
    record_index: int
    kind: str
    source_raw_text: str
    source_line_ref: str
    source_field_path: Optional[str] = None
    event_timestamp_iso: Optional[str] = None
    event_timestamp_epoch: Optional[float] = None
    time_window_start_epoch: Optional[float] = None
    time_window_end_epoch: Optional[float] = None
    source_entity: Optional[str] = None
    target_entity: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    uncertainty_radius_meters: Optional[float] = None
    auth_track: str
    trust_tier: str
    clock_domain: str
    amount: Optional[float] = None
    parser_name: Optional[str] = None
    parser_version: Optional[str] = "1.0.0"
    parser_warnings: List[str] = Field(default_factory=list)
    extracted_fields: List[Dict[str, Any]] = Field(default_factory=list)
    identifiers: Dict[str, str] = Field(default_factory=dict)
    inferred_attributes: Dict[str, Any] = Field(default_factory=dict)
    inference_rationale: Optional[str] = None
    has_inferences: bool = False
    review_status: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    review_timestamp_iso: Optional[str] = None
    field_overrides: Dict[str, Any] = Field(default_factory=dict)
    is_reviewable: bool = True
    integrity_limitation: str


class ArtifactRegisterResponse(BaseModel):
    status: str  # "REGISTERED" | "DUPLICATE_ARTIFACT"
    is_duplicate: bool
    message: str
    artifact: ArtifactResponse
    evidence_dna: List[EvidenceDNAResponse]


class EvidenceDNAReviewRequest(BaseModel):
    review_status: str  # "ACCEPTED" | "FLAGGED" | "REJECTED" | "UNREVIEWED"
    reviewed_by: Optional[str] = Field(default="Forensic Officer")
    review_notes: Optional[str] = Field(default=None)
    field_overrides: Optional[Dict[str, Any]] = Field(default=None)


class ArtifactDetailResponse(BaseModel):
    artifact: ArtifactResponse
    evidence_dna: List[EvidenceDNAResponse]
    integrity_intact: bool
    calculated_sha256: str
    integrity_limitation: str


class CaseIntegrityReport(BaseModel):
    case_id: str
    overall_integrity_intact: bool
    total_artifacts_verified: int
    custody_ledger_valid: bool
    custody_total_entries: int
    artifacts: List[Dict[str, Any]]
    integrity_limitation: str


# Phase 2 Schemas: Normalization and Explainable Correlation

class ExtractedFieldResponse(BaseModel):
    case_id: str
    artifact_id: str
    field_name: str
    parser_name: str
    parser_version: str
    source_filename: str
    source_location: str
    raw_source_value: str
    normalized_value: Any
    extraction_status: str
    extraction_confidence: Optional[float] = 1.0
    parser_warning: Optional[str] = None
    rejection_reason: Optional[str] = None


class TimezoneProvenanceResponse(BaseModel):
    recorded_time: str
    stated_timezone: Optional[str] = None
    assumed_timezone: str
    conversion_rationale: str
    utc_iso: str
    utc_epoch: float


class CanonicalFactResponse(BaseModel):
    fact_id: str
    case_id: str
    artifact_id: str
    evidence_id: str
    kind: str
    source_filename: str
    source_location: str
    sha256: str
    time_provenance: TimezoneProvenanceResponse
    trust_tier: str
    auth_track: str
    primary_entity: Optional[str] = None
    secondary_entity: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = "INR"
    identifiers: Dict[str, str] = Field(default_factory=dict)
    extracted_fields: List[ExtractedFieldResponse] = Field(default_factory=list)
    summary: str
    raw_source_snippet: str
    inferred_notes: Optional[str] = None
    review_status: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None


class EntityMatchResponse(BaseModel):
    match_id: str
    match_type: str
    normalized_values_compared: Dict[str, Any]
    evidence_ids: List[str]
    artifact_ids: List[str]
    deterministic_rule_applied: str
    match_status: str
    conflict_or_veto_reason: Optional[str] = None
    examiner_review_state: str
    explanation: str


class EntityProfileResponse(BaseModel):
    entity_id: str
    display_name: str
    identifiers: Dict[str, List[str]]
    associated_evidence_ids: List[str]
    associated_artifact_ids: List[str]
    has_unresolved_conflicts: bool
    review_state: str


class CorrelationResponse(BaseModel):
    correlation_id: str
    rule_id: str
    rule_name: str
    rule_version: str
    evidence_inputs: List[str]
    artifact_inputs: List[str]
    time_window: Optional[Dict[str, Any]] = None
    explanation_text: str
    status: str
    is_contradiction: bool
    is_evidence_gap: bool
    rejection_reason: Optional[str] = None
    examiner_review_state: str
    examiner_notes: Optional[str] = None


class CorrelationReviewRequest(BaseModel):
    examiner_review_state: str  # "CONFIRMED" | "REJECTED" | "REVIEW_REQUIRED"
    examiner_notes: Optional[str] = None


class EvidenceGapResponse(BaseModel):
    gap_id: str
    rule_id: str
    claiming_fact_id: str
    claiming_evidence_id: str
    artifact_id: str
    expected_evidence_type: str
    search_parameters: Dict[str, Any]
    explanation: str


class CaseAnalysisResponse(BaseModel):
    case_id: str
    facts: List[CanonicalFactResponse]
    proposed_entities: List[EntityProfileResponse]
    entity_links: List[EntityMatchResponse]
    event_links: List[CorrelationResponse]
    contradictions: List[CorrelationResponse]
    evidence_gaps: List[CorrelationResponse]
    rejected_correlations: List[CorrelationResponse]
    review_required_correlations: List[CorrelationResponse]
    integrity_limitation: str


# =============================================================================
# Phase 3A: Analysis Runs & Counterfactual Forensics Schemas
# =============================================================================

class CreateAnalysisRunRequest(BaseModel):
    excluded_artifact_ids: List[str] = Field(default_factory=list)
    challenge_reason: Optional[str] = None


class ChallengeRunRequest(BaseModel):
    excluded_artifact_ids: List[str] = Field(description="One or more artifact IDs to exclude from active analysis")
    investigator_note: Optional[str] = Field(default=None, description="Optional note documenting reason for challenge")


class HypothesisAssessmentResponse(BaseModel):
    hypothesis_id: str
    title: str
    assessment_label: str
    supporting_evidence: List[str] = Field(default_factory=list)
    contradicting_evidence: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    evidence_gaps: List[str] = Field(default_factory=list)
    linked_artifacts: List[str] = Field(default_factory=list)
    linked_facts: List[str] = Field(default_factory=list)
    linked_correlation_rules: List[str] = Field(default_factory=list)
    distinguishing_evidence_needed: str
    rationale: str


class FindingSummaryResponse(BaseModel):
    finding_id: str
    title: str
    status: str
    rule_id: str
    rule_name: str
    supporting_artifact_ids: List[str]
    supporting_evidence_ids: List[str]
    explanation: str


class AnalysisRunResponse(BaseModel):
    run_id: str
    case_id: str
    run_type: str
    baseline_run_id: Optional[str] = None
    created_at_iso: str
    analysis_ruleset_version: str
    correlation_rule_versions: Dict[str, str] = Field(default_factory=dict)
    hypothesis_rule_versions: Dict[str, str] = Field(default_factory=dict)
    selected_artifact_ids: List[str] = Field(default_factory=list)
    excluded_artifact_ids: List[str] = Field(default_factory=list)
    challenge_reason: Optional[str] = None
    source_evidence_hashes: Dict[str, str] = Field(default_factory=dict)
    derived_facts: List[CanonicalFactResponse] = Field(default_factory=list)
    correlations: List[CorrelationResponse] = Field(default_factory=list)
    contradictions: List[CorrelationResponse] = Field(default_factory=list)
    evidence_gaps: List[EvidenceGapResponse] = Field(default_factory=list)
    hypothesis_assessments: List[HypothesisAssessmentResponse] = Field(default_factory=list)
    finding_summaries: List[FindingSummaryResponse] = Field(default_factory=list)
    analysis_summary: Optional[str] = None
    analysis_fingerprint: str
    recipe_fingerprint: Optional[str] = None
    result_fingerprint: Optional[str] = None


class RunComparisonResponse(BaseModel):
    baseline_run_id: str
    challenge_run_id: str
    challenged_artifact_ids: List[str]
    challenge_reason: Optional[str] = None
    ruleset_version: str
    baseline_evidence_count: int
    challenged_evidence_count: int
    surviving_correlations: List[CorrelationResponse]
    removed_correlations: List[CorrelationResponse]
    surviving_contradictions: List[CorrelationResponse]
    removed_contradictions: List[CorrelationResponse]
    new_evidence_gaps: List[EvidenceGapResponse]
    hypothesis_changes: List[Dict[str, Any]]
    surviving_findings: List[FindingSummaryResponse]
    weakened_findings: List[FindingSummaryResponse]
    removed_findings: List[FindingSummaryResponse]
    plain_language_summary: str


# =========================================================================
# Phase 4A: Provenance DAG and Declarative Rule Registry Schemas
# =========================================================================

class DeclarativeRuleResponse(BaseModel):
    rule_id: str
    version: str
    display_name: str
    purpose: str
    input_fact_types: List[str]
    join_key: str
    field_paths: List[str]
    operator: str
    output_type: str
    review_required: bool
    time_window: Optional[Dict[str, Any]] = None
    rationale_template: str


class DAGNodeResponse(BaseModel):
    node_id: str
    node_type: str
    label: str
    status: str
    title: Optional[str] = None
    description: Optional[str] = None
    source_artifact_id: Optional[str] = None
    source_location: Optional[str] = None
    rule_id: Optional[str] = None
    fact_id: Optional[str] = None
    evidence_id: Optional[str] = None
    run_id: Optional[str] = None
    amount: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DAGEdgeResponse(BaseModel):
    edge_id: str
    source_id: str
    target_id: str
    edge_type: str
    label: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProvenanceDAGResponse(BaseModel):
    dag_id: str
    run_id: str
    case_id: str
    run_type: str
    nodes: List[DAGNodeResponse] = Field(default_factory=list)
    edges: List[DAGEdgeResponse] = Field(default_factory=list)
    fingerprint: str


class InvestigationNodeResponse(BaseModel):
    node_id: str
    node_type: str
    label: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    source_artifact_ids: List[str] = Field(default_factory=list)
    source_artifact_id: Optional[str] = None
    source_record_id: Optional[str] = None
    provenance_ids: List[str] = Field(default_factory=list)
    identifiers: Dict[str, str] = Field(default_factory=dict)
    amount: Optional[float] = None
    raw_value: Optional[str] = None
    normalized_value: Optional[Any] = None
    confidence: Optional[float] = None
    review_status: Optional[str] = None
    status: str = Field(default="ACTIVE")
    inactive_reason: Optional[str] = None
    timestamp_iso: Optional[str] = None
    is_timestamp_inferred: bool = False
    page_number: Optional[int] = None
    bounding_box: Optional[List[float]] = None
    rule_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InvestigationEdgeResponse(BaseModel):
    edge_id: str
    source_id: str
    target_id: str
    edge_type: str
    label: str
    explanation: Optional[str] = None
    provenance_ids: List[str] = Field(default_factory=list)
    rule_id: Optional[str] = None
    is_contradiction: bool = False
    status: str = Field(default="ACTIVE")
    inactive_reason: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class InvestigationGraphResponse(BaseModel):
    graph_id: str
    case_id: str
    nodes: List[InvestigationNodeResponse] = Field(default_factory=list)
    edges: List[InvestigationEdgeResponse] = Field(default_factory=list)
    fingerprint: str


# =============================================================================
# Phase 4B: OCR Extraction & Bounding Box Inspector Schemas
# =============================================================================

class Point2DResponse(BaseModel):
    x: float
    y: float


class BoundingPolygonResponse(BaseModel):
    points: List[Point2DResponse]
    bbox: Tuple[float, float, float, float]


class OCRTokenResponse(BaseModel):
    token_id: str
    artifact_id: str
    run_id: str
    text: str
    confidence: float
    polygon: BoundingPolygonResponse
    line_index: int
    token_index: int


class FinancialFieldCandidateResponse(BaseModel):
    candidate_id: str
    artifact_id: str
    run_id: str
    field_type: str
    raw_text: str
    normalized_value: Any
    confidence: float
    token_ids: List[str]
    polygon: BoundingPolygonResponse
    review_status: str
    corrected_value: Optional[Any] = None
    review_notes: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at_iso: Optional[str] = None
    canonical_fact_id: Optional[str] = None


class OCRExtractionResponse(BaseModel):
    run_id: str
    artifact_id: str
    case_id: str
    image_width: int
    image_height: int
    engine_name: str
    engine_version: str
    extracted_at_iso: str
    tokens: List[OCRTokenResponse] = Field(default_factory=list)
    candidates: List[FinancialFieldCandidateResponse] = Field(default_factory=list)
    full_text: str = ""
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


class OCRReviewRequest(BaseModel):
    action: str = Field(description="Review action: ACCEPT, REJECT, or CORRECT")
    candidate_id: str = Field(description="Target candidate identifier")
    corrected_value: Optional[Any] = Field(default=None, description="Investigator manual correction value")
    review_notes: Optional[str] = Field(default=None, description="Investigator rationale or audit notes")
    reviewed_by: str = Field(default="Forensic Officer", description="Examiner identifier")


# Phase 4C: Evidence Completeness & Human Review Schemas
# -------------------------------------------------------------------------

class PageCoverageItemResponse(BaseModel):
    page_number: int
    status: str
    extracted_text_length: int = 0
    token_count: int = 0
    is_scanned: bool = False
    error_message: Optional[str] = None
    warning: Optional[str] = None


class DocumentProcessingCoverageResponse(BaseModel):
    total_pages: int
    processed_pages: int
    failed_pages: int
    skipped_pages: int
    coverage_ratio: float
    is_fully_processed: bool
    pages: List[PageCoverageItemResponse] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


class FieldReviewAuditRecordResponse(BaseModel):
    decision_id: str
    field_name: str
    decision: str
    previous_decision: Optional[str] = None
    reviewer: str
    timestamp_iso: str
    review_reason: str
    original_raw_text: Optional[str] = None
    original_candidate_value: Optional[Any] = None
    original_confidence: Optional[float] = None
    accepted_or_corrected_value: Optional[Any] = None


class FieldAssessmentResponse(BaseModel):
    field_name: str
    display_name: str
    evidence_type: str
    is_required: bool
    status: str
    candidate_id: Optional[str] = None
    candidate_value: Optional[Any] = None
    raw_ocr_text: Optional[str] = None
    confidence: Optional[float] = None
    source_artifact_id: str
    extraction_run_id: str
    page_number: Optional[int] = None
    source_coordinates: Optional[BoundingPolygonResponse] = None
    token_ids: List[str] = Field(default_factory=list)
    review_decision: str
    reviewer: Optional[str] = None
    review_timestamp_iso: Optional[str] = None
    review_reason: Optional[str] = None
    accepted_value: Optional[Any] = None
    corrected_value: Optional[Any] = None
    uncertainty_explanation: str
    next_recommended_action: str
    expectation_rationale: str
    audit_history: List[FieldReviewAuditRecordResponse] = Field(default_factory=list)


class ArtifactCompletenessResponse(BaseModel):
    artifact_id: str
    case_id: str
    artifact_type: str
    coverage: DocumentProcessingCoverageResponse
    fields: List[FieldAssessmentResponse]
    total_expected_fields: int
    extracted_count: int
    review_required_count: int
    not_detected_count: int
    unreadable_count: int
    confirmed_absent_count: int
    not_applicable_count: int
    completeness_index: float
    metric_explanation: str
    document_level_complete: bool
    global_recommended_actions: List[str] = Field(default_factory=list)


class FieldReviewActionRequest(BaseModel):
    field_name: str = Field(description="Normalized target field identifier (e.g. amount, rrn)")
    action: Optional[str] = Field(default=None, description="Action: ACCEPT, REJECT, CORRECT, MARK_UNREADABLE, CONFIRM_ABSENT, REOPEN")
    decision: Optional[str] = Field(default=None, description="Alias for action")
    corrected_value: Optional[Any] = Field(default=None, description="Investigator manual correction value")
    accepted_value: Optional[Any] = Field(default=None, description="Alias for corrected_value")
    review_reason: Optional[str] = Field(default=None, description="Mandatory investigator explanation and evidentiary rationale")
    reason: Optional[str] = Field(default=None, description="Alias for review_reason")
    reviewed_by: str = Field(default="Forensic Examiner", description="Authorized examiner identifier")
    reviewer_id: Optional[str] = Field(default=None, description="Alias for reviewed_by")

    def model_post_init(self, __context: Any) -> None:
        if not self.action and self.decision:
            self.action = self.decision
        if not self.action:
            self.action = "ACCEPT"
        if not self.review_reason and self.reason:
            self.review_reason = self.reason
        if self.review_reason is None:
            self.review_reason = ""
        if self.reviewer_id and (not self.reviewed_by or self.reviewed_by == "Forensic Examiner"):
            self.reviewed_by = self.reviewer_id
        if self.accepted_value is not None and self.corrected_value is None:
            self.corrected_value = self.accepted_value


class PDFProcessRequest(BaseModel):
    force_ocr: bool = Field(default=False, description="Force high-resolution rendering and OCR even if text exists")
    max_pages: int = Field(default=50, ge=1, le=100, description="Maximum pages to process")


class ForensicTimelineEventResponse(BaseModel):
    id: str = Field(description="Unique event ID, e.g. EVENT_001")
    timestamp: str = Field(description="Human-readable timestamp with timezone")
    timestamp_iso: str = Field(description="Normalized UTC ISO-8601 string")
    timestamp_epoch: float = Field(description="Unix epoch seconds")
    type: str = Field(description="Event type enum")
    title: str = Field(description="Event title")
    description: str = Field(description="Forensic description")
    source_artifact_ids: List[str] = Field(default_factory=list)
    supporting_fact_ids: List[str] = Field(default_factory=list)
    confidence: float = Field(default=1.0)
    provenance_links: List[str] = Field(default_factory=list)
    status: str = Field(default="ACTIVE")
    inactive_reason: Optional[str] = None
    temporal_priority: int = 1
    is_timestamp_inferred: bool = False
    primary_entity: Optional[str] = None
    secondary_entity: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = "INR"
    identifiers: Dict[str, str] = Field(default_factory=dict)
    evidence: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    conflicting_event_ids: List[str] = Field(default_factory=list)
    conflict_explanation: Optional[str] = None


class ForensicTimelineResponse(BaseModel):
    case_id: str
    run_id: Optional[str] = None
    total_events: int
    active_events_count: int
    inactive_events_count: int
    conflicts_count: int
    events: List[ForensicTimelineEventResponse] = Field(default_factory=list)
    temporal_conflicts: List[Dict[str, Any]] = Field(default_factory=list)
    fingerprint: str


# ==============================================================================
# Phase 5C: Contradiction & Evidence-Gap Analysis Schemas
# ==============================================================================

class ContradictionFindingResponse(BaseModel):
    finding_id: str
    rule_id: str
    rule_version: str
    category: str
    severity: str
    title: str
    explanation: str
    supporting_fact_ids: List[str]
    source_artifact_ids: List[str]
    original_values: Dict[str, Any]
    normalized_values: Dict[str, Any]
    provenance_references: List[str]
    counterfactual_dependencies: List[str]
    status: str
    inactive_reason: Optional[str] = None
    rule_firing_reason: str
    uncertainties_and_limitations: str
    review_state: str = "UNREVIEWED"
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at_iso: Optional[str] = None


class ForensicEvidenceGapResponse(BaseModel):
    gap_id: str
    category: str
    status: str
    title: str
    why_it_matters: str
    exposed_by_rule_id: str
    relevant_fact_ids: List[str]
    relevant_event_ids: List[str]
    relevant_artifact_ids: List[str]
    missing_evidence_description: str
    suggested_remedy: str
    is_mandatory_for_resolution: bool
    provenance_ids: List[str]
    counterfactual_dependencies: List[str]
    active_status: str
    inactive_reason: Optional[str] = None
    review_decision: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at_iso: Optional[str] = None
    review_scope: Optional[str] = None


class CaseForensicAnalysisResponse(BaseModel):
    case_id: str
    run_id: Optional[str] = None
    total_contradictions: int
    active_contradictions_count: int
    inactive_contradictions_count: int
    total_gaps: int
    active_gaps_count: int
    review_required_count: int
    resolved_count: int
    contradictions: List[ContradictionFindingResponse] = Field(default_factory=list)
    evidence_gaps: List[ForensicEvidenceGapResponse] = Field(default_factory=list)
    uncertainties: List[str] = Field(default_factory=list)
    informational_observations: List[str] = Field(default_factory=list)
    fingerprint: str
    recipe_fingerprint: Optional[str] = None
    result_fingerprint: Optional[str] = None


class ContradictionReviewRequest(BaseModel):
    decision: str = Field(description="VERIFY, FLAG_UNCERTAIN, RESOLVE, or DISMISS")
    review_notes: Optional[str] = Field(default=None, description="Investigator rationale")
    reviewed_by: str = Field(default="Forensic Examiner", description="Authorized examiner identifier")


class EvidenceGapReviewRequest(BaseModel):
    decision: str = Field(description="CONFIRM_ABSENT, RESOLVE, MARK_UNREADABLE, or REOPEN")
    review_notes: Optional[str] = Field(default=None, description="Investigator rationale")
    reviewed_by: str = Field(default="Forensic Examiner", description="Authorized examiner identifier")
    review_scope: Optional[str] = Field(
        default=None,
        description="Explicit scope of examination required when CONFIRM_ABSENT is selected",
    )


# ==============================================================================
# Phase 5D: Investigation Prioritization & Summary Schemas
# ==============================================================================

class PriorityScoreBreakdownResponse(BaseModel):
    contradiction_severity_weight: float
    evidence_dependency_count_weight: float
    graph_centrality_weight: float
    evidence_gap_impact_weight: float
    temporal_importance_weight: float
    already_reviewed_discount: float
    raw_score: float
    final_score: int


class InvestigationPriorityItemResponse(BaseModel):
    id: str
    title: str
    priority_score: int
    priority_level: str
    target_type: str
    target_id: str
    reason: str
    score_breakdown: PriorityScoreBreakdownResponse
    supporting_rules: List[str]
    related_artifacts: List[str]
    related_facts: List[str]
    is_reviewed: bool
    status: str
    inactive_reason: Optional[str] = None


class CaseInvestigationPrioritiesResponse(BaseModel):
    case_id: str
    run_id: Optional[str] = None
    total_items: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    items: List[InvestigationPriorityItemResponse] = Field(default_factory=list)
    fingerprint: str


class SummaryFindingItemResponse(BaseModel):
    finding_id: str
    title: str
    description: str
    severity: str
    category: str
    rule_id: str
    artifact_ids: List[str]
    fact_ids: List[str]
    original_values: Dict[str, Any] = Field(default_factory=dict)
    normalized_values: Dict[str, Any] = Field(default_factory=dict)


class SummaryEvidenceGapItemResponse(BaseModel):
    gap_id: str
    title: str
    why_it_matters: str
    status: str
    rule_id: str
    artifact_ids: List[str]
    fact_ids: List[str]
    missing_evidence_description: str
    suggested_remedy: str


class SummaryTimelineIssueItemResponse(BaseModel):
    conflict_id: str
    title: str
    description: str
    rule_id: str
    event_ids: List[str]
    artifact_ids: List[str]
    fact_ids: List[str]


class SummaryRecommendedActionResponse(BaseModel):
    action_id: str
    priority_level: str
    priority_score: int
    action: str
    rationale: str
    target_id: str
    rule_id: str
    artifact_ids: List[str]
    fact_ids: List[str]


class CaseInvestigationSummaryResponse(BaseModel):
    case_id: str
    case_title: str
    run_id: Optional[str] = None
    overview: str
    critical_findings: List[SummaryFindingItemResponse] = Field(default_factory=list)
    evidence_gaps: List[SummaryEvidenceGapItemResponse] = Field(default_factory=list)
    timeline_issues: List[SummaryTimelineIssueItemResponse] = Field(default_factory=list)
    recommended_actions: List[SummaryRecommendedActionResponse] = Field(default_factory=list)
    fingerprint: str


# ==============================================================================
# Phase 7: Forensic Traceability & Evidence-Grounded Explanations Schemas
# ==============================================================================

class TraceNodeResponse(BaseModel):
    node_id: str
    node_type: str
    label: str
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    status: str = "ACTIVE"
    source_artifact_id: Optional[str] = None
    source_location: Optional[str] = None
    raw_value: Optional[Any] = None
    normalized_value: Optional[Any] = None
    confidence: Optional[float] = None
    timestamp_iso: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TraceEdgeResponse(BaseModel):
    edge_id: str
    source_id: str
    target_id: str
    relationship: str
    label: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProvenanceTraceResponse(BaseModel):
    root_id: str
    direction: str
    nodes: List[TraceNodeResponse] = Field(default_factory=list)
    edges: List[TraceEdgeResponse] = Field(default_factory=list)
    is_complete: bool = True
    missing_links: List[str] = Field(default_factory=list)
    has_cycles: bool = False
    fingerprint: str = ""


class EvidenceSourceDetailResponse(BaseModel):
    fact_id: str
    artifact_id: str
    artifact_filename: str
    source_location: str
    raw_value: Optional[Any] = None
    normalized_value: Optional[Any] = None
    source_tier: str
    timestamp: Optional[str] = None
    timestamp_provenance: Optional[Dict[str, Any]] = None
    bounding_box: Optional[List[float]] = None
    confidence: Optional[float] = None
    sha256: Optional[str] = None
    raw_snippet: Optional[str] = None


class FindingRuleMetadataResponse(BaseModel):
    rule_id: str
    rule_version: str
    rule_display_name: str
    rule_purpose: str
    operator: str
    join_key: str
    firing_condition: str
    satisfied_conditions: List[str] = Field(default_factory=list)


class DerivationStepResponse(BaseModel):
    step_number: int
    stage: str
    description: str
    input_references: List[str] = Field(default_factory=list)
    output_reference: str


class CounterfactualContextResponse(BaseModel):
    is_active_in_run: bool
    dependencies: List[str] = Field(default_factory=list)
    excluded_artifacts: List[str] = Field(default_factory=list)
    inactive_reason: Optional[str] = None
    hypothetical_exclusion_effect: str


class ReviewAuditDetailResponse(BaseModel):
    review_state: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    reviewed_at_iso: Optional[str] = None
    review_scope: Optional[str] = None


class CustodyEventSummaryResponse(BaseModel):
    sequence: int
    timestamp_iso: str
    action: str
    entry_hash: str
    fact_id: Optional[str] = None
    payload_preview: Optional[str] = None


class FindingExplanationResponse(BaseModel):
    case_id: str
    finding_id: str
    finding_type: str
    title: str
    category: str
    status: str
    severity: str
    plain_language_summary: str
    rule_metadata: Optional[FindingRuleMetadataResponse] = None
    supporting_evidence: List[EvidenceSourceDetailResponse] = Field(default_factory=list)
    contradicting_evidence: List[EvidenceSourceDetailResponse] = Field(default_factory=list)
    derivation_steps: List[DerivationStepResponse] = Field(default_factory=list)
    counterfactual_context: CounterfactualContextResponse
    epistemic_uncertainties: List[str] = Field(default_factory=list)
    missing_links: List[str] = Field(default_factory=list)
    review_audit: Optional[ReviewAuditDetailResponse] = None
    custody_chain_entries: List[CustodyEventSummaryResponse] = Field(default_factory=list)
    backward_trace_node_ids: List[str] = Field(default_factory=list)
    fingerprint: str


class CounterfactualFindingExplanationResponse(BaseModel):
    case_id: str
    finding_id: str
    baseline_run_id: str
    challenge_run_id: str
    baseline_status: str
    challenge_status: str
    excluded_artifact_ids: List[str]
    deactivated_dependencies: List[str]
    transition_summary: str
    independent_surviving_findings: List[str] = Field(default_factory=list)
    is_provenance_justified: bool
    baseline_explanation: FindingExplanationResponse
    challenge_explanation: FindingExplanationResponse


# ==============================================================================
# Phase 8: Evidence-Grounded Forensic Report & Export Schemas
# ==============================================================================

class CreateReportRequest(BaseModel):
    run_id: Optional[str] = Field(default="baseline", description="Analysis run ID ('baseline' or challenge run ID)")
    title: Optional[str] = Field(default=None, description="Custom title for the forensic report")
    include_counterfactual: bool = Field(default=True, description="Whether to include counterfactual comparisons")
    persist: bool = Field(default=True, description="Whether to save the report to the case repository")


class ReportSummaryResponse(BaseModel):
    report_id: str
    case_id: str
    report_title: str
    run_id: str
    run_type: str
    generated_at_iso: str
    fingerprint: str
    findings_count: int
    gaps_count: int
    is_synthetic: bool = False


class ArtifactManifestItemResponse(BaseModel):
    artifact_id: str
    filename: str
    source_type: str
    sha256: str
    file_size_bytes: int
    intake_timestamp_iso: Optional[str] = None
    source_tier: str
    processing_status: str
    review_status: str
    known_limitations: List[str] = Field(default_factory=list)


class ReportMetadataResponse(BaseModel):
    report_id: str
    report_title: str
    case_id: str
    case_title: str
    run_id: str
    run_type: str
    generated_at_iso: str
    schema_version: str
    app_version: str
    rule_versions: Dict[str, str] = Field(default_factory=dict)
    is_synthetic_demonstration: bool
    fingerprint: str
    integrity_limitation: str


class ReportExecutiveOverviewResponse(BaseModel):
    scope_summary: str
    main_findings_summary: str
    material_contradictions_count: int
    evidence_gaps_count: int
    critical_priorities_count: int
    areas_requiring_human_review: List[str] = Field(default_factory=list)
    unresolved_questions: List[str] = Field(default_factory=list)
    referenced_finding_ids: List[str] = Field(default_factory=list)
    referenced_artifact_ids: List[str] = Field(default_factory=list)


class ReportScopeMethodologyResponse(BaseModel):
    sources_provided_count: int
    sources_successfully_processed: List[str] = Field(default_factory=list)
    sources_partially_processed: List[str] = Field(default_factory=list)
    sources_requiring_review: List[str] = Field(default_factory=list)
    sources_excluded_in_run: List[str] = Field(default_factory=list)
    rules_executed: List[str] = Field(default_factory=list)
    analysis_engines_executed: List[str] = Field(default_factory=list)
    epistemic_disclaimer: str


class ReportTimelineEventItemResponse(BaseModel):
    event_id: str
    timestamp_iso: Optional[str] = None
    clock_domain: str
    source_artifact_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)
    description: str
    temporal_conflict_status: str
    uncertainty_interval_seconds: Optional[float] = None
    provenance_references: List[str] = Field(default_factory=list)


class ReportTimelineSectionResponse(BaseModel):
    events: List[ReportTimelineEventItemResponse] = Field(default_factory=list)
    temporal_conflicts_count: int
    temporal_conflict_notes: List[str] = Field(default_factory=list)


class ReportCorrelationItemResponse(BaseModel):
    correlation_id: str
    rule_id: str
    title: str
    source_artifact_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)
    matched_values: Dict[str, Any] = Field(default_factory=dict)
    is_contradiction: bool
    is_evidence_gap: bool
    uncertainty_limitations: str


class ReportCorrelationsSectionResponse(BaseModel):
    correlations: List[ReportCorrelationItemResponse] = Field(default_factory=list)
    disclaimer: str


class ReportFindingItemResponse(BaseModel):
    finding_id: str
    category: str
    status: str
    severity: str
    title: str
    neutral_explanation: str
    rule_id: str
    rule_version: str
    rule_firing_condition: str
    supporting_fact_ids: List[str] = Field(default_factory=list)
    contradicting_fact_ids: List[str] = Field(default_factory=list)
    source_artifact_ids: List[str] = Field(default_factory=list)
    original_values: Dict[str, Any] = Field(default_factory=dict)
    normalized_values: Dict[str, Any] = Field(default_factory=dict)
    provenance_trace_node_ids: List[str] = Field(default_factory=list)
    review_status: str
    reviewed_by: Optional[str] = None
    review_notes: Optional[str] = None
    review_scope: Optional[str] = None
    epistemic_limitations: List[str] = Field(default_factory=list)
    missing_links: List[str] = Field(default_factory=list)


class ReportEvidenceGapItemResponse(BaseModel):
    gap_id: str
    category: str
    status: str
    title: str
    why_it_matters: str
    rule_id: str
    relevant_artifact_ids: List[str] = Field(default_factory=list)
    relevant_fact_ids: List[str] = Field(default_factory=list)
    missing_evidence_description: str
    suggested_remedy: str
    review_decision: Optional[str] = None
    reviewed_by: Optional[str] = None
    review_scope: Optional[str] = None
    review_notes: Optional[str] = None


class ReportPriorityItemResponse(BaseModel):
    action_id: str
    priority_level: str
    priority_score: int
    action: str
    rationale: str
    target_id: str
    target_type: str
    rule_id: str
    artifact_ids: List[str] = Field(default_factory=list)
    fact_ids: List[str] = Field(default_factory=list)


class ReportCounterfactualSectionResponse(BaseModel):
    is_counterfactual_run: bool
    baseline_run_id: str
    challenge_run_id: Optional[str] = None
    excluded_artifact_ids: List[str] = Field(default_factory=list)
    challenge_rationale: Optional[str] = None
    deactivated_findings: List[str] = Field(default_factory=list)
    surviving_independent_findings: List[str] = Field(default_factory=list)
    deactivated_dependencies: List[str] = Field(default_factory=list)
    provenance_justified: bool
    transition_notes: List[str] = Field(default_factory=list)


class ReportCustodyEventItemResponse(BaseModel):
    sequence: int
    timestamp_iso: str
    action: str
    entry_hash: str
    fact_id: Optional[str] = None
    payload_summary: Optional[str] = None


class ReportProvenanceSectionResponse(BaseModel):
    material_finding_traces: Dict[str, List[str]] = Field(default_factory=dict)
    custody_ledger_entries: List[ReportCustodyEventItemResponse] = Field(default_factory=list)
    unresolved_links: List[str] = Field(default_factory=list)
    has_cyclic_dependencies: bool


class ReportLimitationsSectionResponse(BaseModel):
    known_technical_limitations: List[str] = Field(default_factory=list)
    unresolved_forensic_questions: List[str] = Field(default_factory=list)
    investigative_disclaimer: str


class ForensicReportResponse(BaseModel):
    metadata: ReportMetadataResponse
    executive_overview: ReportExecutiveOverviewResponse
    scope_methodology: ReportScopeMethodologyResponse
    evidence_inventory: List[ArtifactManifestItemResponse] = Field(default_factory=list)
    timeline: ReportTimelineSectionResponse
    correlations: ReportCorrelationsSectionResponse
    findings: List[ReportFindingItemResponse] = Field(default_factory=list)
    evidence_gaps: List[ReportEvidenceGapItemResponse] = Field(default_factory=list)
    priorities: List[ReportPriorityItemResponse] = Field(default_factory=list)
    counterfactual: ReportCounterfactualSectionResponse
    provenance: ReportProvenanceSectionResponse
    limitations: ReportLimitationsSectionResponse

