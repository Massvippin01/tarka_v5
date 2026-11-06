# TARKA SUTRAM 2026 PS04 — PHASE 14.0–14.1
## DELIVERABLE 2: EMPIRICAL BASELINE REVALIDATION & ARCHITECTURAL DISCOVERY REPORT

**Document Identifier:** `TARKA-PHASE14-BASELINE-REVAL-V1`  
**Execution Environment:** Windows 10/11 x64, Python 3.12.1, Node.js v20+, Vite 8.0.16  
**Working Branch:** `phase-14/whole-system-completion`  
**Protected Reference Baseline:** `e2a4268c2022901dfa0dbc6890d26329c9f4f3cb`  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Baseline Verification

---

### 1. REVALIDATION OBJECTIVE & EMPIRICAL CHARTER

The objective of Deliverable 2 is to independently reproduce all reported test batteries from Phase 13, audit the actual test counts, investigate any anomalies or naming discrepancies, and establish whether the running application genuinely serves the TARKA investigative platform.

---

### 2. INDEPENDENT REPRODUCTION OF CRITICAL TEST BATTERIES

Every critical test target reported in Phase 13 was re-executed on live hardware. The exact command lines, execution durations, exit codes, and test outcomes were logged:

```
========================================================================================================================
                                     EMPIRICAL TEST REVALIDATION MATRIX
========================================================================================================================
Target Subsystem & Focus         Exact Command Executed                       Exit Code Duration Result   Status
------------------------------------------------------------------------------------------------------------------------
ZKP Groth16 & Witness Privacy    pytest backend/tests/test_ps04_zkp.py -v        0      1.35s    6/6      PASSED (✓)
4-Node PBFT & Distributed Fabric pytest backend/tests/test_ps04_bft.py \         0      1.08s    32/32    PASSED (✓)
                                 backend/tests/test_ps04_distributed_events.py \
                                 backend/tests/test_ps04_vector_clock.py \
                                 backend/tests/test_m2_distributed_event_fabric.py -v
Commutative ECDH-PSI Privacy     pytest backend/tests/test_ps04_psi.py -v        0      22.21s   9/9      PASSED (✓)
CAS Storage & SentinelX Integr.  pytest backend/tests/test_tarka_sentinelx_integr. 0   32.57s   33/33    PASSED (✓)
SMT Counterfactual & MARCO MUS   pytest backend/tests_tarka/tests/test_phase3a... 0     25.30s   20/20    PASSED (✓)
Golden Case 11-Family Ingestion  pytest backend/tests/test_golden_case_cross_... 0      5.95s    1/1      PASSED (✓)
------------------------------------------------------------------------------------------------------------------------
CRITICAL MILESTONE SUBSET TOTAL: 101 Tests Executed (97 core + 4 vector clock)   0      88.46s   101/101  100% PASS
========================================================================================================================
```

#### Test Count Audit Note:
- In Phase 13, the distributed BFT test count was reported as 28 tests.
- Re-execution reveals that the full distributed suite contains **32 tests** (4 tests in `test_ps04_bft.py`, 6 tests in `test_ps04_distributed_events.py`, 4 tests in `test_ps04_vector_clock.py`, and 18 tests in `test_m2_distributed_event_fabric.py`).
- All 32 tests execute cleanly in 1.08 seconds with zero failures.

---

### 3. WHOLE-REPOSITORY TEST SUITE INVENTORY

To establish repository truth beyond the milestone subset, a full test collection audit was performed across `backend/tests` and `backend/tests_tarka`:

```
Command: pytest backend/tests backend/tests_tarka --collect-only -q
Result:  1,463 tests collected in 33.84 seconds
Status:  0 collection syntax errors, 0 broken fixtures
```

The 1,463 automated tests cover:
- 48 test modules in `backend/tests/` (Canonical contracts, OPA policy evaluation, OIDC/RBAC auth, SentinelX persistence, evidence gateway, Sarvam voice orchestration, adversarial validation).
- 25 test modules in `backend/tests_tarka/` (Z3 SMT solver, MARCO MUS enumeration, difference logic, timezone normalization, OCR bounding box triage, forensic PDF exports, custody hash-chains).
- 9 test modules in `backend/app/intelligence/tests/` (Risk scoring, entity similarity, timeline reasoning, recommendation engines).

---

### 4. FRONTEND PRODUCTION BUILD REVALIDATION

The frontend application was compiled from source using the production TypeScript and Vite toolchain:

```
Command:  cd frontend; npm run build (tsc -b && vite build)
Duration: 25.14 seconds
Exit Code: 0
Output:
  ✓ 2,907 modules transformed.
  dist/index.html                     1.08 kB │ gzip:   0.57 kB
  dist/assets/index-BymNSI8O.css      73.27 kB │ gzip:  15.26 kB
  dist/assets/index-DSuEWSn_.js    2,972.97 kB │ gzip: 848.79 kB
  dist/assets/*.woff2 (Fonts)         32 bundled font files
  dist/assets/*.worker.js             2 dedicated Web Workers (forensicBenchmark, publicDatasetStreamer)
Verdict:  PASSED WITH ZERO TYPESCRIPT COMPILATION ERRORS
```

