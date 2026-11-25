# TARKA × SENTINELX — PHASE 19
## SECURITY & PRODUCTION RELEASE AUDIT

**Report Identifier:** `PHASE19_SECURITY_RELEASE_AUDIT.md`  
**Phase:** Stage 5 — Security and Production Configuration  
**Date:** 2026-11-25  
**Audit Class:** Institutional Pre-Deployment Security Review  
**Security Status:** HARDENED — FAIL-CLOSED POLICIES ACTIVE  

---

## 1. ZERO-TRUST PERIMETER AUDIT

TARKA × SENTINELX implements multi-layered security controls designed to protect sensitive digital intelligence, prevent credential leakage, and maintain jurisdictional case boundaries.

### 1.1 Ingress & Port Exposure Analysis
- **Public Surface:** Strictly limited to the frontend reverse proxy on ports `80` (HTTP) and `443` (HTTPS).
- **Private Data Plane:** All backend infrastructure services communicate exclusively across `sentinelx-prod-net`:
  - PostgreSQL (5432) — Unexposed
  - Neo4j Bolt (7687) — Unexposed
  - OpenSearch (9200) — Unexposed
  - MinIO S3 API (9000/9001) — Unexposed publicly (internal Docker network only)
  - OPA Policy API (8181) — Unexposed
  - Redis Cache (6379) — Unexposed
- **Firewall Rules (UFW / Cloud Security Groups):**
  - Inbound: Allow `80/tcp`, `443/tcp`, `22/tcp` (restricted to trusted admin CIDRs).
  - Outbound: Allow HTTPS (`443/tcp`) for package repositories, certificate authority updates, and approved voice API gateways.

---

## 2. AUTHENTICATION, RBAC & CASE ISOLATION

### 2.1 7-Factor Authorization Verification
1. **User Identity & Badge Validation:** Authenticated officers are bound to badge numbers and organizational units.
2. **Hierarchical Roles:** 8 distinct roles (`INVESTIGATOR`, `SUPERVISOR`, `ANALYST`, etc.).
3. **Explicit Case Scoping (`allowed_cases`):** An officer assigned to Delhi Special Cell cannot access cases belonging to Haryana or Maharashtra crime branches.
4. **Jurisdictional Clearance:** Cross-jurisdiction requests fail closed with HTTP `403 Forbidden`.
5. **Sensitivity Classification:** 4 clearance tiers (`PUBLIC_DEMO`, `INTERNAL`, `RESTRICTED`, `HIGHLY_RESTRICTED`).
6. **Action Bitmap:** Granular permissions (`READ_CASE`, `READ_EVIDENCE`, `MODIFY_EVIDENCE`, etc.).
7. **HMAC-SHA256 JWT Lifecycle:** Short-lived tokens (15–30 min expiration) with instant JTI revocation support via Redis.

### 2.2 Public Demonstration Guardrails
- **Dedicated Demo Role:** Public or evaluation users are assigned `PUBLIC_DEMO` clearance with read-only permissions on synthetic scenarios (`CASE-2026-001`, `CASE-2026-002`).
- **Data Protection Invariant:** Real-world banking, telecom, or personal identifiable information (PII) is strictly prohibited in public demonstration deployments. Only mathematically validated synthetic data is loaded.

---

## 3. EVIDENCE INGESTION & PASSIVE DATA QUARANTINE

- **Prompt Injection Defense:** Evidence content is strictly marked `DATA_ONLY`. Any adversarial text, system override attempts, or prompt injection payloads embedded in uploaded PDFs, CSVs, or OCR text are quarantined within `<evidence_data_untrusted>` XML envelopes and never interpreted as instructions.
- **Upload Restrictions:**
  - Ingestion buffer bounded at `MAX_CHUNK_BYTES` (8 MB per chunk).
  - Maximum upload size constrained to 10 GB with pre-flight resource admission checks preventing host memory starvation.
  - MIME-type sniffing and file magic header validation.

---

## 4. SECRETS HYGIENE & LOG SANITIZATION

- **Zero Secrets in Repository:** Verified via `git log -p` and static audit. No production API keys, database passwords, or private signing keys exist in Git.
- **Log Masking:** Passwords, Authorization Bearer headers, and private chain-of-thought rationale are omitted or redacted from application logs.
- **TLS & Certificate Renewal:** Let's Encrypt / Certbot automated ACME renewal configured on port 443.

---

## 5. STATUTORY DISCLAIMER
Technical validation of SHA-256 hashes, Merkle roots, and Section 63 BSA certificate formatting establishes digital chain-of-custody integrity under technical standards. It does not constitute an automatic grant of judicial admissibility, legal certification, or statutory authority, which remains exclusively within the purview of the competent court and judicial officer.
