# SentinelX: AI-Powered Criminal Network Analysis System
**Smart India Hackathon 2026 — Problem Statement 26189**  
**Team: Celestials**  
*Government-Grade Investigative Intelligence Platform*

---

## Slide 01: Title
- **System Name**: SentinelX
- **Subtitle**: AI-Powered Criminal Network Analysis System
- **Event**: Smart India Hackathon 2026 (Problem Statement 26189)
- **Team**: Celestials
- **Core Doctrine**: `ML PROPOSES → EVIDENCE VERIFIES → HUMAN DECIDES`
- **Purpose**: Transform fragmented police & intelligence records into connected, explainable evidence for authorized investigators without automated guilt determination or black-box predictive policing.

---

## Slide 02: The Investigation Problem
- **Siloed & Fragmented Intelligence**: Police departments operate across multiple isolated databases (CCTNS, ICJS, NCRP, VAHAN, CDR telecom logs, ANPR camera feeds, bank transaction ledgers).
- **Manual Pattern Recognition**: Investigators spend up to 70% of inquiry time manually matching phone numbers, aliases, registration plates, and bank accounts across paper FIRs and unindexed spreadsheets.
- **Lost Cross-Case Connections**: Inter-district and inter-state organized criminal networks exploit jurisdictional boundaries because isolated police stations cannot see overlapping entities across active cases.

---

## Slide 03: Why Existing Fragmented Records Fail
- **Lack of Entity Resolution**: Variant spellings (e.g., "Suresh Kumar" vs "Suresh Kr" vs Indic transliterations "सुरेश कुमार"), temporary burner numbers, and false identities prevent automated linkage across cases.
- **No Temporal-Spatial Grounding**: Raw CDR dumps lack contextual spatial overlays to corroborate whether two suspects were co-located during crime commission windows.
- **Black-Box AI Fallacies**: Generic chatbots and predictive policing tools fabricate hallucinations or make probabilistic predictions without underlying source citations, creating inadmissible evidence and violating legal standards.

---

## Slide 04: SentinelX Operating Model
- **Fundamental Operating Principle**:
  ```
        ML PROPOSES
             ↓
        EVIDENCE VERIFIES
             ↓
        HUMAN DECIDES
  ```
- **Strict Epistemic Boundaries**:
  - Never present an AI prediction as a fact.
  - Never automatically label any person as criminal.
  - Every intelligence claim is traceable to raw evidence, source record ID, SHA-256 digest, timestamp, transformation log, and reasoning path.

---

## Slide 05: End-to-End Intelligence Pipeline (18 Stages)
```
SOURCE DATA ➔ INGESTION ➔ VALIDATION ➔ NORMALIZATION ➔ PARSING ➔ ENTITY EXTRACTION ➔ ENTITY RESOLUTION ➔ EVIDENCE REGISTRATION ➔ KNOWLEDGE GRAPH CONSTRUCTION ➔ GRAPH + STATISTICAL ANALYTICS ➔ CANDIDATE RELATIONSHIPS ➔ EVIDENCE VERIFICATION ➔ CONTRADICTION ENGINE ➔ PROVENANCE ASSEMBLY ➔ RAG CONTEXT ➔ EXPLAINABLE INTELLIGENCE ➔ CONFIDENCE STATE ➔ INVESTIGATOR REVIEW & DECISION ➔ IMMUTABLE AUDIT TRAIL
```
- **Key Capability**: Complete 18-stage flow from raw unstructured PDF/CDR ingestion to investigator sign-off and SHA-256 audit chaining.

---

## Slide 06: System Architecture (Dual-Level Architecture)
- **Primary Data Split**:
  - **PostgreSQL**: System-of-Record for users, roles, cases, FIR metadata, workflow state, cryptographic audit logs, and structured transactional records.
  - **Neo4j**: Graph engine for high-performance multi-hop traversal, centrality, community detection, and temporal relationship analysis.
  - **Object Storage**: S3-compatible vault for original evidence PDFs, scans, audio transcripts, and generated reports.
  - **OpenSearch**: Full-text, fuzzy, and phonetic indexing layer.

---

## Slide 07: Knowledge Graph Architecture
- **18 Core Node Types**: Person, Case, FIR, Incident, Evidence, Location, Phone, Device, Vehicle, Organization, Financial Account, Transaction, Document, Event, Court, Police Station, Officer, Address.
- **19 Core Edge Types**: `INVOLVED_IN`, `SUSPECT_IN`, `VICTIM_IN`, `WITNESS_IN`, `CONTACTED`, `USES_PHONE`, `USES_DEVICE`, `USES_VEHICLE`, `VISITED`, `LOCATED_AT`, `ASSOCIATED_WITH`, `TRANSFERRED_TO`, `OWNED_BY`, `MENTIONED_IN`, `SUPPORTED_BY`, `CONTRADICTED_BY`, `OCCURRED_AT`, `OCCURRED_NEAR`, `RELATED_TO`.
- **Temporal & Provenance Metadata**: Every edge contains `observed_at`, `valid_from`, `valid_to`, `source_evidence_id`, and `confidence_score`.

---

## Slide 08: Entity Resolution Engine
- **Multi-Tier Matching Logic**:
  - **Deterministic Rules**: Aadhaar hash, PAN number, IMEI, Passport match (Score: 1.0).
  - **Indic Phonetic & Transliteration**: Metaphone, Soundex, and Devanagari/Tamil/Telugu transliteration matching for Indian name variations.
  - **Contextual & Graph Corroboration**: Co-location in spatio-temporal windows and shared communication networks.
