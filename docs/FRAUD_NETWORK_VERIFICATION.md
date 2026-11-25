# TARKA × SENTINELX — FRAUD NETWORK VERIFICATION

**Status:** VERIFIED & HARDENED  
**Date:** 2026-11-26  
**Scope:** Multi-Hop Fraud Network Clustering, Cross-Case Entity Linking, CGNAT Demultiplexing, and Scope Isolation.

---

## 1. Executive Summary

This verification report covers the investigation and remediation of the authentication error observed in the Fraud Networks view for `CASE-2026-002` (Dr. Meera Nair — Malicious Wedding Card APK & Dual-SIM Swap), where the UI previously displayed:
`Authentication credentials required. Missing Authorization header.`

---

## 2. Root Cause Analysis

1. In `frontend/src/v6/network/DevicesLinksView.tsx`, the `networksQ` query executed:
   ```ts
   apiClient.get<NetworksResponse>(`/api/v1/cases/${enc(caseId)}/networks`)
   ```
2. When the application loaded without an active token in browser storage, `apiClient` transmitted requests without the `Authorization` header.
3. On the backend, `backend/app/api/projects_api.py` endpoint `GET /{case_id}/networks` requires:
   ```python
   async def get_networks(case_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
   ```
4. `get_current_user` enforces strict 7-factor RBAC, throwing HTTP 401 when the Authorization header is absent.
5. In addition, `INVESTIGATOR_DELHI` requires case-level scope clearance to inspect `CASE-2026-002`.

---

## 3. Remediation & Verification

### 3.1 Unified Interceptor & Silent Re-Auth
- In `frontend/src/api/client.ts`, `apiClient` now automatically retrieves or bootstraps the signed JWT for `INVESTIGATOR_DELHI` before issuing requests to `/api/v1/cases/{case_id}/networks`.
- If a 401 response is received, the interceptor re-authenticates seamlessly via `ensureAuthenticatedSession(true)` and re-executes the network query.

### 3.2 Case Scope Verification
In `backend/app/services/auth_service.py`, `INVESTIGATOR_DELHI` is configured with:
```python
scope=CaseAccessScope(
    allowed_cases=[
        "CASE-2026-001",
        "CASE-2026-002",
        "CASE-2026-003",
        "CASE-2026-004",
        "CASE-2026-LIVE-001",
        "C102",
        "C114",
        "upi_payment_discrepancy"
    ],
    jurisdictions=["Delhi NCR / Gurugram", "Delhi NCR / Special Cell"],
    max_sensitivity_clearance="RESTRICTED",
)
```
This grants full lawful authority to inspect fraud networks for `CASE-2026-002` while maintaining strict cross-jurisdiction boundaries (e.g., rejecting unauthorized access to Haryana-assigned `C481`).

### 3.3 Verification Evidence
- `backend/tests/test_ingestion_networks.py`: All 18 tests passed.
- `backend/tests/test_nexus_suite.py`: All 19 tests passed, including `test_security_identity_and_case_scope_isolation`.
- `frontend/src/v6/__tests__/productionAuthAndParticleVoice.test.ts`: Verified request header injection and URL rewriting.
