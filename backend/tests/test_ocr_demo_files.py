"""OCR on the generated demo receipts (demo_evidence_files/ocr), reconciliation and graceful no-engine behaviour."""
from pathlib import Path

import pytest

from app.adapters.trace_payment_forensics import TracePaymentForensics
from tarka.ocr.extractor import OCRExtractor

DEMO = Path(__file__).resolve().parents[2] / "demo_evidence_files" / "ocr"
BANK_ROW = {"job_id": "J", "line": 353008, "ts": 1789012980.0, "payer": "victim0_4@oksbi",
            "payee": "mule0_a0@okaxis", "amount": 76000.0, "ref": "700000353006", "filename": "stmt.csv"}


@pytest.fixture(scope="module")
def trace():
    return TracePaymentForensics()


def _exam(trace, name):
    return trace.examine_payment_screenshot((DEMO / name).read_bytes(), name, "ART-T", "CASE-T")


def test_genuine_receipt_fields(trace):
    f = _exam(trace, "upi_receipt_genuine.png")["ocr_analysis"]["extracted_fields"]
    assert (f["amount"], f["utr_rrn"], f["vpa"]) == (76000.0, "700000353006", "mule0_a0@okaxis")
    assert f["upi_app"] is None  # not named on the receipt: stays empty, not guessed from the UPI handle


def test_tampered_receipt_flagged_for_review(trace):
    exam = _exam(trace, "upi_receipt_tampered.png")
    assert any(x["source"] == "EXIF_METADATA" and "needs examiner review" in x["summary"] for x in exam["findings"])
    assert "fake" not in str(exam["findings"]).lower()
    assert exam["ocr_analysis"]["extracted_fields"]["amount"] == 7600.0


def test_reconciliation_genuine_matches_tampered_contradicts(trace):
    g = _exam(trace, "upi_receipt_genuine.png")["ocr_analysis"]["extracted_fields"]
    t = _exam(trace, "upi_receipt_tampered.png")["ocr_analysis"]["extracted_fields"]
    rg = trace.reconcile_against_derived_rows(g, [BANK_ROW])
    assert rg["reconciliation_status"] == "MATCH_CONFIRMED" and rg["matched_row"]["line"] == 353008
    rt = trace.reconcile_against_derived_rows(t, [BANK_ROW])
    assert rt["reconciliation_status"] == "DISCREPANCY_DETECTED"


def test_amount_match_needs_time_window(trace):
    fields = {"amount": 76000.0, "utr_rrn": None, "transaction_date": "10 Sep 2026", "transaction_time": "09:33AM"}
    assert trace.reconcile_against_derived_rows(fields, [{**BANK_ROW, "ref": "x"}])["reconciliation_status"] == "PROBABILISTIC_AMOUNT_ONLY_MATCH"
    far = {**BANK_ROW, "ref": "x", "ts": BANK_ROW["ts"] + 3600}
    assert trace.reconcile_against_derived_rows(fields, [far])["reconciliation_status"] == "UNMATCHED_IN_STATEMENT"




def test_missing_ocr_engine_is_graceful():
    ex = OCRExtractor.__new__(OCRExtractor)
    ex._paddle_ocr = ex._rapid_ocr = None
    t = TracePaymentForensics(ocr_extractor=ex)
    exam = t.examine_payment_screenshot((DEMO / "upi_receipt_genuine.png").read_bytes(), "x.png", "A", "C")
    ocr = exam["ocr_analysis"]
    assert ocr["ocr_status"] == "OCR engine not available" and ocr["token_count"] == 0
    assert all(ocr["extracted_fields"][k] is None for k in ("amount", "utr_rrn", "vpa"))
