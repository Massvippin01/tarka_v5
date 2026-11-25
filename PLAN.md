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
      `v6/network/networkFocus.ts`. "Money networks" is the default Network tab. Screenshots:
      `docs/screenshots/fraud-network/`. Left: label collisions on the top row of dense layers; the row copy for
      Make-a-case / Merge fails (409) above 200 members (decision still saved, toast says so); frame rate not
      re-measured after the change.
- [x] Network "Devices & links" tab (18 Nov, replaces the old demo diagram; v6 `FraudNetworkScreen.tsx` deleted):
      scoped to the same `?net=`/`?acct=` focus. Shared phone / SIM / Wi-Fi / IP groups reuse the Devices page
      (`deviceSelectors` + `ClusterGraph` + `SourceRowsDialog`; demo cases use their case-record device facts); every
      Records number opens its rows; no device data → "Upload call records or bank login logs". "Other cases with the
      same accounts" groups real `cross_case_hits` by case ("Shares 120 UPI IDs with CASE-X"; demo cases use their
      record's own case links); Open / identifier chips jump to that case's network at the shared account (an `acct`
      alone now resolves to its network). No waterfall / I4C / XML demo figures. `DevicesLinksView.tsx`,
      `crossCaseLinks` + `fixtureCaseHits` in networkFocus.ts (tests in networkFocus.test.ts).
      Left: "Seen" times truncate (full range in the tooltip); the device scope for a whole multi-gang case is the
      whole case, not per network.
- [x] Network graphs redrawn in SVG (18 Nov): gang/account view (`v6/network/NetworkSvg.tsx` GangSvg) and project bubbles
      (ProjectBubbles, rows sized by ₹, label cell under each bubble) replace WebGL below 300 networks; WebGL stays for the
      50k stress view (sparse labels, rest on hover). Labels go through `placeLabels()` in `graphLayout.ts` (greedy by
      priority: beside the node → other side → above/below → nudged with a leader line → hidden; never on a node or
      another label; drawn last on opaque pills so lines never cross text). Small gangs show every name; dense ones show
      hubs, groups and hot mules first and reveal the rest on zoom / hover / keyboard focus. Columns fold to what fits at
      ~28 px (max 30) into "+N more". One glyph set (`glyphs.tsx`: victim, mule L1/L2 by shade, cash-out, shop, bank,
      phone, SIM, Wi-Fi, IP, app) also used by the Devices `ClusterGraph`; mule score = red ring; red dot = in other FIRs;
      link width by ₹ with arrowheads and an amount pill on hover; route / selection dims the rest. Every node has a
      title + aria-label, is focusable and opens with Enter. Account money figures show a placeholder while rows load
      (was a misleading ₹0). Tests: `__tests__/graphLayout.test.ts`. Screenshots: `docs/screenshots/fraud-network/graph-*`.
      Left: label width is estimated (not measured), so a very wide font could crowd a pill edge; pan/zoom is mouse +
      buttons only (no pinch).
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

## Bulk intake + speed (18 Nov 2026)
- [x] Ingest speed: 1M-row statement end to end (upload → hash → seal → parse → index) 42 s → 8 s.
      Parse+load alone 22 s → 7 s (date parsed once per distinct day, plain-number amount fast path,
      WAL + synchronous=NORMAL, txns indexes dropped during a load and rebuilt once). One ingest at a time per case.
      5 × 1 GB (≈70M rows) ≈ 9–10 min, down from ≈50 min (estimate from the 1M-row rate; not run yet).
- [x] Files first, cases later: `POST /projects/intake` → project + holding case; `GET /cases/{id}/networks` adds a
      `proposal` per network (NEW_CASE / ATTACH to a case sharing identifiers / MINOR); officer confirms with
      `POST /cases/{id}/networks/create-cases` (never repeats a network; decisions audit-logged).
