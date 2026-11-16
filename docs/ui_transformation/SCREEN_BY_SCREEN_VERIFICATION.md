# TARKA | SCREEN-BY-SCREEN FORENSIC VERIFICATION & TECHNICAL AUDIT

**Project:** TARKA Cyber Fraud Investigation & Attribution Workbench  
**Repository:** `C:\PROJECTS\tarka_v5_clean_verify`  
**Base Commit Integrated:** `aa2b99a` (`origin/v6-release` by Vippin Antony P)  
**Branch:** `phase-14/implementation-completion`  
**Evaluation Scope:** 24 Verified Screen States, Responsive Viewports & Forensic Modals  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. Executive Summary & Verification Matrix

This document provides complete, evidence-backed technical documentation and forensic verification for each of the **24 individual screens, modal overlays, and responsive viewports** in TARKA. Every screen listed has been rendered in a live Chromium environment, verified against the tactile skeuomorphic design system, evaluated for statutory compliance (BSA §63, BNSS §106/§107), and captured at full resolution in `docs/ui_transformation/SCREENSHOTS/`.

### 1.1 Complete Screen Inventory

| # | Screen / View State | View Route | Screenshot File | Primary Forensic Capability | Statutory Alignment |
|---|---|---|---|---|---|
| 01 | Command Center & Golden-Hour Triage | `/?view=workspace` | `01_workspaces_overview.png` | Real-time exposure, mule sinks, triage queue, 5-File Reconstructor | BNSS §106 / §107 |
| 02 | Case Investigation Workbench | `/?view=cases&case=CASE-2026-001` | `02_case_workbench_overview.png` | Case overview, victim narrative, evidence index, status tracker | BSA §63 |
| 03 | Financial Ledger & CBS Audit | `/?view=evidence` | `03_financial_ledger.png` | Double-entry balance conservation, Finacle statement audit, Row #14 tamper test | BSA §63, Finacle CBS |
| 04 | NPCI UPI RRN Analysis | `/?view=evidence` | `04_rrn_analysis.png` | 12-digit RRN deconstruction, Julian Day offset, Gateway timestamp drift | NPCI UPI Spec v1.9 |
| 05 | People & Accounts Entity Hub | `/?view=people` | `05_people_accounts_entities.png` | Identity resolution, mule ring clustering, Hard-Veto merge protection | BSA §63(4)(c) |
| 06 | Money Trail Flow & Mule Sinks | `/?view=money` | `06_money_trail_flow.png` | Layered Sankey fund distribution, LIBR proportional lien calculator | BNSS §106 / §107 |
| 07 | Fraud Syndicate Network Graph | `/?view=network` | `07_fraud_network_graph.png` | Force-directed syndicate graph, degree centrality, transit TTL $\le 63$s hotspot | IT Act §79A |
| 08 | Device & SIM Attribution | `/?view=device` | `08_device_sim_attribution.png` | IMEI/IMSI binding, CGNAT source port mapping, CDR cell-tower triangulation | DoT CGNAT Circular |
| 09 | Legal Actions & BSA Admissibility | `/?view=actions` | `09_actions_legal_admissibility.png` | Automated Section 63 BSA certificate generator, bank freeze notice drafting | BSA §63, BNSS §107 |
| 10 | Benchmark Lab & Calibrator | `/?view=lab` | `10_benchmark_lab.png` | High-throughput ingestion stress testing (10,000/s), deterministic gate latency | ISO/IEC 27037 |
| 11 | Temporal Evidence Loom | `/?view=workstation&tab=loom` | `11_temporal_evidence_loom.png` | Multi-source unified chronology, clock-skew normalization, causal drift | BSA §63(2) |
| 12 | Forensic Claim Inspector | `/?view=workstation&tab=claims` | `12_claim_inspector.png` | Tri-state claim verification (CONFIRMED, CONTRADICTED, UNVERIFIED) | Gate I1–I5 Integrity |
| 13 | Claim Dependency Lens | `/?view=workstation&tab=lens` | `13_claim_dependency_lens.png` | Direct acyclic claim-to-evidence graph, evidentiary grounding verification | Provenance Standard |
| 14 | Investigation Flight Recorder | `/?view=workstation&tab=recorder` | `14_flight_recorder.png` | Append-only immutable investigator action log, SHA-256 chain of custody | ISO/IEC 27042 |
| 15 | Cryptographic Provenance DAG | `/?view=workstation&tab=dag` | `15_provenance_dag.png` | Directed Acyclic Graph of raw artifacts, extracted entities, and derived claims | BSA §63(4) |
| 16 | Evidence Ingestion Modal | Overlay (`openEvidenceModal()`) | `16_evidence_intake_modal.png` | Multi-source artifact intake, SHA-256 generation, MIME validation | ISO/IEC 27037 |
| 17 | New Case Genesis Wizard | Overlay (`openCaseModal()`) | `17_new_case_wizard_modal.png` | Multi-step case creation, FIR/complaint binding, statutory jurisdiction | BNSS §173 |
| 18 | Ask TARKA AI Forensic Drawer | Drawer (`isAiDrawerOpen`) | `18_ask_tarka_ai_drawer.png` | Grounded evidential query assistant, hallucination-resistant claim citing | AI Governance Doctrine |
| 19 | Case Switcher Quick Popover | Popover (`isCaseSwitcherOpen`) | `19_case_switcher_popover.png` | Instant multi-case context switching with active exposure and state badges | UX Ergonomics |
| 20 | All Cases Registry | `/?view=cases` | `20_all_cases_registry.png` | Comprehensive case index, priority filtering, multi-officer assignment | Criminal Rules of Practice |
| 21 | System Health & Diagnostics | `/?view=health` | `21_system_health_diagnostics.png` | Backend API latency, SQLite/PostgreSQL health, memory and memory cache telemetry | SRE Standards |
| 22 | Forensic Settings Station | `/?view=settings` | `22_settings_station.png` | Investigator credentials, API tokens, cryptographic key rings, UI preferences | Security Controls |
| 23 | Mobile First-Responder Command | Viewport: 390x844 | `23_mobile_command_center_390x844.png` | Field-deployable responsive triage, touch-optimized metrics, urgent freeze action | Field Forensics |
| 24 | Tablet Field Evidence Ledger | Viewport: 768x1024 | `24_tablet_evidence_ledger_768x1024.png` | High-density tabular layout, responsive horizontal scroll, touch-friendly rows | Field Audit |

