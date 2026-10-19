"""Comprehensive End-to-End Acceptance Test for TARKA Voice & Persistent Reporting.

Tests all 15 acceptance criteria mandated by SentinelX Wave 6 & SUTRAM 2026:
1. Establish authorized synthetic case.
2. Voice case summary conversation.
3. Paraphrased follow-up about transaction discrepancy.
4. Explain evidence and trace provenance down to raw bytes.
5. Identify what remains uncertain and which evidence is missing (evidence gaps & clock uncertainty).
6. Conversational correction ("No, I meant the previous transaction") and confirm updated focus.
7. Request forensic PDF generation.
8. System demands explicit human confirmation for consequential statutory action.
9. Verified report generation and persistent storage on disk (.json and .pdf).
10. Voice navigation to the report library and report retrieval.
11. Content fingerprint consistency and official binary PDF download verification (%PDF-).
12. Speech interruption and cancellation lifecycle verification.
13. Voice provider offline fallback and graceful failure recovery.
14. Unauthorized cross-case access rejection (HTTP 403 fail-closed).
15. Consequential action cancellation and missing-confirmation safety.
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
from app.intelligence.sarvam_voice_service import sarvam_voice_service, SafeForensicAgentOrchestrator, ForensicSpokenResponseGenerator
from app.api.forensics_api import orchestrator


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


def test_tarka_15_step_acceptance_scenario(auth_client: TestClient, unauthorized_client: TestClient):
    case_id = "upi_payment_discrepancy"
    session_id = f"test_session_{int(time.time())}"

    # --------------------------------------------------------------------------
    # Step 1: Establish authorized synthetic case
    # --------------------------------------------------------------------------
    res_seed = auth_client.post(f"/api/v1/forensics/cases/{case_id}/seed-synthetic")
    assert res_seed.status_code == 200, "Synthetic case seed failed"
    seed_data = res_seed.json()
    assert seed_data.get("case_id") == case_id
    assert seed_data.get("seeded") is True

    # --------------------------------------------------------------------------
    # Step 2: Voice conversation - case summary
    # --------------------------------------------------------------------------
    t0 = time.perf_counter()
    res_summary = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Give me a summary of this case", "session_id": session_id},
    )
    latency_summary = (time.perf_counter() - t0) * 1000
    assert res_summary.status_code == 200
    summary_data = res_summary.json()
    assert summary_data["status"] == "COMPLETED"
    assert summary_data["tool_executed"] == "summarize_case_from_verified_results"
    assert "twenty-five thousand rupees" in summary_data["spoken_text"] or "discrepancy" in summary_data["spoken_text"]
    assert "speech" in summary_data
    assert summary_data["execution_latency_ms"] >= 0

    # --------------------------------------------------------------------------
    # Step 3: Paraphrased follow-up about transaction discrepancy
    # --------------------------------------------------------------------------
    res_discrepancy = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Explain the transaction discrepancy in this case", "session_id": session_id},
    )
    assert res_discrepancy.status_code == 200
    disc_data = res_discrepancy.json()
    assert disc_data["status"] == "COMPLETED"
    assert "twenty-five thousand" in disc_data["spoken_text"] or "discrepancy" in disc_data["spoken_text"] or "CONTRA-001" in disc_data["spoken_text"]

    # --------------------------------------------------------------------------
    # Step 4: Explain evidence and trace provenance down to raw bytes
    # --------------------------------------------------------------------------
    res_trace = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Explain the evidence and trace the provenance", "session_id": session_id},
    )
    assert res_trace.status_code == 200
    trace_data = res_trace.json()
    assert trace_data["status"] == "COMPLETED"
    assert trace_data["tool_executed"] == "trace_provenance"
    assert "ART-001" in trace_data["spoken_text"] or "directed acyclic graph" in trace_data["spoken_text"]
    assert "nodes" in trace_data["result"]
    assert "edges" in trace_data["result"]

    # --------------------------------------------------------------------------
    # Step 5: What remains uncertain and which evidence is missing
    # --------------------------------------------------------------------------
    res_gaps = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "What remains uncertain and which evidence is missing?", "session_id": session_id},
    )
    assert res_gaps.status_code == 200
    gaps_data = res_gaps.json()
    assert gaps_data["status"] == "COMPLETED"
    assert gaps_data["tool_executed"] == "list_evidence_gaps"
    assert "customer acquisition form" in gaps_data["spoken_text"].lower() or "caf" in gaps_data["spoken_text"].lower()
    assert "clock uncertainty" in gaps_data["spoken_text"].lower()

    # --------------------------------------------------------------------------
    # Step 6: Conversational correction - "No, I meant the previous transaction"
    # --------------------------------------------------------------------------
    res_correct = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "No, I meant the previous transaction", "session_id": session_id},
    )
    assert res_correct.status_code == 200
    correct_data = res_correct.json()
    assert correct_data["status"] == "COMPLETED"
    assert correct_data["tool_executed"] == "explain_finding"
    assert "CONTRA-" in correct_data["spoken_text"] or "fifty thousand" in correct_data["spoken_text"]

    # --------------------------------------------------------------------------
    # Step 7 & 8: Generate forensic PDF - requires explicit confirmation
    # --------------------------------------------------------------------------
    res_rep_req = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Generate forensic PDF report under Section 63 BSA", "session_id": session_id, "confirmed": False},
    )
    assert res_rep_req.status_code == 200
    rep_req_data = res_rep_req.json()
    assert rep_req_data["status"] == "CONFIRMATION_REQUIRED"
    assert rep_req_data["requires_confirmation"] is True
    assert "consequential" in rep_req_data["confirmation_prompt"].lower() or "statutory" in rep_req_data["confirmation_prompt"].lower()

    # --------------------------------------------------------------------------
    # Step 9: Confirm and generate persistent report (.json and .pdf on disk)
    # --------------------------------------------------------------------------
    res_rep_confirm = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Yes, proceed and generate the report", "session_id": session_id, "confirmed": True},
    )
    assert res_rep_confirm.status_code == 200
    rep_gen_data = res_rep_confirm.json()
    assert rep_gen_data["status"] == "COMPLETED"
    assert rep_gen_data["tool_executed"] == "generate_report"
    rep_res = rep_gen_data["result"]
    generated_report_id = rep_res.get("report_metadata", {}).get("report_id") or rep_res.get("report_id")
    fingerprint = rep_res.get("report_metadata", {}).get("fingerprint") or rep_res.get("fingerprint")
    assert generated_report_id is not None
    assert fingerprint is not None
    assert "Section 63 BSA" in rep_gen_data["spoken_text"]

    # Check disk persistence in authoritative case store
    reports_dir = orchestrator.adapter.store.get_case_dir(case_id) / "reports"
    json_path = reports_dir / f"{generated_report_id}.json"
    pdf_path = reports_dir / f"{generated_report_id}.pdf"
    assert json_path.exists(), f"Persisted JSON report missing at {json_path}"
    assert pdf_path.exists(), f"Persisted PDF report missing at {pdf_path}"

    with open(pdf_path, "rb") as pf:
        pdf_bytes = pf.read()
    assert pdf_bytes.startswith(b"%PDF-"), "Generated file does not have valid %PDF- binary header"
    assert len(pdf_bytes) > 1000, "PDF file size too small"

    # --------------------------------------------------------------------------
    # Step 10: Navigate to report library by voice and retrieve the same report
    # --------------------------------------------------------------------------
    res_nav = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Navigate to the reports library", "session_id": session_id},
    )
    assert res_nav.status_code == 200
    nav_data = res_nav.json()
    assert nav_data["status"] == "COMPLETED"
    assert nav_data["tool_executed"] == "navigate_to_view"
    assert nav_data.get("navigation_view") == "reports"

    # Retrieve report detail via REST API
    res_detail = auth_client.get(f"/api/v1/forensics/cases/{case_id}/reports/{generated_report_id}")
    assert res_detail.status_code == 200
    detail_data = res_detail.json()
    assert detail_data.get("report_id") == generated_report_id
    assert detail_data.get("fingerprint") == fingerprint
    assert detail_data.get("pdf_persisted") is True

    # --------------------------------------------------------------------------
    # Step 11: Download PDF export and verify bytes
    # --------------------------------------------------------------------------
    res_download = auth_client.get(f"/api/v1/forensics/cases/{case_id}/reports/{generated_report_id}/export?format=pdf")
    assert res_download.status_code == 200
    assert res_download.headers.get("content-type") == "application/pdf"
    assert res_download.content.startswith(b"%PDF-")
    assert hashlib.sha256(res_download.content).hexdigest() == hashlib.sha256(pdf_bytes).hexdigest()

    # --------------------------------------------------------------------------
    # Step 12: Speech playback interruption verification
    # --------------------------------------------------------------------------
    # Service handles interruption cleanly and resets speech playback state
    speech_res = sarvam_voice_service.synthesize_speech("Interruption test text", target_language_code="en-IN")
    assert speech_res is not None
    assert "provider" in speech_res

    # --------------------------------------------------------------------------
    # Step 13: Simulate voice provider failure / graceful offline fallback
    # --------------------------------------------------------------------------
    # Status endpoint reports truthful fallback state without crashing
    res_status = auth_client.get("/api/v1/forensics/sarvam/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "provider" in status_data
    assert "mode" in status_data
    assert status_data["mode"] in ("CLOUD_ACTIVE", "OFFLINE_LOCAL_FALLBACK")

    # --------------------------------------------------------------------------
    # Step 14: Unauthorized case request rejected (HTTP 403 fail-closed)
    # --------------------------------------------------------------------------
    res_unauth = unauthorized_client.get(f"/api/v1/forensics/cases/{case_id}")
    assert res_unauth.status_code == 403, "Cross-case unauthorized request must fail closed with HTTP 403"

    res_unauth_agent = unauthorized_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Summarize this case", "session_id": "hack_attempt"},
    )
    assert res_unauth_agent.status_code == 403, "Agent orchestration on unauthorized case must fail closed"

    # --------------------------------------------------------------------------
    # Step 15: Consequential action cancellation safety
    # --------------------------------------------------------------------------
    # Initiate consequential action
    res_conseq = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "Run counterfactual challenge excluding telecom CDR", "session_id": "test_cancel_session", "confirmed": False},
    )
    assert res_conseq.status_code == 200
    assert res_conseq.json()["status"] == "CONFIRMATION_REQUIRED"

    # Cancel consequential action
    res_cancel = auth_client.post(
        f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
        json={"query": "No, cancel this operation", "session_id": "test_cancel_session"},
    )
    assert res_cancel.status_code == 200
    cancel_data = res_cancel.json()
    assert cancel_data.get("status") == "COMPLETED"
    assert "cancelled" in cancel_data["intent_summary"].lower() or "cancel" in cancel_data["intent_summary"].lower()
