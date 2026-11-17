# TARKA: World-Class UI/UX Prompt Pack
**For:** Antigravity (or any AI coding agent) · **Goal:** win SUTRAM PS04 on first impression, clarity and credibility
**Based on:** a live audit of commit `b8f6823` (after Prompts 1-15 landed): 10 routes, 35 inner sections and overlays, each scanned automatically for defects at 1440×900 and 1366×768.

---

## 1. Current UI scorecard

**Overall: 5/10.** The ambition is high and there are moments of real quality (Money-Trail Sankey, fullscreen network replay, the A4 report). It loses on four things:

1. **Crashes and broken flagship features.** "Brief" blanks the whole app. "3-Min Judge Demo" collapses the layout. Benchmarks never renders.
2. **Unreadable text.** On Entities, 163 of 216 visible text elements are smaller than 10px. Pale-on-pale "Investigator Finding" cards appear on 4 screens. The Attribution funnel has 32 low-contrast labels.
3. **Visual incoherence.** Dark chrome holds light cards; there are hundreds of inline hex colours, emoji labels, and five stacked banners before any content.
4. **Self-contradiction on screen.** For example, "5 of 5 claims surviving" sits above 5 rows of "Unsupported".

### Automated scan (1440×900)

| Route | Visible texts | <10px text | Low contrast (<3:1) | "undefined" | Runtime errors |
|---|---|---|---|---|---|
| Workspace | 110 | 25 | 1 | 0 | – |
| 01 Evidence & Ledger | 201 | **83** | 8 | 0 | **"Maximum update depth exceeded"** (infinite render loop) |
| 02 People & Accounts | 216 | **163** | 4 | 0 | **"Maximum update depth exceeded"** |
| 03 Money Trail | 163 | **103** | **22** | 0 | – |
| 04 Fraud Network | 187 | **119** | 5 | 0 | – |
| 05 Device & SIM | 131 | 59 | **32** | 0 | – |
| L1 Court Dossier | 126 | 62 | 0 | **5** | – |
| L3 Workstation › Claim Dependency | 106 | 23 | 0 | **4** | – |
| L3 Workstation › Flight Recorder | 106 | 23 | 0 | **1** | – |
| Global › Brief | **0 (blank)** | – | – | – | **`Cannot read properties of undefined (reading 'map')`** |

### Screen and section ratings

| Screen / section | Score | Verdict |
|---|---|---|
| **Shell / header** | 6 | Header overlap fixed. Still 5 stacked bands (guided banner, story banner, 5-file strip, finding card, KPI row) take ~50% of the viewport before content. Emoji-free nav, but the rail shows codes ("00", "L3") instead of names. |
| **00 Workspace** | 6 | |
| ↳ Brand header | 2 | Station title "NOIDA NODE #UP-16" is **invisible** (dark text on dark bg); the "LIVE SAMANVAYA ENCLAVE" pill floats over it. |
| ↳ KPI strip | 6 | Readable but generic; numbers don't animate; light cards on a dark page. |
| ↳ Case table | 7 | Clean. Bottom 50% of the screen is empty. CASE-001 shows a duplicate "CASE-2026-003" chip. |
| ↳ Board (kanban) | 6 | Works; plain; empty columns waste space. |
| ↳ Roadmap | 6 | Good concept (T+0 → T+120m → court); visually flat. |
| ↳ Bulk Ingest | 5 | Useful ledger; hash column mostly blank; 10 low-contrast labels. |
| **01 Evidence & Ledger** | 5 | |
| ↳ Finding hero (dark) | 7 | The only finding card that is readable; good pattern. |
| ↳ KPI row | 3 | **Contradiction:** "Claim vs booked −₹2,00,000 · ₹15K vs ₹2.15L · 14.3×" while the strip says "Δ ₹2.70 L (19.0×)" and the hero says ₹5,00,000. |
| ↳ Falsification gate | 5 | Dense, jargon (I1-I5, HMAC/Merkle). |
| ↳ Ledger table | 7 | Real and consistent now. Infinite render loop somewhere on this screen. |
| ↳ Inspector dock (RRN/PDF/Privacy/Proof/Entities) | 5 | Powerful but tiny text, 5 tabs of dense telemetry. |
| **02 People & Accounts** | 5 | |
| ↳ Finding hero | 2 | Pale green text on pale green: **headline invisible**. |
| ↳ Raw mentions → profiles | 6 | Right idea; 75% of text under 10px; link lines hard to follow. |
| ↳ Profile analysis + "Why?" | 6 | Waterfall exists; needs visual hierarchy. |
| ↳ Social-engineering lures | 5 | Good content, poor layout. |
| **03 Money Trail** | 7 | |
| ↳ Sankey | 8 | **Best visual in the product.** Make it the hero moment. |
| ↳ Golden-hour curve | 6 | Nice idea; markers overlap the axis labels. |
| ↳ Time-expanded DAG | 4 | Mostly empty boxes and lines; unclear what it adds. |
| ↳ Recovery model panel | 6 | Informative but cramped; 22 low-contrast labels on this screen. |
| **04 Fraud Network** | 6.5 | |
| ↳ In-page graph | 5 | Starts below the fold, squeezed into ~40% width, nodes overlap. |
| ↳ Fullscreen replay | 8 | **Second-best visual.** Should be the default view, not hidden. |
| ↳ XML provenance panel | 4 | Raw XML string is developer-facing. |
| ↳ Cross-state syndicate chart | 3 | Mostly empty, label clipped ("₹10.0 Cr Mand…"). |
| ↳ Correlation matrix | 6 | Useful; plain. |
| **05 Device & SIM** | 3 | |
| ↳ CGNAT funnel | **1** | **Broken:** labels overflow and collide with bars, mixed giant/tiny fonts, 32 low-contrast labels. |
| ↳ SIM-swap / dual-SIM chassis | 5 | Interesting; tiny; needs a clear story. |
| ↳ Clock-offset proof | 4 | Developer UI (sliders, SMT script). |
| **06 Report & Actions** | 7.5 | Real A4 document, freeze letters, JSON. Letterhead says **"Government of NCT of Delhi"** but the PS is **Noida, UP**. `?view=report` doesn't deep-link (falls back to Workspace). |
| **L1 Court Dossier** | 4 | Evidence filter shows **"#01 undefined"…**. KPI "5 of 5 surviving / 100%" vs all 5 rows "✗ Unsupported". **"10-Step Transformation Audit" tab is an empty table.** KPI titles truncated ("5 of 5 Material Cl", "RFC-3161 / Ed25"). BSA certificate tab 6, Multi-state tab 6. |
| **L2 Privacy & ZKP** | 6 | Clean but off-problem; light card on dark; bottom third empty. |
| **L3 Workstation** | 6 | Loom 6; Claim Dependency shows "(undefined)" in 4 artifact names; Flight Recorder 7 (good concept); Provenance DAG 7. |
| **L4 Benchmarks** | **1** | `?view=benchmarks` renders the Workspace instead. |
| **Overlay: Brief** | **0** | **Crashes the app to a blank screen.** |
| **Overlay: Voice AI** | 7 | Clean modal, suggested queries, language picker. |
| **Overlay: + Evidence** | 7 | Good drop zone + 1-click typology packs. |
| **Overlay: 3-Min Judge Demo** | **2** | **Collapses the whole app into a narrow right-hand column**; tour card in the bottom-left. |
| **Overlay: More menu / Cmd-K** | 6 / 7 | Work; Cmd-K is good. |

