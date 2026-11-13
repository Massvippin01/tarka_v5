# SENTINELX NEXUS — Changelog

## [2.8.0] - 2026-08-30
### Added
- **National-Scale Synthetic Data Fabric (Phase 12)**: Built `DeterministicDatasetGenerator` (`generator_service.py`) producing reproducible seed-based (`SEED=12345`) multi-tier datasets (Tier A: 10K, Tier B: 100K, Tier C: 1M) with decoy false-positive networks while preserving golden C102 ↔ C481 intact as an immutable fixture.
- **Secondary Indexing Core**: Built `StoreIndexer` (`store_indexer.py`) maintaining secondary O(1) inverted hash maps for entity types, source systems, phone numbers, vehicle registrations, bank accounts, case IDs, and jurisdictions.
- **Idempotent Ingestion Pipeline**: Upgraded `IngestionPipeline` (`ingestion_pipeline.py`) with SHA-256 idempotency keys (`source_system + source_record_id`), schema versioning (`v2.0`), 8-stage pipeline metrics, and dead-letter queue.
- **Bounded Cluster Projections**: Built `ClusterProjectionService` (`cluster_projection_service.py`) aggregating high-density networks into cluster nodes (`PERSON CLUSTER`, `PHONE CLUSTER`, `LOCATION CLUSTER`) before raw node expansion (`≤ 500 nodes`).
- **Empirical Telemetry & Benchmark Harness**: Built `BenchmarkService` (`benchmark_service.py`) executing real synthetic workloads and recording empirical P50, P95, P99 latency, throughput, memory, and error rates across concurrency tiers (1, 5, 25, 50 users).
- **Architecture Decision Records**: Created `ADR-010-NATIONAL-SCALE-DATA-FABRIC.md` and `ADR-011-PERFORMANCE-AND-BENCHMARK-METHODOLOGY.md`.

## [2.7.0] - 2026-08-30
### Added
- **Production Security & RBAC Access Control (Phase 11)**: Built `AuthService` supporting 8 typed roles and token authentication.
- **Server-Side Case Scope Isolation**: Enforced case & jurisdiction scope validation server-side across all APIs (`403 ACCESS_DENIED`).
- **Cryptographic Audit Hash Chaining**: Upgraded `AuditService` with SHA-256 hash chaining and tamper-detection endpoint.
- **Provenance Traceability & Evidence Integrity**: Built `ProvenanceService` generating SHA-256 evidence content hashes.
