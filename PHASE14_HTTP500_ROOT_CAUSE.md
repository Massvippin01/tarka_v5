# TARKA × SENTINELX — PHASE 14 ROOT CAUSE ANALYSIS
## Diagnostic Report: Evidence Ingestion HTTP 500 & Artifact Examination Failure

**Date:** 2026-11-24  
**Severity:** CRITICAL (Ingestion Blocker)  
**Target Case:** `upi_payment_discrepancy`  
**Endpoints Affected:**
1. `POST /api/v1/forensics/cases/{case_id}/ingest`
2. `GET /api/v1/forensics/cases/{case_id}/artifacts/{artifact_id}/examination`
3. `GET /api/v1/forensics/cases/{case_id}/events/stream`

---

### 1. Incident 1: HTTP 500 on Evidence Ingestion

#### A. Failing Request
- **Method:** `POST`
- **URI:** `/api/v1/forensics/cases/upi_payment_discrepancy/ingest`
- **Headers:** `Content-Type: multipart/form-data; boundary=...`, `Authorization: Bearer <JWT>`
- **Body:** Multi-file form data (`files`, `tz=Asia/Kolkata`, `append_to_custody=true`)
- **Caller:** `frontend/src/components/tarka/EvidenceIntakeModal.tsx` via `forensicsApi.ingestEvidenceFiles(caseId, selectedFiles, timezone)`

#### B. Full Backend Stack Trace
```text
INFO: 127.0.0.1:17585 - "POST /api/v1/forensics/cases/upi_payment_discrepancy/ingest HTTP/1.1" 500 Internal Server Error
ERROR: Exception in ASGI application
Traceback (most recent call last):
  File "uvicorn/protocols/http/httptools_impl.py", line 421, in run_asgi
  File "uvicorn/middleware/proxy_headers.py", line 56, in __call__
  File "fastapi/applications.py", line 1054, in __call__
  File "starlette/applications.py", line 123, in __call__
  File "starlette/middleware/errors.py", line 186, in __call__
  File "starlette/middleware/cors.py", line 148, in simple_response
  File "starlette/routing.py", line 72, in app
    response = await func(request)
  File "fastapi/routing.py", line 191, in run_endpoint_function
    return await dependant.call(**values)
  File "C:\PROJECTS\SentinelX\backend\app\api\forensics_api.py", line 432, in ingest_case_evidence
    res = await ingest_evidence_files(
TypeError: ingest_evidence_files() missing 1 required positional argument: 'request'
```

#### C. Root Cause Diagnosis
In `backend/app/api/forensics_api.py` lines 421-438:
```python
@router.post("/cases/{case_id}/ingest", tags=["Evidence Ingestion"])
async def ingest_case_evidence(
    case_id: str,
    files: List[UploadFile] = File(...),
    tz: str = Form("Asia/Kolkata"),
    append_to_custody: bool = Form(True),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    ...
    from tarka.api.server import ingest_evidence_files
    res = await ingest_evidence_files(
        files=files,
        tz=tz,
        case_id=case_id,
        append_to_custody=append_to_custody,
    )
    return res.model_dump() if hasattr(res, "model_dump") else res
```
In `backend/tarka/api/server.py`, the target function signature is:
```python
async def ingest_evidence_files(
    request: Request,
    files: List[UploadFile] = File(...),
    tz: str = Form("Asia/Kolkata"),
    case_id: str = Form("workspace"),
    append_to_custody: bool = Form(True),
) -> IngestResponse:
```
`request` was declared as a required first positional argument, but `ingest_case_evidence` did not receive `request: Request` from FastAPI nor pass it to `ingest_evidence_files`. Python threw a `TypeError`, which Starlette translated into an unhandled HTTP 500.

Furthermore, `ingest_evidence_files` in `tarka.api.server` was an obsolete demonstration function:
- It read all file bytes into memory (`data = await upload.read()`).
- It enforced a hardcoded 10MB limit (`if len(data) > MAX_UPLOAD_BYTES: raise HTTPException(400)`).
- It did NOT register files in the case's canonical `ArtifactStore` / CAS.
- It did NOT trigger async background processing or emit SSE events.

