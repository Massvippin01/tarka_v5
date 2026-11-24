# TARKA × SENTINELX — INSTITUTIONAL EVALUATION FEEDBACK DOCUMENT

**Document Code:** `FORM-FEEDBACK-2026-V1`  
**Classification:** INSTITUTIONAL EVALUATION INSTRUMENT  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Target Respondent:** Digital Forensic Examiner, Cybercrime Investigating Officer, Bank Fraud Risk Lead  
**Evaluation Session:** 45-Minute Technical Demonstration / On-Premises Evaluation  
**Date:** November 2026  

---

## Instructions for the Evaluator

Thank you for participating in the technical demonstration and evaluation of **TARKA × SentinelX**. 

We operate under strict epistemic and scientific principles: **we seek rigorous technical criticism, candid workflow assessment, and realistic operational feedback**. Please complete this evaluation form following the demonstration. Your answers will directly inform our engineering roadmap, deployment constraints, and design partner pilot frameworks.

---

## Section 1: Respondent & Institutional Context

1. **Institution Name:** __________________________________________________
2. **Department / Division:** ______________________________________________
3. **Primary Professional Role:**
   - [ ] Digital Forensic Scientist / Laboratory Examiner
   - [ ] Cybercrime Investigating Officer (IO) / Police Inspector
   - [ ] Banking Fraud Risk Management (FRM) / Vigilance Officer
   - [ ] Academic Researcher / Forensic Faculty Member
   - [ ] Systems Auditor / Legal Counsel
4. **Jurisdiction / Geographic Area of Operation:** ________________________
5. **Typical Monthly Casework Involving Payment Evidence:**
   - [ ] Fewer than 25 cases/month
   - [ ] 25 to 100 cases/month
   - [ ] 100 to 500 cases/month
   - [ ] More than 500 cases/month

---

## Section 2: Current Operational Workflow & Pain Points

1. **What is your current procedure when a questioned payment screenshot or disputed bank transaction is submitted?**  
   *(Please describe the step-by-step workflow from intake to report)*  
   __________________________________________________________________________  
   __________________________________________________________________________  
   __________________________________________________________________________  

2. **Where are the largest bottlenecks in your existing examination process?**  
   *(Check all that apply and rank 1–5 where 1 is the most severe bottleneck)*  
   - [ ] **[Rank: __]** Visual manual examination of screenshots (checking font, alignment, pixel blur).
   - [ ] **[Rank: __]** Waiting for bank liaison cells to confirm Core Banking System (CBS) transaction clearing (latency in days/weeks).
   - [ ] **[Rank: __]** Reconciling customer-provided screenshots against multi-page bank statements.
   - [ ] **[Rank: __]** Drafting statutory evidence notices (Section 94 BNSS / Section 91 CrPC) to banks and NPCI.
   - [ ] **[Rank: __]** Preparing court-admissible digital evidence certificates under Section 63 BSA, 2023.
   - [ ] **[Rank: __]** Managing chain of custody and forensic data preservation across multiple tools.

3. **What is your average turnaround time to complete an examination of a single payment fraud case?**  
   - [ ] Under 24 hours
   - [ ] 1 to 7 days
   - [ ] 1 to 4 weeks
   - [ ] More than 1 month

---

## Section 3: Tool Overlap & Capability Redundancy

1. **Which digital forensic or analysis tools are currently active in your laboratory/unit?**  
   - [ ] Cellebrite UFED / Physical Analyzer
   - [ ] Magnet AXIOM / AXIOM Cyber
   - [ ] OpenText EnCase
   - [ ] MSAB XRY
   - [ ] Autopsy / Sleuth Kit (Open Source)
   - [ ] Internal custom scripts / SQL database queries
   - [ ] Other: ___________________________________________________________

2. **Which forensic tasks are ALREADY adequately solved by your existing tools?**  
   __________________________________________________________________________  
   __________________________________________________________________________  

3. **What specific capabilities demonstrated in TARKA would be genuinely useful to your workflow?**  
   - [ ] In-memory Q=90 Error Level Analysis (ELA) with spatial heatmap overlay
   - [ ] 2D-FFT Radon resampling transform (detecting spliced/scaled numeric overlays)
   - [ ] Micro-typography baseline regression (detecting font kerning and baseline drift)
   - [ ] High-throughput double-entry bank reconciliation ($>45,000\text{ tx/second}$)
   - [ ] Formal mathematical contradiction proofs via Microsoft Z3 SMT solver
   - [ ] Automated Section 63 BSA 2023 certificate generation with substantive SHA-256 fingerprint
   - [ ] Automated Section 94 BNSS statutory summons drafting for NPCI switch logs
   - [ ] Non-promotable invariant (`human_verified = False` default)

