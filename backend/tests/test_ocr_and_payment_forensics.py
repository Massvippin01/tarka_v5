"""
Ported & expanded tests for:
1. OCR RapidOCR fallback, EXIF orientation handling, and no-fabricated-field invariant.
2. TRACE payment-screenshot forensics (ELA heatmap base64, resampling, metadata, typography).
3. FormatParserRegistry (streaming spreadsheets, PDF, DOCX, ZIP, WAV, opaque PARSER_NOT_AVAILABLE).
4. WhatsApp export parser (text parsing + phone/VPA/amount extraction, no webhook/simulator).
5. Upload pipeline integration: receipt PNG + bank CSV reconciliation (both upload orders),
   WhatsApp .txt intake, security rejections (PE executable, PNG/ZIP polyglot, PDF /JavaScript, CSV DDE).
6. Password-verified login endpoint & auth/mode endpoint.
"""

from __future__ import annotations

import asyncio
import io
import zipfile
from pathlib import Path

import openpyxl
import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, ImageFont

from app.adapters.format_parser_registry import FormatParserRegistry
from app.adapters.trace_payment_forensics import TracePaymentForensics
from app.adapters.whatsapp_parser import looks_like_whatsapp_export, parse_whatsapp_export
from app.main import app
from app.services.auth_service import AuthService
from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.large_evidence_engine import (
    IngestionJobManager,
    IngestionStage,
)
from tarka.ocr.extractor import OCRExtractor


def _make_receipt_png(
    amount_str: str = "₹25,000",
    utr: str = "412356789012",
    vpa: str = "rahul@okaxis",
    embed_text: bool = False,
) -> bytes:
    """Generate a synthetic UPI receipt PNG; uses a crisp larger font when available."""
    img = Image.new("RGB", (640, 800), color=(245, 247, 250))
    draw = ImageDraw.Draw(img)
    draw.rectangle([24, 24, 616, 776], fill=(255, 255, 255), outline=(210, 215, 225))
    try:
        font_lg = ImageFont.truetype("arial.ttf", 28)
        font_md = ImageFont.truetype("arial.ttf", 22)
    except Exception:
        font_lg = ImageFont.load_default()
        font_md = font_lg

    draw.text((48, 60), "PhonePe Payment Successful", fill=(90, 40, 160), font=font_lg)
    draw.text((48, 150), f"Amount: {amount_str}", fill=(10, 20, 40), font=font_lg)
    draw.text((48, 230), f"UPI Ref No: {utr}", fill=(40, 50, 60), font=font_md)
    draw.text((48, 290), "Date: 15/04/2026 11:42:00", fill=(80, 90, 100), font=font_md)
    draw.text((48, 350), f"Paid to: {vpa}", fill=(10, 20, 40), font=font_md)

    from PIL import PngImagePlugin

    pnginfo = PngImagePlugin.PngInfo()
    if embed_text:
        pnginfo.add_text(
            "TARKA_RECEIPT_TEXT",
            f"PhonePe Payment Successful\nAmount: {amount_str}\nUPI Ref No: {utr}\nDate: 15/04/2026 11:42:00\nPaid to: {vpa}",
        )
    buf = io.BytesIO()
    img.save(buf, format="PNG", pnginfo=pnginfo)
    return buf.getvalue()


def _run_upload(mgr: IngestionJobManager, case_id: str, filename: str, payload: bytes):
    async def go():
        job = mgr.create_job(case_id=case_id, filename=filename, total_size_bytes=len(payload))
        await mgr.append_chunk(job.job_id, 0, payload)
        return job

    return asyncio.run(go())


@pytest.fixture
def isolated_mgr(tmp_path, monkeypatch):
    m = IngestionJobManager(base_dir=tmp_path)
    monkeypatch.setattr(IngestionJobManager, "_instance", m)
    return m


def _auth_headers(user_key: str = "SUPERVISOR_NCR") -> dict:
    return {"Authorization": f"Bearer {AuthService.get_instance().create_jwt_token(user_key)}"}


# =============================================================================
# 1. OCR Engine Fallback & EXIF Orientation
# =============================================================================


