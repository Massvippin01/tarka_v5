# TARKA: CURRENT LIMITATIONS & RESEARCH GAPS
**Honest Critical Appraisal, Architectural Boundaries, and Open Research Problems**  
**Repository Working Directory:** `C:\PROJECTS\tarka_v5_clean_verify`  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Audience:** Academic Faculty Mentors, Graduate Researchers, Forensic Systems Engineers  

---

## 1. TECHNICAL & IMPLEMENTATION LIMITATIONS

While TARKA demonstrates high forensic integrity and full-system execution across its implemented modules, a rigorous scientific evaluation identifies several clear boundaries and operational constraints in the current implementation:

### 1.1 Air-Gapped vs. Live Banking Core Integration
- **Current Reality:** TARKA processes batch exports (CSV, Excel, XML, PDF) provided by bank nodal officers or police intake.
- **Limitation:** There is no live, real-time API integration with Indian core banking systems (e.g., direct Finacle Connect or ISO 20022 real-time message bus). In a live deployment, receiving statements via email or USB introduces unavoidable latency into the golden-hour triage window.
- **Research Implication:** Developing authenticated, read-only nodal gateways under RBI regulatory sandboxes remains an essential operational step.

### 1.2 Synthetic vs. Real-World Messy Data Gap
- **Current Reality:** Automated benchmarks and regression suites operate predominantly on structured synthetic datasets (PaySim, IBM AML, deterministic 5-file Indian case packs).
- **Limitation:** Real-world banking statements and telco IPDRs exhibit extreme formatting variance: non-standard transaction descriptions (e.g., unstructured UPI narrations), OCR artifacts from scanned physical FIRs, missing columns, and inconsistent timestamp string formats.
- **Mitigation in Place:** The Source Adapters Registry handles defensive parsing and schema auto-mapping, but edge-case human reconciliation is still frequently required.

### 1.3 Scalability of Formal SMT Solving (Z3) on Massive Datasets
- **Current Reality:** Microsoft Z3 SMT solver is used to formally prove double-entry conservation and temporal monotonicity on case dossiers (tens to hundreds of transactions).
- **Limitation:** SMT constraint solving over quantifier-free linear integer arithmetic is NP-complete. While solving completes in 3.2 ms for an individual case dossier with 50 transactions, feeding a 10,000,000-row bank transaction ledger directly into an SMT solver will cause exponential state explosion and timeout.
- **Research Opportunity:** Investigating hybrid architectures where heuristic graph algorithms first isolate candidate sub-graphs, and formal SMT solving is applied strictly to the localized sub-graph.

### 1.4 Carrier-Grade NAT (CGNAT) Multi-Carrier Log Discrepancies
- **Current Reality:** Stage 03 successfully demonstrates the 4-hop set intersection funnel ($340 \rightarrow 1$) when provided with normalized IPDR translation tables.
- **Limitation:** In real Indian telecommunications, Airtel, Reliance Jio, and Vodafone Idea maintain divergent IPDR schema structures, varying retention periods, and unstandardized RADIUS server timestamp resolutions (some record in seconds, others in milliseconds).
- **Research Opportunity:** Developing a unified Department of Telecommunications (DoT) standard ontology for IPDR forensic exchange.

---

## 2. PRIVACY & STATUTORY RESEARCH CHALLENGES

### 2.1 Production Deployment of Zero-Knowledge Proofs & PBFT
- **Current Reality:** The workbench implements ECDH Private Set Intersection and 4-node PBFT consensus in a local simulation environment (`PrivacyCryptoWorkbench.tsx`).
- **Limitation:** A production deployment across 30+ independent Indian commercial banks requires an inter-bank consortium network with formal legal framework backing under NPCI or RBI oversight.
- **Research Gap:** Designing zero-knowledge range proofs for account balances that can verify lien solvency without revealing customer account balances to competitor banks.

### 2.2 Forensic Explainability in Judicial Cross-Examination
- **Current Reality:** The workbench outputs mathematically rigorous Section 63 BSA certificates and Leave-One-Out ablation scores.
- **Limitation:** Indian trial court judges and public prosecutors are rarely trained in SMT constraint solving, Minimal Unsatisfiable Subsets (MUS), or graph centrality metrics.
- **Research Gap:** Bridging the pedagogical gap: translating formal mathematical proofs into intuitive visual metaphors that stand up to adversarial cross-examination by defense counsel without compromising scientific rigor.

