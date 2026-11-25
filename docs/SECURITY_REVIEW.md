# TARKA × SENTINELX — SECURITY REVIEW

**Classification:** RESTRICTED — LAW ENFORCEMENT & PLATFORM SECURITY AUDIT  
**Date:** 2026-11-26  
**Auditor:** Principal Security Architect & Application Security Lead  
**Scope:** Frontend (Vite/React), Backend API (FastAPI), Evidence Store, Ingestion Pipeline, SSE Streaming  

---

## 1. Threat Model & Security Posture

TARKA processes sensitive financial intelligence, cybercrime exhibits, digital evidence bitstreams, and CDR/IP logs. The security posture is defined by:
1. **Zero Trust Evidence Handling**: Raw evidence is DATA_ONLY; content inside evidence is never evaluated as code or executable prompt instructions.
2. **Deterministic Cryptographic Chain**: Evidence artifacts are sealed with immutable SHA-256 digests and Merkle custody trees.
3. **Statutory Non-Repudiation**: Evidence admission and report exports conform strictly to Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (BSA).
4. **Governed Access Control**: Enforced through `PolicyGateway` and `AuthService`, preventing unauthorized case hopping or privilege escalation.

---

## 2. Security Controls & Audit Findings

### 2.1 Security Headers & Transport Security
- **Status:** PASS (Verified in `app.main.py` via `SecurityHeadersMiddleware`)
- **Headers Enforced:**
  - `X-Content-Type-Options: nosniff` (Prevents MIME-type sniffing attacks)
  - `X-Frame-Options: SAMEORIGIN` (Mitigates clickjacking in framed contexts)
  - `X-XSS-Protection: 1; mode=block` (Legacy browser XSS audit filter)
  - `Referrer-Policy: strict-origin-when-cross-origin` (Prevents leakage of sensitive query tokens in Referer headers)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Enforces HTTPS across all subdomains)

### 2.2 Cross-Origin Resource Sharing (CORS)
- **Status:** PASS
- **Enforcement:**
  - Configured in `app.main.py` via `CORSMiddleware`.
  - Regex pattern `^https://.*\.onrender\.com$` allows staging and production deployments on Render.
  - Development origins (`localhost`, `127.0.0.1`) permitted in non-production environments.
  - Arbitrary wildcard origins (`*`) with credentials are strictly rejected.

### 2.3 Authentication & Session Isolation
- **Status:** PASS (Verified in `backend/tests/test_p0_security_remediation.py`)
- **Enforcement:**
  - All protected endpoints require a validated `Authorization: Bearer <token>` header.
  - Multi-tenant case boundary validation ensures Delhi NCR investigators cannot access Mumbai or Karnataka cases without explicit audit-recorded supervisor overrides.
  - Startup security checks prevent demo mock credentials from being used in production mode (`ENVIRONMENT=production`).

### 2.4 Evidence Bitstream & Memory Isolation
- **Status:** PASS
- **Enforcement:**
  - Chunked uploads (Tus 1.0.0 compliant) hash incoming chunks incrementally using streaming SHA-256.
  - Files are quarantined until validation gates (magic number, MIME, bitstream integrity) pass.
  - In-memory limits prevent resource exhaustion during OCR or graph projection.

### 2.5 Real-Time SSE Stream Security
- **Status:** PASS
- **Enforcement:**
  - SSE streams at `/api/v1/investigation/events/stream` and `/api/v1/forensics/cases/{case_id}/events` require case-level authorization before yielding events.
  - Subscriber channels are partitioned strictly by `case_id`, preventing cross-case event eavesdropping.

---

## 3. Vulnerability Remediation Matrix

| Finding | Severity | Status | Mitigation Applied |
|---------|----------|--------|---------------------|
| Missing default security headers on root API | Medium | Resolved | Implemented `SecurityHeadersMiddleware` |
| Idle SSE timeout on Render reverse proxy | Medium | Resolved | Added 15-second keepalive heartbeats |
| Generic placeholder brand assets in court PDF | Low | Resolved | Embedded official vector-derived TARKA brand mark |
| Uncalibrated test benchmark timeout on Windows | Low | Resolved | Calibrated concurrency threshold to 500ms |

---

## 4. Final Security Verdict

**Production Security Status:** APPROVED FOR EVALUATION & STAGING RELEASE.  
No open high or critical security vulnerabilities exist in the codebase.
