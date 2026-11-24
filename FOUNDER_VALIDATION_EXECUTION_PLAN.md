# TARKA × SENTINELX — FOUNDER VALIDATION LAB: MASTER EXECUTION PLAN

**Document Code:** `PLAN-FOUNDER-LAB-2026-V1`  
**Classification:** ARCHITECTURAL & OPERATIONAL EXECUTION ROADMAP  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Governing Standard:** ISO/IEC 27037:2012, SUTRAM 2026 Benchmark, BSA 2023 Section 63  
**Execution Lead:** Principal Forensic Systems Architect & Validation Lead  
**Date:** November 2026  

---

## 1. Mission & Governing Law

The objective of the **Founder-Led Validation Lab** is to transform TARKA × SentinelX into a battle-hardened, repeatable, forensic testing ground where the founder can personally upload lawfully acquired real-world payment evidence, run production forensic engines, expose edge-case failures, and scientifically quantify accuracy without synthetic bias.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    THE NON-NEGOTIABLE PRODUCT LAW                           │
│                                                                             │
│             AI PROPOSES. FORENSIC ENGINES TEST.                             │
│             EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Phased Architectural Roadmap (Phases 1–9)

```
[Phase 0: Reconnaissance & Baseline Audit] (COMPLETE)
   │
   ▼
[Phase 1: Build Validation Lab Core Backend & Schemas]
   │
   ▼
[Phase 2: Implement Complete 49-Scenario Catalogue]
   │
   ▼
[Phase 3: Build Safe Real-Evidence Intake Workflow]
   │
   ▼
[Phase 4: Implement Blind Validation Engine]
   │
   ▼
[Phase 5: Multi-Dimensional Metrics Calculation Engine]
   │
   ▼
[Phase 6: Dedicated Validation Lab UI & Testing Dashboard]
   │
   ▼
[Phase 7 & 8: Reproducibility, Security & Privacy Testing]
   │
   ▼
[Phase 9: Final Acceptance Gate & Authoritative Reporting]
```

---

## 3. Phase-by-Phase Technical Specifications

### Phase 1: Build the Validation Lab Core Backend & Schemas
- **Objective:** Establish the foundational domain models, storage layouts, and API controllers for managing validation sessions and test cases.
- **Components to Implement:**
  - `backend/app/domain/validation_lab.py`: Pydantic v2 schemas:
    - `ValidationSession`: Session ID, name, examiner ID, created timestamp, notes, tags, status.
    - `TestCase`: Test ID, session ID, case ID, test category (TRACE, AEGIS, PLATFORM), scenario ID, engine selection, evidence file IDs, original file hashes, ground-truth manifest ID, execution status, actual output, intermediate observations, duration, false positive/negative classification, examiner notes, reproduction instructions.
  - `backend/app/services/validation_lab_service.py`: Service managing disk persistence under `data/validation_lab/sessions/` and `data/validation_lab/tests/`.
  - `backend/app/api/validation_lab_api.py`: REST endpoints mounted under `/api/v1/validation-lab/`.

### Phase 2: Implement the 49-Scenario Catalogue
- **Objective:** Code the standardized scenario catalogue covering all 49 specified operational scenarios:
  - **TRACE (25 Scenarios):** T01 (Genuine), T02 (Altered Amount), T03 (Cropped), T04 (Messaging Compression), T05 (Blurred), T06 (Conflicting Status), T07 (Matching CBS), T08 (Conflicting Amounts), T09 (Missing Transaction), T10 (Duplicate Transaction), T11 (Reversal/Refund), T12 (Split Payments), T13 (Balance Conservation Failure), T14 (Conflicting UTRs), T15 (Transaction vs Settlement Timestamp Skew), T16 (Currency & Decimal Normalization), T17 (Altered Text), T18 (Replaced Recipient), T19 (Replaced UTR), T20 (Composited Region), T21 (AI-Inpainted Field), T22 (Synthetic UI), T23 (Benign Resizing), T24 (Benign Cropping/Re-encoding), T25 (Unusual Genuine Template).
  - **AEGIS (12 Scenarios):** A01 (Repeated VPA), A02 (Similar Phones), A03 (Conflicting Recipient), A04 (Repeated Beneficiary), A05 (Multi-Account Path), A06 (Conflicting Clocks), A07 (Missing Ownership), A08 (Cross-Case Identifier), A09 (Competing Hypotheses), A10 (Insufficient Evidence), A11 (Contradictory New Evidence), A12 (Unrelated Entities Sharing Attribute).
  - **PLATFORM (12 Scenarios):** P01 (Unsupported File), P02 (Disguised Executable), P03 (Corrupted PDF), P04 (Oversized File), P05 (Duplicate Upload), P06 (Cross-Case Evidence Isolation), P07 (Unauthorized Access), P08 (Interrupted Worker Recovery), P09 (Duplicate Webhook), P10 (SSE Reconnection), P11 (Concurrent Uploads), P12 (Incomplete Report Generation).
- **Components to Implement:**
  - `backend/app/services/scenario_catalogue_service.py`: Registry and runner executing scenarios with assertions, failure criteria, and ground truth.