---

## 2. Design direction: "Mission control for money trails"

**The 10-second test:** a judge glances at the screen and immediately sees *a victim, money moving, mule accounts lighting up, and a clock ticking*. Everything else is one click deeper.

**Principles:**
1. **One story per screen.** Each screen answers one question in one hero visual, with one "Finding" sentence and one primary action. Details live in a right-side inspector, not stacked banners.
2. **Motion carries meaning.** Animation shows *money moving, evidence being sealed, identities merging, time running out*. Nothing animates just to decorate. Everything respects `prefers-reduced-motion`.
3. **Credible, not gimmicky.** It must feel like a national-grade tool (think Palantir Gotham meets Linear and Stripe): dark command theme, precise typography, restrained colour, real numbers. No emoji, no neon soup, no fake terminals.
4. **Explainable by default.** Every score, flag and number has a "Why?" that shows the evidence chain and uses plain language (English/Hindi).
5. **Readable on a projector.** Designed for 1366×768 first, scaled up to 1920. 12px is the minimum body text, 11px the minimum meta text, and AA contrast everywhere.

**Colour semantics (and nothing else):**

| Meaning | Token |
|---|---|
| Risk / suspect / loss | `--risk` (crimson) |
| Recovered / verified / safe | `--safe` (emerald) |
| Time-critical / golden hour | `--urgent` (amber) |
| Money flow / primary action | `--flow` (electric indigo → cyan gradient) |
| Frozen / sealed | `--frozen` (ice blue) |
| Evidence trust tiers | T1 = solid, T2 = outlined, T3 = dashed/hatched (never colour alone) |

---

## 3. Library stack (you may add any of these)