- [x] Split: no 200-member limit; `new_case_id` optional (fresh case owned by the officer).
- [x] Live processing progress on every job (`processing`: WAITING / READING_ROWS with rows, rows/s, pct, ETA /
      FINDING_NETWORKS / DONE); networks warmed before DONE so the review board opens instantly.
      Live 1M rows: read 7.6 s at ~150k rows/s, gangs found +5.6 s, ready at 14.2 s.
- [x] Intake UI: Upload Center asks "Add to a case I know" vs "find them for me" (batch name optional, 3 parallel
      chunked uploads into the holding case, one combined table with step chips Uploading → Checking → Reading rows →
      Finding gangs → Ready, live rows / rows-per-second / % / time left per file from the job's `processing` field, and an
      overall "N of M files ready · rows · about X left" (files are read one at a time, so their times add up); survives reloads).
      When every file is done it opens the review board (Triage of a holding case = `v6/intake/IntakeReviewBoard.tsx`):
      headline "N files · N gangs found · N new cases · N match existing cases · N minor", one table row per gang
      (editable title, mules, victims, ₹, action chip with shared identifiers in the tooltip, Network link, dismiss with
      reason), Create all / Create selected, a result summary with links and failures. Projects and My Desk show
      "Intake — review N proposed cases" until every proposal is handled. Pure logic + tests in `v6/intake/intake.ts`.
      Not done: merging two proposed gangs before creating them.
- [x] Duplicate files stay unread on purpose (their gangs are already in that case); the row says "Already in <case>:
      open that case". Triage's split now sends `{title}` and lets the server pick the new case id.
