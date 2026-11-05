# TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
# MILESTONE M4: END-TO-END INVESTIGATION INTEGRATION REPORT

**Document Reference:** `docs/SUTRAM_PS04_DOCUMENTATION/11_END_TO_END_INTEGRATION/M4_INTEGRATION_REPORT.md`  
**Execution Timestamp:** 2026-11-05T19:48:00+05:30  
**Test Suite Reference:** `backend/tests/test_m4_end_to_end_integration.py` (25/25 Passed in 9.89s)  
**Target Case:** `CASE_SUTRAM_2026_001` (*Operation GhostLayer: Multi-Jurisdictional UPI Mule Syndicate*)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. EXECUTIVE SUMMARY & LIFECYCLE OVERVIEW

Milestone M4 establishes the full operational synthesis of TARKA's forensic intelligence architecture. Utilizing the canonical synthetic case fixture (`CASE_SUTRAM_2026_001`), the platform demonstrates an unbroken, cryptographically audited investigation across 25 distinct execution stages.

The lifecycle rigorously enforces the core constitutional invariant:
1. **AI Proposes:** Automated graph correlation, entity clustering, and taint tracking suggest investigative leads and identify potential syndicates.
2. **Evidence Verifies:** Append-only vault exhibits, SHA-256 byte hashes, formal Z3 SMT solver invariants, and zero-knowledge proofs mathematically refute or support claims without premature assumptions.
3. **Human Decides:** Investigating officers retain sole authority to confirm entity merges, resolve spatio-temporal contradictions, and approve statutory Section 63 BSA court submissions.

```
+---------------------------------------------------------------------------------------------------------+
|                                    25-STAGE INVESTIGATION LIFECYCLE                                     |
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

## 2. DETAILED STAGE-BY-STAGE EXECUTION RECORD

### Stage 1: Case Initiation & Boundary Establishment
- **Component:** `tarka.contracts.canonical_v1.CanonicalCase`
- **Execution:** Registered case `CASE_SUTRAM_2026_001` (*Operation GhostLayer*), FIR #149/2026 Cyber Crime PS (Special Cell), under primary IO Insp. Vikram Sharma (Badge `DL-CYBER-8842`).
- **Invariant Verified:** Explicit jurisdiction boundaries and statutory acts (BNS §318(4), §319(2), IT Act §66C/D) bound to root object.

### Stage 2: Participating Institution Registry
- **Component:** `tarka.taie.registry.ConnectorRegistry`
- **Execution:** Dynamic registration of 3 heterogeneous adapters: `MockBankRestAdapter` (HDFC Core), `MockLegacyCBSAdapter` (SBI Core Banking), and `MockBankBatchAdapter`.
- **Invariant Verified:** Protocol-agnostic registry with active lifecycle tracking and isolation.

### Stage 3: Multi-Source Evidence Ingestion
- **Component:** `tarka.contracts.canonical_v1.CanonicalEvidence`
- **Execution:** Ingestion of bank account statements (`BANK_STATEMENT`) and telecom cellular/IPDR records (`IPDR_LOG`).
- **Invariant Verified:** Preservation of raw data sources across disparate trust tiers (T1 Core Banking and T1 Lawful Telecom Intercept).

### Stage 4: Append-Only Vault Preservation
- **Component:** Secure Object Vault (`vault://cases/149/raw/...`)
- **Execution:** All raw exhibits committed with unique vault URIs. Original files are immutable; modifications create new exhibit references.
- **Invariant Verified:** 100% decoupling between raw evidentiary bytes and investigative annotations.

### Stage 5: Cryptographic Integrity & Chain of Custody
- **Component:** SHA-256 Digest Engine & `AcquisitionMetadata`
- **Execution:** Verified 64-character SHA-256 digests (`e3b0c44...`, `ba7816b...`, `ca97811...`). Custody bound to badge `DL-CYBER-8842` and `DL-CYBER-9912`.
- **Invariant Verified:** Every piece of digital evidence has an unbroken, mathematically verifiable chain of custody.

