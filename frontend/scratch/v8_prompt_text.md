<USER_REQUEST>
# MASTER V8.0 VISUAL LAYER & DATA-VISUALIZATION REBUILD PROMPT

## ROLE
You are a Principal Product Designer + Staff Frontend Engineer. Rebuild the **VISUAL LAYER** of TARKA (all 6 views: `01 intake`, `02 entities`, `03 attribution`, `04 network`, `05 taint-engine`, `06 court-proof`) into a world-class, judge-impressing cyber-forensic investigation platform. Logic, state, and statutory workflows are fixed; presentation, data visualization, visual hierarchy, and instant comprehension are yours.

---

## THREE TESTS EVERY SCREEN MUST PASS
1. **5-Second Test**: A non-technical judge can state what the screen proves from its **StoryBanner + Hero Visual** alone within 5 seconds.
2. **Wow Test**: Every screen features **ONE unmistakable Hero Data-Visualization** that makes the evidence physically visible (Waterfall, Bipartite Bezier Map, 10,000-Dot Haystack Matrix, Connected Topology Graph, Money-Flow Sankey, Claim–Evidence Support Matrix)—never flat walls of text or floating pills.
3. **Fit Test**: Zero overflow, zero text overlap, zero truncation (`...`) of numbers/KPI labels, and zero dead whitespace boxes at `1366×768`, `1536×864`, and `1920×1080`.

---

## NON-NEGOTIABLES & GUARDRAILS
1. **State & Math Integrity**: Do NOT break falsifier math, `ForensicMutatorContext` / `TarkaGlobalContext`, mutators, or statutory BNSS/BSA notice generators. Visuals read directly from state. Derived display values (e.g., net recovery potential after ATM cashout) must be pure selectors with Vitest unit tests and a provenance tooltip. Every number on screen must be state-derived; any illustrative telemetry attribute must carry an `"Illustrative"` badge.
2. **Conflict Transparency (`CONTENT_FLAGS.md`)**: If a mathematically derived value contradicts an existing static label/KPI (e.g., ₹5.00L stolen − ₹1.20L ATM cashout = ₹3.80L max recoverable vs. ₹5.00L label, or 98.4% vs. 100% survival), display the truthful derived value and log the discrepancy in `CONTENT_FLAGS.md` (`screen`, `field`, `previously_shown`, `derived_truth`).
3. **100% Air-Gap Compliance**: Zero external CDN fonts, scripts, map tiles, or remote workers. Light theme (`Daylight Forensic`) is default.
4. **Performance & Preserve Contracts**: Keep existing `data-testid` attributes, keyboard shortcuts, and mutator wiring. Interactions must complete in `< 10 ms` (update charts/canvases via props/refs, never full remounts).
5. **Accessibility**: WCAG AA contrast, color never the sole signal (pair with icons/patterns), every hero visual keyboard-reachable with a concise `aria-label` summary, and `prefers-reduced-motion` respected.

---

## DESIGN LANGUAGE: "DAYLIGHT FORENSIC"
- **Surfaces & Vertical Geometry Budget (`calc(100dvh - 52px)`)**:
  - Canvas background: `oklch(.975 .004 260)` (`#F8FAFC`).
  - Cards: Pure white (`#FFFFFF`), `1px solid oklch(.92 .01 260)` (`#E2E8F0`), `12px–14px` radius, subtle two-layer elevation shadow, `1px` inner top specular highlight.
  - **Kill Box-in-Box-in-Box**: Replace nested bordered boxes inside cards with clean hairline horizontal dividers (`border-slate-100`) and whitespace.
  - **Strict Vertical Height Budget (Prevents Bottom Clipping at 768p/864p)**:
    - Global Header: `52px` (`shrink-0`)
    - StoryBanner: `36px` (`shrink-0`, compact single-line bar)
    - KPI Row: `68px` on `<900px` height viewports, `76px` on `1080p` (`shrink-0`)
    - Main Stage Row: `flex-1 min-h-0` (Hero Card and Support Card fill 100% of remaining height with zero bottom clipping).
