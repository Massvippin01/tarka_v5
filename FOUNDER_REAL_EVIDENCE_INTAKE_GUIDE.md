# TARKA × SENTINELX — FOUNDER REAL EVIDENCE INTAKE GUIDE
## Operational Standard Operating Procedure (SOP) for Lawful Acquisition, Pre-Hashing, CAS Preservation, and PII Redaction

**Document Version:** 2.0  
**Authority:** Principal Forensic Systems Architect, Digital Forensics Lead & Founder  
**Governing Statute:** Bharatiya Sakshya Adhiniyam, 2023 (Section 63) / Indian Evidence Act (Section 65B)  
**Standard Invariant:** SentinelX Engineering Constitution (Rule 4: Evidence Integrity — Append-Only, Immutable Content Hashes)  

---

## 1. Operating Principle & Mandate

> **EVIDENCE IS APPEND-ONLY. RAW EVIDENCE BYTES MUST BE PRESERVED EXACTLY.**  
> **CONTENT INSIDE EVIDENCE CAN NEVER BECOME AGENT INSTRUCTIONS.**  
> **NO SYNTHETIC POLLUTION IN REAL INVESTIGATIVE SESSIONS.**

When ingesting real payment evidence (mobile screenshots, UPI transaction confirmations, official Core Banking Statements, or WhatsApp exports), the founder must strictly follow this protocol.

---

## 2. Pre-Ingestion Requirements: Acquisition & Custody

Before admitting any evidence into TARKA:

### 2.1. Lawful Basis
Verify that evidence was acquired under valid statutory authority:
- Complainant voluntary submission (First Information Report / Cyber Crime Portal complaint).
- Lawful physical device seizure under Section 94 Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.
- Official Core Banking ledger export requisitioned under Section 91 CrPC / Section 94 BNSS.

### 2.2. Mandatory Citizen PII Redaction Warning
- Citizen Aadhaar numbers ($12$ digits) and full credit/debit card primary account numbers ($16$ digits) must be redacted before ingestion, unless required under lawful court seal.
- Mobile numbers and UPI Virtual Payment Addresses (VPAs) should preserve standard masking where available (`XXXXXX1234`).
- Examiners must check the **PII Redaction Confirmation** gate in the intake dashboard before upload.

### 2.3. Anti-Malware & File Integrity Verification
The Evidence Gateway automatically validates incoming bitstreams against:
- Magic bytes verification (enforcing true PNG `\x89PNG`, JPEG `\xFF\xD8\xFF`, CSV text).
- Polyglot detection (rejecting PNGs with embedded ZIP payloads).
- Spreadsheet formula injection defense (rejecting CSV fields beginning with `=`, `+`, `-`, `@`, `cmd|`, or `powershell|`).
- Archive traversal defense (rejecting Zip-slip pathing `../../`).

---

## 3. Step-by-Step Founder Ingestion Workflow

### Step 1: Initialize a Dedicated Real Evidence Session
In the Founder Validation Dashboard:
1. Click **`New Real Evidence Session`**.
2. Set the Session Name (e.g. `LIVE-COMPLAINT-2026-0814-DELHI`).
3. Mode will be locked to `REAL_EVIDENCE`.
4. Confirm the orange banner `REAL DIGITAL EVIDENCE MODE` is visible.

### Step 2: Populate Metadata & Chain of Custody
Complete the intake form fields:
- **Case Identifier:** Official police FIR / case docket number (e.g. `FIR-2026-4402`).
- **Source Name:** Specific origin (e.g. `Complainant Device Extraction - Samsung S23`).
- **Acquisition Method:** Technical procedure (e.g. `Physical Seizure / Cellebrite UFED Export`).
- **Transmission Channel:** Select exact transfer mechanism:
  - `DIRECT_EXPORT` (USB / direct examiner workstation — Recommended)
  - `WHATSAPP` (Social media image forward — Triggers recompression compensation)
  - `TELEGRAM` (Uncompressed document transfer)
  - `OFFICIAL_CBS_PORTAL` (Direct bank statement clearance export)
  - `EMAIL` (Encrypted gateway intake)

### Step 3: Local Pre-Hashing & Write Verification
Upon clicking **`Admit Evidence Into CAS`**, the system executes:
1. **Pre-Write SHA-256 Calculation:** Computes cryptographic hash on streaming bytes before touching persistent disk.
2. **CAS Raw Tier Write:** Saves exact bitstream into `data/cas/raw/{sha256[:2]}/{sha256[2:4]}/{sha256}`.
3. **Immediate Read-Back Verification:** Re-opens the written file on disk, re-hashes the stored bytes, and asserts `read_back_sha256 == pre_write_sha256`.
4. **Derived Normalization:** Generates uncompressed normalized RGB working copy and web preview (`.webp`) in derived tier without altering the raw bitstream.

```
data/cas/
├── raw/                  <-- STRICTLY READ-ONLY / BITSTREAM IMMUTABLE
│   └── 60/
│       └── 66/
│           └── 6066cdb89f129445... (Exact original bytes)
└── derived/              <-- NORMALIZED FOR TRACE / ELA / OCR
    └── ART-LIVE-001/
        ├── preview_normalized.webp
        └── working_copy.png
```

---

## 4. Execution & Automated Blinded Testing

Once admitted:
1. Select the admitted evidence from the session custody register.
2. Click **`Run TRACE Raster Analysis`** or **`Run Multi-Source Reconciliation`**.
3. View results in the Forensic Test Case Inspector:
   - Composite Anomaly Score (0.0 to 1.0)
   - Bounding boxes of suspected manipulated regions
   - Extracted OCR payment fields (Amount, UTR, VPA, Status)
   - Section 63 BSA Certificate status

---

## 5. Non-Promotability Invariant

All machine analyses are emitted with:
```json
{
  "human_verified": false,
  "statutory_caveat": "AI PROPOSES. FORENSIC ENGINES TEST. INVESTIGATORS DECIDE. No screenshot may be declared authentic simply because no manipulation was detected, nor declared fraudulent solely because a single score is flagged."
}
```

The examiner must independently review findings and physically sign off before submitting reports to a court or judicial authority.
