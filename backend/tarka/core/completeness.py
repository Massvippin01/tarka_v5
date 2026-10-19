"""TARKA Phase 4C: Evidence Completeness, Uncertainty & Human Review.

Defines:
1. Typed Evidence Field Status Model:
   - EXTRACTED: Machine extraction produced a candidate (not automatically verified).
   - REVIEW_REQUIRED: Candidate exists, but ambiguity/low confidence/policy requires human review.
   - NOT_DETECTED: Extraction did not identify the field (never proof of absence).
   - UNREADABLE: Content exists or appears to exist, but cannot be reliably interpreted.
   - CONFIRMED_ABSENT: Authorized investigator explicitly confirmed the field is absent.
   - NOT_APPLICABLE: Field is not expected for this artifact type or context.

2. Expected Field Registry by Artifact Type:
   - Configurable field expectations with explicit rationale and confidence thresholds.
   - UPI Screenshots, Bank Statements, Document PDFs, Telecom CDRs, Chat Transcripts.

3. Document-Level Processing Coverage:
   - Page-by-page tracking (SUCCESS_TEXT, SUCCESS_OCR, BLANK_PAGE, FAILED, SKIPPED).
   - Disallows false completeness when pages fail or are skipped.

4. Investigator Review State Machine:
   - ACCEPT, REJECT, CORRECT, MARK_UNREADABLE, CONFIRM_ABSENT, REOPEN.
   - Non-destructive audit trail preserving verbatim OCR raw text and previous decisions.

5. Evidence Completeness Assessment Engine & Actionable Guidance.
"""

from __future__ import annotations

import datetime
import json
import logging
import uuid
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel, Field

from tarka.core.models import TrustTier, FactKind, AuthType
from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind, ExtractedField, ExtractionStatus

logger = logging.getLogger("tarka.completeness")


class EvidenceFieldStatus(str, Enum):
    """Categorical extraction and presence state for expected evidence fields."""
    EXTRACTED = "EXTRACTED"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    NOT_DETECTED = "NOT_DETECTED"
    UNREADABLE = "UNREADABLE"
    CONFIRMED_ABSENT = "CONFIRMED_ABSENT"
    NOT_APPLICABLE = "NOT_APPLICABLE"


class FieldReviewDecision(str, Enum):
    """Investigator review determination for an evidence field."""
    UNREVIEWED = "UNREVIEWED"
    ACCEPTED = "ACCEPTED"
    ACCEPT = "ACCEPT"
    REJECTED = "REJECTED"
    REJECT = "REJECT"
    CORRECTED = "CORRECTED"
    CORRECT = "CORRECT"
    MARKED_UNREADABLE = "MARKED_UNREADABLE"
    MARK_UNREADABLE = "MARK_UNREADABLE"
    CONFIRMED_ABSENT = "CONFIRMED_ABSENT"
    CONFIRM_ABSENT = "CONFIRM_ABSENT"
    REOPENED = "REOPENED"
    REOPEN = "REOPEN"


class PageProcessingStatus(str, Enum):
    """Granular execution status of a document page."""
    SUCCESS_TEXT = "SUCCESS_TEXT"       # Clean digital embedded text extracted
    SUCCESS_OCR = "SUCCESS_OCR"         # Scanned page rendered and OCR extracted
    BLANK_PAGE = "BLANK_PAGE"           # Verified visually blank page
    FAILED = "FAILED"                   # Page processing encountered an error
    SKIPPED = "SKIPPED"                 # Page was intentionally or policy skipped
    PENDING = "PENDING"


class PageCoverageItem(BaseModel):
    """Audit record of processing coverage for a single document page."""
    page_number: int = Field(ge=1, description="1-indexed document page number")
    status: PageProcessingStatus = Field(description="Processing execution status")
    extracted_text_length: int = Field(default=0, ge=0, description="Count of characters extracted")
    token_count: int = Field(default=0, ge=0, description="Count of distinct recognized tokens")
    is_scanned: bool = Field(default=False, description="True if page required OCR rendering")
    processing_method: Optional[str] = Field(default=None, description="Path used: EMBEDDED_TEXT or RENDERED_OCR")
    error_message: Optional[str] = Field(default=None, description="Detailed failure reason if FAILED")
    warning: Optional[str] = Field(default=None, description="Non-fatal execution warning")


