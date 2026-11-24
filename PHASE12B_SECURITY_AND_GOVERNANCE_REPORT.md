# TARKA × SENTINELX — PHASE 12B: SECURITY, STATUTORY & LEGAL GOVERNANCE REPORT

**Classification:** AUTHORITATIVE SECURITY & STATUTORY AUDIT  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Governing Statutory Frameworks:** Bharatiya Sakshya Adhiniyam (BSA), 2023; Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023; Digital Personal Data Protection Act (DPDPA), 2023  
**Verification Seal:** `data/phase12b_pilot_audit_results.json`  
**Date:** 2026-11-24  

---

## 1. Executive Summary

This report establishes the security verification, statutory alignment, and legal compliance audit for TARKA × SentinelX under Phase 12B.

All eight mandated technical security vectors were evaluated and verified against the running code. In parallel, the platform's evidence custody, reporting, and reasoning pipelines were audited against contemporary Indian criminal procedure and digital evidence statutes.

---

## 2. Technical Verification of the 8 Security Vectors

All eight security vectors were evaluated using `scripts/verify_phase12b_pilot_and_security.py` and passed with zero defects:

```
+-----------------------------------------------------------------------------------+
|                        SECURITY VECTOR AUDIT VERIFICATION                         |
+-----------------------------------------------------------------------------------+
| Vector | Description                           | Mechanism             | Result   |
+--------+---------------------------------------+-----------------------+----------+
|   V1   | Cross-Case Data Isolation             | Isolated directory    | PASS     |
|        |                                       | trees in CAS storage  |          |
+--------+---------------------------------------+-----------------------+----------+
|   V2   | Unauthorized Evidence Access Guard    | HMAC-SHA256 JWT       | PASS     |
|        |                                       | PolicyGateway fail-cls|          |
+--------+---------------------------------------+-----------------------+----------+
|   V3   | Silent Original-File Modification     | Streaming SHA-256     | PASS     |
|        |                                       | read-back assertion   |          |
+--------+---------------------------------------+-----------------------+----------+
|   V4   | Unlogged Transformation Guard         | Append-only custody   | PASS     |
|        |                                       | ledger (JSONL)        |          |
+--------+---------------------------------------+-----------------------+----------+
|   V5   | Uncontrolled Report Export Guard      | RBAC sign-off check   | PASS     |
|        |                                       | for Section 63 BSA    |          |
+--------+---------------------------------------+-----------------------+----------+
|   V6   | Synthetic-to-Real Contamination Guard | `is_synthetic=True`   | PASS     |
|        |                                       | quarantine metadata   |          |
+--------+---------------------------------------+-----------------------+----------+
|   V7   | Credential & PII Leak Prevention      | Stream log sanitizer  | PASS     |
|        |                                       | masking tokens & PANs |          |
+--------+---------------------------------------+-----------------------+----------+
|   V8   | Crash Recovery & Process Resilience   | FSM recovers crashed  | PASS     |
|        |                                       | jobs to REQUIRES_REV  |          |
+-----------------------------------------------------------------------------------+
```

### 2.1 Detailed Vector Findings
- **V1 (Cross-Case Isolation):** Distinct filesystem hierarchies (`data/cases/<case_id>/`) ensure that even under path traversal attempts, Case A cannot list or read artifacts from Case B.
- **V2 (Unauthorized Access):** Malformed, tampered, or expired tokens return `None` and fail closed, terminating the request before reaching evidence storage.
- **V3 (Silent Modification):** Raw bytes written to disk are read back and re-hashed; any single-bit deviation triggers an immediate `IngestionQuarantineError` and aborts ingestion.
- **V4 (Unlogged Transformations):** Every ingestion, state transition, and OCR extraction generates an immutable event appended to `custody_ledger.jsonl`.
- **V5 (Uncontrolled Export):** Non-investigator roles (e.g. read-only auditors) are blocked from signing and sealing statutory Section 63 BSA reports.
- **V6 (Synthetic Contamination):** Synthetic benchmark fixtures carry immutable metadata `is_synthetic: true` and are rejected if submitted to non-evaluation case queues.
- **V7 (PII Sanitization):** Log output streams filter sensitive fields (`token`, `password`, `pan_number`, `card_number`), replacing them with `[REDACTED_PII_SECURITY]`.
- **V8 (Crash Resilience):** The orchestrator's `recover_crashed_jobs()` method automatically transitions in-flight jobs interrupted by server reboots or failures into `JobState.REQUIRES_REVIEW`.

---

## 3. Statutory Analysis under Indian Law

### 3.1 Section 63 of the Bharatiya Sakshya Adhiniyam (BSA), 2023
Section 63 of BSA, 2023 repeals and replaces Section 65B of the Indian Evidence Act, 1872, governing the admissibility of electronic records.

#### Statutory Requirements & TARKA Technical Alignment:
1. **Sub-section 63(1) & 63(2) (Conditions of Admissibility):**
   - *Requirement:* The computer output must be produced during a period of lawful control, in the ordinary course of activities, with the system operating properly without affecting accuracy.
   - *TARKA Implementation:* The system maintains operating logs, host health metrics, and automated bitstream assertions demonstrating uninterrupted, normal system operations during evidence acquisition.
2. **Sub-section 63(4) (Mandatory Certificate of Authenticity):**
   - *Requirement:* A certificate identifying the electronic record, describing the production manner, giving device particulars, and signed by an official in charge of the computer system is required.
   - *TARKA Implementation:* Generates a cryptographically sealed Section 63 BSA certificate:
     - Includes substantive SHA-256 hashes of all raw digital evidence.
     - Details the capture hardware, software version, and ingestion timestamp.
     - Embeds the cryptographic signature and designation of the certifying examiner.
     - Links directly to the append-only `custody_ledger.jsonl`.

### 3.2 Section 94 BNSS / Section 91 CrPC (Production of Documents)
- *Statutory Power:* Authorizes a court or police officer in charge to issue a written order/summons requiring the production of any document or electronic record necessary for an investigation.
- *TARKA Implementation:* AEGIS Reasoning Engine automatically drafts formal evidence requisition notices under Section 94 BNSS (or legacy Section 91 CrPC where applicable) when Core Banking reconciliation uncovers an unrecorded transaction or missing NPCI switch log.

### 3.3 Digital Personal Data Protection Act (DPDPA), 2023
- *Section 4 & 5 (Notice & Purpose Limitation):* Evidence intake is restricted to authorized case parameters; data processing is limited strictly to forensic anomaly extraction.
- *Section 8 (Data Security & Deletion):* Evidence is stored in encrypted CAS partitions. Access is restricted to authenticated investigators via 7-factor RBAC, with automated retention expiry policies.

---

## 4. Legal Disclaimer & Admissibility Boundary

> [!CAUTION]
> **LEGAL NOTICE REGARDING ADMISSIBILITY:**  
> 1. Generated Section 63 BSA certificates and statutory gap notices represent technical evidentiary proposals and **do not constitute legal advice**.  
> 2. The admissibility of any electronic record is determined solely by the competent judicial court or presiding magistrate under Indian law.  
> 3. AI models and automated forensic sub-engines propose findings; human digital forensics examiners and judicial officers decide admissibility and facts.
