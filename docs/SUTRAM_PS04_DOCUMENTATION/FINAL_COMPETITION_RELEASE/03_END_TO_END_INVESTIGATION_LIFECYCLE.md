# SUTRAM 2026 — PROBLEM STATEMENT PS04
# FINAL COMPETITION DOSSIER: 03. END-TO-END INVESTIGATION LIFECYCLE

**Problem Statement:** PS04 — AI-Powered Cyber Fraud Investigation & Attribution System  
**Test Suite Reference:** `backend/tests/test_m4_end_to_end_integration.py` (25/25 Passed in 9.89s)  
**Target Case:** `CASE_SUTRAM_2026_001` (*Operation GhostLayer: Multi-Jurisdictional UPI Mule Syndicate*)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. THE 25-STAGE LIFECYCLE BREAKDOWN

```
+---------------------------------------------------------------------------------------------------------+
|                                  THE 25-STAGE INVESTIGATION LIFECYCLE                                   |
+---------------------------------------------------------------------------------------------------------+
| 01. Case Initiation (CanonicalCase)               --> 14. Formal Z3 Constraint Invariant Verification  |
| 02. Institutional Registry (ConnectorRegistry)    --> 15. Counterexample Generation (₹5L Discrepancy)  |
| 03. Multi-Source Ingestion (HDFC/SBI/Airtel)      --> 16. Private Set Intersection (3-Node ECDH-PSI)   |
| 04. Append-Only Vault Storage (vault:// URI)      --> 17. Zero-Knowledge Threshold Proof Verification  |
| 05. Immutable SHA-256 Custody Attestation         --> 18. PBFT 4-Node Consensus Coordination (f=1)     |
| 06. Multi-Step Provenance Lineage Tracking        --> 19. Vector Clock Concurrency & Causal Ordering   |
| 07. TAIE Normalization (CanonicalTransaction)     --> 20. Tamper Injection & Refutation Test           |
| 08. Entity Resolution with Hard Veto (PAN/Phone)  --> 21. Downstream Claim Invalidation Propagation    |
| 09. Flow Reconstruction & Layered Taint Siphon    --> 22. Automated Claim Recomputation Bridge         |
| 10. Temporal Investigation Graph (IST/UTC)        --> 23. Digital Officer Adjudication (ReviewerDec)   |
| 11. Spatio-Temporal Contradiction Surfacing       --> 24. BSA §63 Statutory Court Dossier Generation   |
| 12. Candidate Investigative Claim Generation      --> 25. Deterministic Historical Ledger Replay       |
| 13. Claim Dependency DAG Topological Evaluation   -->                                                   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 2. STAGE EXECUTION HIGHLIGHTS

### Stages 1–7: Ingestion, Provenance & Normalization
- Case `CASE_SUTRAM_2026_001` registered under Insp. Vikram Sharma (`DL-CYBER-8842`).
- 3 heterogeneous sources ingested: HDFC Core Banking statement, SBI CBS statement, and Airtel cellular IPDR/CGNAT log.
- Raw files committed to append-only vault (`vault://cases/149/raw/...`) with cryptographic SHA-256 digests (`e3b0c44...`, `ba7816b...`, `ca97811...`).
- Normalization through TAIE produces unified `CanonicalTransaction` objects with microsecond UTC alignment.

### Stages 8–13: Graph Construction, Contradictions & Claims
- Entity resolution discovers Victim, Mule Operator, and Handset. An ambiguous entity match (`Ramesh Kumar` vs `Ramesh K. Sharma`) is safeguarded in state `PENDING_REVIEW` without automatic merging.
- Temporal graph identifies funds flow from victim UPI to SBI mule account, followed by ATM cashout.
- Spatio-temporal paradox detector flags impossible velocity: ATM withdrawal in Mumbai at 14:15:00 IST vs Delhi Nehru Place BTS ping at 14:16:30 IST (~1150 km in 90 seconds $\to 45,920\text{ km/h}$).
- Structured claim `CLAIM_ALIBI_CONTRADICTION_001` generated with state `CONTRADICTED`.

### Stages 14–19: Formal Mathematics, Cryptography & Consensus
- Microsoft Z3 formal SMT verifier verifies balance conservation ($15\text{L in} = 15\text{L out}$). In an incomplete outflow test, Z3 generates an exact counterexample of ₹5,00,000 unaccounted discrepancy.
- 3-institution SECP256k1 ECDH-PSI discovers shared syndicate contact (`+919844455566`) without leaking non-matching customer records.
- Groth16 ZK proof verifies regulatory freeze threshold ($₹15,00,000$) in $1.4\text{ms}$ while preserving witness confidentiality.
- 4-node PBFT consensus commits inter-bank account freeze directive with 100% quorum.

### Stages 20–25: Invalidation, Adjudication, Court Proof & Deterministic Replay
- Controlled single-byte modification injected into Airtel tower dump row triggers immediate SHA-256 mismatch, causing automatic downstream retraction of dependent location claims.
- Event Fabric invokes `ClaimRecomputationBridge` to re-verify affected balance claims upon receiving new transaction events.
- Investigating officer records digital decision `CONFIRMED_DECOUPLED_ACCOMPLICE`.
- Statutory Section 63 BSA electronic dossier compiled with Part A/B certificates.
- Historical ledger stream replayed from genesis; state reconstructed with 100% bitwise determinism.
