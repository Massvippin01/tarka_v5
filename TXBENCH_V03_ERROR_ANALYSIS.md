# TARKA-TXBENCH v0.3: FORENSIC ERROR ANALYSIS, RISK TAXONOMY & CALIBRATION BOUNDARIES

**Classification:** AUTHORITATIVE FORENSIC RISK REPORT  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Standard:** NIST SP 800-86 Guide to Integrating Forensic Techniques into Incident Response  
**Date:** 2026-11-24  

---

## 1. Purpose & Analytical Scope

This document provides an unsparing failure-mode and epistemic-risk analysis of TARKA's multimodal payment forensic pipeline. 

While TXBENCH v0.3-HOLDOUT demonstrated 100% detection and extraction accuracy across its 25 pre-registered calibration scenarios, **perfect benchmark metrics routinely mask critical real-world failure modes**. 

This report analyzes the boundaries where forensic sub-engines encounter degraded performance, potential false assurance, and false alarms.

---

## 2. False Assurance Risks (The Hidden Risk of False Negatives)

A False Negative ($FN$) in financial forensics occurs when an investigator relies on a tool that erroneously classifies a tampered receipt as `AUTHENTIC`. In judicial and regulatory contexts, this creates false confidence and severe legal exposure.

```
+-----------------------------------------------------------------------------------+
|                           FALSE ASSURANCE RISK TAXONOMY                           |
+-----------------------------------------------------------------------------------+
| Threat Vector                  | Mechanism                     | Detection Limit  |
+--------------------------------+-------------------------------+------------------+
| Vector-Native FakePay Spoof    | Entire UI synthesized in      | ELA & Resampling |
|                                | Flutter/React Native without  | bypassed; Caught |
|                                | splicing onto a real capture  | only by CBS UTR  |
+--------------------------------+-------------------------------+------------------+
| Exact DCT Matrix Re-encoding   | Spliced patch re-encoded with | ELA residual     |
|                                | identical quantization table  | approaches zero  |
+--------------------------------+-------------------------------+------------------+
| Low-Bitrate WebP/AVIF Transcode| Modern lossy transcode washes | Spectral lattice |
|                                | out high-frequency residuals  | destroyed        |
+--------------------------------+-------------------------------+------------------+
```

### 2.1 Vector-Native Synthetic UI Spoofs
If an adversary uses a mobile app generator (e.g., "FakePay") that renders the complete UPI confirmation screen from scratch using native Android vector graphics, **there is no image splice**.
- The raster image exhibits uniform compression across all blocks.
- Error Level Analysis (ELA) yields a uniform, low-entropy residual ($\text{Mean} \approx 0.02$).
- Resampling detectors observe no interpolation lattice because the entire canvas was rasterized in a single pass.
- **Fail-Safe Mechanism:** In TARKA, this attack is mitigated **only** through multi-source Core Banking System (CBS) reconciliation. While visual forensics may declare the screen "internally authentic," the CBS reconciliation sub-engine flags the transaction as `UNRECORDED_RECEIPT` (e.g., `TXB-020` / `TXB-024`), preventing false assurance.

### 2.2 Quantization-Matched Recompression
If an attacker crops an amount digit from a receipt captured on the same device at the same JPEG quality level, the difference in quantization error between the patch and background can fall below the baseline anomaly threshold ($\Delta_{\text{ELA}} < 12.0$).
- **Countermeasure:** Typography stroke analysis measures font glyph width, kerning spacing, and baseline pixel jitter to catch manipulations even when compression tables match.

---

## 3. False Alarm Risks (Benign Transformation Fragility)

A False Positive ($FP$) occurs when an authentic receipt shared by a legitimate merchant or consumer is falsely flagged as `TAMPERED`. In investigative operations, this disrupts legitimate transactions and creates investigator fatigue.

### 3.1 Aggressive WhatsApp / Social Media Recompression
When a receipt image is transmitted over WhatsApp or Telegram, it undergoes downscaling and recompression at JPEG Quality 50–60.
- High-contrast text edges (e.g., dark text on white backgrounds) generate high-frequency ringing and Gibbs phenomenon artifacts.
- Naive ELA flags these edge ringing blocks as "anomalous."
- **TARKA Remediation:** TRACE deploys adaptive block normalization. If the global image compression quality is detected as low ($Q \le 65$), the block anomaly threshold is dynamically adjusted from $45.0$ to $62.0$, preventing false alarms (verified in scenario `TXB2-GEN-BEN-06`).

### 3.2 OLED Dark Mode Subpixel Quantization
Screenshots captured from devices running system-wide Dark Mode (e.g., CRED dark theme) feature large black canvases ($\text{RGB} < (15, 15, 15)$).
- In dark regions, JPEG quantization tables zero out AC coefficients aggressively.
- Any subsequent text element creates localized high-gradient DCT coefficients.
- **TARKA Remediation:** Dark mode detection sub-routine normalizes dynamic range before calculating composite anomaly scores (verified in `TXB2-GEN-BEN-09`).

---

## 4. Calibration Boundaries vs. Real-World Population Generalisation

The table below contrasts the controlled evaluation environment with real-world operational reality:

| Evaluation Dimension | TXBENCH v0.3 Controlled Set | Real-World Operational Reality |
| :--- | :--- | :--- |
| **Canvas Dimensions** | Standardized (1080×2400, 720×1600) | Hundreds of non-standard display ratios, tablets, foldables |
| **Subpixel Layout** | Standard RGB stripe | PenTile OLED, Diamond OLED, LCD RGBW |
| **Ambient Compression** | Clean PNG / Controlled JPEG | Multi-generation recompression (WhatsApp → Email → Print → PDF scan) |
| **Typography Geometry** | Known canonical UPI font families | OS font replacement, system-wide bold accessibility settings |
| **Sample Diversity** | $N=25$ calibrated scenarios | $N \gg 100,000$ daily transactional variations |

### 4.1 Epistemic Conclusion
The 100% metrics achieved on TXBENCH v0.3 reflect **internal technical consistency**, not proof that the system will achieve 100% on wild data. Real-world deployment will encounter edge cases that demand human oversight.

---

## 5. Financial Reconciliation Ambiguities

### 5.1 Temporal Inversions & Midnight Boundary Shifts
UPI transactions pass through three independent state machines:
1. Payer PSP App (PhonePe / GPay)
2. NPCI Central Switch
3. Beneficiary Core Banking System (CBS)

During peak settlement or midnight cutover windows, a payment initiated at `23:59:52` on Day 1 may be recorded on the CBS batch ledger at `00:00:14` on Day 2.
- A rigid date filter would falsely isolate the receipt as `UNRECORDED`.
- **TARKA Principle:** TRACE enforces a configurable temporal tolerance window (default: $\pm 300\text{ seconds}$) and preserves ambiguities rather than dropping candidate matches.

---

## 6. Operational Directives for Pilot Investigators

To prevent forensic errors during the controlled pilot:
1. **Never Accept Raw Automated Decisions:** Automated outputs are categorized as `UNVERIFIED_HYPOTHESIS`. Every finding must be corroborated by physical evidence.
2. **Prioritize Bank Ledgers Over Visual Inspection:** When visual inspection is inconclusive, demand signed CBS statement extracts under Section 94 BNSS / Section 91 CrPC.
3. **Inspect WhatsApp Recompression Metadata:** When evaluating images from messaging apps, check EXIF/XMP tags for secondary transcoding software before asserting intentional tampering.
