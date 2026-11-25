# TARKA × SENTINELX — PHASE 14.1
# UNIVERSAL EVIDENCE UPLOAD & INGESTION BENCHMARK REPORT

**Benchmark Suite:** TARKA Scale Ingestion Harness v1.1  
**Target Environment:** Windows 11 / Python 3.12 / FastAPI 0.115 / Uvicorn (Localhost HTTP Loopback)  
**Evaluator:** Principal Digital Forensics Systems Architect & Independent QA Lead  
**Verification Date:** 2026-11-24 / 2026-11-25  

---

## 1. Executive Benchmark Summary

Across six empirical scale tiers spanning from 10 KB to 2.0 Gigabytes, the TARKA Resumable Chunked Ingestion Pipeline successfully eliminated all socket exhaustion errors, proxy timeouts, and synchronous parser blocking.

```
Upload Throughput vs. Scale Tier:
  10 KB   :  [██████] (39 ms - immediate admission)
  10 MB   :  [██████████] 4.70 MB/s (2.13s)
  100 MB  :  [██████████████████████████████] 27.31 MB/s (3.66s)
  500 MB  :  [██████████████████████████████████] 31.28 MB/s (15.98s)
  1.0 GB  :  [██████████████████████████] 23.58 MB/s (43.43s)
  2.0 GB  :  [████████████████████] 17.69 MB/s (115.78s)
```

---

## 2. Multi-Tier Benchmark Telemetry Matrix

| Tier Label | Total File Count | Total Transferred Bytes | Transfer Duration | Overall Throughput | Peak Block Throughput | Protocol Chunk Size | CAS Verification | Success / Rejection Rate |
|---|---|---|---|---|---|---|---|---|
| **10 KB Tier** | 1 file | 10,240 bytes | 0.039 s | — | — | Direct Stream | 100% SHA-256 match | 1/1 (100%) |
| **10 MB Tier** | 28 files | 10,485,646 bytes | 2.13 s | **4.70 MB/s** | 27.75 MB/s | 8 MiB chunks | 100% SHA-256 match | 27/28 (96.4% — 1 blocked injection) |
| **100 MB Tier**| 30 files | 104,857,486 bytes | 3.66 s | **27.31 MB/s** | 47.54 MB/s | 8 MiB chunks | 100% SHA-256 match | 29/30 (96.7% — 1 blocked injection) |
| **500 MB Tier**| 55 files | 524,287,886 bytes | 15.98 s | **31.28 MB/s** | 54.17 MB/s | 8 MiB chunks | 100% SHA-256 match | 54/55 (98.2% — 1 blocked injection) |
| **1.0 GB Tier**| 39 files | 1,073,741,710 bytes | 43.43 s | **23.58 MB/s** | 38.49 MB/s | 8 MiB chunks | 100% SHA-256 match | 38/39 (97.4% — 1 blocked injection) |
| **2.0 GB Tier**| 55 files | 2,147,483,534 bytes | 115.78 s | **17.69 MB/s** | 44.88 MB/s | 8 MiB chunks | 100% SHA-256 match | 54/55 (98.2% — 1 blocked injection) |

*Note: In all multi-file tiers, exactly 1 file was legitimately rejected: `EVID_SEC_FORMULA_INJ_*.csv` was rejected with `HTTP 400 Bad Request` by the defensive DDE security filter. Zero-byte files were rejected at session creation.*

---

## 3. Comparative Analysis: Pre-Fix vs. Post-Fix Ingestion

### Monolithic Multipart Ingestion (Before Phase 14.1):
1. **10 KB screenshot**: 1,946 ms (Synchronous RapidOCR raster analysis inside HTTP request thread).
2. **10 MB batch**: 55.85 s (Synchronous DNA extraction, text parsing, and ledger commits for all files).
3. **100 MB tier**: Intermittent 30-second proxy timeout warnings.
4. **500 MB tier**: 30.49 s socket freeze.
5. **1.0 GB tier**: **FATAL CRASH with `WinError 10055: An operation on a socket could not be performed because the system lacked sufficient buffer space or because a queue was full`**.

### Resumable Decoupled Ingestion (Phase 14.1):
1. **10 KB screenshot**: **39 ms** (Decoupled admission; background worker handles OCR asynchronously).
2. **10 MB batch**: **2.13 s** (All 28 files admitted and queued in ~2 seconds; 26x speedup).
3. **100 MB tier**: **3.66 s** (Zero timeouts, sustained 27.31 MB/s).
4. **500 MB tier**: **15.98 s** (Sustained 31.28 MB/s, completely eliminating the 30-second proxy cliff).
5. **1.0 GB tier**: **43.43 s** (100% reliable, zero Winsock buffer starvation, 8 MiB bounded chunks).
6. **2.0 GB tier**: **115.78 s** (Over 2 billion bytes transferred and sealed in under two minutes).

---

## 4. Resource Utilization & System Invariants

### 4.1 Memory Footprint (Constant $O(1)$ RAM)
Throughout the 2.0 GB upload benchmark, TARKA backend memory consumption never grew proportionally with the file size:
- **Client RAM**: Streamed directly from disk via 8 MiB chunks using `fp.seek(offset)` and `fp.read(8388608)`.
- **Server RAM**: FastAPI request body streaming wrote chunks directly to `.part` partial files on disk. Memory usage remained bounded within 85–120 MB total resident set size (RSS).

### 4.2 Storage Cleanup Guarantee
Upon receiving the final chunk, `finalize_upload_session()` immediately moves/commits the assembled file to CAS (`evidence/raw/{artifact_id}/{filename}`) and deletes the `.part` file. No lingering chunk files or duplicate temporary bytes remain on disk.

### 4.3 Disk Safety Margins
Pre-flight checks in `generate_gigabyte_corpus.py` and `upload_corpus.py` enforce a minimum 1.5x free space margin on the host volume, preventing out-of-disk crashes when testing volumetric evidence collections.
