# TARKA — SEQUENCED ENGINEERING ACTIONS (PHASES 1–9)
## Concrete Prioritized Backlog & Implementation Milestones

**Document Version:** 1.0.0-PROD  
**Authority:** Technical Delivery Lead & Chief Architect

---

## 1. PHASE 1: ARCHITECTURE FREEZE & UNIVERSAL CASE MODEL (NEXT IMMEDIATE PHASE)

1. **Schema Freeze:**
   - Formalize `UniversalCaseModel`, `EvidenceArtifact`, `CanonicalFact`, and `ContradictionFinding` in `backend/tarka/core/models.py`.
   - Ensure strict Pydantic v2 compliance with JSON Schema export.
   - Enforce explicit `human_verified=False` default on all machine-extracted facts.
2. **API Endpoint Normalization:**
   - Resolve the 35 REST test fixture mismatches across `test_wave4_workspace_projection.py` and `test_wave7_subphase_a6_graph_ux.py` by aligning endpoint routing with the consolidated `/api/v1/forensics/tarka` router.
3. **Frontend Contract Synchronization:**
   - Synchronize TypeScript types in `frontend/src/types/forensics.ts` to exactly mirror Pydantic v2 schemas.

---

## 2. PHASE 2: UNIVERSAL EVIDENCE INGESTION PIPELINE (TRACE & AEGIS)

1. **TRACE (Transaction Reconstruction & Accounting Classification Engine):**
   - Implement multi-format bank statement parsing (PDF text extraction, OCR bounding box fallback, and CSV/Excel parsing).
   - Implement double-entry debit/credit reconciliation with automatic balance verification.
2. **WhatsApp Forensics Gateway:**
   - Expand `whatsapp.py` parser to support exported ZIP archives containing media references, voice notes, and contact vCards.
3. **AEGIS Gateway:**
   - Implement cross-source identity resolution (phone number normalization with E.164 formatting, UPI VPA extraction, and bank IFSC code validation).

---

## 3. PHASES 3–9 SUMMARY

- **Phase 3 (Formal SMT Reasoning):** Optimize Marco MUS extraction under high constraint volumes; implement kinematic multi-hop travel anomaly alerts.
- **Phase 4 (Graph Intelligence):** Ensure incremental PostgreSQL $\rightarrow$ Neo4j synchronization with SSE delta stream.
- **Phase 5 (Skeuomorphic Workstation Polish):** Implement full curved sidebar interaction (`LUMEN` 3D frosted glass) and refine tactile skeuomorphic styling across all 22 views.
- **Phase 6 (Voice OS Hardening):** Zero-latency streaming STT/TTS pipeline with offline local fallback.
- **Phase 7 (Multi-Agent Governance):** Wire 5 Governed Agents through `CommandBus` with immutable OPA Rego audit.
- **Phase 8 (Statutory Certification):** Section 63 BSA tamper-proof cryptographic report verification with digital signature support.
- **Phase 9 (Production Hardening & CI/CD):** CI container automation and live S3 CAS integration.

---

## 4. PHASES 10–12B COMPLETED & NEXT OPERATIONAL ROADMAP

- **Phase 10 (Multimodal Payment Forensics):** COMPLETED. Full TRACE ELA, periodic resampling, typography verification, CBS reconciliation, and durable FSM jobs.
- **Phase 11 & 11B (Real-World Evidence Validation & Forensic Calibration):** COMPLETED. Evaluated TXBENCH v0.2.0 (25 scenarios across 6 UPI apps and 5 mobile devices) with 100% accuracy, 0% FPR/FNR, 0.9018 mean IoU. Delivered 10 authoritative specifications.
- **Phase 12A (Independent Validation & Pilot Readiness Audit):** COMPLETED. Verified 14-step investigator workflow; identified synthetic semantic keyword markers; classified metrics as controlled calibration; delivered 6 Phase 12A reports.
- **Phase 12B (Controlled External Pilot & TXBENCH v0.3-Holdout):** COMPLETED.
  - Frozen at tag `phase12b-baseline-freeze` (`7ce5d15`).
  - Formulated blinded protocol (`TXBENCH_V03_HOLDOUT_PROTOCOL.md`) with strict metric separation.
  - Truthfully audited data provenance (`TXBENCH_V03_DATA_PROVENANCE.md`) disclosing 47-sample external real-world shortfall without fake synthetic substitution.
  - Evaluated 25 holdout scenarios blindly (`TXBENCH_V03_RESULTS.md`) with 100% visual accuracy, 0.9018 mean IoU, 71.8ms P50 latency, and 100% CBS balance conservation.
  - Formulated comprehensive error taxonomy (`TXBENCH_V03_ERROR_ANALYSIS.md`) covering vector UI spoofs and WhatsApp recompression.
  - Verified all 10 operational pilot dimensions (`PHASE12B_INVESTIGATOR_PILOT_REPORT.md`) including D1 submission latency 14.12ms, D2 analysis latency 85.72ms, D4 non-promotability invariant, D7 duplicate ambiguity preservation, D9 Section 63 BSA report reproducibility.
  - Verified all 8 security vectors (`PHASE12B_SECURITY_AND_GOVERNANCE_REPORT.md`) and audited Indian statutory alignment (Section 63 BSA, Section 94 BNSS, DPDPA 2023).
  - Cataloged 7 failure remediations (`PHASE12B_REMEDIATION_REGISTER.md`) with regression tests.
  - Formal Decision: **DECISION B: CONDITIONALLY APPROVED FOR LIMITED PILOT**.
  - Delivered 12 authoritative Phase 12B specifications.

---

## 5. PHASE 13 ACTION PLAN: LIMITED PILOT SUPERVISION & DTA EXPANSION

1. **Supervised Limited Pilot Deployment:**
   - Execute controlled pilot investigations under Lead Forensic Examiner supervision.
   - Enforce hard non-promotability invariant (`human_verified = False` default; no automated judicial filings).
2. **Institutional Data Transfer Agreements (DTA):**
   - Execute partner agreements with Indian banking cybercrime cells to ingest the remaining 47 consented external real-world receipts.
3. **Sealed 50-Sample Holdout Benchmark:**
   - Run blinded evaluation across the full 50-receipt holdout cohort upon acquisition without threshold retuning.
4. **Host Container CAS Resolution:**
   - Address Windows host Docker named pipe saturation to enable live multi-container S3 CAS deployments.
  3. **Execute TXBENCH v0.3-HOLDOUT Evaluation**: Unseal and evaluate the 50-sample real-world holdout dataset under frozen engine parameters to establish independent unconstrained generalization.
  4. **Optical Screen Ingestion Enhancement**: Implement perspective rectification and moiré suppression filter for cases where screenshots are captured as physical photos of suspect phone screens.


