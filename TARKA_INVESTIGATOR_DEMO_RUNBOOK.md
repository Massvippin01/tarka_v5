# TARKA × SENTINELX — INVESTIGATOR DEMONSTRATION RUNBOOK

**Classification:** OPERATIONAL DEMONSTRATION & TRAINING MANUAL  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Roles:** Digital Forensics Lead, Senior Systems Architect & Training Officer  
**Document Code:** `RUNBOOK-DEMO-2026-V1`  
**Date:** 2026-11-24  

---

## 1. Purpose & Environment Distinction

This runbook provides institutional stakeholders, police officers, forensic examiners, and banking risk leads with a reproducible, step-by-step guide to evaluating TARKA × SentinelX.

> [!IMPORTANT]
> **CRITICAL ENVIRONMENT DISTINCTION:**  
> - **DEMONSTRATION MODE (CURRENT ENVIRONMENT):** Operates exclusively using explicitly labelled synthetic payment receipts, simulated bank statements, and controlled test fixtures. Synthetic fixtures carry the metadata tag `is_synthetic = True` and are quarantined to protect live cases.
> - **LIVE CASE MODE (RESTRICTED ENVIRONMENT):** Requires executed institutional Data Transfer Agreements, strict credential provisioning, Section 94 BNSS evidence warrants, and air-gapped Content-Addressed Storage.

---

## 2. Demonstration Execution Modes

TARKA supports two independent, verified demonstration paths:

| Mode | Target Audience | Primary Interface | Command / Entrypoint |
| :--- | :--- | :--- | :--- |
| **Interactive UI Walkthrough** | Senior Officials, Investigating Officers, Non-Technical Judges | React + Vite Skeuomorphic Workstation | `cd frontend && npm run dev` $\rightarrow$ Click `[Launch Guided Tour]` |
| **Automated Forensic CLI Harness** | Systems Auditors, Technical Examiners, QA Leads | Python 3.12 Terminal | `python scripts/run_investigator_demo.py` |

---

## 3. Step-by-Step Demonstration Walkthrough (10 Acts)

```
[Act 1: Login] ──> [Act 2: Case Init] ──> [Act 3: Ingestion] ──> [Act 4: TRACE Forensics]
       │
       ▼
[Act 5: CBS Recon] ──> [Act 6: AEGIS ACH] ──> [Act 7: Z3 Contradiction]
       │
       ▼
[Act 8: Human Signoff] ──> [Act 9: Section 63 BSA Report] ──> [Act 10: Audit Chain]
```

### Act 1: Secure Investigator Authentication
1. **Action:** Authenticate using the provisioned investigator key (`INVESTIGATOR_DELHI`).
2. **Technical Reality:** The authentication service issues an HMAC-SHA256 JSON Web Token (JWT) enforcing 7-factor Role-Based Access Control (RBAC).
3. **What You Observe:** Status changes to `Authenticated: usr-delhi-01 (Role: INVESTIGATOR)`. Request headers embed `Authorization: Bearer <token>`.
4. **Invariant Verified:** Unauthenticated requests fail closed immediately with HTTP 401.

### Act 2: Demonstration Case Initialization
1. **Action:** Create a new case in the Universal Case Model:
   - Case Title: *Disputed P2M Payment with Core Banking Discrepancy*
   - Classification: `RESTRICTED` | Jurisdiction: `IN-DL`
2. **What You Observe:** Monotonic Case ID generated (`CASE-DEMO-2026-XXXXXX`). Case badge reflects `DEMO_MODE: SYNTHETIC_FIXTURES`.
3. **Invariant Verified:** Case directory created under `data/demo_cases/{case_id}/` strictly isolated from production casework.

### Act 3: Evidence Ingestion & Bitstream Custody
1. **Action:** Ingest two evidence files into the Multimodal Evidence Gateway:
   - File A: `cbs_statement_march2026.csv` (Authoritative Core Banking ledger).
   - File B: `disputed_phonepe_receipt.png` (Questioned consumer payment screenshot).
2. **Technical Reality:** The gateway verifies magic bytes, scans for executable PE/ELF signatures, rejects polyglot archives, and calculates a streaming SHA-256 hash in 64KB bounded chunks.
3. **What You Observe:** Both files receive immutable Artifact IDs (`ART-XXXXXX`). Disk bytes are read back and asserted against memory hashes.

### Act 4: TRACE Raster Examination (ELA, Resampling & Typography)
1. **Action:** Launch TRACE automated payment forensics on `disputed_phonepe_receipt.png`.
2. **Technical Reality:**
   - In-memory Error Level Analysis (ELA) re-encodes at Q=90, measuring high-entropy compression residuals across 16×16 blocks.
   - Radon and 2D-FFT spectral analysis checks for pixel interpolation lattices.
   - Micro-typography analysis verifies character baselines and font stroke regularity.
   - Optical Character Recognition (OCR) extracts Amount, UTR/RRN, Sender VPA, and Status.
