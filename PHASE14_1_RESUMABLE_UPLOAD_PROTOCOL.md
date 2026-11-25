# TARKA × SENTINELX — PHASE 14.1
# RESUMABLE EVIDENCE UPLOAD PROTOCOL SPECIFICATION

**Protocol Version:** TARKA Resumable Upload 1.0 (Tus 1.0.0 Compatible Subset)  
**Standard Chunk Size:** 8 MiB (8,388,608 bytes)  
**Security Clearance:** Section 63 BSA / BNSS Statutory Evidence Admission  

---

## 1. Protocol Architecture & Overview

To eliminate socket buffer overflow, connection resets, and proxy timeouts when investigators ingest multi-gigabyte forensic artifacts, TARKA defines an open, standard-compliant, chunked resumable upload protocol.

The protocol guarantees:
1. **Bounded Socket Footprint**: Transfers occur in strict 8 MiB slices, preventing Windows Winsock non-paged buffer starvation (`WinError 10055`).
2. **Deterministic Resumability**: If a network disconnect occurs mid-upload, the client queries the server's committed byte offset and resumes without retransmitting previously uploaded bytes.
3. **Duplicate Protection**: Transient re-transmissions of identical chunk offsets are detected and idempotently acknowledged without file corruption.
4. **Cryptographic Sealing**: Upon receipt of the final chunk, the server verifies bitstream length, validates SHA-256 against client expectations, and atomically commits the file to CAS storage.

---

## 2. Protocol Wire Specification

### 2.1 Stage 1: Upload Session Creation
The client initiates an upload session by providing metadata and total byte size.

**Request:**
```http
POST /api/v1/forensics/cases/{case_id}/evidence/upload-sessions HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <JWT_INVESTIGATOR_TOKEN>
Content-Type: application/json

{
  "filename": "EVID_BIN_VOLUMETRIC_0001.bin",
  "total_size_bytes": 16777216,
  "mime_type": "application/octet-stream",
  "expected_sha256": "d84126821f8262934bd5ea33c61b8a13c6b5be38de2fffce880701648765acdd",
  "notes": "Seized server memory dump"
}
```

**Success Response (HTTP 201 Created):**
```http
HTTP/1.1 201 Created
Location: /api/v1/forensics/cases/{case_id}/evidence/upload-sessions/sess_up_20261124_faca19b8
Upload-Offset: 0
Tus-Resumable: 1.0.0
Content-Type: application/json

{
  "session_id": "sess_up_20261124_faca19b8",
  "case_id": "case_phase14_validation",
  "filename": "EVID_BIN_VOLUMETRIC_0001.bin",
  "total_size_bytes": 16777216,
  "accepted_offset": 0,
  "bytes_uploaded": 0,
  "chunk_size_bytes": 8388608,
  "status": "UPLOADING",
  "created_at_iso": "2026-11-24T18:20:00.000000+00:00"
}
```

---

### 2.2 Stage 2: Streaming Chunk Transmission
The client sends sequential 8 MiB chunks with the required `Upload-Offset` header.

**Request (Chunk 1: bytes 0 to 8,388,607):**
```http
PATCH /api/v1/forensics/cases/{case_id}/evidence/upload-sessions/{session_id} HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <JWT_INVESTIGATOR_TOKEN>
Content-Type: application/octet-stream
Upload-Offset: 0
Content-Length: 8388608

<binary bytes 0..8388607>
```

**Response (HTTP 200 OK — Partial Chunk Accepted):**
```http
HTTP/1.1 200 OK
Upload-Offset: 8388608
Tus-Resumable: 1.0.0
Content-Type: application/json

{
  "session_id": "sess_up_20261124_faca19b8",
  "accepted_offset": 8388608,
  "bytes_uploaded": 8388608,
  "total_size_bytes": 16777216,
  "status": "UPLOADING"
}
```

---

### 2.3 Stage 3: Final Chunk & CAS Finalization
When the incoming chunk completes the file (`offset + len == total_size_bytes`), the server automatically finalizes the session, admits the artifact into CAS, and dispatches the background processing job.

