# TARKA SUTRAM 2026 PS04: TEAM OWNERSHIP & SERVICE BOUNDARIES
## Multi-Disciplinary Engineering Division, Interface Contracts & Non-Interference Protocols

**Document Version:** 1.0.0-PS04-OWNERSHIP-BOUNDARIES  
**Date:** November 4, 2026  
**Status:** FORMALIZED & RATIFIED  
**Governing Authority:** SUTRAM 2026 Problem Statement PS04 Engineering Directive  
**Repository:** `c:\PROJECTS\tarka_v5`  
**Branch:** `feat/sutram-2026-ps04-member-b`  

---

# 1. ARCHITECTURAL ALLOCATION & OWNERSHIP PRINCIPLES

To achieve institutional-grade forensic depth while preventing architectural collisions, the TARKA development team operates under strict service boundaries and explicit interface contracts.

### Core Non-Interference Invariants:
1. **Explicit API Contracts:** Workstreams communicate exclusively through documented Pydantic schemas (backend) and TypeScript interfaces (frontend).
2. **No Monolithic Overrides:** No member may delete, rename, or re-architect modules owned by another member without formal RFC sign-off.
3. **Data Authority Preservation:** Transactional authority remains in PostgreSQL; graph projection remains in Neo4j; search projection remains in OpenSearch; raw evidence remains in immutable S3/local vault.
4. **Governing Triad:** **AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.** All components must respect this human-adjudicator boundary.

---

# 2. DETAILED MEMBER OWNERSHIP MATRIX

```
+---------------------------------------------------------------------------------------------------+
| TARKA ENGINEERING DIVISION: THREE-MEMBER OWNERSHIP MATRIX                                         |
+---------------------+--------------------------------------------+--------------------------------+
| Team Member         | Primary Domain Specialization              | Owned Packages & Subsystems    |
+---------------------+--------------------------------------------+--------------------------------+
| **MEMBER A**        | • Entity Resolution & Deduplication        | `backend/tarka/entity/`        |
| Forensic            | • Temporal Knowledge Graph (Neo4j)         | `backend/tarka/graph/`         |
| Intelligence        | • Fraud-Network Intelligence & Topology    | `backend/tarka/network/`       |
|                     | • Financial Transaction Reconstruction     | `backend/tarka/reconstruct/`   |
|                     | • Telecom (IPDR/CGNAT/BGP) Reasoning       | `backend/tarka/telecom/`       |
|                     | • Graph & Financial Investigation Workspaces| `frontend/src/components/`    |
|                     |                                            |   `tarka/{network,entity,taint}`|
+---------------------+--------------------------------------------+--------------------------------+
| **MEMBER B**        | • 3-Institution Privacy Simulation         | `backend/app/services/`        |
| Privacy,            | • Private Set Intersection (Diffie-Hellman)|   `ps04_{psi,zkp,bft,...}`     |
| Cryptography,       | • Zero-Knowledge Proofs (Groth16/ZKP)      | `backend/tests/test_ps04_*.py` |
| Distributed Systems | • Distributed Event Engine & Vector Clocks | `backend/tarka/contracts/`     |
| & Claim Compiler    | • PBFT Consensus Fault Experiment (4 nodes)| `frontend/src/components/`    |
|                     | • Privacy Threat Modeling & Leakage Audits |   `tarka/privacy/`             |
|                     | • **Forensic Claim Compiler (Z3 / SMT)**   | `backend/app/services/`        |
|                     |   - Typed Evidence & Claim Representation  |   `ps04_claim_compiler.py`     |
|                     |   - Claim Dependency DAG & Recomputation   | `frontend/src/components/`    |
|                     |   - Contradiction & Counterexample Engine  |   `tarka/kit/`                 |
|                     |   - Leave-One-Out Evidence Ablation        |                                |
|                     |   - Replay & Verification Manifests        |                                |
+---------------------+--------------------------------------------+--------------------------------+
| **MEMBER C**        | • Case Management & Workflow Platform      | `backend/app/routers/cases*`   |
| Evidence Platform,  | • Evidence Ingestion & Cryptographic Vault | `backend/app/services/ingest*` |
| AI & Evaluation     | • Bounded AI Assistance (LLM Rationale)    | `backend/app/services/llm*`    |
|                     | • Synthetic Ground Truth Generator         | `backend/tests_tarka/generator`|
|                     | • Adversarial Falsification Suite          | `backend/tests_tarka/tests/`   |
|                     | • Evaluation & Benchmark Laboratory        | `frontend/src/components/`    |
|                     | • Court Dossier & BSA Section 63 Assembly  |   `tarka/{workspace,intake,`   |
|                     | • Global Shell, CI/CD Pipeline & Deploy    |   `reports,evaluation,shell}`  |
+---------------------+--------------------------------------------+--------------------------------+
```

---

# 3. SERVICE BOUNDARIES & DATA HAND-OFF INTERFACES

### 3.1 Member C → Member A: Raw Evidence to Graph Entities
- **Source:** Evidence Ingestion Vault (`backend/app/services/ingest/`)
- **Contract:** `CanonicalEvidence` contract. Raw files (bank CSVs, IPDR logs, UPI receipts) are verified by SHA-256 and parsed into normalized transaction records.
- **Hand-off:** Member A consumes `CanonicalEvidence` and maps it to `CanonicalEntity` and `CanonicalTransaction` nodes in the Neo4j graph without altering raw custody hashes.

### 3.2 Member A → Member B: Graph Clusters to Inter-Bank PSI & Claims
- **Source:** Fraud Network & Entity Resolution (`backend/tarka/network/`, `backend/tarka/entity/`)
- **Contract:** `CanonicalEntity` and `CanonicalTransaction` models.
- **Hand-off:** Member B extracts identifiers (phone numbers, UPI handles, account hashes) for privacy-preserving intersection queries via `PSIRequest` across simulated banking nodes, and extracts causal statements into `CanonicalClaim` structures for SMT validation.

### 3.3 Member B → Member C: SMT Claims & ZKP Proofs to Final Court Dossier
- **Source:** Forensic Claim Compiler & ZKP Engine (`backend/app/services/ps04_claim_compiler.py`, `ps04_zkp.py`)
- **Contract:** `CanonicalClaim` and `ZKProofMetadata`.
- **Hand-off:** Member C takes verified claim DAGs, contradiction analyses, and zero-knowledge solvency/balance proofs and compiles them into tamper-evident PDF Court Dossiers with Section 63 BSA certificates.

---

# 4. CROSS-WORKSTREAM COLLABORATION PROTOCOLS

1. **Shared Contracts Ownership:**
   - Canonical v1 contracts defined in `backend/tarka/contracts/` and `frontend/src/types/contracts/` are shared property.
   - Any proposed modification to a canonical field requires a backward-compatible version increment (e.g., `v1` $\to$ `v1.1`) or explicit tripartite review.
2. **Conflict Resolution Mechanism:**
   - In the event of a semantic dispute (e.g., whether an IP address constitutes an Entity or an Observation), the **SentinelX Wave 6 Engineering Constitution** governs: *AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.* Common ownership can never be inferred solely from shared IP or device observations.
3. **Branch & Repository Etiquette:**
   - Feature branches remain strictly segregated (`feat/sutram-2026-ps04-member-a`, `feat/sutram-2026-ps04-member-b`, `feat/sutram-2026-ps04-member-c`).
   - Integration merges are gated by the complete 391-test regression harness.

