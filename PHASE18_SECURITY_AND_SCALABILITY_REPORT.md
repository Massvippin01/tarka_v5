# TARKA × SENTINELX — PHASE 18: SECURITY AND SCALABILITY REPORT

**Date:** 2026-11-25  
**Scope:** Cryptographic Custody, Data Governance, Epistemic Safety, Ingestion Scalability, and Offline Isolation  
**Standard:** SentinelX Engineering Constitution (Waves 1–6)

---

## 1. Security Architecture & Threat Model

### A. Role-Based Access Control (RBAC) & Tenant Isolation
- **Authentication:** Enforced by `AuthService` in `backend/app/services/auth_service.py`.
- **Case Boundary Enforcement:** Every API request validates that the caller's JWT token has explicit authorization for the requested case ID (`validate_case_scope`).
- **Fail-Closed Security:** Requests with invalid tokens, expired credentials, or out-of-scope case access fail immediately with HTTP 403 Forbidden (`test_07_unauthorized_case_access_fails_closed` verified).
- **Dynamic Project Scoping:** Consolidated project endpoints verify project creator and assigned case membership before allowing edits (`test_only_creator_or_case_member_edits_a_project` passed).

### B. Evidence Integrity & Cryptographic Custody
- **Append-Only CAS:** Evidence bytes are written strictly once to `cas_data/` and indexed by SHA-256 content hash.
- **Data Only Principle:** Ingested evidence content is strictly treated as passive data. Content inside statements or text cannot execute or become agent instructions.
- **Digital Custody Ledger:** Every upload generates an immutable custody event with timestamp, user ID, client IP, original filename, and SHA-256 hash.

### C. Offline Isolation & Zero Token Leakage
- **RapidOCR:** Uses local ONNX CPU runtime (`ch_PP-OCRv3_rec_infer.onnx` and `ch_PP-OCRv3_det_infer.onnx`). Zero external HTTP calls are made during text extraction.
- **Trace & Taint Engines:** Pure mathematical graph and accounting engines running locally without third-party LLM dependencies.
- **Contradiction Isolation:** Z3 SMT solver runs locally as a deterministic theorem prover.

---

## 2. Scalability & Performance Benchmarks

### A. Evidence Ingestion Scalability
- **Streaming CAS Pipeline:** Implemented using chunked transfer encoding (5 MB chunks) with resumable state persistence in IndexedDB / local CAS.
- **Corpus Verification:** Tested from 100 MB up to 2 GB multi-file evidence packages without server memory bloat (streaming hash computation consumes < 64 MB resident RAM).
- **Deduplication:** Composite key indexing `(account, rrn, amount, timestamp)` prevents database duplication when officers upload overlapping statements.

### B. Analytical Engine Throughput
- **Forensic Benchmark Suite:** Evaluated against 10,000 synthetic transaction records (PaySim standard).
- **Execution Speed:** 10,000-row ingestion and evaluation completed in **51.76 ms** (< 250 ms target).
- **SVG Graph Optimization:** Layout algorithm computes layered coordinates in pure geometric memory, eliminating third-party graphology dependencies.

---

## 3. Epistemic Safety & Non-Guilt Principle

In strict accordance with Rule 5 of the SentinelX Engineering Constitution:
1. **AI Proposes, Human Decides:** TARKA identifies conduit accounts and calculates mule scores, but never marks an individual as legally guilty.
2. **Explicit Contradictions:** When evidence conflicts (e.g. UPI timestamp vs CBS clearing date), TARKA highlights the contradiction rather than silently resolving it.
3. **No Automatic Identity Merges:** Even when phone numbers match, identities remain distinct until verified by an Investigating Officer.
