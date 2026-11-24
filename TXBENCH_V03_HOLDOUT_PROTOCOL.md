# TARKA-TXBENCH v0.3: PRE-REGISTERED BLINDED HOLDOUT PROTOCOL

**Classification:** AUTHORITATIVE BENCHMARK PROTOCOL  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Standard:** ISO/IEC 17025 Forensics & IEEE Standard for Forensic Image Analysis  
**Protocol Version:** `v0.3.0-HOLDOUT-SEALED`  
**Date:** 2026-11-24  

---

## 1. Scientific Objective

The objective of **TXBENCH v0.3-HOLDOUT** is to evaluate the operational fidelity, generalisation boundary, and failure modes of TARKA's multimodal payment forensic pipeline under strict blinding. 

In accordance with Phase 12A audit findings, controlled-set 100% calibration on synthetic fixtures (v0.2.0) demonstrates algorithmic internal consistency, but **does not constitute proof of real-world generalisation**. This protocol establishes a pre-registered, blinded evaluation harness for a target cohort of 50 independently sourced payment receipts.

---

## 2. Strict Blinding & Separation of Concerns

### 2.1 Blinding Rules
1. **Developer Blinding:** Forensic systems engineers and algorithm developers shall not inspect individual holdout image files or their ground-truth labels during evaluation.
2. **Harness Blinding:** The evaluation execution harness (`scripts/evaluate_txbench_v03_holdout.py`) strips all ground-truth metadata (`tampered`, `tampering_category`, `bounding_box`, `ground_truth_fields`) prior to passing byte streams to `MultimodalEvidenceGateway` and `TracePaymentForensics`.
3. **Sealed Ground Truth:** The ground-truth manifest is cryptographically sealed with an SHA-256 digest and isolated in a separate namespace. Predictions are permanently logged before the unblinding routine compares predictions against sealed ground truth.
4. **No Mid-Evaluation Tuning:** Algorithm thresholds and heuristic weights are frozen. If threshold tuning occurs, the holdout is formally invalidated, reclassified as a calibration split, and a new holdout cohort must be acquired.

---

## 3. Cohort Composition & Criteria

The protocol targets 50 independently sourced payment evidence items partitioned across four operational strata:

| Stratum | Description | Target Quota | Permitted Evidence Types |
| :--- | :--- | :--- | :--- |
| **Stratum A** | Genuine Authentic Receipts | 15 samples | Clean captures across PhonePe, Google Pay, Paytm, BHIM, Amazon Pay, CRED across iOS/Android. |
| **Stratum B** | Benignly Transformed Receipts | 10 samples | Genuine receipts subjected to WhatsApp recompression (JPEG Q=50-65), downscaling (75%), cropping, tilt (<5°), dark mode OLED. |
| **Stratum C** | Documented Forensically Tampered | 15 samples | Spliced amounts, altered recipient VPAs, fabricated repeating UTRs, status flips, AI inpainting, copy-move timestamps. |
| **Stratum D** | Ambiguous & Multi-Source Reconciliation | 10 samples | Mismatched CBS amounts, missing UTRs from CBS, duplicate timing inversion, split batch transactions. |

### 3.1 Inclusion Criteria
- Evidence must represent standard Indian Unified Payments Interface (UPI) or Immediate Payment Service (IMPS) flows.
- Receipts must originate from authorised institutional test accounts or consenting participants.
- Image resolution between 720×1280 and 1440×3200 pixels.
- Byte stream must pass `MultimodalEvidenceGateway` magic-byte verification (PNG, JPEG, WebP, PDF).

### 3.2 Exclusion Criteria
- Unredacted customer Personally Identifiable Information (PAN, Aadhaar numbers, unmasked credit/debit card numbers).
- Zero-byte files or corrupted streams that fail physical decode.
- Executable binaries, polyglot payloads, or formula-injection payloads (quarantined by gateway).
- Synthetic evidence lacking verifiable programmatic generation seeds.