---

### 2. Incident 2: HTTP 500 on Artifact Examination

#### A. Failing Request
- **Method:** `GET`
- **URI:** `/api/v1/forensics/cases/upi_payment_discrepancy/artifacts/ART-004-BCCD4200/examination`
- **Caller:** `frontend/src/components/tarka/EvidenceRegister.tsx`

#### B. Full Backend Stack Trace
```text
INFO: 127.0.0.1:12779 - "GET /api/v1/forensics/cases/upi_payment_discrepancy/artifacts/ART-004-BCCD4200/examination HTTP/1.1" 500 Internal Server Error
Traceback (most recent call last):
  File "C:\PROJECTS\SentinelX\backend\app\adapters\tarka_forensics_adapter.py", line 1269, in examine_screenshot_artifact
    return self.trace_payment_engine.examine_screenshot(content, art.filename)
AttributeError: 'str' object has no attribute 'filename'
```

#### C. Root Cause Diagnosis
In `backend/app/adapters/tarka_forensics_adapter.py` lines 1261-1270:
```python
def examine_screenshot_artifact(self, case_id: str, artifact_id: str) -> Dict[str, Any]:
    content, _, art = self.get_artifact_bytes(case_id, artifact_id)
    if not content:
        raise KeyError(f"Artifact '{artifact_id}' not found in case '{case_id}'")
    return self.trace_payment_engine.examine_screenshot(content, art.filename)
```
`get_artifact_bytes()` returns a 3-tuple `Tuple[bytes, str, str]`:
`(raw_bytes, artifact.mime_type or "application/octet-stream", artifact.filename)`.
The third element `art` is already the filename string (`str`), NOT an object with a `.filename` attribute. Accessing `art.filename` raised `AttributeError: 'str' object has no attribute 'filename'`.

Additionally:
`ART-004-BCCD4200` is a JSON file (`screenshot_claim.json`), not an image. The examination endpoint did not check media types before invoking the image analysis engine, nor did it handle non-image artifacts gracefully.

---

### 3. Incident 3: SSE 401 Rejection on Real-Time Event Stream

#### A. Failing Request
- **Method:** `GET`
- **URI:** `/api/v1/forensics/cases/upi_payment_discrepancy/events/stream?token=...`
- **Caller:** Browser `EventSource` in `frontend/src/api/forensicsApi.ts`

#### B. Root Cause Diagnosis
Standard browser `EventSource` cannot set arbitrary HTTP headers such as `Authorization: Bearer <JWT>`. The frontend passes the token as a query parameter:
`?token=${encodeURIComponent(token)}`
However, `get_current_user()` in `backend/app/api/forensics_api.py` only looked at `authorization: Optional[str] = Header(None)`. When the header was missing, it immediately raised HTTP 401 UNAUTHORIZED, terminating the event stream.

In addition, `stream_case_events` did not inspect the `Last-Event-ID` header, preventing event replay upon client reconnection.

---

### 4. Required Repairs

1. **Unify Ingestion Architecture:**
   - Route `POST /cases/{case_id}/ingest` and `POST /cases/{case_id}/evidence/multimodal-upload` to a unified `UniversalEvidenceGateway`.
   - Store incoming evidence immutably in CAS.
   - Stream byte uploads with bounded memory, calculating SHA-256 in a rolling hash buffer.
   - Return clear `ACCEPTED`, `PARSED`, or `ANALYSED` statuses.
   - Reject unhandled exceptions; return clean structured errors (`UNSUPPORTED_FORMAT`, `PARSER_NOT_AVAILABLE`).

2. **Fix `examine_screenshot_artifact`:**
   - Unpack `content, mime_type, filename = self.get_artifact_bytes(case_id, artifact_id)`.
   - Validate that `mime_type.startswith("image/")` or `filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".tiff", ".bmp"))`.
   - If not an image, return structured non-image status instead of failing.

3. **Support Query Parameter Token & `Last-Event-ID` in SSE:**
   - Allow authentication via `token` query param for SSE streams.
   - Forward `Last-Event-ID` header into `sse_event_stream()` for reliable event replay.