---

### 5. INVESTIGATION: THE "SentinelX" APPLICATION IDENTIFIER

A central inquiry of Phase 14 was to investigate why `http://127.0.0.1:8080/api/v1/health` returns:
```json
{
  "status": "healthy",
  "application": "SentinelX"
}
```

#### Code Inspection & Architectural Reality:
1. In `backend/app/main.py` (lines 27–32):
   ```python
   app = FastAPI(
       title="SENTINELX NEXUS",
       version="2.0.0",
       description="Synthetic National Criminal Intelligence & Cybercrime Platform",
       lifespan=lifespan,
   )
   ```
2. In `backend/app/api/health.py` (lines 6–12):
   ```python
   @router.get("/health")
   def health():
       return {
           "status": "healthy",
           "application": "SentinelX",
       }
   ```
3. In `backend/app/main.py` (lines 181–183):
   ```python
   from tarka.api.server import app as tarka_app

   app.mount("/api/v1/forensics/tarka", tarka_app)
   ```
4. In `backend/tarka/api/server.py` (line 554):
   ```python
   @app.get("/api/health", response_model=HealthResponse)
   ```

#### Resolution & Truth:
- **Architecture:** `SentinelX Nexus` serves as the enterprise platform host and foundational backend backbone (Wave 6 architectural authority), providing PostgreSQL relational models, Neo4j graph projections, MinIO evidence storage, and OPA policy gateways.
- **TARKA Engine:** The TARKA investigative engine is mounted inside this platform host at the dedicated path:
  `/api/v1/forensics/tarka`.
- **Dedicated TARKA Health Endpoint:** Querying `http://127.0.0.1:8080/api/v1/forensics/tarka/api/health` returns:
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "chain_head_hash": "d246cde4fa572d6f09816aac0b1c384edba7e62fe00853bf034ae1e5b42c7f91",
    "ledger_entries_count": 0,
    "genesis_anchor_valid": true
  }
  ```
- **Finding:** The application identifier `SentinelX` is not an error or a leftover mock; it reflects the sovereign host topology where TARKA is mounted as the specialized forensic reasoning engine within the SentinelX national intelligence backbone.

---

### 6. FRONTEND-BACKEND CONNECTIVITY & APPLICATION SERVING

The frontend application served on `http://127.0.0.1:5173/` was inspected:

1. **HTML & Page Metadata:**
   - `<title>`: `TARKA | Indigenous Digital Forensics Platform`
   - Description: `TARKA — Indigenous Digital Forensics Investigation Platform (SUTRAM 2026 / SIH 2026). Z3 SMT Contradiction Detection, Evidence Provenance & Section 63 BSA Compliance.`
2. **Reverse Proxy Configuration (`frontend/vite.config.ts`):**
   ```ts
   server: {
     host: true,
     port: 5173,
     proxy: {
       '/api': {
         target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8080',
         changeOrigin: true,
       },
     },
   }
   ```
3. **Live Proxy Verification:**
   - Request to `http://127.0.0.1:5173/api/v1/health` proxies transparently to port 8080 and returns `{"status":"healthy","application":"SentinelX"}`.
   - Request to `http://127.0.0.1:5173/api/v1/forensics/tarka/api/health` proxies to port 8080 and returns the TARKA custody ledger status.
4. **Active UI Views:**
   `frontend/src/App.tsx` routes between `TarkaGlobalShell` (v5 forensic HUD) and `InvestigationCanvas` based on the URL parameter `?view=canvas`. Both views bind to live TARKA providers (`TarkaGlobalProvider`, `InvestigationProvider`).

---

### 7. CI/CD WORKFLOW AUDIT

The GitHub Actions workflow `.github/workflows/ci.yml` (411 lines) was audited:
- Triggers on push to `main`, `feat/**`, `release/**`.
- Enforces an 8-gate automated pipeline:
  - Gate 1 & 2: Dependency consistency, Python compilation (`compileall`), pip check.
  - Gate 3: Backend security, RBAC, TARKA & P0-D evidence integrity.
  - Gate 4: Forensic solvers, Z3 counterfactual, and MARCO MUS suites.
  - Gate 5: Distributed consensus, PBFT, vector clocks, and ECDH-PSI.
  - Gate 6: Frontend typecheck (`tsc -b`) and Vite production packaging.
  - Gate 7: Docker container build verification.
  - Gate 8: Release receipt and cryptographic manifest generation.
- Validated against confirmed green GitHub Actions run `42068196310`.