| Need | Use | Notes |
|---|---|---|
| Styling + tokens | **Tailwind CSS v4** with CSS-variable tokens | Replace inline `style={{ color: "#64748B" }}` progressively; it's the root cause of the theme chaos. |
| Component primitives | **shadcn/ui** (on the Radix primitives already installed) | Dialog, Sheet, Tabs, Tooltip, HoverCard, Popover, Command, Table, Badge, Skeleton. |
| Motion | **Motion** (framer-motion, already installed) | `layout`, `layoutId` shared-element transitions, `AnimatePresence`, springs. |
| Wow components | **Magic UI** and **Aceternity UI** (copy-paste, Tailwind + Motion) | *Animated Beam* (evidence → engine), *Border Beam* (active card), *Number Ticker*, *Shimmer Button*, *Spotlight*, *Bento Grid*. Use sparingly. |
| Numbers | **@number-flow/react** (installed) | Every ₹ amount and KPI counts up and morphs on change. |
| Case graph | **@xyflow/react + elkjs** (installed) | Rich card nodes; custom animated edges with rupee particles (SVG `offset-path` / Motion). |
| Large syndicate graph | **Sigma.js + graphology** (`@react-sigma/core`) | WebGL; 10k+ nodes for the cross-FIR "syndicate galaxy". |
| Charts + India map | **ECharts** (installed) | Sankey, India choropleth with animated `lines` arcs for cross-state flows, gauges. |
| Tour / judge mode | **driver.js** | Robust spotlight tour; replaces the broken custom overlay. |
| Drawers | **vaul** | Smooth bottom/side sheets. |
| Micro-illustrations | **dotLottie** (`@lottiefiles/dotlottie-react`) | Empty states, "sealed" stamp, success. |
| Virtualised tables | **@tanstack/react-virtual** | Ledger and benchmark rows. |
| i18n | **react-i18next** + **Noto Sans Devanagari** | English and Hindi UI toggle. |
| Optional 3D (Lab only) | **react-three-fiber** or **react-force-graph-3d** | Only for an optional "Syndicate Galaxy" view, never on the core path, with a 2D fallback. |
| QA | **Playwright + @axe-core/playwright** (installed) | Visual + accessibility + the UI-quality scan (Appendix A). |

---

## 4. How to run this pack in Antigravity

Wait until Antigravity has committed its current Prompt 16 cleanup. Then paste **UI-0** at the start of every session, and run **one** prompt per session in this order:

**UI-1 → UI-2 → UI-3 → S4 → S3 → S1 → S2 → S0 → S6 → S5 → UI-4 → UI-5 → L1-L4 + Overlays → UI-6 → UI-7 → UI-8**

After each one, check the screenshots it reports, then commit.

---

## UI-0: Shared context and role (paste first, every session)

```
ROLE: You are a world-class product designer AND senior front-end engineer (think Linear / Stripe / Vercel /
Palantir design teams). Your job is to make TARKA's UI/UX the best a hackathon jury has ever seen: stunning
but credible visuals, meaningful animation, effortless clarity for a police investigator, and zero bugs.

PRODUCT: TARKA, an AI-powered cyber-fraud investigation & attribution system (SUTRAM PS04: entity extraction &
resolution, relationship discovery, transaction-flow analysis, mule-account & fraud-network identification,
actionable intelligence reports). Users: Indian cyber-crime investigating officers. Audience: hackathon judges
watching a 3-minute demo on a projector.

CODE: frontend/ = Vite + React 19 + TypeScript + zustand. Shell: src/components/shell/TarkaGlobalShell.tsx.
Screens: src/pages/v5/*.tsx (+ src/components/tarka/**). Styles today: src/styles/tokens.css,
bento-executive.css, liquid-glass.css + heavy inline styles. Data: src/services/caseSyncBridge.ts + backend API.
Read UI_UX_PROMPT_PACK.md (repo root) for the audit, scorecard, design direction and library stack.

YOU MAY ADD: Tailwind CSS v4, shadcn/ui, Magic UI / Aceternity UI components, driver.js, vaul, dotLottie,
@tanstack/react-virtual, react-i18next, Sigma.js/graphology, and others listed in section 3.

NON-NEGOTIABLES
1. Never break working features or data correctness. Every number shown is computed; same quantity = same function.
2. Design tokens only: no new hex colours or px font sizes inline. Use the token/Tailwind scale.
3. Typography floor: body >= 12px, meta >= 11px, KPI numbers >= 24px. WCAG AA contrast (4.5:1 text, 3:1 large/UI).
4. Motion: 150-250ms for UI feedback, 400-900ms for storytelling, springs for physical things. Respect
   prefers-reduced-motion (fallback = fade/instant). Animations must never block reading or input. 60fps.
5. No emoji in UI. Icons = lucide-react. Indian number format (₹5,00,000) via the shared formatInr().
6. Layout must work at 1366×768 (projector), 1440×900 and 1920×1080 with no overlap, no clipped labels and
   no page-level horizontal scroll.
7. After every task: run `npx tsc -b`, `npx vitest run`, the Playwright UI-quality spec (Appendix A of the pack)
   and take screenshots of every screen/tab you touched at 1366 and 1440. Report what changed, with screenshots.
8. Don't rename routes/URLs or remove features without saying so. Commit after each prompt.
```

---

## UI-1: Stop the bleeding (all P0 visual bugs)