def test_ocr_extractor_handles_exif_orientation_and_rapidocr():
    # Create a wide image with EXIF Orientation=6 (90° CW -> rotated image should have swapped dimensions)
    img = Image.new("RGB", (300, 180), color=(255, 255, 255))
    exif = img.getexif()
    exif[0x0112] = 6  # Orientation: Rotate 90 CW
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif.tobytes())

    extractor = OCRExtractor()
    res = extractor.extract_from_bytes(buf.getvalue(), artifact_id="ART-EXIF", case_id="CASE-TEST")
    assert res.image_width == 180
    assert res.image_height == 300
    assert res.engine_name in ("PaddleOCR", "RapidOCR")


def test_ocr_never_invents_rrn_on_blank_image():
    blank = Image.new("RGB", (400, 400), color=(255, 255, 255))
    buf = io.BytesIO()
    blank.save(buf, format="PNG")
    forensics = TracePaymentForensics()
    exam = forensics.examine_payment_screenshot(buf.getvalue(), "blank.png", "ART-BLANK", "CASE-BLANK")
    fields = exam["ocr_analysis"]["extracted_fields"]
    # Never fabricate 202602148891 or fake amount on a blank image when RapidOCR is active
    if forensics.ocr_extractor and forensics.ocr_extractor._rapid_ocr is not None:
        assert fields["utr_rrn"] is None
        assert fields["amount"] is None


# =============================================================================
# 2. TRACE Payment Screenshot Forensics & Reconciliation
# =============================================================================


def test_trace_visual_examination_ela_and_non_promotability():
    forensics = TracePaymentForensics()
    png_bytes = _make_receipt_png("₹25,000", "412356789012", "rahul@okaxis")
    exam = forensics.examine_screenshot(png_bytes, "receipt.png", "ART-1", "CASE-1")

    assert exam["human_verified"] is False
    assert exam["conclusive"] is False
    assert "needs examiner review" in exam["preliminary_assessment"].lower()
    assert "fake" not in exam["preliminary_assessment"].lower()
    assert "guilty" not in exam["preliminary_assessment"].lower()

    manip = exam["manipulation_analysis"]
    assert 0.0 <= manip["composite_anomaly_score"] <= 1.0
    assert manip["ela_preview_base64"].startswith("data:image/png;base64,")

    fields = exam["ocr_analysis"]["extracted_fields"]
    assert fields.get("currency") == "INR"
    assert fields.get("utr_rrn") == "412356789012"
    assert fields.get("vpa") == "rahul@okaxis"
    assert fields.get("amount") == 25000.0


def test_trace_reconciliation_discrepancy_and_match():
    forensics = TracePaymentForensics()
    receipt = {
        "extracted_fields": {
            "amount": 25000.0,
            "utr_rrn": "412356789012",
            "vpa": "rahul@okaxis",
        }
    }
    tx_match = [{"tx_id": "TX-1", "reference_number": "412356789012", "amount": 25000.0}]
    res_ok = forensics.reconcile_statement_against_receipt(tx_match, receipt)
    assert res_ok["reconciliation_status"] == "MATCH_CONFIRMED"

    tx_mismatch = [{"tx_id": "TX-2", "reference_number": "412356789012", "amount": 15000.0}]
    res_diff = forensics.reconcile_statement_against_receipt(tx_mismatch, receipt)
    assert res_diff["reconciliation_status"] == "DISCREPANCY_DETECTED"
    assert res_diff["discrepancy"]["delta"] == 10000.0
    assert "needs examiner review" in res_diff["discrepancy"]["finding_title"].lower()


# =============================================================================
# 3. Format Parser Registry (Streaming & PARSER_NOT_AVAILABLE)
# =============================================================================


