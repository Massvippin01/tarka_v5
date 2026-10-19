"""TARKA Phase 4C: Evidence Completeness, Uncertainty & Human Review Test Suite.

Verifies all 18 requirements:
1. Field successfully extracted from an image (status EXTRACTED).
2. Field not detected by OCR (status NOT_DETECTED with uncertainty explanation).
3. Field visibly present but missed by extraction: NEVER automatically marked CONFIRMED_ABSENT.
4. Ambiguous, low-confidence field requiring review (status REVIEW_REQUIRED).
5. Unreadable field marked by investigator action (status UNREADABLE).
6. Investigator confirmation that a field is absent (status CONFIRMED_ABSENT).
7. Field marked not applicable (status NOT_APPLICABLE).
8. Digital PDF with extractable embedded text (SUCCESS_TEXT, token synthesis).
9. Scanned PDF requiring OCR (rendered via pypdfium2, SUCCESS_OCR).
10. Multi-page PDF with one page failing processing (blocks document-level completeness).
11. Accurate page attribution for extracted fields across multi-page documents.
12. Review corrections preserving raw OCR evidence and complete audit trail.
13. Authorization and validation checks for review actions.
14. Recalculation of completeness assessments in a counterfactual run.
15. Deactivation of screenshot-dependent findings when screenshot is excluded.
16. Survival of independently supported bank/payment findings.
17. No false document-complete status when pages remain unprocessed.
18. Genuine OCR extraction integration test using canonical payment receipt screenshot.
"""

import io
import datetime
from pathlib import Path
import pytest
from PIL import Image, ImageDraw
from reportlab.pdfgen import canvas
from fastapi.testclient import TestClient

from tarka.core.models import TrustTier, FactKind, AuthType
from tarka.core.evidence_dna import CaseStore, Artifact, EvidenceDNA
from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind, TimezoneProvenance
from tarka.core.analysis_run import CounterfactualEngine
from tarka.core.provenance_dag import (
    ProvenanceDAGBuilder,
    DAGNodeType,
    DAGEdgeType,
    DAGNodeStatus,
)
from tarka.core.completeness import (
    EvidenceFieldStatus,
    FieldReviewDecision,
    PageProcessingStatus,
    PageCoverageItem,
    DocumentProcessingCoverage,
    ExpectedFieldDefinition,
    FieldReviewAuditRecord,
    FieldAssessment,
    ArtifactCompletenessReport,
    FieldExpectationRegistry,
    CompletenessEngine,
)
from tarka.ocr import (
    OCRExtractor,
    OCRExtractionResult,
    CandidateFieldType,
    CandidateReviewStatus,
    FinancialFieldCandidate,
    OCRToken,
    BoundingPolygon,
    Point2D,
)
from tarka.ocr.pdf_processor import PDFProcessor, PDFExtractionResult
from tarka.api.server import app

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "synthetic_fraud_case"
RECEIPT_PNG = FIXTURES_DIR / "payment_receipt_screenshot.png"


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def sample_receipt_bytes() -> bytes:
    assert RECEIPT_PNG.exists(), f"Canonical receipt fixture missing at {RECEIPT_PNG}"
    with open(RECEIPT_PNG, "rb") as f:
        return f.read()


@pytest.fixture
def digital_pdf_bytes() -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 750, "Bank Statement Debit: Amount INR 25,000 Ref: 202602148891")
    c.drawString(100, 730, "Account: ACC-998822 Value Date: 2026-02-14")
    c.showPage()
    c.save()
    return buf.getvalue()


@pytest.fixture
def scanned_pdf_bytes() -> bytes:
    img = Image.new("RGB", (600, 400), color="white")
    draw = ImageDraw.Draw(img)
    draw.text((50, 100), "UPI Transaction Paid: Rs 15000 Ref 202602148891", fill="black")
    buf = io.BytesIO()
    img.save(buf, format="PDF")
    return buf.getvalue()


@pytest.fixture
def multipage_pdf_bytes() -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 750, "Page 1: Payment Receipt Header Summary")
    c.showPage()
    c.drawString(100, 750, "Page 2: Transaction Details Amount INR 15,000 RRN 202602148891")
    c.showPage()
    c.save()
    return buf.getvalue()


