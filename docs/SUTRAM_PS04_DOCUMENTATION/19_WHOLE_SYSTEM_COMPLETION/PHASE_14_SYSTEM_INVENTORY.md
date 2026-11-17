# TARKA SUTRAM 2026 PS04 — PHASE 14.0–14.1
## DELIVERABLE 3: WHOLE-SYSTEM ARCHITECTURAL & CODEBASE INVENTORY

**Document Identifier:** `TARKA-PHASE14-SYS-INVENTORY-V1`  
**Working Branch:** `phase-14/whole-system-completion`  
**Target Repository:** `C:\PROJECTS\tarka_v5`  
**Auditor:** Whole-System Architecture Verification Team  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / System Inventory

---

### 1. INVENTORY OVERVIEW & TAXONOMY

This inventory catalogues the actual, executable components of the TARKA platform across backend services, frontend user interfaces, shared contracts, data persistence, cryptographic engines, and external adapters. Each component is audited based on source code presence, executable status, and integration fidelity.

---

### 2. BACKEND SERVICES & CONTROLLERS

```
========================================================================================================================
                                       BACKEND CONTROLLER & SERVICE INVENTORY
========================================================================================================================
Module Path                        Mounted Route Prefix             Role & Implementation Status
------------------------------------------------------------------------------------------------------------------------
backend/app/main.py                /                                Host FastAPI Application (SENTINELX NEXUS)
backend/app/api/health.py          /api/v1/health, /ready           Host health and readiness probes
backend/app/api/forensics_api.py   /api/v1/forensics                SentinelX Forensics & Graph Projection API
backend/tarka/api/server.py        /api/v1/forensics/tarka          Core TARKA Forensic Reasoning Engine Subapp
backend/app/api/agent_api.py       /api/v1/agents                   Autonomous agent task dispatch & telemetry
backend/app/api/command_api.py     /api/v1/command                  Investigator Command Bus (dispatch & cancel)
backend/app/api/context_api.py     /api/v1/context                  Operating Context & Active Case state
backend/app/api/voice_api.py       /api/v1/voice                    Voice session, STT turn & TTS streaming
backend/app/api/memory_api.py      /api/v1/memory                   Governed Working Memory & session recall
backend/app/api/investigations_api.py /api/v1/investigation         High-level investigation workflow endpoints
backend/tarka/distributed/         Internal / Service Mesh          PBFT Consensus, Event Envelope & Vector Clock
backend/tarka/claim_compiler/      Internal / SMT Pipeline          Z3 Formal Verifier & Counterfactual Engine
backend/tarka/crypto/              Internal / Crypto Service        Groth16 ZKP Proof Verifier & SnarkJS Bridge
backend/tarka/privacy/             Internal / Privacy Service       Commutative ECDH-PSI (Curve secp256k1)
backend/tarka/taie/                Internal / Ingestion Service     Telecom & Institutional Ingestion Framework
========================================================================================================================
```

---

### 3. FRONTEND APPLICATIONS & INTERFACES

The frontend is a single-page TypeScript/React application located in `frontend/` powered by Vite:

