# SUTRAM 2026 PS04 — INDEPENDENT ASSURANCE PROGRAMME
## 07: INDEPENDENT EXTERNAL EXPERT REVIEW PACKAGES

**Document Identifier:** `TARKA-ASSURANCE-PACKAGES-2026-V1`  
**Target Audience:** Seven External Independent Specialist Panels  
**Compilation Lead:** External Assurance Coordinator & Quality Assurance Director  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Independent Review Framework

---

### 1. REVIEW PACKAGE GOVERNANCE & STATUS DISCLOSURE

In accordance with Section 10 of the Phase 13 Directive, this document formally distinguishes between internal assurance activities already completed by the development team and formal review packages prepared for external subject-matter experts.

```
=============================================================================================================
                           EXTERNAL REVIEW STATUS & TARGET DISCLOSURE
=============================================================================================================
Specialist Review Domain             Target Institutional Profile           Current Assurance Status
-------------------------------------------------------------------------------------------------------------
Package 1: Cybercrime Investigators  State Cyber Police Station / I4C MHA   PREPARED FOR PILOT (Pending MoU)
Package 2: Forensic Scientists       State / Central FSL Digital Lab        PREPARED FOR PILOT (Pending MoU)
Package 3: Cryptography Specialists  Academic / Research Cryptographers     PREPARED (Internal Math Verified)
Package 4: Application Security      Cert-In Empanelled Auditors            PREPARED (Internal SAST Clean)
Package 5: Software Architects       Enterprise Systems Evaluation Panel    PREPARED (Internal Arch Verified)
Package 6: Accessibility & UX        Certified A11y & Human-Factors Lead    PREPARED (Internal WCAG Verified)
Package 7: Legal & Judicial Counsel  High Court Criminal Advocate / Special PP PREPARED (Statutory Checked)
=============================================================================================================
*Rule of Integrity: No external reviewer names, forged signatures, or fictitious institutional approvals are
claimed herein. All external packages are structured for immediate handover to qualified authorities.
```

---

### 2. THE SEVEN SPECIALIST REVIEW PACKAGES

---

#### PACKAGE 1: CYBERCRIME INVESTIGATORS REVIEW PACK
- **Target Reviewer:** Investigating Officer (Cyber Crime Police Station / MHA I4C).
- **Review Objective:** Validate whether the Golden Hour workflow, 1930 complaint ingestion, and multi-bank money trail tracing reflect authentic cybercrime operational demands.
- **Scope & Components:** `CaseWorkspaceScreen.tsx`, `TaintEngineScreen.tsx`, `CourtProofScreen.tsx`.
- **Test Sandbox:** `CASE-2026-001` (*"Operation Triad Nexus"*).
- **Core Questions for Reviewer:**
  1. Does the Golden Hour 120-minute SLA countdown accurately align with MHA SOP freeze windows?
  2. Is the 5-column transaction trail (UTR, Remitter, Beneficiary, Amount, Date) easy to navigate?
  3. Does the Dinic Min-Cut freeze calculation correctly identify actionable bank accounts?
- **Feedback & Scoring Rubric:** Provided in Appendix 1.1.

---

#### PACKAGE 2: DIGITAL FORENSIC EXAMINERS REVIEW PACK
- **Target Reviewer:** Forensic Scientist / Digital Forensics Lab Examiner (eFSL / CFSL).
- **Review Objective:** Challenge evidence acquisition, SHA-256 bitstream sealing, and Section 63 BSA certificate compliance.
- **Scope & Components:** `EvidenceGateway`, `app/storage/`, `CourtProofScreen.tsx`.
- **Test Sandbox:** Ingestion of mutated CBS CSVs and Canva-edited incremental PDF files.
- **Core Questions for Reviewer:**
  1. Does the CAS hash architecture preserve unbroken chain of custody under BSA guidelines?
  2. Does the Falsification Gate accurately detect PDF `%%EOF` incremental edits?
  3. Does Exhibit E in the generated court dossier satisfy all requirements of Section 63(4) BSA?
- **Feedback & Scoring Rubric:** Provided in Appendix 1.2.

---

