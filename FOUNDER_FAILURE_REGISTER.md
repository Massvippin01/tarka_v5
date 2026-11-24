# TARKA × SENTINELX — FOUNDER FORENSIC FAILURE REGISTER
## Authoritative Log of Defects, Anomalies, Root Causes, and Architectural Resolutions

**Document Version:** 2.0  
**Authority:** Principal Forensic Systems Architect, QA Lead & Founder  
**Governing Standard:** SentinelX Engineering Constitution (Rule 1: Repository Truth; Rule 10: Change Discipline; Rule 14: Verification)  

---

## 1. Overview & Failure Register Purpose

The **Founder Failure Register** explicitly tracks every defect, discrepancy, unhandled edge case, and architectural mismatch uncovered during the preparation and execution of the Founder-Led Validation Laboratory.

In strict compliance with the **SentinelX Engineering Constitution**, defects are never concealed, fabricated, or quietly bypassed. Every resolved failure is documented with its exact root cause, affected files, and verifiable mitigation.

---

## 2. Exhaustive Log of Identified Defects & Resolutions

### Defect 01: Method Name Mismatch on `TracePaymentForensics`
- **Component:** `backend/app/services/validation_lab_service.py`
- **Symptom:** Runtime failure during test execution:
  `AttributeError: 'TracePaymentForensics' object has no attribute 'analyze_screenshot'`
- **Root Cause:** `validation_lab_service.py` assumed legacy/hypothetical method names (`analyze_screenshot`, `parse_bank_statement`, `reconcile_statement_and_receipt`) instead of inspecting actual methods on `TracePaymentForensics` (`examine_screenshot`, `examine_payment_screenshot`, `reconcile_multi_source_package`).
- **Resolution:** Updated `validation_lab_service.py` to call canonical methods:
  - `trace_engine.examine_screenshot(bdata, fname)`
  - CSV parser parsing rows into `transactions` list of dicts.
  - `trace_engine.reconcile_multi_source_package(statement_transactions=..., receipt_extractions=...)`.
- **Verification:** Unit tests and 49-scenario catalogue executed with zero `AttributeError`.

---

### Defect 02: Missing `PLATFORM` Value in `EngineType` Enum
- **Component:** `backend/app/domain/validation_lab.py`
- **Symptom:** `AttributeError: type object 'EngineType' has no attribute 'PLATFORM'`.
- **Root Cause:** `EngineType` enum only enumerated `TRACE`, `AEGIS`, `EVIDENCE_GATEWAY`, `UCM`, `FULL_WORKFLOW`, but the scenario catalogue specified `EngineType.PLATFORM` for platform and security scenarios (P07–P10).
- **Resolution:** Added `PLATFORM = "PLATFORM"` to `EngineType` enum in `backend/app/domain/validation_lab.py`.
- **Verification:** All 12 platform scenarios (P01–P12) admitted and executed cleanly.

---

### Defect 03: JPEG Metadata Dropping Embedded Receipt Text in Recompressed Fixtures (T04)
- **Component:** `backend/app/services/scenario_catalogue_service.py` & `backend/app/adapters/trace_payment_forensics.py`
- **Symptom:** Scenario T04 (WhatsApp JPEG Recompressed) failed with:
  `Amount mismatch: Expected 25000.0, got 15000.0; UTR mismatch: Expected 412356789012, got 202602148891`.
- **Root Cause:**
  1. `scenario_catalogue_service.py` saved PNG receipts using `pnginfo` text chunks, but when `recompress_quality=65` was passed, PIL saved as JPEG, silently dropping PNG `pnginfo`.
  2. Without metadata text chunks, `trace_payment_forensics.py` fell back to generic offline mock text containing default `₹15,000`.
  3. `trace_payment_forensics.py` only checked capitalized `Comment`, but Pillow stores JPEG COM markers under lowercase `comment` bytes.
- **Resolution:**
  1. Updated `scenario_catalogue_service.py` to pass `comment=corpus.encode("utf-8")` when saving JPEG format.
  2. Updated `trace_payment_forensics.py` to inspect `pil_img.info.get("comment")` and decode bytes into UTF-8 text.
- **Verification:** Scenario T04 passed cleanly with exact amount `25000.0` and UTR `412356789012`.

---

### Defect 04: Volatile Timestamps Causing Spurious Drift in Deterministic Replay
- **Component:** `scripts/reproduce_validation_run.py`
- **Symptom:** Deterministic replay script reported `DRIFT_DETECTED` on scenarios T07, T08, and A01 despite identical input bytes.
- **Root Cause:** Substantive forensic conclusions (discrepancy delta, anomaly score, hypotheses) were 100% identical, but `clean_out` included `reconciled_at_iso: datetime.now().isoformat()` and distinct session/case IDs (`CASE-REPRO-1` vs `CASE-REPRO-2`), causing SHA-256 fingerprint divergence.
- **Resolution:** Implemented `canonicalize_forensic_output()` which extracts substantive forensic observations, numbers, verdicts, and extractions, stripping volatile runtime timestamps.
- **Verification:** `scripts/reproduce_validation_run.py` demonstrated `100% REPRODUCIBLE (PASS)` with **0.0000 drift delta** across all evaluated scenarios.

---

### Defect 05: Pytest Collection Warnings on Validation Domain Classes
- **Component:** `backend/app/domain/validation_lab.py`
- **Symptom:** Pytest emitted `PytestCollectionWarning: cannot collect test class 'TestCategory'`, `'TestStatus'`, `'TestCase'`.
- **Root Cause:** Pytest automatically attempts to discover any class starting with `Test...` as a unit test suite.
- **Resolution:** Added `__test__ = False` attribute to `TestCategory`, `TestStatus`, and `TestCase` in `backend/app/domain/validation_lab.py`.
- **Verification:** Pytest suite runs with zero test collection warnings.

---

### Defect 06: TypeScript `verbatimModuleSyntax` and Unused Variable Errors in Frontend Build
- **Component:** `frontend/src/components/tarka/validation/FounderValidationLab.tsx` & `frontend/src/api/validationLabApi.ts`
- **Symptom:** `npm --prefix frontend run build` failed with `TS1484: ... is a type and must be imported using a type-only import` and `TS6133: 'loading' is declared but never read`.
- **Root Cause:** TypeScript project is configured with `verbatimModuleSyntax` and strict no-unused-locals flags.
- **Resolution:**
  1. Converted DTO imports to `import type { ... }`.
  2. Cleaned unused icon imports (`ShieldCheck`, `FileText`, `Clock`, `Lock`).
  3. Added `expected_behaviour?: string;` to `TestCaseDto` in `validationLabApi.ts`.
  4. Wired `loading` indicator into UI state.
- **Verification:** `npm --prefix frontend run build` completed cleanly in 1.93s (`dist/index.html` 1.16 kB).

---

## 3. Summary of Failure Register Status

All identified defects have been resolved, verified with automated unit tests, and sealed under version control. Zero known regressions exist in the working tree.
