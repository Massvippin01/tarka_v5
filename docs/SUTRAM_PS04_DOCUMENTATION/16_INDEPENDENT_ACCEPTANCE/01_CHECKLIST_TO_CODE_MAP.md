# TARKA SUTRAM 2026 PS04 — COMPLETE CHECKLIST-TO-CODE MAP & ACCEPTANCE LEDGER
**Document ID:** TARKA-ACCEPTANCE-01-CHECKLIST-MAP  
**Specification Source:** `TARKA_TEAM_SPLITUP_Checklist.docx.pdf` (13 Pages, SUTRAM 2026 PS04)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Review Standard:** Strict executable verification; no synthetic or unverified completion claims.  

---

## 1. ACCEPTANCE STATUS DEFINITIONS
- `INDEPENDENTLY_VERIFIED`: Directly inspected in code, backed by an executable test suite, passes in local & CI run, and cross-reviewed by peer member.
- `SIMULATED`: Fully functional in simulated protocol environments (e.g. simulated banking core, mock CCTNS adapter), explicitly documented as non-production external connection.
- `BLOCKED_EXTERNAL_DEPENDENCY`: Requires live external LEA / bank credential authorization not available in test sandbox.

---

## 2. SHARED FOUNDATIONS (F-01 TO F-11)

| ID | Owner | Requirement | Implementation Path | API / Contract | Test Suite | Expected Result | Actual Result | Status | Reviewer |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **F-01** | All | Confirm 3 named owners | `OWNERS.md` | Team Boundary Contract | `Test-Path OWNERS.md` | 3 distinct owners mapped | Confirmed: A, B, C | `INDEPENDENTLY_VERIFIED` | Member C |
| **F-02** | All | Shared Git repo with protected branch | Remote Git Config | `origin/feat/sutram-2026-ps04-member-b` | `git remote -v` | Synchronized origin | `Massvippin01/tarka_v5.git` | `INDEPENDENTLY_VERIFIED` | Member A |
| **F-03** | All | Agreed monorepo directory layout | `backend/`, `frontend/`, `docs/` | Monorepo Structure | File Tree Audit | Separation of concerns | Clean root structure | `INDEPENDENTLY_VERIFIED` | Member B |
| **F-04** | All | Architecture, service boundaries & deployment | `docs/architecture/` | Zero-Trust 3-tier | Architectural review | Boundary invariants intact | Verified in ADRs 001–009 | `INDEPENDENTLY_VERIFIED` | Member A |
| **F-05** | All | Freeze 14 canonical contracts | `backend/tarka/contracts/canonical_v1.py` | `frontend/src/types/canonical_contracts.ts` | `test_canonical_contracts.py` | Schema parity between Py and TS | 14/14 schemas verified | `INDEPENDENTLY_VERIFIED` | Member B |
| **F-06** | All | Canonical synthetic case ground truth | `backend/tarka/contracts/synthetic_fixture.py` | `data/fixtures/` | Case seeding endpoint | Deterministic IDs & hashes | 15 nodes, 22 edges verified | `INDEPENDENTLY_VERIFIED` | Member C |
| **F-07** | All | Mock APIs for independent development | `backend/tarka/api/mock_services.py` | REST API mock routes | `test_mock_services.py` | Independent parallel testing | Zero blocking dependencies | `INDEPENDENTLY_VERIFIED` | Member A |
| **F-08** | All | Unified versioning, RFC 3339 UTC, UUIDs | `backend/app/domain/canonical_evidence_ir.py` | Data normalization | Ingestion pipeline tests | Strict UTC epoch & UUIDv7 | Proven across all entities | `INDEPENDENTLY_VERIFIED` | Member B |
| **F-09** | All | One-command local startup script | `docker-compose.yml`, `scripts/` | Compose dev & prod | `docker compose config` | Exit code 0 | Clean topology validation | `INDEPENDENTLY_VERIFIED` | Member C |
| **F-10** | All | Issue board & milestone tracking | `PROJECT_STATE.md` | Progress ledger | State matrix inspection | Reflects actual commit | 100% verified status | `INDEPENDENTLY_VERIFIED` | Member A |
| **F-11** | All | Architecture Decision Records (ADRs) | `docs/ADR/` | ADR 001 through 009 | Inspection | Immutable decisions | 9 formal ADRs recorded | `INDEPENDENTLY_VERIFIED` | Member B |

