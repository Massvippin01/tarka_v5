# TARKA × SENTINELX — PHASE 14 SUPPORTED FILE FORMATS
## Universal Forensic Format Parser Registry, Media Type Matrix & Safety Policies

**Date:** 2026-11-24  
**Author:** Principal Forensic Systems Architect  
**Governing Doctrine:** AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.  
**Rule 4 Compliance:** Evidence is DATA_ONLY. Raw evidence bytes are immutable.

---

### 1. Tri-State Evidence Lifecycle Model

Per Section 1.1 of Phase 14 specifications, every submitted file transitions through three explicit capabilities:

1. **ACCEPTED:** Original bytes safely preserved in Content-Addressed Storage (CAS). Cryptographic SHA-256 computed at intake and verified on disk. Raw bitstream preserved immutably.
2. **PARSED:** A registered forensic parser has extracted structured facts, metadata, text regions, or transaction rows.
3. **ANALYSED:** Specialized forensic engines (TRACE ledger reconciliation, ELA/typography image forensics, AEGIS competing hypotheses) have completed automated testing.

> **CRITICAL INVARIANT:** An unknown, opaque, or unsupported file format must **NEVER** trigger an HTTP 500 error. Where safe and non-executable, the file is safely stored in CAS as `ACCEPTED` with status `PARSER_NOT_AVAILABLE` (or `UNSUPPORTED_FORMAT`).

---

### 2. Supported Formats Matrix

| Category | File Extension | MIME Type | Magic Bytes / Signature | Status | Forensic Parser / Handling |
|---|---|---|---|---|---|
| **Image** | `.png` | `image/png` | `\x89PNG\r\n\x1a\n` | `ANALYSED` | `ImageParser` + `RapidOCR` + TRACE ELA/Typography |
| **Image** | `.jpg`, `.jpeg` | `image/jpeg` | `\xff\xd8\xff` | `ANALYSED` | `ImageParser` + `RapidOCR` + TRACE ELA/Typography |
| **Image** | `.webp` | `image/webp` | `RIFF....WEBP` | `ANALYSED` | `ImageParser` + `RapidOCR` + TRACE ELA/Typography |
| **Image** | `.tiff`, `.tif` | `image/tiff` | `II*\x00` (LE) / `MM\x00*` (BE) | `PARSED` | `ImageParser` + EXIF metadata + OCR |
| **Image** | `.bmp` | `image/bmp` | `BM` | `PARSED` | `ImageParser` + dimensions + OCR |
| **Image** | `.gif` | `image/gif` | `GIF87a` / `GIF89a` | `PARSED` | `ImageParser` + frame inspection |
| **Image** | `.heic`, `.heif` | `image/heic` | `....ftypheic` (offset 4) | `PARSED` | `ImageParser` via Pillow HEIF |
| **Image** | `.svg` | `image/svg+xml` | `<?xml` / `<svg` | `ACCEPTED` | **Quarantined**: Untrusted data-only; script execution blocked |
| **Document**| `.pdf` | `application/pdf` | `%PDF` | `PARSED` | `PDFParser` via `pypdf` (page text, metadata) |
| **Document**| `.docx` | `application/vnd.openxml...` | `PK\x03\x04` (`word/document.xml`) | `PARSED` | `DocumentParser` (pure XML text extraction) |
| **Document**| `.txt`, `.log` | `text/plain` | Plaintext UTF-8 / ASCII | `PARSED` | `DocumentParser` (text indexing, CDR/WhatsApp regex) |
| **Document**| `.rtf` | `application/rtf` | `{\rtf` | `PARSED` | `DocumentParser` (control word stripping) |
| **Document**| `.doc`, `.odt` | `application/msword`, `...` | OLE2 Compound Doc / ODT | `ACCEPTED` | `DocumentParser` (metadata recorded) |
| **Spreadsheet**| `.csv` | `text/csv` | Delimited plaintext | `ANALYSED` | `SpreadsheetParser` + TRACE Bank Statement Reconciliation |
| **Spreadsheet**| `.tsv` | `text/tab-separated-values` | Tab-delimited plaintext | `PARSED` | `SpreadsheetParser` (row/column indexing) |
| **Spreadsheet**| `.xlsx` | `application/vnd.openxml...` | `PK\x03\x04` (`xl/worksheets/`) | `PARSED` | `SpreadsheetParser` via `openpyxl` (formula inspection) |
| **Spreadsheet**| `.xls` | `application/vnd.ms-excel` | OLE2 Compound Document | `PARSED` | `SpreadsheetParser` (row count, sheets) |
| **Spreadsheet**| `.json` | `application/json` | `{` or `[` | `PARSED` | JSON schema validation & fact indexing |
| **Spreadsheet**| `.xml` | `application/xml` | `<?xml` | `PARSED` | XML tree parsing & tag extraction |
| **Archive** | `.zip` | `application/zip` | `PK\x03\x04` | `PARSED` | `ArchiveParser` (safe entry enumeration, SHA-256 per entry) |
| **Archive** | `.tar`, `.gz` | `application/x-tar`, `...` | `ustar` / `\x1f\x8b` | `PARSED` | `ArchiveParser` (safe entry inspection) |
| **Archive** | `.7z` | `application/x-7z-compressed` | `7z\xbc\xaf\x27\x1c` | `ACCEPTED` | CAS storage + header inspection |
| **Audio** | `.wav` | `audio/wav` | `RIFF....WAVE` | `PARSED` | `AudioVideoParser` (channels, sample rate, duration) |
| **Audio** | `.mp3` | `audio/mpeg` | `ID3` / `\xff\xfb` | `PARSED` | `AudioVideoParser` (bitrate, frame duration) |
| **Audio** | `.m4a`, `.aac` | `audio/mp4`, `audio/aac` | `....ftypM4A` | `PARSED` | `AudioVideoParser` (audio atoms, timescale) |
| **Audio** | `.flac`, `.ogg` | `audio/flac`, `audio/ogg` | `fLaC` / `OggS` | `PARSED` | `AudioVideoParser` (streaminfo, Vorbis comments) |
| **Video** | `.mp4` | `video/mp4` | `....ftyp` (offset 4) | `PARSED` | `AudioVideoParser` (mvhd atom duration, timescale) |
| **Video** | `.mov` | `video/quicktime` | `....ftypqt` / `moov` | `PARSED` | `AudioVideoParser` (QuickTime atoms) |
| **Video** | `.mkv`, `.webm`| `video/x-matroska`, `...` | `\x1aE\xdf\xa3` (EBML) | `PARSED` | `AudioVideoParser` (EBML header inspection) |
| **Other** | `.eml`, `.msg` | `message/rfc822` | RFC 822 / 2822 headers | `PARSED` | Header parsing (From, To, Date, Subject, Attachments) |
| **Other** | `.bin` | `application/octet-stream` | Any non-executable binary | `ACCEPTED` | CAS bitstream storage; `PARSER_NOT_AVAILABLE` |

