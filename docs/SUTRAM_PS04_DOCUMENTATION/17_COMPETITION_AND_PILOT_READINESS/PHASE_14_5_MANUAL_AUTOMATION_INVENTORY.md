# TARKA SUTRAM 2026 PS04 | PHASE 14.5
# MANUAL OPERATIONS INVENTORY AND AUTOMATION REPORT

**Repository:** `C:\PROJECTS\tarka_v5`  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Focus:** Operational Bottleneck Analysis, Safe Deterministic Automation, and Gated Human Boundaries  

---

## 1. Executive Summary

A critical objective of Phase 14.5 is identifying repetitive, error-prone manual operations in cyber fraud investigations and defining a disciplined automation hierarchy. 

In strict adherence to the project constitution:
1. **Deterministic, Non-Destructive Tasks** (e.g., MIME sniffing, SHA-256 calculation, Z3 difference logic constraint solving, transaction ledger reconstruction, timeline sorting) are automated to eliminate investigator cognitive overload.
2. **Consequential, Epistemic, or Legal Decisions** (e.g., identity confirmation, entity merging, formal findings sign-off, statutory reporting, fund-freeze recommendations, evidence deletion) strictly require explicit human authorization.
3. **No Uncontrolled Autonomous Actions:** The AI proposes hypotheses, extracts patterns, and presents formal bounds; human officers retain sole adjudicative authority.

---

## 2. Complete Manual Operations Inventory & Automation Matrix

| # | Task / Workflow | Current Manual Steps | Proposed Automation | Human Approval Required? | Risk Level | Implementation Status |
|---|---|---|---|---|---|---|
| 01 | **Case Creation & Configuration** | Manually typing FIR numbers, victim details, statutory categories, and investigator badges. | **Case Creation Templates:** Pre-populated jurisdictional templates (e.g., State Cyber Cell, Special Cell, Bank Frauds) with auto-assigned RBAC clearance scopes. | **NO** (Initiation only) | **LOW** | IMPLEMENTED |
| 02 | **Bulk Evidence Ingestion** | Uploading files one by one, checking file extensions, manually inspecting file sizes and types. | **Asynchronous Batch Intake Worker:** Ingest multiple files, detect MIME magic headers, reject invalid payloads, compute SHA-256 in parallel. | **NO** (Intake ingestion) | **LOW** | IMPLEMENTED |
| 03 | **Evidence Classification** | Investigator opens each document to determine whether it is a bank CSV, CDR log, WhatsApp export, or receipt screenshot. | **Deterministic Format Classifier:** Header inspection and schema matching automatically assign artifact category and metadata tags. | **NO** | **LOW** | IMPLEMENTED |
| 04 | **Forensic Metadata Extraction** | Manually reading and copy-pasting account numbers, IFSC codes, phone numbers, IMEI, and timestamps. | **Regex & Deterministic Normalizers:** Automated extractor pulls structured banking, telecom, and network entities directly from raw bitstreams. | **NO** | **LOW** | IMPLEMENTED |
| 05 | **Duplicate Evidence Detection** | Cross-checking file names and manual directory listings for re-uploaded duplicate evidence. | **Content-Addressed Storage (CAS) Deduplication:** SHA-256 hash lookup instantly identifies identical bitstreams without duplicating disk storage. | **NO** | **LOW** | IMPLEMENTED |
| 06 | **Entity Resolution Candidates** | Visually cross-referencing names, addresses, and phone numbers across disparate evidence files. | **Probabilistic Clustering with Epistemic Flags:** Graph engine highlights candidate links (e.g., shared phone or device) and surfaces contradictory attributes. | **YES (MANDATORY)** — Never automatically merge identities. | **MEDIUM** | IMPLEMENTED (Gated) |
| 07 | **Transaction Ledger Reconstruction** | Manually assembling bank statements in spreadsheets to trace multi-hop money flow. | **Automated Fan-Out Reconstruction:** Transaction ledger parser links debits to credits by RRN, timestamp, and amount; builds visual Sankey diagram. | **NO** (Analytical view) | **LOW** | IMPLEMENTED |
| 08 | **Multi-Source Timeline Generation** | Sorting and aligning disparate chat timestamps, call records, and bank debit logs across different timezones. | **Unified Temporal Evidence Loom:** Automatically normalizes UTC/IST timestamps and projects unified chronological event sequence. | **NO** (Analytical view) | **LOW** | IMPLEMENTED |
| 09 | **Contradiction Detection** | Investigator cross-referencing conflicting claim amounts (e.g., disputed receipt vs. bank core debit). | **Z3 SMT Solver Difference Logic:** Formally verifies constraint satisfiability; flags Minimal Unsatisfiable Subsets (MUS) with zero statistical hallucination. | **NO** (Mathematical verification) | **LOW** | IMPLEMENTED |
| 10 | **Forensic Claim Compilation** | Manually drafting formal claims, listing supporting exhibits, and documenting assumptions. | **Claim Dependency Compiler:** Structures typed evidence inputs, builds dependency DAG, calculates sensitivity to evidence removal ("What-If"). | **YES** (Claim approval) | **MEDIUM** | IMPLEMENTED (Gated) |
| 11 | **Statutory Report Assembly** | Manually drafting Section 63 BSA certificates, typing examiner credentials, pasting hash values. | **Automated Section 63 BSA Report Generator:** One-click compilation of verified findings, provenance DAG, and cryptographic signatures into binary PDF. | **YES (MANDATORY)** — Consequential statutory action; requires explicit confirmation. | **HIGH** | IMPLEMENTED (Gated) |
| 12 | **Evidence Integrity Verification** | Manually re-computing SHA-256 checksums from command line tools to verify tamper-proofing. | **One-Click Bitstream Audit:** Automated batch hash verification compares current storage bytes against immutable custody ledger; red flags any discrepancy. | **NO** (Verification only) | **LOW** | IMPLEMENTED |
| 13 | **Case Export & Package Creation** | Zipping folder structures, copying files, and generating text manifests for court submission. | **Standardized Forensic Package Exporter:** Bundles raw immutable bitstreams, cryptographic manifests, Section 63 certificates, and provenance records. | **YES** (Officer authorization) | **MEDIUM** | IMPLEMENTED (Gated) |
| 14 | **Audit Ledger Recording** | Manually keeping logbooks of which investigator viewed, downloaded, or exported evidence. | **Immutable Flight Recorder:** Asynchronous background audit logging automatically appends every action, query, view, and export to cryptographic ledger. | **NO** (System background) | **LOW** | IMPLEMENTED |

