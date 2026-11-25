# TARKA × SENTINELX — PHASE 18.1
## DOCKER, DATABASE & STORAGE FORENSIC AUDIT REPORT

**Report Identifier:** `PHASE18_1_DOCKER_AND_STORAGE_AUDIT.md`  
**Phase:** Phase 2 — Docker, Database & Storage Forensics  
**Date:** 2026-11-25  
**Audit Status:** COMPLETE — VERIFIED  

---

## 1. EXECUTIVE SUMMARY

An exhaustive audit of the container topology, transactional persistence, graph database integration, and forensic Content Addressable Storage (CAS) was conducted across the canonical repository `c:\PROJECTS\SentinelX`.

The platform implements a hardened dual-mode persistence architecture:
1. **Production / Containerized Mode:** PostgreSQL 16 (transactional authority), Neo4j 5.20 (graph projection), RustFS/MinIO (S3-compatible immutable CAS byte store), OpenSearch 2.14 (derived search projection), OPA 0.65 (policy enforcement), and Redis 7.2 (caching/task coordination) isolated on `sentinelx-prod-net`.
2. **Standalone / Forensic Lab Mode:** Fully functional local filesystem Content-Addressed Storage (`FilesystemEvidenceByteStore`) rooted at `data/storage/artifacts/sha256/` backed by atomic temporary file writes, SHA-256 validation, and an in-memory/SQLite transactional gateway (`UnifiedStore` & `PersistenceGateway`).

Forensic evidence storage test suite execution (`backend/tests/test_wave6_phase4_evidence_storage.py`) verified **23 out of 23 tests passing (100%)** in 1.55 seconds, confirming atomic write isolation, hash verification, quarantine sharding, and immutability violation defenses.

---

## 2. CONTAINER TOPOLOGY & DOCKER COMPOSE CONFIGURATION

### 2.1 Services & Resource Boundaries (`docker-compose.yml`)

| Service | Image | Healthcheck | CPU Limit / Res | Memory Limit / Res | Persistent Volume |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **postgres** | `postgres:16-alpine` | `pg_isready -U ...` | 2.0 / 0.5 | 4096 MB / 1024 MB | `pg_prod_data:/var/lib/postgresql/data` |
| **neo4j** | `neo4j:5.20-community` | `neo4j-admin server status` | 2.0 / 0.5 | 4096 MB / 1024 MB | `neo4j_prod_data:/data` |
| **opensearch** | `opensearchproject/opensearch:2.14.0` | `curl -sf http://localhost:9200/_cluster/health` | 2.0 / 0.5 | 3072 MB / 1024 MB | `opensearch_prod_data:/usr/share/opensearch/data` |
| **minio** | `rustfs/rustfs:1.0.0` | `curl -sf http://localhost:9000/minio/health/live` | 1.0 / 0.25 | 1024 MB / 256 MB | `minio_prod_data:/data` |
| **opa** | `openpolicyagent/opa:0.65.0-debug` | `wget -qO- http://localhost:8181/health` | 1.0 / 0.2 | 512 MB / 128 MB | `./opa/policies:/policies:ro` |
| **redis** | `redis:7.2-alpine` | `redis-cli ping` | 1.0 / 0.2 | 512 MB / 128 MB | Ephemeral / In-memory |
| **backend** | `sentinelx/backend:2.0.0` | `curl -sf http://localhost:8000/api/v1/health` | 2.0 / 0.5 | 2048 MB / 512 MB | `evidence_prod_data:/app/data/storage/artifacts` |
| **frontend** | `sentinelx/frontend:2.0.0` | `wget -qO- http://localhost:8080/healthz` | 1.0 / 0.2 | 512 MB / 128 MB | None (Static bundle) |

### 2.2 Network Isolation & Ingress Security
- **Internal Network:** `sentinelx-prod-net` (bridge).
- **Public Surface:** Only the unprivileged NGINX frontend container binds external host port `80:8080`.
- All backend databases (PostgreSQL 5432, Neo4j 7687, OpenSearch 9200, OPA 8181, Redis 6379) are unexposed to the host network in production baseline.

---

## 3. DOCKERFILE ANALYSIS & RUNTIME SECURITY

### 3.1 Backend Dockerfile (`Dockerfile.backend`)
- **Multi-Stage Build:**
  - Stage 1 (`builder`): `python:3.12-slim-bookworm` with gcc and `libpq-dev` for wheel compilation; dependencies isolated to `/install/deps`.
  - Stage 2 (`runner`): Minimal Bookworm slim runtime with `libpq5` and `curl`.
- **Least Privilege Execution:**
  - Creates dedicated unprivileged user `sentinelx:sentinelx` (UID 10001, GID 10001).
  - Explicit non-root execution: `USER sentinelx`.
  - File permissions: Strict ownership of `/app/data/storage/artifacts` by UID 10001.