- **Color Discipline**:
  - Neutral slate by default; **ONE primary interactive accent (Indigo `#4F46E5`)**.
  - Semantic colors strictly reserved for evidentiary state:
    - **Emerald (`#10B981`)**: Invariant holds / Verified T1 / Protected clean capital
    - **Rose (`#F43F5E`)**: Violated invariant / Contradiction / Irrecoverable cash-out
    - **Amber (`#F59E0B`)**: Advisory / Suspect conduit / Precursor anomaly
    - **Sky (`#0284C7`)**: Informational / Proportional merchant lien
  - **Badge Diet**: Maximum ONE status pill per card header, maximum TWO chips per table/list row. Prefer icon + colored text over heavy background pills.
- **Typography**:
  - UI & Numerals: `Inter` / `Geist Sans` with `font-variant-numeric: tabular-nums`.
  - Monospace (strictly for SHA-256 hashes, UTR/RRN, IPs, hex bytes): `JetBrains Mono` / `Geist Mono`.
  - Hero KPI numerals: `26px–32px` bold `tabular-nums`. Minimum font size anywhere: `12px` (chart axis ticks `11px` min). **Zero text truncation (`...`) on KPI titles or step rows.**
- **Motion**:
  - `120ms` hover, `200ms` tab/toggle, `320ms` spring for verdict flips and number counters.
  - Reserve animated dash/beam effects strictly for active flow paths and verdict elements (maximum one animated focal effect per screen).

---

## LIBRARY & COMPONENT STACK
Check `package.json` first and verify clean Vite 8 + React 19 compatibility:
- **Charts & Visualizations**: Use `echarts` (`echarts/core` tree-shaken with Canvas renderer + `ResizeObserver`) OR build deterministic, high-DPI HTML5 `<canvas>` / bespoke responsive `<svg>` components wrapped in a unified `<TarkaChart>` container so there are zero WASM/worker build failures.
- **Node Graphs**: Use `@xyflow/react` (with deterministic layered/radial coordinate layout) OR a precision responsive SVG node-edge engine where every edge attaches mathematically to node port coordinates via `ResizeObserver` (`LinkLayer`).
- **Code / XML / SMT2 Panels**: Replace all dark `#0F172A` terminal boxes with a **Light-Mode Syntax Highlighted Panel** (`#F8FAFC` background, `#E2E8F0` border, crisp indigo/emerald/amber token coloring, line-wrapped).
- **Shared Kit (`frontend/src/components/tarka/kit/`)**:
  Build and reuse across all 6 views:
  1. `KpiTile`: Icon well, **FULL untruncated label**, animated `tabular-nums` value, and a `24px` right-hand micro-visual (progress ring, spark-bar, or threshold gauge).
  2. `StoryBanner`: Compact `36px` bar directly below header displaying one state-templated plain-English takeaway sentence + 3 `EvidenceChip` pills + the `"Explain simply"` toggle.
  3. `SectionCard`: Crisp title row with `ⓘ` provenance tooltip + `flex-1 min-h-0` body slot.
  4. `ScaleBar`: Precision horizontal instrument ruler with colored zones, target threshold line, tolerance band, and non-overlapping marker pin (label above band, value below pin).
  5. `RadialGauge`: Clean SVG arc gauge with tick marks.
  6. `VerdictChip` & `EvidenceChip`: Shows Tier icon (`T1`/`T2`/`T3`) + artifact name; hovering opens a `HoverCard` with SHA-256 digest and custody status.
  7. `GlossaryTerm`: Dotted underline on technical jargon (`Z3 SMT`, `CGNAT`, `IPDR`, `LIBR`, `Min-Cut`, `JA4`, `RRN`, `STAN`, `TAC`, `IMSI`) with a plain-English `HoverCard` definition when `"Explain simply"` is active.
  8. `LinkLayer`: Responsive SVG cubic-bezier connector overlay that links DOM anchor elements across columns and recomputes cleanly on `ResizeObserver`.
  9. `TimelineStrip`: Horizontal milestone sequence bar.
  10. `useFocusStore`: Zustand store enabling linked hover highlighting across tables, graphs, and entities.

---

## GLOBAL SHELL (ALL 6 VIEWS)
1. **Left Rail (`72px` collapsed / `232px` expanded via `Ctrl+B`)**:
   - Top FIR chip (`FIR #149` popover with case title, complainant, loss amount).
   - 6 numbered engine items connected by a vertical case-journey progress line (`1 → 6`):
     - `01 Intake` · `02 Entities` · `03 Attribution` · `04 Network` · `05 Taint` · `06 Court`
   - Each item shows a Lucide icon, `11px–12px` label, and a semantic verdict ring around the icon.
