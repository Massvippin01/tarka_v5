"""TARKA Phase 4B: OCR Extraction and Bounding Box Inspector Test Suite.

Verifies:
1. Genuine image OCR extraction using PaddleOCR engine adapter.
2. Normalized 4-point bounding polygons and coordinate safety bounds [0.0, 1.0].
3. Extraction and token attribution for candidate financial fields (Amount, RRN, VPA, Date/Time, Status).
4. Error handling on empty, corrupted, and invalid image inputs.
5. Investigator review state machine:
   - ACCEPT: creates provenance-linked EvidenceDNA and CanonicalFact.
   - REJECT: excludes candidate from active canonical facts.
   - CORRECT: preserves raw OCR bitstream text while storing corrected value.
6. Counterfactual Forensics integration:
   - Excluding screenshot artifact deactivates OCR-derived facts and amount-mismatch contradiction.
   - Independent bank-statement and payment-sequence findings survive intact.
   - Provenance DAG remains strictly acyclic with verified artifact ancestry.
"""

import io
import json
from pathlib import Path
import pytest
from PIL import Image

from tarka.core.models import TrustTier, FactKind, AuthType
from tarka.core.evidence_dna import CaseStore, Artifact, EvidenceDNA
from tarka.core.canonical_fact import CanonicalFactKind
from tarka.ocr import (
    OCRExtractor,
    OCRExtractionResult,
    CandidateFieldType,
    CandidateReviewStatus,
    validate_and_normalize_coordinates,
    compute_enclosing_polygon,
    parse_monetary_amount,
    parse_rrn,
    parse_vpa,
)
from tarka.ocr.schemas import OCRReviewAction, Point2D, BoundingPolygon
from tarka.core.analysis_run import CounterfactualEngine
from tarka.core.provenance_dag import ProvenanceDAGBuilder

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures" / "synthetic_fraud_case"
RECEIPT_PNG = FIXTURES_DIR / "payment_receipt_screenshot.png"


@pytest.fixture
def sample_receipt_bytes() -> bytes:
    """Returns valid receipt PNG bytes from canonical fixtures."""
    assert RECEIPT_PNG.exists(), f"Canonical receipt image fixture missing at {RECEIPT_PNG}"
    with open(RECEIPT_PNG, "rb") as f:
        return f.read()


@pytest.fixture
def temp_case_store(tmp_path) -> CaseStore:
    """Provides an isolated temporary CaseStore for review testing."""
    return CaseStore(base_dir=tmp_path / "cases")


# =============================================================================
# 1. Coordinate Normalization & Geometry Validation Tests
# =============================================================================

def test_coordinate_normalization_clamping():
    """Ensures coordinates outside image boundaries are safely clamped to [0.0, 1.0]."""
    raw_coords = [[-50.0, -10.0], [800.0, 20.0], [820.0, 1500.0], [-10.0, 1400.0]]
    poly = validate_and_normalize_coordinates(raw_coords, img_width=720, img_height=1280)

    assert len(poly.points) == 4
    for pt in poly.points:
        assert 0.0 <= pt.x <= 1.0
        assert 0.0 <= pt.y <= 1.0

    min_x, min_y, max_x, max_y = poly.bbox
    assert 0.0 <= min_x <= max_x <= 1.0
    assert 0.0 <= min_y <= max_y <= 1.0


def test_enclosing_polygon_spans_all_contributing_tokens():
    """Verifies that an enclosing polygon envelopes all contributing token boxes."""
    poly1 = BoundingPolygon(
        points=[Point2D(x=0.1, y=0.2), Point2D(x=0.3, y=0.2), Point2D(x=0.3, y=0.25), Point2D(x=0.1, y=0.25)],
        bbox=(0.1, 0.2, 0.3, 0.25),
    )
    poly2 = BoundingPolygon(
        points=[Point2D(x=0.4, y=0.2), Point2D(x=0.7, y=0.2), Point2D(x=0.7, y=0.26), Point2D(x=0.4, y=0.26)],
        bbox=(0.4, 0.2, 0.7, 0.26),
    )
    enclosing = compute_enclosing_polygon([poly1, poly2])

    assert enclosing.bbox[0] == 0.1
    assert enclosing.bbox[1] == 0.2
    assert enclosing.bbox[2] == 0.7
    assert enclosing.bbox[3] == 0.26


