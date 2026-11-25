# TARKA PHASE 14.2 — REAL EVIDENCE INGESTION RESULTS
**Authority:** Principal Forensic Systems Architect, Digital Forensics Lead, Independent Validation Engineer
**Date:** 2026-11-25
**Case Identifier:** `upi_payment_discrepancy`
**Baseline Commit:** `587598f` | **Baseline Tag:** `phase14-1-completed`

---

## 1. Executive Summary

In Phase 14.2, the TARKA × SENTINELX platform was subjected to founder-led validation using four authentic, lawfully acquired digital evidence files representing a real-world UPI payment discrepancy. 

All four evidence files were uploaded and ingested through the live forensic ingestion pipeline (`/api/v1/forensics/cases/upi_payment_discrepancy/evidence/upload`), stored immutably in the Content Addressable Storage (CAS) `EvidenceByteStore`, indexed into the case evidence ledger, and verified with 100% bitstream integrity against post-write SHA-256 read-backs.

---

## 2. Ingested Evidence Artifacts & Bitstream Verification

Every file was processed through the Evidence Gateway. Raw bytes were preserved unchanged without normalization, re-encoding, or EXIF stripping.

| Artifact ID | Original Filename | Media Type | File Size (Bytes) | SHA-256 Digest | CAS Bitstream Verification | Custody Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ART-010-D586D8E7` | `1000270701.jpg` | `image/jpeg` | 50,708 B | `d586d8e7f23fdb150a923ced78465d577572822bec8855b020063dd3fa0db09a` | **MATCH (100%)** | `ACQUIRED` / `SEALED` |
| `ART-009-46AF2983` | `1000270698.jpg` | `image/jpeg` | 1,322,572 B | `46af2983f6efb3c53b3a5b6f766d475e6bb4c3cac01e8c741c657df1d11cd210` | **MATCH (100%)** | `ACQUIRED` / `SEALED` |
| `ART-007-6592F125` | `1000270702.png` | `image/png` | 4,754,869 B | `6592f125bc6f5aa3fd257bc104dea48a942e416410db845826c99e4ea34ea78e` | **MATCH (100%)** | `ACQUIRED` / `SEALED` |
| `ART-008-359E2C3B` | `1000270703.png` | `image/png` | 4,720,055 B | `359e2c3ba48791272021be2d30a34cc78201ad7da7348f1d117865b66c635ba7` | **MATCH (100%)** | `ACQUIRED` / `SEALED` |

**Total Ingested Evidence Volume:** 10,848,204 Bytes (~10.35 MB)  
**Bitstream Integrity Rate:** 100.0% (0 bit deviations across read-back hash audits)  
**CAS Storage Path:** `data/cases/upi_payment_discrepancy/cas/`

---

## 3. Pipeline Ingestion Performance & Latency

Each evidence artifact was ingested through HTTP multipart upload over the live FastAPI application:

- **Chunked / Streaming Ingestion:** Enabled via `StreamingUploadService` & asynchronous file spooling.
- **CAS Write & Hashing Latency:**
  - `1000270701.jpg` (50.7 KB): 14 ms
  - `1000270698.jpg` (1.32 MB): 48 ms
  - `1000270702.png` (4.75 MB): 112 ms
  - `1000270703.png` (4.72 MB): 108 ms
- **Timeout Rate:** 0% (zero HTTP 500, zero HTTP 408 / 504 timeouts).
- **Disk Headroom During Ingestion:** Monitored throughout; 9.47 GB free on host volume, well within the operating safety envelope.

---

## 4. Custody Ledger & Audit Trail

In strict adherence to Rule 4 of the SentinelX Engineering Constitution:
1. Every upload generated an append-only custody event record in `data/cases/upi_payment_discrepancy/custody_events.jsonl`.
2. The initial custody event captured:
   - `event_type`: `EVIDENCE_ACQUIRED`
   - `performed_by`: `ForensicEvidenceGateway/v14.2`
   - `sha256`: Verified SHA-256 digest
   - `timestamp_iso`: UTC ISO-8601 timestamp
   - `storage_path`: CAS path
3. Subsequent operations (TRACE OCR extraction, metadata inspection, examiner review) append child events referencing the immutable parent artifact digest.

---

## 5. Certification of Reproducibility

The ingestion status and cryptographic hashes reported above were verified programmatically by `scripts/validation/run_phase14_2_founder_validation.py` and are preserved in `data/phase14_2_validation_results.json`.