2. **Global Header (`52px`, CSS Grid `auto minmax(0,1fr) auto`, zero collisions)**:
   - **Left**: `[FIR Chip] · [Page Title] · [Z3 Status Chip]`
   - **Center**: **Interactive Case Clock Scrubber** — a tactile slider track with 4 milestone nodes (`T+0m Intake`, `T+15m Attribution`, `T+2.5h Lien`, `T+48h Court`), animated thumb, keyboard support, and a compact radial countdown ring for the `1930 Golden Hour SLA` derived from the active clock state.
   - **Right**: `[⚡ Mutator Dropdown] · [Export §63 PDF] · [⋯ Menu (Voice AI, Density: Comfortable | Compact, Explain Simply)]`.

---

## VIEW-BY-VIEW REBUILD SPECIFICATIONS (EXECUTE IN THIS ORDER)

### 1. VIEW 04: NETWORK (`?view=network` — "Who is behind the accounts?")
- **KPI Labels (Full, Zero Truncation)**:
  1. `"Actors linked"` (`4 Mules → 1 Cluster`)
  2. `"Tethering proof"` (`TTL = 64 Direct` or `TTL = 63 Hotspot`)
  3. `"TLS fingerprint match"` (`JA4 Match 4/4`)
  4. `"Inter-state linkage"` (`14 FIRs · 5 States`)
- **HERO VISUAL (Left `col-span-7`, fills 100% of card height — NO dead whitespace)**:
  - **Connected Multi-Layer Actor Topology Graph**:
    - Nodes: **Kingpin Handset (`IMEI 86749206...`)**, **Hotspot AP (`Poco X5 · BSSID 74:DA:38:A2:11:BC`)**, **Cell Tower (`DL-TWR-891`)**, **4 Accounts (`L1 Vikram Shah`, `L2A Rohit Verma`, `L2B Sameer Khan`, `Sink Paytm #1109`)**, and **Shared Hub Nodes (`JA4 Fingerprint t13d1516h2`, `Shared CAF Introducer`, `C2 Telegram Bot`)**.
    - **CRITICAL FIX**: Every SVG edge MUST physically attach from source node handle to target node handle (eliminate the current mid-air floating arrows and the empty whitespace gap!).
    - Edge styling: Inline label chip (`"TTL 64→63"`, `"JA4 4/4"`, `"Same CAF Introducer"`, `"OTP Forwarded"`), stroke width proportional to evidentiary weight, color-coded by link type, with smooth animated dash flow.
    - Interactive Legend Filter Toggles (filter by the 4 edge types) + Layout Switcher (`Layered | Radial`).
    - Clicking `"Simulate Hotspot (TTL=63)"` animates the hotspot tethering edge and synchronizes both the KPI card and graph state (`single source of truth`).
- **SUPPORT PANEL (Right `col-span-5`, fills 100% of height)**:
  - **Top Card — Light-Mode `<Device>` XML & Telemetry Provenance**:
    - Replace the dark terminal box with a crisp **Light-Mode Syntax-Highlighted View** (`#F8FAFC`) where each attribute (`mobile`, `geocode`, `bssid`, `tls_ja4`, `imei_tac`) displays an explicit provenance chip (`[NPCI Device XML]`, `[PSP TLS Telemetry]`, `[Tower Log]`, or `[Illustrative]`).
  - **Bottom Card — Cross-State Exposure & I4C Samanvaya Bar**:
    - Stacked horizontal bar by state (`UP ₹3.85Cr`, `MH ₹2.60Cr`, `KA ₹1.95Cr`, `GJ ₹1.22Cr`, `DL ₹0.80Cr`) with a vertical crimson threshold line at **`₹10.00 Cr (CBI Mandate)`**, FIR counts per state, and the `[Copy Inter-State Syndicate Report (I4C Format)]` CTA.

---

