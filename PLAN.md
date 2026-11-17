# TARKA Enhancement Plan

Honest baseline (Nov 2026 review): looks 8/10, works 4/10 → ~5/10 overall.
Order: Phase 0 → 1 → 2 → 3. Every step leaves a working app. Never push; commit only when asked.

**Key ordering rule:** build one *vertical slice* first — a real bank CSV goes upload → parse → entities →
graph → shown on the existing screens — before widening to every format, size tier and UI polish.
That proves the pipeline and stops the UI drifting ahead of real data again.

## Phase 0 — One source of truth ✅
- Screens render only the active case (`selectors/caseSelectors.ts`, `lib/formatInr.ts`); money reconciles (all 4 cases).
- URL ↔ view/case sync; assistant renders markdown, uses only the active case, says "no evidence".
- Leftovers done: assistant answers in English/Hindi/Tamil (chat + voice); PDF-forensics demo shown only when
  the case data has `receiptClaim.pdfTamper`; ledger = real complainant transactions (no filler rows);
  dead `CHRONOLOGICAL_REPLAY_STEPS` removed.

## Phase 1 — Projects, Cases & Upload Center (1 KB → 10 GB+)
Workflow: Upload → Check → Process → Triage → Investigate.
Hierarchy: Workspace → Project (operation) → Case (FIR) → Evidence batch → File.
Tiers (same pipeline): Instant < 50 MB inline · Background 50 MB–1 GB progress card · Bulk ≥ 1 GB pre-flight + resumable.

