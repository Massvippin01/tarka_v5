# TARKA PHASE 16 — BASELINE & COMPLETE SYSTEM INVENTORY AUDIT
**Document Identifier:** `PHASE16_BASELINE_AUDIT.md`  
**Authority:** Principal Forensic Systems Architect, Digital Forensics Lead, Independent Validation Reviewer  
**Audit Date:** 2026-11-25  
**Current Git Branch:** `fix/ci-post-merge-repair`  
**Git HEAD Commit:** `3f6583f` (`chore: integrate TARKA improvements and prepare final demo`)  
**Working Tree Status:** Clean  

---

## 1. Executive Summary

In accordance with Workstream 1 of TARKA Phase 16, a complete, rigorous forensic audit of the entire TARKA × SENTINELX codebase was performed. Documentation claims, previous agent reports, and theoretical designs were set aside to evaluate **executable repository reality**.

Every subsystem was inspected, executed, and classified across six canonical integrity tiers:
- **A. Fully implemented and end-to-end verified**
- **B. Implemented but not end-to-end integrated**
- **C. Partially implemented**
- **D. Design or placeholder only**
- **E. Mock or hardcoded**
- **F. Broken**

---

## 2. Comprehensive Subsystem Inventory & Classification

| # | Subsystem | Classification | Primary Source Paths | Verified API Routes | Backing Tables / Stores | Key Worker / Engine Functions | Verified Test Coverage |
| :- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **UCM (Universal Case Model)** | **B** | `backend/app/domain/universal_case_model.py`<br>`backend/app/domain/ucm_adapter.py` | Mounted via `case_router`<br>`/api/v1/cases` | Pydantic v2 schemas<br>`CaseModel`<br>`CaseStore` JSON | `UCMAdapter.case_to_ucm`<br>`UCMAdapter.db_case_to_ucm` | `test_phase1_universal_case_model.py` (5 tests pass) |
| 2 | **TRACE (Forensic Engine)** | **A** | `backend/app/adapters/trace_engine.py`<br>`backend/app/adapters/trace_payment_forensics.py` | `/api/v1/forensics/cases/{id}/trace/reconcile`<br>`/api/v1/forensics/cases/{id}/artifacts/{id}/examination` | `backend/data/cases/{id}/trace/`<br>CAS bitstream | `TraceEngine.examine_screenshot_receipt`<br>`TracePaymentForensics.examine_screenshot` | `test_phase10_multimodal_payment_forensics.py` (12 tests pass) |
| 3 | **AEGIS (Reasoning Engine)** | **A** | `backend/app/adapters/aegis_gateway.py`<br>`backend/app/adapters/aegis_reasoning_engine.py` | `/api/v1/forensics/cases/{id}/hypotheses`<br>`/api/v1/forensics/cases/{id}/contradictions` | `data/cases/{id}/runs/`<br>`AnalysisRun` | `AegisReasoningEngine.evaluate_case_hypotheses`<br>`AegisGateway.analyze_payment_discrepancy` | `test_phase10_multimodal_payment_forensics.py` |
| 4 | **TXBENCH** | **A** | `scripts/benchmarks/run_txbench_v02.py`<br>`scripts/benchmarks/run_txbench_v03.py` | CLI / Script / API Test suite | `data/cases/txbench_v02/`<br>`data/cases/txbench_v03/` | `TXBenchEvaluator.evaluate_all`<br>`ConfusionMatrix` | `test_phase11_real_world_validation.py` (10 tests pass) |
| 5 | **Evidence Ingestion & CAS** | **A** | `backend/app/adapters/universal_evidence_gateway.py`<br>`backend/app/services/streaming_upload_service.py` | `/api/v1/forensics/cases/{id}/ingest`<br>`/api/v1/forensics/cases/{id}/evidence/upload`<br>`/evidence/upload-sessions` | `data/cases/{id}/cas/`<br>`data/cases/{id}/evidence/raw/` | `UniversalEvidenceGateway.stream_incoming_file_to_cas`<br>`StreamingUploadService.append_chunk` | `verify_founder_evidence_ingestion.py`<br>Gate 1 validation |
| 6 | **OCR & Document Processing** | **C** | `backend/tarka/ocr/extractor.py`<br>`backend/tests_tarka/tarka/ocr/extractor.py` | Called during async worker processing | Local ONNX weights:<br>`ch_PP-OCRv4_det_infer.onnx`<br>`ch_PP-OCRv4_rec_infer.onnx` | `OCRExtractor.extract_from_bytes`<br>`extract_candidate_financial_fields` | Gate 2 validation<br>*Defect flagged in fallback* |
| 7 | **Transaction Parsers** | **A** | `backend/tarka/parsers/bank_upi.py`<br>`backend/app/adapters/format_parser_registry.py` | `/api/v1/forensics/cases/{id}/ingest` | Structured observation dicts | `BankUPIParser.parse_csv`<br>`FormatParserRegistry.parse` | `test_phase10_multimodal_payment_forensics.py` |
| 8 | **Entity Resolution** | **B** | `backend/tarka/core/entity_resolution.py`<br>`backend/app/services/layered_entity_resolution.py` | `/api/v1/resolution/matches/{id}`<br>`/api/v1/resolution/resolve` | `EntityModel`<br>`RelationshipModel` | `LayeredEntityResolution.match_candidates`<br>Rule 5 Invariant enforcer | `test_resolution.py` |
| 9 | **Hypothesis Management** | **A** | `backend/tarka/solver/hypotheses.py`<br>`backend/app/services/hypothesis_service.py` | `/api/v1/forensics/cases/{id}/hypotheses` | `AnalysisRun`<br>`data/cases/{id}/runs/` | `HypothesisSolver.generate_ach_matrix`<br>`AegisReasoningEngine` | `test_hypotheses.py`<br>Gate 4 validation |
| 10 | **Provenance & Custody** | **A** | `backend/app/domain/provenance.py`<br>`backend/tarka/core/provenance_dag.py` | `/api/v1/forensics/cases/{id}/provenance-dag`<br>`/artifacts/{id}/verify` | `data/cases/{id}/custody.db`<br>`custody_events.jsonl` | `ProvenanceDAGBuilder.build_dag`<br>`CaseStore.verify_artifact_integrity` | `test_tarka_e2e_investigation_workflow.py` (7 tests pass) |
| 11 | **Job Orchestration & SSE** | **A** | `backend/app/services/forensic_job_orchestrator.py` | `/api/v1/forensics/cases/{id}/events/stream`<br>`/cases/{id}/jobs/{id}` | In-memory job dict & persistent state | `ForensicJobOrchestrator.create_job`<br>`update_job_stage`<br>`publish_event` | Tested via SSE live stream |
| 12 | **Cross-Case Intelligence** | **B** | `backend/app/api/intelligence.py`<br>`backend/app/api/explorer.py` | `/api/v1/explorer/graph`<br>`/api/v1/intelligence/insights` | Graph projection & relational DB | `ExplorerService.get_full_graph`<br>`IntelligenceEngine` | Case tenancy filter tests |
| 13 | **Report Generation** | **A** | `backend/app/api/forensics_api.py`<br>`backend/tarka/core/forensic_report.py` | `/api/v1/forensics/cases/{id}/reports`<br>`/reports/{id}/export`<br>`/reports/{id}/verify` | `data/cases/{id}/reports/`<br>ReportLab PDF binary | `ForensicReportGenerator.generate_report`<br>`verify_statutory_report` | `test_05_statutory_section_63_bsa_report_generation` |
| 14 | **Investigator Workspace** | **A** | `frontend/src/components/tarka/TarkaForensicWorkstation.tsx` | UI routes rendered on `http://127.0.0.1:5173` | React state, context & browser storage | `TarkaForensicWorkstation`<br>`EvidenceRegister`<br>`VisualForensicsViewer` | Live browser & Vite production build |
| 15 | **Auth & Case Isolation** | **A** | `backend/app/api/forensics_api.py`<br>`backend/app/services/auth_service.py` | `/api/v1/forensics/auth/session` | JWT Bearer Tokens<br>Tenancy validation | `AuthService.enforce_case_access`<br>`AuditService.record_event` | `test_security.py` |

