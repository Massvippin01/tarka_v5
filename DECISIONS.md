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

### D-006: Settings & Administration, Station Letterhead & Operational Roles
- **Context**: Need a unified Settings area (?view=settings) with zustand persist for UI preferences, backend storage for station/admin settings, an operational role switch (Investigator / Supervisor / Admin) enforcing UI permissions, station letterhead customization propagating to formal A4 reports, AI runtime health checks (Ollama ping), and demo data recovery.
- **Decision**: Added FastAPI system endpoints: `GET /api/v1/system/settings`, `PUT /api/v1/system/settings` (with append-only SHA-256 audit entry), `POST /api/v1/system/reset-demo` (restores 4 canonical benchmark cases to SQLite and UnifiedStore), and `GET /api/v1/system/health`. Created `useSettingsStore` (zustand persist) with profiles, station configuration, appearance themes (Paper light, Command dark, High contrast), density, and language (EN / हिन्दी via zero-dependency translation layer `translations.ts`). Added `SettingsScreen` with 8 operational sections. Wired station letterhead directly into `ReportScreen`, dynamic IO avatar into `TarkaGlobalShell`, and enforced supervisor permissions on case archiving and reassignment.
- **Status**: Verified in `test_system_settings_flow.py`, `useSettingsStore.test.ts`, all 129 Vitest tests, and Playwright screenshots `docs/progress/f5/*.png`.

### D-007: Command Center Dashboard, Act-Now Queue & India Syndicate Map (F-6)
- **Context**: The Multi-Case Command Hub (?view=workspace or ?view=dashboard) required truthful, live KPIs derived strictly as sums of per-case pure selectors (`selectCaseActionFinancials`), interactive filterability across KPIs and charts, an Act-Now queue for urgent golden-hour freeze directives, an interactive geographic syndicate trafficking map of India, and drill-downs into cases and screens.
- **Decision**: Created `frontend/src/selectors/dashboardSelectors.ts` with pure selectors: `selectDashboardFinancials` (guarantees dashboard sums == exact sum of per-case selector values), `selectActNowQueue` (ranks by remaining golden-hour SLA and recoverable pool), `selectIndiaMuleFlows` (maps victim origins and mule sinks across Indian states with Bezier arcs), `selectTypologyDistribution` (breakdown by cybercrime typology), and `selectTopBanksByMules` (nodal bank mule concentration). Created `IndiaSyndicateMap`, `ActNowQueueCard`, `TypologyChartCard`, and `TopBanksCard`. Upgraded `SaaSMetricBanner` to compute entirely from `selectDashboardFinancials` and support click-to-filter on each KPI tile. Mounted Command Center overview grid into `CaseWorkspaceScreen` with `viewMode` switcher (`Dashboard | Table | Board | Roadmap | Bulk Ingest`) and interactive drill-downs (map arc → Fraud Network screen, queue item → statutory action/report screen, typology bar → filtered case table).
- **Status**: Verified in `dashboardSelectors.test.ts` (4 passed), 21/21 vitest files (133 passed), `case_sync_audit.cjs` (293/293 passed), and Playwright screenshots `docs/progress/f6/*.png`.

### D-008: Activity Feed, Notification Center & Hash-Chain Audit Drawer (F-7)
- **Context**: Need a real-time notification popover in the global header alerting investigators of golden hour urgency expirations, incoming bank acknowledgements, and assignment changes with 1-click drilldowns; need a slide-over audit drawer providing forensic hash-chain verification (`GET /api/v1/system/audit/verify-chain`), humanized event strings, category filtering, payload SHA-256 hashes, and mutation diff inspection.
- **Decision**: Added `GET /api/v1/system/audit/feed` and `GET /api/v1/system/audit/verify-chain` in `system_api.py`. Enhanced `PostgresAuditRepository` with `list_all_events(limit)`. Created `auditHumanizer.ts` with pure categorization and relative time calculation. Built `NotificationCenterPopover` using Radix UI Popover Portal (preventing clipping within the 44px shell header) with unread badge counter and action handlers. Built `CaseAuditTrailDrawer` slide-over modal with cryptographic hash-chain status banner and JSON mutation diff viewer. Mounted in `TarkaGlobalShell` and `CaseWorkspaceScreen`.
- **Status**: Verified in `auditHumanizer.test.ts` (4 passed), `test_audit_feed_flow.py` (3 passed), 22/22 vitest files (137 passed), and Playwright screenshots `docs/progress/f7/*.png`.