class DocumentProcessingCoverage(BaseModel):
    """Full-document processing coverage verification."""
    total_pages: int = Field(default=1, ge=1, description="Total page count in document")
    processed_pages: int = Field(default=1, ge=0, description="Pages successfully processed")
    failed_pages: int = Field(default=0, ge=0, description="Pages whose processing failed")
    skipped_pages: int = Field(default=0, ge=0, description="Pages skipped without processing")
    coverage_ratio: float = Field(default=1.0, ge=0.0, le=1.0, description="Ratio of processed to total pages")
    is_fully_processed: bool = Field(default=True, description="False if any page failed or was skipped")
    pages: List[PageCoverageItem] = Field(default_factory=list, description="Page-by-page audit breakdown")
    warnings: List[str] = Field(default_factory=list, description="Document-level processing warnings")


class ExpectedFieldDefinition(BaseModel):
    """Declarative specification of an expected evidence field."""
    field_name: str = Field(description="Normalized field key (e.g. amount, rrn)")
    display_name: str = Field(description="Human-readable title")
    evidence_type: str = Field(description="Domain category: financial_amount, banking_identifier, timestamp, etc.")
    is_required: bool = Field(default=True, description="True if essential for artifact evidentiary value")
    expectation_rationale: str = Field(description="Explanation of why this field is expected")
    confidence_threshold: float = Field(default=0.75, ge=0.0, le=1.0, description="Minimum confidence before REVIEW_REQUIRED")


class FieldReviewAuditRecord(BaseModel):
    """Immutable audit trail record of a human review decision."""
    decision_id: str = Field(default_factory=lambda: f"dec_{uuid.uuid4().hex[:8]}")
    field_name: str = "field"
    decision: FieldReviewDecision
    previous_decision: Optional[FieldReviewDecision] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    reviewer: str = "Forensic Examiner"
    reviewer_id: Optional[str] = None
    timestamp_iso: str = Field(default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat())
    review_reason: str = ""
    reason: Optional[str] = None
    original_raw_text: Optional[str] = None
    original_candidate_value: Optional[Any] = None
    original_confidence: Optional[float] = None
    accepted_or_corrected_value: Optional[Any] = None
    accepted_value: Optional[Any] = None

    def model_post_init(self, __context: Any) -> None:
        if self.reviewer_id and (not self.reviewer or self.reviewer == "Forensic Examiner"):
            self.reviewer = self.reviewer_id
        if self.reason and not self.review_reason:
            self.review_reason = self.reason
        if self.accepted_value is not None and self.accepted_or_corrected_value is None:
            self.accepted_or_corrected_value = self.accepted_value
        elif self.accepted_or_corrected_value is not None and self.accepted_value is None:
            self.accepted_value = self.accepted_or_corrected_value


class FieldAssessment(BaseModel):
    """Comprehensive evidence completeness and uncertainty assessment for a single field."""
    field_name: str
    display_name: str
    evidence_type: str
    is_required: bool
    status: EvidenceFieldStatus
    candidate_id: Optional[str] = None
    candidate_value: Optional[Any] = None
    raw_ocr_text: Optional[str] = None
    confidence: Optional[float] = None
    source_artifact_id: str
    extraction_run_id: str
    page_number: Optional[int] = None
    source_coordinates: Optional[Any] = None
    token_ids: List[str] = Field(default_factory=list)
    review_decision: FieldReviewDecision = Field(default=FieldReviewDecision.UNREVIEWED)
    reviewer: Optional[str] = None
    review_timestamp_iso: Optional[str] = None
    review_reason: Optional[str] = None
    accepted_value: Optional[Any] = None
    corrected_value: Optional[Any] = None
    uncertainty_explanation: str
    next_recommended_action: str
    expectation_rationale: str
    audit_history: List[FieldReviewAuditRecord] = Field(default_factory=list)

    @property
    def raw_text(self) -> Optional[str]:
        return self.raw_ocr_text

    @property
    def ocr_confidence(self) -> Optional[float]:
        return self.confidence

    @property
    def candidate_val(self) -> Optional[Any]:
        return self.candidate_value

    @property
    def accepted_or_corrected_value(self) -> Optional[Any]:
        return self.corrected_value if self.corrected_value is not None else self.accepted_value

    @property
    def expected_rationale(self) -> str:
        return self.expectation_rationale

    @property
    def review_history(self) -> List[FieldReviewAuditRecord]:
        return self.audit_history

    @property
    def last_reviewed_by(self) -> Optional[str]:
        return self.reviewer

    @property
    def last_review_decision(self) -> Optional[str]:
        return self.review_decision.value if self.review_decision else None


