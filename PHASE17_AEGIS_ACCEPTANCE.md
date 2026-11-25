# TARKA × SENTINELX — PHASE 17 AEGIS INVESTIGATION REASONING ACCEPTANCE

**Audit Date**: 2026-11-25  
**Component**: AEGIS Intelligence Gateway & Automated Hypothesis Reasoning  
**Governing Standard**: *Rule 5: Never classify a person as GUILTY or INNOCENT. Never infer guilt from association, centrality, similarity, or graph proximity. Never perform automatic identity merges.*

---

## 1. Analysis of Competing Hypotheses (ACH) Framework

AEGIS ingests persisted Universal Case Model (UCM) observations and TRACE findings to formulate a balanced, multi-hypothesis matrix avoiding confirmation bias:

| Hypothesis ID | Title | Underlying Theory | Evidentiary Basis & Invariants |
| :---: | :--- | :--- | :--- |
| **H1** | **Digital Alteration / Splicing** | Payment screenshot raster was modified locally on mobile device before submission. | Supported by ELA macroblock variance, kerning anomalies, or amount delta against CBS ledger. |
| **H2** | **Intermediary Surcharge / Fee** | The ₹450 discrepancy represents an undisclosed convenience fee or gateway surcharge. | Requires merchant settlement statement to confirm or refute. |
| **H3** | **Split Transaction Sequence** | Multiple transactions were executed under a single conversational reference. | Checked against temporal clustering of CDR and switch logs within a ±30s window. |
| **H4** | **Delayed Clearing / Float** | Debit posted to CBS at a later timestamp than the client-side voucher generation. | Evaluated via multi-clock domain drift compensation in the Temporal Evidence Loom. |
| **H5** | **Account Takeover / Session Hijacking** | Legitimate credential holder's session was hijacked from an unauthorized IP/device. | Evaluated against CGNAT demultiplexing, IMSI matching, and cell-tower hopping. |
| **H6** | **Mule Aggregator Node Routing** | Disputed funds were rapidly funneled into a Layer-1 or Layer-2 mule account. | Evaluated via topological community detection and cash-out sink identification. |
| **H7** | **Clerical / Human Data Entry Error** | Complainant or merchant incorrectly typed reference number during complaint lodging. | Evaluated via Levenshtein edit distance ($d \le 2$) across known RRN lists. |

---

## 2. Non-Promotability & Human Adjudication Invariant

In strict compliance with Constitution Rule 5 and Rule 7:
- All AEGIS hypotheses are initialized with `human_verified = False` and `status = "PROPOSED"`.
- Machine inferences **NEVER** automatically promote hypotheses to judicial facts.
- A human examiner must explicitly review competing hypotheses, adjudicate contradicting findings, and record their statutory signature via `/api/v1/forensics/cases/{case_id}/hypotheses/{id}/adjudicate`.

---

## 3. Statutory Evidence Gaps (Section 94 BNSS / Section 91 CrPC)

AEGIS automatically identifies critical missing evidentiary links required to definitively prove or disprove competing hypotheses:
1. **NPCI UPI Switch Raw Syslog**: Required to independently verify RRN `202602148891` settlement timestamps.
2. **Merchant Surcharge Schedule**: Required to evaluate H2 (Intermediary Surcharge).
3. **ISP Carrier-Grade NAT Port Mapping Dump**: Required to demultiplex public IP `157.240.199.35` down to subscriber IMSI.
4. **Acquiring Bank Layer-2 Settlement Dump**: Required to trace second-hop fund dissipation.

Each statutory gap generates a court-ready formal requisition notice under Section 94 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.
