# TARKA × SENTINELX — 49-SCENARIO FORENSIC TEST CASE CATALOGUE
## Authoritative Technical Specification, Ground Truth Manifests & Assertion Criteria

**Document Version:** 2.0  
**Status:** IMPLEMENTED, CATALOGUED & EXECUTED  
**Engine Implementation:** `backend/app/services/scenario_catalogue_service.py`  
**Ground-Truth Isolation Tier:** `data/validation_lab/ground_truth/`  

---

## 1. Overview & Classification Schema

The catalogue encompasses **49 operational forensic scenarios** designed to rigorously validate multimodal payment evidence processing across three specialized forensic domains:

1. **TRACE Scenarios (T01 – T25):** Image forensics (ELA, Radon resampling, copy-move detection, typography kerning), payment field OCR extraction, and multi-source banking reconciliation.
2. **AEGIS Scenarios (A01 – A12):** Epistemic investigative reasoning, entity disambiguation, Heuer's Analysis of Competing Hypotheses (ACH), statutory evidence gap ranking (BNSS 94 / CrPC 91), and non-attribution guarantees.
3. **PLATFORM Scenarios (P01 – P12):** Evidence gateway security, anti-malware, polyglot rejection, formula injection prevention, CAS immutability, fail-closed RBAC authentication, and worker crash recovery.

---

## 2. TRACE Scenario Catalogue (T01 – T25)

### T01: Genuine Unaltered Payment Screenshot
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Assert that genuine unaltered payment screenshots produce zero false tamper alerts and clean typography baselines.
- **Expected Behaviour:** Composite anomaly score $< 0.10$, `is_tampered == False`, confusion: `TN`.
- **Ground Truth Manifest:** `is_manipulated: false`, `expected_amount: 25000.0`, `expected_utr: "412356789012"`, `expected_status: "SUCCESS"`.
- **Failure Conditions:** False tamper alert (FP) or failure to extract amount/UTR.

### T02: Altered Transaction Amount
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Detect numerical amount edited in graphic manipulation software (e.g. Photoshop / Canva).
- **Expected Behaviour:** Composite anomaly score $> 0.10$, localized ELA hotspot in amount bounding box, confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`, `expected_amount: 50000.0`, `expected_utr: "412356789012"`.
- **Failure Conditions:** Missed alteration (FN) or failure to detect spliced amount.

### T03: Cropped Receipt (Missing Header/Footer)
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Verify that cropped receipt missing standard phone status bar or navigation footer processes visible fields without crash.
- **Expected Behaviour:** Extracts visible fields, reports aspect ratio notice, preserves `is_tampered == False`, confusion: `TN`.
- **Ground Truth Manifest:** `is_manipulated: false`, `expected_amount: 25000.0`.
- **Failure Conditions:** Engine crash or false tamper flag solely due to crop boundary.

### T04: Messaging-App Benign Compression (WhatsApp/Telegram)
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Ensure aggressive social media JPEG recompression ($Q=65$) does not trigger false positive tampering.
- **Expected Behaviour:** Canvas-wide ELA normalization compensates for uniform recompression; `is_tampered == False`, confusion: `TN`.
- **Ground Truth Manifest:** `is_manipulated: false`, `expected_amount: 25000.0`, `expected_utr: "412356789012"`.
- **Failure Conditions:** False positive tamper alert (FP) triggered by WhatsApp compression.

### T05: Blurred or Low-Quality Receipt
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Assess OCR and ELA performance on optical blur and motion degradation.
- **Expected Behaviour:** Reports explicit uncertainty intervals without hallucinating missing fields; confusion: `TN`.
- **Ground Truth Manifest:** `is_manipulated: false`.
- **Failure Conditions:** Confident false extraction without uncertainty warning.

### T06: Conflicting Transaction Status Tokens
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Detect semantic status contradiction (e.g. green success checkmark with "FAILED" banner).
- **Expected Behaviour:** Flags `CONFLICTING_STATUS_BANNER`, composite score $> 0.50$, confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`, `expected_status: "FAILED"`.
- **Failure Conditions:** Missed status contradiction.

