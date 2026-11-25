# TARKA × SENTINELX — PHASE 18.1
## CI/CD VERIFICATION & REPRODUCIBLE BUILDS REPORT

**Report Identifier:** `PHASE18_1_CI_CD_VERIFICATION_REPORT.md`  
**Phase:** Phase 7 — CI/CD Verification & Build Hardening  
**Date:** 2026-11-25  
**CI/CD Pipeline Status:** HARDENED — VERIFIED DETERMINISTIC  

---

## 1. PIPELINE OVERVIEW & GATES

The GitHub Actions CI/CD pipeline defined in `.github/workflows/ci.yml` enforces automated quality, security, and reproducibility gates across both push and pull-request triggers on `main`, `feat/**`, `release/**`, and `fix/**` (including `fix/ci-post-merge-repair`).

```mermaid
flowchart TD
    G1["Gate 1 & 2: Manifest & Static Compilation"] --> G3["Gate 3: Security, RBAC & Forensics Tests"]
    G1 --> G4["Gate 4: Frontend Build & Vitest Unit Tests"]
    G1 --> G7["Gate 7: Live Disposable MinIO CAS Integration"]
    G3 --> G5["Gate 5 & 6: Docker Image Build & Smoke Verification"]
    G4 --> G5
    G5 --> G8["Gate 8: Diagnostics & Artifact Archival"]
```

---

## 2. AUDITED & HARDENED GATES

### Gate 1 & 2: Manifest Consistency & Bytecode Compilation
- **Environment:** Ubuntu 24.04, Python 3.12 (cached pip).
- **Actions:**
  - Upgrades pip, installs `requirements.txt`, and executes `pip check` to ensure zero conflicting packages or broken dependency trees.
  - Executes `python -m compileall -q backend/app backend/tarka` to catch syntax errors or malformed AST nodes prior to test execution.

### Gate 3: Security, RBAC, Ingestion & Evidence Integrity
- **Environment:** Ubuntu 24.04, Python 3.12.
- **Actions:**
  - Security & RBAC: Executes `test_wave6_phase8_jwt_rbac.py` and `test_p0_security_remediation.py`.
  - Evidence Storage & CAS: Executes `test_wave6_phase4_evidence_storage.py` and `test_p0_d_evidence_integrity.py` (`-k "not live_s3"`).
  - End-to-End Forensics: Executes `test_tarka_sentinelx_integration.py`, `test_tarka_e2e_investigation_workflow.py`, `test_ingestion_networks.py`, and `test_founder_validation_lab.py`.
  - Generates JUnit XML test reports and archives them securely with 14-day retention.

### Gate 4: Frontend TypeScript & Vitest Production Build
- **Environment:** Ubuntu 24.04, Node.js 20 (cached npm).
- **Actions:**
  - Runs deterministic `npm ci`.
  - Executes `npm run build` (`tsc -b && vite build`) producing optimized bundles.
  - Executes `npm test` running 143 Vitest unit tests across 25 test files.
  - Asserts bundle integrity: verifies existence of `dist/index.html` and `dist/assets`.

### Gate 7: Live Isolated S3/MinIO CAS Integration (Disposable Container)
- **Environment:** Ubuntu 24.04, Docker Engine.
- **Actions:**
  - Launches ephemeral RustFS/MinIO container (`rustfs/rustfs:1.0.0`) on bridge port 9000.
  - Waits for `/minio/health/live` probe to return healthy.
  - Automatically initializes test bucket `sentinelx-evidence-vault`.
  - Executes live S3 integration tests (`test_p0_d_evidence_integrity.py -k "live_s3"`).
  - Gracefully stops, removes the container, and purges credentials upon completion.

### Gate 5 & 6: Docker Multi-Stage Image Builds & Non-Root Smoke Tests
- **Environment:** Ubuntu 24.04, Docker Buildx with GitHub Actions cache.
- **Actions:**
  - Builds `Dockerfile.backend` (non-root UID 10001) and `Dockerfile.frontend` (NGINX unprivileged).
  - Boots backend container on isolated bridge network `sentinelx-smoke-net`.
  - Probes system health endpoint `/api/v1/health` and forensics health `/api/v1/forensics/health`.
  - Cryptographically verifies that the running container user is strictly unprivileged UID `10001` (`[ "$CONTAINER_UID" != "10001" ] && exit 1`).
  - Boots frontend container and validates reverse proxy forwarding through port `8080` to `/api/v1/health`.
  - Captures diagnostics and performs clean network teardown.

---

## 3. REMEDIATIONS INTRODUCED IN THIS PHASE
1. **Branch Coverage:** Added `"fix/**"` pattern to workflow triggers ensuring `fix/ci-post-merge-repair` runs the complete CI validation suite upon push.
2. **Frontend Test Enforcement:** Added `npm test` step (`vitest run`) into Gate 4 to prevent broken UI logic from slipping into production builds.
3. **Forensic Suite Expansion:** Included `test_tarka_e2e_investigation_workflow.py`, `test_ingestion_networks.py`, and `test_founder_validation_lab.py` into Gate 3 test execution.

---

## 4. CONCLUSION
The CI/CD pipeline is fully hardened, covers all critical branches, executes reproducible builds, validates container non-root security, and archives diagnostic logs on every run.
