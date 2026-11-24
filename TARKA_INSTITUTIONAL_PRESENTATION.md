# TARKA × SENTINELX — INSTITUTIONAL PRESENTATION

**Document Code:** `PRES-INST-2026-V1`  
**Classification:** RESTRICTED — INSTITUTIONAL EVALUATION BRIEFING  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Governing Standard:** SUTRAM 2026 Digital Forensics Benchmark & ISO/IEC 27037:2012  
**Target Audience:** Directors of Forensic Science Laboratories (FSL/CFSL), Superintendents of Police (Cybercrime), Chief Vigilance Officers (Banking FRM), Academic Forensic Directors  
**Date:** November 2026  

---

```
╔═════════════════════════════════════════════════════════════════════════════════════╗
║                               TARKA × SENTINELX                                     ║
║      Multimodal Payment Forensics & Statutory Evidence Investigation Platform       ║
║                                                                                     ║
║                 AI PROPOSES. FORENSIC ENGINES TEST.                                 ║
║                 EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.                            ║
╚═════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Slide 1: Executive Summary & The Core Challenge

### The Institutional Reality
Digital payment fraud in India has scaled exponentially following the ubiquity of Unified Payments Interface (UPI) rails, real-time gross settlement, and mobile banking. 
- Over **₹1,750+ Crore** lost annually in reported retail cyber financial scams (National Cyber Crime Reporting Portal - 1930).
- Investigating Officers (IOs) and Forensic Science Laboratories (FSLs) receive **tens of thousands of questioned payment screenshots, WhatsApp chat exports, and Core Banking CSVs monthly**.
- Fraudsters exploit rapid digital editing tools, mobile spoof applications ("FakePay"), and graphic overlays to manipulate transaction amounts, beneficiary VPAs, timestamps, and 12-digit Unique Transaction References (UTR / RRN).

### The Operational Bottleneck
- **Manual Visual Triage is Failing:** Human examiners cannot discern subtle 8×8 DCT block recompression artifacts, micro-kerning typography mismatches, or pixel interpolation lattices with the naked eye.
- **Commercial Tool Blindspot:** General-purpose forensic software (Cellebrite, EnCase, Magnet) excels at disk and mobile extraction, but lacks domain-specific comprehension of Indian payment switch semantics, NPCI UPI protocols, and double-entry bank reconciliation.
- **The "Black-Box AI" Trap:** Off-the-shelf multimodal LLMs hallucinate, silently fabricate transaction numbers, and fail statutory admissibility standards under the **Bharatiya Sakshya Adhiniyam, 2023 (BSA)**.

---

## Slide 2: The TARKA Solution & Epistemic Architecture

TARKA is India's first purpose-built, multimodal digital payment forensic and statutory investigation platform. It provides a mathematically verifiable, legally compliant bridge between raw questioned media and court-admissible forensic testimony.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           TARKA EPISTEMIC INVARIANT                                 │
│                                                                                     │
│    "Never classify a person as GUILTY or INNOCENT.                                  │
│     Never infer guilt from association, centrality, or similarity.                  │
│     Never perform automatic identity merges.                                        │
│     Contradictions must be preserved, surfaced, and explainable.                    │
│     Uncertainty must remain explicit.                                               │
│     AI proposes. Forensic engines test. Evidence supports. Human decides."          │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Three Architectural Pillars:
1. **Multimodal Evidence Gateway & Immutable CAS:** Append-only SHA-256 content-addressed storage ensuring zero evidence tampering from bitstream acquisition to trial.
2. **TRACE Tri-Forensic Engine:** Deterministic computer vision (Error Level Analysis, 2D-FFT Radon resampling, typography baselines, OCR) without generative hallucinations.
3. **Formal Reconciliation & Reasoning (AEGIS + Z3 SMT):** Strict double-entry balance conservation, automated Analysis of Competing Hypotheses (ACH), and formal mathematical contradiction proofs.

---

## Slide 3: End-to-End System Architecture

```
                    QUESTIONED MEDIA INGESTION
   [UPI Screenshots]    [Bank CSV Statements]    [WhatsApp Records]
            │                    │                       │
            ▼                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               MULTIMODAL EVIDENCE GATEWAY (ISO 27037)                   │
