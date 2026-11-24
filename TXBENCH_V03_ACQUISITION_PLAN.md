# TARKA-TXBENCH v0.3: EXTERNAL REAL-WORLD DATASET ACQUISITION PLAN

**Classification:** AUTHORITATIVE RESEARCH OPERATIONS SPECIFICATION  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Governing Statutory Framework:** Digital Personal Data Protection Act (DPDPA), 2023 & ISO/IEC 27037 Digital Evidence Handling  
**Document Code:** `SPEC-TXB03-ACQ-2026-V1`  
**Date:** 2026-11-24  

---

## 1. Executive Summary & Acquisition Mandate

The Phase 12B independent validation audit formally disclosed a repository inventory of 25 controlled calibration samples and 3 authorized live media uploads, establishing an **unresolved shortfall of 47 external real-world receipts** to reach the target 50-sample independent holdout cohort.

In strict compliance with SentinelX Constitution Rule 1 (*Repository Truth*) and Rule 9 (*Production Readiness*):
> **We explicitly prohibit manufacturing synthetic images or scraping unauthorized internet records to satisfy the 50-sample requirement.**

This document establishes the formal, legally compliant acquisition programme to lawfully source, consent, anonymize, adjudicate, and cryptographically seal the remaining 47 real-world payment receipts.

---

## 2. Target Cohort Stratification & Quota

The 47 target samples shall be acquired across four distinct operational strata to ensure real-world diversity:

```
+-----------------------------------------------------------------------------------+
|                        TXBENCH v0.3 ACQUISITION QUOTA BREAKDOWN                   |
+-----------------------------------------------------------------------------------+
| Stratum | Description                    | Target Quota | Permitted Sources       |
+---------+--------------------------------+--------------+-------------------------+
|    A    | Clean Authentic Mobile Receipts|  15 samples  | Consenting volunteers,  |
|         |                                |              | fintech user study      |
+---------+--------------------------------+--------------+-------------------------+
|    B    | Benign Transformed Receipts    |  12 samples  | WhatsApp recompressed,  |
|         | (Social recompression, tilt)   |              | cropped, dark mode OLED |
+---------+--------------------------------+--------------+-------------------------+
|    C    | Real-World Disputed / Tampered |  12 samples  | Anonymized closed FSL   |
|         | (Splice, VPA edit, status flip)|              | dockets, bank fraud logs|
+---------+--------------------------------+--------------+-------------------------+
|    D    | Ambiguous / Reconciliation Gaps|   8 samples  | Bank CBS core ledger    |
|         | (Timing lags, unrecorded UTRs) |              | timing cutover batches  |
+---------+--------------------------------+--------------+-------------------------+
| TOTAL   | Target New Real-World Evidence |  47 samples  | External Partners Only  |
+-----------------------------------------------------------------------------------+
```

### 2.1 Environmental Diversity Constraints
- **Applications:** PhonePe, Google Pay, Paytm, BHIM UPI, Amazon Pay, CRED, and WhatsApp Pay.
- **Operating Systems:** Android 11 through 15 (OneUI, HyperOS, OxygenOS, Pixel Android) and iOS 16 through 18.
- **Resolutions:** $720\times1280$ through $1440\times3200$ pixels.
- **Capture Modes:** Native OS screenshot, third-party gallery transcode, camera photograph of physical phone screen (moiré patterns).

---

## 3. Lawful Basis & Consent Protocols (DPDPA 2023)

In accordance with the Digital Personal Data Protection Act, 2023 (Act No. 22 of 2023):

### 3.1 Lawful Purpose & Notice (Section 4 & 5)
Every participant and institutional donor shall receive a standardized Itemized Notice (`Form DTA-NOTICE-01`):
1. **Specified Purpose:** Scientific forensic calibration, algorithmic bias evaluation, and criminal investigation software hardening.
2. **Data Minimization:** Only pixels containing payment metadata (amount, UTR, date, recipient VPA) are processed.
3. **No Commercial Profiling:** Evidence is strictly barred from advertising, commercial profiling, or third-party resale.
4. **Data Fiduciary:** SentinelX Forensic Lab / Institutional Research Partner.

### 3.2 Informed Consent (Section 6)
Consenting individuals shall execute a digital or physical consent record (`Form DTA-CONSENT-01`) granting:
- Explicit permission to store raw receipt bytes in encrypted CAS.
- Permission to derive anonymized evaluation statistics.
- Right to withdraw consent and demand immediate cryptographic erasure under Section 12 of the DPDP Act.

---

## 4. Privacy Minimisation & Redaction Pipeline

