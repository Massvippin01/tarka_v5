# SUTRAM 2026 PS04 — TEAM TECHNICAL DEFENCE
## MEMBER A: FORENSIC INTELLIGENCE, KNOWLEDGE GRAPH, ENTITY RESOLUTION & SMT FORMAL REASONING

**Document Identifier:** `TARKA-DEFENCE-MEMBER-A-2026-V1`  
**Defense Lead:** Member A (Forensic Intelligence Lead)  
**Evaluation Target:** Knowledge Graph, Entity Resolution, CGNAT Attribution, Mule Taint DAG & Z3 SMT Solver  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Technical Defence Pack

---

### 1. BEGINNER EXPLANATION (HIGH-LEVEL FOR GENERAL AUDIENCE)

*"Imagine an extortionist who uses cloned phone numbers, opens bank accounts under stolen names, and moves money through multiple bank accounts in minutes. Traditional police teams spend weeks sending letters to different banks and telecom companies, trying to piece together paper trails that often contradict each other.*

*My role in TARKA is to build the cognitive forensic brain. TARKA instantly reads bank statements, telecom logs, and police reports, verifies every transaction, and builds an accurate criminal network graph. If a suspect claims they were out of the country while their phone was pinging a tower in Delhi, TARKA spots the contradiction. If a bank account received stolen money mixed with honest retail sales, TARKA calculates the exact legal freeze amount without shutting down the innocent business. And most importantly, TARKA never guesses—every finding is mathematically verified by a formal theorem prover."*

---

### 2. DEEP TECHNICAL SPECIFICATION & ARCHITECTURE

```
+---------------------------------------------------------------------------------------------------------+
|                                    MEMBER A COGNITIVE ARCHITECTURE                                      |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|   RAW EVIDENCE BYTES ===> [Evidence Gateway] ===> CAS Storage (SHA-256)                                 |
|                                    |                                                                    |
|           +------------------------+------------------------+                                           |
|           v                        v                        v                                           |
|   [Entity Resolution]      [CGNAT Attribution]      [Mule Taint DAG]                                    |
|   - Jaro-Winkler Fuzzy     - Bounded Time [t-d..t+d]- FIFO / LIFO / Proportional                         |
|   - Hard-Veto (PAN/Aadhaar)- Dynamic NAT IPDR Match - Roscoe v. Winder (LIBR)                           |
|   - Contradiction Flag     - Port Pool Disambiguator- Dinic Min-Cut Cut-Set                             |
|           |                        |                        |                                           |
|           +------------------------+------------------------+                                           |
|                                    |                                                                    |
|                                    v                                                                    |
|                         [CANONICAL KNOWLEDGE GRAPH]                                                     |
|                                    |                                                                    |
|                                    v                                                                    |
|                 [Microsoft Z3 SMT Solver v5.1.0 Engine]                                                 |
|                 - Formal Constraint Formulation                                                         |
|                 - Minimal Unsatisfiable Core (MUS) Extraction                                           |
|                 - Counterfactual Ablation Re-evaluation                                                 |
+---------------------------------------------------------------------------------------------------------+
```

#### 2.1 Entity Resolution & Hard-Veto Guarantees
- **Source File:** `backend/tarka/engine/entity_resolution.py`
- **Fuzzy Token Matching:** Uses weighted combinations of Jaro-Winkler, Levenshtein distance, and Soundex for phonetic and typographical variations in Indian names.
- **The Hard-Veto Invariant:**
  $$\text{Confidence}(e_1, e_2) = 
  \begin{cases}
  0.00 & \text{if } \text{PAN}(e_1) \ne \text{PAN}(e_2) \vee \text{AadhaarHash}(e_1) \ne \text{AadhaarHash}(e_2) \\
  f_{\text{fuzzy}}(e_1, e_2) & \text{otherwise}
  \end{cases}$$
- **Contradiction Preservation:** When a high-confidence name match fails due to a hard-veto, it is not silently discarded; it is flagged with `CONTRADICTION_FLAG` and routed to the examiner.

#### 2.2 Carrier-Grade NAT (CGNAT) 340-to-1 Attribution
- **Source File:** `backend/tarka/engine/cgnat.py`
- **Problem Formulation:** Dynamic NAT IPDR masks thousands of subscribers behind a single public IPv4 address.
- **SMT Constraint Model:**
  $$C_{\text{CGNAT}} \equiv (t_{\text{req}} - \Delta t \le t_{\text{nat}} \le t_{\text{req}} + \Delta t) \wedge (\text{ip}_{\text{ext}} = \text{ip}_{\text{target}}) \wedge (\text{port}_{\text{ext}} = \text{port}_{\text{target}})$$