```
Fix every bug below, each verified in the browser. Do NOT redesign yet; this is a bug-fix pass.

CRASHES / BROKEN FLOWS
1. Clicking "Brief" in the header blanks the whole app. Page error: "Cannot read properties of undefined
   (reading 'map')". Find the component (InvestigationIntelligenceBrief / Brief drawer), guard the data, and wrap
   every screen and overlay in an ErrorBoundary with a friendly recoverable fallback (never a blank app).
2. "3-Min Judge Demo" collapses the app layout into a narrow right-hand column while the tour card sits
   bottom-left. The tour must overlay the app without changing its layout (portal + fixed positioning).
3. React "Maximum update depth exceeded" on 01 Evidence & Ledger AND 02 People & Accounts: find the
   setState-in-useEffect loop (check effects that set state derived from props/objects recreated each render,
   e.g. customRow14Balance sync in IntakeScreen.tsx, entity selection sync in EntityResolutionScreen.tsx) and fix it.
4. `?view=benchmarks` renders the Workspace table; `?view=report` falls back to Workspace. Every route must
   deep-link and survive refresh.

WRONG / MISSING CONTENT
5. Court Dossier evidence filter chips read "#01 undefined" … "#05 undefined"; Workstation › Claim Dependency
   shows "(undefined)" in 4 artifact names and Flight Recorder in 1 place. Fix the field mapping. Add a dev-only
   guard that console.errors when the string "undefined" or "NaN" is rendered.
6. Court Dossier contradiction: KPI "5 of 5 Material Claims surviving · 100%" while the matrix marks all 5
   claims "✗ Unsupported" with every cell "—". Compute both from the same claim-evaluation result.
7. Court Dossier › "10-Step Transformation Audit" tab is an empty table. Populate it from the transformation audit
   log (or show a proper empty state explaining why).
8. 01 Evidence & Ledger KPI tile "Claim vs. booked" still shows "−₹2,00,000 · Claimed ₹15K vs CBS ₹2.15L · 14.3×"
   while the ledger strip shows "Δ ₹2.70 L (19.0×)" and the hero shows ₹5,00,000. Derive the tile from the same
   function as the strip (IntakeScreen.tsx ~line 323).
9. Report letterhead says "Government of NCT of Delhi · Police Department" but the case PS is Noida, UP.
   Derive the letterhead/jurisdiction from case data.
10. Workspace: CASE-2026-001 shows a duplicated "CASE-2026-003" syndicate chip; dedupe.

UNREADABLE UI
11. The green "Investigator Finding" card (shared component used on 02, 03, 04, 05) renders pale text on a pale
    green background: the headline sentence is invisible. Fix its colours for the dark theme (the dark version
    on 01 is correct; use that).
12. Workspace header: station title "NOIDA NODE #UP-16" is dark text on a dark background (invisible), and
    the "LIVE SAMANVAYA ENCLAVE" pill overlaps it.
13. 05 Device & SIM: the CGNAT funnel is broken: labels overflow and collide with bars, mixed huge/tiny fonts,
    32 low-contrast labels. Rebuild as a clean horizontal funnel (label left, bar centre, count + % right).
14. Court KPI titles are truncated ("5 of 5 Material Cl", "RFC-3161 / Ed25"): allow 2 lines or shorten copy.
15. Network › Cross-state syndicate chart label "₹10.0 Cr Mand…" is clipped; chart is mostly empty.

ACCEPTANCE: Appendix A scan reports 0 page errors, 0 "undefined"/"NaN", 0 React warnings in the console on every
route and every tab; Brief, Judge Demo, Benchmarks and Report all work and deep-link.
```

---

## UI-2: Design system foundation

```
Build TARKA's design system so every screen can be rebuilt consistently. Install Tailwind CSS v4 and shadcn/ui
(Radix is already present). Keep existing CSS working during migration.

1. TOKENS (src/styles/tokens.css → CSS variables, mapped into Tailwind theme):
   - Surfaces: --bg (deep navy #070B14-ish), --surface-1/2/3 (elevated glass panels with subtle 1px borders
     and inner highlight), --overlay. A LIGHT "paper" theme exists ONLY for documents (report, letters,
     certificates) and print.
   - Semantic colours: --risk, --safe, --urgent, --flow (indigo→cyan gradient), --frozen, --info, plus
     foreground levels --fg-1/2/3 that all pass AA on every surface. Trust tiers T1/T2/T3 = solid/outline/dashed.
   - Type scale (Inter Variable for UI, JetBrains Mono for IDs/hashes/amounts, Noto Sans Devanagari for Hindi):
     11 / 12 / 13 / 14 / 16 / 20 / 24 / 32 / 44. Tabular numerals for all money.
   - Spacing 4px grid; radius 6/10/14/20; elevation 0-3; blur values; motion tokens (durations, easings,
     springs: snappy {stiffness 500, damping 32}, gentle {stiffness 180, damping 24}).
2. CORE COMPONENTS in src/components/ui/ (shadcn-based, documented with one demo route /?view=design-system):
   AppCard (glass panel + optional Border Beam when "active"), FindingHero (one sentence + key number + primary
   action, AA-contrast), StatTile (label, NumberFlow value, delta, sparkline, status chip, "Why?"), SectionHeader
   (title, plain-language subtitle, actions), Tabs (animated underline via layoutId), Badge/Chip (risk band,
   trust tier, status), Money (₹ with NumberFlow + en-IN), EntityChip (icon per type: person, bank account,
   VPA, phone, device/IMEI, IP, merchant; hover card with dossier), EvidenceChip (filename, tier, short SHA-256,
   copy, "verify"), DataTable (TanStack + virtualisation + sticky header + density toggle), EmptyState (dotLottie
   + explanation + action), Skeleton loaders shaped like the content, GlossaryTerm tooltip, Inspector (right
   slide-over panel via vaul/Sheet), Timeline primitives, ScoreWaterfall (feature contributions), ProgressRing
   (golden-hour countdown).
3. Replace the 3 legacy CSS files' overlapping rules; delete dead styles. No inline hex colours in new code.
4. Add a contrast unit test over all fg/bg token pairs (extend src/__tests__/designTokenContrast.test.ts).
ACCEPTANCE: design-system route renders every component in dark + paper themes; contrast tests pass.
```

