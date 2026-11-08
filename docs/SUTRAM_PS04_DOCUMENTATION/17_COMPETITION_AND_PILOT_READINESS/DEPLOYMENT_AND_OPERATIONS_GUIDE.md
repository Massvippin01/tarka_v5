# SUTRAM 2026 PS04 — DEPLOYMENT & OPERATIONS GUIDE
## OPERATIONAL RUNBOOK, CONTAINER ORCHESTRATION & SYSTEM ADMINISTRATION

**Document Identifier:** `TARKA-OPS-GUIDE-2026-V1`  
**Target Audience:** System Administrators, DevOps Engineers & Forensic Station Admins  
**Repository:** `https://github.com/Massvippin01/tarka_v5.git`  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Operations Runbook

---

### 1. ENVIRONMENT CONFIGURATION & VARIABLES

TARKA is configured through `.env` in the repository root or backend directory.

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Deployment mode (`development`, `staging`, `production`) |
| `HOST` | `127.0.0.1` | Network listen interface |
| `PORT` | `8080` | FastAPI core application port |
| `FRONTEND_PORT` | `5173` | Vite/Nginx frontend port |
| `STORAGE_CAS_PATH` | `/storage/cas` | Root filesystem directory for Content-Addressable Storage |
| `POSTGRES_DB` | `sentinelx_prod` | Transactional PostgreSQL database name |
| `POSTGRES_USER` | `sentinelx_user` | PostgreSQL database user |
| `POSTGRES_PASSWORD` | `<secure_password>` | PostgreSQL password |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt connection URI |
| `NEO4J_AUTH` | `neo4j/<secure_pass>` | Neo4j credentials |
| `OPENSEARCH_URL` | `https://localhost:9200` | OpenSearch endpoint |
| `SARVAM_API_KEY` | `<optional>` | Optional API key for live Sarvam bilingual cloud voice |

---

### 2. DEPLOYMENT TOPOLOGIES

#### Topology A: Bare-Metal Local / Air-Gapped Workstation (Recommended for Competition & Field)
- **Prerequisites:** Python 3.12+, Node.js 20+, Microsoft C++ Build Tools.
- **Backend Launch:**
  ```powershell
  Set-Location "c:\PROJECTS\tarka_v5\backend"
  $env:PYTHONPATH=".;backend"
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --workers 2
  ```
- **Frontend Launch:**
  ```powershell
  Set-Location "c:\PROJECTS\tarka_v5\frontend"
  npm run dev -- --host 127.0.0.1 --port 5173
  ```

#### Topology B: Production Docker Compose Topology
- **Prerequisites:** Docker Engine 24+ and Docker Compose v2.
- **Deployment Command:**
  ```bash
  docker compose -f docker-compose.yml up -d --build
  ```
- **Service Stack Started:**
  1. `sentinelx-prod-postgres` (Port 5432)
  2. `sentinelx-prod-neo4j` (Port 7687, 7474)
  3. `sentinelx-prod-opensearch` (Port 9200)
  4. `sentinelx-prod-backend` (Port 8080)
  5. `sentinelx-prod-frontend` (Port 80 / 443)

---

### 3. HEALTHCHECK & SMOKE TESTING

Run the following checks to verify operational readiness:

```powershell
# 1. Check Core Application API
curl.exe -s http://127.0.0.1:8080/api/v1/health

# 2. Check Digital Forensics Engine & Z3 Solver
curl.exe -s http://127.0.0.1:8080/api/v1/forensics/health

# 3. Check Web Frontend
curl.exe -s -I http://127.0.0.1:5173
```

All three must respond with `HTTP 200 OK`.

---

### 4. BACKUP, RESTORE & PROJECTION RECONSTRUCTION

#### 4.1 Daily Backup Schedule:
1. Export PostgreSQL transactional dump:
   ```bash
   pg_dump -U sentinelx_user -d sentinelx_prod -F c -b -v -f /backup/db_$(date +%Y%m%d).dump
   ```
2. Archive immutable CAS evidence chunks:
   ```bash
   tar -czf /backup/cas_$(date +%Y%m%d).tar.gz /storage/cas/
   ```

#### 4.2 Rebuilding Derived Projections from Scratch:
If Neo4j or OpenSearch is lost, re-execute the deterministic projection pipeline:
```bash
python -m app.cli rebuild-projections --all --verify-hashes
```
The pipeline parses all raw CAS bitstreams, verifies SHA-256 hashes against PostgreSQL records, and completely rebuilds the graph and search indices with 100% record fidelity.
