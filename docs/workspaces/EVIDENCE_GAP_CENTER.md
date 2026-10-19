# Evidence Gap Center Projection

## 1. Purpose & Principle

An investigation is defined as much by what is missing as by what is present. The **Evidence Gap Center** exposes deductive holes in the evidence graph where legal proof requires foundational documentation.

API Endpoint:
`GET /api/v1/investigations/{case_id}/gaps`

---

## 2. Formal Deductive Gap Logic

The Evidence Gap Engine scans all identified entities and claims against forensic standard templates:

1. **Missing Subscriber Acquisition Form (CAF)**:
   - **Rule**: Every telecommunication identifier (`PHONE`) active in a criminal syndicate must be linked to a verified CAF, national ID KYC (Aadhaar / Voter ID), and point-of-sale retailer audit.
   - **Golden Case Demonstration (`GAP-2026-001`)**:
     - Identifier: Burner SIM `+91-9888044556` (`PH002`).
     - State: Device active in encrypted comms and toll-adjacent calls; zero telecom KYC in evidence ledger.
     - Severity: `CRITICAL`.
     - Impact: Prevents conclusive legal attribution of the phone to Vikram Singh or an accomplice.

2. **Unverified Financial Counterparty**:
   - Outbound hawala or mule transfers lacking reciprocal beneficiary bank KYC or branch STR filing.

3. **Uncalibrated Speed / Optical Sensors**:
   - Surveillance or ANPR observations lacking camera calibration or time-sync certification under Section 65B IEA / Section 63 BSA.

---

## 3. Statutory Requisition Generator

The Evidence Gap Center provides structured procedural requisition drafts:
- Formal notice to Telecom Service Provider (TSP) nodal officers under **Section 91 CrPC / Section 94 BNSS** demanding:
  1. CAF form with original scanned subscriber photograph.
  2. Point-of-Sale (PoS) retailer agent ID and biometric verification log.
  3. Cell ID to physical tower coordinate mapping table for the relevant sector.