---

## 4. Metric Separation Invariant

> [!IMPORTANT]
> **RULE OF METRIC SEPARATION:**  
> Visual manipulation detection accuracy and Core Banking reconciliation accuracy measure fundamentally different forensic phenomena. They must **NEVER** be averaged, combined, or reported as a single blended "platform accuracy" metric.

### 4.1 Visual Manipulation Forensics Metrics
Evaluates the physical and digital raster integrity of receipt screenshots:
- **True Positives (TP):** Tampered images correctly classified as `TAMPERED`.
- **True Negatives (TN):** Authentic images correctly classified as `AUTHENTIC`.
- **False Positives (FP):** Authentic images mistakenly flagged as `TAMPERED`.
- **False Negatives (FN):** Tampered images mistakenly cleared as `AUTHENTIC` (*critical forensic risk*).
- **Derived Metrics:**
  $$\text{Accuracy} = \frac{TP + TN}{TP + TN + FP + FN}$$
  $$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}, \quad F_1 = \frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$
  $$\text{FPR} = \frac{FP}{FP + TN}, \quad \text{FNR} = \frac{FN}{FN + TP}$$
- **Mean Localisation IoU (Intersection-over-Union):** Evaluated over bounding boxes where $TP$ is achieved:
  $$\text{IoU}(B_{\text{pred}}, B_{\text{gt}}) = \frac{\text{Area}(B_{\text{pred}} \cap B_{\text{gt}})}{\text{Area}(B_{\text{pred}} \cup B_{\text{gt}})}$$

### 4.2 Financial Reconciliation Metrics
Evaluates double-entry accounting integrity and Core Banking System (CBS) transaction alignment:
- **Balance Conservation Verification Rate:** Proportion of ledger packages where $\Delta_{\text{ledger}} = \text{Opening} + \sum \text{Credits} - \sum \text{Debits} - \text{Closing} = 0$.
- **RRN Exact-Match Rate:** Proportion of receipt UTRs correctly linked to authoritative CBS records ($\text{Confidence} \ge 0.90$).
- **Unrecorded Receipt Isolation Rate:** Detection rate for receipts lacking corresponding CBS ledger debits.
- **Ambiguity Preservation Rate:** Correct identification of multiple valid matching candidates without silent tie-breaking.

### 4.3 OCR Exact-Match Extraction Metrics
Calculated as strict normalized equality between ground truth string and extracted string:
- **Amount Exact-Match:** Absolute numeric difference $< ₹1.00$.
- **UTR/RRN Exact-Match:** Character-exact equality on 12-digit reference number.
- **VPA Exact-Match:** Case-insensitive string equality on Virtual Payment Address.
- **Status Exact-Match:** Equality on transaction status (`SUCCESS`, `FAILED`, `PENDING`).

---

## 5. Pre-Registered Decision Thresholds

All sub-engine thresholds are frozen in the baseline:
1. **Composite Anomaly Threshold:** $\ge 0.28 \implies \text{TAMPERED}$.
2. **Error Level Analysis:** Block threshold $\ge 45.0$ or global mean $\ge 12.0$.
3. **Resampling Analysis:** FFT spectral periodicity peak $\ge 0.25$.
4. **Ledger Arithmetic Tolerance:** Exactly $₹0.00$.
5. **Timestamp Drift Tolerance:** $\le 300\text{ seconds}$.

---

## 6. Pre-Registered Failure Criteria

The benchmark run shall be formally declared **FAILED** if:
1. Visual manipulation False Positive Rate (FPR) exceeds **5.0%** on benignly recompressed WhatsApp images.
2. Visual manipulation False Negative Rate (FNR) exceeds **2.0%** on spliced amounts or altered recipient VPAs.
3. Balance conservation arithmetic fails to flag any non-zero ledger discrepancy.
4. An unrecorded receipt is silently matched to an unrelated transaction.
5. P90 pipeline processing latency exceeds **2,000 milliseconds**.