### T07: Matching Screenshot and Bank Statement
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Verify that authentic receipt matching cleared bank statement completes cleanly with zero discrepancy.
- **Expected Behaviour:** Discrepancy delta $= ₹0.00$, double-entry balance conserved, `human_verified == False`, confusion: `TN`.
- **Ground Truth Manifest:** `is_manipulated: false`, `expected_amount: 25000.0`, `expected_utr: "412356789012"`, `expected_discrepancy_delta: 0.0`.
- **Failure Conditions:** False discrepancy alert or balance conservation error.

### T08: Conflicting Amounts (Receipt ₹15k vs CBS ₹25k)
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Detect exactly ₹10,000 delta under identical UTR reference between receipt and CBS export.
- **Expected Behaviour:** Isolates discrepancy delta $= ₹10000.00$, surfaces unresolved contradiction, confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`, `expected_discrepancy_delta: 10000.0`.
- **Failure Conditions:** Discrepancy delta not detected or incorrect magnitude.

### T09: Missing Transaction in Bank Statement
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Detect when receipt asserts cleared payment but UTR is completely absent from bank statement.
- **Expected Behaviour:** Flags `MISSING_FROM_CBS_LEDGER`, triggers statutory requisition recommendation.
- **Ground Truth Manifest:** `expected_reconciliation_verdict: "UNRECORDED"`.
- **Failure Conditions:** Silently assumes transaction cleared without match.

### T10: Duplicate Transaction in Ledger
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Detect duplicate cleared debit rows sharing identical UTR or reference number.
- **Expected Behaviour:** Flags `DUPLICATE_ENTRY` anomaly without double-counting economic loss.
- **Failure Conditions:** Failure to flag duplicate reference.

### T11: Auto-Reversal / Refund Cycle
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Verify that debit matched with corresponding auto-reversal credit resolves net flow to ₹0.00.
- **Expected Behaviour:** Identifies reversal pair within 48h window; marks net economic loss ₹0.00.
- **Failure Conditions:** Treats reversed transaction as unreversed financial loss.

### T12: Split Payment Sequence
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Reconcile single receipt amount across multiple smaller split debit rows (₹8k + ₹10k + ₹7k = ₹25k).
- **Expected Behaviour:** Evaluates $H_2$ (Split Transaction Sequence) as plausible competing explanation.
- **Failure Conditions:** Rejects split sequence as flat discrepancy.

### T13: Balance Conservation Failure in Statement
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Detect statement row tampering where $\text{Closing} \neq \text{Opening} + \text{Credits} - \text{Debits}$.
- **Expected Behaviour:** Flags `BALANCE_CONSERVATION_BROKEN`; halts downstream balance trust.
- **Failure Conditions:** Fails to detect mathematical balance violation.

### T14: Conflicting UTRs Between Formats
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Detect mismatch between receipt UTR and narration reference in Core Banking line.
- **Expected Behaviour:** Flags reference number conflict without forced matching.
- **Failure Conditions:** Matches transactions despite reference discrepancy.

### T15: Transaction vs Settlement Clock Skew
- **Engine:** `FULL_WORKFLOW` | **Category:** `TRACE`
- **Objective:** Handle legitimate settlement delays (e.g. payment at 23:59 on Friday settled Monday).
- **Expected Behaviour:** Tolerates clock domain shift within configured window without false tampering flag.
- **Failure Conditions:** Flags legitimate weekend settlement delay as fraud.

### T16: Currency and Decimal Normalization
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Normalize Indian rupee notation ("₹25,000.00", "Rs. 25000", "INR 25,000") into canonical float.
- **Expected Behaviour:** Extracts canonical float 25000.0 across all symbol variants.
- **Failure Conditions:** Fails to parse valid Indian currency notation.

### T17: Altered Narrative Text (Description Splice)
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Detect altered payment notes or description text using typography kerning analysis.
- **Expected Behaviour:** Detects baseline drift and stroke width inconsistency; confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`.
- **Failure Conditions:** Fails to detect spliced text box.

