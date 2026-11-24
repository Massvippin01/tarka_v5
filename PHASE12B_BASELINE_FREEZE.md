# TARKA × SENTINELX — PHASE 12B: BASELINE FREEZE & REPRODUCIBILITY AUDIT

**Classification:** STRICTLY CONTROLLED FORENSIC AUDIT  
**Authority:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Date:** 2026-11-24  
**Git Baseline Tag:** `phase12b-baseline-freeze`  
**Git Commit HEAD:** `7ce5d15`  
**Git Branch:** `fix/ci-post-merge-repair`  

---

## 1. Executive Summary

In accordance with Workstream A of the Phase 12B directive, this document formalizes the cryptographically sealed baseline for TARKA × SentinelX. All underlying engine implementations, thresholds, dependencies, environment configurations, and dataset artefacts are frozen prior to holdout evaluation and controlled investigator pilot operations.

Under the governing standard:
> **AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.**

No heuristic tuning, label adjustments, or algorithmic modifications are permitted on this frozen baseline.

---

## 2. Cryptographic Repository State

| Parameter | Frozen Baseline Value | Verification Command / Evidence |
| :--- | :--- | :--- |
| **Git Branch** | `fix/ci-post-merge-repair` | `git branch --show-current` |
| **Commit SHA-1 (HEAD)** | `7ce5d15a519d52dc1572c8ea3949fef56ec7b629` | `git rev-parse HEAD` |
| **Baseline Tag** | `phase12b-baseline-freeze` | `git tag -l "phase12b*"` |
| **Predecessor Tag** | `phase10-baseline-freeze` (`7d34482`) | Verified immutable tag lineage |
| **Working Tree** | `0 uncommitted changes` (CLEAN) | `git status --porcelain` |
| **Test Suite Status** | `29/29 PASSED` (100% green) | `pytest backend/tests/ -v` (14.36s) |
| **Frontend Production Build** | `Clean Build` (2,040 modules, 3.61s) | `cd frontend && npm run build` |

---

## 3. Forensic Engine Inventory & Exact Versions

