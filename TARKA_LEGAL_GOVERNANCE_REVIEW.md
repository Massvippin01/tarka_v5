# TARKA × SENTINELX — STATUTORY & LEGAL GOVERNANCE REVIEW

**Classification:** AUTHORITATIVE LEGAL & STATUTORY GOVERNANCE OPINION  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Governing Statutory Codes:** Bharatiya Sakshya Adhiniyam (BSA), 2023; Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023; Digital Personal Data Protection Act (DPDPA), 2023; Information Technology Act, 2000  
**International Standard:** ISO/IEC 27037:2012 (Guidelines for Identification, Collection, Acquisition and Preservation of Digital Evidence)  
**Document Code:** `REV-LEGAL-GOV-2026-V1`  
**Date:** 2026-11-24  

---

## 1. Executive Summary & Epistemic Boundary

This document establishes the statutory alignment, evidentiary governance, and legal risk controls governing the deployment of TARKA × SentinelX in Indian judicial, law enforcement, and banking jurisdictions.

> [!CAUTION]
> **LEGAL NOTICE REGARDING ADMISSIBILITY & JUDICIAL AUTHORITY:**  
> 1. Automated certificate generation and algorithmic forensic extraction **do not by themselves establish legal admissibility in a court of law**.  
> 2. No judicial, prosecutorial, or investigative use should be represented as approved or binding merely because the software outputs a certificate citing statutory provisions.  
> 3. Under Indian law, the legal admissibility, relevancy, and probative weight of electronic evidence are decided solely by the competent presiding judge or judicial magistrate.  
> 4. In accordance with the SentinelX Engineering Constitution:  
>    **AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.**

---

## 2. In-Depth Statutory Analysis: Bharatiya Sakshya Adhiniyam (BSA), 2023

Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (Act No. 47 of 2023) repeals and replaces Section 65B of the Indian Evidence Act, 1872.

```
+-----------------------------------------------------------------------------------+
|                        SECTION 63 BSA STATUTORY ARCHITECTURE                      |
+-----------------------------------------------------------------------------------+
| Section 63(1): Electronic record deemed a document; admissible without original  |
|         │                                                                         |
|         ├── Must satisfy four cumulative conditions under Section 63(2)          |
|         │   ├── 63(2)(a): Computer regularly used over period of custody         |
|         │   ├── 63(2)(b): Information regularly fed in ordinary course of activity|
|         │   ├── 63(2)(c): Computer operating properly / no inaccuracy introduced |
|         │   └── 63(2)(d): Information reproduced derived from fed data           |
|         │                                                                         |
|         └── Mandatory Certificate Requirement under Section 63(4)                 |
|             ├── Identifying electronic record and manner of production            |
|             ├── Describing device specifications and software version             |
|             ├── Bearing substantive cryptographic hash of electronic record       |
|             └── Signed by person in official charge of the computer system        |
+-----------------------------------------------------------------------------------+
```

### 2.1 Technical Alignment with Section 63(2) Conditions
1. **Regular Use & Lawful Control [63(2)(a)]:** TARKA logs continuous daemon metrics, uptime statistics, and authenticated investigator sessions, providing verifiable proof that the processing workstation was under lawful administrative control.
2. **Ordinary Course of Activity [63(2)(b)]:** Evidence intake is mediated strictly through standardized case intake endpoints (`/api/v1/forensics/cases/{case_id}/ingest`), establishing standard operating procedure.
3. **Proper System Operation [63(2)(c)]:** System health endpoints (`/api/v1/health` and `/api/v1/forensics/health`) continuously verify that the Z3 SMT solver, Pillow imaging core, and PostgreSQL database are operating properly with zero corruption.
4. **Derived Accuracy [63(2)(d)]:** Original evidence bytes are preserved immutably in Content-Addressed Storage (CAS); derived projections (OCR polygons, ELA grids) link back to raw byte SHA-256 digests through unbroken parent-hash chains.