### T18: Replaced Recipient Name & VPA
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Detect replaced beneficiary name spliced onto genuine payment card.
- **Expected Behaviour:** ELA highlights recipient area; typography reveals font substitution; confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`.
- **Failure Conditions:** Missed recipient overlay.

### T19: Replaced Transaction Identifier (UTR)
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Detect replaced 12-digit UTR pasted from another receipt.
- **Expected Behaviour:** 2D-FFT Radon resampling detects interpolation lattice around UTR block; confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`.
- **Failure Conditions:** Fails to flag pasted reference number.

### T20: Composited Image Region (Multi-Layer Cut & Paste)
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Detect multi-region composite editing across amount, timestamp, and beneficiary.
- **Expected Behaviour:** Spatial ELA heatmap reveals multiple independent anomalous clusters; confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`.
- **Failure Conditions:** Flags only single region or misses compositing.

### T21: AI-Inpainted Field (Generative Fill)
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Detect generative AI fill / diffusion inpainting in payment receipt field.
- **Expected Behaviour:** High-frequency DCT anomaly detected; missing natural JPEG quantization lattice; confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`.
- **Failure Conditions:** Bypasses ELA and spectral decomposition.

### T22: Synthetic UI (FakePay APK Generation)
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Detect receipts produced entirely by mobile spoof generators ("FakePay").
- **Expected Behaviour:** Typography baseline regression detects non-standard Roboto font kerning; UTR missing in CBS; confusion: `TP`.
- **Ground Truth Manifest:** `is_manipulated: true`.
- **Failure Conditions:** Classified as authentic payment.

### T23: Benign Resizing and Recompression
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Confirm that uniform downscaling (e.g. 720p to 480p) does not trigger false positive tamper alert.
- **Expected Behaviour:** `is_tampered == False`; composite score remains below threshold; confusion: `TN`.
- **Ground Truth Manifest:** `is_manipulated: false`.
- **Failure Conditions:** False positive tamper alert on resized image.

### T24: Benign Cropping and Re-encoding
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Confirm that screenshot cropped by user to exclude phone status bar is not marked tampered.
- **Expected Behaviour:** `is_tampered == False`; crop boundary does not trigger splice alarm; confusion: `TN`.
- **Ground Truth Manifest:** `is_manipulated: false`.
- **Failure Conditions:** False positive on boundary crop.

### T25: Unusual but Genuine Visual Template
- **Engine:** `TRACE` | **Category:** `TRACE`
- **Objective:** Evaluate new or regional bank UI template (e.g. BHIM 2.0 festive theme).
- **Expected Behaviour:** Extracts fields correctly without flagging valid branding as tampering; confusion: `TN`.
- **Ground Truth Manifest:** `is_manipulated: false`.
- **Failure Conditions:** False positive on unfamiliar theme styling.

---

## 3. AEGIS Scenario Catalogue (A01 – A12)

