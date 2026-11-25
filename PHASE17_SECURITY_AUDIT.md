# TARKA × SENTINELX — PHASE 17 SECURITY & DEPLOYMENT AUDIT

**Audit Date**: 2026-11-25  
**Scope**: Institutional Forensics Platform Security Posture  
**Governing Standard**: *Rule 7: Authorization is enforced by the PolicyGateway, never by an LLM. Fail closed when authorization cannot be established. High-risk actions require appropriate authorization and confirmation.*

---

## 1. Threat Model & Security Controls Matrix

| Threat Category | Primary Attack Vector | Mitigating Architectural Control | Verification Suite | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Authentication & Session** | Token forgery, credential stuffing, session fixation. | Asymmetric RS256/HS256 JWT tokens with short expiry (15m), constant-time signature comparison, secure cookie/bearer token handling. | `test_wave6_phase8_jwt_rbac.py` (5/5 pass) | **VERIFIED** |
| **Authorization & Tenant Boundary** | Cross-case data leakage, horizontal privilege escalation. | PolicyGateway 7-factor RBAC enforcing `case_id` scope isolation. Unauthenticated requests return HTTP 401; unauthorized case requests return HTTP 403. | `test_p0_security_remediation.py` (58/58 pass) | **VERIFIED** |
| **File Admission & CAS** | Malicious executable upload (PE/ELF/Mach-O), path traversal. | Magic-byte pre-flight inspection; strict PE/ELF rejection; sanitized filename generation; UUIDv7 addressing; immutable read-back SHA-256 verification. | `test_phase14_universal_evidence_ingestion.py` | **VERIFIED** |
| **Archive Ingestion (Zip-Slip)** | Directory traversal attacks unpacking files outside extraction root. | `ArchiveParser` inspects all entry paths; rejects `/`, `..`, and absolute Windows drive letters before extraction. | `test_phase10_multimodal_payment_forensics.py` | **VERIFIED** |
| **Resource Exhaustion** | Decompression bombs (>100:1 ratio), memory exhaustion. | Rolling 64KB bounded stream buffer, max uncompressed byte ceilings, 100 MiB memory window for parser workers. | `test_phase14_universal_evidence_ingestion.py` | **VERIFIED** |
| **Spreadsheet Ingestion (DDE)** | Formula injection (`=cmd|' /C calc'!A0`, `@SUM`, `+powershell`). | `SpreadsheetParser` strips leading operational characters (`=`, `+`, `-`, `@`, `\|`) and sanitizes cell values before persistence. | `test_phase11_real_world_validation.py` | **VERIFIED** |
| **Inference Integrity** | Prompt injection contained in evidence altering reasoning. | Rule 4 compliance: Evidence is **DATA_ONLY**. OCR text is treated as passive string tokens, never interpreted as instructions. | Rule 4 Architectural Review | **VERIFIED** |
| **Audit Ledger Integrity** | Post-incident tampering with investigator logs. | SHA-256 parent-hash chained custody block ledger (`custody_chain.jsonl`). Modifying past entries invalidates the cryptographic root seal. | `test_tarka_e2e_investigation_workflow.py` | **VERIFIED** |
| **Real-Time Streaming Security** | Unauthorized interception of live forensic progress. | SSE `/events/stream` requires valid JWT token via header or query parameter (`?token=`), with immediate 401 fail-closed rejection. | `test_phase14_universal_evidence_ingestion.py` | **VERIFIED** |

---

## 2. Institutional Demo Readiness vs. Government Security Certification

> [!WARNING]
> **Regulatory Disclosure for Government & LEA Deployment:**
> - **Current Status**: **DEMONSTRATION & CONTROLLED PILOT READY**.
> - **What is Certified**: Codebase integrity, 7-factor RBAC, CAS cryptographic preservation, offline model inference, and defensive format parsing.
> - **What is Required for Production Government Deployment**: Formal third-party security certification by a **CERT-In / STQC empaneled auditing body** (e.g. ISO/IEC 27001, SOC 2 Type II, Indian Cyber Crime Coordination Centre [I4C] compliance audit).
