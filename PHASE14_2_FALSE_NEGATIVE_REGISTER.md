# TARKA PHASE 14.2 — FALSE NEGATIVE REGISTER & MACHINE EXTRACTION LIMITATIONS
**Authority:** Principal Forensic Systems Architect, Computer Vision Engineer, QA Lead
**Date:** 2026-11-25
**Evaluation Target:** Real Founder Evidence (`upi_payment_discrepancy`)

---

## 1. Objective & Philosophy

A **False Negative** in forensic evidence processing occurs when genuine evidential facts, metadata, or document anomalies present in the physical or digital evidence fail to be detected or extracted by automated engines.

Rather than obscuring limitations behind artificial accuracy claims, TARKA adheres to the SentinelX Engineering Constitution:
- **Repository Truth (Rule 1):** Real-world limitations must be explicitly documented and catalogued.
- **Contradictions & Uncertainty (Rule 5):** Uncertainty must remain explicit; never silently resolve or conceal failures.

---

## 2. Catalogued False Negatives & Real-World Extraction Limits

### FN-01: Handwritten Cursive Script & Faded Ballpoint Ink Extraction
- **Artifact:** `1000270698.jpg` & `1000270702.png` (Handwritten bill from Sambandam Cycle House)
- **Description:** While printed header text (`SAMBANDAM CYCLE HOUSE, Mandaveli, Chennai...`) was extracted with high optical confidence, handwritten line item descriptions written in cursive Tamil/English shorthand (`Tube`, `Spokes`, `Servicing`) exhibited lower machine extraction confidence.
- **Root Cause:** Standard OCR engines (Tesseract / EasyOCR) are optimized for printed Latin typography and struggle with quick handwriting, slanted strokes, and faint ballpoint ink on unlined carbon paper.
- **Impact:** Automated system extracted individual numerical tokens (`160`, `30`, `500`) but required human examiner review to certify the item descriptions and apparent handwritten total of ₹1,045.
- **Mitigation & Resolution:** Implemented Gate 5 Examiner Review interface, allowing the forensic examiner to review, correct, and annotate observation records with explicit basis while preserving raw machine extractions immutably.

### FN-02: Camera EXIF Sensor Orientation Bias
- **Artifact:** `1000270698.jpg` (Captured via Motorola moto g64 5G)
- **Description:** The mobile camera hardware saved the physical image buffer in raw sensor orientation (rotated 90° clockwise) while attaching an EXIF header `Orientation: 6`.
- **Initial Machine Failure:** Prior to Phase 14.2, raw OCR engines fed directly with image bytes attempted character segmentation sideways, failing to recognize vertical text columns.
- **Engine Repair:** Added `ImageOps.exif_transpose` to `backend/tests_tarka/tarka/ocr/extractor.py`. The image matrix is now transformed according to EXIF tags before entering the OCR pipeline, resolving the extraction failure.

### FN-03: OpenCV Large PNG User Chunk Warnings
- **Artifact:** High-resolution scans (`1000270702.png`, `1000270703.png`, 4.7 MB each)
- **Description:** OpenCV's `PngDecoder::read_chunk` surfaced warning `user chunk data is too large` and failed gradient decoding on certain auxiliary user-defined metadata chunks.
- **Forensic Assessment:** The primary image raster and EXIF/PNG chunks were successfully read and parsed by Pillow, but secondary pixel discontinuity analysis logged non-fatal warnings.
- **Action Item:** Upgrade OpenCV image ingestion wrapper to handle oversized PNG metadata chunks gracefully without triggering stderr warnings.

---

## 3. Exploratory vs Scored Track Segregation

To prevent false negatives on unstandardized real-world evidence from polluting deterministic benchmark scores, TARKA enforces Gate 6's two-track catalogue:
- **SCORED TRACK:** Machine-extractable, structured artifacts (digital payment screenshots, bank statement PDFs, CSV exports) subject to strict pass/fail benchmarks.
- **EXPLORATORY TRACK:** Uncontrolled physical evidence (faded handwritten notes, low-lighting photographs, partial slips) where automated extraction serves solely as investigative suggestions for human examiner adjudication.