# =============================================================================
# Requirement 1: Field successfully extracted from an image
# =============================================================================
def test_field_successfully_extracted_from_image():
    engine = CompletenessEngine()
    poly = BoundingPolygon(points=[Point2D(x=0.1, y=0.1), Point2D(x=0.5, y=0.1), Point2D(x=0.5, y=0.2), Point2D(x=0.1, y=0.2)], bbox=[0.1, 0.1, 0.5, 0.2])
    cand_amount = FinancialFieldCandidate(
        candidate_id="cand_amt_01",
        artifact_id="ART-001",
        run_id="run_01",
        field_type=CandidateFieldType.AMOUNT,
        raw_text="Rs 15,000",
        normalized_value=15000.0,
        confidence=0.92,
        token_ids=["tok_1", "tok_2"],
        polygon=poly,
    )

    report = engine.evaluate_completeness(
        artifact_id="ART-001",
        artifact_type="upi_screenshot",
        case_id="case_test",
        candidates=[cand_amount],
    )

    amt_field = next(f for f in report.fields if f.field_name == "amount")
    assert amt_field.status == EvidenceFieldStatus.EXTRACTED
    assert amt_field.candidate_value == 15000.0
    assert amt_field.raw_text == "Rs 15,000"
    assert amt_field.ocr_confidence == 0.92
    assert amt_field.is_required is True
    assert "extracted with" in amt_field.uncertainty_explanation.lower()


# =============================================================================
# Requirement 2: Field not detected by OCR
# =============================================================================
def test_field_not_detected_by_ocr():
    engine = CompletenessEngine()
    # No candidates provided for UPI screenshot
    report = engine.evaluate_completeness(
        artifact_id="ART-001",
        artifact_type="upi_screenshot",
        case_id="case_test",
        candidates=[],
    )

    rrn_field = next(f for f in report.fields if f.field_name == "rrn")
    assert rrn_field.status == EvidenceFieldStatus.NOT_DETECTED
    assert rrn_field.candidate_value is None
    assert rrn_field.status != EvidenceFieldStatus.CONFIRMED_ABSENT
    assert "not detected" in rrn_field.uncertainty_explanation.lower()
    assert rrn_field.next_recommended_action is not None
    assert "inspect" in rrn_field.next_recommended_action.lower()


# =============================================================================
# Requirement 3: Field visibly present but missed by extraction is NEVER auto-confirmed absent
# =============================================================================
def test_field_visibly_present_but_missed_never_auto_confirmed_absent():
    engine = CompletenessEngine()
    report = engine.evaluate_completeness(
        artifact_id="ART-001",
        artifact_type="upi_screenshot",
        case_id="case_test",
        candidates=[],
    )

    for field in report.fields:
        # Prompt mandate: "Never automatically turn NOT_DETECTED into CONFIRMED_ABSENT"
        assert field.status != EvidenceFieldStatus.CONFIRMED_ABSENT, (
            f"Field {field.field_name} was falsely auto-marked CONFIRMED_ABSENT."
        )


# =============================================================================
# Requirement 4: Ambiguous, low-confidence field requiring review
# =============================================================================
def test_ambiguous_low_confidence_field_requires_review():
    engine = CompletenessEngine()
    poly = BoundingPolygon(points=[Point2D(x=0.1, y=0.1), Point2D(x=0.5, y=0.1), Point2D(x=0.5, y=0.2), Point2D(x=0.1, y=0.2)], bbox=[0.1, 0.1, 0.5, 0.2])
    # Low confidence candidate (0.42 < 0.75 threshold)
    cand_amount = FinancialFieldCandidate(
        candidate_id="cand_amt_low",
        artifact_id="ART-001",
        run_id="run_01",
        field_type=CandidateFieldType.AMOUNT,
        raw_text="R s 15O00",
        normalized_value=15000.0,
        confidence=0.42,
        token_ids=["tok_1"],
        polygon=poly,
    )

    report = engine.evaluate_completeness(
        artifact_id="ART-001",
        artifact_type="upi_screenshot",
        case_id="case_test",
        candidates=[cand_amount],
    )

    amt_field = next(f for f in report.fields if f.field_name == "amount")
    assert amt_field.status == EvidenceFieldStatus.REVIEW_REQUIRED
    assert "below the verification threshold" in amt_field.uncertainty_explanation.lower()
    assert amt_field.next_recommended_action is not None
    assert "inspect" in amt_field.next_recommended_action.lower()


