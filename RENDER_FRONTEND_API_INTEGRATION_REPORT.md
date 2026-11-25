# TARKA × SENTINELX — RENDER FRONTEND API INTEGRATION REPORT
**Live Backend URL:** `https://tarka-v5-1.onrender.com`  
**Frontend Deployment Mode:** Render Static Site (Decoupled SPA)  
**Investigation Platform:** TARKA v9.5 Forensic Intelligence Architecture  
**Protocol Compatibility:** REST JSON APIs + Server-Sent Events (SSE) Streaming  

---

## 1. Executive Summary

In a decoupled production deployment where the static frontend is served from Render CDN (`https://<static-site>.onrender.com`) and the backend API is hosted on Render Free Web Service (`https://tarka-v5-1.onrender.com`), client-side networking requires strict origin awareness and fail-safe URL resolution.

During Phase A inspection, 18 frontend components were discovered to contain hardcoded references to `http://localhost:8000`, along with raw `fetch('/api/...')` calls that would fail on static hosting due to the lack of an inline reverse proxy.

This engineering pass eliminated all hardcoded localhost URLs across every component and established a resilient, unified networking layer in `frontend/src/api/client.ts` and `frontend/src/api/forensicsApi.ts`.

---

## 2. API Hardening & URL Resolution Architecture

### 2.1 Unified API Base URL Resolver
`frontend/src/api/client.ts` now provides standard URL resolution primitives:
- `getApiBaseUrl()`: Reads `import.meta.env.VITE_API_URL` and normalizes trailing slashes. In production, evaluates to `https://tarka-v5-1.onrender.com`. In local dev without the env var, returns `""` to allow Vite's proxy to handle `/api`.
- `apiUrl(pathOrUrl: string)`: Transparently maps relative paths (`/api/v1/...`) and legacy localhost strings (`http://localhost:8000/...`, `http://127.0.0.1:8000/...`) into the target backend URL.
- `createEventSource(pathOrUrl: string)`: Instantiates standard browser `EventSource` connections pointed directly at the live backend.

### 2.2 Global Request Interceptors & Window Patches
To guarantee absolute reliability across third-party libraries and deeply nested components, a three-tier network interceptor was installed:

1. **Axios Request Interceptor:**
   Configured on both `apiClient` and the root `axios` instance. Any outgoing request containing `http://localhost:8000` or `http://127.0.0.1:8000` is automatically rewritten to `VITE_API_URL`. In addition, valid `Bearer` tokens from session storage are injected automatically.

2. **Window `fetch` Interceptor:**
   Patches `window.fetch` to intercept any relative `/api/...` or legacy localhost calls and route them directly to `VITE_API_URL`.

3. **Window `EventSource` Interceptor:**
   Wraps the global `EventSource` constructor to resolve relative and localhost SSE stream URLs to the live backend.

---

## 3. Remediated Components Audit

All 18 components with hardcoded localhost URLs were updated to use `apiUrl(...)` and `createEventSource(...)`:

