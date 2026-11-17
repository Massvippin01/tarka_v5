# TARKA: End-to-End Workflow and Case-Sync Prompt Pack
**For:** Antigravity (or any AI coding agent) · **Goal:** a complete, in-sync, hackathon-grade product flow:
**Dashboard → Cases → Ingest → Investigate (visuals) → Act (freeze/notices) → Report → Close**, where switching
the case changes *every* number and visual, and cases/settings can be managed properly.

**Based on:** a live test of the last commit (`0e70e89`): every screen × 4 cases + an unknown case, in-app case switching, and a code audit. (The working tree was mid-edit by Antigravity's UI-1 and rendered blank, so the test used a clean copy of the last commit.)

---

## 1. What's broken today (evidence)

### 1a. Case-sync matrix: does each screen follow the selected case?

| Screen | Follows the case? | Evidence |
|---|---|---|
| Workspace dashboard | n/a (multi-case) | — |
| 01 Evidence & Ledger | **Partly** | "₹5.00L" and "₹2,00,000.00" identical for all 4 cases |
| 02 People & Accounts | **Partly** | "₹50,000" identical for all 4 cases |
| 03 Money Trail | **No (mixed)** | Cases 002/003/004 show **"Sunil Kumar"** (Case 001's victim) and Case 001's **₹3,80,000** recoverable; amounts in en-US format ("₹340,000") |
| 04 Fraud Network | Mostly | stray "₹5L"/"₹5.00L" on every case |
| 05 Device & SIM | Yes | — |
| 06 Report | **No** | `?view=report` renders the Workspace table |
| L1 Court Dossier | **No** | identical numbers for all 4 cases (₹5.00L · ₹10.42 Cr · ₹2.00L · ₹1.80L) |
| L2 Privacy & ZKP | **No** | "₹5.00L" for every case |
| L3 Workstation | Yes | — |
| **Unknown case** `?case=CASE-TEST-999` | **No** | no "case not found"; renders a mix of Case 004 and Case 001 data |

### 1b. Switching cases inside the app

- Switching from Case 001 to 002 while on **Fraud Network** jumps to **Device & SIM** (the case's stored stage) instead of staying on the current screen.
- **The URL keeps `case=CASE-2026-001`** after switching to 002, so a refresh or shared link reopens the wrong case.
- The switcher label reads **"CASE-149/2026"** (FIR number forced into a case-ID format) and the rail badge shows "149"/"882". The menu shows FIR + title only: no case ID, victim, status, search, recent or pinned cases.

### 1c. Architecture causes

- **42 silent fallbacks** to `"CASE-2026-001"` across **19 files** (`|| "CASE-2026-001"`, `?? "CASE-2026-001"`), so missing data quietly shows Case 001.
- Case-001 story literals still hardcoded in components: "Sunil Kumar" (7 files), "Vikram Shah" (9), "FIR #149" (3), "5,00,000" (7), "Noida" (12).
- **Two independent `activeCaseId` states**: `context/TarkaGlobalContext.tsx:526` and `context/InvestigationContext.tsx:192` (plus local copies in `TarkaForensicWorkstation.tsx:338`, `BulkIngestionModal.tsx:56`). At least two places rewrite the URL (`TarkaGlobalContext`, `useTarkaUiStore.ts:138`).
- **Race condition:** `getCaseBundle(activeCaseId).then(setBundle)` has no cancellation/stale guard, so fast switching can paint the previous case's data.

### 1d. Missing product basics

- **No case management** beyond "New Case Workspace": no edit, status change, assign IO, close, archive/restore, delete, or link cases. The backend has `PUT /cases/{id}` but no PATCH/DELETE/archive.
- **No Settings screen** (station/jurisdiction, language, AI model, demo data, roles…).
- No activity feed or notification center; no "case not found" or empty states; investigation progress is static, not derived from data.

---

## 2. Target workflow (the golden path)

```
 Sign in (demo roles) ─▶ DASHBOARD (all cases, alerts, KPIs, map, my queue)
        │
        ├─▶ CASES (list · search · filter · create wizard · edit · assign · archive)
        │        │
        │        ▼
        │   CASE WORKSPACE  [case header: FIR · victim · status · golden-hour ring · progress]
        │     1 Evidence   ── ingest files ─▶ pipeline (parse → extract → resolve → graph → score)
        │     2 People & Accounts     (resolved identities, accept/reject/split)
        │     3 Money Trail           (Sankey, recoverable amount)
        │     4 Fraud Network         (graph, replay, cross-FIR links)
        │     5 Device & SIM          (attribution; empty state if no CDR/IPDR)
        │     6 Actions & Report      (freeze requests → acknowledged → frozen; §94 notices; report)
        │        │
        │        ▼
        │   CLOSE CASE (checklist) ─▶ Archived (read-only, restorable)
        │
        └─▶ SETTINGS (profile/role · station · language · theme · AI model · demo data · thresholds)
```

**Case lifecycle states** (drive badges, the dashboard and allowed actions):
`DRAFT → INTAKE → INVESTIGATING → ACTION_PENDING → FROZEN / PARTIALLY_RECOVERED → COURT_READY → CLOSED → ARCHIVED`

**The sync rule:** *one active case, one source of truth, every view derived from it.* Changing the case, adding evidence, accepting a merge or freezing an account updates every dependent number and visual (dashboard included) within one render, with no reload.

---

## 3. Where these prompts go in the queue

Merged order with the other two packs (`HACKATHON_ENHANCEMENT_PROMPTS.md`, `UI_UX_PROMPT_PACK.md`):

1. **UI-1** Stop the bleeding *(in progress)*
2. **F-1** One case store and sync engine ← *most important; do before any redesign*
3. **F-2** Case lifecycle and management
4. **F-3** Ingest → investigate flow
5. **F-4** Action loop (freeze, notices, recovery)
6. **UI-2** Design system → **UI-3** App shell *(use F-5's settings/switcher specs here)*
7. **F-5** Settings and administration
8. **F-6** Dashboard / command center *(together with UI pack S0)*
9. UI pack screens **S4 → S3 → S1 → S2 → S5 → S6**
10. **F-7** Activity, notifications and audit trail
11. **UI-4** Motion → **UI-5** Explainability → Lab screens + overlays
12. **F-8** Hackathon-grade robustness
13. **UI-6** Judge mode → **UI-7** Responsive/accessibility/performance
14. **F-9** + **UI-8** Final acceptance gates

---

## F-0: Shared context (paste first, every session)

```
ROLE: You are a senior full-stack product engineer and UX architect. You turn TARKA into a coherent,
end-to-end product where the whole flow (Dashboard → Cases → Ingest → Investigate → Act → Report → Close) works,
stays in sync, and feels production-grade for a national hackathon demo, without over-engineering.

PRODUCT: TARKA, an AI cyber-fraud investigation & attribution system (SUTRAM PS04). Users: Indian cyber-crime
investigating officers and supervisors. Read WORKFLOW_SYNC_PROMPT_PACK.md (repo root) for the audit evidence,
target workflow, case lifecycle and prompt order. UI rules from UI_UX_PROMPT_PACK.md (UI-0) also apply.

CODE: frontend/ Vite + React 19 + TS + zustand; shell src/components/shell/TarkaGlobalShell.tsx; screens
src/pages/v5/*; global state src/context/TarkaGlobalContext.tsx, src/context/InvestigationContext.tsx,
src/store/useTarkaUiStore.ts; data src/services/caseSyncBridge.ts; backend FastAPI backend/app (cases API in
backend/app/api/case.py, canonical fixtures in data/fixtures/cases/).

YOU MAY ADD: @tanstack/react-query (server state + caching), zustand persist middleware, zod +
react-hook-form (forms/validation), and anything in UI_UX_PROMPT_PACK.md section 3.

NON-NEGOTIABLES
1. ONE active case. URL (?case=<id>&view=<route>) is the source of truth; one store mirrors it. No other
   component may hold its own activeCaseId.
2. Never fall back to another case's data. Missing data = loading / empty / "case not found" state.
3. Every case-bound number and visual derives from the active case's data via shared selectors; the same
   quantity is computed by one function everywhere (dashboard totals = sum of case values).
4. Every mutation (create/edit case, ingest, accept merge, freeze, close) updates the backend AND invalidates
   the affected queries, so all screens and the dashboard refresh without reload, plus an audit-log entry.
5. Indian formatting via formatInr(); no "undefined"/"NaN" ever rendered.
6. After each prompt: tsc, vitest, backend pytest, the Playwright specs from this pack (Appendix B), and
   screenshots of affected screens for 2 different cases. Commit on a branch per prompt and report.
```

---

## F-1: One case store and sync engine (the foundation)

```
Goal: switching the case changes EVERY number and visual on EVERY screen, instantly and correctly.

1. SINGLE STORE: create src/store/useCaseStore.ts (zustand) holding activeCaseId + activeView, initialised from
   and kept in sync with the URL (one hook: useUrlSync; replace/back/forward handled; no other code writes the
   URL). Delete activeCaseId state from InvestigationContext.tsx (line ~192), TarkaForensicWorkstation.tsx
   (~338), BulkIngestionModal.tsx (~56) and the URL writer in useTarkaUiStore.ts (~138); they read the store.
2. SERVER STATE: add @tanstack/react-query. Query keys: ['cases'], ['case', id], ['case', id, 'bundle'],
   ['case', id, 'entities' | 'graph' | 'ledger' | 'taint' | 'scores' | 'timeline' | 'actions' | 'report'].
   This gives automatic cancellation of stale requests (fixes the getCaseBundle(...).then race), caching
   (instant switch back), and invalidation after mutations. Offline: fall back to the canonical fixture for THAT
   case id only.
3. DERIVED SELECTORS: one hook per concept, used by every screen, e.g. useCaseSummary(id) → {loss, recoverable,
   frozen, mules, entities, goldenHourLeft, status, stage}; useCaseLedger(id); useCaseGraph(id); useCaseTaint(id).
   caseSyncBridge.derive* become pure functions called by these hooks.
4. KILL THE FALLBACKS: remove all 42 `|| "CASE-2026-001"` / `?? "CASE-2026-001"` fallbacks (19 files) and every
   hardcoded Case-001 story literal in components ("Sunil Kumar", "Vikram Shah", "FIR #149", "5,00,000",
   "Noida", "₹5.00L", "₹2,00,000.00", "₹3,80,000"…); render from data. Known offenders from the live test:
   Money Trail (victim name + ₹3,80,000 leak into other cases, en-US amounts), Court Dossier and Privacy (fully
   static), Evidence (₹5.00L, ₹2,00,000.00 chips), People (₹50,000), Network (₹5L).
5. CASE NOT FOUND: unknown ?case= shows a friendly "Case not found" page with search + recent cases (never
   another case's data). New/empty cases show per-screen empty states with the next action ("Add evidence").
6. SWITCH UX: switching keeps the CURRENT screen (no jump to the case's stored stage), updates the URL, shows
   skeletons only for data not yet cached, and animates key numbers (NumberFlow) to the new values. Fix the
   switcher label ("CASE-149/2026") to show the real case id + FIR + victim.
7. CASE FINGERPRINT (testability): every case-bound panel's root gets data-case-id={the id of the data it
   renders}. Add a dev-only overlay (Ctrl+Shift+D) that highlights any panel whose data-case-id ≠ active case.
ACCEPTANCE: Appendix B "case-sync" spec passes: for all 4 cases × all routes, every [data-case-id] equals the
active case, own victim/FIR present, no other case's victim/FIR present, key amounts differ between cases;
unknown case → not-found page; in-app switch keeps the screen and updates the URL; quick A→B→A switching never
shows stale data.
```

---

## F-2: Case lifecycle and management

```
Goal: officers can create, find, update, assign, progress, close and archive cases like a real product.

BACKEND (backend/app/api/case.py + models/migration):
- Add fields if missing: status (lifecycle enum from the pack), priority, typology, assigned_io, tags[],
  station_id, archived_at, closed_at, closure_reason, created_by, updated_at.
- Endpoints: PATCH /cases/{id} (partial update with validation), POST /cases/{id}/status (allowed transitions
  only; 409 otherwise), POST /cases/{id}/archive, POST /cases/{id}/restore, DELETE /cases/{id} (only DRAFT cases
  with no evidence; otherwise 409), POST /cases/{id}/links (link related FIRs), GET /cases?status=&q=&io=&
  typology=&sort=&page=. Every change writes an audit entry (who, what, before→after, when).
- pytest for transitions, validation and audit entries.

FRONTEND:
1. Cases page (route ?view=cases): searchable, filterable, sortable table (status, typology, IO, priority,
   golden-hour, loss, recovered); saved filters; bulk actions (assign, change priority, archive); row actions
   menu (Open, Edit, Change status, Assign, Link case, Archive, Delete-if-draft).
2. Create-case wizard (react-hook-form + zod): Step 1 complaint (NCRP ack, FIR, complainant, contact, date/time,
   typology auto-suggested from description), Step 2 financial (bank, account, amount, UTR/RRN), Step 3 assign
   (IO, priority), Step 4 add evidence (optional, goes to F-3 pipeline). Validation messages inline; draft
   autosave; on finish, navigate to the new case's Evidence screen.
3. Edit case: side sheet with the same form; optimistic update + rollback on error; unsaved-changes guard.
4. Status control in the case header: shows the current state and only valid next states; confirmations for
   Close (closure checklist: reason, recovered amount, report generated) and Archive.
5. Case switcher upgrade: search by case id / FIR / victim / account / phone, sections Recent · Pinned · My
   cases · All, each row with victim, typology, status chip, golden-hour remaining; keyboard navigation; "New
   case" at the bottom. Archived cases are read-only (banner + disabled mutations) and restorable.
ACCEPTANCE: create a case → it appears on the dashboard and in the switcher immediately; edit its loss amount →
dashboard KPI and every screen update; close → status chip, dashboard counts and filters update; archive →
read-only; restore works; all actions in the audit log.
```

---

## F-3: Ingest → process → investigate flow

```
Goal: evidence drives the investigation; adding evidence visibly updates everything.
1. Evidence manager per case (Evidence screen tab "Files"): list with type, source tier, size, SHA-256, status
   (queued/parsing/extracted/failed), uploaded by/at; preview (CSV table, PDF, text, image); actions: re-run
   pipeline, remove (soft, audited, with reason), download.
2. Pipeline status is per case and persisted (backend), streamed over SSE with stages; the case header shows
   a compact progress indicator while processing; leaving the screen doesn't lose progress; failures show the
   row/field that failed and a retry button.
3. Investigation progress is DERIVED from data (not static): Evidence ✓ when ≥1 T1 financial record; People ✓
   when resolution run and no pending merge decisions; Money Trail ✓ when flows computed; Network ✓ when
   graph built; Device ✓ when CDR/IPDR present; Actions ✓ when all recommended freezes are actioned.
4. Requirement-aware empty states: each screen states what evidence it needs and offers the action ("Device &
   SIM needs CDR or IPDR → Upload / Generate §94 request to telecom").
5. Change awareness: after new evidence is processed, show a toast + "What changed" panel ("+3 entities,
   +1 suspect account, recoverable +₹40,000") and briefly highlight the new nodes/rows/links on the screens
   (animated pulse, 2s).
6. Re-computation is consistent: entities, scores, graph, taint, report and the dashboard all invalidate and
   refresh from the same pipeline result (react-query invalidation after the SSE "done" event).
ACCEPTANCE: from a new empty case, upload the 3 demo files → watch stages → every screen fills in; upload a 4th
file → only affected numbers change, with the "What changed" summary; dashboard totals reflect it.
```

---

## F-4: Action loop (freeze requests, notices, recovery tracking)

```
Goal: the investigation ends in action, and actions change the numbers everywhere.
1. Model: per-account action status NOT_REQUESTED → REQUESTED → ACKNOWLEDGED → FROZEN (amount) | PARTIAL |
   REJECTED | RELEASED, with timestamps, bank, reference no., document link; notices (§94 BNSS to telecom/PSP,
   I4C escalation) with similar statuses. Backend endpoints + audit entries.
2. Actions screen (step 6, before Report): recommended actions ranked by recoverable amount × golden-hour
   urgency; select accounts → generate freeze requests (existing letter generator) → mark sent → record
   bank acknowledgement + frozen amount (demo: "Simulate bank response" button for the jury).
3. Propagation: frozen amounts update Money Trail (links turn ice-blue, "Recoverable → Frozen" counter), Network
   (lock badge on node), case header (recovered ring), Dashboard KPIs, Cases list and the Report, all from the
   same selector. The golden-hour timer stops for a fully frozen case.
4. Undo/correct: mistaken acknowledgements can be corrected with a reason (audited).
5. Report reflects actions: "Actions taken" section with statuses, references and timestamps.
ACCEPTANCE: freezing 2 accounts changes the recoverable/frozen numbers identically on Money Trail, Network,
header, Dashboard, Cases list and Report; the audit log shows each step.
```

---

## F-5: Settings and administration

```
Add a Settings area (route ?view=settings, also from avatar menu), with zustand persist for UI prefs and backend
storage for station/admin settings.
SECTIONS:
1. Profile & role: name, rank, badge no.; role switch for the demo (Investigator / Supervisor / Admin) that
   changes permissions in the UI (e.g. only Supervisor can reassign or archive; only Admin edits weights).
2. Station & jurisdiction: station name, district, state, letterhead (drives report/letters; fixes the
   Delhi-vs-Noida letterhead bug), default IO.
3. Appearance: theme (Command dark · Paper light · High contrast), density (comfortable/compact), text size,
   reduce motion, language EN / हिं (react-i18next).
4. Investigation defaults: golden-hour SLA minutes, alert thresholds, currency/number format, timezone (IST).
5. AI & analytics: local model status (Ollama reachable? model name, latency), toggle LLM narration vs.
   deterministic text, mule-scoring weights (view for all, edit for Admin, with "reset to default" and a note
   that changes are audited).
6. Data & demo: backend URL + health (API, DB, Ollama), offline mode, seed/reset demo cases, export a case
   (JSON bundle) / import a case, clear local cache. Judge mode and presenter mode toggles.
7. Notifications: which events notify (golden-hour < 30 min, ingest done, bank acknowledgement).
8. Keyboard shortcuts reference.
Every setting takes effect immediately (no reload) and is validated; destructive actions confirm.
ACCEPTANCE: switching language, theme, station or role visibly updates the app and the report letterhead;
"Reset demo data" restores the 4 canonical cases.
```

---

## F-6: Dashboard / command center (pairs with UI pack S0)

```
Make the dashboard the truthful, live overview of ALL cases, built from the same selectors as case screens.
1. KPIs (computed as sums over cases, with filters applied): active cases, cases inside golden hour, total
   reported loss, frozen/recovered (₹ and %), suspect accounts identified, cross-FIR linked mules. Each KPI
   click-filters the case list.
2. Filters: date range, status, typology, station/district, IO, priority: applied to KPIs, charts, map and list.
3. Panels: "Act now" queue (next action per urgent case, one click into the right screen); India map with
   case origins and mule-account destinations (arcs); loss vs recovered over time; cases by typology; top
   banks by mule accounts; recent activity feed (from F-7).
4. Drill-down everywhere: map arc → case/account; chart bar → filtered cases; queue item → case + screen.
5. Live: dashboard updates without reload when any case changes (query invalidation / SSE).
ACCEPTANCE: a unit/integration test asserts dashboard totals == sum of per-case selector values for the seed
data; freezing an account or creating a case updates the dashboard live.
```

---

## F-7: Activity, notifications and audit trail

```
1. Activity feed per case (case header "Activity" tab) and global (dashboard): human-readable events
   ("Insp. Sharma froze ₹1,20,000 in HDFC ...1992 · 2 min ago") from the backend audit log, filterable.
2. Notification center (bell): golden-hour warnings, pipeline done/failed, bank acknowledgements, assignments;
   unread counts; click → navigates to the exact case + screen + item.
3. Audit trail view (Supervisor/Admin): table of all mutations with before→after diff and hash-chain
   integrity indicator (backend AuditService already hash-chains).
```

---

## F-8: Hackathon-grade robustness (the "production feel")

```
Not enterprise hardening, just everything a judge might poke at must behave well.
1. States: every screen and panel has loading (skeleton), empty (explain + action), error (message + retry)
   states; ErrorBoundary per route and overlay; a 404 view; offline banner with auto-retry.
2. Forms: zod validation with clear inline messages (FIR format, Indian phone, IFSC, UPI VPA, amounts > 0),
   disabled submit while pending, no double submits, unsaved-changes guard.
3. Destructive actions confirm (with the item name) and are undoable where possible (toast "Undo").
4. Simple sign-in screen with 3 demo users (Investigator, Supervisor, Admin) using the existing backend JWT;
   role-based UI permissions; session persists across refresh; sign out.
5. Backend: consistent error schema ({code, message, field?}), 4xx for validation, 409 for invalid
   transitions, request IDs in logs; CORS/proxy correct; DEBUG off in the demo profile.
6. Health page (?view=health): API, DB, SSE, Ollama, fixtures loaded, version/commit, plus a one-click
   "Reset demo" (Supervisor/Admin only).
7. Performance: case switch < 300ms with cached data and < 1.5s cold; dashboard < 1s with 50 cases (generate
   them in a test seed).
```

---

## F-9: End-to-end acceptance (must pass before demo day)

```
Write Playwright specs (frontend/e2e/) and wire them into CI:
1. golden-path.spec.ts: sign in as Investigator → dashboard → create case (wizard) → upload the 3 demo files →
   wait for pipeline → People: accept a suggested merge → Money Trail shows recoverable → Network shows the
   mule cluster → Actions: request freeze on 2 accounts → simulate bank acknowledgement → dashboard frozen KPI
   increases by exactly that amount → Report shows actions taken → close case (checklist) → status Closed →
   archive → read-only. Screenshots at each step (1366×768).
2. case-sync.spec.ts: Appendix B for all seeded cases × all routes + unknown case + in-app switching
   (screen kept, URL updated, A→B→A with no stale data).
3. management.spec.ts: edit, assign, status transitions (valid + invalid → error toast), archive/restore,
   delete draft, search/filter in the switcher and Cases page.
4. settings.spec.ts: language, theme, station letterhead, role permissions, reset demo.
All four green = demo-ready.
```

---

## Appendix B: case-sync check (Playwright)

```ts
// frontend/e2e/case-sync.spec.ts (sketch; adapt selectors)
import { test, expect } from '@playwright/test';
const ROUTES = ['intake','entities','taint-engine','network','attribution','report','court-proof','privacy-crypto','workstation'];

test('every screen follows the active case', async ({ page, request }) => {
  const cases = await (await request.get('/api/v1/cases')).json();      // [{id, fir_number, metadata_json:{complainant_name}}]
  const markers = Object.fromEntries(cases.map((c: any) => [c.id, [c.metadata_json.complainant_name, c.fir_number]]));
  for (const c of cases) for (const view of ROUTES) {
    await page.goto(`/?case=${c.id}&view=${view}`);
    await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500);
    // 1. fingerprint: every case-bound panel renders data from the active case
    const ids = await page.locator('[data-case-id]').evaluateAll(els => [...new Set(els.map(e => e.getAttribute('data-case-id')))]);
    expect(ids, `${view} panels for ${c.id}`).toEqual([c.id]);
    const text = await page.locator('body').innerText();
    // 2. no other case's victim or FIR leaks in (the workspace/dashboard is exempt)
    for (const [other, ms] of Object.entries(markers)) if (other !== c.id)
      for (const m of ms as string[]) expect(text, `${view}: ${other} marker "${m}" leaked into ${c.id}`).not.toContain(m);
    // 3. never render broken values
    expect(text).not.toMatch(/\bundefined\b|\bNaN\b/);
  }
  // 4. unknown case → not-found, never another case's data
  await page.goto('/?case=CASE-TEST-999&view=network');
  await expect(page.getByText(/case not found/i)).toBeVisible();
});

test('in-app switch keeps the screen and updates the URL', async ({ page }) => {
  await page.goto('/?case=CASE-2026-001&view=network');
  await page.getByRole('button', { name: /switch case|CASE-2026-001/i }).click();
  await page.getByText(/CASE-2026-002|Meera Nair/).first().click();
  await expect(page).toHaveURL(/case=CASE-2026-002/);
  await expect(page).toHaveURL(/view=network/);
  await expect(page.locator('body')).not.toContainText('Sunil Kumar');
});
```
