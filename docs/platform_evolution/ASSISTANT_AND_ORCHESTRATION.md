# TARKA | UNIVERSAL ASSISTANT & ORCHESTRATION ARCHITECTURE
## Evidence-Grounded Reasoning, 7 Specialist Roles, and Consequential Guardrails

**Implementation:** `frontend/src/v6/assistant/TarkaUniversalAssistant.tsx`  
**Backend Adapter:** `backend/app/intelligence/sarvam_voice_service.py`  
**Governance Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  

---

## 1. Orchestration Architecture

The TARKA Universal Assistant coordinates 7 specialist forensic tools under a centralized, non-autonomous orchestrator:

```
                          Examiner Question / Query
                                     │
                                     ▼
                      Central Forensic Orchestrator
                                     │
        ┌─────────────┬──────────────┼─────────────┬─────────────┐
        ▼             ▼              ▼             ▼             ▼
    Evidence      Financial       Temporal      Network       Forensic
     Analyst       Analyst        Analyst       Analyst      Reasoning
    (Tiers &     (Reconcile     (Golden Hour  (Mule Rings     (Z3 SMT
     Hashes)       Lien)           Decay)       Graph)        Solver)
        └─────────────┴──────────────┼─────────────┴─────────────┘
                                     │
                                     ▼
                        Evidence Grounding Filter
                     (Attach SHA-256 Citations &
                     Separate Inferences from Facts)
                                     │
                                     ▼
                         Audited Response to Officer
```

---

## 2. The 7 Specialist Forensic Roles

1. **Evidence Analyst**:
   Verifies physical and digital chain-of-custody, SHA-256 bitstream checksums, and statutory trust tier classifications (T1/T2/T3).
2. **Financial Analyst**:
   Traces inter-bank transfer hops, calculates mule account velocity, and models recoverable amounts under Section 106 BNSS freeze orders.
3. **Temporal Analyst**:
   Normalizes heterogeneous timezone offsets to Indian Standard Time (IST) and tracks Golden Hour survival windows.
4. **Entity & Network Analyst**:
   Applies graph analytics to detect dense mule clusters, common device identifiers (IMEI/IMSI), and synthetic identities without performing premature automatic merges.
5. **Forensic Reasoning Analyst**:
   Formulates logical premises into first-order logic and queries the Microsoft Z3 SMT solver for satisfiability or contradiction proofs.
6. **Statutory Report Analyst**:
   Compiles verified findings into formal Section 63 BSA certificates and court-proof evidence bundles.
7. **Voice & Language Service**:
   Translates, normalizes Indic phonetics, and renders natural conversational audio in 13 supported languages.

---

## 3. Strict Consequential Action Guardrails

Under the SentinelX Constitution, autonomous agent actions that alter legal status or evidence custody are prohibited:
- AI **never** freezes a bank account independently. It proposes the lien and drafts the notice under Section 106 BNSS; the investigating officer must click to sign and authorize.
- AI **never** declares an individual guilty or innocent. It isolates mathematical contradictions and observable linkages.
- Every claim emitted by the assistant includes an explicit **Evidence Citation Badge** referencing the source artifact ID, filename, and cryptographic hash.