---

## 2. Screen-by-Screen Technical & Forensic Specifications

### Screen 01: Command Center & Golden-Hour Triage
- **Route:** `/?view=workspace`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/01_workspaces_overview.png`
- **Primary Component:** `CommandCenterScreen.tsx`
- **Forensic Purpose:** Provides law-enforcement and cyber-crime units with instantaneous situational awareness during the critical "Golden Hour" ($\le 2$ to $4$ hours post-incident) when fraud funds remain in reachable domestic banking layers before crypto off-ramping or hawala conversion.
- **Key UI Elements:**
  - *Top Metrics Strip:* 5 skeuomorphic tactile cards (`.tarka-panel`) with count-up animations: Total Exposure (₹1.84 Cr), Shielded/Frozen Capital (₹74.2 Lakhs), Active Golden-Hour Cases (3), Identified Mule Accounts (42), Recovery Rate (40.3%).
  - *Act Now Triage Queue:* Urgency-ranked cards displaying remaining lien time, target bank IFSC, and 1-click statutory notice generation.
  - *5-File Reconstructor Trigger:* Instant hydration button for the canonical CBI Digital Arrest case (`CASE-2026-001`).
- **Technical Mechanisms:** State polling against `/api/v6/metrics`, CSS tabular figures (`font-variant-numeric: tabular-nums`) preventing visual jitter.
- **Statutory Compliance:** Empowers immediate provisional attachment under **BNSS §106/§107** to prevent dissipation of illicit proceeds.

---

### Screen 02: Case Investigation Workbench
- **Route:** `/?view=cases&case=CASE-2026-001`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/02_case_workbench_overview.png`
- **Primary Component:** `CaseDetailView.tsx` / `CasesScreen.tsx`
- **Forensic Purpose:** Central repository for a specific criminal investigation. Integrates complainant details, initial complaint FIR/NCR, victim statement synthesis, and stage-by-stage investigative progress.
- **Key UI Elements:**
  - *Case Header Card:* High-contrast badge indicating case priority, assigned IO, statutory category (Digital Arrest / Impersonation).
  - *Investigative Timeline Tracker:* Horizontal stepper showing evidence intake, ledger reconciliation, network clustering, attribution, and court readiness.
  - *Complainant Dossier:* Structured breakdown of Sunil Kumar's initial transaction flow, victim vulnerability assessment, and total financial exposure.