class ArtifactCompletenessReport(BaseModel):
    """Comprehensive completeness, uncertainty, and review assessment for an evidence container."""
    artifact_id: str
    case_id: str
    artifact_type: str
    coverage: DocumentProcessingCoverage
    fields: List[FieldAssessment]
    total_expected_fields: int
    extracted_count: int
    review_required_count: int
    not_detected_count: int
    unreadable_count: int
    confirmed_absent_count: int
    not_applicable_count: int
    completeness_index: float = Field(
        ge=0.0,
        le=100.0,
        description="Weighted index of verified/extracted fields adjusted by document processing coverage",
    )
    metric_explanation: str
    document_level_complete: bool = Field(
        description="Strictly False if any page failed, was skipped, or required fields remain unresolved",
    )
    global_recommended_actions: List[str] = Field(default_factory=list)

    @property
    def overall_completeness_index(self) -> float:
        return round(self.completeness_index / 100.0, 4)

    @property
    def is_document_complete(self) -> bool:
        return self.document_level_complete

    @property
    def document_coverage(self) -> DocumentProcessingCoverage:
        return self.coverage

    @property
    def evidentiary_disclosure(self) -> str:
        return self.metric_explanation

    @property
    def counts(self) -> Dict[str, int]:
        return {
            "EXTRACTED": self.extracted_count,
            "REVIEW_REQUIRED": self.review_required_count,
            "NOT_DETECTED": self.not_detected_count,
            "UNREADABLE": self.unreadable_count,
            "CONFIRMED_ABSENT": self.confirmed_absent_count,
            "NOT_APPLICABLE": self.not_applicable_count,
        }

    @property
    def suggested_next_actions(self) -> List[str]:
        return self.global_recommended_actions


# =============================================================================
# 2. Expected Field Registry
# =============================================================================

