# TARKA — Release Verification Checklist

This checklist defines the formal engineering release criteria for **TARKA** (Version 1.0.0-rc1). Every item must be verified on executable code before cutting a production-ready release.

---

## 1. Repository & Git Hygiene

- [x] **Repository Identity**: Remote renamed to `Yaathrapalani/tarka` and verified via `gh repo view`.
- [x] **Remote Tracking**: `origin` points to `https://github.com/Yaathrapalani/tarka.git`.
- [x] **Active Branch**: Verified on `feat/tarka-forensics-integration`.
- [x] **Destructive Command Ban**: Zero history rewriting, no `git reset --hard`, no `git clean`, no force-push.
- [x] **Transient File Exclusion**: `.gitignore` updated to exclude logs, temporary test runs (`case_iso_*`, `regression_case_*`), media buffers (`*.webm`, `*.webp`, `.tempmediaStorage/`), and local databases while preserving the synthetic demo case.

---

## 2. Security & Credential Hygiene

- [x] **No Leaked Secrets**: Automated regex scan across tracked and staged files for `SARVAM_API_KEY`, private tokens, or hardcoded passwords.
- [x] **Server-Side Key Isolation**: Voice provider keys remain strictly server-side; zero `VITE_*` credential leakage into frontend client bundles.
- [x] **Template Placeholders**: `.env.example` and `backend/.env.example` provide safe placeholders with zero live credentials.
- [x] **Truthful Degradation**: Missing API key fails closed gracefully with structured diagnostic (`UNCONFIGURED`) instead of exposing stack traces or silent browser fallback.

---

## 3. Conversational Voice Engine Verification

- [x] **Provider Contract Compliance**: `bulbul:v4-flash` official catalog adhered to; personas mapped to valid identifiers (`simran_enhi_companion`, `shubh_enhi_ads`, `gokul_ta_narration`, `kavitha_te_narration`, `arnab_bn_conversation`).
- [x] **Timeout Tolerance**: Backend request timeout increased to 25.0s and Axios timeout to 35.0s to accommodate neural speech synthesis.
- [x] **Live API Smoke Test**: Verified via `RUN_LIVE_SARVAM_TEST=1 pytest backend/tests/test_sarvam_live_smoke.py`:
  - Returned HTTP 200.
  - Audio base64 decoded to valid RIFF WAV bytes.
  - Diagnostic recorded without secret leakage.
- [x] **Browser Playback Verified**: Automated Chrome DevTools session executed; query `"Explain this case in simple English."` succeeded with 7719.73ms latency and zero amber warning banners.
- [x] **Robotic Browser Speech Ban**: `window.speechSynthesis` remains permanently disabled per Section E mandate.

---

## 4. Forensic & Formal Logic Verification

- [x] **Z3 SMT Solver Grounding**: Discrepancies between bank ledger (₹25,000) and screenshot claim (₹15,000) verified via mathematical constraint satisfaction.
- [x] **Evidence Content-Addressed Storage (CAS)**: SHA-256 hashes computed on intake and verified bit-for-bit against raw evidence bytes.
- [x] **Statutory Compliance (Section 63 BSA)**: Consequential report generation gated behind mandatory confirmation dialogue; produces tamper-evident PDF certificates.
- [x] **Synthetic Case Isolation**: `upi_payment_discrepancy` fixtures self-contained in `data/cases/` without external file dependencies.

---

## 5. Build & Regression Testing

- [x] **Frontend Production Build**: `npm run build` executed clean with 0 TypeScript compiler errors.
- [x] **Backend Acceptance Suite**: `test_tarka_multilingual_voice_acceptance.py` (10/10 tests passed).
- [x] **Modal Refinement Suite**: `test_tarka_voice_modal_refinement.py` (18/18 tests passed).
- [x] **Reporting Acceptance Suite**: `test_tarka_voice_persistent_reporting_acceptance.py` (1/1 test passed).
- [x] **Overall Pass Rate**: 30 passed, 1 skipped (live test skipped in normal CI) in 112s.

---

## 6. Documentation & Packaging

- [x] **Root README.md**: Authoritative guide with architecture diagram, quick start, prerequisites, and troubleshooting.
- [x] **Getting Started Guide**: `docs/GETTING_STARTED_WINDOWS.md` with copy-pasteable PowerShell commands.
- [x] **Configuration Reference**: `docs/CONFIGURATION_REFERENCE.md` with environment and dependency matrices.
- [x] **Release Notes**: `docs/RELEASE_NOTES.md` documenting deliverables, fixes, and operational instructions.
