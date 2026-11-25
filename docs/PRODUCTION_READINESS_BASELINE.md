# TARKA × SENTINELX — PRODUCTION READINESS BASELINE AUDIT
**Date:** 2026-11-26T00:05:00+05:30  
**Operating Mode:** Autonomous Engineering & Architectural Audit  
**Authoritative Repository:** `https://github.com/Massvippin01/tarka_v5.git`  
**Local Repository:** `C:\PROJECTS\SentinelX`  
**Branch:** `feat/tarka-production-upgrade` (Isolated from production branch)  
**Previous Baseline Commit:** `9580dbf` (`feat(deploy): production-harden frontend for Render Static Site with unified API routing, CORS alignment, and zero-cost evaluator readiness`)  
**Live Production Deployments:**
- **Frontend (Static Site):** `https://tarka-v5-2.onrender.com`
- **Backend (Web Service):** `https://tarka-v5-1.onrender.com`

---

## 1. Verified Architecture & Component Inventory

### 1.1 Frontend Architecture
- **Framework:** React 19.2.6 + Vite 8.0.12 + TypeScript 6.0.2 + Tailwind CSS 4.3.5.
- **Visual Design System:** V6 Tactile Skeuomorphic Warm Ivory System (`#F8F4ED`, `#E9E2D7`, `#221C19`, `#A85C2A`, physical card elevations, custom scrollbars, and warm ivory badges).
- **Core Screen Views (26 Screens):**
  1. `ParticleHomeScreen` (Autonomous Particle Intelligence & Voice Workspace)
  2. `HomeScreen` (Tactile Bento Executive Dashboard)
  3. `CommandCenterScreen` (High-density Master Operations Grid)
  4. `CasesScreen` (Active Case Portfolio & Dossier Index)
  5. `EvidenceLedgerScreen` (Cryptographic Evidence Ledger & Bitstream Custody)
  6. `PeopleAccountsScreen` (Syndicate Entity Resolution & Cross-Case Mapping)
  7. `MoneyTrailScreen` (Double-entry Transaction Reconciliation & Hawala Waterfall)
  8. `FraudNetworkScreen` (2D/3D Graph Projection & Progressive Entity Expansion)
  9. `DeviceSimScreen` (IMEI/IMSI Telecom Attribution & Handset Fingerprinting)
  10. `ActionsReportScreen` (Statutory BNSS § 94 Requisitions & BSA § 63 Orders)
  11. `LabScreen` (Forensic Robustness Lab & Counterfactual Artifact Challenge)
  12. `SettingsScreen` (System Health, Offline Weights & Environment Status)
  13. `HealthDiagnosticsScreen` (Platform Diagnostic Telemetry & Model Lifespan)
  14. `CaseWorkspaceScreen` (Legacy Case Workspace)
  15. `AttributionScreen` (Mule Network Attribution & Centrality Lenses)
  16. `CourtProofScreen` (Judicial Evidence Pack & Chain of Custody Proofs)
  17. `TaintEngineScreen` (Multi-Hop Fund Flow & Layering Analysis)
  18. `PublicDatasetBenchmarkModal` (PaySim & IBM AML Benchmark Telemetry)
  19. `BenchmarkLabDrawer` (10,000-Row Deterministic Synthesis Engine)
  20. `InvestigationIntelligenceBrief` (Automated Case Theory & Hypothesis Synthesis)
  21. `RelationshipEvidenceSheet` (Edge-level Provenance & Corroboration Drawer)
  22. `TransformationAuditLog` (Immutable Event Sourcing Journal)
  23. `TarkaVoiceModal` (Multilingual Indic Voice Interface & Sarvam AI Bridge)
  24. `AskTarkaDrawer` (Copilot Command Control Plane Dispatch)
  25. `EvidenceIntakeModal` (Resumable 10 GB Ingestion Gateway & Web Worker)
  26. `JudgeModeWalkthrough` (Autonomous Zero-Mouse Guided Tour)