- **Evidentiary Inputs:** Raw FIR PDF, NCR portal complaint JSON, complainant's mobile extraction dump.
- **Evidentiary Outputs:** Validated case baseline object with linked cryptographic parent hash.

---

### Screen 03: Financial Ledger & CBS Statement Audit
- **Route:** `/?view=evidence`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/03_financial_ledger.png`
- **Primary Component:** `EvidenceLedgerScreen.tsx`
- **Forensic Purpose:** Automated forensic examination of bank Core Banking Solution (CBS) account statements (Finacle, BaNCS) to verify double-entry conservation, balance continuity, and detect intentional manipulation.
- **Key UI Elements:**
  - *Finacle CBS Table:* Recessed skeuomorphic data table (`.tarka-inset`) displaying Date/Time, Reference/RRN, Value Date, Debit, Credit, Balance, and Verification Status.
  - *Row #14 Falsification Toggle:* Interactive forensic demonstration switch injecting a ₹2,00,000 ledger balance discrepancy into row 14, immediately triggering visual red warning flags and failing Gate I1 balance conservation.
  - *Balance Continuity Inspector:* Real-time assertion that $\text{Balance}_{n} = \text{Balance}_{n-1} + \text{Credit}_{n} - \text{Debit}_{n}$.
- **Statutory Compliance:** Formulates the mathematical foundation required for banking evidence admissibility under **BSA §63** and the Bankers' Books Evidence Act principles.

---

### Screen 04: NPCI UPI Reference Number (RRN) Analysis
- **Route:** `/?view=evidence` (RRN Inspector sub-tab)
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/04_rrn_analysis.png`
- **Primary Component:** `RrnAnalysisView.tsx`
- **Forensic Purpose:** Cryptographic and structural deconstruction of 12-digit NPCI UPI Retrieval Reference Numbers (RRNs) to independently verify transaction origin, bank gateway timing, and clock drift.
- **Technical Methodology:**
  - Deconstructs RRN: Digit 1 = Year ($2026 \rightarrow 6$), Digits 2–4 = Julian Day ($028 \rightarrow \text{Jan 28}$), Digits 5–6 = Gateway Code ($11 \rightarrow \text{HDFC}$), Digits 7–12 = Sequence Number.
  - Compares internal gateway Julian Day against reported Finacle statement timestamps to detect backdated or fabricated transaction entries.
- **Evidentiary Output:** Deterministic validation score and transaction gateway confirmation token.

---

### Screen 05: People & Accounts Entity Resolution Hub
- **Route:** `/?view=people`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/05_people_accounts_entities.png`
- **Primary Component:** `PeopleAccountsScreen.tsx`
- **Forensic Purpose:** Resolves fragmented, multi-source identities (account holders, phone subscribers, WhatsApp handles, crypto wallet owners) into unified suspect profiles while strictly barring false-positive mergers.
- **Key UI Elements:**
  - *Entity Cards:* Tactile skeuomorphic profile containers showing KYC verification status, associated bank accounts, and risk score.
  - *Hard-Veto Shield Indicator:* Visual shield icon indicating active protection rules. If two entities have contradictory permanent identifiers (e.g., distinct PANs or verified Aadhaar hashes), automated merging is blocked regardless of name or phone similarity.
- **Evidentiary Principle:** Upholds **AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.** by requiring explicit investigator sign-off before any identity resolution is accepted into the official record.

---

### Screen 06: Money Trail Flow & Multi-Hop Mule Sinks
- **Route:** `/?view=money`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/06_money_trail_flow.png`
- **Primary Component:** `MoneyTrailScreen.tsx`
- **Forensic Purpose:** Tracks the velocity and dispersion of fraudulent funds across multi-hop mule networks (Layer 1 through Layer 4) and calculates legally equitable freeze amounts.
- **Key UI Elements:**
  - *Sankey Flow Diagram:* Proportional visual ribbons mapping fund outflows from victim Sunil Kumar (₹85,00,000) through mule hops to ATM cash withdrawals and crypto gateways.
  - *LIBR Proportional Lien Calculator:* Implements the *Lowest Intermediate Balance Rule* (LIBR) to calculate exact recoverable percentages per victim when mule accounts contain commingled funds from multiple cyber-crime victims.
