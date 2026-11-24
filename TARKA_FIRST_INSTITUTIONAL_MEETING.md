# TARKA × SENTINELX — FIRST INSTITUTIONAL MEETING PLAN

**Document Code:** `MEET-INST-2026-V1`  
**Classification:** RESTRICTED PRESENTER & MEETING RUNBOOK  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Standard Duration:** Exactly 45 Minutes  
**Target Stakeholders:** Laboratory Heads, Cybercrime Senior Officers, Bank Fraud Leads, Academic Chairs  
**Mode:** In-Person / Secure Video Conference (Model D Synthetic Demonstration)  
**Date:** November 2026  

---

## 1. Meeting Objectives & Golden Rules

### Primary Objectives:
1. Establish immediate technical credibility by demonstrating working software on synthetic fixtures rather than conceptual slides.
2. Clearly communicate the epistemic boundary: TARKA does not replace human examiners or claim guilt; it automates mathematical verification and statutory reporting.
3. Secure stakeholder commitment to review the non-binding Design Partner Discussion Framework and schedule a technical follow-up.

### Golden Rules for the Presenter:
- **Never Oversell:** State exact empirical accuracy (100% on controlled holdouts, but explicitly disclose the 47-sample real-world holdout shortfall).
- **Admit Known Limitations:** Openly explain why ELA alone is insufficient on uniform recompression, and why multimodal fusion is required.
- **Respect Time Boundaries:** Stick rigorously to the 45-minute timetable. Do not let demonstrations spill into Q&A time.

---

## 2. Minute-by-Minute 45-Minute Timetable

```
[00:00 - 05:00]  Act I:   Problem & Operational Context (5 min)
[05:00 - 10:00]  Act II:  Architecture, Epistemic Law & Boundaries (5 min)
[10:00 - 25:00]  Act III: Live Synthetic Investigation Walkthrough (15 min)
[25:00 - 35:00]  Act IV:  Technical Questions & Objection Handling (10 min)
[35:00 - 40:00]  Act V:   Institutional Requirements & Environment Needs (5 min)
[40:00 - 45:00]  Act VI:  Proposed Next Steps & Design Partner Roadmap (5 min)
```

---

## 3. Detailed Act Breakdown & Presenter Guidelines

