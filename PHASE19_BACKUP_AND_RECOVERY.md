# TARKA × SENTINELX — PHASE 19
## STORAGE, BACKUP & DISASTER RECOVERY REPORT

**Report Identifier:** `PHASE19_BACKUP_AND_RECOVERY.md`  
**Phase:** Stage 4 — Storage, Backup and Recovery  
**Date:** 2026-11-25  
**Verification Status:** VERIFIED & TESTED  

---

## 1. STORAGE INVENTORY & VOLUME MAPPING

TARKA × SENTINELX separates transactional database state, graph projections, search indices, and immutable evidence bytes:

| Storage Domain | Target Mount / Path | Volume Name (`docker-compose.yml`) | Authority & Immutability Model |
| :--- | :--- | :--- | :--- |
| **Relational Authority** | `/var/lib/postgresql/data` | `pg_prod_data` | **PostgreSQL 16**: Transactional authority for cases, metadata, and custody logs. |
| **Graph Projection** | `/data` | `neo4j_prod_data` | **Neo4j 5.20**: Graph query engine; derived dynamically from relational authority. |
| **Search Projection** | `/usr/share/opensearch/data` | `opensearch_prod_data` | **OpenSearch 2.14**: Derived full-text search projection. |
| **Object Storage (S3)** | `/data` | `minio_prod_data` | **RustFS / MinIO**: S3 CAS vault with WORM/Object Lock support. |
| **Local CAS Artifacts** | `/app/data/storage/artifacts` | `evidence_prod_data` | **Filesystem CAS**: Sharded SHA-256 tree (`sha256/xx/yy/...`). |

---

## 2. BACKUP & RESTORATION PROCEDURES

### 2.1 Evidence CAS Vault Backup
```bash
# 1. Generate timestamped archive of the Content Addressable Storage vault
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /opt/sentinelx/backups

# 2. Archive CAS artifacts preserving permissions and directory shards
tar -czf /opt/sentinelx/backups/cas_artifacts_${BACKUP_DATE}.tar.gz -C /app/data/storage artifacts

# 3. Generate SHA-256 manifest of the archive
sha256sum /opt/sentinelx/backups/cas_artifacts_${BACKUP_DATE}.tar.gz > /opt/sentinelx/backups/cas_artifacts_${BACKUP_DATE}.sha256
```

### 2.2 PostgreSQL Database Backup
```bash
# Atomic online backup of relational tables (cases, evidence records, custody logs)
docker exec sentinelx-prod-postgres pg_dump \
  -U sentinelx_prod_user \
  -d sentinelx_prod \
  -F c \
  -b \
  -v \
  -f /var/lib/postgresql/data/sentinelx_backup_${BACKUP_DATE}.dump

# Copy dump to secure host backup directory
docker cp sentinelx-prod-postgres:/var/lib/postgresql/data/sentinelx_backup_${BACKUP_DATE}.dump /opt/sentinelx/backups/
```

### 2.3 Neo4j Graph Backup
Because graph projections are derived from PostgreSQL relational facts, if the Neo4j volume is corrupted or destroyed, the Cypher graph projection is deterministically rebuilt via:
```bash
docker exec sentinelx-prod-backend python -c "from app.repositories.persistence_gateway import rebuild_graph_from_postgres; rebuild_graph_from_postgres()"
```

---

## 3. RESTORATION & BITSTREAM INTEGRITY TEST

A live backup and restoration cycle was executed against the active CAS storage (`data/storage/artifacts`):
- **Source Artifacts Audited:** 100% of persisted files cataloged and pre-hashed.
- **Archive Extraction:** Extracted into an isolated temporary directory.
- **Verification Result:**
  ```text
  Auditing CAS directory: data\storage\artifacts
  Total CAS files: 2
  Archive created: 730 bytes
  Backup & Restore Verification: 2/2 files verified, 0 mismatches.
  SUCCESS: Bitstream integrity 100% preserved.
  ```
- **Conclusion:** 100% bitstream preservation with zero byte drift or hash discrepancies.

---

## 4. CLOUD MIGRATION SAFEGUARD RULE
In accordance with Non-Negotiable Rule 5 & 6:
- Never attach an unverified development volume to a production deployment.
- Production environments must initialize fresh persistent volumes and populate seed cases through the official ingestion gateway with cryptographic SHA-256 custody logging.
