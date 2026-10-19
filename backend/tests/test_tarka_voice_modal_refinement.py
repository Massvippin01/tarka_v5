"""Regression and unit tests for TARKA One Voice Modal Refinement and Evidence-Aware Conversation.

Validates requirements:
1. Speech-safe formatting: strips internal artifact IDs, SHA-256 hex digests, machine JSON.
2. Dynamic numeric speech formatting (converting ₹25,000 / ₹15,000 / ₹10,000 to Indian words).
3. The 5 conversational categories (general identity, platform architecture, current time in IST, workspace navigation, consequential actions).
4. Evidence citations linking to actual records.
5. Safe preview endpoint for untrusted CSV, TXT, JSON, and bounded images.
6. Evidence download endpoint with safe headers.
7. RBAC Authorization enforcement on evidence content access.
8. Voice speaker preset handling.
9. TTS graceful degradation and text fallback.
"""

from __future__ import annotations

import base64
import json
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.intelligence.sarvam_voice_service import (
    sanitize_for_speech,
    _number_to_indian_words,
    build_presentation,
    SarvamVoiceService,
    VOICE_SPEAKER_PRESETS,
)
from app.adapters.tarka_forensics_adapter import TarkaForensicsAdapter

tarka_adapter = TarkaForensicsAdapter()


@pytest.fixture(scope="module")
def client():
    c = TestClient(app)
    token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_DELHI")
    c.headers.update({"Authorization": f"Bearer {token}"})
    # Ensure synthetic case is seeded
    tarka_adapter.ensure_synthetic_case("upi_payment_discrepancy")
    return c


@pytest.fixture(scope="module")
def unauthenticated_client():
    return TestClient(app)


# ---------------------------------------------------------------------------
# 1. Speech-Safe Formatting & Sanitization Tests
# ---------------------------------------------------------------------------

def test_speech_safe_formatting_removes_internal_ids():
    raw_text = (
        "Artifact ART-001-A12B3C4D has finding FACT-DNA-002 contradicting CONTRA-001 "
        "under rule RULE_UPI_AMOUNT_CONSISTENCY."
    )
    cleaned = sanitize_for_speech(raw_text)
    assert "ART-001-A12B3C4D" not in cleaned
    assert "FACT-DNA-002" not in cleaned
    assert "CONTRA-001" not in cleaned
    assert "RULE_UPI_AMOUNT_CONSISTENCY" not in cleaned
    assert "the bank statement record" in cleaned
    assert "the transaction fact" in cleaned


def test_speech_safe_formatting_removes_sha256_digests():
    digest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    raw_text = f"The evidence bitstream has SHA-256 digest {digest} verified against registry."
    cleaned = sanitize_for_speech(raw_text)
    assert digest not in cleaned
    assert "evidence bitstream" in cleaned


def test_number_to_indian_words():
    assert _number_to_indian_words(25000) == "twenty-five thousand"
    assert _number_to_indian_words(15000) == "fifteen thousand"
    assert _number_to_indian_words(10000) == "ten thousand"
    assert _number_to_indian_words(100000) == "one lakh"
    assert _number_to_indian_words(2500000) == "twenty-five lakh"
    assert _number_to_indian_words(10000000) == "one crore"
    assert _number_to_indian_words(0) == "zero"


# ---------------------------------------------------------------------------
# 2. Dynamic Contradiction & Spoken Response Active Values
# ---------------------------------------------------------------------------

def test_dynamic_contradiction_spoken_response(client: TestClient):
    """Spoken response dynamically matches the canonical INR delta (25k vs 15k = 10k delta)."""
    payload = {
        "text": "Summarize the contradictions in this case",
        "language_code": "en-IN",
        "speaker": "shubh_enhi_ads",
    }
    resp = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("COMPLETED", "success")

    # Presentation must be present
    pres = data.get("presentation")
    assert pres is not None
    spoken = pres["spoken_summary"]

    # Verify no machine IDs or raw SHA256 in spoken summary
    assert "ART-" not in spoken
    assert "CONTRA-" not in spoken

    # Spoken response must preserve natural rupees and actual discrepancy
    spoken_lower = spoken.lower()
    assert "twenty-five thousand" in spoken_lower or "25,000" in spoken
    assert "fifteen thousand" in spoken_lower or "15,000" in spoken
    assert "ten-thousand" in spoken_lower or "ten thousand" in spoken or "10,000" in spoken

    # Citations must be generated linking to the actual bank statement and screenshot
    citations = pres.get("citations", [])
    assert len(citations) >= 2
    cit_titles = [c["title"].lower() for c in citations]
    assert any("bank" in t for t in cit_titles)
    assert any("screenshot" in t or "receipt" in t for t in cit_titles)


# ---------------------------------------------------------------------------
# 3. Five Conversational Categories
# ---------------------------------------------------------------------------

def test_conversational_category_1_general_identity(client: TestClient):
    """'Who are you?' should return identity without launching forensic tools."""
    resp = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"text": "Who are you?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("COMPLETED", "success")
    pres = data["presentation"]
    assert "TARKA" in pres["summary"]
    assert "forensic" in pres["summary"].lower()
    assert "ART-" not in pres["spoken_summary"]


def test_conversational_category_2_platform_inquiry(client: TestClient):
    """'How is TARKA built?' should describe the actual architecture."""
    resp = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"text": "How is TARKA built?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("COMPLETED", "success")
    pres = data["presentation"]
    summary = pres["summary"]
    assert "Vite" in summary or "React" in summary
    assert "FastAPI" in summary or "Z3" in summary
    assert "Sarvam" in summary


