# SUTRAM 2026 PS04 — JUDGE EXPLORATION GUIDE
## STAGE 4: SELF-GUIDED INTERACTIVE EVALUATION & SAFE EXPLORATION HANDBOOK

**Document Identifier:** `TARKA-JUDGE-GUIDE-2026-V1`  
**Target Audience:** SUTRAM 2026 PS04 Technical Evaluators & Grand Jury  
**Demonstration URL:** `http://127.0.0.1:5173`  
**Prepared Sandbox:** `CASE-2026-001` (*"Operation Triad Nexus"*)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Judge Evaluation Manual

---

### 1. QUICK-START GUIDE (EVALUATION IN 3 STEPS)

Welcome, Distinguished Evaluator. TARKA is designed to be explored directly. You do not need command-line access or specialized training to test the system.

1. **Access the Application:** Open Google Chrome or any modern browser and navigate to `http://127.0.0.1:5173`.
2. **Keyboard Navigation:** Use the numbered chord shortcuts to jump between investigative stages:
   - `Alt+0` $\rightarrow$ Command Hub & Multi-Case Telemetry
   - `Alt+1` $\rightarrow$ Evidence Intake & Ledger Falsification Gate
   - `Alt+2` $\rightarrow$ Entity Resolution & Hard-Veto Vetting
   - `Alt+3` $\rightarrow$ CGNAT 340-to-1 Subscriber Attribution
   - `Alt+4` $\rightarrow$ Fraud Network Syndicate Graph
   - `Alt+5` $\rightarrow$ Transaction Trail & Dinic Min-Cut Freeze DAG
   - `Alt+6` $\rightarrow$ BSA §63(4) Court-Ready Dossier
   - `Alt+7` $\rightarrow$ Privacy, Cryptography & BFT Consensus Hub
   - `Alt+8` $\rightarrow$ Forensic Workstation (Temporal Loom, SMT Claim Lens, Flight Recorder)
   - `Alt+B` $\rightarrow$ Benchmark & Public Dataset Lab
3. **Reset to Baseline Anytime:** If you want to undo any test mutations or ablations, click **"Reset Baseline"** in the top-right header or press `Alt+R`.

---

### 2. CORE CASE GLOSSARY FOR EVALUATORS

| Term / Abbreviation | Meaning in TARKA Forensic Context |
| :--- | :--- |
| **BNSS / BSA** | *Bharatiya Nagarik Suraksha Sanhita, 2023* (Procedural code) and *Bharatiya Sakshya Adhiniyam, 2023* (Indian Evidence Act replacement). |
| **Section 63(4) BSA** | Statutory electronic record certificate proving custody, hash integrity, and computer operating state. |
| **CAS (Content-Addressable)**| Storage engine where the SHA-256 byte hash forms the immutable storage address of the file. |
| **Falsification Gate** | Security mechanism that halts downstream analytics if an evidence bitstream is altered or corrupted. |
| **Hard-Veto** | Rule preventing fuzzy AI merges if definitive statutory KYC tokens (PAN, Aadhaar hash) conflict. |
| **CGNAT (Carrier-Grade NAT)** | Telco architecture masking thousands of mobile devices behind a single public IPv4 address. |
| **LIBR (Roscoe v. Winder)** | *Lowest Intermediate Balance Rule*; equitable banking doctrine protecting clean operational capital in commingled merchant accounts. |
| **SMT Ablation** | Removing an evidence artifact to formally test whether a legal claim survives using Microsoft Z3. |
| **PBFT** | *Practical Byzantine Fault Tolerance*; consensus algorithm surviving $f$ malicious or crashed nodes out of $3f+1$ total nodes. |
| **ECDH-PSI** | *Private Set Intersection*; discovering common suspect accounts between banks with zero leakage of innocent client data. |

---

### 3. SAFE ACTIONS TO TEST DURING EXPLORATION

You are invited to execute any of the following interactive experiments:

#### Experiment 1: Test Evidence Tampering & Intake Lock
- Navigate to `Alt+1` (Evidence Intake).
- In the top mutator ribbon, click **"Simulate Tamper Row #14"**.
- *Expected Observation:* Downstream pipeline tabs lock with a red **GATE HALTED** banner. The mutated row turns red, showing a broken balance invariant.
- Click **"Reset All"** to restore.

#### Experiment 2: Test Interactive Counterfactual SMT Reasoning
- Navigate to `Alt+8` (Forensic Workstation) and select the **"Claim Lens"** tab.
- Find `ART-CDR-002` (Gurugram Tower CDR) and click the checkbox to uncheck/ablate it.
- *Expected Observation:* Claim `CLM-002` shifts from `SUPPORTED` to `UNSUPPORTED`. The Z3 solver status re-evaluates in $< 20\text{ms}$.

#### Experiment 3: Test Multi-Accounting Doctrine Switching
- Navigate to `Alt+5` (Taint DAG).
- Click the **"Doctrine"** dropdown and switch between `FIFO`, `LIFO`, and `Roscoe v. Winder (LIBR)`.
- *Expected Observation:* The Dinic Min-Cut freeze boundary recalculates dynamically, illustrating how different legal doctrines impact merchant lien amounts.

#### Experiment 4: Test Byzantine Node Equivocation
- Navigate to `Alt+7` (Privacy & ZKP) and select the **"PBFT Consensus"** tab.
- Click **"Inject Byzantine Node Fault (Node 3 Equivocation)"**.
- *Expected Observation:* Nodes 0, 1, and 2 reach $2f+1$ quorum, reject the malicious transaction, and commit the valid block #104.

---

### 4. RESTRICTED & DISABLED ACTIONS (JUDGE SANDBOX INTEGRITY)

To protect the evaluation sandbox from accidental corruption during jury review:
- **Destructive Deletion:** Physical deletion of underlying CAS storage chunks is disabled.
- **Production API Reconfiguration:** Modifying production database connection strings is disabled in UI.
- **Unauthenticated External Pings:** The UI cannot initiate external network webhooks without administrative credentials.

---

### 5. TROUBLESHOOTING & RESET

- **If the display appears out of sync:** Press `Alt+R` or click **"Reset Baseline"** in the top ribbon.
- **If sidebar is collapsed:** Press `Ctrl+B` to expand/collapse the sidebar.
- **If presentation mode is active:** Press `F` to exit fullscreen presentation mode.
- **If a tab appears empty:** Ensure that `CASE-2026-001` is selected in `Alt+0`.
