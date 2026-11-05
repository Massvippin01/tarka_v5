# M3 CRYPTOGRAPHIC VERIFICATION REPORT
## Mathematical Proofs, Curve Parameters, Zero-Knowledge Verification, and Ledger Authenticity

**Milestone:** M3 (Adversarial Validation, Security, and Forensic Reliability)  
**Track:** SUTRAM 2026 — Problem Statement PS04  
**Date:** November 5, 2026  
**Governing Doctrine:** AI Proposes. Evidence Verifies. Human Decides.

---

# 1. CRYPTOGRAPHIC SUITE OVERVIEW

TARKA deploys standard, battle-tested cryptographic primitives implemented with zero proprietary obfuscation or un-audited ciphers:

| Subsystem | Cryptographic Primitive | Security Level | Primary Purpose | Test Verification |
|:---|:---|:---:|:---|:---:|
| **Evidence Ledger** | SHA-256 Merkle Chain | 128-bit collision resistance | Immutable exhibit chaining and tamper detection | `test_03_append_only_hash_chain` |
| **BFT Consensus** | HMAC-SHA256 | 256-bit authentication | Authenticating inter-validator prepare and commit votes | `test_11_bft_invalid_signature` |
| **Institutional PSI** | SECP256k1 ECDH-PSI | 128-bit discrete log security | Privacy-preserving multi-bank suspect correlation | `test_08_ecdh_psi_pairwise` |
| **Audit Compliance** | Groth16 / BN254 NIZKP | 128-bit pairing security | Proving batch regulatory compliance without leaking amounts | `test_09_zkp_groth16_tampering` |

---

# 2. ZERO-KNOWLEDGE PROOF (NIZKP) VERIFICATION RESULTS

In banking audits, financial institutions must prove to law enforcement or central bank supervisors that an account's aggregate daily transfer volume remains under a statutory limit (e.g., ₹50,000 for simplified KYC accounts) without disclosing individual transaction entries.

### Protocol Verification (`backend/tarka/crypto/zkp_verifier.py`)
1. **Public Inputs:**
   - Regulatory threshold: $T = 50,000.0$
   - Merkle root commitment of private transaction amounts: $R$
   - Batch size: $N = 3$
2. **Private Witness:**
   - Secret transaction amounts: $\{15000.0, 10000.0, 20000.0\}$ ($\sum = 45000.0 \le 50000.0$)
   - Cryptographic salts: $\{s_1, s_2, s_3\}$
3. **Verification Outcome:**
   - **Honest Proof:** Evaluates `verified == True` in $1.11\,\text{ms}$.
   - **Adversarial Threshold Tampering ($T=30,000$):** Fails verification immediately (`verified == False`).
   - **Group Element Byte Mutation:** Fails verification immediately.
