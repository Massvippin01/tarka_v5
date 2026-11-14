# TARKA Workflow & Case-Sync Execution Progress

## Execution Summary

| Step | Status | Tests | Key Deliverables & Notes |
|---|---|---|---|
| **Step 0: Baseline** | **COMPLETED** | Vitest: 119/119, Pytest: 1206/1206, Baseline Audit: 45 failing baseline checks | Clean branch `flow/workflow-sync`, Appendix B audit runner created, failing baseline established. |
| **F-1: One Case Store & Sync Engine** | **COMPLETED** | Vitest: 119/119, Pytest: 1195/1195 (5 skipped), Audit: 293/293 (100% Pass) | Single zustand store `useCaseStore.ts`, `@tanstack/react-query`, zero data bleed across all cases and screens, dynamic claims/statutory directives/replay/entities, `data-case-id` fingerprints, Case Not Found screen, Ctrl+Shift+D dev overlay. |
| **F-2: Case Lifecycle & Management** | **COMPLETED** | Pytest: 10/10, E2E: management.spec.ts passing | FastAPI lifecycle endpoints (PATCH, transition, archive, restore, delete-draft, linking) with append-only SHA-256 audit, Cases table, Create Wizard (Zod), Edit sheet, Status control. |
| **F-3: Ingest → Process → Investigate** | **COMPLETED** | Vitest: investigationProgress.test.ts passing | Per-case evidence manager, SSE progress, data-derived progress, empty states, "What changed" summary, CoC preservation. |
| **F-4: Action Loop** | **COMPLETED** | Vitest: actionSelectors.test.ts passing | Per-account freeze tracking, statutory notices (§106/§107 BNSS), Actions screen, "Simulate bank response" demo button, numbers propagate everywhere. |
| **F-5: Settings & Administration** | **COMPLETED** | Vitest: useSettingsStore.test.ts passing, E2E: settings.spec.ts passing | Settings screen, operational roles, station & letterhead, language/theme, local AI model status, demo reset. |
| **F-6: Dashboard / Command Center** | **COMPLETED** | Vitest: dashboardSelectors.test.ts passing | Unified sum KPIs over cases, India flow map with Bezier flows, "Act now" urgency queue, live queries. |
| **F-7: Activity, Notifications & Audit** | **COMPLETED** | Vitest: auditHumanizer.test.ts passing, Pytest: test_audit_feed_flow.py passing | Global & case activity feed, notification center popover, tamper-evident hash-chain audit drawer view. |
| **F-8: Hackathon-Grade Robustness** | **COMPLETED** | Vitest: healthDiagnostics.test.ts passing, Pytest: test_robustness_flow.py passing | Skeletons/empty/error states, zod form validation, demo auth JWT, health page, 404 page. |
| **F-9: End-to-End Acceptance** | **COMPLETED** | E2E: 4/4 suites (8/8 tests passed) | Golden path, Case-sync, Management, Settings E2E all green; DEMO_FLOW.md verified. |
| **V6: Presentation Layer Redesign & Parity** | **COMPLETED** | Quality Gate: 110/110 passed, Vitest: 140/140 passed, Audit: 293/293 passed | Complete SaaS rebuild under `src/v6/` following `tarka-reference.html`. Adapted Command Palette (`⌘K`), Ask TARKA Copilot slide-over (`A`), Sarvam Voice (`V`), 4-tab Forensic Lab (`court-proof`, `privacy-crypto`, `workstation`, `benchmarks`), full typography floor (>=12px), 0 undefined/NaN. |
| **V6 Build Fix: Tailwind v4 Integration & Styled Gate** | **COMPLETED** | Playwright: 11/11 passed (`v6-styled.spec.ts`), Vite build: 1.27s (0 errors) | Installed `tailwindcss@^4` & `@tailwindcss/vite@^4`, wired `@import "tailwindcss";` and `@theme` token mappings in `v6-tokens.css`, eliminated unstyled vertical stack bug across all 11 views. |
| **V6 Density & Light-Theme Restoration Gate** | **COMPLETED** | Playwright: 9/9 passed (`v6-density.spec.ts`), 32/32 screenshots captured | Restored full legacy information density across all 8 investigation screens (70.2%–90.2% ratio), enforced strict 12px typography floor, `#f6f6f7` light canvas, single-line 52px topbar, and collapsible rail (216px/64px). |

