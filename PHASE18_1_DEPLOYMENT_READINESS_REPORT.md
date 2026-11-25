# TARKA × SENTINELX — PHASE 18.1
## DEPLOYMENT READINESS & HARDENING REPORT

**Report Identifier:** `PHASE18_1_DEPLOYMENT_READINESS_REPORT.md`  
**Phase:** Phase 8 — Deployment Hardening & Live Verification  
**Date:** 2026-11-25  
**Production Readiness Status:** READY FOR OPERATIONAL DEPLOYMENT  

---

## 1. EXECUTIVE SUMMARY

The deployment topology, secrets management, service lifecycle orchestration, and failure recovery protocols of TARKA × SENTINELX have been audited and hardened for institutional on-premise and air-gapped forensic operations.

The deployment framework supports two primary operating environments:
1. **Containerized Production Topology (`docker-compose.yml`):**
   - 8 isolated microservices on private bridge network `sentinelx-prod-net`.
   - Single unprivileged ingress entrypoint (NGINX `80:8080`) with `client_max_body_size 10G;` and zero-buffering SSE streaming.
   - Non-root container security (Backend UID 10001, Frontend NGINX non-root).
   - Dedicated named persistence volumes for PostgreSQL, Neo4j, OpenSearch, MinIO, and evidence CAS storage.
2. **Standalone Forensic Lab Mode (`scripts/reproduce.sh` / `scripts/reproduce.ps1`):**
   - Zero-dependency local execution utilizing filesystem-backed CAS (`data/storage/artifacts/sha256/`) and in-memory transactional fallback store.
   - Fully deterministic setup verifying Node 20, Python 3.12, dependency manifests, tests, and Vite bundling in a single command.

---

## 2. CONFIGURATION & SECRETS MANAGEMENT MATRIX

All environment configurations are governed by strict fail-closed validation rules defined in `app/core/config.py`:

| Parameter | Development (`.env.development.example`) | Production (`.env.production.example`) | Fail-Closed Enforcement Rule |
| :--- | :--- | :--- | :--- |
| `APP_ENV` | `development` | `production` | If `production`, `DEBUG` MUST be `false` or startup halts. |
| `DEBUG` | `true` | `false` | If `true` in production, raises `ValueError`. |
| `SECRET_KEY` | Dev default (>= 32 chars) | High-entropy 64-char key from Vault | Minimum 32 characters; default keys rejected in prod. |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:8080` | `https://sentinelx.intelligence.gov.in` | Wildcard `'*'` strictly prohibited in prod. |
| `DATABASE_URL` | Local PostgreSQL or SQLite | Clustered PostgreSQL with TLS (`sslmode=verify-full`) | In prod, `sqlite` or `localhost` raises startup exception. |
| `NEO4J_URI` | `bolt://localhost:7687` | `neo4j+s://neo4j-cluster.prod.internal:7687` | Encrypted Bolt+S connection required in prod. |
| `STORAGE_BACKEND` | `filesystem` | `s3` | If `filesystem` in prod, `get_evidence_byte_store()` throws `ValueError`. |
| `OPA_FAIL_CLOSED` | `true` | `true` | If OPA policy engine is unreachable, access defaults to DENY. |

---

## 3. DEPLOYMENT PROCEDURES

### 3.1 Containerized Production Deployment
```bash
# 1. Clone repository into dedicated deployment root
git clone https://github.com/Massvippin01/tarka_v5.git /opt/sentinelx
cd /opt/sentinelx

# 2. Inject verified production environment secrets
cp .env.production.example .env
# Edit .env with production credentials from HashiCorp Vault / Secret Manager

# 3. Pull / build hardened non-root container images
docker compose build --pull

# 4. Launch production topology in detached mode
docker compose up -d

# 5. Verify service healthcheck statuses
docker compose ps
# Expected: All 8 services report (healthy)
```

### 3.2 Standalone Forensic Lab Deployment (Offline / Field Laptop)
```powershell
# Windows PowerShell Execution:
.\scripts\reproduce.ps1 -Mode test

# Linux / macOS Bash Execution:
./scripts/reproduce.sh
```

---

## 4. HEALTH MONITORING & TELEMETRY PROBES

The deployment exposes standardized unauthenticated container health probes and authenticated operational metrics:

1. **Frontend Ingress Health:** `GET http://localhost:8080/healthz`
   - Returns HTTP 200 `healthy\n`.
   - Used by Kubernetes/Docker daemon for container liveness.
2. **Backend Application Health:** `GET http://localhost:8000/api/v1/health`
   - Returns `{ "status": "healthy", "version": "2.0.0", "environment": "production" }`.
3. **Forensic Subsystem Health:** `GET http://localhost:8000/api/v1/forensics/health`
   - Returns state of CAS storage, memory headroom, and active worker admission counts.

---

## 5. DISASTER RECOVERY & VOLUME PERSISTENCE

- **Volume Persistence:** Named Docker volumes (`pg_prod_data`, `neo4j_prod_data`, `minio_prod_data`, `evidence_prod_data`) are stored under Docker's persistent root and remain intact across container updates or reboots.
- **Backup Procedure:**
  ```bash
  # Atomic backup of evidence CAS and database dumps
  docker exec sentinelx-prod-postgres pg_dump -U sentinelx_prod_user sentinelx_prod > backup_pg_$(date +%F).sql
  tar -czf backup_cas_$(date +%F).tar.gz /var/lib/docker/volumes/sentinelx_evidence_prod_data/_data
  ```

---

## 6. CONCLUSION
TARKA × SENTINELX is verified ready for deployment. Ingress limits have been expanded to 10GB with zero-buffering SSE streaming, non-root container security is enforced, configuration fail-closed rules prevent insecure defaults, and reproduction scripts validate clean execution across environments.
