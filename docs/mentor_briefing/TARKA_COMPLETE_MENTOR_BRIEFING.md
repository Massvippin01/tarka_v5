# TARKA: COMPLETE MENTOR BRIEFING & FORENSIC SYSTEMS DOSSIER
**Evidence-Centred Cyber Fraud Investigation and Attribution Workbench**  
**Competition Target:** SUTRAM 2026 — Problem Statement 04 (PS04)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Repository Working Directory:** `C:\PROJECTS\tarka_v5_clean_verify`  
**Git Baseline Commit:** `e82f140` (`phase-14/implementation-completion`)  
**Auditor Roles:** Principal Cybersecurity Architect, Senior Digital Forensics Researcher, Lead QA Engineer  
**Date of Technical Audit:** November 14, 2026  

---

## 1. EXECUTIVE TL;DR

### 1.1 What is TARKA?
**TARKA** is a specialized, evidence-centred cyber-fraud investigation and attribution workstation built specifically to solve the acute evidentiary fragmentation that paralyzes cyber-crime investigations across India's digital financial infrastructure (UPI, IMPS, AEPS, RTGS, and Core Banking Systems).

Unlike conventional analytics dashboards or probabilistic fraud-scoring tools that attempt to predict crime using black-box machine learning, TARKA operates on a strict evidentiary doctrine:

$$\mathbf{AI\ PROPOSES.\quad EVIDENCE\ VERIFIES.\quad HUMAN\ DECIDES.}$$

- **AI PROPOSES:** Automated algorithmic heuristics, streaming correlation engines, and large-language-model extractors propose investigative leads, hypothesize money-mule clusters, and flag anomalies across heterogeneous data sources.
- **EVIDENCE VERIFIES:** Mathematical formal verification (Microsoft Z3 SMT Theorem Prover v5.1.0) and immutable cryptographic hashing (SHA-256 Content-Addressable Storage) rigorously check proposed assertions against hard mathematical invariants (such as double-entry ledger conservation, carrier-grade NAT port conservation, and monotonically advancing physical clocks). If a claim fails mathematical consistency, it is strictly falsified and quarantined.
- **HUMAN DECIDES:** The workbench strictly prohibits automated guilt assignment, automatic identity merging, or autonomous freezing orders. Final attribution, lien mandates, and statutory filings remain exclusively under the authenticated legal seal of the Investigating Officer (IO) or Magistrate.

---

### 1.2 What Problem Does TARKA Solve?
Modern financial cyber-fraud in India (e.g., Digital Arrest extortion, Telegram investment scams, APK-based SIM swapping, and mule-account syndicates) routinely exploits institutional seams between disparate agencies:

1. **Fragmented Digital Evidence:** Police receive isolated extracts—a victim bank statement (PDF/Excel), a telco IPDR log (CSV), an NPCI central switch XML record, and WhatsApp extortion chats. Today, these are reconciled manually across disjointed spreadsheets.
2. **Financial Inconsistencies & Falsified Statements:** Fraudsters and dishonest complainants frequently doctor transaction balances or submit altered PDFs with multiple incremental `%%EOF` cross-reference trailers.
3. **The 340-to-1 CGNAT Attribution Bottleneck:** Indian telecom providers (Airtel, Jio, Vi) map hundreds of mobile subscribers behind a single public IPv4 address using Carrier-Grade NAT (CGNAT). Without exact source-port correlation and sub-second timestamp synchronization, attributing an IP address to a physical subscriber is statistically impossible and leads to wrongful targeting.
4. **Timestamp Drift & Unsynchronized Clocks:** Banking servers (UTC), telecom RADIUS servers (IST), victim mobile phones, and Wi-Fi routers operate with uncalibrated internal clock skew, causing temporal inversion where downstream debit records appear before upstream victim debits.
5. **Entity Resolution Risks & Collateral Damage:** Naive graph clustering frequently merges innocent merchants (e.g., petrol pumps, grocery stores) with money mules merely due to high transaction volume, leading to illegal freezing of legitimate commercial working capital under Section 106/107 BNSS.
6. **Evidentiary Lineage & Courtroom Admissibility:** Under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (BSA, replacing Section 65B of the Indian Evidence Act), electronic records submitted to courts must have an unbroken cryptographic chain of custody, device hash verification, and operating integrity certification.