---

## UI-3: App shell, navigation and page anatomy

```
Rebuild the shell (TarkaGlobalShell.tsx) around a calm, consistent page anatomy.

1. PAGE ANATOMY (every investigation screen):
   [Case Header 56-64px sticky] → [FindingHero, compact, 1 line + key number + primary action] →
   [Hero visual, >= 60% of viewport] + [Inspector panel right, collapsible] → [secondary sections below].
   Remove the stacked bands: merge "Guided workflow" banner, story banner and the 5-file evidence strip into the
   Case Header (evidence strip becomes a compact "5 evidence files · all sealed" chip that opens a popover).
2. LEFT RAIL: show real names with icons (Evidence, People, Money Trail, Network, Device & SIM, Report) and a
   vertical progress stepper (done/active/pending) for the investigation pipeline; a separated "Lab" group
   (Court Dossier, Privacy & ZKP, Workstation, Benchmarks). Collapsed state shows icons + tooltips, not "L3".
3. CASE HEADER: case switcher (FIR, victim, typology, loss), golden-hour ProgressRing (amber → red as it runs
   out, pulses in the last 15 minutes), trust status ("9 exhibits sealed"), primary actions: Brief, Ask AI, Export
   Report, + Evidence. Everything else goes in "More".
4. TRANSITIONS: moving between steps slides content in the direction of travel (step 2→3 slides left); the case
   title and the key amount use shared layoutId so they morph rather than re-render. 250-350ms, reduced-motion safe.
5. GLOBAL: Cmd/Ctrl-K palette (exists; restyle), "?" shortcut overlay, toasts via sonner, an Alerts bell for
   golden-hour/new-evidence events, EN/हिं language toggle (react-i18next; translate all chrome and the finding sentences).
6. Mode switch (Guided / Analyst / Review) should change density and the amount of explanation shown, not the layout.
ACCEPTANCE: on every screen at 1366×768 the hero visual starts above y=260px; no overlaps; rail shows names.
```

---

## Screen prompts (one per session)

### S0: Workspace / Command Hub

```
Rebuild 00 Workspace as a "national command hub" that wows in the first 10 seconds.
SECTIONS:
1. Header: fix invisible station title; station identity, live status dot, date/time, officer avatar.
2. KPI strip (4 tiles max): Active golden-hour cases (with smallest remaining time as a live ring), Total loss
   reported, Amount frozen/recoverable (NumberFlow counting up on load), Mule accounts identified. Each tile
   has a sparkline and "Why?".
3. NEW hero: India map (ECharts geo) with case origin pins and animated arcs to mule-account states (thickness
   = amount), pulsing on cases inside the golden hour. Hover arc → amount, accounts, FIRs. Click → open case.
4. "Act now" queue: cases sorted by urgency with the single next action ("Freeze 3 accounts · 85 min left") as
   a primary button.
5. Case table (existing): keep, restyle with DataTable; row hover shows a mini money-flow preview; dedupe chips;
   Board / Roadmap / Bulk Ingest views as animated tab transitions (layout animation between views).
6. Board: kanban with drag-and-drop between stages (motion layout), stage counts, empty columns collapse.
7. Roadmap: horizontal swimlanes T+0 → T+15m → T+2.5h → T+48h with a "now" line moving in real time.
8. Bulk Ingest: drop zone with Animated Beam from files to a "TARKA engine" node, per-file SHA-256 filling in as
   it is computed (typing effect), integrity gate badges animating to PASS.
No half-empty screens: the table + map + queue fill 1366×768 sensibly.
```

### S1: Evidence & Ledger ("Did the money really leave?")

```
Rebuild 01 Evidence & Ledger. Story: the complainant's receipt says one thing, the bank ledger proves another.
SECTIONS:
1. FindingHero: "Bank ledger proves ₹5,00,000 left Sunil Kumar's account in 2 tranches; the Canva receipt is
   forged" (computed), primary action "Review People & Accounts →".
2. Evidence rail: the case's evidence files as EvidenceChips (tier, SHA-256 short, sealed state). Clicking
   one opens it in the Inspector with a highlighted extract.
3. "Claim vs Proof" comparison (replaces the confusing KPI row): two big cards side by side, Receipt
   (T3, dashed) vs Bank ledger (T1, solid), with the mismatch amount in the middle in --risk and an animated
   "≠" that draws itself. All numbers from the same function.
4. Ledger table: virtualised, readable (13px), running balance column with a tiny inline bar, suspect rows in
   --risk with an inline reason chip; row click → Inspector shows RRN decode, NPCI switch data, hash.
   Animated "conservation check": a thin progress line runs down the rows and ticks each one green; a
   tampered row (press T) flashes red and the residual counts to the deficit.
5. Integrity gate (I1-I5): a horizontal 5-step pipeline with plain names ("Balances add up", "Transaction ID
   valid", "Settled by NPCI", "PDF not edited", "Seal intact"), each animating to PASS/WARN with a tooltip.
6. Inspector tabs (RRN / PDF / Privacy / Proof / Entities): keep the content, restyle with 12px+ text, collapse
   developer details behind "Technical details".
Fix the infinite update loop on this screen first if UI-1 didn't.
```

