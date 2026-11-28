# TARKA | HOME PAGE TECHNICAL SPECIFICATION & FORENSIC CAPABILITIES

**Component:** `frontend/src/v6/screens/HomeScreen.tsx`  
**Route:** `/?view=home` (Default Landing View)  
**Role:** Master Forensic Command Dashboard & First-Responder Entry Point  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. Overview & Purpose

The TARKA Home Page serves as the primary operational hub for investigating officers, cyber cell supervisors, and digital forensics examiners upon opening the workbench. 

Rather than presenting an uncontextualized list of cases or an empty search bar, the Home Page delivers immediate situational awareness across the entire active jurisdiction:
- Displays authenticated officer credentials and statutory agency authority.
- Surfaces active cases ranked by **Golden-Hour urgency** and financial recovery feasibility.
- Aggregates live backend metrics backed by transactional and evidentiary truth.
- Provides 1-click execution for routine investigative workflows (FIR Genesis, Evidence Hashing, Benchmark Stress, Legal Certificate Export).
- Connects directly to the **Universal Multilingual AI Assistant** and **Voice Interrogation Station**.

---

## 2. Structural Anatomy & Section Breakdown

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SECTION 1: WELCOME & INVESTIGATING OFFICER CONTEXT BANNER                              │
│ • Officer Name & Rank (Insp. Rajeshwar Rao)      • Police Station (Noida Cyber PS, UP) │
│ • Statutory Engine Status (BSA §63 Active)       • Direct Copilot & Voice Launchers    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 2: JURISDICTION OPERATIONAL TELEMETRY (6 KPI STRIP)                           │
│ [Active Cases: 4] [Total Exposure: ₹1.84Cr] [Shielded Capital: ₹74.2L / 40.3%]         │
│ [Admitted Evidence: 38] [Pending Review: 12] [Verified Gates: 14/14 Z3 SMT]            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 3: CONTINUE ACTIVE INVESTIGATIONS (CASE DOSSIERS)                              │
│ ┌───────────────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│ │ CASE-2026-001 (Sunil Kumar)           │  │ CASE-2026-002 (Priya Sharma)            │ │
│ │ • Digital Arrest · 74m Golden Hour    │  │ • Telegram Job Scam · ₹42.0L Loss       │ │
│ │ • ₹85.0L Loss · ₹31.45L Frozen (LIBR) │  │ • Stage 2/6 · Ledger Verification       │ │
│ │ [Continue Investigation Button]       │  │ [Continue Investigation Button]         │ │
│ └───────────────────────────────────────┘  └─────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 4: FORENSIC OPERATIONAL WORKFLOW TILES (6 ONE-CLICK ACTIONS)                   │
│ [New Case Genesis] [Admit Evidence] [Search ⌘K] [Benchmark Lab] [BSA §63] [Voice Station]
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 5: SPLIT INTELLIGENCE FEED                                                     │
│ ┌───────────────────────────────────────┐  ┌─────────────────────────────────────────┐ │
│ │ TARKA ASSISTANT GUIDED INQUIRIES      │  │ FLIGHT RECORDER & AUDIT TRAIL (ISO27042)│ │
│ │ • Payment Discrepancy Inquiry (₹10k)  │  │ • 14:28 User: Finacle Ledger Reconcile  │ │
│ │ • Reconstruct Timeline (10:15-10:35)  │  │ • 14:26 Auto: NPCI UPI Stream Validated │ │
│ │ • LIBR Multi-Hop Mule Lien Calc       │  │ • 14:22 AI: Proposed Ramesh Patel Cluster││
│ │ • CGNAT Port Funnel Attribution       │  │ • 14:20 Gate: Gate I1 Balance Certified │ │
│ └───────────────────────────────────────┘  └─────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ SECTION 6: GOVERNMENT-CLOUD & SRE DIAGNOSTIC STATUS STRIP                              │
│ • NIC MeghRaj / SDC Compatible · Llama 3.1 8B Offline · Latency: 12ms · WAL Active     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Specifications

