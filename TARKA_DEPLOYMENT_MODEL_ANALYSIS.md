# TARKA × SENTINELX — COMMERCIAL & DEPLOYMENT ARCHITECTURE ANALYSIS

**Classification:** AUTHORITATIVE INFRASTRUCTURE & ARCHITECTURAL SPECIFICATION  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Roles:** Principal Product Architect & Cloud Infrastructure Lead  
**Document Code:** `ARCH-DEPLOY-2026-V1`  
**Date:** 2026-11-24  

---

## 1. Executive Summary

This document evaluates the commercial, operational, and technical trade-offs across four distinct deployment models for TARKA × SentinelX. 

Because financial investigation records involve sensitive consumer data, banking trade secrets, and ongoing police criminal proceedings, **one deployment architecture cannot serve all stakeholders**.

The analysis contrasts:
1. **Model A:** Institution-Hosted Private Deployment (Air-Gapped / On-Premises).
2. **Model B:** Isolated Cloud Deployment (MeitY-Empaneled Dedicated GovCloud VPC).
3. **Model C:** Research & Academic Sandbox (University Forensic Research Enclave).
4. **Model D:** Managed Demonstration Environment (Synthetic-Only Public Testbed).

---

## 2. Comparative Deployment Architecture Matrix

```
+---------------------------------------------------------------------------------------------------------+
|                                  DEPLOYMENT ARCHITECTURE COMPARISON MATRIX                              |
+---------------------------------------------------------------------------------------------------------+
| Evaluation Vector      | Model A: On-Premises Air-Gap | Model B: GovCloud VPC     | Model C: Academic Lab | Model D: Managed Demo |
+------------------------+------------------------------+---------------------------+-----------------------+-----------------------+
| Target Stakeholder     | State FSLs, Bank Internal FRM| State Cyber Cells, I4C    | NFSU, IITs, IIITs     | Prospective Partners  |
| Primary Data Handled   | Live Restricted Casework     | Live Complaint Intake     | Consented Study Data  | 100% Synthetic Only   |
| Hardware Footprint     | Dedicated Server / Tower PC  | Kubernetes / VM in VPC    | Departmental Server   | Single VM / Docker Compose
| Network Connectivity   | Completely Air-Gapped (No IN)| Private VPN / Dedicated IP| Campus Intranet       | Public Internet HTTPS |
| Storage Authority      | Local Filesystem CAS / MinIO | Encrypted S3-Compatible   | Local Encrypted ZFS   | Ephemeral Local Disk  |
| Operating Cost Profile | High CapEx, Low OpEx         | Moderate OpEx (Monthly)   | Low CapEx (Grant)     | Minimal OpEx          |
| Data Residency         | Physical Institution Vault   | Sovereign India (MeitY)   | University Data Centre| Sovereign India Cloud |
| Procurement Pathway    | GeM Portal / Direct Tender   | GeM Cloud Service / NIC   | Research Grant MOU    | Free Community Tier   |
+---------------------------------------------------------------------------------------------------------+
```

---

## 3. Deep-Dive Model Evaluations

### 3.1 Model A: Institution-Hosted Private Deployment (Air-Gapped / On-Premises)
- **Target Institutions:** State and Central Forensic Science Laboratories (DFSS / CFSLs), Commercial Bank Internal Vigilance Units.
- **Security & Threat Boundary:**
  - Zero inbound or outbound internet connectivity.
  - Physical workstation access controlled via biometric lab security doors.
  - USB evidence intake strictly filtered through write-blockers and Multimodal Evidence Gateway.
- **Storage & Infrastructure:**
  - Local NVMe filesystem Content-Addressed Storage (CAS) with streaming SHA-256.
  - Embedded local PostgreSQL database instance; in-process Z3 SMT solver.
  - Offline local browser speech synthesis and regex-based OCR fallback (zero external API calls).
- **Maintenance & Updates:**
  - Quarterly signed firmware/software updates delivered via offline encrypted optical media (Blu-ray / Write-Once).
- **Procurement & Compliance:**
  - Procured via Government e-Marketplace (GeM) hardware tender.
  - Meets strict Ministry of Home Affairs (MHA) air-gapped forensics laboratory guidelines.

### 3.2 Model B: Isolated Cloud Deployment (MeitY-Empaneled Dedicated GovCloud VPC)
- **Target Institutions:** State Police Cybercrime Investigation Units, Indian Cyber Crime Coordination Centre (I4C).
- **Security & Threat Boundary:**
  - Deployed in a dedicated Virtual Private Cloud (VPC) on a MeitY-empaneled sovereign cloud provider (NIC MeghRaj, AWS GovCloud India, or Azure India Central).
  - Access restricted via IP allowlisting, State Police VPN tunnels, and hardware token Multi-Factor Authentication (MFA).
  - Multi-tenant database partitioning strictly isolating cases by Police Station and District.
- **Storage & Infrastructure:**
  - S3-compatible object storage with server-side KMS encryption (AES-256) and strict bucket immutability (Object Lock WORM).
  - Microservices orchestrated via hardened Kubernetes (k8s) pods with non-root security contexts (`runAsUser: 10001`).
- **Maintenance & Operational SLA:**
  - High availability ($99.9\%$ uptime); automated database point-in-time recovery (PITR); zero-downtime rolling updates.
- **Procurement & Compliance:**
  - Cloud service procurement via GeM cloud services category.
  - Mandatory SOC 2 Type II, ISO/IEC 27001, and CERT-In empanelled security clearance.

### 3.3 Model C: Research & Academic Deployment (NFSU / University Forensic Sandbox)
- **Target Institutions:** National Forensic Sciences University (NFSU), IIT Digital Forensics Labs.
- **Security & Threat Boundary:**
  - Isolated research VLAN on university campus network.
  - Role-based separation: Students/Researchers have read-only access to anonymized evaluation splits; Faculty Advisors hold dataset custodian keys.
- **Data Residency & Ethics:**
  - Institutional Review Board (IRB) approved data handling protocol.
  - Strict compliance with Section 6 DPDPA 2023 for student participant consent.
- **Maintenance & Cost:**
  - Low operating cost funded via departmental research and sponsored cyber grants.
  - Enables academic red-teaming and reproducible thesis evaluations.

### 3.4 Model D: Managed Demonstration Environment (Public / Synthetic-Only)
- **Target Institutions:** Prospective institutional partners evaluating the platform prior to formal procurement.
- **Security & Safety Invariants:**
  - **Zero Live Casework Prohibition:** Under no circumstances shall real-world payment evidence, complainant records, or sensitive bank statements be admitted into this environment.
  - Runs exclusively with synthetic demonstration fixtures (`data/demo_cases/`).
  - Automatic session reset every 60 minutes, purging all uploaded temporary files.
- **Infrastructure:**
  - Lightweight single-node VM (Ubuntu 24.04 LTS, 4 vCPUs, 16GB RAM) running Docker Compose.
  - Automated Let's Encrypt TLS certificate renewal.

---

## 4. Architectural Recommendation for Phase 12C

For immediate institutional demonstrations and prospective pilot onboarding:
1. **Immediate Execution (Current):** Deploy **Model D** for remote executive briefings using the audited, synthetic demonstration suite (`Autonomous Demo Director`).
2. **Pilot Activation (Next Phase):** For the first external law enforcement pilot, deploy **Model A** (dedicated air-gapped forensic workstation in a State Cyber Cell) to eliminate cloud data residency, network security, and DPDPA compliance friction.