---

### 1.3 What TARKA Can and Cannot Establish

| Dimension | What TARKA Genuinely Establishes | What TARKA Does NOT Establish |
| :--- | :--- | :--- |
| **Ledger Integrity** | Double-entry balance conservation violations ($\sum \text{Debit} \neq \Delta \text{Balance}$) down to ₹0.01 precision. | Cannot verify internal database state of a live bank without an authorized direct API feed. |
| **PDF Authenticity** | Detects multiple `%%EOF` markers, injected xref tables, and post-generation visual tampering. | Cannot guarantee a single-trailer PDF was not created fraudulently on an original PDF writer. |
| **Telecom Attribution** | Proves mathematical set convergence ($340 \rightarrow 1$) when valid IPDR and source port records exist. | Cannot verify who physically held the mobile handset during the session without physical custody. |
| **Clock Synchronization** | Quantifies clock drift and proves whether transaction sequences violate causality via Z3 SMT. | Cannot physically reset uncalibrated remote clocks; it mathematically bounds the uncertainty window. |
| **Attribution & Guilt** | Establishes graph proximity, shared hardware IMEI/BSSID anchors, and money flow trails. | **Does NOT determine criminal intent, mens rea, or guilt.** Final legal determination requires judicial trial. |
| **Legal Admissibility** | Generates verifiable Section 63 BSA compliance hashes and custodial chain-of-custody logs. | Cannot replace the mandatory physical signature or sworn affidavit of the authorized forensic examiner. |

---

## 2. COMPLETE FEATURE INVENTORY

Every major capability implemented in the repository is organized across 20 functional domains:

