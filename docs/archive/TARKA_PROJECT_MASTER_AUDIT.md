# TARKA v5.5 — MASTER ARCHITECTURAL & TECHNICAL FORENSIC AUDIT
**The Mathematical Truth Engine for Cyber-Financial Crime & Judicial Restitution**
*Compiled for Engineering Handover, AI Ingestion, and Full-Stack Enhancement*

---

## 1. PROJECT IDENTITY & DOMAIN CONTEXT

### 1.1 The Core Problem
In cyber-financial crime across India (digital arrests, mule-account networks, instant loan apps, UPI phishing):
1. **Photoshop / Canva Forged Evidence**: Complainants and fraudsters submit manipulated screenshots or bank receipts (e.g. claiming ₹15,000 paid while Finacle CBS registers ₹2,15,000 debit). Naive visual inspection by police officers and judges misses dual `%%EOF` incremental revisions in PDFs.
2. **Carrier-Grade NAT (CGNAT) Misattribution**: Telecom carriers allocate a single public IPv4 address to 340+ simultaneous mobile handsets. When bank servers omit the ephemeral source port from ingress logs, naive IP matching accuses innocent citizens or collapses under court cross-examination.
3. **Blanket Freezing vs Commercial Paralysis**: Police routinely execute blunt account freezes under old Section 102 CrPC. Legitimate commercial merchants (POS terminals, retail outlets) have their entire operational capital locked, triggering High Court writ petitions and stalling restitution.
4. **Commingled Fund Tracing**: Fraud money mixes with clean corporate revenue. Courts lack a standardized mathematical framework to determine how much money is legally recoverable under statutory accounting rules (*Roscoe v. Winder* vs FIFO vs Pro-Rata).
5. **New Criminal Laws Admissibility Mandate**: Under **Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023** and **Bharatiya Sakshya Adhiniyam (BSA), 2023** (replacing CrPC 1973 and Indian Evidence Act 1872), digital evidence requires strict Section 63 dual certification, cryptographic hash chaining, and formal mathematical proofs to survive judicial scrutiny.

### 1.2 What TARKA Does
TARKA (**तर्क** — Sanskrit for *Dialectical Logic & Proof*) is an air-gapped, court-admissible forensic workstation that replaces discretionary human opinion with **SMT formal verification (Z3 Theorem Prover)**, **max-flow min-cut algorithms (Dinic)**, and **cryptographic Merkle trees**. It transforms raw bank ledgers, telecom IPDRs, and switch logs into deterministic legal proof packs admissible in Indian courts.

---

## 2. SYSTEM ARCHITECTURE & TECHNICAL STACK

### 2.1 Backend Architecture
- **Language & Runtime**: Python 3.12 / 3.14, FastAPI daemon running on `http://127.0.0.1:8000`.
- **Formal Verification Engine**: Microsoft Z3 SMT Solver (`z3-solver` Python library) for mathematical satisfiability checks of clock offsets, double-entry conservation, and ledger consistency.
- **Graph & Optimization Engine**: `NetworkX` implementing Dinic's Algorithm for minimum-cut polynomial-time freeze budget calculation.
- **Cryptographic Engine**: SHA-256 Merkle tree hashing, Ed25519 asymmetric signature generation, BIP-39 mnemonic seed phrase derivation, and HMAC-SHA256 salted blind indexing.
- **Storage & Evidence Pipeline**: Air-gapped local storage with immutable content-addressable storage (CAS) hashes.

### 2.2 Frontend Architecture
- **Framework & Build**: React 19, TypeScript 5.8, Vite 8 (Hot Module Replacement, production build < 700ms).
- **Design System & Styling**:
  - **Light-Mode Daylight Executive Aesthetic**: Clean boardroom theme (`#FFFFFF`, `#F8FAFC`, `#0F172A`, `#E2E8F0`). Zero dark-mode neon gimmicks.
  - **CSS Framework**: Tailwind CSS v4 + custom Bento design tokens (`bento-executive.css`).
  - **Component Primitives**: Radix UI (shadcn/ui), ReUI Registry primitives (Data Grid, Frame, Stepper, Badge, Alert, Number Flow).
  - **Data Visualization**: Dynamic relative SVG pipelines, `@xyflow/react` Merkle DAGs, Recharts, and HTML5 Canvas.
  - **Typography**: `@fontsource-variable/inter` (UI & numbers with `font-variant-numeric: tabular-nums`) and `@fontsource/jetbrains-mono` (hashes, UTRs, IP addresses, bytes).