### 2. VIEW 05: TAINT (`?view=taint-engine` — "Where did the money go and what can we hold?")
- **KPI Labels (Full, Zero Truncation)**:
  1. `"Victim loss"` (`₹5,00,000`)
  2. `"Recoverable (LIBR)"` (Dynamically shows true recoverable sum, e.g., `₹3.80L` after deducting `₹1.20L` ATM cashout, or `₹5.00L` gross trace — log in `CONTENT_FLAGS.md`)
  3. `"Min-cut freeze"` (`K = 3 Accounts`)
  4. `"Innocent capital protected"` (`₹0` baseline → `₹2,50,000` when clean deposit injected)
- **HERO VISUAL (Left `col-span-8`, fills 100% of card height)**:
  - **ToggleGroup in Card Header**: **`[ 🌊 Money Flow Sankey ]`** (Default) | **`[ 🕸️ Time-Expanded DAG ]`** + `[ + Inject Clean Deposit (+₹2.5L) ]`.
  - **Sankey / Flow Diagram**:
    - Width of every flow ribbon is strictly proportional to rupee amount (`₹5.00L` splits into `₹3.00L (60%)` to `Rohit Verma` and `₹2.00L (40%)` to `Sameer Khan`).
    - Nodes & flows color-coded by legal treatment:
      - **Held in Mule Conduit (`§107 Attach`)**: Amber (`Vikram`, `Rohit ₹1.20L retained`, `Sameer ₹0.80L retained`)
      - **Bona-Fide Merchant (`§106 Specific Lien Only`)**: Sky/Emerald (`Apex Electronics ₹1.80L lien` + advisory chip `"Value-Given: Retail POS Goods"`). When `+₹2.5L Clean Deposit` is injected, render a distinct **Green Inbound Clean Revenue Stream (`₹2.50L`)** flowing into Apex Electronics that visibly bypasses the §106 lien lock!
      - **Cashed Out (`Unrecoverable ATM Sink`)**: Rose (`Noida Sec 18 ATM ₹1.20L dispensed`).
    - **Docked Bottom Control**: **Dinic Min-Cut Freeze Budget (`K = 1..6`)** with a stepped mini-chart of leakage vs. $K$, optimum $K=3$ marked, and a crisp **Scissors `✂` Cut Marker** on the frozen graph nodes.
- **SUPPORT PANEL (Right `col-span-4`, zero bottom clipping on CTA!)**:
  - **Card 1 — Dual Containment & Recovery Waterfall**:
    - Side-by-side metrics: **Flow Containment (`100% · 0 Open Exits`)** AND **Net Recoverable Potential (`₹3,80,000 / 76%` held vs `₹1,20,000 / 24%` ATM cashout)** shown as a mini horizontal waterfall (`Stolen ₹5.0L` → `−₹1.2L ATM Cashout` → `₹2.0L Mule §107 Hold` + `₹1.8L Merchant §106 Lien`).
  - **Card 2 — Shared-Axis 3-Rule Comparison (`LIBR` vs `FIFO` vs `Pro-Rata`)**:
    - Render as **3 horizontal bars on ONE shared rupee axis** so when the user clicks `+ Inject Clean Deposit (+₹2.5L)`, the bars visibly diverge (`LIBR: ₹3.80L`, `FIFO: ₹2.00L`, `Pro-Rata: ₹2.74L`)!
  - **Card 3 — MHA 2026 SOP Clock (`TimelineStrip`: `24h §106(3)` → `7d Notice` → `15d Appear` → `90d §107 Restore`) + Unclipped Full-Width CTA Button (`[ Open MHA SOP & BNSS Order Modal ]`)**.

---

### 3. VIEW 03: ATTRIBUTION (`?view=attribution` — "Which single handset did this?")
- **KPI Labels (Full, Zero Truncation)**:
  1. `"Candidate pool"` (`1 Handset`)
  2. `"Random-match odds"` (`1 in 7.14M`)
  3. `"Precursor SIM-swap"` (`09:44:12 IST`)
  4. `"Hardware twin"` (`Dual-SIM Match`)