**Request (Chunk 2: bytes 8,388,608 to 16,777,215):**
```http
PATCH /api/v1/forensics/cases/{case_id}/evidence/upload-sessions/{session_id} HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <JWT_INVESTIGATOR_TOKEN>
Content-Type: application/octet-stream
Upload-Offset: 8388608
Content-Length: 8388608

<binary bytes 8388608..16777215>
```

**Response (HTTP 202 Accepted — Admission Complete & Job Queued):**
```http
HTTP/1.1 202 Accepted
Upload-Offset: 16777216
Tus-Resumable: 1.0.0
Content-Type: application/json

{
  "session_id": "sess_up_20261124_faca19b8",
  "status": "COMPLETED",
  "accepted_offset": 16777216,
  "total_size_bytes": 16777216,
  "artifact": {
    "artifact_id": "ART-20261124182334-D8412682",
    "case_id": "case_phase14_validation",
    "filename": "EVID_BIN_VOLUMETRIC_0001.bin",
    "file_size_bytes": 16777216,
    "sha256": "d84126821f8262934bd5ea33c61b8a13c6b5be38de2fffce880701648765acdd",
    "storage_path": "evidence/raw/ART-20261124182334-D8412682/EVID_BIN_VOLUMETRIC_0001.bin",
    "storage_tier": "raw",
    "file_type": "OPAQUE_BINARY",
    "status": "ACCEPTED"
  },
  "job_id": "JOB-20261124182334-4517"
}
```

---

### 2.4 Stage 4: Querying State & Resuming Interrupted Sessions
If a connection drops unexpectedly, the client reconnects by querying the session status.

**Query Request:**
```http
GET /api/v1/forensics/cases/{case_id}/evidence/upload-sessions/{session_id} HTTP/1.1
Host: 127.0.0.1:8000
Authorization: Bearer <JWT_INVESTIGATOR_TOKEN>
```

**Query Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "session_id": "sess_up_20261124_faca19b8",
  "accepted_offset": 8388608,
  "bytes_uploaded": 8388608,
  "total_size_bytes": 16777216,
  "status": "UPLOADING"
}
```
The client inspects `accepted_offset` (e.g. `8388608`), seeks to that position in the local file, and resumes transmission from chunk 2.

---

## 3. Error Codes & Boundary Matrix

| Condition | HTTP Status | Response Header | Body Detail / Reason |
|---|---|---|---|
| **Offset Mismatch** (Out of sequence chunk) | `HTTP 409 Conflict` | `Upload-Offset: <expected>` | `Offset mismatch: expected 8388608, received 0` |
| **Duplicate Chunk Retransmission** | `HTTP 200 OK` | `Upload-Offset: <current>` | Idempotently ignored; acknowledges current offset |
| **Formula Injection Detected** (`=cmd\|`) | `HTTP 400 Bad Request` | — | `Formula injection / DDE command detected in tabular evidence` |
| **Zero-Byte File Upload** | `HTTP 400 Bad Request` | — | `Total size must be greater than 0 bytes.` |
| **File Exceeds Max Quota (> 10 GB)** | `HTTP 400 Bad Request` | — | `Requested file size exceeds maximum limit of 10.0 GB.` |
| **Corrupted Bitstream (CAS Hash Mismatch)** | `HTTP 400 Bad Request` | — | `CAS Integrity Mismatch: Expected <X> but computed <Y>` |
| **Session Expired / Not Found** | `HTTP 404 Not Found` | — | `Upload session '{id}' not found.` |

---

## 4. Frontend & Client Integration

Both `frontend/src/components/tarka/EvidenceRegister.tsx` and `scripts/validation/upload_corpus.py` implement this protocol:
1. Files $\le 10\text{ MB}$ upload either directly or via 1-chunk sessions.
2. Files $> 10\text{ MB}$ automatically split into $8\text{ MiB}$ chunks.
3. Byte-level progress is tracked and displayed to the investigator in real time.
4. Temporary chunks on the server are unlinked immediately after CAS admission, preventing orphaned `.part` file buildup.
