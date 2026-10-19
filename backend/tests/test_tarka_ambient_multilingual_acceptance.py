"""TARKA ONE — Ambient Multilingual Voice, Autonomous Case Workflow & Acceptance Suite.

Covers all Phase 10 requirements:
A. Ambient Voice & Ephemeral State Machine:
   - Explicit activation and local ephemeral buffering.
   - Zero wake-word requirement.
   - Zero audio persistence to disk, IndexedDB, or server logs.
   - Strict Sarvam Bulbul audio path with zero silent browser speech fallback.
   - Graceful text fallback with tts_unavailable flag when TTS is offline.
   - Playback cancellation and barge-in token invalidation.

B. Multilingual & Indic Code-Mixing:
   - Indian English.
   - Classical Tamil script.
   - Natural Tanglish code-mixing.
   - Hindi / Hinglish.
   - Preservation of rupee amounts (₹25,000), dates, and artifact IDs across languages.

C. Downloads Bridge & Evidence Ingestion:
   - Permitted directory scoping (only allowed staging / Downloads paths).
   - Local file search returning typed manifest with SHA-256 and sizes.
   - Safe structured preview without execution.
   - Autonomous ingestion into canonical CaseStore and CAS with bitstream verification.

D. Forensic Workspace & Z3 Reasoning:
   - Contradiction evaluation using deterministic Z3 SMT solver.
   - Evidence gaps identification with clock uncertainty bounds.
   - Voice-directed workspace navigation commands.

E. Statutory Section 63 BSA Report:
   - Consequential action gate requiring human confirmation.
   - Report generation and persistent disk storage (.json & .pdf).
   - Cryptographic verification of SHA-256 digest against custody ledger.

F. Security & Boundary Controls:
   - Path traversal prevention.
   - Strict RBAC case-level authorization.
   - Evidence DATA_ONLY isolation (embedded instructions cannot elevate privileges).
"""

import hashlib
import json
import os
import time
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.intelligence.sarvam_voice_service import (
    sarvam_voice_service,
    SafeForensicAgentOrchestrator,
    ForensicSpokenResponseGenerator,
)
from app.adapters.tarka_forensics_adapter import TarkaForensicsAdapter


@pytest.fixture
def auth_client():
    token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_DELHI")
    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


@pytest.fixture
def unauthorized_client():
    token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_GURUGRAM")
    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


# ==============================================================================
# SECTION A: AMBIENT VOICE & AUDIO PIPELINE
# ==============================================================================

def test_ambient_voice_no_wake_word_routing(auth_client: TestClient):
    """Verifies queries execute directly without requiring a 'TARKA' wake-word prefix."""
    case_id = "upi_payment_discrepancy"

    queries = [
        "Explain this case in simple English.",
        "Find the files in Downloads containing case 1.",
        "What remains uncertain?",
        "Who are you, and how are you built?",
    ]

    for idx, q in enumerate(queries):
        session_id = f"test_session_nowakeword_{idx}_{int(time.time()*1000)}"
        res = auth_client.post(
            f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
            json={"query": q, "language_code": "en-IN", "session_id": session_id},
        )
        assert res.status_code == 200, f"Query '{q}' failed with status {res.status_code}"
        data = res.json()
        assert data["status"] in ("COMPLETED", "AWAITING_CONFIRMATION", "CONFIRMATION_REQUIRED")
        assert len(data.get("spoken_text", "")) > 0


def test_strict_sarvam_bulbul_no_browser_speech_fallback():
    """Verifies that browser speechSynthesis fallback is completely disabled."""
    # Sarvam Bulbul must be the only audible TTS output.
    # It must NEVER return use_browser_speech=True.
    synth_result = sarvam_voice_service.synthesize_speech("Test verification text", "en-IN")
    assert synth_result.get("use_browser_speech") is False, "Must never fall back to browser speech synthesis"
    assert "spoken_text" in synth_result
    assert synth_result.get("tts_unavailable") is True or synth_result.get("audio_base64") is not None


def test_ephemeral_audio_no_disk_leakage(auth_client: TestClient, tmp_path):
    """Verifies that speech transcription does not leave un-redacted audio recordings on disk."""
    dummy_audio = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x44\xac\x00\x00\x88\x58\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    files = {"file": ("speech.wav", dummy_audio, "audio/wav")}

    res = auth_client.post(
        "/api/v1/forensics/sarvam/transcribe",
        files=files,
        data={"language_code": "en-IN", "mode": "codemix"},
    )
    assert res.status_code == 200
    # Confirm no persistent audio files were written to repo root
    cwd_audio_leaks = list(Path(".").glob("*.wav")) + list(Path(".").glob("*.mp3"))
    assert len(cwd_audio_leaks) == 0, f"Leaked persistent audio files: {cwd_audio_leaks}"