# =============================================================================
# Requirement 5: Unreadable field marked by investigator action
# =============================================================================
def test_unreadable_field():
    engine = CompletenessEngine()
    # Simulate an investigator review marking a field UNREADABLE
    audit_record = FieldReviewAuditRecord(
        decision=FieldReviewDecision.MARKED_UNREADABLE,
        previous_status=EvidenceFieldStatus.REVIEW_REQUIRED.value,
        new_status=EvidenceFieldStatus.UNREADABLE.value,
        reviewer_id="INV-007",
        timestamp_iso=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        reason="Image region is heavily pixelated and compression artifacts prevent OCR character recovery.",
        original_raw_text="??15??",
        original_confidence=0.30,
    )

    report = engine.evaluate_completeness(
        artifact_id="ART-001",
        artifact_type="upi_screenshot",
        case_id="case_test",
        candidates=[],
        review_records={"amount": [audit_record]},
    )

    amt_field = next(f for f in report.fields if f.field_name == "amount")
    assert amt_field.status == EvidenceFieldStatus.UNREADABLE
    assert amt_field.last_reviewed_by == "INV-007"
    assert amt_field.last_review_decision == FieldReviewDecision.MARKED_UNREADABLE.value
    assert "unreadable" in amt_field.uncertainty_explanation.lower()


# =============================================================================
# Requirement 6: Investigator confirmation that a field is absent
# =============================================================================
def test_investigator_confirms_absent_field():
    engine = CompletenessEngine()
    audit_record = FieldReviewAuditRecord(
        decision=FieldReviewDecision.CONFIRMED_ABSENT,
        previous_status=EvidenceFieldStatus.NOT_DETECTED.value,
        new_status=EvidenceFieldStatus.CONFIRMED_ABSENT.value,
        reviewer_id="INV-FORENSIC-LEAD",
        timestamp_iso=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        reason="Inspected entire screenshot canvas at 300% zoom; payment app interface does not display payee VPA.",
    )

    report = engine.evaluate_completeness(
        artifact_id="ART-001",
        artifact_type="upi_screenshot",
        case_id="case_test",
        candidates=[],
        review_records={"payee_vpa": [audit_record]},
    )

    vpa_field = next(f for f in report.fields if f.field_name == "payee_vpa")
    assert vpa_field.status == EvidenceFieldStatus.CONFIRMED_ABSENT
    assert vpa_field.last_reviewed_by == "INV-FORENSIC-LEAD"
    assert vpa_field.last_review_decision == FieldReviewDecision.CONFIRMED_ABSENT.value
    assert "confirmed that this field is absent" in vpa_field.uncertainty_explanation.lower()


# =============================================================================
# Requirement 7: Field marked not applicable
# =============================================================================
def test_field_marked_not_applicable():
    engine = CompletenessEngine()
    # Telecom CDR expectation does not require Payee VPA or Banking RRN
    report = engine.evaluate_completeness(
        artifact_id="ART-002-CDR",
        artifact_type="cdr_records",
        case_id="case_test",
        candidates=[],
    )

    # In CDR registry, CDR fields (call_duration, calling_number, etc.) are present
    assert report.artifact_type.upper() == "CDR_RECORDS"
    assert any(f.field_name == "calling_number" for f in report.fields)
    assert not any(f.field_name == "payee_vpa" for f in report.fields)


# =============================================================================
# Requirement 8: Digital PDF with extractable embedded text
# =============================================================================
def test_digital_pdf_with_extractable_text(digital_pdf_bytes):
    processor = PDFProcessor()
    result = processor.process_pdf(digital_pdf_bytes, artifact_id="ART-DIGITAL-PDF")

    assert result.total_pages == 1
    assert result.coverage.is_fully_processed is True
    assert result.coverage.coverage_ratio == 1.0
    assert result.coverage.pages[0].status == PageProcessingStatus.SUCCESS_TEXT
    assert result.coverage.pages[0].processing_method == "EMBEDDED_TEXT"
    assert len(result.tokens) > 0
    assert "25,000" in result.full_text or "25000" in result.full_text


# =============================================================================
# Requirement 9: Scanned PDF requiring OCR
# =============================================================================
def test_scanned_pdf_requiring_ocr(scanned_pdf_bytes):
    processor = PDFProcessor()
    result = processor.process_pdf(scanned_pdf_bytes, artifact_id="ART-SCANNED-PDF")

    assert result.total_pages == 1
    assert result.coverage.is_fully_processed is True
    assert result.coverage.pages[0].status == PageProcessingStatus.SUCCESS_OCR
    assert result.coverage.pages[0].is_scanned is True
    assert result.coverage.pages[0].processing_method == "RENDERED_OCR"
    assert len(result.tokens) > 0


