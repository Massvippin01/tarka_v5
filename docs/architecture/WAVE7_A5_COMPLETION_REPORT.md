# SENTINELX WAVE 7 — SUBPHASE A5 COMPLETION REPORT
## Graph Authority + Incremental Realtime Graph Projection

**Status**: `COMPLETE & HARDENED`  
**Date**: October 2, 2026  
**Primary Invariant**:  
`PostgreSQL = Transactional Authority` | `Evidence Fabric = Byte Authority` | `Neo4j = Analytical Projection`  
`GRAPH NODE ≠ AUTHORITATIVE ENTITY RECORD` | `GRAPH EDGE ≠ AUTHORITATIVE EVIDENCE`  
`GRAPH CENTRALITY ≠ CRIMINALITY` | `GRAPH PROXIMITY ≠ GUILT`

---

### 1. Architectural Summary & System Flow

Subphase A5 guarantees that Neo4j and frontend graph canvases remain strictly derived analytical projections of canonical investigation state. Canonical investigation records mutate exclusively within PostgreSQL and the Evidence Fabric.

```
AUTHORIZED SOURCE DATA
        ↓
Evidence Fabric (S3/MinIO CAS + SHA-256)
        ↓
PostgreSQL Canonical Investigation State
        ↓
Graph Projection Compiler (GraphProjectionEngine)
        ↓
Neo4j Analytical Projection (Cypher / UnifiedStore)
        ↓
Realtime Graph Event Stream (Redis / SSE / RealtimeDispatcher)
        ↓
Frontend Investigation Graph (EvidenceGraph.tsx)
```

1. **Transactional Authority**: PostgreSQL records and persists all entities, cases, relationships, and custody records.
2. **Byte Authority**: Raw evidence bytes remain immutable in S3/MinIO CAS, indexed strictly by SHA-256 and UUIDv7.
3. **Derived Projection**: Neo4j receives projection commands via `GraphProjectionRecord` operations (`CREATE`, `UPDATE`, `DELETE`, `REBUILD`, `INVALIDATE`).
4. **Realtime Incremental Deltas**: The engine emits typed `GraphDelta` objects (`ADD_NODE`, `UPDATE_NODE`, `REMOVE_NODE`, `ADD_EDGE`, `UPDATE_EDGE`, `REMOVE_EDGE`, `RESET_PROJECTION`) rather than requiring full graph refetches.
5. **UI State Preservation**: Frontend graph preserves user viewport, zoom, pan, active filters, and entity selection across streaming updates.

---

### 2. Core Implemented Modules

1. **Canonical Domain Contract** (`backend/app/domain/graph_projection.py`):
   - `GraphOperationType` (`CREATE`, `UPDATE`, `DELETE`, `REBUILD`, `INVALIDATE`).
   - `GraphEventType` (10 canonical event types).
   - `GraphDeltaType` (8 typed delta operations).
   - `GraphNodeOntology` & `GraphEdgeOntology`: Retains case scope, jurisdiction, epistemic status, source references, and temporal bounds (`valid_from`, `valid_to`).
   - `GraphProjectionRecord`, `GraphDelta`, `GraphSnapshot`, `GraphProjectionHealth`, `GraphConsistencyReport`.

2. **Graph Projection Engine** (`backend/app/services/graph_projection_engine.py`):
   - **Idempotency**: Deterministic deduplication by `projection_event_id` and monotonic version enforcement (`curr_ver` tracking). Duplicate projections are safely skipped without side effects.
   - **Ordering Discipline**: Rejects stale versions (`version <= current_version`) and supports buffered sequence handling.
   - **Case & Jurisdiction Isolation**: Composite keys `(case_id, id)` prevent accidental merging of entities across cases. Cross-case queries are rejected unless explicitly authorized.
   - **Bounded Temporal Traversal**: Supports time-filtered subgraphs based on `valid_from` / `valid_to` rather than insertion timestamps.
   - **Deterministic Rebuild**: Clears analytical projection and reconstructs the full graph from PostgreSQL canonical state, validating node/edge counts and emitting `GRAPH_PROJECTION_REBUILT`.
   - **Consistency Validator**: Validates parity between PostgreSQL canonical state and Neo4j projection, surfacing orphan edges or version drifts.