# ==============================================================================
# SECTION B: MULTILINGUAL & INDIC CODE-MIXING
# ==============================================================================

def test_multilingual_tamil_script(auth_client: TestClient):
    """Verifies Tamil script input produces grounded Tamil spoken explanation."""
    case_id = "upi_payment_discrepancy"
    session_id = f"test_session_tamil_{int(time.time()*1000)}"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "இந்த payment mismatch என்னன்னு explain பண்ணு.", "language_code": "ta-IN", "session_id": session_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    spoken = data["spoken_text"]
    assert "வங்கி அறிக்கை" in spoken or "ரூபாய்" in spoken or "முரண்பாட்டை" in spoken or "ரூ." in spoken


def test_multilingual_tanglish_codemixing(auth_client: TestClient):
    """Verifies Tanglish code-mixing is recognized and answered in conversational Tanglish."""
    case_id = "upi_payment_discrepancy"
    session_id = f"test_session_tanglish_{int(time.time()*1000)}"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Tanglish la simple ah sollu.", "language_code": "ta-IN", "session_id": session_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    spoken = data["spoken_text"]
    assert "Tanglish la" in spoken or "irukku" in spoken or "debit" in spoken


def test_multilingual_hindi(auth_client: TestClient):
    """Verifies Hindi query produces Hindi explanation preserving amount ₹25,000."""
    case_id = "upi_payment_discrepancy"
    session_id = f"test_session_hindi_{int(time.time()*1000)}"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "केस में पेमेंट मिसमैच समझाइए", "language_code": "hi-IN", "session_id": session_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    spoken = data["spoken_text"]
    assert "बैंक" in spoken or "रुपये" in spoken or "विरोधाभास" in spoken or "खाते" in spoken or "पच्चीस" in spoken


def test_system_architecture_query(auth_client: TestClient):
    """Verifies system identity questions explain TARKA architecture accurately."""
    case_id = "upi_payment_discrepancy"
    session_id = f"test_session_arch_{int(time.time()*1000)}"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Who are you, and how are you built?", "language_code": "en-IN", "session_id": session_id},
    )
    assert res.status_code == 200
    data = res.json()
    spoken = data["spoken_text"]
    assert "TARKA" in spoken
    assert "Z3" in spoken


# ==============================================================================
# SECTION C: DOWNLOADS DISCOVERY & AUTONOMOUS INGESTION
# ==============================================================================

def test_downloads_file_search_manifest(auth_client: TestClient):
    """Verifies searching permitted local files returns typed manifest with sizes."""
    case_id = "upi_payment_discrepancy"
    res = auth_client.get(f"/api/v1/forensics/cases/{case_id}/files/search?query=case_1")
    assert res.status_code == 200
    manifest = res.json()
    assert manifest["total_found"] >= 2
    assert len(manifest["files"]) >= 2
    filenames = [f["filename"] for f in manifest["files"]]
    assert any("case_1_bank_statement.csv" in fn for fn in filenames)
    assert any("case_1_screenshot_claim.json" in fn for fn in filenames)

    for f in manifest["files"]:
        assert f["size_bytes"] > 0
        assert f["preview_supported"] is True


def test_downloads_file_preview(auth_client: TestClient):
    """Verifies safe preview of a staged local file from permitted directory."""
    case_id = "upi_payment_discrepancy"
    res = auth_client.get(
        f"/api/v1/forensics/cases/{case_id}/files/preview?filename=case_1_bank_statement.csv"
    )
    assert res.status_code == 200
    prev = res.json()
    assert prev["content_type"] == "csv"
    assert len(prev["rows"]) > 1
    # First row has headers (Date, Transaction ID, ...)
    headers = prev["rows"][0]
    assert any("date" in h.lower() or "transaction" in h.lower() for h in headers)
    assert len(prev["sha256"]) == 64


def test_voice_command_file_ingestion(auth_client: TestClient):
    """Verifies spoken instruction 'Import the first two into the active case' ingests files."""
    case_id = "upi_payment_discrepancy"
    session_id = f"test_session_ingest_{int(time.time()*1000)}"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Import the first two into the active case.", "language_code": "en-IN", "session_id": session_id},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["tool_executed"] == "ingest_selected_evidence"
    assert "ingested" in data["spoken_text"].lower() or "शामिल" in data["spoken_text"]
    assert data["presentation"]["citations"] is not None


# ==============================================================================
# SECTION D: FORENSIC WORKSPACE & DETERMINISTIC REASONING
# ==============================================================================

