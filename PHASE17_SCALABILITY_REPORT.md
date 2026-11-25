# TARKA × SENTINELX — PHASE 17 SCALABILITY & OPERATIONAL RELIABILITY REPORT

**Audit Date**: 2026-11-25  
**Component**: Ingestion Gateway, Forensic Job Orchestrator & Storage Subsystems  
**Governing Standard**: *Rule 9: Production readiness requires actual empirical verification. Bounded resource usage over theoretical scalability.*

---

## 1. Empirical Throughput & Multi-Tier Load Scaling

Evaluated using `scripts/validation/run_phase14_load_test.py` across 6 scale tiers:

| Scale Tier | Dataset Size | Ingestion Time | Throughput | Peak Memory Delta | CAS Bitstream SHA-256 Verification | Result |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Tier 0 (Micro)** | 10 KB | 0.039 s | ~256.4 KB/s | +0.01 MB | 100.0% Match | **PASS** |
| **Tier 1 (Small)** | 10 MB | 2.13 s | 4.70 MB/s | +0.05 MB | 100.0% Match | **PASS** |
| **Tier 2 (Medium)** | 100 MB | 3.66 s | 27.31 MB/s | +0.10 MB | 100.0% Match | **PASS** |
| **Tier 3 (Large)** | 500 MB | 15.98 s | 31.28 MB/s | +0.12 MB | 100.0% Match | **PASS** |
| **Tier 4 (Gigabyte)** | 1.0 GB | 43.43 s | 23.58 MB/s | +0.15 MB | 100.0% Match | **PASS** |
| **Tier 5 (Multi-GB)** | 2.0 GB | 115.78 s | 17.69 MB/s | +0.18 MB | 100.0% Match | **PASS** |

---

## 2. Resumable Chunking & Socket Buffer Exhaustion Defense

- **Protocol**: Tus 1.0.0-compatible resumable upload protocol implemented via `UploadSessionManager`.
- **Chunk Size**: Configured to 8 MiB bounded chunks.
- **Problem Resolved**: Eliminates Windows Winsock buffer exhaustion (`WinError 10055`) encountered during raw multipart stream uploads of large files (> 500 MB).
- **Disconnect & Replay Defense**:
  - Validates `Upload-Offset` header on every patch request.
  - Rejects offset mismatches with `HTTP 409 Conflict`.
  - Duplicate retransmitted chunks are detected and acknowledged idempotently without data corruption.

---

## 3. Worker Crash Recovery & Event Journal Replay

- **State Journal**: Real-time 14-state deterministic finite state machine logged to `data/jobs/{case_id}_events.jsonl`.
- **Crash Recovery**: If the server process restarts mid-processing, pending jobs transition to `REQUIRES_REVIEW` or are safely re-queued from the last persisted state checkpoint.
- **SSE Journal Replay**: Clients reconnecting to `/events/stream` with a `Last-Event-ID` header receive an instant replay of missed forensic milestones before switching to live events.

---

## 4. Hardware Operating Guidelines

| Resource | Minimum Specification | Recommended Specification | Operational Invariant |
| :--- | :--- | :--- | :--- |
| **CPU** | 4 Cores (x86_64) | 8+ Cores (Intel Core i7 / AMD Ryzen 7) | RapidOCR ONNX inference utilizes multi-threaded CPU execution. |
| **RAM** | 8 GB | 16+ GB | Max parser memory ceiling is capped at 100 MiB per worker thread. |
| **Disk Headroom** | 10 GB Free SSD | 50+ GB NVMe SSD | Enforces strict 1.5x disk safety rule before admitting gigabyte uploads. |
| **GPU (Optional)** | None (Pure CPU supported) | NVIDIA RTX 3060+ (CUDA 11.8+) | Optional for high-throughput batch OCR (> 1,000 pages/min). |
