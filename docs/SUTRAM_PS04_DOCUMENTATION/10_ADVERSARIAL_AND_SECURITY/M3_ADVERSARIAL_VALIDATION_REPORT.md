# M3 ADVERSARIAL VALIDATION REPORT
## Forensic Stress-Testing, Negative Path Verification, and Attack Surface Resiliency

**Milestone:** M3 (Adversarial Validation, Security, and Forensic Reliability)  
**Track:** SUTRAM 2026 — Problem Statement PS04  
**Date:** November 5, 2026  
**Governing Doctrine:** AI Proposes. Evidence Verifies. Human Decides.  
**Test Suite Reference:** [`backend/tests/test_m3_adversarial_validation.py`](file:///c:/PROJECTS/tarka_v5/backend/tests/test_m3_adversarial_validation.py) (12/12 Passed)

---

# 1. EXECUTIVE SUMMARY

Milestone M3 validates TARKA's operational integrity under hostile, malformed, contradictory, and untrusted inputs. A forensic system designed for court presentation must be defensible against adversarial claims and physical impossibilities.

M3 establishes that:
1. **Evidence Tampering is Invariably Detected:** Any bit-level modification or file truncation invalidates cryptographic digests and triggers immediate integrity quarantine.
2. **Entity Resolution Preserves Human Authority:** The system strictly refuses to merge identities on non-unique network artifacts (such as shared IP addresses or CGNAT ports) or conflicting KYC credentials.
3. **Financial Invariants are Non-Negotiable:** Multi-hop transaction rings and settlement reversals are constrained by formal Z3 mathematical conservation; phantom recoveries are flagged immediately.
4. **Claim Invalidation Operates Reactively:** Removing or invalidating an evidence artifact causes all dependent claims to dissolve or transition to `UNSUPPORTED`.
5. **Consensus and Cryptography Fail Safe:** Byzantine equivocation, invalid signatures, network partitions, and forged zero-knowledge proofs are rejected at protocol ingress.

---

# 2. ADVERSARIAL VALIDATION MATRIX & EVIDENCE

| Scenario ID | Test Name | Attack Vector / Adversarial Condition | Observed System Reaction | Assertion Result |
|:---|:---|:---|:---|:---:|
| **M3-01** | `test_01_evidence_tampering_sha256_mismatch` | 1-byte alteration in debit field of banking ledger | SHA-256 digest mismatch detected; evidence rejected | **PASSED** |
| **M3-02** | `test_02_evidence_truncated_file_detection` | File truncated by 50% during simulated network drop | Byte length and digest mismatch detected; exhibit isolated | **PASSED** |
| **M3-03** | `test_03_no_automatic_identity_merge_on_shared_cgnat_or_ip` | Two independent citizens sharing identical ISP CGNAT IP | Entities kept distinct; zero auto-merge; clusters uncorrupted | **PASSED** |
| **M3-04** | `test_04_conflicting_kyc_hard_veto` | Identical name with conflicting Permanent Account Numbers (PAN) | Hard Veto Engine halts merge; review state set to human triage | **PASSED** |
| **M3-05** | `test_05_financial_conservation_with_reversals_and_discrepancy` | ₹15,000 siphoning leakage injected into 3-hop mule ring | Z3 SMT solver falsifies conservation; outputs exact counterexample | **PASSED** |
| **M3-06** | `test_06_claim_invalidation_when_prerequisite_evidence_removed` | Evidentiary artifact invalidated after claim compilation | Claim transitions immediately to `UNSUPPORTED` state | **PASSED** |
| **M3-07** | `test_07_claim_compiler_contradiction_detection` | Spatio-temporal travel paradox (1700km in 15 mins) | Kinematic speed violation flagged; contradiction surfaced | **PASSED** |
| **M3-08** | `test_08_ecdh_psi_pairwise_institution_intersection` | Private Set Intersection across 2 banks with disjoint sets | True intersection (+919844455566) matched; disjoint records hidden | **PASSED** |
| **M3-09** | `test_09_zkp_groth16_adversarial_tampering_rejected` | Modifying regulatory threshold from ₹50,000 to ₹30,000 | Verifier rejects proof; `verified == False` | **PASSED** |
| **M3-10** | `test_10_pbft_zero_split_brain_commits_under_partition` | Network split into 2 isolated $2 \times 2$ partitions | Consensus halts safely (zero split-brain commits); heals cleanly | **PASSED** |
| **M3-11** | `test_11_taie_circuit_breaker_trips_and_recovers` | 3 consecutive institutional adapter timeouts | Circuit trips from `CLOSED` to `OPEN`; fails fast to isolate fault | **PASSED** |
| **M3-12** | `test_12_schema_evolution_rejects_breaking_type_changes` | Removal of mandatory `balance` field in institutional API | Schema analyzer rejects schema as backward-incompatible | **PASSED** |

---

# 3. STATUTORY COMPLIANCE & LEGAL DEFENSIBILITY

1. **Bharatiya Sakshya Adhiniyam (BSA), 2023 §63 (Section 65B IEA Parity):**
   - Exhibits require verified cryptographic hashes and unbroken chain of custody records (`AcquisitionMetadata`).
   - Every analytical conclusion remains mathematically bound to specific byte offsets within raw exhibits.
2. **Indian Penal Code / Bharatiya Nyaya Sanhita (BNS) Evidence Standards:**
   - Precludes arbitrary machine attribution. A human investigator must review flagged identity ambiguities and confirm formal attachments.
