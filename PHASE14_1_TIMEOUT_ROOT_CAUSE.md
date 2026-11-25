# PHASE 14.1 — TIMEOUT & INGESTION FAILURE ROOT CAUSE REPORT
## TARKA × SENTINELX FORENSIC RECONSTRUCTION

**Date:** 2026-11-24  
**Evaluator:** Principal Forensic Systems Architect & Performance Lead  
**Governing Principle:** *AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.*  
**Reproduction Script:** `scripts/validation/reproduce_timeouts.py`  
**Empirical Log:** `data/phase14_1_timeout_profiler_results.json`

---

## 1. EMPIRICAL REPRODUCTION SUMMARY

To scientifically isolate where ingestion timeouts and socket failures occur, five evidentiary tiers were tested through the actual HTTP API (`POST /cases/{case_id}/ingest`):

| Tier | File Type | Actual Size | HTTP Status | Duration | Throughput | Failure Layer & Observations |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **1. Small Raster** | `bench_small.png` | 10,248 B | `201 Created` | **1.946s** | 0.01 MB/s | **Synchronous OCR blocking:** 10KB file took ~2s because `ImageParser` ran RapidOCR inference synchronously inside the HTTP handler. |
| **2. 10 MB Binary** | `bench_10mb.bin` | 10,485,760 B | `201 Created` | **0.479s** | 20.89 MB/s | Passed; fast I/O on local NVMe disk. |
| **3. 100 MB Binary**| `bench_100mb.bin` | 104,857,600 B | `201 Created` | **3.304s** | 30.27 MB/s | Passed; approaching typical mobile HTTP upload latency boundaries. |
| **4. 500 MB Binary**| `bench_500mb.bin` | 524,288,000 B | `201 Created` | **30.493s** | 16.40 MB/s | **HTTP Client / Proxy Timeout Danger:** Request took >30 seconds. Standard browser/reverse proxy timeouts (30s) will drop connection. |
| **5. 1 GB Binary**  | `bench_1gb.bin` | 1,073,741,824 B | **`0 FAILED`** | **10.715s** | — | **FATAL TRANSPORT CRASH: Winsock Buffer Exhaustion (`WinError 10055`).** Sockets ran out of buffer space; connection aborted before completion. |

---

## 2. EXHAUSTIVE ROOT CAUSE MATRIX ACROSS SYSTEM LAYERS

```mermaid
flowchart TD
    subgraph ClientLayer[1. Browser / Client Layer]
        C1[Monolithic Multipart Upload] -->|Sends 1GB+ in Single Request| C2[Socket Buffer Overflow]
        C3[Fetch / Axios Timeout] -->|Drops after 30s-60s| C4[HTTP Connection Aborted]
    end

    subgraph TransportLayer[2. Network & OS Layer]
        T1[Windows Winsock Driver] -->|AFD.sys buffer saturation| T2[WinError 10055: Queue Full]
    end

    subgraph AppServerLayer[3. FastAPI / Uvicorn Server Layer]
        A1[Starlette MultiPartParser] -->|Spools 500MB+ to SpooledTemporaryFile| A2[Excessive Disk & Memory Thrashing]
        A3[Legacy Upload Endpoint] -->|`await file.read()` in RAM| A4[RAM Exhaustion / 100MB Hardcoded Limit]
    end

    subgraph ForensicPipeline[4. Forensic Processing Layer]
        P1[UniversalGateway.stream_to_cas] -->|Calls `parser_registry.parse_file`| P2[Synchronous RapidOCR / PDF Extraction]
        P2 -->|Blocks HTTP Response Thread| P3[Investigator Browser Hangs]
    end

    C2 --> T2
    C1 --> A1
    A1 --> P1
    P3 --> C3
```

### Layer 1: Forensic Processing Coupled with Ingestion (Priority 1 Violation)
- **Defect:** `UniversalEvidenceGateway.stream_incoming_file_to_cas` (lines 337-338) directly called `self.parser_registry.parse_file(final_dest)` within the incoming file stream loop.
- **Impact:** When an image, PDF, or spreadsheet was uploaded, `FormatParserRegistry` invoked `OCRExtractor` and ran multi-second CPU-bound text recognition **synchronously before returning the HTTP response**. Even for a 10KB PNG screenshot, the HTTP request took ~2 seconds. If an investigator uploaded 5 high-resolution phone screenshots, the HTTP connection hung for 8–12 seconds, resulting in client timeouts.
- **Constitutional Principle:** Ingestion must strictly admit, hash, and persist raw bytes to CAS; forensic analysis must occur asynchronously in background workers.

### Layer 2: Transport & OS Socket Buffer Exhaustion (`WinError 10055`)
- **Defect:** Monolithic HTTP `multipart/form-data` requests stream unchunked gigabyte payloads over a single TCP socket stream.
- **Impact:** On Windows operating systems, the `ancillary function driver` (`afd.sys`) maintains non-paged pool memory for socket transmit/receive buffers. Sending a single monolithic 1GB+ payload saturates socket buffer queues, raising:
  `[WinError 10055] An operation on a socket could not be performed because the system lacked sufficient buffer space or because a queue was full`.
- **Solution:** Large files must NEVER be transferred as monolithic single-request POSTs. They must be split into bounded chunks (8 MiB chunks) via a resumable protocol (tus 1.0.0).

### Layer 3: Monolithic Request Latency & Reverse Proxy Timeouts
- **Defect:** A 500MB monolithic upload required **30.493 seconds** over loopback, and would take several minutes over WAN/internet connections.
- **Impact:** Standard corporate firewalls, AWS ALBs, Nginx reverse proxies, Cloudflare, and browser HTTP clients terminate HTTP connections that remain open for longer than 30 to 60 seconds with `504 Gateway Timeout` or `ECONNRESET`.
- **Solution:** By transmitting in 8 MiB chunks, each individual HTTP request completes in < 100ms, entirely eliminating reverse proxy and HTTP client timeouts.

### Layer 4: Legacy Endpoint Memory Buffering (`await file.read()`)
- **Defect:** The legacy route `@router.post("/cases/{case_id}/evidence/upload")` had `file_bytes = await file.read()` and `if len(file_bytes) > 100 * 1024 * 1024: raise ValueError(...)`.
- **Impact:** Attempting to upload any file larger than 100MB via this endpoint threw a 400/500 error or consumed 500MB+ of heap memory.
- **Solution:** Deprecate and route all evidence uploads through the streaming CAS pipeline and chunked upload session manager.

---

## 3. REMEDIATION MANDATES

1. **Decouple Ingestion from Analysis (Priority 1):** Remove `parse_file` from `stream_incoming_file_to_cas`. Ingestion only validates headers, hashes, writes to CAS, creates an asynchronous job, and returns HTTP 201/202 promptly (< 50ms).
2. **Resumable Chunked Protocol (Priority 2):** Enforce 8 MiB chunking for all files > 10 MB. Support upload session creation, chunk appending, SHA-256 validation, and pause/resume.
3. **Durable Worker Queue (Priority 3):** Background workers execute OCR and TRACE asynchronously, emitting real-time SSE events with `Last-Event-ID` replay.
4. **Reproducible Gigabyte Corpus (Priority 4):** Upgrade generator to support `--target-gb 1` up to `10` with deterministic mixed formats.
5. **Automated Upload Tool (Priority 5):** Build `scripts/validation/upload_corpus.py` utilizing the chunked public API to prove multi-gigabyte ingestion.
