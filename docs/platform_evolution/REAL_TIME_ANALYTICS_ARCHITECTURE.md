# TARKA | REAL-TIME INVESTIGATIVE ANALYTICS ARCHITECTURE
## Event-Driven Analysis, Cross-Source Correlation, and Contradiction Proving

**Components:**  
- `backend/app/services/ingestion/large_evidence_engine.py` (Realtime Pipeline)  
- `backend/tarka/core/contradiction_analysis.py` (Z3 SMT Solver)  
- `backend/tarka/core/cross_source_correlation.py` (Multi-Source Entity Resolution)  
- `backend/tarka/core/timeline_reconstruction.py` (IST Normalization & Golden Hour Decay)  

---

## 1. Event-Driven Analytical Pipeline

Upon reaching **Stage 5 (`EVIDENCE_ADMITTED`)**, TARKA triggers an asynchronous investigative pipeline without human delay:

```
[STAGE 5: EVIDENCE ADMITTED]
             │
             ├──► Stage 6: Content Extracted (OCR, Ledger Rows, CDR Timestamps)
             │
             ├──► Stage 7: Content Indexed (Inverted Token Index, Case Vectors)
             │
             ├──► Stage 8: Analytical Processing Completed
             │      ├── Financial Reconciliation (Complainant vs Bank CBS vs Gateway)
             │      ├── Cross-Source Entity Resolution (Phone, IMEI, Account, IP)
             │      └── Timeline Chronology & Golden Hour Interception Mapping
             │
             ├──► Stage 9: Results Validated (Z3 SMT Solver Proves Satisfiability)
             │
             └──► Stage 10: Evidence Available (Live in Case Workbench)
```

---

## 2. Cross-Source Intelligence Matrix

TARKA correlates heterogeneous exhibits while maintaining strict evidential tiers:

| Evidence Tier | Source Examples | Evidentiary Weight | Inferred vs Verified |
| :--- | :--- | :--- | :--- |
| **Tier 1 (T1)** | Bank CBS Exports, Telecom CDR Records, Official Gateway Logs | Canonical statutory authority | Verified ground truth |
| **Tier 2 (T2)** | Merchant Receipts, Device Sysdiagnose, Cloud IP Logs | High corroborative authority | Strong inference |
| **Tier 3 (T3)** | Complainant Screenshots, WhatsApp Chat Exports, User Claims | Subjective claims | Unverified until cross-referenced |

### Epistemic Rule
- Matching phone numbers between a suspect chat and a bank account indicates an **observed identifier link**, not conclusive proof of common ownership.
- Temporal overlap (e.g., cell tower connection within 15 minutes of an ATM withdrawal) establishes **geographic plausibility**, never definitive guilt.

---

## 3. Mathematical Contradiction Resolution (Z3 SMT Solver)

TARKA uses the Microsoft Z3 SMT solver to evaluate formal mathematical constraints:
- **Ledger Conservation**: $\sum \text{Debits} = \sum \text{Credits} + \text{Interchange Fees}$. If the equation does not balance, an arithmetic contradiction is flagged.
- **Physical Spacetime Impossibility**: Velocity calculation between GPS / Cell tower coordinates:
  $$\text{velocity} = \frac{\Delta \text{distance}}{\Delta \text{time}}$$
  If $\text{velocity} > 900\text{ km/h}$ for non-aviation transit, an irreconcilable spatio-temporal contradiction is generated.