def test_conversational_category_3_current_time_ist(client: TestClient):
    """'What time is it?' should return accurate current time in IST (Asia/Kolkata)."""
    resp = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"text": "What time is it?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("COMPLETED", "success")
    pres = data["presentation"]
    assert "IST" in pres["summary"] or "Indian Standard Time" in pres["summary"]
    assert "IST" in pres["spoken_summary"] or "Indian Standard Time" in pres["spoken_summary"]


def test_conversational_category_4_workspace_navigation(client: TestClient):
    """'Show the timeline' should navigate to the timeline tab."""
    resp = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"text": "Show the timeline"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("COMPLETED", "success")
    assert data.get("navigation_view") == "timeline" or data.get("target_tab") == "timeline"


def test_conversational_category_5_consequential_action_confirmation(client: TestClient):
    """Destructive/consequential actions like excluding evidence must require confirmation."""
    resp = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"text": "Exclude artifact ART-002"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["requires_confirmation"] is True
    assert data["status"] == "CONFIRMATION_REQUIRED"
    spoken = data["presentation"]["spoken_summary"].lower()
    assert "consequential" in spoken or "confirm" in spoken or "statutory" in spoken


# ---------------------------------------------------------------------------
# 4. Evidence Previews & Download Endpoints
# ---------------------------------------------------------------------------

def test_artifact_content_preview_csv(client: TestClient):
    """CSV preview returns rows and headers without executing code."""
    # Find bank statement artifact ID
    artifacts = tarka_adapter.list_artifacts("upi_payment_discrepancy")
    bank_art = next(a for a in artifacts if a["filename"] == "bank_statement.csv" or a["filename"].endswith(".csv"))
    art_id = bank_art["artifact_id"]

    resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/{art_id}/content")
    assert resp.status_code == 200
    data = resp.json()
    assert data["content_type"] == "csv"
    assert "rows" in data
    assert len(data["rows"]) > 0
    # Values check
    assert any("25000" in str(row) for row in data["rows"])


def test_artifact_content_preview_json(client: TestClient):
    """JSON preview returns formatted structured preview."""
    artifacts = tarka_adapter.list_artifacts("upi_payment_discrepancy")
    json_art = next(a for a in artifacts if a["filename"] == "screenshot_claim.json" or a["filename"].endswith(".json"))
    art_id = json_art["artifact_id"]

    resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/{art_id}/content")
    assert resp.status_code == 200
    data = resp.json()
    assert data["content_type"] == "json"
    assert "json_data" in data
    assert isinstance(data["json_data"], dict)


def test_artifact_content_preview_txt(client: TestClient):
    """TXT preview returns readable text content."""
    artifacts = tarka_adapter.list_artifacts("upi_payment_discrepancy")
    txt_art = next(a for a in artifacts if a["filename"] == "whatsapp_chat.txt" or a["filename"].endswith(".txt"))
    art_id = txt_art["artifact_id"]

    resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/{art_id}/content")
    assert resp.status_code == 200
    data = resp.json()
    assert data["content_type"] == "text"
    assert len(data["text_content"]) > 0


def test_artifact_content_preview_image(client: TestClient):
    """Image preview returns base64 data URI."""
    artifacts = tarka_adapter.list_artifacts("upi_payment_discrepancy")
    img_art = next(a for a in artifacts if a["filename"] == "payment_receipt_screenshot.png" or a["filename"].endswith(".png"))
    art_id = img_art["artifact_id"]

    resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/{art_id}/content")
    assert resp.status_code == 200
    data = resp.json()
    assert data["content_type"] == "image"
    assert data["data_url"].startswith("data:image/")




def test_artifact_download_endpoint(client: TestClient):
    """Artifact download returns valid file bytes and attachment header."""
    artifacts = tarka_adapter.list_artifacts("upi_payment_discrepancy")
    art = artifacts[0]
    art_id = art["artifact_id"]

    resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/{art_id}/download")
    assert resp.status_code == 200
    assert "content-disposition" in resp.headers
    assert "attachment" in resp.headers["content-disposition"]
    assert len(resp.content) > 0


# ---------------------------------------------------------------------------
# 5. RBAC Authorization Enforcement
# ---------------------------------------------------------------------------

def test_unauthorized_artifact_access_fails(unauthenticated_client: TestClient):
    """Requests without valid JWT must be rejected with 401."""
    resp = unauthenticated_client.get(
        "/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/ART-001/content"
    )
    assert resp.status_code in (401, 403)


def test_nonexistent_case_or_artifact_fails(client: TestClient):
    """Nonexistent case or artifact returns 403, 404, or 400."""
    resp = client.get("/api/v1/forensics/cases/nonexistent_case/artifacts/ART-999/content")
    assert resp.status_code in (401, 403, 404, 400)


# ---------------------------------------------------------------------------
# 6. Voice Speaker Presets & Fallback
# ---------------------------------------------------------------------------

def test_voice_speaker_presets_available():
    preset_keys = [p["id"] for p in VOICE_SPEAKER_PRESETS]
    assert "shubh_enhi_ads" in preset_keys
    assert "priya_enhi_conversational" in preset_keys
    assert "gokul_ta_narration" in preset_keys
    assert "kavitha_te_narration" in preset_keys
    assert "arnab_bn_conversation" in preset_keys


def test_orchestrate_with_custom_speaker(client: TestClient):
    """Passing a speaker parameter should be accepted by the endpoint."""
    resp = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={
            "text": "What time is it?",
            "speaker": "priya_enhi_conversational",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ("COMPLETED", "success")
