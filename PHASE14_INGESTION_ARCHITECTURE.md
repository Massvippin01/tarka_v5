# TARKA × SENTINELX — PHASE 14 INGESTION ARCHITECTURE
## Production-Grade Universal Ingestion, Streaming CAS & Resumable Chunked Upload Protocol

**Date:** 2026-11-24  
**Author:** Principal Forensic Systems Architect  
**Governing Doctrine:** AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.  
**Compliance Standard:** Indian Evidence Act / Section 63 BSA & SentinelX Constitution § 4 (Evidence Integrity)

---

### 1. Ingestion Pipeline Architecture

The Phase 14 Universal Evidence Ingestion Gateway establishes an append-only, bitstream-preserving intake pipeline capable of handling evidence ranging from single-kilobyte receipts up to multi-gigabyte forensic disk images.

```
                              [ INVESTIGATOR UI / CLI CLIENT ]
                                             │
             ┌───────────────────────────────┴───────────────────────────────┐
             │                                                               │
     [ Multipart Upload ]                                          [ Chunked Resumable ]
   POST /cases/{id}/ingest                                    POST /cases/{id}/upload-sessions
             │                                                               │
             ▼                                                               ▼
   [ 7-Factor RBAC Gateway ]                                    [ UploadSessionManager ]
   (Validate token & scope)                                     (Track accepted_offset)
             │                                                               │
             ▼                                                               ▼
   [ Bounded Stream Reader ] ◄───────────────────────────────── [ PATCH .../chunks ]
   (64 KB rolling buffer)                                       (Upload-Offset check)
             │                                                               │
             ├───────────────────────────────┬───────────────────────────────┘
             │                               │
             ▼                               ▼
    [ Streaming SHA-256 ]           [ Temp Storage File ]
    (hashlib.sha256 rolling)        (disk write in chunks)
             │                               │
             ▼                               ▼
    [ Malware / Security ]          [ Stream Exhaustion ]
    (PE MZ, ELF, Polyglot,          (Final byte received)
     Formula Injection, Bomb)                │
             │                               │
             ▼                               ▼
    [ Post-Storage Readback Verification (SHA-256 Match) ]
             │
             ▼
    [ Content-Addressed Storage (CAS) Tier Placement ]
    data/cases/{case_id}/evidence/raw/{artifact_id}/{filename}
             │
             ├───────────────────────────────────────────────────────────────┐
             ▼                                                               ▼
   [ Canonical CaseStore ]                                         [ Immutable Custody Ledger ]
   (Register artifact metadata)                                    (Record SHA-256, officer, time)
             │                                                               │
             └───────────────────────────────┬───────────────────────────────┘
                                             │
                                             ▼
                               [ Background Job Dispatch ]
                               (ForensicJobOrchestrator)
                                             │
                                             ▼
                                [ Authenticated Live SSE ]
                                (Real-time progress stream)
```

---

### 2. Bounded-Memory Streaming Ingestion

To satisfy **Gate B (Large Files 100MB to 5GB)**, the gateway never loads entire files into application memory (`RAM`):

1. **Chunk Buffer Bounding:** Incoming byte streams are ingested in rolling 64 KB buffers (`DEFAULT_CHUNK_SIZE = 65536`).
2. **Streaming Hashing:** The cryptographic hash (`hashlib.sha256`) is updated chunk-by-chunk in memory.
3. **Atomic File Creation:** Bytes are streamed directly into an isolated disk temporary file (`tempfile.NamedTemporaryFile`).
4. **Header Triage:** The initial 512 bytes are peeked for magic-byte verification, executable malware signatures (MZ, ELF, Mach-O, shell scripts), and polyglot markers.
5. **Readback Verification:** Before CAS promotion, the temp file is re-read from disk and its SHA-256 is verified against the intake hash. If any byte was corrupted during I/O, the file is immediately quarantined.
6. **Atomic Move:** The verified file is moved atomically into its final immutable CAS tier:
   `data/cases/{case_id}/evidence/raw/{artifact_id}/{clean_filename}`.

**Measured Memory Footprint:** Bounded under **10 MB** of RAM regardless of whether the incoming file is 100 MB or 5 GB.

---

### 3. Resumable Chunked Upload Protocol (Tus 1.0.0 Compatible)

For unstable network connections, browser interruptions, or multi-gigabyte transfers, Phase 14 implements a stateful chunked upload protocol:

#### 3.1 Endpoint Specifications

| Endpoint | Method | Headers | Description |
|---|---|---|---|
| `/cases/{id}/evidence/upload-sessions` | `POST` | `Authorization` | Initializes upload session with `total_size_bytes` and `filename`. Returns `session_id`, `chunk_size`. |
| `/cases/{id}/evidence/upload-sessions/{sess_id}` | `PATCH` | `Upload-Offset: <bytes>`, `Content-Type: application/offset+octet-stream` | Appends byte chunk at specified offset. Rejects wrong offset with HTTP 409. |
| `/cases/{id}/evidence/upload-sessions/{sess_id}` | `GET` | `Authorization` | Queries current `accepted_offset` and status for pause/resume synchronization. |
| `/cases/{id}/evidence/upload-sessions/{sess_id}` | `DELETE` | `Authorization` | Cancels session and purges partial disk files. |

#### 3.2 Protocol Lifecycle & Invariants

1. **Strict Offset Verification:**
   - If an incoming chunk specifies `Upload-Offset: 10485760` (10 MB), but the server has only accepted `5242880` (5 MB), the request is rejected immediately with **HTTP 409 CONFLICT** and header `Upload-Offset: 5242880`.
   - Prevents file corruption, sparse holes, and out-of-order writes.
2. **Crash & Refresh Durability:**
   - Partial uploads are written to `data/upload_sessions/{session_id}.part`.
   - Metadata is persisted in `data/upload_sessions/{session_id}.meta.json`.
   - If the server restarts or the browser refreshes, the client queries `GET /upload-sessions/{session_id}` and resumes uploading from `accepted_offset`.
3. **Atomic Finalization & Idempotency:**
   - When `accepted_offset == total_size_bytes`, the session manager validates complete bitstream integrity, moves the file into CAS raw evidence, registers the artifact, and returns `status: COMPLETED`.
   - Repeated PATCH requests at `accepted_offset == total_size_bytes` return the already admitted artifact without creating duplicates.