- **HERO VISUAL (Left `col-span-7`, zero dead space above/below)**:
  - **"Haystack → Needle" 10,000-Subscriber Canvas + Sankey Funnel**:
    - Top interactive visualization: A crisp high-DPI canvas/SVG grid representing the tower pool (`10,000 subscribers`, seeded PRNG for 100% determinism, caption: *"Grid encodes active tower subscriber pool; highlighted nodes represent surviving CGNAT port candidates"*).
    - As the 4 bank login steps (`Step 1 SBI: 340` → `Step 2 HDFC: 41` → `Step 3 Axis: 6` → `Step 4 Paytm: 1 ★`) are toggled, non-matching dots fade to subtle slate and surviving candidates glow indigo/emerald, converging on the single pulsing emerald target (`IMEI 867492061234564`)! Clicking `[Drop Port]` smoothly animates the pool expanding back to `340`.
    - Below the visual: **4 Clean Step Cards** (no truncated text!) showing Login Time, Bank, Port Pool, and a mini horizontal candidate ratio bar (`340`, `41`, `6`, `1`), plus a 2-bar comparison for **`Path A (Port-Omitted Intersection: 1)` vs `Path B (DoT 39.20 ISP Port Translation: 1)`**.
- **SUPPORT PANEL (Right `col-span-5`)**:
  - **Card 1 — SIM-Swap Precursor TimelineStrip & Dual-SIM Chassis SVG**:
    - Visual `TimelineStrip` showing `09:44:12 IST SIM-Swap (Legacy IMSI → New IMSI)` ──`[16m Pre-Attack Window]`──► `10:00:14 IST ₹5.00L Debit`.
    - Clean SVG **Dual-SIM Hardware Chassis Diagram**: shows `[Slot 1: Airtel IMEI ...564 (Luhn ✓)]` and `[Slot 2: Jio IMEI ...572 (Luhn ✓)]` feeding into one unified `Exynos 1280 Motherboard (Shared TAC 86749206)`.
  - **Card 2 — Random-Match Log ScaleBar & Z3 Clock-Offset Caliper**:
    - Log-axis `ScaleBar` for `P = 1.4 × 10⁻⁷` (labeled `"Heuristic display bands, not a statutory standard"` — remove the phrase `"Beyond Doubt"`).
    - Non-overlapping `ScaleBar` for Z3 Clock Offset `[-1.2s, +0.8s]` (label cleanly above the green band, `Δ = 0.0s` below the marker pin!).
    - Collapsible **Light-Mode Shiki/Syntax Panel** (`"Show Z3 SMT-LIB2 Proof Script ▾"`) + `[Copy §94 BNSS IMEI Seizure Directive]`.

---

### 4. VIEW 02: ENTITIES (`?view=entities` — "Who is who?")
- **KPI Labels (Full, Zero Truncation)**:
  1. `"Raw identifiers"` (`24 Mentions`)
  2. `"Canonical entities"` (`5 Profiles`)
  3. `"Merges vetoed"` (`1 Shielded`)
  4. `"Social-eng. vectors"` (`2 Active Lures`)
- **HERO VISUAL (Left `col-span-7`, fills 100% of card height)**:
  - **3-Column "Alias Resolution Bipartite Map" with Live SVG `LinkLayer` Beziers**:
    - **Column 1 (`5 Evidence Sources`)**: Filterable source nodes (`WhatsApp`, `Phishing APK`, `SBI/HDFC CBS`, `Airtel CDR`, `ICICI POS`).
    - **Column 2 (`12 Raw Extracted Tokens`)**: Compact token cards (`VPA vikram.pay@okaxis`, `MSISDN +91-9871123941`, `Narration VIKRAM_MULE`, `C2 IP 103.21.144.92`, `READ_SMS OTP Sniff`, `GSTIN 07AAACA...`, etc.).
    - **Column 3 (`5 Canonical Entities`)**: `ENT-01 Sunil Kumar`, `ENT-02 Vikram Shah`, `ENT-03 Rohit Verma`, `ENT-04 Sameer Khan`, `ENT-05 Apex Electronics`.
    - **Live SVG Bezier Connectors (`LinkLayer`)**: Connects Sources → Raw Tokens → Canonical Entities! Stroke thickness = match confidence; solid line = deterministic key match; dashed line = behavioral/network link. Hovering any entity illuminates all its upstream tokens and dims the rest!
    - **The Star Visual (Hard-Veto Guardrail)**: Draw a prominent **dashed rose Bezier line between `ENT-03 (Rohit Verma)` and `ENT-05 (Apex Electronics)` terminating at a central `⛔ HARD-VETO SHIELD` badge** (`Active GSTIN + 420 Retail POS Inflows + 0 Device Overlap prevents false mule merge`).
