# TARKA: Audit, Scorecard and Enhancement Prompt Pack
**Target:** SUTRAM PS04, AI-Powered Cyber Fraud Investigation & Attribution System
**Audited:** branch `phase-15/polish` @ `31e8890` (after the Phase 14 merge), run live at 1440×900 with the backend up.

---

## 1. Verdict in one paragraph

The visual ambition is high and Screen 05 (Taint/Sankey) is genuinely strong. **But the product would lose points under judge scrutiny for three reasons:**

1. **The numbers contradict each other.** One case shows four different loss figures. The ledger "proof" box displays hardcoded math that doesn't match its own table. The timeline puts the complaint *before* the theft.
2. **Several "cryptographic" claims are fake.** `pseudoSha256()` is a 32-bit hash spliced into the well-known SHA-256 of "hello world". Literal hashes like `…fedcba9876543210…` are visible on screen.
3. **The screens judges see aren't driven by the AI/backend.** All 8 workbench screens are client-side templates (`caseSyncBridge.derive*()`), using formulas like `opening = loss × 1.45 + 115890`. The backend's real engines (entity resolution, PageRank, communities, hypotheses) run on a *different* dataset that also calls itself CASE-2026-001.

The first judge question will be: *"Upload this CSV and show me the mule accounts."* Today the answer is "only in the Benchmark lab, which is visually broken." Fix those three problems and the project becomes a contender.

---

## 2. Screen-by-screen scorecard

