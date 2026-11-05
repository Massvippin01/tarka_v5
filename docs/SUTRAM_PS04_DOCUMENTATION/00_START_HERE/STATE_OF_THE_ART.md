# TARKA SUTRAM 2026 PS04: STATE OF THE ART
## Comparative Forensic Engineering, Cryptographic Grounding & Technical Superiority

**Document Version:** 1.0.0-PS04-STATE-OF-THE-ART  
**Date:** November 4, 2026  
**Status:** CANONICAL REFERENCE  
**Target Competition:** SUTRAM 2026 — Problem Statement PS04 (*AI-Powered Cyber Fraud Investigation & Attribution System*)  
**Repository Branch:** `feat/sutram-2026-ps04-member-b`  
**Git HEAD Baseline:** `976a6e4`  
**Working Directory:** `C:\PROJECTS\tarka_v5`  

---

# 1. EXECUTIVE OVERVIEW & COMPETITIVE POSITIONING

Modern cyber-fraud investigation systems face a trilemma:
1. **Investigative Depth:** Tracing multi-jurisdictional mule networks across banking, UPI, and telecom layers.
2. **Privacy & Data Protection:** Correlating suspect records between competing financial institutions without pooling raw PII or violating the Digital Personal Data Protection Act (DPDPA), 2023.
3. **Judicial Admissibility:** Generating mathematically rigorous, non-hallucinatory evidence trails compliant with Section 63 of the Bharatiya Sakshya Adhiniyam (BSA), 2023.

TARKA addresses this trilemma through an integrated cryptographic, distributed, and formal verification architecture.

```
+---------------------------------------------------------------------------------------------------------+
| TARKA PS04 COMPETITIVE ARCHITECTURAL BENCHMARK                                                          |
+------------------------------+--------------------+-------------------+---------------+-----------------+
| Capability Dimension         | IBM i2 Analyst     | Chainalysis / TRM | Palantir      | TARKA SUTRAM    |
|                              | Notebook           | Reactor           | Gotham        | 2026 PS04       |
+------------------------------+--------------------+-------------------+---------------+-----------------+
| Cross-Bank Privacy           | None (Requires raw | N/A (Public chain | None (Central | **ECDH-SECP256K1|
| Correlation                  | data sharing)      | only)             | data ingest)  |   PSI Protocol**|
+------------------------------+--------------------+-------------------+---------------+-----------------+
| Regulatory Solvency /        | None               | None              | None          | **Groth16 NIZKP |
| Batch Proofs                 |                    |                   |               |   BN254 Engine**|
+------------------------------+--------------------+-------------------+---------------+-----------------+
| Causal Distributed Event     | Monolithic DB      | Blockchain only   | Proprietary   | **Lamport/Vector|
| Synchronization              | timestamps         | block time        | event logs    |   Clock PBFT**  |
+------------------------------+--------------------+-------------------+---------------+-----------------+
| Mathematical Contradiction   | Manual analyst     | Heuristic alert   | Rule alerts   | **Z3 / SMT-LIB  |
| Adjudication                 | review             |                   |               |   Claim Solver**|
+------------------------------+--------------------+-------------------+---------------+-----------------+
| Fund Dissipation Rules       | Manual FIFO        | Heuristic hops    | Graph flow    | **LIBR + FIFO   |
|                              |                    |                   |               |   Strict Taint**|
+------------------------------+--------------------+-------------------+---------------+-----------------+
| Indian Statutory Compliance  | Generic export     | N/A               | Custom addon  | **Native BSA §63|
| (BSA §63 / BNS §318)         |                    |                   |               |   Certificate** |
+------------------------------+--------------------+-------------------+---------------+-----------------+
| Air-Gap & Font Compliance    | Desktop client     | Cloud SaaS only   | Enterprise on-| **100% Bundled  |
|                              |                    |                   | prem          |   Zero External**|
+------------------------------+--------------------+-------------------+---------------+-----------------+
```

---

# 2. SECTOR-WISE ARCHITECTURAL ADVANCEMENTS

### 2.1 Elliptic Curve Diffie-Hellman Private Set Intersection (ECDH-PSI)
- **Problem:** Financial institutions (e.g., HDFC, SBI, ICICI) cannot legally share unmasked account numbers, PANs, or phone numbers without an active judicial warrant due to DPDPA 2023 restrictions.
- **TARKA Implementation:** Custom zero-external-dependency SECP256k1 elliptic curve arithmetic core (`backend/tarka/privacy/psi.py`).
- **Cryptographic Guarantees:**
  - $P_A(x) = k_A \cdot H(x)$ (Blinded by Institution A).
  - $P_{AB}(x) = k_B \cdot P_A(x) = k_B \cdot k_A \cdot H(x)$ (Commutative cross-blinding).
  - Matches are identified solely at the coordinate level without decrypting non-intersecting sets.
  - Zero leakage of non-matching records; output bounded by statutory warrant scope (`CARDINALITY_ONLY` vs. `BLINDED_INTERSECTION`).

