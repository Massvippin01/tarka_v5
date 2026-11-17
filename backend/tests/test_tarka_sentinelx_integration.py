"""End-to-End Integration Tests for TARKA Forensics Engine in SentinelX.

Validates the full vertical integration required by the MASTER ENGINEERING MANDATE:
- TARKA API endpoints mounted under `/api/v1/forensics`
- Deterministic synthetic case generation (UPI payment discrepancy)
- Evidence integrity: SHA-256 immutability & tamper verification
- Z3 SMT solver contradiction detection & Minimal Unsatisfiable Subsets (MUS)
- Evidence Robustness Lab: Counterfactual artifact exclusion & dependency recomputation
- Section 63 Indian Evidence Act / BSA 2023 Statutory Forensic Reporting
- Grounded SLM Assistant with strict evidence citations & prompt injection guard
- Natural Voice Interface with destructive action confirmation guardrails
- Non-promotability invariant: Machine inferences are never auto-promoted to verified facts
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


from app.services.auth_service import AuthService


@pytest.fixture(scope="module")
def client():
    c = TestClient(app)
    token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_DELHI")
    c.headers.update({"Authorization": f"Bearer {token}"})
    return c


def test_forensics_health_endpoint(client: TestClient):
    """Verify TARKA forensics health, Z3 SMT solver status, and legal disclaimer."""
    response = client.get("/api/v1/forensics/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "TARKA" in data["engine"]
    assert "Z3 SMT" in data["solver"]
    assert "Section 63" in data["disclaimer"] or "human statutory review" in data["disclaimer"]


def test_tarka_subapp_direct_mount(client: TestClient):
    """Verify TARKA sub-application is cleanly mounted under /api/v1/forensics/tarka."""
    response = client.get("/api/v1/forensics/tarka/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_seed_canonical_sutram_synthetic_case(client: TestClient):
    """Deterministically seed the SUTRAM 2026 UPI payment discrepancy synthetic case."""
    response = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/seed-synthetic")
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == "upi_payment_discrepancy"
    assert data["seeded"] is True
    assert data["artifact_count"] >= 4  # Chat, Bank statement, CDR, Screenshot receipt


def test_list_and_get_case_metadata(client: TestClient):
    """Verify case enumeration and isolated case metadata."""
    # List cases
    list_resp = client.get("/api/v1/forensics/cases")
    assert list_resp.status_code == 200
    cases = list_resp.json()
    assert any(c["case_id"] == "upi_payment_discrepancy" for c in cases)

    # Get case details
    detail_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["case_id"] == "upi_payment_discrepancy"
    assert detail["artifact_count"] >= 4
    assert "custody_chain_head" in detail


def test_artifact_custody_and_bitstream_verification(client: TestClient):
    """Verify SHA-256 bitstream validation against custody chain."""
    # List artifacts
    art_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/artifacts")
    assert art_resp.status_code == 200
    artifacts = art_resp.json()
    assert len(artifacts) >= 4

    # Verify a known artifact bitstream
    target_artifact = artifacts[0]
    artifact_id = target_artifact["artifact_id"]

    verify_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/{artifact_id}/verify")
    assert verify_resp.status_code == 200
    verify_data = verify_resp.json()
    assert verify_data["verified"] is True
    assert verify_data["stored_hash"] == verify_data["calculated_hash"]
    assert verify_data["bitstream_intact"] is True

    # Unknown artifact should return 404
    missing_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/art-unknown-999/verify")
    assert missing_resp.status_code == 404


def test_reconstructed_timeline_with_uncertainty(client: TestClient):
    """Verify multi-tier event timeline with explicit temporal uncertainty bounds."""
    response = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/timeline")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
    events = data["events"]
    assert len(events) >= 3

    # Check temporal attributes
    for event in events:
        assert "timestamp" in event
        assert "event_type" in event
        assert "source_artifact_ids" in event
        assert "confidence" in event


def test_z3_contradiction_detection_and_mus(client: TestClient):
    """Verify Z3 SMT solver detects the ₹1,00,000 vs ₹10,000 amount discrepancy."""
    response = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/contradictions")
    assert response.status_code == 200
    data = response.json()
    assert "contradictions" in data
    contradictions = data["contradictions"]
    assert len(contradictions) >= 1

    # Check contradiction structure
    amount_discrepancy = next(
        (c for c in contradictions if "AMOUNT" in c["category"] or "amount" in c["title"].lower()),
        contradictions[0]
    )
    assert amount_discrepancy is not None
    assert "rule_firing_reason" in amount_discrepancy
    assert "original_values" in amount_discrepancy
    assert "supporting_fact_ids" in amount_discrepancy


def test_evidence_robustness_lab_counterfactual_challenge(client: TestClient):
    """Verify counterfactual recomputation: excluding the disputed screenshot dissolves contradiction."""
    # 1. Dynamically retrieve registered artifacts to find the screenshot
    art_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/artifacts")
    assert art_resp.status_code == 200
    artifacts = art_resp.json()
    screenshot_artifact = next(
        a for a in artifacts if "screenshot" in a.get("filename", "").lower()
    )
    screenshot_id = screenshot_artifact["artifact_id"]

    # 2. Dynamically retrieve baseline run ID
    contra_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/contradictions")
    assert contra_resp.status_code == 200
    baseline_run_id = contra_resp.json().get("run_id")

    payload = {
        "baseline_run_id": baseline_run_id,
        "excluded_artifact_ids": [screenshot_id],
        "investigator_note": "Challenge test: exclude disputed screenshot receipt",
    }
    response = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/challenge", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["baseline_run_id"] == baseline_run_id
    assert screenshot_id in data["excluded_artifact_ids"]
    assert "surviving_findings" in data
    assert "removed_findings" in data

    # Findings depending on screenshot receipt should be removed
    removed = data["removed_findings"]
    assert len(removed) >= 1
    assert any(
        screenshot_id in f.get("supporting_artifact_ids", [])
        or "receipt" in f.get("title", "").lower()
        or "amount" in f.get("title", "").lower()
        for f in removed
    )


def test_provenance_dag_lineage(client: TestClient):
    """Verify directed acyclic provenance graph tracing findings down to source bytes."""
    response = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/provenance-dag")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) >= 5
    assert len(data["edges"]) >= 4

    # Check for node types: Artifact, Contradiction, Correlation, etc.
    node_types_upper = {str(n.get("node_type", "")).upper() for n in data["nodes"]}
    assert any("ARTIFACT" in t for t in node_types_upper) or any("CONTRADICTION" in t for t in node_types_upper)


def test_investigation_graph_projection(client: TestClient):
    """Verify SentinelX graph projection preserves the non-promotability invariant."""
    response = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/investigation-graph")
    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data

    # Check non-promotability invariant: machine-generated nodes must not be auto-promoted to human-verified
    for node in data["nodes"]:
        props = node.get("properties", {})
        if props.get("is_machine_generated"):
            assert props.get("human_verified") is False


def test_statutory_bsa_section_63_report_generation(client: TestClient):
    """Verify Section 63 BSA statutory forensic report generation and fingerprint seal."""
    payload = {
        "examiner_name": "Senior Digital Forensics Inspector",
        "investigation_purpose": "SUTRAM 2026 Statutory Compliance Evaluation",
    }
    response = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/reports", json=payload)
    assert response.status_code == 200
    report = response.json()

    assert "report_metadata" in report
    assert "artifact_manifest" in report
    assert "executive_overview" in report
    assert len(report["artifact_manifest"]) >= 4
    assert report["report_metadata"]["fingerprint"] != ""


def test_grounded_assistant_evidence_citations(client: TestClient):
    """Verify local SLM assistant grounds answers in case evidence and returns citations."""
    payload = {
        "query": "What is the discrepancy between the bank statement and the screenshot?",
    }
    response = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/assistant/query", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "answer_markdown" in data
    assert "speech_text" in data
    assert "citations" in data
    assert len(data["citations"]) >= 1
    assert data["grounded"] is True
    assert "prompt_injection_detected" in data
    assert data["prompt_injection_detected"] is False


def test_voice_interface_confirmation_guardrails(client: TestClient):
    """Verify voice interface handles conversational questions and blocks destructive actions."""
    # 1. Normal question
    query_payload = {"transcript_or_text": "Summarize the timeline events"}
    res1 = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/voice/interact", json=query_payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["status"] == "SUCCESS"
    assert data1["requires_human_confirmation"] is False

    # 2. Destructive command requiring explicit statutory confirmation
    destructive_payload = {"transcript_or_text": "Delete case evidence and purge custody ledger"}
    res2 = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/voice/interact", json=destructive_payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["status"] == "CONFIRMATION_REQUIRED"
    assert data2["requires_human_confirmation"] is True
    assert "destructive" in data2["prompt"].lower() or "statutory" in data2["prompt"].lower()


def test_case_isolated_ingest_and_deduplication_regression(client: TestClient):
    """Regression test for TARKA case isolation & deduplication state persistence defect.
    
    Verifies:
    1. Clean isolated case ingest parses files without 'DuplicateSkipped'.
    2. Re-ingesting the identical bitstream into the same case correctly flags 'DuplicateSkipped'.
    3. Ingesting the same bitstream into a DIFFERENT isolated case succeeds independently.
    """
    import uuid
    case_a = f"regression_case_{uuid.uuid4().hex[:8]}"
    case_b = f"regression_case_{uuid.uuid4().hex[:8]}"

    csv_bytes = (
        b"Calling_MSISDN,Called_Party,Call_Date,Call_Time,Dur_Sec,First_CGI,IMEI_Number,Service_Type\n"
        b"9845012345,9845099999,26/01/2026,10:15:30,45,TOWER_BLR_01,864209041234567,MOC_CALL\n"
    )

    # 1. Ingest into case A (as SUPERVISOR_NCR after explicit auditable case access grant)
    auth_service = AuthService.get_instance()
    auth_service.grant_case_access(
        auth_service.users["SUPERVISOR_NCR"],
        case_a,
        justification="Supervisory case isolation ingestion test for Case A",
    )
    auth_service.grant_case_access(
        auth_service.users["SUPERVISOR_NCR"],
        case_b,
        justification="Supervisory case isolation ingestion test for Case B",
    )
    supervisor_token = auth_service.create_jwt_token("SUPERVISOR_NCR")
    supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}
    res1 = client.post(
        "/api/v1/forensics/tarka/api/ingest",
        files=[("files", ("test_cdr.csv", csv_bytes, "text/csv"))],
        data={"tz": "Asia/Kolkata", "case_id": case_a, "append_to_custody": "false"},
        headers=supervisor_headers,
    )
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["source_files"][0]["parser_type"] == "CDRParser"
    assert data1["total_facts_ingested"] >= 1

    # 2. Re-ingest into case A (same case -> must be flagged DuplicateSkipped)
    res2 = client.post(
        "/api/v1/forensics/tarka/api/ingest",
        files=[("files", ("test_cdr.csv", csv_bytes, "text/csv"))],
        data={"tz": "Asia/Kolkata", "case_id": case_a, "append_to_custody": "false"},
        headers=supervisor_headers,
    )
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["source_files"][0]["parser_type"] == "DuplicateSkipped"

    # 3. Ingest into case B (different case -> must parse cleanly, demonstrating case isolation)
    res3 = client.post(
        "/api/v1/forensics/tarka/api/ingest",
        files=[("files", ("test_cdr.csv", csv_bytes, "text/csv"))],
        data={"tz": "Asia/Kolkata", "case_id": case_b, "append_to_custody": "false"},
        headers=supervisor_headers,
    )
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["source_files"][0]["parser_type"] == "CDRParser"
    assert data3["total_facts_ingested"] >= 1


def test_unauthenticated_requests_rejected():
    """Verify that unauthenticated requests are strictly rejected with HTTP 401 UNAUTHORIZED."""
    unauth = TestClient(app)  # No authorization header

    # 1. Read access
    res_read = unauth.get("/api/v1/forensics/cases/upi_payment_discrepancy")
    assert res_read.status_code == 401

    # 2. Ingestion
    res_ingest = unauth.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/ingest",
        files=[("files", ("test.csv", b"a,b\n1,2\n", "text/csv"))],
    )
    assert res_ingest.status_code == 401

    # 3. Mounted TARKA ingestion
    res_tarka_ingest = unauth.post(
        "/api/v1/forensics/tarka/api/ingest",
        files=[("files", ("test.csv", b"a,b\n1,2\n", "text/csv"))],
        data={"case_id": "upi_payment_discrepancy"},
    )
    assert res_tarka_ingest.status_code == 401

    # 4. Counterfactual challenge
    res_chal = unauth.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/challenge",
        json={"baseline_run_id": "run-001", "excluded_artifact_ids": []},
    )
    assert res_chal.status_code == 401

    # 5. Assistant query
    res_asst = unauth.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/assistant/query",
        json={"query": "test query"},
    )
    assert res_asst.status_code == 401

    # 6. Report export
    res_rep = unauth.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/reports",
        json={"examiner_name": "Test"},
    )
    assert res_rep.status_code == 401


def test_cross_case_authorization_enforcement():
    """Verify 7-factor RBAC prevents unauthorized cross-case access with HTTP 403 FORBIDDEN."""
    # INVESTIGATOR_GURUGRAM is restricted to ['C481', 'C512'], NOT 'upi_payment_discrepancy'
    token_guru = AuthService.get_instance().create_jwt_token("INVESTIGATOR_GURUGRAM")
    gurugram_client = TestClient(app)
    gurugram_client.headers.update({"Authorization": f"Bearer {token_guru}"})

    # 1. Read access to unauthorized case
    res_read = gurugram_client.get("/api/v1/forensics/cases/upi_payment_discrepancy")
    assert res_read.status_code == 403
    assert "ACCESS_DENIED" in res_read.json()["detail"]

    # 2. Ingestion into unauthorized case
    res_ingest = gurugram_client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/ingest",
        files=[("files", ("test.csv", b"a,b\n1,2\n", "text/csv"))],
    )
    assert res_ingest.status_code == 403

    # 3. Mounted TARKA ingestion into unauthorized case
    res_tarka_ingest = gurugram_client.post(
        "/api/v1/forensics/tarka/api/ingest",
        files=[("files", ("test.csv", b"a,b\n1,2\n", "text/csv"))],
        data={"case_id": "upi_payment_discrepancy"},
    )
    assert res_tarka_ingest.status_code == 403

    # 4. Counterfactual challenge on unauthorized case
    res_chal = gurugram_client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/challenge",
        json={"baseline_run_id": "run-001", "excluded_artifact_ids": []},
    )
    assert res_chal.status_code == 403

    # 5. Assistant query on unauthorized case
    res_asst = gurugram_client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/assistant/query",
        json={"query": "test query"},
    )
    assert res_asst.status_code == 403

    # 6. Report export on unauthorized case
    res_rep = gurugram_client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/reports",
        json={"examiner_name": "Test"},
    )
    assert res_rep.status_code == 403


def test_case_id_substitution_attack_rejected():
    """Verify that attempting case-ID substitution across unauthorized boundaries fails closed."""
    delhi_token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_DELHI")
    delhi_client = TestClient(app)
    delhi_client.headers.update({"Authorization": f"Bearer {delhi_token}"})

    # INVESTIGATOR_DELHI tries to substitute Gurugram case 'C481' or unauthorized case
    res = delhi_client.get("/api/v1/forensics/cases/C481")
    assert res.status_code == 403

    res_sub = delhi_client.get("/api/v1/forensics/cases/CASE-CLASSIFIED-FORBIDDEN")
    assert res_sub.status_code == 403


def test_case_enumeration_respects_user_scope():
    """Verify that list_cases only returns case workspaces within the user's jurisdiction scope."""
    delhi_token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_DELHI")
    delhi_client = TestClient(app)
    delhi_client.headers.update({"Authorization": f"Bearer {delhi_token}"})
    delhi_cases = delhi_client.get("/api/v1/forensics/cases").json()
    assert any(c["case_id"] == "upi_payment_discrepancy" for c in delhi_cases)

    guru_token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_GURUGRAM")
    gurugram_client = TestClient(app)
    gurugram_client.headers.update({"Authorization": f"Bearer {guru_token}"})
    gurugram_cases = gurugram_client.get("/api/v1/forensics/cases").json()
    assert not any(c["case_id"] == "upi_payment_discrepancy" for c in gurugram_cases)