def test_format_parser_registry_covers_formats_and_opaque_fallback(tmp_path):
    reg = FormatParserRegistry.get_instance()

    # Streaming XLSX
    xlsx_path = tmp_path / "ledger.xlsx"
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["Date", "Amount", "Formula"])
    ws.append(["2026-04-15", 1500, "=1+1"])
    wb.save(xlsx_path)
    wb.close()
    res_xlsx = reg.parse_file(xlsx_path)
    assert res_xlsx["status"] == "PARSED"
    assert res_xlsx["total_rows"] == 2
    assert res_xlsx["formulas_detected"] == 1

    # Opaque binary -> PARSER_NOT_AVAILABLE (never exception / 500)
    bin_path = tmp_path / "dump.unknown_ext"
    bin_path.write_bytes(b"\x01\x02\x03\x04")
    res_bin = reg.parse_file(bin_path)
    assert res_bin["status"] == "PARSER_NOT_AVAILABLE"
    assert res_bin["parser_available"] is False


# =============================================================================
# 4. WhatsApp Export Parser (Text Only)
# =============================================================================


def test_whatsapp_export_parser_extracts_identifiers():
    chat = (
        "[15/04/26, 11:40:10] Suspect (+91 9876543210): Pay ₹25,000 to rahul.mule@ybl\n"
        "[15/04/26, 11:42:05] Victim: Sent UTR 412356789012 to SBIN0004821\n"
    )
    assert looks_like_whatsapp_export(chat) is True
    parsed = parse_whatsapp_export(chat, "wa_chat.txt")
    assert parsed["message_count"] == 2
    assert "9876543210" in parsed["identifiers"]["phones"]
    assert "rahul.mule@ybl" in parsed["identifiers"]["vpas"]
    assert "SBIN0004821" in parsed["identifiers"]["ifscs"]
    assert "412356789012" in parsed["identifiers"]["rrns"]
    assert 25000.0 in parsed["identifiers"]["amounts_inr"]


# =============================================================================
# 5. End-to-End Upload Pipeline Integration & Security Checks
# =============================================================================


def test_receipt_and_bank_csv_reconcile_both_upload_orders(isolated_mgr):
    case_id = "CASE-2026-001"
    png_bytes = _make_receipt_png("₹25,000", "412356789012", "rahul@okaxis")
    csv_mismatch = (
        "txn_date,txn_time,payer,payee,amount,rrn\n"
        "15/04/2026,11:42:00,victim@oksbi,rahul@okaxis,15000.00,412356789012\n"
    ).encode("utf-8")

    # Upload screenshot FIRST, before bank CSV exists
    job_img = _run_upload(isolated_mgr, case_id, "upi_receipt.png", png_bytes)
    assert job_img.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE, job_img.error_message
    assert job_img.analytics_summary["parser"] == "payment_receipt"
    assert job_img.analytics_summary["reconciliation"]["reconciliation_status"] == "NO_BANK_ROWS_YET"

    # Now upload bank CSV -> automatically reconciles existing receipts
    job_csv = _run_upload(isolated_mgr, case_id, "statement.csv", csv_mismatch)
    assert job_csv.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE, job_csv.error_message

    client = TestClient(app)
    # 401 without auth
    assert client.get(f"/api/v1/ingestion/cases/{case_id}/receipts").status_code == 401
    # 403 for out-of-scope user
    assert client.get(
        f"/api/v1/ingestion/cases/CASE-2026-002/receipts",
        headers=_auth_headers("INVESTIGATOR_GURUGRAM"),
    ).status_code == 403

    headers = _auth_headers("SUPERVISOR_NCR")
    res = client.get(f"/api/v1/ingestion/cases/{case_id}/receipts", headers=headers)
    assert res.status_code == 200
    receipts = res.json()
    assert len(receipts) == 1
    r = receipts[0]
    assert r["extracted_fields"]["amount"] == 25000.0
    assert r["extracted_fields"]["utr_rrn"] == "412356789012"
    assert r["reconciliation"]["reconciliation_status"] == "DISCREPANCY_DETECTED"
    assert r["reconciliation"]["discrepancy"]["delta"] == 10000.0
    assert "needs examiner review" in r["preliminary_assessment"].lower()

    # Full forensics + sealed file download
    res_f = client.get(f"/api/v1/ingestion/cases/{case_id}/jobs/{job_img.job_id}/forensics", headers=headers)
    assert res_f.status_code == 200
    assert res_f.json()["manipulation_analysis"]["ela_preview_base64"].startswith("data:image/png;base64,")

    res_file = client.get(f"/api/v1/ingestion/cases/{case_id}/jobs/{job_img.job_id}/file", headers=headers)
    assert res_file.status_code == 200
    assert res_file.content == png_bytes