### D-009: System Diagnostics Health Page, 404 Guard, Offline Resilience & Demo Auth Modal (F-8)
- **Context**: Hackathon evaluation requires predictable robustness: a dedicated diagnostic health page (`?view=health`) verifying all subsystems, an explicit 404 view for invalid route parameters, an unmistakable offline detection banner with manual/auto-retry, a demo user switching modal with real HMAC-SHA256 JWT tokens for 3 operational personas (Investigator, Supervisor, Admin), and a consistent backend error schema `{code, message, detail, request_id}` with `X-Request-ID` tracking.
- **Decision**: Built `HealthDiagnosticsScreen` with 6 live subsystem probes (FastAPI REST Gateway, SQLite Transactional Authority, NetworkX/UnifiedStore Projections, Ollama SLM, SSE Pipeline Streamer, SHA-256 Hash Chain), canonical benchmark fixtures integrity table, and supervisor-authorized demo reset. Built `ViewNotFoundScreen` for unknown route views. Added persistent amber offline alert banner with connection re-probe. Built `DemoUserModal` supporting 1-click persona switching and JWT token storage. Enhanced FastAPI middleware with `X-Request-ID` and structured exception handlers preserving `detail` backward-compatibility.
- **Status**: Verified in `test_robustness_flow.py` (3 passed), `healthDiagnostics.test.ts` (3 passed), all 23 vitest test files (140 passed), Appendix B audit `case_sync_audit.cjs` (293/293 passed), and Playwright screenshots `docs/progress/f8/*.png`.

### D-010: End-to-End Acceptance Testing Gates & Golden Path CI (F-9)
- **Context**: Must verify that the full end-to-end investigative flow (`Sign In → Dashboard → Ingest → Investigate → Act → Report → Close → Archive`) functions reliably with zero test failures across all 4 Playwright specifications.
- **Decision**: Built and verified 4 core Playwright end-to-end specifications:
  1. `frontend/e2e/golden-path.spec.ts`: Executes complete 10-step investigative lifecycle at standard 1366×768 presentation viewport, capturing sequential progress screenshots (`docs/progress/f9/f9_01` through `f9_10`).
  2. `frontend/e2e/management.spec.ts`: Validates case creation, step-by-step lifecycle state transitions, 409 conflict guards for illegal state jumps, draft deletion vs active case protection, and in-app switcher case searching.
  3. `frontend/e2e/settings.spec.ts`: Validates theme switching, bilingual EN/हिन्दी localization, station letterhead, and diagnostic probes.
  4. `frontend/e2e/case-sync.spec.ts` & `case_sync_audit.cjs` (Appendix B): Validates 293/293 cross-case and cross-screen isolation checks with 0 leaked names, 0 undefined, and 0 NaN.
- **Status**: All 4 Playwright specs passing cleanly. 140/140 vitest tests passing in 23 files. 13/13 backend flow pytest tests passing.

### D-011: V6 Redesign Step 0 Prep & Canonical Test Isolation
- **Context**: Previous E2E test runs had archived `CASE-2026-001` in the database, causing the UI to show read-only archived banners. Automated tests should never mutate canonical cases. Also need captured reference screenshots of `tarka-reference.html`.
- **Decision**:
  1. Created branch `ui/v6`. Restored canonical demo database via `POST /api/v1/system/reset-demo`.
  2. Isolated `frontend/e2e/golden-path.spec.ts` close and archive steps so they execute on a newly created transient test case rather than mutating `CASE-2026-001`.
  3. Created `capture_reference.cjs` and recorded full suites of 1440×900 and 1366×768 reference screenshots covering all screens and micro-interactions into `docs/redesign/reference/`.
- **Status**: Canonical cases pristine; golden path passing; reference screenshots verified.



