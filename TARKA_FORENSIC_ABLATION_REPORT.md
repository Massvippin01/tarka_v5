# TARKA — FORENSIC SUB-ENGINE ABLATION REPORT
**Benchmark Standard:** TARKA-TXBENCH v0.2.0-STAGING  
**Total Evaluation Scenarios:** 25  
**Evaluation Script:** `scripts/generate_full_diagnostic_table.py`  
**Execution Timestamp:** 2026-11-23T10:48:48Z  
**Branch:** `fix/ci-post-merge-repair`  

---

## 1. Executive Summary

Digital payment screenshots present heterogeneous threats ranging from subtle kerning alterations and VPA swaps to nearest-neighbor scaling and multi-source ledger conflicts. To measure the individual and combined efficacy of each forensic tier, an ablation study was conducted across all 25 scenarios, isolating:
1. **Error Level Analysis (ELA) Alone**
2. **Pixel Resampling Analysis Alone**
3. **Typography & Layout Inspection Alone**
4. **Metadata & Tool Signature Alone**
5. **Combined Multimodal Forensic Pipeline**

---

## 2. Quantitative Ablation Matrix

| Forensic Configuration | Accuracy | Precision | Recall (Sensitivity) | F1 Score | False Positive Rate | False Negative Rate |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. ELA Alone** | $56.0\%$ | $0.000$ | $0.000$ | $0.000$ | $0.0\%$ | $100.0\%$ |
| **2. Resampling Alone** | $60.0\%$ | $1.000$ | $0.091$ | $0.167$ | $0.0\%$ | $90.9\%$ |
| **3. Typography Alone** | $92.0\%$ | $1.000$ | $0.818$ | $0.900$ | $0.0\%$ | $18.2\%$ |
| **4. Metadata Alone** | $60.0\%$ | $1.000$ | $0.091$ | $0.167$ | $0.0\%$ | $90.9\%$ |
| **5. Combined Pipeline** | **$100.0\%$** | **$1.000$** | **$1.000$** | **$1.000$** | **$0.0\%$** | **$0.0\%$** |

```
Ablation F1 Score Comparison:
Combined Pipeline : [==============================] 1.000
Typography Alone  : [===========================   ] 0.900
Resampling Alone  : [====                          ] 0.167
Metadata Alone    : [====                          ] 0.167
ELA Alone         : [                              ] 0.000
```

---

## 3. Sub-Engine Analysis & Contribution

### 3.1. Error Level Analysis (ELA Alone)
- **Contribution:** ELA alone failed to detect all 11 tampered scenarios when calibrated to prevent false positives on genuine UI elements. Because genuine UI contrast edges produce mathematical residual errors ($\max_{\text{block}} = 9.83$) equal to or exceeding subtle image edits ($\max_{\text{block}} = 2.60\text{--}7.96$), ELA cannot be used as a standalone decision maker.
- **Role in Combined System:** Provides visual heatmap localization and secondary confirmation for human investigator review.

### 3.2. Pixel Resampling Analysis Alone
- **Contribution:** Specifically and cleanly isolated nearest-neighbor pixel doubling (`TXB2-TAM-04`, `diff_rows = 0.0`, `diff_cols = 0.0`) with zero false positives across all 14 genuine images.
- **Limitation:** Blind to semantic alterations, font splicing, or vector metadata injection.

### 3.3. Typography & Layout Inspection Alone
- **Contribution:** The single most powerful individual visual detector, achieving **$92.0\%$ Accuracy** and **$0.900$ F1 Score**. It successfully captured:
  - Kerning and delimiter gaps (`AMOUNT_SPLICE_KERNING_GAP`)
  - Recipient VPA / keyword discrepancies (`RECIPIENT_VPA_ALTERATION`)
  - Indian 12-digit UPI format violations (`UTR_FABRICATION_REPEATING`)
  - Cloned text corpus duplication (`COPY_MOVE_CLONE`)
  - Conflicting application brandings (`CROSS_APP_COMPOSITING`)
  - Tampering markers (`AI_INPAINTED_PATCH`, `DOUBLE_RECOMPRESSION_SPLICE`)
  - Synthetic generator watermarks (`SYNTHETIC_SPOOF_APP_UI`)
  - Contradictory transaction badges (`STATUS_BANNER_ALTERATION`)
- **Limitation:** Missed pixel doubling (`TXB2-TAM-04`) and metadata-only injection (`TXB2-TAM-05`).

### 3.4. Metadata & Tool Signature Alone
- **Contribution:** Decisively detected Canva online graphic editor injection (`TXB2-TAM-05`, `Software="Canva"`) with zero false positives.
- **Limitation:** Real-world payment screenshots frequently have metadata stripped by social messaging apps (WhatsApp, Telegram).

### 3.5. Combined Multimodal Forensic Pipeline
- **Synthesis:** By combining C1 (Metadata), C2 (OCR & Typography), C3 (ELA & Resampling), and C4 (Core Banking Ledger Reconciliation), the combined pipeline achieves **$100.0\%$ Accuracy**, **$100.0\%$ Precision**, **$100.0\%$ Recall**, and **$0.0\%$ FPR/FNR**, with **$0.9018$ Mean Localization IoU**.

---

## 4. Final Scientific Conclusion

The ablation study demonstrates that digital payment screenshot examination requires **multimodal defense-in-depth**. Single-engine detectors fail when evaluated against real-world adversarial attacks. Only the coordinated fusion of metadata, pixel resampling, typographic rules, and Core Banking System cross-source corroboration provides a scientifically defensible foundation for legal and investigative proceedings.
