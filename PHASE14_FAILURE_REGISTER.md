# PHASE 14 — DEFECT AND FAILURE REGISTER
## TARKA × SENTINELX FORENSIC RECONSTRUCTION

**Date:** 2026-11-24  
**Audit Standard:** Complete transparency; no unresolved or hidden defects.

---

## 1. RESOLVED DEFECTS & ROOT CAUSES

| Defect ID | Component | Error Description | Root Cause | Resolution | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DEF-1401` | `forensics_api.py:432` | `TypeError: ingest_evidence_files() missing 1 required positional argument: 'request'` | Legacy FastAPI controller called internal sub-router function without passing the incoming HTTP `request` object. | Replaced call with `adapter.ingest_streaming_batch()` using `UniversalEvidenceGateway`. | **VERIFIED RESOLVED** |
| `DEF-1402` | `tarka_forensics_adapter.py:1269` | `AttributeError: 'str' object has no attribute 'filename'` | `get_artifact_bytes` returns `(content, mime, filename)`. Code treated the 3rd return element as an artifact model rather than a string filename. | Correctly unpacked the 3-tuple `(content, mime_type, filename)` and added `is_image` guard. | **VERIFIED RESOLVED** |
| `DEF-1403` | `trace_payment_forensics.py:483` | `ValueError: operands could not be broadcast together with shapes (655,540) (654,540)` | Odd image height `1309` caused slice `img[::2, :]` (655) and `img[1::2, :]` (654) to have mismatched lengths during resampling analysis. | Enforced even dimensions `even_h = (img.shape[0] // 2) * 2` before array slicing. | **VERIFIED RESOLVED** |
| `DEF-1404` | `forensics_api.py:65` | `HTTP 401 Unauthorized` on SSE endpoint | Browser `EventSource` cannot transmit custom `Authorization: Bearer` headers; query parameter `?token=` was ignored. | Updated `get_current_user` to inspect `token: Optional[str] = Query(None)` when header is absent. | **VERIFIED RESOLVED** |
| `DEF-1405` | `tarka_forensics_adapter.py:1627` | CDR Call Records parsed as double-entry bank transactions | `reconcile_finances` matched `if fname.endswith(".csv")`, parsing `cdr_records.csv` telephone numbers as monetary amounts. | Added strict filename discriminator: `(fname.endswith(".csv") and "statement" in fname) or ("bank" in fname)`. | **VERIFIED RESOLVED** |
| `DEF-1406` | `trace_engine.py:350` | Hardcoded fallback RRN `202602148891` and Amount `15000.00` | Heuristic prototype had hardcoded demonstration values when regex failed. | Integrated real `RapidOCR` candidate extraction from `TracePaymentForensics`; missing values remain `None`. | **VERIFIED RESOLVED** |

---

## 2. KNOWN SYSTEM LIMITATIONS & NON-BLOCKING ITEMS

1. **Large High-Res Image OCR Inference Time:**
   On pure CPU execution without CUDA/TensorRT acceleration, high-resolution raster images (e.g. 4.75MB 1000270702.png) require 1.3 to 1.5 seconds per image for RapidOCR text inference.
   *Impact:* Acceptable for investigative casework; background worker queues prevent browser UI blocking.
2. **Audio/Video Transcoding:**
   Media files (`.mp4`, `.wav`) are parsed for metadata (duration, container, bit rate) and preserved in CAS. Deep forensic audio transcription requires downstream Whisper/Vosk workers.
