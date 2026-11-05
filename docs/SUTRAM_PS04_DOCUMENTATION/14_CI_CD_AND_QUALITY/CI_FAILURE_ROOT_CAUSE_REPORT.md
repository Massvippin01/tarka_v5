# TARKA SUTRAM 2026 PS04 — CI/CD FAILURE ROOT CAUSE & REMEDIATION REPORT

**Document ID:** TARKA-CI-RCA-2026-001  
**Target Repository:** `Massvippin01/tarka_v5`  
**Failed GitHub Actions Workflow Run:** `42046300142`  
**Branch:** `feat/sutram-2026-ps04-member-b`  
**Audit Date:** 2026-11-05  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Principle:** NEVER WEAKEN SECURITY ASSERTIONS TO PASS TESTS.

---

## 1. WORKFLOW RUN SUMMARY (`42046300142`)

| Gate | Job Name | Status | Duration | Failure Reason |
|:---|:---|:---|:---|:---|
| **Gate 1** | Repository Structure & Manifest Integrity | **SUCCESS** | 24s | Passed all structure and checksum checks |
| **Gate 2** | Frontend TypeScript Verification & Production Build | **SUCCESS** | 1m 08s | Vite production bundle built with 0 errors |
| **Gate 3** | Security, RBAC, TARKA & Evidence Integrity | **FAILURE** | 1m 42s | Assertion failure in `test_p0_d_evidence_integrity.py:542` |
| **Gate 4** | Python Code Quality & Type Safety | **SUCCESS** | 45s | Ruff and Mypy passed |
| **Gate 5 & 6**| Docker Build & Container Smoke Test | **SKIPPED** | — | Dependent on Gate 3 (`backend-security-and-integrity`) |
| **Gate 7** | Live S3/MinIO CAS Integration (Disposable Service) | **FAILURE** | 32s | Docker image pull access denied for `minio/minio` |

---

## 2. GATE 3 ROOT CAUSE ANALYSIS & REMEDIATION

### 2.1 Error Trace from GitHub Actions
```text
_________________ test_p0d_cross_case_unauthorized_access_rejected_with_403 _________________

gurugram_client = <starlette.testclient.TestClient object at 0x7f48d91b4520>

    def test_p0d_cross_case_unauthorized_access_rejected_with_403(gurugram_client):
        """Verify INVESTIGATOR_GURUGRAM is denied case access to Delhi case upi_payment_discrepancy."""
        # Read attempt
        res_read = gurugram_client.get("/api/v1/forensics/cases/upi_payment_discrepancy")
>       assert res_read.status_code == 403
E       assert 200 == 403
E        +  where 200 = <Response [200 OK]>.status_code

backend/tests/test_p0_d_evidence_integrity.py:542: AssertionError
```

### 2.2 Root Cause
In `backend/app/services/auth_service.py` (lines 63–74), the preconfigured synthetic user directory defined `INVESTIGATOR_GURUGRAM` with:
```python
"INVESTIGATOR_GURUGRAM": UserIdentity(
    user_id="usr-gurugram-01",
    display_name="Insp. Rajesh Sharma (Gurugram Crime)",
    badge_number="POL-GUR-481",
    role=UserRoleEnum.INVESTIGATOR,
    organization="Haryana Police Crime Branch",
    unit="Cyber Crime Police Station Gurugram",
    scope=CaseAccessScope(
        allowed_cases=["C481", "C512", "CASE-2026-001", "upi_payment_discrepancy"],  # <-- DEFECT
        jurisdictions=["Gurugram / Haryana"],
        max_sensitivity_clearance="RESTRICTED",
    ),
    ...
)
```
The Delhi case `"upi_payment_discrepancy"` had been inadvertently included in the allowed cases list of the Haryana/Gurugram investigator. When the endpoint `/api/v1/forensics/cases/{case_id}` called `auth_service.enforce_case_access(user, case_id)`, `validate_case_scope` evaluated `"upi_payment_discrepancy" in user.scope.allowed_cases` as `True`, resulting in HTTP 200 OK instead of HTTP 403 Forbidden.

### 2.3 Remediation
Removed `"upi_payment_discrepancy"` from `INVESTIGATOR_GURUGRAM`'s `allowed_cases` in `backend/app/services/auth_service.py`:
```python
scope=CaseAccessScope(
    allowed_cases=["C481", "C512", "CASE-2026-001"],
    jurisdictions=["Gurugram / Haryana"],
    max_sensitivity_clearance="RESTRICTED",
)
```
**Verification Evidence:** Local execution of `pytest tests/test_p0_d_evidence_integrity.py -k "test_p0d_cross_case_unauthorized_access_rejected_with_403" -v` returned:
`tests\test_p0_d_evidence_integrity.py::test_p0d_cross_case_unauthorized_access_rejected_with_403 PASSED [100%]`

---

## 3. GATE 7 ROOT CAUSE ANALYSIS & REMEDIATION

### 3.1 Error Trace from GitHub Actions
```text
Error response from daemon: pull access denied for minio/minio, repository does not exist or may require 'docker login': denied: requested access to the resource is denied
```

### 3.2 Root Cause
In `.github/workflows/ci.yml`, the service container was configured as:
```yaml
minio:
  image: minio/minio:RELEASE.2024-06-13T22-53-53Z
```
MinIO phased out public anonymous distribution of community images from Docker Hub, resulting in access denial for legacy tags on GitHub Actions hosted runners.

### 3.3 Remediation
Aligned the CI service container with the repository's canonical production and development container topology (`docker-compose.yml` and `docker-compose.dev.yml`), which uses `rustfs/rustfs:1.0.0` (high-performance, Apache 2.0 S3-compatible CAS):
```yaml
      minio:
        image: rustfs/rustfs:1.0.0
        ports:
          - 9000:9000
          - 9001:9001
        env:
          RUSTFS_ACCESS_KEY: sentinelx_ci_minio
          RUSTFS_SECRET_KEY: ${{ secrets.CI_MINIO_SECRET || 'sentinelx_ci_disposable_secret_32char' }}
          MINIO_ROOT_USER: sentinelx_ci_minio
          MINIO_ROOT_PASSWORD: ${{ secrets.CI_MINIO_SECRET || 'sentinelx_ci_disposable_secret_32char' }}
        options: >-
          --health-cmd "curl -f http://localhost:9000/minio/health/live || exit 1"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
        command: server /data --console-address ":9001"
```

---

## 4. GATES 5 & 6 UNBLOCKING

Gates 5 & 6 (`docker-build-and-smoke`) were skipped solely because `needs: [backend-security-and-integrity, frontend-typescript-build]`. With Gate 3 now remediated and passing, Gates 5 & 6 will automatically execute upon push.

---

## 5. LOCAL VERIFICATION EVIDENCE

The full non-S3 evidence integrity test suite was executed locally:
```bash
pytest backend/tests/test_p0_d_evidence_integrity.py -k "not live_s3" -v
```
**Result:** `17 passed, 5 deselected, 3 warnings in 57.37s` (100% pass rate).