- **Statutory Compliance:** Generates the exact financial figures required for debit-freeze warrants issued under **BNSS §106/§107**.

---

### Screen 07: Fraud Syndicate Network Graph
- **Route:** `/?view=network`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/07_fraud_network_graph.png`
- **Primary Component:** `FraudNetworkScreen.tsx`
- **Forensic Purpose:** Interactive topological mapping of the cyber-fraud syndicate, revealing organizational roles (Kingpin, Technical Handler, Mule Recruiter, Layer-1 Cashier).
- **Key UI Elements:**
  - *Dynamic Force-Directed Canvas:* WebGL/SVG-rendered network graph with auto-fit zoom, collision avoidance, and role-coded node borders.
  - *Transit Hotspot Indicator:* Identifies nodes exhibiting rapid-transit characteristics ($\text{Transit TTL} \le 63\text{ seconds}$ between debit and immediate credit), typical of automated mule bot syndicates.
  - *Node Centrality Inspector:* Degree, betweenness, and eigenvector centrality metrics displayed in a recessed side inspector.

---

### Screen 08: Device & SIM Attribution Chassis
- **Route:** `/?view=device`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/08_device_sim_attribution.png`
- **Primary Component:** `DeviceSimScreen.tsx`
- **Forensic Purpose:** Correlates hardware telemetry, SIM IMSI transitions, Call Detail Records (CDR), and Carrier-Grade NAT (CGNAT) source port allocations to physically attribute cyber-attacks to specific handsets and geographic towers.
- **Key UI Elements:**
  - *CGNAT Port Funnel:* Visual correlation showing public IP + Private IP + Ephemeral Source Port + Microsecond Timestamp, resolving the DoT CGNAT subscriber attribution mandate.
  - *Handset IMEI/IMSI Matrix:* Highlights SIM swapping events and multiple SIM cards operating within a single physical IMEI chassis.
  - *Cell Tower Sector Triangulation:* Displays azimuth, LAC, and Cell-ID coordinates with historical movement trajectories.

---

### Screen 09: Legal Actions & Section 63 BSA Admissibility
- **Route:** `/?view=actions`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/09_actions_legal_admissibility.png`
- **Primary Component:** `ActionsLegalScreen.tsx`
- **Forensic Purpose:** Bridges the gap between technical forensic extraction and courtroom admissibility by automating the production of statutory legal notices, certificates, and seizure memos.
- **Key UI Elements:**
  - *Section 63 BSA Certificate Generator:* Generates judicial-grade Electronic Evidence Certificates under **Section 63 of Bharatiya Sakshya Adhiniyam, 2023** (formerly Section 65B of Indian Evidence Act), detailing hash algorithms, system custody, and device calibration.
  - *Bank Freeze Notice Drafter:* Pre-populates formal requisition templates under **BNSS §106/§107** for instant transmission to Nodal Bank Officers.
  - *Statutory Admissibility Checklist:* Verifies evidence integrity gates I1 through I5 prior to certificate signing.

---

### Screen 10: Benchmark Lab & Calibrator
- **Route:** `/?view=lab`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/10_benchmark_lab.png`
- **Primary Component:** `BenchmarkLabScreen.tsx`
- **Forensic Purpose:** Performance validation and forensic calibration suite demonstrating TARKA's capacity to ingest, hash, parse, and evaluate transactions at scale while maintaining sub-millisecond determinism.
- **Key UI Elements:**
  - *High-Throughput Ingestion Runner:* Calibrated to 10,000 transactions/second with live latency histogram (p50: 1.2ms, p99: 4.8ms).
  - *Integrity Gate Calibrator:* Validates mathematical execution speeds for Gate I1 (Double Entry), Gate I2 (RRN Format), Gate I3 (Entity Verification), and Gate I4 (Hash Integrity).
  - *Export Benchmark Telemetry:* Generates formal PDF/JSON performance certificates for scientific evaluation and mentor review.

