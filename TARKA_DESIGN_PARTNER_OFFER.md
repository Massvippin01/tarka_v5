# TARKA × SENTINELX — INSTITUTIONAL DESIGN PARTNER OFFER

**Document Code:** `OFFER-DES-PARTNER-2026-V1`  
**Classification:** INSTITUTIONAL RESEARCH & PILOT CHARTER  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Governing Laws:** Bharatiya Sakshya Adhiniyam, 2023 (Section 63); Digital Personal Data Protection Act, 2023  
**Eligible Institutions:** State & Central FSLs, State Police Cybercrime Cells, Commercial Bank Fraud Risk Units, Premier Academic Research Laboratories  
**Date:** November 2026  

---

## 1. Executive Charter & Purpose

The **TARKA Institutional Design Partner Programme** bridges sovereign forensic engineering and frontline investigative practice. We offer qualified Indian institutions zero-cost, fully supported evaluation access to the TARKA platform to independently benchmark its multimodal payment forensic pipeline, stress-test its statutory reporting, and directly shape its feature roadmap.

> [!IMPORTANT]
> **NO COMMERCIAL OBLIGATION:**  
> The Design Partner Programme is an institutional research collaboration. Participation requires **zero financial commitment, software licensing fees, or procurement lock-in**.

---

## 2. Separation of Engagement Models

In accordance with our Engineering Constitution, TARKA strictly delineates between evaluation modes to protect institutional compliance and citizen privacy:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       TWO-TIER ENGAGEMENT ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER I: RESEARCH DEMONSTRATION & BENCHMARK EVALUATION (MODEL D)            │
│  - Environment: 100% Synthetic fixtures (TXBENCH v0.2 / v0.3)               │
│  - Legal Instrument: Mutual Non-Disclosure & Research Evaluation Charter    │
│  - Data Ingestion: Zero live citizen or customer data permitted             │
│  - Deployment: Standalone air-gapped forensic workstation / container      │
│  - Approval Requirement: Institutional Lab Director / HOD approval         │
├─────────────────────────────────────────────────────────────────────────────┤
│  TIER II: SUPERVISED OPERATIONAL PILOT (MODELS A / B / C)                   │
│  - Environment: On-premises air-gapped lab or bank private cloud VPC        │
│  - Legal Instrument: Formal Bilateral Data Transfer Agreement (DTA)         │
│  - Data Ingestion: Lawfully authorized casework (Section 94 BNSS / court)    │
│  - Privacy Protection: Built-in DPDP Act Section 17 & 8 automated PII mask  │
│  - Approval Requirement: State Police HQ / DFSS / Bank CVO sign-off        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. What TARKA Delivers to the Design Partner

Every admitted Institutional Design Partner receives a complete, enterprise-grade deployment package:

### 3.1 Software & Hardware Deliverables
1. **Fully Licensed On-Premises Installation:** Offline container image (Docker / Podman) or bare-metal installer configured for air-gapped execution.
2. **Skeuomorphic Workstation UI & REST APIs:** Access to both the visual investigator workstation and automated backend API endpoints.
3. **Hardware Compatibility Guarantee:** Runs on standard x86_64 workstation or server hardware (minimum 4-Core CPU, 8 GB RAM, no GPU required).

### 3.2 Evaluation Data & Benchmark Suite
1. **Standardized Synthetic Evaluation Suite (TXBENCH v0.2):** 25 pre-verified payment scenarios covering genuine screenshots, benign WhatsApp compression, manual ELA alterations, FakePay spoof APKs, and Core Banking reconciliation discrepancies.
2. **Automated Verification Harness:** Single-command benchmark evaluator (`python scripts/run_investigator_demo.py` and `scripts/evaluate_txbench_v02.py`) returning exact accuracy, IoU, and latency metrics.

### 3.3 Training & Operational Documentation
1. **Investigator Demonstration Runbook:** Step-by-step training manual ([TARKA_INVESTIGATOR_DEMO_RUNBOOK.md](file:///c:/PROJECTS/SentinelX/TARKA_INVESTIGATOR_DEMO_RUNBOOK.md)).
2. **Statutory Admissibility Guide:** Comprehensive legal analysis for court defense under Section 63 BSA, 2023 ([TARKA_LEGAL_GOVERNANCE_REVIEW.md](file:///c:/PROJECTS/SentinelX/TARKA_LEGAL_GOVERNANCE_REVIEW.md)).
3. **Presenter & Objection Handling Manuals:** Complete briefing scripts and defense talking points for defense counsel cross-examination.

### 3.4 Direct Engineering Access
1. **Dedicated Systems Architect:** Weekly engineering check-ins with TARKA principal developers.
2. **Custom Parser Development:** Rapid engineering turnaround for your institution’s proprietary Core Banking CSV statement formats or local police complaint intake templates.

---

## 4. What We Ask from the Design Partner

To ensure mutual research productivity, we request modest, clearly scoped institutional commitments:

| Timeline | Milestone | Partner Activity | Time Commitment |
| :--- | :--- | :--- | :--- |
| **Week 1** | **Initial Briefing** | 45-minute live interactive demonstration with your senior technical staff. | 45 minutes |
| **Week 2** | **Installation & Setup** | Deploy the offline container in your research or triage environment. | 2 hours |
| **Weeks 3–4** | **Benchmark Evaluation** | Run your team through the 25 synthetic benchmark scenarios. | 4 hours total |
| **Week 5** | **Feedback & Feature Review** | Structured qualitative feedback interview (UI usability, report formatting, local pain points). | 1 hour |
| **Week 6** | **Pilot Transition (Optional)** | Joint determination whether to proceed to a formal supervised casework pilot under a bilateral DTA. | 1 hour |

---

## 5. Security, Data Privacy & Legal Safeguards

### 5.1 Absolute Zero-Telemetry Guarantee
TARKA contains **zero telemetry, phone-home mechanisms, or external API calls**. The software operates in fully isolated network environments with all network egress blocked.

### 5.2 DPDP Act 2023 Compliance
All ingested financial records remain under the exclusive physical and cryptographic custody of the institution. TARKA acts solely as an on-premises software processing engine; no data fiduciary rights are transferred.

### 5.3 Intellectual Property & Academic Rights
- **Partner Casework & Data:** All partner data, case files, internal findings, and investigative notes remain 100% the confidential property of the partner institution.
- **TARKA Platform:** The core software, algorithms, and models remain the proprietary property of the TARKA × SentinelX engineering consortium.
- **Joint Academic Publications:** Academic partners (NFSU, IITs) are invited to co-author peer-reviewed publications evaluating the SUTRAM 2026 digital payment forensic benchmark, with full dataset anonymization.

---

## 6. How to Activate Design Partner Status

Institutions may formalize participation via a simple, non-binding Letter of Intent (LOI) or Research Evaluation Charter signed by an authorized laboratory head, cyber cell commanding officer, or academic department chair.

**Programme Coordinator:**  
Principal Systems Architect & Institutional Partnerships Lead  
TARKA × SentinelX Engineering Consortium  
*Contact Email:* `institutional-partnerships@tarka-forensics.in`  
*Official Repository:* [c:\PROJECTS\SentinelX](file:///c:/PROJECTS/SentinelX/)