---

## 3. Critical Defects & Remediation Targets Identified

1. **OCR Engine Mock Fallback (Violates Rule 7):**
   - *File:* `backend/tarka/ocr/extractor.py` (lines 174–201) and `backend/tests_tarka/tarka/ocr/extractor.py`.
   - *Defect:* If neither PaddleOCR nor RapidOCR is loaded, the code falls back to hardcoded dummy text ("Payment Successful", "₹15,000", "202602148891").
   - *Remediation:* Eliminate the hardcoded fallback completely. If OCR engine fails or is uninitialized, return an explicit error state (`EMPTY_EXTRACTION` / `ENGINE_UNAVAILABLE`) with zero tokens. Never fabricate text.

2. **Ingestion Pipeline Divergence (Workstream 3):**
   - *File:* `backend/app/api/forensics_api.py` (`upload_case_evidence`).
   - *Defect:* The single-file upload endpoint (`/api/v1/forensics/cases/{case_id}/evidence/upload`) extracted observations synchronously and skipped the unified asynchronous job orchestrator (`run_worker_analysis`).
   - *Remediation:* Unify single-file upload to dispatch through the canonical asynchronous job orchestrator, ensuring all ingestion entry points trigger the exact same 15-stage lifecycle.

3. **UCM Persistence Integration (Workstream 2):**
   - *File:* `backend/app/adapters/tarka_forensics_adapter.py`.
   - *Defect:* Artifacts and observations were persisted in filesystem `CaseStore`, but not consistently mirrored into the relational `UniversalCase` / `UniversalEvidence` database models.
   - *Remediation:* Wire `UCMAdapter` inside `CaseStore` ingestion and observation hooks so every evidence item and observation generates canonical UCM records.

4. **Empty Reports File Stub:**
   - *File:* `backend/app/api/reports.py` (0 bytes).
   - *Defect:* An unmounted empty file left in the repository.
   - *Remediation:* Cleanly document or archive the stub; confirm all statutory reporting is canonically served through `forensics_api.py`.
