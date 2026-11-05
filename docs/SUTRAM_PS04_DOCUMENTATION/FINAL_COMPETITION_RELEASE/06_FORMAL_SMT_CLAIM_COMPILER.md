# SUTRAM 2026 — PROBLEM STATEMENT PS04
# FINAL COMPETITION DOSSIER: 06. FORMAL SMT CLAIM COMPILER

**Problem Statement:** PS04 — AI-Powered Cyber Fraud Investigation & Attribution System  
**Implementation Modules:** `backend/tarka/claim_compiler/`  
**Test Suite Reference:** `test_ps04_claim_compiler.py` (5/5 Passed)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. WHY INVESTIGATIONS NEED FORMAL PROOFS

Machine-learning forensic tools output probabilistic scores (e.g., "87% probability of fraudulent intent"). In court, probabilistic claims crumble under cross-examination because they cannot answer:
1. *Is the suspect's alibi physically possible given telecom and ATM timestamps?*
2. *Does the balance sheet strictly conserve money, or is there an unaccounted leak?*
3. *If an exhibit is retracted, which derived claims are invalidated?*

TARKA answers these questions using **First-Order Logic Satisfiability Modulo Theories (SMT)** via Microsoft Z3.

---

## 2. THE CLAIM COMPILER ARCHITECTURE

```
+---------------------------------------------------------------------------------------------------------+
|                                    FORMAL SMT CLAIM COMPILER PIPELINE                                   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|       [PRIMARY EVIDENCE]                  [INSTITUTIONAL EVENTS]                  [TELECOM IPDR]        |
|        (Bank Statements)                   (Switch Commit Logs)                    (Cell Tower BTS)     |
|                |                                   |                                     |              |
|                +-----------------------------------+-------------------------------------+              |
|                                                    |                                                    |
|                                       [TYPED OBSERVATION BUILDER]                                       |
|                                  - Spatial coordinates (lat, lon)                                       |
|                                  - Discrete timestamps (UTC ISO8601)                                    |
|                                  - Balance & transaction amounts                                        |
|                                                    |                                                    |
|                                       [CLAIM DEPENDENCY DAG]                                            |
|                                  - Topological sorting of claims                                        |
|                                  - Cycle prevention (Acyclic Invariant)                                 |
|                                  - Premise -> Conclusion propagation                                    |
|                                                    |                                                    |
|                                       [Z3 SMT FORMAL VERIFIER]                                          |
|                                  - Spatio-temporal speed bound constraints                              |
|                                  - Financial conservation: Bal_k = Bal_{k-1} + Cr - Dr                  |
|                                  - Counterexample model generator (when UNSAT)                          |
|                                                    |                                                    |
|                                         [5-STATE CLAIM MATRIX]                                          |
|                         SUPPORTED | CONTRADICTED | UNCERTAIN | UNSUPPORTED | NOT_EVALUATED              |
|                                                    |                                                    |
|                                        [HUMAN DECISION GATE]                                            |
|                         Investigating Officer records digital adjudication                              |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. SPATIO-TEMPORAL CONTRADICTION ADJUDICATION

### The Physical Paradox
In `CASE_SUTRAM_2026_001`, the suspect claims physical presence in Delhi during the entire afternoon.
- **Observation A:** ATM Cash Withdrawal at SBI Bandra West, Mumbai at 14:15:00 IST ($19.0596^\circ\text{N}, 72.8295^\circ\text{E}$).
- **Observation B:** Cellular Voice Attach at Airtel BTS Nehru Place, Delhi at 14:16:30 IST ($28.5494^\circ\text{N}, 77.2536^\circ\text{E}$).
- **Distance:** $\Delta d = 1,148\text{ km}$.
- **Time Delta:** $\Delta t = 90\text{ seconds} = 0.025\text{ hours}$.

$$\text{Velocity} = \frac{1,148\text{ km}}{0.025\text{ h}} = 45,920\text{ km/h}$$

### SMT Formal Invariant
$$v_{\text{required}} \le v_{\text{max\_commercial\_aircraft}} \quad (900\text{ km/h})$$
The Z3 SMT solver proves that $v_{\text{required}} > 900\text{ km/h}$ is **UNSATISFIABLE**, immediately classifying the claim as **CONTRADICTED** and generating the counterfactual model:
$$\text{Hypothesis: Accomplice card-sharing / SIM-swap decoupled operator.}$$

---

## 4. CONSTITUTIONAL COMPLIANCE

**A solver verdict is never presented as proof that a real-world allegation is true.** The system proves whether a set of claims and observations are mutually consistent under physical laws. The ultimate indictment decision remains exclusively with the human investigating officer.

