# TARKA × SENTINELX — PHASE 14.1
# GIGABYTE CORPUS COMPOSITION & EVALUATION RESULTS

**Corpus Version:** 1.1.0  
**Random Seed:** `0x5E4714E1` (Deterministic generation)  
**Evaluation Scope:** 10 MB, 100 MB, 500 MB, 1 GB, 2 GB  
**Authority:** Principal Digital Forensics Systems Architect  

---

## 1. Corpus Design & Format Taxonomy

The Phase 14.1 validation corpus was engineered to model the full spectrum of digital evidence encountered in modern Indian cybercrime investigations (UPI payment fraud, banking reconciliation, extortion, SIM swap, and statutory reporting under Section 63 BNSS).

The corpus spans eight distinct evidence categories:

| Category | File Formats | Dimension / Scale | Forensic Purpose | Expected Parser | Expected Outcome |
|---|---|---|---|---|---|
| **Mobile Screenshots** | PNG | 1080x2400, 720x1600, 1440x3120 | PhonePe, Google Pay, Paytm payment screens | `image_ocr` (RapidOCR) | `PARSED` |
| **Merchant Receipts** | JPEG | 800x600 POS captures | Physical merchant thermal receipt photos | `image_ocr` (RapidOCR) | `PARSED` |
| **Bank Statements** | CSV | 50, 500, 2,500 rows | Core Banking System (CBS) transaction exports | `csv_parser` | `PARSED` |
| **Statutory Notices** | PDF (PDF-1.4) | 1, 5, 20 pages | Court orders, Section 63 BSA certificates | `pdf_parser` | `PARSED` |
| **Case Correspondence** | TXT, EML | RFC 822 emails, memo text | Investigator case notes, bank dispute emails | `text_parser` | `PARSED` |
| **Defensive Security** | CSV, PNG, ZIP | DDE commands, polyglot, zip-slip | Threat resistance & path traversal defense | Security filters | `REJECTED` / `ACCEPTED` |
| **Forensic Edge Cases**| BIN, JPG, PNG | 0-byte, truncated, mismatched ext | Resiliency against corrupted/fuzzed intake | Intake validator | `REJECTED` / `REQUIRES_REVIEW` |
| **Volumetric Blocks** | BIN | 2 MB, 16 MB, 64 MB | Stress-testing multi-gigabyte chunk streaming| `binary_cas` | `ACCEPTED` |

---

## 2. Expected vs. Actual Parser Behavior Matrix

Every artifact in the corpus was tested through the public upload endpoint and evaluated against its expected lifecycle state:

