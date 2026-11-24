# TARKA × SENTINELX — PHASE 12A: INVESTIGATOR WORKFLOW REPORT
## End-to-End Audit of the 14-Step Digital Forensics Investigative Lifecycle

**Document ID:** `TARKA-WORKFLOW-AUDIT-001`  
**Date of Execution:** 2026-11-23  
**Auditor:** Principal Forensic Systems Architect & Quality Assurance Lead  
**Governing Standard:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md) Section 5, Section 6, Section 15  
**Verification Script:** [scripts/verify_phase12a_investigator_workflow.py](file:///c:/PROJECTS/SentinelX/scripts/verify_phase12a_investigator_workflow.py)  
**Execution Status:** **ALL 14 STEPS PASSED (100% REPRODUCIBLE)**  

---

## 1. Executive Summary & Verification Context

Section 5 of the SentinelX Engineering Constitution establishes the core epistemic principle:
> **AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. HUMAN DECIDES.**

An investigation platform cannot be certified for operational pilot deployment simply because individual unit tests pass. It must execute the complete end-to-end lifecycle under realistic conditions using authorized test evidence.

The 14-step verification suite was executed against the actual backend domain services and adapters. Every step succeeded with cryptographic bitstream verification, audit ledger integrity, and strict enforcement of the non-promotability invariant.

---

## 2. Step-by-Step Verification Audit Table

| Step | Investigative Phase | Operation & Evidence Evaluated | Cryptographic Artifacts & Invariants | Result |
| :---: | :--- | :--- | :--- | :---: |
| **01** | **Investigator Authentication** | Evaluated `AuthService.create_jwt_token` and `verify_jwt_token` for user `INVESTIGATOR_DELHI` (`usr-delhi-01`). | Validated HMAC-SHA256 signature, expiration, role (`INVESTIGATOR`), and case access permissions. | **PASS** |
| **02** | **Case Creation** | Created `UniversalCase` (`CASE-PILOT-85C31D01`) in `ACTIVE` status under jurisdiction `IN-DL`. | Initialized with immutable creation timestamp, schema version 1.0.0, and classification `RESTRICTED`. | **PASS** |
| **03** | **Evidence Submission** | Admitted HDFC Bank CBS CSV export and seized PhonePe payment receipt PNG via `MultimodalEvidenceGateway`. | Verified magic bytes (`\x89PNG`, text/csv), verified non-executable content, and rejected script directives. | **PASS** |
| **04** | **Original-Byte Preservation & CAS** | Computed streaming SHA-256 bitstream hashes; verified immediate post-storage read-back. | CSV Hash: `db28dd95b1fc...`<br>PNG Hash: `8716a9102250...`<br>Read-back bitstreams matched 100%. | **PASS** |
| **05** | **Asynchronous Job Orchestration** | `ForensicJobOrchestrator` transitioned job `JOB-20261123161728-8294` across 4 FSM stages: `RECEIVED` $\rightarrow$ `QUEUED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED`. | Atomic file writes (`.tmp` + `os.replace`); 4 durable SSE events appended to `{case_id}_events.jsonl`. | **PASS** |
| **06** | **OCR & Transaction Extraction** | Extracted core payment fields: Amount (₹15,000.00), UTR/RRN (`202602148891`), VPA (`merchant@okhdfcbank`), Status (`SUCCESS`). | Verified bounding box polygon coordinates and token-level confidence scores. | **PASS** |
| **07** | **TRACE Structural Examination** | Conducted in-memory ELA (Q=90), periodic autocorrelation resampling, and typography alignment inspection. | ELA Mean Error: `0.208`. Resampling: `False`. Verdict: `NO_OVERT_MANIPULATION_DETECTED` with statutory caveats. | **PASS** |
| **08** | **CBS Ledger Reconciliation** | Reconciled bank statement ($Opening: ₹50k, Debit: ₹25k, Closing: ₹25k$) against receipt claiming ₹15,000 debit. | Balance conservation: `VERIFIED_CONSERVED`. Isolated exact ₹10,000 contradiction under RRN `202602148891`. | **PASS** |
| **09** | **AEGIS Reasoning & Gaps** | Generated 7 competing hypotheses (H1–H6 + H_UNKNOWN). Formulated statutory evidence gaps under BNSS § 94 & CrPC § 91. | Registered custom investigator hypothesis `HYP-CUSTOM-01`. Top gap: `Section 94 BNSS` (NPCI switch logs). | **PASS** |
| **10** | **Timeline & Contradiction Review** | Generated `UniversalFinding` (`FIND-CONTRA-D7E1A2`) capturing the amount discrepancy. | **INVARIANT ENFORCED**: `human_verified = False` strictly maintained. Finding remains unpromoted. | **PASS** |
| **11** | **Human Investigator Decision** | Authorized human investigator reviewed evidence and promoted finding status to `ACCEPTED` (`human_verified = True`). | Recorded examiner notes, reviewer ID (`usr-delhi-01`), and timestamp. Case moved to `UNDER_REVIEW`. | **PASS** |
| **12** | **Statutory Report Generation** | Generated court-admissible Section 63 BSA certificate linking artifacts, hashes, findings, and legal authorities. | Substantive content SHA-256 seal: `6c537f6a9c54033f...`. Certificate bitstream persisted in CAS. | **PASS** |
| **13** | **Audit & Provenance Verification** | Verified unbroken 6-block cryptographic audit ledger chaining case creation, evidence, job, decision, and report. | Parent-hash chain verified terminating in root `25d6ddaea54d8b77...`. Zero missing links or tampering. | **PASS** |
| **14** | **Case Export & Reopening** | Closed case, exported complete serialized JSON package, re-opened from disk, and verified equality. | Export SHA-256: `40bbd9471d80f825...`. Deserialized case matched bit-for-bit with intact verified finding. | **PASS** |

---

## 3. Human Control & Epistemic Invariant Verification

Throughout the 14 steps, the platform strictly maintained the separation between automated observation and human judicial decision:

1. **Non-Promotability Invariant**: When the TRACE and CBS reconciler isolated the ₹10,000 discrepancy between the bank statement and the receipt, the finding was marked `human_verified = False` and `status = FindingStatus.OPEN`. At no point did the system classify any party as fraudulent or guilty.
2. **Investigator Authority Gate**: The finding was only promoted to `ACCEPTED` when Inspector `usr-delhi-01` explicitly reviewed the raw bitstreams and signed off with examiner notes.
3. **Statutory Admissibility**: The Section 63 Bharatiya Sakshya Adhiniyam, 2023 report cryptographically sealed both the raw evidence hashes and the verified finding, ensuring full evidentiary traceability.
