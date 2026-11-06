# SUTRAM 2026 PS04 — TEAM TECHNICAL DEFENCE
## MEMBER B: PRIVACY, CRYPTOGRAPHY, DISTRIBUTED SYSTEMS & CONSENSUS

**Document Identifier:** `TARKA-DEFENCE-MEMBER-B-2026-V1`  
**Defense Lead:** Member B (Privacy & Cryptography Lead)  
**Evaluation Target:** ECDH-PSI, Circom ZKP Verifier, PBFT 4-Node Consensus, Distributed Event Fabric  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Technical Defence Pack

---

### 1. BEGINNER EXPLANATION (HIGH-LEVEL FOR GENERAL AUDIENCE)

*"Cyber fraud syndicates operate by exploiting the boundaries between institutions. They steal money from SBI, move it through HDFC, cash out via Axis Bank, and coordinate over Airtel mobile numbers. But these institutions cannot simply share their customer lists with each other or hand over bulk databases to the police—doing so would violate citizen privacy and the Digital Personal Data Protection Act (DPDP).*

*My role in TARKA is to build the multi-agency cryptographic trust fabric. Using Private Set Intersection (PSI), banks can discover which accounts they have in common without revealing any of their non-fraudulent customer accounts. Using Zero-Knowledge Proofs (ZKP), a suspect account's transaction threshold can be proven to a magistrate without leaking private counterparty records. And using Byzantine Fault Tolerant (PBFT) consensus, police stations across different states agree on an untampered, immutable chain of custody even if one station's computer is hacked or disconnected."*

---

### 2. DEEP TECHNICAL SPECIFICATION & ARCHITECTURE

```
+---------------------------------------------------------------------------------------------------------+
|                                    MEMBER B CRYPTOGRAPHIC ARCHITECTURE                                  |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|       [Bank A (SBI)]                  [Bank B (HDFC)]                 [Bank C (Axis)]                   |
|       Set: X = {x_1..x_n}             Set: Y = {y_1..y_m}             Set: Z = {z_1..z_k}               |
|             |                               |                               |                           |
|             v                               v                               v                           |
|      Blinded Point:                  Blinded Point:                  Blinded Point:                     |
|      (H(x))^k_A                      (H(y))^k_B                      (H(z))^k_C                         |
|             \                               |                               /                           |
|              +------------------------------+------------------------------+                            |
|                                             |                                                           |
|                                             v                                                           |
|                        [Commutative ECDH-PSI Point Matching]                                            |
|                        ((H(x))^k_A)^k_B = ((H(x))^k_B)^k_A                                              |
|                        Intersection: { Common Mule Account } Only                                       |
|                                             |                                                           |
|                                             v                                                           |
|                        [Circom / SnarkJS Zero-Knowledge Prover]                                         |
|                        - Public: Threshold > INR 5,00,000                                               |
|                        - Private (Witness): Individual Transaction Amounts (Zeroized)                   |
|                        - Verification: Groth16 SnarkJS Verifier                                         |
|                                             |                                                           |
|                                             v                                                           |
|                        [4-Node PBFT Consensus State Machine]                                            |
|                        - N = 4 Nodes (f = 1 Byzantine Fault Tolerant)                                   |
|                        - Phases: Pre-Prepare -> Prepare -> Commit -> State Commit                       |
|                        - Causal Order: Vector Clocks V = [v_1, v_2, v_3, v_4]                            |
+---------------------------------------------------------------------------------------------------------+
```

#### 2.1 Private Set Intersection (ECDH-PSI)
- **Source File:** `backend/tarka/privacy/psi.py`
- **Mathematical Grounding:** Operates over the SECP256k1 elliptic curve. Each party $P_i$ picks an ephemeral secret scalar $k_i \in_R \mathbb{Z}_q$. Elements are mapped to curve points via hash-to-curve $H: \{0, 1\}^* \rightarrow E(\mathbb{F}_p)$.
- **Commutative Invariant:**
  $$(H(x)^{k_A})^{k_B} = H(x)^{k_A k_B} = (H(x)^{k_B})^{k_A}$$
- Guarantees information-theoretic privacy for all non-intersecting set elements.

