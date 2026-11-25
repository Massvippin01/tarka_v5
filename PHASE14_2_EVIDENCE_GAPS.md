# TARKA PHASE 14.2 — STATUTORY EVIDENCE GAPS & FORMAL REQUISITIONS
**Authority:** Forensic Legal Counsel, Chief Compliance Officer, Lead Investigator
**Date:** 2026-11-25
**Case Identifier:** `upi_payment_discrepancy`
**Governing Laws:** Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS); Bharatiya Sakshya Adhiniyam, 2023 (BSA); Information Technology Act, 2000

---

## 1. Statutory Framework for Digital Evidence Corroboration

Under Indian evidence law and criminal procedure, digital screenshots and private receipts do not possess automatic conclusive presumption. 

- **Section 94, BNSS, 2023 (formerly Section 91, CrPC, 1973):** Empowers a court or investigating officer to issue a written summons/order to any entity or person to produce documents, digital records, or tangible things necessary for the investigation.
- **Section 63, BSA, 2023 (formerly Section 65B, Indian Evidence Act, 1872):** Requires a certificate signed by the person in lawful control of the device or computer system certifying the authenticity, integrity, and source of any electronic record tendered in evidence.
- **Section 105, BNSS, 2023:** Mandates audio-video electronic recording during the seizure of electronic devices and physical articles to guarantee evidentiary chain of custody.

---

## 2. Formal Statutory Requisitions Generated

AEGIS and the Forensic Orchestrator synthesized three formal statutory requisitions to bridge the evidential gap between the ₹1,495 payment screenshot and the ₹1,045 handwritten receipt:

### Requisition 1: National Payments Corporation of India (NPCI) Central Switch Logs
- **Statutory Authority:** Section 94, BNSS, 2023
- **To:** The Designated Nodal Officer / Central Switch Operations,  
  National Payments Corporation of India (NPCI),  
  1001A, B-Wing, 10th Floor, The Capital, Bandra Kurla Complex, Mumbai – 400 051.
- **Subject:** Formal Order for Production of Central Switch Transaction Logs and ISO 8583 Message Payload under RRN `632413615889`.
- **Particulars Demanded:**
  1. Complete ISO 8583 UPI transaction log for Reference Number (RRN) `632413615889`.
  2. Remitting Bank Identifier Code and Account Token.
  3. Beneficiary Acquiring Bank Identifier Code and Merchant VPA (`1420@okbizaxis`).
  4. Final Transaction Settlement Status (`SUCCESS`, `DEEMED`, `FAILED`, `REVERSED`).
  5. Exact Transaction Amount settled through the central switch.
  6. Section 63 BSA Certificate signed by the authorized NPCI Systems Custodian.

### Requisition 2: Axis Bank (Acquiring Core Banking System)
- **Statutory Authority:** Section 94, BNSS, 2023 read with Section 4, Bankers' Books Evidence Act, 1891
- **To:** The Nodal Officer / Law Enforcement Liaison Cell,  
  Axis Bank Limited, Mumbai.
- **Subject:** Production of Certified Merchant Ledger and Settlement Journal for VPA `1420@okbizaxis`.
- **Particulars Demanded:**
  1. Core Banking Transaction Journal for Account mapped to VPA `1420@okbizaxis` for transaction date 20 Nov 2026.
  2. Credit settlement confirmation for transaction matching RRN `632413615889`.
  3. Beneficiary Merchant KYC Details: Confirming legal entity name, store location, and proprietor identity.
  4. Record of any subsequent chargeback, merchant refund, or dispute filed under this reference.

### Requisition 3: Remitting Mobile Device Handset Seizure & Extraction
- **Statutory Authority:** Section 105, BNSS, 2023 / Section 63, BSA, 2023
- **To:** Digital Forensic Investigation Unit / Field Investigating Officer
- **Target Device:** Motorola moto g64 5G (Associated with capture of handwritten bill `1000270698.jpg` on 2026:11:24 19:03:33)
- **Scope of Extraction:**
  1. Logical extraction of Google Pay local app database (SQLite transaction caches).
  2. Verification of uncompressed screenshot in `/sdcard/DCIM/Screenshots/` or `/sdcard/Pictures/Screenshots/`.
  3. Extraction of device telecommunication logs (SMS receipts from remitting bank confirming debit alert).

---

## 3. Resolution Protocol

Until responses to the above statutory requisitions are obtained and verified:
- TARKA maintains hypothesis `HYP-UNKNOWN` as active.
- The system prohibits automated closure of the investigation.
- Findings remain clearly flagged with mandatory statutory caveats.
