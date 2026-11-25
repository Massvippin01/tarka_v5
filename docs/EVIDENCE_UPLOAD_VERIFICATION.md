# TARKA × SENTINELX — EVIDENCE UPLOAD VERIFICATION

**Status:** VERIFIED & HARDENED  
**Date:** 2026-11-26  
**Scope:** Massive Evidence Ingestion, Bounded Chunk Streaming, Resource Admission Control, and Chain of Custody Sealing.

---

## 1. Executive Summary

This verification report covers the end-to-end evidence ingestion pipeline in TARKA × SENTINELX, specifically verifying the remediation of the upload failure on `1000270701.jpg` (`File not accepted — Authentication credentials required. Missing Authorization header.`) and ensuring compliance with the 10-stage statutory evidence admission pipeline under Bharatiya Sakshya Adhiniyam (BSA) § 63.

---

## 2. Evidence Ingestion Architecture

```
[ Forensic File Input ]
          │
          ▼
[ Resource Admission Evaluation ] ─── Reject if Unsafe (> 2GB free disk check, zip bomb / malformed)
          │ PASS
          ▼
[ POST /api/v1/ingestion/jobs/create ] ── (Authenticated with Bearer JWT)
          │
          ▼
[ Bounded Chunk Streaming: 64 KB / 8 MB ] ─── (PUT /api/v1/ingestion/jobs/{id}/chunk?offset=N)
          │
          ▼
[ Disk-Backed Staging Buffer ]
          │
          ▼
[ 10-Stage Statutory Ingestion Engine ]
  1. JOB_CREATED
  2. UPLOAD_COMPLETED
  3. FILE_VALIDATED (Magic byte & signature validation)
  4. HASH_CALCULATED (Bitstream SHA-256 seal)
  5. EVIDENCE_ADMITTED (Chain of custody logged)
  6. CONTENT_EXTRACTED (OCR / CSV parsing)
  7. CONTENT_INDEXED (Vector & entity linking)
  8. ANALYTICAL_PROCESSING_COMPLETED (Reconciliation)
  9. RESULTS_VALIDATED (SMT verified)
  10. EVIDENCE_AVAILABLE
```

---

## 3. Upload Failure Remediation

### 3.1 Prior Failure Mode
When an officer dropped or selected an evidence file (e.g., `1000270701.jpg`) into `MassiveEvidenceIntakeModal.tsx`:
1. `handleFileChange` invoked `/api/v1/ingestion/estimate-resources` with `Authorization: Bearer ${localStorage.getItem('tarka_token') || ''}`.
2. `startUpload` invoked `/api/v1/ingestion/jobs/create` with the same key.
3. Because the active authentication token was stored under `'sentinelx_auth_token'`, `tarka_token` evaluated to empty string.
4. The request header evaluated to `Authorization: Bearer `, which the backend rejected with:
   `401 UNAUTHORIZED: {"detail": "Authentication credentials required. Missing Authorization header."}`
5. The UI displayed: `File not accepted — Authentication credentials required. Missing Authorization header.`

### 3.2 Applied Fix
1. Synchronized all storage operations across both `sentinelx_auth_token` and `tarka_token`.
2. Replaced `localStorage.getItem('tarka_token')` with `getStoredAuthToken()`.
3. Added proactive `await ensureAuthenticatedSession()` in `handleFileChange` and `startUpload`.
4. Attached automatic Bearer JWT injection in the global `window.fetch` patch.

---

## 4. Verification Test Results

- **Unit Test Coverage:** `frontend/src/v6/__tests__/productionAuthAndParticleVoice.test.ts`
  - Validates token storage synchronization, auto-bootstrapping, and header injection.
- **Backend Test Coverage:** `backend/tests/test_ingestion_networks.py` (18/18 PASS)
  - Validates job creation, chunk uploading, duplicate detection, and network proposal generation.
- **E2E Workflow Coverage:** `backend/tests/test_tarka_e2e_investigation_workflow.py` (7/7 PASS)
  - Validates multi-file intake, SHA-256 hashing, and statutory Section 63 BSA report generation.
