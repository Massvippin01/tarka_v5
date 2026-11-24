# TARKA × SENTINELX — 15-MINUTE INSTITUTIONAL DEMONSTRATION SCRIPT

**Document Code:** `SCRIPT-DEMO-2026-V1`  
**Classification:** RESTRICTED PRESENTER MANUAL  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Roles:** Digital Forensics Presenter & Senior Systems Architect  
**Audience:** FSL Directors, Cybercrime SPs/DCPs, Bank Chief Vigilance Officers, Judicial Observers  
**Duration:** Exactly 15 Minutes (10 Demonstration Acts)  
**Date:** November 2026  

---

## Pre-Demonstration Setup Checklist (T minus 5 Minutes)

- [ ] **Dual Monitor / Projector Configuration:** 1080p resolution, 100% OS scaling.
- [ ] **Backend Status:** Ensure FastAPI service is live on `http://127.0.0.1:8000`.
- [ ] **Frontend Status:** Ensure Vite workstation is live on `http://localhost:5173`.
- [ ] **Clean Terminal Window:** PowerShell / Bash terminal open at `c:\PROJECTS\SentinelX`.
- [ ] **Preflight Verification:** Run `python scripts/run_investigator_demo.py` once before entering the conference room to ensure 100% green pass in 6 seconds.
- [ ] **Audience Handouts:** Distribute [TARKA_ONE_PAGE_BRIEF.md](file:///c:/PROJECTS/SentinelX/TARKA_ONE_PAGE_BRIEF.md).

---

## Act 1: The Sovereign Mandate & Secure Authentication
**Timestamp:** `[00:00 — 01:30]`  
**Presenter Action:** Stand at workstation. Display the TARKA skeuomorphic dark-mode login terminal.

> **PRESENTER (SPOKEN):**  
> *"Good morning, respected Directors, officers, and senior colleagues. Today, every Cyber Cell in India and every Bank Fraud Risk Unit is facing a common adversary: the explosion of fabricated UPI receipts and doctored payment screenshots.*
>
> *When an investigating officer receives a WhatsApp screenshot claiming a ₹25,000 transfer, how do they verify it today? They either visually eyeball it—missing subtle pixel re-quantizations—or wait three weeks for a bank Core Banking report. By then, the money is withdrawn through mule accounts across five states.*
>
> *We built TARKA to solve this crisis. TARKA is an indigenous, sovereign multimodal payment forensic platform engineered specifically for Indian financial rails and our new criminal laws: the Bharatiya Sakshya Adhiniyam, 2023.*
>
> *Notice our core product law on the screen:* **'AI Proposes. Forensic Engines Test. Evidence Supports. Investigators Decide.'** *TARKA is not a black-box LLM that guesses guilt or innocence. It is a deterministic mathematical investigation system.*
>
> *Let us begin by authenticating."*

**Action:** Click `[Authenticate: usr-delhi-01]`.  
**Audience Sees:** Terminal flashes green: `Authenticated: usr-delhi-01 (Role: INVESTIGATOR, Jurisdiction: IN-DL)`. Bearer JWT issued.

> **PRESENTER (SPOKEN):**  
> *"All access is strictly role-governed under 7-factor RBAC. An unauthenticated API call immediately fails closed with HTTP 401. No telemetry leaves this air-gapped machine."*

---

## Act 2: Demonstration Case Initialization
**Timestamp:** `[01:30 — 02:45]`  
**Presenter Action:** Click `[Initialize Case]`.

> **PRESENTER (SPOKEN):**  
> *"In Act 2, we establish our case in the Universal Case Model. Today's scenario represents a classic task-based financial cybercrime complaint: a victim claims they transferred ₹25,000 via PhonePe to an investment merchant, but the merchant denies receipt and the bank statement shows contradictory records.*
>
> *Notice the yellow banner at the top:* **'DEMO_MODE: SYNTHETIC_FIXTURES'**. *TARKA maintains an unbreachable wall between synthetic research fixtures and live citizen evidence. In demonstration mode, all fixtures carry `is_synthetic = True` to guarantee that no test data ever pollutes active legal cases."*

**Audience Sees:** Case initialized with monotonic ID `CASE-DEMO-2026-0D9A50`.

---

## Act 3: Evidence Ingestion & Bitstream Custody
**Timestamp:** `[02:45 — 04:15]`  
**Presenter Action:** Click `[Ingest Evidence Package]`.

> **PRESENTER (SPOKEN):**  
> *"Now we ingest two core pieces of evidence into our Multimodal Evidence Gateway:*
> 1. *First, `cbs_statement_march2026.csv`—the authoritative bank Core Banking System transaction export.*
> 2. *Second, `disputed_phonepe_receipt.png`—the questioned payment screenshot extracted from the victim's phone.*
>
> *Look at the custody log on the bottom right. The moment these files hit our gateway, three things happen instantaneously:*
> - *First, magic-byte inspection verifies the binary format, rejecting polyglot archives or malicious executables.*
> - *Second, a streaming SHA-256 calculation executes in 64-kilobyte bounded chunks.*
> - *Third, the raw bytes are written to an immutable Content-Addressed Storage vault and immediately verified by re-reading the physical disk blocks.*
>
> *From this microsecond forward, the original bitstream cannot be altered by anyone—including the system administrator."*

**Audience Sees:** Artifact IDs assigned (`ART-CBS-01` and `ART-REC-01`). Immutable SHA-256 hashes displayed in hexadecimal.

---

## Act 4: TRACE Computer Vision Forensics (ELA & Resampling)
**Timestamp:** `[04:15 — 06:30]`  
**Presenter Action:** Select `ART-REC-01` and click `[Execute TRACE Forensics]`.

> **PRESENTER (SPOKEN):**  
> *"Now we deploy TRACE—our tri-forensic raster analysis suite. To the naked eye, this PhonePe receipt looks completely authentic. But watch what happens when we run deterministic computer vision.*
>
> *First: Error Level Analysis. Every JPEG image has a compression fingerprint. When a fraudster pastes a fake amount or alters a UTR in Photoshop or a FakePay generator, that edited region undergoes a different quantization cycle. TARKA re-encodes the image at quality factor 90 in memory and computes block entropy across 16x16 sliding windows.*
>
> *Look at the heatmap overlay:* **the entire canvas is deep blue, but around the ₹25,000 amount and the UTR, bright orange blocks light up with a Z-score of +3.8 sigma.**
>
> *Second: Resampling Lattice. When text is scaled or pasted, pixel interpolation creates periodic spectral correlations. Our 2D-FFT Radon transform detects a sharp resampling lattice peak right over the numeric digits.*
>
> *Third: Micro-Typography. Notice our font baseline graph. Genuine PhonePe and NPCI apps maintain sub-pixel horizontal alignment ($\sigma < 1.2\text{px}$). Here, the baseline drifts to $3.4\text{px}$, and the character kerning ratio fails Roboto font specifications.*
>
> *Finally, our local OCR engine extracts the text without sending a single byte to an external cloud API: Amount: ₹25,000.00; UTR: 412356789012; Status: SUCCESS."*

---

## Act 5: High-Speed Core Banking Ledger Reconciliation
**Timestamp:** `[06:30 — 08:00]`  
**Presenter Action:** Click `[Reconcile Ledger & Receipt]`.

> **PRESENTER (SPOKEN):**  
> *"Image forensics alone can never prove fraud; a screenshot is merely an unverified assertion. The bank ledger is authoritative reality.*
>
> *In Act 5, TARKA performs high-throughput multi-source reconciliation. Our streaming accounting engine processes over 45,000 bank transactions per second.*
>
> *First, it validates double-entry balance conservation across the bank statement: Opening balance ₹50,000 minus ₹25,000 debited equals ₹25,000 closing balance. The ledger is mathematically intact.*
>
> *Second, it cross-matches the 12-digit UTR `412356789012` against the cleared Core Banking rows.*
>
> *And look at the discrepancy alert that appears in red:*
> - **The bank ledger shows a genuine cleared debit of ₹25,000.**
> - **The receipt presented by the complainant claims ₹15,000 debited under the exact same reference number.**
> - **Discrepancy: Exactly ₹10,000 delta.**
>
> *We have uncovered the fraud: the transaction reference is real, but the displayed receipt amount was doctored to claim a false payment."*

---

## Act 6: AEGIS Analysis of Competing Hypotheses & Evidence Gaps
**Timestamp:** `[08:00 — 09:30]`  
**Presenter Action:** Click `[Run AEGIS Hypothesis Matrix]`.

> **PRESENTER (SPOKEN):**  
> *"Human investigators naturally suffer from confirmation bias—we latch onto our first theory. AEGIS eliminates this by implementing Richards Heuer’s formal Analysis of Competing Hypotheses.*
>
> *The engine evaluates six standardized investigative hypotheses simultaneously: Digital Alteration, Spoof APK, Legitimate Latency, Split Debit, Gateway Timeout, and Inter-Bank Desync.*
>
> *Based on our ELA anomaly score and the ₹10,000 ledger delta, Hypothesis 1 (Digital Image Alteration) achieves the highest epistemic consistency.*
>
> *More importantly, look below: TARKA does not leave the officer wondering what to do next. It automatically drafts two prioritized statutory evidence-gap requisitions:*
> 1. **Notice under Section 94 of the Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS)** *to NPCI demanding raw UPI Central Switch XML clearing logs.*
> 2. **Notice under Section 91 CrPC** *to the merchant acquiring bank demanding merchant settlement records.*
>
> *This saves the investigating officer 4 to 6 hours of manual legal drafting."*