---

## 3. Strict Human Authorization Boundaries

The following operations are strictly classified as **HIGH-RISK / HUMAN-ONLY**. Automated execution without human authorization is prohibited:
1. **Evidence Deletion or Purge:** Evidence in TARKA is append-only. No automated or background process may delete evidence bytes.
2. **Identity Confirmation & Merging:** AI may propose identity clusters; merging two suspect identities requires verified officer sign-off.
3. **Formal Findings Approval:** Automated SMT findings remain "PROPOSALS" until formally signed off by the lead investigator.
4. **Statutory Legal Filings:** Section 63 BSA certificates and formal charge-sheet annexures require authenticated investigator confirmation.
5. **Statutory Recovery / Account Freezes:** Automated freeze directives (e.g. 76% recovery simulation) cannot be transmitted to external banking networks without judicial or statutory requisition.
6. **Provenance & Custody Alteration:** Chain-of-custody records are immutable; corrections require compensatory audit amendments, never overwrites.

---

## 4. Priority Roadmap for Additional Automation

1. **Priority 1 (Immediate Staging Hardening):**
   - High-throughput parallel worker for 100+ PDF bank statements (multithreaded OCR and table extraction).
2. **Priority 2 (Field Integration):**
   - Direct integration with LEA digital evidence intake portals (e.g., CCTNS / NCRB secure gateways).
3. **Priority 3 (Cryptographic Defense):**
   - Hardware Security Module (HSM) PKCS#11 driver integration for hardware-sealed Section 63 digital signatures.