- **State Management**:
  - `TarkaGlobalContext.tsx`: Manages case mutations, live judge mutators, FIR context, and timeline steps.
  - `useTarkaUiStore.ts`: Lightweight Zustand store for UI focus (selected table rows, inspector dock tabs, view density toggle).
  - Strict air-gap policy: **Zero runtime external CDN dependencies**.

---

## 3. GLOBAL WORKSTATION CONTRACTS

### 3.1 Zero-Scrollbar Metric Contract
The workstation layout operates on an application contract:
- Root content area: `height: calc(100dvh - 56px)` with `overflow: hidden`.
- Mandatory target viewports: `1440×900`, `1536×864` (standard Indian judicial and police laptops), `1366×768`, and `1920×1080`.
- Cards never cause window scrollbars (`scrollContainerClient === scrollContainerScroll`). All scrollable listings scroll internally via `ScrollArea`.

### 3.2 View Density Toggle: Standard vs Small View
Located in the global header, the sliding density toggle switches between:
- **Standard (`density === "comfortable"`)**: Full padding, expanded font hierarchies, and detailed data annotations.
- **Small View (`density === "compact"`)**: Tightened paddings (`8px 12px`), reduced card headers, and compact layout footprints ensuring 100% above-the-fold visibility on smaller screens.

### 3.3 Live Judge Mutator System
The header includes a **`⚡ Mutator`** dropdown that allows judges and defense counsels to inject live evidentiary challenges into any screen:
- `alterBankRow14`: Alters Row #14 Finacle balance by ₹2,00,000 to test double-entry invariant detection.
- `forgeRrnTimestamp`: Injects a 45-second clock desynchronization into the NPCI RRN.
- `dropCgnatSourcePort`: Drops the bank CBS ephemeral source port to test CGNAT multi-session candidate set intersection.
- `triggerHotspotCollision`: Decrements cellular TTL from 64 to 63 to simulate Wi-Fi hotspot alibi tampering.
- `INJECT_CLEAN_DEPOSIT`: Injects ₹2,50,000 legitimate revenue into the commercial merchant account to test *Roscoe v. Winder* working capital shielding.

---

## 4. DETAILED SCREEN AUDIT & SPECIFICATIONS

---

