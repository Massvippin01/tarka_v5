# TARKA-TXBENCH v0.3: DATA PROVENANCE, PRIVACY & SHORTFALL AUDIT

**Classification:** AUTHORITATIVE DATA PROVENANCE REGISTER  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Governing Statutory Standard:** Digital Personal Data Protection Act (DPDPA), 2023 & Section 63 BSA, 2023  
**Date:** 2026-11-24  
**Audit Status:** EPISTEMIC SHORTFALL DISCLOSED & VERIFIED  

---

## 1. Statutory Governance & Acquisition Framework

In strict compliance with SentinelX Constitution Rule 1 (*Repository Truth*), Rule 4 (*Evidence Integrity*), and Rule 7 (*Governance*), all evidence evaluated within TARKA must possess verifiable legal custody, lawful authority, and strict privacy protection.

### 1.1 Legal Frameworks Applied
1. **Digital Personal Data Protection Act (DPDPA), 2023 (Act No. 22 of 2023):**
   - *Section 4 & 5 (Lawful Purpose & Notice):* Evidence processed strictly for technical forensic evaluation, algorithmic bias auditing, and fraud defense calibration.
   - *Section 6 (Consent & Institutional Authority):* Collected under informed consent from study participants or through institutional Data Transfer Agreements (DTAs) with banking/forensic partners.
   - *Section 8 (Data Fiduciary Obligations):* Technical measures deployed to prevent personal data breach, ensure storage limitation, and delete data upon completion of verification.
2. **Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023:**
   - *Section 94 (Summons to produce document or thing):* Framework governing statutory acquisition of electronic records by authorized investigators.
3. **Bharatiya Sakshya Adhiniyam (BSA), 2023:**
   - *Section 63(4):* Preservation of electronic record hash integrity from the exact instant of acquisition.

---

## 2. Privacy Minimisation & Redaction Pipeline

Before any real-world payment evidence is admitted into the evaluation sandbox:
1. **Identifier Masking:** Customer Primary Account Numbers (PANs), Aadhaar numbers, and physical addresses are scrubbed or masked (e.g., `XXXX-XXXX-1234`).
2. **Data-Only Treatment:** Evidence files are treated exclusively as `DATA_ONLY` (Rule 4). Embedded metadata or EXIF structures cannot execute active commands.
3. **Zero External Egress:** Raw evidence bytes never leave the local Content-Addressed Storage (CAS). No third-party LLM APIs, cloud vision services, or unauthorized telemetry are invoked.

---

## 3. Truthful Repository Inventory & Epistemic Shortfall Declaration

> [!IMPORTANT]
> **CONSTITUTIONAL SHORTFALL DISCLOSURE:**  
> The Phase 12B specification mandates: *"If 50 independent samples cannot be acquired, report the shortfall. Do not substitute synthetic samples and call the dataset real-world holdout."*  
> We hereby certify the exact repository inventory and formally declare the external real-world acquisition shortfall.

### 3.1 Repository Evidence Inventory

| Category | Location | Quantity | Description / Provenance |
| :--- | :--- | :--- | :--- |
| **Controlled Calibration Scenarios (v0.2.0)** | `data/txbench_v02/images/` | 25 | Programmatically generated controlled test scenarios representing PhonePe, GPay, Paytm, BHIM, Amazon Pay, CRED with known ground-truth anomalies. |
| **Authorized User Contributed Media** | Brain Artifact Directory | 3 | Real-world payment receipt captures uploaded for interactive verification (`media_1794840860217_e1ee28a3.jpg`, `media_1794840860218_7dc5eedd.jpg`, `media_1794840860217_e3fd6ebb.jpg`). |
| **External Consented Live Production Receipts** | External Banking Partners | 0 | Pending formal execution of external multi-institution Data Transfer Agreements (DTAs). |

### 3.2 Formal Shortfall Declaration
- **Target External Real-World Receipts:** `50`
- **Currently Available in Local Repository:** `3` authorized live uploads + `25` controlled calibration samples.
- **Net External Real-World Shortfall:** **47 samples**.
- **Adherence to Epistemic Integrity:**  
  In compliance with SentinelX Constitution Rule 1 (*Never fabricate implementation, test, integration, deployment, or production status*), **we explicitly refuse to fabricate 47 synthetic payment receipts and mislabel them as real-world consented samples**. 

The evaluation conducted in Phase 12B evaluates the available controlled holdout cohort under strict blinding, while documenting that generalisation across the broader 50-sample population remains pending completion of institutional partner onboarding.

---

## 4. Cryptographic Custody Seal of Candidate Holdout Set

All 25 candidate holdout scenarios evaluated under the blinded protocol are cataloged below with immutable SHA-256 digests:

```
[SEAL-TXB03-01]  8354c4ff0bb5ee988cf5268aa3ef1c099710f277ca97e7fbe224a0d922bb8f46  phonepe_pixel_genuine.png
[SEAL-TXB03-02]  59942a63261623832c3f80879be50e7b75f284f18b32e01dfcf46a6f4460f78a  gpay_samsung_genuine.png
[SEAL-TXB03-03]  6fcb665dfc1e550e68e42f7c00683050c99a6cf7fe86d49cb005e810a9a380e2  paytm_oneplus_genuine.png
[SEAL-TXB03-04]  73a11b6da5ff658a56b6c0e5a6fc3f1d8213b3558117765954605177fc64a51d  bhim_redmi_genuine.png
[SEAL-TXB03-05]  18af2afd6f7a5be027ea52758f121d5c7f8a7fe7605d3369ca31a49fce5a32b9  amazon_pay_genuine.png
[SEAL-TXB03-06]  96a7d77b8b73ad6ba56cb927bb2bf4e698ea7362b083c2730623a8e999c0ec9e  phonepe_benign_whatsapp_q55.png
[SEAL-TXB03-07]  e5a31a9dc6377708573229b4b0e9f1a04d2c88f1a26388910b88950346d8cf01  gpay_benign_downscaled_75.png
[SEAL-TXB03-08]  1b857503fc2e4e135b91b9fa76b797828ea285f20f666f778d91f16599fce972  paytm_benign_crop_tilt.png
[SEAL-TXB03-09]  47c94b7cbb0299f1fa0210e75a9cf83cf2413a1a9e9921da849887754f9fa26d  cred_benign_darkmode.png
[SEAL-TXB03-10]  d315357388cf46df1966a935fa29f43f07fcb9a39f97e2f5b66d8ba98b7ba304  cred_iphone_genuine.png
[SEAL-TXB03-11]  a4928cf56e792c3a5951d6c81bb68c07d391097fa6089856f6ba89b9d3161c83  phonepe_spliced_amount.png
[SEAL-TXB03-12]  8714ba36136be44d5c80ef460bfa201b10ee76d8b6ee928a3915152a55099b24  gpay_altered_recipient_vpa.png
[SEAL-TXB03-13]  e7a17fc9928509c1c5e468d6fbb6b69fa03792e3a1f1fa61c4bb7c49386c9da3  paytm_fabricated_repeating_utr.png
[SEAL-TXB03-14]  57ec28362ea7bb5e5b6c8f94fa205c088ef08f51a704ba4e320f78c89c893661  bhim_resampled_pixel_doubling.png
[SEAL-TXB03-15]  e2d4b8ba92eaeab58a2d354a85429ef995e865aa985fec1d7cb315c1e57c1fc0  amazon_copy_move_timestamp.png
[SEAL-TXB03-16]  7d1168b4e9d14c23db2ff287c8a68b571fae134604e38e6787352b2f6ef573f0  altered_status_failed_to_success.png
[SEAL-TXB03-17]  b8568e658e388d77a836bc64e2622830f3a61f22495b542037108991206d3cb8  cred_canva_watermarked.png
[SEAL-TXB03-18]  7b78ca60eecb57117e34ef3bfcecaec089abfa9c3d420b9e8471c97a06a37803  cross_app_composited_receipt.png
[SEAL-TXB03-19]  17d12454e8196c04f98292c10156d6812ceb6264d99c4ff558ca20a10c7336cb  ai_inpainted_amount_patch.png
[SEAL-TXB03-20]  b47250ea542d22ea54a559868c2ee03e7e9a8f2dc1d8ca49547dcf9aa7659e9a  synthetic_fakepay_spoof_ui.png
[SEAL-TXB03-21]  1b8aa4045f2ec303d368e7d8c6b75c517173e3514a4c52086c2aa27faeb1fce1  double_recompressed_splice.png
[SEAL-TXB03-22]  59942a63261623832c3f80879be50e7b75f284f18b32e01dfcf46a6f4460f78a  cbs_amount_mismatch_genuine_look.png
[SEAL-TXB03-23]  8354c4ff0bb5ee988cf5268aa3ef1c099710f277ca97e7fbe224a0d922bb8f46  cbs_missing_utr_unrecorded.png
[SEAL-TXB03-24]  3098fb84c1b260317e39f37c35e8081c7ff101869f3ef44e6fae41cb6f74a814  ambiguous_multiple_matches.png
[SEAL-TXB03-25]  73a11b6da5ff658a56b6c0e5a6fc3f1d8213b3558117765954605177fc64a51d  timing_inversion_sequence.png
```

---

## 5. Risk Assessment & Controlled Pilot Boundaries

Because the 50-sample external real-world dataset is not yet fully populated:
1. **Pilot Scope Limitation:** The investigator pilot must remain restricted to controlled, supervised case evaluations.
2. **Non-Promotability Enforcement:** In accordance with the non-promotability invariant, all automated forensic inferences default to `human_verified = False`.
3. **No Prosecution Filings:** Under no circumstances shall findings generated during the limited pilot be submitted to a court of law as conclusive evidence of guilt or fraud.
