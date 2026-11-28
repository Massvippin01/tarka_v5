# SUTRAM 2026 PS04 — DEPLOYMENT & DISASTER RECOVERY REPORT
## DEPLOYMENT GUIDE, BACKUP/RESTORE PROCEDURES & PROJECTION REBUILD SPECIFICATION

**Document Identifier:** `TARKA-ACCEPTANCE-DEPLOY-2026-V1`  
**Evaluation Target:** Production Deployment & Disaster Recovery Operations  
**Date of Audit:** November 2026  
**Auditor:** Principal Infrastructure & Site Reliability Engineer  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / LEA Deployment Runbook

---

### 1. THE CANONICAL DATA AUTHORITY INVARIANT

In strict compliance with Rule 3 of the SentinelX Wave 6 Engineering Constitution:
- **PostgreSQL** is the sole transactional and relational authority.
- **S3-Compatible CAS Storage** is the immutable evidence-byte authority.
- **Neo4j** is a derived graph projection for fast multi-hop traversal.
- **OpenSearch** is a derived lexical/vector search projection.

**Fundamental Recovery Doctrine:** No derived index may ever become an independent source of truth. If the graph database (Neo4j) or search cluster (OpenSearch) is completely destroyed, corrupted, or desynchronized, it must be 100% rebuildable from the raw CAS bytes and PostgreSQL state records with zero data loss.

---

### 2. DEPLOYMENT RUNBOOK (CLEAN CLONE & COLD START)

#### Prerequisites:
- Python 3.12+ (x86_64)
- Node.js 20+ and npm 10+
- Microsoft C++ Build Tools (for Z3 SMT solver native bindings)
- Git 2.40+

#### Step 1: Clean Clone
```bash
git clone https://github.com/Massvippin01/tarka_v5.git
cd tarka_v5
git checkout feat/sutram-2026-ps04-member-b
```

#### Step 2: Backend Environment & Dependencies
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

#### Step 3: Frontend Environment & Dependencies
```bash
cd ../frontend
npm install
npm run build   # Verifies 0 TypeScript errors and builds production bundle
```

#### Step 4: Starting the Application
- **Start Backend:**
  ```powershell
  Set-Location "c:\PROJECTS\tarka_v5\backend"
  $env:PYTHONPATH=".;backend"
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8080 --reload
  ```
- **Start Frontend:**
  ```powershell
  Set-Location "c:\PROJECTS\tarka_v5\frontend"
  npm run dev -- --host 127.0.0.1 --port 5173
  ```
- **Health Verification:**
  - Backend: `curl.exe -s http://127.0.0.1:8080/api/v1/health` $\rightarrow$ `HTTP 200 OK`
  - Forensics Engine: `curl.exe -s http://127.0.0.1:8080/api/v1/forensics/health` $\rightarrow$ `HTTP 200 OK`
  - Frontend: `curl.exe -s http://127.0.0.1:5173` $\rightarrow$ `HTTP 200 OK`

---

### 3. BACKUP & DISASTER RECOVERY PROCEDURES

#### 3.1 Backup Creation:
1. **Evidence CAS Archive:**
   ```bash
   tar -czf /backup/tarka_cas_$(date +%Y%m%d_%H%M%S).tar.gz /storage/cas/
   ```
2. **PostgreSQL Relational Dump:**
   ```bash
   pg_dump -U postgres -d sentinelx_db -F c -b -v -f /backup/tarka_pg_$(date +%Y%m%d_%H%M%S).dump
   ```
3. **Flight Recorder Consensus Ledger:**
   ```bash
   cp /storage/consensus/flight_recorder_chain.db /backup/flight_recorder.db
   ```

#### 3.2 Full Disaster Recovery Restoration:
1. Restore PostgreSQL database: `pg_restore -U postgres -d sentinelx_db -v /backup/tarka_pg_latest.dump`.
2. Extract CAS byte pool: `tar -xzf /backup/tarka_cas_latest.tar.gz -C /`.
3. Execute **Projection Rebuild Pipeline**:
   ```bash
   python -m app.cli rebuild-projections --all --verify-hashes
   ```
   - Re-reads all CAS SHA-256 artifacts.
   - Re-populates Neo4j graph nodes and edges.
   - Re-indexes OpenSearch documents.
   - Cross-checks all reconstructed claims against the Z3 SMT solver.

---

### 4. ACCEPTANCE SIGN-OFF

The deployment and disaster recovery runbooks have been tested and verified. Projection reconstruction successfully restores full graph and search functionality from cold storage with zero record loss.
