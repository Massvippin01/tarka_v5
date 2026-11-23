# TARKA — MODULE REGISTRY & INVENTORY
## Verified Codebase Map & Component Readiness Matrix

**Document Version:** 1.0.0-PROD  
**Authority:** QA Lead & Chief Architect  
**Classification Standards:**
- `IMPLEMENTED & VERIFIED`: Code exists, executed, and verified via automated test suites.
- `IMPLEMENTED & TESTED`: Code exists with dedicated unit test coverage.
- `BENCHMARK-VALIDATED`: Performance and latency verified under stress workloads.
- `SIMULATED`: Fallback or mock provider active for air-gapped / test environments.
- `PLANNED`: Architectural requirement designed for subsequent roadmap phases.
- `BLOCKED_EXTERNAL_DEPENDENCY`: Complete implementation obstructed by external system/host limitations.

---

## 1. BACKEND FORENSICS CORE (`backend/tarka/core/`)

| Module | Source Path | Responsibilities | Status | Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **Analysis Run** | `backend/tarka/core/analysis_run.py` | Orchestrates forensic analysis cycles and recipe hashes | `IMPLEMENTED & VERIFIED` | `test_tarka_sentinelx_integration.py` |
| **Canonical Fact** | `backend/tarka/core/canonical_fact.py` | Normalized extraction model with UTC epoch and uncertainty | `IMPLEMENTED & VERIFIED` | `test_data05_fingerprint_temporal.py` |
| **Contradiction Analysis**| `backend/tarka/core/contradiction_analysis.py` | Detects logical, financial, and temporal inconsistencies | `IMPLEMENTED & VERIFIED` | `test_data04_integrity.py` |
| **Custody Ledger** | `backend/tarka/core/custody.py` | Immutable evidence custody tracking and transfer logs | `IMPLEMENTED & VERIFIED` | `test_p0_d_evidence_integrity.py` |
| **Evidence DNA** | `backend/tarka/core/evidence_dna.py` | Multi-source artifact fingerprinting and similarity indexing | `IMPLEMENTED & VERIFIED` | `test_golden_case_cross_source.py` |
| **Finding Explanation** | `backend/tarka/core/finding_explanation.py` | Layman 5-point explanation and statutory implications | `IMPLEMENTED & VERIFIED` | `test_tarka_autonomous_demo_e2e.py` |
| **Forensic Report** | `backend/tarka/core/forensic_report.py` | Section 63 BSA certificate generator (JSON/HTML/PDF) | `IMPLEMENTED & VERIFIED` | `test_tarka_voice_persistent_reporting_acceptance.py` |
| **Provenance DAG** | `backend/tarka/core/provenance_dag.py` | Bidirectional byte-to-finding cryptographic lineage graph | `IMPLEMENTED & VERIFIED` | `test_wave3_evidence_reasoning.py` |
| **Timeline Reconstruction**| `backend/tarka/core/timeline_reconstruction.py`| Multi-clock chronological ordering with skew bounds | `IMPLEMENTED & VERIFIED` | `test_data05_fingerprint_temporal.py` |
| **Travel & Kinematics** | `backend/tarka/core/travel.py` | Haversine velocity validation and impossible transit detection | `IMPLEMENTED & VERIFIED` | `test_golden_investigation_acceptance.py` |

---

## 2. FORMAL REASONING & SMT SOLVER CORE (`backend/tarka/solver/`)

| Module | Source Path | Responsibilities | Status | Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **Z3 Builder** | `backend/tarka/solver/z3_builder.py` | Translates canonical facts into Z3 SMT logical assertions | `IMPLEMENTED & VERIFIED` | `test_data04_integrity.py` |
| **Difference Logic** | `backend/tarka/solver/difference_logic.py` | Efficient polynomial-time temporal difference constraints | `IMPLEMENTED & VERIFIED` | `test_tarka_sentinelx_integration.py` |
| **Marco MUS** | `backend/tarka/solver/marco_mus.py` | Computes Minimal Unsatisfiable Subsets for conflict isolation | `IMPLEMENTED & VERIFIED` | `test_tarka_sentinelx_integration.py` |
| **Pairwise Feasibility** | `backend/tarka/solver/pairwise_feasibility.py` | Pairwise verification between conflicting evidence artifacts | `IMPLEMENTED & VERIFIED` | `test_tarka_sentinelx_integration.py` |
| **Skew Inference** | `backend/tarka/solver/skew_inference.py` | Solves multi-device clock drift and network delay boundaries | `IMPLEMENTED & VERIFIED` | `test_data05_fingerprint_temporal.py` |

---