- [x] Advanced section redesign (18 Nov). Voice assistant (was "Voice home (orb)"): calm orb, Start talking / Type a
      question, plain prompt templates, active case only (no CASE-001 fallback, no fake engine statuses, unwired
      language/provider toggles removed). Case timeline (was "Temporal Evidence Loom"): lanes Contact / Money / Complaint /
      Police from the active case's timeline, or its transactions for uploaded cases (≤400 dots), plus measured gaps
      (contact → loss, loss → complaint with golden-hour flag, loss → cash-out); `selectors/timelineSelectors.ts`.
      Scale check (was "Benchmark & Scale Lab"): `GET/POST /api/v1/benchmarks/scale-runs` (`backend/app/api/scale_lab_api.py`)
      runs `tools/validate_mule_scoring.py` (≤500k rows) and logs to `data/validation/scale_lab/runs.jsonl`; screen shows
      only recorded runs, labelled synthetic; `selectors/benchmarkSelectors.ts`. Private bank match (was "Privacy &
      Cryptographic ZKP"): honest prototype page behind a rail "Labs" toggle (`localStorage tarka_labs`), shows what the
      active case would contribute; PSI/ZKP/Merkle/§63 moved to Technical details (`v6/ui/TechnicalDetails.tsx`).
      Rail badges "Loom"/"10k/s" removed. Old v5 screens (BenchmarkLabScreen, PrivacyCryptoWorkbench,
      ForensicWorkstationScreen) are no longer routed from v6; files kept for ?legacy=1.
      Palette (user request + approval, 18 Nov): warm copper/ivory → royal blue accent (#2357F5 light / #3B7BFF dark), cyan
      for highlights and glows, deep navy text and sidebar, blue-white surfaces, in `v6-tokens.css` (+8 files with
      hard-coded hex); `--on-accent` for text on accent fills. Screenshots: `docs/screenshots/advanced/`.
      Left: voice window still shows an invented fallback model list and a "100% … Verified" message
      (`v6/voice/TarkaVoiceModal.tsx`); 1M-row runs can't be started from the screen (synchronous, capped).
- [ ] Next for speed: parse the 5 files in parallel processes (each into its own staging file, merged per case).

## Engine Upgrade — Attribution, Time-Aware Tracing, Credibility (25 Nov 2026)
- [x] **Controller attribution** (`device_store.py` + `networks.py`): links mules sharing IMEI / IMSI / device_id / BSSID / IP (excluding `> 25` accounts = carrier NAT / public Wi-Fi), emits `CONTROLLER_GROUP` objects + plain summaries (`"These 14 mule accounts are operated from 2 phones"`) with device sighting source rows on `GET /cases/{id}/networks` and `GET /cases/{id}/attribution`. Surfaced on v6 Network page + Account Dossier.
- [x] **Time-aware forward LIBR tracing** (`networks.py` `_trace_time_aware`): enforces chronological flow conservation (`debit` before any victim credit arrives carries zero victim taint and drops from victim hops/paths; clean credits withdrawn first under LIBR). Outputs per-victim hop-by-hop paths and `where_now` (`HELD` / `CASHED_OUT` / `MOVED_OTHER`).
- [x] **Slow / dormant 72 h sliding burst** (`networks.py` `_best_72h_window`): single-pass streaming daily buckets + exact two-pointer 72 h window catch dormant-then-burst mules (`quiet >= 30 days`) while preserving `1.0` precision on salary-then-rent look-alikes.
- [x] **Structuring / layering signals**: `below_limit_structuring` (`₹9.9k`/`₹49.9k`/`₹99.9k`/`₹1.99L`/`₹4.99L`), `near_identical_splits`, `rapid_fan_out` (`<= 20 min`), `round_amounts` — each adds weighted score contribution + plain-English `why`.
- [x] **Freeze value**: per-account `held_inr × 0.5^(hours_since_last_outflow / 24)` (`freeze_value_inr`, `retention_likelihood`). Freeze queue ranked by `freezeValueInr × noticeUrgency` with formula tooltip in `FreezeQueuePanel.tsx`.
- [x] **Giant-network sub-groups**: Louvain (`networkx.community.louvain_communities`) for `> 200` member networks, rendered as clickable sub-group bubbles (`SubgroupBubbles`) with paged `/cases/{id}/networks/{net_id}/members`.
- [x] **Verdict-based Logistic Regression**: `VerdictStore` records account feature vectors and re-fits `sklearn.linear_model.LogisticRegression` when `>= 30` verdicts (both classes) exist, preserving unclipped positive/negative weights (negative weights shown as `"lowers suspicion"`) + stratified cross-validation accuracy in `model_tune_log` and showing `"weights last tuned on N verdicts"`.
- [x] **Independent credibility & scale**:
  - Extended `validate_mule_scoring.py --rows 1000000 --gangs 50 --extended --out data/validation/independent` (`bench_1m.json` / `extended_ablation.json`): ingest `50.4 s` (`19,836 rows/s`, `20.2 MB` peak Python heap with `tracemalloc`), analysis `48.5 s` (`99.1 MB`), **precision `0.993`** (`446 / 449`, fixed from `0.939`), **recall `0.989`** (`446 / 451`), `dormant_mule_recall 1.0`, `structuring_mule_recall 1.0`, controller attribution `98/102` (`0` NAT noise, `34` groups), `time_impossible_link_rejected = true`. Ablation: core `1.000` (`446/446`), `+structuring` `0.993` (`446/449`), full `+device` `0.993` (`446/449`).
  - Added `backend/tools/benchmark_amlworld.py` for IBM AMLworld (NeurIPS 2023, `IBM/AML-Data`, Kaggle `ealtman2019/ibm-transactions-for-anti-money-laundering-aml`, CDLA-Sharing-1.0) — **loader ready, run pending** (dataset not downloaded locally; schema parser unit test passes).

## Golden-Hour Workflow & Demo Package (25 Nov 2026)
- [x] **NCRP complaint import** (`ncrp_complaints.py` + `NcrpImportPanel.tsx`): parses NCRP CSVs (ack no., victim name, phone, account/VPA, amount, date/time, typology) with zero invented fields, matches deterministically against ingested `derived.sqlite` transactions (SQL `±72h` window before `LIMIT`, exact side detection, victim-debit-only sum fallback, plus phone/device lookup), surfaces explicit unmatched reasons, and attaches the complaint as the case's victim record (`uploaded_bundle` + `ProjectsStore.merge_ncrp_details`).
- [x] **Golden-hour mode** (`golden_hour_steps` + `V6Topbar.tsx` + `GoldenHourClockBar.tsx`): live clock from complaint start tracking each milestone (`Complaint received → Statements ingested → Money traced → Mules identified → Freeze notices drafted`) against the `< 5 min` containment target.
- [x] **Bank reply loop** (`freeze_notices_api.py` + `FreezeQueuePanel.tsx`): full notice lifecycle `SENT → ACKNOWLEDGED → FROZEN (₹) → RELEASED / REFUSED` with release notes, overdue SLA badges/reminders, and a toggleable `Per bank` grouped response view.
- [x] **Case & network handover** (`projects_store.py` + `HandoverPanel.tsx`): assigns cases or individual networks to officers with handover notes and an append-only SHA-256 hash-chained history timeline (`who changed what, when`).
- [x] **Court report (`EN` + `HI`, Project scope)** (`reportModel.ts` + `reportI18n.ts` + `ReportBuilder.tsx`): enables `Project` scope alongside `Account / Network / Case`, includes project case table, time-aware money paths, `CONTROLLER_GROUP` device attribution evidence, freeze summary, evidence SHA-256s, and source rows per figure with chained SHA-256 sealing and PDF export.
- [x] **Repeatable 1M-row / 50-gang demo package**:
  - `backend/tools/seed_golden_hour_demo.py`: single-command deterministic generator + ingester (`1,000,000` rows in `14.09 s` / `70,972 rows/s`, `20.62 s` network analysis, `55` networks across 50 planted gangs — `53` planted + `2` background FPs, `precision 0.991` (`232/234`), `NET-7E008CEA` showing *"These 14 mule accounts are operated from 2 phones"*, `2/3` matched NCRP complaints).
  - [`docs/DEMO_WALKTHROUGH.md`](docs/DEMO_WALKTHROUGH.md) + [`docs/DELIVERABLES.md`](docs/DELIVERABLES.md) + updated verified E2E screenshots in `docs/demo/`.

## Pre-Submission Hardening (25 Nov 2026)
- [x] **Logic fixes**: two-pass device corroboration (`networks.py` — device sharing never satisfies mule guard on its own and only activates when linked to a Pass-1 non-device mule; salaried couple sharing Wi-Fi stays `UNKNOWN`); tightened temporal clustering on `below_limit_structuring` (`>=3` hits within `48h` or `>=2` high-value hits within `24h`, lifting 1M precision from `0.939` to `0.993`); SQL time window before `LIMIT`, matched-side attribution & debit-only sum in `ncrp_complaints.py`; unclipped LogisticRegression coefficients (`"lowers suspicion"`) + stratified CV holdout accuracy in `account_verdicts.py`.
- [x] **Deployment hardening**: PBKDF2 password verification (`POST /investigation/auth/login`) + v6 `LoginScreen` + dev-only demo mode (`/auth/mode`), persistent `/app/data/ingestion` volumes, Nginx `client_max_body_size 20m` + `300s` proxy timeouts, `.dockerignore` data exclusions, `REASONING_PROVIDER=deterministic`, `SARVAM_*` removed, secrets required from `.env` with no defaults (`docker-compose.yml` & `docker-compose.lean.yml`), and skipped offline voice inventory test (`test_07`).

## Phase 3 — Quality
E2E upload 5 files → expected networks found. Cross-screen number-consistency tests. 5 GB perf benchmark.
Audit log. `/ponytail:ponytail-audit` and fix "Must fix".

## Known issues (not ours to fix in passing)
- `test_massive_evidence_ingestion_and_admission.py::test_03` depends on host RAM (fails on big machines).
- `test_case_lifecycle.py` needs a running Postgres.
- `graphify.exe` is blocked by Windows Application Control; use `python -m graphify update .`.