Before any acquired image enters the candidate holdout partition:
1. **Visual PII Masking:**
   - Beneficiary/Payer Name: Masked if personal (e.g., `Rahul S****`). Merchant commercial names (`Uber India`, `Zomato`) remain unmasked.
   - Bank Account Number: Truncated to last 4 digits (`XX1234`).
   - Phone Numbers: Masked (`+91 98XXX XX123`).
   - Customer VPA: Handle preserved, prefix masked (`user_***@okhdfcbank`).
2. **Zero Secondary Telemetry:**
   - Stripped of GPS coordinates, device serial numbers, and IMEI numbers from EXIF/XMP metadata chunks.

---

## 5. Independent Ground-Truth Adjudication Protocol

To guarantee that ground-truth labels are unimpeachable and not inferred from TARKA's own algorithms:

```
[Candidate Receipt Ingested]
             │
             ▼
   [Independent Dual-Adjudication]
   ├── Examiner A (Senior Forensic Analyst)  ──> Blinded Classification (Authentic/Tampered)
   └── Examiner B (Bank Fraud Specialist)    ──> Verification against Authoritative Core Ledger
             │
             ├── If Examiner A & B Agree ──────> Ground Truth Certified & Sealed
             └── If Examiner A & B Disagree ───> Discard Sample (Never force arbitrary label)
```

### 5.1 Verification Against Authoritative Bank Records
For every receipt in Stratum A and C:
- Ground truth cannot be established by visual inspection alone.
- The providing institution or consenting participant must provide corresponding bank statement proof demonstrating whether the funds actually debited/credited matched the screenshot.

---

## 6. Strict Separation of Roles & Blinding

```
+-----------------------------------------------------------------------------------+
|                        SEPARATION OF CONCERNS TOPOLOGY                            |
+-----------------------------------------------------------------------------------+
|  [Dataset Custodian]                                                              |
|  - Holds unredacted original files & consent forms                                |
|  - Maintains the Sealed Ground Truth Manifest (data/txbench_v03/sealed_gt.json)   |
|  - Strictly isolated from algorithm development                                  |
|         │                                                                         |
|         │ (Provides anonymized byte streams only)                                 |
|         ▼                                                                         |
|  [Blinded Evaluation Harness] (`scripts/evaluate_txbench_v03_holdout.py`)         |
|  - Strips all ground-truth labels before feeding engines                          |
|  - Evaluates TracePaymentForensics & MultimodalEvidenceGateway                    |
|         │                                                                         |
|         │ (Outputs sealed raw prediction ledger)                                  |
|         ▼                                                                         |
|  [Independent Scoring Engine]                                                     |
|  - Computes TP, FP, TN, FN, Accuracy, Precision, Recall, IoU post-execution        |
|  - Developer access locked out until formal scoring freeze                        |
+-----------------------------------------------------------------------------------+
```

---

## 7. Sample Acquisition Manifest Schema

Every acquired sample shall be recorded in the immutable acquisition log (`data/txbench_v03_acquisition_log.jsonl`) adhering to the following schema:

```json
{
  "sample_id": "TXB03-REAL-001",
  "acquisition_timestamp_utc": "2026-11-24T12:00:00Z",
  "source_category": "CONSENTING_VOLUNTEER_STUDY",
  "consent_form_id": "CONSENT-2026-DL-0881",
  "providing_entity": "IIT_DELHI_FORENSIC_COHORT",
  "original_filename": "receipt_20260331_phonepe.png",
  "sha256_hash": "a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcdef0123",
  "app_target": "PhonePe",
  "app_version": "v24.03.10",
  "device_model": "Samsung Galaxy S23",
  "os_version": "Android 14 (OneUI 6.1)",
  "stratum": "Stratum A (Authentic)",
  "ground_truth": {
    "is_tampered": false,
    "tampering_type": "NONE",
    "verified_by_statement": true,
    "adjudicator_a_id": "EXAMINER_01",
    "adjudicator_b_id": "EXAMINER_02"
  },
  "storage_uri": "data/cases/txbench_v03_raw/TXB03-REAL-001.png"
}
```

---

## 8. Programme Timeline & Milestones

- **Milestone M1 (Weeks 1–2):** Finalize institutional MOUs and consent templates with academic/banking partners.
- **Milestone M2 (Weeks 3–4):** Ingest and anonymize first batch of 25 live consumer receipts (Strata A & B).
- **Milestone M3 (Weeks 5–6):** Ingest 22 disputed/reconciliation samples from banking fraud units (Strata C & D).
- **Milestone M4 (Week 7):** Execute dual-examiner ground-truth certification; seal final 50-sample dataset.
- **Milestone M5 (Week 8):** Execute pre-registered blinded holdout evaluation and publish final benchmark results.