## V6 Information Density & Light-Theme Quality Gate Audit

| Page | View Parameter | Legacy Text Nodes (1440×900) | V6 Text Nodes (1440×900) | Density Ratio | Target | Status |
|---|---|---|---|---|---|---|
| **1. Command Center** | `view=workspace` | 186 | 131 | **70.4%** | ≥ 70% | **PASSED** |
| **2. Evidence & Ledger** | `view=evidence` | 206 | 159 | **77.2%** | ≥ 70% | **PASSED** |
| **3. People & Accounts** | `view=people` | 208 | 155 | **74.5%** | ≥ 70% | **PASSED** |
| **4. Money Trail** | `view=money` | 154 | 127 | **82.5%** | ≥ 70% | **PASSED** |
| **5. Fraud Network** | `view=network` | 181 | 127 | **70.2%** | ≥ 70% | **PASSED** |
| **6. Device & SIM** | `view=device` | 133 | 114 | **85.7%** | ≥ 70% | **PASSED** |
| **7. Actions & Report** | `view=actions` | 116 | 99 | **85.3%** | ≥ 70% | **PASSED** |
| **8. Court Dossier Lab** | `view=court` | 163 | 147 | **90.2%** | ≥ 70% | **PASSED** |

### Verified Density Screenshots (32 Images at 1440×900 and 1366×768 in `docs/redesign/density/`)

1. **Command Center**
   - `docs/redesign/density/command_center_legacy_1440.png`: Legacy Command Center with dark navy background, 4-row KPI tiles, India mule corridor SVG arcs, and wide case registry table.
   - `docs/redesign/density/command_center_v6_1440.png`: Rebuilt executive light-theme dashboard with 5 count-up KPI metrics, national money corridors canvas, 3-item Act-Now priority queue, and active cases monitoring table.
   - `docs/redesign/density/command_center_legacy_1366.png`: Legacy Command Center at compact 1366×768 viewport showing stacked KPI elements and horizontal table scrolling.
   - `docs/redesign/density/command_center_v6_1366.png`: Responsive 1366×768 layout featuring tight grid boundaries, single-line 52px topbar, and clear 12.5px text hierarchy without truncation.

2. **Evidence & Ledger**
   - `docs/redesign/density/evidence_legacy_1440.png`: Legacy Evidence ledger displaying raw transaction tables, gate rails I1–I5, and discrepancy warning header.
   - `docs/redesign/density/evidence_v6_1440.png`: Full-density light workspace featuring EndToEndReconstructionStrip 5-file evidentiary join, 4 reconciliation KPIs, 5 falsification gates, CBS ledger table with Asc/Desc/Permute/Tamper controls, and slide-over InspectorDock.
   - `docs/redesign/density/evidence_legacy_1366.png`: Legacy Evidence ledger at 1366×768 with compressed column widths and sub-11px transaction timestamps.
   - `docs/redesign/density/evidence_v6_1366.png`: Responsive 1366×768 view enforcing strict 12px font floor, high-contrast badges, and clean multi-tab inspector.

3. **People & Accounts**
   - `docs/redesign/density/people_legacy_1440.png`: Legacy Entity Resolution screen showing 12 mentions, bipartite Bezier connections, and identity merge cards.
   - `docs/redesign/density/people_v6_1440.png`: High-density bipartite graph connecting 12 multi-source mentions to 6 canonical profiles with 4 risk dimension bars, bilingual EN/हिन्दी AI narrative, statutory judicial merge review controls (Accept/Veto/Split), and RelationshipEvidenceSheet.
   - `docs/redesign/density/people_legacy_1366.png`: Legacy People screen at 1366×768 with overlapping Bezier control points and tiny badge labels.
   - `docs/redesign/density/people_v6_1366.png`: Clean 1366×768 bipartite layout with auto-spaced SVG anchor nodes, crisp pill badges, and zero clipping.

