"""Acceptance test suite for TARKA Multilingual Voice-First Platform.

Verifies:
- Official Indic language coverage: en-IN (English), ta-IN (Tamil), hi-IN (Hindi), bn-IN (Bengali).
- Conversational turn-taking with dynamic spoken language switching.
- Deterministic Z3 solver result grounding in Indic languages.
- Fail-closed Section 63 BSA statutory confirmation gates.
- Cross-case RBAC isolation.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService


@pytest.fixture
def auth_client():
    client = TestClient(app)
    auth_service = AuthService.get_instance()
    token = auth_service.create_jwt_token("INVESTIGATOR_DELHI")
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client


def test_01_status_reports_all_supported_languages(auth_client):
    res = auth_client.get("/api/v1/forensics/sarvam/status")
    assert res.status_code == 200
    data = res.json()
    assert data["provider"].startswith("Sarvam AI")
    languages = [l["code"] for l in data.get("supported_languages", [])]
    assert "en-IN" in languages
    assert "ta-IN" in languages
    assert "hi-IN" in languages
    assert "bn-IN" in languages


def test_02_indian_english_orchestration(auth_client):
    case_id = "upi_payment_discrepancy"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "What is the mathematical contradiction in this case?",
            "language_code": "en-IN",
            "session_id": "test_session_en",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["tool_executed"] == "list_contradictions"
    assert "Z3 SMT solver confirms" in data["spoken_text"]
    assert "twenty-five thousand rupee" in data["spoken_text"] or "25,000" in data["spoken_text"]


def test_03_tamil_orchestration_and_spoken_response(auth_client):
    case_id = "upi_payment_discrepancy"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "இந்த வழக்கில் உள்ள முரண்பாடுகளை பட்டியலிடுங்கள்",
            "language_code": "ta-IN",
            "session_id": "test_session_ta",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["tool_executed"] == "list_contradictions"
    assert "Z3 SMT solver" in data["spoken_text"]
    # Check for Tamil text in output
    assert "முரண்பாட்டை" in data["spoken_text"] or "வங்கி அறிக்கை" in data["spoken_text"]


def test_04_hindi_orchestration_and_spoken_response(auth_client):
    case_id = "upi_payment_discrepancy"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "केस में कौन सा विरोधाभास मौजूद है?",
            "language_code": "hi-IN",
            "session_id": "test_session_hi",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["tool_executed"] == "list_contradictions"
    # Check for Hindi text in output
    assert "Z3 SMT सॉल्वर" in data["spoken_text"] or "विरोधाभास" in data["spoken_text"]


def test_05_bengali_orchestration_and_spoken_response(auth_client):
    case_id = "upi_payment_discrepancy"
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "মামলার অসঙ্গতি কি?",
            "language_code": "bn-IN",
            "session_id": "test_session_bn",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["tool_executed"] == "list_contradictions"
    assert "Z3 সল্ভার" in data["spoken_text"] or "অমিল" in data["spoken_text"]


def test_06_spoken_language_switching(auth_client):
    case_id = "upi_payment_discrepancy"
    session_id = "test_switching_turn"

    # Turn 1: Switch to Tamil
    res1 = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "Answer me in Tamil: What is the finding?",
            "language_code": "en-IN",
            "session_id": session_id,
        },
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["language_code"] == "ta-IN"
    assert "வங்கி" in data1["spoken_text"] or "முடிவு" in data1["spoken_text"] or "விளக்கம்" in data1["spoken_text"]

    # Turn 2: Follow-up without explicit language parameter (persists session language ta-IN)
    res2 = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "Trace the provenance for this",
            "session_id": session_id,
        },
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["language_code"] == "ta-IN"
    assert "மூல வரிசை" in data2["spoken_text"] or "ஆதாரங்கள்" in data2["spoken_text"] or "SHA-256" in data2["spoken_text"]

    # Turn 3: Switch to Hindi
    res3 = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "Switch to Hindi: Summarize the case",
            "session_id": session_id,
        },
    )
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["language_code"] == "hi-IN"
    assert "सत्यापित" in data3["spoken_text"] or "केस" in data3["spoken_text"]


def test_07_code_mixed_indic_query_handling(auth_client):
    case_id = "upi_payment_discrepancy"
    # Code-mixed query (English + Hindi words)
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "WhatsApp chat aur bank statement mein kya discrepancy hai?",
            "language_code": "hi-IN",
            "session_id": "test_session_codemix",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "COMPLETED"
    assert data["tool_executed"] == "list_contradictions"


def test_08_confirmation_gate_multilingual_fail_closed(auth_client):
    case_id = "upi_payment_discrepancy"
    # Request consequential action in Tamil
    res = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "Generate statutory Section 63 BSA report",
            "language_code": "ta-IN",
            "session_id": "test_gating_ta",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CONFIRMATION_REQUIRED"
    assert data["requires_confirmation"] is True
    assert "பிரிவு 63" in data["confirmation_prompt"] or "Section 63" in data["confirmation_prompt"]


def test_09_multilingual_confirmed_report_generation(auth_client):
    case_id = "upi_payment_discrepancy"
    session_id = "test_confirm_hi"

    # Step A: Initiate report in Hindi
    res_init = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "Generate Section 63 BSA report",
            "language_code": "hi-IN",
            "session_id": session_id,
        },
    )
    assert res_init.status_code == 200
    assert res_init.json()["requires_confirmation"] is True

    # Step B: Confirm in Hindi / English
    res_conf = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={
            "query": "Yes, proceed and authorize",
            "language_code": "hi-IN",
            "session_id": session_id,
        },
    )
    assert res_conf.status_code == 200
    data = res_conf.json()
    assert data["status"] == "COMPLETED"
    assert data["tool_executed"] == "generate_report"
    assert "धारा 63" in data["spoken_text"] or "Section 63" in data["spoken_text"]
    assert "REP-" in data["spoken_text"] or "REP-" in str(data["result"])


def test_10_cross_case_authorization_enforced_multilingual(auth_client):
    # Attempt unauthorized cross-case query
    res = auth_client.post(
        f"/api/v1/forensics/cases/unauthorized_case_999/agent/orchestrate",
        json={
            "query": "Show me the evidence in Tamil",
            "language_code": "ta-IN",
        },
    )
    assert res.status_code == 403
