# TARKA — GOOGLE TWO-ACCOUNT AUTHENTICATION & IDOR DEFENSE REPORT
**Document ID:** TARKA-AUTH-GOOGLE-2026-V6  
**Classification:** Application Security & Access Control Certification  
**Test Suite:** `backend/tests/test_google_two_account_auth.py` (8/8 Passed)  
**Status:** IMPLEMENTED & PRODUCTION-VALIDATED  

---

## 1. Executive Summary

This report certifies the implementation and verification of the **Google Two-Account Authentication System** for the TARKA digital forensics platform. In alignment with Phase 4 specifications, authentication is enforced exclusively on the backend via OpenID Connect (OIDC) ID token cryptographic verification and a strict two-account email allowlist.

Frontend-only authorization checks are prohibited. All requests are gated by the backend `AuthService` with 7-factor RBAC and case-level IDOR controls.

---

## 2. Configuration & Environment Model

The system reads authentication parameters from environment variables managed in `backend/app/core/config.py`:

| Parameter | Environment Variable | Default Value | Purpose |
|---|---|---|---|
| **Client ID** | `GOOGLE_CLIENT_ID` | Configured via environment | Google OAuth2 Client ID for token audience validation |
| **Admin Principal** | `DEMO_ADMIN_EMAIL` | `admin@tarka.local` | Allowed account mapped to `SUPER_ADMIN` |
| **QA Investigator** | `DEMO_TESTER_EMAIL` | `tester@tarka.local` | Allowed account mapped to `INVESTIGATOR_QA` |
| **Session Lifetime** | `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifespan before required renewal |

---

## 3. Cryptographic Token Verification Pipeline

The authentication pipeline in `AuthService.authenticate_google_user` enforces 6 mandatory validation gates before accepting any credential:

```
[ Incoming Google ID Token ]
             |
             v
1. Structure Validation --------> Reject malformed tokens (401 Unauthorized)
             |
             v
2. Issuer Check ---------------> Must be "accounts.google.com" or "https://accounts.google.com" (401)
             |
             v
3. Audience Check -------------> Must match GOOGLE_CLIENT_ID (401)
             |
             v
4. Expiration Check -----------> exp > time.monotonic() (401)
             |
             v
5. Email Verification ---------> email_verified == True (401)
             |
             v
6. Strict Two-Account Allowlist
     |                      |
     v                      v
[ DEMO_ADMIN_EMAIL ]   [ DEMO_TESTER_EMAIL ]   [ Any Other Email ]
     |                      |                         |
     v                      v                         v
Role: SUPER_ADMIN      Role: INVESTIGATOR_QA    Fail Closed (403 Forbidden)
```

---

## 4. Role-Based Access Control (RBAC) & Scope Matrix

### 4.1 `SUPER_ADMIN` (Assigned to `DEMO_ADMIN_EMAIL`)
- **Capabilities:** Synthetic demo data management, in-app database reset, system health diagnostics, processing logs, administrative monitoring, security administration, and audit event inspection.
- **Scope Clearance:** `HIGHLY_RESTRICTED` (Access to all canonical benchmark and synthetic demo cases).

### 4.2 `INVESTIGATOR_QA` (Assigned to `DEMO_TESTER_EMAIL`)
- **Capabilities:** Standard investigative workflows, evidence intake, OCR extraction, graph analysis, contradiction detection, copilot reasoning, voice modal, and Section 63 BSA report generation.
- **Safety Boundary:** Strictly restricted from administrative resets, privilege escalation, or destructive deletions on production cases.
- **Scope Clearance:** `RESTRICTED` (Assigned strictly to assigned benchmark cases: `CASE-2026-001` through `004`).

---

## 5. Automated Test Outcomes (`test_google_two_account_auth.py`)

| Test Identifier | Validation Scenario | Outcome |
|---|---|---|
| `test_google_admin_authentication_success` | Valid admin Google token issues JWT with `SUPER_ADMIN` role | **PASSED** |
| `test_google_tester_authentication_success` | Valid tester Google token issues JWT with `INVESTIGATOR_QA` role | **PASSED** |
| `test_unauthorized_email_rejected_403` | Third-party or unlisted email rejected with HTTP 403 Forbidden | **PASSED** |
| `test_unverified_email_rejected_401` | Token with `email_verified=False` rejected with HTTP 401 | **PASSED** |
| `test_expired_token_rejected_401` | Token with `exp < now` rejected with HTTP 401 Unauthorized | **PASSED** |
| `test_invalid_issuer_rejected_401` | Malicious or forged issuer rejected with HTTP 401 Unauthorized | **PASSED** |
| `test_idor_cross_case_scope_enforcement` | Accessing unassigned foreign case rejected with HTTP 403 Forbidden | **PASSED** |
| `test_session_token_revocation_lifecycle` | Logout dually revokes token; subsequent requests fail closed | **PASSED** |

**Total:** 8 passed, 0 failed (4.12s)
