# TARKA FILE FORMAT COMPATIBILITY MATRIX
## Forensic Parsers, Validation Bounds, Ingress Constraints & Error Taxonomy

**Document Version:** 2.0.0  
**Classification:** Forensics Engineering / Testing Matrix  
**Canonical Repository:** `C:\PROJECTS\SentinelX`  
**System Target:** TARKA × SENTINELX Forensic Intelligence Platform  
**Authority:** SentinelX Wave 6 Engineering Constitution  

---

## 1. Overview & Forensic Compatibility Baseline

TARKA supports universal forensic evidence processing across documents, images, financial feeds, telecom archives, and communication exports. This matrix details the exact parser implementations, MIME constraints, file size limits, security boundaries, and failure behaviors for all supported formats.

---

## 2. Exhaustive Format Compatibility Matrix

| Category | File Extension | MIME Type | Magic Bytes | Primary Parser Engine | Max File Size | Memory Limit | Security & Validation Controls | Error Code on Failure |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Documents** | `.pdf` | `application/pdf` | `%PDF-` | `PyMuPDF` + `RapidOCR` | 500 MB | 1 GB | Disarms embedded JS, rejects corrupted xref tables, detects password encryption | `ERR_PDF_MALFORMED` / `ERR_PDF_ENCRYPTED` |
| | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `PK\x03\x04` | `python-docx` / XML parser | 100 MB | 256 MB | Strips VBA macros, rejects external DTD entities (XXE defense) | `ERR_DOCX_MACRO_DETECTED` / `ERR_DOCX_XXE` |
| | `.txt` / `.rtf` | `text/plain`, `application/rtf` | Various | Native Python stream reader | 50 MB | 64 MB | UTF-8 / ASCII / ISO-8859-1 auto-detect, strips null bytes | `ERR_TEXT_ENCODING` |
| **Images** | `.png` | `image/png` | `\x89PNG\r\n\x1a\n` | `Pillow` + `RapidOCR` | 50 MB | 200 MB | Validates chunk CRC, strips malicious auxiliary chunks | `ERR_IMG_CORRUPTED` |
| | `.jpg` / `.jpeg` | `image/jpeg` | `\xff\xd8\xff` | `Pillow` + `RapidOCR` | 50 MB | 200 MB | Strips EXIF thumb bombs, validates SOF markers | `ERR_IMG_CORRUPTED` |
| | `.tiff` / `.tif` | `image/tiff` | `II*\x00` / `MM\x00*` | `Pillow` + `PyMuPDF` | 100 MB | 500 MB | Prevents TIFF directory loop DOS, bounds tile allocations | `ERR_TIFF_DECOMPRESSION` |
| | `.webp` | `image/webp` | `RIFF....WEBP` | `Pillow` + `RapidOCR` | 50 MB | 200 MB | Bounds canvas dimensions (max 16,384 x 16,384) | `ERR_IMG_DIMENSIONS_EXCEEDED`|
| | `.heic` / `.heif` | `image/heic` | `....ftypheic` | `pyheif` / Pillow | 50 MB | 200 MB | Strips Apple depth maps, extracts standard RGB bitmap | `ERR_HEIC_DECODE_FAILED` |
| **Financial** | `.csv` | `text/csv` | Text | `tarka.parsers.bank_upi` | 200 MB | 512 MB | Validates dialect, handles irregular bank headers, bounds row count | `ERR_CSV_INVALID_DIALECT` |
| | `.xlsx` / `.xls` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `PK\x03\x04` | `openpyxl` (read_only=True) | 200 MB | 512 MB | Read-only streaming, strips external formula links | `ERR_XLSX_FORMULA_INJECTION` |
| | `.xml` (ISO 20022) | `application/xml`, `text/xml` | `<?xml` | `defusedxml.ElementTree` | 100 MB | 256 MB | Defused XML (prevents billion laughs, XXE, external entity resolution) | `ERR_XML_XXE_ATTACK` |
| | `.txt` (MT940/942) | `text/plain` | `:20:` / `:25:` | `tarka.parsers.mt940` | 50 MB | 100 MB | Swift standard field validator (:20, :25, :28C, :60F, :61, :86) | `ERR_MT940_FIELD_SYNTAX` |
| **Telecom** | `.csv` / `.txt` (CDR) | `text/csv`, `text/plain` | Text | `tarka.parsers.cdr` | 500 MB | 1 GB | Normalized Indian telco header mapper (Jio, Airtel, Vi, BSNL) | `ERR_CDR_HEADER_MISMATCH` |
| | `.json` (IPDR) | `application/json` | `[` or `{` | `ijson` (streaming JSON) | 500 MB | 512 MB | Iterative JSON stream parsing, bounds nested depth | `ERR_IPDR_JSON_SYNTAX` |
| **Chat & Comms** | `.txt` (WhatsApp) | `text/plain` | `[DD/MM/YY,` / `DD/MM/YYYY,` | `tarka.parsers.whatsapp` | 100 MB | 256 MB | Regex parser for iOS & Android WhatsApp exported chat formats | `ERR_WHATSAPP_PARSE_FAILED` |
| **Archives** | `.zip` | `application/zip` | `PK\x03\x04` | `zipfile` with limits | 1 GB | 2 GB (total) | Max 100:1 ratio, max 3 recursion levels, max 10GB extracted size | `ERR_SECURITY_ZIP_BOMB` |
| | `.tar` / `.tar.gz` | `application/x-tar`, `application/gzip` | Various | `tarfile` (filter='data') | 1 GB | 2 GB (total) | Prevents directory traversal (`../`), prevents device node creation | `ERR_TAR_PATH_TRAVERSAL` |
| | `.7z` | `application/x-7z-compressed` | `7z\xbc\xaf'\x1c` | `py7zr` with limits | 1 GB | 2 GB (total) | Bounded memory decompression, checks uncompressed metadata size | `ERR_7Z_DECOMPRESSION` |
| **Audio / Video** | `.mp3` / `.wav` | `audio/mpeg`, `audio/wav` | Various | `mutagen` (metadata only) | 100 MB | 100 MB | Extracts duration, codec, bitrate; hooks speech transcription | `ERR_AUDIO_CORRUPTED` |
| | `.mp4` / `.mkv` | `video/mp4`, `video/x-matroska` | Various | `mutagen` / `ffmpeg` probe | 500 MB | 200 MB | Extracts video container metadata, EXIF, creation timestamp | `ERR_VIDEO_CONTAINER_INVALID` |

---

## 3. Defense Against Malicious Payloads

1. **Anti-Polyglot Defense:** Attackers frequently construct hybrid files (e.g., a file that is simultaneously a valid GIF and a valid ZIP or PHP script). TARKA requires strict agreement between file magic bytes and internal header structures. Hybrid files are instantly rejected with `ERR_POLYGLOT_PAYLOAD_DETECTED`.
2. **Formula Injection Sanitization (CSV / Excel):** Extracted cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` are neutralized by prepending a single quote `'` to prevent command execution if opened in desktop spreadsheet software.
3. **Safe XML Defusing:** All XML processing utilizes `defusedxml` to block:
   - XML Entity Expansion (Billion Laughs / Quadratic Blowup attacks).
   - External Entity Resolution (preventing server-side file disclosures like `/etc/passwd`).
   - DTD parameter entities.
