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

## 4. PHASES 10–12C COMPLETED & OPERATIONAL ROADMAP

- **Phase 10 (Multimodal Payment Forensics):** COMPLETED. Full TRACE ELA, periodic resampling, typography verification, CBS reconciliation, and durable FSM jobs.
- **Phase 11 & 11B (Real-World Evidence Validation & Forensic Calibration):** COMPLETED. Evaluated TXBENCH v0.2.0 (25 scenarios across 6 UPI apps and 5 mobile devices) with 100% accuracy, 0% FPR/FNR, 0.9018 mean IoU. Delivered 10 authoritative specifications.
- **Phase 12A (Independent Validation & Pilot Readiness Audit):** COMPLETED. Verified 14-step investigator workflow; identified synthetic semantic keyword markers; classified metrics as controlled calibration; delivered 6 Phase 12A reports.
- **Phase 12B (Controlled External Pilot & TXBENCH v0.3-Holdout):** COMPLETED. Frozen at `phase12b-baseline-freeze` (`7ce5d15`); evaluated 25 scenarios blindly; verified all 10 operational pilot dimensions and 8 security vectors; published 12 authoritative specifications; Decision B rendered.
- **Phase 12C (External Validation, Institutional Access & Pilot Activation):** COMPLETED.
  - Formulated full reality audit in `PHASE12C_EXECUTION_REGISTER.md` distinguishing code truth, synthetic fixtures, live uploads, and DTA dependencies.
  - Established lawful 47-sample acquisition programme in `TXBENCH_V03_ACQUISITION_PLAN.md` under DPDPA 2023.
  - Authored 6-tier engagement roadmap in `TARKA_INSTITUTIONAL_PARTNERSHIP_STRATEGY.md` (FSLs, Cyber Cells, Banks, NPCI, NFSU, DSCI).
  - Delivered executable 10-step demonstration harness `scripts/run_investigator_demo.py` and runbook `TARKA_INVESTIGATOR_DEMO_RUNBOOK.md`.
  - Defined quantitative 11-dimension evaluation framework in `TARKA_PILOT_EVALUATION_FRAMEWORK.md`.
  - Evaluated 4 commercial/cloud deployment models in `TARKA_DEPLOYMENT_MODEL_ANALYSIS.md`.
  - Conducted qualified legal opinion covering BSA 63, BNSS 94, and ISO 27037 in `TARKA_LEGAL_GOVERNANCE_REVIEW.md`.
  - Decision: **DECISION A: READY FOR INSTITUTIONAL DEMONSTRATIONS (CONDITIONALLY APPROVED FOR FIELD PILOT UPON DTA)**.

---

## 5. PHASE 13 ACTION PLAN: INSTITUTIONAL BRIEFINGS & DTA EXECUTION

1. **Conduct Institutional Stakeholder Demonstrations:**
   - Execute executive walkthroughs using `TARKA_INVESTIGATOR_DEMO_RUNBOOK.md` and `scripts/run_investigator_demo.py` in synthetic demonstration mode (Model D).
2. **Execute Bilateral Data Transfer Agreements (DTAs):**
   - Finalize partner DTAs with banking Fraud Risk Management units and state police cyber cells using `TXBENCH_V03_ACQUISITION_PLAN.md` templates.
3. **Acquire & Ingest the 47 Real-World Holdout Receipts:**
   - Ingest, dual-adjudicate, and seal the 47 real-world receipts under the blinded protocol.
4. **Deploy On-Premises Air-Gapped Pilot Workstation (Model A):**
   - Provision dedicated workstation in partner laboratory under Lead Examiner supervision.