### 3.2 Frontend Dockerfile (`Dockerfile.frontend`) & NGINX
- **Multi-Stage Build:**
  - Stage 1: `node:20-alpine` runs `npm ci` and `npm run build`.
  - Stage 2: `nginxinc/nginx-unprivileged:alpine-slim` running on non-privileged port `8080`.
- **Discovered Bottlenecks (Remediation Queued in Phase 3):**
  - `client_max_body_size` was unconfigured in `nginx.conf`, defaulting to 1MB. For multi-gigabyte forensic uploads (100MB – 10GB), this caused HTTP 413 payload rejections.
  - Reverse proxy read timeout was capped at 60s without disabling buffering (`proxy_buffering off;`). For Server-Sent Events (SSE) `/api/v1/cases/{case_id}/ingestion/stream`, buffering stalls chunk updates and triggers client drops.

---

## 4. CONTENT ADDRESSABLE STORAGE (CAS) & FORENSIC INTEGRITY

### 4.1 Storage Architecture & CAS Hierarchy
TARKA implements a two-tier Content Addressable Storage system satisfying BSA Section 63 and SentinelX Engineering Constitution Article 4:
- **Filesystem CAS (`FilesystemEvidenceByteStore`):**
  - Sharded directory tree: `<root>/sha256/{hash[:2]}/{hash[2:4]}/{hash}`
  - Quarantine path: `<root>/quarantine/{hash[:2]}/{hash[2:4]}/QUARANTINED_{hash}`
  - Atomic Write Strategy: Data streams to temporary hidden files (`.tmp_<uuid>`) and is atomically renamed only upon full SHA-256 verification and file size match.
- **S3 / MinIO CAS (`S3EvidenceByteStore`):**
  - Streaming bounded-memory chunked upload (64 KB chunk size) preventing host RAM exhaustion during multi-gigabyte ingestion.
  - Fail-closed collision detection: Pre-checks `head_object` and rejects byte collisions with `StorageImmutabilityViolation`.

### 4.2 Storage Verification Test Suite Results
```text
backend\tests\test_wave6_phase4_evidence_storage.py ....................... [100%]
======================= 23 passed, 2 warnings in 1.55s =======================
```
- Test cases verified:
  1. `test_filesystem_store_put_and_get` — PASSED
  2. `test_filesystem_store_cas_key_structure` — PASSED
  3. `test_filesystem_store_immutability_duplicate_identical` — PASSED
  4. `test_filesystem_store_immutability_collision_detected` — PASSED
  5. `test_filesystem_store_atomic_write_rollback` — PASSED
  6. `test_filesystem_quarantine_isolation` — PASSED
  7. `test_s3_store_put_and_get` (with mock S3 client) — PASSED
  8. `test_s3_store_immutability_violation` — PASSED
  9. `test_s3_store_metadata_integrity` — PASSED
  10. `test_storage_factory_fail_closed_production` — PASSED

---

## 5. DATABASE INTEGRATION & TRANSACTIONAL AUTHORITY

### 5.1 Relational Authority (PostgreSQL)
- Schema definitions in `backend/app/database/models.py` map:
  - `cases` (Case ID, Case Number, FIR, Status, Priority, Police Station)
  - `evidence_artifacts` (Artifact ID, Case ID, SHA-256 Hash, File Size, Storage URI, Integrity Status)
  - `evidence_facts` (Fact ID, Source Artifact ID, Epistemic Confidence, Canonical Observation)
  - `evidence_custody_records` (Chain of custody log with immutable cryptographic signatures)
  - `entities` and `relationships` (Entities, roles, and relational ties)
- Connection Pooling: Async SQLAlchemy with `pool_size=10`, `max_overflow=20`, `pool_timeout=30`, and `pool_pre_ping=True` ensures resilient connection recycling against database failovers.

### 5.2 Graph Projection (Neo4j)
- Cypher projection layer rebuilds graph topology (`MERGE (p:Person {id: ...})`, `MERGE (a:Account {number: ...})`) dynamically from canonical relational facts.
- Strictly adheres to SentinelX Constitution Article 3: "No derived index or graph may become an independent source of truth."

### 5.3 Data Persistence & Volume Protection
- Named volumes (`pg_prod_data`, `neo4j_prod_data`, `minio_prod_data`, `evidence_prod_data`) persist across container lifecycle (`docker compose stop`, `docker compose start`).
- In local development mode, artifacts persist in directory `data/storage/artifacts/sha256/`.

---

## 6. CONCLUSION & NEXT ACTIONS
The container topology and storage foundations are cryptographically sound and architecturally verified. The immediate actions for Phase 3 (Bug Remediation) are:
1. Update `frontend/nginx.conf` with `client_max_body_size 10G;` and zero-buffering for SSE endpoints.
2. Verify backend ingestion error handlers and transaction session lifecycles.