- Solved by Z3 SMT solver in $< 15\text{ms}$, uniquely identifying the subscriber's internal IP, RADIUS session, and IMEI.

#### 2.3 Multi-Accounting Mule Taint & Dinic Min-Cut
- **Source File:** `backend/tarka/engine/taint.py`
- **Doctrines Supported:** FIFO, LIFO, Proportional Allocation, Roscoe v. Winder (LIBR), Clayton's Rule.
- **Dinic Min-Cut Optimization:** Given a directed flow network $G = (V, E)$ with capacities $c(u, v)$ representing account balances, computes minimum cut $(S, T)$ separating source victims $S$ from exit sinks $T$, minimizing total legitimate funds impacted:
  $$\min \sum_{u \in S, v \in T} c(u, v)$$

#### 2.4 Z3 SMT Counterfactual Reasoning
- **Source File:** `backend/tarka/engine/counterfactual.py`
- **Mathematical Specification:** Encodes evidentiary assertions as first-order logic formulas. On artifact ablation $\mathcal{A}' = \mathcal{A} \setminus \{a_{\text{excluded}}\}$, evaluates $\text{Check}(\mathcal{A}' \cup \mathcal{C})$. Returns `SAT`, `UNSAT`, or `UNKNOWN`, and computes Minimal Unsatisfiable Subsets (MUS).

---

### 3. EXECUTABLE TEST EVIDENCE & BENCHMARKS

- `tests/test_tarka_sentinelx_integration.py` $\rightarrow$ **33/33 PASSED** in 65.21s.
- `tests_tarka/tests/test_phase3a_counterfactual.py` $\rightarrow$ **20/20 PASSED** in 28.74s.
- `tests/test_golden_case_cross_source.py` $\rightarrow$ **1/1 PASSED** in 3.27s (Processed all 11 source families).

---

### 4. DESIGN TRADE-OFFS & FAILURE CASES

- **Trade-Off: Neo4j vs. NetworkX In-Memory:** Neo4j provides persistent ACID graph storage, but requires significant memory and Docker services. Under Profile 3 (Air-Gapped Laptop), TARKA smoothly falls back to NetworkX with identical BFS/Dinic Min-Cut algorithms.
- **Failure Case: Ambiguous CGNAT Translation Window:** If a telco's NTP clock skew exceeds $\pm 120$ seconds, multiple candidate subscribers may satisfy the port allocation window. Rather than arbitrarily picking one, TARKA surfaces an **Ambiguity Warning** and demands a Section 94 BNSS RADIUS AAA log verification.

---

### 5. LIKELY JUDGE QUESTIONS & DEFENCE ANSWERS

**Q1: "Why not simply use an LLM like GPT-4 or Claude to resolve entities and trace money trails?"**  
*Member A Answer:* *"LLMs are probabilistic generative models. They hallucinate, cannot guarantee arithmetic conservation of money across 5-column bank journals, and are legally inadmissible under Section 63 BSA because their weights are non-deterministic black boxes. TARKA uses deterministic graph theory and Microsoft Z3 SMT solver. Our entity resolution has a mathematical hard-veto guarantee, and our money trail satisfies formal conservation equations."*

**Q2: "What happens if a bank account has ₹10 Lakhs of legitimate retail business income, and a scammer transfers ₹1 Lakh of stolen funds into it? Do you freeze the entire account?"**  
*Member A Answer:* *"No. Freezing the entire account violates commercial rights and fails in High Court under Section 106(1) BNSS. TARKA applies the Roscoe v. Winder Lowest Intermediate Balance Rule (LIBR). We place a debit lien on exactly ₹1,00,000 while protecting the ₹10,00,000 clean operating balance."*

**Q3: "How does the SMT Counterfactual Lens help prosecutors?"**  
*Member A Answer:* *"In court, defense lawyers always attempt to suppress evidence—for example, challenging an uncertified tower ping. Our SMT Claim Lens allows prosecutors to simulate that suppression in advance. If a claim collapses upon removing an artifact, the prosecutor knows they need corroborating evidence before filing the charge-sheet."*