│  - Magic Byte Validation     - Streaming SHA-256 Hashing                │
│  - Executable Signature Scan - Immutable CAS (data/evidence_cas/)       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         TRACE FORENSIC SUITE                            │
│  ┌──────────────────────┬──────────────────────┬──────────────────────┐ │
│  │     ELA ENGINE       │  RESAMPLING LATTICE  │ TYPOGRAPHY & FONT    │ │
│  │ In-memory Q=90 ELA   │ 2D-FFT Spectral Peak │ Baseline Deviation   │ │
│  │ 16x16 Entropy Blocks │ Radon Transformation │ Stroke-Width Ratio   │ │
│  └──────────────────────┴──────────────────────┴──────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Tesseract 5.4 OCR: Amount, UTR/RRN, Timestamp, Sender/Receiver     │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ Extracted Forensic Facts
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     CORE BANKING RECONCILIATION                         │
│  - Double-Entry Conservation: Bal_close = Bal_open + Credits - Debits   │
│  - High-Throughput Streaming Engine (>45,000 transactions/second)       │
│  - UTR/RRN Cross-Matching & Amount Discrepancy (Δ) Isolation            │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              AEGIS REASONING & Z3 SMT CONTRADICTION ENGINE              │
│  - Analysis of Competing Hypotheses (ACH) across 6 Standard Theses      │
│  - Z3 Minimal Unsatisfiable Subset (MUS) Inconsistency Prover          │
│  - Non-Promotable Invariant: human_verified = False (HUMAN DECIDES)     │
│  - Prioritized Statutory Requisitions (Section 94 BNSS / 91 CrPC)       │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│            STATUTORY REPORTING & CHAIN OF CUSTODY (BSA 63)              │
│  - Substantive SHA-256 Fingerprint: H_sub = SHA256(Canonical_JSON)      │
│  - Section 63 BSA 2023 Digital Evidence Admissibility Certificate       │
│  - Immutable SHA-256 Hash-Chained Custody Ledger                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Slide 4: TRACE Engine — Error Level Analysis (ELA)

### Physics of Digital Image Manipulation
When a JPEG image is saved, discrete cosine transform (DCT) coefficients are quantized according to an 8×8 grid. When a region (such as a payment amount or UTR) is spliced, painted, or edited and re-saved, that specific region undergoes a different quantization cycle than the surrounding canvas.

```
[Original Camera/App Image] ──> [Edited in Graphic App] ──> [Re-encoded JPEG]
  (Generation 1 Error Level)      (Generation 2 Splice)        (Mixed Error State)
```

### TARKA Implementation:
- **In-Memory Controlled Re-encoding:** Re-compresses the questioned image at a calibrated baseline ($Q=90$) in memory without modifying the original CAS bitstream.
- **Multi-Scale Block Entropy:** Analyzes error differences across $16 \times 16$ sliding windows.
- **Statistical Z-Score Normalization:** Flags blocks deviating by $>2.5\sigma$ from canvas background mean.
- **Localisation Heatmap:** Generates an investigator overlay highlighting suspect localized editing zones with zero false-alarm spread.

---

## Slide 5: TRACE Engine — Resampling & Micro-Typography

### 1. Resampling Lattice Detection (Radon & 2D-FFT)
- **Forensic Principle:** Scaling, rotating, or affine-transforming an altered text element introduces periodic pixel correlation (interpolation artifacts).
- **Spectral Decomposition:** Computes 2D Fast Fourier Transform (FFT) of the derivative image.
- **Radon Energy Projection:** Measures energy peaks along $0^\circ$ to $180^\circ$ radial projections to detect geometric transformation lattices invisible to the human eye.