- **SUPPORT PANEL (Right `col-span-5`, auto-stacked with zero dead space)**:
  - **Selected Entity Dossier Card**: Initials avatar, role chip, **"Lead Strength" `ScaleBar` (`0–100`)** with 4 sub-factor bars (`Pass-Through Velocity`, `Device/JA4 Overlap`, `Structuring`, `KYC Completeness`) + explicit disclaimer badge: **`"Investigative lead score, not a judicial finding"`**.
  - **Social-Engineering & Phishing Vector Card + `[Copy §94 BNSS KYC/CAF Production Order]` CTA**.

---

### 5. VIEW 06: COURT PROOF (`?view=court-proof` — "Would it survive cross-examination?")
- **KPI Labels (Full, Zero Truncation)**:
  1. `"Findings surviving"` (`5 of 5 Material Claims` — replaces ambiguous `98.4%` vs `100%` mismatch!)
  2. `"§63(4) certificates"` (`Parts A & B Ready`)
  3. `"Paper seal"` (`RFC-3161 / Ed25519`)
  4. `"CBI threshold"` (`₹10.42 Crore`)
- **TAB 1 HERO (`Leave-One-Out Defense Stress-Tester`)**:
  - **Left (`col-span-7`) — Interactive "Claim × Evidence Support Matrix"**:
    - Rows = **5 Material Prosecution Findings** (`1. ₹2.00L Hidden Debit`, `2. Single-Handset CGNAT Attribution`, `3. Accomplice Hotspot Tethering`, `4. Multi-Hop Mule Taint Flow`, `5. ₹1.80L Proportional Merchant Lien`).
    - Columns = **5 Ingested Artifacts** (`#01 Video Screenshot [T2]`, `#02 SBI CBS Ledger [T1]`, `#03 NPCI Switch Log [T1]`, `#04 Airtel CGNAT IPDR [T1]`, `#05 WhatsApp Export [T2]`).
    - Cells show support weight (`● Primary T1 Proof`, `◐ Corroborative T2`, `—`).
    - Clicking an artifact column header (or clicking one of the **3 Defense Challenge Deck Cards** below: `Exclude WhatsApp & Screenshot`, `Bank Clock Drift +45s`, `Shared Device Alibi`) greys out that column and dynamically updates row survival badges (`✓ Survives on ≥1 T1 Record` in Emerald vs `⚠ Tier-2 Only` in Amber vs `✗ Unsupported` in Rose)!
  - **Right (`col-span-5`) — Structured Rebuttal Brief & Custody Pyramid**:
    - Clean bulleted Prosecutor Rebuttal using `EvidenceChip` pills.
    - **CRITICAL TEXT FIXES**: Strip all literal markdown asterisks (`*Arjun Panditrao Khotkar*` → render in clean italics `Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal (2020) 7 SCC 1`). Replace `"ISO 17025 Certified"` with `"Examiner qualification: see Schedule B"`.
- **TAB 2 (`BSA §63(4) Split Certificates & Offline Verifier`)**:
  - Left: Printable judicial bond-paper certificate preview (`Schedule B Expert`, `Schedule A SBI`, `Schedule A Airtel`, `Schedule A Handset`) with hash table and signature blocks.
  - Right: QR Seal + 24-Word Phonetic Verification Matrix + `[Export Standalone verify.html]`.
- **TAB 3 (`CBI ₹10.42 Cr Multi-State Syndicate & STR Audit`)**:
  - Left: **CBI Threshold Thermometer `ScaleBar`** showing stacked state segments (`UP ₹3.85Cr`, `MH ₹2.60Cr`, `KA ₹1.95Cr`, `GJ ₹1.22Cr`, `DL ₹0.80Cr` = `₹10.42 Cr`) crossing the **`₹10.00 Cr DSPE Act §6 Line`**.
  - Right: **Click-to-Audit Executive STR Narrative** (clicking each sentence highlights its underlying FIR and artifact SHA-256 hashes) + **MHA 2026 SOP Order Switcher (`§168 r/w §94`, `§106 Lien`, `§107 Attach`, `§497/503 Victim Restoration`)**.

---

