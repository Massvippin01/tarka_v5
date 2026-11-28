# SUTRAM 2026 PS04 — INSTITUTIONAL PILOT PROPOSAL
## STAGE 7: CONTROLLED INSTITUTIONAL PILOT DEPLOYMENT FRAMEWORK FOR LEAs & FSLs

**Document Identifier:** `TARKA-PILOT-PROPOSAL-2026-V1`  
**Target Institutions:** State Cyber Crime Police Stations (Cyber PS), State/Central FSLs, Bank Fraud Risk Teams  
**Legal Framework:** Bharatiya Nagarik Suraksha Sanhita, 2023 & Bharatiya Sakshya Adhiniyam, 2023  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Institutional Pilot Specification

---

### 1. PILOT OBJECTIVE & BOUNDARY STATEMENT

This document establishes a controlled, phased roadmap for evaluating TARKA within an authorized law enforcement agency (LEA), State Cyber Crime Headquarters, or Forensic Science Laboratory (FSL).

#### Strict Boundary Disclosures:
- **No Unauthorized Government Connectivity:** TARKA will never be connected to live police intranets (CCTNS/ICJS/eSakshya) or bank CBS networks without an executed Memorandum of Understanding (MoU), formal statutory clearance, and dedicated hardware security modules (HSMs).
- **Current Operational Status:** All institutional adapters in this submission operate on high-fidelity synthetic fixtures matching official government schemas and are labeled `SIMULATED_AND_FIXTURE_TESTED`.
- **Zero Government Partnership Claim:** This proposal is an engineering design specification submitted for competition evaluation and future authorized consideration; it does not claim pre-existing government endorsement.

---

### 2. PILOT DEPLOYMENT ARCHITECTURE & SIZING

```
+---------------------------------------------------------------------------------------------------------+
|                                    LEA ON-PREMISE PILOT TOPOLOGY                                        |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|       [Air-Gapped / Isolated Secure LAN in State Cyber PS]                                              |
|                                                                                                         |
|       +---------------------------------------------------------------+                                 |
|       | Forensic Workstation Appliance (Profile 2 / Profile 3)        |                                 |
|       | - 16-Core CPU, 64 GB ECC RAM, 2 TB NVMe RAID-1                |                                 |
|       | - Ubuntu 24.04 LTS Hardened / Docker Engine                   |                                 |
|       |                                                               |                                 |
|       |   [Evidence Gateway] <==== (Manual USB / Air-Gap Ingestion)   |                                 |
|       |           |                                                   |                                 |
|       |           v                                                   |                                 |
|       |   [Local Encrypted CAS Storage]                               |                                 |
|       |           |                                                   |                                 |
|       |           +-------------------+                               |                                 |
|       |           v                   v                               |                                 |
|       |   [PostgreSQL 16]     [Z3 SMT Solver]                         |                                 |
|       |           |                   |                               |                                 |
|       |           +-------------------+                               |                                 |
|       |           v                                                   |                                 |
|       |   [FIELDNOTE Web UI] <===> Investigating Officer Terminal    |                                 |
|       +---------------------------------------------------------------+                                 |
|                                                                                                         |
+---------------------------------------------------------------------------------------------------------+
```

#### Infrastructure Sizing Assumptions:
- **Small Pilot (District Cyber Police Station):**
  - Workload: Up to 50 active FIRs/month.
  - Sizing: 1× Dedicated Forensic Workstation (16-Core, 32GB RAM, 1TB NVMe, air-gapped).
- **Medium Pilot (State Cyber Headquarters / FSL):**
  - Workload: Up to 500 active FIRs/month.
  - Sizing: 1× Rack Server (32-Core, 128GB RAM, 8TB NVMe RAID-10, Neo4j + PostgreSQL).

---

### 3. DATA CLASSIFICATION & INSTITUTIONAL ISOLATION

