# TARKA | SKEUOMORPHIC FORENSIC COMMAND PLATFORM DEMO GUIDE

**Target Audience:** Academic Mentors, Hackathon Judges, Forensic Investigators, Cyber Police IOs  
**Demonstration Scenario:** Live End-to-End Synthetic Cyber Fraud Investigation (`CASE-2026-001` - Sunil Kumar)  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.

---

## 1. Quick Verification & URLs

Ensure both services are running locally:
- **Frontend Workstation:** `http://127.0.0.1:5173`
- **Backend Forensic Engine:** `http://127.0.0.1:8080`

### Fresh Startup Commands (if needed)
Terminal 1 (Backend):
```powershell
Set-Location C:\PROJECTS\tarka_v5_clean_verify
$env:PYTHONPATH="backend;backend/tests_tarka"
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8080
```
Terminal 2 (Frontend):
```powershell
Set-Location C:\PROJECTS\tarka_v5_clean_verify\frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

---

## 2. Master 15-Act Demonstration Walkthrough

```
Act 1: TARKA Home Page (Officer Context & Jurisdiction Status)
   │
   ▼
Act 2: Active Case Selection (CASE-2026-001 Sunil Kumar)
   │
   ▼
Act 3: Secure Evidence Intake & Bitstream Hashing (SHA-256)
   │
   ▼
Act 4: Financial Ledger Audit & Double-Entry Balance Continuity
   │
   ▼