### Act I: Problem & Operational Context (Minutes 00:00 – 05:00)
- **Speaker:** Founder / Lead Systems Architect
- **Visuals:** Slides 1 & 2 from [TARKA_INSTITUTIONAL_PRESENTATION.md](file:///c:/PROJECTS/SentinelX/TARKA_INSTITUTIONAL_PRESENTATION.md).
- **Core Narrative:**
  - Scale of retail UPI scams in India (>₹1,750 Crore annual reported cyber financial fraud).
  - The tri-bottleneck in frontline investigations:
    1. Human eyeball triage misses subtle JPEG quantization splices and sub-pixel font baselines.
    2. Bank Core Banking confirmation notices take 14 to 28 days to return, while mule money disappears in 3 hours.
    3. Generic forensic suites (Cellebrite, Magnet) extract raw mobile data but lack Indian UPI protocol semantics.
- **Audience Checkpoint:** *"Does this match the backlog and triage delays experienced in your casework?"*

### Act II: Architecture, Epistemic Law & Boundaries (Minutes 05:00 – 10:00)
- **Speaker:** Lead Systems Architect
- **Visuals:** System Architecture Diagram & Epistemic Invariant Box.
- **Core Technical Message:**
  - The Core Law: **AI Proposes. Forensic Engines Test. Evidence Supports. Investigators Decide.**
  - Zero generative LLM hallucinations in forensic fact determination.
  - Ingestion via Multimodal Evidence Gateway: magic-byte checks, streaming SHA-256 in 64KB buffers, append-only Content-Addressed Storage (CAS).
  - The Tri-Forensic Suite (TRACE): In-memory Q=90 ELA, 2D-FFT Radon resampling transforms, micro-typography baselines, and local OCR.
  - The Non-Promotable Invariant: `human_verified = False` is enforced at the database and API level; only an authenticated human examiner can sign off.
- **Audience Checkpoint:** *"Notice that we do not classify individuals as guilty or innocent; we provide transparent mathematical proofs."*

### Act III: Live Synthetic Investigation Walkthrough (Minutes 10:00 – 25:00)
- **Speaker:** Presenter (following [TARKA_DEMO_SCRIPT.md](file:///c:/PROJECTS/SentinelX/TARKA_DEMO_SCRIPT.md) verbatim).
- **Visuals:** Live dual-screen display: React skeuomorphic workstation (`localhost:5173`) and terminal (`scripts/run_investigator_demo.py`).
- **Demonstration Flow:**
  1. *Authentication:* Fast 7-factor RBAC JWT login (`usr-delhi-01`).
  2. *Case Creation:* Monotonic Case ID with prominent yellow banner: `DEMO_MODE: SYNTHETIC_FIXTURES`.
  3. *Evidence Ingestion:* Ingesting `cbs_statement_march2026.csv` and `disputed_phonepe_receipt.png`. Displaying streaming SHA-256 hashes.
  4. *TRACE Examination:* Displaying interactive ELA heatmap (highlighting the ₹25k amount at +3.8 sigma), 2D-FFT Radon spectral peak, and font baseline drift graph ($3.4\text{px}$).
  5. *Core Banking Reconciliation:* Streaming balance conservation check ($₹50\text{k} - ₹25\text{k} = ₹25\text{k}$ conserved) and detecting the ₹10,000 discrepancy under UTR `412356789012`.
  6. *AEGIS Formal Reasoning:* Ranking 6 hypotheses; auto-generating Section 94 BNSS notice for NPCI raw switch XML logs.
  7. *Z3 SMT Inconsistency Proof:* Mathematically proving the contradiction; pointing out `human_verified = False`.
  8. *Human Sign-Off:* Examiner entering statutory notes and affixing digital signature -> badge turns green `[EXAMINER VERIFIED]`.
  9. *Section 63 BSA Report Generation:* One-click export of court-admissible PDF certificate with substantive SHA-256 fingerprint.
  10. *Custody Ledger:* Displaying unbroken parent-hash chained audit log.

### Act IV: Technical Questions & Objection Handling (Minutes 25:00 – 35:00)
- **Speaker:** Panel (guided by [TARKA_OBJECTION_HANDLING.md](file:///c:/PROJECTS/SentinelX/TARKA_OBJECTION_HANDLING.md)).
- **Anticipated Questions & Standard Responses:**
  - *Q: "What about WhatsApp recompression?"*  
    *A:* Adaptive multi-scale Z-score normalization compares blocks against the image’s own canvas mean (achieved 0.0% FPR across benign WhatsApp controls).
  - *Q: "Can an LLM frame an innocent citizen?"*  
    *A:* LLMs are barred from forensic fact determination; Z3 SMT prover and linear algebra handle all proofs; human retains final sign-off authority.
  - *Q: "Is Section 63 BSA legally admissible?"*  
    *A:* Embeds device MAC, hardware UUID, ISO 27037 chain of custody, and deterministic substantive SHA-256 fingerprint $H_{\text{sub}}$.

### Act V: Institutional Requirements & Environment Needs (Minutes 35:00 – 40:00)
- **Speaker:** Systems Architect & Security Lead
- **Discussion Points:**
  - Deployment Models: On-premises air-gapped workstation (Model A) or private VPC (Model B). Zero cloud telemetry.
  - Hardware Requirements: Standard 8-core CPU, 16 GB RAM, no GPU required.
  - Data Governance: DPDP Act 2023 compliance with automated PII masking for financial data.
  - Ingestion Formats: PNG, JPEG, PDF, CSV, XLSX, and WhatsApp export ZIPs.

### Act VI: Proposed Next Steps & Design Partner Roadmap (Minutes 40:00 – 45:00)
- **Speaker:** Founder / Institutional Lead
- **Closing Proposition:**
  1. Distribute [TARKA_INSTITUTIONAL_FEEDBACK_FORM.md](file:///c:/PROJECTS/SentinelX/TARKA_INSTITUTIONAL_FEEDBACK_FORM.md) for technical team review.
  2. Deliver the offline evaluation container image and 25-scenario TXBENCH synthetic package.
  3. Schedule a 2-week technical feedback follow-up.
  4. Share the non-binding [TARKA_DESIGN_PARTNER_DISCUSSION_FRAMEWORK.md](file:///c:/PROJECTS/SentinelX/TARKA_DESIGN_PARTNER_DISCUSSION_FRAMEWORK.md) for departmental consideration.

---
*TARKA × SentinelX — Structured, Professional, Rigorously Timed Institutional Briefings.*
