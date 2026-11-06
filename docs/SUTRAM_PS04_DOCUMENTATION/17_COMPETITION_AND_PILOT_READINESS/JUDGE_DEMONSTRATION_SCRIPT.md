# SUTRAM 2026 PS04 — DEMONSTRATION SCRIPT
## STAGE 3: THE 21-STEP COMPLETE INVESTIGATION DEMONSTRATION WALKTHROUGH

**Document Identifier:** `TARKA-DEMO-SCRIPT-2026-V1`  
**Evaluation Session:** SUTRAM 2026 PS04 Jury Presentation  
**Target Case:** `CASE-2026-001` (*"Operation Triad Nexus"*)  
**Demonstration Mode:** Guided Live Interactive Walkthrough  
**Target Duration:** 15–18 Minutes  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Lead Presenter Script

---

### STEP-BY-STEP REHEARSAL TRANSCRIPT

#### STEP 1: OPEN THE CANONICAL INVESTIGATION CASE
- **Presenter Action:** Open `http://127.0.0.1:5173`. Press `Alt+0` or click **"00 Command Hub"** in the sidebar.
- **System Display:** The Bento Workspaces Command Hub displays active cases. Select **"CASE-2026-001 (Operation Triad Nexus)"**.
- **Spoken Rationale:** *"Respected Jury, we open Case #2026-001, a synthetic multi-modal cyber-fraud investigation involving a digital arrest extortion syndicate operating across Delhi NCR, Haryana, and overseas gateways."*

#### STEP 2: INSPECT CASE OVERVIEW & GOLDEN HOUR TELEMETRY
- **Presenter Action:** Observe the top metrics bar.
- **System Display:** Total funds at risk: ₹1,84,000.00. Golden Hour countdown SLA: 118 minutes remaining. Current status: Invariant Production.
- **Spoken Rationale:** *"Notice the active Golden Hour countdown. Under the MHA SOP, emergency provisional attachment notices under Section 107 BNSS must be served within 120 minutes of 1930 portal reporting to prevent cash-out."*

#### STEP 3: EXAMINE ORIGINAL EVIDENCE ARTIFACTS
- **Presenter Action:** Press `Alt+1` or click **"01 Evidence Intake"**.
- **System Display:** Multi-vector intake matrix showing 5 ingested raw files: CBS ledger (`sbi_finacle_cbs.csv`), PDF receipt (`victim_upi_receipt.pdf`), telco CGNAT (`airtel_cgnat_ipdr.csv`), UPI switch XML (`npci_switch_raw.xml`), and WhatsApp chat (`whatsapp_chat.txt`).
- **Spoken Rationale:** *"Here are the raw bitstreams. Notice our evidentiary tiering: T1 HSM-signed Core Banking records, T2 automated switch logs, down to T3 uncertified citizen screenshots."*

#### STEP 4: VERIFY CRYPTOGRAPHIC INTEGRITY & FALSIFICATION GATE
- **Presenter Action:** Click **"Inspect Row #14"** in the CBS ledger table, then click **"Simulate Tamper Row #14"** in the mutator ribbon.
- **System Display:** The SHA-256 hash immediately changes from `5e884898...` to `TAMPERED`. The green banner flips to an unmissable red alert: **"GATE HALTED: CBS FINACLE COMMIT INVARIANT VIOLATION"**. Downstream pipeline tabs lock.
- **Presenter Action:** Click **"Reset Baseline"** (`Alt+R`). Gate restores to green.
- **Spoken Rationale:** *"Rule 4 of our Engineering Constitution: Evidence is immutable. If a single bit in a bank ledger is altered, our Falsification Gate halts downstream reasoning automatically."*

#### STEP 5: RESOLVE CANDIDATE ENTITIES & TEST HARD-VETO
- **Presenter Action:** Press `Alt+2` or click **"02 Entity Resolution"**.
- **System Display:** Candidate entity cards for "Rahul Verma (Suspect A)" and "Rahul Verma (Suspect B)".
- **Presenter Action:** Hover over the red veto badge between the two profiles.
- **System Display:** Tooltip reads: *"Merger Rejected: High name similarity (92.4%) overridden by conflicting PAN numbers (ABCDE1234F vs. WXYZ9876K)."*
- **Spoken Rationale:** *"Unlike generic LLMs that hallucinate identity merges based on names alone, TARKA enforces statutory hard-vetoes. Conflicting PAN or Aadhaar hashes drop merge confidence to zero."*