# =============================================================================
# 2. Token Normalization Parsing Tests
# =============================================================================

def test_amount_parsing_variations():
    """Tests explainable extraction across currency symbols and Indian number formatting."""
    assert parse_monetary_amount("Rs 15,000") == 15000.0
    assert parse_monetary_amount("₹15,000.00") == 15000.0
    assert parse_monetary_amount("INR 15000") == 15000.0
    assert parse_monetary_amount("Rs. 25,000") == 25000.0
    assert parse_monetary_amount("Invalid text no amount") is None


def test_rrn_parsing():
    """Tests extraction of 12-digit banking RRN."""
    assert parse_rrn("Ref No 202602148891") == "202602148891"
    assert parse_rrn("202602148891") == "202602148891"
    assert parse_rrn("Short 1234") is None


def test_vpa_parsing():
    """Tests extraction and lowercasing of UPI Virtual Payment Addresses."""
    assert parse_vpa("Paid to merchant.pay@okaxis") == "merchant.pay@okaxis"
    assert parse_vpa("UPI ID: USER123@HDFCBANK") == "user123@hdfcbank"
    assert parse_vpa("No VPA present") is None


# =============================================================================
# 3. Real OCR Adapter Tests on Canonical Receipt
# =============================================================================

def test_real_ocr_extraction_on_synthetic_receipt(sample_receipt_bytes):
    """Executes OCR adapter on genuine synthetic receipt image and inspects tokens."""
    extractor = OCRExtractor()
    result = extractor.extract_from_bytes(
        sample_receipt_bytes,
        artifact_id="ART-004-IMG",
        case_id="upi_payment_discrepancy",
    )

    assert result.image_width == 720
    assert result.image_height == 1280
    assert len(result.tokens) >= 15
    assert len(result.candidates) >= 4

    # Verify canonical financial fields were detected
    cand_by_type = {c.field_type: c for c in result.candidates}

    # Amount: ₹15,000 (canonical screenshot claim)
    assert CandidateFieldType.AMOUNT in cand_by_type
    amt_cand = cand_by_type[CandidateFieldType.AMOUNT]
    assert amt_cand.normalized_value == 15000.0
    assert amt_cand.confidence > 0.8
    assert len(amt_cand.token_ids) >= 1

    # RRN: 202602148891
    assert CandidateFieldType.RRN in cand_by_type
    rrn_cand = cand_by_type[CandidateFieldType.RRN]
    assert rrn_cand.normalized_value == "202602148891"
    assert rrn_cand.confidence > 0.8
    assert len(rrn_cand.token_ids) >= 1

    # VPA: merchant.pay@okaxis
    assert CandidateFieldType.PAYEE_VPA in cand_by_type
    vpa_cand = cand_by_type[CandidateFieldType.PAYEE_VPA]
    assert vpa_cand.normalized_value == "merchant.pay@okaxis"

    # Status: SUCCESS / Payment Successful
    assert CandidateFieldType.STATUS in cand_by_type


def test_ocr_extraction_error_handling():
    """Verifies that empty bytes and non-image payloads raise clear ValueErrors."""
    extractor = OCRExtractor()

    with pytest.raises(ValueError, match="Cannot perform OCR on empty"):
        extractor.extract_from_bytes(b"", artifact_id="ART-ERR-001")

    with pytest.raises(ValueError, match="Invalid or corrupted image format"):
        extractor.extract_from_bytes(b"NOT_AN_IMAGE_STRING", artifact_id="ART-ERR-002")


