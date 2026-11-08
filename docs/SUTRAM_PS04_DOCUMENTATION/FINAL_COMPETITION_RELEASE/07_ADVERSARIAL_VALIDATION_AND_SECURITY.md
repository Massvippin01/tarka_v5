# SUTRAM 2026 — PROBLEM STATEMENT PS04
# FINAL COMPETITION DOSSIER: 07. ADVERSARIAL VALIDATION & SECURITY REPORT

**Problem Statement:** PS04 — AI-Powered Cyber Fraud Investigation & Attribution System  
**Test Suite Reference:** `backend/tests/test_m3_adversarial_validation.py` (12/12 Passed in 4.41s)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. ADVERSARIAL VALIDATION OVERVIEW

To satisfy the demanding evaluation criteria of SUTRAM 2026, TARKA was subjected to rigorous adversarial stress-testing across 7 distinct operational dimensions.

```
+---------------------------------------------------------------------------------------------------------+
|                                    7-DIMENSION ADVERSARIAL MATRIX                                       |
+--------------------------+-------------------------------------+----------------------------------------+
| Adversarial Dimension    | Attack Vector Injected              | TARKA Defense & Invariant Guarantee    |
+--------------------------+-------------------------------------+----------------------------------------+
| 1. Evidence Integrity    | Single-byte corruption of exhibit   | SHA-256 mismatch detected; exhibit     |
|                          | file (`vault://` tampering)         | quarantined before graph ingestion.    |
|                          |                                     |                                        |
| 2. Entity Resolution     | Common ISP CGNAT IP shared by two   | Hard-veto guardrail enforces phone and |
|                          | unrelated suspects                  | IMEI distinction; auto-merge rejected. |
|                          |                                     |                                        |
| 3. Commercial Shielding  | Fraud debit commingled with clean   | Roscoe v. Winder LIBR doctrine shields |
|                          | retail POS merchant revenues        | ₹2.5L clean capital from seizure.      |
|                          |                                     |                                        |
| 4. Claim Compiler        | Evidence exhibit retracted due to   | Claim Dependency DAG automatically     |
|                          | procedural defect                   | invalidates dependent conclusions.     |
|                          |                                     |                                        |
| 5. Cryptography (PSI)    | Fake authorization token or out-of- | Cryptographic token validator rejects  |
|                          | scope statutory inquiry             | request; zero PII leakage.             |
|                          |                                     |                                        |
| 6. Zero-Knowledge Proofs | Forged group point π_A or tampered  | Pairing check e(π_A, π_B) != e(α, β)...|
|                          | regulatory threshold                | fails; proof rejected in 0.42ms.       |
|                          |                                     |                                        |
| 7. Distributed Consensus | 1 crashed node + 1 Byzantine node   | PBFT gathers 2f+1=3 honest quorum,     |
|                          | emitting conflicting state digests  | committing valid directive despite f=1.|
+--------------------------+-------------------------------------+----------------------------------------+
```

---

## 2. ADVERSARIAL TEST RESULTS

### Test 1: Single-Byte Exhibit Corruption
- **Input:** Authentic Airtel IPDR file (`470.7 KB`) mutated at offset byte 1024 (`0x41` $\to$ `0x42`).
- **Result:** SHA-256 digest changed from `ca97811...` to `1f09e42...`. Intake engine immediately raised `IntegrityViolationError` and moved exhibit to quarantine locker.

### Test 2: Shared CGNAT IP Auto-Merge Veto
- **Input:** Suspect A and Citizen B both observed accessing internet via ISP CGNAT gateway `103.21.244.10`.
- **Result:** Entity resolution engine checked IMEI and phone number. Since hardware and subscription records differed, automated entity merge was vetoed (`ReviewState: PENDING_REVIEW`).

### Test 3: Groth16 Proof Tampering
- **Input:** Adversary modified public threshold from ₹5,00,000 to ₹2,00,000, or mutated point $\pi_A$.
- **Result:** Verifier returned `verified: False`. Zero mathematical leakage of private witness amounts.

### Test 4: Byzantine PBFT Fault Tolerance
- **Input:** Node 3 injected conflicting state digests into prepare and commit rounds.
- **Result:** Nodes 0, 1, and 2 established strict majority agreement ($2f+1=3$). State committed without stalling.