| # | Component Path | Method & Route | Remediated Call |
|---|---|---|---|
| 1 | `src/components/AICopilotDrawer.tsx` | POST `/api/v1/investigation/copilot` | `apiUrl("/api/v1/investigation/copilot")` |
| 2 | `src/components/AICopilotDrawer.tsx` | POST `/api/v1/investigation/verify-claim` | `apiUrl("/api/v1/investigation/verify-claim")` |
| 3 | `src/components/AnalyticalContextPanel.tsx` | GET `/api/v1/investigation/analytics/signals/{caseId}` | `apiUrl(...)` |
| 4 | `src/components/EntityDossier.tsx` | GET `/api/v1/investigation/dossier/{entityId}` | `apiUrl(...)` |
| 5 | `src/components/EvidenceGapPanel.tsx` | GET `/api/v1/investigation/evidence-gaps/{caseId}` | `apiUrl(...)` |
| 6 | `src/components/EvidenceGapPanel.tsx` | GET `/api/v1/investigation/hypotheses/{caseId}` | `apiUrl(...)` |
| 7 | `src/components/GlobalCommandSearch.tsx` | GET `/api/v1/investigation/search/federated` | `apiUrl(...)` |
| 8 | `src/components/RelationshipInspector.tsx` | GET `/api/v1/investigation/relationship-inspector/{id}` | `apiUrl(...)` |
| 9 | `src/components/ResolutionExplanationModal.tsx` | GET `/api/v1/resolution/matches/{entityId}` | `apiUrl(...)` |
| 10 | `src/components/ResolutionExplanationModal.tsx` | POST `/api/v1/investigation/verify-claim` | `apiUrl(...)` |
| 11 | `src/components/investigation/ClaimInspector.tsx` | GET `/api/v1/investigations/{caseId}/state` | `apiUrl(...)` |
| 12 | `src/components/investigation/ContradictionCenter.tsx` | GET `/api/v1/investigations/{caseId}/contradictions` | `apiUrl(...)` |
| 13 | `src/components/investigation/EvidenceGapCenter.tsx` | GET `/api/v1/investigations/{caseId}/gaps` | `apiUrl(...)` |
| 14 | `src/components/investigation/EvidenceGraph.tsx` | GET `/api/v1/graph-projection/{caseId}/snapshot` | `apiUrl(...)` |
| 15 | `src/components/investigation/EvidenceGraph.tsx` | SSE `/api/v1/investigation/events/stream` | `createEventSource(...)` |
| 16 | `src/components/investigation/EvidenceGraph.tsx` | GET `/api/v1/graph-projection/{caseId}/path` | `apiUrl(...)` |
| 17 | `src/components/investigation/EvidenceGraph.tsx` | GET `/api/v1/graph-projection/{caseId}/compare` | `apiUrl(...)` |
| 18 | `src/components/investigation/EvidenceGraph.tsx` | GET `/api/v1/graph-projection/{caseId}/evidence-thread/...` | `apiUrl(...)` |
| 19 | `src/components/investigation/EvidenceImpactPanel.tsx` | GET `/api/v1/investigations/{caseId}/state` | `apiUrl(...)` |
| 20 | `src/components/investigation/InvestigationDelta.tsx` | GET `/api/v1/investigations/{caseId}/delta` | `apiUrl(...)` |
| 21 | `src/components/investigation/InvestigationStatePanel.tsx` | GET `/api/v1/investigations/{caseId}/state` | `apiUrl(...)` |
| 22 | `src/components/investigation/InvestigationStatePanel.tsx` | POST `/api/v1/memory/snapshot` | `apiUrl(...)` |
| 23 | `src/components/investigation/InvestigationStatePanel.tsx` | POST `/api/v1/memory/rehydrate` | `apiUrl(...)` |
| 24 | `src/components/investigation/InvestigationTimeline.tsx` | GET `/api/v1/investigations/{caseId}/timeline` | `apiUrl(...)` |
| 25 | `src/components/investigation/LiveProofDrawer.tsx` | GET `/api/v1/proof/{claimId}` | `apiUrl(...)` |
| 26 | `src/components/investigation/SentinelRunnerOverlay.tsx` | POST `/api/v1/interaction/runner/step` | `apiUrl(...)` |
| 27 | `src/components/investigation/SentinelRunnerOverlay.tsx` | POST `/api/v1/interaction/runner/skip` | `apiUrl(...)` |
| 28 | `src/components/investigation/SentinelRunnerOverlay.tsx` | POST `/api/v1/interaction/runner/pause` | `apiUrl(...)` |
| 29 | `src/components/investigation/SentinelRunnerOverlay.tsx` | POST `/api/v1/interaction/runner/resume` | `apiUrl(...)` |
| 30 | `src/components/investigation/SentinelRunnerOverlay.tsx` | POST `/api/v1/interaction/runner/cancel` | `apiUrl(...)` |
| 31 | `src/context/InvestigationContext.tsx` | SSE `/api/v1/investigation/events/stream` | `createEventSource(...)` |
| 32 | `src/api/forensicsApi.ts` | Base `/api/v1/forensics` | Prefixed with `VITE_API_URL` |

---

## 4. Backend Cross-Origin Resource Sharing (CORS) Alignment

### 4.1 Diagnosis of Starlette CORS Preflight Rejection
Testing CORS preflight against `https://tarka-v5-1.onrender.com/api/v1/health` with `Origin: https://tarka-frontend.onrender.com` returned `HTTP 400 Disallowed CORS origin`.

**Root Cause:**
In Starlette / FastAPI `CORSMiddleware`, `allow_origins` accepts literal string matches. Specifying `https://*.onrender.com` in `allow_origins` does NOT perform wildcard subdomain matching; Starlette requires either an explicit origin or the `allow_origin_regex` argument.

### 4.2 Backend Remediation
In `backend/app/main.py`, `CORSMiddleware` was updated:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^https://.*\.onrender\.com$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)
```
This guarantees that any static site or preview deployment hosted on `*.onrender.com` is automatically permitted for cross-origin requests and preflight options.

---

## 5. Free-Tier Cold Start Resilience

### 5.1 Render Free Behavior
Render Free web services spin down to zero after 15 minutes of inactivity. When the evaluator first accesses the site, the backend takes between 30 and 50 seconds to complete cold boot.

### 5.2 Frontend Cold Start Handling
1. **Extended Timeout:** `client.ts` sets an explicit 35,000ms timeout on API calls.
2. **Cold-Start Interceptor Warning:** When a request experiences network latency or timeout, `client.ts` logs a clear diagnostic message indicating the Render Free tier cold start window.
3. **Optimistic Local Projections:** For critical UI widgets (Dossier, Timeline, Graph Snapshot, Claim State), the application gracefully falls back to local state projections if the backend is initializing, preserving UI usability without blank screens or unhandled exceptions.