### Phase 3: Build Safe Real-Evidence Intake Workflow
- **Objective:** Create a secure, isolated `REAL_EVIDENCE` validation intake pipeline with zero data leakage and full provenance tracking.
- **Capabilities to Implement:**
  - `backend/app/services/validation_intake_service.py`:
    - Strict pre-hashing (streaming SHA-256) before file moves or analysis.
    - Write-verification: re-reading physical disk blocks and asserting hash equivalence.
    - Distinct temporal tracking: `claimed_transaction_time` vs `evidence_acquisition_time`.
    - Transmission history tracking: `transmission_channel` (camera, WhatsApp, Telegram, scan, raw export), `transformation_flags` (cropped, resized, re-saved).
    - Preservation of pristine raw bytes in `data/validation_lab/real_evidence/raw/` with read-only permissions; generation of derived working copies in `derived/`.
    - Automated PII redaction warning and client-side guidance.
    - Absolute quarantine: synthetic fixtures (`is_synthetic = True`) cannot be admitted into `REAL_EVIDENCE` sessions.
    - Zero cloud egress validation: blocks all external HTTP calls during analysis.

### Phase 4: Implement Blind Validation Engine
- **Objective:** Implement true double-blind testing where analysis engines cannot access ground truth during execution.
- **Capabilities to Implement:**
  - `backend/app/services/blind_validation_engine.py`:
    - Ground-truth manifests stored in encrypted/isolated JSON files under `data/validation_lab/ground_truth/<manifest_id>.json`.
    - Execution harness runs production `TracePaymentForensics` and `AegisReasoningEngine` without ground-truth parameters.
    - Output freezing: once execution terminates, actual findings and observations are hashed ($\mathcal{H}_{\text{output}}$) and written to an immutable run file.
    - Post-execution unblinding: evaluator unseals ground truth, performs diffing and confusion scoring, and generates non-retrospective evaluation records.

### Phase 5: Multi-Dimensional Metrics Engine
- **Objective:** Calculate scientific forensic performance metrics only where labelled ground truth exists.
- **Metrics to Compute:**
  - **Image Classification:** TP, TN, FP, FN, Precision, Recall, F1, FPR, FNR, Calibration error.
  - **OCR:** Field-level accuracy, Word Error Rate (WER), Character Error Rate (CER), Missing field rate, confidence calibration.
  - **Spatial Localisation:** Bounding-box Intersection-over-Union (IoU), region precision/recall.
  - **Financial Reconciliation:** Amount mismatch detection, missing transaction detection, duplicate detection, balance conservation boolean, false discrepancy rate.
  - **AEGIS Reasoning:** Entity-resolution precision/recall, incorrect merge rate, evidence gap usefulness, hypothesis coverage, unsupported attribution rate.
  - **Operations:** P50/P95/P99 latency, throughput (rows/sec), peak memory (MB), CPU usage (%), storage growth.
- **Components to Implement:**
  - `backend/app/services/validation_metrics_engine.py`.

### Phase 6: Founder Validation Lab UI & Testing Dashboard
- **Objective:** Build an intuitive, high-density React workstation allowing the founder to run validation sessions, inspect intermediate findings, and view live metrics.
- **Components to Implement:**
  - `frontend/src/components/tarka/validation/FounderValidationLab.tsx`: Main validation laboratory container with session management, case builder, evidence uploader, ground truth editor, run trigger, and diff viewer.
  - `frontend/src/components/tarka/validation/FounderValidationDashboard.tsx`: Live dashboard displaying the 15 required metrics with interactive drill-down to underlying cases, test logs, and raw CAS byte stores.
  - Wire into `frontend/src/pages/ForensicWorkspacePage.tsx` and application routing.

### Phase 7: Reproducibility Engine
- **Objective:** Ensure every completed validation run is 100% reproducible on any compatible machine.
- **Implementation:**
  - Record: Git commit hash, Python/Node dependency manifests (`requirements.txt` / `package.json`), engine versions, configuration thresholds, fixture SHA-256 hashes, execution timestamps, output hashes, stdout/stderr logs, and execution tracebacks.
  - Implement `scripts/reproduce_validation_run.py` to replay any historical run and assert byte-for-byte output equivalence.

### Phase 8: Security & Privacy Validation
- **Objective:** Validate the 12 platform security requirements using dedicated synthetic security test vectors:
  - Case authorization, role restrictions, evidence immutability, audit integrity, cross-case isolation, magic-byte enforcement, archive expansion limits, formula injection defense, malformed file handling, concurrent upload integrity, worker crash recovery, and session security.

### Phase 9: Final Acceptance Gate & Authoritative Reporting
- **Objective:** Execute the entire test suite, run every scenario in the catalogue, record actual outcomes, and produce the 7 required milestone documents:
  1. `FOUNDER_VALIDATION_RESULTS.md`
  2. `FOUNDER_VALIDATION_DASHBOARD.md`
  3. `FOUNDER_TEST_CASE_CATALOGUE.md`
  4. `FOUNDER_REAL_EVIDENCE_INTAKE_GUIDE.md`
  5. `FOUNDER_VALIDATION_LIMITATIONS.md`
  6. `FOUNDER_FAILURE_REGISTER.md`
  7. `FOUNDER_NEXT_ACTIONS.md`

---
*TARKA × SentinelX — Engineered for Forensic Truth, Uncompromising Accuracy, and Founder Trust.*