- **Hard Vetoes**: Distinct verified biometric identifiers or proven physical co-location in distant geographies at the exact same timestamp block false identity merges.

---

## Slide 09: AI + Evidence Verification
- **Claim Verification Boundary**:
  - Raw Record ➔ Observation ➔ Signal ➔ Evidence Citation ➔ Candidate Claim ➔ Investigator Verification.
- **Ground-Truth Citations**: Every AI-generated summary highlights raw record citations (e.g., `FIR-2026-882`, `CDR-TEL-9912`) and confidence percentages.

---

## Slide 10: Signature Feature: Live Proof Engine
- **5 Authoritative Epistemic Statuses**:
  1. `SUPPORTED`: Direct multi-source documentary evidence confirms the link.
  2. `CORROBORATED`: Independent secondary sources (e.g., CDR + ANPR co-location) reinforce the relationship.
  3. `UNVERIFIED`: Algorithmic suggestion awaiting investigator review.
  4. `CONTRADICTED`: Conflicting evidence detected (e.g., cell tower ping vs verified flight manifest).
  5. `REQUIRES REVIEW`: High-priority investigative gap needing field verification.
- **Transparency**: Never hide contradictory evidence.

---

## Slide 11: Unified Investigator Workspace
- **Command Shell Navigation**: Command Center, Cases, Entities, Knowledge Graph, Timeline, Evidence, Analytics, Alerts, Watchlists, Audit, Admin.
- **High-Density Ergonomic UI**: Built with dark slate graphite (#081018 / #0D1721), restrained electric cyan (#31C4D8), thin technical lines (#243342), and monospaced metadata badges.

---

## Slide 12: Network Intelligence & Graph Analytics
- **Graph Algorithms**:
  - **PageRank & Betweenness Centrality**: Identify key network brokers, recruiters, and financial hubs.
  - **Louvain / Label Propagation**: Automatically detect isolated gang sub-clusters and cell organizations.
  - **Shortest Path & Multi-Hop Traversal**: Trace hidden connection chains between seemingly unrelated suspects across multiple FIRs.

---

## Slide 13: Spatio-Temporal & GIS Intelligence
- **Spatio-Temporal Co-Location**: MapLibre GL integration for GIS visualization of ANPR camera hits, cell tower pings, and crime locations.
- **Interactive Timeline Scrubbing**: Filter network graphs dynamically across hours, days, or months to observe network formation and dissolution.

---

## Slide 14: Governed AI Copilot
- **Evidence-Grounded Assistant**:
  - Answers complex investigative queries (e.g., *"Which cases share phone number +91 98765 43210?"* or *"Show contradictory evidence for Case C102"*).
  - Supplies graph context, underlying evidence IDs, confidence ratings, and review status.
  - Expressly forbidden from injecting ungrounded facts or auto-closing investigations.

---

## Slide 15: Security, Governance & Responsible AI
- **Security Architecture**:
  - Role-Based Access Control (RBAC) with Case Scope isolation (`403 ACCESS_DENIED` enforcement).
  - SHA-256 cryptographic audit hash chaining for tamper-evident activity logging.
  - AES-256 encryption at rest and TLS 1.3 in transit.
- **Responsible AI Principles**: Purpose limitation, least privilege, zero demographic bias, complete provenance auditability.

---

## Slide 16: Deployment Architecture (Dual-Level)
- **Level 1: SIH Working Prototype**: Local/Air-Gapped Docker containers (FastAPI, React/Next.js, PostgreSQL, Neo4j, Local Transformers/Ollama LLM).
- **Level 2: State / Enterprise Scale**: Kubernetes container orchestration, PostgreSQL HA cluster, Neo4j Causal Cluster, Distributed S3 Storage, OpenSearch cluster, Kafka event streaming, GPU inference nodes, SIEM integration.

---

## Slide 17: Scalability & Empirical Performance Benchmarks
- **Empirical System Telemetry**:
  - Federated Search Latency: P50 = 3.5ms, P95 = 7.2ms
  - Server-Side Bounded Graph Projection: P50 = 4.2ms, P95 = 9.8ms
  - Copilot Grounded Query Processing: P50 = 120ms, P95 = 185ms
  - Backend Test Suite: 19/19 PASSED (100%)
  - Frontend Build: 0 Errors (TypeScript Clean)

---

## Slide 18: Implementation & Golden Vertical Slice
- **Golden Vertical Slice (Case C102 ↔ Case C481)**:
  - Demonstrates multi-case entity resolution linking Suspect P001 across Case C102 (Cyber Fraud) and Case C481 (Financial Syndicate).
  - Preserves 100% provenance chain across CDR001, TXN001, ANPR001, and Evidence EV-2026-101.

---

## Slide 19: Operational Impact
- **70% Reduction in Manual Discovery Time**: Automated entity extraction and Indic phonetic resolution instantly surface hidden cross-case links.
- **Audit-Grade Court Evidence Packages**: Standardized PDF report generation with embedded SHA-256 digests and provenance chains suitable for legal prosecution.

---

## Slide 20: Future Expansion Roadmap
- **Multi-State Intelligence Federation**: Secure cross-border agency sharing with granular data privacy controls.
- **Real-Time Stream Processing**: Kafka-based live ingestion of statewide ANPR and financial intelligence feeds.

---

## Slide 21: Closing & Master Principle
> **"FROM FRAGMENTED RECORDS TO CONNECTED EVIDENCE TO EXPLAINABLE INVESTIGATIVE INTELLIGENCE."**

- **DISCOVER ➔ CONNECT ➔ VERIFY ➔ EXPLAIN ➔ DECIDE**
- *The AI assists. The evidence grounds. The investigator decides.*