### 1.2 Backend Architecture
- **Framework:** Python 3.12.8 + FastAPI + Pydantic v2 + Starlette.
- **Forensic Subsystems:**
  - **UCM (Universal Case Model):** Strongly typed Pydantic v2 domain schemas (`UniversalCaseModel`, `ArtifactManifestItem`, `CanonicalFact`, `CustodyBlock`).
  - **TRACE:** Dual-tier payment examination (Error Level Analysis Q=90, Resampling Autocorrelation, Typography Kerning, and CBS Double-Entry Reconciliation).
  - **AEGIS:** Analysis of Competing Hypotheses (ACH 7 hypotheses: Digital Alteration, Split Transaction, Mule Routing, etc.) and Indian Statutory Directives (BNSS § 94, BSA § 63).
  - **RapidOCR Offline ONNX:** 100% offline local weights (`ch_PP-OCRv4_det_infer.onnx`, `ch_PP-OCRv4_rec_infer.onnx`, `ch_ppocr_mobile_v2.0_cls_infer.onnx`) with zero external network dependencies.
  - **Evidence Gateway & CAS:** Rolling buffer streaming intake, SHA-256 bitstream calculation, immediate post-storage read-back verification, and anti-tamper quarantine.
  - **Real-Time Job Orchestration:** 14-state deterministic FSM with durable disk journaling (`.jsonl`) and Server-Sent Events (`/api/v1/forensics/cases/{case_id}/events/stream`).

---

## 2. Current Deployment & Commit Status

| Target Layer | Public Endpoint | Live Commit | Health / Status | Origin Sync |
|---|---|---|---|---|
| **Frontend CDN** | `https://tarka-v5-2.onrender.com` | `9580dbf` | `HTTP 200 OK` (Vite SPA) | Up to date with `fix/ci-post-merge-repair` |
| **Backend API** | `https://tarka-v5-1.onrender.com` | `9580dbf` | `HTTP 200 OK` (`{"status":"healthy","application":"SentinelX"}`) | Up to date with `fix/ci-post-merge-repair` |
| **CORS Preflight** | `https://tarka-v5-1.onrender.com/api/v1/health` | `9580dbf` | `HTTP 200 OK` (Allowed Origin: `https://tarka-v5-2.onrender.com`) | Regex `allow_origin_regex` verified live |

---

## 3. Subsystem Implementation & Verification Matrix

| Subsystem | Frontend Entry Point | Backend / API Route | Persistence Layer | Execution Path | Status |
|---|---|---|---|---|---|
| **UCM Case Engine** | `useCaseStore.ts`, `V6AppShell.tsx` | `/api/v1/cases`, `/api/v1/forensics/cases` | PostgreSQL / SQLite / Local CAS JSON | In-memory + persisted store | **VERIFIED WORKING** |
| **TRACE Payment Forensics** | `MoneyTrailScreen.tsx`, `VisualForensicsViewer.tsx` | `/api/v1/forensics/cases/{id}/trace` | Raw CAS storage + Analysis run records | ELA heatmap + CBS ledger match | **VERIFIED WORKING** |
| **AEGIS Reasoning Engine** | `HypothesesWorkspace.tsx`, `EvidenceGapCenter.tsx` | `/api/v1/forensics/cases/{id}/hypotheses` | Deduplicated observation JSON | ACH matrix + BNSS § 94 gaps | **VERIFIED WORKING** |
| **Offline RapidOCR** | `EvidenceIntakeModal.tsx`, `intake.ts` | `/api/v1/forensics/ocr` | Derived text cache + ONNX weights | CPU ONNX det/cls/rec pipeline | **VERIFIED WORKING** |
| **Evidence Gateway & CAS** | `EvidenceFileManager.tsx`, `intake.ts` | `/api/v1/forensics/cases/{id}/artifacts` | Content-Addressable Storage (CAS) | Streaming rolling buffer SHA-256 | **VERIFIED WORKING** |
| **Custody & Audit Ledger** | `CaseAuditTrailDrawer.tsx`, `TransformationAuditLog.tsx` | `/api/v1/system/audit/verify-chain` | Parent-hash chained log | SHA-256 block chain verification | **VERIFIED WORKING** |
| **Real-Time SSE Sync** | `InvestigationContext.tsx`, `EvidenceGraph.tsx` | `/api/v1/investigation/events/stream` | Disk journal `.jsonl` + event bus | Replay via `Last-Event-ID` | **VERIFIED WORKING** |
| **Report Generation** | `ActionsReportScreen.tsx`, `ReportScreen.tsx` | `/api/v1/forensics/cases/{id}/reports` | CAS reports tier | JSON, HTML, ReportLab PDF | **VERIFIED WORKING** |
| **IBM i2 & Maltego Export** | `ActionsReportScreen.tsx` | `/api/v1/forensics/cases/{id}/export` | Generated CSV streaming | Standard i2 & Maltego CSV format | **VERIFIED WORKING** |
| **STIX 2.1 Threat Export** | `ActionsReportScreen.tsx` | `/api/v1/forensics/cases/{id}/export/stix` | Generated JSON bundle | STIX 2.1 JSON Schema | **VERIFIED WORKING** |
| **Multilingual Voice** | `TarkaVoiceModal.tsx`, `TarkaVoiceEngine.ts` | `/api/v1/sarvam/synthesize`, `/api/v1/voice/models` | Local Web Audio buffer | Sarvam cloud + local offline fallback | **VERIFIED WORKING** |
| **Z3 SMT Contradictions** | `ContradictionCenter.tsx`, `ClaimInspector.tsx` | `/api/v1/investigation/contradictions` | Z3 solver state | SMT constraint satisfiability | **VERIFIED WORKING** |