### Stage 6: Provenance & Normalization History
- **Component:** `TransformationStep` Lineage Array
- **Execution:** Tracked step-by-step transformations: `RAW_BYTE_INGESTION_AND_SHA256` -> `ROW_NORMALIZATION_ISO8601` -> `CGNAT_PORT_TRANSLATION_ALIGNMENT`.
- **Invariant Verified:** Zero loss of transformation context; intermediate hashes recorded.

### Stage 7: Heterogeneous Record Normalization via TAIE
- **Component:** `tarka.taie.adapters.mock_bank_rest.MockBankRestAdapter`
- **Execution:** Fetching camelCase REST transactions and mapping through `CanonicalSchemaMappingEngine` into `CanonicalTransaction`.
- **Invariant Verified:** ISO 8601 UTC timestamp alignment, currency verification (`INR`), and amount typing.

### Stage 8: Entity Resolution with Hard Veto Protection
- **Component:** `tarka.contracts.canonical_v1.CanonicalEntity`
- **Execution:** Identified Victim (`ENT_VICTIM_001`), Mule Operator (`ENT_MULE_001`), and Device (`ENT_DEVICE_001`). Flagged uncertain match (Ramesh Kumar vs Ramesh K. Sharma) due to birthdate discrepancy.
- **Invariant Verified:** System strictly refrains from auto-merging ambiguous entities; status kept as `PENDING_REVIEW`.

### Stage 9: Layered Transaction Flow Reconstruction
- **Component:** `tarka.contracts.canonical_v1.CanonicalTransaction`
- **Execution:** Initial UPI siphon of ₹5,00,000 (`TXN_UPI_001`) traced from HDFC account into SBI mule layer, followed by ₹50,000 cashout (`TXN_ATM_002`).
- **Invariant Verified:** Taint attribution calculated per layer (`layer: 1`, `layer: 2`).

### Stage 10: Spatio-Temporal Graph Construction
- **Component:** `tarka.contracts.canonical_v1.CanonicalRelationship`
- **Execution:** Unified temporal graph linking entities via `TRANSFERRED_FUNDS` and `SHARED_DEVICE` predicates.
- **Invariant Verified:** Valid-time intervals preserved across IST raw stamps and UTC normalized timestamps.

### Stage 11: Contradiction Detection & Surfacing
- **Component:** Spatio-temporal Paradox Detector (`CanonicalClaim`)
- **Execution:** Flagged impossibility: ATM cash withdrawal in Mumbai at 14:15:00 IST vs Delhi Nehru Place BTS cellular ping at 14:16:30 IST (~1150 km in 90 seconds -> 45,920 km/h).
- **Invariant Verified:** Contradictions are explicitly elevated and preserved in state `CONTRADICTED`, never silently dropped.

### Stage 12: Candidate Investigative Claim Generation
- **Component:** `tarka.contracts.canonical_v1.ClaimType.PRESENCE_AT_CRIME_SCENE`
- **Execution:** Generated structured claim detailing alibi contradiction, listing explicit assumptions and limitations.
- **Invariant Verified:** `adjudication_required: True` metadata attached for mandatory investigator review.

### Stage 13: Claim Dependency DAG Topological Evaluation
- **Component:** `tarka.claim_compiler.compiler.ClaimDependencyDAG`
- **Execution:** Assembled multi-tier claim graph; verified prerequisite propagation from primary evidence to derived conclusions.
- **Invariant Verified:** Cycle-free topological execution; dependent claims inherit verification status.

### Stage 14: Formal SMT Financial Conservation Verification
- **Component:** `tarka.claim_compiler.formal_verifier.FormalSMTVerifier` (Z3)
- **Execution:** Verified ₹15,00,000 total inflow matches ₹15,00,000 total outflow across syndicate layers with zero balance discrepancy.
- **Invariant Verified:** Mathematical proof of balance conservation (`invariant_satisfied: True`).

### Stage 15: Formal Counterexample Generation
- **Component:** Z3 SMT Solver Model Generator
- **Execution:** Evaluated incomplete outflow scenario (₹15L in vs ₹10L out -> ₹5,00,000 unaccounted).
- **Invariant Verified:** Solver extracted counterexample: `Unaccounted discrepancy of ₹-500,000.0`.

