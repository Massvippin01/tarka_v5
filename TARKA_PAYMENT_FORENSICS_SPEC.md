# TARKA PAYMENT FORENSICS SPECIFICATION
## Visual Examination, OCR Field Understanding & Multi-Source Reconciliation Specification

**Standard Reference:** TARKA-TRACE-PAY-v1.0  
**Authority:** SentinelX Engineering Constitution & BSA § 63 / IT Act § 65B  

---

## 1. Overview
The TARKA Payment Forensics engine (`TracePaymentForensics`) provides automated, repeatable, and court-admissible forensic examination of payment artifacts, including mobile screenshots, digital receipts, Core Banking System (CBS) statements, and transaction logs.

The engine implements four sequential analytical phases:
1. **C1: Container & Metadata Examination**
2. **C2: Visual OCR & Semantic Financial Field Extraction**
3. **C3: Pixel-Level Manipulation & Integrity Inspection**
4. **C4: Cross-Source Core Banking System (CBS) Reconciliation**

---

## 2. Examination Phases & Technical Algorithms

### Phase C1: Container & Metadata Examination
- **Target Formats:** PNG, JPEG, WebP, PDF.
- **EXIF Extraction:** Reads EXIF metadata tags using Pillow/TIFF IFD tables.
- **Editing Software Signatures:** Scans `Software`, `ImageDescription`, and `Artist` tags for known editing applications:
  `["photoshop", "gimp", "canva", "picsart", "pixlr", "snapseed", "lightroom", "fakepay", "spoof"]`.
- **Forensic Notice:** The absence of EXIF metadata is standard in chat/social-media exports (due to platform stripping) and does not independently constitute proof of tampering.

### Phase C2: Visual OCR & Financial Field Extraction
- **Coordinate System:** Normalized 4-point bounding polygons $[x, y] \in [0.0, 1.0]$.
- **Target Fields:**
  - `amount`: Numeric value parsed from Indian numbering (`1,00,000.00` or `100,000`).
  - `currency`: ISO 4217 code (default `INR` / `₹`).
  - `utr_rrn`: 12-digit numeric Unique Transaction Reference / Retrieval Reference Number.
  - `vpa`: UPI Virtual Payment Address matching `[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}`.
  - `upi_app`: Recognized application signature (`PHONEPE`, `GOOGLE_PAY`, `PAYTM`, `BHIM`, `CRED`, `AMAZON_PAY`).
  - `status`: Transaction outcome (`SUCCESS`, `PENDING`, `FAILED`).
- **Provenance Tracking:** Every extracted field records its raw text, detection confidence ($0.0 - 1.0$), source polygon, and extraction engine.

### Phase C3: Pixel-Level Manipulation Analysis

#### 1. Error Level Analysis (ELA) at Q=90
Error Level Analysis detects differential compression rates across an image bitstream. When a compressed JPEG screenshot is altered using an uncompressed patch or re-saved at a different quality, the altered region exhibits a different error rate when recompressed at a fixed baseline quality.
- **Algorithm:**
  1. Load image into normalized RGB array $A_{\text{orig}}$.
  2. Compress to memory stream as JPEG at quality $Q = 90$.
  3. Decompress stream to array $A_{\text{recomp}}$.
  4. Compute absolute difference matrix:
     $$D(x, y) = |A_{\text{orig}}(x, y) - A_{\text{recomp}}(x, y)|$$
  5. Scale difference array for visual inspection:
     $$D_{\text{scaled}}(x, y) = \min(255, D(x, y) \times 15.0)$$
  6. Divide into $32 \times 32$ macroblocks. A block is flagged as an anomaly hotspot if:
     $$\mu_{\text{block}} > \mu_{\text{global}} + 2.5 \times \sigma_{\text{global}} \quad \text{and} \quad \mu_{\text{block}} > 10.0$$

#### 2. Periodic Pixel Resampling & Edge Discontinuities
Detects nearest-neighbor upsampling and copy-paste sharp edge boundaries.
- **Laplacian Variance:** Computes $\text{Var}(\nabla^2 I)$ to measure global sharpness.
- **Sobel Magnitude:** Computes $\sqrt{(\frac{\partial I}{\partial x})^2 + (\frac{\partial I}{\partial y})^2}$.
- **Pixel-Doubling Autocorrelation:**
  In $2\times$ nearest-neighbor upsampled images, every adjacent pixel pair along the sampled axis is identical.
  $$\Delta_{\text{rows}} = \frac{1}{N} \sum |I(2k, x) - I(2k+1, x)|$$
  If $\Delta_{\text{rows}} < 0.25$ or $\Delta_{\text{cols}} < 0.25$ on an image with variance $\text{Var} > 10.0$, periodic resampling is confirmed (`anomaly_score = 0.85`).

#### 3. Typography & Glyph Spacing
- **Kerning Discrepancies:** Detects spacing gaps introduced by text box splices:
  `re.search(r"\d\s+,\s*\d", text)` or `re.search(r"[₹Rs]\s{2,}\d", text)`.
- **Repeating Dummy UTR:** Flags fabricated UTR strings composed of a single repeating digit (`"999999999999"`).

### Phase C4: Multi-Source CBS Reconciliation
Authoritative Core Banking System (CBS) ledger entries serve as transactional truth.
1. The engine searches CBS records for an exact match on `utr_rrn`.
2. If the UTR is found in CBS:
   - Compares receipt amount $A_{\text{receipt}}$ with CBS ledger amount $A_{\text{cbs}}$.
   - If $|A_{\text{receipt}} - A_{\text{cbs}}| \ge 1.0$, emits `DISCREPANCY_AMOUNT_MISMATCH`.
3. If the UTR is NOT found in CBS:
   - Emits `DISCREPANCY_MISSING_FROM_CBS` (potential counterfeit receipt).

---

## 3. Epistemic Output Schema & Caveats

```json
{
  "artifact_id": "ART-789",
  "composite_anomaly_score": 0.58,
  "preliminary_assessment": "POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES",
  "human_verified": false,
  "conclusive": false,
  "statutory_caveat": "AI PROPOSES. FORENSIC ENGINES TEST. INVESTIGATORS DECIDE. No screenshot may be declared authentic solely because no manipulation was detected, nor fraudulent solely because an anomaly score was flagged. Corroboration against CBS records remains mandatory under Section 63 BSA.",
  "modules": {
    "metadata": { "has_editing_signature": false },
    "error_level_analysis": { "hotspots_count": 0, "anomaly_score": 0.05 },
    "pixel_resampling": { "resample_detected": true, "anomaly_score": 0.85 },
    "typography_inspection": { "detected_anomalies": [] }
  }
}
```
