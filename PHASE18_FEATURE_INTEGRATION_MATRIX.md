# TARKA × SENTINELX — PHASE 18: FEATURE INTEGRATION MATRIX

**Date:** 2026-11-25  
**Scope:** Verification of all Consolidated and Built-in Capabilities across Frontend and Backend Subsystems

---

## 1. Subsystem Capability Matrix

| Feature / Subsystem | Source Branch / Origin | Integration Status | Verification Mechanism | Epistemic / Forensic Rule |
|:---|:---|:---:|:---|:---|
| **Resumable Streaming Intake** | Canonical Wave 14 | Integrated | Verified 100MB–2GB chunking with SHA-256 CAS storage | Append-only raw bytes; SHA-256 bitstream immutable |
| **Offline CPU ONNX RapidOCR** | Canonical Wave 16 | Integrated | Verified on UPI payment screenshots & bank statements | 100% offline; zero cloud token leakage |
| **Universal Case Model (UCM)** | Canonical Wave 12 | Integrated | `UniversalCaseModel` unified cross-engine fixture | Epistemic safety; no automatic identity merges |
| **TRACE Engine** | Canonical Wave 8 | Integrated | `test_03_trace_financial_reconciliation` passed | Deterministic banking reconciliation (Z3 SMT) |
| **AEGIS Epistemic Gateway** | Canonical Wave 8 | Integrated | `test_04_aegis_entity_normalization` passed | Non-guilt principle: AI proposes, human decides |
| **Custom SVG Graph (`GangSvg`)** | Consolidated (`origin/main`) | Integrated | `NetworkSvg.tsx` & `graphLayout.test.ts` passed | Anti-hairball; collision-free labels drawn last |
| **i2 / Maltego / STIX 2.1 Export**| Consolidated (`origin/main`) | Integrated | `/api/v1/cases/{id}/export/*` routes mounted & verified | Interoperable intelligence exchange |
| **Transaction Deduplication** | Consolidated (`origin/main`) | Integrated | Composite key `(account, rrn, amount, ts)` in `derived_store.py` | Eliminates double-counting across overlapping uploads |
| **Bulk Intake Review Board** | Consolidated (`origin/main`) | Integrated | `IntakeReviewBoard.tsx` & `test_ingestion_networks.py` passed | "Files first, cases later" triage holding cases |
| **Actions & Report Redesign (P0)**| Phase 18 Implementation | Integrated | Single financial summary, ranked directives table, BSA §63 PDF | Authoritative 6-stage investigation culmination |
| **Section 63 BSA PDF Generation** | Canonical Wave 10 | Integrated | `/api/v1/forensics/cases/{id}/reports/export` ReportLab export | Cryptographic Merkle Root certificate |
| **Sarvam Voice Dual Engine** | Canonical Wave 7 | Integrated | Offline ONNX + Cloud fallback speech synthesis | Indic language accessibility for station officers |
| **Role-Based Access Control (RBAC)**| Canonical Wave 6 | Integrated | 7-factor RBAC, fail-closed case authorization | Section 7 SentinelX Constitution adherence |

---

## 2. API Endpoint Mounting Status

All routes are mounted and active in `backend/app/main.py`:

```python
# API Routing Setup
app.include_router(case_router, prefix="/api/v1/cases", tags=["Cases"])
app.include_router(networks_router, prefix="/api/v1/cases", tags=["Networks"])
app.include_router(projects_router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(ingestion_router, prefix="/api/v1/ingestion", tags=["Ingestion"])
app.include_router(forensics_router, prefix="/api/v1/forensics", tags=["Forensics"])
app.include_router(voice_router, prefix="/api/v1/voice", tags=["Voice"])
app.include_router(health_router, prefix="/api/v1/health", tags=["Health"])
```

---

## 3. Architectural Boundary & Invariant Assessment

1. **Vite + React + TypeScript:** Maintained without framework migration (adhering to Constitution Rule 2).
2. **Canonical Data Authority:** PostgreSQL for transactions, Neo4j for graphs, S3/Local CAS for evidence bytes (adhering to Constitution Rule 3).
3. **Evidence Integrity:** Append-only CAS bitstream storage, content hashes immutable (adhering to Constitution Rule 4).
4. **Epistemic Principle:** AI proposes, forensic engines test, human decides (adhering to Constitution Rule 5).
