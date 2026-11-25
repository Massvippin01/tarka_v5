# TARKA × SENTINELX — PHASE 14.1
# FORENSIC ENGINEERING FAILURE & DEFECT REGISTER

**Classification:** Defect Resolution, Security Blocks & Resiliency Journal  
**Evaluation Standard:** SentinelX Engineering Constitution (Rules 1, 4, 7, 9, 12, 16)  
**Date:** 2026-11-24 / 2026-11-25  

---

## 1. Defect & Failure Inventory

The table below catalogs every defect, crash, boundary condition, and security block encountered and resolved during Phase 14.1:

| Defect ID | Severity | Component | Symptom / Error Observed | Root Cause Analysis | Remediation Applied | Verification Status |
|---|---|---|---|---|---|---|
| **FAIL-14.1-01** | **CRITICAL** | Ingestion Socket / Winsock | `WinError 10055`: `An operation on a socket could not be performed because the system lacked sufficient buffer space or because a queue was full` | Monolithic HTTP multipart upload of 1 GB file exhausted the Windows non-paged kernel pool buffer (`afd.sys`). | Implemented 8 MiB bounded chunked resumable streaming protocol (`universal_evidence_gateway.py`). | **RESOLVED**: 1 GB & 2 GB uploaded smoothly without socket error. |
| **FAIL-14.1-02** | **HIGH** | Evidence Gateway | 10 KB screenshot upload took 1,946 ms | RapidOCR image raster parsing was executed synchronously inside the HTTP POST handler. | Decoupled ingestion from analysis; OCR moved to background thread (`tarka_forensics_adapter.py`). | **RESOLVED**: Screenshot ingestion dropped to 39 ms (50x speedup). |
| **FAIL-14.1-03** | **HIGH** | Ingestion Adapter | Chunked upload completed but background analysis remained permanently `QUEUED` | `append_upload_chunk()` registered the job with `JobOrchestrator` but never called `start_job_execution()`. | Added explicit `self.job_orchestrator.start_job_execution(job.job_id, run_chunked_artifact_analysis)`. | **RESOLVED**: Background jobs transition through all stages automatically. |
| **FAIL-14.1-04** | **MEDIUM** | Ingestion Adapter | `HTTP 400`: `name 'case_id' is not defined` during final chunk finalization | When refactoring `register_artifact` into background thread, outer `case_id = sess["case_id"]` was omitted. | Restored `case_id = sess["case_id"]` before `create_job()` call. | **RESOLVED**: All final chunks finalize with HTTP 202. |
| **FAIL-14.1-05** | **MEDIUM** | API Routing | `HTTP 404 Not Found` when querying `/cases/{case_id}/evidence/jobs/{job_id}` | Endpoint was registered as `/cases/{case_id}/jobs/{job_id}`. Client queried `/evidence/jobs/{job_id}`. | Added route alias `@router.get("/cases/{case_id}/evidence/jobs/{job_id}")` in `forensics_api.py`. | **RESOLVED**: Both routing conventions resolve with HTTP 200. |
| **FAIL-14.1-06** | **LOW** | Resumable Protocol | Simulated disconnect reported `Server confirmed offset: 0` instead of 8388608 | Client checked `session["bytes_uploaded"]`, but gateway stored `session["accepted_offset"]`. | Updated both client and server to support both `accepted_offset` and `bytes_uploaded`. | **RESOLVED**: Client seeks to 8388608 and resumes cleanly. |
| **SEC-14.1-01** | **SECURITY** | CSV Admission Gate | `HTTP 400`: `Formula injection / DDE command detected in tabular evidence` | Malicious fixture `EVID_SEC_FORMULA_INJ_0021.csv` contained `=cmd\|' /C calc'!A0`. | Intentional security block: gateway scans tabular headers and rejects dynamic command formulas. | **VALIDATED**: Host spreadsheets protected against remote execution. |
| **SEC-14.1-02** | **BOUNDARY** | Gateway Validator | `HTTP 400`: `Total size must be greater than 0 bytes.` | Zero-byte fixture `EVID_EDGE_ZERO_BYTE_0016.bin` was submitted for session creation. | Intentional boundary validation: gateway rejects empty streams at session initiation. | **VALIDATED**: Clean error response without orphaned CAS records. |

---

## 2. Invariant & Constitutional Compliance

In accordance with Rule 12 (Stop Conditions) and Rule 16 (Final Principle):
- No architectural workaround or shortcut was substituted for proper bounded streaming.
- No mocks were used to fake upload success; all benchmarks executed against the live Uvicorn backend listening on `127.0.0.1:8000`.
- Cryptographic CAS integrity was verified for every single admitted byte stream.
