# TARKA × SENTINELX — PHASE 17 UI HISTORY & EVOLUTION AUDIT

**Audit Date**: 2026-11-25  
**Auditor**: Forensic Systems Architect & UI Systems Lead  
**Governing Standard**: *AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.*

---

## 1. Executive Summary & Git History Reconnaissance

A comprehensive, non-destructive audit of all local and remote branches in the repository was executed to identify the definitive last known-good user interface for TARKA × SentinelX.

The repository history diverged into two major development lines following merge commit `2c32bb0` (*"Merge pull request #1 from Yaathrapalani/feat/tarka-forensics-integration"*):

1. **The Backend Forensic Hardening Line (`fix/ci-post-merge-repair` — HEAD `c104b4f`):**
   - Hardened Waves 1–6 architectural invariants and eliminated mock fallbacks.
   - Offline RapidOCR engine using local ONNX weights (`ch_PP-OCRv4_*.onnx`).
   - Durable Universal Case Model (UCM) observation persistence (`case_dir/observations/observations.json`).
   - Tus 1.0.0-compatible resumable streaming chunked upload protocol (8 MiB chunks, duplicate chunk defense).
   - Real-time 13-stage background worker with Server-Sent Events (`/events/stream`).
   - TRACE double-entry balance reconciliation and ₹450 discrepancy detection.
   - AEGIS Analysis of Competing Hypotheses (7 ACH hypotheses) with Section 94 BNSS statutory requisitions.
   - Section 63 BSA court-admissible PDF certificate generation with ReportLab.
   - 7-factor RBAC isolation, strict non-promotability invariant (`human_verified = False`).
   - *UI state on this branch:* Scaled down `App.tsx` into a singular dark liquid-glass component (`TarkaForensicWorkstation.tsx`) with 13 tabs, omitting the 26-screen command system from the judge demonstration package.

2. **The Sovereign V6 Skeuomorphic Command System Line (`origin/main`, `origin/phase-14/implementation-completion`, `origin/v6-release`):**
   - Fully articulated **TARKA Production Release v5.0 (V6 Skeuomorphic Command System)**.
   - 26 Master Screens indexed and captured in `docs/judge_handbook/SCREENSHOT_INDEX.md` and compiled into `TARKA_JUDGE_DEMONSTRATION_HANDBOOK.pdf`.
   - Tactile skeuomorphic design language: warm ivory parchment canvas (`#E9E2D7`), debossed card bodies (`#F8F4ED`), deep espresso rail (`#221C19`), graphite headings (`#292522`), and restrained RGB semantic accents (Neural Sapphire `#476D91`, Urgent Amber `#A66A17`, Risk Crimson `#B6423B`, Safe Forest `#287653`).
   - High-fidelity interactive views: Fibonacci Particle Sphere home (`/?view=home`), Voice Interrogation Station (`v`), Command Centre (`/?view=workspace`), Case Workspace (`/?view=workstation`), Cryptographic Evidence Intake (`Alt+0`), Evidence Locker (`/?view=evidence`), 5-File Evidentiary Join, Financial Ledger & Double-Entry Balance Conservation, Money Trail Sankey Waterfall (`/?view=money`), Temporal Evidence Loom, Fraud Network Graph (`/?view=network`), Entity Intelligence KYC resolution (`/?view=people`), Claim Compiler & Z3 SMT Claim Dependency Lens, Cryptographic Provenance DAG, Investigation Flight Recorder, CGNAT Falsification Gate (`/?view=device`), SUTRAM Forensic Benchmark Lab (`/?view=benchmarks`), and Section 63 BSA Report Generator (`/?view=report`).

---

## 2. Comparative Analysis of Candidate Commits

