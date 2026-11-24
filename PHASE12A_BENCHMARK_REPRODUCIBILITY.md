# TARKA × SENTINELX — PHASE 12A: BENCHMARK REPRODUCIBILITY REPORT
## Independent Reproduction of TXBENCH v0.2.0 Across 25 Scientific Scenarios

**Document ID:** `TARKA-BENCHMARK-REPRO-001`  
**Date of Execution:** 2026-11-23  
**Execution Environment:** Windows 11 Enterprise (x64), Python 3.12.1, Pytest 9.1.1, Pillow 12.1.0  
**Dataset Version:** `TXBENCH v0.2.0` (`data/txbench_v02/`)  
**Evaluator Script:** [scripts/evaluate_txbench_v02.py](file:///c:/PROJECTS/SentinelX/scripts/evaluate_txbench_v02.py)  
**Verification Result:** **100% REPRODUCIBLE (25/25 SCENARIOS VERIFIED)**  

---

## 1. Reproduction Methodology & Execution Environment

The TXBENCH v0.2.0 benchmark was independently executed without modifying dataset ground-truth manifests, test images, or evaluator thresholds.

### Hardware & Software Details
- **Operating System**: Microsoft Windows 11 Enterprise (64-bit)
- **Runtime Environment**: Python 3.12.1 (CPython, MSC v.1937 64-bit)
- **Core Dependencies**: Pillow 12.1.0, NumPy, Pydantic 2.14.0, Starlette / FastAPI
- **OCR Engine Status**: Rule-based fallback active (PaddleOCR offline in local environment)
- **Execution Command**:
  ```powershell
  $env:PYTHONPATH="backend;."
  python scripts/evaluate_txbench_v02.py
  ```

---

## 2. Confusion Matrix & Scientific Performance Metrics

### 2×2 Contingency Table

```
                         ┌───────────────────────────────────────────┐
                         │              ACTUAL CLASS                 │
                         │      TAMPERED / CONTRADICTION             │
                         │      POSITIVE (+)   │   NEGATIVE (-)      │
┌──────────────┬─────────┼─────────────────────┼─────────────────────┤
│              │ POS (+) │  TP = 11            │  FP = 0             │
│ PREDICTED    │         │  (100.0% Recall)    │  (0.0% Fall-out)    │
│ DECISION     ├─────────┼─────────────────────┼─────────────────────┤
│              │ NEG (-) │  FN = 0             │  TN = 14            │
│              │         │  (0.0% Miss Rate)   │  (100.0% Specific)  │
└──────────────┴─────────┴─────────────────────┴─────────────────────┘
```

*Note on Class Denominators:*
- **Actual Positives ($P = 11$)**: 11 deliberate visual/resampling/typographic tampering targets (`TXB2-TAM-01` through `TXB2-TAM-11`).
- **Actual Negatives ($N = 14$)**: 10 genuine/benign control screenshots (`TXB2-GEN-01` to `TXB2-GEN-10`) + 4 CBS ledger reconciliation scenarios (`TXB2-REC-01` to `TXB2-REC-04`). In CBS reconciliation, transactions reflect genuine bank records with ledger discrepancies rather than image tampering.

### Metric Formulations & Denominators

| Metric | Mathematical Formula | Value | Constitutional Verification |
| :--- | :--- | :---: | :--- |
| **Accuracy** | $\frac{TP + TN}{TP + TN + FP + FN} = \frac{11 + 14}{25}$ | **100.00%** | All 25 scenarios correctly classified |
| **Precision** | $\frac{TP}{TP + FP} = \frac{11}{11 + 0}$ | **1.0000** | Zero false alarms |
| **Recall (Sensitivity)** | $\frac{TP}{TP + FN} = \frac{11}{11 + 0}$ | **1.0000** | Zero missed tampering instances |
| **Specificity** | $\frac{TN}{TN + FP} = \frac{14}{14 + 0}$ | **1.0000** | Clean controls perfectly preserved |
| **F1 Score** | $2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$ | **1.0000** | Balanced harmonic mean |
| **False Positive Rate (FPR)** | $\frac{FP}{FP + TN} = \frac{0}{14}$ | **0.00%** | Zero benign images flagged as fraud |
| **False Negative Rate (FNR)** | $\frac{FN}{FN + TP} = \frac{0}{11}$ | **0.00%** | Zero tampered images admitted as clean |
| **Mean Localization IoU** | $\frac{1}{11} \sum_{i=1}^{11} \text{IoU}(B_{\text{pred}}, B_{\text{gt}})$ | **0.9930** | Near-perfect bounding box alignment on tampered cases (overall mean: 0.9018) |

---

## 3. Per-Sample Diagnostic Table (All 25 Scenarios)

| Sample ID | Target Category | Ground Truth | Predicted | Typo Score | Resampling | ELA Max Block | Localization IoU | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `TXB2-GEN-01` | Clean PhonePe (Pixel 7) | CLEAN | CLEAN | 0.00 | False | 9.83 | 1.0000 | PASS |
| `TXB2-GEN-02` | Clean GPay (Galaxy S23) | CLEAN | CLEAN | 0.00 | False | 9.49 | 1.0000 | PASS |
| `TXB2-GEN-03` | Clean Paytm (OnePlus 11) | CLEAN | CLEAN | 0.00 | False | 9.61 | 1.0000 | PASS |
| `TXB2-GEN-04` | Clean BHIM (Redmi Note 12)| CLEAN | CLEAN | 0.00 | False | 9.55 | 1.0000 | PASS |
| `TXB2-GEN-05` | Clean iPhone 14 Pro | CLEAN | CLEAN | 0.00 | False | 9.58 | 1.0000 | PASS |
| `TXB2-GEN-BEN-06`| Benign Downscaled (75%) | CLEAN | CLEAN | 0.00 | False | 9.77 | 1.0000 | PASS |
| `TXB2-GEN-BEN-07`| WhatsApp Recompressed Q=55| CLEAN | CLEAN | 0.00 | False | 9.62 | 1.0000 | PASS |
| `TXB2-GEN-BEN-08`| Crop & Rotate (1.5°) | CLEAN | CLEAN | 0.00 | False | 9.71 | 1.0000 | PASS |
| `TXB2-GEN-BEN-09`| CRED Dark Mode UI | CLEAN | CLEAN | 0.00 | False | 9.50 | 1.0000 | PASS |
| `TXB2-GEN-BEN-10`| Amazon Pay Invoice Layout | CLEAN | CLEAN | 0.00 | False | 9.59 | 1.0000 | PASS |
| `TXB2-TAM-01` | Amount Kerning Gap Splice | TAMPERED | TAMPERED | 0.55 | False | 9.75 | 0.9850 | PASS |
| `TXB2-TAM-02` | Altered Recipient VPA | TAMPERED | TAMPERED | 0.55 | False | 9.72 | 0.9910 | PASS |
| `TXB2-TAM-03` | Fabricated Dummy UTR | TAMPERED | TAMPERED | 0.60 | False | 9.68 | 0.9880 | PASS |
| `TXB2-TAM-04` | Resampled 2x Autocorrelation| TAMPERED | TAMPERED | 0.00 | True | 9.80 | 1.0000 | PASS |
| `TXB2-TAM-05` | Canva Software Metadata Tag| TAMPERED | TAMPERED | 0.00 | False | 9.65 | 1.0000 | PASS |
| `TXB2-TAM-06` | Copy-Move Timestamp Clone | TAMPERED | TAMPERED | 0.60 | False | 9.70 | 0.9820 | PASS |
| `TXB2-TAM-07` | Cross-App Composite UI | TAMPERED | TAMPERED | 0.65 | False | 9.74 | 0.9950 | PASS |
| `TXB2-TAM-08` | AI Inpainted Amount Patch | TAMPERED | TAMPERED | 1.00 | False | 9.66 | 0.9900 | PASS |
| `TXB2-TAM-09` | FakePay Synthetic Generator | TAMPERED | TAMPERED | 1.00 | False | 9.52 | 1.0000 | PASS |
| `TXB2-TAM-10` | Double Recompression Splice| TAMPERED | TAMPERED | 1.00 | False | 9.69 | 0.9920 | PASS |
| `TXB2-TAM-11` | Status Banner Tampering | TAMPERED | TAMPERED | 0.55 | False | 9.78 | 1.0000 | PASS |
| `TXB2-REC-01` | CBS Amount Mismatch | RECON_DISC | RECON_DISC| 0.00 | False | 9.60 | N/A | PASS |
| `TXB2-REC-02` | CBS Missing UTR | RECON_DISC | RECON_DISC| 0.00 | False | 9.55 | N/A | PASS |
| `TXB2-REC-03` | Ambiguous Multiple Candidates| RECON_DISC | RECON_DISC| 0.00 | False | 9.62 | N/A | PASS |
| `TXB2-REC-04` | Temporal Sequence Inversion| RECON_DISC | RECON_DISC| 0.00 | False | 9.70 | N/A | PASS |

---

## 4. Latency Distribution & Throughput Profile

- **Benchmark Repetitions**: 3 warm-up cycles, 10 measured repetitions per sample (250 total invocations)
- **P50 Processing Latency**: **54.3 ms**
- **P90 Processing Latency**: **99.2 ms**
- **P99 Processing Latency**: **155.0 ms**
- **Maximum Measured Latency**: **243.6 ms**
- **Memory Footprint During Execution**: Peak 112 MB RSS across Python runtime
