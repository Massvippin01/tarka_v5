# TARKA PHASE 16 — OCR ENGINE FORENSIC AUDIT & REMEDIATION REPORT
**Document Identifier:** `PHASE16_OCR_ENGINE_AUDIT.md`  
**Authority:** Principal Forensic Systems Architect, Computer Vision Lead, Forensic Document Examiner  
**Audit Date:** 2026-11-25  
**Remediation Status:** **REMEDIATED & VALIDATED**  

---

## 1. Executive Summary & Forensic Audit Finding

Under Workstream 4 of Phase 16, a forensic audit was conducted on the optical character recognition subsystem of TARKA × SENTINELX.

### Critical Defect Identified & Remediated:
- **Location:** `backend/tarka/ocr/extractor.py` (lines 174–201) and `backend/tests_tarka/tarka/ocr/extractor.py`.
- **Finding:** A legacy fallback clause silently fabricated OCR tokens and candidate financial fields (`"Payment Successful"`, `"₹15,000"`, `"202602148891"`) when neither PaddleOCR nor RapidOCR was loaded.
- **Rule Violation:** Directly violated Non-Negotiable Rule 7 (*"Do not fabricate findings, progress, OCR output, benchmark metrics or success states"*) and the Constitution's Non-Fabrication Invariant.
- **Remediation:** The hardcoded mock fallback was completely expunged. The subsystem was refactored into a clean, polymorphic engine architecture (`BaseOCREngine`, `RapidOCROnnxEngine`, `PaddleNativeEngine`, `NullOCREngine`). When OCR cannot decode text or an engine is absent, the system returns zero tokens (`tokens = []`), records explicit metadata, and never fabricates unreadable text.

---

## 2. Production OCR Implementation Truth

The exact runtime OCR architecture was audited and verified from executable reality:

- **Active Inference Package:** `rapidocr_onnxruntime` (ONNX Runtime wrapper for PaddlePaddle PP-OCRv4).
- **Python Environment:** Python 3.12.1 (AMD64 Windows).
- **Inference Backend:** `onnxruntime` v1.25.1.
- **Execution Provider:** `CPUExecutionProvider` (pinned for deterministic offline execution).
- **External Network Access:** **ZERO**. No network calls or telemetry are initiated during inference.
- **Orientation Normalization:** Built-in `ImageOps.exif_transpose` automatically transforms raw sensor pixel matrices (e.g., modern mobile captures with `Orientation: 6`).

### Verified Local ONNX Model Weights:

| Model Role | Model Filename | Disk Size | SHA-256 Checksum | Local Storage Path |
| :--- | :--- | :--- | :--- | :--- |
| **Text Detection** | `ch_PP-OCRv4_det_infer.onnx` | 4,745,517 B | `d2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9` | `rapidocr_onnxruntime/models/` |
| **Text Recognition** | `ch_PP-OCRv4_rec_infer.onnx` | 10,857,958 B | `48fc40f24f6d2a207a2b1091d3437eb3cc3eb6b676dc3ef9c37384005483683b` | `rapidocr_onnxruntime/models/` |
| **Text Orientation** | `ch_ppocr_mobile_v2.0_cls_infer.onnx` | 585,532 B | `e47acedf663230f8863ff1ab0e64dd2d82b838fceb5957146dab185a89d6215c` | `rapidocr_onnxruntime/models/` |

---

## 3. Candidate Engine Evaluations

### 1. PaddleOCR Native (`paddlepaddle` / `paddleocr`)
- **Evaluation:** Evaluated via pip dry-run. Installing native `paddlepaddle` v3.3.1 on Python 3.12 pulls `opencv-contrib-python-4.10.0.84`, conflicting with the host's existing OpenCV 4.13.0 installation and introducing substantial compilation and DLL dependencies on Windows.
- **Conclusion:** `rapidocr_onnxruntime` runs the exact identical `ch_PP-OCRv4` ONNX graphs on `onnxruntime` with lighter memory footprint and zero external C++ runtime conflicts.

### 2. Docling
- **Evaluation:** Docling is designed for complex document layout parsing and multi-page table extraction. It is evaluated as a candidate for structured multi-column PDFs, but is not appropriate as a drop-in replacement for mobile screenshot and low-contrast receipt OCR.

---

## 4. Architectural Invariant & Review Boundary

- **Rule 4 (Evidence Integrity):** Raw image bitstreams are preserved immutably in CAS. OCR processes copies in memory.
- **Rule 5 (Investigative Reasoning):** OCR token confidence is strictly an optical metric, never a measure of evidence authenticity or fraud.
- **Gate 5 (Examiner Review):** Where cursive or faded ink cannot be recognized with high optical confidence (e.g., informal cycle repair slips), machine extraction provides suggestions while human examiners adjudicate and record corrections under the Non-Overwriting Invariant.
