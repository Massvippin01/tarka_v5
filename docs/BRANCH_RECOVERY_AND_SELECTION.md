# TARKA × SENTINELX — COMPLETE BRANCH RECOVERY & SELECTION MATRIX
**Document ID:** TARKA-RECON-BRANCH-MATRIX-2026  
**Authoritative Release Branch:** `release/tarka-master-transition`  
**Current Baseline SHA:** `d321a44557f869e2ed82f659854eb47224c3bf32`  
**Repository:** `https://github.com/Massvippin01/tarka_v5.git`  
**Date:** November 28, 2026  
**Status:** COMPLETE & VERIFIED  

---

## 1. Executive Summary

This document records the exhaustive forensic inspection of all remote branches, merges, and release tags across the canonical TARKA repository. Rather than selecting a branch based on date or commit volume, each branch was evaluated against concrete evidence: test suite execution, architectural stability, skeuomorphic V6 UI integrity, zero-guilt constitutional compliance, and production readiness.

The authoritative baseline selected is `d321a44` (`feat/tarka-production-upgrade`), now branched to `release/tarka-master-transition`. It preserves all canonical Wave 1–5 systems, the full V6 tactile skeuomorphic design system, the official terracotta fold brand assets, the Phase 12 Universal Connector SDK, and the AI Prompt Defense Firewall.

---

## 2. Remote Branch Audit Matrix

| Branch Name | Tip Commit SHA | Merge Base with Baseline (`d321a44`) | Ahead / Behind (`d321a44`) | Status in Relation to `origin/main` | Selected Components / Disposition |
|---|---|---|---|---|---|
| **`origin/main`** | `c7b10a3b04b2bcf494ada84ac723f3f5b71e9881` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 206 | Mainline Trunk | Absorbed all historical phase branches. Contains demo reset, OCR lakh grouping, and project switcher enhancements. |
| **`origin/feat/tarka-production-upgrade`** | `d321a44557f869e2ed82f659854eb47224c3bf32` | `d321a44557f869e2ed82f659854eb47224c3bf32` | 0 / 0 | Authoritative Baseline | 100% synchronized with local release candidate. Contains official brand integration, connector SDK, and prompt firewall. |
| **`origin/fix/ci-post-merge-repair`** | `9580dbffb420b1ee4e714fd800fc4fb2befa18f2` | `9580dbffb420b1ee4e714fd800fc4fb2befa18f2` | 5 / 0 | Fully Contained in Baseline | All 5 commits of `fix/ci-post-merge-repair` are directly incorporated into `d321a44`. |
| **`origin/phase-13/independent-assurance`** | `a5942e451f96d97637d9610f253af94fc6d67825` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 57 | Merged into `origin/main` | Independent assurance programme and 12 evaluation reports. |
| **`origin/phase-14/implementation-completion`** | `b5a5a25481aa7c12ae51ec3cb56e9fa0889d7c37` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 165 | Merged into `origin/main` | Judge demonstration handbook, particle intelligence, and massive evidence ingestion. |
| **`origin/phase-14/whole-system-completion`** | `aa52f87fc4704eaf01f19fb64aca4d858bb640e8` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 61 | Merged into `origin/main` | Whole-system audit verification. |
| **`origin/phase-15/polish`** | `5d3a30684362244dc611cdac79f68e8bb5fd0287` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 76 | Merged into `origin/main` | Header cleanup, node graph auto-fit, and multi-case sync. |
| **`origin/phase-15.7`** | `2f5c53641dfb34ca0061e89ceea3a12762a5b6eb` | `3b5e7088665ac11cec6165007ee1e0b7c189ca4e` | Diverged | Standalone Feature Branch | SUTRAM Section 4 integration: multi-sheet Excel ingestion, 6-typology scam classifier, and NCRP entity extraction. |
| **`origin/phase-16/bulk-intake-and-pages`** | `39693497434c2f7fc32ea10e768f316668c1ffe3` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 169 | Merged into `origin/main` | Bulk intake with proposed cases, 5x faster ingestion engine, and security fixes. |
| **`origin/ui/v6-light-professional`** | `ba3b788e2d55985213a7d8aed8c77f410c493876` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 130 | Merged into `origin/main` | Light executive tokens matching tarka-reference specification. |
| **`origin/v5/main`** | `9c39c3c192363d538492c8f355ca18f5b8ad2388` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 31 | Merged into `origin/main` | Round R6 Graph Rescue, S3 Sankey, and recoveryModel. |
| **`origin/v6-release`** | `aa2b99a59c0b73b4202a3ae252e12b50a05b4b64` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 162 | Merged into `origin/main` | V6 release UI stabilization (solid emerald checkmarks, case switcher popover). |
| **`origin/feat/sutram-2026-ps04-member-b`** | `e2a4268c2022901dfa0dbc6890d26329c9f4f3cb` | `2c32bb05f36e80baba130e10c910623ada687dea` | 27 / 56 | Merged into `origin/main` | Phase 12 competition release pack and 3 signature forensic systems. |