| ID | Title | Objective | Expected Output / Invariant |
| :--- | :--- | :--- | :--- |
| **A01** | Repeated VPA with Disparate Names | Detect single VPA linked to multiple contradictory account holder names. | Flags identity collision without performing automatic merge. |
| **A02** | Similar but Distinct Phone Numbers | Ensure phone numbers differing by 1 digit are preserved as distinct. | Strict entity separation; zero automatic merge. |
| **A03** | Conflicting Recipient Identity | Isolate conflict between bank KYC name and app display name. | Preserves both names as conflicting assertions; flags contradiction. |
| **A04** | Repeated Beneficiary Rapid Succession | Track rapid transfers to single beneficiary across multiple cards. | Evaluates Account Takeover / Smurfing hypothesis. |
| **A05** | Multi-Account Transaction Path | Trace fund flow traversing 3 intermediate accounts in 30 minutes. | Reconstructs multi-hop lineage without declaring criminal guilt. |
| **A06** | Conflicting Evidence Clocks | Isolate kinematic impossibility between phone screenshot and ATM withdrawal. | Flags kinematic anomaly; records clock uncertainty interval. |
| **A07** | Missing Ownership Evidence | Formulate prioritized statutory gap when account holder identity is missing. | Generates Section 94 BNSS requisition draft for beneficiary KYC. |
| **A08** | Cross-Case Identifier Linkage | Surface shared beneficiary VPA across two independent cases safely. | Alerts investigator to cross-case link; enforces RBAC tenant boundary. |
| **A09** | ACH Heuer Hypotheses Matrix | Evaluate evidence against all Heuer hypotheses ($H_1$ to $H_6$). | Ranks hypotheses mathematically; does not declare certainty. |
| **A10** | Insufficient Evidence Determination | Assert that single low-res crop without corroboration returns INCONCLUSIVE. | Reports `status == INCONCLUSIVE` with explicit uncertainty rating. |
| **A11** | Contradictory New Evidence Intake | Handle arrival of bank official transcript refuting previously accepted receipt. | Invalidates prior hypothesis; preserves contradiction history. |
| **A12** | Unrelated Entities Sharing Attribute | Ensure individuals sharing common ISP IP address are not linked as conspirators. | Maintains entity separation; graph proximity does not imply conspiracy. |

---

## 4. PLATFORM Scenario Catalogue (P01 – P12)

| ID | Title | Objective | Expected Security Control |
| :--- | :--- | :--- | :--- |
| **P01** | Unsupported File Format Ingestion | Safely reject unsupported format (e.g. .mp3, .exe, .dmg) with diagnostic. | Rejects at gateway; returns HTTP 400; zero CAS write. |
| **P02** | Disguised Executable Binary | Detect and quarantine PE / ELF executable file disguised as .png. | Rejects via magic bytes; raises `IngestionSecurityError`. |
| **P03** | Corrupted PDF Statement | Handle truncated PDF without daemon panic or hanging worker thread. | Catches parsing exception; returns descriptive error. |
| **P04** | Oversized File Rejection | Enforce maximum file ingestion boundary (50 MB) before disk write. | Rejects file exceeding size quota; prevents DoS. |
| **P05** | Duplicate Upload Deduplication | Verify uploading identical bytes twice returns DUPLICATE_ACCEPTED. | CAS deduplicates; custody event records secondary ingestion. |
| **P06** | Cross-Case Evidence Isolation | Ensure evidence in Case A is completely inaccessible to Case B. | Returns HTTP 403 / AccessDenied; strict case boundary. |
| **P07** | Fail-Closed Unauthorized API | Confirm unauthenticated request fails closed with HTTP 401. | Fails closed with HTTP 401; zero data returned. |
| **P08** | Interrupted Worker Recovery | Verify crash during analysis recovers safely upon restart. | State file survives; recovers into stable state without lock. |
| **P09** | Duplicate Webhook Idempotency | Verify repeated delivery of identical payment webhook is idempotent. | Executes once; returns cached result on secondary delivery. |
| **P10** | SSE Reconnection & Event Replay | Verify client reconnecting to SSE stream replays missed historical events. | Replays events from durable event log; zero missed events. |
| **P11** | Concurrent Upload Race Guard | Assert simultaneous uploads of distinct files preserve discrete hashes. | Both files admitted with discrete hashes and correct CAS storage. |
| **P12** | Incomplete Section 63 BSA Safeguard | Ensure generating Section 63 BSA report flags UNVERIFIED warning banner. | Embeds unverified warning banner; does not claim certified truth. |