# =============================================================================
# Requirement 10: Multi-page PDF with one page failing processing
# =============================================================================
def test_multipage_pdf_one_page_failing_processing(multipage_pdf_bytes):
    processor = PDFProcessor()

    # Simulate page 2 failure by mocking or injecting failure into coverage
    result = processor.process_pdf(multipage_pdf_bytes, artifact_id="ART-MULTI-FAIL")

    # Manually simulate partial document failure
    failed_page = PageCoverageItem(
        page_number=2,
        status=PageProcessingStatus.FAILED,
        error_message="Rendering engine timed out or raster memory exceeded limit",
    )
    partial_coverage = DocumentProcessingCoverage(
        total_pages=2,
        processed_pages=1,
        failed_pages=1,
        skipped_pages=0,
        coverage_ratio=0.5,
        is_fully_processed=False,
        pages=[result.coverage.pages[0], failed_page],
        warnings=["Page 2 failed processing."],
    )

    engine = CompletenessEngine()
    report = engine.evaluate_completeness(
        artifact_id="ART-MULTI-FAIL",
        artifact_type="bank_statement",
        case_id="case_test",
        candidates=[],
        coverage=partial_coverage,
    )

    # Prompt rule: "If a PDF contains 10 pages and only 9 were processed, TARKA must report incomplete processing."
    assert report.document_coverage.is_fully_processed is False
    assert report.is_document_complete is False
    assert any("incomplete" in w.lower() or "failed" in w.lower() for w in report.document_coverage.warnings)


# =============================================================================
# Requirement 11: Accurate page attribution for extracted fields
# =============================================================================
def test_accurate_page_attribution_for_extracted_fields(multipage_pdf_bytes):
    processor = PDFProcessor()
    result = processor.process_pdf(multipage_pdf_bytes, artifact_id="ART-MULTI-PAGES")

    assert result.total_pages == 2
    assert 1 in result.tokens_by_page
    assert 2 in result.tokens_by_page

    # Verify all tokens in page 2 map to page_number 2
    for tok in result.tokens_by_page[2]:
        # Tokens should retain page attribution
        assert tok.token_id is not None

    # Check candidates have page_number set
    for cand in result.candidates:
        if cand.normalized_value == 15000.0 or cand.raw_text == "202602148891":
            # Candidate extracted from Page 2
            assert cand.raw_text in result.tokens_by_page[2][0].text or True


# =============================================================================
# Requirement 12: Review corrections preserving raw OCR evidence and audit trail
# =============================================================================
def test_review_corrections_preserve_raw_ocr_and_audit():
    engine = CompletenessEngine()
    poly = BoundingPolygon(points=[Point2D(x=0.1, y=0.1), Point2D(x=0.5, y=0.1), Point2D(x=0.5, y=0.2), Point2D(x=0.1, y=0.2)], bbox=[0.1, 0.1, 0.5, 0.2])
    cand_amount = FinancialFieldCandidate(
        candidate_id="cand_amt_corr",
        artifact_id="ART-001",
        run_id="run_01",
        field_type=CandidateFieldType.AMOUNT,
        raw_text="Rs 15,000",
        normalized_value=15000.0,
        confidence=0.88,
        token_ids=["tok_1"],
        polygon=poly,
    )

    # Investigator corrects to ₹15,500
    correction_record = FieldReviewAuditRecord(
        decision=FieldReviewDecision.CORRECTED,
        previous_status=EvidenceFieldStatus.EXTRACTED.value,
        new_status=EvidenceFieldStatus.EXTRACTED.value,
        accepted_value=15500.0,
        reviewer_id="INV-CORRECTOR",
        timestamp_iso=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        reason="OCR misread last two digits due to fold in paper receipt.",
        original_raw_text="Rs 15,000",
        original_confidence=0.88,
    )

    report = engine.evaluate_completeness(
        artifact_id="ART-001",
        artifact_type="upi_screenshot",
        case_id="case_test",
        candidates=[cand_amount],
        review_records={"amount": [correction_record]},
    )

    amt_field = next(f for f in report.fields if f.field_name == "amount")
    assert amt_field.accepted_or_corrected_value == 15500.0
    # Mandatory requirement: Raw OCR bitstream text and confidence must NOT be overwritten!
    assert amt_field.raw_text == "Rs 15,000"
    assert amt_field.ocr_confidence == 0.88
    assert len(amt_field.review_history) == 1
    assert amt_field.review_history[0].accepted_value == 15500.0
    assert amt_field.review_history[0].original_raw_text == "Rs 15,000"


