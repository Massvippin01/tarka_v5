# TARKA — BENCHMARK PLAN & LATENCY SPECIFICATIONS
## Formal Verification Performance, Ingestion Throughput & Voice Turnaround

**Document Version:** 1.0.0-PROD  
**Authority:** Performance Engineering Lead  
**Related Documents:** [TARKA_TEST_REGISTRY.md](file:///C:/PROJECTS/SentinelX/TARKA_TEST_REGISTRY.md)

---

## 1. PERFORMANCE & LATENCY SERVICE LEVEL OBJECTIVES (SLOS)

| Analytical Operation | Measurement Scope | P50 Target | P95 Target | Hard Timeout Gate |
| :--- | :--- | :--- | :--- | :--- |
| **Z3 SMT MUS Contradiction Detection** | 50 constraints (Standard case) | < 80 ms | < 250 ms | 1,000 ms |
| **Z3 SMT Complex Scale** | 500 constraints (Synthetic stress) | < 350 ms | < 950 ms | 3,000 ms |
| **Streaming CAS Evidence Ingestion** | 50 MB PDF / Dump parsing & hashing | > 45 MB/s | > 30 MB/s | Fail if rate < 10 MB/s |
| **Counterfactual Constraint Re-Solve**| Recompute findings upon exclusion | < 120 ms | < 300 ms | 1,500 ms |
| **Ambient Voice Turnaround** | Speech End $\rightarrow$ Spoken Audio Start | < 650 ms | < 1,200 ms | 2,500 ms (Text fallback) |
| **Incremental Graph Projection** | 1,000 node delta update to Neo4j | < 48 ms | < 120 ms | 500 ms |
| **Section 63 BSA PDF Generation** | Canonical JSON $\rightarrow$ ReportLab PDF | < 180 ms | < 450 ms | 2,000 ms |

---

## 2. SYNTHETIC BENCHMARK DATASETS

### Benchmark Case 1: SIH 2026 PS-26189 / SUTRAM 2026 Core Case
- **Title:** `upi_payment_discrepancy`
- **Artifacts:**
  1. `cbs_core_banking_statement.pdf` (Axis Bank CBS export showing ₹25,000 debit under RRN 202602148891).
  2. `disputed_payment_screenshot.png` (Modified PhonePe payment receipt claiming ₹15,000 debit under same RRN).
  3. `telecom_cdr_manifest.xlsx` (Airtel tower CDR showing suspect mobile registered at cell tower Delhi-Central).
  4. `whatsapp_chat_export.txt` (P2P chat confirming transfer request).
- **Invariant:** Must isolate exactly one critical contradiction (`Finding-02`) in < 200 ms and resolve to 0 contradictions when `disputed_payment_screenshot.png` is excluded.

### Benchmark Case 2: Multi-Source Kinematic Velocity Anomaly
- **Title:** `interstate_sim_swap_kinematics`
- **Artifacts:** 3 cell tower pings across 3 different states within a 30-minute interval.
- **Invariant:** Haversine formula computation must flag impossible velocity ($v > 900 \text{ km/h}$) without air travel evidence.

---

## 3. LATENCY REGRESSION TESTING HARNESS

The automated benchmark test suite is executed in isolated containers:
- Command: `pytest backend/tests/test_benchmark_tarka_performance.py --benchmark-only`
- Memory overhead constraint: Resident set size (RSS) < 512 MB under full solver load.
