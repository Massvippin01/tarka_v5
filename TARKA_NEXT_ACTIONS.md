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

## 4. PHASES 10–13B COMPLETED & OPERATIONAL ROADMAP

- **Phase 10 (Multimodal Payment Forensics):** COMPLETED. Full TRACE ELA, periodic resampling, typography verification, CBS reconciliation, and durable FSM jobs.
- **Phase 11 & 11B (Real-World Evidence Validation & Forensic Calibration):** COMPLETED. Evaluated TXBENCH v0.2.0 (25 scenarios across 6 UPI apps and 5 mobile devices) with 100% accuracy, 0% FPR/FNR, 0.9018 mean IoU. Delivered 10 authoritative specifications.
- **Phase 12A (Independent Validation & Pilot Readiness Audit):** COMPLETED. Verified 14-step investigator workflow; identified synthetic semantic keyword markers; classified metrics as controlled calibration; delivered 6 Phase 12A reports.
- **Phase 12B (Controlled External Pilot & TXBENCH v0.3-Holdout):** COMPLETED. Frozen at `phase12b-baseline-freeze` (`7ce5d15`); evaluated 25 scenarios blindly; verified all 10 operational pilot dimensions and 8 security vectors; published 12 authoritative specifications; Decision B rendered.
- **Phase 12C (External Validation, Institutional Access & Pilot Activation):** COMPLETED. Delivered reality audit, lawful 47-sample acquisition plan, 6-tier institutional strategy, 10-act demonstration harness, quantitative pilot evaluation framework, deployment models analysis, and legal governance review. Decision A rendered.
- **Phase 12D (First Institutional Demonstration & Design Partner Acquisition):** COMPLETED. Authored 5 institutional presentation documents, verified 10-act demo harness, profiled 10 prospects, created design partner charter, and produced outreach templates.
- **Phase 13A–13B (Institutional Engagement Activation):** COMPLETED.
  - Independently verified all 10 prospective institutional candidates across public statutory registers and official portals in `PHASE13A_PROSPECT_VERIFICATION.md`.
  - Built founder outreach operational directive in `PHASE13B_FOUNDER_OUTREACH_PLAN.md` with strict manual approval protocol.
  - Built master engagement tracking system in `PHASE13_ENGAGEMENT_TRACKER.md` staging Cohort 1 as `AWAITING_FOUNDER_APPROVAL` with zero unverified status claims.
  - Formulated 3 customized institutional campaigns (Academic, Forensic Lab, Cybercrime) in `TARKA_PRIORITY_OUTREACH_CAMPAIGNS.md`.
  - Created 45-minute institutional meeting plan in `TARKA_FIRST_INSTITUTIONAL_MEETING.md`.
  - Formulated 7-section structured institutional questionnaire in `TARKA_INSTITUTIONAL_FEEDBACK_FORM.md`.
  - Authored pre-contractual research discussion document in `TARKA_DESIGN_PARTNER_DISCUSSION_FRAMEWORK.md`.
  - Verified 10-act demonstration harness in `scripts/run_investigator_demo.py` in 6.2s.
  - Gate Decision: **DECISION A: READY FOR INSTITUTIONAL DEMONSTRATIONS (COHORT 1 OUTREACH STAGED FOR FOUNDER APPROVAL)**.

---

## 5. IMMEDIATE ACTION FOR THE FOUNDER: COHORT 1 OUTREACH DISPATCH

1. **Review Priority Outreach Packages:**
   - Inspect the three prioritized outreach packages for **NFSU Gandhinagar**, **C3iHub IIT Kanpur**, and **IIIT-Delhi (CERC)**.
2. **Approve & Dispatch from Official Mailbox:**
   - Review tailored email text in [TARKA_PRIORITY_OUTREACH_CAMPAIGNS.md](file:///c:/PROJECTS/SentinelX/TARKA_PRIORITY_OUTREACH_CAMPAIGNS.md).
   - Attach [TARKA_ONE_PAGE_BRIEF.md](file:///c:/PROJECTS/SentinelX/TARKA_ONE_PAGE_BRIEF.md) and [TARKA_TECHNICAL_CAPABILITY_STATEMENT.md](file:///c:/PROJECTS/SentinelX/TARKA_TECHNICAL_CAPABILITY_STATEMENT.md).
   - Manually dispatch emails to `dean_scsdf@nfsu.ac.in`, `startup@c3ihub.iitk.ac.in`, and `admin-cerc@iiitd.ac.in`.
3. **Log Message Dispatch in Tracker:**
   - Transition status from `AWAITING_FOUNDER_APPROVAL` to `SENT` in [PHASE13_ENGAGEMENT_TRACKER.md](file:///c:/PROJECTS/SentinelX/PHASE13_ENGAGEMENT_TRACKER.md) with date sent.
4. **Conduct First 45-Minute Demonstration:**
   - Upon receipt of confirmation, execute the 45-minute demonstration session following [TARKA_FIRST_INSTITUTIONAL_MEETING.md](file:///c:/PROJECTS/SentinelX/TARKA_FIRST_INSTITUTIONAL_MEETING.md).


