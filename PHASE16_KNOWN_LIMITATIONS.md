# TARKA PHASE 16 — KNOWN SYSTEM LIMITATIONS & ENGINEERING BOUNDARIES
**Document Identifier:** `PHASE16_KNOWN_LIMITATIONS.md`  
**Authority:** Principal Forensic Systems Architect, Independent Validation Engineer, Security Lead  
**Audit Date:** 2026-11-25  
**Operating Principle:** Truth over claims. Uncertainty must remain explicit.  

---

## 1. System Engineering Limitations

In strict adherence to Rule 1 (Repository Truth) and Rule 9 (Production Readiness) of the SentinelX Engineering Constitution, this document explicitly catalogs current system limitations:

### 1. Optical Character Recognition on Informal Cursive Handwriting
- **Limitation:** The primary production OCR engine (`RapidOCR-PP-OCRv4` ONNX) is optimized for printed Latin and standard alphanumeric characters. When presented with quick cursive handwriting on low-contrast carbon paper (e.g., informal Indian retail bills), token confidence drops, and cursive text is frequently not segmented.
- **System Defense:** In accordance with Non-Negotiable Rule 7, the engine refuses to invent unreadable text. It returns only verified tokens and routes ambiguous documents to the Gate 5 Examiner Review interface for human examiner adjudication.
- **Roadmap Resolution:** Fine-tuning an Indian-vernacular vision-language model (TrOCR or PaliGemma-Forensics) for handwritten Tamil/English carbon slips.

### 2. Statutory Dependency on Central Banking Switch Logs (NPCI ISO 8583)
- **Limitation:** A digital screenshot or merchant paper receipt cannot be conclusively adjudicated as authentic or fabricated solely from client-side pixels. Full reconciliation requires central switch settlement logs from NPCI and the acquiring bank's core banking journal.
- **System Defense:** AEGIS models this statutory reality by maintaining hypothesis `HYP-UNKNOWN` as active and automatically formulating Section 94 BNSS statutory requisitions to demand central banking records.

### 3. Local Volume Headroom & Dataset Scale
- **Limitation:** The host evaluation volume (`C:\`) maintains approximately 9.47 GB of free storage. While 2.0 GB datasets execute safely with 100% bitstream preservation, generating 5 GB and 10 GB corpora locally violates the host's 1.5x disk safety rule.
- **System Defense:** Production deployments exceeding 5 GB require partitioned storage or external S3/MinIO object-storage backends.

### 4. OpenCV User Chunk Warnings on Ultra-High Resolution Scans
- **Limitation:** 600 DPI flatbed scanner PNGs (4.7 MB) with non-standard user chunks surface minor non-fatal stderr warnings from OpenCV (`user chunk data is too large`).
- **System Defense:** Pillow robustly decodes the primary raster without data loss, while secondary pixel discontinuity routines log warnings.

---

## 2. Inadmissible Capabilities (What TARKA Will NEVER Do)

1. **Never Determine Guilt or Innocence:** TARKA will never output a determination that a named individual is "guilty", "a fraudster", or "an innocent victim".
2. **Never Automatically Merge Identities:** Proximity in graph embeddings or matching VPAs will never trigger an autonomous identity merge.
3. **Never Overwrite Raw Evidence:** Machine observations and examiner corrections never modify or overwrite raw CAS evidence bytes.
