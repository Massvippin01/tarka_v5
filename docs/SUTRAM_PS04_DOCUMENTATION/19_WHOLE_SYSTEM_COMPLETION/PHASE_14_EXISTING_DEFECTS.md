# TARKA SUTRAM 2026 PS04 — PHASE 14.0–14.1
## DELIVERABLE 4: EXISTING DEFECTS, INTEGRATION OBSERVATIONS & MITIGATION REGISTER

**Document Identifier:** `TARKA-PHASE14-DEFECT-REGISTER-V1`  
**Working Branch:** `phase-14/whole-system-completion`  
**Evaluation Scope:** Complete Subsystem Codebase & Integration Seams  
**Auditor:** Quality Assurance & System Verification Team  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Defect Register

---

### 1. DEFECT SEVERITY TAXONOMY

Defects and integration discrepancies in this register are classified using standard forensic engineering severity ratings:

- **CRITICAL:** Total failure of forensic admissibility, evidence tampering undetected, private key or witness compromise, or system-wide denial of service.
- **HIGH:** Failure of core algorithmic attribution (e.g. false entity merge, money conservation violation) or unhandled security bypass.
- **MEDIUM:** Privacy leakage under specific mathematical conditions, edge-case parsing inconsistencies, or secondary workflow degradation.
- **LOW:** Ergonomic quirks, text truncation in UI/PDF exports, naming ambiguities, or non-breaking development schema variations.

---

### 2. THE COMPREHENSIVE DEFECT REGISTER

```
========================================================================================================================
                                             TARKA DEFECT & OBSERVATION REGISTER
========================================================================================================================
ID      Severity Subsystem           Title / Description                       Mitigation / Resolution Status
------------------------------------------------------------------------------------------------------------------------
DEF-001 MEDIUM   ECDH-PSI Privacy    Set Cardinality Leakage in Unpadded PSI   MITIGATED / ACCEPTED WITH LIMITATIONS
                                     Unpadded Diffie-Hellman reveals set size. Power-of-two bucket padding documented.
DEF-002 MEDIUM   Evidence Ingestion  Incremental PDF Trailer Update Bypass     RESOLVED
                                     Incremental PDF writes altered trailer.   Strict whole-file binary SHA-256 enforced.
DEF-003 LOW      PBFT Consensus      Static View-Change Timer Quorum Jitter    RESOLVED
                                     Simultaneous view changes caused split.   Randomized exponential backoff added.
DEF-004 LOW      Graph Visualization Worker Pool Lifecycle Cleanup On Unmount RESOLVED
                                     ForceAtlas2 worker leaked memory on exit. Explicit terminate() invoked on unmount.
DEF-005 LOW      Statutory Dossier   Text Truncation on Long Bank Addresses    RESOLVED
                                     Long addresses clipped in Section 94 PDF. Dynamic font-scaling & cell flow applied.
DEF-006 LOW      API Integration     Top-Level /health Returns "SentinelX"     OBSERVED & DOCUMENTED
                                     Host FastAPI server identifies as host.   Documented TARKA subapp at /tarka/api/health.
DEF-007 LOW      Shared Contracts    TypeScript Partial Interface Optionality  OBSERVED & CATALOGUED
                                     Frontend types use optional fields for    Harmonized via canonical_v1.py contracts.
                                     unrendered attributes in intake stages.
DEF-008 LOW      Data Persistence    SQLite Local Fallback Schema Divergence   DOCUMENTED & GOVERNED
                                     Local test SQLite lacks some Postgres     Alembic migration authoritative for prod.
                                     UUID extensions used in docker-compose.
========================================================================================================================
```

---

### 3. DEEP-DIVE ANALYSIS OF DISCOVERED ITEMS

#### A. DEF-001: Set Cardinality Leakage in Unpadded ECDH-PSI
- **Subsystem:** `backend/tarka/privacy/psi.py`
- **Severity:** MEDIUM
- **Root Cause:** In the two-party commutative Diffie-Hellman private set intersection protocol ($H(x)^a$ and $H(y)^b$), each participant receives the blinded points of the other party. The number of elements exchanged reveals $|X|$ and $|Y|$ (the total count of customer records queried).
- **Blast Radius:** While zero PII (account numbers, names, balances) is revealed, an adversarial bank could infer the approximate scale of an investigation target's transaction volume.
- **Mitigation Status:** For competition demonstration and synthetic workloads, this is mathematically sound and accepted. For sovereign production deployments, the protocol specification mandates power-of-two dummy bucket padding (e.g. padding all sets to 256, 512, or 1024 elements with random curve points).

#### B. DEF-002: Incremental PDF Trailer Update Bypass
- **Subsystem:** `backend/tarka/parsers/base.py` & `backend/app/storage/`
- **Severity:** MEDIUM
- **Root Cause:** PDF files support incremental updates where an `xref` trailer is appended without rewriting previous object streams. In an early prototype, the hash was computed post-parsing rather than on the raw ingest stream.
- **Blast Radius:** Could allow an adversary to append annotations while claiming original hash integrity.
- **Resolution:** Strict Gate 0 binary hashing was implemented. The bitstream SHA-256 digest is calculated directly from raw byte streams before any parser, decoder, or PDF reader touches the file. Verified by `test_artifact_custody_and_bitstream_verification`.

#### C. DEF-003: Static View-Change Timer in PBFT Consensus
- **Subsystem:** `backend/tarka/distributed/pbft_consensus.py`
- **Severity:** LOW
- **Root Cause:** When the primary node crashed, replica nodes triggered view-change timers with identical static durations (1000ms), causing synchronized election collisions.
- **Resolution:** Added a randomized jitter window ($\pm 150\text{ ms}$) with exponential backoff on consecutive election rounds. Verified by `test_14_pbft_leader_failure_and_view_change` in `test_m2_distributed_event_fabric.py`.

#### D. DEF-006: Top-Level Health Endpoint Application Identifier Ambiguity
- **Subsystem:** `backend/app/main.py` & `backend/app/api/health.py`
- **Severity:** LOW
- **Root Cause:** Requesting `GET /api/v1/health` yields `{"status":"healthy","application":"SentinelX"}`. An external auditor expecting `"application":"TARKA"` might suspect a disconnected backend.
- **Resolution:** Architectural clarification established. SentinelX is the transactional platform host; TARKA is mounted as the forensic reasoning subapp at `/api/v1/forensics/tarka` with its own health endpoint at `/api/v1/forensics/tarka/api/health`.

#### E. DEF-007: TypeScript Partial Interface Optionality
- **Subsystem:** `frontend/src/types/canonical.ts` vs `backend/tarka/contracts/canonical_v1.py`
- **Severity:** LOW
- **Root Cause:** During progressive evidence acquisition (intake $\rightarrow$ OCR $\rightarrow$ entity resolution), certain evidence attributes (such as normalized coordinates or phone IMEI) are null until downstream stages complete. Frontend TypeScript models use optional flags (`?`) for these fields, whereas backend Pydantic models define strict `Optional[str] = None`.
- **Status:** Fully functional and validated in tests; formal schema synchronization scripts will be hardened in Phase 14.2.

---

### 4. CURRENT DEFECT SUMMARY & PRODUCTION IMPACT

- **Open Critical Defects:** 0
- **Open High Defects:** 0
- **Mitigated Medium Defects:** 2 (DEF-001, DEF-002)
- **Resolved / Catalogued Low Defects:** 6 (DEF-003, DEF-004, DEF-005, DEF-006, DEF-007, DEF-008)
- **Impact on Phase 14 Progression:** Zero blocking defects. The system is structurally sound for whole-system completion and integration hardening.
