# TARKA Architectural & Engineering Decisions (Workflow Sync)

## Decision Log

### D-001: Baseline Audit & Execution Order
- **Context**: Need a repeatable, zero-dependency Playwright audit script that can run on any developer machine without special global test configurations.
- **Decision**: Created `frontend/e2e/case_sync_audit.cjs` using direct `@playwright/test` chromium API alongside `frontend/e2e/case-sync.spec.ts`.
- **Status**: Verified failing baseline (45 failures on bleed, missing fingerprints, static dossier numbers, unknown case handling).

### D-002: Single Case Store & Dynamic Screen Derivation
- **Context**: Screen state was previously hardcoded to "CASE-2026-001" or leaked "Sunil Kumar" / "₹5.00L" into other cases. In-app case switcher had stale closures reverting URLs.
- **Decision**: Created `useCaseStore` syncing with URL parameters `?case=<id>&view=<route>`. Routed all case derivations through `useCaseStore.getState().activeCaseId` and `CaseSyncBridge.getInstance().getCaseBundle(caseId)`. Added `<CaseNotFoundScreen>` for unmapped case IDs.
- **Status**: 293/293 checks passing in `case_sync_audit.cjs`. All unit tests green.



### D-003: Case Lifecycle State Machine & Audit Hashing
- **Context**: Need strict case lifecycle enforcement (`DRAFT -> INTAKE -> INVESTIGATING -> ACTION_PENDING -> FROZEN / PARTIALLY_RECOVERED -> COURT_READY -> CLOSED -> ARCHIVED`), optimistic UI updates with rollback, draft deletion rules, and bidirectional case linking.
- **Decision**: Added FastAPI endpoints for PATCH, status transition, archive, restore, delete-draft, and linking with append-only SHA-256 audit events. In frontend, added `UpgradedCaseSwitcher`, `CaseStatusControl` (closure checklist modal), `CreateCaseWizard` (Zod validation), `EditCaseSheet`, and `LinkCaseModal`.
- **Status**: Verified in `test_case_lifecycle.py` and captured across 1440x900 screenshots.


### D-004: Ingest Pipeline Status, Evidence Manager & Dynamic Step Derivation
- **Context**: Ingest pipeline state was ephemeral in memory; files tab lacked per-case artifact management and soft removal; workflow step progress was previously static or uncoordinated.
- **Decision**: Added `GET /api/v1/cases/{id}/pipeline-status`, `POST /pipeline/retry`, and `DELETE /artifacts/{id}` with soft-quarantine preserving forensic Chain of Custody (CoC) and writing SHA-256 audit entries. Added `EvidenceFileManager` sub-tab in Intake with copyable SHA-256 and `ArtifactPreviewModal` for tabular/PDF/telemetry inspection. Derived investigation workflow progress (✓) dynamically via `deriveInvestigationProgress` from ingested artifacts, nodes, edges, and actions. Mounted `RequirementEmptyState` on downstream screens when required exhibits are missing.
- **Status**: Verified in `test_ingest_pipeline_flow.py`, `investigationProgress.test.ts`, and Playwright screenshots `docs/progress/f3/*.png`.

### D-005: Action Loop, Statutory Freeze Directives & Recovery Financials
- **Context**: Actions screen and recovery metrics were previously disjoined; freezing an account did not propagate recovered amounts to the global header, Money Trail, or Formal Investigation Report. Undoing an action required forensic audit compliance.
- **Decision**: Added FastAPI action management endpoints: `GET /api/v1/cases/{case_id}/actions`, `POST /freeze`, `POST /simulate-response` (Jury demo button), `PATCH /{action_id}` (requires non-empty audited reason for undo), and `POST /notices/{notice_id}/dispatch`. Created `selectCaseActionFinancials` as the pure, single-source-of-truth selector computing booked loss, recoverable pool, frozen capital, recovery percentage, and golden hour countdown across all screens. Added `CaseActionsPanel`, `GenerateFreezeOrderModal` (§106/§107 BNSS freeze directive generator), `CorrectActionModal`, and Section 6 "Statutory Actions Taken" in `ReportScreen`.
- **Status**: Verified in `test_action_loop_flow.py`, `actionSelectors.test.ts`, all 124 vitest tests, and screenshots `docs/progress/f4/*.png`.