### S2: People & Accounts ("Who is who?")

```
Rebuild 02 People & Accounts. Story: scattered identifiers resolve into a few real people/accounts.
SECTIONS:
1. FindingHero (readable): "12 mentions resolved to 7 identities; 3 suspect clusters; 1 merchant protected".
2. HERO, "Resolution canvas": left column raw mentions as chips grouped by source (Complaint, Bank, CDR,
   WhatsApp); right column identity cards. On load, animate chips flying into their identity cards (Motion
   layoutId), drawing curved link lines with match % labels. Alias merges (vikramshah@okaxis + vikram.pay@okaxis)
   pulse once with a "merged: same PSP handle + same account" tag. The hard-veto merchant shows a shield that
   blocks a dashed line with a gentle bounce.
3. Identity cards: avatar/initials, role chip (Victim / L1 mule / L2 mule / Sink / Merchant), linked
   identifiers as EntityChips, lead-strength gauge (0-100, banded), and "Why?" → ScoreWaterfall in the Inspector
   with the narrative in English/Hindi from the local LLM (per the tested recipe in the main prompt pack).
4. Investigator controls: Accept / Reject / Split as clear buttons with undo toast; decisions animate the
   canvas (cards split apart / merge).
5. Social-engineering lures: message bubbles styled like the original channel (WhatsApp/SMS/APK permission
   dialog) with the lure phrase highlighted and the extracted identifiers linked.
Every text >= 12px. Fix the infinite update loop here first if UI-1 didn't.
```

### S3: Money Trail ("Where did the money go?")

```
Make 03 Money Trail the signature screen of the demo.
SECTIONS:
1. FindingHero: "₹3,80,000 of ₹5,00,000 is still recoverable in 3 accounts; act within 1h 58m".
2. HERO Sankey (keep ECharts or d3-sankey): full width, readable node labels with bank + masked account +
   amount; on load, rupee particles flow left→right along links (speed/density ∝ amount); hover a link → exact
   transactions, RRNs, timestamps. Clicking "Freeze" on a node turns its outgoing links ice-blue (--frozen)
   with a lock icon and the "Recoverable" total counts up (NumberFlow).
3. Recovery panel: big recovered vs lost donut that animates; accounting doctrine comparison (LIBR / FIFO /
   pro-rata) as three side-by-side bars with one-line plain explanations and the chosen doctrine highlighted.
4. Golden-hour curve: recoverable amount over time with a "now" marker that moves, milestone pins that don't
   overlap the axis; the area under the curve fills as time passes.
5. Time-expanded DAG: either make it meaningful (time on X, hops on Y, edges animated in chronological order
   with a scrubber) or move it to an "Advanced" tab.
6. Min-cut freeze budget: "If you can freeze only K accounts, freeze these" with K stepper 1-6 and the
   recoverable amount updating live: a powerful, simple decision aid.
```

### S4: Fraud Network ("Who is connected?")

```
Rebuild 04 Fraud Network as the cinematic centrepiece. The fullscreen replay is already the best visual; make
that quality the default in-page experience.
SECTIONS:
1. HERO canvas (@xyflow/react + elkjs layered layout, >= 65% of viewport, above the fold): nodes are rich cards
   (person / account / phone / device / IP / merchant / ATM) sized by money received, coloured by lead-strength
   band, with role badges; shared device/IP links dashed; community hulls softly shaded; cross-FIR links glow.
   Mini-map, zoom controls, fit-to-view, focus mode (click node → neighbours stay, rest dims to 15%).
2. Replay: a bottom timeline scrubber (play/pause, speed, step markers: SIM swap → inflow → AP bind →
   fan-out → cash-out → freeze). Edges draw in chronological order with rupee particles; balances on nodes
   tick with NumberFlow; the camera gently pans to the active hop. "Fullscreen" keeps the same component.
3. Inspector (right): selected node dossier: identifiers, transactions in/out, lead-strength waterfall,
   evidence chips, linked FIRs, "Draft freeze request" action.
4. Layers & filters as a floating glass toolbar: Money / Devices / Telecom / Network, L1/L2/Sinks, min amount.
5. Cross-state view: replace the empty bar chart with a compact India map or arc diagram of states involved.
6. Device XML provenance: render as a readable key-value card with source badges; raw XML behind "View raw".
7. Correlation matrix: heatmap with row/column highlight on hover, linked to graph selection.
ACCEPTANCE: no overlapping nodes or truncated labels for cases 001-004 and an uploaded case; 60fps replay.
```

### S5: Device & SIM ("Which phone/SIM did it?")

