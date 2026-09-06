# ADR-010: National-Scale Synthetic Data Fabric & Cluster Projections

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: Operating against national-scale datasets requires seed-based synthetic generation, idempotent ingestion, secondary indexing, and server-side cluster projections to preserve browser responsiveness.

## Decision
1. **Deterministic Dataset Generation**: Implement `DeterministicDatasetGenerator` (`generator_service.py`) supporting seed-based (`SEED=12345`) generation of heterogeneous investigative entities across Tier A (10K), Tier B (100K), and Tier C (1M) with false-positive decoy networks. Golden scenario C102 ↔ C481 is preserved intact as an immutable fixture.
2. **Secondary Indexing**: Build `StoreIndexer` (`store_indexer.py`) maintaining O(1) inverted indexes across entity types, source systems, phone numbers, vehicle registrations, bank accounts, case IDs, and jurisdictions.
3. **Idempotent Ingestion Pipeline**: Upgrade `IngestionPipeline` (`ingestion_pipeline.py`) with SHA-256 idempotency checking (`source_system + source_record_id`), schema versioning (`v2.0`), and dead-letter queue.
4. **Bounded Cluster Projections**: Build `ClusterProjectionService` (`cluster_projection_service.py`) rendering dense networks as aggregate cluster nodes (`PERSON CLUSTER`, `PHONE CLUSTER`, `LOCATION CLUSTER`) before raw node expansion.

## Consequences
- **Positive**:
  - Browser memory footprint stays bounded regardless of dataset tier size.
  - Zero duplicate entity pollution during multi-adapter re-ingestion.