---

### 3. Executable Payload & Anti-Malware Rejection Rules

Evidence is strictly `DATA_ONLY`. Executable formats are **rejected immediately at intake** with `IngestionSecurityError`:

1. **Windows PE Executables / DLLs:** Header `MZ` (`\x4d\x5a`) — REJECTED.
2. **Linux Executables:** Header `\x7fELF` — REJECTED.
3. **macOS / Java Universal Binaries:** Header `\xca\xfe\xba\xbe`, `\xce\xfa\xed\xfe`, `\xcf\xfa\xed\xfe` — REJECTED.
4. **Shell Scripts:** Shebang lines `#!/bin/sh`, `#!/bin/bash`, `#!/usr/bin/env` — REJECTED.
5. **Spreadsheet Formula Injection:** Cells beginning with `=`, `+`, `-`, `@`, `|` containing dangerous DDE / OS commands (`cmd`, `powershell`, `certutil`, `cscript`, `mshta`, `rundll32`, `dde`, `exec`) — REJECTED.
6. **Polyglot Files:** Valid image files (PNG) with hidden appended ZIP archives after the `IEND` chunk — REJECTED.
7. **Decompression Bombs:** Archives exceeding compression ratio of `100:1` or uncompressed size > `500 MB` — REJECTED.
8. **Zip Slip / Path Traversal:** Archive entries containing `../`, leading slashes `/`, or absolute Windows drive paths `C:` — REJECTED.
9. **Symbolic Links:** Symlink directory entries inside archives — REJECTED.