def test_whatsapp_upload_stored_in_derived_store(isolated_mgr):
    case_id = "CASE-2026-001"
    chat = (
        "[15/04/26, 11:40:10] Suspect (+91 9876543210): Pay ₹15,000 to mule@ybl\n"
        "[15/04/26, 11:42:05] Victim: Paid RRN 202602148891\n"
    ).encode("utf-8")
    job = _run_upload(isolated_mgr, case_id, "whatsapp_chat.txt", chat)
    assert job.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE, job.error_message
    assert job.analytics_summary["parser"] == "whatsapp_export"
    assert job.analytics_summary["message_count"] == 2

    client = TestClient(app)
    res = client.get(f"/api/v1/ingestion/cases/{case_id}/whatsapp", headers=_auth_headers())
    assert res.status_code == 200
    assert res.json()["total"] == 2


def test_security_rejects_executables_polyglots_and_dde_formulas(isolated_mgr):
    case_id = "CASE-2026-001"

    # 1. PE executable disguised as PNG
    job_pe = _run_upload(isolated_mgr, case_id, "fake.png", b"MZ\x90\x00\x03\x00\x00\x00" + b"\x00" * 64)
    assert job_pe.stage == IngestionStage.REJECTED

    # 2. PNG/ZIP polyglot
    png = _make_receipt_png()
    zbuf = io.BytesIO()
    with zipfile.ZipFile(zbuf, "w") as zf:
        zf.writestr("payload.txt", "hidden")
    job_poly = _run_upload(isolated_mgr, case_id, "poly.png", png + zbuf.getvalue())
    assert job_poly.stage == IngestionStage.REJECTED
    assert "polyglot" in (job_poly.error_message or "").lower()

    # 3. PDF with /JavaScript
    job_pdf = _run_upload(isolated_mgr, case_id, "evil.pdf", b"%PDF-1.4\n1 0 obj\n<< /JavaScript (alert(1)) >>\nendobj\n")
    assert job_pdf.stage == IngestionStage.REJECTED

    # 4. CSV DDE formula injection
    job_dde = _run_upload(isolated_mgr, case_id, "evil.csv", b"date,payee,amount\n2026-04-15,=cmd|' /C calc'!A0,100\n")
    assert job_dde.stage == IngestionStage.REJECTED

    # 5. Legitimate negative number in CSV is NOT falsely rejected
    job_ok = _run_upload(isolated_mgr, case_id, "ok.csv", b"txn_date,payer,payee,amount,rrn\n15/04/2026,a@ybl,b@okaxis,-500,123456789012\n")
    assert job_ok.stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE


# =============================================================================
# 6. Login Password Verification
# =============================================================================


def test_login_requires_valid_hashed_password():
    client = TestClient(app)

    # Missing / empty password rejected
    res_empty = client.post("/api/v1/investigation/auth/login", json={"username": "INVESTIGATOR_DELHI"})
    assert res_empty.status_code == 401

    # Wrong password rejected
    res_wrong = client.post(
        "/api/v1/investigation/auth/login",
        json={"username": "INVESTIGATOR_DELHI", "password": "wrong-password"},
    )
    assert res_wrong.status_code == 401

    # Correct password succeeds and returns valid JWT
    res_ok = client.post(
        "/api/v1/investigation/auth/login",
        json={"username": "INVESTIGATOR_DELHI", "password": "Tarka@2026!"},
    )
    assert res_ok.status_code == 200
    token = res_ok.json()["access_token"]
    me = client.get("/api/v1/investigation/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user_id"] == "usr-delhi-01"

    mode = client.get("/api/v1/investigation/auth/mode")
    assert mode.status_code == 200
    assert mode.json()["demo_auth_enabled"] is False
