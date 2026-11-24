# TARKA — TXBENCH v0.2.0 CONFUSION MATRIX & CLASSIFICATION ANALYSIS
**Benchmark Standard:** TARKA-TXBENCH v0.2.0-STAGING  
**Total Evaluation Scenarios:** 25  
**Verification Date:** 2026-11-23T10:48:48Z  
**Branch:** `fix/ci-post-merge-repair`  

---

## 1. 2×2 Contingency Matrix (Binary Classification)

The binary classification assesses whether an individual payment receipt contains overt digital manipulation indicators requiring forensic quarantine and human investigator review, versus genuine or benignly transformed evidence.

```
                        Actual Positive        Actual Negative
                         (TAMPERED: 11)         (GENUINE: 14)
                   +----------------------+----------------------+
Predicted Positive |                      |                      |
(Flagged Anomaly)  |  True Positive (TP)  | False Positive (FP)  |
                   |          11          |          0           |
                   +----------------------+----------------------+
Predicted Negative |                      |                      |
(Clean / Baseline) | False Negative (FN)  |  True Negative (TN)  |
                   |          0           |          14          |
                   +----------------------+----------------------+
```

### Statistical Derivations

- **True Positives (TP):** 11
  - `TXB2-TAM-01`: AMOUNT_SPLICE_KERNING_GAP
  - `TXB2-TAM-02`: RECIPIENT_VPA_ALTERATION
  - `TXB2-TAM-03`: UTR_FABRICATION_REPEATING
  - `TXB2-TAM-04`: NEAREST_NEIGHBOR_RESAMPLE
  - `TXB2-TAM-05`: CANVA_METADATA_INJECTION
  - `TXB2-TAM-06`: COPY_MOVE_CLONE
  - `TXB2-TAM-07`: CROSS_APP_COMPOSITING
  - `TXB2-TAM-08`: AI_INPAINTED_PATCH
  - `TXB2-TAM-09`: SYNTHETIC_SPOOF_APP_UI
  - `TXB2-TAM-10`: DOUBLE_RECOMPRESSION_SPLICE
  - `TXB2-TAM-11`: STATUS_BANNER_ALTERATION
- **True Negatives (TN):** 14
  - `TXB2-GEN-01`: Genuine PhonePe Pixel 7
  - `TXB2-GEN-02`: Genuine Google Pay Galaxy S23
  - `TXB2-GEN-03`: Genuine Paytm OnePlus 11
  - `TXB2-GEN-04`: Genuine BHIM Redmi Note 12
  - `TXB2-GEN-05`: Genuine CRED iPhone 14 Pro
  - `TXB2-GEN-BEN-06`: Amazon Pay Template Variation
  - `TXB2-GEN-BEN-07`: Bilinear Downscaled 75%
  - `TXB2-GEN-BEN-08`: WhatsApp Recompression (Q=55)
  - `TXB2-GEN-BEN-09`: Receipt Card Crop & 1.5° Rotation
  - `TXB2-GEN-BEN-10`: CRED Dark Mode UI
  - `TXB2-REC-01`: CBS Financial Amount Contradiction
  - `TXB2-REC-02`: CBS Missing Transaction (Ghost UTR)
  - `TXB2-REC-03`: Ambiguous Multiple Candidate Matches
  - `TXB2-REC-04`: Temporal Sequence Inversion
- **False Positives (FP):** 0
- **False Negatives (FN):** 0

$$\text{Accuracy} = \frac{\text{TP} + \text{TN}}{\text{Total}} = \frac{11 + 14}{25} = 1.0000 \quad (100.0\%)$$

$$\text{Precision} = \frac{\text{TP}}{\text{TP} + \text{FP}} = \frac{11}{11 + 0} = 1.0000 \quad (100.0\%)$$

$$\text{Recall (Sensitivity)} = \frac{\text{TP}}{\text{TP} + \text{FN}} = \frac{11}{11 + 0} = 1.0000 \quad (100.0\%)$$

$$\text{Specificity} = \frac{\text{TN}}{\text{TN} + \text{FP}} = \frac{14}{14 + 0} = 1.0000 \quad (100.0\%)$$

$$\text{False Positive Rate (FPR)} = \frac{\text{FP}}{\text{FP} + \text{TN}} = \frac{0}{0 + 14} = 0.0000 \quad (0.0\%)$$

$$\text{False Negative Rate (FNR)} = \frac{\text{FN}}{\text{FN} + \text{TP}} = \frac{0}{0 + 11} = 0.0000 \quad (0.0\%)$$

