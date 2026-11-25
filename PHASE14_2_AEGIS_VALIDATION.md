# TARKA PHASE 14.2 — AEGIS REASONING & HYPOTHESIS MATRIX VALIDATION
**Authority:** Principal Forensic Systems Architect, Cognitive Systems Lead, Investigative Legal Counsel
**Date:** 2026-11-25
**Case Identifier:** `upi_payment_discrepancy`

---

## 1. Executive Mission

AEGIS (Analysis of Evidential Graphs and Investigative Scenarios) is TARKA's formal reasoning engine. It implements the Analysis of Competing Hypotheses (ACH) methodology, constructing mutually exclusive, testable investigative scenarios while explicitly surfacing evidentiary gaps and statutory requisitions.

In Phase 14.2, AEGIS was validated against real founder-supplied evidence exhibiting a ₹450 delta between a ₹1,495 Google Pay screenshot and a ₹1,045 handwritten cycle repair receipt.

---

## 2. Competing Hypotheses Matrix (ACH)

AEGIS generated 7 competing investigative hypotheses, strictly maintaining the **Inconclusive Hypothesis Invariant** (`HYP-UNKNOWN`):

```
+---------------------------------------------------------------------------------------------------+
| ID          | Scenario Title                                           | Epistemic Plausibility   |
+-------------+----------------------------------------------------------+--------------------------+
| HYP-01      | Digital Receipt Alteration (Fabricated or Edited Amount)  | HIGH_EVIDENTIARY_SUPPORT |
| HYP-02      | Split Transaction Sequence (Partial Settlement)          | COMPETING_UNVERIFIED     |
| HYP-03      | Account Takeover or Unauthorized Debit Inflation         | COMPETING_UNVERIFIED     |
| HYP-04      | Synthetic Spoof Payment Interface (FakePay / Simulator)  | LOW_EVIDENTIARY_SUPPORT  |
| HYP-05      | Core Banking Auto-Reversal or Clearing Settlement Refund | COMPETING_UNVERIFIED     |
| HYP-06      | Benign Telecom Latency or App Display Lag (No Fraud)     | COMPETING_UNVERIFIED     |
| HYP-UNKNOWN | Unresolved / Insufficient Corroborating Evidence         | ACTIVE (BASE HYPOTHESIS) |
+---------------------------------------------------------------------------------------------------+
```

### Detailed Scenario Evaluation

#### HYP-01: Digital Receipt Alteration (Fabricated or Edited Amount)
- **Investigative Hypothesis:** The disputed payment screenshot was digitally altered to display ₹1,495 instead of the actual amount billed or cleared.
- **Supporting Observations:** Bank statement does not reflect ₹1,495 debit under standard clearing timeline; shop bill indicates ₹1,045.
- **Contradictory Observations:** Image ELA and gradient analysis show uniform JPEG compression with no splice boundaries or font inconsistencies.
- **Plausibility Score:** 0.50 (Unverified pending banking switch logs).

#### HYP-02: Split Transaction Sequence (Partial Settlement / Extra Items)
- **Investigative Hypothesis:** The payment of ₹1,495 represents the handwritten bill of ₹1,045 plus additional unlisted purchases (e.g., accessories, tips, or prior ledger balance of ₹450).
- **Supporting Observations:** Merchant is a physical retail store (`SAMBANDAM CYCLE HOUSE`) where unitemized accessories (lights, locks, air valves) are commonly added at checkout.
- **Contradictory Observations:** Handwritten slip does not itemize the ₹450 difference.
- **Plausibility Score:** 0.50.

#### HYP-05: Core Banking Auto-Reversal or Clearing Settlement Refund
- **Investigative Hypothesis:** A debit of ₹1,495 occurred at the remitting bank but timed out at the acquiring core banking system, generating an automated batch refund (Deemed Approval timeout under NPCI UPI Circular 102).
- **Supporting Observations:** Unreconciled payment discrepancy surfaced in ledger comparison.
- **Contradictory Observations:** Neither party provided a 30-day settled statement.
- **Plausibility Score:** 0.50.

#### HYP-UNKNOWN: Unresolved / Insufficient Corroborating Evidence (Mandatory Invariant)
- **Investigative Hypothesis:** Available digital artifacts are insufficient to establish a conclusive evidential link between the ₹1,495 screenshot and the ₹1,045 repair bill.
- **Status:** **ACTIVE**. In accordance with Rule 5 of the Constitution, TARKA *refuses* to select a guilty or fraudulent explanation without statutory corroboration.

---

## 3. Prioritized Statutory Evidence Gaps

AEGIS identified 4 critical evidence gaps, automatically ranking them by discriminative power and mapping them to Indian procedural statutory requisitions:

1. **Central Switch Settlement Log (NPCI ISO 8583):**
   - **Statutory Authority:** Section 94, Bharatiya Nagarik Suraksha Sanhita (BNSS) [formerly Section 91 CrPC].
   - **Target Recipient:** National Payments Corporation of India (NPCI) — UPI Operations / Dispute Management System.
   - **Target Identifiers:** RRN `632413615889`, Payee VPA `1420@okbizaxis`, Date: 20 Nov 2026.
   - **Discriminative Purpose:** Unambiguously distinguishes between HYP-01 (Fabricated Screenshot), HYP-02 (Legitimate Split Payment), and HYP-05 (Switch Auto-Reversal).

2. **Acquiring Bank Merchant Ledger (Axis Bank):**
   - **Statutory Authority:** Section 94 BNSS / Section 4 Bankers' Books Evidence Act.
   - **Target Recipient:** Axis Bank — Merchant Acquiring Division.
   - **Target Identifiers:** VPA `1420@okbizaxis` linked Account.
   - **Discriminative Purpose:** Confirms whether ₹1,495, ₹1,045, or ₹0 was credited to Sambandam Cycle House.

3. **Remitting Bank Core Banking Ledger (Payer Bank):**
   - **Statutory Authority:** Section 94 BNSS.
   - **Target Recipient:** Payer Remitting Bank.
   - **Target Identifiers:** Account debit trail associated with Google Pay handle.
   - **Discriminative Purpose:** Validates whether funds were actually debited or reversed.

4. **Forensic Mobile Device Image (Remitter Handset):**
   - **Statutory Authority:** Section 105 BNSS (Search & Seizure) / Section 63 BSA (Admissibility of Electronic Records).
   - **Target Device:** Motorola moto g64 5G (IMEI verification, DCIM screenshot original).
   - **Discriminative Purpose:** Validates file system creation metadata, ruling out offline screenshot tampering.

---

## 4. Architectural Invariant Compliance

- **Rule 5 (Investigative Reasoning):** AI proposes scenarios; forensic evidence verifies; human investigators decide. Zero automated guilt attributions.
- **Rule 6 (Provenance Lineage):** Lineage maintained: Conclusion → Hypothesis (`HYP-01`..`HYP-UNKNOWN`) → Reasoning → Reconciliation finding → Entity → Observation → CAS Artifact (`ART-010-D586D8E7`..) → SHA-256 digest → Custody log.
- **Rule 7 (Governance & Statutory Anchoring):** Requisitions grounded in BNSS Section 94 and BSA Section 63.
