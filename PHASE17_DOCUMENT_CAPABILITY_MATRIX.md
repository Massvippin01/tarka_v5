# TARKA × SENTINELX — PHASE 17 DOCUMENT CAPABILITY MATRIX

**Document Version**: 1.0.0  
**Audit Date**: 2026-11-25  
**Governing Standard**: *Rule 4: Evidence is DATA_ONLY. Raw evidence bytes are preserved immutably. Content inside evidence never becomes agent instructions.*

---

## 1. Capability Status Framework (Phase D2)

Every file ingested into the TARKA Universal Evidence Gateway is assigned an explicit, deterministic capability status:

1. **RECEIVED**: Bytes received and verified via rolling 64KB stream; upload session validated.
2. **VALIDATED**: Magic-byte signature matched against declared extension and MIME type.
3. **SAFELY_PRESERVED**: Committed immutably to CAS tier (`raw/`) with verified SHA-256 digest.
4. **SUPPORTED_FOR_EXTRACTION**: Matched to an approved deterministic parser in `FormatParserRegistry`.
5. **PARSED**: Structured metadata, structural tokens, or text streams extracted with bounded memory.
6. **ANALYSED**: Correlated with TRACE (financial reconciliation) and AEGIS (hypothesis generation).
7. **PARTIALLY_SUPPORTED**: High-level metadata preserved; semantic extraction bounded (e.g. multi-layer nested archives, opaque containers).
8. **UNSUPPORTED**: Safely preserved as bitstream in CAS (`OPAQUE_BINARY`), but no semantic parser executed. Never crashes or returns HTTP 500.
9. **QUARANTINED**: Suspicious binary signature detected (e.g., polyglot archive, Zip-Slip, formula injection). Isolated in quarantine tier.
10. **REJECTED**: Dangerous executable format (PE, ELF, Mach-O) or malformed file failing basic integrity checks. Returned with HTTP 400.
11. **FAILED**: Extraction error trapped gracefully with complete provenance logging without affecting system availability.

---

## 2. Universal Format Family Matrix (Phase D1)