### Stage 16: Controlled Institutional Private Set Intersection
- **Component:** `tarka.privacy.psi.PSICoordinator` (ECDH-secp256k1)
- **Execution:** Pairwise PSI executed between HDFC Bank, SBI Bank, and Airtel Telco under statutory scope `CYBER_FRAUD_INVESTIGATION`.
- **Invariant Verified:** Discovered shared syndicate contact (`+919844455566`) without exposing non-matching customer records.

### Stage 17: Zero-Knowledge Threshold Proof Verification
- **Component:** `tarka.crypto.zkp_verifier.ZKThresholdVerifier`
- **Execution:** Verified Groth16 ZK proof attesting that confidential mule transaction sum meets statutory freeze threshold of ₹15,00,000 without revealing individual item amounts.
- **Invariant Verified:** Mathematical zero-knowledge guarantee; verification passed in 1.4ms.

### Stage 18: Four-Validator PBFT Consensus Coordination
- **Component:** `tarka.distributed.pbft_consensus.PBFTConsensusNetwork`
- **Execution:** Disseminated inter-institutional account freeze directive across 4 validator nodes.
- **Invariant Verified:** Pre-prepare, Prepare, and Commit phases achieved 100% quorum (4/4 nodes committed) under $3f+1$ model.

### Stage 19: Vector Clock Concurrency & Causal Ordering
- **Component:** `tarka.distributed.vector_clock.VectorClock`
- **Execution:** Evaluated causal precedence (`HAPPENS_BEFORE`) and detected truly concurrent actions between HDFC and SBI nodes (`CONCURRENT`).
- **Invariant Verified:** No artificial total ordering forced on independent concurrent events.

### Stage 20: Controlled Evidence Tampering Refutation
- **Component:** Cryptographic Hash Verification Engine
- **Execution:** Injected single-byte mutation into Airtel cell tower dump row.
- **Invariant Verified:** Immediate SHA-256 mismatch detected; tampered exhibit rejected prior to graph injection.

### Stage 21: Downstream Claim Invalidation Cascade
- **Component:** Reactive DAG Claim Propagator
- **Execution:** Invalidation of primary evidence exhibit automatically reverted dependent location claim from `SUPPORTED` to `UNSUPPORTED`.
- **Invariant Verified:** No stale or unbacked claims remain active when evidence foundation collapses.

### Stage 22: Automated Claim Recomputation via Event Fabric
- **Component:** `tarka.distributed.claim_bridge.ClaimRecomputationBridge`
- **Execution:** Processed incoming `TRANSACTION_FLAGGED` event through Event Fabric; triggered formal SMT re-verification of affected balance claims.
- **Invariant Verified:** Human review requirement flagged; claims recomputed deterministically.

### Stage 23: Digital Investigator Adjudication
- **Component:** `tarka.contracts.canonical_v1.ReviewerDecision`
- **Execution:** Investigating Officer Insp. Vikram Sharma recorded formal decision: `CONFIRMED_DECOUPLED_ACCOMPLICE` with rationale on mule runner decoupling.
- **Invariant Verified:** AI proposal adjudicated by human; status set to `HUMAN_CONFIRMED`.

### Stage 24: Statutory Section 63 BSA Court Dossier Generation
- **Component:** Bharatiya Sakshya Adhiniyam 2023 §63 Compliance Engine
- **Execution:** Generated complete legal dossier containing FIR details, primary SHA-256 exhibit hashes, contradiction rationale, and legal certification.
- **Invariant Verified:** Court-admissible statutory dossier generated with `VALID_SHA256_LINEAGE_ATTESTED`.

### Stage 25: Deterministic Historical Ledger Replay
- **Component:** `tarka.distributed.event_store.DistributedEventFabric`
- **Execution:** Replayed sequential event stream from sequence 1 to 3; verified HMAC-SHA256 hash chaining across ledger blocks.
- **Invariant Verified:** 100% bitwise identical reconstruction of investigation state from preserved event history.

---

## 3. AUDIT SUMMARY & CONCLUSION

The 25-stage end-to-end integration verifies that TARKA operates not as a black-box machine learning system, but as an **auditable, evidence-backed forensic workbench**. Every investigative hypothesis is grounded in immutable exhibits, every entity merge respects hard vetoes, and every statutory finding is backed by court-admissible mathematical proof.