```
========================================================================================================================
                                      FRONTEND COMPONENT & VIEW INVENTORY
========================================================================================================================
Component / Directory              Route / Entry Point              Role & Implementation Status
------------------------------------------------------------------------------------------------------------------------
frontend/src/App.tsx               / (Root router)                  Routes between TarkaGlobalShell and InvestigationCanvas
frontend/src/components/shell/     TarkaGlobalShell.tsx             FIELDNOTE 6-Color Forensic HUD Shell & Header
frontend/src/components/views/     IntakeView.tsx                   Multi-source evidence ingestion & hash verification
frontend/src/components/views/     EntityResolutionView.tsx         Graph entity resolution with Hard-Veto rules
frontend/src/components/views/     FinancialTracingView.tsx         Mule account taint DAG, FIFO/LIFO/LIBR & Dinic Min-Cut
frontend/src/components/views/     FraudNetworkView.tsx             Interactive D3/ForceAtlas2 graph & JA4 TLS clusters
frontend/src/components/views/     TemporalEvidenceLoom.tsx         5-track multi-source timeline with clock drift
frontend/src/components/views/     ClaimDependencyLens.tsx          Formal claim graph with Z3 SMT counterfactual ablation
frontend/src/components/views/     FlightRecorderView.tsx           Linear SHA-256 hash-chain audit log with time-travel
frontend/src/components/views/     PrivacyHubView.tsx               Multi-bank ECDH-PSI and Groth16 ZKP threshold proofs
frontend/src/components/views/     CourtProofView.tsx               BSA §63(4) certificate & MHA Golden Hour dispatch orders
frontend/src/components/           AICopilotDrawer.tsx              AI investigation copilot with evidence citations
frontend/src/components/           VoiceHudModal.tsx                Multilingual voice interaction modal (Sarvam AI)
frontend/src/workers/              forensicBenchmark.worker.ts      Offloads graph layout calculation from main UI thread
frontend/src/workers/              publicDatasetStreamer.worker.ts  Streams large synthetic telecom/banking datasets
========================================================================================================================
```

---

### 4. SHARED CONTRACTS & TYPE HARMONIZATION

Shared data transfer models and schemas are synchronized between Python Pydantic models and TypeScript definitions:

- **Backend Pydantic Authority:** `backend/tarka/contracts/canonical_v1.py` (Defines `CanonicalCase`, `CanonicalEvidence`, `CanonicalEntity`, `CanonicalTransaction`, `CanonicalClaim`, `CanonicalInstitutionEvent`, `CanonicalPSIPayload`, `CanonicalZKPProof`).
- **Frontend TypeScript Definitions:** `frontend/src/types/canonical.ts`, `forensics.ts`, `contracts.ts`.
- **Validation Fixtures:** `backend/tarka/contracts/synthetic_fixture.py` (Golden test fixtures with known ground truth across 11 source families).

---

### 5. PERSISTENCE, DATABASES & MIGRATIONS

1. **Relational Database (PostgreSQL / SQLite):**
   - **PostgreSQL (Production):** Containerized PostgreSQL 16 on `pg_prod_data` volume. Models in `backend/app/database/models.py` (Accused, Act, Case, Complainant, Court, Crime, Person, Phone, Section, Vehicle, Victim).
   - **Alembic Migrations:** `backend/alembic/versions/0001_initial_schema.py` establishes the complete relational schema.
   - **SQLite (Local Testing Fallback):** `backend/tarka.db` used for isolated local unit tests without requiring a running Docker daemon.
2. **Graph Database (Neo4j):**
   - **Neo4j 5.20 Community:** Containerized with APOC plugin on `neo4j_prod_data` volume.
   - **Cypher Queries:** Defined in `backend/app/graph/cypher_queries.py` and `cypher_builder.py`.
   - **Graph Projection Adapter:** `frontend/src/services/graphProjectionAdapter.ts` converts Neo4j projections into D3/ForceAtlas2 canvas nodes and links.
3. **Evidence Vault (CAS / MinIO):**
   - **Content Addressable Storage (CAS):** In `backend/app/storage` and `data/storage/artifacts`. Files stored strictly by `sha256(bytes)`.
   - **MinIO Object Storage:** S3-compatible service (`rustfs/rustfs:1.0.0`) configured in `docker-compose.yml` for multi-gigabyte disk dumps.

---

### 6. CRYPTOGRAPHY, FORMAL VERIFICATION & PRIVACY

