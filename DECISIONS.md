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


