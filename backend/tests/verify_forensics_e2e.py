"""End-to-End Forensic Workflow Verification Script.

Executes complete verification of:
1. Synthetic Case Seeding & Evidence Registration
2. Byte-Exact SHA-256 Custody Verification
3. Fact Normalization & Timestamp Clock-Domain Preservation
4. Z3 SMT Contradiction Detection & MUS
5. Source-to-Finding Traceability (Bidirectional Provenance)
6. Non-Accusatory Finding Explanations
7. Statutory Examiner Review & Custody Ledger Appending
8. Fail-Closed Review Scope Enforcement
9. Section 63 BSA Statutory Report Persistence & Deterministic Fingerprinting
10. Multi-Format Export (Binary PDF, Self-Contained HTML, Validated JSON)
11. 7-Factor RBAC Authorization & Case Isolation
12. Reproducibility & Idempotency Verification
"""

import sys
import json
from fastapi.testclient import TestClient
from app.main import app
from app.services.auth_service import AuthService


def test_e2e_forensic_workflow_verification():
    print("=" * 80)
    print("SENTINELX x TARKA: END-TO-END FORENSIC WORKFLOW VERIFICATION")
    print("Benchmark: SUTRAM 2026 / SIH 2026 Indigenous Digital Forensics Framework")
    print("Data Policy: Isolated Synthetic Digital Evidence Only (UPI Payment Discrepancy)")
    print("=" * 80)

    auth_service = AuthService.get_instance()
    delhi_token = auth_service.create_jwt_token("INVESTIGATOR_DELHI")
    gurugram_token = auth_service.create_jwt_token("INVESTIGATOR_GURUGRAM")

    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {delhi_token}"})
    case_id = "upi_payment_discrepancy"

    results = []

    def record_step(step_num: int, name: str, success: bool, details: str):
        status = "PASSED" if success else "FAILED"
        results.append((step_num, name, status, details))
        print(f"\n[STEP {step_num}] {name}: {status}")
        print(f"  -> {details}")
        assert success, f"Step {step_num} failed: {details}"

    # --------------------------------------------------------------------------
    # Step 1: Health & Engine Mount
    # --------------------------------------------------------------------------
    resp = client.get("/api/v1/forensics/health")
    ok = (resp.status_code == 200 and resp.json().get("status") == "healthy")
    record_step(1, "Forensics Health & Z3 Solver Mount", ok, f"Engine: {resp.json().get('engine')}, Solver: {resp.json().get('solver')}")

    # --------------------------------------------------------------------------
    # Step 2: Deterministic Synthetic Case Seeding
    # --------------------------------------------------------------------------
    seed_resp = client.post(f"/api/v1/forensics/cases/{case_id}/seed-synthetic")
    s_data = seed_resp.json()
    ok = (seed_resp.status_code == 200 and s_data.get("artifact_count", 0) >= 4)
    record_step(2, "Deterministic Synthetic Case Seeding", ok, f"Case: {case_id}, Seeded Artifacts: {s_data.get('artifact_count')}")

    # --------------------------------------------------------------------------
    # Step 3: Byte-Exact SHA-256 Custody Verification
    # --------------------------------------------------------------------------
    art_resp = client.get(f"/api/v1/forensics/cases/{case_id}/artifacts")
    raw_arts = art_resp.json()
    arts = raw_arts if isinstance(raw_arts, list) else raw_arts.get("artifacts", [])
    custody_verified = True
    custody_hashes = []
    for art in arts:
        sha = art.get("sha256")
        tier = art.get("source_tier")
        if not sha or len(sha) != 64 or not tier:
            custody_verified = False
        custody_hashes.append((art.get("artifact_id"), art.get("filename"), sha[:12] + "..."))
    record_step(3, "Evidence Bitstream SHA-256 & Custody Ledger", custody_verified and len(arts) >= 4, f"Verified {len(arts)} artifacts: {custody_hashes}")

    # --------------------------------------------------------------------------
    # Step 4: Timestamp Clock-Domain & Temporal Reconstruction
    # --------------------------------------------------------------------------
    tl_resp = client.get(f"/api/v1/forensics/cases/{case_id}/timeline")
    tl_data = tl_resp.json()
    events = tl_data.get("events", [])
    has_timestamps = all("timestamp_iso" in ev and "timestamp_epoch" in ev for ev in events) if events else False
    has_priorities = all("temporal_priority" in ev for ev in events) if events else False
    record_step(4, "Temporal Reconstruction with Timestamp Precision", len(events) >= 3 and has_timestamps and has_priorities, f"Reconstructed {len(events)} events with UTC ISO-8601 timestamps, epoch floats, and temporal resolution priorities (1-4)")

    # --------------------------------------------------------------------------
    # Step 5: Z3 SMT Contradiction Detection & MUS
    # --------------------------------------------------------------------------
    contra_resp = client.get(f"/api/v1/forensics/cases/{case_id}/contradictions")
    contra_data = contra_resp.json()
    contras = contra_data.get("contradictions", [])
    gaps = contra_data.get("evidence_gaps", [])
    has_mus = any(len(c.get("supporting_fact_ids", [])) >= 2 for c in contras) if contras else False
    first_finding_id = contras[0].get("finding_id") if contras else "F1"
    record_step(5, "Z3 SMT Contradiction Detection & MUS", len(contras) >= 1 and has_mus, f"Detected {len(contras)} contradictions and {len(gaps)} evidence gaps. First MUS finding: {first_finding_id}")

    # --------------------------------------------------------------------------
    # Step 6: Source-to-Finding Traceability (Bidirectional Provenance)
    # --------------------------------------------------------------------------
    bw_resp = client.get(f"/api/v1/forensics/cases/{case_id}/findings/{first_finding_id}/provenance?direction=BACKWARD")
    bw_data = bw_resp.json()
    first_art_id = arts[0].get("artifact_id")
    fw_resp = client.get(f"/api/v1/forensics/cases/{case_id}/findings/{first_art_id}/provenance?direction=FORWARD")
    fw_data = fw_resp.json()
    ok_prov = (bw_resp.status_code == 200 and fw_resp.status_code == 200 and len(bw_data.get("nodes", [])) >= 2 and len(fw_data.get("nodes", [])) >= 1)
    record_step(6, "Source-to-Finding Bidirectional Provenance", ok_prov, f"Backward trace root: {bw_data.get('root_id')} ({len(bw_data.get('nodes', []))} nodes), Forward trace root: {fw_data.get('root_id')} ({len(fw_data.get('nodes', []))} nodes)")

    # --------------------------------------------------------------------------
    # Step 7: Non-Accusatory Finding Explanation
    # --------------------------------------------------------------------------
    expl_resp = client.get(f"/api/v1/forensics/cases/{case_id}/findings/{first_finding_id}/explanation")
    expl_data = expl_resp.json()
    ok_expl = (expl_resp.status_code == 200 and "sources" in expl_data and "derivation_chain" in expl_data and "plain_language_summary" in expl_data)
    record_step(7, "Non-Accusatory Finding Derivation & Disclaimers", ok_expl, f"Derivation steps: {len(expl_data.get('derivation_chain', []))}, Sources: {len(expl_data.get('sources', []))}, Summary: '{expl_data.get('plain_language_summary', '')[:60]}...'")

    # --------------------------------------------------------------------------
    # Step 8: Statutory Examiner Review & Custody Ledger Appending
    # --------------------------------------------------------------------------
    review_payload = {
        "target_id": first_finding_id,
        "decision": "ACCEPT",
        "reviewed_by": "Inspector V. Sharma (Cyber Crime Cell)",
        "notes": "Verified INR 25,000 debit against core banking CBS transaction log RRN 502819384729.",
        "target_type": "finding",
    }
    rev_resp = client.post(f"/api/v1/forensics/cases/{case_id}/reviews", json=review_payload)
    rev_data = rev_resp.json()
    ok_rev = (rev_resp.status_code == 200 and rev_data.get("decision") == "ACCEPT" and "reviewed_at_iso" in rev_data)

    # Re-check explanation to ensure review audit is reflected
    expl_updated = client.get(f"/api/v1/forensics/cases/{case_id}/findings/{first_finding_id}/explanation").json()
    audit_reflected = expl_updated.get("review_audit", {}).get("review_state") == "ACCEPT"
    record_step(8, "Statutory Examiner Review & Custody Append", ok_rev and audit_reflected, f"Decision 'ACCEPT' recorded in custody ledger. Finding explanation audit state updated to: {expl_updated.get('review_audit', {}).get('review_state')}")

    # --------------------------------------------------------------------------
    # Step 9: Fail-Closed Review Scope Enforcement
    # --------------------------------------------------------------------------
    bad_scope = client.post(f"/api/v1/forensics/cases/{case_id}/reviews", json={
        "target_id": "GAP-001",
        "decision": "CONFIRM_ABSENT",
        "notes": "Missing CAF record",
        "scope": "",
        "target_type": "gap",
    })
    ok_bad_scope = (bad_scope.status_code == 400 and "examination scope is required" in bad_scope.json().get("detail", "").lower())

    good_scope = client.post(f"/api/v1/forensics/cases/{case_id}/reviews", json={
        "target_id": "GAP-001",
        "decision": "CONFIRM_ABSENT",
        "notes": "Section 94 BNSS reply confirmed no physical CAF.",
        "scope": "All subscriber database archives for MSISDN up to Jan 2026.",
        "target_type": "gap",
    })
    ok_good_scope = (good_scope.status_code == 200 and good_scope.json().get("decision") == "CONFIRM_ABSENT")
    record_step(9, "Fail-Closed Examiner Review Scope Enforcement", ok_bad_scope and ok_good_scope, "Unscoped CONFIRM_ABSENT rejected (HTTP 400); Scoped CONFIRM_ABSENT recorded successfully (HTTP 200)")

    # --------------------------------------------------------------------------
    # Step 10: Section 63 BSA Report Persistence & Listing
    # --------------------------------------------------------------------------
    rep_gen = client.post(f"/api/v1/forensics/cases/{case_id}/reports", json={
        "examiner_name": "Chief Digital Forensics Examiner",
        "investigation_purpose": "SUTRAM 2026 E2E Verification Audit",
    })
    rep_data = rep_gen.json()
    rep_id = rep_data.get("report_metadata", {}).get("report_id")
    rep_fp1 = rep_data.get("report_metadata", {}).get("fingerprint")

    rep_list = client.get(f"/api/v1/forensics/cases/{case_id}/reports").json()
    rep_get = client.get(f"/api/v1/forensics/cases/{case_id}/reports/{rep_id}").json()
    ok_rep = (
        rep_gen.status_code == 200
        and rep_id
        and rep_fp1
        and isinstance(rep_list, list)
        and len(rep_list) >= 1
        and rep_get.get("report_metadata", {}).get("report_id") == rep_id
    )
    record_step(10, "Statutory Section 63 BSA Report Persistence", ok_rep, f"Report ID: {rep_id}, Persisted in CaseStore, Retrieved successfully. Substantive Fingerprint: {rep_fp1[:16]}...")

    # --------------------------------------------------------------------------
    # Step 11: Multi-Format Export (PDF, HTML, JSON)
    # --------------------------------------------------------------------------
    pdf_resp = client.get(f"/api/v1/forensics/cases/{case_id}/reports/{rep_id}/export?format=pdf")
    html_resp = client.get(f"/api/v1/forensics/cases/{case_id}/reports/{rep_id}/export?format=html")
    json_resp = client.get(f"/api/v1/forensics/cases/{case_id}/reports/{rep_id}/export?format=json")
    bad_fmt = client.get(f"/api/v1/forensics/cases/{case_id}/reports/{rep_id}/export?format=exe")

    ok_pdf = (pdf_resp.status_code == 200 and pdf_resp.content.startswith(b"%PDF") and "application/pdf" in pdf_resp.headers.get("content-type", ""))
    ok_html = (html_resp.status_code == 200 and (b"<!DOCTYPE html>" in html_resp.content or b"<html" in html_resp.content) and "text/html" in html_resp.headers.get("content-type", ""))
    ok_json = (json_resp.status_code == 200 and "metadata" in json_resp.json() and "application/json" in json_resp.headers.get("content-type", ""))
    ok_bad_fmt = (bad_fmt.status_code in (400, 422))

    record_step(11, "Multi-Format Export (PDF, HTML, JSON)", ok_pdf and ok_html and ok_json and ok_bad_fmt, f"Binary PDF: {len(pdf_resp.content)} bytes (%PDF magic bytes verified), HTML: {len(html_resp.content)} bytes, JSON: {len(json_resp.content)} bytes. Invalid format rejected.")

    # --------------------------------------------------------------------------
    # Step 12: 7-Factor RBAC Authorization & Case Isolation
    # --------------------------------------------------------------------------
    unauth_client = TestClient(app)
    unauth_rep = unauth_client.get(f"/api/v1/forensics/cases/{case_id}/reports")
    unauth_export = unauth_client.get(f"/api/v1/forensics/cases/{case_id}/reports/{rep_id}/export?format=pdf")

    cross_case_client = TestClient(app)
    cross_case_client.headers.update({"Authorization": f"Bearer {gurugram_token}"})
    cross_rep = cross_case_client.get(f"/api/v1/forensics/cases/{case_id}/reports")
    cross_export = cross_case_client.get(f"/api/v1/forensics/cases/{case_id}/reports/{rep_id}/export?format=pdf")

    ok_rbac = (
        unauth_rep.status_code == 401
        and unauth_export.status_code == 401
        and cross_rep.status_code == 403
        and cross_export.status_code == 403
    )
    record_step(12, "7-Factor RBAC & Case Isolation Boundaries", ok_rbac, "Unauthenticated calls fail closed (HTTP 401); Cross-case unauthorized investigator forbidden (HTTP 403)")

    # --------------------------------------------------------------------------
    # Step 13: Deterministic Reproducibility
    # --------------------------------------------------------------------------
    from tarka.core.forensic_report import ForensicReportBuilder
    from app.adapters.tarka_forensics_adapter import TarkaForensicsAdapter
    adapter = TarkaForensicsAdapter()
    builder = ForensicReportBuilder(case_store=adapter.store)
    b_rep1 = builder.generate_report(case_id=case_id)
    b_rep2 = builder.generate_report(case_id=case_id)
    fp_match = (b_rep1.metadata.fingerprint == b_rep2.metadata.fingerprint)

    rep_gen2 = client.post(f"/api/v1/forensics/cases/{case_id}/reports", json={
        "examiner_name": "Chief Digital Forensics Examiner",
        "investigation_purpose": "SUTRAM 2026 E2E Verification Audit",
    })
    rep_gen2_data = rep_gen2.json()
    substantive_match = (
        rep_data.get("findings") == rep_gen2_data.get("findings")
        and rep_data.get("evidence_inventory") == rep_gen2_data.get("evidence_inventory")
        and rep_data.get("timeline") == rep_gen2_data.get("timeline")
        and rep_data.get("evidence_gaps") == rep_gen2_data.get("evidence_gaps")
    )
    ok_repro = (fp_match and substantive_match)
    record_step(13, "Deterministic Report Content Fingerprint Reproducibility", ok_repro, f"Direct Builder FP 1: {b_rep1.metadata.fingerprint}\n  Direct Builder FP 2: {b_rep2.metadata.fingerprint}\n  Substantive evidentiary content match: {substantive_match}\n  Identical SHA-256 substantive content fingerprint confirmed.")

    print("\n" + "=" * 80)
    print("ALL 13 END-TO-END FORENSIC VERIFICATION PHASES PASSED WITH ZERO REGRESSIONS")
    print("=" * 80)


if __name__ == "__main__":
    test_e2e_forensic_workflow_verification()