### 3.1 Section 1: Welcome & Officer Context Banner
- **Data Sources:** `useSettingsStore` (officer name, rank, badge, station) and `useCaseStore` (active case).
- **Statutory Stamp:** Visually confirms that the local workstation is calibrated and operating under the **Bharatiya Sakshya Adhiniyam, 2023** evidence rules.
- **Quick Launch Buttons:**
  - `Ask TARKA Copilot`: Triggers the global copilot drawer (keyboard shortcut: `A`).
  - `Voice Interrogation`: Triggers the multilingual voice modal (keyboard shortcut: `V`).

### 3.2 Section 2: Global Investigation Overview (6 Master KPIs)
All metrics derive from verified fixtures and live store aggregates:
1. **Active Cases:** 4 active high-priority criminal dossiers.
2. **Total Financial Exposure:** ₹1,84,00,000 across reported victims.
3. **Shielded / Frozen Capital:** ₹74,20,000 (40.3% recovery rate) preserved in domestic banking layers.
4. **Admitted Evidence:** 38 SHA-256 bitstream-verified digital files.
5. **Pending Review:** 12 machine-proposed items awaiting human IO confirmation.
6. **Verified Gates:** 14/14 automated integrity passes certified by Z3 SMT Difference Logic.

### 3.3 Section 3: Continue Active Investigations
Renders high-density interactive dossier cards for the 4 canonical cases:
- `CASE-2026-001`: Sunil Kumar · Fake CBI/TRAI Digital Arrest Extortion (₹85.0L loss, 74 mins golden hour remaining, 18 artifacts admitted).
- `CASE-2026-002`: Priya Sharma · Part-Time Job Telegram Investment Scam (₹42.0L loss, Stage 2/6).
- `CASE-2026-003`: Ramesh Chand · Electricity Bill Disconnection APK & SIM Swap (₹35.0L loss, Stage 3/6).
- `CASE-2026-004`: Deepa Iyer · Courier Narcotics Video Impersonation (₹22.0L loss, Stage 1/6).

Clicking **"Continue Investigation"** updates `activeCaseId`, synchronizes browser URL (`?case=...&view=evidence`), and navigates directly to the relevant workbench stage without screen flicker.

### 3.4 Section 4: Forensic Operational Workflows
Provides 6 immediate action tiles:
1. `New Case Genesis`: Opens the multi-step `NewCaseWizardModal` to register an incoming FIR or NCRP complaint.
2. `Admit Evidence`: Opens `EvidenceIntakeModal` with client-side SHA-256 hashing.
3. `Search & Triage`: Launches the `TarkaCommandPalette` (`⌘K`).
4. `Benchmark Lab`: Navigates to `/?view=lab` for 10,000 tx/sec throughput calibration.
5. `BSA §63 Reports`: Opens the courtroom certificate generator (`/?view=actions`).
6. `Multilingual Voice`: Launches the real-time speech-to-speech interrogation chamber.

### 3.5 Section 5: Guided Inquiries & Investigation Flight Recorder
- **Guided Inquiries:** 6 pre-configured forensic queries tailored to active case evidence. Clicking any query pre-populates `TarkaUniversalAssistant`, sets the context, and executes the multi-agent orchestration pipeline.
- **Flight Recorder Stream:** An immutable chronological event feed displaying user actions, automated processing, AI proposals, and gate verifications with truncated SHA-256 hash seals.

### 3.6 Section 6: Government-Cloud Infrastructure Health
Provides at-a-glance SRE confirmation:
- Hosting Architecture: Compatible with Indian National Government Cloud (NIC MeghRaj) and State Data Centres (SDCs).
- AI Inference: Local offline execution (Llama 3.1 8B Q4_K_M).
- Subsystem Latency: API median response time 12ms (p99: 4.8ms).

