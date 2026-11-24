# TARKA × SENTINELX — PHASE 14 ARCHITECTURAL GAP ANALYSIS
## Architectural Shortfalls, Pipeline Decoupling & Modernisation Blueprint

**Date:** 2026-11-24  
**Scope:** Ingestion, Streaming, Event Delivery, Background Workers, Format Parsers & Scalability  
**Governing Principle:** CORRECTNESS → EVIDENCE → SECURITY → REPRODUCIBILITY → OBSERVABILITY → RECOVERY → PERFORMANCE → CONVENIENCE

---

### 1. Gap Summary Matrix

| Domain | Existing Implementation | Architectural Flaw | Required Phase 14 State |
|---|---|---|---|
| **Intake Routing** | Split between `/cases/{case_id}/ingest` (legacy) and `/evidence/multimodal-upload` | UI called legacy endpoint which bypassed CAS and failed with `TypeError` | Single unified intake gateway backing both endpoints with CAS registration |
| **Memory Management** | `await upload.read()` / `f.read()` loads full file into RAM | Crashes with OOM on multi-gigabyte uploads (1GB–5GB); violates Gate B | Streaming chunked intake with bounded memory (64KB–1MB chunk buffers) |
| **Resumable Uploads** | Monolithic single-request POST; no chunking or resume capability | Network interruption or browser refresh loses all progress | Chunked resumable intake session with offset verification and atomic finalisation |
| **Format Handling** | Whitelist limited to 6 formats; raises `IngestionSecurityError` on anything else | Returns HTTP 400/500 on valid documents (DOCX, audio, video, opaque bins) | Tri-state model: `ACCEPTED` (CAS stored), `PARSED`, `ANALYSED`; safe quarantine for opaque files |
| **Background Processing** | Synchronous worker thread spawned inside request | Worker thread death loses job; no lease, no dead-letter queue | Persistent durable job queue, worker leases, heartbeats, and crash recovery |
| **Real-Time SSE** | SSE route rejected `?token=` query param; ignored `Last-Event-ID` | 401 on EventSource connection; no event replay on reconnection | Query-token auth support; full event journal replay via `Last-Event-ID` |
| **UI Integration** | Separate `EvidenceIntakeModal` and `MultimodalInbox`; no drag-and-drop in main view | Investigator must click secondary modals; errors masked as generic toasts | Native drag-and-drop intake banner on `EvidenceRegister`, real-time progress bars |
| **Artifact Inspection** | `art.filename` typo caused HTTP 500 on non-image artifact examination | Crash when clicking non-image artifacts in UI | Type-aware artifact inspection returning format-specific preview schemas |

---

### 2. Deep Dive: Ingestion & Storage Architecture

#### Existing Flow
```
User File 
  → /api/v1/forensics/cases/{case_id}/ingest 
    → ingest_evidence_files() [legacy tarka/api/server.py]
      → await upload.read() [MEMORY BOUNDED TO 10MB]
      → Missing request argument → Crash (500)
```

#### Modernised Phase 14 Flow
```
User File (1KB to 5GB)
  → /api/v1/forensics/cases/{case_id}/ingest (or /evidence/chunked-upload)
    → Authenticated Session & Case Scope Verification (7-factor RBAC)
    → Bounded Streaming Chunk Reader (64KB buffer)
    → Streaming SHA-256 Digest Computation (hashlib.sha256)
    → Storage to CAS Ingestion Staging Tier (atomic disk write)
    → Post-Write Hash Readback Verification (SHA-256 match)
    → Format & Magic-Byte Triage (Universal Parser Registry)
    → Classification: ACCEPTED / PARSED / ANALYSED
    → Registration in Canonical CaseStore & Immutable Custody Ledger
    → Asynchronous Job Dispatch to Durable Job Orchestrator
    → Immediate HTTP 201 Acknowledgement with Evidence ID & Job ID
    → Background Worker Executes Pipeline (TRACE / AEGIS / OCR / Reconciliation)
    → Live Progress Emitted via Authenticated SSE with Event Replay
```

---

### 3. Deep Dive: Tri-State Evidence Lifecycle

Per SentinelX Constitution § 4 (Evidence Integrity):
1. **ACCEPTED:** Original bytes safely preserved in CAS. SHA-256 calculated at intake and verified on disk. Raw bytes immutable.
2. **PARSED:** A supported parser has extracted structured facts, metadata, text regions, or transaction rows.
3. **ANALYSED:** TRACE, AEGIS, or other forensic engines have generated findings, contradiction analyses, or hypotheses.

An unknown or unsupported format (e.g. unknown binary or esoteric media) must NEVER fail with an HTTP 500. It must be safely quarantined, accepted into CAS as `ACCEPTED`, marked `PARSER_NOT_AVAILABLE`, and recorded in custody.

---

### 4. Implementation Plan

- **Step 1:** Fix the two immediate HTTP 500 bugs (`ingest_case_evidence` and `examine_screenshot_artifact`).
- **Step 2:** Build `UniversalEvidenceGateway` in `backend/app/adapters/universal_evidence_gateway.py` supporting streaming, chunked uploads, bounded memory, format classification, and safe CAS storage.
- **Step 3:** Update `backend/app/api/forensics_api.py` to route all intake through `UniversalEvidenceGateway`, add chunked upload endpoints, and fix SSE auth and `Last-Event-ID`.
- **Step 4:** Upgrade `ForensicJobOrchestrator` to support all 14 lifecycle states, worker leases, heartbeats, and recovery.
- **Step 5:** Process the 4 user images for `upi_payment_discrepancy` through the updated pipeline.
- **Step 6:** Build `scripts/validation/generate_gigabyte_corpus.py` and run automated load, stress, and security tests.