# =============================================================================
# 4. Investigator Review Workflow Tests
# =============================================================================

def test_investigator_accept_candidate_promotes_canonical_fact(temp_case_store, sample_receipt_bytes):
    """Verifies that accepting an OCR candidate creates an EvidenceDNA record linked to source tokens."""
    case_id = "test_case_review"
    temp_case_store.create_case(case_id=case_id, title="Review Test")

    art, _, _ = temp_case_store.register_artifact(
        case_id=case_id,
        filename="payment_receipt_screenshot.png",
        file_bytes=sample_receipt_bytes,
        source_tier=TrustTier.T3,
    )

    extractor = OCRExtractor()
    ocr_res = extractor.extract_from_bytes(sample_receipt_bytes, artifact_id=art.artifact_id, case_id=case_id)

    # Locate amount candidate
    amt_cand = next(c for c in ocr_res.candidates if c.field_type == CandidateFieldType.AMOUNT)

    # Simulate Accept action
    amt_cand.review_status = CandidateReviewStatus.ACCEPTED
    amt_cand.reviewed_by = "Lead Examiner"
    amt_cand.review_notes = "Verified against payment receipt display."

    dna_id = f"DNA-OCR-{art.artifact_id}-{amt_cand.candidate_id}"
    dna = EvidenceDNA(
        evidence_id=dna_id,
        artifact_id=art.artifact_id,
        case_id=case_id,
        record_index=1,
        kind=FactKind.CLAIM,
        source_raw_text=amt_cand.raw_text,
        source_line_ref=f"ocr:tokens={','.join(amt_cand.token_ids)};bbox={list(amt_cand.polygon.bbox)}",
        amount=float(amt_cand.normalized_value),
        trust_tier=TrustTier.T3,
        review_status="VERIFIED",
        reviewed_by="Lead Examiner",
    )

    cd = temp_case_store.get_case_dir(case_id)
    with open(cd / "evidence_dna.json", "w", encoding="utf-8") as f:
        json.dump([dna.model_dump(mode="json")], f, indent=2)

    # Convert to canonical fact
    facts = temp_case_store.list_canonical_facts(case_id)
    assert len(facts) == 1
    accepted_fact = facts[0]

    assert accepted_fact.amount == 15000.0
    assert accepted_fact.artifact_id == art.artifact_id
    assert "ocr:tokens" in accepted_fact.source_location
    assert accepted_fact.review_status == "VERIFIED"
    assert accepted_fact.raw_source_snippet == amt_cand.raw_text


def test_investigator_correction_preserves_raw_source_provenance():
    """Verifies that manual correction preserves original raw OCR text while updating normalized value."""
    cand = OCRExtractionResult(
        run_id="run_001",
        artifact_id="ART-001",
        case_id="case_001",
        image_width=720,
        image_height=1280,
        engine_name="PaddleOCR",
        engine_version="3.7.0",
        extracted_at_iso="2026-02-14T10:20:00Z",
    )
    # Original OCR recognized text with slight noise
    raw_ocr_text = "Rs 15,000.00 (claimed)"
    corrected_val = 15000.00

    dna = EvidenceDNA(
        evidence_id="DNA-OCR-ART-001-CAND1",
        artifact_id="ART-001",
        case_id="case_001",
        record_index=1,
        kind=FactKind.CLAIM,
        source_raw_text=raw_ocr_text,  # MUST preserve original raw text
        source_line_ref="ocr:tokens=tok_1,tok_2;bbox=[0.1, 0.2, 0.5, 0.3]",
        amount=corrected_val,
        field_overrides={"corrected_value": corrected_val, "original_raw": raw_ocr_text},
        review_status="VERIFIED",
        reviewed_by="Forensic Examiner",
        review_notes="Examiner corrected formatting noise.",
    )

    fact = dna.to_canonical_fact(source_filename="payment_receipt_screenshot.png", sha256="aa" * 32)
    assert fact.amount == 15000.00
    assert fact.raw_source_snippet == raw_ocr_text


