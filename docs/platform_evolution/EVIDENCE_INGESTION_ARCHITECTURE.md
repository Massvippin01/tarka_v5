# TARKA | MASSIVE EVIDENCE INGESTION ARCHITECTURE
## 10-Stage Explicit Lifecycle, Bounded Buffering, and Storage Isolation

**Implementation:** `backend/app/services/ingestion/large_evidence_engine.py` & `backend/app/api/ingestion_api.py`  
**Frontend UI:** `frontend/src/v6/ui/MassiveEvidenceIntakeModal.tsx`  
**Standard Compliance:** Bharatiya Sakshya Adhiniyam, 2023 (BSA §63) & ISO/IEC 27037  

---

## 1. The 10 Explicit Lifecycle Stages

In forensic science, accepting a byte stream does not equal admitting legal evidence. TARKA transitions every ingested file through ten observable, auditable stages:

```
[1. FILE_RECEIVED]
       │ File handle opened; metadata & officer recorded.
       ▼
[2. UPLOAD_COMPLETED]
       │ All chunks streamed into bounded staging buffer.
       ▼
[3. FILE_VALIDATED]
       │ Magic bytes verified; archive bomb / traversal checked.
       ▼
[4. HASH_CALCULATED]
       │ Chunked incremental 64KB hashing + overall SHA-256 sealed.
       ▼
[5. EVIDENCE_ADMITTED]
       │ Artifact signed into Register; Trust Tier assigned (T1/T2/T3).
       ▼
[6. CONTENT_EXTRACTED]
       │ Text, ledger rows, and entities parsed via bounded workers.
       ▼
[7. CONTENT_INDEXED]
       │ Tokens indexed into case search & investigation memory.
       ▼
[8. ANALYTICAL_PROCESSING_COMPLETED]
       │ Ledger reconciliation, cross-source correlation, IST normalization.
       ▼
[9. RESULTS_VALIDATED]
       │ Z3 SMT solver validates consistency; contradictions flagged.
       ▼
[10. EVIDENCE_AVAILABLE]
       │ Artifact live in case workbench for examiner inspection.
```

---

## 2. Storage Separation & WORM Immutability

TARKA strictly separates ephemeral staging data, immutable raw evidence bytes, and derived analytical projections:

1. **Quarantine Staging Buffer (`data/ingestion/staging/`)**:
   Temporary chunk accumulator on disk. Purged automatically on job cancellation or upon reaching Stage 5.
2. **Canonical Evidence Vault (`data/ingestion/evidence/{case_id}/{artifact_id}/`)**:
   Write-Once-Read-Many (WORM) storage layout. Original raw bytes are preserved byte-for-byte with strict read-only file permissions.
3. **Derived Projections (`data/ingestion/derived/{case_id}/{artifact_id}/`)**:
   Extracted text, normalized transaction CSVs, and graph projections. These derived files are completely rebuildable from the raw evidence vault.

---

## 3. Archive Safety & Decompression Defenses

TARKA protects against malicious archive submissions:
- **Zip Bomb Defense**: Evaluates compression ratio prior to extraction. Archives with an expansion ratio exceeding $10:1$ and total expanded size $> 10\text{ MB}$ are rejected immediately.
- **Directory Traversal Defense**: Rejects any archive entry containing `..` or absolute paths (`/` or `\`).
- **Nesting Limit**: Enforces maximum directory nesting depth of 2 levels.
- **File Count Limit**: Maximum 1,000 files per archive bundle.

