# M3 SECURITY ASSESSMENT & THREAT SURFACE AUDIT
## Comprehensive Application Security Review, Access Control, and Ingress Hardening

**Milestone:** M3 (Adversarial Validation, Security, and Forensic Reliability)  
**Track:** SUTRAM 2026 — Problem Statement PS04  
**Date:** November 5, 2026  
**Governing Doctrine:** AI Proposes. Evidence Verifies. Human Decides.

---

# 1. SECURITY SCOPE & THREAT MODEL

TARKA operates as an evidence-centric financial cybercrime investigation workbench. The platform handles sensitive bank account extracts, telecommunication records (CDR/IPDR), suspect identity registries, and statutory court directives.

This security assessment audits eleven defensive layers against OWASP Top 10 API Security Risks and institutional data protection requirements (RBI Cyber Security Framework, DPDP Act 2023).

---

# 2. APPLICATION SECURITY CONTROLS & FINDINGS

### 2.1 Authentication & Session Integrity
- **Mechanism:** JWT-based stateless tokens with cryptographic verification and role-based claims.
- **Session Expiry:** Access tokens bounded to short lifespans (15 minutes); refresh tokens strictly tied to device fingerprints.
- **Finding:** All API endpoints under `/api/v1/investigation/*` and `/api/v1/evidence/*` require valid bearer tokens. Unauthenticated requests fail closed with HTTP 401 Unauthorized.

### 2.2 Institutional Tenant Isolation & RBAC
- **Multi-Tenant Boundaries:** Each bank adapter runs in an isolated tenant namespace (`HDFC_BANK`, `ICICI_CORE`, `SBI_SWITCH`).
- **Statutory Access Control:** Cross-institutional access requires an active, validated statutory `case_id` governed by Section 91 CrPC / Section 94 BNSS mandates.
- **Finding:** Verified in `test_14_institution_tenant_isolation`. Commercial banking peers cannot query or enumerate competitors' private transaction indices.

### 2.3 Injection Risks & Formal Input Validation
- **Pydantic v2 Schema Enforcement:** All API ingress payloads pass through strictly typed Pydantic models (`backend/tarka/contracts/canonical_v1.py`).
- **SQL / Graph Injection:** Database queries use parameterized SQLAlchemy and Neo4j Cypher statements with zero string interpolation of user inputs.
- **Finding:** Ingress validation rejects malformed types, overlong strings, and illegal characters before reaching domain logic (`test_validation_boundary_rejects_malformed_input`).

### 2.4 File Upload & Path Traversal Defenses
- **Storage Virtualization:** Ingested files are assigned deterministic UUIDs and stored inside an immutable cryptographic vault (`vault://`).
- **Path Sanitization:** File paths are verified to ensure no `../` traversal sequences or escape outside the storage root directory.
- **Finding:** Upload endpoints reject un-sanitized relative paths and enforce MIME type / magic byte verification.

### 2.5 Cryptographic Secret Handling
- **Zero Secrets in Repository:** Complete repository audit confirms that no live API keys, private passwords, or production database credentials exist in source code or Git history.
- **Environment Templates:** Only `.env.example`, `.env.development.example`, and `.env.production.example` exist.
- **In-Memory Keys:** Ephemeral EC private scalars used in ECDH-PSI are held strictly in memory and wiped upon session closure.

### 2.6 Audit Trails & Non-Repudiation
- **Immutable Log Append:** Every query, evidence modification, and investigator annotation generates a hash-chained audit record in the distributed event fabric.
- **Finding:** Verified under Indian Evidence Act / BSA 2023 requirements; audit logs cannot be retroactively edited without breaking the parent hash chain.