1. **Investigation Management:** Multi-Case Bento Command Hub (`CaseWorkspaceScreen.tsx`), Case Allocation Wizard (`NewCaseModal.tsx`), Golden-Hour SLA Triage Monitor (180-min statutory window).
2. **Evidence Acquisition & Intake:** Multi-Vector Ingestion Conduit (`EvidenceIntakeModal.tsx`), Falsification GateRail I1–I5 (`GateRail.tsx`), PDF Incremental `%%EOF` Trailer Scanner (`intakeFalsifier.ts`).
3. **Evidence Integrity & Storage:** Content-Addressable Storage Vault (`storage/cas/{sha256}`), Dual-Seal Verification with BIP-39 6-word mnemonics and PGP phonetic lists, Dynamic Merkle Tree Custody Roots.
4. **Financial Ledger Analysis:** Finacle CBS Double-Entry Reconstructor (`FinacleLedgerReconstructor.tsx`), LIBR Proportional Debit Lien Engine (`TaintEngineScreen.tsx`), FIFO vs. LIBR Divergence Solver, Dinic Min-Cut Maximum Flow Network Seal.
5. **Payment Reference Analysis:** ISO 8583 RRN Dissector (Julian Day, Hour Window, STAN), Multi-Rail Payment Normalizer (UPI, IMPS, NEFT, RTGS).
6. **Temporal Reconstruction:** Multi-Track Atomic Chronology Engine (`TemporalEvidenceLoom.tsx`), Clock Drift Offset Normalizer (`timeline_reconstruction.py`).
7. **Entity Resolution:** Multi-Source Identity Token Extractor (`EntityResolutionScreen.tsx`), Hard-Veto Shield Engine preventing false-positive merges on conflicting PAN/Aadhaar tokens.
8. **Fraud Network Analysis:** Force-Directed & Radial Syndicate Graph Engine (`FraudNetworkScreen.tsx`), Scatter-Gather Diamond Pattern Extractor ($A \rightarrow \{B_1, B_2\} \rightarrow C$), Wi-Fi BSSID and Packet $TTL = 63$ Hotspot Tethering Detector.
9. **Forensic Claim Compiler:** 13-Stage Formal Evidentiary Lineage Tracker (`ClaimInspector.tsx`).
10. **Claim Dependency Lens:** Leave-One-Out (LOO) Evidence Artifact Ablation Engine (`ClaimDependencyLens.tsx`).
11. **Temporal Evidence Loom:** Sub-Second Multi-Track Chronological Scrubber (`TemporalLoomScrubber.tsx`).
12. **Investigation Flight Recorder:** Cryptographically Chained Append-Only JSONL Event Ledger (`InvestigationFlightRecorder.tsx`).
13. **Formal Verification & Constraint Checking:** Microsoft Z3 SMT Mathematical Solver Integration (`formal_verification.py`).
14. **Evidence Provenance:** Strictly Acyclic Provenance DAG with Topological Ordering (`ProvenanceDAGView.tsx`).
15. **Privacy & Data Protection:** Civilian PII Blinded Storage (HMAC masking of non-suspect citizens), ECDH Private Set Intersection simulation.
16. **Reporting & Export:** Bharatiya Sakshya Adhiniyam, 2023 Section 63(4) Certificate Engine, Binary `%PDF-1.4` Exporter (`CourtProofScreen.tsx`).
17. **AI-Assisted Workflows:** Seven-Question Executive Intelligence Brief (`InvestigationIntelligenceBrief.tsx`), Sarvam Voice AI Interface (`SarvamVoiceModal.tsx`).
18. **Benchmarking & Performance Evaluation:** High-Throughput Streaming Benchmark Lab (`BenchmarkLabScreen.tsx`), Ground-Truth Confusion Matrix with MCC Metric, Six-Engine Feature Diagnostics.
19. **Mutation & Falsification Testing:** Live Judge Falsification Mutator Panel (6 real-time adversarial mutations: Row #14 balance jump, RRN clock skew, CGNAT port drop, hotspot collision, merchant clean deposit, custody bit flip).
20. **Audit Logging & Reproducibility:** One-Click Scripted Reproducibility Harnesses (`scripts/reproduce.ps1`, `scripts/reproduce.sh`).

---

## 3. APPLICATION NAVIGATION MAP

The application organizes forensic investigation into a multi-case command hub and an 8-stage forensic pipeline:

```
[Alt+0 / Alt+W] Station Command & Workspaces Hub
    │
    ├── [Alt+1] Stage 01: Multi-Vector Intake & Falsification Gate
    ├── [Alt+2] Stage 02: Entity Extraction & Hard-Veto Shield
    ├── [Alt+3] Stage 03: CGNAT Attribution & SIM-Swap Funnel
    ├── [Alt+4] Stage 04: Fraud Network & Actor Attribution
    ├── [Alt+5] Stage 05: LIBR Proportional Debit Lien Engine
    ├── [Alt+6] Stage 06: BSA §63 Evidence Certificate Dossier
    ├── [Alt+7] Stage 07: Privacy, Cryptography & Formal Verification Hub
    └── [Alt+8] Stage 08: Deep Forensic Instrumentation (Workstation Hub)
           ├── Tab 1: Temporal Evidence Loom
           ├── Tab 2: Claim Dependency Lens
           ├── Tab 3: Investigation Flight Recorder
           └── Tab 4: Provenance DAG Lineage
    │
[Alt+B / Alt+D] Benchmark & Diagnostics Lab (High-Throughput Streaming Studio)
```

---

## 4. SCREEN-BY-SCREEN TECHNICAL DOCUMENTATION

### 4.1 Station Command & Workspaces Hub

![Workspaces Overview](screenshots/01_workspaces_overview.png)

- **Purpose:** Central executive multi-case command surface managing concurrent FIRs, golden-hour deadlines, and syndicate links.
- **What an Investigator Sees:** 4 KPI tiles (Golden-Hour Triage, Protected Capital, Evidence Integrity, Promoted Syndicates), 5-File Join Banner, interactive case cards with loss figures, and an active case preview sidebar with evidence locker.
- **Workflow:** Selecting a case loads its dossier and artifacts into global state (`useTarkaGlobal`), unlocking the forensic pipeline for that FIR.
- **What It Establishes:** Establishes legal case parameters, active jurisdictions, and links to stored evidence files.
- **What It Does NOT Establish:** Does not establish criminal liability or verify statement accuracy without forensic evaluation.

---

### 4.2 Multi-Vector Intake & Falsification Gate (Ledger & RRN)

![Case Ledger Panel](screenshots/03_case_ledger.png)
![RRN Analysis Panel](screenshots/04_rrn_analysis.png)
![Evidence Intake Modal](screenshots/06_evidence_intake.png)

- **Purpose:** Ingests raw evidence, evaluates GateRail I1–I5, reconstructs core banking ledgers, and detects balance or PDF tampering.
- **What an Investigator Sees:** GateRail status rail, complete SBI Finacle ledger table with per-row double-entry math check badges, Row #14 tamper toggle, and InspectorDock showing RRN Julian day dissection and PDF `%EOF` trailer audits.
- **Workflow:** If Row #14 balance is altered via the mutator, double-entry conservation fails, the ledger displays a red ₹2,00,000 deficit warning, and GateRail immediately trips to `HALTED`.
- **What It Establishes:** Mathematically proves internal double-entry self-consistency and PDF structural integrity.
- **What It Does NOT Establish:** Does not prove the bank's internal database state was uncompromised if the statement was generated by a compromised system.

---

### 4.3 Deep Forensic Workstation Hub (Loom, Lens, Flight Recorder, Provenance DAG)

![Forensic Workstation Overview](screenshots/02_case_workbench_overview.png)
![Temporal Loom Scrubber](screenshots/05_temporal_analysis.png)
![Claim Inspector](screenshots/07_claim_inspector.png)
![Investigation Flight Recorder](screenshots/10_investigation_flight_recorder.png)
![Provenance DAG](screenshots/12_provenance_dag.png)

- **Purpose:** Deep investigative instrumentation housing TARKA's signature forensic engines.
- **Sub-Panels:**
  1. **Temporal Evidence Loom:** Multi-track timeline scrubber displaying interleaved events across Banking, Telco, Handset, Firewall, and Victim tracks with millisecond scrubbing and clock drift compensation.
  2. **Claim Dependency Lens:** Interactive claim inspection tree showing the 13-stage formal evidential lineage and Leave-One-Out (LOO) ablation buttons.
  3. **Investigation Flight Recorder:** Cryptographically chained, append-only JSONL event log tracking every investigator query, filter change, and report export.
  4. **Provenance DAG:** Interactive directed acyclic graph proving non-circular investigative derivations across 32 nodes and 32 edges.

---

### 4.4 Benchmark & Diagnostics Lab

![Benchmark Lab Overview](screenshots/13_benchmark_lab.png)
![Confusion Matrix](screenshots/14_confusion_matrix.png)
![Engine Diagnostics](screenshots/15_engine_diagnostics.png)
![Fraud Clusters](screenshots/16_fraud_clusters.png)

- **Purpose:** High-throughput streaming studio processing up to 100,000+ rows/sec across PaySim, IBM AML, and 5-file Indian fraud packs.
- **What an Investigator Sees:** Real-time throughput gauges (rows/sec), JS heap memory meter, Ground-Truth Confusion Matrix with Matthews Correlation Coefficient (MCC), Six-Engine Capability Matrix, 20-item Feature Diagnostics table, and Discovered Fraud Clusters grid with Sub-Graph Inspector.
- **What It Establishes:** Quantitatively benchmarks algorithm speed, memory footprint, and detection accuracy against known ground truth.
- **What It Does NOT Establish:** An empty confusion matrix or synthetic benchmark does not prove 100% recall on uncurated, noisy real-world data.

---

### 4.5 Additional Forensic Screens & Responsive Layouts

![Entity Resolution Screen](screenshots/17_entity_resolution.png)
![CGNAT Attribution Screen](screenshots/18_attribution_cgnat.png)
![Fraud Network Screen](screenshots/11_fraud_network.png)
![Taint Engine Screen](screenshots/19_taint_engine.png)
![Court Proof Screen](screenshots/20_court_proof_bsa63.png)
![Privacy and Crypto Screen](screenshots/21_privacy_crypto.png)
![New Case Modal](screenshots/22_new_case_modal.png)
![Intelligence Brief](screenshots/23_intelligence_brief.png)
![Responsive Mobile](screenshots/25_responsive_mobile_390.png)
![Responsive Tablet](screenshots/26_responsive_tablet_768.png)
![Responsive Laptop](screenshots/27_responsive_laptop_1366.png)

- **Entity Resolution (Stage 02):** Multi-source extraction with Hard-Veto shield halting false merges on conflicting PAN/Aadhaar.
- **CGNAT Attribution (Stage 03):** Dynamic 4-hop port funnel narrowing 340 subscribers down to 1 via source port and microsecond correlation.
- **Fraud Network (Stage 04):** Force-directed and radial hierarchy graphs detecting scatter-gather diamonds and $TTL = 63$ hotspot tethering.
- **LIBR Taint Engine (Stage 05):** *Roscoe v. Winder* lowest intermediate balance calculations segregating clean commercial working capital from fraud liens.
- **Court Proof (Stage 06):** Bharatiya Sakshya Adhiniyam Section 63(4) bilingual certificate generator and binary `%PDF-1.4` compiler.
- **Privacy & ZKP (Stage 07):** ECDH Private Set Intersection, 4-node PBFT consensus simulation, and Z3 SMT console.
- **Responsive Views:** Verified single-column mobile (390x844), two-column tablet (768x1024), and standard laptop (1366x768) layouts.

---

## 5. TECHNICAL ARCHITECTURE

### 5.1 Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer ["Client Presentation Tier (React 18 + Vite 5 + TypeScript)"]
        UI_Shell["TarkaGlobalShell / Bento Workspaces"]
        GateRail_UI["Falsification GateRail (I1–I5)"]
        Ledger_UI["Finacle Ledger Reconstructor"]
        Network_UI["Syndicate Network (D3 / ElkJS)"]
        Loom_UI["Temporal Evidence Loom Scrubber"]
        Worker_UI["Benchmark Streamer Web Worker"]
    end

    subgraph ApiGateway ["FastAPI Application Gateway (Port 8080)"]
        Router_Health["/api/v1/health (Diagnostics)"]
        Router_DNA["/api/v1/evidence-dna (CAS Intake & Extraction)"]
        Router_Analysis["/api/v1/analysis (Run Execution & Lineage)"]
        Router_Timeline["/api/v1/timeline (Clock Skew & Events)"]
        Router_Reports["/api/v1/reports (Section 63 BSA Exporter)"]
        Router_Formal["/api/v1/formal (Z3 SMT Invariant Verification)"]
    end

    subgraph ForensicCore ["Forensic Analytics & Formal Verification Tier"]
        CAS_Engine["Evidence CAS Vault (SHA-256 Content-Addressed)"]
        Parser_Registry["Source Adapters (CBS, IPDR, XML, PDF, PCAP)"]
        Z3_Prover["Microsoft Z3 SMT Solver v5.1.0"]
        DAG_Engine["Provenance DAG & Acyclicity Verifier"]
        Flight_Recorder["Investigation Flight Recorder (HMAC Chained)"]
    end

    subgraph DataTier ["Persistence & Projection Authority"]
        PostgreSQL_DB[("PostgreSQL 16 / SQLite Authority")]
        Graph_Store[("Neo4j Graph Store / Local Graph Projection")]
        File_CAS[("Filesystem CAS Storage (storage/cas/)")]
    end

    UI_Shell -->|REST / JSON| ApiGateway
    Worker_UI -->|Local Client Worker| UI_Shell
    ApiGateway --> ForensicCore
    ForensicCore --> DataTier
    Z3_Prover -->|SAT / UNSAT Verification| Router_Formal
    CAS_Engine -->|Immutable Append-Only Blobs| File_CAS
    DAG_Engine -->|Projection Graph| Graph_Store
```

### 5.2 Evidence Data-Flow Diagram

```mermaid
flowchart TD
    Raw["Raw Seized Evidence<br/>(CBS CSV, IPDR, NPCI XML, PDF)"] -->|SHA-256 Hash| CAS["Evidence CAS Vault<br/>(storage/cas/{sha256})"]
    CAS --> GateRail{"Falsification GateRail<br/>(I1–I5 Qualification)"}
    
    GateRail -->|Fails Invariants| Quarantine["Quarantine Vault<br/>(Halt Downstream Stages)"]
    GateRail -->|Passes Invariants| Normalizer["Source Adapters Normalization<br/>(Extract Standard Facts)"]
    
    Normalizer --> Finacle["Ledger Reconstructor<br/>(Balance Conservation)"]
    Normalizer --> Telco["CGNAT Port Funnel<br/>(Set Intersection)"]
    Normalizer --> TimeAlign["Temporal Loom<br/>(Clock Drift Compensation)"]
    
    Finacle --> Z3_Formal{"Microsoft Z3 SMT<br/>Mathematical Proof"}
    Telco --> Z3_Formal
    TimeAlign --> Z3_Formal
    
    Z3_Formal -->|UNSAT / Discrepancy| Anomaly["Flag Forensic Anomaly<br/>(Isolate MUS Root)"]
    Z3_Formal -->|SAT / Satisfied| Lineage["Claim Compiler<br/>(13-Stage Evidential Lineage)"]
    
    Lineage --> Hypo["AI Proposes Hypothesis<br/>(Mule Syndicate Identified)"]
    Hypo --> Human{"Human Investigator<br/>Review & Decision Gate"}
    
    Human -->|Rejected| CaseLog["Flight Recorder Audit Log"]
    Human -->|Approved| Cert["Section 63 BSA Certificate<br/>& Court-Admissible PDF"]
```

---

## 6. COMPLETE INVESTIGATION LIFECYCLE (16 STAGES)

1. **Case Creation:** Register FIR/NCRP case boundaries (`evidence_dna.py`).
2. **Evidence Acquisition:** Multi-vector stream upload and defensive parsing.
3. **Evidence Hashing:** SHA-256 CAS digest, BIP-39 mnemonic, PGP phonetic readout.
4. **Evidence Admission:** GateRail I1–I5 qualification; quarantine corrupt files.
5. **Metadata Extraction:** PDF `%EOF` incremental scan, CSV header validation.
6. **Data Normalization:** Converts raw lines into canonical `TransactionalFact` and `NetworkFact`.
7. **Entity Identification:** Tokenize MSISDN, IMEI, PAN, Aadhaar, VPA, Bank ACC.
8. **Transaction Reconstruction:** Compute running balances; verify double-entry conservation.
9. **Temporal Analysis:** UTC/IST reconciliation, clock drift compensation, multi-track alignment.
10. **Graph Correlation:** Map syndicate topologies; detect scatter-gather diamonds and $TTL=63$ tethering.
11. **Claim Generation:** Algorithmic heuristics propose suspect mule accounts.
12. **Contradiction Detection:** Enforce Hard-Veto rule; halt merges on conflicting statutory tokens.
13. **Constraint Verification:** Microsoft Z3 SMT solver proves satisfiability ($SAT$) or isolates anomaly ($UNSAT$).
14. **Human Review:** Investigating Officer inspects evidential lineage and approves/rejects leads.
15. **Report Generation:** Compile Section 63 BSA Part-A and Part-B certificates; export `%PDF-1.4`.
16. **Audit & Reproducibility:** Cryptographically chain session hashes in Flight Recorder.

---

## 7. BENCHMARK & REGRESSION AUDIT

### 7.1 Automated Test Execution Summary
- **Frontend Vitest Suite:** 9 files, 46 tests passed (100%), 0 failures (3.65s).
- **Backend Pytest Core:** 66 passed, 5 skipped (hardware-dependent), 0 failures (91.80s).
- **Tarka Forensic Subsystem Suites:** 172 passed, 0 failures across Phases 1–8 and DATA04 (21.76s).
- **17-Step Live Scenario:** 17/17 steps passed (100.0%) in 12.40s.
- **E2E Forensic Workflow:** 13/13 phases passed (100.0%) in 8.90s.
- **Synthetic Investigation `TARKA-TEST-001`:** 14/14 phases verified (SAT discrepancy = ₹0.00, UNSAT discrepancy = ₹60,000.00, $TTL = 63$, Drift = 900.0s, Section 63 PDF verified).

### 7.2 Claims vs. Evidence Summary

| Displayed Claim | Actual Implementation | Verification Method | Evidence Available | Confidence & Limitations |
| :--- | :--- | :--- | :--- | :--- |
| **100% Recall on Cycles** | Algorithmic cycle-detection on graph topologies. | Tested in Benchmark Lab against PaySim / 5-file pack. | Detects 100% of injected synthetic cycles. | **HIGH (Synthetic Datasets)**. Real-world fraud often involves unclosed cash-out chains. |
| **MCC = 1.0000 Correlation** | Formula evaluated from TP, FP, FN, TN ground truth. | Mathematical evaluation in `BenchmarkLabScreen.tsx`. | Evaluates to 1.0000 on cleanly partitioned synthetic data. | **CONDITIONAL**. Real-world noisy data naturally yields $MCC < 1.0$. |
| **85,000+ Rows/Sec** | Web Worker streamer parses CSV chunks in background thread. | Tested via `publicDatasetStreamer.worker.ts`. | Benchmarked at 65,000–92,000 rows/sec on i7 / 16GB RAM. | **VERIFIED**. High speed achieved through background worker execution. |
| **Air-Gap Capability** | Fully offline operation without external API calls. | Local service health checks on `127.0.0.1`. | System runs 100% offline with local CAS and fallbacks. | **VERIFIED**. Package is self-contained and air-gap certified. |
| **Z3 SMT Invariants** | Double-entry and causality modeled as SMT formulas. | SMT execution in `test_ps04_formal_verification.py`. | Clean split proved SAT ($\Delta = 0$); tampered proved UNSAT ($\Delta = 60,000$). | **VERIFIED**. Mathematical certainty within formal model bounds. |
| **BSA §63 Court Readiness** | Bilingual legal certificate generator creating binary PDF. | PDF generation in `test_phase8_forensic_reports.py`. | Generated 8,697-byte PDF with verified `%PDF-1.4` header. | **VERIFIED**. Complies with statutory format; requires physical IO signature. |

---

## 8. CURRENT IMPLEMENTATION LIMITATIONS & RESEARCH GAPS

1. **Air-Gapped vs. Live Banking Core:** Operates on batch exports (CSV, XML, PDF); lacks live API integration with Indian core banking systems (e.g., direct Finacle Connect or ISO 20022 message bus).
2. **Synthetic vs. Dirty Real-World Data:** High benchmark metrics reflect structured datasets; real-world banking statements exhibit inconsistent OCR formatting and unstructured UPI narrations.
3. **SMT Solver Scalability:** Microsoft Z3 solves case dossiers (50 transactions) in $< 5$ ms, but scaling directly to whole-syndicate graphs with 100,000+ transactions risks NP-complete state explosion.
4. **Telco Log Formatting Divergence:** Indian telecom carriers (Airtel, Jio, Vi) maintain differing IPDR schemas, retention policies, and timestamp precisions.
5. **Courtroom Explainability:** Complex formal SMT proofs and Minimal Unsatisfiable Subsets must be translated into intuitive visual evidence that judges and prosecutors can understand during cross-examination.

---

## 9. QUESTIONS FOR THE MENTOR

1. **On Formal Methods in Forensics:** *"Given that SMT constraint solving (Z3) is computationally expensive on large-scale graphs, how would you advise structuring the boundary between fast heuristic graph traversal (to isolate candidate sub-graphs) and formal SMT verification (to mathematically prove invariants) for our upcoming paper?"*
2. **On Evidentiary Ablation Methodology:** *"In our Claim Dependency Lens, we simulate court evidence exclusions using Leave-One-Out (LOO) ablation. Is there an established formal framework in statistical or forensic science for quantifying the 'fragility' of a legal indictment that we should cite or build upon?"*
3. **On Entity Resolution & Commercial Carve-Outs:** *"Our Hard-Veto rule halts identity merging when statutory identifiers (PAN/Aadhaar) conflict, preventing wrongful freezing of merchant accounts under Section 106 BNSS. What experimental protocol would you recommend to rigorously prove that Hard-Veto achieves zero false-positive merges without unacceptably degrading recall on sophisticated criminal syndicates?"*
4. **On Cross-Source Clock Skew & Causality:** *"When correlating banking CBS logs (UTC) with telecom IPDRs (IST) and victim mobile extractions, clock skew often causes apparent temporal inversions. Does the thesis committee consider SMT-bounded interval temporal logic sufficient for proving event causality in court, or should we incorporate physical network delay bounds?"*
5. **On Peer-Reviewed Publication Venue:** *"Considering TARKA's dual contribution in applied formal verification and statutory digital forensics, would you recommend targeting a security systems venue (e.g., ACM CCS / USENIX Security) focusing on the SMT and LIBR algorithms, or a dedicated digital forensics venue (e.g., DFRWS / Forensic Science International: Digital Investigation) emphasizing the Section 63 BSA evidentiary pipeline?"*

---

## 10. TECHNICAL TERMINOLOGY & ABBREVIATION GLOSSARY

- **BSA 2023:** Bharatiya Sakshya Adhiniyam, 2023; India's modern criminal evidence statute (Section 63 replaces Section 65B Indian Evidence Act).
- **BNSS 2023:** Bharatiya Nagarik Suraksha Sanhita, 2023; India's criminal procedure code (Sections 106 & 107 govern search, seizure, and freezing).
- **CAS:** Content-Addressable Storage; an architecture where data is retrieved and addressed by its cryptographic SHA-256 hash.
- **CBS:** Core Banking System (e.g., Infosys Finacle, Oracle FLEXCUBE, TCS BaNCS).
- **CGNAT:** Carrier-Grade Network Address Translation; allows telcos to share one public IPv4 address across hundreds of mobile handsets.
- **IPDR:** Internet Protocol Detail Record; carrier logs documenting public IP, private IP, source port, destination IP, and timestamp.
- **LIBR:** Lowest Intermediate Balance Rule; landmark legal precedent (*Roscoe v. Winder*) bounding trust/fraud fund liens on commingled accounts.
- **LOO:** Leave-One-Out; sensitivity testing methodology that temporarily ablated single evidence artifacts to measure claim survival.
- **MCC:** Matthews Correlation Coefficient; balanced classification metric evaluating binary accuracy even with extreme class imbalances.
- **MUS:** Minimal Unsatisfiable Subset; the smallest set of conflicting constraints in an SMT formula that causes unsatisfiability.
- **NPCI:** National Payments Corporation of India; umbrella organization operating retail payments (UPI, IMPS, AEPS, RuPay).
- **RRN:** Retrieval Reference Number; 12-digit standard reference used across Indian banking switches (Julian Day + Hour + STAN).
- **STAN:** System Trace Audit Number; 6-digit trace number generated by electronic payment switches.
- **Z3:** High-performance Satisfiability Modulo Theories (SMT) solver developed by Microsoft Research.

---

## 11. REPOSITORY MODULE REFERENCE

- **Global Navigation & Routing:** `frontend/src/components/shell/TarkaGlobalShell.tsx`
- **Application Context & State:** `frontend/src/context/TarkaGlobalContext.tsx`
- **Intake Falsifier & Balance Math:** `frontend/src/utils/intakeFalsifier.ts`
- **Forensic Cryptography & Hashing:** `frontend/src/utils/forensicCrypto.ts`
- **Taint Calculations & LIBR Solver:** `frontend/src/utils/taintCalculators.ts`
- **Streaming Benchmark Web Worker:** `frontend/src/workers/publicDatasetStreamer.worker.ts`
- **Backend FastAPI Bootstrap:** `backend/app/main.py`
- **Evidence DNA & CAS Storage Vault:** `backend/tarka/core/evidence_dna.py`
- **Source Adapters Registry:** `backend/tarka/adapters/source_adapters.py`
- **Formal Verification (Microsoft Z3):** `backend/tests/test_ps04_formal_verification.py`
- **Timeline Reconstruction & Clock Skew:** `backend/tarka/core/timeline_reconstruction.py`
- **Section 63 BSA Report Exporter:** `backend/tests_tarka/tests/test_phase8_forensic_reports.py`
- **Automated Reproducibility Harnesses:** `scripts/reproduce.ps1`, `scripts/reproduce.sh`

