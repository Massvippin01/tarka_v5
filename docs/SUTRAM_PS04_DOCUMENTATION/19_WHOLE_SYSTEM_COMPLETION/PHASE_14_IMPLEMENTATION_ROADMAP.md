# TARKA SUTRAM 2026 PS04 — PHASE 14.0–14.1
## DELIVERABLE 9: WHOLE-SYSTEM IMPLEMENTATION & INTEGRATION ROADMAP (PHASE 14.2+)

**Document Identifier:** `TARKA-PHASE14-ROADMAP-V1`  
**Working Branch:** `phase-14/whole-system-completion`  
**Baseline Anchor:** `e2a4268c2022901dfa0dbc6890d26329c9f4f3cb`  
**Auditor:** Lead Systems Architect & Competition Engineering Lead  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Master Execution Roadmap

---

### 1. ROADMAP PHILOSOPHY: COMPLETE, DO NOT REBUILD

The empirical audit across Phases 14.0–14.1 has established that **the core TARKA platform is over 99% implemented, verified, and integrated.**

- 101 critical milestone tests pass with 100% success in 88.46 seconds.
- 1,463 automated tests are established across the repository.
- The React/Vite frontend builds cleanly in 25.14 seconds with zero errors.
- Both backend and frontend daemons are actively running, responsive, and communicating.

**Constitutional Mandate:** Phase 14.2 and beyond must **NOT** embark on a broad rewrite, framework migration, or redundant service duplication. The objective is to harden integration seams, verify the full 14-stage end-to-end investigative scenario on live hardware, and prepare the platform for competition demonstration.

---

### 2. PHASED ROADMAP & EXECUTION MILESTONES

```
========================================================================================================================
                                      PHASE 14 WHOLE-SYSTEM COMPLETION ROADMAP
========================================================================================================================
Phase Milestone   Focus Area & Primary Objectives                             Target Deliverables      Status
------------------------------------------------------------------------------------------------------------------------
Phase 14.0–14.1   Repository Reconnaissance & Whole-System Audit              9 Audit Documents in     COMPLETED (✓)
                  Baseline protection, 101 tests revalidated, inventory.      docs/.../19_.../
------------------------------------------------------------------------------------------------------------------------
Phase 14.2        Whole-System Integration Seam Hardening                     Integration fixes,       READY TO EXECUTE
                  - API documentation for host vs subapp endpoints.           contract test updates,
                  - Frontend settings toggle for offline vs live voice.       UI verification.
                  - Contract schema sync validation.
------------------------------------------------------------------------------------------------------------------------
Phase 14.3        End-to-End Golden Investigation Scenario Validation         Live execution log,      PLANNED
                  - Execute full 14-stage lifecycle sequentially.             browser session video,
                  - Verify live transitions from ingest to BSA §63 export.    audit trail receipts.
------------------------------------------------------------------------------------------------------------------------
Phase 14.4        Demonstration Packaging & Competition Defense Pack          Final rehearsal guide,   PLANNED
                  - Single-command demonstration launcher.                    demonstration scripts,
                  - Competition presentation & defense dossier.               institutional pack.
========================================================================================================================
```

---

### 3. RECOMMENDED IMPLEMENTATION ORDER FOR PHASE 14.2

1. **Step 1: Host vs Subapp API Documentation Alignment (`DEF-006`):**
   Explicitly document the relationship between SentinelX platform host routes (`/api/v1/health`, `/api/v1/context`) and the mounted TARKA forensic reasoning subapp (`/api/v1/forensics/tarka/api/*`) across all API reference manifests.
2. **Step 2: Shared Contract Schema Synchronization (`DEF-007`):**
   Validate that TypeScript client models in `frontend/src/types/` exactly mirror Python Pydantic definitions in `backend/tarka/contracts/canonical_v1.py` with automated JSON schema typecheck scripts.
3. **Step 3: Voice Interaction Diagnostics & Provider Toggle:**
   Add an explicit visual indicator in `VoiceHudModal.tsx` showing whether the voice engine is operating in **Live Cloud Mode (Sarvam API)** or **Deterministic Offline Fallback Mode**, ensuring clear demonstration transparency.
4. **Step 4: Execute Live 14-Stage Investigation Lifecycle Run:**
   Execute the canonical 11-family golden fraud case through the active application running on `http://127.0.0.1:5173/`, capturing response payloads and UI state transitions at each stage.
5. **Step 5: Section 63(4) BSA Dossier PDF Visual Polish (`DEF-005`):**
   Verify ReportLab PDF formatting of generated court exhibits to ensure zero text clipping across diverse Indian bank branch name and IFSC lengths.
6. **Step 6: Update `PROJECT_STATE.md` with Phase 14 Verified Metrics:**
   Record empirical test counts (101 critical tests passing, 1,463 total tests collected) and clean build verification in the repository state ledger.
7. **Step 7: Phase 14.2 Git Commit & Publication:**
   Commit hardened files to working branch `phase-14/whole-system-completion` and push to remote origin.

---

### 4. GOVERNING PRINCIPLES FOR UPCOMING EXECUTION

- **Correctness First:** Mathematical and evidentiary invariants take precedence over aesthetic convenience.
- **Evidence Over Assertion:** Never claim an integration works until verified with an executable test or live HTTP curl.
- **Fail-Closed Security:** In ambiguous authorization scenarios, reject access.
- **Human in the Loop:** Maintain the boundary that AI proposes, evidence verifies, and human decides.