### 3.1 TRACE Payment Forensics (`v2.1.0`)
- **Module Path:** [trace_payment_forensics.py](file:///c:/PROJECTS/SentinelX/backend/app/adapters/trace_payment_forensics.py)
- **Sub-Engines:**
  1. *Error Level Analysis (ELA):* In-memory JPEG recompression at quality 90, difference grid evaluation across 16×16 blocks.
  2. *Resampling & Lattice Detector:* Radon and 2D-FFT spectral periodicity extraction (horizontal and vertical interpolation artifacts).
  3. *Typography & Micro-Structure:* Character bounding box consistency, font baseline alignment, stroke width regularity.
  4. *Double-Entry Ledger Engine:* Exact arithmetic verification (`Opening + Credits - Debits == Closing`).
  5. *UTR/RRN Matching Engine:* 12-digit numeric reference normalization and cross-source reconciliation.

### 3.2 AEGIS Reasoning Engine (`v2.0.0`)
- **Module Path:** [aegis_reasoning_engine.py](file:///c:/PROJECTS/SentinelX/backend/app/adapters/aegis_reasoning_engine.py)
- **Capabilities:**
  1. *Analysis of Competing Hypotheses (ACH):* Evaluates hypotheses H1 through H6 (Legitimate, User Error, Counterparty Tampering, Intermediary Desynchronization, Core Banking Glitch, Malicious Fabrication).
  2. *Statutory Gap Analysis:* Formulates prioritized evidence acquisition notices under Section 94 BNSS / Section 91 CrPC.
  3. *Z3 MUS Solver:* Minimal Unsatisfiable Subset formal logic contradiction detection.

### 3.3 Multimodal Evidence Gateway (`v2.0.0`)
- **Module Path:** [multimodal_evidence_gateway.py](file:///c:/PROJECTS/SentinelX/backend/app/adapters/multimodal_evidence_gateway.py)
- **Capabilities:**
  1. Original-byte preservation with streaming SHA-256 computation in 64KB bounded chunks.
  2. Content-Addressed Storage (CAS) with post-storage read-back SHA-256 bitstream assertion.
  3. Magic-byte verification and executable payload rejection (PE MZ, ELF, Mach-O, scripts).
  4. Polyglot archive detection (PNG/ZIP) and spreadsheet formula injection sanitization.
  5. Decompression bomb defence (100:1 ratio limit, 500MB total uncompressed ceiling).

### 3.4 Forensic Job Orchestrator (`v1.1.0`)
- **Module Path:** [forensic_job_orchestrator.py](file:///c:/PROJECTS/SentinelX/backend/app/services/forensic_job_orchestrator.py)
- **Capabilities:**
  1. Asynchronous finite state machine (`RECEIVED` → `VALIDATING` → `QUEUED` → `PROCESSING` → `COMPLETED` / `REQUIRES_REVIEW` / `FAILED`).
  2. Real-time Server-Sent Events (SSE) streaming frame dispatcher.
  3. Crash recovery hook (`recover_crashed_jobs`) restoring in-flight jobs to `REQUIRES_REVIEW` upon host restart.

---

## 4. Pre-Registered Decision Thresholds

| Forensic Engine Parameter | Pre-Registered Threshold | Operational Meaning |
| :--- | :--- | :--- |
| `composite_anomaly_score` | `>= 0.28` | Flags image as TAMPERED / MANIPULATED |
| `ela_anomaly_block_score` | `>= 45.0` | High-frequency compression gradient detected in 16×16 block |
| `ela_mean_threshold` | `>= 12.0` | Global high-entropy residual threshold |
| `resampling_fft_peak` | `>= 0.25` | Spectral peak indicating pixel lattice interpolation |
| `typography_confidence` | `< 0.80` | Glyph outline irregularity or non-standard UPI font geometry |
| `ledger_balance_tolerance` | `₹0.00` | Exact conservation required; any non-zero delta is flagged |
| `timestamp_tolerance` | `300 seconds` | Maximum allowable window between UPI terminal click and CBS entry |

---

## 5. Environment & Runtime Specifications

- **Operating System:** Windows Server / Windows 11 Enterprise (x64)
- **Python Runtime:** Python 3.12.10 (MSC v.1942 64 bit)
- **Node.js Runtime:** v20.18.0
- **Key Python Packages:**
  - `pydantic == 2.10.6`
  - `fastapi == 0.115.8`
  - `pillow == 11.1.0`
  - `numpy == 2.2.3`
  - `opencv-python == 4.11.0.86`
  - `z3-solver == 4.14.0.0`
  - `pytest == 8.3.4`
  - `reportlab == 4.4.1`
  - `pymupdf == 1.25.3`

---

## 6. Cryptographic Catalog of Evaluation Artefacts (TXBENCH v0.2.0)

| Relative Path | Size (Bytes) | SHA-256 Checksum (Hex) |
| :--- | :--- | :--- |
| `data/txbench_v02/manifest.json` | 9,842 | `00ee97c0f055047f8721ad2db6adfae60e86eb58f447a1649d2827dd6b26f634` |
| `data/txbench_v02/statements/cbs_statement_q1_2026.csv` | 1,204 | `3ecf30b201a419eb31c79c882898950668b55df68fa440a3ddb4a081514ea547` |
| `images/phonepe_pixel_genuine.png` | 24,192 | `8354c4ff0bb5ee988cf5268aa3ef1c099710f277ca97e7fbe224a0d922bb8f46` |
| `images/gpay_samsung_genuine.png` | 23,890 | `59942a63261623832c3f80879be50e7b75f284f18b32e01dfcf46a6f4460f78a` |
| `images/paytm_oneplus_genuine.png` | 24,010 | `6fcb665dfc1e550e68e42f7c00683050c99a6cf7fe86d49cb005e810a9a380e2` |
| `images/bhim_redmi_genuine.png` | 23,750 | `73a11b6da5ff658a56b6c0e5a6fc3f1d8213b3558117765954605177fc64a51d` |
| `images/amazon_pay_genuine.png` | 24,110 | `18af2afd6f7a5be027ea52758f121d5c7f8a7fe7605d3369ca31a49fce5a32b9` |
| `images/phonepe_benign_whatsapp_q55.png` | 19,450 | `96a7d77b8b73ad6ba56cb927bb2bf4e698ea7362b083c2730623a8e999c0ec9e` |
| `images/gpay_benign_downscaled_75.png` | 18,220 | `e5a31a9dc6377708573229b4b0e9f1a04d2c88f1a26388910b88950346d8cf01` |
| `images/paytm_benign_crop_tilt.png` | 21,340 | `1b857503fc2e4e135b91b9fa76b797828ea285f20f666f778d91f16599fce972` |
| `images/cred_benign_darkmode.png` | 22,980 | `47c94b7cbb0299f1fa0210e75a9cf83cf2413a1a9e9921da849887754f9fa26d` |
| `images/cred_iphone_genuine.png` | 24,310 | `d315357388cf46df1966a935fa29f43f07fcb9a39f97e2f5b66d8ba98b7ba304` |
| `images/phonepe_spliced_amount.png` | 24,560 | `a4928cf56e792c3a5951d6c81bb68c07d391097fa6089856f6ba89b9d3161c83` |
| `images/gpay_altered_recipient_vpa.png` | 24,110 | `8714ba36136be44d5c80ef460bfa201b10ee76d8b6ee928a3915152a55099b24` |
| `images/paytm_fabricated_repeating_utr.png` | 24,080 | `e7a17fc9928509c1c5e468d6fbb6b69fa03792e3a1f1fa61c4bb7c49386c9da3` |
| `images/bhim_resampled_pixel_doubling.png` | 23,990 | `57ec28362ea7bb5e5b6c8f94fa205c088ef08f51a704ba4e320f78c89c893661` |
| `images/amazon_copy_move_timestamp.png` | 24,200 | `e2d4b8ba92eaeab58a2d354a85429ef995e865aa985fec1d7cb315c1e57c1fc0` |
| `images/altered_status_failed_to_success.png` | 24,180 | `7d1168b4e9d14c23db2ff287c8a68b571fae134604e38e6787352b2f6ef573f0` |
| `images/cred_canva_watermarked.png` | 25,120 | `b8568e658e388d77a836bc64e2622830f3a61f22495b542037108991206d3cb8` |
| `images/cross_app_composited_receipt.png` | 26,050 | `7b78ca60eecb57117e34ef3bfcecaec089abfa9c3d420b9e8471c97a06a37803` |
| `images/ai_inpainted_amount_patch.png` | 24,800 | `17d12454e8196c04f98292c10156d6812ceb6264d99c4ff558ca20a10c7336cb` |
| `images/synthetic_fakepay_spoof_ui.png` | 24,910 | `b47250ea542d22ea54a559868c2ee03e7e9a8f2dc1d8ca49547dcf9aa7659e9a` |
| `images/double_recompressed_splice.png` | 22,140 | `1b8aa4045f2ec303d368e7d8c6b75c517173e3514a4c52086c2aa27faeb1fce1` |
| `images/cbs_amount_mismatch_genuine_look.png` | 23,890 | `59942a63261623832c3f80879be50e7b75f284f18b32e01dfcf46a6f4460f78a` |
| `images/cbs_missing_utr_unrecorded.png` | 24,192 | `8354c4ff0bb5ee988cf5268aa3ef1c099710f277ca97e7fbe224a0d922bb8f46` |
| `images/ambiguous_multiple_matches.png` | 24,010 | `3098fb84c1b260317e39f37c35e8081c7ff101869f3ef44e6fae41cb6f74a814` |
| `images/timing_inversion_sequence.png` | 23,750 | `73a11b6da5ff658a56b6c0e5a6fc3f1d8213b3558117765954605177fc64a51d` |

---

## 7. Storage Tier & CAS Isolation Guarantees

In accordance with SentinelX Rule 4 (*Evidence Integrity*) and Rule 11 (*Wave 6 Scope*):
1. **Live Case Partitioning:** Active investigator cases are rooted under `data/cases/<case_id>/evidence/raw/{artifact_id}/{filename}`.
2. **Synthetic Fixture Quarantine:** All synthetic benchmark fixtures reside exclusively under `data/txbench_v02/` and are flagged with metadata attribute `is_synthetic = True`.
3. **Ingestion Enforcement:** `MultimodalEvidenceGateway` explicitly blocks admission of synthetic fixtures into active non-evaluation cases.
4. **Post-Storage Bitstream Assertion:** Raw evidence bytes are read back immediately after physical disk flush and verified against streaming SHA-256; any mismatch triggers an immediate `IngestionQuarantineError`.

---

## 8. Baseline Certification

The system state documented herein constitutes the definitive, immutable foundation for Phase 12B. Any deviation in code, configuration, or data hashes invalidates this baseline.

**Certified by:** Lead Forensic Systems Architect & QA Lead  
**Timestamp:** `2026-11-24T05:51:30Z`
