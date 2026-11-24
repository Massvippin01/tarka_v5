# TARKA × SENTINELX — PILOT EVALUATION & METRIC FRAMEWORK

**Classification:** AUTHORITATIVE PILOT EVALUATION FRAMEWORK  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Roles:** Digital Forensics Lead, Senior QA Architect & Research Operations Lead  
**Document Code:** `FRAMEWORK-PILOT-EVAL-2026-V1`  
**Date:** 2026-11-24  

---

## 1. Executive Summary & Epistemic Boundary

This framework establishes the empirical, objective measurement protocol to evaluate TARKA's operational utility during controlled institutional pilots. 

> [!CAUTION]
> **EPISTEMIC BOUNDARY REGARDING USER FEEDBACK:**  
> In strict compliance with SentinelX Constitution Rule 1 (*Repository Truth*) and Rule 9 (*Production Readiness*), **we do not manufacture usability scores, fake survey responses, or simulated police investigator feedback**. This document defines the quantitative instruments, automated logging hooks, baseline benchmarks, and target acceptance criteria that must be measured when external human examiners operate the system.

---

## 2. Core Operational Metrics & Measurement Dimensions

```
+---------------------------------------------------------------------------------------------------------+
|                                    11-DIMENSION PILOT EVALUATION MATRIX                                 |
+---------------------------------------------------------------------------------------------------------+
| Dimension                         | Metric Formulation            | Current Baseline  | Pilot Target    |
+-----------------------------------+-------------------------------+-------------------+-----------------+
| 1. Evidence Submission Reliability| Ingestion Success Rate (%)    | 99.5% (Internal)  | > 99.9%         |
| 2. Forensic Analysis Latency      | P50 / P90 Turnaround (ms)     | 71.8ms / 105.1ms  | < 100ms / 500ms |
| 3. OCR Correction Burden          | Edited Fields / Total Fields  | 8.0% (Synthetic)  | < 5.0% (Live)   |
| 4. Finding Relevance & Precision  | True Anomalies / Total Flagged| 91.0% (Calibrated)| > 90.0% (Field) |
| 5. False Positive Rate (Benign)   | FP / (FP + TN) on WhatsApp Q50| 0.0% (Calibrated) | < 2.0% (Wild)   |
| 6. False Assurance Rate (Tampered)| FN / (FN + TP) on Spliced Data| 0.0% (Calibrated) | < 0.5% (Wild)   |
| 7. Contradiction Discovery Rate   | Isolated Ledgers / Total Cases| 100% (Synthetic)  | > 95.0% (Field) |
| 8. Evidence-Gap Actionability     | Requisition Notices Dispatched| 100% (Formulated) | > 80.0% Adopted |
| 9. Investigator Review Time       | Minutes per Case Triage       | ~45 min (Manual)  | < 8 min (TARKA) |
| 10. Examiner Inter-Rater Agreement| Cohen's Kappa Coefficient (κ) | 1.00 (Simulated)  | κ > 0.85 (Human)|
| 11. Security & Isolation Incidents| Breaches / Cross-Case Leakage | Exactly 0 (Audit) | Exactly 0       |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Detailed Measurement Instruments

### 3.1 D1: Evidence Submission Reliability
- **Instrument:** `MultimodalEvidenceGateway` audit counters.
- **Formula:**
  $$\text{Reliability} = \frac{\text{Successful Ingestions with Verified Bitstream Read-Back}}{\text{Total Valid Non-Malicious Ingestion Attempts}} \times 100\%$$
- **Telemetry Hook:** Recorded automatically in `custody_ledger.jsonl` upon disk write.

### 3.2 D2: Forensic Pipeline Latency Profile
- **Instrument:** End-to-end timer inside `ForensicJobOrchestrator`.
- **Breakdown:** Measured separately for:
  1. Original bitstream hashing & magic-byte scan.
  2. In-memory Error Level Analysis (ELA) grid computation.
  3. 2D-FFT and Radon resampling lattice detection.
  4. OCR bounding box extraction.
  5. Core Banking ledger CSV reconciliation.
- **Target Threshold:** P90 under $500\text{ ms}$; P99 under $2,000\text{ ms}$.

### 3.3 D3: OCR Correction Burden
- **Instrument:** UI event listener on field edit modals in `TarkaForensicWorkstation.tsx`.
- **Formula:**
  $$\text{Correction Burden} = \frac{\sum \text{Manual Field Overrides (Amount, UTR, VPA, Date)}}{\text{Total Extracted Fields Presented to Examiner}} \times 100\%$$
- **Significance:** Measures whether OCR reduces or increases investigator manual typing workload.

### 3.4 D5 & D6: False Positive & False Assurance Incident Logging
Every pilot investigation must classify discrepancies into four quadrants:
- **True Positive ($TP$):** Software flagged manipulation; examiner corroborated via physical evidence or bank statement.
- **True Negative ($TN$):** Software declared authentic; examiner corroborated transaction cleared legitimately.
- **False Positive ($FP$):** Software flagged clean image (e.g. benign WhatsApp compression noise); examiner confirmed authenticity.
- **False Assurance ($FN$):** Software cleared image as authentic, but merchant/bank records prove the receipt was forged (*Critical Failure*).

### 3.5 D9: Investigator Case Triage Duration
- **Instrument:** Timestamp delta between Case Creation and Section 63 BSA Report Export:
  $$\Delta t_{\text{case}} = t_{\text{report\_sealed}} - t_{\text{case\_created}}$$
- **Objective:** Demonstrate measurable operational ROI by compressing multi-hour manual spreadsheet cross-matching into under 8 minutes.

### 3.6 D10: Examiner Inter-Rater Reliability (Cohen's Kappa)
When two independent digital forensic examiners evaluate the identical case docket:
$$\kappa = \frac{p_o - p_e}{1 - p_e}$$
Where $p_o$ is relative observed agreement, and $p_e$ is hypothetical probability of chance agreement.
- **Acceptance Criterion:** $\kappa \ge 0.85$ (Substantial to Almost Perfect Agreement).

---

## 4. Qualitative Investigator Survey Instrument (Post-Pilot)

At the conclusion of the controlled pilot, each participating examiner shall complete the standardized 10-question System Usability Scale (SUS) instrument:

1. *I think that I would like to use TARKA frequently in payment fraud casework.*
2. *I found the system unnecessarily complex.*
3. *I thought the system was easy to use.*
4. *I think that I would need the support of a technical person to be able to use this system.*
5. *I found the various functions in this system were well integrated.*
6. *I thought there was too much inconsistency in this system.*
7. *I would imagine that most forensic examiners would learn to use this system very quickly.*
8. *I found the system very cumbersome to use.*
9. *I felt very confident using the system.*
10. *I needed to learn a lot of things before I could get going with this system.*

*Scoring:* Standard SUS transformation formula yielding a normalized score between $0$ and $100$. Target: $> 80.0$ (Grade A).

---

## 5. Security & Incident Failure Protocol

The pilot shall be **IMMEDIATELY HALTED** if:
1. Cross-case data leakage occurs (Investigator A accesses Case B artifacts).
2. A single unlogged evidence modification is detected in CAS storage.
3. Plaintext passwords, tokens, or customer PANs appear in application logs.
4. An automated finding is promoted to verified status without an examiner click.
