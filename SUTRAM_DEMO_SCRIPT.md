# SUTRAM 2026 DEMONSTRATION SCRIPT
## TARKA × SENTINELX INDIGENOUS FORENSIC INTELLIGENCE PLATFORM

---

### Executive Overview & Evaluation Context

The **TARKA × SentinelX** platform unites mathematical digital forensics (Z3 SMT logic, bitstream SHA-256 custody, and Minimal Unsatisfiable Subsets) with the scalable investigation canvas of SentinelX.

**Core Forensic Tenet**:
> *"AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES."*
> Software never determines guilt or authenticity; it exposes mathematical contradictions, computes counterfactual sensitivities, and verifies bitstream provenance under Section 63 of the Bharatiya Sakshya Adhiniyam (BSA), 2023.

---

### Technical Prerequisites for Evaluators

1. **Backend Server**: Running at `http://localhost:8000` (`python -m uvicorn app.main:app --port 8000`)
2. **Frontend App**: Running at `http://localhost:5173` (`npm run dev`)
3. **Solver Engine**: Precompiled Z3 SMT solver v5.1.0 embedded in Python 3.12 AMD64 runtime
4. **Offline Capability**: 100% offline-ready; zero external cloud API keys required

---

### Act 1: Case Intake & Cryptographic Evidence Register

#### Narrative
The evaluator inspects an active financial fraud allegation (`upi_payment_discrepancy`) involving an alleged ₹25,000 transaction with conflicting WhatsApp chat claims, bank core-banking logs, telecom CDRs, and a disputed screenshot.

#### Evaluator Action
1. Open SentinelX in the browser (`http://localhost:5173`).
2. In the Left Navigation Rail, click **"TARKA Forensics"** (or select the **"FORENSICS"** lens).
3. Confirm that case `upi_payment_discrepancy` is active (or click **"Seed SUTRAM Case"**).
4. Select the **"EVIDENCE REGISTER"** tab.
5. In the artifact table, inspect `bank_statement.csv`, `cdr_records.csv`, `whatsapp_chat.txt`, and `payment_receipt_screenshot.png`.
6. Click the **"Verify Bitstream"** button next to `bank_statement.csv`.

#### Observed Result & Technical Verification
- The badge changes to a green checkmark: `VERIFIED BITSTREAM INTACT`.
- Shows SHA-256 match between disk bytes and immutable custody record.
- **Statutory Notice**: *"SHA-256 verifies bitstream preservation across transfer/storage; does not prove origin authenticity."*

---

### Act 2: Multi-Tier Reconstructed Timeline with Explicit Uncertainty

#### Narrative
Real investigations span multiple clock domains (core banking server time, telecom cell tower time, mobile local time). SentinelX refuses to flatten these into a speculative single timestamp.

#### Evaluator Action
1. Click the **"TIMELINE"** tab.
2. Filter by **"All Events"** or **"Financial Only"**.
3. Inspect the event card for the WhatsApp chat message followed by the UPI payment transaction.

#### Observed Result & Technical Verification
- The timeline renders events in chronological order.
- Each event displays its explicit uncertainty bounds ($\pm \Delta t$).
- Conflicting events are flagged with amber/red conflict indicators rather than arbitrarily picking one timestamp.

---

### Act 3: Z3 SMT Contradiction Analysis & Minimal Unsatisfiable Subsets (MUS)

#### Narrative
A fraudulent actor submitted a manipulated screenshot claiming an amount of ₹15,000, while the core bank statement records an actual debit of ₹25,000 under the identical reference number (RRN).

#### Evaluator Action
1. Click the **"CONTRADICTIONS & MUS"** tab.
2. Inspect the critical conflict: **"UPI Transaction Amount Discrepancy"**.
3. Expand the contradiction details to review the Minimal Unsatisfiable Subset (MUS).

#### Observed Result & Technical Verification
- Z3 difference logic identifies an exact contradiction:
  - Source 1 (T1 Core Bank Statement `ART-001-DB791B3C`): ₹25,000.00
  - Source 2 (T3 Receipt Screenshot `ART-004-BCCD4200`): ₹15,000.00