class FieldExpectationRegistry:
    """Configurable registry defining expected evidence fields across forensic artifact categories."""

    _REGISTRY: Dict[str, List[ExpectedFieldDefinition]] = {
        "UPI_SCREENSHOT": [
            ExpectedFieldDefinition(
                field_name="amount",
                display_name="Transaction Amount",
                evidence_type="financial_amount",
                is_required=True,
                expectation_rationale="Monetary payment value displayed on consumer receipt interface.",
                confidence_threshold=0.80,
            ),
            ExpectedFieldDefinition(
                field_name="rrn",
                display_name="Retrieval Reference Number (RRN)",
                evidence_type="banking_identifier",
                is_required=True,
                expectation_rationale="12-digit banking settlement identifier for UPI payment reconciliation.",
                confidence_threshold=0.85,
            ),
            ExpectedFieldDefinition(
                field_name="payee_vpa",
                display_name="Payee VPA Handle",
                evidence_type="payment_handle",
                is_required=True,
                expectation_rationale="Virtual Payment Address of beneficiary account for counterparty identification.",
                confidence_threshold=0.75,
            ),
            ExpectedFieldDefinition(
                field_name="transaction_time",
                display_name="Transaction Timestamp",
                evidence_type="timestamp",
                is_required=True,
                expectation_rationale="Recorded display time and date for chronological sequence correlation.",
                confidence_threshold=0.75,
            ),
            ExpectedFieldDefinition(
                field_name="status",
                display_name="Payment Execution Status",
                evidence_type="execution_state",
                is_required=False,
                expectation_rationale="Terminal state indicator on receipt (e.g. Payment Successful, Failed).",
                confidence_threshold=0.70,
            ),
            ExpectedFieldDefinition(
                field_name="payer_account",
                display_name="Payer Account Reference",
                evidence_type="account_identifier",
                is_required=False,
                expectation_rationale="Debited account identifier if disclosed on receipt interface.",
                confidence_threshold=0.70,
            ),
        ],
        "BANK_STATEMENT": [
            ExpectedFieldDefinition(
                field_name="transaction_date",
                display_name="Transaction Value Date",
                evidence_type="timestamp",
                is_required=True,
                expectation_rationale="Official posting or clearing date in core banking ledger.",
                confidence_threshold=0.85,
            ),
            ExpectedFieldDefinition(
                field_name="amount",
                display_name="Debit / Credit Amount",
                evidence_type="financial_amount",
                is_required=True,
                expectation_rationale="Cleared monetary amount debited or credited to customer account.",
                confidence_threshold=0.85,
            ),
            ExpectedFieldDefinition(
                field_name="reference_number",
                display_name="Banking Reference / Narration",
                evidence_type="banking_identifier",
                is_required=True,
                expectation_rationale="Core banking settlement reference or RRN in transaction narration.",
                confidence_threshold=0.80,
            ),
            ExpectedFieldDefinition(
                field_name="account_id",
                display_name="Account Number",
                evidence_type="account_identifier",
                is_required=False,
                expectation_rationale="Account identifier subject to legal data minimization principles.",
                confidence_threshold=0.80,
            ),
        ],
        "DOCUMENT_PDF": [
            ExpectedFieldDefinition(
                field_name="document_title",
                display_name="Document Title / Header",
                evidence_type="document_metadata",
                is_required=True,
                expectation_rationale="Primary title or declaration header identifying document nature.",
                confidence_threshold=0.75,
            ),
            ExpectedFieldDefinition(
                field_name="reference_number",
                display_name="Document Reference / Case Number",
                evidence_type="document_identifier",
                is_required=True,
                expectation_rationale="Official organizational filing reference or dispatch number.",
                confidence_threshold=0.75,
            ),
            ExpectedFieldDefinition(
                field_name="document_date",
                display_name="Document Date",
                evidence_type="timestamp",
                is_required=True,
                expectation_rationale="Stated issuance date of the document.",
                confidence_threshold=0.75,
            ),
            ExpectedFieldDefinition(
                field_name="issuing_entity",
                display_name="Issuing Authority / Entity",
                evidence_type="entity_name",
                is_required=True,
                expectation_rationale="Authoritative organization or financial institution issuing the document.",
                confidence_threshold=0.75,
            ),
            ExpectedFieldDefinition(
                field_name="amount",
                display_name="Monetary Amount",
                evidence_type="financial_amount",
                is_required=False,
                expectation_rationale="Disputed or claimed monetary value if document pertains to a financial claim.",
                confidence_threshold=0.75,
            ),
        ],
        "CDR_RECORDS": [
            ExpectedFieldDefinition(
                field_name="call_timestamp",
                display_name="Call Event Timestamp",
                evidence_type="timestamp",
                is_required=True,
                expectation_rationale="Telecom network switch timestamp for call establishment.",
                confidence_threshold=0.90,
            ),
            ExpectedFieldDefinition(
                field_name="call_duration",
                display_name="Call Duration (Seconds)",
                evidence_type="telecom_metric",
                is_required=True,
                expectation_rationale="Billed connection duration in seconds.",
                confidence_threshold=0.90,
            ),
            ExpectedFieldDefinition(
                field_name="cell_tower_id",
                display_name="Cell Tower / CGI Locator",
                evidence_type="geo_telemetry",
                is_required=True,
                expectation_rationale="Serving base transceiver station location code.",
                confidence_threshold=0.80,
            ),
            ExpectedFieldDefinition(
                field_name="calling_number",
                display_name="Calling Origin Number (A-Party)",
                evidence_type="phone_number",
                is_required=True,
                expectation_rationale="Originating A-party telephone number in telecom CDR switch log.",
                confidence_threshold=0.90,
            ),
            ExpectedFieldDefinition(
                field_name="destination_number",
                display_name="Dialed Destination Number (B-Party)",
                evidence_type="phone_number",
                is_required=True,
                expectation_rationale="Called party telephone number.",
                confidence_threshold=0.90,
            ),
        ],
        "CHAT_EXPORT": [
            ExpectedFieldDefinition(
                field_name="message_timestamp",
                display_name="Message Sent Timestamp",
                evidence_type="timestamp",
                is_required=True,
                expectation_rationale="Messaging application timestamp recorded in conversation export.",
                confidence_threshold=0.80,
            ),
            ExpectedFieldDefinition(
                field_name="sender_id",
                display_name="Sender Name / Phone Number",
                evidence_type="user_identifier",
                is_required=True,
                expectation_rationale="Identity of messaging sender transmitting text or claims.",
                confidence_threshold=0.80,
            ),
            ExpectedFieldDefinition(
                field_name="text_claim",
                display_name="Payment Claim Message Text",
                evidence_type="text_claim",
                is_required=True,
                expectation_rationale="Verbatim message content conveying transaction claim or acknowledgment.",
                confidence_threshold=0.75,
            ),
        ],
        "GENERIC_EVIDENCE": [
            ExpectedFieldDefinition(
                field_name="summary",
                display_name="General Evidence Description",
                evidence_type="general",
                is_required=True,
                expectation_rationale="Summary of seized evidence bitstream.",
                confidence_threshold=0.70,
            ),
        ],
    }

    @classmethod
    def detect_artifact_type(cls, filename: str, mime_type: Optional[str] = None) -> str:
        """Deterministically classifies artifact into an expectation category based on extension and filename."""
        fn_lower = filename.lower()
        ext = Path(filename).suffix.lower()

        if ext == ".pdf":
            if any(kw in fn_lower for kw in ("statement", "bank", "passbook", "ledger")):
                return "BANK_STATEMENT"
            return "DOCUMENT_PDF"

        if ext in (".csv", ".tsv"):
            if "cdr" in fn_lower or "telecom" in fn_lower or "call" in fn_lower:
                return "CDR_RECORDS"
            if any(kw in fn_lower for kw in ("bank", "statement", "ledger", "txn")):
                return "BANK_STATEMENT"
            return "GENERIC_EVIDENCE"

        if ext in (".png", ".jpg", ".jpeg", ".webp", ".bmp") or (mime_type and mime_type.startswith("image/")):
            if any(kw in fn_lower for kw in ("receipt", "screenshot", "upi", "pay", "payment", "claim")):
                return "UPI_SCREENSHOT"
            return "UPI_SCREENSHOT"

        if ext in (".txt", ".log"):
            if any(kw in fn_lower for kw in ("chat", "whatsapp", "message", "conversation")):
                return "CHAT_EXPORT"
            return "GENERIC_EVIDENCE"

        if ext == ".json":
            if "claim" in fn_lower or "screenshot" in fn_lower:
                return "UPI_SCREENSHOT"
            return "GENERIC_EVIDENCE"

        return "GENERIC_EVIDENCE"

    @classmethod
    def get_expected_fields(cls, artifact_type: str) -> List[ExpectedFieldDefinition]:
        """Returns ordered expected field definitions for given artifact type."""
        return cls._REGISTRY.get(artifact_type, cls._REGISTRY["GENERIC_EVIDENCE"])


