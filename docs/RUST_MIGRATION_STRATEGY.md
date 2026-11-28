# TARKA — RUST MIGRATION STRATEGY
**Document ID:** TARKA-RUST-STRAT-2026-V1  
**Classification:** Systems Architecture & Transition Roadmap  
**Status:** ARCHITECTURALLY SPECIFIED & MEASURED  

---

## 1. Executive Principles

In compliance with the **SentinelX Engineering Constitution (Wave 6)**:
- **No Blanket Rewrites:** The working Python/FastAPI backend and React 18/TypeScript V6 frontend remain authoritative until explicit, benchmark-validated performance bottlenecks necessitate migration.
- **Micro-Targeted Migration:** Rust is reserved strictly for CPU-intensive, I/O-saturating, and security-critical kernels where bounded memory, absence of GIL contention, and memory safety yield demonstrable 5x–20x improvements.
- **Zero Invariant Breakage:** All migrated components must adhere to the 9 canonical invariants (append-only evidence, immutable SHA-256 custody, and zero automated guilt verdicts).

---

## 2. Prioritized Rust Candidate Ranking

| Priority | Subsystem Kernel | Motivation / Risk Class | Rust Architecture Pattern | Target Throughput Gain |
|---|---|---|---|---|
| **P1** | **Evidence Admission & Hashing** | SHA-256 chunked streaming, file size guard | Streaming reader with zero heap reallocation | 2.5× – 4× throughput |
| **P2** | **File Signature & MIME Validation** | Magic-byte spoofing prevention | In-memory slice matching on first 512 bytes | 10× latency reduction |
| **P3** | **Archive Safety & Decompression Guard** | Zip bombs, zip slip path traversal | Bounded streaming unzipper with ratio clamp | Security critical; eliminates DoS |
| **P4** | **Content Addressed Storage (CAS) Lineage** | 2-level fan-out sharding, byte dedupe | Atomic hard-linking and SHA-256 verification | Eliminates Python GIL I/O lock |
| **P5** | **Financial Transaction Normalization** | 100k+ row banking CSV/CAMT.053 parsing | Vectorized string splitting, zero-copy parsing | 15× – 25× parsing velocity |
| **P6** | **High-Throughput Deduplication** | UTR, phone, and account collision sets | Fixed-capacity bloom filters / xxHash64 sets | O(1) memory bound |
| **P7** | **Connector Ingress Runtime** | Inbound SFTP/Webhook high-rate buffers | Tokio async actor pipeline | Low latency buffer |

---

## 3. Technology Retention Boundaries

- **Python Retention:**
  - AI reasoning models & prompt defense firewalls (`HeuristicTokenSanitizer`, `EvidenceIsDataOnlyGuard`).
  - OCR extraction pipelines (PaddleOCR / Tesseract bindings).
  - Business workflow orchestration and FastAPI REST endpoints.
- **TypeScript Retention:**
  - Complete V6 tactile skeuomorphic frontend (`React 18 + Vite + Tailwind`).
- **Communication Boundary:**
  - Dual-mode inter-process contracts:
    1. **PyO3 In-Process C-ABI:** Zero network serialization overhead for high-frequency primitives.
    2. **Local HTTP/JSON Microservice (`axum` on localhost Unix socket/TCP port):** Decoupled process isolation for file admission.

---

## 4. Phase-Gated Rollback & Validation Path

1. **Phase A (Parity Validation):** Parallel run of Python and Rust kernels against canonical test fixtures (`CASE-2026-001` through `004`).
2. **Phase B (Shadow Mode):** Python executes transaction ingestion; Rust runs asynchronously in shadow mode, comparing output hashes and deduplication sets.
3. **Phase C (Primary Cutover):** Rust takes primary admission processing; Python remains instant fallback if any non-zero exit occurs.