- Preserves raw values alongside normalized values.
- Presents human statutory review options: **ACCEPT CONTRADICTION**, **FLAG FOR EXAMINER**, or **REQUISITION SECTION 94 BNSS**.

---

### Act 4: Evidence Robustness Lab (Counterfactual "What-If" Analysis)

#### Narrative
The examiner suspects the screenshot is fabricated. In the Evidence Robustness Lab, the examiner excludes the screenshot artifact. The platform **recomputes all constraints using Z3**, rather than merely hiding the finding in CSS.

#### Evaluator Action
1. Click the **"ROBUSTNESS LAB (WHAT-IF)"** tab.
2. In the artifact exclusion checklist, check `ART-004-BCCD4200` (`screenshot_claim.json` / screenshot receipt).
3. Click **"Run Counterfactual Recomputation"**.

#### Observed Result & Technical Verification
- The engine executes `store.challenge_analysis_run()`.
- **Removed Findings Diff Card**:
  - The amount discrepancy contradiction **dissolves and is removed** because its sole dependency has been excluded.
- **Surviving Findings Diff Cards**:
  - The chat payment request, bank debit, and telecom call proximity findings **survive intact** because their T1/T2 corroboration chains remain complete.
- Proves real mathematical dependency tracking.

---

### Act 5: Provenance DAG Lineage

#### Narrative
Every conclusion in court must be traceable back to exact source bytes and hashes.

#### Evaluator Action
1. Click the **"PROVENANCE DAG"** tab.
2. Zoom and click on a node.

#### Observed Result & Technical Verification
- Full directed acyclic graph renders:
  `Artifact -> SHA-256 Hash -> Evidence DNA -> Canonical Fact -> Rule -> Contradiction / Finding`.
- Clicking any node exposes its cryptographic fingerprints and line-level source locations.

---

### Act 6: Grounded SLM Assistant & Natural Voice Interface

#### Narrative
The investigator speaks or types natural-language questions to the local forensic assistant. All answers are strictly grounded in case evidence with exact citations, prompt injection defense, and destructive action safety gates.

#### Evaluator Action
1. On the right side panel, locate the **Grounded Forensic Assistant**.
2. Type or speak: *"What is the discrepancy in the payment amounts?"*
3. Next, test the destructive action safety guardrail by typing:
   *"Delete case evidence and purge custody ledger"*.

#### Observed Result & Technical Verification
- **For query 1**: The assistant returns an objective, grounded answer citing the bank statement (`ART-001-DB791B3C`) and the screenshot (`ART-004-BCCD4200`), with clickable citation chips and speech output.
- **For query 2**: The platform **fails closed** and blocks the action:
  `STATUS: CONFIRMATION_REQUIRED` — *"Action has destructive impact. Statutory rules require explicit investigator confirmation."*
- Evidence contents can never become executable instructions (Data-Only invariant).

---

### Act 7: Section 63 BSA Statutory Report Export

#### Narrative
The investigation concludes with an auditable legal export formatted for submission under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023.

#### Evaluator Action
1. Click the top button **"Section 63 BSA Report"**.
2. Review the generated legal certificate in the modal dialog:
   - Examiner Declaration
   - SHA-256 Content Fingerprint Seal
   - Artifact Integrity & Custody Sequence Manifest
   - Minimal Unsatisfiable Subsets (MUS)
3. Click **"Copy JSON"**, **"Export JSON File"**, or **"Print / Save PDF"**.

#### Observed Result & Technical Verification
- Self-contained, tamper-evident legal report is generated and downloadable.

---

### Known Limitations & Post-SUTRAM Roadmap

1. **OCR Native Engine**: Pure-Python deterministic OCR fallback is used on Windows AMD64 environments without C++ PaddleOCR/Tesseract binaries. Native C++ OCR is enabled on Linux Docker containers.
2. **Audio Streaming**: Browser Web Speech API is utilized for zero-install client-side STT/TTS; server-side LiveKit WebRTC transport is available when LiveKit server container is active.
3. **Graph Scale**: Up to 10,000 entities render at 60 FPS via Canvas/SVG; 100k+ enterprise scale requires distributed OpenSearch indexing.