- **Evidence Bytes (`RESTRICTED_FORENSIC`):** Raw bank CSVs, telco IPDRs, WhatsApp dumps. Stored exclusively in local write-once CAS with permissions `0444`. Accessible only by the designated Investigating Officer (IO).
- **Extracted Metadata (`CONFIDENTIAL_CASE_DATA`):** Graph nodes, transaction logs, phone records. Stored in relational and graph databases with row-level tenant isolation per FIR number.
- **Flight Recorder Logs (`IMMUTABLE_AUDIT`):** Hash-chained entries preserved for courtroom cross-examination. Write-only for algorithms and users.

---

### 4. IDENTITY, ACCESS MANAGEMENT & KEY LIFECYCLE

- **RBAC Policy Gateway:** Enforces statutory roles:
  1. `IO_INVESTIGATOR`: Case workspace creation, evidence upload, notice generation.
  2. `SUPERVISORY_SP`: Charge-sheet review, emergency freeze order sign-off.
  3. `FSL_EXPERT`: Section 63 BSA certificate signing, hash validation.
- **Key Management:**
  - System signing keys (Ed25519) stored in PKCS#11 compliant Hardware Security Modules (HSMs) or TPM 2.0 enclaves.
  - Ephemeral ECDH-PSI keys zeroized in memory immediately following intersection completion.

---

### 5. INSTITUTIONAL INTEGRATION STATUS MATRIX

| External System | Proposed Pilot Workflow | Current Status in Codebase | Security Control |
| :--- | :--- | :---: | :--- |
| **CCTNS** | Automated FIR and Seizure Memo ingestion via JSON push | `SIMULATED_AND_FIXTURE_TESTED` | Schema validation, fail-closed parsing |
| **ICJS** | Criminal history & court appearance cross-referencing | `SIMULATED_AND_FIXTURE_TESTED` | Read-only court docket parser |
| **NCRP (1930 Portal)** | Golden Hour cybercrime complaint ingestion | `SIMULATED_AND_FIXTURE_TESTED` | Automated Golden Hour SLA countdown |
| **eSakshya** | Mobile device digital evidence seizure linking | `SIMULATED_AND_FIXTURE_TESTED` | Hash-match with eSakshya QR manifests |
| **Banking CBS** | Finacle 10.x journal audit & Section 107 debit lien | `SIMULATED_AND_FIXTURE_TESTED` | Balance conservation invariant |
| **Telecom TSPs** | Dynamic CGNAT IPDR translation tables | `SIMULATED_AND_FIXTURE_TESTED` | Z3 SMT time-window solver |
| **eFSL LIMS** | Laboratory examination schedule & Section 63 signature | `SIMULATED_AND_FIXTURE_TESTED` | Bitstream hash verification |

---

### 6. HUMAN REVIEW REQUIREMENTS & ZERO-AUTOMATION SAFEGUARDS

In strict adherence to Constitutional Rule 5 (*AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES*):
1. **No Automated Freezes:** TARKA calculates the Dinic Min-Cut and generates Section 107 BNSS freeze notices, but the actual dispatch requires human officer confirmation and digital signature.
2. **No Automated Accusations:** TARKA identifies syndicate graph connections, but never classifies an individual as "guilty" or "accused" without explicit human determination.
3. **No Automatic Entity Merges:** Conflicting statutory KYC tokens (PAN/Aadhaar) permanently prevent identity merging.

---

### 7. PILOT EVALUATION METRICS

A 90-day pilot deployment will be evaluated against five quantitative success criteria:
1. **Golden Hour Response Latency:** Time from complaint intake to Section 107 freeze order generation reduced from $> 48\text{ hours}$ to $< 15\text{ minutes}$.
2. **Attribution Disambiguation Accuracy:** Zero false-positive subscriber attributions from dynamic NAT IPDR pools.
3. **Court Admissibility Rate:** 100% judicial acceptance of Section 63(4) BSA electronic evidence dossiers without procedural objections.
4. **Clean Capital Preservation:** 100% preservation of legitimate merchant working balances under Roscoe v. Winder rules.
5. **System Uptime & Data Integrity:** Zero hash collisions or custody record corruptions across 10,000 ingested evidence files.