3. **What You Observe:** Composite anomaly score displayed with interactive ELA heatmap overlay. Extracted OCR fields highlighted via bounding polygons.

### Act 5: Core Banking Ledger Reconciliation
1. **Action:** Execute multi-source reconciliation between the bank statement and the payment receipt.
2. **Technical Reality:** The accounting classification sub-engine checks double-entry balance conservation:
   $$\text{Closing Balance} = \text{Opening Balance} + \sum \text{Credits} - \sum \text{Debits}$$
   It then cross-matches the receipt's 12-digit UTR (`503289124410`) against cleared CBS transaction rows.
3. **What You Observe:**
   - Balance conservation status: `VERIFIED_CONSERVED` ($₹50,000 - ₹25,000 = ₹25,000$).
   - Discrepancy Alert: Bank ledger records a **$₹25,000.00$ debit**, while the receipt claims only a **$₹15,000.00$ debit** under the identical reference number ($\Delta = ₹10,000.00$).

### Act 6: AEGIS Formal Reasoning & Evidence-Gap Prioritization
1. **Action:** Review competing investigative hypotheses in AEGIS workspace.
2. **Technical Reality:** The engine evaluates six standardized hypotheses (H1: Digital Alteration, H2: Split Transaction, H3: Account Takeover, H4: Intermediary Desync, H5: CBS Batch Glitch, H6: Merchant Terminal Fraud).
3. **What You Observe:** Hypotheses ranked by epistemic plausibility. The engine automatically formulates prioritized evidence-gap notices:
   - *Statutory Notice 1:* Requisition NPCI Central Switch logs under **Section 94 BNSS**.
   - *Statutory Notice 2:* Requisition Merchant POS settlement records under **Section 91 CrPC**.

### Act 7: Contradiction Isolation (Non-Promotable Invariant)
1. **Action:** Inspect the formal contradiction generated by the Z3 SMT solver.
2. **Technical Reality:** Z3 Minimal Unsatisfiable Subset (MUS) logic isolates the mathematical impossibility of an identical transaction reference possessing two conflicting debit values simultaneously.
3. **What You Observe:** Contradiction finding recorded:
   - `human_verified = FALSE` (Displayed with amber border and `[UNVERIFIED HYPOTHESIS]` badge).
4. **Invariant Enforced:** The software **cannot** automatically mark the finding verified. AI proposes; human decides.

### Act 8: Human Examiner Review & Finding Acceptance
1. **Action:** As the Lead Digital Forensics Examiner, review the raw bank CSV bytes and the image ELA overlay. Click `[Verify & Accept Finding]`.
2. **Technical Reality:** The finding status transitions from `OPEN` to `ACCEPTED`, and `human_verified` is toggled to `TRUE` along with the examiner's cryptographic signature and audit notes.
3. **What You Observe:** Finding badge updates to green `[EXAMINER VERIFIED]`. Audit event logged with examiner ID.

### Act 9: Section 63 BSA Statutory Report Generation
1. **Action:** Generate court-admissible Section 63 Bharatiya Sakshya Adhiniyam, 2023 certificate.
2. **Technical Reality:** The reporting engine aggregates all evidence records, substantive SHA-256 hashes, device particulars, examiner credentials, and verified findings. It computes a deterministic substantive SHA-256 fingerprint:
   $$\text{Substantive Hash} = \text{SHA-256}(\text{Canonical JSON Payload})$$
3. **What You Observe:** Cryptographic certificate generated and exported instantly as a sealed ReportLab PDF binary and structured JSON.

### Act 10: Audit Chain & Case Export
1. **Action:** View the case custody ledger and export the case bundle.
2. **Technical Reality:** The custody ledger (`custody_ledger.jsonl`) contains an unbroken SHA-256 parent-hash chained record of every ingestion, analysis run, and examiner action.
3. **What You Observe:** Complete audit trail displayed; lossless export archive verified for long-term judicial preservation.

---

## 4. Operator Troubleshooting & Preflight Checklist

Before conducting a live stakeholder demonstration:
1. **Preflight Command:** Run `python scripts/run_investigator_demo.py` in your terminal to ensure clean local execution.
2. **Port Check:** Confirm port `8000` (FastAPI backend) and port `5173` (Vite frontend) are free.
3. **Clean Cache:** If previous demo files remain, delete `data/demo_cases/` (the demo script automatically cleans up its test directories).
4. **Display Recommendation:** Run browser at 100% zoom (1920×1080 resolution recommended for skeuomorphic workstation presentation).