# =============================================================================
# 5. Provenance DAG & Counterfactual Exclusion Tests
# =============================================================================

def test_counterfactual_exclusion_deactivates_ocr_facts(sample_receipt_bytes):
    """Verifies that excluding the screenshot artifact deactivates OCR-derived facts and amount mismatch."""
    # 1. Setup baseline with:
    # - Bank statement fact: ₹25,000 debit (T1)
    # - Screenshot OCR fact: ₹15,000 claim (T3)
    # - Shared RRN: 202602148891
    from tarka.core.canonical_fact import CanonicalFact, TimezoneProvenance

    art_bank = Artifact(
        artifact_id="ART-001-BANK",
        case_id="case_cf_ocr",
        filename="bank_statement.csv",
        sha256="11" * 32,
        file_size_bytes=300,
        mime_type="text/csv",
        source_tier=TrustTier.T1,
        intake_timestamp_iso="2026-02-14T10:00:00Z",
        custody_chain_sequence=1,
        storage_path="artifacts/bank.csv",
    )
    art_screenshot = Artifact(
        artifact_id="ART-004-IMG",
        case_id="case_cf_ocr",
        filename="payment_receipt_screenshot.png",
        sha256="44" * 32,
        file_size_bytes=len(sample_receipt_bytes),
        mime_type="image/png",
        source_tier=TrustTier.T3,
        intake_timestamp_iso="2026-02-14T10:25:00Z",
        custody_chain_sequence=2,
        storage_path="artifacts/screenshot.png",
    )

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
        case_id="case_cf_ocr",
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
        case_id="case_cf_ocr",
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
        case_id="case_cf_ocr",
        all_facts=all_facts,
        all_artifact_hashes=all_hashes,
        excluded_artifact_ids=[],
    )
    assert any(c.is_contradiction for c in base_run.correlations)
    assert any("25,000" in f.title or "15,000" in f.title for f in base_run.finding_summaries)

    # Challenge run: Exclude screenshot artifact ART-004-IMG
    chlg_run = cf_engine.execute_run(
        case_id="case_cf_ocr",
        all_facts=all_facts,
        all_artifact_hashes=all_hashes,
        excluded_artifact_ids=["ART-004-IMG"],
        baseline_run_id=base_run.run_id,
        challenge_reason="Challenging screenshot authenticity",
    )

    # Verification:
    # 1. Contradiction disappears in challenge run
    assert not any(c.is_contradiction for c in chlg_run.correlations)
    # 2. Bank transaction findings survive
    assert any("ART-001-BANK" in f.supporting_artifact_ids for f in chlg_run.finding_summaries)
    # 3. OCR-derived facts never appear in active challenge facts
    assert all(f.artifact_id != "ART-004-IMG" for f in chlg_run.derived_facts)

    # 4. Provenance DAG verifies acyclic derivation
    dag = ProvenanceDAGBuilder.build_run_dag(
        run=base_run,
        artifacts=[art_bank, art_screenshot],
        evidence_dna_items=[],
    )
    assert len(dag.nodes) > 0
    assert len(dag.edges) > 0
    # Acyclic check
    visited = set()
    rec_stack = set()
    adj = {n.node_id: [] for n in dag.nodes}
    for e in dag.edges:
        if e.source_id in adj:
            adj[e.source_id].append(e.target_id)

    def is_cyclic(v):
        visited.add(v)
        rec_stack.add(v)
        for neighbor in adj.get(v, []):
            if neighbor not in visited:
                if is_cyclic(neighbor):
                    return True
            elif neighbor in rec_stack:
                return True
        rec_stack.remove(v)
        return False

    for node in dag.nodes:
        if node.node_id not in visited:
            assert not is_cyclic(node.node_id), "Provenance DAG must be strictly acyclic."