### SCREEN 1: Evidence Intake & Ledger Falsification
**Route**: `?view=intake` or `tab=intake`
**Primary File**: [`frontend/src/pages/v5/IntakeScreen.tsx`](file:///e:/Tarka_v3/tarka/frontend/src/pages/v5/IntakeScreen.tsx)
**Sub-Components**: [`IntakeKpiCard.tsx`](file:///e:/Tarka_v3/tarka/frontend/src/components/tarka/intake/IntakeKpiCard.tsx), [`GateRail.tsx`](file:///e:/Tarka_v3/tarka/frontend/src/components/tarka/intake/GateRail.tsx), [`LedgerCard.tsx`](file:///e:/Tarka_v3/tarka/frontend/src/components/tarka/intake/LedgerCard.tsx), [`InspectorDock.tsx`](file:///e:/Tarka_v3/tarka/frontend/src/components/tarka/intake/InspectorDock.tsx).

#### 1. Purpose & Legal Context
- Detects fraudulent alterations in bank transaction statements and PDF receipts submitted by complainants or accused syndicates.
- Disproves false alibis under Section 94 BNSS (court summons for electronic record production).
- Enforces strict mathematical accounting conservation before evidence can be passed to subsequent attribution or lien stages.

#### 2. Key UI Sections & Layout Architecture
1. **Top KPI Strip (4 Bento Cards)**:
   - `Ledger Conservation`: Validates double-entry accounting (`100% Valid` or `BROKEN`).
   - `NPCI RRN Clock Sync`: Dissects RRN `626510149921` against Finacle timestamp (`10:00:14 IST`, drift `Δ +16s`).
   - `Claim vs CBS Deficit`: Displays `-₹2,00,000.00` suppression delta (`14.3x Overwrite`).
   - `Evidence Integrity`: Shows 10,000-sample differential privacy and hash blinding index (`9,996 / 10,000`).
2. **Falsification Gate Rail (5 Mathematical Invariant Stations)**:
   - `I1 Balance`: Double-Entry Conservation ($\text{Bal}[k] = \text{Bal}[k-1] + \text{Cr}[k] - \text{Dr}[k]$).
   - `I2 RRN Clock`: Julian Day & STAN time synchronization ($\Delta t \le 16\text{s}$).
   - `I3 Settlement`: NEFT/RTGS batch clearing cycle window bounds.
   - `I4 PDF Revision`: Binary xref parser flagging `WARN 2 %%EOF` trailers.
   - `I5 Privacy Shield`: Redaction and salt-blinding of non-accused party PII.
3. **Discrepancy Strip & Contrast Pill**:
   - Compares: `Naive Visual Inspection: Sees ₹15,000 Receipt (Misses ₹2.00L)` $\longrightarrow$ `TARKA Mathematical Gate: Catches ₹2,15,000 Finacle Debit + Dual %%EOF Append`.
   - **Actionable Directive**: `[ 📋 Copy §94 BNSS CBS Verification Directive ]` button generates a statutory requisition to the SBI Nodal Officer.
4. **Interactive Resizable Workspace**:
   - **Left Panel (Ledger Grid)**: Interactive transaction table with expandable rows, editable balances, sorting, and inline search (triggered via `/`).
   - **Right Panel (Inspector Dock - 4 Forensic Tabs)**:
     - `RRN Lab`: 12-digit dissector (`Y DDD HH STAN`) breaking Julian day `265` to September 22, 2026.
     - `PDF 2 %%EOF`: Byte-level revision diff comparing Rev 1 (Finacle Original: `0x00..0x14208`) with Rev 2 (Canva Incremental Append: `0x14209..0x15080`).
     - `Privacy Shield`: Demonstrates differential privacy blinding.
     - `Z3 SMT Proof`: Displays formal SMT solver satisfiability proofs.

---

### SCREEN 2: CGNAT Attribution & Hardware Twin
**Route**: `?view=attribution`
**Primary File**: [`frontend/src/pages/v5/AttributionScreen.tsx`](file:///e:/Tarka_v3/tarka/frontend/src/pages/v5/AttributionScreen.tsx)
**Sub-Engine**: [`frontend/src/utils/cgnatAttribution.ts`](file:///e:/Tarka_v3/tarka/frontend/src/utils/cgnatAttribution.ts)

#### 1. Purpose & Legal Context
- Solves the telecom Carrier-Grade NAT (CGNAT) multi-tenancy challenge where 340 subscribers share the public IP `103.21.144.92`.
- Neutralizes false alibis of passive IMEI cloning, tower clock skew, and Wi-Fi hotspot tethering.
- Generates enforceable requisitions under **DoT License Mandate Clause 39.20** and **Section 94 BNSS**.

#### 2. Key UI Sections & Layout Architecture
1. **Top KPI Strip (4 Bento Cards)**:
   - `CGNAT Candidate Pool`: Shows survivor count (`1 Handset INDIVIDUATED`).
   - `Coincidental Match Odds`: Displays `1 in 7.14M (P = 1.4 × 10⁻⁷)` with `99.9998% Bayesian Credibility`.
   - `Network Hop TTL`: Displays `TTL = 64` (Direct 4G/5G connection) or `TTL = 63` (Tethered Hotspot).
   - `Hardware Chassis Twin`: Shows `Dual-SIM Match` with Luhn check digit confirmation.
2. **CGNAT Candidate Intersection Funnel**:
   - 4-Stage visual funnel showing candidate elimination across banking sessions:
     - Step 1 (SBI Mule 1083): $S_1 = 340$ active handsets in port block 44000–44511.
     - Step 2 (HDFC Mule 9920): $S_1 \cap S_2 = 41$ surviving handsets.
     - Step 3 (Axis Mule 4102): $S_1 \cap S_2 \cap S_3 = 6$ surviving handsets.
     - Step 4 (Paytm Sink 1109): $S_1 \cap S_2 \cap S_3 \cap S_4 = 1$ unique target handset (`Target IMEI 867492061234564`).
   - Header button: `[ 📋 Copy DoT 39.20 Requisition ]` generates statutory order for telecom IPDR translation.
3. **Interactive Forensic Deep Dive Cards**:
   - `Wi-Fi Hotspot Tethering Topology`: Evaluates packet time-to-live (TTL). Direct packets arrive with $\text{TTL}=64$; hotspot packets arrive with $\text{TTL}=63$ due to NAT router decrement.
   - `UPI 2.0 <Device> XML & JA4 Client TLS Fingerprint`: Dual-Anchor confirmation pairing Handset IMEI (`86749206...`) with JA4 TLS Fingerprint (`t13d1516h2...`), mathematically eliminating passive IMEI cloning alibis.
   - `Dual-SIM IMEI Luhn Twin & Z3 SMT Bounds`:
     - Proves Slot 1 (Airtel) and Slot 2 (Jio) share Type Allocation Code (TAC) `86749206` (Samsung Galaxy M34 5G).
     - Z3 SMT Solver certifies clock offset $[-1.2\text{s}, +0.8\text{s}]$ satisfies NTP synchronization bounds (`Z3 SOLVER: SAT`).

---

### SCREEN 3: Taint DAG & BNSS Lien Engine
**Route**: `?view=taint-engine`
**Primary File**: [`frontend/src/pages/v5/TaintEngineScreen.tsx`](file:///e:/Tarka_v3/tarka/frontend/src/pages/v5/TaintEngineScreen.tsx)
**Sub-Engine**: [`frontend/src/utils/taintLienEngine.ts`](file:///e:/Tarka_v3/tarka/frontend/src/utils/taintLienEngine.ts)

#### 1. Purpose & Legal Context
- Replaces blunt Section 102 CrPC account freezes with **Section 106(1) proportional debit liens** and **Section 107 judicial attachment orders**.
- Shields innocent commercial merchants (e.g. Apex Electronics POS) from operational paralysis while freezing 100% of illicit proceeds.
- Implements the judicial doctrine of *Roscoe v. Winder* (1915) and Rajasthan High Court directives governing commingled accounts.
- Uses **Dinic's Min-Cut Algorithm** to find the minimum set of accounts to freeze to disconnect all outward cashout sinks.

#### 2. Key UI Sections & Layout Architecture
1. **Top KPI Strip (4 Bento Cards)**:
   - `Defrauded Victim Loss`: `₹5,00,000` (`T+0 DEBIT`).
   - `LIBR Recoverable Lien`: `₹5.00L` (or `₹4.40L` with clean commingling) with `HC PRECEDENT` badge.
   - `Dinic Min-Cut Freeze`: `K = 3 Accounts` (`100% SEALED`).
   - `Innocent Capital Saved`: `₹0` (or `₹2,50,000` when clean funds are injected) with `§106 LIEN ONLY`.
2. **5-Column Connected DAG Pipeline**:
   - `Col 1 (Stage 1)`: Victim Sunil Kumar (`-₹5,00,000.00`) connects vertically via `₹5.0L Outflow ↓` to Mule Layer 1 Vikram Shah (`Inflow: ₹5,00,000`).
   - `Col 2 (Bridge 1→2)`: Relative SVG bezier wires with inline flow pills:
     - `₹3.0L (60%)` curving to Rohit Verma (L2A).
     - `₹2.0L (40%)` leading to Sameer Khan (L2B).
   - `Col 3 (Stage 2)`: Rohit Verma (`Forwarded to Apex: ₹1.80L | Frozen: ₹1.20L`) and Sameer Khan (`ATM Cashout: ₹1.20L | Frozen: ₹80k`).
   - `Col 4 (Bridge 2→3)`: Direct SVG wires:
     - `₹1.80L POS` connecting to Apex Electronics.
     - `₹1.20L ATM` connecting to Noida Sec 18 ATM.
   - `Col 5 (Stage 3)`:
     - **Apex Electronics Pvt Ltd**: Dual-layer capital progress bar distinguishing Clean Working Capital from Specific §106 Debit Lien.
     - **Noida Sec 18 ATM DL-049**: Terminal cashout sink showing sealed vs dispensing state.
3. **Interactive Dinic Min-Cut Freeze Budget Controller**:
   - Discrete stepped selector chips ($K=1 \dots K=6$):
     - $K=3$ (Optimal): Seals 100% of reachability to terminal cashout sinks (`0 / 4 Escape Routes Open`).
     - $K=1 \dots 2$ (Under-budget): Highlights leaking paths in rose (`LEAK PATH`), turns ATM sink red (`DISPENSING LEAK`), and drops gauge to 0%.
4. **Recoverable Flow Containment Gauge & 3-Rule Comparison**:
   - Semi-circle SVG gauge visualizing flow containment percentage.
   - 3 interactive rule cards:
     - **LIBR (HC Precedent) ★**: Lowest Intermediate Balance Rule.
     - **FIFO (Finacle Standard)**: First-in, first-out allocation.
     - **PRO-RATA**: Proportional ratio allocation.
5. **Bottom Compliance & Notice Suite**:
   - **Left**: MHA SOP 02.01.2026 Statutory Compliance Stepper (24h Magistrate Intimation $\to$ 7-Day Account Notice $\to$ 15-Day Appearance $\to$ 90-Day §107 Order).
   - **Right**: Dual-tab Section 106 / Section 107 Statutory Requisition Generator with `[ 📋 Copy BNSS Notice ]`.

---

### SCREEN 4: Section 63 BNSS Court-Admissible Proof Pack
**Route**: `?view=court-proof`
**Primary File**: [`frontend/src/pages/v5/CourtProofScreen.tsx`](file:///e:/Tarka_v3/tarka/frontend/src/pages/v5/CourtProofScreen.tsx)
**Sub-Engine**: [`frontend/src/utils/courtProofEngine.ts`](file:///e:/Tarka_v3/tarka/frontend/src/utils/courtProofEngine.ts)

#### 1. Purpose & Legal Context
- Implements the mandatory digital evidence certification requirements of **Section 63(4) of Bharatiya Sakshya Adhiniyam (BSA), 2023**.
- Provides a mathematical **Leave-One-Out (LOO) Stress-Tester** that proves the prosecution case survives even if specific pieces of corroborative evidence are excluded by defense alibis.
- Generates cryptographic paper anchors (Ed25519 signatures + BIP-39 24-word recovery seeds) and a self-contained zero-dependency offline `verify.html` dossier.

#### 2. Key UI Sections & Layout Architecture
1. **Top KPI Strip (4 Bento Cards)**:
   - `Section 63 Admissibility`: Status (`100% ADMISSIBLE` or `STRESSED`).
   - `LOO Confidence Score`: Numerical robustness rating (`98.4%` default).
   - `Cryptographic Root`: SHA-256 Merkle root hash of all combined evidence files.
   - `Syndicate Loss Linked`: Multi-state cluster total (`₹10.45 Crores` across 4 states).
2. **Leave-One-Out (LOO) Defense Stress-Tester**:
   - 5 Case Artifacts with exclusion toggles:
     - `#01 Video Call Screenshot` (Victim, Tier-2 Corroborative)
     - `#02 SBI CBS Ledger` (SBI Global IT, Tier-1 Independent)
     - `#03 NPCI Central Switch Log` (NPCI Gateway, Tier-1 Independent)
     - `#04 Airtel CGNAT IPDR` (Airtel Lawful Intercept, Tier-1 Independent)
     - `#05 WhatsApp Chat Export` (Handset Extracted, Tier-2 Corroborative)
   - Disabling non-essential evidence (e.g. WhatsApp chat) proves proof survives ($96.6\%$) via surviving Tier-1 independent logs.
   - Automated prosecutor rebuttal generator citing *Arjun Panditrao Khotkar* and *Anvar P.V.* precedents.
3. **BSA Section 63(4) Split Schedules**:
   - **Part A (System Custodian)**: Statements by SBI IT Nodal Officer, Airtel Network Lead, and NPCI Switch Controller.
   - **Part B (Forensic Examiner)**: Certifies hash algorithms (SHA-256), write-blocker serial numbers, and ISO/IEC 17025 tool compliance.
4. **Ed25519 Paper Anchor & BIP-39 Cryptographic Recovery**:
   - QR Code embedding the Merkle root hash and Ed25519 signature for physical inclusion in police charge-sheets.
   - 24-Word BIP-39 mnemonic phrase allowing judges to independently verify evidence hashes in air-gapped chambers.
5. **Standalone Offline `verify.html` Exporter**:
   - Exports a single, zero-dependency HTML file containing embedded WebCrypto code. Judges can open it on an offline bench computer to independently re-verify the case Merkle tree without network access.
6. **Salted Blind-Index (HMAC-SHA256) Multi-State Syndicate Aggregation**:
   - Matches hashed phone numbers, PANs, and IMEIs across state boundaries (Delhi, Maharashtra, Karnataka, Telangana) without violating privacy laws.

---

## 5. GLOBAL SHELL & CROSS-SCREEN CAPABILITIES

### 5.1 Collapsed 56px Sidebar Rail
- **Case Avatar**: Displays `FIR #149/2026`, complainant Sunil Kumar, and `₹5.00L` loss.
- **Engine Navigation**: 4 discrete buttons (`B1` Intake, `B2` Attribution, `B3` Taint, `B4` Proof) with tooltips and live status dots.
- **Artifacts Popover**: Tree inspector displaying Tier-1, Tier-2, and Tier-3 evidence files with SHA-256 digests.
- **Z3 Live Health Indicator**: Displays `ONLINE 3.8ms · CAS Chain INTACT`.
- **Investigating Officer Profile**: IO details with statutory jurisdiction.

### 5.2 Header Controls & Utilities
- **Investigation Timeline Stepper**: `T+0m (Intake)` $\to$ `T+15m (Attribution)` $\to$ `T+2.5h (Lien Active)` $\to$ `T+48h (Court Pack)`.
- **Sarvam Voice AI Integration**: Native Indian language voice assistant (`SarvamVoiceModal.tsx`) supporting Hindi and Indian English audio transcription and synthesis.
- **Section 63 PDF Dossier Export**: Generates court-admissible PDF charge-sheets adhering to Indian judicial formatting standards.

---

## 6. KEY UTILITY ENGINES REFERENCE TABLE

| File Path | Core Functions | Mathematical / Legal Doctrine |
|---|---|---|
| `frontend/src/utils/intakeFalsifier.ts` | `validateRunningBalance()`, `decodeRailReference()`, `parsePdfRevisions()` | Double-entry conservation, PDF binary xref table analysis, Julian calendar math |
| `frontend/src/utils/cgnatAttribution.ts` | `solveCgnatFunnel()`, `analyzeDualSimHardware()`, `detectHotspotCollision()` | Set intersection ($S_1 \cap S_2 \cap S_3 \cap S_4$), Bayesian posterior odds, IPv4 TTL packet analysis |
| `frontend/src/utils/taintLienEngine.ts` | `computeTaintEngine()`, `generateBnssDrafts()`, `solveDinicMinCut()` | Dinic Min-Cut algorithm, *Roscoe v. Winder* LIBR, Section 106/107 BNSS |
| `frontend/src/utils/courtProofEngine.ts` | `evaluateLeaveOneOut()`, `generateBsa63SplitSchedules()`, `generateOfflineVerifyHtml()` | Leave-One-Out stress testing, Ed25519 signatures, BIP-39 mnemonic encoding |
| `frontend/src/utils/statutoryDirectives.ts` | `getBnss94CbsDirective()`, `getDot3920PortBlockDirective()` | Section 94 BNSS, Section 63 BSA, DoT License Clause 39.20 |

---

## 7. VERIFICATION & QUALITY BENCHMARKS

1. **Zero TypeScript & Vite Build Errors**:
   - `npm run build` (`tsc -b && vite build`) compiles in < 700ms with 0 type errors.
2. **Deterministic Playwright E2E Test Suite**:
   - Viewport height contract verified (`scrollContainer.scrollHeight === scrollContainer.clientHeight`).
   - Interactive state changes verified (slider updates, clean funds injection, leave-one-out toggles).
3. **Air-Gap Integrity**:
   - 100% self-contained fonts, icons, styles, and cryptographic libraries. Zero CDN fetches during runtime.