---

### Screen 11: Temporal Evidence Loom & Chronology
- **Route:** `/?view=workstation&tab=loom`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/11_temporal_evidence_loom.png`
- **Primary Component:** `TemporalEvidenceLoom.tsx`
- **Forensic Purpose:** Multi-stream chronological timeline reconstruction aligning server logs, bank CBS records, CDR events, and WhatsApp message timestamps into a singular unified, drift-corrected timeline.
- **Key UI Elements:**
  - *Clock-Skew Normalizer:* Detects and visualizes offset between local device time and NTP atomic standards.
  - *Event Severity Swimlanes:* Multi-channel visual tracks separating financial debits, communication events, and technical server actions.
  - *Causal Linkage Lines:* Visual connectors demonstrating strict evidentiary causation between preceding scam actions and subsequent transfers.

---

### Screen 12: Forensic Claim Inspector
- **Route:** `/?view=workstation&tab=claims`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/12_claim_inspector.png`
- **Primary Component:** `ClaimInspector.tsx`
- **Forensic Purpose:** Enforces the core doctrine (*AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.*) by parsing every factual assertion made during an investigation into atomic, testable claims.
- **Key UI Elements:**
  - *Tri-State Status Badges:* Clear visual indicators for each claim: `CONFIRMED` (green), `CONTRADICTED` (red), `UNVERIFIED` (amber).
  - *Grounding Evidence Drawer:* Displays exact raw bytes, artifact SHA-256 hash, and line-level evidence grounding for each claim.
  - *Investigator Adjudication Controls:* Allows the Senior IO to formally accept, reject, or request supplemental evidence for any proposed claim.

---

### Screen 13: Claim Dependency Lens
- **Route:** `/?view=workstation&tab=lens`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/13_claim_dependency_lens.png`
- **Primary Component:** `ClaimDependencyLens.tsx`
- **Forensic Purpose:** Exposes the underlying justification graph supporting complex investigative deductions. Prevents circular reasoning and ungrounded inferences.
- **Key UI Elements:**
  - *Dependency Hierarchy Canvas:* Visual tree mapping high-level attribution conclusions down to intermediate facts, which in turn ground in raw immutable artifacts.
  - *Vulnerability Highlighting:* Instantly flags any claim whose underlying supporting artifact fails cryptographic hash verification.

---

### Screen 14: Investigation Flight Recorder
- **Route:** `/?view=workstation&tab=recorder`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/14_flight_recorder.png`
- **Primary Component:** `InvestigationFlightRecorder.tsx`
- **Forensic Purpose:** Tamper-evident, append-only operational log recording every action, query, view, export, and adjudication performed by any user inside the workbench.
- **Key UI Elements:**
  - *Sequential Event Feed:* Monotonically increasing event indices with UTC microsecond timestamps.
  - *Cryptographic Hash Linking:* Each log entry incorporates the SHA-256 hash of the preceding entry, forming a local blockchain-style chain of custody that cannot be altered without detection.
- **Compliance:** Satisfies international digital forensics standards **ISO/IEC 27042** (Guidelines for the analysis and interpretation of digital evidence).

---

