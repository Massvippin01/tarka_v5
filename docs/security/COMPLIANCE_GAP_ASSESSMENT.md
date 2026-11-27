# TARKA COMPLIANCE GAP ASSESSMENT & STATUTORY MAPPING
## Regulatory Alignment with India DPDP Act 2023, CERT-In Directions, RBI Framework & BSA §63

**Document Version:** 2.0.0  
**Classification:** Forensics Engineering / Compliance & Governance  
**Canonical Repository:** `C:\PROJECTS\SentinelX`  
**System Target:** TARKA × SENTINELX Forensic Intelligence Platform  
**Authority:** SentinelX Wave 6 Engineering Constitution  

---

## 1. Executive Summary & Statutory Framework

As a forensic investigation and evidence intelligence system deployed by Indian law enforcement agencies, state police cyber cells, and financial institutions, TARKA must adhere to Indian statutory and regulatory mandates.

### Key Statutory Standards:
1. **Bharatiya Sakshya Adhiniyam, 2023 (BSA §63):** Formerly Section 65B of the Indian Evidence Act, 1872. Admissibility of electronic records and chain-of-custody certificates.
2. **Digital Personal Data Protection Act, 2023 (DPDP Act):** Lawful processing, data principal privacy, and security safeguards.
3. **CERT-In Cyber Security Directions (April 28, 2022):** Mandatory 6-hour incident reporting, NTP synchronization, and 180-day log preservation within Indian jurisdiction.
4. **RBI Master Direction on Information Security (RBI/2023-24/107):** Cyber resilience, mule account detection, and fraud reporting.
5. **Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS §106):** Police power of seizure and asset freezing for criminal proceeds.

---

## 2. Statutory Compliance Mapping Matrix

| Regulation / Clause | Statutory Requirement | TARKA Implementation & Control | Compliance Status |
| :--- | :--- | :--- | :--- |
| **BSA 2023 §63(2)** | Electronic record produced by a computer system operating properly without unauthorized intervention. | Deterministic processing hashes; automated system health telemetry; read-only CAS storage. | **COMPLIANT** |
| **BSA 2023 §63(4)** | Certificate identifying electronic record, describing production manner, and certified by person in lawful control. | Automated generation of Form 63 Part A & B certificates embedding SHA-256 digests and cryptographic signatures. | **COMPLIANT** |
| **BNSS 2023 §106** | Specific identification of tainted proceeds vs legitimate commercial turnover before bank seizure. | Specific Lien Shielding: calculates exact fraudulent inflow; protects innocent merchant balances. | **COMPLIANT** |
| **DPDP 2023 §4(1)** | Lawful basis for processing personal data without explicit consent. | Section 7(b): Processing for prevention, detection, investigation or prosecution of offences. | **COMPLIANT** |
| **DPDP 2023 §8(5)** | Implementation of reasonable security safeguards to prevent personal data breach. | AES-256 CAS encryption, TLS 1.3 in-transit, OPA role-based access control, strict case scoping. | **COMPLIANT** |
| **DPDP 2023 §8(7)** | Erase personal data upon purpose completion unless retention mandated by law. | Case retention lifecycle policies; automated redaction of non-evidentiary PII after statutory limit. | **COMPLIANT** |
| **CERT-In Dir. (i)** | Mandatory NTP clock synchronization from National Physical Laboratory (NPL) or NIC. | System chrony NTP daemon synced to `time.nplindia.org` and `ntp.nic.in` (jitter $< 5$ ms). | **COMPLIANT** |
| **CERT-In Dir. (ii)** | 6-hour mandatory reporting of cyber incidents to CERT-In. | Automated incident alert pipeline with pre-formatted CERT-In Incident Reporting Template. | **COMPLIANT** |
| **CERT-In Dir. (v)** | 180-day secure logging of all system and access logs within Indian jurisdiction. | Immutable PostgreSQL audit table with 180-day minimum retention and Indian sovereign storage. | **COMPLIANT** |
| **RBI Cyber Sec. §4** | Real-time monitoring and detection of mule accounts and rapid money flow. | Golden-Hour pass-through velocity detection ($< 120$s); automated freezing notices to bank nodal officers. | **COMPLIANT** |

---

## 3. Detailed BSA §63 Electronic Evidence Certificate Architecture

Under Section 63 of Bharatiya Sakshya Adhiniyam, 2023, an electronic record is inadmissible in criminal trials unless accompanied by a statutory certificate executed by the officer responsible for the computing device.

```
+----------------------------------------------------------------------------------------------------+
|                         BHARATIYA SAKSHYA ADHINIYAM, 2023 - SECTION 63                             |
|                           CERTIFICATE OF AUTHENTICITY OF ELECTRONIC RECORD                         |
+----------------------------------------------------------------------------------------------------+
| 1. CASE DETAILS:                                                                                   |
|    - Case ID: CASE-2026-001                   - FIR Number: 0142/2026 Cyber Crime PS              |
|    - Investigating Officer: Insp. Rajeshwar Rao - Date of Examination: 2026-11-26 19:45:00 UTC     |
|                                                                                                    |
| 2. EVIDENCE ARTIFACT IDENTIFICATION:                                                               |
|    - File Name: 1000270701.jpg                 - File Size: 1,842,912 Bytes                        |
|    - MIME Type: image/jpeg                     - Ingestion Timestamp: 2026-11-26 12:30:15 UTC      |
|    - Immutable SHA-256 Hash:                                                                      |
|      e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855                             |
|                                                                                                    |
| 3. COMPUTING ENVIRONMENT & INTEGRITY DECLARATION:                                                  |
|    - Platform: TARKA Forensic Intelligence Platform (v2.0.0-PROD)                                 |
|    - System State: Normal operations; hardware/software functioned continuously without error;     |
|    - Storage Integrity: Preserved in immutable WORM Content-Addressable Storage (CAS);            |
|    - Reproducibility: Cryptographic extraction verified with zero fabrication.                     |
|                                                                                                    |
| 4. STATUTORY DECLARATION:                                                                          |
|    "I hereby certify that the particulars stated above are true to the best of my knowledge        |
|    and belief, and that the computer system was operating properly throughout the period."          |
|                                                                                                    |
|    [Officer Signature / Digital Cryptographic Seal]                                                |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Gap Remediation Action Plan

| Assessment Item | Identified Gap | Severity | Remediation Action | Status |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-01** | Clock drift on standalone tactical field laptops | Medium | Installed local GPS USB time-receiver fallback for air-gapped field deployments. | **RESOLVED** |
| **GAP-02** | Automatic redaction of witness phone numbers on public court exhibits | Low | Implemented dynamic PII masking filter on PDF court dossier exports. | **RESOLVED** |
| **GAP-03** | Sovereign key rotation schedule for evidentiary seals | Medium | Standardized 90-day automated key rotation with backward-compatible verification. | **RESOLVED** |
