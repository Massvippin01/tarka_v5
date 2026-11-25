# TARKA × SENTINELX — PHASE 18: FINAL DEMO READINESS

**Date:** 2026-11-25  
**Target Event:** Founder Institutional Live Demonstration Video  
**Target Case:** `CASE-2026-001` (Sunil Kumar — Fake CBI/TRAI Digital Arrest Extortion)  
**Deployment Profile:** Production Hardened (`fix/ci-post-merge-repair`)

---

## 1. Demonstration Scenario & Walkthrough Script

### Stage 1: Case Intake & Golden Hour Triage (0:00 - 1:30)
- **Visual:** Open Dashboard at `http://127.0.0.1:5173`.
- **Narration:** "Welcome to TARKA, the sovereign forensic intelligence platform engineered for Indian law enforcement. Here on the active investigations board, we observe FIR #149/2026: a digital arrest extortion involving victim Sunil Kumar, with ₹5,00,000 extracted and 118 minutes of MHA Golden Hour remaining."
- **Action:** Click `Continue Investigation` on Sunil Kumar's dossier card.

### Stage 2: Evidence Ledger & Bitstream Custody (1:30 - 3:00)
- **Visual:** Evidence Ledger Screen showing 4 admitted artifacts (SBI Finacle CBS Statement, NPCI UPI STAN Telemetry, Airtel CGNAT IPDR, WhatsApp Forensic Export).
- **Narration:** "All evidence is ingested through our append-only Content-Addressable Storage (CAS). Every byte is verified via immutable SHA-256 hashing. Notice the unbroken Merkle root seal: `89c20491...`. Under BSA Section 63(4), digital evidence is certified intact."

### Stage 3: Money Trail & Taint Engine (3:00 - 4:30)
- **Visual:** Money Trail Screen showing the Sankey flow and Lowest Intermediate Balance Rule (LIBR) accounting.
- **Narration:** "TARKA applies the Supreme Court recognized Lowest Intermediate Balance Rule (LIBR). Stolen capital is mathematically traced through Hop 1 (Vikram Shah, ₹2,85,000) and Hop 2 (Rohit Verma, ₹1,20,000), while segregating innocent merchant transactions at Apex Electronics (₹1,80,000)."

### Stage 4: Fraud Network & Layered Gang SVG (4:30 - 6:00)
- **Visual:** Fraud Network Screen. Toggle between `Interactive Graph` and `Layered Gang SVG`.
- **Narration:** "Notice our custom layered SVG graph renderer. Labels are dynamically placed without colliding with nodes or crossing money lines. By correlating Airtel IPDR and Wi-Fi BSSID `74:DA:38:A2:11:BC`, TARKA proves that Vikram Shah and Rohit Verma operated from the same physical handset terminal, tethered over an accomplice hotspot with packet TTL=63."

### Stage 5: Third-Party Intelligence Export (6:00 - 7:00)
- **Visual:** Click export buttons for IBM i2 Analyst's Notebook CSV, Maltego CSV, and STIX 2.1 Indicators.
- **Narration:** "For inter-agency collaboration with CBI and I4C, TARKA exports directly into i2 Analyst's Notebook and STIX 2.1 threat intelligence formats with one click."

### Stage 6: Actions & Admissible Court Dossier (7:00 - 9:00)
- **Visual:** Redesigned Actions & Report Screen.
  - Inspect the 5-column unified financial summary (Reported ₹5,00,000, Verified ₹5,00,000, Shielded ₹3,80,000, 76.0% Recovered).
  - Review the ranked Priority Account Directives table.
  - Expand Vikram Shah (#1) to inspect transaction lineage and Section 106(1) BNSS statutory justification.
  - Click `Simulate Bank Freeze` to demonstrate instant acknowledgment and 100% capital protection.
  - Switch to `Statutory Bank Notices` to preview Form 27-B and Section 107 BNSS application.
  - Switch to `Court Dossier (BSA §63)` to preview the official police letterhead, accounting schedule, and digital seal.
  - Click `Download PDF Certificate` / `Print Dossier`.
- **Narration:** "Within the golden hour window, TARKA automatically prepares enforceable statutory notices under Sections 94, 106, and 107 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023, and generates a cryptographically sealed, court-admissible Section 63 BSA certificate."

---

## 2. Live Demo Checklist

- [x] Backend running on `http://127.0.0.1:8000` with all routes mounted.
- [x] Frontend running on `http://127.0.0.1:5173` with clean Vite build.
- [x] All 4 canonical cases (`CASE-2026-001` through `CASE-2026-004`) pre-loaded and accessible.
- [x] Zero console errors during screen transitions.
- [x] Offline RapidOCR, TRACE, and AEGIS verified.
- [x] ReportLab Section 63 BSA PDF generation operational.