| # | Screen | Useful for PS04? | UI/UX | Correctness | Score | Key problems found |
|---|---|---|---|---|---|---|
| — | Global shell / header | — | 5 | 6 | **5/10** | At 1440px the right toolbar overlaps the breadcrumb ("T+2.5h Lien" sits on "FIR #149/2026 / Z3 Verified"). 14+ header controls. Emoji in nav (🗂️🔍🧭). URL is rewritten to stale `?nav=investigations&lens=Network…`, so refresh/deep links lose the screen. |
| 00 | Case Workspace | High | 7 | 6 | **7/10** | Clean table. Frontend fallback data and backend data disagree (Case 002 is ₹8.4L offline vs ₹3.4L online; Case 003 is a different case). "CASE-2026-003" linked twice; "CASE-2025-003" typo link. Case 004 "Telegram Task Fraud" typed `DIGITAL_ARREST`; complainant "Verified Complainant" placeholder. |
| 01 | Intake / CBS Ledger | High | 5 | **2** | **4/10** | **Conservation box is hardcoded** (`LedgerCard.tsx:135`: opening ₹6,15,890, "5 debits" ₹2,32,650 → ₹5,08,240) while the table shows ₹5,29,140 → ₹3,32,990, yet it says "CONSERVED Δ=₹0 ✓". Row #14 balance input shows 462440 (should be 365690) because `IntakeScreen.tsx:79` uses `bookedLossInr` while the row uses `edges[0].amount`. "Claimed ₹15,000" and "≠ Δ ₹2.00L (14.3×)" are literals. Toast text "Restored to ₹5,22,440" is a literal. |
| 02 | Entity Resolution | **Core deliverable** | 6 | 3 | **5/10** | Header says "7 canonical entities", KPI says "5 Profiles", list header "(5)", list shows 7. Hard-veto banner says "Apex Electronics (ENT-05)"; Apex is ENT-06. VPA `vikramshah@okaxis` vs `vikram.pay@okaxis` never resolved as aliases (a missed showcase). Risk scores are prose literals, not computed. Backend resolver exists but is unused. |
| 03 | CGNAT Attribution | Medium | 4 | 5 | **5/10** | Huge 10,000-dot grid dominates and is unreadable. "1 in 7.14M" odds and "UNAMBIGUOUS ATTRIBUTION" are strong claims with no shown derivation. Too much jargon (TAC, Z3, PGW, JA4). |
| 04 | Fraud Network | **Core deliverable** | 6 | 6 | **6/10** | Replay is a great idea. Layout uses fixed coordinates (`layoutNetwork.ts`: "victim at 0.09W"), so it can't render a new case's network. Node labels truncated ("Sunil Kumar (Victi…"). Cross-state syndicate chart mostly empty, label clipped. |
| 05 | Taint / Money-flow Sankey | **Core deliverable** | 8 | 7 | **7.5/10** | Best screen: clear story of where the ₹5L went, recovery %, golden hour. Keep and make it the hero. |
| 06 | Court Dossier | Medium | 5 | 5 | **5/10** | Evidence matrix is mostly "—" and "Unsupported" cells, which reads as broken. Heavy legal jargon. |
| 07 | Privacy / ZKP / PSI | Low (off-problem) | 6 | 4 | **5/10** | Technically flashy but tangential to PS04. Two institutions labelled "SBI" (Bank A and Bank B) while the mule bank is Axis elsewhere. Should be a secondary tab, not a core step. |
| 08 | Forensic Workstation | Medium | 6 | **3** | **5/10** | **Chronology is impossible:** complaint "registered" 09:15Z, debit 09:24Z, ATM tower ping 09:18Z (before the theft). Ledger says debit at 10:00:14 IST, which disagrees again. Fake SHA-256 shown. Mixed `₹500,000` (en-US) vs `₹5,00,000` (en-IN). |
| — | Benchmark Lab | High (proof it's real) | **2** | ? | **3/10** | **Broken:** clicking "Benchmarks" shows a loader then the workspace again. The lab renders *under* the workspace table because `activeRoute === "workspace"` keeps both mounted (`TarkaGlobalShell.tsx:2005-2006`). When scrolled to, the layout is a narrow column on an empty canvas. Ironically this is the most "real" engine in the app (streams 100k-row CSVs). |
| — | Reports ("Export §63") | **Core deliverable** | 2 | — | **2/10** | `handlePrintPdf = () => window.print()` prints the current dark screen. `ForensicReportModal` exists but is only wired into legacy pages. |

### Problem-statement coverage

| PS04 deliverable | Current state | Gap |
|---|---|---|
| Fraud attribution engine | Narrative on 03/04, scores are literals | Needs computed, explainable mule/attribution scores |
| Entity-resolution framework | Backend engine + tests exist; UI uses templates | Wire backend resolver to Screen 02; show match evidence |
| Financial evidence correlation dashboard | Ledger + Taint screens | Ledger math wrong; derive everything from one dataset |
| Fraud-network visualization | Screen 04 replay, fixed layout | Data-driven layout for *any* uploaded case |
| Investigative intelligence reports | `window.print()` | Real PDF report + actionable notices |

### Engineering health

- `tsc -b`: **0 errors**. Vitest: **49/49 pass**. ESLint: **228 errors** (mostly `any`/unused, cosmetic).
- Backend: 166 routes, all healthy. Pytest: **56 failed / 1106 passed** with the local `.env`, because `ENABLE_DEMO_AUTH=true` in `backend/.env` leaks into the auth tests. With `ENABLE_DEMO_AUTH=false`: **1160 passed, 2 failed**:
  - `test_rbac_case_access_scope_enforcement`: **real security bug.** `AuthService.validate_case_scope` returns `True` for a supervisor on a non-existent case (`CASE-UNKNOWN-999`), so case isolation is bypassed.
  - `test_telemetry_service_initialization`: service name `sentinelx-api` vs expected `sentinelx-core-api` (trivial).
- SQLAlchemy `echo` is on (log spam).
- `backend/venv` is unusable (points at `C:\Users\User\…` Python). Use a fresh venv.
- `caseSyncBridge.ts:147` hardcodes `API_BASE = "http://127.0.0.1:8000"`, bypassing the Vite proxy. Any hosted/Docker demo breaks.
- `SUTRAM_SECRET_ANSWER_KEY.json` sits in the repo root. Detection code doesn't read it (good), but `IntakeScreen.tsx`/`EntityResolutionScreen.tsx` use answer-key values (`TXN-0014205`, `610514882109`, `SBI_VIC_ARJUN_MEHTA`) as display fallbacks, which looks like cheating to a judge reading the code.
- Dead code: `IntakeFalsifierScreen`, `CourtProofBundleScreen`, legacy `pages/*.tsx`, `InvestigationCanvas`, plus 30+ status/audit `.md` files at the root.

---

## 3. How to use the prompts

Paste **Prompt 0 (context)** first in a fresh AI coding session, then **one** numbered prompt at a time. Commit after each prompt passes its acceptance checks. The order matters: P0 fixes credibility, P1 makes it real, P2 makes it memorable, P3 makes it robust.

---

## PROMPT 0: Shared context (paste first, every session)

```
You are working on TARKA, a cyber-fraud investigation platform for the SUTRAM PS04 hackathon
("AI-Powered Cyber Fraud Investigation and Attribution System": entity extraction & resolution,
relationship discovery, transaction-flow analysis, mule-account & fraud-network identification,
actionable intelligence reports).

Stack: frontend = Vite 8 + React 19 + TypeScript + zustand (frontend/), backend = FastAPI + SQLAlchemy
(SQLite in dev) + networkx (backend/app). Shell: frontend/src/components/shell/TarkaGlobalShell.tsx.
Screens: frontend/src/pages/v5/*.tsx. Most screen data comes from
frontend/src/services/caseSyncBridge.ts (derive* methods). Global state:
frontend/src/context/TarkaGlobalContext.tsx and frontend/src/store/useTarkaUiStore.ts.

Rules for every change:
- Every number shown on screen must be COMPUTED from data, never a literal. If two screens show the
  same quantity they must call the same function.
- Indian number formatting everywhere: toLocaleString("en-IN"), ₹ prefix.
- Never fake cryptography. Hashes = real SHA-256 (Web Crypto `crypto.subtle.digest` in the browser,
  hashlib in Python).
- Keep `npx tsc -b`, `npx vitest run` and backend pytest green. Add tests for anything you compute.
- Don't add new frameworks. Don't rewrite unrelated files.
- Finish by listing files changed and how you verified it.
```

---

## P0: Credibility fixes (do these before anything else)

### PROMPT 1: One source of truth for every case's money trail

```
Problem: Case CASE-2026-001 shows four different loss figures across screens (₹5,00,000 booked loss,
₹2,85,000 ledger debit "Tranche 1", ₹2,15,000 "CBS Booked", ₹15,000 "Claimed"). The entity screen says
Vikram Shah drained ₹5,00,000, while the ledger shows ₹2,85,000. Frontend fallback cases in
TarkaGlobalContext.tsx/caseSyncBridge.ts (buildCase002Bundle etc.) disagree with backend seed data
(backend/app/database/seed.py and /api/v1/cases): Case 002 is ₹8,40,000 offline vs ₹3,40,000 online.
A THIRD version of CASE-2026-001 lives in backend/app/intelligence/local_llm_provider.py
(CASE_KNOWLEDGE_BASE: "₹1,50,000 claimed vs ₹50,000 credited", "ACP Rajesh Kumar, Delhi", fake hashes);
that is what the AI copilot answers from. It must also be built from the same fixture.

Do this:
1. Create ONE canonical case-facts fixture per case (backend seed is the source; mirror it as a typed
   frontend fallback generated from the same JSON file, e.g. data/fixtures/cases/*.json imported by
   both). Each fixture holds: complainant, accounts, ordered transactions (id, ts with timezone, from,
   to, amount, channel, RRN/UTR), devices, phones, VPAs, IPs, and the receipt/claim amount with a clear
   label (e.g. "Amount on forged receipt").
2. Rewrite caseSyncBridge.derive* so ledger rows, entity profiles, network edges, taint/Sankey flows,
   court artifacts and the workstation timeline are all derived from that transaction list. Delete
   magic formulas like `Math.round(drainAmount * 1.45 + 115890)`.
3. Add a vitest "cross-screen consistency" test: for every case, total victim debits ==
   Sankey source total == sum of first-hop edges == booked loss shown on the workspace table, and every
   money-in == money-out + balance for each mule account.
Acceptance: switching between all 4 cases, every screen shows mutually consistent amounts with the
backend both ON and OFF.
```

### PROMPT 2: Fix the ledger "conservation proof" (Screen 01)

```
In frontend/src/components/tarka/intake/LedgerCard.tsx lines ~134-139 the "Double-Entry Balance
Conservation" box uses hardcoded constants (openingBal = 615890, totalDebits = 232650, "Total Debits (5)")
that don't match the table rows, yet it displays "CONSERVED Δ = ₹0.00 ✓".

Do this:
1. Compute opening balance, total credits, total debits (and their counts), expected closing and
   actual closing from the `rows` prop (sort by sequenceNo first so ASC/DESC doesn't matter).
   residual = actualClosing - expectedClosing. Also run a per-row check
   Bal[k] == Bal[k-1] + Cr[k] - Dr[k] and highlight the first failing row.
2. In frontend/src/pages/v5/IntakeScreen.tsx (~line 79) the editable Row #14 balance uses
   investigation.bookedLossInr while the row uses edges[0].amount, so it shows 462440 instead of 365690.
   Make the input initialise from the row's own computed balance.
3. Replace the literals "Claimed: ₹15,000.00", "≠ Δ ₹2.00L Deficit (14.3×)", the StripeSegmentedBar
   values and the toast strings ("Restored to ₹5,22,440.00") with values derived from case data.
4. Unit tests: untampered ledger → residual 0; tampered (press T) → residual equals the injected
   deficit and row #14 is flagged.
Acceptance: manually add up the table and it matches the box; pressing T shows a correct non-zero Δ.
```

### PROMPT 3: Real cryptography only

```
frontend/src/services/caseSyncBridge.ts defines pseudoSha256(), a 32-bit string hash spliced into the
SHA-256 of "hello world" (b94d27b9…). Several screens also show literal fake hashes such as
"b198302ca876543210fedcba9876543210abcdef0123456789abcdef01234567" (Forensic Workstation, Screen 08).
For a forensic chain-of-custody product, a judge spotting this destroys credibility.

Do this:
1. Delete pseudoSha256. Add frontend/src/utils/sha256.ts with an async sha256Hex(data) using
   crypto.subtle.digest, plus a canonical-JSON serializer (sorted keys) for hashing records.
2. Hash each evidence record/artifact from its actual canonical content. Build the flight-recorder
   chain as real hash-chaining: hash_i = SHA256(hash_{i-1} || canonical(event_i)). Compute the Merkle
   root over artifact hashes for real.
3. Prefer hashes from the backend when it is up (backend already hashes in EvidenceGateway/AuditService),
   and fall back to browser computation offline. Show a small "verify" button that recomputes and
   compares, so a judge can see it's real.
4. grep the frontend for 64-hex-char literals and remove every fake one.
Acceptance: `grep -rE "[0-9a-f]{64}" frontend/src` returns only test vectors; editing an evidence field
in dev tools makes "verify" fail.
```

### PROMPT 4: Fix the investigation chronology (Screen 08) and timezones

```
In Forensic Workstation → Temporal Evidence Loom (caseSyncBridge.deriveCaseWorkstationChronology), the
1930/NCRP complaint is "registered" at 09:15Z, BEFORE the fraudulent UPI debit at 09:24Z, and an ATM
tower ping at 09:18Z precedes the theft. The ledger (Screen 01) puts the debit at 10:00:14 IST; that
disagrees again. Amounts are formatted "₹500,000" (en-US).

Do this:
1. Derive every timeline event from the canonical case fixture (Prompt 1) with explicit timezone
   (store UTC, display IST with a toggle).
2. Add a causality validator: complaint after first debit; cash-out after the deposit that funds it;
   each hop after its inbound transfer. Show any violation as a red "chronology conflict" chip (a
   genuinely useful forensic feature), and make the default demo data valid.
3. Use en-IN formatting for every rupee amount in the app (add a shared formatInr() helper, replace
   ad-hoc toLocaleString calls).
Acceptance: timeline reads in a sensible order for all cases; a unit test covers the validator.
```

### PROMPT 5: Entity screen counts and IDs (Screen 02)

```
frontend/src/pages/v5/EntityResolutionScreen.tsx: the banner says "resolved 7 canonical entities", the
KPI says "5 Profiles", the list header says "CANONICAL INVESTIGATIVE PROFILES (5)" but 7 are listed,
and RAW TOKENS says 7 while the KPI says "24 Mentions". The hard-veto banner (line ~432) hardcodes
"Rohit Verma (ENT-03) ↛ Apex Electronics (ENT-05)" but Apex is ENT-06.

Do this: compute every count from the arrays actually rendered; generate the hard-veto banner from the
veto rule's actual pair; derive risk scores from features (see Prompt 8) instead of prose literals.
Also add alias detection: "vikramshah@okaxis" and "vikram.pay@okaxis" should appear as two raw tokens
resolved to one profile, with the reason shown ("same PSP handle stem + same beneficiary account").
Acceptance: no count on the screen disagrees with what's listed.
```

### PROMPT 6: Shell layout and navigation bugs

```
In frontend/src/components/shell/TarkaGlobalShell.tsx:
1. At 1440×900 the right toolbar ("T+2.5h Lien", "Compact", "1930 SLA") overlaps the breadcrumb
   ("FIR #149/2026 / <screen> / Z3 Verified"). Make the header a 3-zone flex layout (left nav,
   flexible breadcrumb with text-overflow ellipsis, right actions) and move rarely used controls
   (Mutator, Lab, Compact, Lien clock) into a single "⋯ More" popover. Max 5 visible actions:
   Case switcher, Brief, Voice AI, Export Report, + Evidence.
2. Clicking "Benchmarks" (CaseWorkspaceScreen.tsx ~line 482) sets activePage="benchmark", but line
   ~2005 still renders <CaseWorkspaceScreen/> because activeRoute === "workspace", so the lab renders
   below the table, out of view. Make page rendering mutually exclusive (a single switch on one
   `view` state).
3. The URL is overwritten with stale params (?nav=investigations&lens=Network&entity=P001…) so
   refresh/deep links lose the screen. Sync exactly `?case=<id>&view=<route>` both ways; remove the
   legacy params.
4. Replace emoji in nav labels with lucide icons; label the numeric rail (00-08) with names on hover
   and show names when expanded.
Acceptance: test at 1366×768, 1440×900 and 1920×1080 with no overlap (add a Playwright check that
header children bounding boxes don't intersect); refresh on any screen returns to the same screen.
```

---

## P1: Make it real (this is what wins technical judging)

### PROMPT 7: Unify backend and UI on the same case world

```
The backend graph engines (/api/v1/graph/pagerank, /communities, /investigations/{id}/graph,
/investigation/hypotheses/{id}) run on a different synthetic dataset (people "Vikram Singh",
"Rahul Verma", account "ACC992") than the UI's CASE-2026-001 (victim Sunil Kumar, mule Vikram Shah).
/api/v1/forensics/cases/CASE-2026-001/investigation-graph returns empty nodes/edges.

Do this:
1. Make backend seeding load the canonical case fixtures from Prompt 1 (data/fixtures/cases/*.json)
   into the SQL tables and the in-memory/neo4j graph, and remove or rename the legacy synthetic graph
   so there is exactly one CASE-2026-001.
2. Make /api/v1/cases/{id}/bundle and /forensics/cases/{id}/investigation-graph return nodes/edges
   built from those transactions.
3. Turn ENABLE_DEMO_AUTH off inside the pytest fixtures (monkeypatch settings) so
   the 54 auth tests pass regardless of the local .env. Set the SQLAlchemy engine echo from
   DEBUG_SQL (default false). Isolate tests from the dev database: running pytest left 4 junk cases
   (e2e_p0d_*) in the dev forensics store; point tests at a temp DB/store via a fixture and clean
   those 4 cases out.
   Also fix AuthService.validate_case_scope (backend/app/services/auth_service.py): it returns True for
   a supervisor on a case that doesn't exist ("CASE-UNKNOWN-999"). Unknown cases must be denied for
   every role (test_wave6_phase8_jwt_rbac.py::test_rbac_case_access_scope_enforcement). Align the
   telemetry service name with test_wave6_phase9_audit_telemetry.py.
4. Replace `const API_BASE = "http://127.0.0.1:8000"` in caseSyncBridge.ts with relative "/api/..."
   URLs via the shared axios client (src/api/client.ts) so the Vite proxy / nginx works.
Acceptance: backend pytest fully green; with backend ON, the UI graph and /graph/pagerank talk about
the same people and accounts.
```

### PROMPT 8: Explainable mule-account scoring engine (the "attribution engine")

```
Build backend/app/services/mule_scoring_service.py and expose
GET /api/v1/cases/{case_id}/mule-scores and POST /api/v1/analyze/mule-scores (accepts a transaction
list). For each account compute features from the transaction graph (networkx):
- pass-through ratio (outflow / inflow within 24h) and median dwell time (seconds between credit and
  onward debit)
- fan-in / fan-out degree, number of distinct victims feeding it
- structuring: share of debits just under round thresholds (₹49,999, ₹99,999, etc.) and splitting of a
  credit into N near-equal debits
- velocity: transactions per hour; night-time share (00:00-05:00 IST)
- account age at first fraud credit (if known), KYC mismatch flags, shared device/IP/IMEI with another
  flagged account, ATM cash-out within T of credit
- layer depth from nearest victim (L1/L2/L3)
Score = transparent weighted logistic model (weights in a config file, documented), output 0-100 plus a
per-feature contribution list ("Dwell 112s: +28", "Fan-out 3: +15"…) and a risk band. Never output
"guilty"; label as "investigative lead strength".
Frontend: Screen 02 and Screen 04 must use these scores (replace prose literals like "Risk Score:
98/100"); show a "Why?" popover with the contribution waterfall. Add pytest cases with a known mule
chain and a legitimate merchant that must score low (the Apex Electronics hard-veto example).
Acceptance: changing a transaction in the fixture changes the score and its explanation.
```

### PROMPT 9: Real entity resolution on Screen 02

```
The backend has entity resolution (backend/app/services/entity_resolution_engine.py,
entity_resolution_service.py, POST /api/v1/resolution/resolve) but Screen 02 uses a hardcoded list
from caseSyncBridge.deriveCaseCanonicalEntities.

Do this:
1. Add POST /api/v1/cases/{case_id}/resolve-entities that takes raw extracted mentions
   (name, phone, VPA, account+IFSC, PAN, email, device IMEI, IP) and returns clusters with:
   members, canonical record, pairwise match scores, and the evidence for each link.
   Matching: normalise Indian phones (+91/0 prefixes, spaces), split VPA into handle/PSP, IFSC→bank,
   Jaro-Winkler + Double Metaphone (or Soundex) for names incl. common Indian transliteration variants
   (Shah/Sha, Mohd/Mohammed, Kumar initials), exact-match boosts for PAN/account/IMEI.
   Hard vetoes: different PAN, or a verified merchant (GSTIN) can never auto-merge with a mule.
2. Screen 02: left column raw mentions (with source chip: NCRP complaint, bank statement, CDR,
   WhatsApp), right column resolved profiles, SVG lines from mentions to profile (the "bipartite map"
   button already exists; make it real). Investigator can Accept / Reject / Split a merge; persist via
   backend and log to the audit trail.
3. pytest: 10+ alias cases (positive and negative), including veto cases.
Acceptance: adding a new mention "VIKRAM SHA, 98711-23941" in the UI attaches it to Vikram Shah with a
visible reason.
```

### PROMPT 10: Live "upload anything → investigation" pipeline (the killer demo)

```
Judges will ask: "Upload this file and show me." Build the end-to-end path:
1. "+ Evidence" accepts: bank statement CSV/XLSX (any of SBI/HDFC/ICICI/Axis column layouts, use
   frontend/src/utils/schemaAutoMapper.ts), NCRP/1930 complaint text or PDF, CDR/IPDR CSV,
   WhatsApp chat export .txt.
2. Backend POST /api/v1/cases/{id}/ingest (exists under /forensics; reuse it) runs:
   parse → entity extraction (regex for phone/VPA/IFSC/account/PAN/UTR/RRN/IMEI/IP/URLs + name NER)
   → resolution (Prompt 9) → transaction graph → mule scoring (Prompt 8) → money-trail/taint
   → store results. Stream progress over the existing SSE endpoint (/investigation/events/stream)
   as stages: Parsed N rows → Extracted N entities → Resolved to K → Found M suspect accounts.
3. Frontend shows a stage-by-stage progress panel, then auto-navigates to the Network screen with the
   new case highlighted. Every screen renders from the API result, not templates.
4. Include 3 demo files in demo_evidence_files/ (one per typology: digital arrest, investment scam,
   SIM-swap) that a judge can drag in. Make sure a brand-new file (not in fixtures) works.
Acceptance: from an empty case, dropping the 3 files produces entities, graph, mule list and a report
in under 10 seconds, with no hardcoded fallbacks involved.
```

### PROMPT 11: Data-driven fraud-network graph (Screen 04)

```
frontend/src/components/tarka/network/layoutNetwork.ts places nodes at fixed fractions of width
("victim at 0.09W"), so new cases can't render, and labels truncate ("Sunil Kumar (Victi…").
Replace it with a layered layout computed from edges using elkjs (already a dependency): layer =
hop distance from victim(s); devices/IPs/phones as satellite nodes linked to accounts. Keep the
existing replay animation and minimise/fullscreen features.
Add: node size = amount received, colour = mule score band, edge width = amount; click node →
side panel with account dossier + score explanation; filter by layer/channel; "shared device/IP"
edges drawn dashed; community detection (backend /graph/communities on the unified data) shown as
hulls; cross-case links (same mule in another FIR) highlighted, which is a big point for "fraud
networks" in PS04. Labels must never be cut; use tooltips plus 2-line wrapping.
Acceptance: renders cases 001-004 and an uploaded case without overlaps (keep the existing
layoutNetwork collision unit test, generalised).
```

### PROMPT 12: Real investigative intelligence report

```
"Export §63" currently calls window.print() on the dark UI. Build a proper report:
1. A ReportView route (light theme, print stylesheet, A4) generated from case data, with sections:
   Executive summary (what happened, total loss, recoverable amount, golden-hour status) ·
   Money-trail diagram (static SVG of the Sankey) · Suspect/mule accounts table (bank, IFSC,
   account masked, amount received, score, top 3 reasons) · Resolved entities with linked identifiers ·
   Timeline · Evidence register with real SHA-256 per item · Recommended actions.
2. Recommended actions are actionable intelligence: auto-drafted, editable bank freeze/lien requests
   per mule account (BNSS §106/§107 format), §94 BNSS notices to telecom/PSP for KYC/CAF, NCRP/I4C
   escalation if cross-state links exist. Each as a downloadable letter.
3. "Download PDF" (print-to-PDF from the light ReportView is fine) and "Download JSON" (machine-
   readable, for interoperability).
4. Reuse frontend/src/components/tarka/ForensicReportModal.tsx if suitable; it's currently only used
   by legacy pages.
Acceptance: a 2-4 page clean PDF for each case, with no UI chrome, all numbers matching the screens.
```

---

## P2: Wow-factor UX

### PROMPT 13: Investigator-first information architecture

```
The app speaks to cryptographers, not police investigators: CGNAT, TAC, JA4, Z3 SMT, PBFT, ZKP,
MUS, Stratum-2 dominate every screen. Restructure:
1. Rename the workbench steps in plain language, each with a one-line "what this answers":
   1 Evidence & Ledger ("Did the money really leave?") · 2 People & Accounts ("Who is who?") ·
   3 Money Trail ("Where did it go?", currently Taint, move it up) · 4 Fraud Network ("Who is
   connected?") · 5 Device & SIM Attribution ("Which phone/SIM did it?") · 6 Report & Actions.
   Move Privacy/ZKP, Workstation and Benchmark Lab under an "Advanced / Lab" section.
2. Each screen gets a top "Finding" card: one sentence, the key number, and the next action button
   (e.g. "₹3.8L still recoverable in 3 accounts → Draft freeze requests").
3. Turn "Explain simply" ON by default; jargon terms get the existing GlossaryTerm tooltip.
4. Cut density: max 4 KPI tiles per screen, 11px minimum font size, consistent 8px spacing grid,
   one accent colour per meaning (red = risk, green = recovered/verified, amber = time-critical).
5. Screen 03: replace the 10,000-dot grid with a funnel chart (candidates → after tower → after
   time window → after device TAC → 1) and show the formula for the odds claim.
6. Screen 06: hide empty "—" cells; show a compact evidence-vs-claim checklist instead.
Acceptance: a non-technical person can say what each screen tells them within 10 seconds.
```

### PROMPT 14: "Judge mode" guided 3-minute demo

```
Add a "Guided demo" toggle (the header already has Guided/Analyst/Review modes; make Guided real):
a step-by-step overlay that walks through a fresh case: 1) drag in the 3 demo files (or one click
"Use sample evidence"), 2) watch the pipeline stages, 3) entity resolution merges aliases,
4) network appears and replay plays the ₹ flow, 5) mule scores with "why", 6) generate report and
freeze letters. Each step has a 1-sentence caption, highlights the relevant UI element (spotlight),
has Next/Back, and can auto-play with timing. Must work offline (backend down) using the same
canonical fixtures, and must never show inconsistent numbers.
Acceptance: the whole story runs in about 3 minutes at 1366×768 (projector resolution) without
scrolling surprises.
```

### PROMPT 15: Grounded AI investigation copilot

```
The Brief/Voice AI features should answer real questions about the active case, grounded in data:
"Which accounts should I freeze first?", "Is Vikram Shah linked to other FIRs?", "Summarise the money
trail in Hindi". A local Ollama runtime with llama3.1:8b is installed; the existing
OllamaForensicProvider (backend/app/intelligence/local_llm_provider.py, endpoint
POST /api/v1/forensics/cases/{id}/assistant/query) already calls it and falls back to deterministic rules.
Extend that provider instead of adding a new one:
- Replace its hardcoded CASE_KNOWLEDGE_BASE with retrieval over the case's real structured data
  (entities, transactions, mule scores + feature contributions, timeline, evidence hashes).
- Explainable AI rule: the WHY of every score comes from the deterministic mule-scoring model
  (Prompt 8). The LLM only turns those feature contributions into plain English/Hindi sentences and
  must not invent reasons. Add an endpoint GET /api/v1/cases/{id}/accounts/{acct}/explanation that
  returns {score, contributions[], narrative_en, narrative_hi, model_used}.
- TESTED RECIPE for the narration (llama3.1:8b on the RTX 4060: ~49 tok/s, ~8s per explanation when warm,
  ~40s cold load). An unconstrained prompt FAILED in testing: it dropped a +16 reason, re-ranked the
  rest, wrote "high risk of fraud", and translated "Axis Bank" as "अक्षय बैंक". What worked:
  1. Code sorts the contributions and passes them as an ORDERED list of plain sentences.
  2. System prompt: "mention every reason, in the given order, and nothing else; never use the words
     fraud/guilty/criminal, say 'lead strength'; copy names, bank names, account numbers and amounts
     EXACTLY in Latin script, even inside Hindi". Use Ollama `format: "json"`, temperature 0.1.
  3. Post-validate the output: every name/account/amount from the input must appear verbatim, no
     banned words, no rupee amount or account that wasn't in the input. On failure, retry once, then
     fall back to a deterministic template sentence per reason. Cache narratives per (account, score
     version).
- Make REASONING_PROVIDER actually select the provider (today it's ignored), and raise the first-call
  timeout to cover model load (~60s), then 30s. Warm the model at backend startup with a 1-token call.
- The copilot currently answers "No Evidence Ingested" for CASE-2026-001..004 because the forensics
  evidence store has no artifacts for them (only `upi_payment_discrepancy` does). Seed the demo cases'
  evidence into that store from the canonical fixtures (Prompts 1 and 7).
- Show the active model ("llama3.1:8b · local · offline") in the UI so judges see nothing leaves the machine. Rules: answers must cite evidence IDs /
transaction IDs that render as clickable chips that navigate to the item; refuse to state guilt; if
data is missing, say so. Fall back to deterministic templated answers when no LLM key is configured,
so the demo never breaks. Add 10 eval questions with expected cited IDs as a pytest.
```

---

## P3: Robustness and polish

### PROMPT 16: Cleanup and one-command run

```
1. Remove dead code: frontend/src/pages/v5/IntakeFalsifierScreen.tsx, CourtProofBundleScreen.tsx,
   legacy frontend/src/pages/{Home,Analytics,Graph,Reports,Search,ForensicWorkspacePage}.tsx and
   InvestigationCanvas (?view=canvas) if nothing reachable uses them. Verify with tsc and a grep.
2. Remove answer-key-valued display fallbacks ("TXN-0014205", "610514882109", "SBI_VIC_ARJUN_MEHTA",
   "AXIS_MULE_KARAN_DAS") from IntakeScreen.tsx and EntityResolutionScreen.tsx; move
   SUTRAM_SECRET_ANSWER_KEY.json to frontend/scripts/fixtures/ (used only by verify scripts).
3. Move the 30+ status/audit markdown files from the repo root into docs/archive/; keep README,
   ARCHITECTURE, SETUP_GUIDE, DEMO_SCRIPT at the root.
4. Fix ESLint to 0 errors (start with react-hooks rules, then no-explicit-any in non-test code).
5. Delete the broken committed backend/venv reference from docs; add `make dev` / `npm run dev:all`
   (concurrently) that starts backend + frontend; make docker-compose up work end to end.
6. README: 60-second quickstart, architecture diagram, screenshot per screen, and how each PS04
   deliverable maps to a screen and an API.
Acceptance: fresh clone → one command → working app; tsc, eslint, vitest, pytest all green in CI
(.github/workflows/ci.yml).
```

### PROMPT 17: Demo-day hardening

```
1. Playwright E2E for the golden path (Prompt 14) at 1366×768 and 1920×1080: no console errors,
   no overlapping header elements, every screen renders for every case, the report downloads.
2. Offline resilience: with the backend down, the app shows a small "Offline demo data" pill, never
   raw connection errors, and all numbers stay consistent (same fixtures).
3. Performance: lazy-load heavy screens, keep the initial JS under about 600KB gzip, 60fps replay
   animation; test the Benchmark lab's 100k-row stream doesn't freeze the UI (web worker).
4. Accessibility basics: focus rings, aria-labels on icon buttons, colour contrast AA (a
   designTokenContrast test already exists; extend it to the dark theme).
```

---

## 4. Suggested order and time budget

| Day | Prompts | Outcome |
|---|---|---|
| 1 | 1, 2, 3, 4, 5, 6 | Nothing on screen is contradictory or fake |
| 2 | 7, 8, 9 | Backend engines drive the UI; explainable scores |
| 3 | 10, 11, 12 | Live upload → network → report: the winning demo |
| 4 | 13, 14 | Plain-language UX + guided judge mode |
| 5 | 15, 16, 17 | Copilot, cleanup, E2E, rehearse the pitch |

**Pitch line for judges:** *"Drop in any bank statement, complaint and CDR. In 10 seconds TARKA extracts and resolves every identity, maps the mule network, explains why each account is suspicious, and drafts the freeze requests. Every number is traceable to evidence with a real SHA-256 chain."* Every prompt above exists to make that sentence true.