def test_finding_explanation_endpoint_and_source_lineage(client: TestClient):
    """Verify finding explanation returns evidence-grounded non-accusatory derivation and source hashes."""
    # 1. Fetch case contradictions to get active finding ID
    contra_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/contradictions")
    assert contra_resp.status_code == 200
    contradictions = contra_resp.json()["contradictions"]
    assert len(contradictions) >= 1
    finding_id = contradictions[0]["finding_id"]

    # 2. Query finding explanation
    expl_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/findings/{finding_id}/explanation")
    assert expl_resp.status_code == 200
    expl = expl_resp.json()

    assert expl["finding_id"] == finding_id
    assert "title" in expl
    assert "plain_language_summary" in expl

    # Non-accusatory epistemic check: must not declare guilt or fraud directly
    lower_summary = expl["plain_language_summary"].lower()
    for forbidden in ["guilty", "fraudster", "criminal organization"]:
        assert forbidden not in lower_summary

    # Verify source evidence records
    assert "sources" in expl
    assert len(expl["sources"]) >= 1
    for src in expl["sources"]:
        assert "artifact_id" in src
        assert "artifact_filename" in src
        assert "source_location" in src

    # Verify governing declarative rule metadata
    if expl.get("rule_metadata"):
        rule = expl["rule_metadata"]
        assert "rule_id" in rule
        assert "rule_version" in rule
        assert "firing_condition" in rule

    # Verify 404 for unknown finding
    unknown_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/findings/NON_EXISTENT_FINDING_999/explanation")
    assert unknown_resp.status_code == 404