Act 5: Controlled Falsification Demonstration (Row #14 Discrepancy Toggle)
   │
   ▼
Act 6: NPCI UPI RRN Analysis & Julian Day Gateway Decompilation
   │
   ▼
Act 7: People & Accounts Entity Resolution & Hard-Veto Shield
   │
   ▼
Act 8: Multi-Hop Money Trail & LIBR Proportional Lien Calculation
   │
   ▼
Act 9: Fraud Syndicate Network Graph & TTL ≤ 63s Rapid Transit Hotspots
   │
   ▼
Act 10: Device & SIM Telecom CGNAT Ephemeral Source Port Funnel
   │
   ▼
Act 11: Ask TARKA Universal Assistant (Context-Aware Grounded Copilot)
   │
   ▼
Act 12: Multilingual Speech Interrogation in Tamil / Hindi
   │
   ▼
Act 13: Full-Duplex Barge-In Interrupt & Spoken Citations
   │
   ▼
Act 14: Benchmark Lab Throughput Stress Testing (10,000 tx/sec)
   │
   ▼
Act 15: Section 63 BSA Judicial Electronic Evidence Certificate Export
```

---

### Act 1: The New TARKA Home Page
- **Navigate to:** `http://127.0.0.1:5173` (loads `/?view=home` by default).
- **Highlight:**
  - *Warm Tactile Skeuomorphic Aesthetic:* Warm ivory surfaces (`#FFFDF8`), structural graphite rails (`#292522`), and rich brown switch panels.
  - *Officer Context:* Authenticated session for **Insp. Rajeshwar Rao**, assigned to **Noida Cyber Crime PS**, operating under **BSA §63**.
  - *Top 6 KPIs:* Active Cases (4), Total Exposure (₹1.84 Cr), Shielded/Frozen Capital (₹74.2L / 40.3%), Admitted Evidence (38), Pending Review (12), Verified Gates (14/14).
- **Talking Point:** *"TARKA opens on a comprehensive jurisdictional command post. An investigating officer immediately sees incoming golden-hour priorities, shielded capital, and pending review tasks."*

---

### Act 2: Continue Active Investigation
- **Action:** On the Home Page, locate **CASE-2026-001 (Sunil Kumar)** and click **"Continue Investigation"**.
- **What Happens:** The application switches to Case 001 and navigates to Stage 1 (**Evidence & Ledger**). The left rail reflects the active stage with burnt orange highlight bars and solid emerald checkmarks.
- **Talking Point:** *"Every case in TARKA is backed by an immutable cryptographic dossier. We are inspecting an extortion case where a retired civil servant was coerced into transferring ₹85,00,000."*

---

### Act 3: Secure Evidence Intake & SHA-256 Hashing
- **Action:** Click **"+ Intake Evidence"** on the top action bar.
- **Highlight:**
  - The drag-and-drop ingestion chamber.
  - Immediate client-side SHA-256 calculation before network transmission.
  - Required chain of custody metadata (Officer ID, Seizure Order, Seizure Location).
- **Talking Point:** *"Evidence is never blindly uploaded. It is hashed immediately at acquisition to guarantee bitstream integrity under Section 63 of Bharatiya Sakshya Adhiniyam."*

---

### Act 4: Financial Ledger & Double-Entry Conservation
- **Navigate to:** **Evidence & Ledger** (`/?view=evidence`).
- **Highlight:**
  - The Finacle Core Banking Statement rendered inside a recessed skeuomorphic inset (`.tarka-inset`).
  - Mathematical balance continuity: $\text{Balance}_n = \text{Balance}_{n-1} + \text{Credit}_n - \text{Debit}_n$.
  - All rows show green "VERIFIED" indicators.

---

### Act 5: Controlled Falsification Demonstration (Row #14 Discrepancy)
- **Action:** Click the **"Simulate Row #14 Tampering"** switch.
- **Watch the Screen:**
  - Row #14 immediately turns high-contrast crimson (`#B6423B`).
  - Discrepancy Alert appears: `₹2,00,000 Balance Mismatch Detected`.
  - Integrity Gate I1 flips to `FAILED`.
- **Toggle Off:** Toggle the switch back to verify the ledger returns to verified state.
- **Talking Point:** *"If a suspect, corrupted bank employee, or intermediary alters even one digit in a bank statement, TARKA's mathematical invariant engine catches it instantly. Fabricated evidence cannot bypass Gate I1."*

---

### Act 6: NPCI UPI RRN Deconstruction
- **Action:** Click the **RRN Analysis** tab inside Evidence Ledger.
- **Highlight:**
  - Select transaction RRN `602811492015`.
  - Decompilation: `6` = Year 2026, `028` = Julian Day 28 (Jan 28), `11` = Gateway Issuer Bank Code (HDFC), `492015` = Sequence Token.
- **Talking Point:** *"Forged screenshots often alter the display date. Because NPCI UPI RRNs embed the true central switch Julian Day, TARKA proves backdated transactions with mathematical certainty."*

---

### Act 7: People & Accounts Entity Resolution & Hard-Veto Shield
- **Navigate to:** **People & Accounts** (`/?view=people`).
- **Highlight:**
  - The suspect cluster for *Ramesh Patel* showing 4 linked accounts across ICICI, Canara, and Yes Bank.
  - Point out the **Hard-Veto Shield**: Explain that even when two suspects share a name and phone prefix, if their statutory PAN or Aadhaar hashes conflict, TARKA strictly blocks automated mergers.
- **Talking Point:** *"Machine learning models often hallucinate and merge innocent people with criminals. TARKA enforces a Hard-Veto: AI proposes potential links, but verified legal identifiers prevent false-positive merges. Human decides."*

---

### Act 8: Money Trail & LIBR Proportional Lien Calculation
- **Navigate to:** **Money Trail** (`/?view=money`).
- **Highlight:**
  - Proportioned Sankey diagram showing ₹85,00,000 flowing from victim Sunil Kumar through Layer-1 to Layer-4 mule accounts.
  - The **Lowest Intermediate Balance Rule (LIBR)** panel calculating Sunil Kumar's exact recoverable claim: **₹31,45,000**.
- **Talking Point:** *"When mule accounts mix stolen funds from multiple victims, courts require equitable division. Under BNSS §106/§107, TARKA computes the exact LIBR percentage to include in Magistrate attachment orders."*

---

### Act 9: Fraud Syndicate Network Graph & Rapid Transit Hotspots
- **Navigate to:** **Fraud Network** (`/?view=network`).
- **Highlight:**
  - Force-directed graph with auto-scaling and collision avoidance.
  - Point out **Node M-04**: Pulsing orange indicator showing **Transit TTL = 41 seconds**.
- **Talking Point:** *"Human account holders do not transfer funds in 41 seconds. A transit TTL under 63 seconds is diagnostic proof of automated mule bot infrastructure operating via compromised banking APIs."*

---

### Act 10: Device & SIM Telecom CGNAT Port Funnel
- **Navigate to:** **Device & SIM** (`/?view=device`).
- **Highlight:**
  - The CGNAT Attribution Funnel: Resolves Public IP `103.211.54.12` + Source Port `54218` at microsecond timestamp `14:02:11.849 IST` to subscriber IMSI `404450192831201` and physical IMEI `864201048821901`.
- **Talking Point:** *"Over 90% of Indian mobile subscribers share carrier-grade NAT public IPs. Identifying a public IP alone is useless in court. TARKA's CGNAT funnel attributes the ephemeral source port to the physical handset."*

---

### Act 11: Ask TARKA Universal Assistant (Grounded Copilot)
- **Action:** Press `A` on the keyboard or click **"Ask TARKA"** in the topbar.
- **Highlight:**
  - The 540px slide-over drawer opens.
  - It shows active context: `CASE-2026-001 · View: EVIDENCE`.
  - Contextual suggested questions are tailored to evidence analysis.
  - Click the suggested prompt: *"Explain the ₹25,000 vs ₹15,000 discrepancy..."*
  - Review the response: Shows Direct Answer, Observed Facts, Contradictions, and clickable citation pills to `ART-002` and `ART-004`.
- **Talking Point:** *"Every single assertion cites an immutable SHA-256 hash. Hallucinations are barred. If evidence is contradictory, the assistant explicitly flags it."*

---

### Act 12: Multilingual Speech Interrogation in Tamil / Hindi
- **Action:** Click the language dropdown and select **தமிழ் (Tamil)** or **हिन्दी (Hindi)**.
- **Result:** The assistant immediately explains the case in fluent regional terminology, correctly pronouncing technical terms like *Finacle ledger*, *RRN*, and *BSA §63*.
- **Talking Point:** *"India's cyber police forces speak 22 official languages. TARKA provides native regional language comprehension without losing technical precision."*

---

### Act 13: Human-Grade Multilingual Offline Voice Interrogation Station
- **Action:** Press `V` on the keyboard or click the **Microphone** icon in the header.
- **Highlight:**
  - The elevated skeuomorphic Voice Interrogation Station opens in a high-contrast warm ivory/charcoal modal.
  - Notice the **"100% Offline Local"** green indicator badge in the top bezel.
  - The central canvas displays a **real-time 28-bar FFT frequency waveform** driven directly by Web Audio API `AudioContext.createAnalyser()`.
  - Point out the **Speech Provider Switcher**: Shows `Local Neural Engine (100% Offline)`, `AI4Bharat Sovereign Enclave`, `Sarvam AI Bulbul (Cloud Benchmark)`, and `Browser Web Speech API`.
  - Point out the **Speaker Persona Selector**: Select `Insp. Rajeshwar Rao (Command Persona)`.
  - Click **"Start Interrogation"** and speak into your microphone:
    *"Explain the transaction discrepancy between Finacle CBS and WhatsApp receipt"*
  - **Observe the Spoken Response:**
    - The assistant speaks with natural, human-grade prosody and intonation.
    - Currency and legal terms are pronounced flawlessly: *"eighty-five lakh rupees"*, *"Section 63 Bharatiya Sakshya Adhiniyam"*, *"R-R-N six zero two eight..."*.
    - The response displays verified citations: `SHA256: 0fb4e2b0...` and `BSA §63 Verified`.
  - **Full-Duplex Barge-In Demonstration:**
    - While the assistant is speaking, start talking into your microphone or click **"Interrupt (Barge-In)"**.
    - The audio playback halts instantly (<15ms), the queue is cancelled, and the station transitions back to listening.
  - **Local Model Management & Verification:**
    - Click the **"Models"** tab in the station header.
    - Show the installed `faster-whisper-tiny-indic` (75.5 MB) and `tarka-acoustic-neural-tts` models.
    - Click **"Verify Model Integrity"**: Validates the SHA-256 bitstream hash (`dcb76c65...`) live on-device.
  - **Sarvam Benchmark Comparative Audit:**
    - Click the **"Benchmark"** tab.
    - Walk through the side-by-side comparison proving that the Fully Local Offline Mode is **4.63x faster** (170ms vs 790ms round-trip) and satisfies statutory Section 63 BSA air-gapped non-egress mandates.
- **Talking Point:** *"Police interrogation stations in high-security enclaves cannot transmit confidential victim statements or wiretap audio to public cloud APIs. TARKA's voice station operates 100% offline with broadcast-quality 22kHz neural synthesis, sub-170ms turnaround, and full-duplex conversational barge-in."*

---

### Act 14: Benchmark Lab Stress Calibration (10,000 tx/sec)
- **Navigate to:** **Benchmark Lab** (`/?view=lab`).
- **Action:** Click **"Run 10,000 tx/sec Calibration"**.
- **Highlight:**
  - Median latency (p50): **1.2ms**, 99th percentile (p99): **4.8ms**.
  - Gate I1 to I4 failures: **0**.
- **Talking Point:** *"TARKA is engineered for nation-scale deployment. Even at 10,000 transactions per second, every cryptographic gate executes deterministically in under 5 milliseconds."*

---

### Act 15: Section 63 BSA Judicial Certificate Export
- **Navigate to:** **Actions & Report** (`/?view=actions`).
- **Action:** Click **"Generate Section 63 BSA Certificate"**.
- **Highlight:**
  - The judicial certificate opens displaying exact SHA-256 hashes of all 18 artifacts, system calibration statements, operating system integrity stamps, and custodial sign-offs.
  - Click **"Download Certified Legal Package"**.
- **Closing Statement:** *"Technical forensics are useless if thrown out of court. TARKA automatically generates the exact statutory certificate required under Section 63 of Bharatiya Sakshya Adhiniyam, ensuring every cyber fraud case stands unshakeable before the Magistrate."*