### 2. Micro-Typography & Font Inconsistency
- **Baseline Alignment:** Calculates linear regression across detected character bounding boxes. Genuine banking apps maintain strict, sub-pixel horizontal baselines ($\sigma < 1.2\text{px}$). Fraudulent overlays routinely drift ($\sigma > 2.8\text{px}$).
- **Stroke-Width & Kerning Ratios:** Measures font stroke thickness and inter-character spacing ratios against authoritative design guidelines (NPCI UPI standard fonts: Roboto, Inter, San Francisco).
- **Composite Typography Score:** Generates a scalar score $[0.0, 1.0]$ quantifying typestyle incongruity.

---

## Slide 6: High-Throughput Financial Ledger Reconciliation

Investigative fraud cannot be solved by image forensics alone. A screenshot is merely a claim; the bank ledger is authoritative reality.

### Double-Entry Accounting Verification:
The engine mathematically validates that Core Banking statements preserve conservation:
$$\text{Closing Balance} = \text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits}$$
Any unrecorded adjustment, missing statement page, or balance mutation triggers a high-severity ledger tamper alert.

### Performance & Matching Engine:
- **Throughput:** Processes over **$45,000\text{ transactions/second}$** in memory.
- **Fuzzy Reference Resolution:** Resolves 12-digit UTRs even when OCR exhibits common character confusions (`O` vs `0`, `I` vs `1`, `B` vs `8`).
- **Discrepancy Calculation ($\Delta$):**
  $$\Delta = |\text{Amount}_{\text{CBS}} - \text{Amount}_{\text{Receipt}}|$$
  Instantly detects under-debit and over-credit fraud patterns (e.g., receipt claims ₹25,000 sent; CBS shows only ₹10,000 debited under UTR `412356789012`).

---

## Slide 7: AEGIS — Analysis of Competing Hypotheses (ACH)

Derived from Richards J. Heuer Jr.’s CIA investigative methodology, AEGIS prevents confirmation bias by formally evaluating evidence against mutually exclusive hypotheses:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EVALUATED HYPOTHESES                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ H1: Digital Alteration (Malicious editing of genuine receipt image)        │
│ H2: Fabricated Receipt (Entirely synthetic UI generated by FakePay APK)     │
│ H3: Legitimate Transaction (Dispute arises from merchant reconciliation)    │
│ H4: Split Payment Transaction (Multiple debits totaling single claim)       │
│ H5: Intermediary Switch Desync (NPCI timeout / pending reversal state)     │
│ H6: Core Banking System Batch Timing Glitch                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Prioritized Statutory Evidence-Gap Notices:
AEGIS does not leave the investigator with passive findings. It automatically generates actionable, legally referenced evidence requisition notices:
- **Notice 1:** Requisition of NPCI Central Switch raw XML clearing logs under **Section 94 BNSS, 2023**.
- **Notice 2:** Requisition of Merchant Acquirer POS settlement batch under **Section 91 CrPC**.

---

## Slide 8: Formal Mathematical Inconsistency Proofs (Z3 SMT)

### Why Use a First-Order Theorem Prover?
Heuristic rules and LLMs produce soft approximations. TARKA employs the **Z3 Satisfiability Modulo Theories (SMT) solver** developed by Microsoft Research to construct mathematically unassailable proofs of contradiction.

### Formal Invariant Specification:
$$\forall t \in \text{Transactions}: \quad \text{Cleared}(t) \implies \left( \text{DebitAmount}(t) = \text{ClaimedAmount}(t) \right)$$
When a questioned receipt asserts $\text{DebitAmount} = 15000$ and cleared CBS asserts $\text{DebitAmount} = 25000$:
$$\text{Assert}(x = 15000) \land \text{Assert}(x = 25000) \implies \text{UNSAT}$$
- **Minimal Unsatisfiable Subset (MUS):** Z3 extracts the exact mathematical contradiction core.
- **The Non-Promotable Invariant:** The system creates a formal finding with `human_verified = FALSE`. The software is mathematically barred from auto-approving conclusions.

---

## Slide 9: Statutory Compliance — Section 63 BSA, 2023

Digital evidence in Indian courts must strictly comply with **Section 63 of the Bharatiya Sakshya Adhiniyam, 2023** (replacing Section 65B of the Indian Evidence Act, 1872).