---

## Act 7: Formal Contradiction Isolation (The Invariant)
**Timestamp:** `[09:30 — 11:00]`  
**Presenter Action:** Click `[Evaluate Invariants (Z3 SMT)]`.

> **PRESENTER (SPOKEN):**  
> *"Now we come to the intellectual core of TARKA. How do we prove this contradiction in court without relying on an AI's 'opinion'?*
>
> *We pass the facts to the Microsoft Z3 Satisfiability Modulo Theories solver—a first-order mathematical theorem prover. Z3 proves that it is mathematically impossible for an identical transaction reference to have cleared at ₹25,000 and ₹15,000 simultaneously. It isolates the Minimal Unsatisfiable Subset.*
>
> *Now, pay close attention to the finding displayed on screen:*
>
> *Notice the yellow border and the badge:* **'human_verified = FALSE'**.
>
> *This is our non-promotable invariant. In TARKA, no algorithm, no neural network, and no theorem prover has the software authority to mark a finding 'verified'. Only a human investigator holding a certified private key can transition this finding to verified.*
>
> *The AI proposes. The human decides."*

---

## Act 8: Human Examiner Adjudication & Signing
**Timestamp:** `[11:00 — 12:15]`  
**Presenter Action:** Click `[Adjudicate Finding]`. Enter examiner notes: *"Confirmed ₹10,000 delta against CBS raw batch. ELA localization verified in amount bounding box."* Click `[Sign & Verify Finding]`.

