# TARKA: UI Redesign Master Prompt v2 (paste into Antigravity)

```text
ROLE
You are a principal product designer + staff front-end engineer from a top SaaS company (Linear, Stripe, Vercel,
Palantir quality bar). This is a LONG, UNATTENDED session: work autonomously, never stop to ask. When unsure, choose
the option that is clearer for a police investigator and closer to the reference design; log it in DECISIONS.md.

MISSION
Rebuild TARKA's presentation layer into a world-class, professional SaaS investigation tool that is (1) instantly
understandable to a non-technical police officer, (2) visually stunning with meaningful motion, and (3) 100% driven
by real case data. Current screens are dense, jargon-heavy, inline-styled panels with tiny text; patching them has
failed. You will REBUILD the shell and screens from scratch under src/v6/ and make v6 the default.

VISUAL TARGET (must study first)
frontend/public/design/tarka-reference.html (served at http://localhost:5173/design/tarka-reference.html).
It is the MINIMUM bar for layout, tokens, typography, colour semantics, motion and interactions. Match it, then
EXCEED it with the polish rules below. Do not invent a different visual language.

──────────────────────────────────────────────────────────────────────────────
STEP 0: PREP (do not skip)
1. Commit any leftover work from the previous session if it builds; fix only what's needed to build. Branch: ui/v6.
2. DEMO DATA BUG: the previous e2e tests ARCHIVED CASE-2026-001 in the dev database (every screen now shows
   "This case is ARCHIVED and read-only"). Restore all 4 canonical demo cases (use the existing reset-demo
   function), and change the e2e specs so they only create/close/archive THEIR OWN temporary cases and run
   against an isolated test DB/store. Demo cases must never be mutated by tests.
3. Open the reference at 1440×900 and 1366×768, click every interaction (Why? inspector, Sankey Freeze, Replay the
   theft, Send → Simulate bank response → Generate & seal report, ledger Re-run check). Save screenshots to
   docs/redesign/reference/. Read its :root tokens: they are the contract.

STEP 1: DESIGN SYSTEM (src/v6/)
- Tokens: copy the reference :root exactly (surfaces 1–3, fg 1–3, risk/safe/urgent/flow/frozen + bg tints, radii
  8/12/16, motion durations/easing). Add a light "Paper" theme used for reports/letters/print. Tailwind CSS v4 mapped
  to tokens (or CSS modules). FORBIDDEN in v6: inline hex colours, inline px font sizes, `style={{...}}` for visual
  styling (layout-only exceptions allowed), emoji icons (use lucide-react).
- Type scale: 12 / 13 / 14 (body) / 16 / 20 / 26 (page title, 800) / 30 (KPI, 800). Absolute floor 12px, including
  SVG/canvas chart labels (lay charts out at their real pixel width, as the reference does). Money and IDs in
  JetBrains Mono with tabular numbers; Indian format via formatInr().
- 8px spacing grid; content max-width 1600px; page padding 24–28px; card padding 18px; 16px gaps.
- Components (src/v6/ui/): AppShell, Rail (nav groups, investigation stepper with done/now/pending from REAL
  progress, Lab group, user footer), Topbar (case pill + searchable switcher, status chip, live golden-hour ring,
  Ask TARKA, notifications, one primary action), PageHead (kicker + title phrased as the investigator's question +
  actions), FindingStrip (ONE line, ≤ 64px, icon + plain sentence with bold key facts + one primary CTA),
  Card, KpiCard (count-up + optional gauge/sparkline), Chip, Button (default/primary/safe/ice/ghost/destructive),
  DataTable (sticky header, row hover, mono right-aligned money, empty + loading states, virtualised when long),
  Tabs (animated underline), Inspector (420px slide-over, Esc closes, focus trapped), ScoreWaterfall, Gauge,
  ProgressRing, Toast (sonner), Tooltip/GlossaryTerm, EmptyState, Skeleton (shaped like content), Dialog,
  Sheet, CommandPalette (cmdk), Avatar, Stepper, Timeline.

STEP 2: SHELL + INFORMATION ARCHITECTURE
- v6 AppShell is the default (keep ?legacy=1 until STEP 5). Rail order: Command Center · All Cases · [active case]
  1 Evidence & Ledger · 2 People & Accounts · 3 Money Trail · 4 Fraud Network · 5 Device & SIM · 6 Actions & Report ·
  Lab (Court Dossier, Privacy & ZKP, Workstation, Benchmarks) · Settings.
- Wire everything to the existing data layer (useCaseStore + TanStack Query selectors, ?case=&view= URL sync). No
  mock data in v6; every number comes from selectors for the active case and changes when the case changes.
- Re-attach existing features: case management (wizard, edit, status, archive), evidence upload pipeline, Voice AI
  (= Ask TARKA panel), Brief, Cmd-K, judge demo, notifications/activity, settings, health, offline banner.
- REMOVE from the main UI: guided-workflow banner, story banner, "5-file evidentiary join" strip, tall
  "Investigator Finding" cards, jargon chips in the header ("Z3 Verified", "Mutator", "Lab Alt+B"), Guided/
  Analyst/Review header toggle (→ Settings), numeric rail codes (00, L3), any screen with > 4 KPI tiles.
- Every page follows ONE anatomy: PageHead → FindingStrip → hero visual (≥ 55% of the viewport, above the fold at
  1366×768) → supporting cards. Details go in the Inspector, never in more stacked panels.

STEP 3: SCREENS (rebuild each in src/v6/screens/, one commit per screen)
For each screen: build → screenshot at 1440 & 1366 → compare with the reference side-by-side → iterate until
layout, hierarchy, spacing and motion match or beat it. Write plain-English copy; keep legal/technical detail in the
Inspector under "Technical details".
 a. Command Center: greeting + summary line; 4 KPIs (cases in golden hour, reported loss, frozen/recoverable with
    gauge, mule accounts) with count-up; "Act now" queue (urgency × recoverable; Act opens the right case + screen);
    India map (ECharts + real India GeoJSON) with animated arcs/particles from victim states to mule-account states,
    hover tooltips, click → filtered cases; active-cases table with recovery gauges, golden-hour chips, status chips.
 b. All Cases: same table language + filters, saved views, search, bulk actions, create-case wizard (stepper),
    edit sheet, status control, archive/restore; archived cases show a subtle read-only banner, not a red alarm.
 c. Evidence & Ledger: Claim-vs-Proof three-column hero (T3 dashed vs T1 solid, animated ≠ + delta); ledger table
    with sequential conservation-check animation and "Re-run check"; integrity checklist animating to pass/warn
    with plain names; evidence files tab (upload, pipeline stages, SHA-256, preview).
 d. People & Accounts: mentions grouped by source → identity cards with animated curved links, alias-merge chip,
    lead-strength gauges, Why? → Inspector (ScoreWaterfall from the real scoring engine + local-LLM narrative EN/हिं
    with deterministic fallback + evidence-tier chips + Accept/Reject/Split).
 e. Money Trail (signature screen): Sankey at real width with label pills, rupee particles (density ∝ amount),
    per-account Freeze wired to the real freeze action; frozen links turn ice-blue, recoverable KPI and "N places"
    update live with count-up + toast; "How we traced it" card + methods comparison in Inspector.
 f. Fraud Network: layered graph (elkjs) from real data, sized by amount, coloured by risk, shared device/IP edges
    dashed, particles, replay bar (steps + clock, play/pause), node click → Inspector, fullscreen = same component,
    cross-FIR links highlighted.
 g. Device & SIM: animated funnel (bars shrink, counts tick down) with a plain reason per stage; SIM-swap timeline;
    handset card; formulas/proofs in Inspector.
 h. Actions & Report: ranked freeze rows (Ready → Requested → Frozen) with live statuses, frozen total count-up,
    Send + "Simulate bank response"; Paper-theme report preview with seal stamp animation; PDF/JSON download.
 i. Lab, Settings, Health: wrap in the new shell with v6 PageHead/Card/typography (no deep rebuild) so the product
    looks like one system.

STEP 4: SAAS POLISH CHECKLIST (apply everywhere, this is what makes it "top class")
- States: every view has skeleton loading (< 100ms to show), empty state (illustration/icon + one sentence + CTA),
  error state (message + retry). Never a blank panel, never "undefined"/"NaN".
- Interaction: hover, focus-visible ring, active/pressed (scale .98), disabled styles on every control; buttons show
  spinners while pending; optimistic updates with undo toasts for reversible actions; confirm dialogs naming the
  item for destructive ones.
- Motion (meaningful only, all off under prefers-reduced-motion): screen enter (fade + 8px rise, 320ms), staggered
  lists (60–90ms), count-up numbers, SVG draw-in, particles along money paths, inspector slide, freeze frost,
  report stamp, golden-hour ring that turns red < 15 min. Animate only transform/opacity; 60fps.
- Microcopy: titles are questions ("Where did the money go?"); findings are one sentence with numbers; buttons are
  verbs ("Freeze 3 accounts"); no acronyms without a tooltip; "lead strength", never "guilty".
- Keyboard: Cmd/Ctrl-K palette, 1–6 to jump steps, F to freeze-from-selection, Esc closes overlays, ? shows
  shortcuts. Everything reachable by keyboard with visible focus.
- Consistency: one icon set, one radius scale, one shadow style, aligned baselines, numbers right-aligned in tables,
  identical chip styles for the same meaning across screens.

STEP 5: QUALITY GATES (must pass before finishing)
- tsc, vitest, backend pytest, all Playwright specs (golden path, case-sync, management, settings) green.
- UI scan on every v6 route at 1366 & 1440: 0 text < 12px, 0 contrast < 4.5:1 (3:1 for ≥ 18px), 0 "undefined"/
  "NaN", 0 console/page errors, 0 overlapping header elements, hero top edge < 260px at 1366×768.
- Case switch on every screen updates all numbers (screenshots for CASE-2026-001 and CASE-2026-003).
- Judge demo rewritten to walk the v6 steps; works offline.
- docs/redesign/index.html gallery: reference vs app side-by-side for every screen at both widths, plus a
  "before (legacy) vs after (v6)" section.
- When all pass: remove ?legacy=1 and delete old shell/screens/CSS that nothing imports.

RULES
- One commit per screen/step ("feat(v6): …"); never commit a non-building state; don't push or merge.
- Append to PROGRESS.md after each step: screen | status | gates | screenshot paths | gaps.
- If a sub-item is still blocked after 3 honest attempts, log it in PROGRESS.md with the exact error and move on.
```