```
Rebuild 05 Device & SIM (currently 3/10, funnel broken).
SECTIONS:
1. FindingHero: "1 handset isolated from 10,000 subscribers using tower, time window and device model".
2. HERO funnel: 4-5 stages as a clean animated horizontal funnel (bars shrink in sequence on load with counts
   ticking down 10,000 → 420 → 18 → 1), each stage with a plain-language reason and the evidence source chip.
   Show the odds claim with its formula in an expandable "How we computed this" panel.
3. SIM-swap timeline: horizontal timeline (SIM swap → victim's SIM silenced → fraud debit) with gaps labelled
   in minutes; animated draw-in.
4. Handset twin: a clean device illustration with two SIM slots, IMEI/TAC labels, and the matched slot
   highlighted; no tiny motherboard text.
5. Clock-offset proof: one sentence + a small tolerance gauge; SMT script and sliders under "Technical details".
6. Legal guardrail notice (DoT clause): an info callout, not a wall of text.
```

### S6: Report & Actions

```
Polish 06 Report & Actions (already 7.5/10).
SECTIONS:
1. Action center first: a checklist of generated actions (freeze letters per bank, §94 notices, I4C escalation),
   each with status (draft / sent / acknowledged), "Preview", "Download", "Mark sent". Completing items animates
   the checkmark and updates the case progress ring.
2. Report preview: paper theme, A4 pages with a subtle page-stack animation on generation, then a "sealed"
   stamp animation showing the report SHA-256; download PDF / JSON buttons stay visible (sticky).
3. Fix the letterhead jurisdiction (derive from case), make ?view=report deep-linkable.
4. Add a one-page "Judge summary" export: victim, loss, recovered, mules, actions taken, time saved.
```

### Lab screens and overlays

```
L1 Court Dossier: after the UI-1 fixes, restyle the 4 tabs with the design system. Leave-one-out matrix as a
heatmap (claims × evidence), toggling an evidence column animates the claims that fall/survive. Certificates as
paper documents with a seal animation. Multi-state as an India map. 10-step audit as a vertical stepper with
hashes.
L2 Privacy & ZKP: one explainer illustration ("banks find the shared mule without revealing customers"),
animated set-intersection (3 circles, only the shared number lights up), then the existing tabs restyled. Fill the
empty lower area or tighten the layout.
L3 Workstation: Loom as swimlanes on a shared time axis with a scrubber; Claim Dependency as a node graph where
excluding evidence animates dependent claims to "unsupported"; Flight Recorder as a hash-chained vertical
timeline (each block links to the previous with a short hash); Provenance DAG with column headers and
hover-highlighted lineage.
L4 Benchmarks: render (UI-1), then a clean lab: dataset picker cards, a live throughput gauge, a precision/recall/
F1 scorecard and a confusion matrix with animated fill; "Download report".
OVERLAYS: Brief → right slide-over (vaul/Sheet) with the 7-question brief, each answer citing evidence chips;
Voice AI → floating orb (bottom-right) that expands into a panel with a live waveform, streaming answer text and
citation chips that, when clicked, highlight the item on the current screen; + Evidence modal → keep, add
Animated Beam ingestion; Cmd-K → grouped results with entity previews.
```

---

## UI-4: Signature motion moments (the "wow")

```
Implement these 6 signature moments with Motion (+ Magic UI pieces where noted). Each must be <= 2.5s, skippable,
reduced-motion safe, and meaningful.
1. CASE IGNITION (app load / case open): logo mark draws in (SVG stroke), KPI numbers count up, the India map
   arcs draw from victim state to mule states, golden-hour ring starts ticking. (0-1.8s total)
2. EVIDENCE SEALING (+ Evidence / Bulk Ingest): files glide into an engine node along Animated Beams; each file's
   SHA-256 types out character by character; a seal icon stamps; pipeline stages light up in sequence with counts.
3. IDENTITY SNAP (People & Accounts): mention chips fly into identity cards (layoutId), links draw, alias merge
   pulse, veto shield bounce.
4. MONEY IN MOTION (Money Trail + Network replay): rupee particles along edges proportional to amount; balances
   tick; freezing an account frosts its outgoing edges and stops the particles with a soft "lock" spring.
5. TIME RUNNING OUT (golden hour): ring depletes smoothly; under 15 min it turns red with a slow pulse and a
   single toast; never flashing or annoying.
6. REPORT SEAL (Report): pages stack in, signature line writes itself, the seal stamps with the report hash.
Also: animated tab underline, card hover lift (2px + shadow), button press scale 0.98, skeletons that morph into
content, list items stagger in at 20-30ms. Provide a global "Reduce motion" toggle in More.
Performance: animate only transform/opacity; use requestAnimationFrame/Motion values for particles; cap particles;
pause offscreen animations (IntersectionObserver).
```

---

## UI-5: Explainability and plain-language UX