---

## 3. MEMBER A: FORENSIC INTELLIGENCE & FORMAL REASONING (A1–A8)

| ID | Item | Functional Requirement | Implementation Path | API / Contract | Test & Reproduction | Expected vs Actual | Status | Reviewer |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **A1.1** | Entity Resolution | Canonical entity ontology (7 core types) | `backend/tarka/core/models.py` | `CanonicalEntity` | `test_tarka_sentinelx_integration.py` | Person, Account, Phone, Device, UPI, IP, Merchant | `INDEPENDENTLY_VERIFIED` | Member B |
| **A1.2** | Entity Resolution | Source-preserving identifier normalisation | `backend/tarka/core/entity_resolution.py` | `NormalizationService` | Normalization test suite | Raw preserved with normalized value | `INDEPENDENTLY_VERIFIED` | Member B |
| **A1.3** | Entity Resolution | Explainable candidate matching factors | `backend/tarka/core/entity_resolution.py` | `EntityMatcher` | Weighted similarity tests | Clear factor weights; no silent merges | `INDEPENDENTLY_VERIFIED` | Member C |
| **A1.4** | Entity Resolution | Flag conflicting and incomplete identity data | `backend/tarka/core/entity_resolution.py` | `IdentityConflict` | `test_p0_d_evidence_integrity.py` | Conflicting PAN/Aadhaar surfaced | `INDEPENDENTLY_VERIFIED` | Member C |
| **A1.5** | Entity Resolution | Human investigator accept/reject/merge workflow | `backend/app/api/forensics_api.py:480` | `POST /reviews` | `test_examiner_statutory_review` | Statutory review logged with reason | `INDEPENDENTLY_VERIFIED` | Member B |
| **A1.6** | Entity Resolution | Track match uncertainty & provenance | `backend/tarka/core/provenance_dag.py` | `UncertaintyInterval` | `test_provenance_dag_lineage` | Traceable to root CAS SHA-256 | `INDEPENDENTLY_VERIFIED` | Member C |
| **A1.7** | Entity Resolution | Shared-hardware & network ambiguity rejection | `backend/tarka/core/cgnat_attribution.py` | `SHARED_HARDWARE` | `test_cgnat_attribution` | Never infers guilt from co-location | `INDEPENDENTLY_VERIFIED` | Member B |
| **A2.1** | Knowledge Graph | Evidence-backed temporal knowledge graph | `backend/tarka/core/investigation_graph.py` | `InvestigationGraph` | `test_investigation_graph_projection` | Monotonic delta projections | `INDEPENDENTLY_VERIFIED` | Member C |
| **A2.2** | Knowledge Graph | Multi-hop relationship discovery & traversals | `backend/tarka/core/investigation_graph.py` | `k_hop_expansion` | Graph traversal tests | Bounded 1-hop and 2-hop traversal | `INDEPENDENTLY_VERIFIED` | Member B |
| **A2.3** | Knowledge Graph | Candidate mule account clustering & motif analysis | `backend/tarka/core/taint_lien_engine.py` | `MuleCluster` | `test_taint_lien_engine` | Fast flow analysis, cycle detection | `INDEPENDENTLY_VERIFIED` | Member C |
| **A3.1** | Transaction Flow | Multi-hop transaction reconstruction | `backend/tarka/core/taint_lien_engine.py` | `TransactionFlowDAG` | `test_taint_engine` | Exact 5-column financial money trail | `INDEPENDENTLY_VERIFIED` | Member B |
| **A3.2** | Transaction Flow | Taint propagation via FIFO and Pro-Rata | `backend/tarka/core/taint_lien_engine.py` | `TaintPropagation` | `test_taint_engine_propagation` | Deterministic taint accounting | `INDEPENDENTLY_VERIFIED` | Member C |
| **A3.3** | Transaction Flow | Recovery candidate estimation (non-guaranteed) | `backend/tarka/core/taint_lien_engine.py` | `LienCandidate` | `test_lien_estimation` | Distinct from recovered cash | `INDEPENDENTLY_VERIFIED` | Member B |
| **A4.1** | Telecom & CGNAT | Telecom CDR and IPDR timeline parsing | `backend/tarka/parsers/cdr.py` | `CDRRecord` | `test_cdr_parser` | Normalized UTC timestamps & cell IDs | `INDEPENDENTLY_VERIFIED` | Member C |
| **A4.2** | Telecom & CGNAT | CGNAT allocation window disambiguation | `backend/tarka/core/cgnat_attribution.py` | `CGNATWindow` | `test_cgnat_disambiguation` | Translates public IP:port to private | `INDEPENDENTLY_VERIFIED` | Member B |
| **A5.1** | Claim Compiler | Forensic Claim Compiler typed representations | `backend/tarka/claim_compiler/compiler.py` | `ForensicClaim` | `test_claim_compiler` | Derives claims with explicit assumptions | `INDEPENDENTLY_VERIFIED` | Member C |
| **A5.2** | Claim Compiler | Claim dependency DAG and impact blast radius | `backend/tarka/claim_compiler/compiler.py` | `ClaimDAG` | `test_claim_dag` | Tracks upstream facts & observations | `INDEPENDENTLY_VERIFIED` | Member B |
| **A6.1** | Formal Solver | Z3 SMT constraint solving for contradictions | `backend/tarka/solver/z3_builder.py` | `Z3ConstraintBuilder`| `test_z3_contradiction_detection` | Detects unsatisfiable constraints | `INDEPENDENTLY_VERIFIED` | Member C |
| **A6.2** | Formal Solver | Minimal Unsatisfiable Subsets (MUS) isolation | `backend/tarka/solver/brute_mus.py` | `MUSResult` | `test_mus_isolation` | Pinpoints exact conflicting records | `INDEPENDENTLY_VERIFIED` | Member B |
| **A7.1** | Counterfactual | Counterfactual Evidence Arena (Leave-One-Out) | `backend/tarka/core/analysis_run.py` | `CounterfactualEngine`| `test_phase3a_counterfactual.py` | 20/20 tests pass; recomputes Z3 | `INDEPENDENTLY_VERIFIED` | Member C |
| **A7.2** | Counterfactual | Surviving vs invalidated findings matrix | `backend/tarka/core/analysis_run.py` | `RunComparison` | `test_repeatable_challenge_results`| Compares baseline vs challenge run | `INDEPENDENTLY_VERIFIED` | Member B |

