# TARKA × SENTINELX — FOUNDER VALIDATION GAPS & REALITY AUDIT

**Document Code:** `GAPS-FOUNDER-LAB-2026-V1`  
**Classification:** AUTHORITATIVE TECHNICAL GAP AUDIT  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md) (Rule 1: Repository Truth, Rule 4: Evidence Integrity, Rule 5: Investigative Reasoning)  
**Evaluator:** Principal Forensic Systems Architect & Validation Lead  
**Audit Date:** 2026-11-24  

---

## 1. Executive Gap Statement

While TARKA possesses genuine, working computer vision algorithms (Q=90 ELA, 2D-FFT Radon resampling, typography linear regression), a high-speed CBS reconciliation engine, and Microsoft Z3 SMT formal contradiction proving, **the existing testing apparatus was designed for controlled benchmark calibration and institutional demonstration, NOT for rigorous, blind, founder-operated forensic validation on arbitrary in-the-wild evidence**.

This document explicitly identifies what is implemented, what is incomplete, what is missing, and what must be engineered to provide the founder with a trustworthy forensic laboratory.

---

## 2. Granular Capability Audit: Implemented vs Missing

```
+------------------------------------+-----------------------+-----------------------+-----------------------------------------------+
| Functional Area                    | Implemented Reality   | Current Limitation    | Required Validation Lab Capability            |
+------------------------------------+-----------------------+-----------------------+-----------------------------------------------+
| 1. Ground Truth & Blind Testing    | Simulated in tests    | Labels in memory      | Strict out-of-band blind ground-truth store   |
| 2. Real Evidence Intake            | Generic CAS Gateway   | No acquisition tags   | Dedicated REAL_EVIDENCE mode with provenance  |
| 3. Founder Validation Workspace    | Standard Workstation  | No session/test harness| Interactive UI for Sessions, Cases, & Tests   |
| 4. 49-Scenario Catalogue           | 25 TXBENCH scenarios  | Missing 24 scenarios  | Complete 49-scenario taxonomy (T01-P12)       |
| 5. Multi-Dimensional Metrics       | Macro Acc/Prec/Recall | No WER/CER/FDR        | Unified calculator for OCR, IoU, FDR, Latency |
| 6. Real-World Testing Dashboard    | Investigation views   | No validation metrics | 15-metric dashboard with drill-down to CAS    |
| 7. Reproducibility & Audit Engine  | Static script runs    | No run comparison     | Immutable frozen runs with config fingerprints|
| 8. Redaction & Privacy Safeguards  | Passive PII masking   | No explicit warnings  | Pre-ingestion redaction guard & local notice  |
+------------------------------------+-----------------------+-----------------------+-----------------------------------------------+
```

---

## 3. Deep-Dive Gap Analysis

### Gap 1: Ground Truth Storage & Blind Testing Separation
- **Current State:** In `evaluate_txbench_v02.py` and `backend/tests/test_phase10_multimodal_payment_forensics.py`, ground-truth labels (`is_manipulated`, expected amount, expected UTR) are loaded in the same process memory as test execution harnesses. While the raster analysis engine does not consume ground truth directly, the risk of subtle test harness data leakage exists.
- **Deficiency:** A true forensic laboratory requires **strict physical separation**. The analysis engine must execute in complete blindness, storing its output in an immutable frozen state. Only after output is sealed may an independent evaluator service compare actual output against the ground-truth manifest.
- **Required Fix (Phase 4):** Build `BlindValidationEngine` with separate cryptographic storage for ground-truth manifests under `data/validation_lab/ground_truth/`.

### Gap 2: Safe Real-Evidence Intake & Provenance Tracking
- **Current State:** Evidence is ingested via `MultimodalEvidenceGateway.ingest_single_evidence` or `ingest_batch`. It assigns an artifact ID and verifies SHA-256 hashes.
- **Deficiency:** It lacks fields specifically required for real-world forensic evidence validation:
  1. No distinction between **claimed transaction time** (from receipt/statement) and **evidence acquisition time** (when the founder obtained the file).
  2. No record of **transmission history** (e.g. original camera capture vs WhatsApp compressed vs screenshot of photo).
  3. No explicit safeguard preventing synthetic test fixtures from being accidentally ingested into real-evidence validation sessions.
  4. No pre-ingestion warning advising the examiner to redact unrelated citizen PII (e.g. account numbers, Aadhaar).
- **Required Fix (Phase 3):** Implement a dedicated `REAL_EVIDENCE` intake pipeline with full ISO/IEC 27037 provenance tagging, zero-cloud egress validation, and strict synthetic exclusion.

