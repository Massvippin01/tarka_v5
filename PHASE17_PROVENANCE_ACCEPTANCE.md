# TARKA × SENTINELX — PHASE 17 EVIDENCE PROVENANCE & REPRODUCIBILITY ACCEPTANCE

**Audit Date**: 2026-11-25  
**Component**: Cryptographic Provenance DAG & Section 63 BSA Report Generator  
**Governing Standard**: *Rule 6: Every meaningful investigative conclusion must remain traceable through the evidence lineage. Never present a hash match as proof of the truthfulness of the original document.*

---

## 1. Unbroken 14-Stage Evidentiary Lineage

Every finding, hypothesis, and conclusion presented in TARKA maintains a complete, mathematically verifiable lineage back to raw evidence bitstreams:

$$\begin{aligned}
\text{Conclusion} &\longrightarrow \text{Hypothesis} \longrightarrow \text{Reasoning} \longrightarrow \text{Correlation} \longrightarrow \text{Relationship} \\
&\longrightarrow \text{Entity} \longrightarrow \text{Event} \longrightarrow \text{Fact} \longrightarrow \text{Observation} \\
&\longrightarrow \text{Artifact} \longrightarrow \text{SHA-256 Hash} \longrightarrow \text{Provenance} \longrightarrow \text{Custody Chain}
\end{aligned}$$

---

## 2. Parent-Chained Cryptographic Custody Ledger

All evidentiary intake and analysis operations are immutably recorded in `data/cases/{case_id}/custody_chain.jsonl`.
Each custody block contains:
- `event_id`: Unique identifier (e.g. `CUST-202611251211-89F1`).
- `timestamp`: UTC ISO-8601 millisecond timestamp.
- `artifact_id`: Immutable UUIDv7 artifact identifier.
- `sha256`: SHA-256 content hash of raw bitstream.
- `actor_id` & `role`: Authenticated officer identity.
- `action`: `INTAKE`, `CAS_COMMIT`, `OCR_EXTRACT`, `TRACE_ANALYSE`, `AEGIS_REASON`, `REPORT_GENERATE`.
- `parent_hash`: SHA-256 hash of the immediate predecessor event in the custody chain.

Tamper verification audits the unbroken parent-hash chain; modifying or truncating any historical entry immediately invalidates the cryptographic signature of all descendant records.

---

## 3. Section 63 BSA Statutory Certificate & PDF Export

Verified via `test_05_statutory_section_63_bsa_report_generation`:
- **Statutory Authority**: Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (admissibility of electronic records).
- **Substantive Digest**: Computes a deterministic SHA-256 fingerprint over all admitted artifacts, verified transactions, adjudicated findings, and examiner notes.
- **Export Formats**:
  1. Structured JSON (`/report`)
  2. Printable HTML (`/report?format=html`)
  3. Binary PDF (`/report/pdf`), rendering valid `%PDF-1.4` headers using ReportLab with embedded SHA-256 custody seals, non-guilt disclaimers, and statutory signature lines.
- **Epistemic Principle**: Cryptographic hashes verify bitstream preservation and custody integrity; they certify that bytes have not been tampered with since intake, not that the claims asserted inside the document are factual truth.
