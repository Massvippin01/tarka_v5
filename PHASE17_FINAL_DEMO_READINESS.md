# TARKA × SENTINELX — PHASE 17 FINAL LIVE DEMO READINESS & READINESS CERTIFICATION

**Certification Date**: 2026-11-25  
**Engine Version**: TARKA Production Release v5.0 (V6 Skeuomorphic Command System)  
**Classification**: `OPERATIONAL & PRODUCTION-HARDENED`  
**Governing Standard**: *AI PROPOSES. FORENSIC ENGINES TEST. EVIDENCE SUPPORTS. INVESTIGATORS DECIDE.*

---

## 1. System Certification Status

The TARKA × SentinelX platform has passed all Phase 17 recovery, integration, and verification gates. The previously approved **Tactile Skeuomorphic Command System (26 Master Screens)** from commit `b5a5a25` has been completely recovered, verified, and integrated with the hardened backend services:

1. **Exact UI Restoration**: Restored `V6AppShell`, the navigation rail (`V6Rail`), warm ivory parchment design tokens (`v6-tokens.css`), and all 26 master screens from the official Judge Demonstration Handbook.
2. **Offline Forensic Inference**: Operating with local ONNX weights (`ch_PP-OCRv4_*.onnx`) with zero external network dependencies and zero mock fallbacks.
3. **Universal Ingestion & Resumable Streaming**: Tus 1.0.0 chunked upload protocol handles files from 10 KB to multi-gigabytes with 64KB bounded memory windows and immediate read-back SHA-256 verification.
4. **Canonical Persistent Pipeline**: Observations are atomically stored to disk in UCM format, surviving backend reboots.
5. **Formal Reasoning & Integrity**: TRACE balance conservation, AEGIS 7 ACH hypotheses, Z3 SMT contradiction isolation, and Section 63 BSA ReportLab PDF generation verified.
6. **Live Runtime Daemons**: Both FastAPI (`http://127.0.0.1:8000`) and Vite (`http://127.0.0.1:5173`) servers are healthy and actively serving requests.

---

## 2. Deliverables Index (11 Authoritative Reports)

| Deliverable | File Path | Scope & Focus |
| :--- | :--- | :--- |
| **01** | [PHASE17_UI_HISTORY_AUDIT.md](file:///c:/PROJECTS/SentinelX/PHASE17_UI_HISTORY_AUDIT.md) | Exhaustive Git branch audit, candidate comparison, and baseline justification. |
| **02** | [PHASE17_BRANCH_AND_UI_RECOVERY.md](file:///c:/PROJECTS/SentinelX/PHASE17_BRANCH_AND_UI_RECOVERY.md) | Branch topology map, file restoration manifest, and recovery procedures. |
| **03** | [PHASE17_SYSTEM_INTEGRATION_MATRIX.md](file:///c:/PROJECTS/SentinelX/PHASE17_SYSTEM_INTEGRATION_MATRIX.md) | Complete 20-subsystem architectural audit and Class A/B integration scoring. |
| **04** | [PHASE17_DOCUMENT_CAPABILITY_MATRIX.md](file:///c:/PROJECTS/SentinelX/PHASE17_DOCUMENT_CAPABILITY_MATRIX.md) | Universal format families, security controls, and throughput benchmarks. |
| **05** | [PHASE17_OCR_ACCEPTANCE.md](file:///c:/PROJECTS/SentinelX/PHASE17_OCR_ACCEPTANCE.md) | RapidOCR ONNX model hashes, engine evaluation, and printed vs handwriting scope. |
| **06** | [PHASE17_TRACE_ACCEPTANCE.md](file:///c:/PROJECTS/SentinelX/PHASE17_TRACE_ACCEPTANCE.md) | Double-entry ledger reconciliation, balance conservation, and ₹450 delta detection. |
| **07** | [PHASE17_AEGIS_ACCEPTANCE.md](file:///c:/PROJECTS/SentinelX/PHASE17_AEGIS_ACCEPTANCE.md) | ACH 7 competing hypotheses, Section 94 BNSS gaps, and non-promotability invariant. |
| **08** | [PHASE17_PROVENANCE_ACCEPTANCE.md](file:///c:/PROJECTS/SentinelX/PHASE17_PROVENANCE_ACCEPTANCE.md) | Unbroken 14-stage lineage, parent-chained custody ledger, and BSA Section 63 seals. |
| **09** | [PHASE17_SECURITY_AUDIT.md](file:///c:/PROJECTS/SentinelX/PHASE17_SECURITY_AUDIT.md) | 7-factor RBAC, tenant isolation, injection defenses, and CERT-In disclosure. |
| **10** | [PHASE17_SCALABILITY_REPORT.md](file:///c:/PROJECTS/SentinelX/PHASE17_SCALABILITY_REPORT.md) | 10KB–2GB load benchmarks, Tus 1.0.0 chunking, and worker crash recovery. |
| **11** | [PHASE17_E2E_REPORT.md](file:///c:/PROJECTS/SentinelX/PHASE17_E2E_REPORT.md) | Full 16-step end-to-end automated investigation runbook verification. |

---

## 3. Operational Demonstration Reference

- **Frontend Application URL**: `http://127.0.0.1:5173`
- **Backend API URL**: `http://127.0.0.1:8000`
- **Default Case ID**: `upi_payment_discrepancy` or `CASE-2026-001`
- **Core Keyboard Shortcuts**:
  - `v`: Open Voice Interrogation Station (Indic Speech / Sarvam / Offline)
  - `Alt+0`: Open Cryptographic Evidence Intake modal
  - `k` / `Ctrl+K`: Open Tarka Command Palette
  - `?`: Toggle Contextual Guidance Walkthrough
  - `1` through `9`: Quick jump between core forensic screens
  - `f`: Open Section 63 BSA Report Generator
- **View URL Parameters**:
  - `/?view=home`: Particle Intelligence Fibonacci Sphere
  - `/?view=workspace`: Command Centre & Golden Hour Tactical Dashboard
  - `/?view=cases`: Central FIR Registry
  - `/?view=evidence`: Evidence Locker & 5-File Evidentiary Join
  - `/?view=money`: Financial Reconstruction & Multi-Hop Money Trail
  - `/?view=network`: Fraud Network Graph & Mule Aggregator Clusters
  - `/?view=people`: Entity Intelligence & KYC Resolution
  - `/?view=device`: CGNAT Demultiplexing & Falsification Gate
  - `/?view=benchmarks`: SUTRAM Forensic Benchmark Lab
  - `/?view=report`: Section 63 BSA Report Generator
  - `/?view=workstation&mode=forensics`: Deep Liquid-Glass Forensic Workstation