| Candidate | Commit Hash | Branch | Author & Date | UI Characteristics & Design System | Functionality & Artifacts | Evaluation & Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Candidate Alpha (RECOMMENDED)** | `b5a5a254` | `remotes/origin/phase-14/implementation-completion` | Yaathra_P<br>2026-11-17 14:31 | **V6 Tactile Skeuomorphic Command System:** Warm ivory canvas (`#E9E2D7`), deep espresso rail (`#221C19`), recessed wells, debossed indicators, restrained RGB accents (`v6-tokens.css`). | **Complete 26 Master Screens:** Captured in `docs/judge_handbook/SCREENSHOT_INDEX.md`. Includes `TARKA_JUDGE_DEMONSTRATION_HANDBOOK.pdf` (5.7 MB), `TarkaContextualGuideModal`, voice-directed semantic element highlighting (`semanticRegistry.ts`, `highlightController`), and full route navigation (`tarkaNavigationRegistry.ts`). | **AUTHORITATIVE BASELINE:** Matches the officially approved Judge Demonstration Handbook exactly. Highest aesthetic cohesion and complete screen coverage. |
| **Candidate Beta** | `aa2b99a5` | `remotes/origin/v6-release` | Vippin Antony P<br>2026-11-15 00:33 | **V6 Skeuomorphic Pre-Handbook Baseline:** Warm ivory styling with early card borders and graph spacing fixes. | Contains core screens prior to final screenshot capture and judge handbook compilation. Lacks autonomous guide overlay and handbook collateral. | **STABLE ANCESTOR:** Useful reference, but superseded by `b5a5a25`. |
| **Candidate Gamma** | `39693497` | `remotes/origin/phase-16/bulk-intake-and-pages` | Vippin Antony P<br>2026-11-18 11:09 | **Hybrid Styling Drift:** Began shifting rail accents from warm espresso to cool navy/blue tones (`#071233`), modified some button typography floor rules. | Added bulk intake with proposed cases, upload planner, and column mapping modal. Removed `highlightController` and contextual guide. | **PARTIALLY DRIFTED:** Contains useful bulk intake utilities, but introduced styling drift away from the approved ivory skeuomorphic handbook standard. |
| **Candidate Delta** | `3a4c4ec3` | `remotes/origin/main` | Vippin Antony P<br>2026-11-18 15:56 | **Custom SVG Graph & Navy Theme:** Retained dark navy styling in navigation rail; replaced `FraudNetworkScreen` with `NetworkStep` using collision-free SVG graph renderer. | Added collision-free node labels, custom glyph set (victim, mule, cash-out, shop, bank, SIM, IP), and i2/Maltego/STIX export buttons. | **FEATURE SOURCE:** Excellent SVG network rendering algorithms (`NetworkSvg.tsx`, `glyphs.tsx`), but sidebar colors drifted from the judge handbook. |
| **Candidate Epsilon** | `c104b4f6` | `fix/ci-post-merge-repair` (HEAD) | Yaathra_P<br>2026-11-25 12:13 | **Dark Liquid-Glass:** Deep charcoal/black glass canvas (`#0A0D14`), cyan/teal accents, floating capsule docks (`liquid-glass.css`). | Singular component `TarkaForensicWorkstation.tsx` mounting 13 tabs. Real RapidOCR inference and robust backend integration, but omits the 26-screen command system. | **CURRENT BACKEND AUTHORITY:** Houses all production-hardened backend engines, OCR remediation, and UCM persistence. Needs the V6 frontend shell restored. |

---

## 3. The 26 Master Screens (Candidate Alpha `b5a5a25`)

Every screen listed below has an existing, verified high-resolution screenshot (1440 × 900) preserved at `docs/judge_handbook/screenshots/`:

