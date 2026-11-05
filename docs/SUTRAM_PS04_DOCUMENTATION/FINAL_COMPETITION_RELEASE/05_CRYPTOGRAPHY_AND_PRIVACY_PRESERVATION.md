# SUTRAM 2026 — PROBLEM STATEMENT PS04
# FINAL COMPETITION DOSSIER: 05. CRYPTOGRAPHY & PRIVACY PRESERVATION

**Problem Statement:** PS04 — AI-Powered Cyber Fraud Investigation & Attribution System  
**Implementation Modules:** `backend/tarka/privacy/psi.py`, `backend/tarka/crypto/zkp_verifier.py`  
**Test Suites:** `test_ps04_psi.py` (9/9 Passed), `test_ps04_zkp.py` (6/6 Passed)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. MULTI-PARTY PRIVATE SET INTERSECTION (ECDH-PSI)

### 1.1 The Privacy Dilemma
When tracing cyber syndicates, financial institutions must correlate suspect telephone numbers, PANs, and UPI VPAs across institutions. However, sharing unblinded customer datasets violates Section 4 of the Digital Personal Data Protection Act (DPDPA), 2023.

### 1.2 The SECP256k1 Diffie-Hellman Protocol
TARKA implements a commutative Elliptic Curve Diffie-Hellman Private Set Intersection (ECDH-PSI) protocol:

```
[Bank A (Secret k_A)]                                            [Bank B (Secret k_B)]
        |                                                                 |
        | 1. Blind local identifiers:                                     | 1. Blind local identifiers:
        |    P_A(x) = k_A * H(x)                                          |    P_B(y) = k_B * H(y)
        |                                                                 |
        | ----------------- Exchange Blinded Points --------------------> |
        | <-------------------------------------------------------------- |
        |                                                                 |
        | 2. Re-blind received points:                                    | 2. Re-blind received points:
        |    P_BA(y) = k_A * P_B(y) = k_A * k_B * H(y)                    |    P_AB(x) = k_B * P_A(x) = k_B * k_A * H(x)
        |                                                                 |
        +----------------------- MATCH DISCOVERY -------------------------+
                                 P_BA(y) == P_AB(x)
```

Due to the commutativity of scalar multiplication on elliptic curves:
$$k_A \cdot k_B \cdot H(x) = k_B \cdot k_A \cdot H(x)$$

- Non-matching customer records remain completely opaque (protected by the discrete logarithm problem on SECP256k1).
- Matches are identified solely at the coordinate level.
- Multi-party extension supports tripartite matching between Bank A, Bank B, and Telecom C.

---

## 2. ZERO-KNOWLEDGE PROOFS (GROTH16 / BN254)

### 2.1 The Regulatory Compliance Challenge
In multi-hop fraud containment, a destination bank often needs to prove that a customer account has received deposits exceeding the statutory freeze threshold ($\tau = ₹15,00,000$) to justify an immediate administrative freeze without revealing individual transaction amounts or innocent third-party sender details.

### 2.2 Groth16 NIZKP Architecture
TARKA incorporates a Circom-compatible Groth16 Zero-Knowledge Succinct Non-Interactive Argument of Knowledge (ZK-SNARK) over the Alt-bn128 (BN254) pairing curve:
- **Private Witness:** $w = \langle \text{amount}_1, \dots, \text{amount}_k, \text{salt}_1, \dots, \text{salt}_k \rangle$.
- **Public Inputs:** $x = \langle \tau, \text{MerkleRoot} \rangle$.
- **Circuit Relations (132 R1CS Constraints):**
  $$\sum_{i=1}^k \text{amount}_i \ge \tau \quad \land \quad \text{MerkleVerify}(\text{amount}_i, \text{salt}_i, \text{MerkleRoot}) = 1$$
- **Verification Guarantee:** Evaluates pairing equality $e(\pi_A, \pi_B) = e(\alpha, \beta) \cdot e(\pi_C, \delta) \cdot e(x, \gamma)$ in under $4.0\text{ms}$.
- **Tamper Rejection:** Any mutation to the public threshold, proof points $\pi_A, \pi_B, \pi_C$, or Merkle root results in immediate cryptographic rejection (`verified: False`).