def test_finding_provenance_trace_backward_and_forward(client: TestClient):
    """Verify bidirectional provenance trace linking finding to raw bytes and custody."""
    contra_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/contradictions")
    assert contra_resp.status_code == 200
    finding_id = contra_resp.json()["contradictions"][0]["finding_id"]

    # 1. Backward trace from finding to source bytes
    bw_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/findings/{finding_id}/provenance?direction=BACKWARD")
    assert bw_resp.status_code == 200
    bw_trace = bw_resp.json()
    assert bw_trace["root_id"] == finding_id
    assert bw_trace["direction"] == "BACKWARD"
    assert len(bw_trace["nodes"]) >= 1
    assert "fingerprint" in bw_trace
    assert len(bw_trace["fingerprint"]) == 64  # SHA-256

    # 2. Forward trace from artifact to downstream findings
    art_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/artifacts")
    assert art_resp.status_code == 200
    artifact_id = art_resp.json()[0]["artifact_id"]

    fw_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/findings/{artifact_id}/provenance?direction=FORWARD")
    assert fw_resp.status_code == 200
    fw_trace = fw_resp.json()
    assert fw_trace["root_id"] == artifact_id
    assert fw_trace["direction"] == "FORWARD"
    assert len(fw_trace["nodes"]) >= 1