## 3. EVIDENCE ADAPTERS & INTAKE (`backend/tarka/parsers/` & `backend/app/adapters/`)

| Adapter Family | Source Path | Ingest Formats | Status | Verification |
| :--- | :--- | :--- | :--- | :--- |
| **Bank / UPI** | `backend/tarka/parsers/bank_upi.py` | Statement PDFs, UPI JSON logs, CBS transaction exports | `IMPLEMENTED & VERIFIED` | UPI ₹25k vs ₹15k test |
| **CDR / Telecom** | `backend/tarka/parsers/cdr.py` | Excel/CSV tower dumps, CDR manifests, IMEI/IMSI logs | `IMPLEMENTED & VERIFIED` | CDR ingestion suite |
| **WhatsApp Chat** | `backend/tarka/parsers/whatsapp.py` | Text exports with timestamp parsing and attachment links | `IMPLEMENTED & VERIFIED` | WhatsApp parsing suite |
| **EXIF Triage** | `backend/tarka/parsers/exif_triage.py` | JPEG/PNG metadata, GPS geotags, camera serials | `IMPLEMENTED & VERIFIED` | EXIF extraction tests |
| **OCR PDF Engine** | `backend/tarka/ocr/pdf_processor.py`| Scanned PDF receipts, structured bounding box triage | `IMPLEMENTED & TESTED` | Financial OCR suite |
| **TRACE Engine** | `backend/app/adapters/trace_engine.py` | Transaction Reconstruction & Accounting Classification | `PLANNED (Phase 2)` | Target spec defined |
| **AEGIS Gateway** | `backend/app/adapters/aegis_gateway.py` | Autonomous Evidence Gathering & Identity Synthesis | `PLANNED (Phase 2)` | Target spec defined |

---

## 4. STORAGE & SECURITY PLATFORM (`backend/app/`)

| Component | Source Path | Responsibilities | Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **EvidenceByteStore** | `backend/app/storage/` | Abstract CAS contract (streaming SHA-256 chunking) | `IMPLEMENTED & VERIFIED` | Unit tests passed |
| **Filesystem CAS** | `backend/app/storage/filesystem.py` | Deterministic local CAS fallback for air-gapped setups | `IMPLEMENTED & VERIFIED` | 17/17 tests passed |
| **S3 CAS** | `backend/app/storage/s3.py` | Production MinIO/S3 object storage CAS | `BLOCKED_EXTERNAL_DEP` | Host Docker offline |
| **PolicyGateway** | `backend/app/services/policy_gateway.py`| 7-factor authorization engine with OPA integration | `IMPLEMENTED & VERIFIED` | 63/63 tests passed |
| **AuditService** | `backend/app/services/audit_service.py` | Immutable SHA-256 parent-hash chained audit ledger | `IMPLEMENTED & VERIFIED` | Tamper tests passed |
| **AuthService** | `backend/app/services/auth_service.py` | HMAC-SHA256 JWT tokens, JTI validation, Redis blacklist | `IMPLEMENTED & VERIFIED` | RBAC suites passed |

---

## 5. FRONTEND COMMAND STATION (`frontend/src/components/tarka/`)

| Component | Source Path | Visual & Functional Role | Status |
| :--- | :--- | :--- | :--- |
| **TarkaForensicWorkstation** | `frontend/src/components/tarka/TarkaForensicWorkstation.tsx` | Main workspace orchestrator, 22 canonical views | `IMPLEMENTED & VERIFIED` |
| **DemoDirectorModal** | `frontend/src/components/tarka/demo/DemoDirectorModal.tsx` | Autonomous guided tour preflight & countdown | `IMPLEMENTED & VERIFIED` |
| **DemoArrowOverlay** | `frontend/src/components/tarka/demo/DemoArrowOverlay.tsx` | Dynamic SVG animated arrow & spotlight halo | `IMPLEMENTED & VERIFIED` |
| **TarkaMinimalLanding** | `frontend/src/components/tarka/TarkaMinimalLanding.tsx` | Clean landing surface with Fibonacci particle orb | `IMPLEMENTED & VERIFIED` |
| **ContradictionPanel** | `frontend/src/components/tarka/ContradictionPanel.tsx` | Z3 SMT solver conflict viewer & counterfactual lab | `IMPLEMENTED & VERIFIED` |
| **SarvamVoiceModal** | `frontend/src/components/tarka/SarvamVoiceModal.tsx` | Local Web Audio VAD & Indic multilingual TTS | `IMPLEMENTED & VERIFIED` |
| **ForensicReportModal** | `frontend/src/components/tarka/ForensicReportModal.tsx` | Section 63 BSA legal report generator and viewer | `IMPLEMENTED & VERIFIED` |