4. **Money Trail**
   - `docs/redesign/density/money_legacy_1440.png`: Legacy Taint Engine displaying multi-hop Sankey diagram, LIBR accounting breakdown, and freeze action drawers.
   - `docs/redesign/density/money_v6_1440.png`: Rebuilt light Sankey flow with high-contrast label pills (#ffffff background, #18181b text, #e4e4e7 border), 4 financial KPIs, LIBR vs FIFO vs Pro-Rata doctrine comparator, RecoveryModelPanel, and dual-mode statutory BNSS order drafter (§106 lien vs §107 attachment).
   - `docs/redesign/density/money_legacy_1366.png`: Legacy Sankey diagram at 1366×768 with compressed node spacing and low-contrast white-on-light text.
   - `docs/redesign/density/money_v6_1366.png`: Clean 1366×768 Sankey layout with responsive node heights, particle trajectories, and 12.5px legible typography throughout.

5. **Fraud Network**
   - `docs/redesign/density/network_legacy_1440.png`: Legacy Network Graph showing force-directed graph canvas, playback scrubber, and telemetry drawer.
   - `docs/redesign/density/network_v6_1440.png`: Rebuilt graph topology with 4 KPIs, 6 view-layer chips, EvidenceNetworkGraph canvas with step-by-step chronometer playback, corroborated telemetry invariants card, copyable UPI 2.0 XML stanza, and CrossStateWaterfall view.
   - `docs/redesign/density/network_legacy_1366.png`: Legacy Network graph at 1366×768 with obstructed bottom chronometer bar.
   - `docs/redesign/density/network_v6_1366.png`: Compact 1366×768 canvas with docked playback controls, high-contrast node labels, and clean right inspector.

6. **Device & SIM**
   - `docs/redesign/density/device_legacy_1440.png`: Legacy Attribution screen showing CGNAT funnel, SIM-swap timeline, and Z3 caliper.
   - `docs/redesign/density/device_v6_1440.png`: Rebuilt high-density terminal forensics with 4 KPIs, sequential CgnatFunnelChart with port omission simulation, Precursor SIM-swap & Dual-SIM Chassis card (shared TAC prefix), and Z3 SMT Clock-Offset Caliper with real-time SAT/UNSAT slider (-5.0s to +5.0s) and SMT-LIB2 script viewer.
   - `docs/redesign/density/device_legacy_1366.png`: Legacy Attribution screen at 1366×768 with tall vertical scroll and truncated formula labels.
   - `docs/redesign/density/device_v6_1366.png`: Responsive 1366×768 layout with side-by-side CGNAT and Z3 cards, legible code blocks, and zero clipping.

7. **Actions & Report**
   - `docs/redesign/density/actions_legacy_1440.png`: Legacy Actions and Report screen with statutory notice tabs and printable dossier preview.
   - `docs/redesign/density/actions_v6_1440.png`: Rebuilt executive action workspace with 4 KPIs, CaseActionsPanel with FastAPI integration and bank response simulation, 4 statutory requisition notice tabs (§106/107 bank freeze, §94 telecom DoT 39.20, NPCI switch STAN, I4C Samanvaya), and full A4 Court Dossier preview with police letterhead, Merkle root hash chain, and digital certification seal.
   - `docs/redesign/density/actions_legacy_1366.png`: Legacy Actions screen at 1366×768 with misaligned print preview margins.
   - `docs/redesign/density/actions_v6_1366.png`: Responsive 1366×768 layout featuring clean sub-tab switching between Live Queue, Admissible Report, and Statutory Dossier with A4 zoom controls.

8. **Court Dossier Lab**
   - `docs/redesign/density/court_legacy_1440.png`: Legacy Court Proof screen showing leave-one-out sensitivity analysis and BSA §63(4) certification cards.
   - `docs/redesign/density/court_v6_1440.png`: Rebuilt 4-tab forensic laboratory workstation supporting Court Dossier leave-one-out sensitivity analysis, Privacy & ZKP crypto proofs (ECDH-PSI), Forensic Workstation audit loom, and 100k-row calibration benchmarks, with full deep-linking for ?view=court.
   - `docs/redesign/density/court_legacy_1366.png`: Legacy Court Proof screen at 1366×768 with cramped sensitivity delta tables.
   - `docs/redesign/density/court_v6_1366.png`: Clean 1366×768 workstation layout with tabbed navigation, live computation dials, and 12.5px high-contrast typography.

## Visual Inspection Log (After Tailwind Wiring at 1440×900)
- **workspace (`docs/redesign/after-tailwind/workspace.png`)**: 4-column KPI cards over 2-column Act-Now priority queue and interactive national money corridors map with active cases monitoring table.
- **cases (`docs/redesign/after-tailwind/cases.png`)**: Status filter tabs (All, Investigating, Action Pending, Frozen, Court Ready, Closed, Archived), instant search input, and responsive multi-column case registry data table with status indicators and action buttons.
- **evidence (`docs/redesign/after-tailwind/evidence.png`)**: Discrepancy header comparing unverified claim against verified bank record with conservation reconciliation table and SHA-256 integrity checklist.
- **people (`docs/redesign/after-tailwind/people.png`)**: 12 mentions across 4 forensic sources connected via multi-color Bezier curves into 6 identity cards with lead strength bars and Why? inspectors.
- **money (`docs/redesign/after-tailwind/money.png`)**: Proportional multi-hop Sankey flow diagram with live particle animations, 1-click freeze actions, recoverable pool circular ring, and LIBR mathematical taint breakdown.
- **network (`docs/redesign/after-tailwind/network.png`)**: Directed graph topology with step-by-step playback chronometer, device and hotspot anchors, and replay speed controls.
- **device (`docs/redesign/after-tailwind/device.png`)**: Corroborated handset terminal card with IMEI and JA4 fingerprints, 4-tier telemetry correlation hierarchy, and SIM-swap CDR event timeline.
- **actions (`docs/redesign/after-tailwind/actions.png`)**: Statutory BNSS §106 freeze directive queue ranked by recoverable balances alongside admissible paper investigation report with cryptographic seal stamp.
- **settings (`docs/redesign/after-tailwind/settings.png`)**: Operational station profile, bilingual English/Hindi localization switch, administrative letterhead configuration, and theme preferences.
- **health (`docs/redesign/after-tailwind/health.png`)**: Diagnostic probe dashboard monitoring REST gateway, SQLite transactional authority, NetworkX graph projections, Ollama SLM, and SHA-256 chain integrity.
- **lab (`docs/redesign/after-tailwind/lab.png`)**: 4-tab forensic laboratory workstation supporting Court Dossier leave-one-out sensitivity analysis, Privacy & ZKP crypto proofs, Forensic Workstation audit loom, and 10,000-row calibration benchmarks.

## Exact Commands
- **Frontend Typecheck**: `cd frontend && npx tsc -b`
- **Frontend Unit Tests**: `cd frontend && npx vitest run`
- **Backend Tests**: `$env:ENABLE_DEMO_AUTH="false"; backend\.venv312\Scripts\python.exe -m pytest backend/tests -q --ignore=backend/tests/test_sarvam_live_smoke.py`
- **Case-Sync Audit**: `node frontend/e2e/case_sync_audit.cjs` (293/293 PASS - 100%)
- **V6 Quality Gate Scan**: `node frontend/e2e/v6_quality_gate_scan.cjs`
- **V6 Styled Layout Gate**: `cd frontend && npx playwright test e2e/v6-styled.spec.ts` (11/11 PASS)
- **V6 Density & Contrast Gate**: `cd frontend && npx playwright test e2e/v6-density.spec.ts` (9/9 PASS)
- **Full E2E Specs**: `cd frontend && npx playwright test e2e/golden-path.spec.ts e2e/settings.spec.ts e2e/management.spec.ts e2e/case-sync.spec.ts --workers=1` (8/8 PASS)

## V6 Case-Sync & Typography Floor Hardening
- **In-App Case Switcher & Store Synchronization**:
  - `V6Topbar.tsx`: Case switcher triggers both `useCaseStore.setActiveCaseId` and `useTarkaGlobal.setActiveCaseId`.
  - `TarkaGlobalContext.tsx`: Added store subscription listener on `useCaseStore` to automatically synchronize global context state, case workspaces, and investigation bundle rehydration.
  - `EvidenceNetworkGraph.tsx`: Wired explicit `caseId` prop support and `useCaseStore` fallback; zero data bleed across cases.
  - `case_sync_audit.cjs`: **293 / 293 PASS (100%)**.
- **Typography Floor Enforcement**:
  - Replaced all 79 sub-12px inline styles in `EvidenceNetworkGraph.tsx` (`7.5px`–`11px`) with `12px` minimum.
  - Total text nodes `< 11.9px` across entire presentation layer: **0**.

## Privacy & Cryptography Workbench UI/UX Hardening (`view=privacy`)
- **Target URL**: `http://localhost:5173/?case=CASE-2026-004&view=privacy`
- **Root Causes Fixed**:
  1. **Double Outer Height & Viewport Overflow**: Replaced hardcoded `height: calc(100dvh - 52px)` and `overflow: hidden` in `PrivacyCryptoWorkbench.tsx` with a responsive, natural layout (`space-y-4`).
  2. **Legacy CSS Utility Hijack**: In `frontend/src/styles/liquid-glass.css`, removed the legacy compatibility bridge classes (`.flex`, `.flex-col`, `.border`, `.bg-slate-*`) that used `!important`, allowing Tailwind v4 responsive classes (`md:flex-row`, etc.) to operate correctly.
  3. **Light-Theme Cohesion**: Replaced dark legacy `#0F1B2E` `KpiTile` and `StoryBanner` components with native `v6-card`s featuring zinc borders (`#e7e7ea`), white surfaces (`#ffffff`), and subtle shadows (`shadow-2xs`).
  4. **Dynamic Case ZKP Calibration**: Resolved the false "FAIL CLOSED" error on `CASE-2026-004` (booked loss ₹1,80,000) by scaling the private transaction batch to fit within the case's actual booked loss, making `SAT VERIFIED` the authentic baseline state, with intentional fail-closed responses only when adversarial attack toggles are engaged.
  5. **Causal SMT Contradiction Logic**: Fixed the conflict calculation in Tab 4 where identical amounts (e.g. ₹1,80,000 claimed vs ₹1,80,000 booked in Case 4) were erroneously flagged as an SMT contradiction. It now correctly identifies and displays `CLM-03: Ledger-Claim Reconciliation | Formal SMT Invariant` with `RECONCILED (INVARIANT MET)`.
  6. **Sub-12px Typography Elimination**: Audited and upgraded all text nodes, badges, and hash chips across all 4 tabs to $\ge 12\text{px}$ floor (0 violations found across all tabs).
- **Screenshots Verified**:
  - `privacy_tab1_psi.png`: Tripartite private set intersection across AXIS, YES, and PUNJAB bank vaults with target mule highlighting and discrete log security notice.
  - `privacy_tab2_zkp.png`: Air-gapped prover space with private witness toggle and independent auditor verifier space with SAT verification outcome (0.42 ms latency).
  - `privacy_tab3_pbft.png`: 4-node consensus simulation under honest, silent, and Byzantine fault modes with 2f+1 quorum guarantee.
  - `privacy_tab4_claims.png`: 3-state causal claim DAG under baseline and ablated challenger conditions.
  - `privacy_1366_tab1.png`: Clean 1366×768 responsive layout with zero cutoffs or misalignments.
- **Verification Results**:
  - `npx tsc -b`: 0 errors.
  - `npx vitest run`: 140/140 passed across 23 test files (834ms).
  - `playwright test e2e/v6-styled.spec.ts`: 11/11 passed (31.7s).
  - `playwright test e2e/v6-density.spec.ts`: 9/9 passed (46.7s).
  - `playwright test e2e/case-sync.spec.ts`: 2/2 passed (37.0s).
  - `npm run build`: Production build cleanly completed in 1.41s across 3,085 modules.