### 2.2 Zero-Knowledge Proofs for Regulatory Solvency & Batch Compliance
- **Problem:** When freezing mule accounts or auditing liquidity flows, banks must prove batch compliance without disclosing customer balances or counterparty details to rival institutions or law enforcement.
- **TARKA Implementation:** Groth16-compatible Non-Interactive Zero-Knowledge Proof (NIZKP) engine over the BN254 / Alt-bn128 curve (`backend/tarka/crypto/zkp_verifier.py`).
- **Verification Guarantee:** Proves that an institution's flagged transaction batch satisfies aggregate regulatory thresholds ($\sum \text{amount}_i \ge \tau$) with an air-gapped prover duration of $< 150\text{ms}$ and independent verification time of $< 4\text{ms}$. Private witnesses are never serialized or transmitted.

### 2.3 Distributed Evidence Synchronization & Byzantine Fault Tolerance
- **Problem:** Multi-bank cyber-fraud investigations suffer from asynchronous network partitions, uncoordinated clock skews, and out-of-order event delivery.
- **TARKA Implementation:** Tamper-evident `EventEnvelope` (`backend/tarka/distributed/event_envelope.py`) coupled with Lamport logical clocks, vector clocks, and a 4-node Practical Byzantine Fault Tolerance (PBFT) consensus engine (`backend/tarka/distributed/pbft_consensus.py`).
- **Resilience:** Reaches deterministic transaction state consensus even when $f=1$ node is crash-faulty or emitting corrupted digests.

### 2.4 Z3/SMT Forensic Claim Compiler
- **Problem:** Investigative claims (e.g. alibis, travel times, SIM usage) are frequently presented as subjective narratives without formal proofs of possibility or contradiction.
- **TARKA Implementation:** Formal SMT-LIB compiler using Microsoft Z3 (`backend/tarka/claim_compiler/`).
- **Investigative Invariant:** Formulates spatio-temporal observations as first-order logic constraints. Detects physical impossibilities (e.g., ATM cashout in Mumbai at 14:15:00 vs. BTS ping in Delhi at 14:16:30, requiring $45,920\text{ km/h}$ velocity).
- **Core Governance:** **A solver result is never presented as proof that an allegation is true; it strictly checks formal satisfiability, surfaces counterexamples, and leaves the verdict to the human judge.**

### 2.5 Strict LIBR (Lowest Intermediate Balance Rule) Taint DAG
- **Problem:** Naive FIFO or proportion-based taint tracking unlawfully freezes legitimate funds belonging to innocent third parties or merchants in multi-hop mule accounts.
- **TARKA Implementation:** Strict LIBR accounting implemented in `backend/tarka/core/taint_lien_engine.py` and visualized in the React `TaintTrackingDAGWorkspace`.
- **Legal Defense:** Calculates the exact minimum balance present between victim deposit and subsequent withdrawal, providing safe-harbor recovery boundaries recognized by Indian civil and criminal courts.

---

# 3. STATUTORY AND REGULATORY GROUNDING

| Statute / Regulation | Statutory Mandate | TARKA Architectural Enforcement |
|----------------------|-------------------|---------------------------------|
| **Bharatiya Sakshya Adhiniyam (BSA), 2023 §63** | Admissibility of electronic records requires cryptographic hash integrity, device provenance, and system maintenance certification. | Auto-generated Section 63 Certificate with SHA-256 chain-of-custody, parser version manifest, and NTP drift caliper offsets. |
| **Bharatiya Nyaya Sanhita (BNS), 2023 §318(4) & §319** | Cheating by personation and dishonestly inducing delivery of property via electronic means. | Entity resolution with explicit matching factors and mandatory human adjudication gate. |
| **Information Technology Act, 2000 §66C & §66D** | Identity theft and cheating using computer resources. | CGNAT/IPDR BGP port translation alignment matching NAT sessions to subscribers. |
| **Digital Personal Data Protection Act (DPDPA), 2023** | Purpose limitation, data minimization, and prevention of unauthorized PII exposure. | Private Set Intersection (PSI) and Zero-Knowledge Proofs prevent cross-bank PII leakage. |
| **RBI Master Directions on Cyber Fraud (2024)** | Mandatory 24-hour inter-bank lien marking and freeze directives. | Distributed event envelopes with sub-second vector clock ordering and automated freeze notifications. |

---

# 4. CURRENT BASELINE MATURITY (PHASE 4 M0)

As of commit `976a6e4` and Phase 4 Milestone M0:
- **Canonical Schemas:** 12 Canonical v1 contracts formalized in Pydantic v2 and TypeScript.
- **Test Integrity:** 15/15 contract tests passing, 41/41 specialized PS04 tests passing, 317/317 core forensic tests passing, 37/37 frontend unit tests passing, and 0 frontend production build errors.
- **Interoperability:** Mock service interfaces deployed for Member A, Member B, and Member C, enabling concurrent development without merge contention.