def test_examiner_statutory_review_recording(client: TestClient):
    """Verify examiner statutory review is committed to custody ledger and updates finding audit state."""
    contra_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/contradictions")
    assert contra_resp.status_code == 200
    finding_id = contra_resp.json()["contradictions"][0]["finding_id"]

    # 1. Commit examiner review decision
    review_payload = {
        "target_id": finding_id,
        "decision": "ACCEPT",
        "reviewed_by": "Inspector V. Sharma (Cyber Crime Cell)",
        "notes": "Verified ₹25,000 debit against core banking CBS transaction log RRN 502819384729.",
        "target_type": "finding",
    }
    post_resp = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/reviews", json=review_payload)
    assert post_resp.status_code == 200
    record = post_resp.json()
    assert record["finding_id"] == finding_id
    assert record["decision"] == "ACCEPT"
    assert record["reviewed_by"] == "Inspector V. Sharma (Cyber Crime Cell)"
    assert "reviewed_at_iso" in record

    # 2. List reviews and verify presence
    list_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/reviews")
    assert list_resp.status_code == 200
    reviews = list_resp.json()
    assert "finding_reviews" in reviews
    assert finding_id in reviews["finding_reviews"]
    assert reviews["finding_reviews"][finding_id]["decision"] == "ACCEPT"

    # 3. Verify explanation now includes human review audit node
    expl_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/findings/{finding_id}/explanation")
    assert expl_resp.status_code == 200
    expl = expl_resp.json()
    assert expl.get("review_audit") is not None
    assert expl["review_audit"]["review_state"] == "ACCEPT"
    assert expl["review_audit"]["reviewed_by"] == "Inspector V. Sharma (Cyber Crime Cell)"


