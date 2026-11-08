# SUTRAM 2026 — PROBLEM STATEMENT PS04
# FINAL COMPETITION DOSSIER: 09. LEGAL GROUNDING & BSA §63 COMPLIANCE

**Problem Statement:** PS04 — AI-Powered Cyber Fraud Investigation & Attribution System  
**Statutory Framework:** Bharatiya Sakshya Adhiniyam, 2023 (BSA §63)  
**Governing Case Law:** *Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal* (2020) 7 SCC 1  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. INDIAN STATUTORY INTEGRATION (BSA 2023 §63)

Under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 (replacing Section 65B of the Indian Evidence Act, 1872), electronic records are admissible only when accompanied by a formal certificate satisfying three conditions:
1. **Source Identification:** Identifying the electronic record and describing the manner in which it was produced.
2. **Device Lawful Custody & Maintenance:** Confirming that the device producing the output was in lawful control and operating properly throughout the relevant period.
3. **Forensic Integrity:** Certified by a person in official charge of the management of the relevant activities or a forensic expert.

---

## 2. DUAL CERTIFICATE GENERATION ARCHITECTURE

TARKA automatically compiles court-admissible electronic records using a split-certificate structure:

### Part A: Custodian Certificate (Rule 63(4)(a))
- Certified by the bank nodal officer or investigating officer having lawful custody of the computer server/terminal.
- Records original storage paths, operating system version, and system maintenance logs.
- Attests that no unauthorized interventions occurred during data extraction.

### Part B: Digital Forensic Examiner Certificate (Rule 63(4)(b))
- Certified by the forensic analyst / IO operating TARKA.
- Documents the SHA-256 cryptographic digest of raw exhibits prior to parsing.
- Certifies tool name, engine version, and deterministic transformation steps.
- Embedded RFC-3161 cryptographic timestamp token and Ed25519 digital judicial seal.

---

## 3. JUDICIAL ADMISSIBILITY SAFEGUARDS

```
+---------------------------------------------------------------------------------------------------------+
|                                  JUDICIAL ADMISSIBILITY SAFEGUARDS                                      |
+------------------------------------+--------------------------------------------------------------------+
| Legal Requirement                  | TARKA Architectural Guarantee                                      |
+------------------------------------+--------------------------------------------------------------------+
| 1. Prevention of Fabricated Claims | All claims mapped to immutable SHA-256 raw bytes; zero LLM output  |
|                                    | enters the court dossier as factual evidence without exhibit link. |
|                                    |                                                                    |
| 2. Defense Cross-Examination       | Leave-one-out stress testing proves findings survive complete      |
|    Resilience                      | exclusion of secondary chat or screenshot exhibits.                |
|                                    |                                                                    |
| 3. NTP Clock Drift Admissibility   | Clock drift bounds (|Δt| ≤ 180s) strictly verified via stratum-2   |
|                                    | atomic sync between Core Banking switch and Telecom BTS.           |
|                                    |                                                                    |
| 4. Innocent Third-Party Capital    | Strict LIBR Roscoe v. Winder prevents unlawful attachment of clean  |
|    Protection (BNSS §106/§107)     | merchant working capital in commingled accounts.                   |
+------------------------------------+--------------------------------------------------------------------+
```