# =============================================================================
# 3. Completeness Assessment Engine
# =============================================================================

class CompletenessEngine:
    """Core domain service computing evidence completeness, uncertainty, and review state."""

    METRIC_DISCLOSURE = (
        "The Completeness Index measures machine extraction and human verification coverage against defined "
        "artifact expectations, weighted by page processing coverage. It measures observed and reviewed data availability; "
        "it does NOT measure document authenticity, legal veracity, or factual proof of an event."
    )

    @classmethod
    def assess_artifact(
        cls,
        artifact_id: str,
        case_id: str,
        filename: str,
        mime_type: Optional[str] = None,
        ocr_result: Optional[OCRExtractionResult] = None,
        coverage: Optional[DocumentProcessingCoverage] = None,
        existing_reviews: Optional[Dict[str, Dict[str, Any]]] = None,
    ) -> ArtifactCompletenessReport:
        """Generates comprehensive evidence completeness and uncertainty report.

        Args:
            artifact_id: Preserved artifact ID.
            case_id: Associated case ID.
            filename: Preserved filename.
            mime_type: MIME type of artifact.
            ocr_result: OCR extraction result if available.
            coverage: Document processing coverage.
            existing_reviews: Persistent reviewer decision map keyed by field_name.

        Returns:
            ArtifactCompletenessReport detailing every expected field and uncertainty rationale.
        """
        artifact_type = FieldExpectationRegistry.detect_artifact_type(filename, mime_type)
        expected_defs = FieldExpectationRegistry.get_expected_fields(artifact_type)
        reviews = existing_reviews or {}

        # Default coverage if not provided
        doc_coverage = coverage or DocumentProcessingCoverage(
            total_pages=1,
            processed_pages=1,
            failed_pages=0,
            skipped_pages=0,
            coverage_ratio=1.0,
            is_fully_processed=True,
            pages=[PageCoverageItem(page_number=1, status=PageProcessingStatus.SUCCESS_OCR, extracted_text_length=len(ocr_result.full_text) if ocr_result else 0)],
        )

        run_id = ocr_result.run_id if ocr_result else f"run_{artifact_id}_direct"
        field_candidates: Dict[str, FinancialFieldCandidate] = {}

        if ocr_result:
            for cand in ocr_result.candidates:
                # Map candidate field types to expected field names
                f_key = cls._map_candidate_type_to_field_name(cand.field_type)
                if f_key and f_key not in field_candidates:
                    field_candidates[f_key] = cand

        field_assessments: List[FieldAssessment] = []
        global_recommendations: List[str] = []

        extracted_count = 0
        review_required_count = 0
        not_detected_count = 0
        unreadable_count = 0
        confirmed_absent_count = 0
        not_applicable_count = 0

        for exp in expected_defs:
            cand = field_candidates.get(exp.field_name)
            rev_info = reviews.get(exp.field_name, {})

            decision_str = rev_info.get("decision", FieldReviewDecision.UNREVIEWED.value)
            decision = FieldReviewDecision(decision_str) if decision_str in FieldReviewDecision.__members__ else FieldReviewDecision.UNREVIEWED

            assessment = cls._build_field_assessment(
                exp=exp,
                cand=cand,
                rev_info=rev_info,
                decision=decision,
                doc_coverage=doc_coverage,
                artifact_id=artifact_id,
                run_id=run_id,
            )

            # Accumulate counts
            if assessment.status == EvidenceFieldStatus.EXTRACTED:
                extracted_count += 1
            elif assessment.status == EvidenceFieldStatus.REVIEW_REQUIRED:
                review_required_count += 1
            elif assessment.status == EvidenceFieldStatus.NOT_DETECTED:
                not_detected_count += 1
            elif assessment.status == EvidenceFieldStatus.UNREADABLE:
                unreadable_count += 1
            elif assessment.status == EvidenceFieldStatus.CONFIRMED_ABSENT:
                confirmed_absent_count += 1
            elif assessment.status == EvidenceFieldStatus.NOT_APPLICABLE:
                not_applicable_count += 1

            if assessment.next_recommended_action and assessment.next_recommended_action not in global_recommendations:
                if assessment.status in (EvidenceFieldStatus.REVIEW_REQUIRED, EvidenceFieldStatus.NOT_DETECTED, EvidenceFieldStatus.UNREADABLE):
                    global_recommendations.append(assessment.next_recommended_action)

            field_assessments.append(assessment)

        # Document-level completeness evaluation
        # Stated Rule: If a PDF contains 10 pages and only 9 were processed, TARKA must report incomplete processing.
        # It must not silently declare that all required information was absent.
        applicable_count = len(expected_defs) - not_applicable_count
        resolved_count = extracted_count + confirmed_absent_count

        if applicable_count > 0:
            raw_field_score = (resolved_count / applicable_count) * 100.0
            completeness_index = round(raw_field_score * doc_coverage.coverage_ratio, 2)
        else:
            completeness_index = 100.0 if doc_coverage.is_fully_processed else 0.0

        # Strict document-level completeness guarantee
        has_processing_failure = not doc_coverage.is_fully_processed or doc_coverage.failed_pages > 0 or doc_coverage.skipped_pages > 0
        has_unresolved_required_fields = any(
            f.is_required and f.status in (EvidenceFieldStatus.NOT_DETECTED, EvidenceFieldStatus.REVIEW_REQUIRED, EvidenceFieldStatus.UNREADABLE)
            for f in field_assessments
        )

        document_level_complete = not has_processing_failure and not has_unresolved_required_fields

        if has_processing_failure:
            global_recommendations.insert(
                0,
                f"Document-level completeness cannot be established: {doc_coverage.failed_pages} page(s) failed and {doc_coverage.skipped_pages} page(s) were skipped.",
            )

        return ArtifactCompletenessReport(
            artifact_id=artifact_id,
            case_id=case_id,
            artifact_type=artifact_type,
            coverage=doc_coverage,
            fields=field_assessments,
            total_expected_fields=len(expected_defs),
            extracted_count=extracted_count,
            review_required_count=review_required_count,
            not_detected_count=not_detected_count,
            unreadable_count=unreadable_count,
            confirmed_absent_count=confirmed_absent_count,
            not_applicable_count=not_applicable_count,
            completeness_index=completeness_index,
            metric_explanation=cls.METRIC_DISCLOSURE,
            document_level_complete=document_level_complete,
            global_recommended_actions=global_recommendations[:5],
        )

    @classmethod
    def _build_field_assessment(
        cls,
        exp: ExpectedFieldDefinition,
        cand: Optional[FinancialFieldCandidate],
        rev_info: Dict[str, Any],
        decision: FieldReviewDecision,
        doc_coverage: DocumentProcessingCoverage,
        artifact_id: str,
        run_id: str,
    ) -> FieldAssessment:
        """Determines explicit field status, uncertainty rationale, and recommended action."""
        reviewer = rev_info.get("reviewer")
        review_timestamp = rev_info.get("timestamp_iso")
        review_reason = rev_info.get("review_reason")
        accepted_value = rev_info.get("accepted_value")
        corrected_value = rev_info.get("corrected_value")

        # 1. Human review takes precedence when explicit review decision exists
        if decision in (FieldReviewDecision.CONFIRMED_ABSENT, FieldReviewDecision.CONFIRM_ABSENT):
            status = EvidenceFieldStatus.CONFIRMED_ABSENT
            uncertainty_text = f"An authorized forensic investigator ({reviewer or 'Examiner'}) explicitly confirmed that this field is absent from the inspected source."
            next_action = "Compare with independently obtained transaction record if corroboration is required."

        elif decision in (FieldReviewDecision.MARKED_UNREADABLE, FieldReviewDecision.MARK_UNREADABLE):
            status = EvidenceFieldStatus.UNREADABLE
            uncertainty_text = f"Investigator marked field as unreadable: {review_reason or 'Text is visually degraded or corrupted'}. Content appears to exist but value cannot be reliably deciphered."
            next_action = "Obtain an uncompressed, uncropped camera-original capture of the source document."

        elif decision in (FieldReviewDecision.CORRECTED, FieldReviewDecision.CORRECT):
            status = EvidenceFieldStatus.EXTRACTED
            effective_val = corrected_value or accepted_value
            uncertainty_text = f"Investigator manually corrected extracted value to '{effective_val}' (Reason: {review_reason or 'OCR character noise'}). Verbatim OCR text preserved for audit provenance."
            next_action = "Review provenance audit trail in Custody Ledger."
            corrected_value = effective_val

        elif decision in (FieldReviewDecision.ACCEPTED, FieldReviewDecision.ACCEPT):
            status = EvidenceFieldStatus.EXTRACTED
            uncertainty_text = f"Investigator confirmed and accepted proposed candidate value '{accepted_value or (cand.normalized_value if cand else '')}'."
            next_action = "Field verified and promoted to Canonical Fact."

        elif decision in (FieldReviewDecision.REJECTED, FieldReviewDecision.REJECT):
            status = EvidenceFieldStatus.NOT_DETECTED
            uncertainty_text = f"Proposed extraction candidate was rejected by investigator ({review_reason or 'Spurious token match'})."
            next_action = "Inspect source image tokens at higher zoom or confirm absence."

        # 2. No human review decision yet (UNREVIEWED or REOPENED)
        elif cand is not None:
            # Check confidence vs threshold
            has_low_confidence = cand.confidence < exp.confidence_threshold
            has_ambiguity_notes = bool(cand.review_notes and "flagged" in cand.review_notes.lower())

            if has_low_confidence or has_ambiguity_notes:
                status = EvidenceFieldStatus.REVIEW_REQUIRED
                conf_pct = round(cand.confidence * 100, 1)
                thresh_pct = round(exp.confidence_threshold * 100, 1)
                uncertainty_text = (
                    f"A candidate was detected ('{cand.raw_text}'), but machine confidence ({conf_pct}%) is below the "
                    f"verification threshold ({thresh_pct}%). Investigator confirmation required before canonical promotion."
                )
                next_action = f"Inspect token '{cand.token_ids[0] if cand.token_ids else ''}' in Bounding Box Inspector and confirm or correct value."
            else:
                status = EvidenceFieldStatus.EXTRACTED
                uncertainty_text = (
                    f"Candidate field extracted with {round(cand.confidence * 100, 1)}% confidence. "
                    f"Matches expected {exp.evidence_type} pattern."
                )
                next_action = "Review and accept candidate into active Canonical Facts."

        else:
            # Candidate was NOT detected by machine extraction
            # Critical Rule: Never automatically turn NOT_DETECTED into CONFIRMED_ABSENT!
            # Critical Rule: Do not classify an unprocessed page or region as NOT_DETECTED!
            if not doc_coverage.is_fully_processed or doc_coverage.failed_pages > 0:
                status = EvidenceFieldStatus.NOT_DETECTED
                uncertainty_text = (
                    f"Field was not detected, but document processing was incomplete ({doc_coverage.failed_pages} page(s) failed). "
                    f"Completeness cannot be established until all pages are successfully processed."
                )
                next_action = "Process failed or skipped document pages to establish complete coverage."
            else:
                status = EvidenceFieldStatus.NOT_DETECTED
                uncertainty_text = (
                    f"{exp.display_name} was not detected by machine extraction. "
                    f"This is not proof that the field is absent from the underlying transaction or source document. "
                    f"Investigator manual inspection required before concluding absence."
                )
                next_action = "Inspect source document visually. If confirmed missing, mark field as Confirmed Absent."

        # Retain audit record if review occurred
        audit_records: List[FieldReviewAuditRecord] = []
        if rev_info and "audit_history" in rev_info:
            audit_records = list(rev_info["audit_history"])
        elif rev_info and decision != FieldReviewDecision.UNREVIEWED:
            audit_records.append(
                FieldReviewAuditRecord(
                    decision_id=f"audit_{exp.field_name}_{int(datetime.datetime.now(datetime.timezone.utc).timestamp())}",
                    field_name=exp.field_name,
                    decision=decision,
                    previous_decision=FieldReviewDecision(rev_info.get("previous_decision")) if rev_info.get("previous_decision") in FieldReviewDecision.__members__ else None,
                    previous_status=rev_info.get("previous_status"),
                    new_status=status.value,
                    reviewer=reviewer or "Forensic Examiner",
                    reviewer_id=reviewer,
                    timestamp_iso=review_timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    review_reason=review_reason or "Review recorded by examiner.",
                    reason=review_reason,
                    original_raw_text=cand.raw_text if cand else rev_info.get("original_raw_text"),
                    original_candidate_value=cand.normalized_value if cand else None,
                    original_confidence=cand.confidence if cand else rev_info.get("original_confidence"),
                    accepted_or_corrected_value=corrected_value or accepted_value or (cand.normalized_value if cand else None),
                    accepted_value=corrected_value or accepted_value,
                )
            )

        return FieldAssessment(
            field_name=exp.field_name,
            display_name=exp.display_name,
            evidence_type=exp.evidence_type,
            is_required=exp.is_required,
            status=status,
            candidate_id=cand.candidate_id if cand else None,
            candidate_value=cand.normalized_value if cand else None,
            raw_ocr_text=cand.raw_text if cand else rev_info.get("original_raw_text"),
            confidence=cand.confidence if cand else rev_info.get("original_confidence"),
            source_artifact_id=artifact_id,
            extraction_run_id=run_id,
            page_number=cand.page_number if cand and hasattr(cand, "page_number") and cand.page_number else 1,
            source_coordinates=cand.polygon if cand else None,
            token_ids=cand.token_ids if cand else [],
            review_decision=decision,
            reviewer=reviewer,
            review_timestamp_iso=review_timestamp,
            review_reason=review_reason,
            accepted_value=accepted_value,
            corrected_value=corrected_value,
            uncertainty_explanation=uncertainty_text,
            next_recommended_action=next_action,
            expectation_rationale=exp.expectation_rationale,
            audit_history=audit_records,
        )

    @classmethod
    def evaluate_completeness(
        cls,
        artifact_id: str,
        artifact_type: str,
        case_id: str,
        candidates: Optional[List[Any]] = None,
        coverage: Optional[DocumentProcessingCoverage] = None,
        review_records: Optional[Dict[str, List[FieldReviewAuditRecord]]] = None,
    ) -> ArtifactCompletenessReport:
        """Convenience method matching evaluation signature across testing and analytics pipelines."""
        from tarka.ocr.schemas import OCRExtractionResult
        cands = candidates or []
        mock_ocr = OCRExtractionResult(
            run_id=f"run_{artifact_id}",
            artifact_id=artifact_id,
            case_id=case_id,
            image_width=1000,
            image_height=1000,
            engine_name="CompletenessTestEngine",
            engine_version="1.0.0",
            extracted_at_iso=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            tokens=[],
            candidates=cands,
            full_text="",
        )
        existing_revs: Dict[str, Dict[str, Any]] = {}
        if review_records:
            for fname, rec_list in review_records.items():
                if rec_list:
                    last_rec = rec_list[-1]
                    existing_revs[fname] = {
                        "decision": last_rec.decision.value if hasattr(last_rec.decision, "value") else str(last_rec.decision),
                        "reviewer": getattr(last_rec, "reviewer_id", None) or getattr(last_rec, "reviewer", "Examiner"),
                        "timestamp_iso": getattr(last_rec, "timestamp_iso", datetime.datetime.now(datetime.timezone.utc).isoformat()),
                        "review_reason": getattr(last_rec, "reason", None) or getattr(last_rec, "review_reason", ""),
                        "accepted_value": getattr(last_rec, "accepted_value", None) or getattr(last_rec, "accepted_or_corrected_value", None),
                        "corrected_value": getattr(last_rec, "accepted_value", None) or getattr(last_rec, "accepted_or_corrected_value", None),
                        "original_raw_text": getattr(last_rec, "original_raw_text", None),
                        "original_confidence": getattr(last_rec, "original_confidence", None),
                        "audit_history": rec_list,
                    }

        art_lower = artifact_type.lower()
        if "statement" in art_lower or "bank" in art_lower:
            fname = f"{artifact_id}.csv"
        elif "pdf" in art_lower or "document" in art_lower:
            fname = f"{artifact_id}.pdf"
        elif "cdr" in art_lower:
            fname = f"{artifact_id}_cdr.csv"
        elif "chat" in art_lower:
            fname = f"{artifact_id}_chat.txt"
        else:
            fname = f"{artifact_id}.png"

        return cls.assess_artifact(
            artifact_id=artifact_id,
            case_id=case_id,
            filename=fname,
            ocr_result=mock_ocr,
            coverage=coverage,
            existing_reviews=existing_revs,
        )

    @classmethod
    def _map_candidate_type_to_field_name(cls, c_type: Any) -> Optional[str]:
        """Translates candidate field enum to canonical expected field name."""
        val = c_type.value if hasattr(c_type, "value") else str(c_type)
        mapping = {
            "AMOUNT": "amount",
            "RRN": "rrn",
            "PAYEE_VPA": "payee_vpa",
            "TRANSACTION_DATE": "transaction_date",
            "TRANSACTION_TIME": "transaction_time",
            "STATUS": "status",
            "PAYER_ACCOUNT": "payer_account",
        }
        return mapping.get(str(val).upper())