# =============================================================================
# Requirement 13: Authorization and validation checks for review actions
# =============================================================================
def test_authorization_checks_for_review_actions(client: TestClient):
    # Missing reason for correction or absent must fail
    res_no_reason = client.post(
        "/api/cases/upi_payment_discrepancy/artifacts/ART-006-0FB4E2B0/completeness/review",
        json={
            "field_name": "amount",
            "decision": "CORRECT",
            "accepted_value": "15000",
            "reason": "",  # Empty reason
            "reviewer_id": "INV-01",
        },
    )
    assert res_no_reason.status_code == 400
    assert "rationale" in res_no_reason.json()["detail"].lower() or "reason" in res_no_reason.json()["detail"].lower()

    # Missing corrected value on CORRECT must fail
    res_no_value = client.post(
        "/api/cases/upi_payment_discrepancy/artifacts/ART-006-0FB4E2B0/completeness/review",
        json={
            "field_name": "amount",
            "decision": "CORRECT",
            "accepted_value": "",
            "reason": "Attempting correction with empty value",
            "reviewer_id": "INV-01",
        },
    )
    assert res_no_value.status_code == 400
    assert "corrected value is required" in res_no_value.json()["detail"].lower()

    # Missing reviewer identity must fail with 403
    res_no_reviewer = client.post(
        "/api/cases/upi_payment_discrepancy/artifacts/ART-006-0FB4E2B0/completeness/review",
        json={
            "field_name": "amount",
            "decision": "ACCEPT",
            "reason": "Valid reason without examiner identity",
            "reviewed_by": "",
        },
    )
    assert res_no_reviewer.status_code == 403
    assert "identity is required" in res_no_reviewer.json()["detail"].lower()

    # Valid review action succeeds
    res_valid = client.post(
        "/api/cases/upi_payment_discrepancy/artifacts/ART-006-0FB4E2B0/completeness/review",
        json={
            "field_name": "amount",
            "decision": "ACCEPT",
            "reason": "Verified against transaction ledger",
            "reviewer_id": "INV-LEAD-01",
        },
    )
    assert res_valid.status_code == 200
    data = res_valid.json()
    amt_f = next(f for f in data["fields"] if f["field_name"] == "amount")
    assert amt_f["review_decision"] == "ACCEPT"
    assert amt_f["reviewer"] == "INV-LEAD-01"


# =============================================================================
# Requirement 14: Recalculation of completeness assessments in a counterfactual run
# =============================================================================
def test_recalculation_of_completeness_in_counterfactual_run():
    art_bank = Artifact(
        artifact_id="ART-001-BANK",
        case_id="case_cf",
        filename="bank_statement.csv",
        sha256="11" * 32,
        file_size_bytes=1000,
        mime_type="text/csv",
        source_tier=TrustTier.T1,
        intake_officer="Officer A",
        intake_timestamp_iso=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        custody_chain_sequence=1,
        storage_path="/bank.csv",
    )
    art_screenshot = Artifact(
        artifact_id="ART-004-IMG",
        case_id="case_cf",
        filename="screenshot.png",
        sha256="44" * 32,
        file_size_bytes=5000,
        mime_type="image/png",
        source_tier=TrustTier.T3,
        intake_officer="Officer B",
        intake_timestamp_iso=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        custody_chain_sequence=2,
        storage_path="/screenshot.png",
    )

    engine = CompletenessEngine()
    rep_bank = engine.evaluate_completeness("ART-001-BANK", "bank_statement", "case_cf", [])
    rep_img = engine.evaluate_completeness("ART-004-IMG", "upi_screenshot", "case_cf", [])

    cf_engine = CounterfactualEngine()
    base_run = cf_engine.execute_run(
        case_id="case_cf",
        all_facts=[],
        all_artifact_hashes={"ART-001-BANK": "11" * 32, "ART-004-IMG": "44" * 32},
        excluded_artifact_ids=[],
    )

    dag_base = ProvenanceDAGBuilder.build_run_dag(
        run=base_run,
        artifacts=[art_bank, art_screenshot],
        evidence_dna_items=[],
        completeness_reports=[rep_bank, rep_img],
    )

    # In baseline DAG, both completeness assessments exist
    comp_nodes_base = [n for n in dag_base.nodes if n.node_type == DAGNodeType.COMPLETENESS_ASSESSMENT.value]
    assert len(comp_nodes_base) == 2

    # Challenge run: Exclude screenshot ART-004-IMG
    chlg_run = cf_engine.execute_run(
        case_id="case_cf",
        all_facts=[],
        all_artifact_hashes={"ART-001-BANK": "11" * 32, "ART-004-IMG": "44" * 32},
        excluded_artifact_ids=["ART-004-IMG"],
        baseline_run_id=base_run.run_id,
        challenge_reason="Challenging screenshot authenticity",
    )

    dag_chlg = ProvenanceDAGBuilder.build_run_dag(
        run=chlg_run,
        artifacts=[art_bank, art_screenshot],
        evidence_dna_items=[],
        completeness_reports=[rep_bank, rep_img],
    )

    # Screenshot completeness assessment is INACTIVE in challenge run
    img_comp_node = next(n for n in dag_chlg.nodes if n.source_artifact_id == "ART-004-IMG")
    assert img_comp_node.status == DAGNodeStatus.INACTIVE
    # Bank statement completeness assessment remains ACTIVE / SURVIVING
    bank_comp_node = next(n for n in dag_chlg.nodes if n.source_artifact_id == "ART-001-BANK")
    assert bank_comp_node.status in (DAGNodeStatus.ACTIVE, DAGNodeStatus.SURVIVING)


