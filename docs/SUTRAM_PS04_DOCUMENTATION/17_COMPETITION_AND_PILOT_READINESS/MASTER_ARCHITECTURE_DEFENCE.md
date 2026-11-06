# SUTRAM 2026 PS04 — MASTER TECHNICAL DEFENCE
## UNIFIED SYSTEM ARCHITECTURE, STATUTORY INTEGRITY & CROSS-SUBSYSTEM DEFENCE

**Document Identifier:** `TARKA-DEFENCE-MASTER-2026-V1`  
**Defense Panel:** Full TARKA Engineering Team (Members A, B, and C)  
**Competition Target:** SUTRAM 2026 Problem Statement PS04  
**Product:** TARKA Cyber Fraud Investigation & Attribution Workbench  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Master Technical Brief

---

### 1. UNIFIED SYSTEM TOPOLOGY

TARKA is engineered as a unified, zero-trust digital forensics and financial cybercrime investigation workbench. It synthesizes three core engineering disciplines into an unshakeable evidentiary pipeline:

```
+=========================================================================================================+
|                                    TARKA UNIFIED FORENSIC TOPOLOGY                                      |
+=========================================================================================================+
|                                                                                                         |
| [TIER 1: MULTI-AGENCY INTAKE & STORAGE] (Member C Lead)                                                 |
|   Bank CBS (Finacle) | Telco IPDR (Airtel) | Police FIR (CCTNS) | Mobile UFED (OnePlus) | Acrobat PDF    |
|                                    |                                                                    |
|                                    v                                                                    |
|             [CAS Storage Authority: SHA-256 Bitstream Seal & Custody Chain]                             |
|             [Intake Gate: Bitstream Hash Invariant & PDF %%EOF Trailer Audit]                           |
|                                    |                                                                    |
| +----------------------------------+----------------------------------+                                 |
| |                                                                     |                                 |
| v                                                                     v                                 |
| [TIER 2: COGNITIVE FORENSICS] (Member A)               [TIER 3: CRYPTOGRAPHIC TRUST] (Member B)          |
| - Hard-Veto Entity Resolution (PAN/Aadhaar)             - Tripartite ECDH-PSI (Inter-Bank Privacy)       |
| - CGNAT 340-to-1 Attribution Engine                    - Circom / SnarkJS Zero-Knowledge Verifier       |
| - Mule Taint DAG (Roscoe v. Winder / Dinic Min-Cut)    - 4-Node PBFT Consensus State Machine            |
| - Microsoft Z3 SMT Solver v5.1.0 Formal Reasoning      - Vector Clock Causal Event Ordering             |
|                                    |                                  |                                 |
|                                    +----------------------------------+                                 |
|                                                      |                                                  |
|                                                      v                                                  |
| [TIER 4: SIGNATURE INTERACTION SYSTEMS & USER EXPERIENCE] (Joint Architecture)                          |
| - Temporal Evidence Loom: Multi-track timeline with +/- Delta-t drift solver                            |
| - Claim Dependency Lens: Interactive artifact ablation & counterfactual SMT impact                      |
| - Investigation Flight Recorder: Tamper-evident hash-chained audit ledger                               |
|                                                      |                                                  |
|                                                      v                                                  |
| [TIER 5: JUDICIAL & STATUTORY PRODUCTION] (Member C Lead)                                               |
| - Bharatiya Sakshya Adhiniyam, 2023 Section 63(4) Electronic Record Dossier                             |
| - MHA Golden Hour 1930 SOP Directives (§94, §106, §107 BNSS Attachment Orders)                          |
+=========================================================================================================+
```

---

### 2. THE 11 CONSTITUTIONAL INVARIANTS

Every subsystem in TARKA strictly conforms to the SentinelX Wave 6 Engineering Constitution:

1. **Repository Truth:** Executable code overrides documentation, claims, and plans.
2. **Framework Boundary:** Pure Vite + React + TypeScript frontend; pure Python + FastAPI backend. No unapproved migrations.
3. **Data Authority:** PostgreSQL is transactional authority; CAS S3 is byte authority; Neo4j and OpenSearch are rebuildable derived projections.
4. **Evidence Immutability:** Raw bytes are append-only. SHA-256 content hashes are permanent. Evidence is DATA_ONLY.
5. **Investigative Reasoning:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES. No automatic guilt/innocence classification.
6. **Lineage & Provenance:** Every claim traces backward through formal links to its raw evidence artifact hash.
7. **Statutory Governance:** PolicyGateway fail-closed enforcement; legal registries are descriptive, never authoritative.
8. **Reasoning Model Safety:** Private chain-of-thought is never persisted or logged; prompt injection remains passive data.
9. **Production Readiness:** External systems are explicitly categorized as Genuine, Tested, or Blocked. No mock-as-production fabrication.
10. **Change Discipline:** Smallest required change, regression test, build check, and git safety before merge.
11. **Final Priority Ordering:** `CORRECTNESS -> EVIDENCE -> SECURITY -> REPRODUCIBILITY -> OBSERVABILITY -> RECOVERY -> PERFORMANCE -> CONVENIENCE`.

---

### 3. THE LIFECYCLE OF DIGITAL EVIDENCE IN TARKA

```
Raw Evidence Bytes
  `--> 1. Acquisition & Ingestion (Evidence Gateway)
         `--> 2. Bitstream Hash & CAS Preservation (SHA-256 Seal)
                `--> 3. Format Parsing & Extraction (CCTNS, Finacle, CGNAT, PDF)
                       `--> 4. Falsification & Invariant Validation (Gate 0)
                              `--> 5. Canonical Knowledge Graph Construction
                                     `--> 6. Hard-Veto Entity Disambiguation
                                            `--> 7. SMT Formal Constraint Formulation (Z3)
                                                   `--> 8. Multi-Bank Private Intersection (PSI)
                                                          `--> 9. Consensus Ledger Replication (PBFT)
                                                                 `--> 10. Human Officer Adjudication
                                                                        `--> 11. Section 63 BSA Dossier Export
```

---

### 4. COMPREHENSIVE GRAND JURY TECHNICAL DEFENCE

**Q: "What makes TARKA superior to existing commercial digital forensic suites (EnCase, Cellebrite, Palantir)?"**  
*Team Defence:*  
*"Existing tools suffer from three fundamental limitations:*
1. *Cellebrite and EnCase are isolated endpoint triage tools; they do not correlate dynamic telco CGNAT IPDR logs with multi-bank core banking journals.*
2. *Palantir and generic graph platforms rely on manual link analysis or unconstrained LLMs that hallucinate false connections and cannot prove why a claim holds under legal challenge.*
3. *Commercial tools completely ignore Indian criminal jurisprudence (BNSS and BSA 2023).*

*TARKA is purpose-built for Indian cyber jurisprudence. It integrates Microsoft Z3 SMT solver for formal counterfactual verification, executes private set intersection between competing banks without DPDP violations, solves 340-to-1 telco port funnels, and generates statutory Section 63(4) BSA court certificates automatically. It does not replace the human investigator—it empowers them with mathematical certainty."*