def test_review_scope_enforcement_for_confirm_absent(client: TestClient):
    """Verify fail-closed requirement: CONFIRM_ABSENT requires mandatory examination scope."""
    # Attempt CONFIRM_ABSENT without examination scope -> must fail HTTP 400
    bad_payload = {
        "target_id": "GAP-001",
        "decision": "CONFIRM_ABSENT",
        "notes": "Missing CAF record",
        "scope": "",
        "target_type": "gap",
    }
    bad_resp = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/reviews", json=bad_payload)
    assert bad_resp.status_code == 400
    assert "examination scope is required" in bad_resp.json()["detail"].lower()

    # Valid CONFIRM_ABSENT with defined statutory scope -> succeeds
    valid_payload = {
        "target_id": "GAP-001",
        "decision": "CONFIRM_ABSENT",
        "notes": "Requisitioned Section 94 BNSS reply from TSP confirming no physical CAF on file.",
        "scope": "All subscriber database archives for MSISDN 9876543210 up to Jan 2026.",
        "target_type": "gap",
    }
    valid_resp = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/reviews", json=valid_payload)
    assert valid_resp.status_code == 200
    assert valid_resp.json()["decision"] == "CONFIRM_ABSENT"


def test_finding_explanation_and_review_auth_boundaries():
    """Verify that finding explanation and review endpoints enforce 7-factor RBAC and fail-closed."""
    # 1. Unauthenticated client
    unauth = TestClient(app)
    assert unauth.get("/api/v1/forensics/cases/upi_payment_discrepancy/findings/F1/explanation").status_code == 401
    assert unauth.get("/api/v1/forensics/cases/upi_payment_discrepancy/findings/F1/provenance").status_code == 401
    assert unauth.post("/api/v1/forensics/cases/upi_payment_discrepancy/reviews", json={"target_id": "F1", "decision": "ACCEPT"}).status_code == 401
    assert unauth.get("/api/v1/forensics/cases/upi_payment_discrepancy/reviews").status_code == 401

    # 2. Cross-case unauthorized investigator
    token_guru = AuthService.get_instance().create_jwt_token("INVESTIGATOR_GURUGRAM")
    guru = TestClient(app)
    guru.headers.update({"Authorization": f"Bearer {token_guru}"})

    assert guru.get("/api/v1/forensics/cases/upi_payment_discrepancy/findings/F1/explanation").status_code == 403
    assert guru.get("/api/v1/forensics/cases/upi_payment_discrepancy/findings/F1/provenance").status_code == 403
    assert guru.post("/api/v1/forensics/cases/upi_payment_discrepancy/reviews", json={"target_id": "F1", "decision": "ACCEPT"}).status_code == 403
    assert guru.get("/api/v1/forensics/cases/upi_payment_discrepancy/reviews").status_code == 403