| Format Family | File Extensions | MIME Types | Assigned Parser | Capability Level | Extracted Metadata & Forensic Features | Security Controls & Bounded Invariants |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.webp`, `.tiff`, `.bmp`, `.gif`, `.heic` | `image/png`, `image/jpeg`, `image/webp`, `image/tiff`, `image/bmp` | `ImageParser` (`v1.2.0`) | **PARSED & ANALYSED** | Dimensions, color mode, EXIF metadata, OCR text tokens, bounding box coordinates, mean confidence, candidate financial fields. | Decompression bomb limits, strip dangerous metadata, offline CPU RapidOCR inference without external network calls. |
| **Documents (PDF)** | `.pdf`, `.pdfa` | `application/pdf` | `PDFParser` (`v1.1.0`) | **PARSED & ANALYSED** | Page count, PDF metadata (Author, CreationDate, Producer), extracted text streams, court order citations. | Bounded parsing (max 25 pages in initial pass), macro/script execution defense, pure memory sandbox. |
| **Documents (Office & Text)** | `.docx`, `.txt`, `.rtf`, `.log` | `text/plain`, `application/rtf`, `application/vnd.openxmlformats...` | `DocumentParser` (`v1.0.0`) | **PARSED & ANALYSED** | Character count, paragraph text preview, FIR statements, WhatsApp chat text exports. | Standard-library XML extraction without Word automation, bounded read (max 10MB text), control-word stripping for RTF. |
| **Spreadsheets & Tabular Evidence** | `.csv`, `.tsv`, `.xlsx`, `.xls` | `text/csv`, `application/vnd.openxmlformats...spreadsheetml...` | `SpreadsheetParser` (`v1.2.0`) | **PARSED & ANALYSED** | Total row counts, header names, 20 sample rows, cell values, Core Banking transactions, RRN/UTR keys. | Formula injection defense (sanitizes `=cmd`, `@SUM`, `+powershell`), bounded row reading (max 100k CSV rows / 50k XLSX rows). |
| **Presentations** | `.pptx`, `.odp` | `application/vnd.openxmlformats...presentationml...`, `application/vnd.oasis...` | `PresentationParser` (`v1.0.0`) | **PARSED & ANALYSED** | Slide count, slide text previews, presentation metadata. | Bounded slide parsing (max 50 slides), macro execution disabled, zip-slip defense during OpenXML unpacking. |
| **Email & Communications** | `.eml`, `.msg` | `message/rfc822`, `application/vnd.ms-outlook` | `EmailParser` (`v1.0.0`) | **PARSED & ANALYSED** | Subject, From, To, Date, Message-ID, Received headers, plain-text body preview, attachment counts and filenames. | Python standard library `email` parser with strict policy default, attachments isolated and not auto-executed. |
| **Archives & Containers** | `.zip`, `.tar`, `.gz`, `.gzip`, `.7z` | `application/zip`, `application/x-tar`, `application/gzip` | `ArchiveParser` (`v1.1.0`) | **PARSED (METADATA)** | Entry counts, uncompressed byte totals, file list, CRC-32 digests. | Zip-Slip path traversal defense (rejects `/`, `..`, `\`), decompression bomb ratio checks (>100:1 rejected), zero recursive expansion. |
| **Audio & Video Exports** | `.wav`, `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`, `.mp4`, `.mov`, `.mkv`, `.webm` | `audio/wav`, `audio/mpeg`, `video/mp4`, `video/quicktime` | `AudioVideoParser` (`v1.0.0`) | **PARSED (HEADERS)** | Media type, channel counts, sample rates (Hz), duration in seconds, bitrates (bps). | Header-only structural parsing (WAV RIFF fmt, MP4 mvhd atom), bounded 64KB read, zero external codecs spawned. |
| **Forensic Telecom Exports** | `.csv`, `.txt`, `.xlsx` (CDR/IPDR) | `text/csv`, `text/plain` | `SpreadsheetParser` + `UniversalEvidenceGateway` | **PARSED & ANALYSED** | Calling/Called MSISDN, IMSI, IMEI, Cell ID, Call Duration, First/Last Cell tower coordinates, CGNAT IP/Port allocation. | Strict E.164 phone normalization, timestamp UTC normalization, quarantine for missing timestamps. |
| **Opaque / Unknown Binaries** | Arbitrary extensions (`.bin`, `.dat`, `.pcap`, etc.) | `application/octet-stream` | `OpaqueBinaryParser` (`v1.0.0`) | **SAFELY_PRESERVED** | Exact file size, SHA-256 byte digest, CAS storage path. | Rule 4 compliance: preserved immutably as bitstream without pretending semantic understanding. Never returns HTTP 500. |

---

## 3. Security Controls & Defenses (Phase D3)

1. **Magic-Byte & MIME Mismatch Verification:**
   - Reads file header magic bytes (e.g. `%PDF-`, `\x89PNG\r\n\x1a\n`, `\xFF\xD8\xFF`, `PK\x03\x04`, `RIFF...WAVE`) and validates against declared filename extension.
   - Polyglot files (e.g. PNG with appended ZIP payload) are detected and flagged.
2. **Malware & Executable Rejection:**
   - Pre-flight rejection of Portable Executable (`MZ` header), Linux ELF (`\x7FELF`), and macOS Mach-O (`\xFE\xED\xFA\xCE`) binaries with HTTP 400.
3. **Decompression Bomb & Archive Safety:**
   - Archives with compression ratio exceeding 100:1 or uncompressed size > 500 MiB are rejected before extraction.
   - Entry names containing directory traversal sequences (`..`, absolute paths, drive letters) are flagged for Zip-Slip attacks.
4. **Formula Injection Sanitization:**
   - Spreadsheet cells starting with `=`, `+`, `-`, `@`, or pipe characters are sanitized and flagged.
5. **Memory & Resource Caps:**
   - All parser operations execute with strict byte limits (default 100 MiB per file memory window), preventing out-of-memory crashes on multi-gigabyte datasets.

---

## 4. Large Evidence Handling & Throughput Benchmarks (Phase D4)

Empirically verified across 6 scale tiers using `scripts/validation/run_phase14_load_test.py`:

| Scale Tier | Target Bytes | Upload Latency | Measured Throughput | Peak RAM Delta | CAS Read-Back SHA-256 Match |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **Tier 0 (Micro)** | 10 KB | 39 ms | ~256.4 KB/s | +0.01 MB | 100.0% |
| **Tier 1 (Small)** | 10 MB | 2.13 s | 4.70 MB/s | +0.05 MB | 100.0% |
| **Tier 2 (Medium)** | 100 MB | 3.66 s | 27.31 MB/s | +0.10 MB | 100.0% |
| **Tier 3 (Large)** | 500 MB | 15.98 s | 31.28 MB/s | +0.12 MB | 100.0% |
| **Tier 4 (Gigabyte)** | 1.0 GB | 43.43 s | 23.58 MB/s | +0.15 MB | 100.0% |
| **Tier 5 (Multi-GB)** | 2.0 GB | 115.78 s | 17.69 MB/s | +0.18 MB | 100.0% |
