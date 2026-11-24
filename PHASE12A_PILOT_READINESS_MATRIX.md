# TARKA × SENTINELX — PHASE 12A: PILOT READINESS MATRIX & OPERATIONAL PROTOCOL
## Controlled External Investigator Pilot Readiness Assessment & Deployment Guidelines

**Document ID:** `TARKA-PILOT-MATRIX-001`  
**Date of Evaluation:** 2026-11-23  
**Auditor:** Principal Forensic Systems Architect, Independent Validation Engineer & Security Reviewer  
**Governing Standard:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md) Section 9, Section 11, Section 15  
**Final Production Gate Decision:** **`DECISION B: CONDITIONALLY APPROVED FOR CONTROLLED INVESTIGATOR PILOT`**  

---

## 1. Subsystem Readiness Matrix

| Platform Subsystem | Readiness Status | Evidence in Codebase & Tests | Operational Conditions / Pilot Constraints |
| :--- | :---: | :--- | :--- |
| **Multimodal Evidence Gateway** | **READY** | Magic byte validation, formula injection defense, polyglot rejection, read-back SHA-256 verification. 4/4 security tests passing. | Restricted to authorized file formats (PNG, JPEG, WebP, PDF, CSV, ZIP). Maximum file size 100MB. |
| **TRACE Payment Forensics** | **CONDITIONALLY READY** | Periodic autocorrelation resampling ($diff < 0.25$), typography kerning verification, EXIF software tags. | Must operate in conjunction with Core Banking reconciliation. ELA is strictly an auxiliary visual heatmap. |
| **CBS Ledger Reconciler** | **READY** | Balance conservation ($\text{Closing} = \text{Opening} + \text{Credits} - \text{Debits}$), RRN matching, auto-reversals, ambiguous candidate preservation. | Mandatory for all payment dispute cases. Bank statements must be authentic CSV/PDF exports. |
| **AEGIS Reasoning Engine** | **READY** | Dynamic competing hypotheses (H1–H6), statutory gap prioritization (BNSS § 94, CrPC § 91), custom hypothesis registration. | Non-promotability enforced (`human_verified = False`). Guilt or liability assertions strictly forbidden. |
| **Job Orchestrator & FSM** | **READY** | 10-state deterministic FSM, atomic `.tmp` + `os.replace` persistence, SSE event logging with monotonic IDs and replay. | Storage directory `data/jobs/` must reside on durable local storage with write permissions. |
| **Section 63 BSA Reporting** | **READY** | Court-admissible statutory certificates with substantive SHA-256 fingerprint, PDF/HTML/JSON export, ReportLab engine. | Substantive SHA-256 seal is invalid if underlying evidence hashes are modified. |
| **Audit Ledger** | **READY** | Cryptographic parent-hash chaining terminating in verified genesis root. Tamper detection verified. | Audit records are append-only and cannot be purged or modified during active cases. |
| **CAS Byte Storage** | **LOCAL READY / S3 CONTAINER BLOCKED** | Filesystem CAS operational with immediate SHA-256 read-back verification. 17/17 tests passing. | Pilot will run on local filesystem CAS. Host Windows Docker container CAS remains blocked by host named pipe saturation. |

---

## 2. Risk Assessment & Operational Mitigations

| Risk Description | Severity | Likelihood | Forensic / Operational Mitigation |
| :--- | :---: | :---: | :--- |
| **Physical Display Capture Artifacts (Moiré)** | HIGH | HIGH | When investigators photograph a suspect's phone screen with another phone, optical moiré patterns and perspective distortion degrade pixel autocorrelation. **Mitigation**: Pilot protocol requires direct digital screenshot export (via USB, QuickShare, or official WhatsApp export) rather than camera photographs. |
| **Low-Resolution Re-Recompression** | MEDIUM | HIGH | Evidence forwarded multiple times through messaging apps (WhatsApp Q=50, Telegram) exhibits heavy macroblock blurring. **Mitigation**: TRACE suppresses false-positive inpainting alerts on low-variance flat cards and requires typographic spacing or CBS mismatch corroboration. |
| **Missing Core Banking Statement** | HIGH | MEDIUM | When a complainant submits a disputed receipt without bank records, CBS reconciliation cannot run. **Mitigation**: AEGIS automatically flags `Section 91 CrPC / Section 94 BNSS Subpoena Required` as a Priority 1 statutory gap before any conclusion can be reached. |
| **Heuristic Overfitting to Known Apps** | MEDIUM | LOW | Novel third-party UPI or wallet apps with non-standard fonts may trigger false typographic alarms. **Mitigation**: Font spacing thresholds include a $\pm 15\%$ tolerance band, and findings default to `POSSIBLE_COMPRESSION_OR_LAYOUT_ANOMALIES` with explicit caveats. |

---

## 3. Controlled Pilot Protocol & Investigator Guidelines

For the upcoming controlled law enforcement / financial fraud pilot, all operators must adhere to these mandatory guidelines:

1. **Evidence Ingestion Standard**:
   - Investigators must ingest original, unaltered digital files.
   - Screen-recorded videos or optical camera photographs of phone displays must be accompanied by seized device extraction logs.
2. **Mandatory Corroboration Rule**:
   - A screenshot examination showing typographic or resampling anomalies is an **investigative lead**, not conclusive evidence of guilt.
   - Corroborating bank statement exports or NPCI central switch logs must be obtained before issuing statutory Section 63 BSA reports.
3. **Human Signoff Procedure**:
   - Every contradiction finding must be personally reviewed by the investigating officer.
   - The officer must input specific examiner notes and verify that the claimed amount matches the seized physical exhibit before marking the finding `ACCEPTED`.
4. **Holdout Evaluation Mandate**:
   - The pilot team will collect 50 unseen real-world cases under the pre-registered `TXBENCH v0.3-HOLDOUT` protocol to establish unconstrained generalization before widespread multi-jurisdiction rollout.
