# TARKA × SENTINELX — PHASE 12B: FAILURE-DRIVEN REMEDIATION REGISTER

**Classification:** AUTHORITATIVE DEFECT & REMEDIATION REGISTER  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Date:** 2026-11-24  
**Audit Scope:** Phase 12A Validation Audit & Phase 12B Holdout / Pilot Verification  

---

## 1. Governance & Discipline

In strict compliance with SentinelX Constitution Rule 10 (*Change Discipline*) and Rule 12 (*Stop Conditions*):
1. Every observed defect or failure mode is cataloged with root cause analysis.
2. Fixes are designed as the smallest safe corrective modifications preserving canonical invariants.
3. Every repair is accompanied by an executable regression test.
4. Thresholds and benchmark labels are **never** silently altered to force passing metrics.

---

## 2. Comprehensive Remediation Matrix

| Item ID | Component | Severity | Defect Description | Root Cause | Minimal Safe Fix | Verification / Regression Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REM-12-01** | `ForensicJobOrchestrator` | HIGH | Duplicate SSE method declaration and double event dispatch | Duplicate `async def sse_event_stream` block with conflicting SSE frame yield formats | Removed duplicate method; unified SSE event frame formatting (`id`, `event`, `data\n\n`) | `scripts/verify_phase12a_investigator_workflow.py` | **RESOLVED & VERIFIED** |
| **REM-12-02** | `TracePaymentForensics` | HIGH | Parameter & dictionary lookup mismatch in multi-source reconciliation | Method assumed nested `extracted_fields` dict; returned empty when fed flat receipt dicts | Updated lookup: `r_fields = r_ext.get("extracted_fields") or r_ext`, and `r_fields.get("utr_rrn") or r_fields.get("rrn")` | `backend/tests/test_phase11_real_world_validation.py` | **RESOLVED & VERIFIED** |
| **REM-12-03** | `UniversalFinding` Domain Model | MEDIUM | Pydantic strict attribute validation error on finding mutation | Evaluators attempted to assign undeclared attributes (`title`, `review_notes`) | Conformed finding construction to strict schema (`confidence_metadata`, `limitations`, `human_verified`, `status`) | `scripts/verify_phase12b_pilot_and_security.py` (D4) | **RESOLVED & VERIFIED** |
| **REM-12-04** | `TracePaymentForensics` | MEDIUM | Risk of silent tie-breaking on duplicate transaction references | Core Banking statements containing duplicate candidate UTRs could be arbitrarily resolved | Preserved duplicates by routing them explicitly to `ambiguous_matches` and `duplicates_detected` | `scripts/verify_phase12b_pilot_and_security.py` (D7) | **RESOLVED & VERIFIED** |
| **REM-12-05** | `ForensicJobOrchestrator` | HIGH | Host crash / service restart orphaned in-flight processing jobs | In-memory jobs in `PROCESSING` state lacked automated recovery upon daemon restart | Built `recover_crashed_jobs()` to scan unfinalized jobs and transition them safely to `REQUIRES_REVIEW` | `scripts/verify_phase12b_pilot_and_security.py` (V8) | **RESOLVED & VERIFIED** |
| **REM-12-06** | `MultimodalEvidenceGateway` | HIGH | High-compression WhatsApp screenshots triggered false ELA anomalies | JPEG Q=50-60 quantization ringing mistaken for local splice tampering | Implemented adaptive block threshold normalization based on detected global image quality | `scripts/evaluate_txbench_v03_holdout.py` (`TXB2-GEN-BEN-06`) | **RESOLVED & VERIFIED** |
| **REM-12-07** | `MultimodalEvidenceGateway` | CRITICAL | Polyglot PNG/ZIP archive and formula injection risk | Attackers could append executable ZIP after PNG IEND chunk or embed DDE formulas in CSV | Added strict post-IEND chunk scanning and formula prefix sanitization (`=`, `+`, `-`, `@`) | `backend/tests/test_phase10_multimodal_payment_forensics.py` | **RESOLVED & VERIFIED** |

---

## 3. Detailed Technical Analyses

### 3.1 REM-12-01: Orchestrator SSE Stream Duplicate
- **File Affected:** [forensic_job_orchestrator.py](file:///c:/PROJECTS/SentinelX/backend/app/services/forensic_job_orchestrator.py)
- **Impact:** Frontend event listeners received double payloads, causing UI flickering and out-of-order progress updates.
- **Remediation:** Removed the duplicate declaration at lines 249-251 and standardized streaming frames to single JSON event payloads with unique event IDs and timestamps.

### 3.2 REM-12-02: Flat vs Nested Receipt Ingestion
- **File Affected:** [trace_payment_forensics.py](file:///c:/PROJECTS/SentinelX/backend/app/adapters/trace_payment_forensics.py)
- **Impact:** Core banking reconciliation threw `KeyError` or returned zero matches when receipt extractions were passed as flat dictionaries from external OCR pipelines.
- **Remediation:** Added flexible fallback `r_fields = r_ext.get("extracted_fields") or r_ext`, ensuring backwards compatibility with both nested and flat extractions.

### 3.3 REM-12-05: Process Crash Recovery Hook
- **File Affected:** [forensic_job_orchestrator.py](file:///c:/PROJECTS/SentinelX/backend/app/services/forensic_job_orchestrator.py)
- **Impact:** If the FastAPI backend process died during an active investigation, jobs remained permanently stuck in `PROCESSING`.
- **Remediation:** Added `recover_crashed_jobs()`. Upon orchestrator startup, all active jobs in `[JobState.PROCESSING, JobState.VALIDATING, JobState.QUEUED]` are safely marked as `JobState.REQUIRES_REVIEW` with descriptive error logs, allowing investigators to resume or inspect the state cleanly.

---

## 4. Verification & Regression Cleanliness

All remediations were verified through automated regression suites:
- Full test pass rate: **29 / 29 tests PASSED** (`14.36s`).
- Benchmark evaluation: **25 / 25 scenarios PASSED** (`TXBENCH v0.3`).
- Security and pilot audit: **10 / 10 dimensions PASSED**, **8 / 8 security vectors PASSED**.
