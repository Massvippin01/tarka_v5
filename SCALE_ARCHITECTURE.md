# SENTINELX NEXUS — Scale & Bounded Projection Architecture (SIH 2026 — PS 26189)

## 1. Scale Architecture Principles
1. **Never Stream National Datasets to the Browser**: The national synthetic dataset (Tier A: 10K, Tier B: 100K, Tier C: 1M) is stored, indexed, and queried strictly on the server. The browser receives only an authorized, bounded investigation projection.
2. **O(1) Secondary Indexing**: `StoreIndexer` (`store_indexer.py`) maintains secondary inverted hash maps across entity types, source systems, phone numbers, vehicle registrations, bank accounts, case IDs, and jurisdictions.
3. **Bounded Cluster Projections**: `ClusterProjectionService` (`cluster_projection_service.py`) aggregates dense networks into cluster nodes (`PERSON CLUSTER`, `PHONE CLUSTER`, `LOCATION CLUSTER`) before raw node expansion, ensuring browser rendering stays bounded (`≤ 500 nodes`).
4. **Idempotent Multi-Source Ingestion**: `IngestionPipeline` (`ingestion_pipeline.py`) validates record SHA-256 idempotency keys (`source_system + source_record_id`), preventing duplicate node creation across multi-adapter synthetic ingestions (CCTNS, NCRP, VAHAN, CDR, ANPR, FINANCIAL).

## 2. Workload Scale Tiers
- **Tier A (10,000 entities)**: Lightweight synthetic test workload.
- **Tier B (100,000 entities)**: Regional investigation scale.
- **Tier C (1,000,000 entities)**: National multi-state intelligence benchmark workload.