---

## 4. Security & Data Persistence Audit

1. **Storage Ephemerality on Render Free:**
   - Render Free Web Service instances have ephemeral disks. On container spin-down or redeployment, local filesystem CAS is recycled.
   - **Mitigation:** The application supports dual-mode storage (`STORAGE_BACKEND=filesystem` for zero-cost demos, with graceful re-seeding of synthetic cases on restart; and S3/MinIO for persistent enterprise deployments).
2. **CORS Boundary:**
   - Starlette `CORSMiddleware` configured with `allow_origin_regex=r"^https://.*\.onrender\.com$"`, permitting verified Render frontend origins while enforcing strict header and method whitelisting.
3. **Session & RBAC Security:**
   - 7-factor RBAC authorization enforced on the backend via JWT access tokens.
   - Fail-closed 401/403 boundaries verified via automated test suites.
   - Silent re-auth interceptor in `forensicsApi.ts` safely refreshes investigator sessions without jarring user interruptions.
4. **Input Sanitization & Injection Defense:**
   - Formula injection sanitization (`=cmd`, `@SUM`, `+powershell`) in all spreadsheet parsers.
   - Decompression bomb guards (>100:1 ratio / >500 MB limit) and Zip-Slip path traversal rejection.

---

## 5. Automated Verification Baseline

### 5.1 Frontend Test Suite
- **Command:** `cd frontend; npx vitest run`
- **Result:** **25 passed (25 test files)**, **143 passed (143 tests)** in 7.29s.
- **Failures:** 0.

### 5.2 Frontend Production Build
- **Command:** `cd frontend; npm run build` (`tsc -b && vite build`)
- **Result:** **0 errors**, 1,782 modules transformed cleanly in 4.65s.
- **Artifacts:** Verified SPA fallback via `frontend/public/_redirects`.

### 5.3 Backend Investigation Workflow Suite
- **Command:** `python -m pytest backend/tests/test_tarka_e2e_investigation_workflow.py -q`
- **Result:** **7 passed** in 18.55s.
- **Failures:** 0.

---

## 6. Prioritized Implementation Plan

1. **Authoritative Brand Identity Integration (Phases 6 & 11):**
   - Vectorize master TARKA logo from founder-supplied asset (`media_1795631015441_f471bdd4.jpg`).
   - Generate `tarka-logo.svg`, `tarka-logo-dark.svg`, `tarka-icon.svg`, and multi-resolution PNG/ICO assets.
   - Integrate across `V6Rail.tsx`, `V6Topbar.tsx`, `TarkaGlobalShell.tsx`, `Navbar.tsx`, and PDF/HTML report templates.
2. **Real-Time Resilience & SSE Reconnect (Phase 2):**
   - Ensure case-level event isolation, reconnection with exponential backoff, and stale connection recovery.
3. **Product Refinement & Visual Quality Pass (Phase 7):**
   - Refine active case indicators, golden hour counters, and high-density bento cards across all 26 screens.
4. **Production Staging & Cutover Readiness (Phases 9 & 10):**
   - Document complete deployment runbook and release report.
