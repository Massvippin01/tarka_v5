# TARKA — RUST/PYTHON SERVICE CONTRACTS & IPC SPECIFICATION
**Document ID:** TARKA-CONTRACTS-2026-V1  
**Protocol Version:** v1.0.0-PROD  
**Classification:** Inter-Process Communication & ABI Interface  

---

## 1. Interface Boundary & Architecture

TARKA decouples performance-critical Rust kernels from Python orchestrators via versioned, validated data contracts. Communication is designed for two deployment topologies:
1. **Direct C-ABI / PyO3 FFI:** Zero-copy in-process shared memory calls.
2. **Local Unix Domain Socket (UDS) / HTTP REST IPC:** Decoupled process isolation for containerized deployments.

---

## 2. Evidence Admission Contract (`v1.admission`)

### 2.1 Inbound Request Schema (`AdmissionRequestV1`)
```json
{
  "api_version": "v1.admission",
  "artifact_id": "ART-2026-8812",
  "case_id": "CASE-2026-001",
  "claimed_mime": "application/pdf",
  "max_byte_limit": 104857600
}
```

### 2.2 Response Schema (`AdmissionResponseV1`)
```json
{
  "api_version": "v1.admission",
  "artifact_id": "ART-2026-8812",
  "sha256_hash": "341e2406d6c560fc...",
  "total_bytes": 10485760,
  "verified_mime": "application/pdf",
  "is_archive": false,
  "archive_security_passed": true,
  "status": "ADMITTED_IMMUTABLE"
}
```

---

## 3. Financial Transaction Stream Contract (`v1.transactions`)

### 3.1 Normalized Transaction Schema
```json
{
  "api_version": "v1.transactions",
  "utr": "UTR2026001428",
  "timestamp": "2026-11-28T12:30:00Z",
  "remitter_account": "mule_1@okaxis",
  "beneficiary_account": "cashout_sink@ybl",
  "amount_inr": 48500.0,
  "is_duplicate": false
}
```

---

## 4. Error Handling & Invariant Enforcement

| Error Code | HTTP Status | Description | Security Action |
|---|---|---|---|
| `ERR_MIME_SPOOF` | 422 Unprocessable | Claimed MIME does not match magic bytes | Reject file; log security audit |
| `ERR_DECOMPRESSION_BOMB` | 413 Payload Too Large | Archive ratio > 100:1 or uncompressed > 500 MB | Quarantine archive; block extraction |
| `ERR_ZIP_SLIP` | 400 Bad Request | Archive path contains `..` or root traversal | Abort job immediately |
| `ERR_FILE_TOO_LARGE` | 413 Payload Too Large | Total stream exceeds configured allocation | Drop socket; release buffer memory |