### 1A. Security ✅
- Upload filename → safe basename; case_id validated; resolved paths must stay inside storage root.
- Case-access check on chunk/status/pause/resume/cancel (job's own case).
- Chunk cap 16 MB (413); bytes past declared size and chunks after completion rejected (409).
- Background pipeline tasks kept referenced; evidence copy off the event loop.
- Case bundle: no Case-001 defaults or hard-coded graphs for new cases; empty graph until ingestion fills it.
- Tests: `backend/tests/test_ingestion_security.py`.

### 1B. Real pipeline — vertical slice first
1. ✅ Upload jobs persisted (`data/ingestion/jobs.sqlite`); upload resumes from staging size after restart;
   interrupted processing re-runs on resume. New terminal stages NEEDS_MAPPING / REJECTED.
2. ✅ Stage 6: bank/UPI CSV streamed row-by-row (same column rules as `BankUPIParser.map_columns`) into
   `data/ingestion/derived/<case_id>/derived.sqlite`; bad rows quarantined with line + reason; real counts;
   stage 9 checks every row is accepted or rejected. ~70k rows/s, <50 MB peak (≈18 min for 5 GB).
3. ✅ Identifiers: VPA, phone, account, IFSC (from payer/payee). IMEI/IMSI/IP/Wi-Fi/device id come from device logs (`device_store.py`, below); PAN still to do.
4. ✅ Bundle endpoint builds nodes/edges from derived data for non-fixture cases.
   Screens still read fixtures — switching them to the bundle is 1C.5.
5. ✅ Unknown columns → NEEDS_MAPPING with headers + 5 sample rows; `POST /ingestion/jobs/{id}/mapping` re-runs it;
   per-bank templates (`GET /ingestion/mapping-templates`) auto-apply to files with the same headers.
   ✅ SHA-256 duplicate (any case) → DUPLICATE with `duplicate_of`. ✅ Device logs (CDR / IPDR / bank login logs) detected by header (time + account/phone + IMEI/IMSI/IP/BSSID/device id, no amount column) → streamed into `device_events` in the case's derived.sqlite (`services/ingestion/device_store.py`); `GET /ingestion/cases/{id}/devices` = shared-identifier clusters (union-find; identifiers on > 25 accounts listed separately as carrier NAT / public Wi-Fi), SIM changes (new IMSI per account, or a SWAP/PORT event), source rows by account or identifier. Tests: `test_ingestion_devices.py`. Still to do: whatsapp / exif parsers; `tarka/parsers/cdr.py` (call graph, cell towers) is not used by the pipeline — the lean loop only keeps device sightings, not who-called-whom.
6. ✅ `GET /cases/{id}/networks` (`services/ingestion/networks.py`): same-label parties auto-merged; parties sharing a
   phone/account/VPA → review queue with a "why"; connected components = networks; roles VICTIM / MULE / CASH_OUT;
   explainable mule score (pass-through, dwell < 24 h, fan-in/out); hop distance from victims; cross-case identifier hits.
   `POST /cases/{id}/networks/{net}/split` copies a network into a linked case. Community detection (Louvain) still to do.
7. ✅ Projects CRUD (`/api/v1/projects`), case link/move, lifecycle + assignee (`PATCH /projects/cases/{id}`);
   `GET /ingestion/jobs?case_id=&project_id=`. SSE skipped: the UI polls (EventSource can't send the auth header).
8. ✅ Tests: `test_ingestion_pipeline.py`, `test_ingestion_networks.py` (duplicate, mapping/template, networks, projects, split).

### 1C. Frontend
1. Upload Center: drop zone, 64 KB sniff preview, per-file state cards, 3 parallel × 8 MB chunks,
   IndexedDB resume, duplicate warning, chain-of-custody log, storage per project.
2. Column-mapping screen → per-bank templates.
3. Projects & Cases manager: lifecycle Intake → Processing → Investigating → Action pending → Court ready → Closed;
   assign, link/merge/split, archive.
4. Triage board: "N networks — X mules, Y victims, ₹Z" → split into linked cases.
5. ✅ Screens read the backend bundle: `selectors/bundleAdapter.ts` maps `GET /cases/{id}/bundle` (+ `/networks` roles)
   into the fixture shape; `findCase`/`resolveCase` serve demo fixtures or loaded bundles, so screens don't branch.
   Case gate shows skeleton / "No uploaded statements yet → Upload Center". Command Center totals include uploaded
   cases; the switcher lists project-only case ids. Still to do: demo cases loaded *through* the pipeline (they stay
   bundled fixtures); backend gaps — bundle 404s for cases with derived rows but no case record (e.g. C201), and
   `POST /cases` invents booked ₹2.5 L / 72 % recoverable / station / complainant defaults.

### 1D. Validation
✅ `backend/tools/validate_mule_scoring.py`: planted gangs (victims → L1 → structured L2 → ATM/crypto) inside ordinary
activity with look-alikes (salary → rent/bills same day, shared ATMs). Writes CSV + answer key, runs the real pipeline,
reports mule precision/recall, gang separation, speed, memory. Regression test in `test_ingestion_networks.py`.
- 200k rows / 20 gangs: precision 1.0, recall 1.0, 20/20 gangs in their own network (analyse 6 s, 155 MB).
- Fixes it drove: score needs pass-through + short activity burst (month-long pass-through is normal life);
  networks grow only around mules, hubs never link two networks; network ids no longer collide via a shared ATM.
- Honest limit: weights were tuned on data built from the same assumptions. Slow mules (active > 72 h) are missed by
  design. Recalibrate on labelled real cases before trusting the scores in court.
- 1M rows (74 MB) / 50 gangs: precision 1.0, recall 1.0, 50/50 separated. Ingest peak 20 MB.
- ✅ Network step moved into SQL (per-party totals + mule filter run inside derived.sqlite; Python holds only
  suspected mules and their counterparties; result cached until the case's rows change):
  1M rows went from 27.5 s / 747 MB Python heap to 5.8 s / 6.5 MB, with identical findings.
  SQLite's own memory is bounded by its page cache and spills to disk.
- Review queue now lists only look-alikes of network members (outsiders' look-alikes are noise for triage).
- Still to do: the actual 5 × 1 GB run on an 8 GB laptop (≈70M rows; ingest ≈ 17 min at the measured 70k rows/s).

## Phase 2 — Professional glass UI + wow features
IA: My Desk (Act Now inbox) → Projects/Cases → Case: Overview · Money · Network · People & Devices · Evidence · Report.
Lab + orb home move under "Advanced". Refined glass, one accent, dark + light, purposeful motion.
Features: every number drills to source rows; money-flow replay; WebGL network explorer (sigma.js + graphology,
50k+ nodes, victim→cash-out path); batch §106/§107 freeze notices with ack tracking; cross-case alerts;
⌘K identifier search; evidence-grounded assistant with row citations (EN/HI/TA); India map; EN/HI court report.

Done (slice 1):
- [x] Design tokens: one accent, glass levels (`--glass-1..3`, `--blur-1..3`, `.v6-glass`), spacing + type scale,
      dark + light themes with a persisted topbar toggle (`useV6Theme`, `data-v6-theme` on <html>).
- [x] My Desk (`?view=desk`): Act-now inbox from real data (mapping/duplicate files, unsplit mule networks,
      same-person matches, cross-case hits, "Action pending" cases); loading/empty/error/partial states.
- [x] ⌘K search: existing palette extended with views, all accessible cases, and VPA/phone/account search
      across loaded networks → triage of the case that has it.
- [x] Page pass (all 16 v6 views, 1280px, both themes): rail IA = My Desk → Station overview / Projects /
      All cases → "This case" steps (+ Mule triage) → Advanced (orb home, labs); removed hard-coded "4" badge;
      Lab no longer overflows; Cases table fits 1280 with no sideways scroll; truncated text gets a hover tooltip
      app-wide; @theme colours follow the runtime tokens so dark mode reaches chips/badges; dark contrast failures
      (<3:1) cut from ~140 to a handful.

- [x] Case-step pass (Evidence, People, Money, Network, Devices, Actions): rail ticks now mean "earlier step than
      the one you're on" (were hard-coded); top stepper uses the same plain labels and fits 1280; KPI badges are one
      shared `.v6-badge`; page titles wrap instead of cutting; Network view switch moved into its page heading;
      themed thin scrollbars app-wide; graph canvas and inline-styled legacy panels follow dark mode.

Not done yet (spec items still open):
- [ ] Install frontend-design skill + Magic UI / Aceternity; add sigma.js + graphology.
- [ ] IA: per-case "Overview" page; merge People + Devices; Money/Network/Evidence/Report naming in screens.
- [x] 1. Every number clickable → source rows (`<SourceNumber>` + `selectMoneyFigure` in caseSelectors).
- [ ] 2. Money-flow replay with timeline scrubber + golden-hour clock.
- [x] 3. WebGL network explorer (50k+, bubbles, mule heat, victim → cash-out path). Network step → "All linked accounts" tab
      (`frontend/src/v6/network/`). 50,000 accounts / 48,000 links: 60 fps (AMD Radeon iGPU, D3D11, `&stress=50000`).
- [x] 4. Freeze-priority queue → batch §106/§107 notices + acknowledgement tracking.
- [x] 5. Cross-case alerts — My Desk + Triage, and "Also in N other FIRs" badges on networks and accounts (Network page).
- [~] 6. ⌘K search — phone / UPI / account across loaded networks; IMEI not searchable (not in network data).
- [ ] 7. Assistant with row citations in Hindi/Tamil/English.
- [ ] 8. India map from IFSC / ATM / cell-tower locations.
- [ ] 9. Court report in English + Hindi with hash chain.
Follow-ups: replace remaining hex / Tailwind-palette one-offs in screens with tokens (dark shims at end of
v6-tokens.css); backend "split" flag on networks (desk infers split from cross-case hits).

Walkthrough 17 Nov 2026 (scenarios A tiny / B 20 mules + 100 victims / C 1M rows + 50 gangs). Fix in this order:
- [x] BLOCKER (fixed): new cases can't be used. Now: `POST /api/v1/projects/cases` issues the id and the creator gets
      access (local case registry); `GET /projects/cases` lists every case you can open; bundle served from uploads
      when there is no SQL row. Was: Case access is a hard-coded allow-list (`auth_service.py` `allowed_cases`);
      no "create case" in the UI; `POST /cases` forces a `CASE-` prefix; `GET /cases/{id}/bundle` 404s without a DB row
      (`case.py` get_case_bundle) → all six case screens say "No data … upload evidence" while Triage shows the gang.
- [x] BLOCKER (fixed: fixture time format + guard): Evidence screen crashes on uploaded rows (`EvidenceLedgerScreen.tsx` `clockFmt` → "Invalid time value");
      the error boundary then blanks every screen until reload.
- [x] BLOCKER (fixed: uploaded cases are now known cases): Devices + Actions/Report show "Case Not Found" for any non-demo case (they read fixtures only) →
      no freeze notice or report possible on uploaded data.
- [x] One money source (fixed: backend splits loss per network into cashed out / still in mules / unaccounted;
      adapter uses it; per-mule balance = freezable amount): Money Trail says "0 mule accounts, ₹0 recoverable (3%)" while Triage has 20 mules; 81% cash-out
      + 3% ≠ 100%; booked loss ₹1.37 Cr vs Triage ₹1.2 Cr; Upload Center sums every hop (₹3.62 Cr). Map /networks roles +
      mule balances into the selector module; loss = victim → mule money only.
- [~] Stop inventing data (fixed: device boxes/links and SIM-swap replay steps hidden without device evidence,
      "§107 Frozen" only when frozen, no Case-001 evidence strip, no invented KYC / NCRP rows; left for page work:
      victims collapsed in the old graph; People score now = Triage mule score): Network graph collapses 100 victims into one node, adds JA4 / SIM-OTP /
      controller-device nodes and marks ordinary merchants "§107 Frozen"; People adds "NCRP 1930 intake" per victim,
      "KYC discrepancy 90/100", wrong "first recipient" story; People "Attribution 26%" vs Triage mule score 1.0.
- [~] Discovery (fixed: cases with uploads / created in TARKA are listed; lifecycle → Investigating after upload;
      left: top bar still shows the stage from the old workspace record): My Desk / Projects / case switcher only know demo cases + project members (C102/C114 invisible);
      case lifecycle stays "Intake" after processing.
- [ ] Triage adaptivity: 1 network still shows cards (should open it); 50 networks = 50 tall cards, 15k px scroll
      (needs table + bulk actions at 20+); no network status / decisions (only Split); "1 mules · 1 victims" grammar.
- [ ] Upload Center: "No uploads for this case yet" shown above the list of earlier uploads.
- [ ] Jargon on main views (JA4, CAF, C2 BOT, Clayton's Case, "Bipartite Link Arcs", "STRICT HC STANDARD", T1/T3).
- [x] Evidence & Ledger page (17 Nov): file inventory (status Ready / Needs mapping / Duplicate / Rejected, rows read and
      rejected, SHA-256, uploader, time), rejected rows with reasons, chain-of-custody log + CSV export, server-paged
      ledger (filters: account, ₹ range, IST dates, payment type, UTR/RRN, file) scoped by `?net=` / `?acct=`
      (`frontend/src/lib/focusUrl.ts`), plain-English integrity verdict; old forensic tools under "Advanced checks".
      Endpoints: `GET /ingestion/cases/{id}/txns`, `/ingestion/jobs/{id}/rejected`, `/ingestion/cases/{id}/custody`.
      Left: network scope uses the network's listed members (top 200 by mule score); payment type is guessed from the
      reference/UPI id (statements' own rail column is not kept by the parser); files uploaded before the custody log
      show events rebuilt from the upload record; `formatInrCompact` prints ₹1515.6 Cr without grouping.
- [x] Fraud Network page (17 Nov): zoom Project → Network → Account from `?net=&acct=` + breadcrumb (Back works);
      project = bubbles sized by ₹, coloured by status, ranked list + status filter; network = hop-column layout, mule
      heat, layers over 40 accounts fold into "+N more" (click to unfold), ATMs/shops muted, victim → cash-out route;
      account = dossier (heat, why, money in/out/held → source rows, cross-case badge, actions). Decision bar:
      Investigate / Make it a case (creates case + copies rows) / Merge with FIR (copies rows) / Dismiss (reason) /
      Freezes sent → `PUT /cases/{id}/networks/{net}/status`, stored in projects.sqlite with a hash-chained audit log
      (`services/ingestion/network_decisions.py`, `GET …/history`); `GET …/networks` returns `triage` per network.
      Demo fixtures show as one network built from the case record (figures = Money screen). Selectors:
      `v6/network/networkFocus.ts`. "Money networks" is the default Network tab; the old diagram is "Devices & links"
      with plain-language chips. Screenshots: `docs/screenshots/fraud-network/`. Left: label collisions on the top
      row of dense layers; the row copy for Make-a-case / Merge fails (409) above 200 members (decision still saved,
      toast says so); frame rate not re-measured after the change.
- [x] People & Accounts page (17 Nov): role-grouped virtual table (Mules / Victims / Cash-out / Unclear; UPI, phone,
      account + IFSC, backend mule score + plain "why", network, other-FIR hits, money still in the account → ledger),
      "Are these the same person?" queue (Merge / Not same + reason), account dossier at `?acct=` zoom (also from ⌘K):
      identifiers incl. handset IMEI / Wi-Fi from Devices, money in / out / held, payments, networks + FIRs, Freeze /
      Confirm mule / Not a mule (reason) with audit log. One score: the backend's (old 26% "attribution" removed).
      Backend: `app/api/people_api.py` (PUT /cases/{id}/accounts/verdict, GET …/accounts/history, PUT …/review/verdict),
      `account_verdicts.py` (hash-chained log in projects.sqlite); `networks.py` applies verdicts (Not a mule → role
      UNKNOWN, balance leaves recoverable into unaccounted; Confirm promotes a low-score account), members carry
      in/out/first/last; cache keyed on verdicts (ANALYSIS_VERSION 5). Left: "Merge" is recorded but does not yet join
      the two parties in the analysis; a verdict recomputes the case (~8 s on 1M rows); networks list ≤200 members each,
      so the table can miss low-score members of very large networks; demo cases show pairs/verdicts read-only.
- [x] Devices & SIMs page (17 Nov): zoom Project → Network → Account from `?net=&acct=` + breadcrumb; shared-device groups
      (table + two-column graph, strongest evidence first: phone > SIM > app install > Wi-Fi > IP; accounts outside the
      focused network drawn hollow); SIM-change + session timeline from records only; accounts table; every count opens the
      source rows (file + row). Honest empty state "Upload CDR / IPDR / bank login logs" → Upload Center. Removed the
      invented clock-offset/SMT2 widget; legal requisitions kept as "Telecom data request" / "Phone seizure notice" (legal
      term in tooltip). Demo cases build the same view from fixture transactions. Selectors: `selectors/deviceSelectors.ts`.
      Screenshots: `docs/screenshots/devices/`. Left: no cell-tower / location view (CDR call graph not wired); demo SIM events
      have no account; network scope uses the network's listed members (top 200); the accounts payload is one call (page it past ~20k).
- [x] Money Trail page (17 Nov): zoom Project → Network → Account from `?net=&acct=` (lib/focusUrl) + breadcrumb;
      hero "₹ lost → ₹ still recoverable → ₹ cashed out (+ not traced)" from the server's per-network split, with a
      proportional bar and an "off by ₹X" warning if it ever fails to add up (C114: ₹1,23,93,000 = ₹15,73,911 +
      ₹1,08,19,089, Triage shows the same ₹1,23,93,000); every hero / freeze / rule figure opens its source rows.
      Flow diagram (ECharts sankey): ≤24 accounts = every account; bigger = Victims → 1st layer → 2nd → 3+ → Cash-out
      groups with counts, click a group to open its top accounts + "+N more" (≤ ~30 boxes even at 2,000 mules);
      sideways/backward payments are counted but not drawn. Replay scrubber + play (each account at its first payment,
      golden-hour clock, first cash-out marker). "Which tracing rule": LIBR / FIFO / pro-rata in plain words, LIBR
      recommended. "Freeze these first": money held × recency of last movement, button to the Actions queue.
      Selectors: `selectors/moneySelectors.ts` (+ test). `utils/recoveryModel.ts` now uses `resolveCase` (uploaded
      bundles too) and shows zeros for unknown cases instead of the hard-coded ₹5 L / "3 escape routes".
      The §106/§107 drafter, K-budget, and "inject clean deposit" what-if left this page (notices live in Actions &
      report; the legacy Taint screen still has the what-if). Screenshots: `docs/screenshots/money-trail/`.
      Left: uploaded cases have no clean-money data, so the three rules always tie there; urgency uses only "time since
      the account last moved money" (no bank-response or hop-to-exit weighting); replay counts an account's whole
      inflow at its first payment; deep-linking a 1M-row case can show "Case Not Found" on a cold load
      (`/projects/cases` 2.5 s timeout while the server builds the bundle; reload fixes it).
- [x] Actions & Report page (17 Nov): "What do I do now, and is the case ready for court?". Zoom Project → Network →
      Account from `?net=&acct=` (lib/focusUrl) + breadcrumb. Progress header "₹ requested · ₹ frozen · n/N networks
      decided · n networks court-ready" (each number opens its source rows / the network page / the checklist) over a
      recovery bar (frozen / waiting on banks / bank held less / rejected / no notice yet). Freeze queue (virtualised,
      2,000+ rows) ranked by recoverable ₹ × urgency (notice status incl. overdue × freshness of last movement, "why" in
      a tooltip); tick many → one §106/§107 notice per bank: IFSC when the data has one, else the UPI handle labelled
      "bank not known" (no guessed bank). Notices: Sent / Acknowledged / Frozen ₹ (bank-reported amount, split pro rata)
      / Rejected, overdue flag (no ack in 2 h, no confirmation in 24 h) + "Send reminder" (recorded + letter). Issuing
      moves the network to "Freezes sent". "Before court" checklist (evidence fingerprinted, networks decided, notices
      sent, acks / confirmations pending, refusals, money reconciles). Report builder: scope Account / Network / Case,
      English / हिन्दी from a translation table (`v6/report/reportI18n.ts`; legal wording left untranslated and marked
      EN, table not yet translator-reviewed), live A4 preview, SHA-256 hash chain per section, Export PDF (print → Save
      as PDF) with source rows behind every figure. Money trail's "Freeze these first" can pre-tick rows via `?sel=`.
      Backend: `freeze_notices_api.py` now works for upload-only cases (SQLite + hash-chained log beside the jobs),
      `frozenInr`, `networkId`, `POST …/freeze-notices/{id}/reminders`. Selectors: `v6/freeze/actionPlan.ts`,
      `v6/report/reportModel.ts` (+ tests). Screenshots: `docs/screenshots/actions-report/`.
      Left: "Project" report scope (across cases) not built; PDF relies on the browser print dialog (no server PDF);
      appendix caps 300 rows per figure (rest in the ledger); networks list ≤200 members, so very large networks may
      rank members outside the list without a network id; old CaseActionsPanel + telecom/NPCI/I4C letters kept under
      "Other letters and case tasks" unchanged.
- [ ] Not built (other pages): zoom levels + breadcrumb on the remaining screens; "what changed" after re-upload.

## Phase 3 — Quality
E2E upload 5 files → expected networks found. Cross-screen number-consistency tests. 5 GB perf benchmark.
Audit log. `/ponytail:ponytail-audit` and fix "Must fix".

## Known issues (not ours to fix in passing)
- `test_massive_evidence_ingestion_and_admission.py::test_03` depends on host RAM (fails on big machines).
- `test_case_lifecycle.py` needs a running Postgres.
- `graphify.exe` is blocked by Windows Application Control; use `python -m graphify update .`.
