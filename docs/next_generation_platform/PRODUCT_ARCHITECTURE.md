# TARKA | NEXT-GENERATION FORENSIC COMMAND PLATFORM ARCHITECTURE

**Product:** TARKA Cyber Fraud Investigation and Attribution Workbench  
**Local Repository:** `C:\PROJECTS\tarka_v5_clean_verify`  
**Governing Doctrine:** **AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.**  
**Statutory Foundation:** Bharatiya Sakshya Adhiniyam, 2023 (§63) · Bharatiya Nagarik Suraksha Sanhita, 2023 (§106, §107) · IT Act, 2000 (§79A)

---

## 1. System Vision & Paradigm Shift

TARKA is engineered as a unified, evidence-centred, multilingual forensic investigation and intelligence workbench designed for law-enforcement agencies (LEAs), cyber crime police stations, and judicial examiners of electronic evidence.

Unlike generic analytics software or conversational chatbots, TARKA treats all incoming data as untrusted digital artifacts. The platform enforces an immutable chain of custody from initial acquisition to courtroom certificate generation. 

```
                                      ┌────────────────────────────────────────────────────────┐
                                      │              TARKA FORENSIC COMMAND PLATFORM           │
                                      └───────────────────────────┬────────────────────────────┘
                                                                  │
                    ┌─────────────────────────────────────────────┼─────────────────────────────────────────────┐
                    ▼                                             ▼                                             ▼
       ┌────────────────────────┐                   ┌───────────────────────────┐                 ┌───────────────────────────┐
       │   FORENSIC ENGINE      │                   │   GOVERNED ORCHESTRATOR   │                 │    TACTILE SKEUOMORPHIC   │
       │                        │                   │                           │                 │       COMMAND SHELL       │
       │ • Double-Entry Ledger  │                   │ • 7 Specialist Agents     │                 │                           │
       │ • RRN Julian Decompile │◄─────────────────►│ • Multi-Model Serving     │◄───────────────►│ • Warm Ivory Surface      │
       │ • CGNAT Port Funnel    │                   │ • Multilingual STT/TTS    │                 │ • Tactile Graphite Rails  │
       │ • LIBR Lien Calculator │                   │ • RBAC Policy Gateway     │                 │ • Section 63 Admissibility│
       │ • Z3 SMT Difference    │                   │ • Provenance Verification │                 │ • Universal Assistant     │
       └────────────────────────┘                   └───────────────────────────┘                 └───────────────────────────┘
```

---

## 2. Core Architectural Pillars

### 2.1 Pillar I: The Canonical Data Authority
1. **Raw Evidence Storage:** Append-only S3/local bitstream repository preserving exact raw bytes with immutable SHA-256 hashes.
2. **Transactional & Ledger Authority:** PostgreSQL / SQLite WAL engines managing structured accounts, ledger entries, and audit logs.
3. **Graph Projection & Centrality:** High-performance in-memory and Neo4j graph projections mapping suspect clusters, mule networks, and transit hotspots.
4. **Derived Indices:** Search and timeline projections that can be 100% rebuilt deterministically from raw bitstreams.

### 2.2 Pillar II: The Tripartite Governance Doctrine
- **AI PROPOSES:** Machine learning models, OCR parsers, and heuristic clustering propose links, transaction patterns, and candidate identities.
- **EVIDENCE VERIFIES:** Every proposed claim must mathematically ground in raw bitstream records via cryptographic hash lineage and formal verification (Z3 SMT Difference Logic).
- **HUMAN DECIDES:** Consequential actions—such as bank debit freezes, statutory notices, suspect classifications, and identity merges—require explicit confirmation by the authorized Investigating Officer (IO).

### 2.3 Pillar III: Provider-Independent Multilingual Voice Engine
A full-duplex speech-to-speech architecture capable of processing live microphone input, detecting speech activity (VAD), streaming transcription across 11 Indian scheduled languages plus code-mixed variants (Tanglish, Hinglish), and synthesizing natural audio feedback with real-time barge-in interrupt controls.

---

## 3. Subsystem Breakdown

### 3.1 Forensic Analysis Engine
- **Financial Ledger Reconciler:** Validates Finacle CBS and BaNCS statements using double-entry balance conservation ($\text{Balance}_n = \text{Balance}_{n-1} + \text{Credit}_n - \text{Debit}_n$).
- **RRN Julian Decompiler:** Deconstructs 12-digit NPCI UPI reference numbers into Year, Julian Day, Issuer Bank Gateway Code, and Sequence tokens to unmask backdated or fabricated receipts.
- **Money Trail & LIBR Lien Engine:** Computes equitable, non-inflated victim recovery claims under the *Lowest Intermediate Balance Rule* (LIBR) pursuant to BNSS §106/§107.
- **CGNAT Ephemeral Port Funnel:** Matches public IP, private IP, ephemeral source port, and microsecond timestamps against telecom carrier RADIUS logs to isolate subscriber IMSI and IMEI hardware chassis.
- **Temporal Evidence Loom:** Aligns heterogenous timestamps across bank statements, CDR logs, tower records, and WhatsApp messages, correcting for clock drift and preserving strict causal sequence.

### 3.2 Controlled Multi-Agent Orchestrator
A governed coordinator supervising 7 bounded specialist capabilities:
1. **Evidence Analyst:** SHA-256 verification, custody tracking, and artifact intake validation.
2. **Financial Analyst:** Ledger reconciliation, transaction tracing, and LIBR lien calculations.
3. **Temporal Analyst:** Timestamp normalization, clock-drift evaluation, and chronological sequencing.
4. **Entity and Network Analyst:** Graph traversal, mule ring clustering, and Hard-Veto merge protection.
5. **Forensic Reasoning Analyst:** Claim extraction, Z3 SMT solver verification, and contradiction detection.
6. **Report Analyst:** Judicial Section 63 BSA certificate drafting and statutory requisition generation.
7. **Voice and Language Service:** Multilingual speech recognition, language identification, and speech synthesis.

### 3.3 Tactile Skeuomorphic User Interface
- Built with React, Vite, Tailwind CSS v4, and TypeScript.
- Replaces flat corporate SaaS styling with an authoritative physical workstation aesthetic: warm linen backgrounds (`#F1ECE4`), tactile graphite navigation (`#292522`), rich brown containers (`#49362E`), micro-bevel highlights, and restrained burnt orange accents (`#A85C2A`).
- Enforces a strict 12px minimum typography floor to guarantee judicial readability.

---

## 4. Statutory Compliance & Legal Grounding

| Legislation & Section | Legal Threshold | TARKA Architecture Compliance |
|---|---|---|
| **Bharatiya Sakshya Adhiniyam, 2023 §63** (formerly IEA §65B) | Proof of integrity of electronic records, computer system custody, and operational calibration. | Automated SHA-256 calculation upon intake; automated generation of certified certificates specifying software version, host calibration, and custodial hash lineage. |
| **Bharatiya Nagarik Suraksha Sanhita, 2023 §106 / §107** | Provisional attachment, seizure, and forfeiture of criminal proceeds. | Real-time Golden-Hour triage; automated generation of statutory bank freeze requisitions with exact LIBR proportional amounts. |
| **Information Technology Act, 2000 §79A** | Central Government notification of Examiner of Electronic Evidence. | Tamper-evident Investigation Flight Recorder providing an append-only, cryptographically linked operational audit trail (ISO/IEC 27042). |
| **DoT CGNAT Mandatory Logging Circular** | Telecom service providers must log and correlate private IP, public IP, and source port. | Specialized CGNAT Attribution Funnel resolving dynamic telecom carrier NAT allocations to unique subscriber IMSIs. |