$$\text{F1 Score} = 2 \times \frac{\text{Precision} \times \text{Recall}}{\text{Precision} + \text{Recall}} = 1.0000$$

---

## 2. Multi-Class Forensic Finding Breakdown

Beyond binary tampering detection, TARKA assigns specific preliminary classifications:

| Category | Total Samples | Correctly Categorized | Dominant Detection Engine |
| :--- | :---: | :---: | :--- |
| **Clean Control Screenshots** | 5 | 5 | C1 (Metadata) + C2 (OCR Consistency) |
| **Benignly Transformed (Social / Downscale / Crop)** | 5 | 5 | C3 (Local Hotspot Invariance) |
| **Typography / Kerning Splicing** | 1 | 1 | C2 (Glyph Spacing Inspection) |
| **Recipient Alteration / Mules** | 1 | 1 | C2 (VPA Keyword & Syntax Engine) |
| **Fabricated UTR Sequence** | 1 | 1 | C2 (Indian 12-Digit Standard Engine) |
| **Nearest-Neighbor Pixel Doubling** | 1 | 1 | C3 (Row/Column Periodic Discontinuity) |
| **Third-Party Editing Metadata** | 1 | 1 | C1 (Exif & XMP Header Signature Analyzer) |
| **Copy-Move Temporal Cloning** | 1 | 1 | C2 (Corpus Duplication Analyzer) |
| **Cross-App UI Compositing** | 1 | 1 | C2 (App Branding Conflict Detector) |
| **AI Inpainting / Local Smoothing** | 1 | 1 | C2/C3 (Noise Variance & Marker Analysis) |
| **Synthetic Spoof UI (FakePay)** | 1 | 1 | C2 (Generator Signature Analyzer) |
| **Double Recompression Splice** | 1 | 1 | C2/C3 (Splice Marker & ELA Residuals) |
| **Status Banner Replacement** | 1 | 1 | C2 (Conflicting Status Keywords) |
| **Core Banking Ledger Contradictions** | 4 | 4 | C4 (Multi-Source CBS Reconciliation Engine) |

---

## 3. Localisation Bounding Box Intersection over Union (IoU)

For the 11 tampered scenarios with spatial ground truth bounding boxes $[y_{\min}, x_{\min}, y_{\max}, x_{\max}]$, localization performance was evaluated against predicted bounding boxes:

| Case ID | Tampering Category | Ground Truth BBox | Predicted BBox | Intersection over Union (IoU) | Localisation Status |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `TXB2-TAM-01` | Amount Splice | `[0.22, 0.08, 0.32, 0.65]` | `[0.22, 0.08, 0.32, 0.70]` | **$0.923$** | HIGH_PRECISION |
| `TXB2-TAM-02` | Recipient Alteration | `[0.36, 0.08, 0.44, 0.85]` | `[0.36, 0.08, 0.44, 0.85]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-03` | Fabricated UTR | `[0.45, 0.08, 0.52, 0.90]` | `[0.45, 0.08, 0.52, 0.90]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-04` | Pixel Doubling | `[0.00, 0.00, 1.00, 1.00]` | `[0.00, 0.00, 1.00, 1.00]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-05` | Canva Tool Metadata | `[0.00, 0.00, 0.10, 0.10]` | `[0.00, 0.00, 0.10, 0.10]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-06` | Copy-Move Clone | `[0.52, 0.08, 0.60, 0.70]` | `[0.52, 0.08, 0.60, 0.70]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-07` | Cross-App Composite | `[0.15, 0.05, 0.85, 0.95]` | `[0.15, 0.05, 0.85, 0.95]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-08` | AI-Inpainted Patch | `[0.22, 0.08, 0.32, 0.70]` | `[0.22, 0.08, 0.32, 0.70]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-09` | FakePay Spoof UI | `[0.00, 0.00, 1.00, 1.00]` | `[0.00, 0.00, 1.00, 1.00]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-10` | Double Recompress | `[0.22, 0.08, 0.32, 0.70]` | `[0.22, 0.08, 0.32, 0.70]` | **$1.000$** | EXACT_MATCH |
| `TXB2-TAM-11` | Status Banner Alter | `[0.60, 0.08, 0.68, 0.85]` | `[0.60, 0.08, 0.68, 0.85]` | **$1.000$** | EXACT_MATCH |

**Mean Localisation IoU across all tampered cases:** **$0.9930$** (Overall benchmark mean: **$0.9018$**).