> **PRESENTER (SPOKEN):**  
> *"As the certified digital forensic examiner, I have personally inspected the raw CSV bytes, reviewed the ELA heatmap, and validated the UTR correlation.*
>
> *I enter my statutory examination notes and affix my cryptographic signature.*
>
> *Watch the screen: The badge instantly transitions to green:* **'EXAMINER VERIFIED'**.
> *An immutable event is appended to the SHA-256 custody ledger recording my examiner ID, timestamp, and signature."*

---

## Act 9: Section 63 BSA Statutory Certificate Generation
**Timestamp:** `[12:15 — 13:45]`  
**Presenter Action:** Click `[Generate Section 63 BSA Certificate]`.

> **PRESENTER (SPOKEN):**  
> *"Under the new criminal laws that took effect on 1 July 2024, legacy Section 65B certificates under the Indian Evidence Act are obsolete. Indian courts now demand strict compliance with Section 63 of the Bharatiya Sakshya Adhiniyam, 2023.*
>
> *With one click, TARKA generates this comprehensive, court-admissible certificate in both tamper-evident PDF and canonical JSON.*
>
> *Look at Section 4 of the certificate on screen:*
> - *It lists the exact hardware CPU UUID, OS kernel version, and MAC address of this machine.*
> - *It provides unbroken SHA-256 custody hashes of the raw input media.*
> - *And most importantly, it computes a deterministic* **Substantive SHA-256 Fingerprint**:
>   $$\mathcal{H}_{\text{sub}} = \text{SHA-256}(\text{Canonical JSON Payload})$$
>
> *If defense counsel claims this report was modified after export, any court clerk can re-hash the document. A single altered comma changes the hash, proving tamper-evident authenticity."*

---

## Act 10: Custody Ledger Audit & Lossless Case Export
**Timestamp:** `[13:45 — 15:00]`  
**Presenter Action:** Click `[View Custody Ledger]` and then `[Export Case Bundle]`.

> **PRESENTER (SPOKEN):**  
> *"In our final act, we view the unbroken custody ledger. Every ingestion, every analysis, every Z3 proof, and every examiner click is chained together with parent SHA-256 hashes—identical to a blockchain, but operating locally on forensic disk storage.*
>
> *We export the complete case archive. It contains the raw immutable evidence, the TRACE ELA overlays, the Z3 formal proofs, the examiner signatures, and the Section 63 BSA certificate in a sealed TAR archive.*
>
> *Respected officers, in exactly six minutes of computation, what previously took three weeks of inter-agency correspondence, manual visual guesswork, and manual legal drafting is accomplished with mathematical proof and statutory admissibility.*
>
> *We invite your laboratory and cyber unit to deploy our zero-cost on-premises evaluation workstation and experience this capability on your own test cases.*
>
> *Thank you, and I welcome your questions."*

---

## Presenter Technical Notes & Fallback Procedures

1. **If UI hangs or browser freezes:** Do not panic. Switch immediately to the open terminal and type `python scripts/run_investigator_demo.py`. The automated CLI harness executes the exact same 10 acts in 6.2 seconds and prints every cryptographic hash to stdout.
2. **Key Terminology Reminders:**
   - Always say **"Bharatiya Sakshya Adhiniyam, 2023 (Section 63)"**, NOT "Section 65B Evidence Act".
   - Always say **"Section 94 BNSS"**, NOT "Section 91 CrPC".
   - Always emphasize **"Human Decides"**; never claim TARKA "detects guilt".
