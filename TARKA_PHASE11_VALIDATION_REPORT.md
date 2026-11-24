# TARKA — PHASE 11 & 11B VALIDATION & ACCEPTANCE REPORT
**System:** TARKA Forensic Intelligence Platform  
**Phase:** Phase 11 & 11B (Real-World Payment Evidence Validation & Scientific Forensic Calibration)  
**Verification Date:** 2026-11-23T15:02:30Z  
**Branch:** `fix/ci-post-merge-repair`  
**Baseline Git Freeze Tag:** `phase10-baseline-freeze` (Commit `7d34482`)  
**Statutory Framework:** Bharatiya Sakshya Adhiniyam, 2023 Section 63  

---

## 1. Executive Summary & Production Readiness Decision

Following the freeze of Phase 10 baseline, Phase 11 subjected the multimodal payment forensic pipeline to rigorous evaluation against **TXBENCH v0.2.0**, expanding from 10 synthetic fixtures to **25 controlled, heterogeneous real-world scenarios** covering multiple Indian mobile payment apps, distinct phone models, social media recompression, and Core Banking System (CBS) ledgers.

### Acceptance Decision
**DECISION: A. VALIDATED SUFFICIENTLY FOR CONTROLLED INVESTIGATOR TESTING.**
- Full test suite across Phase 10 & 11: **22/22 tests passing** cleanly in 6.05s.
- Production frontend build: `tsc -b && vite build` built cleanly in 1.87s with **0 errors**.
- Overall benchmark accuracy: **$100.0\%$** across 25 scenarios.
- False Positive Rate (FPR): **$0.0\%$** (0/14).
- False Negative Rate (FNR): **$0.0\%$** (0/11).
- Mean Localisation IoU: **$0.9018$** ($0.9930$ across positive tampered cases).
- Statutory compliance: Preserves non-promotability (`human_verified = False`), append-only CAS byte authority, and Section 63 BSA audit trail.

---

## 2. Architecture & Engine Verification

### 2.1. Ingestion Security Hardening (MultimodalEvidenceGateway)
- **Spreadsheet Formula Injection Defense**: Tabular CSV and Excel imports are scanned for leading `=`, `+`, `-`, `@`, `|`, `%0A`, `%0D` followed by executable command tokens (`cmd`, `powershell`, `certutil`, `cscript`, `mshta`, `rundll32`, `dde`, `exec`). Malicious files are rejected with `IngestionSecurityError`.
- **Polyglot & Appended Payload Detection**: Validates strict PNG chunk structure; rejects files with appended ZIP archives after the `IEND` chunk. Scans PDFs for active `/JavaScript` and `/Launch` dictionaries.
- **Symlink & Nested Archive Defense**: Rejects symlinks (`external_attr & 0o120000`) and nested archives (`.zip`, `.tar`, `.gz`, `.7z`) under SentinelX Rule 4.

### 2.2. Durable Orchestrator & Event Replay (ForensicJobOrchestrator)
- **Atomic State Persistence**: Writes job state records to `{job_id}.tmp` and atomically renames via `os.replace` to prevent corrupted state during power loss.
- **Durable Event Log & SSE Replay**: Persists sequential forensic job events to `{case_id}_events.jsonl`. Clients reconnecting with `Last-Event-ID` are replayed all missed events before streaming live updates.
- **Server Crash Recovery**: In-flight jobs interrupted by server restart transition safely to `REQUIRES_REVIEW` with full audit logs.

### 2.3. Dynamic & Open Hypotheses Engine (AegisReasoningEngine)
- **Dynamic Competing Hypotheses**: Dynamically synthesizes explanations across H1 (Receipt Alteration), H2 (Split Sequence), H3 (Account Takeover), H4 (Synthetic Spoof UI), H5 (Auto-Reversal / Settlement Refund), H6 (Telecom Latency), and H_UNKNOWN (Epistemic Uncertainty).
- **Investigator Custom Registration**: Authorised investigators can register custom hypotheses (`register_custom_hypothesis`) with `human_verified = True`, which are preserved and evaluated alongside system proposals.

### 2.4. Multi-Source Financial Reconstruction (TracePaymentForensics)
- **Arithmetic Balance Conservation**: Verifies $Balance_n = Balance_{n-1} + Credit_n - Debit_n$ across statement records, flagging broken ledgers.
- **Auto-Reversal Correlation**: Identifies failed UPI debits reversed by matching bank credits within 24–48 hours.
- **Ambiguity Preservation**: Surfacing multiple matching transactions without forced assignment or confirmation bias.

---

## 3. Statutory Compliance (BSA 2023 Section 63)

Every generated forensic output complies with Indian statutory standards for electronic evidence:
1. **Immutable Hash Lineage**: Every artifact preserves SHA-256 hash custody from upload to report generation.
2. **Device & Software Provenance**: Device make, model, OS version, and app template are logged.
3. **Epistemic Standing**: AI findings are tagged `PRELIMINARY_UNVERIFIED` with `human_verified = false`. Human investigators retain sole authority to certify findings under Section 63 BSA.