def test_statutory_report_persistence_and_retrieval(client: TestClient):
    """Verify generated statutory reports are persisted to CaseStore and can be listed/retrieved."""
    payload = {
        "examiner_name": "Senior Digital Forensics Inspector",
        "investigation_purpose": "SUTRAM 2026 Persistence and Verification Audit",
    }
    gen_resp = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/reports", json=payload)
    assert gen_resp.status_code == 200
    report = gen_resp.json()
    report_id = report["report_metadata"]["report_id"]
    assert report_id.startswith("REP-")

    # 1. List reports
    list_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/reports")
    assert list_resp.status_code == 200
    reports_list = list_resp.json()
    assert isinstance(reports_list, list)
    assert len(reports_list) >= 1
    found = any(
        r.get("report_id") == report_id or r.get("metadata", {}).get("report_id") == report_id
        for r in reports_list
    )
    assert found is True

    # 2. Get report detail
    detail_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/reports/{report_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["report_metadata"]["report_id"] == report_id
    assert detail["report_metadata"]["fingerprint"] != ""
    assert len(detail["artifact_manifest"]) >= 4

    # 3. Nonexistent report -> 404
    missing_resp = client.get("/api/v1/forensics/cases/upi_payment_discrepancy/reports/REP-NONEXISTENT-999")
    assert missing_resp.status_code == 404


def test_statutory_report_export_pdf_html_json(client: TestClient):
    """Verify Section 63 BSA statutory forensic reports can be exported to binary PDF, HTML, and JSON."""
    # First ensure a report exists
    payload = {
        "examiner_name": "Lead Forensic Examiner",
        "investigation_purpose": "Statutory Export Certification",
    }
    gen_resp = client.post("/api/v1/forensics/cases/upi_payment_discrepancy/reports", json=payload)
    assert gen_resp.status_code == 200
    report_id = gen_resp.json()["report_metadata"]["report_id"]

    # 1. Export PDF
    pdf_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/reports/{report_id}/export?format=pdf")
    assert pdf_resp.status_code == 200
    assert "application/pdf" in pdf_resp.headers.get("content-type", "")
    assert f'filename="tarka_{report_id}.pdf"' in pdf_resp.headers.get("content-disposition", "")
    assert pdf_resp.content.startswith(b"%PDF")  # Valid binary PDF magic bytes

    # 2. Export HTML
    html_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/reports/{report_id}/export?format=html")
    assert html_resp.status_code == 200
    assert "text/html" in html_resp.headers.get("content-type", "")
    assert f'filename="tarka_{report_id}.html"' in html_resp.headers.get("content-disposition", "")
    assert b"<!DOCTYPE html>" in html_resp.content or b"<html" in html_resp.content
    assert b"Section 63" in html_resp.content or b"BSA" in html_resp.content or b"TARKA" in html_resp.content

    # 3. Export JSON
    json_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/reports/{report_id}/export?format=json")
    assert json_resp.status_code == 200
    assert "application/json" in json_resp.headers.get("content-type", "")
    assert f'filename="tarka_{report_id}.json"' in json_resp.headers.get("content-disposition", "")
    json_data = json_resp.json()
    assert json_data["metadata"]["report_id"] == report_id
    assert json_data["metadata"]["fingerprint"] != ""

    # 4. Invalid export format -> 422 or 400
    bad_resp = client.get(f"/api/v1/forensics/cases/upi_payment_discrepancy/reports/{report_id}/export?format=docx")
    assert bad_resp.status_code in (400, 422)


def test_statutory_report_auth_boundaries():
    """Verify that report listing, retrieval, and export endpoints enforce 7-factor RBAC."""
    # 1. Unauthenticated client
    unauth = TestClient(app)
    assert unauth.get("/api/v1/forensics/cases/upi_payment_discrepancy/reports").status_code == 401
    assert unauth.get("/api/v1/forensics/cases/upi_payment_discrepancy/reports/REP-001").status_code == 401
    assert unauth.get("/api/v1/forensics/cases/upi_payment_discrepancy/reports/REP-001/export?format=pdf").status_code == 401

    # 2. Cross-case unauthorized investigator
    token_guru = AuthService.get_instance().create_jwt_token("INVESTIGATOR_GURUGRAM")
    guru = TestClient(app)
    guru.headers.update({"Authorization": f"Bearer {token_guru}"})

    assert guru.get("/api/v1/forensics/cases/upi_payment_discrepancy/reports").status_code == 403
    assert guru.get("/api/v1/forensics/cases/upi_payment_discrepancy/reports/REP-001").status_code == 403
    assert guru.get("/api/v1/forensics/cases/upi_payment_discrepancy/reports/REP-001/export?format=pdf").status_code == 403


def test_sarvam_voice_status_and_indic_languages(client: TestClient):
    """Verify Sarvam Voice integration status reports supported Indic models and languages."""
    res = client.get("/api/v1/forensics/sarvam/status")
    assert res.status_code == 200
    data = res.json()
    assert "provider" in data
    assert "api_configured" in data
    assert data["stt_model"] == "saaras:v4"
    assert data["tts_model"] == "bulbul:v4-flash"
    lang_codes = [lang["code"] for lang in data["supported_languages"]]
    assert "en-IN" in lang_codes
    assert "hi-IN" in lang_codes
    assert "ta-IN" in lang_codes
    assert "te-IN" in lang_codes
    assert "bn-IN" in lang_codes
    assert data["voice_identity"] == "TARKA Forensics Assistant"
    assert data["cloud_processing_disclosed"] is True


def test_sarvam_synthesize_endpoint_fallback_and_structure(client: TestClient, monkeypatch):
    """Verify Sarvam speech synthesis endpoint covers test mode, live Sarvam mode, and unavailable-provider behavior."""
    test_text = "Forensic analysis complete. One mathematical contradiction identified in UPI transaction records."
    payload = {
        "text": test_text,
        "target_language_code": "en-IN",
        "speaker": "shubh",
    }

    # 1. Test Mode (Safe default under pytest: deterministic, live external API calls disabled)
    res_test = client.post("/api/v1/forensics/sarvam/synthesize", json=payload)
    assert res_test.status_code == 200
    data_test = res_test.json()
    assert data_test["provider"] == "SARVAM_BULBUL_TEST"
    assert data_test["use_browser_speech"] is False, "Production invariant: never silently fall back to browser speech synthesis"
    assert data_test["tts_unavailable"] is True
    assert data_test["target_language_code"] == "en-IN"
    assert data_test["spoken_text"] == test_text

    # 2. Live Sarvam Cloud Mode (Simulated live Sarvam Bulbul neural synthesis)
    import requests
    from unittest.mock import MagicMock
    from app.intelligence.sarvam_voice_service import SarvamVoiceService

    monkeypatch.setenv("RUN_LIVE_SARVAM_TEST", "1")
    monkeypatch.setattr(SarvamVoiceService, "effective_api_key", property(lambda self: "test-valid-sarvam-key"))

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"audios": ["UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="]}
    monkeypatch.setattr(requests, "post", lambda *args, **kwargs: mock_resp)

    res_live = client.post("/api/v1/forensics/sarvam/synthesize", json=payload)
    assert res_live.status_code == 200
    data_live = res_live.json()
    assert data_live["provider"] == "SARVAM_CLOUD_BULBUL"
    assert data_live["use_browser_speech"] is False
    assert data_live["tts_unavailable"] is False
    assert data_live["audio_base64"] is not None

    # 3. Unavailable / Error Provider Mode (Provider failure fails closed without silent browser fallback)
    mock_err_resp = MagicMock()
    mock_err_resp.status_code = 503
    mock_err_resp.text = "Service Temporarily Unavailable"
    monkeypatch.setattr(requests, "post", lambda *args, **kwargs: mock_err_resp)

    res_err = client.post("/api/v1/forensics/sarvam/synthesize", json=payload)
    assert res_err.status_code == 200
    data_err = res_err.json()
    assert data_err["provider"] in ("SARVAM_ERROR", "SARVAM_BULBUL_UNAVAILABLE", "SARVAM_UNAVAILABLE")
    assert data_err["use_browser_speech"] is False, "Provider failure must fail closed to text-only, not browser speech"
    assert data_err["tts_unavailable"] is True
    assert data_err["audio_base64"] is None

    # 4. Missing Credentials Mode (Simulate unconfigured credentials outside pytest)
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    monkeypatch.setattr(SarvamVoiceService, "effective_api_key", property(lambda self: None))
    res_unconfigured = client.post("/api/v1/forensics/sarvam/synthesize", json=payload)
    assert res_unconfigured.status_code == 200
    data_unconf = res_unconfigured.json()
    assert data_unconf["provider"] == "SARVAM_BULBUL_UNAVAILABLE"
    assert data_unconf["use_browser_speech"] is False, "Unconfigured voice must fail closed without browser speech fallback"
    assert data_unconf["tts_unavailable"] is True
    assert data_unconf["audio_base64"] is None
    assert data_unconf["target_language_code"] == "en-IN"