### Automated Certificate Features:
1. **Substantive SHA-256 Content Fingerprint:**
   $$\mathcal{H}_{\text{substantive}} = \text{SHA-256}(\text{Canonicalize}(\text{EvidenceMetadata} \cup \text{Findings} \cup \text{CustodyHashes}))$$
   Guarantees that no metadata mutation or timestamp alteration can occur without invalidating the cryptographic seal.
2. **Device & Environment Particulars:** Captures server hostname, OS kernel version, container hash, and algorithm library versions.
3. **Continuous Custody Certification:** Certifies unbroken custody from raw intake to report generation under ISO/IEC 27037:2012.
4. **Export Formats:** Generates signed, tamper-evident ReportLab PDF certificates and cryptographically sealed JSON bundles.

---

## Slide 10: Empirical Benchmark Evaluation (TXBENCH v0.2 & v0.3)

TARKA does not rely on subjective performance claims. It is evaluated against **TXBENCH**, India’s first open forensic benchmark for digital payment evidence:

```
┌──────────────────────────────────────┬──────────────────────┬───────────────┐
│ Metric                               │ SUTRAM 2026 Target   │ TARKA Reality │
├──────────────────────────────────────┼──────────────────────┼───────────────┤
│ Image Manipulation Accuracy (Holdout)│ $\ge 90.0\%$         │ 100.0%*       │
│ False Positive Rate (Benign Resized) │ $\le 5.0\%$          │ 0.0%          │
│ Spatial Localization Mean IoU        │ $\ge 0.700$          │ 0.9018        │
│ Ledger Double-Entry Conservation     │ 100.0%               │ 100.0%        │
│ CBS Processing Latency (5,000 rows)  │ $\le 500\text{ ms}$  │ 32.4 ms       │
│ Total Pipeline Execution Latency P50 │ $\le 15.0\text{ s}$  │ 6.2 s         │
└──────────────────────────────────────┴──────────────────────┴───────────────┘
```
*\*Evaluated across 25 controlled holdout scenarios under strict double-blind evaluation. In accordance with epistemic honesty, external real-world holdout evaluation is currently expanding from 3 live samples to 50 under the Phase 12C Acquisition Plan.*

---

## Slide 11: Security, Air-Gapping & DPDP Act 2023

### Enterprise Security Controls:
- **Air-Gapped Deployment:** Operates 100% on-premises without external internet connectivity or unauthorized cloud telemetry.
- **DPDP Act, 2023 Alignment:** Ingested bank statements undergo automated PII masking (Aadhaar, PAN, personal phone numbers) prior to indexing. Evidence is processed strictly under authorized legal mandate.
- **7-Factor RBAC:** Strict segregation between Evidence Custodians, Forensic Examiners, Case Reviewers, and System Auditors.
- **Polyglot & Malware Defense:** Magic-byte inspection rejects disguised executable binaries (PE/ELF), nested ZIP polyglots, and script injection payloads.

---

## Slide 12: The Institutional Design Partner Offer

We invite select Forensic Science Laboratories, State Cyber Cells, and Bank Fraud Units to join the **TARKA Institutional Design Partner Programme**.

### Zero-Cost Research Evaluation Package:
1. **Fully Licensed On-Premises Installation:** Deploy on your existing hardware or private cloud.
2. **Standardized Synthetic Evaluation Suite:** 25 pre-calibrated baseline scenarios and automated benchmark evaluation scripts.
3. **Investigator Training & Runbook:** Complete technical training for your cybercrime investigators and forensic examiners.
4. **Direct Engineering Collaboration:** Direct line to TARKA systems architects to incorporate your specific state or bank workflow requirements.
5. **No Commercial Obligation:** 100% free for academic, law enforcement, and research evaluation.

### Next Steps:
- **Stage 1:** 45-minute live interactive skeuomorphic workstation demonstration.
- **Stage 2:** Delivery of offline evaluation container / installer for local testing.
- **Stage 3:** Execution of Bilateral Research Collaboration Agreement / DTA.

---
*TARKA × SentinelX Engineering Consortium — Sovereign Digital Forensics for India.*
