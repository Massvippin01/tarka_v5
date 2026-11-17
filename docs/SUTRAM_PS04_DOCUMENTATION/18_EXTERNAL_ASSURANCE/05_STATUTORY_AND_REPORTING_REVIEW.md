# SUTRAM 2026 PS04 — INDEPENDENT ASSURANCE PROGRAMME
## 05: STATUTORY COMPLIANCE & LEGAL REPORTING REVIEW

**Document Identifier:** `TARKA-ASSURANCE-LEGAL-2026-V1`  
**Statutory Scope:** Bharatiya Sakshya Adhiniyam, 2023 & Bharatiya Nagarik Suraksha Sanhita, 2023  
**Auditor:** Digital Forensics Legal Analyst & Legal Systems Engineering Reviewer  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Statutory Reporting Review

---

### 1. LEGAL FRAMEWORK OVERVIEW & TRANSITION

In July 2024, the Republic of India repealed the colonial criminal codes (*Indian Penal Code, 1860*, *Code of Criminal Procedure, 1973*, and *Indian Evidence Act, 1872*), enacting:
1. **Bharatiya Nyaya Sanhita, 2023 (BNS)** — Substantive penal law.
2. **Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)** — Procedural investigation and bail law.
3. **Bharatiya Sakshya Adhiniyam, 2023 (BSA)** — Evidence and electronic record law.

A digital forensics platform that still references Section 65B of the repealed Indian Evidence Act or Section 91/102 of the old CrPC produces legally invalid certificates that can be challenged by defense counsel. TARKA was audited to ensure 100% statutory alignment with the current codes.

---

### 2. SECTION 63 BSA ELECTRONIC RECORD CERTIFICATE AUDIT

Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 governs the admissibility of electronic records. Under Section 63(4), a certificate must be produced identifying the electronic record and describing the manner in which it was produced:

```
+---------------------------------------------------------------------------------------------------------+
|                                SECTION 63(4) BSA STATUTORY MANDATE IN TARKA                             |
+---------------------------------------------------------------------------------------------------------+
| Statutory Condition [Sec 63(4) BSA]            TARKA Implementation in Report Generator                |
+------------------------------------------------+--------------------------------------------------------+
| 63(4)(a): Identifying the electronic record     Explicit UUIDv7 and SHA-256 bitstream checksum           |
| and describing the manner of production        displayed in Exhibit B Hash Schedule                     |
|                                                                                                         |
| 63(4)(b): Giving particulars of device used    Hardware CPU signature, Host OS Build, Python &          |
| in the production of the electronic record     Z3 Solver engine versions recorded in Exhibit E          |
|                                                                                                         |
| 63(4)(c): Dealing with matters in Sec 63(2)    Proves regular computer operation, unbroken custody      |
| regarding proper operation and security        chain, and absence of intermediate file modification     |
|                                                                                                         |
| Digital Signature Requirement                  Signed under digital seal / cryptographic certificate    |
|                                                of the designated Forensic Examiner / IO                 |
+---------------------------------------------------------------------------------------------------------+
```

#### Verification of Strict Admissibility Boundaries:
TARKA explicitly avoids claiming "automatic judicial admissibility". In accordance with constitutional doctrine:
- **Technical Verification:** Proven by mathematical hashes and Z3 solver proofs.
- **Forensic Examiner Finding:** Certified by human examiner in Exhibit E.
- **Judicial Determination:** Left strictly to the discretion of the competent Court / Judicial Magistrate.

---

### 3. BNSS PROCEDURAL NOTICE MAPPING

Audited the 5 automated Golden Hour dispatch notices generated in `CourtProofScreen.tsx`:

| Legal Notice | Governing Statutory Provision | Target Institution | Procedural Purpose |
| :--- | :--- | :--- | :--- |
| **Notice 1** | Section 94 BNSS (Summons to produce document) | SBI Nodal Officer | Demands Finacle commit logs and HSM signatures |
| **Notice 2** | Section 107 BNSS (Provisional attachment) | HDFC & Axis Banks | Emergency debit freeze on Layer-1/2 mule accounts |
| **Notice 3** | Section 106(1) BNSS (Proportional seizure) | ICICI Merchant Acct | Proportional debit lien under Roscoe v. Winder |
| **Notice 4** | DoT Clause 39.20 & Section 94 BNSS | Bharti Airtel Nodal | Dynamic NAT IPDR translation & cell tower logs |
| **Notice 5** | Section 63(4) BSA & NPCI Procedural Rule | NPCI Central Switch | UPI 2.0 XML Device tag & JA4 TLS verification |

---

### 4. SEPARATION OF CONSTITUTIONAL ROLES

```
+---------------------------------------------------------------------------------------------------------+
|                                    FIVE-TIER EVIDENCE HIERARCHY                                         |
+---------------------------------------------------------------------------------------------------------+
| 1. Technical Verification    ---> Cryptographic SHA-256 hash match, CAS bitstream preservation          |
| 2. Forensic Findings         ---> Parsed Finacle rows, dynamic IPDR match, Dinic Min-Cut boundary        |
| 3. Investigative Inference   ---> AI-proposed scam typology candidate (TAGGED: PROPOSED_ONLY)           |
| 4. Legal Opinion             ---> Public Prosecutor review and statutory notice formulation             |
| 5. Judicial Determination    ---> Magistrate's formal order of conviction, forfeiture, or discharge     |
+---------------------------------------------------------------------------------------------------------+
```

---

### 5. CHECKLIST FOR QUALIFIED EXTERNAL LEGAL REVIEWERS

This checklist has been prepared for the independent Senior Advocate / High Court Legal Consultant review:

- [ ] Does Exhibit A accurately reflect the mandatory ingredients of an FIR under Section 173 BNSS?
- [ ] Are the notice templates under Section 94 and 107 BNSS compliant with High Court criminal rules of practice?
- [ ] Does the Section 63(4) BSA Schedule satisfy judicial requirements for electronic record production without summoning physical server hardware?
- [ ] Is the Lowest Intermediate Balance Rule (Roscoe v. Winder) properly cited in the proportional lien notice under Section 106(1) BNSS?
- [ ] Are all statutory references updated to 2023 criminal codes with zero legacy CrPC/IEA citations?