```
========================================================================================================================
                                     CRYPTOGRAPHIC & VERIFICATION SUBSYSTEMS
========================================================================================================================
Subsystem            Source Files                                    Mathematical & Cryptographic Primitives
------------------------------------------------------------------------------------------------------------------------
ECDH-PSI             backend/tarka/privacy/psi.py                    Elliptic Curve Diffie-Hellman over secp256k1
                                                                     Commutative blinding: H(x)^a^b = H(x)^b^a
Zero-Knowledge Proof backend/tarka/crypto/zkp_verifier.py            Groth16 zk-SNARK verification circuit with 
                     backend/tarka/crypto/circuits/                  BN254 curve witness privacy protection
PBFT Consensus       backend/tarka/distributed/pbft_consensus.py     Practical Byzantine Fault Tolerance (3f+1 nodes)
                                                                     Pre-prepare, Prepare, Commit, and View-Change
Distributed Events   backend/tarka/distributed/event_store.py        Event sourcing with append-only hash chains
                     backend/tarka/distributed/event_envelope.py     Idempotency digests and out-of-order quarantine
Vector Clocks        backend/tarka/distributed/vector_clock.py       Lamport-style vector clock causal ordering
                                                                     Detects concurrent vs causal events & clock drift
SMT Solver           backend/tarka/solver/z3_builder.py              Z3 Theorem Prover constraint formulation
                     backend/tarka/solver/marco_mus.py               MARCO algorithm for Minimal Unsatisfiable Subsets
Counterfactual Lab   backend/tarka/claim_compiler/counterfactual.py  Evidence-ablation counterfactual reasoning
========================================================================================================================
```

---

### 7. TELECOM, BANKING & INSTITUTIONAL ADAPTERS (TAIE)

The Telecom and Institutional Adapter Framework (`backend/tarka/taie/`) handles heterogeneous ingestions:
- **11 Source Families Supported:**
  1. Indian Bank Statements (SBI, HDFC, ICICI, PNB CSVs)
  2. NPCI UPI Transaction Logs (UPI RRN, VPA, Remitter/Beneficiary IFSC)
  3. Telco Call Detail Records (Airtel, Jio, Vi CDR/SDR)
  4. CGNAT IPDR Port Allocation Tables (Public IP + Port range to IMSI/MSISDN)
  5. CCTNS First Information Reports (FIR PDF / Structured JSON)
  6. ICJS Interoperable Criminal Justice e-Courts Metadata
  7. WhatsApp Forensic Chat Exports (Export text with timestamp/sender parsing)
  8. Device EXIF Metadata (GPS coordinates, camera serial, shutter timestamp)
  9. Payment Gateway Logs (Razorpay, Cashfree webhook payloads)
  10. Crypto Wallet Ledger (USDT TRC-20, BTC blockchain transaction graphs)
  11. KYC & Identity Registry Documents (Aadhaar/PAN mask verification)

---

### 8. AUDIT OF UNUSED CODE, MOCKS & INTEGRATION DISCONNECTIONS

During the deep-dive audit, several nuances and integration seams were identified:

1. **Host Health Endpoint Semantics:**
   - As discovered in Deliverable 2, `http://localhost:8080/api/v1/health` returns `SentinelX` because `backend/app/main.py` is the host application.
   - The TARKA health endpoint resides at `/api/v1/forensics/tarka/api/health`.
   - *Status:* Functionally correct, but needs explicit documentation in API specs to prevent auditor confusion.
2. **Offline Voice Service Fallback:**
   - `backend/app/intelligence/sarvam_voice_service.py` checks for `SARVAM_API_KEY`. When the key is absent or empty, it activates deterministic local mock synthesis and transcription rather than failing.
   - *Status:* Excellent for reproducibility and offline testing; production deployment requires sovereign API credentials.
3. **Database Local vs Production Split:**
   - In offline test mode, TARKA utilizes `backend/tarka.db` (SQLite) or in-memory fixtures. In Docker production topology, it targets PostgreSQL 16 on port 5432.
   - *Status:* Both code paths are verified, with `0001_initial_schema.py` covering the relational structure.
4. **Graph Canvas Simulation Cleanup (`DEF-004`):**
   - Frontend ForceAtlas2 simulation spawns a Web Worker (`forensicBenchmark.worker.ts`). Lifecycle termination logic is confirmed in `FraudNetworkView.tsx`.
