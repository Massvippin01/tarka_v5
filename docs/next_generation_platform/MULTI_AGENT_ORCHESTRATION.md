# TARKA | CONTROLLED MULTI-AGENT ORCHESTRATION

**Architecture:** Bounded Central Orchestrator with Specialist Capability Routing  
**Core Rule:** Agents are strictly bounded and governed; no uncontrolled peer-to-peer delegation; no autonomous mutation of raw evidence.  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. Architectural Philosophy

In digital forensics and criminal investigations, autonomous "free-agent" swarms that converse unconstrained and self-delegate tasks are inherently hazardous:
- Agents can hallucinate consensus.
- One agent's speculative hypothesis can be mistakenly treated as an established factual input by a downstream agent.
- Autonomous agents can trigger destructive database mutations or violate evidence custody boundaries.

TARKA solves this by implementing a **Governed Central Orchestrator** architecture:

```
                                    ┌────────────────────────────────────────────────────────┐
                                    │                   INVESTIGATOR REQUEST                 │
                                    └───────────────────────────┬────────────────────────────┘
                                                                │
                                                                ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │                   TARKA ORCHESTRATOR                   │
                                    │                                                        │
                                    │  1. Intent & Context Parser                            │
                                    │  2. RBAC Policy & Case Authorization Gateway           │
                                    │  3. Deterministic Specialist Capability Router         │
                                    │  4. Cryptographic Request Logger (REQ-YYYY-XXXX)       │
                                    └───────────────┬────────────────────────┬───────────────┘
                                                    │                        │
                    ┌───────────────────────────────┴────────┐      ┌────────┴───────────────────────────────┐
                    ▼                                        ▼      ▼                                        ▼
       ┌────────────────────────┐               ┌────────────────────────┐              ┌────────────────────────┐
       │   Evidence Analyst     │               │   Financial Analyst    │              │    Temporal Analyst    │
       │ • SHA-256 Bitstreams   │               │ • Finacle Reconciler   │              │ • Clock Drift Normalizer│
       │ • Custody Verification │               │ • LIBR Lien Engine     │              │ • CGNAT 4-Tuple Lookup │
       └────────────────────────┘               └────────────────────────┘              └────────────────────────┘
                    │                                        │                                       │
                    ├────────────────────────────────────────┴───────────────────────────────────────┤
                    ▼                                                                                ▼
       ┌────────────────────────┐               ┌────────────────────────┐              ┌────────────────────────┐
       │Entity & Network Analyst│               │Forensic Reasoning Lead │              │     Report Analyst     │
       │ • Hard-Veto Clustering │               │ • Tri-State Solver     │              │ • Section 63 BSA Cert  │
       │ • Betweenness Hotspots │               │ • Z3 SMT Contradictions│              │ • Bank Requisition     │
       └────────────────────────┘               └────────────────────────┘              └────────────────────────┘
                                                             │
                                                             ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │               EVIDENCE GROUNDING VERIFIER              │
                                    │                                                        │
                                    │ • Validates SHA-256 lineage back to raw bitstreams     │
                                    │ • Strips unverified hallucinations                     │
                                    │ • Enforces Human Confirmation for consequential actions│
                                    └────────────────────────┬───────────────────────────────┘
                                                             │
                                                             ▼
                                    ┌────────────────────────────────────────────────────────┐
                                    │        STRUCTURED EVIDENCE-REFERENCED RESPONSE         │
                                    └────────────────────────────────────────────────────────┘
```

---

## 2. The 7 Specialist Capabilities

### 1. Evidence Analyst
- **Responsibilities:** Evaluates raw file ingestion, client-side SHA-256 hash generation, MIME type validation, and BIP-39 mnemonic bitstream seals.
- **Authorized Tools:** `evidence_dna_lookup()`, `hash_integrity_verify()`, `quarantine_check()`.
- **Invariants:** Raw evidence is append-only and strictly immutable.

### 2. Financial Analyst
- **Responsibilities:** Audits banking account statements (Finacle, BaNCS), executes double-entry balance continuity equations, and computes Lowest Intermediate Balance Rule (LIBR) proportional recovery liens under BNSS §106/§107.
- **Authorized Tools:** `cbs_ledger_reconcile()`, `libr_lien_calc()`, `tamper_check_row()`.
- **Invariants:** Discrepancies trigger immediate Gate I1 violations and cannot be hidden.

### 3. Temporal Analyst
- **Responsibilities:** Aligns heterogenous timestamps from telecom RADIUS logs, bank UPI switches, WhatsApp messaging transcripts, and mobile extraction dumps. Normalizes local clock skew against atomic NTP standards.
- **Authorized Tools:** `timestamp_normalize()`, `cgnat_port_lookup()`, `clock_skew_evaluate()`.
- **Invariants:** Enforces strict causality ($E_{\text{cause}} \le E_{\text{effect}}$); detects impossible sequence inversions.

### 4. Entity and Network Analyst
- **Responsibilities:** Performs graph traversals across account nodes, phone registrants, and virtual payment addresses (VPAs). Computes degree, betweenness, and eigenvector centrality.
- **Authorized Tools:** `graph_traverse()`, `hard_veto_merge_check()`, `hotspot_detect()`.
- **Invariants:** Hard-Veto shield blocks automated mergers if permanent legal identifiers (PAN, Aadhaar hash) conflict.

### 5. Forensic Reasoning Analyst
- **Responsibilities:** Evaluates investigative claims using Z3 SMT Difference Logic solvers. Detects contradictions between independent evidentiary streams.
- **Authorized Tools:** `z3_difference_logic_solver()`, `claim_dependency_trace()`, `counterfactual_simulate()`.
- **Invariants:** Outputs are strictly tri-state (`CONFIRMED`, `CONTRADICTED`, `UNVERIFIED`).

### 6. Report Analyst
- **Responsibilities:** Translates technical forensic findings into judicial-grade statutory documents.
- **Authorized Tools:** `generate_bsa_63_cert()`, `draft_bank_freeze_notice()`, `export_dossier()`.
- **Invariants:** Certificates must detail software version, host calibration, and full cryptographic custody records.

### 7. Voice and Language Service
- **Responsibilities:** Manages streaming speech recognition (STT), language identification, code-mixed parsing (Tanglish, Hinglish), and speech synthesis (TTS).
- **Authorized Tools:** `speech_transcribe()`, `language_identify()`, `speech_synthesize()`.
- **Invariants:** Transcripts are preserved verbatim; audio telemetry drives live waveform feedback.

---

## 3. Orchestration Invariants & Security Boundaries

1. **Deterministic Execution Routing:** Known analytical questions (e.g. "Calculate LIBR recovery for Account #1002") execute via deterministic mathematical code, **never** via ungrounded LLM guessing.
2. **Read-Only Parallel Execution:** Parallel agent execution is permitted exclusively for side-effect-free, read-only data extraction tasks (e.g., extracting hash metadata and normalizing timestamps simultaneously).
3. **Auditable Request Tracking:** Every orchestration event receives a unique cryptographic Request ID (`REQ-YYYY-XXXX`) logged to the immutable Flight Recorder with millisecond timestamps and officer identity.
4. **Zero Cross-Case Data Leakage:** Case isolation is enforced at the database and memory layer. The orchestrator cannot query or inject data from `CASE-2026-002` when operating inside the context of `CASE-2026-001`.