### Screen 15: Cryptographic Provenance DAG
- **Route:** `/?view=workstation&tab=dag`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/15_provenance_dag.png`
- **Primary Component:** `ProvenanceDagView.tsx`
- **Forensic Purpose:** End-to-end cryptographic lineage graph tracking data transformation from physical evidence acquisition to final courtroom exhibits.
- **Key UI Elements:**
  - *Node Types:* Raw Artifacts (green), Parsed Tokens (blue), Inferred Entities (purple), Legal Claims (orange).
  - *Edge Verification:* Interactive connectors verifying hash transformations, normalization passes, and deterministic parsing routines.

---

### Screen 16: Secure Evidence Ingestion Modal
- **Route:** Modal Overlay (`openEvidenceModal()`)
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/16_evidence_intake_modal.png`
- **Primary Component:** `EvidenceIntakeModal.tsx`
- **Forensic Purpose:** Secure, cryptographically sound ingestion interface for acquiring digital artifacts into evidence custody.
- **Key UI Elements:**
  - *Drag-and-Drop Ingestion Chamber:* Supports PDF statements, CSV ledgers, PCAP packet dumps, CDR Excel spreadsheets, and JPEG screenshots.
  - *Immediate Client-Side SHA-256 Hashing:* Computes cryptographic hash before file transmission, ensuring transit integrity.
  - *Chain of Custody Metadata Form:* Requires Officer Name, Seizure Location, Seizure Order Reference, and Seizure Device ID before intake completion.

---

### Screen 17: New Case Genesis Wizard
- **Route:** Modal Overlay (`openCaseModal()`)
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/17_new_case_wizard_modal.png`
- **Primary Component:** `NewCaseWizardModal.tsx`
- **Forensic Purpose:** Formal case initialization dialog binding incoming complaints to statutory legal authorities.
- **Key UI Elements:**
  - *Step Navigation Bar:* Basic Details $\rightarrow$ Complainant Info $\rightarrow$ Fraud Classification $\rightarrow$ Assigned Officers $\rightarrow$ Initial Evidence Intake.
  - *Statutory Jurisdiction Selector:* Configures applicable procedural rules (**BNSS**, IPC/BNS, IT Act).
  - *Case Number Generator:* Generates standardized judicial format (`CASE-YYYY-XXXX`).

---

### Screen 18: Ask TARKA AI Forensic Assistant Drawer
- **Route:** Slide-out Drawer (`isAiDrawerOpen`)
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/18_ask_tarka_ai_drawer.png`
- **Primary Component:** `AskTarkaDrawer.tsx`
- **Forensic Purpose:** Evidentially-grounded investigative copilot capable of answering complex factual queries regarding multi-account transactions, timeline discrepancies, and suspect overlaps.
- **Core Governance Rule:** Every single assertion in the assistant's response is accompanied by a clickable citation badge linked to a specific artifact SHA-256 hash. Hallucinations and ungrounded speculation are strictly barred.

---

### Screen 19: Case Switcher Quick Popover
- **Route:** Popover Overlay (`isCaseSwitcherOpen`)
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/19_case_switcher_popover.png`
- **Primary Component:** `CaseSwitcherPopover.tsx`
- **Forensic Purpose:** High-speed context switching mechanism enabling senior investigators and supervisors to pivot between multiple concurrent active investigations without losing filter states or cursor positions.
- **Key UI Elements:**
  - *Tactile Case Cards:* Displays Case ID, Complainant Name, Primary Fraud Vector, Total Exposure, and Current Status Badge.
  - *Instant Search & Filter:* Sub-millisecond keystroke filtering across case numbers and suspect names.

---

### Screen 20: All Cases Registry
- **Route:** `/?view=cases`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/20_all_cases_registry.png`
- **Primary Component:** `CasesScreen.tsx`
- **Forensic Purpose:** Master docket and judicial inventory of all registered cases within the jurisdiction.
- **Key UI Elements:**
  - *Comprehensive Table:* Case ID, Title, Status, Priority, Assigned IO, Exposure, Last Updated, and Quick Action buttons.
  - *Batch Export Controls:* Export docket summary to Excel/PDF for departmental status reviews.

---