### 2.2 Technical Alignment with Section 63(4) Certificate Requirements
TARKA generates a court-admissible Section 63 BSA Certificate (`section63_bsa_certificate.json` and signed PDF):
- **Device Particulars:** Captures host CPU architecture, OS kernel version, TARKA software version (`v2.1.0`), and storage drive UUID.
- **Substantive Hash Separation:** Differentiates between *Artifact Identity* (monotonic UUID) and *Content Hash* (SHA-256 of raw bytes).
- **Official Sign-Off:** Enforces that the certificate must be cryptographically signed by an authenticated Lead Digital Forensics Examiner (`INVESTIGATOR` or `LEAD_INVESTIGATOR` role); read-only auditors are strictly blocked.

---

## 3. Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023 Analysis

The Bharatiya Nagarik Suraksha Sanhita, 2023 (Act No. 46 of 2023) replaces the Code of Criminal Procedure (CrPC), 1973.

### 3.1 Section 94 BNSS (Summons to Produce Document or Electronic Record)
*(Formerly Section 91 CrPC)*
- **Statutory Provision:** Empowers a court or police officer in charge to issue a written summons or order to produce any document or electronic record necessary for an investigation.
- **TARKA Implementation:** When TRACE identifies an unrecorded UPI payment receipt or missing Core Banking ledger entry, the AEGIS Reasoning Engine automatically drafts a formal Section 94 BNSS Requisition Notice:
  - Formulates the exact 12-digit UTR and timestamp window.
  - Specifies the recipient bank or NPCI as the target holding entity.
  - Generates the legal requisition draft for the Investigating Officer's signature.

### 3.2 Section 175 BNSS (Inquiry by Police / Digital Evidence Collection)
- **Statutory Provision:** Regulates police inquiry and digital evidence handling.
- **TARKA Compliance:** Ensures that raw mobile devices or exported WhatsApp archives ingested into the platform follow strict digital chain-of-custody protocols adhering to Section 175 mandates.

---

## 4. Digital Personal Data Protection Act (DPDPA), 2023 Compliance

The processing of financial transaction screenshots and customer bank ledgers intersects with the Digital Personal Data Protection Act, 2023:

```
+-----------------------------------------------------------------------------------+
|                        DPDPA 2023 COMPLIANCE ARCHITECTURE                         |
+-----------------------------------------------------------------------------------+
| Section 4 & 5: Lawful Purpose & Notice ──> Triage & Anomaly Detection Notice      |
| Section 6: Informed Consent ────────────> Participant Consent (Study Evidence)   |
| Section 8: Data Fiduciary Obligations ───> AES-256 CAS, 7-Factor RBAC Access      |
| Section 17: Statutory Exemptions ────────> Exemption for Prevention/Investigation  |
|                                            of Offences under Law (Police Casework)|
+-----------------------------------------------------------------------------------+
```

1. **Section 17 Exemption for Law Enforcement:** Processing of personal data by state cybercrime cells and police authorities during an active criminal investigation is exempted from certain DPDP Act requirements under Section 17(1)(c).
2. **Data Minimization:** Outside Section 17 law enforcement exemptions (e.g. in research studies or commercial banking triage), customer PANs, Aadhaar numbers, and phone numbers are scrubbed or masked (`XX1234`) prior to analytical projection.
3. **Storage Limitation:** Active case data is governed by strict retention policies; pilot evaluation data is scheduled for automated cryptographic shredding after 30 days unless subject to a statutory preservation order.

---

## 5. Institutional Data Transfer Agreement (DTA) Mandatory Clauses

Before admitting external partner evidence into TARKA, a bilateral Data Transfer Agreement must be executed containing:
1. **Clause 1 (Permitted Use):** Evidence shall be used exclusively for digital forensics triage, ledger reconciliation, and statutory report drafting within the agreed case docket.
2. **Clause 2 (Non-Promotability):** The receiving institution acknowledges that automated engine findings represent unverified hypotheses until an accredited human examiner reviews the evidence.
3. **Clause 3 (Chain of Custody & Audit):** Every access, viewing, or transformation of evidence bytes must be logged to an append-only custody ledger.
4. **Clause 4 (Prohibition on Secondary Exploitation):** Evidence bytes shall never be exposed to public networks, commercial foundation LLM APIs, or unauthorized third parties.
5. **Clause 5 (Disposal):** Upon conclusion of the pilot or statutory retention period, all temporary working files shall be purged with a verified cryptographic deletion certificate.
