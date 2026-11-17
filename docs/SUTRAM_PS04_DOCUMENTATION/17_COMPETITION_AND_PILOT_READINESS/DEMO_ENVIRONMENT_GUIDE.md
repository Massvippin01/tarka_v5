# SUTRAM 2026 PS04 — DEMONSTRATION ENVIRONMENT GUIDE
## STAGE 2: CANONICAL SYNTHETIC DEMONSTRATION ENVIRONMENT SPECIFICATION

**Document Identifier:** `TARKA-DEMO-ENV-2026-V1`  
**Target Environment:** Isolated Synthetic Benchmark & Demonstration Workspace  
**Case Identifier:** `CASE-2026-001` (*"Operation Triad Nexus"*)  
**Scenario Code:** `SCENARIO-TRIAD-001`  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Demonstration Standard

---

### 1. DEMONSTRATION ENVIRONMENT ISOLATION

In strict compliance with forensic integrity principles, the competition demonstration environment is hermetically isolated from production law enforcement data:
- **Synthetic Ground Truth:** Every citizen name, bank account number, phone number, IMEI, and IP address in `CASE-2026-001` was generated using deterministic synthetic generators matching Indian Ministry of Home Affairs (MHA) and Reserve Bank of India (RBI) schemas.
- **Data Protection Guarantee:** No live PII or confidential criminal records exist within the repository fixtures.
- **Idempotent Reset:** The demonstration environment can be completely purged and reset to its pristine baseline state in $< 2$ seconds.

---

### 2. THE CANONICAL CASE STRUCTURE: "OPERATION TRIAD NEXUS"

```
+---------------------------------------------------------------------------------------------------------+
|                                    CASE PROFILE: CASE-2026-001                                          |
+---------------------------------------------------------------------------------------------------------+
| FIR Number:        FIR #149/2026 (Cyber Crime PS North Delhi)                                           |
| Crime Typology:    Digital Arrest Extortion & Multi-Bank Money Mule Layering                            |
| Incident Date:     2026-09-22 09:15:00 IST                                                              |
| Reported Loss:     INR 1,84,000.00                                                                      |
| Invariant Target:  Finacle 10.x CBS Journal, Airtel CGNAT IPDR, NPCI UPI 2.0 XML                       |
| SLA Window:        Golden Hour SOP (< 120 Minutes Remaining for Provisional Attachment)                 |
+---------------------------------------------------------------------------------------------------------+
```

---

### 3. THE THREE SIMULATED INSTITUTIONS

1. **Law Enforcement & Judicial Infrastructure (CCTNS & ICJS):**
   - *CCTNS PS North Delhi:* Ingests FIR #149/2026 detailing an extortion call by actors impersonating CBI officers.
   - *ICJS Court Registry:* Returns prior court appearance and bail records for suspect Rahul Verma.
2. **Financial Banking Ecosystem (SBI, HDFC, Axis, NPCI):**
   - *SBI CBS (Finacle 10.x):* Records victim's initial ₹1,84,000 debit with UTR #626510149921.
   - *HDFC Bank (A/c 5010029419920):* Layer-1 mule account receiving the initial transfer.
   - *Axis Bank & Apex Electronics (ICICI):* Layer-2 fast split mules and retail merchant aggregator.
   - *NPCI Central Switch:* Provides raw UPI 2.0 XML with `<Device>` stanza and TLS fingerprint.
3. **Telecommunications Provider (Bharti Airtel Lawful Intercept Cell):**
   - *Dynamic CGNAT Pool:* Masks 9,996 subscribers behind public IPv4 `103.21.144.92:44000-44511`.
   - *Tower Sector Log:* Cell Tower `DL-TWR-891` (RADIUS session ID `RAD-NCR-99120`).

---

### 4. EMBEDDED FORENSIC CHALLENGES & KNOWN GROUND TRUTH

To demonstrate TARKA's superior reasoning capabilities over naive AI dashboards, `CASE-2026-001` incorporates four embedded ground-truth challenges:

#### Challenge A: Identity Ambiguity & Hard-Veto Vetting
- *The Ambiguity:* Suspect "Rahul Verma" in CCTNS matches suspect "Rahul Verma" in ICJS with a 92% fuzzy name match.
- *The Forensic Reality:* CCTNS suspect has PAN `ABCDE1234F`; ICJS record has PAN `WXYZ9876K`.
- *TARKA Resolution:* The Entity Resolution engine halts automated merging with a **Hard-Veto Conflict**, dropping merger confidence to $0.00$.

#### Challenge B: Spatiotemporal Contradiction
- *The Ambiguity:* Extortion call was placed through dynamic NAT IPDR on Airtel Tower `DL-TWR-891` in Gurugram at 09:18:14 UTC.
- *The Forensic Reality:* Suspect's official passport carries an immigration exit stamp at IGI Terminal 3 for departure to Dubai at 07:45:00 UTC.
- *TARKA Resolution:* The Temporal Evidence Loom highlights a red **Contradiction Alert**, proving the suspect's SIM was cloned or operated by a remote syndicate member.

#### Challenge C: Multi-Hop Transaction Path & Dinic Min-Cut Freeze
- *The Ambiguity:* Illicit funds are rapidly split across 3 digital wallets within 209 seconds, then pooled into Apex Electronics.
- *TARKA Resolution:* Taint DAG computes Dinic Min-Cut, identifying the minimal set of 2 bank accounts required to freeze ₹1,80,000 while leaving legitimate commercial transactions intact.

#### Challenge D: Legitimate Alternative Explanation (Roscoe v. Winder Rule)
- *The Ambiguity:* Apex Electronics received ₹1,80,000 in tainted funds into an account holding ₹4,30,000.
- *TARKA Resolution:* Applying the *Lowest Intermediate Balance Rule (LIBR)* under *Roscoe v. Winder*, TARKA isolates exactly ₹1,80,000 for judicial attachment under Section 106(1) BNSS, protecting ₹2,50,000 in clean working capital.

---

### 5. ONE-COMMAND STARTUP & RESET PROCEDURE

#### Startup Command (Single Terminal):
```powershell
Set-Location "c:\PROJECTS\tarka_v5"; .\scripts\start_demo.ps1
```

*Or via separate standard processes:*
1. **Backend:**
   ```powershell
   Set-Location "c:\PROJECTS\tarka_v5\backend"; $env:PYTHONPATH=".;backend"; python -m uvicorn app.main:app --host 127.0.0.1 --port 8080
   ```
2. **Frontend:**
   ```powershell
   Set-Location "c:\PROJECTS\tarka_v5\frontend"; npm run dev -- --host 127.0.0.1 --port 5173
   ```

#### One-Click Reset Procedure:
In the top-right header ribbon of TARKA, click **"Reset Baseline"** or press `Alt+R`. This resets all active mutations, clears temporary exclusions in the Claim Dependency Lens, and restores `CASE-2026-001` to pristine baseline state in $< 500\text{ms}$.
