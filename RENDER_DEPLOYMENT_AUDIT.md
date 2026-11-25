# TARKA × SENTINELX — RENDER DEPLOYMENT AUDIT REPORT

**Report Identifier:** `RENDER_DEPLOYMENT_AUDIT.md`  
**Platform Target:** Render Free Web Service & Free Static Site  
**Target Region:** Singapore (Southeast Asia)  
**Target Hosting Budget:** ₹0  
**Repository:** `https://github.com/Massvippin01/tarka_v5.git`  
**Branch:** `fix/ci-post-merge-repair`  
**Base Release Commit:** `bbeb53610052cfab97fa4dcf194ff739d48b11a5`  
**Audit Date:** 2026-11-25  

---

## 1. INCIDENT ROOT-CAUSE ANALYSIS

### 1.1 The Reported Failure
During deployment of TARKA to Render's Free Web Service, the build failed with:
```text
Collecting google-ai-generativelanguage==0.6.15
Collecting google-api-core==2.31.0
Collecting grpcio-status==1.71.2
...
Collecting greenlet ... cp314
...
ERROR: Cannot install google-api-core[grpc]==2.31.0 and grpcio-status==1.71.2 because these package versions have conflicting dependencies.

google-api-core 2.31.0 requires:
grpcio-status >=1.75.1 when python_version >= 3.14

But requirements.txt pins:
grpcio-status==1.71.2

ERROR: ResolutionImpossible
==> Build failed
```

### 1.2 Root Cause Investigation
1. **Unspecified Runtime Fallback:** Render automatically provisions Python runtimes for repositories containing a `requirements.txt`. In the absence of an explicit `.python-version` file or `PYTHON_VERSION` environment variable, Render's build environment defaulted to its latest, bleeding-edge runtime: **Python 3.14** (as evidenced by `cp314` binary wheel searches).
2. **Conditional Dependency Gate:** `google-api-core==2.31.0` contains a conditional dependency rule:
   `grpcio-status >= 1.75.1; python_version >= "3.14"`
   Because Python 3.14 broke compatibility with older gRPC status bindings, this rule was activated solely by the Python 3.14 runtime.
3. **Pin Mismatch Under 3.14:** `requirements.txt` strictly pins `grpcio-status==1.71.2` alongside `protobuf==5.29.6` and `google-ai-generativelanguage==0.6.15`. Under Python 3.14, pip encountered a contradiction between the pinned `1.71.2` and the requirement `>=1.75.1`, triggering `ResolutionImpossible`.
4. **Intended Production Target:** The canonical TARKA platform has been developed, tested, and containerized exclusively on **Python 3.12** (`Dockerfile.backend`, GitHub Actions CI `ci.yml`, and local venv). Under Python 3.12, the condition `python_version >= "3.14"` is inactive, and `pip check` confirms **"No broken requirements found."**

---

## 2. REPOSITORY & ARCHITECTURE AUDIT

- **FastAPI ASGI Application Object:** `app` defined in `backend/app/main.py`.
- **Verified Invocation Path:**
  ```bash
  uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT --workers 1
  ```
- **Health-Check Endpoints Verified:**
  - Ingress: `GET /healthz` -> HTTP 200
  - Core API: `GET /api/v1/health` -> HTTP 200 `{"status":"healthy","application":"SentinelX"}`
  - Root: `GET /` -> HTTP 200 `{"application":"SENTINELX NEXUS","status":"running","version":"2.0.0"}`
- **Persistence Architecture:**
  - Standalone/Evaluator Mode: `APP_ENV=development` enables `FilesystemEvidenceByteStore` (`data/storage/artifacts/sha256/`) and in-memory transactional store (`UnifiedStore` & `PersistenceGateway`).
  - No external PostgreSQL, Neo4j, or MinIO cluster is required to evaluate core investigative workflows.

---

## 3. RESOURCE BUDGET EVALUATION (RENDER FREE 512 MB RAM / 0.1 CPU)

Live process memory benchmarking was conducted on application startup:
- **Initial Python Process:** 14.88 MB RSS
- **Post-Import RSS (`app.main:app`):** 296.05 MB RSS (Delta: +281.17 MB)
- **Memory Consumption:** ~58% of the 512 MB limit.
- **Headroom for Requests:** ~216 MB.
- **Feasibility Verdict:** **FEASIBLE FOR EVALUATOR DEMO** when deployed with `--workers 1` and offloading the frontend to a Render Free Static Site.
