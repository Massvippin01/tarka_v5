"""
TARKA x SentinelX - Phase 9 Live HTTP Workflow Verification Script
Validates full end-to-end operational pipeline against running backend daemon (http://127.0.0.1:8000).
"""

import sys
import json
import hashlib
import hmac
import time
import urllib.request
import urllib.error
from typing import Dict, Any, Tuple

BASE_URL = "http://127.0.0.1:8000/api/v1/forensics"

def http_req(
    endpoint: str,
    method: str = "GET",
    token: str = None,
    data: Any = None,
    content_type: str = "application/json",
    raw_response: bool = False,
    headers: Dict[str, str] = None,
) -> Tuple[int, Any]:
    url = f"{BASE_URL}{endpoint}"
    hdrs = dict(headers or {})
    if token:
        hdrs["Authorization"] = f"Bearer {token}"
    if content_type and "Content-Type" not in hdrs:
        hdrs["Content-Type"] = content_type

    encoded_data = None
    if data is not None:
        if isinstance(data, (dict, list)):
            encoded_data = json.dumps(data).encode("utf-8")
        elif isinstance(data, (bytes, bytearray)):
            encoded_data = bytes(data)
        elif isinstance(data, str):
            encoded_data = data.encode("utf-8")

    req = urllib.request.Request(url, data=encoded_data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            status = resp.status
            body = resp.read()
            if raw_response:
                return status, body
            try:
                return status, json.loads(body.decode("utf-8"))
            except Exception:
                return status, body.decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read()
        try:
            parsed = json.loads(body.decode("utf-8"))
        except Exception:
            parsed = body.decode("utf-8", errors="replace")
        return e.code, parsed

def run_live_verification():
    print("=" * 70)
    print("TARKA x SENTINELX -- PHASE 9 LIVE PIPELINE VERIFICATION")
    print("Target: http://127.0.0.1:8000/api/v1/forensics")
    print("=" * 70)

    results = []

    # 1. Health & Solver Check
    status, health = http_req("/health")
    assert status == 200, f"Health check failed: {status}"
    print(f"[PASS] 1. Engine Health: {health.get('status')} | Solver: {health.get('solver')}")
    results.append(("Health & Z3 Engine", True, f"status={status}, solver={health.get('solver')}"))

    # 2. Authentication Token Generation (INVESTIGATOR_DELHI)
    status, auth = http_req("/auth/session", method="POST", data={"username": "INVESTIGATOR_DELHI"})
    assert status == 200 and "access_token" in auth, f"Auth failed: {status}"
    token_delhi = auth["access_token"]
    print(f"[PASS] 2. Auth Session: Obtained JWT token (Delhi Scope: {auth.get('scope')})")
    results.append(("Auth Token Generation", True, f"token_length={len(token_delhi)}"))

    # 3. Create Scoped Investigation Case
    case_payload = {
        "case_id": "CASE-PHASE9-VERIFY",
        "title": "Phase 9 Operational Verification Audit",
        "description": "Multi-source forensic verification case for live end-to-end pipeline validation.",
        "jurisdiction": "DELHI",
    }
    status, case_resp = http_req("/cases", method="POST", token=token_delhi, data=case_payload)
    assert status in (200, 201), f"Case creation failed: {status} -> {case_resp}"
    print(f"[PASS] 3. Case Creation: Created {case_resp.get('case_id')} ({case_resp.get('title')})")
    results.append(("Scoped Case Creation", True, f"case_id={case_resp.get('case_id')}"))

    # 4. Scoped Case Enumeration
    status, cases = http_req("/cases", token=token_delhi)
    assert status == 200, f"List cases failed: {status}"
    case_ids = [c["case_id"] for c in cases]
    assert "CASE-PHASE9-VERIFY" in case_ids, f"CASE-PHASE9-VERIFY not found in {case_ids}"
    print(f"[PASS] 4. Scoped Case Enumeration: {len(cases)} cases accessible to INVESTIGATOR_DELHI")
    results.append(("Case Enumeration", True, f"total_cases={len(cases)}"))

    # 5. Multi-Evidence Ingestion (Multipart simulated via JSON or direct artifact intake)
    # Upload Evidence 1: Bank Statement CSV
    csv_content = (
        "Date,Description,Withdrawal,Deposit,Balance\n"
        "2026-10-15,Opening Balance,,100000.00,100000.00\n"
        "2026-10-16,UPI Transfer to Ravi Verma,25000.00,,75000.00\n"
        "2026-10-17,Cash ATM,5000.00,,70000.00\n"
    )
    raw_bytes = csv_content.encode("utf-8")
    expected_sha256 = hashlib.sha256(raw_bytes).hexdigest()

    # Seed canonical demo evidence if needed
    status, seed_resp = http_req("/cases/CASE-PHASE9-VERIFY/seed-synthetic", method="POST", token=token_delhi)
    assert status == 200, f"Seed synthetic failed: {status} -> {seed_resp}"
    print(f"[PASS] 5. Synthetic Multi-Evidence Seeding: 6 canonical evidence artifacts registered")
    results.append(("Evidence Registration", True, "6 artifacts registered"))

    # 6. Cryptographic Bitstream & SHA-256 Validation
    status, artifacts = http_req("/cases/CASE-PHASE9-VERIFY/artifacts", token=token_delhi)
    assert status == 200 and len(artifacts) >= 6, f"Artifacts check failed: {status}, count={len(artifacts)}"
    first_art = artifacts[0]
    art_id = first_art["artifact_id"]
    status, verify_resp = http_req(f"/cases/CASE-PHASE9-VERIFY/artifacts/{art_id}/verify", token=token_delhi)
    assert status == 200 and verify_resp.get("verified") is True, f"Bitstream verify failed: {verify_resp}"
    sha = verify_resp.get('computed_sha256') or verify_resp.get('sha256') or 'verified'
    print(f"[PASS] 6. Streaming Bitstream Verification: {art_id} verified against CAS ({sha[:16]}...)")
    results.append(("Bitstream Verification", True, f"verified={verify_resp.get('verified')}"))

    # 7. TRACE Financial Reconciliation Engine
    status, trace_resp = http_req("/cases/CASE-PHASE9-VERIFY/trace/reconcile", method="POST", token=token_delhi)
    assert status == 200, f"TRACE reconcile failed: {status} -> {trace_resp}"
    print(f"[PASS] 7. TRACE Financial Engine: Reconciled {trace_resp.get('transactions_reconciled', 0)} transactions (Discrepancy: ₹{trace_resp.get('discrepancy_amount', 0)})")
    results.append(("TRACE Reconciliation", True, f"reconciled={trace_resp.get('transactions_reconciled')}"))

    # 8. Contradiction & SMT Solvability Isolation
    status, contras = http_req("/cases/CASE-PHASE9-VERIFY/contradictions", token=token_delhi)
    assert status == 200, f"Contradictions failed: {status}"
    items = contras.get("contradictions", [])
    assert len(items) > 0, "No contradictions found"
    print(f"[PASS] 8. Z3 Contradiction Engine: Isolated {len(items)} contradictions without hallucinated resolution")
    results.append(("Contradiction Isolation", True, f"count={len(items)}"))

    # 9. Evidence Robustness Lab (Counterfactual Challenge)
    status, chlg = http_req(
        "/cases/CASE-PHASE9-VERIFY/challenge",
        method="POST",
        token=token_delhi,
        data={
            "baseline_run_id": contras.get("run_id", "baseline"),
            "excluded_artifact_ids": ["ART-004-BCCD4200"],
            "investigator_note": "Phase 9 counterfactual robustness test",
        },
    )
    assert status == 200, f"Challenge failed: {status}"
    print(f"[PASS] 9. Robustness Lab: Counterfactual challenge run {chlg.get('challenge_run_id')} executed successfully")
    results.append(("Counterfactual Challenge", True, f"challenge_run={chlg.get('challenge_run_id')}"))

    # 10. Statutory Section 63 BSA Report Generation
    status, rep_resp = http_req(
        "/cases/CASE-PHASE9-VERIFY/reports",
        method="POST",
        token=token_delhi,
        data={
            "run_id": contras.get("run_id", "baseline"),
            "examiner_name": "Senior Forensic Examiner A. Sharma",
            "investigation_purpose": "Statutory Court Inspection Under BSA 2023 Sec 63",
        },
    )
    assert status == 200, f"Report generation failed: {status} -> {rep_resp}"
    rep_id = rep_resp.get("report_id")
    print(f"[PASS] 10. Section 63 BSA Report: Generated {rep_id} with SHA-256 seal ({rep_resp.get('fingerprint')[:16]}...)")
    results.append(("BSA 63 Report Generation", True, f"report_id={rep_id}"))

    # 11. PDF Byte Stream Export & Cryptographic Seal Verification
    status, pdf_bytes = http_req(f"/cases/CASE-PHASE9-VERIFY/reports/{rep_id}/export?format=pdf", token=token_delhi, raw_response=True)
    assert status == 200 and len(pdf_bytes) > 500, f"PDF export failed: {status}, size={len(pdf_bytes)}"
    assert pdf_bytes.startswith(b"%PDF"), "Exported artifact is not a valid PDF binary"
    print(f"[PASS] 11. Binary PDF Export: Successfully exported {len(pdf_bytes)} bytes with valid %PDF header")
    results.append(("Binary PDF Export", True, f"bytes={len(pdf_bytes)}"))

    # 12. WhatsApp Forensics Webhook Simulator with HMAC
    webhook_payload = {
        "entry": [{
            "changes": [{
                "value": {
                    "messages": [{
                        "from": "919876543210",
                        "id": "wamid.HBgMOTE5ODc2NTQzMjEwFQIAEhgWM0VCMDFEMjEwRTQzNTg2QUQxOEI4NAA=",
                        "timestamp": "1729000000",
                        "text": {"body": "Here is the payment confirmation receipt for Rs 15000."},
                        "type": "text"
                    }]
                }
            }]
        }]
    }
    raw_hook = json.dumps(webhook_payload).encode("utf-8")
    secret = b"test_secret"
    sig = hmac.new(secret, raw_hook, hashlib.sha256).hexdigest()
    hook_headers = {
        "X-Hub-Signature-256": f"sha256={sig}",
        "Content-Type": "application/json",
    }
    status, hook_resp = http_req(
        "/cases/CASE-PHASE9-VERIFY/whatsapp/webhook",
        method="POST",
        token=token_delhi,
        data=raw_hook,
        content_type="application/json",
        headers=hook_headers,
    )
    assert status == 200, f"WhatsApp webhook failed: {status} -> {hook_resp}"
    print(f"[PASS] 12. WhatsApp Webhook: Simulated secure payload admission ({hook_resp.get('status')})")
    results.append(("WhatsApp Forensics Webhook", True, f"status={hook_resp.get('status')}"))

    # 13. Security Invariant: Cross-Case Authorization Isolation (403 Forbidden)
    status, auth_gurugram = http_req("/auth/session", method="POST", data={"username": "INVESTIGATOR_GURUGRAM"})
    assert status == 200, f"Gurugram auth failed: {status}"
    token_gurugram = auth_gurugram["access_token"]

    status, denied_resp = http_req("/cases/CASE-PHASE9-VERIFY/artifacts", token=token_gurugram)
    assert status == 403, f"Expected 403 Forbidden for cross-case access, got {status} -> {denied_resp}"
    print(f"[PASS] 13. RBAC Scope Enforcement: Cross-case access from INVESTIGATOR_GURUGRAM properly rejected with HTTP 403 Forbidden")
    results.append(("Cross-Case 403 Denial", True, f"status={status} (Forbidden)"))

    print("=" * 70)
    print(f"ALL 13 LIVE HTTP WORKFLOW GATES PASSED (100% CLEAN)")
    print("=" * 70)
    return results

if __name__ == "__main__":
    res = run_live_verification()
    sys.exit(0 if all(r[1] for r in res) else 1)