4. **What demonstrated features in TARKA feel REDUNDANT or unnecessary for your casework?**  
   __________________________________________________________________________  
   __________________________________________________________________________  

---

## Section 4: Data Formats & Input Availability

1. **Which evidence formats do you routinely receive in active casework?**  
   - [ ] Smartphone screen captures (PNG / JPEG / WebP)
   - [ ] Photos of physical phone screens taken by another camera
   - [ ] WhatsApp exported chats with media attachments (.zip)
   - [ ] Core Banking statements in CSV / Excel format
   - [ ] Scanned or digital Bank Statements in PDF format
   - [ ] Full filesystem logical/physical extractions (.tar / .ufd / .ab)
   - [ ] NPCI clearing switch log extracts (XML / raw text)

2. **How frequently do you encounter images degraded by social media compression (e.g. WhatsApp, Telegram)?**  
   - [ ] Rare (<10% of cases)
   - [ ] Occasional (10% to 30%)
   - [ ] Frequent (30% to 70%)
   - [ ] Dominant (>70% of cases)

---

## Section 5: Security, Infrastructure & Deployment Constraints

1. **What deployment environment is strictly required by your institution’s policy?**  
   - [ ] **Model A:** 100% On-Premises Air-Gapped Workstation (Zero LAN/WAN network connectivity allowed).
   - [ ] **Model B:** On-Premises Isolated Forensic LAN (Local server accessible by lab workstations).
   - [ ] **Model C:** Dedicated GovCloud / Bank Private Cloud VPC (MeitY / RBI empanelled, isolated private subnet).
   - [ ] **Model D:** Secure Managed Cloud / Web Interface (Permissible for synthetic training/research only).

2. **What compliance frameworks govern evidence processing in your facility?**  
   - [ ] Bharatiya Sakshya Adhiniyam, 2023 (Section 63)
   - [ ] Digital Personal Data Protection Act, 2023 (DPDPA)
   - [ ] ISO/IEC 27037:2012 (Digital Evidence Custody & Handling)
   - [ ] RBI Cyber Security Framework (for Banking institutions)
   - [ ] Ministry of Home Affairs / DFSS Standard Operating Procedures

3. **Are there institutional restrictions regarding open-source dependencies or first-order logic solvers (e.g., Z3 theorem prover)?**  
   - [ ] No restrictions as long as the software operates fully offline.
   - [ ] Requires departmental security audit / vulnerability scan (VAPT) approval.
   - [ ] Restricted to government-certified software suites only.

---

## Section 6: Requirements for a Controlled Design Partner Evaluation

1. **Would your institution be open to conducting a zero-cost, 2-to-4 week controlled evaluation using synthetic or anonymized casework?**  
   - [ ] **Yes, immediately.** We can schedule an on-premises trial.
   - [ ] **Yes, conditional upon executive/director approval.**
   - [ ] **Maybe in the future**, pending procurement or modernization cycle.
   - [ ] **No.** (Please explain reason below)

2. **What formal documentation would your institution require before activating an evaluation?**  
   - [ ] Non-Disclosure Agreement (NDA)
   - [ ] Non-Binding Design Partner Discussion Framework / Letter of Intent (LOI)
   - [ ] Formal Institutional Memorandum of Understanding (MOU)
   - [ ] Bilateral Data Transfer Agreement (DTA) compliant with DPDPA 2023
   - [ ] Third-Party Source Code Security / VAPT Audit Certificate

3. **What critical features or changes would you need to see before recommending TARKA to your leadership?**  
   __________________________________________________________________________  
   __________________________________________________________________________  
   __________________________________________________________________________  

---

## Section 7: Overall Assessment & Scoring

*Please rate TARKA on a scale of 1 to 5 (1 = Poor, 5 = Exceptional):*

| Dimension | 1 | 2 | 3 | 4 | 5 | Notes / Comments |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Scientific & Mathematical Rigor** | [ ] | [ ] | [ ] | [ ] | [ ] | |
| **Investigative Utility & Workflow Fit**| [ ] | [ ] | [ ] | [ ] | [ ] | |
| **User Interface & Clarity (Workstation)**| [ ] | [ ] | [ ] | [ ] | [ ] | |
| **Speed & Reconciliation Latency** | [ ] | [ ] | [ ] | [ ] | [ ] | |
| **Section 63 BSA Report Quality** | [ ] | [ ] | [ ] | [ ] | [ ] | |
| **Trustworthiness & Human Agency** | [ ] | [ ] | [ ] | [ ] | [ ] | |

---

**Evaluator Signature:** ___________________________ **Date:** _______________  
**Official Designation:** __________________________ **Official Seal:** ________  

*Please return the completed form to:* `institutional-partnerships@tarka-forensics.in`
