# M2 TEST STRATEGY & ADVERSARIAL VALIDATION DESIGN
## Verification Philosophy, Adversarial Test Matrix, and Fixture Isolation

**Milestone:** M2 (Distributed Event Fabric, BFT Consensus, and Vector Clock Ordering)  
**Status:** IMPLEMENTED & VERIFIED  
**Track:** SUTRAM 2026 — Problem Statement PS04  
**Date:** November 5, 2026  
**Governing Doctrine:** AI Proposes. Evidence Verifies. Human Decides.

---

# 1. TESTING PHILOSOPHY

Testing distributed systems and forensic platforms requires an adversarial mindset. Superficially testing happy-path message transmission is grossly inadequate for an investigation workbench intended for national competition and judicial evidence presentation.

TARKA's M2 test methodology enforces four rigorous testing principles:
1. **No Mocking of Cryptographic or Verification Primitives:**
   All cryptographic hashing (SHA-256), message authentication (HMAC-SHA256), and formal constraint logic (Z3 SMT Solver) run against actual mathematical implementations, not mock objects.
2. **Deterministic, In-Memory Multi-Node Emulation:**
   The PBFT consensus network and multi-institution event fabric run inside fully deterministic, in-process network harness simulations. This allows millisecond-level verification of complex distributed edge cases (e.g., race conditions, network partitions, silent nodes) without flaky socket timeouts.
3. **Strict Invariant Verification:**
   Tests do not merely check return codes; they assert mathematical invariants (e.g., hash chain linkage, vector clock partial order, quorum thresholds, balance conservation).
4. **Adversarial Failure Injection:**
   Tests actively inject Byzantine attacks: equivocation, forged signatures, out-of-order deliveries, clock skew inversions, and split-brain network partitions.

---

# 2. M2 ADVERSARIAL TEST MATRIX

The dedicated M2 test suite is located in [`backend/tests/test_m2_distributed_event_fabric.py`](file:///c:/PROJECTS/tarka_v5/backend/tests/test_m2_distributed_event_fabric.py). It contains 18 comprehensive test scenarios:

| # | Test Function Name | Architectural Component | Adversarial / Distributed Condition Tested | Expected Outcome |
|:---|:---|:---|:---|:---|
| 01 | `test_01_canonical_contract_bi_directional_conversion` | `EventEnvelope` | Bi-directional schema conversion with M0 `CanonicalInstitutionEvent` | Exact field preservation and valid Pydantic model validation |
| 02 | `test_02_idempotency_duplicate_rejection` | `DistributedEventFabric` | Re-transmission of identical event ID and identical payload SHA-256 | Returns `True` (acknowledged) without creating duplicate ledger entries or advancing sequence numbers |
| 03 | `test_03_append_only_hash_chain_integrity` | `DistributedEventFabric` | Append sequence of 5 events; verify cryptographic link | Genesis starts with 64 zeros; each `parent_hash` matches prior `sha256_hash`; `verify_ledger_chain_integrity()` passes |
| 04 | `test_04_causal_dependency_buffering_and_auto_drain` | `DistributedEventFabric` | Child event arriving before parent causal dependency | Child is held in causal buffer (`PENDING`); when parent arrives, child automatically drains to ledger (`COMMITTED`) |
| 05 | `test_05_multi_node_vector_clock_advancement` | `VectorClock` | Inter-institution message passing between Bank A and Bank B | Lamport counter advances monotonically; vector clock merges maximal components across nodes |
| 06 | `test_06_vector_clock_4way_comparison` | `VectorClock` | Pairwise comparison of vector clocks | Accurately classifies `HAPPENS_BEFORE`, `HAPPENS_AFTER`, `CONCURRENT`, and `IDENTICAL` |
| 07 | `test_07_temporal_consistency_clock_skew_paradox` | `TemporalConsistencyEngine` | Hardware clock drift: Event A causes B ($A \to B$), but physical clock $t_A > t_B$ | Flags `clock_skew_paradox=True`, computes exact skew in ms, and designates vector clock as authoritative order |
| 08 | `test_08_dynamic_vector_clock_pruning` | `VectorClock` | Long-term ledger growth with dormant institutional nodes | Prunes inactive node keys while retaining active node counters and causality invariant |
| 09 | `test_09_bft_silent_node_tolerance` | `PBFTConsensusNetwork` | 1 validator node (Node 3) completely unresponsive ($f=1$) | Quorum of 3 honest nodes (Nodes 0, 1, 2) achieves consensus and commits proposal |
| 10 | `test_10_bft_equivocation_detected_and_rejected` | `PBFTConsensusNetwork` | Malicious leader proposes conflicting digests $d_1$ and $d_2$ at same sequence | Replicas cross-verify, fail to reach 2f prepare quorum for either digest, reject proposals, and trigger view change |
| 11 | `test_11_bft_invalid_signature_rejection` | `PBFTConsensusNetwork` | Node attempts to inject proposal with forged HMAC signature | Signature verification fails at ingress; proposal is dropped |
| 12 | `test_12_bft_network_partition_and_heal` | `PBFTConsensusNetwork` | Network split into two isolated 2-node partitions (0,1 vs 2,3) | Neither partition can achieve quorum of 3; network halts execution safely; upon healing, consensus resumes |
| 13 | `test_13_bft_leader_failure_and_view_change` | `PBFTConsensusNetwork` | Leader Node 0 crashes or times out | Replicas initiate `VIEW-CHANGE`, elect Node 1 as new primary for View 1, and successfully process proposals |
| 14 | `test_14_institution_tenant_isolation` | `DistributedEventFabric` | Multi-tenant ingestion from HDFC, ICICI, and SBI | `get_events_by_institution()` strictly partitions records; zero data cross-leakage |
| 15 | `test_15_deterministic_state_replay_domain_summary` | `DistributedEventFabric` | Case correlation stream with mule flagging, debit freeze, and evidence | `replay_state(correlation_id)` accurately aggregates flagged accounts, frozen accounts, and evidence IDs |
| 16 | `test_16_deterministic_state_replay_sequence_slice` | `DistributedEventFabric` | Sequence range query `from_sequence=2, up_to_sequence=4` | Returns exact slice of 3 sequential `EventEnvelope` objects with unbroken parent hashes |
| 17 | `test_17_claim_bridge_balance_conservation_verified` | `ClaimRecomputationBridge` | Valid financial flow: Inflow ₹1,00,000, Outflow ₹80,000, Balance ₹20,000 | Z3 SMT solver confirms financial conservation (`invariant_satisfied=True`), claim transitions to `VERIFIED` |
| 18 | `test_18_claim_bridge_balance_conservation_violation_counterexample` | `ClaimRecomputationBridge` | Siphoned flow: Inflow ₹1,00,000, Outflow ₹60,000, Balance ₹20,000 (₹20,000 discrepancy) | Z3 SMT solver falsifies claim, computes discrepancy, and extracts formal mathematical counterexample |

---

# 3. REGRESSION & COMPATIBILITY COVERAGE

In addition to the 18 dedicated M2 tests, every test run exercises:
- M0 Canonical Contracts: 15 tests (`backend/tests/test_canonical_contracts_v1.py`)
- M1 TAIE Integration Foundation: 12 tests (`backend/tests/test_taie_integration_foundation.py`)
- Existing PS04 Specialized Suite: 41 tests (`backend/tests/test_ps04_*.py`)
- Frontend Component Suite: 40 Vitest unit/integration tests (`frontend/src/`)
- Production Bundle Compilation: Vite TypeScript + asset bundle build

