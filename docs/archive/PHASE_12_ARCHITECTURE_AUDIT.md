# SENTINELX NEXUS — Phase 12 Architecture Audit & Scale Gap Matrix
**Benchmark**: SIH 2026 — PS 26189 National Criminal-Intelligence Platform
**Audit Date**: 2026-08-30

---

## 1. REPOSITORY ARCHITECTURE AUDIT

### System Component Evaluation
1. **System-of-Record Store (`UnifiedStore`)**:
   - *Current State*: In-memory dict-backed node & edge store with lazy Neo4j Graph database synchronization.
   - *Scale Limit*: Unindexed linear scans across `nodes` or `edges` become slow above 50,000 entities.
   - *Required Control*: Build `StoreIndexer` (`store_indexer.py`) maintaining secondary O(1) hash indexes by entity type, source system, phone number, vehicle registration, bank account, jurisdiction, and case ID.

2. **Synthetic Data Generator (`ScenarioGenerator`)**:
   - *Current State*: Hard-coded golden vertical slice (Case C102 ↔ C481) plus 100 scenario templates.
   - *Scale Limit*: Lacks configurable multi-tier seed generation (Tier A: 10K, Tier B: 100K, Tier C: 1M) with heterogeneous entity distributions and decoy false-positive structures.
   - *Required Control*: Build `DeterministicDatasetGenerator` (`generator_service.py`) supporting seed-based (`SEED=12345`) generation of heterogeneous investigative entities (Persons, Phones, Vehicles, Accounts, ANPR, CDR, Transactions, Cyber Indicators) and decoy false-positive networks while leaving golden C102/C481 intact as an immutable fixture.

3. **Multi-Source Ingestion Pipeline (`IngestionPipeline`)**:
   - *Current State*: Basic ingestion pipeline for CCTNS adapter.
   - *Scale Limit*: Lacks multi-adapter pipeline telemetry, deterministic idempotency keys (`source_system + source_record_id`), schema versioning (`v1`, `v2`), and dead-letter queue.
   - *Required Control*: Upgrade `IngestionPipeline` with 8-stage pipeline metrics (`accepted`, `rejected`, `duplicate`, `transformed`, `linked`), SHA-256 idempotency check, schema versioning, and dead-letter handling.

4. **Graph Projection Service (`GraphProjectionService`)**:
   - *Current State*: Server-side query bounds (`max_nodes: 500`, `max_edges: 1000`, `max_hops: 2`).
   - *Scale Limit*: High-density hubs cause relationship explosion if unclustered.
   - *Required Control*: Implement `ClusterProjectionService` (`cluster_projection_service.py`) producing aggregate cluster summaries (`PERSON CLUSTER`, `PHONE CLUSTER`, `LOCATION CLUSTER`) for dense networks before raw node expansion.

5. **Federated Search Engine (`FederatedSearchService`)**:
   - *Current State*: 5-tier deterministic ranking over memory store.
   - *Scale Limit*: O(N) linear iteration over full store during unindexed text search.
   - *Required Control*: Leverage `StoreIndexer` inverted indexes for exact identifier lookups (phones, ANPR plates, bank accounts, case IDs) with server-side RBAC and case scope enforcement.

6. **Load & Telemetry Benchmark Engine**:
   - *Current State*: Static benchmark endpoint returning target baseline numbers.
   - *Scale Limit*: Lacks empirical execution-based harness measuring true P50, P95, P99 latency, throughput (RPS), memory usage, and error rate across concurrency tiers (1, 5, 25, 50 concurrent users).
   - *Required Control*: Build `BenchmarkService` (`benchmark_service.py`) executing real workloads and exporting machine-readable benchmark reports (JSON/CSV).

---

## 2. PHASE 12 GAP MATRIX

| Component | Current Technology | Current Limit | Expected Scale | Bottleneck | Proposed Change | Why | Risk | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Store Indexing** | Dict linear scans | ~50K entities | 1,000,000+ entities | O(N) lookup time | Build `StoreIndexer` (`store_indexer.py`) with inverted attribute indexes | Provides O(1) identifier lookups | Cache overhead | Pytest `test_store_indexing` | `AUDITED` |
| **Synthetic Data Generator** | Hard-coded 100 scenarios | Static scenario generator | Tier A (10K), Tier B (100K), Tier C (1M) | Fixed scenario templates | Build `DeterministicDatasetGenerator` (`generator_service.py`) | Enables reproducible multi-tier synthetic benchmarking | Memory overhead | Pytest `test_deterministic_dataset_generator` | `AUDITED` |
| **Ingestion Pipeline** | Single-pass ingestion | In-memory append | Multi-adapter parallel ingestion | Non-idempotent duplicate creation | Upgrade `IngestionPipeline` with SHA-256 idempotency & dead-letter queue | Prevents duplicate entity pollution | Storage overhead | Pytest `test_idempotent_ingestion_pipeline` | `AUDITED` |
| **Graph Density & Clustering** | 500-node truncation | High-density hub expansion | National-scale dense graphs | Browser DOM / React node overload | Build `ClusterProjectionService` (`cluster_projection_service.py`) | Renders cluster summaries before raw node expansion | Viewport complexity | Pytest `test_cluster_graph_projection` | `AUDITED` |
| **Search Engine** | Linear scan | Unindexed entity search | 1,000,000+ entities | O(N) text search | Integrate `StoreIndexer` with inverted phone/plate/account lookups | Keeps search latency < 15ms | Index maintenance | Pytest `test_indexed_federated_search` | `AUDITED` |
| **Benchmark Harness** | Static API response | Non-executable metrics | Real workload execution | Missing empirical latency P50/P95/P99 telemetry | Build `BenchmarkService` (`benchmark_service.py`) executing real workloads | Provides empirical reproducible proof of scale | Execution time | Pytest `test_benchmark_harness_execution` | `AUDITED` |