```
Make TARKA the most explainable investigation tool in the room.
1. A consistent "Why?" affordance on every score, flag, amount and verdict → opens the Inspector with:
   ScoreWaterfall (feature contributions), the evidence chain (EvidenceChips with tiers), and a 2-3 sentence
   narrative in English/Hindi (local LLM via the tested constrained recipe; deterministic fallback).
2. Trust legend always reachable: T1 verified record (solid), T2 corroborating (outline), T3 unverified claim
   (dashed). Use the same visual everywhere (chips, graph edges, table rows).
3. Plain-language mode ("Explain simply", ON by default in Guided mode): replaces jargon (CGNAT, TAC, LIBR, SMT,
   PBFT) with plain phrases; GlossaryTerm tooltips for every remaining term.
4. Confidence is never shown as certainty: lead-strength bands (Low/Medium/High) with a one-line caveat
   "investigative lead, not a finding of guilt" in the Inspector, not on every card.
5. Every empty state explains what's missing and how to get it (e.g. "No CDR yet → request under §94 BNSS").
```

---

## UI-6: Judge mode and presenter mode

```
1. Rebuild "3-Min Judge Demo" with driver.js: 7 steps (Command hub → add evidence → identity snap → money
   trail → network replay → freeze + recovery → report seal), each with a 1-sentence caption, spotlight on the
   exact element, auto-advance with a progress bar, keyboard (←/→/Esc), and an "Auto-play" mode timed for 3 minutes.
   It must never alter layout (UI-1 bug).
2. Presenter mode (toggle in More, shortcut P): +15% type scale, hides developer chrome and technical tabs,
   larger cursor highlight, works at 1366×768.
3. "Reset demo" restores the canonical demo state in one click (offline-safe).
4. A 5-second "attract loop" on the landing/workspace (map arcs + counters) for when the laptop sits idle at
   the stall.
```

---

## UI-7: Responsive, accessibility and performance

```
1. Responsive: 1366×768 (primary), 1440×900, 1920×1080; tablet 768 shows rail as icons and inspector as bottom
   sheet; no page-level horizontal scroll anywhere.
2. Accessibility: keyboard reachable everything, visible focus rings (token), aria-labels on icon buttons,
   roles for charts with text alternatives (summaries), axe: 0 serious/critical issues per route.
3. Performance: route-level code splitting, skeletons under 100ms, LCP under 2.0s on a mid laptop, interaction
   under 100ms, 60fps animations (Chrome performance trace for the replay), initial JS under 600KB gzip.
```

---

## UI-8: QA gate (must pass before demo day)

```
Add frontend/e2e/ui-quality.spec.ts (Playwright) implementing Appendix A for every route AND every inner tab and
overlay (Brief, Voice AI, + Evidence, Judge Demo, More, Cmd-K), at 1366×768 and 1440×900:
- 0 page errors, 0 console errors/React warnings, 0 rendered "undefined"/"NaN"
- 0 text elements under 11px, 0 text elements below 4.5:1 contrast (3:1 for >= 18px)
- no overlapping bounding boxes among header children and among KPI tiles
- the hero visual's top edge < 260px at 1366×768
- axe: 0 serious/critical
Also save full-page screenshots for visual review and add a visual-regression baseline (toHaveScreenshot) for
the 7 judge-demo steps. Wire it into CI.
```

---

## Appendix A: UI-quality scan (paste into the Playwright spec)

```js
// Run in page context via page.evaluate(); returns defect counts for the current view.
(() => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = el => { while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c && c.a > 0.5) return c; el = el.parentElement; }
    return { r: 255, g: 255, b: 255, a: 1 }; };
  const text = document.body.innerText; const low = [], tiny = [];
  document.querySelectorAll('body *').forEach(el => {
    if (el.children.length) return; const s = el.textContent.trim(); if (s.length < 2) return;
    const r = el.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > innerHeight) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return;
    const fg = parse(cs.color); if (!fg) return; const L1 = lum(fg), L2 = lum(bgOf(el));
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05); const fs = parseFloat(cs.fontSize);
    if (fs < 11) tiny.push(s.slice(0, 40)); if (ratio < (fs >= 18 ? 3 : 4.5)) low.push(`${s.slice(0, 40)} [${ratio.toFixed(1)}]`);
  });
  return { undefinedCount: (text.match(/\bundefined\b/g) || []).length, nanCount: (text.match(/\bNaN\b/g) || []).length,
           tinyText: tiny.length, lowContrast: low.length, samples: { tiny: tiny.slice(0, 5), low: low.slice(0, 5) } };
})()
```

---

## Judge-perspective checklist (use it to rehearse)

| Judges score… | What they must see in TARKA |
|---|---|
| **First impression (10 s)** | Command hub with India map arcs, ticking golden-hour ring, counting KPIs: alive, national-scale. |
| **Problem fit** | Each PS04 deliverable is a named step in the rail: entities → network → money trail → mules → report. |
| **It's real** | Drop a new file → watch the pipeline → new entities, graph and scores appear. No canned screens. |
| **Explainability** | Click "Why?" on a mule → waterfall + evidence chips + Hindi narrative from an offline LLM. |
| **Actionability** | "Freeze these 3 accounts" → letters generated → recovered amount counts up. |
| **Trust / legal** | Real SHA-256 seals, T1/T2/T3 trust tiers, "lead, not guilt" language, BSA §63 certificate. |
| **Polish** | Zero glitches, readable on the projector, smooth 60fps motion, consistent design. |
| **Inclusivity** | EN/हिं toggle; plain-language mode; keyboard shortcuts. |
