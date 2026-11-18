# Design System: TARKA Cyber-Forensic Investigation Platform

## Stack
- framework: React 19 + Vite 8
- styling: Tailwind CSS + CSS Custom Property Tokens (`tokens.css`, `bento-executive.css`, `liquid-glass.css`)
- components: Radix UI primitives (`@radix-ui/react-*`), Bespoke Forensic SVG/Canvas Kit (`@xyflow/react`, `d3-sankey`, `d3-shape`, `echarts`)
- animation: Framer Motion (`framer-motion` v14.9.0) + CSS spring & SVG stroke-dashoffset transitions (gated behind `prefers-reduced-motion`)
- typography: Inter (`@fontsource-variable/inter`) + JetBrains Mono (`@fontsource-variable/jetbrains-mono`) + `@number-flow/react`
- icons: Lucide React (`lucide-react`) with exact stroke weights (`strokeWidth={1.75}`)

## Tokens
- brand: `#4F46E5` (Primary Forensic Indigo)
- brand-subtle: `#EEF2FF`
- bg-base: `#F8FAFC` (Daylight Forensic) / `#0F1117` (Dark Pro)
- bg-surface: `#FFFFFF` / `#161B27`
- text-primary: `#0F172A` / `#F9FAFB`
- text-secondary: `#475569` / `#94A3B8`
- text-muted: `#64748B` / `#64748B`
- border-structural: `rgba(0, 0, 0, 0.08)` / `rgba(255, 255, 255, 0.08)`
- radius: `12px` (Cards), `8px` (Tiles & Panels), `6px` (Chips/Pills) — concentric radius rule: `outer = inner + padding + border`
- shadow: layered (`0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)`) with top specular highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.85)`)

### Semantic Forensic State Tokens
- **Verified T1 / Protected Clean Capital**: `#10B981` (Emerald)
- **Violated Invariant / Contradiction / Irrecoverable Cashout**: `#F43F5E` (Rose / Sentinel Coral)
- **Advisory / Suspect Conduit / Precursor Anomaly**: `#F59E0B` (Amber)
- **Informational / Proportional Merchant Lien**: `#0284C7` (Sky Blue)

## Decisions
- 2026-11-01 — init: `@lhi/ui-skill` systemic UI design engine activated. `vite-react-tailwind` preset loaded.
- 2026-11-01 — skills added: `ibelick/ui-skills` suite installed & activated (`baseline-ui`, `improve-ui`, `fixing-motion-performance`, `fixing-accessibility`, `component-canvas`, `create-canvas`, `ui-skills-root`).
- 2026-11-01 — v8.0 visual layer: Strict vertical height budget (`calc(100dvh - 52px)`), zero overflow at `1366×768`, `1536×864`, and `1920×1080`.
- 2026-11-01 — 9-point quality floor enforced: tokens-only, 4 interactive states, skeleton loader, empty state, WCAG AA, responsive collapse, reduced-motion guards.
- 2026-11-01 — Investigation Premium UI/UX initiative: Elevate tactile feedback, micro-interactions, dynamic evidence tooltips, and high-fidelity typography.
- 2026-11-01 — Four Taste & Polish Skills integrated:
  - `improve` (shadcn): Senior advisor audit, non-destructive enhancements, verified invariants.
  - `frontend-design`: Visual identity grounded in subject matter (Indian cyber-forensics, judicial evidence, banking/telecom rails, air-gap), elimination of generic AI defaults.
  - `better-ui` (jakubkrehel): Exact interactive physics (`enabled:active:scale-[0.96]`, `transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out`), optical alignment, zero `transition-all`.
  - `design-taste-frontend` (`taste-skill` v2): Anti-slop app screen rules (`references/app-screens.md`), color on data not chrome, KPIs as type not tiles, no ragged rows, `overscroll-behavior: contain`.

## Components Inventory
- **Global Shell**: `TarkaGlobalShell`, `TarkaCommandPalette`, `SarvamVoiceModal`
- **Kit Primitives (`src/components/tarka/kit/`)**:
  - `KpiTile`: Animated tabular-nums, untruncated labels, micro-visual gauges, tactile press contract
  - `StoryBanner`: 36px plain-English takeaway, 3 `EvidenceChip` pills, tactile focus states
  - `SectionCard`: Specular highlight, provenance tooltip, flex-1 body slot
  - `ScaleBar`: Precision horizontal instrument ruler with tolerance zones and non-overlapping pins
  - `RadialGauge`: SVG arc gauge with tick marks
  - `VerdictChip` & `EvidenceChip`: T1/T2/T3 indicators with SHA-256 hovercards and keyboard access
  - `GlossaryTerm`: Plain-English definitions for technical jargon with `role="term"`
  - `LinkLayer`: Responsive SVG cubic-bezier connector overlay with `ResizeObserver` & reduced-motion guard
  - `TimelineStrip`: Horizontal milestone sequence bar
  - `useFocusStore`: Linked hover highlighting across tables, graphs, and entities
- **Investigation Views**:
  - `01 IntakeScreen`: Ledger conservation waterfall, dual Claimed vs Booked bar, Finacle-NPCI RRN sync
  - `02 EntityResolutionScreen`: 3-column alias resolution bipartite map, Hard-Veto Shield
  - `03 AttributionScreen`: 10k-subscriber tower pool canvas, CGNAT port filter, Dual-SIM chassis
  - `04 FraudNetworkScreen`: Multi-layer actor topology graph, TTL tethering proof, I4C Samanvaya bar
  - `05 TaintEngineScreen`: Money flow Sankey, Dinic min-cut freeze budget, LIBR/FIFO/Pro-Rata comparison
  - `06 CourtProofScreen`: Leave-one-out claim-evidence matrix, BSA §63(4) certificates, CBI threshold

## Non-Goals
- No external CDN fonts, scripts, or map tiles (100% air-gap compliance)
- No artificial cartoonish animations that degrade evidentiary judicial gravitas
- No layout shifts or uncontained re-renders on hover