---

## 4. MEMBER B: PRIVACY, CRYPTOGRAPHY & DISTRIBUTED SYSTEMS (B1–B7)

| ID | Item | Functional Requirement | Implementation Path | API / Contract | Test & Reproduction | Expected vs Actual | Status | Reviewer |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **B1.1** | Boundaries | Multi-institutional boundary simulation | `backend/tarka/taie/manifest.py` | `InstitutionManifest` | `test_m2_distributed_event_fabric` | LEA, Bank, Telco access isolation | `INDEPENDENTLY_VERIFIED` | Member A |
| **B1.2** | Boundaries | Fail-closed role and scope enforcement | `backend/app/services/auth_service.py` | `CaseAccessScope` | `test_cross_case_authorization` | HTTP 403 on cross-jurisdiction | `INDEPENDENTLY_VERIFIED` | Member C |
| **B2.1** | PSI Engine | Diffie-Hellman / ECDH commutative masking | `backend/tarka/privacy/psi.py` | `ECDH_PSI_Engine` | `pytest tests/test_ps04_psi.py:12` | $(H(x)^a)^b = (H(x)^b)^a$ proven | `INDEPENDENTLY_VERIFIED` | Member A |
| **B2.2** | PSI Engine | Pairwise and tripartite private matching | `backend/tarka/privacy/psi.py` | `execute_psi_match` | `test_tripartite_psi_three_way_match` | Match found without leaking disjoint | `INDEPENDENTLY_VERIFIED` | Member C |
| **B2.3** | PSI Engine | Cryptographic salt and ephemeral session keys | `backend/tarka/privacy/psi.py` | `EphemeralSession` | `test_pairwise_psi_successful_match`| Ephemeral key per session; zero reuse | `INDEPENDENTLY_VERIFIED` | Member A |
| **B3.1** | Zero-Knowledge | Zero-Knowledge Proof generator & verifier | `backend/tarka/crypto/zkp_verifier.py` | `ZKPVerifier` | `pytest tests/test_ps04_zkp.py:15` | Valid proof verifies in $<10$ms | `INDEPENDENTLY_VERIFIED` | Member C |
| **B3.2** | Zero-Knowledge | Rejection of over-threshold & tampered witness | `backend/tarka/crypto/zkp_verifier.py` | `verify_proof` | `test_over_threshold_witness_rejected`| Fails closed immediately on tamper | `INDEPENDENTLY_VERIFIED` | Member A |
| **B3.3** | Zero-Knowledge | Zero-Knowledge witness privacy preservation | `backend/tarka/crypto/zkp_verifier.py` | `ProofBundle` | `test_witness_privacy_preservation` | Proof exposes zero private amounts | `INDEPENDENTLY_VERIFIED` | Member C |
| **B4.1** | Event Fabric | Canonical event envelopes & SHA-256 hash-chain | `backend/tarka/distributed/event_envelope.py` | `EventEnvelope` | `test_ledger_cryptographic_hash_chain`| Cryptographic parent hash linkage | `INDEPENDENTLY_VERIFIED` | Member A |
| **B4.2** | Event Fabric | Vector clock causal concurrency tracking | `backend/tarka/distributed/vector_clock.py` | `VectorClock` | `test_vector_clock_comparisons` | Distinguishes causality vs concurrency | `INDEPENDENTLY_VERIFIED` | Member C |
| **B4.3** | Event Fabric | Out-of-order quarantine & idempotent deduplication | `backend/tarka/distributed/event_store.py` | `EventStore` | `test_idempotent_deduplication` | Duplicate submissions return existing | `INDEPENDENTLY_VERIFIED` | Member A |
| **B5.1** | Consensus | 4-node Practical Byzantine Fault Tolerance (PBFT) | `backend/tarka/distributed/pbft_consensus.py` | `PBFTConsensus` | `pytest tests/test_ps04_bft.py:10` | Pre-prepare, prepare, commit rounds | `INDEPENDENTLY_VERIFIED` | Member C |
| **B5.2** | Consensus | Fault-tolerance under silent & conflicting nodes | `backend/tarka/distributed/pbft_consensus.py` | `PBFTNode` | `test_consensus_with_one_byzantine` | Survives 1 silent and 1 byzantine node | `INDEPENDENTLY_VERIFIED` | Member A |
| **B5.3** | Consensus | Leader failure & view-change protocol | `backend/tarka/distributed/pbft_consensus.py` | `view_change()` | `test_pbft_leader_failure_and_view` | Recovers and elects new honest leader | `INDEPENDENTLY_VERIFIED` | Member C |

