# TARKA-TXBENCH SPECIFICATION & BENCHMARK REPORT
## Standardized Multimodal Payment Forensic Evaluation Benchmark

**Version:** 1.0.0  
**Dataset Directory:** `data/txbench/`  
**Manifest:** `data/txbench/manifest.json`  
**Evaluation Report:** `data/txbench_evaluation_report.json`  

---

## 1. Overview
`TARKA-TXBENCH` is an open, repeatable benchmark designed to evaluate multimodal forensic systems on Indian digital payment receipts (UPI / IMPS). The benchmark consists of 10 standardized scenarios (5 genuine receipts across major Indian payment apps, and 5 realistic tampered receipts covering the primary vector methods of financial fraud).

---

## 2. Benchmark Scenarios

### Genuine Scenarios (Negative Control)
| ID | App | Amount | UTR | Visual Profile | Expected Assessment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `TXB-GEN-01` | PhonePe | ₹25,000.00 | 412356789012 | Standard purple header, clean font | `NO_OVERT_MANIPULATION_DETECTED` |
| `TXB-GEN-02` | Google Pay | ₹15,000.00 | 412356789013 | Standard blue header, Roboto text | `NO_OVERT_MANIPULATION_DETECTED` |
| `TXB-GEN-03` | Paytm | ₹5,000.00 | 412356789014 | Light blue banner, clean alignment | `NO_OVERT_MANIPULATION_DETECTED` |
| `TXB-GEN-04` | BHIM UPI | ₹10,000.00 | 412356789015 | Orange header, standard typography | `NO_OVERT_MANIPULATION_DETECTED` |
| `TXB-GEN-05` | CRED | ₹8,500.00 | 412356789016 | Dark tactile theme, clean layout | `NO_OVERT_MANIPULATION_DETECTED` |

### Tampered Scenarios (Positive Targets)
| ID | Target App | Tampering Technique | Forensic Anomaly Vector | Expected Assessment |
| :--- | :--- | :--- | :--- | :--- |
| `TXB-TAM-01` | PhonePe | Spliced Amount | Spliced amount box with glyph spacing gap (`₹  50,000.00`) | `POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES` |
| `TXB-TAM-02` | Google Pay | Dummy UTR Replay | Fabricated repeating UTR (`999999999999`) | `POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES` |
| `TXB-TAM-03` | Paytm | Nearest-Neighbor Resampling | $2\times$ pixel doubling periodic edge autocorrelation | `POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES` |
| `TXB-TAM-04` | BHIM UPI | Online Design Tool Edit | Canva software EXIF tag injection (`Canva Online Design Tool v2.4`) | `SUSPICIOUS_DIGITAL_MANIPULATION_INDICATORS` |
| `TXB-TAM-05` | CRED | Copy-Move Cloning | Cloned timestamp region with duplicated fragment | `POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES` |

---

## 3. Evaluation Results (Verified 2026-11-23)

```
============================================================
TARKA-TXBENCH EVALUATION SUMMARY
============================================================
Total Cases Evaluated: 10
Manipulation Detection Accuracy : 100.00%
Precision: 1.0000 | Recall: 1.0000 | F1: 1.0000
Confusion Matrix:
  True Positives  : 5
  False Positives : 0
  True Negatives  : 5
  False Negatives : 0
Amount Extraction Accuracy : 100.00%
UTR Extraction Accuracy    : 100.00%
Latency Distribution:
  P50 : 57.5 ms
  P90 : 163.5 ms
  P99 : 163.5 ms
  Mean: 65.7 ms
Results written to: data/txbench_evaluation_report.json
============================================================
```

---

## 4. Benchmark Execution Command
```powershell
$env:PYTHONPATH="backend;."; python scripts/evaluate_txbench.py
```
