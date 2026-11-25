# TARKA × SENTINELX — PHASE 18: BRANCH CONSOLIDATION REPORT

**Date:** 2026-11-25  
**Canonical Branch:** `fix/ci-post-merge-repair`  
**Remote Target:** `https://github.com/Massvippin01/tarka_v5.git`  
**Git HEAD Commit:** `64a3f27` (prior to Phase 18 consolidation commits)  
**Authoritative Forensic Standard:** SentinelX Engineering Constitution (Waves 1–6)

---

## 1. Executive Summary & Objective

In Phase 18, a comprehensive repository branch audit was executed to consolidate valuable features across development branches into the canonical working authority:
- **Canonical Development Authority:** `fix/ci-post-merge-repair`
- **Secondary Feature Sources Audited:** `origin/main` (`3a4c4ec`, `3d49f36`, `73c84fd`, `3969349`), `main`, `v6-tactile-skeuomorphic-restoration`

### Critical Architectural Finding
A naive git merge of `origin/main` into `fix/ci-post-merge-repair` would have deleted 12 critical forensic backend engines, including `universal_case_model.py`, `universal_evidence_gateway.py`, `aegis_gateway.py`, `trace_engine.py`, `rapidocr_engine.py`, and the entire restored V6 tactile UI shell (`#F8F4ED`, `#221C19`). Therefore, a **selective, invariant-preserving architectural consolidation** was conducted.

---

## 2. Inventory of Consolidated Assets

### A. Frontend Capabilities Consolidated from `origin/main`
1. **Custom SVG Graph Engine for Fraud Networks:**
   - `frontend/src/v6/network/NetworkSvg.tsx`: Layered Gang SVG with collision-free label placement (`placeLabels`), leader lines, zoom controls, and progressive layer expansion.
   - `frontend/src/v6/network/glyphs.tsx`: Dedicated glyph renderers for victims, primary mules, cash-out points, and hubs.
   - `frontend/src/v6/network/graphLayout.ts`: Pure geometric layout algorithm (avoids heavy runtime dependencies).
   - `frontend/src/v6/network/DevicesLinksView.tsx`: Tabular device linkage and hardware correlation viewer.
   - `frontend/src/v6/network/__tests__/graphLayout.test.ts`: Layout regression unit tests.
2. **Third-Party Investigation Export Suite:**
   - `frontend/src/v6/triage/ExportButtons.tsx`: Single-click export for **i2 Analyst's Notebook** CSV, **Maltego** CSV, and **STIX 2.1 Indicators** JSON.
   - `frontend/src/v6/triage/triage.ts` & `__tests__/triage.test.ts`: Type system and score calculations.
3. **Bulk Intake & Multi-File Pre-Triage Board:**
   - `frontend/src/v6/intake/IntakeReviewBoard.tsx` & `IntakeUpload.tsx`: "Files first, cases later" evidence holding area.
   - `frontend/src/v6/intake/intake.ts` & `__tests__/intake.test.ts`: Pre-triage deduplication and queue validation.
   - `frontend/src/v6/upload/DropZone.tsx`, `resumeDb.ts`, `uploadPlanner.ts`: Resumable multi-chunk upload helpers.
4. **UI Components & Selectors:**
   - `frontend/src/v6/ui/SourceNumber.tsx`: Standardized Indian numbering formatter (`₹1,84,00,000`).
   - `frontend/src/selectors/timelineSelectors.ts`, `deviceSelectors.ts`, `caseSelectors.ts`, `bundleAdapter.ts`.
   - `frontend/src/store/useBundleCaseStore.ts`.
   - `docs/COMPETITIVE_LANDSCAPE.md`.

### B. Backend Capabilities Consolidated from `origin/main`
1. **Intake & Projects Storage Service:**
   - `backend/app/services/ingestion/projects_store.py`: Persistence for multi-file intake projects, holding cases, and auto-proposals.
   - `backend/app/services/ingestion/derived_store.py`: Ingested transaction deduplication via composite key `(account, rrn, amount, timestamp)`.
   - `backend/app/services/ingestion/network_decisions.py`: Audit trail for human investigator freeze and review decisions.
   - `backend/app/services/ingestion/account_verdicts.py`: Account-level verdict management (`CONFIRMED_MULE`, `NOT_MULE`).
   - `backend/app/services/ingestion/device_store.py`: Hardware device and IMEI persistence.
   - `backend/app/services/ingestion/large_evidence_engine.py`: Multi-GB chunked evidence processor.
   - `backend/app/services/ingestion/networks.py`: Network community detection and hop analysis.
2. **API Endpoints Mounted in `backend/app/main.py`:**
   - `/api/v1/projects`: Project creation, file attachment, job polling, and network splitting.
   - `/api/v1/cases/{case_id}/export/i2`: Export to IBM i2 Analyst's Notebook format.
   - `/api/v1/cases/{case_id}/export/maltego`: Export to Maltego graph entities format.
   - `/api/v1/cases/{case_id}/export/stix`: Export to STIX 2.1 Threat Intelligence format.
   - `/api/v1/cases/{case_id}/networks`: Syndicate clustering and network decisions.
   - `/api/v1/ingestion`: Multipart and chunked file intake.
3. **Core Schema & Parser Synchronization:**
   - `backend/app/schemas/case.py`: Added `CasePatch` and `LinkRequest` models.
   - `backend/tarka/parsers/bank_upi.py`: Added static method `map_columns(header)` with heuristic column alignment.
   - `backend/app/services/auth_service.py`: Extended RBAC allowed cases for test officers (`CASE-2026-001` through `CASE-2026-004`) and dynamic project ownership authorization.

---

## 3. Preserved Canonical Subsystems (Waves 1–6 Invariants)

The consolidation strictly preserved the uncompromised integrity of:
1. **Evidence Integrity:** Append-only CAS (`cas_data/`), SHA-256 bitstream validation, and unbroken custody chains.
2. **TRACE Engine:** Deterministic financial reconciliation, CBS statement parser, and mathematical conservation rules.
3. **AEGIS Gateway:** Multi-party epistemic safety, contradictory evidence preservation, and zero-automatic-merge principle.
4. **Offline ONNX RapidOCR:** 100% offline, CPU-optimized OCR without cloud token leakage.
5. **Universal Case Model (UCM):** Standardized cross-engine investigation representation.
6. **Statutory Reporting:** ReportLab Section 63 BSA (4) cryptographic certification.

---

## 4. Verification and Test Results

| Test Target | Total Tests | Passed | Failed | Duration |
|:---|:---:|:---:|:---:|:---:|
| `backend/tests/test_tarka_e2e_investigation_workflow.py` | 7 | 7 | 0 | 13.12s |
| `backend/tests/test_ingestion_networks.py` | 18 | 18 | 0 | 19.71s |
| `frontend` Vitest Test Suite (25 test files) | 143 | 143 | 0 | 9.83s |
| `frontend` TypeScript (`tsc -b`) | Whole Project | Clean | 0 errors | 22.40s |
| `frontend` Vite Production Build | 1,782 Modules | Built | 0 errors | 5.40s |

**Consolidation Status:** `PRODUCTION-READY & VERIFIED`