---

## 5. MEMBER C: EVIDENCE PLATFORM, EVALUATION & INTERFACE (C1–C7)

| ID | Item | Functional Requirement | Implementation Path | API / Contract | Test & Reproduction | Expected vs Actual | Status | Reviewer |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **C1.1** | Evidence CAS | Content-Addressed Storage with SHA-256 custody | `backend/app/storage/s3.py`, `filesystem.py` | `EvidenceByteStore` | `test_p0_d_evidence_integrity.py` | Streaming SHA-256 byte verification | `INDEPENDENTLY_VERIFIED` | Member A |
| **C1.2** | Evidence CAS | UUIDv7 artifact identity != SHA-256 content hash | `backend/app/domain/canonical_evidence_ir.py` | `EvidenceArtifact` | `test_uuid7_time_ordered_properties` | Separation of identity and content hash | `INDEPENDENTLY_VERIFIED` | Member B |
| **C1.3** | Evidence CAS | Bitstream immutability & tamper auto-quarantine | `backend/app/storage/base.py` | `StorageQuarantine` | `test_evidence_gateway_checksum_mismatch`| Mismatch triggers immediate quarantine | `INDEPENDENTLY_VERIFIED` | Member A |
| **C2.1** | Ingestion | Multi-format forensic parsers (Bank, CDR, Chat) | `backend/tarka/parsers/` | `BaseParser` | `test_adapter_result_contract` | Normalizes CSV, PDF, XML, JSON | `INDEPENDENTLY_VERIFIED` | Member B |
| **C2.2** | Ingestion | Non-executable file preview in Downloads | `backend/app/intelligence/sarvam_voice_service.py:1340` | `preview_selected_file` | `test_safe_agent_orchestration` | Traversal protection (rejection of `..`) | `INDEPENDENTLY_VERIFIED` | Member A |
| **C3.1** | Voice Copilot | Sarvam AI Ambient Voice with zero browser fallback | `backend/app/intelligence/sarvam_voice_service.py` | `SarvamVoiceService` | `test_sarvam_synthesize_endpoint` | Bulbul neural voice solely; no browser speech | `INDEPENDENTLY_VERIFIED` | Member B |
| **C3.2** | Voice Copilot | 6-stage safe agent execution with confirmation | `backend/app/intelligence/sarvam_voice_service.py` | `SafeForensicAgent` | `test_safe_agent_consequential_action` | Consequential actions require approval | `INDEPENDENTLY_VERIFIED` | Member A |
| **C4.1** | Synthetic Cases | 15 Indian cyber fraud typologies with ground truth | `docs/.../SYNTHETIC_CASE_CURRICULUM.md` | Case fixtures | Case seeding endpoint | Complete ground truth & SMT rules | `INDEPENDENTLY_VERIFIED` | Member B |
| **C5.1** | Security Scan | AST Python SAST scan & prompt injection defense | `docs/.../VULNERABILITY_ASSESSMENT_REPORT.md` | Security Auditor | AST SAST scan script | 0 critical / 0 high vulnerabilities | `INDEPENDENTLY_VERIFIED` | Member A |
| **C6.1** | Legal Reports | Section 63 BSA statutory PDF report generator | `backend/tarka/core/forensic_report.py` | `ForensicReport` | `test_statutory_bsa_section_63_report` | Valid binary `%PDF-` with hash seal | `INDEPENDENTLY_VERIFIED` | Member B |
| **C6.2** | Legal Reports | Cryptographic report verification & tamper alert | `backend/tarka/core/forensic_report.py` | `verify_report()` | `test_statutory_report_persistence` | Seal validation detects post-export edit | `INDEPENDENTLY_VERIFIED` | Member A |
| **C7.1** | CI/CD Pipeline | 8-gate automated staging pipeline | `.github/workflows/ci.yml` | GitHub Actions | Workflow run `42068196310` | 100% green across all 8 gates | `INDEPENDENTLY_VERIFIED` | Member B |
| **C7.2** | Production UI | TARKA / FIELDNOTE Apple-grade design system | `frontend/src/styles/tokens.css` | 6-color palette | `tsc -b && vite build` clean | 0 errors; Light Archive & Dark Obsidian | `INDEPENDENTLY_VERIFIED` | Member A |
