# TARKA Workflow & Case-Sync Execution Progress

## Execution Summary

| Step | Status | Tests | Key Deliverables & Notes |
|---|---|---|---|
| **Step 0: Baseline** | **COMPLETED** | Vitest: 119/119, Pytest: 1206/1206, Baseline Audit: 45 failing baseline checks | Clean branch `flow/workflow-sync`, Appendix B audit runner created, failing baseline established. |
| **F-1: One Case Store & Sync Engine** | **COMPLETED** | Vitest: 119/119, Pytest: 1195/1195 (5 skipped), Audit: 293/293 (100% Pass) | Single zustand store `useCaseStore.ts`, `@tanstack/react-query`, zero data bleed across all cases and screens, dynamic claims/statutory directives/replay/entities, `data-case-id` fingerprints, Case Not Found screen, Ctrl+Shift+D dev overlay. |
| **F-2: Case Lifecycle & Management** | PENDING | Pending | Target: Backend lifecycle endpoints + audit, Cases table, Create Wizard (zod), Edit sheet, Status control. |
| **F-3: Ingest → Process → Investigate** | PENDING | Pending | Target: Per-case evidence manager, SSE progress, data-derived progress, empty states, "What changed" summary. |
| **F-4: Action Loop** | PENDING | Pending | Target: Per-account freeze tracking, statutory notices, Actions screen, "Simulate bank response", numbers propagate everywhere. |
| **F-5: Settings & Administration** | PENDING | Pending | Target: Settings screen, roles, station & letterhead, language/theme, local AI model status, demo reset. |
| **F-6: Dashboard / Command Center** | PENDING | Pending | Target: Unified sum KPIs over cases, India flow map, "Act now" queue, live queries. |
| **F-7: Activity, Notifications & Audit** | PENDING | Pending | Target: Global & case activity feed, notification center, tamper-evident audit trail view. |
| **F-8: Hackathon-Grade Robustness** | PENDING | Pending | Target: Skeletons/empty/error states, zod form validation, demo auth JWT, health page, 404 page. |
| **F-9: End-to-End Acceptance** | PENDING | Pending | Target: Golden path, Case-sync, Management, Settings E2E all green; DEMO_FLOW.md. |

## Exact Commands
- **Frontend Typecheck**: `cd frontend && npx tsc -b`
- **Frontend Unit Tests**: `cd frontend && npx vitest run`
- **Backend Tests**: `$env:ENABLE_DEMO_AUTH="false"; backend\.venv312\Scripts\python.exe -m pytest backend/tests -q --ignore=backend/tests/test_sarvam_live_smoke.py`
- **Case-Sync Audit**: `node frontend/e2e/case_sync_audit.cjs`
- **Full E2E Specs**: `npx playwright test`