```
01_particle_home.png                  (Deep black #07090D canvas, 8,800-pt Fibonacci sphere)
02_voice_interrogation.png            (Real-time audio waveform visualizer, Indic language selector)
03_command_centre.png                 (Tactical dashboard, golden hour countdown, directive queue)
04_investigations_workspaces.png      (Central FIR registry, evidentiary lockdown badges)
05_case_workspace.png                 (Forensic Workstation Hub with Loom, Lens, Recorder, Provenance)
06_case_overview.png                  (Disputed outflow vs recoverable pool vitals)
07_evidence_intake.png                (Cryptographic admission dropzone, SHA-256 progress)
08_evidence_locker.png                (Admitted exhibits with immutable cryptographic digests)
09_evidence_integrity.png             (BSA §63 Admissibility, hash mismatch detection)
10_five_file_evidentiary_join.png     (Cross-source correlation table: Statement, CBS, Switch, CDR, CGNAT)
11_financial_ledger.png               (Reconstructed transactions with amber dispute highlight)
12_double_entry_balance.png           (Mathematical balance equation conservation badge)
13_financial_reconstruction.png       (Multi-hop fund dissipation waterfall, Layer-1 to Layer-5)
14_temporal_evidence_loom.png         (Sub-millisecond chronological event stream, clock skew compensation)
15_fraud_network_graph.png            (Topological node-link graph, Louvain clusters, mule aggregator hub)
16_entity_intelligence.png            (KYC entity profiles, PAN/Aadhaar/phone resolution queue)
17_claim_compiler.png                 (Factual assertions extracted from natural language statements)
18_claim_dependency_lens.png          (Z3 SMT Solver formal satisfiability DAG proving consistency)
19_provenance_dag.png                 (Merkle-DAG mapping findings back to raw evidence SHA-256 hashes)
20_investigation_flight_recorder.png  (Append-only tamper-evident black-box recording with SHA-256 seals)
21_falsification_gate.png             (CGNAT Telemetry demultiplexing, Public IP + Port + UTC to IMSI)
22_benchmark_lab.png                  (SUTRAM Forensic Benchmark Lab: PaySim, IBM AML ROC curves)
23_report_generation.png              (Court-admissible investigation dossier compiler & judicial export)
24_audit_trail.png                    (Case Audit Trail drawer, custody chain log)
25_system_health.png                  (System Diagnostics & Telemetry, CPU/RAM/VRAM allocation)
26_model_voice_settings.png           (Platform Config & Voice Management, Indic speech model selector)
```

---

## 4. Restoration Architecture & Synthesis Strategy

To fulfill the mission of Phase 17 without regressing backend fixes or introducing visual artifacts:

1. **Selective Frontend Restoration from `b5a5a25`:**
   - Restore the full `frontend/src/v6/` module tree from commit `b5a5a25`, including all 26 screen components, the navigation rail (`V6Rail.tsx`), top bar (`V6Topbar.tsx`), application shell (`V6AppShell.tsx`), and skeuomorphic design tokens (`v6-tokens.css`).
   - Restore `frontend/src/context/TarkaGlobalContext.tsx`, `useCaseStore.ts`, and `useTarkaUiStore.ts` to power the full navigation hierarchy.
   - Restore the voice-directed semantic element highlighting system (`semanticRegistry.ts`, `highlightController`) and contextual guide (`tarkaContextualGuide.ts`).
2. **Selective Component Enhancements from `3a4c4ec`:**
   - Integrate the collision-free SVG graph layout engine (`NetworkSvg.tsx`, `glyphs.tsx`, `graphLayout.ts`) into the Fraud Network screen while maintaining the warm skeuomorphic color scheme.
3. **Backend Wire-Up & Unification:**
   - Connect `V6AppShell` directly to the verified backend APIs in `backend/app/api/forensics_api.py`.
   - Ensure the Cryptographic Evidence Intake modal (`Alt+0`) and Massive Evidence Intake trigger the canonical Tus 1.0.0 chunked streaming pipeline with immediate read-back SHA-256 verification and durable job creation via `ForensicJobOrchestrator`.
   - Ensure the Claim Dependency Lens and Provenance DAG reflect the persisted UCM case observations and Z3 SMT solver results from the active backend.
   - Retain `TarkaForensicWorkstation` as an accessible advanced view mode (`/?view=workstation&mode=forensics`) so both the high-level skeuomorphic command centre and deep-dive forensic tab views are simultaneously available.
4. **Git Safety:**
   - All changes performed cleanly via selective file additions and updates on `fix/ci-post-merge-repair`.
   - Zero history rewriting, zero force-pushes.