### Screen 21: System Health & Diagnostics
- **Route:** `/?view=health`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/21_system_health_diagnostics.png`
- **Primary Component:** `SystemHealthScreen.tsx`
- **Forensic Purpose:** Real-time infrastructure monitoring ensuring computational integrity, database persistence, and API availability.
- **Key UI Elements:**
  - *Subsystem Status Cards:* FastAPI Core Engine (100% Healthy, 12ms latency), SQLite/PostgreSQL Database (Connected, 2.4MB storage), Vite Static Asset Engine (Operational).
  - *Memory & Cache Telemetry:* Heap utilization graphs and active background worker thread monitors.

---

### Screen 22: Forensic Settings Station
- **Route:** `/?view=settings`
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/22_settings_station.png`
- **Primary Component:** `SettingsScreen.tsx`
- **Forensic Purpose:** Configures forensic workstation environment parameters, officer credentials, cryptographic signing keys, and statutory agency profiles.
- **Key UI Elements:**
  - *Investigating Agency Profile:* Agency Name, Police Station, State Jurisdiction, Nodal Officer Email.
  - *Cryptographic Key Management:* Section 63 BSA digital signing certificates and private key storage status.
  - *Design System Preferences:* Contrast enforcement overrides, high-density display mode, and animation toggles.

---

### Screen 23: Mobile First-Responder Command Center (390×844)
- **Route:** Viewport: 390×844 (iPhone 13/14/15 standard)
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/23_mobile_command_center_390x844.png`
- **Primary Component:** Responsive Shell (`V6AppShell.tsx` + `CommandCenterScreen.tsx`)
- **Forensic Purpose:** Field-optimized mobile interface enabling first-responding patrol officers and cyber-patrol units to initiate immediate freeze notices from a handheld device at a crime scene.
- **Key Responsive Adaptations:**
  - *Adaptive Navigation Rail:* Collapses to a compact bottom navigation bar with 48px touch targets.
  - *Single-Column Metric Flow:* Metric cards stack vertically with large legible typography.
  - *Quick Emergency Action Bar:* Prominent "Initiate Bank Freeze" action pinned to the viewport bottom.

---

### Screen 24: Tablet Field Evidence Ledger (768×1024)
- **Route:** Viewport: 768×1024 (iPad / Android Tablet standard)
- **Visual Capture:** `docs/ui_transformation/SCREENSHOTS/24_tablet_evidence_ledger_768x1024.png`
- **Primary Component:** Responsive Shell + `EvidenceLedgerScreen.tsx`
- **Forensic Purpose:** Optimized for on-site bank audits, physical search operations, and courtroom judicial presentations on tablet computers.
- **Key Responsive Adaptations:**
  - *Horizontal Smooth Scroll:* Maintains all critical banking columns with sticky header and frozen account number column.
  - *Touch-Friendly Row Expansion:* Tap-to-expand details for microsecond timestamps and raw transaction payloads.

---

## 3. Statutory Compliance Summary

| Statute & Section | Forensic Mandate | TARKA Technical Implementation | Verified Screens |
|---|---|---|---|
| **Bharatiya Sakshya Adhiniyam, 2023 §63** (formerly IEA §65B) | Proof of integrity of electronic records and device calibration certificates | Automated SHA-256 hashing upon ingestion; automatic Section 63 Certificate generation documenting software version, host calibration, and custodial chain. | Screens 03, 04, 09, 14, 15, 16 |
| **Bharatiya Nagarik Suraksha Sanhita, 2023 §106/§107** | Provisional attachment and seizure of property derived from criminal activity | LIBR proportional lien calculator computing exact multi-victim claims; automated statutory requisition notice generation for nodal bank officers. | Screens 01, 06, 09 |
| **Information Technology Act, 2000 §79A** | Central Government notification of Examiner of Electronic Evidence | Strict append-only flight recorder logs; cryptographic audit trail preventing evidence tampering or unrecorded officer modifications. | Screens 12, 13, 14 |
| **DoT CGNAT Attribution Circular** | Mandatory logging and attribution of public IP, private IP, and ephemeral source port | Specialized CGNAT Attribution Funnel resolving dynamic NAT port bindings from telecom carrier logs to individual subscriber IMSIs. | Screen 08 |