#### 2.2 Zero-Knowledge Proofs (ZKP Verifier)
- **Source File:** `backend/tarka/crypto/zkp_verifier.py`
- **Supported Circuits:**
  1. *Financial Threshold Solvency:* Proves $\sum \text{amount}_i > T$ over private transactions without revealing $\text{amount}_i$ or counterparties.
  2. *Cell Tower Co-location:* Proves a mobile handset was within distance $r$ of tower CGI during the timestamp window without exposing historical GPS coordinates.
- **Security Property:** Witness privacy is verified; private inputs are zeroized before proof transmission.

#### 2.3 4-Node Practical Byzantine Fault Tolerance (PBFT)
- **Source File:** `backend/tarka/distributed/pbft_consensus.py`
- **Consensus Equation:** $N \ge 3f + 1$. For $N = 4$, the network survives $f = 1$ Byzantine node (silent, equivocation, or malicious payload proposals).
- **Phases:**
  - *Pre-Prepare:* Primary broadcasts proposal with digest $d$.
  - *Prepare:* Replicas broadcast prepare messages; requires $2f + 1 = 3$ matching messages.
  - *Commit:* Replicas broadcast commit messages; requires $2f + 1 = 3$ matching commits.
  - *Execute & Checkpoint:* State machine applies transition to local ledger.

#### 2.4 Vector Clocks & Distributed Event Fabric
- **Source File:** `backend/tarka/distributed/vector_clock.py`
- **Causal Consistency:** Manages vector clocks $V = [v_1, v_2, \dots, v_n]$. For events $e_a$ and $e_b$, $e_a \prec e_b \iff \forall k, V(e_a)[k] \le V(e_b)[k] \wedge \exists k, V(e_a)[k] < V(e_b)[k]$.

---

### 3. EXECUTABLE TEST EVIDENCE & BENCHMARKS

- `tests/test_ps04_zkp.py` $\rightarrow$ **6/6 PASSED** in 0.92s (Witness privacy, threshold constraints, tamper rejection).
- `tests/test_ps04_bft.py` & distributed suites $\rightarrow$ **28/28 PASSED** in 1.22s (Survives 1 silent and 1 byzantine equivocating node).
- `tests/test_ps04_psi.py` $\rightarrow$ **9/9 PASSED** in 19.58s (Tripartite commutativity, zero plaintext leakage, audit logging).

---

### 4. DESIGN TRADE-OFFS & FAILURE CASES

- **Trade-Off: Asymmetric ECDH vs. Circuit-Based PSI:** ECDH-PSI requires $O(n)$ modular exponentiations on curve points, which is slightly slower for millions of records than OT-based PSI, but does not require massive memory-mapped oblivious transfer tables, making it ideal for lightweight multi-bank containers.
- **Failure Case: Byzantine Split-Brain ($f \ge 2$ in 4-node cluster):** If 2 out of 4 nodes go offline or turn malicious, the cluster fails closed and halts block production rather than risking an invalid ledger fork.

---

### 5. LIKELY JUDGE QUESTIONS & DEFENCE ANSWERS

**Q1: "Under the DPDP Act 2023, how does TARKA prevent illegal data sharing between private banks?"**  
*Member B Answer:* *"TARKA never shares raw customer account databases. We use Commutative Diffie-Hellman Private Set Intersection. Banks exchange cryptographic elliptic-curve points that are doubly blinded. Only accounts that appear in both banks' suspect sets can be decrypted; all innocent customer accounts remain completely mathematically concealed."*

**Q2: "What is the purpose of Byzantine Fault Tolerant consensus in a police application?"**  
*Member B Answer:* *"Cyber fraud is inter-state crime. An investigation may involve police stations in Delhi, Mumbai, and Bengaluru, alongside bank nodals. If a single police station's server is compromised by ransomware, or if an insider attempts to retroactively alter an evidence record, PBFT consensus prevents that single node from altering the shared ledger. Three out of four validator nodes must agree before any event block is committed."*

**Q3: "Are your Zero-Knowledge Proofs production-ready?"**  
*Member B Answer:* *"Our verification engine and Groth16 circuit verifiers are fully implemented and tested. However, as honestly declared in our Open Limitations Register, institutional sovereign deployment requires a national Multi-Party Computation (MPC) ceremony for the cryptographic trusted setup under judicial supervision."*
