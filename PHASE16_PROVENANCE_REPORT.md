# TARKA PHASE 16 — EVIDENCE PROVENANCE & REPORT REPRODUCIBILITY REPORT
**Document Identifier:** `PHASE16_PROVENANCE_REPORT.md`  
**Authority:** Principal Forensic Systems Architect, Digital Forensics Lead, Legal Compliance Officer  
**Evaluation Date:** 2026-11-25  
**Governing Standard:** Section 63, Bharatiya Sakshya Adhiniyam, 2023 (BSA); ISO/IEC 27037:2012 (Digital Evidence Handling)  
**Status:** **AUDITED, VERIFIED & FULLY REPRODUCIBLE**  

---

## 1. The Evidence Lineage Architecture

Under Rules 4 and 6 of the SentinelX Engineering Constitution:
- Evidence is append-only.
- Raw evidence bytes are preserved immutably in Content Addressable Storage (CAS).
- SHA-256 content hashes are permanent.
- Every meaningful investigative conclusion must remain traceable through complete evidentiary lineage:

```
[Statutory Conclusion]
          │
          ▼
    [Hypothesis] (AEGIS Competing Hypotheses HYP-01..HYP-UNKNOWN)
          │
          ▼
     [Reasoning] (Z3 SMT Solver & Epistemic Constraint Consistency)
          │
          ▼
   [Correlation] (Cross-source temporal and entity alignment)
          │
          ▼
  [Relationship] (Canonical Entity-to-Entity link with uncertainty score)
          │
          ▼
      [Entity] (Normalized Canonical Person, VPA, Account, Phone)
          │
          ▼
       [Event] (Transaction, chat message, device log, call record)
          │
          ▼
        [Fact] (Deterministic or OCR-extracted proposition)
          │
          ▼
 [Observation] (Extracted token, bounding polygon [0.0, 1.0], confidence)
          │
          ▼
    [Artifact] (Registered file entry in CaseStore)
          │
          ▼
     [CAS Bit] (Raw content-addressable storage byte stream)
          │
          ▼
    [SHA-256] (Cryptographic verification digest)
          │
          ▼
 [Custody Log] (Append-only SQLite custody ledger & hash-chained audit event)
```

---

## 2. Preserved Artifact Provenance Record

Every evidence item admitted into TARKA retains permanent cryptographic provenance:

| Artifact ID | Preserved CAS Hash (SHA-256) | File Size | Acquisition Channel | Custody Status | Integrity Audit |
| :--- | :--- | :--- | :--- | :--- | :---: |
| `ART-010-D586D8E7` | `d586d8e7f23fdb150a923ced78465d577572822bec8855b020063dd3fa0db09a` | 50,708 B | `DIRECT_UPLOAD` | Sealed in CAS | **VERIFIED (100%)** |
| `ART-009-46AF2983` | `46af2983f6efb3c53b3a5b6f766d475e6bb4c3cac01e8c741c657df1d11cd210` | 1,322,572 B | `DIRECT_UPLOAD` | Sealed in CAS | **VERIFIED (100%)** |
| `ART-007-6592F125` | `6592f125bc6f5aa3fd257bc104dea48a942e416410db845826c99e4ea34ea78e` | 4,754,869 B | `DIRECT_UPLOAD` | Sealed in CAS | **VERIFIED (100%)** |
| `ART-008-359E2C3B` | `359e2c3ba48791272021be2d30a34cc78201ad7da7348f1d117865b66c635ba7` | 4,720,055 B | `DIRECT_UPLOAD` | Sealed in CAS | **VERIFIED (100%)** |

---

## 3. Section 63 BSA Report Generation & Independent Reproducibility

1. **Statutory Report Generation:**
   - Endpoint: `POST /api/v1/forensics/cases/{case_id}/reports`
   - Formats Generated: PDF (ReportLab vector rendering), HTML, JSON.
   - Includes Section 63 BSA Certificate signed with the digital signature of the certifying custodian.
   - Reports distinguish five strict epistemic tiers:
     - **Direct Observations:** Raw machine readings, OCR tokens, and byte metadata.
     - **Interpretations:** Proposed classifications and anomaly scores.
     - **Assumptions:** Unverified predicates (e.g., statement completeness).
     - **Limitations:** Resolution boundaries, cursive OCR limits, and missing logs.
     - **Examiner Conclusions:** Human-adjudicated findings.

2. **Tamper-Evident Report Verification:**
   - Endpoint: `GET /api/v1/forensics/cases/{case_id}/reports/{report_id}/verify`
   - Verifies the report's cryptographic hash against the stored custody event.
   - Any byte-level modification of the report or underlying evidence invalidates the certificate.

3. **Independent Reproducibility:**
   - The entire investigation package can be recomputed from raw CAS bytes.
   - Verified via `test_tarka_e2e_investigation_workflow.py::test_05_statutory_section_63_bsa_report_generation`.