#### STEP 6: INSPECT THE FRAUD NETWORK GRAPH
- **Presenter Action:** Press `Alt+4` or click **"04 Fraud Network"**.
- **System Display:** Interactive D3 ForceAtlas2 graph. Filter by **"JA4 TLS Fingerprint"** and **"Wi-Fi BSSID"**.
- **Spoken Rationale:** *"By correlating JA4 TLS fingerprints (`t13d1516h2_8daaf6`) and shared Wi-Fi BSSID beacons from laptop triage, TARKA exposes a syndicate spanning 3 distinct FIRs across Delhi and Gurugram."*

#### STEP 7: RECONSTRUCT TRANSACTION FLOWS & MULE TAINT DAG
- **Presenter Action:** Press `Alt+5` or click **"05 Taint DAG"**.
- **System Display:** 5-column money trail. Stolen ₹1.84L is traced from SBI victim account into HDFC mule, then split into 3 wallets within 209 seconds, terminating in Apex Electronics.
- **Presenter Action:** Switch doctrine dropdown from **"FIFO"** to **"Roscoe v. Winder (LIBR)"**.
- **System Display:** Dinic Min-Cut line isolates exactly ₹1,80,000 for freeze while protecting ₹2,50,000 clean merchant balance.
- **Spoken Rationale:** *"Notice the legal precision: Applying the Lowest Intermediate Balance Rule protects legitimate commercial payroll while freezing 100% of the recoverable illicit funds."*

#### STEP 8: OPEN THE TEMPORAL EVIDENCE LOOM
- **Presenter Action:** Press `Alt+8` or click **"08 Forensic Loom"**, select the **"Temporal Loom"** tab.
- **System Display:** 5 horizontal swimlanes (`BANKING`, `TELECOM`, `DEVICE`, `COMPLAINT`, `CAS_INGEST`).

#### STEP 9: EXPLAIN TIMESTAMP PRECISION & UNCERTAINTY
- **Presenter Action:** Hover over event `LOOM-EVT-003` (UPI Debit) and `LOOM-EVT-004` (CGNAT Handshake).
- **System Display:** Displays `sourceTimestamp: 09:24:39Z`, `receivedTimestamp: 09:26:10Z`, and `clockOffsetMs: 91,000ms`.
- **Spoken Rationale:** *"Device clocks drift. TARKA explicitly tracks both local source timestamps and NTP stratum-1 ingestion stamps, computing bounded uncertainty intervals ($\pm\Delta t$)."*

#### STEP 10: IDENTIFY THE PHYSICAL-TEMPORAL CONTRADICTION
- **Presenter Action:** Point to `LOOM-EVT-002` (SIM-swap event on Tower `DEL-SEC-4`).
- **System Display:** A red octagonal icon flashes: **"PHYSICAL CONTRADICTION: SIM-swap registered on Gurugram tower at 09:18:14, but Bureau of Immigration records suspect's flight departure at IGI Airport at 07:45:00."**
- **Spoken Rationale:** *"Here is a crucial finding: The suspect could not physically hold the phone in Gurugram while flying to Dubai. This establishes remote SIM-cloning or a separate handset operator."*

#### STEP 11: OPEN THE CLAIM DEPENDENCY LENS
- **Presenter Action:** Click the **"Claim Lens"** tab inside the Forensic Workstation.
- **System Display:** Left column lists evidence artifacts; right column lists investigative claims (`CLM-001` through `CLM-004`).

#### STEP 12: INSPECT SUPPORTING & CONTRADICTORY EVIDENCE
- **Presenter Action:** Review `CLM-003`: *"Physical presence of Primary Accused in NCR at time of transaction."*
- **System Display:** Baseline status: `CONTRADICTED` with formal solver tag `UNSAT`.

#### STEP 13: EXECUTE AN EVIDENCE-REMOVAL COUNTERFACTUAL (ABLATION)
- **Presenter Action:** Uncheck (ablate) `ART-CDR-002` (Gurugram Tower CDR) to simulate its suppression by the court.
- **System Display:** Live execution spinner (14ms); claims re-evaluate.