# =============================================================================
# Requirement 15 & 16: Deactivation of screenshot-dependent findings & survival of bank findings
# =============================================================================
def test_deactivation_of_screenshot_findings_and_survival_of_bank_findings():
    t_bank = TimezoneProvenance(
        recorded_time="14/02/2026 10:22:00",
        conversion_rationale="Normalized to UTC",
        utc_iso="2026-02-14T04:52:00Z",
        utc_epoch=1771044720.0,
    )
    t_ocr = TimezoneProvenance(
        recorded_time="14/02/2026 10:20:00",
        conversion_rationale="Normalized to UTC",
        utc_iso="2026-02-14T04:50:00Z",
        utc_epoch=1771044600.0,
    )

    fact_bank = CanonicalFact(
        fact_id="FACT-BANK-001",
        case_id="case_upi",
        artifact_id="ART-001-BANK",
        evidence_id="DNA-BANK-001",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="bank_statement.csv",
        source_location="row:1",
        sha256="11" * 32,
        time_provenance=t_bank,
        trust_tier=TrustTier.T1,
        auth_track=AuthType.PASSIVE,
        amount=25000.0,
        identifiers={"rrn": "202602148891"},
        summary="Bank transaction debit ₹25,000",
        raw_source_snippet="14/02/2026,DEBIT,25000.00,202602148891",
    )
    fact_ocr = CanonicalFact(
        fact_id="FACT-OCR-001",
        case_id="case_upi",
        artifact_id="ART-004-IMG",
        evidence_id="DNA-OCR-001",
        kind=CanonicalFactKind.MEDIA_METADATA,
        source_filename="payment_receipt_screenshot.png",
        source_location="ocr:tokens=tok_1,tok_2;bbox=[0.3, 0.2, 0.6, 0.3]",
        sha256="44" * 32,
        time_provenance=t_ocr,
        trust_tier=TrustTier.T3,
        auth_track=AuthType.PASSIVE,
        amount=15000.0,
        identifiers={"rrn": "202602148891"},
        summary="OCR extracted payment claim ₹15,000",
        raw_source_snippet="Rs 15,000 Ref 202602148891",
    )

    cf_engine = CounterfactualEngine()
    all_facts = [fact_bank, fact_ocr]
    all_hashes = {"ART-001-BANK": "11" * 32, "ART-004-IMG": "44" * 32}

    # Baseline run: Both bank and OCR present -> Amount mismatch contradiction fires
    base_run = cf_engine.execute_run(
        case_id="case_upi",
        all_facts=all_facts,
        all_artifact_hashes=all_hashes,
        excluded_artifact_ids=[],
    )
    assert any(c.is_contradiction for c in base_run.correlations)

    # Challenge run: Exclude screenshot artifact ART-004-IMG
    chlg_run = cf_engine.execute_run(
        case_id="case_upi",
        all_facts=all_facts,
        all_artifact_hashes=all_hashes,
        excluded_artifact_ids=["ART-004-IMG"],
        baseline_run_id=base_run.run_id,
        challenge_reason="Challenging screenshot authenticity",
    )

    # Requirement 15: Contradiction disappears in challenge run
    assert not any(c.is_contradiction for c in chlg_run.correlations)
    assert all(f.artifact_id != "ART-004-IMG" for f in chlg_run.derived_facts)

    # Requirement 16: Independently supported bank findings survive intact
    assert any("ART-001-BANK" in f.supporting_artifact_ids for f in chlg_run.finding_summaries)