### Gap 3: Interactive Founder Validation Workspace & Test Harness
- **Current State:** The frontend offers `TarkaForensicWorkstation.tsx`, `MultimodalInbox.tsx`, and `VisualForensicsViewer.tsx`, which are tailored for investigating a single active legal case.
- **Deficiency:** The founder cannot:
  1. Initialize a "Validation Session" (e.g., *Session 2026-11-25: In-the-Wild PhonePe Receipts*).
  2. Create test cases with unique test IDs and select target engines (TRACE, AEGIS, UCM, Gateway, or Full Workflow).
  3. Upload multiple evidence files and attach expected outcomes.
  4. Trigger the actual production pipeline with a single click.
  5. Inspect intermediate forensic observations side-by-side with ground truth.
  6. Record examiner notes and log false-positive / false-negative classifications.
- **Required Fix (Phase 1):** Build a dedicated `FounderValidationLab.tsx` workstation in the frontend connected to a dedicated backend service.

### Gap 4: Coverage of the Standardized 49-Scenario Catalogue
- **Current State:** TXBENCH v0.2 implemented 25 scenarios focused primarily on PhonePe/GPay/Paytm image tampering and basic CBS statement matching.
- **Deficiency:** Missing 24 critical operational scenarios:
  - *TRACE Missing:* T03 (cropped receipt), T05 (blurred/low quality), T06 (conflicting status), T10 (duplicate transaction), T11 (reversal/refund), T12 (split payment sequence), T14 (conflicting UTRs), T15 (transaction vs settlement clock skew), T16 (currency/decimal normalization), T20 (composited region), T21 (AI inpainting), T24 (benign cropping/re-encoding), T25 (unusual genuine template).
  - *AEGIS Missing:* A01 (repeated VPA), A02 (similar phone numbers), A03 (conflicting recipient identity), A04 (repeated beneficiary), A05 (multi-account path), A06 (conflicting clocks), A07 (missing ownership evidence), A08 (cross-case identifier), A10 (insufficient evidence), A11 (contradictory new evidence), A12 (unrelated entities sharing attribute).
  - *PLATFORM Missing:* P03 (corrupted PDF), P04 (oversized file), P05 (duplicate upload), P06 (cross-case evidence isolation), P08 (interrupted worker recovery), P09 (duplicate webhook), P10 (SSE reconnection), P11 (concurrent uploads), P12 (incomplete report generation).
- **Required Fix (Phase 2):** Implement `ScenarioCatalogueService` registering all 49 scenarios with explicit manifests, input requirements, assertions, and failure conditions.

### Gap 5: Multi-Dimensional Quantitative Measurement
- **Current State:** Evaluation scripts compute global Accuracy, Precision, Recall, and mean IoU.
- **Deficiency:** Lacks granular diagnostic metrics:
  - No Character Error Rate (CER) or Word Error Rate (WER) for OCR.
  - No False Discrepancy Rate (FDR) for bank statement reconciliation.
  - No Entity-Resolution Incorrect Merge Rate or Unsupported Attribution Rate for AEGIS.
  - No P50/P95/P99 latency, peak memory, or CPU benchmarking during validation runs.
- **Required Fix (Phase 5):** Implement `ValidationMetricsEngine` calculating all required metrics with clearly defined labelled denominators.

### Gap 6: Testing Dashboard & Traceability
- **Current State:** Existing frontend pages display case findings and graph projections.
- **Deficiency:** No unified dashboard summarizing the 15 validation metrics with live drill-down to underlying cases, test logs, and raw CAS byte stores.
- **Required Fix (Phase 6):** Build `FounderValidationDashboard.tsx` reading live data from `backend/app/api/validation_lab_api.py`.

---

## 4. Architectural Safeguards for the Validation Lab

1. **Production Pipeline Reuse:** The validation lab must run the **actual production engines** (`TracePaymentForensics`, `AegisReasoningEngine`, `MultimodalEvidenceGateway`, `ForensicJobOrchestrator`), NOT a parallel simulation.
2. **Strict Epistemic Isolation:** Validation sessions under `data/validation_lab/` must never pollute active casework or institutional demonstration directories.
3. **Immutability of Frozen Runs:** Once a validation test run completes, its output hash, logs, and metrics become append-only and cannot be retrospectively edited.

---
*TARKA × SentinelX — Real Engineering Exposes Gaps to Build Unshakable Forensics.*
