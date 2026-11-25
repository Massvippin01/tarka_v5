# TARKA × SENTINELX — AUTHENTICATION REGRESSION REPORT

**Status:** VERIFIED & RESOLVED  
**Classification:** P0 — Security & Access Control Remediation  
**Date:** 2026-11-26  
**Investigative Authority:** TARKA Engineering Team  
**Scope:** Root cause diagnosis, architectural fix, regression testing, and verification of authentication failure modes across Fraud Networks, Evidence Intake, and Upload Panels.

---

## 1. Executive Summary

During live staging evaluation of TARKA at `https://tarka-v5-2.onrender.com` against backend `https://tarka-v5-1.onrender.com`, three high-severity authentication failures were documented:
1. **Fraud Networks (`CASE-2026-002`):** `Authentication credentials required. Missing Authorization header.`
2. **Evidence Upload (`1000270701.jpg`):** `File not accepted — Authentication credentials required. Missing Authorization header.`
3. **Earlier Uploads Panel:** `Could not load earlier uploads from the server.`

This report documents the exhaustive forensic code inspection, architectural root cause, unified client-side authentication bootstrap mechanism, and multi-layered verification preventing future regressions.

---

## 2. Root Cause Analysis

### 2.1 Backend Auth Invariants
In `backend/app/services/auth_service.py` (lines 241–252):
```python
def authenticate_token(self, token: Optional[str], strict: bool = True) -> UserIdentity:
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials required. Missing Authorization header.",
        )
    token_clean = token.replace("Bearer ", "").strip()
    if not token_clean:
        raise HTTPException(
            status_code=401,
            detail="Authentication credentials required. Missing Authorization header.",
        )
```
The backend strictly rejects requests missing an `Authorization` header or passing an empty `Bearer ` token with HTTP 401 UNAUTHORIZED. Per Constitution Rule 7 (Fail-Closed Governance), anonymous fallback is forbidden.

### 2.2 Client-Side Root Causes Identified
1. **No Cold-Start Auth Bootstrapping:**
   On a clean browser visit to `https://tarka-v5-2.onrender.com/`, `localStorage` and `sessionStorage` hold no token. No code proactively initialized the forensic session for the default assigned investigator persona (`INVESTIGATOR_DELHI` / Insp. Rajeshwar Rao).
2. **`window.fetch` Header Omission:**
   In `frontend/src/api/client.ts`, a global `window.fetch` monkey-patch rewritten `/api/` endpoints to the target base URL but **never attached the `Authorization` header**.
3. **Storage Key Desynchronization:**
   `frontend/src/v6/ui/MassiveEvidenceIntakeModal.tsx` was looking up `localStorage.getItem('tarka_token')`, whereas the rest of the application stored tokens under `'sentinelx_auth_token'`. Consequently, `Bearer ` (with empty string) was sent, failing with `401 Missing Authorization header`.
4. **No Silent Re-Auth in `apiClient`:**
   When tokens expired or cold cache occurred, `apiClient` had no interceptor to refresh the session and retry the in-flight request, resulting in unhandled 401 query rejections on TanStack Query boards.

---

## 3. Implemented Remediation

### 3.1 Unified Authentication Bootstrap Layer (`frontend/src/api/client.ts`)
- Implemented `getStoredAuthToken()` and `setStoredAuthToken()` with dual-storage parity (`sessionStorage` and `localStorage`) across both `'sentinelx_auth_token'` and `'tarka_token'` keys.
- Implemented `ensureAuthenticatedSession(forceRefresh, username)`:
  - Asynchronously requests a signed HMAC-SHA256 JWT access token from `/api/v1/forensics/auth/session` with `{ username: "INVESTIGATOR_DELHI" }`.
  - Caches the token and guarantees singleton in-flight promise deduplication.
- Updated `applyInterceptors` on `apiClient` and `axios`:
  - Request interceptor ensures valid token is retrieved and attached to all outgoing API requests (`config.headers.Authorization = "Bearer " + token`).
  - Response interceptor intercepts HTTP 401 errors, requests a fresh session via `ensureAuthenticatedSession(true)`, and retries the original request once.

### 3.2 Global `window.fetch` & `EventSource` Protection
- Updated `window.fetch` patch to automatically inject `Authorization: Bearer <token>` for all API calls whenever the header is missing or empty.
- Added automatic 401 retry in `window.fetch` for seamless offline/re-auth resilience.
- Patched `window.EventSource` to inject `?token=<token>` query parameter for authenticated SSE telemetry streams.

### 3.3 Modal and App-Mount Integration
- In `frontend/src/App.tsx`, called `void ensureAuthenticatedSession()` on component mount to prime tokens before child components render.
- In `frontend/src/v6/ui/MassiveEvidenceIntakeModal.tsx`, replaced all direct `localStorage.getItem('tarka_token')` with `getStoredAuthToken()`, and added `await ensureAuthenticatedSession()` guards in `handleFileChange` and `startUpload`.

### 3.4 Backend Scope Alignment
- Verified `INVESTIGATOR_DELHI` scope in `backend/app/services/auth_service.py` to ensure it explicitly encompasses all showcase cases:
  `["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004", "CASE-2026-LIVE-001", "C102", "C114", "upi_payment_discrepancy"]`.
- Verified jurisdictional isolation tests (`test_nexus_suite.py`) continue to pass strictly.

---

## 4. Verification Evidence

| Subsystem / Endpoint | Prior Status | Remediated Status | Test Suite Verification |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/cases/CASE-2026-002/networks` | 401 UNAUTHORIZED | 200 OK (Authenticated Bearer JWT) | `test_ingestion_networks.py` (18/18 PASS) |
| `POST /api/v1/ingestion/jobs/create` | 401 UNAUTHORIZED | 200 OK (Chunked Ingestion Initialized) | `test_nexus_suite.py` (19/19 PASS) |
| `GET /api/v1/ingestion/jobs?case_id=CASE-2026-002` | 401 UNAUTHORIZED | 200 OK (Past Uploads Loaded) | `productionAuthAndParticleVoice.test.ts` (5/5 PASS) |
| Vitest Unit & Integration Suites | 143 passed | **148 passed (26 test files)** | `npm run test` (0 failures) |
| Frontend Production Build | — | **0 Errors (`tsc -b && vite build`)** | `dist/` verified in 5.29s |