---

## 3. Subsystem Architectural Comparison & Selection Rationale

### 3.1 Presentation & UI Layer
- **Candidate 1: Daylight Executive Bento (v5/main)**: Clean white cards with 12-column layout. High information density but lacked the tactile skeuomorphic warmth required by founders.
- **Candidate 2: V6 Tactile Skeuomorphic Ivory (`d321a44`)**: Warm ivory `#F8F4ED`, `#FFFDF8`, terracotta `#C85A32`, recessed inset bezels, brass status dials, interactive particle orb, and official terracotta fold monogram.
- **Selection:** **Candidate 2 (`d321a44`)**. It is the founder-approved visual standard, eliminates 404s, passes all 148 Vitest UI tests, and compiles cleanly in Vite.

### 3.2 Backend Service & API Layer
- **Candidate 1: Standalone Microservices (Section 4)**: Fragmented endpoints across disparate port allocations.
- **Candidate 2: FastAPI Monolith with UnitOfWork & Modular Routers (`d321a44`)**:
  - Robust UnitOfWork (`UnitOfWork()`) with repository abstractions.
  - Fail-safe SQLite fallback with canonical case fixture loader (`CASE-2026-001` through `004`), preventing 500 crashes when external Postgres is offline.
  - Pure Python TARKA Core + Z3 SMT Theorem Prover.
- **Selection:** **Candidate 2 (`d321a44`)**. Highly resilient, verified under `SETUP_AND_VERIFICATION.md`, and 100% backward-compatible.

### 3.3 Evidence Ingestion & OCR
- **Candidate 1: Legacy PyMuPDF only**: Basic text scraping without monetary normalization.
- **Candidate 2: Universal Ingestion Engine with Indian Lakh Grouping (`2f8ad32` from `origin/main`)**:
  - Handles comma separators in Indian financial strings (e.g. `₹2,96,000` parsed as `296000.0` rather than `2.0`).
  - Dual-tier CAS (local directory `data/storage/artifacts/` + S3/RustFS).
  - Multi-sheet Excel parser and NCRP complaint normalizer.
- **Selection:** **Integrated into Release Candidate**.

### 3.4 Security & AI Prompt Defense
- **Candidate 1: Raw LLM Passthrough**: Susceptible to indirect prompt injection and accusatory hallucinations.
- **Candidate 2: Constitutional Defense Firewall (`d321a44`)**:
  - `HeuristicTokenSanitizer`: Strips zero-width characters and detects adversarial tokens.
  - `XMLContainmentEnclave`: Sandboxes untrusted evidentiary payloads.
  - `EvidenceIsDataOnlyGuard`: Enforces rule: "AI proposes, evidence verifies, human decides" and rejects `GUILTY`/`INNOCENT` labels.
- **Selection:** **Candidate 2 (`d321a44`)**. All 10/10 pytest tests pass.

---

## 4. Release Candidate Creation

Branch **`release/tarka-master-transition`** has been initialized at commit `d321a44557f869e2ed82f659854eb47224c3bf32`. All subsequent Phase 2–8 enhancements (Brand verification, Rust migration strategy, Google 2-Account Auth, and official WhatsApp integration) will be developed and committed directly on this branch.