3. **Synthetic Realtime Generator** (`backend/app/generators/synthetic_realtime_generator.py`):
   - Deterministic parameterized generator with seed. Generates nodes, relationships, contradictions, and duplicates clearly marked `SYNTHETIC_DATA` with zero real personal data.

4. **Graph Projection REST API** (`backend/app/api/graph_projection_api.py`):
   - `GET /api/v1/graph-projection/{case_id}/snapshot`: Fetches versioned initial snapshot.
   - `GET /api/v1/graph-projection/{case_id}/deltas`: Fetches deltas since a known version for reconnect catchup.
   - `GET /api/v1/graph-projection/{case_id}/health`: Reports projection health (`HEALTHY`, `CATCHING_UP`, `STALE`, `REBUILDING`).
   - `POST /api/v1/graph-projection/{case_id}/rebuild`: Triggers deterministic case rebuild.
   - `GET /api/v1/graph-projection/{case_id}/neighborhood/{entity_id}`: Bounded expansion (1–2 hops) with temporal filters.
   - `POST /api/v1/graph-projection/{case_id}/validate-consistency`: Audits canonical state vs projection parity.

5. **Frontend Realtime Integration** (`frontend/src/components/investigation/EvidenceGraph.tsx`):
   - Listens to SSE realtime stream and applies incoming `GraphDelta` events incrementally.
   - Preserves investigator selection: arriving nodes do not deselect current entity.
   - Displays clear, non-intrusive alert when a selected entity is removed/invalidated.
   - Epistemic badges (`[VERIFIED]`, `[OBSERVED]`, `[INFERRED]`, `[CONFLICT]`) using multi-attribute indicators (symbol, text, color) to comply with accessibility requirements.
   - Projection health status badge (`PROJECTION: HEALTHY / STALE / REBUILDING`).

---

### 3. Verification & Test Metrics

- **Dedicated A5 Suite**: `102/102 PASSED` in 7.21s (`backend/tests/test_wave7_subphase_a5_graph_authority.py`).
  - Graph Ontology Audit & Invariants
  - Idempotency & Duplicate Re-projection
  - Ordering & Version Monotonicity
  - Neo4j Transactional Writes & Parameterization
  - Case Isolation (`CASE-001` vs `CASE-002`)
  - Cross-Jurisdictional Traversal Authorization
  - Temporal Graph Validity Filtering
  - Incremental Graph Deltas (`ADD_NODE`, `UPDATE_NODE`, `REMOVE_NODE`, etc.)
  - Snapshot & Delta Reconnect Catchup
  - Deterministic Rebuild from Canonical State
  - Consistency Validator
  - Golden Investigation Chain (`C102` ↔ `P001` ↔ `PH001` ↔ `PH002` ↔ `P044` ↔ `V188` ↔ `C481`)
  - Failure Injection (Out-of-order, corrupt payload, network disconnects)
  - Security & Prompt Injection passive data isolation
  - A3 Context & A4 Voice Integration
  - 1,000-node Ingestion Benchmark: 47.9ms
  - 10,000-node Ingestion Benchmark: 4.54s
- **Wave 7 Regression Suite (A1–A5)**: `328/328 PASSED` in 24.16s.
- **Full Backend Regression Suite**: `738/738 PASSED` in 39.41s.
- **Frontend Production Build**: `tsc -b && vite build` completed in 1.49s with `0 errors`.

---

### 4. External Dependency Classification

- `BLOCKED_EXTERNAL_DEPENDENCY`:
  - **LiveKit Server Daemon**: Production WebRTC audio bridge. Offline deterministic provider operational.
  - **Neo4j Aura / Enterprise Daemon**: Network container. Deterministic in-memory graph repository operational with cached connectivity probe.
  - **Deepgram / Fish Audio Cloud APIs**: External STT/TTS cloud endpoints. Offline Indian English/Tamil deterministic synthesis operational.
