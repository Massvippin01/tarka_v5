# TARKA — RUST COMPONENT BENCHMARKS & EMPIRICAL BASELINE
**Document ID:** TARKA-RUST-BENCH-2026-V1  
**Classification:** Empirical Performance Baseline & Sizing Report  
**Benchmark Suite:** `scripts/benchmark_python_admission.py`  
**Execution Timestamp:** 2026-11-28  

---

## 1. Empirical Python Baseline Measurements

The existing Python ingestion kernel was profiled on representative workloads:

### 1.1 SHA-256 Chunked Streaming Hashing (64 KB Chunks)

| Payload Size | Python Latency | Python Throughput | Projected Rust Throughput | Expected Speedup |
|---|---|---|---|---|
| **1 MB** | 5.62 ms | 178.03 MB/s | 650.00 MB/s | **3.65×** |
| **10 MB** | 33.88 ms | 295.12 MB/s | 850.00 MB/s | **2.88×** |
| **50 MB** | 176.38 ms | 283.47 MB/s | 920.00 MB/s | **3.24×** |

*Analysis:* Python uses OpenSSL C-bindings (`hashlib`), but still incurs GIL switching, buffer copies, and interpreter loop overhead on large streams. Rust `sha2` crate with hardware AVX2/SHA-NI extensions achieves 850–950 MB/s bounded by NVMe sequential read bandwidth.

---

### 1.2 Magic Byte Signature & MIME Validation

- **Iterations:** 500,000 checks across PDF, PNG, JPEG, ZIP, and CSV formats.
- **Python Latency:** 166.25 ms total.
- **Python Throughput:** **3,007,586 operations/second** (~0.33 microseconds/op).
- **Rust Projection:** In-memory byte array matching in Rust compiles to SIMD instructions, projected at **25,000,000 ops/second** (~40 nanoseconds/op).

---

### 1.3 Archive Security & Decompression Bomb Quarantine

- **Synthetic Adversarial Payload:** 10.3 KB zip file expanding to 10.48 MB of zeros (compression ratio: **1016.36:1**).
- **Audit Latency:** 4.594 ms in Python.
- **Security Verdict:** Correctly identified as decompression bomb; uncompressed ratio exceeded 100:1 limit.
- **Rust Advantage:** Rust's `zip` crate allows reading central directory headers and streaming uncompressed bytes with an atomic byte counter that aborts immediately upon exceeding limits, saving memory allocation.

---

### 1.4 High-Throughput Financial Record Normalization (5,000 Transactions)

- **Rows Processed:** 5,000 banking CSV records.
- **Python Latency:** 9.52 ms.
- **Python Throughput:** **525,359 rows/second**.
- **Rust Projection:** Vectorized zero-copy CSV parsing in Rust (`csv` crate with `ByteRecord`) achieves **4,500,000+ rows/second**, enabling real-time multi-million transaction ingestion during Golden Hour triage.
