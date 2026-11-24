# TARKA × SENTINELX — PHASE 12A: DATA LEAKAGE & GENERALISATION AUDIT
## Independent Audit of Evaluation Leakage, Heuristic Overfitting & Holdout Protocol Specification

**Document ID:** `TARKA-AUDIT-LEAKAGE-001`  
**Date of Audit:** 2026-11-23  
**Auditor:** Principal Forensic Systems Architect & AI/ML Validation Engineer  
**Governing Standard:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md) Section 1, Section 8, Section 9  
**Classification:** **`CONTROLLED-SET CALIBRATION (NOT INDEPENDENT GENERALISATION)`**  

---

## 1. Executive Summary

A critical responsibility of an independent validation engineer is to examine whether reported high accuracy metrics (such as the 100% precision and recall reported in Phase 11) arise from robust forensic signals or from inadvertent leakage between the test dataset generator and the detection rules.

This audit conducted a line-by-line inspection of:
1. `scripts/generate_txbench_v02_dataset.py` (Dataset Generation Engine)
2. `backend/app/adapters/trace_payment_forensics.py` (Forensic Detection Engine)
3. `scripts/evaluate_txbench_v02.py` (Evaluation Harness)

### Primary Finding
The audit revealed **semantic lexical marker leakage** between synthetic dataset generation and heuristic inspection rules. Consequently, the 100% metric on TXBENCH v0.2.0 cannot be interpreted as proof that the system will detect real-world altered receipts. The results must be formally classified as **controlled-set calibration**.

To prepare for external pilot validation, this document specifies a separate, locked holdout evaluation protocol: **`TXBENCH v0.3-HOLDOUT`**.

---

## 2. Evidence of Dataset Leakage & Heuristic Overfitting

### A. Semantic Recipient & VPA Marker Leakage

In `scripts/generate_txbench_v02_dataset.py`, several tampered test samples were generated with synthetic recipient VPAs and organization names that contained explicit English words describing the tampering category:

```python
# scripts/generate_txbench_v02_dataset.py (Lines 420-432)
{
    "sample_id": "TXB2-TAM-08",
    "filename": "ai_inpainted_amount_patch.png",
    "vpa": "inpaint.test@okaxis",                  # <-- Semantic Leakage
    "recipient_name": "Inpaint Hardware Ltd",       # <-- Semantic Leakage
    "tampering_category": "AI_INPAINTED_PATCH",
}

# scripts/generate_txbench_v02_dataset.py (Lines 460-472)
{
    "sample_id": "TXB2-TAM-10",
    "filename": "double_recompressed_splice.png",
    "recipient_name": "Double Recompressed Splice Ltd",  # <-- Semantic Leakage
    "tampering_category": "DOUBLE_RECOMPRESSION_SPLICE",
}

# scripts/generate_txbench_v02_dataset.py (Lines 290-305)
{
    "sample_id": "TXB2-TAM-02",
    "filename": "paytm_altered_recipient.png",
    "vpa": "scammer.merchant@ybl",                 # <-- Semantic Leakage
}
```

In `backend/app/adapters/trace_payment_forensics.py`, heuristic detection rules directly checked for these exact keywords:

```python
# backend/app/adapters/trace_payment_forensics.py (Lines 580-588)
vpa_str = extracted_fields.get("vpa")
if vpa_str:
    if any(k in vpa_str.lower() for k in ["scammer", "fraud", "mule", "spoof", "inpaint", "compress", "splice", "tamper"]):
        anomalies.append({
            "issue": "SUSPICIOUS_RECIPIENT_VPA",
            "text": vpa_str,
            "description": "Recipient VPA exhibits known risk indicators or mismatch against beneficiary name.",
        })
        anomaly_score += 0.55

# backend/app/adapters/trace_payment_forensics.py (Lines 610-625)
if raw_text_corpus:
    corpus_lower = raw_text_corpus.lower()
    if any(term in corpus_lower for term in ["fakepay", "simulated receipt", "spoofpay", "fake receipt"]):
        anomalies.append({
            "issue": "SYNTHETIC_SPOOF_APP_GENERATOR",
            "description": "Receipt generated using simulated payment screenshot application.",
        })
        anomaly_score += 0.70
    elif any(term in corpus_lower for term in ["inpaint", "splice", "recompressed"]):
        anomalies.append({
            "issue": "TAMPERING_MARKER_DETECTED",
            "description": "Text corpus contains forensic markers of spliced or altered payment receipt.",
        })
        anomaly_score += 0.65
```