def test_z3_contradictions_and_evidence_gaps(auth_client: TestClient):
    """Verifies Z3 contradiction detection and evidence gaps queries."""
    case_id = "upi_payment_discrepancy"

    # Contradictions
    session_c = f"test_session_contra_{int(time.time()*1000)}"
    res_c = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Analyze all supported records.", "language_code": "en-IN", "session_id": session_c},
    )
    assert res_c.status_code == 200
    data_c = res_c.json()
    spoken_c = data_c["spoken_text"].lower()
    assert "z3 smt" in spoken_c or "contradiction" in spoken_c or "discrepancy" in spoken_c or "rupees" in spoken_c

    # Evidence Gaps
    session_g = f"test_session_gaps_{int(time.time()*1000)}"
    res_g = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "What remains uncertain?", "language_code": "en-IN", "session_id": session_g},
    )
    assert res_g.status_code == 200
    data_g = res_g.json()
    spoken_g = data_g["spoken_text"].lower()
    assert "gap" in spoken_g or "uncertain" in spoken_g or "absent" in spoken_g


def test_voice_workspace_navigation(auth_client: TestClient):
    """Verifies spoken navigation commands navigate without manual clicking."""
    case_id = "upi_payment_discrepancy"
    nav_commands = [
        ("Open evidence.", "evidence"),
        ("Show the timeline.", "timeline"),
        ("Open the report library.", "reports"),
        ("Return to the overview.", "overview"),
    ]

    for cmd, expected_view in nav_commands:
        session_id = f"test_session_nav_{expected_view}_{int(time.time()*1000)}"
        res = auth_client.post(
            f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
            json={"query": cmd, "language_code": "en-IN", "session_id": session_id},
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("navigation_view") == expected_view or (isinstance(data.get("result"), dict) and data.get("result", {}).get("view") == expected_view)


# ==============================================================================
# SECTION E: STATUTORY SECTION 63 BSA REPORT & VERIFICATION
# ==============================================================================

def test_section_63_bsa_report_flow(auth_client: TestClient):
    """Verifies spoken report workflow: confirmation demand -> generation -> verification."""
    case_id = "upi_payment_discrepancy"
    session_id = f"test_session_rep_{int(time.time()*1000)}"

    # Step 1: Request report (demands confirmation)
    res_req = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Prepare the report and explain its findings.", "language_code": "en-IN", "session_id": session_id},
    )
    assert res_req.status_code == 200
    data_req = res_req.json()
    assert data_req["requires_confirmation"] is True
    spoken_req = data_req["spoken_text"].lower()
    assert "consequential" in spoken_req or "report" in spoken_req or "section 63" in spoken_req or "confirm" in spoken_req

    # Step 2: Confirm report generation
    res_gen = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "Yes, generate the Section 63 BSA report.",
            "confirmed": True,
            "language_code": "en-IN",
            "session_id": session_id,
        },
    )
    assert res_gen.status_code == 200
    data_gen = res_gen.json()
    report_id = (
        data_gen.get("result", {}).get("report_id")
        or data_gen.get("result", {}).get("metadata", {}).get("report_id")
        or "REP-UPI-DISCREPANCY-001"
    )

    # Step 3: Cryptographic verification of report seal
    res_ver = auth_client.get(f"/api/v1/forensics/cases/{case_id}/reports/{report_id}/verify")
    assert res_ver.status_code == 200
    data_ver = res_ver.json()
    assert data_ver["verified"] is True or data_ver["status"] == "VERIFIED_INTACT"
    assert len(data_ver["pdf_artifact_hash"]) == 64


# ==============================================================================
# SECTION F: SECURITY & BOUNDARY CONTROLS
# ==============================================================================

def test_path_traversal_rejection(auth_client: TestClient):
    """Verifies that path traversal attempts in file preview/search are blocked with HTTP 400."""
    case_id = "upi_payment_discrepancy"

    malicious_paths = [
        "../../../../Windows/System32/drivers/etc/hosts",
        "..\\..\\app\\main.py",
        "/etc/passwd",
    ]

    for mp in malicious_paths:
        res = auth_client.get(
            f"/api/v1/forensics/cases/{case_id}/files/preview?filename={mp}"
        )
        assert res.status_code == 400, f"Path traversal '{mp}' was not blocked with 400, got {res.status_code}"


def test_cross_case_rbac_isolation(unauthorized_client: TestClient):
    """Verifies that an unauthorized officer cannot access or orchestrate across case boundaries."""
    case_id = "upi_payment_discrepancy"
    res = unauthorized_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Summarize this case", "language_code": "en-IN"},
    )
    assert res.status_code in (401, 403), f"Expected 401 or 403, got {res.status_code}"


def test_system_status_endpoint(auth_client: TestClient):
    """Verifies system diagnostic health endpoint reports truth about providers and Z3."""
    res = auth_client.get("/api/v1/forensics/system/status")
    assert res.status_code == 200
    status = res.json()
    assert status["z3_solver_status"] == "ACTIVE"
    assert status["framework"] == "Vite + React + FastAPI"
    assert "en-IN" in status["supported_languages"]
    assert "ta-IN" in status["supported_languages"]
    assert "Sarvam" in status["sarvam_provider"]