| Artifact ID | Filename | Size (Bytes) | Category | Expected Result | Actual Result | Status Detail |
|---|---|---|---|---|---|---|
| `EVID-0001` | `EVID_IMG_UPI_SCREENSHOT_0001.png` | 12,863 | Mobile Screenshot (1080x2400) | `PARSED` | `PARSED` | Admitted, background OCR & TRACE executed |
| `EVID-0002` | `EVID_IMG_UPI_SCREENSHOT_0002.png` | 6,889 | Mobile Screenshot (720x1600) | `PARSED` | `PARSED` | Admitted, background OCR & TRACE executed |
| `EVID-0003` | `EVID_IMG_UPI_SCREENSHOT_0003.png` | 20,147 | Mobile Screenshot (1440x3120) | `PARSED` | `PARSED` | Admitted, background OCR & TRACE executed |
| `EVID-0004` | `EVID_IMG_UPI_SCREENSHOT_0004.png` | 10,343 | Mobile Screenshot (1080x1920) | `PARSED` | `PARSED` | Admitted, background OCR & TRACE executed |
| `EVID-0005` | `EVID_IMG_RECEIPT_0005.jpg` | 8,227 | Merchant POS Photo (JPEG) | `PARSED` | `PARSED` | Admitted, background OCR executed |
| `EVID-0008` | `EVID_FIN_STATEMENT_0008.csv` | 3,971 | CBS Ledger (50 rows) | `PARSED` | `PARSED` | Admitted, double-entry rows extracted |
| `EVID-0009` | `EVID_FIN_STATEMENT_0009.csv` | 40,444 | CBS Ledger (500 rows) | `PARSED` | `PARSED` | Admitted, double-entry rows extracted |
| `EVID-0010` | `EVID_FIN_STATEMENT_0010.csv` | 206,130 | CBS Ledger (2,500 rows) | `PARSED` | `PARSED` | Admitted, double-entry rows extracted |
| `EVID-0011` | `EVID_DOC_LEGAL_NOTICE_0011.pdf` | 820 | Statutory Order (1 page) | `PARSED` | `PARSED` | Admitted, PDF stream indexed |
| `EVID-0012` | `EVID_DOC_LEGAL_NOTICE_0012.pdf` | 2,827 | Statutory Order (5 pages) | `PARSED` | `PARSED` | Admitted, PDF stream indexed |
| `EVID-0013` | `EVID_DOC_LEGAL_NOTICE_0013.pdf` | 10,404 | Statutory Order (20 pages) | `PARSED` | `PARSED` | Admitted, PDF stream indexed |
| `EVID-0014` | `EVID_TXT_INVESTIGATOR_MEMO_0014.txt`| 211 | Case Note (.txt) | `PARSED` | `PARSED` | Admitted, memo indexed into timeline |
| `EVID-0015` | `EVID_EML_DISPUTE_ALERT_0015.eml` | 364 | RFC 822 Dispute Email | `PARSED` | `PARSED` | Admitted, headers parsed into timeline |
| `EVID-0016` | `EVID_EDGE_ZERO_BYTE_0016.bin` | 0 | Truncated Zero-Byte | `REJECTED` | `REJECTED` | HTTP 400 (`Total size must be > 0 bytes`) |
| `EVID-0017` | `EVID_EDGE_DUPLICATE_ORIGINAL_0017.bin`| 69 | Deduplication Base Sample | `ACCEPTED` | `ACCEPTED` | Committed to CAS under hash |
| `EVID-0018` | `EVID_EDGE_DUPLICATE_COPY_0018.bin` | 69 | Bit-Identical Duplicate Copy | `ACCEPTED` | `ACCEPTED` | Deduplicated to existing CAS bitstream |
| `EVID-0019` | `EVID_EDGE_CORRUPTED_STREAM_0019.jpg`| 140 | Incomplete JPEG bitstream | `REQUIRES_REVIEW` | `REQUIRES_REVIEW` | Admitted as raw bitstream; marked for review |
| `EVID-0020` | `EVID_EDGE_MISMATCHED_EXT_0020.png` | 42 | CSV masquerading as PNG | `REQUIRES_REVIEW` | `REQUIRES_REVIEW` | Header mismatch flagged; raw bytes preserved |
| `EVID-0021` | `EVID_SEC_FORMULA_INJ_0021.csv` | 114 | CSV DDE Injection (`=cmd\|`) | `REJECTED` | `REJECTED` | HTTP 400 (`Formula injection / DDE detected`) |
| `EVID-0022` | `EVID_SEC_POLYGLOT_PAYLOAD_0022.png` | 70 | Polyglot Script Header | `ACCEPTED` | `ACCEPTED` | Admitted as raw CAS data; script inert |
| `EVID-0023` | `EVID_SEC_ZIP_SLIP_0023.zip` | 314 | Path Traversal Archive | `PARSED` | `PARSED` | Traversal path stripped; safe extraction |
| `EVID-0024+`| `EVID_BIN_VOLUMETRIC_0001..n.bin` | 16–67 MB | Opaque Digital Containers | `ACCEPTED` | `ACCEPTED` | Chunked CAS streaming verified (23–51 MB/s)|

---

## 3. Deep Analysis of Security & Edge Case Fixtures

### 3.1 Defensive Security Fixture 1: CSV Formula Injection (`EVID_SEC_FORMULA_INJ_0021.csv`)
- **Payload**: `Date,TxID,Payee,Amount\n2026-11-24,TX1,=cmd|' /C calc'!A0,100.00\n`
- **Defense Mechanism**: The CSV admission filter in `UniversalEvidenceGateway` scans incoming cell headers for leading `=`, `@`, `+`, or `-` followed by command execution tokens.
- **Verification Result**: Server immediately terminated chunk reception and returned `HTTP 400 Bad Request` with message:  
  `Formula injection / DDE command detected in tabular evidence 'EVID_SEC_FORMULA_INJ_0021.csv': cell '=cmd|' /C calc'!A0...'`
- **Forensic Principle**: Host systems viewing exported ledger reports in Excel or LibreOffice Calc are immune from remote code execution.

### 3.2 Defensive Security Fixture 2: Zip-Slip Path Traversal (`EVID_SEC_ZIP_SLIP_0023.zip`)
- **Payload**: Contained relative directory path traversal entry `../../etc/passwd`.
- **Defense Mechanism**: Archive extractor strips path prefixes and canonicalizes paths strictly within the isolated case artifact jail.
- **Verification Result**: No escape occurred; system files untouched; archive cataloged safely.

### 3.3 Forensic Edge Case: Deduplication Integrity
- **Artifacts**: `EVID_EDGE_DUPLICATE_ORIGINAL_0017.bin` and `EVID_EDGE_DUPLICATE_COPY_0018.bin`.
- **Payload**: Identical bytes (`b"SENTINELX_DETERMINISTIC_DUPLICATE_SAMPLE_PAYLOAD_EVIDENCE_BYTE_STREAM"`), identical SHA-256 (`d26...`).
- **Verification Result**: Both uploads succeeded. The CAS layer stored a single physical bitstream while logging two distinct statutory custody entries in `custody.db`, ensuring that identical seized media items from different physical locations retain independent legal provenance without doubling storage.