### B. Forensic Evaluation of the Leakage
1. **Adversarial Reality**: In real-world fraud, a perpetrator who pastes a fabricated ₹100,000 amount over a ₹1,000 receipt will use an innocuous merchant name (e.g. `Shree Ganesh Traders`, `Sharma Electronics`), never words like `Inpaint Hardware Ltd` or `Double Recompressed Splice Ltd`.
2. **Artificial Detection Bias**: Samples `TXB2-TAM-08` and `TXB2-TAM-10` were classified as tampered primarily because the text contained `"inpaint"` and `"recompressed"`, not because the engine detected the subtle JPEG noise boundary or the AI patch.
3. **Absence of Hardcoded IDs**: To the engine's credit, no sample IDs (`TXB2-TAM-01`, etc.) or specific transaction amounts were hardcoded. However, the presence of semantic test vocabulary in the detection rules constitutes evaluation leakage.

---

## 3. Generalisation Analysis Across Sub-Engines

| Sub-Engine | Relies on Leaked Text? | Generalises to Real Evidence? | Independent Validity |
| :--- | :---: | :---: | :--- |
| **Autocorrelation Resampling** | **NO** | **YES** | **High**: Detects periodic 2× pixel doubling via Fourier/autocorrelation ($diff < 0.25$) on any nearest-neighbor scaled crop. |
| **Metadata Tag Parser** | **NO** | **YES** | **High**: Inspects standard EXIF/XMP software strings (`Photoshop`, `Canva`, `PicsArt`) embedded by online image editors. |
| **Double-Entry CBS Reconciler** | **NO** | **YES** | **High**: Reconciles mathematical balance conservation ($\text{Balance}_n = \text{Balance}_{n-1} + \text{Credit}_n - \text{Debit}_n$) and exact RRN matching independently of image pixels. |
| **Typography Alignment** | **PARTIAL** | **MODERATE** | **Medium**: Detects real kerning gaps (`₹  1,20,000.00`) and repeating dummy UTRs (`999999999999`), but was inflated by the `"inpaint"` / `"splice"` keywords. |
| **Error Level Analysis (ELA)** | **NO** | **CONTEXTUAL ONLY** | **Low Standalone**: Vector mobile UI borders have high DCT residuals ($\max = 9.83$) that overlap with tampered splices ($\max = 2.60\text{--}7.96$). |

---

## 4. Locked Holdout Evaluation Protocol: `TXBENCH v0.3-HOLDOUT`

To rigorously validate the pipeline before broad field rollout, the following locked evaluation protocol is established:

### Protocol Specifications
1. **Sample Size**: 50 new, previously unseen payment screenshots.
   - 25 Genuine receipts from real devices (iOS, Android 12, 13, 14) across PhonePe, GPay, Paytm, BHIM, CRED, Amazon Pay.
   - 15 Real-world adversarial forgeries crafted by independent digital forensic examiners using mobile editors without synthetic clue words.
   - 10 Multi-source CBS statements with genuine banking anomalies.
2. **Blinded Evaluation**:
   - Evaluator runs against image bytes alone without access to ground-truth labels.
   - Strictly zero synthetic text keywords in recipient names or VPAs.
3. **Parameter Freeze**:
   - Engine code, thresholds, and weights in `trace_payment_forensics.py` must be frozen and cryptographically hashed before the holdout dataset is unsealed.
4. **Pre-Registered Ground-Truth Manifest**:
   - Ground-truth manifest SHA-256 hash must be recorded in the repository before evaluation begins.
