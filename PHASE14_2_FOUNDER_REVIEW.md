# TARKA PHASE 14.2 — FOUNDER REVIEW & NON-OVERWRITING INVARIANT
**Authority:** Lead Forensic Examiner (Founder), Independent Validation Lead
**Date:** 2026-11-25
**Target Case:** `upi_payment_discrepancy`

---

## 1. Principles of Examiner Review in TARKA

Under Rule 5 (Investigative Reasoning) and Rule 4 (Evidence Integrity) of the SentinelX Engineering Constitution:
1. **AI Proposes, Human Decides:** Automated extraction proposes candidate amounts, entities, and hypotheses; the human forensic examiner adjudicates their evidential admissibility.
2. **The Non-Overwriting Invariant:** An examiner review or correction must NEVER overwrite, delete, or mutate raw machine output. Both the immutable machine extraction and the examiner's correction must be preserved side-by-side in the permanent audit trail.
3. **Mandatory Evidentiary Basis:** An examiner cannot merely alter a field; every correction requires an explicit, auditable factual basis (e.g., visual inspection, physical slip verification, instrument calibration).

---

## 2. Review Implementation & API Architecture

The review subsystem was implemented and verified in Phase 14.2 across the following endpoints and data stores:

- **Review Endpoint:** `POST /api/v1/forensics/cases/{case_id}/observations/{observation_id}/review`
- **Supported Review Decisions:**
  - `VERIFIED`: Examiner confirms machine extraction is 100% accurate.
  - `DISPUTED`: Examiner contests machine extraction based on contradictory evidence.
  - `UNVERIFIED`: Insufficient evidence to validate; marked pending further inquiry.
  - `CORRECT`: Examiner supplies corrected attributes with required justification.
- **Audit Ledger:** Preserved in `data/cases/upi_payment_discrepancy/reviews/observation_reviews.json`.

---

## 3. Actual Founder Review Actions Recorded

### Review 1: Handwritten Repair Receipt (`OBS-IMG-ART-008`)
- **Target Observation ID:** `OBS-IMG-ART-008` (Corresponds to `1000270698.jpg`)
- **Review Decision:** `CORRECT`
- **Reviewed By:** `Lead Forensic Examiner (Founder)`
- **Timestamp:** `2026-11-25T05:01:31Z`
- **Correction Basis:** *"Manual forensic visual inspection of handwritten slip with EXIF orientation compensation."*
- **Examiner Notes:** *"Founder review of handwritten cycle repair bill. Calculated line items: ₹160 (Tube) + ₹30 (Spokes) + ₹500 (Service) = ₹1,045 total."*
- **Human Correction Payload:**
  ```json
  {
    "apparent_handwritten_total": 1045.0,
    "line_items": [
      { "item": "Tube Replacement", "amount": 160.0 },
      { "item": "Spoke Adjustment", "amount": 30.0 },
      { "item": "General Overhaul & Service", "amount": 500.0 }
    ],
    "merchant_name": "SAMBANDAM CYCLE HOUSE",
    "merchant_phone": "9444071420",
    "merchant_location": "Mandaveli, Chennai-600028"
  }
  ```
- **Non-Overwriting Invariant Check:**
  - `original_machine_output`: Preserved intact.
  - `human_correction`: Stored concurrently in dedicated review record.
  - Status: **VERIFIED (PASS)**.

### Review 2: Statutory Evidence Gap Adjudication (`GAP-001`)
- **Target Gap ID:** `GAP-001` (Central Switch ISO 8583 logs)
- **Review Decision:** `CONFIRM_ABSENT`
- **Reviewed By:** `Lead Forensic Examiner (Founder)`
- **Review Scope:** *"Central Switch ISO 8583 settlement journals for transaction date 20 Nov 2026"*
- **Review Notes:** *"Requisition drafted under Section 94 Bharatiya Nagarik Suraksha Sanhita (BNSS) to National Payments Corporation of India (NPCI) for central switch logs under RRN 632413615889."*

---

## 4. Audit Trail Verification

The audit trail was checked for compliance with Section 63 BSA electronic records integrity standards:
- All review events carry cryptographic ties to the parent case ID and observation ID.
- Review records are immutable and append-only.
- The UI exposes both machine extractions and human corrections side-by-side with clear visual provenance badges.
