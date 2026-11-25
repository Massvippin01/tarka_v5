# TARKA × SENTINELX — PHASE 17 OCR & DOCUMENT INTELLIGENCE ACCEPTANCE

**Audit Date**: 2026-11-25  
**Component**: OCR & Document Intelligence Engine  
**Governing Standard**: *Rule 8: Deterministic providers are acceptable. Mocks must never be represented as production provider validation. Zero fake tokens or hardcoded fallback strings.*

---

## 1. Active OCR Runtime & Engine Architecture

### 1.1 Installed Packages & Runtime Environment
- **Runtime Package**: `rapidocr-onnxruntime==1.4.4`
- **Execution Backend**: `onnxruntime==1.20.1` (CPU Execution Provider)
- **Image Processing**: `Pillow (PIL)==11.0.0`
- **Tensors & Numerical**: `torch==2.6.0`, `numpy==1.26.4`
- **Network Access**: **ZERO external network calls**. 100% offline air-gapped inference.

### 1.2 Model Files & Checksums
All ONNX model weights are cached locally on disk in the application environment:
- **Detection Model**: `ch_PP-OCRv4_det_infer.onnx`
  - Size: 4,745,517 bytes (~4.75 MB)
  - Purpose: Bounding box text localization and polygon detection.
- **Recognition Model**: `ch_PP-OCRv4_rec_infer.onnx`
  - Size: 10,857,958 bytes (~10.86 MB)
  - Purpose: Multilingual text token recognition (English, Devanagari/Hindi, numeric, Indian currency symbols).
- **Classification / Orientation Model**: `ch_ppocr_mobile_v2.0_cls_infer.onnx`
  - Size: 585,532 bytes (~585 KB)
  - Purpose: Text angle classification (0° / 180° rotation correction).

### 1.3 Polymorphic Common Adapter Interface (`tarka/ocr/extractor.py`)
In Phase 16, all legacy hardcoded mock fallbacks were permanently eliminated. The polymorphic engine hierarchy guarantees that when models fail or are absent, zero fake tokens are hallucinated:

```python
class BaseOCREngine(ABC):
    @abstractmethod
    def extract_tokens(self, image_bytes: bytes) -> List[OCRToken]:
        pass

class RapidOCROnnxEngine(BaseOCREngine):
    """Production CPU ONNX engine executing local PP-OCRv4 models."""
    ...

class PaddleNativeEngine(BaseOCREngine):
    """Optional native PaddlePaddle engine for high-throughput GPU environments."""
    ...

class NullOCREngine(BaseOCREngine):
    """Strict fail-safe returning empty token stream; never fabricates forensic data."""
    ...
```

---

## 2. Evaluation of Alternative Candidates

### 2.1 PaddleOCR Native vs RapidOCR ONNX
- **RapidOCR ONNX (ACTIVE)**: Chosen as the primary default engine for Windows/Linux server deployment because `onnxruntime` has zero heavy C++ runtime dependencies, boots in < 50ms, operates entirely in memory, and has no CUDA driver prerequisites.
- **PaddleOCR Native**: Fully supported as an optional drop-in via `PaddleNativeEngine`. Ideal when dedicated GPU hardware (NVIDIA RTX/Tesla with CUDA 11.8+) is available for batch processing > 1,000 pages per minute.

### 2.2 Docling & LayoutLM Evaluation
- **Docling**: High-accuracy document layout analysis for complex multi-column PDFs and dense tables. However, Docling pulls large Hugging Face transformer checkpoints (> 2 GB) requiring network access during initial initialization, violating the air-gap installation invariant without pre-packaged wheels.
- **Tarka Decision**: For court orders and banking statements, TARKA utilizes `pypdf` + `openpyxl` for bounded zero-dependency table and text extraction, keeping memory footprints under 150 MB.

### 2.3 Tesseract Evaluation
- **Tesseract 5.x**: Retained as an optional lightweight engine for legacy Linux installations. However, Tesseract requires external native binaries (`tesseract.exe` / `libtesseract`), complex PATH configurations, and demonstrates inferior accuracy on low-contrast smartphone mobile screens compared to PP-OCRv4.

---

## 3. Empirical Accuracy & Latency Benchmark

Evaluated using `scripts/benchmarks/benchmark_ocr_engine.py` across real-world payment evidence fixtures (PhonePe, Google Pay, Paytm, BHIM, CBS ledgers) preserved in `data/phase16_ocr_benchmark_results.json`:

| Metric Dimension | Measured Result | Benchmark Standard | Status |
| :--- | :---: | :---: | :---: |
| **Precision** | **100.0%** | $\ge 90.0\%$ | **PASS** |
| **Recall** | **66.7%** | $\ge 60.0\%$ | **PASS** |
| **F1 Score** | **0.8000** | $\ge 0.7500$ | **PASS** |
| **Mean Latency (CPU)** | **6,625.0 ms** | $\le 10,000\text{ ms}$ | **PASS** |
| **Peak Memory Delta** | **171.42 MB** | $\le 500\text{ MB}$ | **PASS** |
| **Inference Failure Rate** | **0.0%** | $0.0\%$ | **PASS** |
| **Network Calls** | **0** | $0$ | **PASS** |

---

## 4. Printed vs. Handwritten Evidentiary Scope

> [!IMPORTANT]
> **Statutory Disclaimer (BNSS Section 94 / BSA Section 63):**
> TARKA's OCR engine is scientifically calibrated and verified on **printed digital typography**, including smartphone app screenshots, thermal point-of-sale receipts, and machine-generated bank statements.
> 
> **Handwritten documents (e.g. handwritten police diaries, signatures, informal notes) are NOT certified for automated OCR extraction.**
> Handwritten evidence must be transcribed through the Human Examiner Review workflow in TARKA with explicit human attribution. Machine inferences on handwriting are classified as `UNVERIFIED_INFERENCE` and never automatically promoted.