#### STEP 14: RECOMPUTE AFFECTED CLAIMS
- **System Display:** `CLM-002` (*"Transfer coincides with device handover"*) immediately shifts from `SUPPORTED` to `UNSUPPORTED`.
- **Spoken Rationale:** *"We just simulated what happens if the defense successfully challenges the tower CDR. Claim 2 collapses instantly because it lacked corroborating artifacts."*

#### STEP 15: EXPLAIN THE FORMAL VERIFICATION RESULT
- **Presenter Action:** Point to the Z3 solver status tag.
- **System Display:** Status shows `SAT (Re-constrained)`.
- **Spoken Rationale:** *"Microsoft Z3 SMT Solver computes the Minimal Unsatisfiable Core (MUS). This gives prosecutors mathematical certainty regarding which charges will survive judicial scrutiny."*

#### STEP 16: DEMONSTRATE PRIVACY-PRESERVING PSI OPERATION
- **Presenter Action:** Press `Alt+7` or click **"07 Privacy & ZKP"**.
- **System Display:** Tripartite Private Set Intersection (ECDH-PSI) panel.
- **Presenter Action:** Click **"Execute Tripartite PSI (SBI x HDFC x Axis)"**.
- **System Display:** After 420ms, the intersection returns 1 common mule account (`A/C 5010029419920`). Non-overlapping account numbers remain blinded and encrypted.
- **Spoken Rationale:** *"Three competing banks just identified the shared syndicate mule without disclosing a single non-fraudulent customer account number to each other or to the police."*

#### STEP 17: INDEPENDENTLY VERIFY THE ZERO-KNOWLEDGE PROOF
- **Presenter Action:** In the ZKP tab, click **"Verify Financial Threshold Proof"**.
- **System Display:** Proof verified: `STATUS: VALID`. Proves aggregate transfers exceeded ₹5,00,000 without revealing individual private transfer amounts or counterparty identities.

#### STEP 18: SHOW THE 4-VALIDATOR BFT EXPERIMENT
- **Presenter Action:** In the PBFT Consensus tab, click **"Inject Byzantine Node Fault (Node 3 Equivocation)"**.
- **System Display:** Node 3 sends conflicting state proposals. Nodes 0, 1, and 2 achieve $2f+1=3$ quorum, reject the malicious block, and commit the valid transaction block #104.
- **Spoken Rationale:** *"Even if one regional police node is compromised by malware or network partition, our 4-node PBFT consensus guarantees ledger integrity across state borders."*

#### STEP 19: INSPECT THE INVESTIGATION FLIGHT RECORDER
- **Presenter Action:** Return to `Alt+8` Workstation, click **"Flight Recorder"**.
- **System Display:** 6 hash-chained entries from Genesis (`00000000...`) to current block. Filter by `AI_ASSISTANT` to show that every AI recommendation is strictly tagged `PROPOSED_ONLY` and required `HUMAN_EXAMINER` sign-off.
- **Spoken Rationale:** *"Every action is recorded in an immutable SHA-256 hash chain. No 'black box' AI decisions—AI proposes, human decides."*

#### STEP 20: GENERATE THE INVESTIGATIVE REPORT & DOSSIER
- **Presenter Action:** Press `Alt+6` or click **"06 Court Dossier"**. Click **"Generate BSA §63(4) Dossier"**.
- **System Display:** The full printable dossier compiles with Exhibit A through Exhibit E, including 5 MHA Golden Hour dispatch notices (§94, §106, §107 BNSS).

#### STEP 21: INSPECT REPORT EVIDENCE REFERENCES & LIMITATIONS
- **Presenter Action:** Scroll to Exhibit E in the generated report.
- **System Display:** The report displays the digital signature hash of the examiner, CAS content hashes, and the explicit **Open Limitations Register**.
- **Spoken Rationale:** *"The dossier includes complete SHA-256 hash tables admissible under Section 63(4) of the Bharatiya Sakshya Adhiniyam, 2023. Our open limitations are honestly declared: External bank CBS feeds operate as high-fidelity synthetic fixtures pending production statutory MOUs."*

---

### DEMONSTRATION CONCLUSION & JURY HANDOVER
*"Thank you, Respected Jury. TARKA is ready for your questions and for hands-on exploration in Judge Mode."*
