# TARKA × SENTINELX — PHASE 19
## PRODUCTION OPERATIONS & SITE RELIABILITY RUNBOOK

**Report Identifier:** `PHASE19_OPERATIONS_RUNBOOK.md`  
**Phase:** Stage 8 — Operational Readiness  
**Date:** 2026-11-25  
**Audience:** Site Reliability Engineers, Forensic System Administrators, DevOps Leads  

---

## 1. HEALTH PROBING & SERVICE MONITORING

The application topology exposes tiered health endpoints for container schedulers, reverse proxies, and synthetic monitoring:

| Health Probe URL | Target Service | Expected Response | Remediation if Failing |
| :--- | :--- | :--- | :--- |
| `GET /healthz` | NGINX Reverse Proxy | HTTP 200 `healthy\n` | Check NGINX process, reload `nginx.conf`. |
| `GET /api/v1/health` | FastAPI Core Application | `{ "status": "healthy", "version": "2.0.0" }` | Check Uvicorn process, verify DB connection pool. |
| `GET /api/v1/forensics/health` | Digital Forensics Engine | `{ "status": "healthy" }` + RAM/CAS stats | Inspect disk space on `/app/data/storage/artifacts`. |

### Automated Uptime Health Check Script
Run on a 60-second cron job:
```bash
#!/usr/bin/env bash
STATUS=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:8080/api/v1/health || echo "FAIL")
if [ "$STATUS" != "200" ]; then
    echo "[$(date)] ALERT: SentinelX health probe failed with status $STATUS. Restarting backend..." >> /var/log/sentinelx_monitor.log
    docker compose -f /opt/sentinelx/docker-compose.yml restart backend
fi
```

---

## 2. STRUCTURED LOGGING & LOG ROTATION

- **Container Logs:** Docker manages log output for all containers with JSON formatting.
- **Log Inspection Commands:**
  ```bash
  # Follow live application backend logs
  docker compose logs -f backend

  # View NGINX access and error logs
  docker compose logs -f frontend

  # Filter for errors across all services
  docker compose logs | grep -i "error\|exception\|critical"
  ```
- **Log Rotation Policy (`/etc/docker/daemon.json`):**
  Ensure container logs do not exhaust disk capacity:
  ```json
  {
    "log-driver": "json-file",
    "log-opts": {
      "max-size": "50m",
      "max-file": "5"
    }
  }
  ```

---

## 3. DISK SPACE MANAGEMENT & CAS PRUNING

Forensic evidence ingestion can consume gigabytes of storage over extended investigations.

### 3.1 Monitoring Disk Headroom
```bash
# Check filesystem utilization across root and persistent volumes
df -h /var/lib/docker/volumes

# Inspect volume sizes specifically
docker system df -v
```

### 3.2 Automated Staging Buffer Purge
Temporary upload chunks (`.tmp_*`) that fail or are canceled after 48 hours should be cleared:
```bash
# Clean orphaned temp buffers older than 2 days in CAS storage
find /var/lib/docker/volumes/evidence_prod_data/_data -name ".tmp_*" -mtime +2 -delete
```

---

## 4. AUTOMATED BACKUP & RETENTION CRON SCHEDULE

Configure `/etc/cron.d/sentinelx_backup`:
```cron
# Daily forensic backup at 02:00 AM UTC
0 2 * * * root /opt/sentinelx/scripts/backup_production.sh >> /var/log/sentinelx_backup.log 2>&1
```

### Backup Script (`scripts/backup_production.sh`):
```bash
#!/usr/bin/env bash
set -euo pipefail
BACKUP_DIR="/opt/sentinelx/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "${BACKUP_DIR}"

# 1. PostgreSQL Database Dump
docker exec sentinelx-prod-postgres pg_dump -U sentinelx_prod_user sentinelx_prod | gzip > "${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"

# 2. CAS Evidence Directory Archive
tar -czf "${BACKUP_DIR}/cas_${TIMESTAMP}.tar.gz" -C /var/lib/docker/volumes/evidence_prod_data/_data .

# 3. Retention Enforcement: Purge backups older than 30 days
find "${BACKUP_DIR}" -name "*.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: db_${TIMESTAMP}.sql.gz and cas_${TIMESTAMP}.tar.gz"
```

---

## 5. DEMO ENVIRONMENT VS PRODUCTION EVIDENCE ENVIRONMENT

| Feature / Control | Public Demo Environment | Production Law Enforcement Environment |
| :--- | :--- | :--- |
| **Data Provenance** | Strictly `SYNTHETIC_DATA` only. | Genuine digital evidence with judicial custody logs. |
| **User Access** | Public demo credentials with read-only/simulated scope. | Strict 7-factor RBAC, 2FA, police badge verification. |
| **Network Exposure** | Public HTTPS endpoint. | Restricted to State Wide Area Network (SWAN) or VPN. |
| **Audit Retention** | Ephemeral, reset on scheduled demo refresh. | Immutable, non-tamper Merkle roots preserved for trial. |
| **CORS Policy** | Bound to public demo domain. | Bound strictly to authorized internal agency portals. |