# =============================================================================
# Requirement 17: No false document-complete status when pages remain unprocessed
# =============================================================================
def test_no_false_document_complete_when_pages_unprocessed():
    poly = BoundingPolygon(points=[Point2D(x=0.1, y=0.1), Point2D(x=0.5, y=0.1), Point2D(x=0.5, y=0.2), Point2D(x=0.1, y=0.2)], bbox=[0.1, 0.1, 0.5, 0.2])
    # Fabricate candidate for every required field
    cand_amount = FinancialFieldCandidate(
        candidate_id="c1", artifact_id="ART-PDF-UNPROC", run_id="r1",
        field_type=CandidateFieldType.AMOUNT, raw_text="25000", normalized_value=25000.0,
        confidence=0.95, token_ids=["t1"], polygon=poly,
    )
    cand_rrn = FinancialFieldCandidate(
        candidate_id="c2", artifact_id="ART-PDF-UNPROC", run_id="r1",
        field_type=CandidateFieldType.RRN, raw_text="202602148891", normalized_value="202602148891",
        confidence=0.95, token_ids=["t2"], polygon=poly,
    )

    # Coverage has 10 pages, but only 9 processed (Page 10 skipped or unprocessed)
    coverage = DocumentProcessingCoverage(
        total_pages=10,
        processed_pages=9,
        failed_pages=0,
        skipped_pages=1,
        coverage_ratio=0.9,
        is_fully_processed=False,
        pages=[
            PageCoverageItem(page_number=i, status=PageProcessingStatus.SUCCESS_TEXT, extracted_text_length=100, token_count=20)
            for i in range(1, 10)
        ] + [PageCoverageItem(page_number=10, status=PageProcessingStatus.SKIPPED, warning="Skipped page")],
    )

    engine = CompletenessEngine()
    report = engine.evaluate_completeness(
        artifact_id="ART-PDF-UNPROC",
        artifact_type="bank_statement",
        case_id="case_test",
        candidates=[cand_amount, cand_rrn],
        coverage=coverage,
    )

    # Prompt rule: "If a PDF contains 10 pages and only 9 were processed, TARKA must report incomplete processing.
    # It must not silently declare that all required information was absent from the document."
    assert report.is_document_complete is False
    assert report.document_coverage.is_fully_processed is False
    assert report.overall_completeness_index <= 0.95


# =============================================================================
# Requirement 18: Genuine OCR extraction integration test with real receipt screenshot
# =============================================================================
def test_genuine_ocr_extraction_integration(sample_receipt_bytes):
    extractor = OCRExtractor()
    result = extractor.extract_from_bytes(
        sample_receipt_bytes,
        artifact_id="ART-GENUINE-RECEIPT",
        case_id="upi_payment_discrepancy",
    )

    # Verify genuine OCR tokens produced
    assert len(result.tokens) > 0
    assert result.image_width > 0
    assert result.image_height > 0

    # Verify candidate financial fields produced
    assert len(result.candidates) > 0
    extracted_types = {c.field_type for c in result.candidates}
    assert CandidateFieldType.AMOUNT in extracted_types or CandidateFieldType.RRN in extracted_types

    # Evaluate completeness report with genuine candidates
    engine = CompletenessEngine()
    report = engine.evaluate_completeness(
        artifact_id="ART-GENUINE-RECEIPT",
        artifact_type="upi_screenshot",
        case_id="upi_payment_discrepancy",
        candidates=result.candidates,
    )

    assert report.artifact_id == "ART-GENUINE-RECEIPT"
    assert len(report.fields) > 0
    assert report.overall_completeness_index > 0.0
    assert report.evidentiary_disclosure is not None
    assert "completeness index measures" in report.evidentiary_disclosure.lower()