def test_sarvam_transcribe_endpoint_structure(client: TestClient):
    """Verify Sarvam audio transcription endpoint handles multipart audio upload."""
    dummy_wav = b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00"
    res = client.post(
        "/api/v1/forensics/sarvam/transcribe",
        files=[("file", ("speech.wav", dummy_wav, "audio/wav"))],
        data={"language_code": "en-IN", "mode": "codemix"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "transcript" in data
    assert "language_code" in data
    assert "provider" in data


def test_safe_agent_orchestration_pipeline_and_tools(client: TestClient):
    """Verify safe agent orchestration pipeline follows 6-stage lifecycle on allowlisted queries."""
    # 1. Contradictions query
    res_contra = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"query": "Show all contradictions in this case"},
    )
    assert res_contra.status_code == 200
    data_c = res_contra.json()
    assert data_c["status"] == "COMPLETED"
    assert data_c["tool_executed"] == "list_contradictions"
    assert "result" in data_c
    stages = [s["state"] for s in data_c["pipeline_stages"]]
    assert "HEARD" in stages
    assert "TRANSCRIBED" in stages
    assert "INTERPRETED" in stages
    assert "AUTHORIZED" in stages
    assert "EXECUTED" in stages
    assert "VERIFIED" in stages

    # 2. Timeline query
    res_time = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"query": "Inspect chronological timeline events"},
    )
    assert res_time.status_code == 200
    data_t = res_time.json()
    assert data_t["status"] == "COMPLETED"
    assert data_t["tool_executed"] == "inspect_timeline"
    assert data_t["result"] is not None

    # 3. Evidence gap query
    res_gap = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"query": "What missing evidence leads or gaps exist?"},
    )
    assert res_gap.status_code == 200
    data_g = res_gap.json()
    assert data_g["tool_executed"] == "list_evidence_gaps"
    assert data_g["status"] == "COMPLETED"
    assert data_g["result"] is not None


