# TARKA SUTRAM 2026 PS04: OPEN TECHNICAL DECISIONS (RFC REGISTER)
## Architectural Trade-Offs, Decision Gates & Evaluation Options

**Document Version:** 1.0.0-PS04-OPEN-DECISIONS  
**Date:** November 4, 2026  
**Status:** OPEN FOR PRINCIPAL REVIEW  
**Target Milestone:** Phase 4 M1 & Forward Roadmap  
**Repository Branch:** `feat/sutram-2026-ps04-member-b`  

---

# 1. SUMMARY OF OPEN TECHNICAL DECISIONS

The following 5 technical decisions have been identified during Phase 4 Milestone M0 contract formalization. None block M0 completion, but each requires explicit human direction prior to Milestone M1 and production deployment.

```
+---------------------------------------------------------------------------------------------------------+
| OPEN TECHNICAL DECISION REGISTER                                                                        |
+----+-----------------------------+-------------------+----------------------------+--------------------+
| ID | Decision Title              | Affected Domain   | Options Evaluated          | Ratified Resolution |
+----+-----------------------------+-------------------+----------------------------+---------------------+
| 01 | Inter-Institution Transport | Member B / TAIE   | A: gRPC + mTLS             | **Option A Ratified**|
|    | for Live 3-Bank Simulation  | Distributed Events| B: Kafka Event Broker      | Distributed Event   |
|    |                             |                   | C: REST/JSON over HTTP/2   | Fabric in M2/M4     |
+----+-----------------------------+-------------------+----------------------------+---------------------+
| 02 | Z3 SMT Solver Runtime       | Member B / A1     | A: In-process Python Z3    | **Option A Ratified**|
|    | Architecture                | Claim Compiler    | B: External RPC Solver     | In-process SMT-LIB2 |
|    |                             |                   |                            | sub-10ms latency    |
+----+-----------------------------+-------------------+----------------------------+---------------------+
| 03 | Competition Demo Graph      | Member A / Data   | A: Standalone Neo4j Docker | **Dual Mode Ratified|
|    | Persistence Mode            | Canonical Authority| B: Embedded NetworkX/SQLite| Neo4j + In-Memory   |
|    |                             |                   | C: Dual-Mode Driver        | Air-Gap Failover    |
+----+-----------------------------+-------------------+----------------------------+---------------------+
| 04 | Vector Clock Pruning & State| Member B / B3     | A: Unbounded Vector Clocks | **Option B Ratified**|
|    | Compaction                  | Distributed Clocks| B: Matrix Clocks / Epochs  | Matrix Compaction   |
|    |                             |                   |                            | in VectorEngine     |
+----+-----------------------------+-------------------+----------------------------+---------------------+
| 05 | TAIE Connector Isolation    | All Members /     | A: In-process Python SDK   | **Option A Ratified**|
|    | Boundary                    | Ingestion Security| B: Isolated Docker Sandboxes| BaseInstitutional   |
|    |                             |                   |                            | Adapter in M1/M4    |
+----+-----------------------------+-------------------+----------------------------+---------------------+
```

---

# 2. DETAILED RFC BREAKDOWNS

### RFC-01: Inter-Institution Transport for Live 3-Bank Simulation
- **Context:** The Phase 3 baseline simulates 3 institutions in-process. For Phase 4 M1/M2, live asynchronous message passing is required between HDFC, SBI, and Airtel nodes.
- **Options:**
  - *Option A (gRPC with mutual TLS):* Protobuf serialization matching canonical v1 contracts; strict mTLS certificates per bank. High throughput, low memory footprint ($< 15\text{MB}$).
  - *Option B (Apache Kafka Broker):* Enterprise pub/sub with partitioned event replay. High operational overhead ($> 1\text{GB}$ RAM, ZooKeeper/KRaft dependency).
  - *Option C (REST/JSON over HTTP/2):* Simple FastAPI endpoints between nodes. Higher serialization overhead for cryptographic points.
- **Recommendation:** **Option A (gRPC + mTLS)** for production hardening; Option C fallback for zero-dependency local demonstration.

### RFC-02: Z3 SMT Solver Runtime Isolation
- **Context:** Formal verification of spatio-temporal claim contradictions takes 20–100ms in Z3. Under high concurrent query load, Python's GIL could block web requests if executed directly on FastAPI request threads.
- **Options:**
  - *Option A (In-process Async Worker Pool):* Execute Z3 solve routines via `anyio.to_thread.run_sync` using a dedicated background worker pool. Zero inter-process serialization overhead.
  - *Option B (Z3 Microservice Sidecar):* Dedicated C++ Z3 server communicating via SMT-LIB2 over Unix sockets/named pipes. Clean isolation but added deployment complexity.
- **Recommendation:** **Option A (In-process Async Worker Pool)** is sufficient for SUTRAM 2026 benchmarks ($< 150\text{ms}$ SLA).

### RFC-03: Competition Demo Graph Persistence Mode
- **Context:** Neo4j is the canonical graph projection authority under the Constitution. However, competition jury environments often require rapid 60-second air-gapped laptop demonstrations without Docker.
- **Options:**
  - *Option A (Mandatory Neo4j Container):* Requires Docker Desktop and 2GB RAM.
  - *Option B (Embedded SQLite / In-Memory Graph):* Lightweight, zero external dependencies, but lacks Cypher graph query expressiveness.
  - *Option C (Pluggable Dual-Mode Graph Driver):* Automatically detects active Neo4j instance at `bolt://localhost:7687`; falls back to optimized in-memory adjacency list when Neo4j is unavailable.
- **Recommendation:** **Option C (Dual-Mode Graph Driver)** ensures zero failure rate in unpredictable evaluation settings while preserving Neo4j authority in production.

### RFC-04: Vector Clock Pruning & Epoch Compaction
- **Context:** In distributed event sourcing, vector clocks grow proportionally to the number of participating nodes ($\mathcal{O}(N)$). In long-running cases with multiple financial intermediaries, tracking every wallet node in the vector clock causes payload bloat.
- **Options:**
  - *Option A (Unbounded Vector Clocks):* Retain all node keys indefinitely.
  - *Option B (Epoch-Based Compaction):* Snapshot global state at audit checkpoints (`AUDIT_CHECKPOINT`), advance the epoch number, and reset vector clocks relative to the checkpoint.
- **Recommendation:** **Option B (Epoch-Based Compaction)**.

### RFC-05: TAIE Connector Isolation Boundary
- **Context:** Ingestion of third-party bank CSVs, telco IPDR dumps, and UPI logs can expose parsers to malformed or malicious inputs.
- **Options:**
  - *Option A (In-Process Python Adapter SDK):* Pydantic-validated parsers running in-process with memory and timeout limits.
  - *Option B (Containerized Process Sandboxes):* Each adapter runs in an ephemeral container with zero host filesystem access.
- **Recommendation:** Implement **Option A** for Milestone M0/M1; specify **Option B** for enterprise Phase 6 hardening.