### 6. VIEW 01: INTAKE (`?view=intake` — Polish & Refine)
- **KPI Labels (Full, Zero Truncation)**:
  1. `"Ledger conservation"` (`100% Valid` / `Row #14 Fail`)
  2. `"NPCI RRN clock sync"` (`10:00:14 IST · Δ +14s`)
  3. `"Claim vs. booked"` (`-₹2,00,000.00`)
  4. `"Civilian PII blinded"` (`9,996 / 10,000`)
- **Refinements**:
  1. **Dual "Claimed vs. Booked" Visual Bar**: Above the ledger table, render a crisp 2-segment proportional bar comparing `Claimed Receipt: ₹15,000 (7%)` against `Booked Finacle CBS Debit: ₹2,15,000 (93% hatched rose = ₹2,00,000 hidden deficit · 14.3× suppression)`.
  2. **Bottom Conservation Waterfall**: Replace the 4 static synthesis text boxes below the table with a horizontal **4-Bar Accounting Waterfall**: `Opening (₹6,15,890)` → `+ Credits (+₹1,25,000)` → `− Debits (−₹2,32,650)` → `Closing (₹5,08,240)` with a live `Residual: ₹0.00 ✓` badge (which turns crimson `-₹2,00,000.00 ✗` when Row #14 is tampered!).
  3. **Fix Overlapping Ruler Label in `RRN` Tab**: On the `CBS Finacle ↔ NPCI Switch NTP Stratum-2 Sync` `ScaleBar`, place `"ADMISSIBLE BOUND (±180s)"` cleanly above the green tolerance band and `Δ = +14.0s` below the marker pin so they never collide! Rename `"ADMISSIBLE"` chip to `"Integrity checks pass"`. Remove unsourced footer strings (`"RBI Circular Compliant"`, `"SBI-FINACLE-10.2-PROD"`).

---

## QUALITY & VERIFICATION GATES
1. **Build & Type Check**: Run `npm run build` (`tsc -b && vite build`) — must pass with **0 errors**.
2. **Geometry & Zero-Overflow Audit**: Verify across all 6 views (`intake`, `entities`, `attribution`, `network`, `taint-engine`, `court-proof`) that `scrollContainer.scrollHeight === scrollContainer.clientHeight` holds at `1366×768`, `1536×864`, and `1920×1080` with zero clipped buttons, zero overlapping ruler labels, and zero truncated KPI titles.
3. **Mutator Live Reactivity**: Verify that triggering `alterBankRow14`, `forgeRrnTimestamp`, `dropCgnatSourcePort`, `triggerHotspotCollision`, and `injectMerchantCleanDeposit` immediately updates both the `StoryBanner` and the Hero Visuals on all affected screens.
4. **Deliverables**: Output `CONTENT_FLAGS.md` documenting all reconciled metric discrepancies, list of modified files, and verification summary.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-01T11:56:21+05:30.

The user's current state is as follows:
Active Document: e:\Tarka_v3\tarka\frontend\src\pages\v5\AttributionScreen.tsx (LANGUAGE_UNSPECIFIED)
Cursor is on line: 1
Other open documents:
- e:\Tarka_v3\tarka\frontend\src\styles\liquid-glass.css (LANGUAGE_UNSPECIFIED)
- e:\Tarka_v3\tarka\frontend\src\components\graphs\ProvenanceDAGView.tsx (LANGUAGE_UNSPECIFIED)
- e:\Tarka_v3\tarka\frontend\src\styles\tokens.css (LANGUAGE_UNSPECIFIED)
- e:\Tarka_v3\tarka\frontend\src\index.css (LANGUAGE_UNSPECIFIED)
- e:\Tarka_v3\tarka\frontend\index.html (LANGUAGE_UNSPECIFIED)

The user has uploaded 5 image(s):
- C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe/.user_uploaded/media_1793514279485_c1e2d0e9.jpg
- C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe/.user_uploaded/media_1793514292915_288bc9c9.jpg
- C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe/.user_uploaded/media_1793514324918_42087e77.jpg
- C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe/.user_uploaded/media_1793514333868_7826d6bb.jpg
- C:/Users/User/.gemini/antigravity/brain/249cd97f-a6aa-46cc-9ccf-37d2236e6dbe/.user_uploaded/media_1793514343482_3b24a946.jpg
You can embed these images in an artifact if you need the USER to review them.
</ADDITIONAL_METADATA>