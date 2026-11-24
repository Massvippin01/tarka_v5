# TARKA × SENTINELX — PHASE 14 BASELINE REPORT
## System Status, Evidence Ingestion Architecture & Initial Operational State

**Date:** 2026-11-24  
**Project:** TARKA × SentinelX — Digital Forensics & Financial Crime Investigation Platform  
**Phase:** 14 — Universal Evidence Ingestion, Real-Time Processing & Gigabyte-Scale Validation  
**Baseline Git Commit:** `b2c2ce6` (Tagged: `founder-validation-lab-completed`)  
**Branch:** `fix/ci-post-merge-repair`  
**Governing Doctrine:** AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.

---

### 1. Executive Summary

Phase 13 completed the Founder-Led Validation Lab, certifying 49/49 scenarios with zero false positives, zero false negatives, and zero forensic drift across TRACE, AEGIS, and UCM engines.

However, operational field validation revealed an immediate blocker upon attempting real investigator evidence intake:
Target case: `upi_payment_discrepancy`  
Ingestion response: `Request failed with status code 500`

The application functioned reliably with pre-seeded synthetic fixtures, but investigator-submitted raw evidence ingestion failed with an unhandled server exception. In addition, deep artifact examination on certain artifacts failed with HTTP 500, real-time SSE streaming was rejecting client connections due to authentication header constraints, and file ingestion lacked streaming, chunked, or multi-gigabyte capabilities.

Phase 14 initiates the comprehensive production upgrade: repairing the upload pipeline, implementing chunked and streaming ingestion, building an explicit background worker and authenticated SSE architecture, supporting a universal format registry, and stress-testing the platform up to multi-gigabyte scales.

---

### 2. Operational Baseline & Environment State

| Component | Status | Port / Target | Operational Verification |
|---|---|---|---|
| **Backend API (Uvicorn / FastAPI)** | ACTIVE | `http://127.0.0.1:8000` | Task `task-19673` running; `/health` returns HTTP 200 |
| **Frontend Web (Vite / React / TS)** | ACTIVE | `http://127.0.0.1:5173` | Task `task-19680` running; HTTP 200 OK |
| **Z3 SMT Solver** | VERIFIED | In-Process Python | Z3 SMT v4.13.0 linked & healthy |
| **Case Storage (CAS)** | ACTIVE | `data/cases/` | Content-addressed storage with immutable SHA-256 directories |
| **Job Persistence Directory** | ACTIVE | `data/jobs/` | JSON job definitions and `{case_id}_events.jsonl` event journals |
| **Ground Truth Scenarios** | 49 / 49 PASS | `data/validation_lab/` | Frozen runs verified with 0.0000 drift delta |

---

### 3. Target Case Baseline (`upi_payment_discrepancy`)

- **Case ID:** `upi_payment_discrepancy`
- **Case Title:** `[DEMO] UPI Payment Discrepancy`
- **Initial Pre-Seeded Synthetic Artifacts (6):**
  1. `ART-001-DB791B3C`: `bank_statement.csv` (SHA-256: `db791b3c...`)
  2. `ART-002-7474381C`: `cdr_records.csv` (SHA-256: `7474381c...`)
  3. `ART-003-9EA10F89`: `whatsapp_chat.txt` (SHA-256: `9ea10f89...`)
  4. `ART-004-BCCD4200`: `screenshot_claim.json` (SHA-256: `bccd4200...`)
  5. `ART-005-870ECEF1`: `unverified_claim.json` (SHA-256: `870ecef1...`)
  6. `ART-006-0FB4E2B0`: `payment_receipt_screenshot.png` (SHA-256: `0fb4e2b0...`)

- **Supplied Real User Evidence Files (4):**
  1. `1000270698.jpg` (57,358 bytes, SHA-256: `46af2983f6efb3c53b3a5b6f766d475e6bb4c3cac01e8c741c657df1d11cd210`): Handwritten shop note.
  2. `1000270701.jpg` (65,305 bytes, SHA-256: `d586d8e7f23fdb150a923ced78465d577572822bec8855b020063dd3fa0db09a`): Clear photograph of handwritten note.
  3. `1000270702.png` (62,300 bytes, SHA-256: `6592f125bc6f5aa3fd257bc104dea48a942e416410db845826c99e4ea34ea78e`): Conflicting transaction status infographic.
  4. `1000270703.png` (65,305 bytes, SHA-256: `359e2c3ba48791272021be2d30a34cc78201ad7da7348f1d117865b66c635ba7`): Google Pay payment screenshot.

---

### 4. Phase 14 Baseline Assessment

The existing system provides robust core deterministic reasoning (Z3, TRACE double-entry ledger reconciliation, ELA/resampling/typography image forensics, and AEGIS competing hypotheses). However, its evidence intake boundary was designed as a static demonstration loader rather than a streaming, production-grade universal evidence ingestion gateway.

Phase 14 systematically resolves these bottlenecks across 6 Acceptance Gates (A through F).