#### PACKAGE 3: CRYPTOGRAPHY SPECIALISTS REVIEW PACK
- **Target Reviewer:** Research Cryptographer / Applied Privacy Engineer.
- **Review Objective:** Audit SECP256k1 curve parameters, Commutative ECDH-PSI, Groth16 SnarkJS zero-knowledge circuits, and PBFT Byzantine fault resilience.
- **Scope & Components:** `backend/tarka/privacy/psi.py`, `backend/tarka/crypto/zkp_verifier.py`, `backend/tarka/distributed/pbft_consensus.py`.
- **Core Questions for Reviewer:**
  1. Does the commutative hash-to-curve construction preserve information-theoretic privacy?
  2. Are Groth16 private witness signals completely zeroized before proof transmission?
  3. Is the $2f+1$ quorum threshold mathematically sound for the 4-validator PBFT cluster?
- **Feedback & Scoring Rubric:** Provided in Appendix 1.3.

---

#### PACKAGE 4: APPLICATION SECURITY REVIEW PACK
- **Target Reviewer:** Certified Information Systems Auditor / Application Security Reviewer.
- **Review Objective:** Audit fail-closed authorization gateways, input validation, indirect prompt injection defenses, and secret management.
- **Scope & Components:** `backend/tarka/governance/policy_gateway.py`, `app/main.py`, `.env.example`.
- **Core Questions for Reviewer:**
  1. Can the PolicyGateway be bypassed without proper JWT / cryptographic authentication?
  2. Are uploaded evidence bytes strictly isolated as `DATA_ONLY` without AST/SQL injection risks?
  3. Is the localhost interface properly sandboxed from external network interfaces?
- **Feedback & Scoring Rubric:** Provided in Appendix 1.4.

---

#### PACKAGE 5: SOFTWARE ARCHITECTURE REVIEW PACK
- **Target Reviewer:** Principal Software Architect / Staff Distributed Systems Engineer.
- **Review Objective:** Verify conformance to the SentinelX Wave 6 Engineering Constitution and evaluate 9-profile runtime degradation.
- **Scope & Components:** Full repository topology, `PROJECT_STATE.md`, `docker-compose.yml`.
- **Core Questions for Reviewer:**
  1. Are derived projections (Neo4j, OpenSearch) 100% rebuildable from CAS and PostgreSQL?
  2. Does the system degrade gracefully to NetworkX when external databases are offline?
  3. Is the code free from unnecessary framework migrations or architectural duplication?
- **Feedback & Scoring Rubric:** Provided in Appendix 1.5.

---

#### PACKAGE 6: ACCESSIBILITY & USER EXPERIENCE REVIEW PACK
- **Target Reviewer:** Certified Usability Analyst / WCAG 2.1 AA Accessibility Specialist.
- **Review Objective:** Evaluate FIELDNOTE design system ergonomics, keyboard accessibility, color contrast, and 60fps interaction smoothness.
- **Scope & Components:** `frontend/src/styles/tokens.css`, `frontend/src/components/shell/TarkaGlobalShell.tsx`.
- **Core Questions for Reviewer:**
  1. Do text and UI non-text contrast ratios strictly exceed 4.5:1 and 3:1?
  2. Can an examiner complete an entire investigation using only keyboard shortcuts (`Alt+0..8`)?
  3. Does the interface prevent layout thrashing and horizontal scrolling across all resolutions?
- **Feedback & Scoring Rubric:** Provided in Appendix 1.6.

---

#### PACKAGE 7: LEGAL & JUDICIAL COUNSEL REVIEW PACK
- **Target Reviewer:** High Court Advocate / Special Public Prosecutor (Cyber Crime).
- **Review Objective:** Audit statutory compliance under Bharatiya Nagarik Suraksha Sanhita, 2023 and Bharatiya Sakshya Adhiniyam, 2023.
- **Scope & Components:** Generated legal notices (§94, §106, §107 BNSS) and Section 63(4) BSA certificate.
- **Core Questions for Reviewer:**
  1. Does the provisional attachment notice under Section 107 BNSS satisfy judicial filing requirements?
  2. Is the Lowest Intermediate Balance Rule (Roscoe v. Winder) correctly formulated under Section 106(1) BNSS?
  3. Does the certificate of electronic record comply with the Supreme Court's mandate in *Arjun Panditrao* as adapted to Section 63 BSA?
- **Feedback & Scoring Rubric:** Provided in Appendix 1.7.

---

### 3. PACKAGING VERDICT

All seven external specialist review packages are compiled, isolated, and documented, ready for formal handover to institutional evaluation panels.