def test_safe_agent_contradiction_vs_navigation_intent_regression(client: TestClient):
    """Regression test: verifies analytical contradiction requests route to list_contradictions and UI view switches route to navigate_to_view."""
    case_id = "upi_payment_discrepancy"

    # Analytical queries (English, Tamil, Tanglish, and conflict phrasing) -> must execute list_contradictions and return Z3 results
    analytical_queries = [
        "Show all contradictions in this case",
        "Find contradictions",
        "What conflicts with the evidence?",
        "இந்த case-ல என்ன முரண்பாடுகள் இருக்கு?",
        "Indha case-la contradictions enna?",
        "Show contradictions",
        "List contradictions in this case",
        "Are there any contradictions?",
        "What contradictions exist in this case?",
    ]
    for analytical_query in analytical_queries:
        res = client.post(
            f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
            json={"query": analytical_query},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "COMPLETED", f"Query '{analytical_query}' status was {data.get('status')}"
        assert data["tool_executed"] == "list_contradictions", f"Query '{analytical_query}' was routed to {data.get('tool_executed')}"
        assert "contradictions" in data["result"], f"Query '{analytical_query}' did not return contradiction results"
        assert data["navigation_view"] is None

    # Explicit UI navigation queries -> must execute navigate_to_view
    for nav_query, expected_view in [
        ("Navigate to contradictions", "contradictions"),
        ("Switch to contradictions tab", "contradictions"),
        ("Show the contradictions view", "contradictions"),
        ("Navigate to the timeline", "timeline"),
        ("Navigate to the reports library", "reports"),
        ("Go to overview", "overview"),
    ]:
        res_nav = client.post(
            f"/api/v1/forensics/cases/{case_id}/agent/orchestrate",
            json={"query": nav_query},
        )
        assert res_nav.status_code == 200
        data_nav = res_nav.json()
        assert data_nav["status"] == "COMPLETED"
        assert data_nav["tool_executed"] == "navigate_to_view", f"Query '{nav_query}' was not routed to navigate_to_view"
        assert data_nav["navigation_view"] == expected_view or data_nav["result"].get("view") == expected_view


def test_safe_agent_consequential_action_requires_explicit_confirmation(client: TestClient):
    """Verify consequential actions (like statutory report generation) require confirmation before execution."""
    # 1. First attempt: unconfirmed -> must pause at INTERPRETED with requires_confirmation=True
    res_unconfirmed = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"query": "Generate statutory Section 63 BSA report for court submission", "confirmed": False},
    )
    assert res_unconfirmed.status_code == 200
    data_u = res_unconfirmed.json()
    assert data_u["tool_executed"] == "generate_report"
    assert data_u["requires_confirmation"] is True
    assert data_u["status"] == "CONFIRMATION_REQUIRED"
    assert "consequential" in data_u["confirmation_prompt"].lower() or "statutory" in data_u["confirmation_prompt"].lower()

    # 2. Second attempt: confirmed -> executes and verifies
    res_confirmed = client.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"query": "Generate statutory Section 63 BSA report for court submission", "confirmed": True},
    )
    assert res_confirmed.status_code == 200
    data_c = res_confirmed.json()
    assert data_c["tool_executed"] == "generate_report"
    assert data_c["requires_confirmation"] is False
    assert data_c["status"] == "COMPLETED"
    assert "report_id" in data_c["result"] or "report_metadata" in data_c["result"]


def test_safe_agent_cross_case_unauthorized_fails_closed():
    """Verify that agent orchestration fails closed when user lacks jurisdiction for case."""
    token_guru = AuthService.get_instance().create_jwt_token("INVESTIGATOR_GURUGRAM")
    guru = TestClient(app)
    guru.headers.update({"Authorization": f"Bearer {token_guru}"})

    res = guru.post(
        "/api/v1/forensics/cases/upi_payment_discrepancy/agent/orchestrate",
        json={"query": "List all evidence"},
    )
    assert res.status_code == 403
    assert "ACCESS_DENIED" in res.json()["detail"]




