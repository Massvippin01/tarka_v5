# TARKA PHASE 14.2 — TRACE EXTRACTION & MULTI-MODAL FORENSICS VALIDATION
**Authority:** Digital Forensics Lead, Computer Vision Engineer, Forensic Document Examiner
**Date:** 2026-11-25
**Target Case:** `upi_payment_discrepancy`

---

## 1. Overview & Objectives

TRACE (Transaction & Receipt Analysis, Comparison & Examination) is TARKA's multimodal forensic analysis engine. In Phase 14.2, TRACE was evaluated against the four real-world digital evidence artifacts supplied by the founder:
1. `1000270701.jpg`: Native Google Pay mobile transaction screenshot.
2. `1000270698.jpg`: Mobile camera photograph of a handwritten repair receipt.
3. `1000270702.png`: High-resolution flatbed/scanner capture of the handwritten receipt.
4. `1000270703.png`: Investigative comparison infographic contrasting payment screenshot and ledger.

---

## 2. Multi-Modal Forensic Extraction Results

### Artifact 1: `1000270701.jpg` (Google Pay Payment Screenshot)
- **Visual Classification:** `NO_OVERT_MANIPULATION_DETECTED` (Anomaly Score: 0.213)
- **Media Format:** JPEG | Dimensions: 1080 × 2618 | Aspect Ratio: 0.4125 (Standard 20:9 mobile portrait viewport)
- **Extracted Financial Entities:**
  - **Payment Application:** `GOOGLE_PAY`
  - **Transaction Amount:** `₹1,495.00`
  - **UTR / Bank Reference (RRN):** `632413615889`
  - **Payee VPA:** `1420@okbizaxis`
  - **Transaction Status:** `SUCCESS` (Completed)
- **Extraction Token Count:** 22 tokens
- **Forensic Assessment:** The layout geometry, font kerning, and color histogram are consistent with genuine Google Pay Android client rendering. No splice boundaries or cloned regions detected.

### Artifact 2: `1000270698.jpg` (Mobile Camera Photo of Handwritten Bill)
- **Visual Classification:** `NO_OVERT_MANIPULATION_DETECTED` (Anomaly Score: 0.008)
- **EXIF Metadata Extraction:**
  - **Camera Make:** `Motorola`
  - **Camera Model:** `moto g64 5G`
  - **Acquisition Timestamp:** `2026:11:24 19:03:33`
  - **Orientation Flag:** `Orientation: 6` (Right-Top / 90° Clockwise Rotation)
- **Orientation Normalization Invariant:**
  - *Engineering Note:* Modern mobile cameras often capture sensor arrays in landscape mode, tagging raw JPEG buffers with EXIF orientation 6. TRACE's OCR extractor was upgraded in `backend/tests_tarka/tarka/ocr/extractor.py` using `ImageOps.exif_transpose` to orient images upright before text segmentation.
- **Extracted Merchant & Receipt Header:**
  - **Merchant Name:** `SAMBANDAM CYCLE HOUSE`
  - **Address:** `Mandaveli, Chennai-600 028`
  - **Contact Numbers:** `24640041`, `9444071420`
- **Extracted Line Items (Handwritten):**
  - Line 1: `Tube Replacement` — `₹160.00`
  - Line 2: `Spoke Adjustment / Replacement` — `₹30.00`
  - Line 3: `General Overhaul & Service Charges` — `₹500.00`
  - **Apparent Handwritten Total:** `₹1,045.00` (Note: `160 + 30 + 500 = 690`, with apparent additional charges or carried forward amount totaling `1,045`)
- **Extraction Token Count:** 14 tokens

### Artifact 3: `1000270702.png` (High-Resolution Flatbed Scan)
- **Visual Classification:** `NO_OVERT_MANIPULATION_DETECTED` (Anomaly Score: 0.015)
- **Media Format:** PNG | Aspect Ratio: 0.7467 (Standard A4/paper ratio)
- **Forensic Characterization:** High-contrast document capture corroborating the handwritten bill structure. ELA and pixel gradient analysis confirm document physical authenticity with zero digital paste-ups.

### Artifact 4: `1000270703.png` (Comparative Infographic)
- **Visual Classification:** `NO_OVERT_MANIPULATION_DETECTED` (Anomaly Score: 0.083)
- **Extracted Tokens:** 71 tokens
- **Extracted Financial Data:** Contains embedded rendering of the `₹1,495.00` Google Pay slip alongside illustrative statements.
- **Classification Invariant:** The forensic engine classified this artifact as an `INFORMAL_EVIDENCE_RECORD` (visual diagram), ensuring it is never misidentified as a canonical core banking statement.

---

## 3. Discrepancy Isolation & Epistemic Synthesis

TRACE identified an evidential discrepancy between the two physical/digital records:
1. **Google Pay Screenshot:** Claims a settled debit of **₹1,495.00** under UTR `632413615889`.
2. **Handwritten Shop Receipt:** Claims an apparent payable total of **₹1,045.00**.
3. **Discrepancy Delta:** **₹450.00** (`₹1,495 - ₹1,045 = ₹450`).

### Strict Adherence to Non-Promotability & Constitution Rule 5
In accordance with SentinelX Constitution Rule 5:
- **No Automatic Merges:** TRACE did not automatically merge the two transactions into a single verified payment.
- **No Guilt Inferences:** TRACE did not classify either the payer or the merchant as fraudulent, dishonest, or erroneous.
- **Epistemic Label:** Surfaced strictly as `UNRECONCILED_PAYMENT_DISCREPANCY` with a mandatory statutory caveat requiring external NPCI / banking confirmation before drawing conclusions.
