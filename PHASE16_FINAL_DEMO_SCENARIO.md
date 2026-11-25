# TARKA PHASE 16 — FINAL DEMONSTRATION SCRIPT & LIVE EXECUTION RUNBOOK
**Document Identifier:** `PHASE16_FINAL_DEMO_SCENARIO.md`  
**Authority:** Principal Product Architect, Digital Forensics Lead, Founder  
**Date:** 2026-11-25  
**Case Identifier:** `upi_payment_discrepancy`  
**Target URL:** `http://127.0.0.1:5173/`  
**Backend API:** `http://127.0.0.1:8000/api/v1/forensics/`  

---

## 1. Demonstration Overview & Investigative Premise

This runbook guides the founder through recording the final live video demonstration of TARKA × SENTINELX.

### Investigative Scenario: "Operation Mandaveli Wire"
An investigator is presented with a disputed retail transaction from Sambandam Cycle House, Chennai:
1. **Payer Claim:** The payer provides a Google Pay mobile screenshot claiming a payment of **₹1,495.00** settled under UTR/RRN `632413615889`.
2. **Merchant Claim:** The merchant produces a handwritten bill totaling **₹1,045.00** (`160 + 30 + 500 = 1045`).
3. **Core Conflict:** There is an unreconciled **₹450.00 delta**. Did the payer fabricate the screenshot? Did the shop add unitemized parts? Did the bank execute an auto-reversal?

---

## 2. Step-by-Step Live Demonstration Script

### Scene 1: Clean Startup & Workstation Overview (0:00 – 1:30)
- **Action:** Open browser at `http://127.0.0.1:5173/`.
- **Visuals:** Showcase the dark-theme liquid-glass workstation.
- **Voiceover:**
  > *"Welcome to TARKA × SENTINELX — the forensic investigative intelligence platform. Notice that the workstation is running entirely locally on offline models. All evidence is data only. AI proposes, forensic engines test, evidence supports, and human investigators decide."*
- **Verify:** Show green backend status badge (`HEALTHY: 200 OK`).

### Scene 2: Evidence Admission & Cryptographic CAS Sealing (1:30 – 3:30)
- **Action:** Click **"Intake Evidence"**. Drag and drop the four founder evidence files:
  1. `1000270701.jpg` (Google Pay screenshot)
  2. `1000270698.jpg` (Mobile camera photo of handwritten bill)
  3. `1000270702.png` (Flatbed scanner high-res scan)
  4. `1000270703.png` (Comparison infographic)
- **Action:** Click **"Ingest & Process"**.
- **Visuals:** Watch the live SSE job progression:
  - `HASH_VERIFICATION` (15%) -> `VALIDATION` (25%) -> `PARSING` (40%) -> `OCR` (60%) -> `TRACE` (75%) -> `AEGIS` (90%) -> `COMPLETED` (100%).
- **Action:** Click **"Evidence Register"**. Click **"Verify Bitstream"** on `ART-010-D586D8E7`.
- **Voiceover:**
  > *"Every byte is stored in immutable Content Addressable Storage. Clicking verify performs a real-time cryptographic read-back SHA-256 check against the CAS disk blocks, confirming 100% bitstream preservation."*

### Scene 3: TRACE Multimodal Inspection & EXIF Transposition (3:30 – 6:00)
- **Action:** Open the **Visual Forensics Viewer** for `1000270701.jpg`.
- **Visuals:** Hover over the extracted OCR tokens (`₹1,495.00`, `632413615889`, `1420@okbizaxis`).
- **Action:** Open `1000270698.jpg` (the mobile camera photo).
- **Voiceover:**
  > *"Notice that this photo was taken on a Motorola moto g64 5G with sensor Orientation 6. TRACE automatically applied EXIF orientation normalization, cleanly extracting the shop header 'SAMBANDAM CYCLE HOUSE' and phone numbers without manual rotation."*
- **Visuals:** Show Error Level Analysis (ELA) and gradient discontinuity heatmap showing uniform natural compression.

### Scene 4: Double-Entry Reconciliation & Contradiction Detection (6:00 – 8:00)
- **Action:** Navigate to the **Contradictions** tab.
- **Visuals:** Highlight the `UNRECONCILED_PAYMENT_DISCREPANCY` card showing:
  - Screenshot Amount: **₹1,495.00** (UTR `632413615889`)
  - Apparent Handwritten Total: **₹1,045.00**
  - Unreconciled Delta: **₹450.00**
- **Voiceover:**
  > *"Notice the statutory caveat at the bottom: TARKA explicitly refuses to declare this fraud. In accordance with Rule 5 of our Engineering Constitution, an unmatched receipt is an investigative lead, never proof of guilt."*

### Scene 5: AEGIS Analysis of Competing Hypotheses & BNSS 94 Gaps (8:00 – 10:30)
- **Action:** Navigate to **Hypotheses Workspace**.
- **Visuals:** Display the 7 competing hypotheses matrix.
- **Voiceover:**
  > *"AEGIS evaluates seven mutually exclusive scenarios under the Analysis of Competing Hypotheses framework. Notice HYP-UNKNOWN: when evidence is incomplete, TARKA maintains an inconclusive baseline."*
- **Action:** Click on the **Evidence Gaps** panel. Show the 4 prioritized statutory requisitions:
  - Section 94 BNSS Order to NPCI for ISO 8583 central switch logs.
  - Section 94 BNSS Order to Axis Bank for merchant settlement journals.

### Scene 6: Examiner Review & Non-Overwriting Invariant (10:30 – 12:00)
- **Action:** Open the observation review panel on `OBS-IMG-ART-008`.
- **Action:** Select decision **"CORRECT"**. Enter corrected line items: `₹160` (Tube), `₹30` (Spokes), `₹500` (Service) = `₹1,045` total. Enter basis: *"Manual forensic visual inspection of handwritten slip with EXIF orientation compensation"*. Click **"Record Review"**.
- **Voiceover:**
  > *"Under the Non-Overwriting Invariant, the raw machine extraction is never overwritten. Both the immutable machine reading and the examiner's certified review are preserved side-by-side in the permanent audit trail."*

### Scene 7: Section 63 BSA Report Export & Digital Sealing (12:00 – 14:00)
- **Action:** Click **"Generate Statutory Report"**. Select Section 63 BSA Certificate.
- **Visuals:** Click **"Export PDF"**. Open the generated ReportLab PDF showing digital stamp, cryptographic evidence table, and examiner signature block.
- **Action:** Click **"Verify Report"** in the UI to confirm the report's SHA-256 digital seal matches the ledger.
- **Closing Voiceover:**
  > *"This concludes the complete end-to-end investigative workflow of TARKA × SENTINELX — from raw evidence ingestion to court-admissible statutory report generation."*

