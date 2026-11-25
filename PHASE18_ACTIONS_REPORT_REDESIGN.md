# TARKA × SENTINELX — PHASE 18: ACTIONS & REPORT SCREEN REDESIGN

**Component:** `frontend/src/v6/screens/ActionsReportScreen.tsx`  
**Priority:** P0 Core Investigation Workflow Redesign  
**Status:** Completed & Production Verified (`tsc -b` and `vite build` clean)

---

## 1. Design Rationale & Problem Statement

Prior to Phase 18, the Actions & Report screen suffered from:
1. **Visual Fragmentation:** Four competing KPI cards at the top consuming critical vertical space.
2. **Lack of Operational Actionability:** Conduit accounts were listed without clear ranking, deep lineage, or actionable statutory justification.
3. **Ambiguity in Action Lifecycle:** Directives lacked explicit progression between `Drafted`, `Approved`, `Submitted`, and `Acknowledged`.
4. **Empty State Deficiencies:** When no accounts were selected, empty spaces provided no guidance to investigators.

---

## 2. Implemented Architecture & Hierarchy

The redesigned `ActionsReportScreen.tsx` establishes an authoritative, top-down hierarchy:

```
[PageHead: Kicker, Title, Actions Bar (Export JSON, Download PDF, Print)]
                          ↓
[Case Context Header & 6-Stage Investigation Horizontal Stepper]
                          ↓
[P0 Single Compact Unified Financial Overview (5-Column Clean Summary)]
                          ↓
[Sub-Tab Switcher: Account Directives | Statutory Bank Notices | Court Dossier]
                          ↓
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ Directives & Freezes    │ Statutory Bank Notices  │ Admissible Court Dossier│
│ (Ranked Priority List)  │ (Draft & Nodal Letters) │ (BSA § 63(4) Certified) │
│ - #1 Vikram Shah (Axis) │ - Form 27-B (§106 BNSS) │ - Police Letterhead     │
│ - #2 Rohit Verma (HDFC) │ - §107 BNSS Attachment  │ - Accounting Schedule   │
│ - #3 Apex Elec (ICICI)  │ - §94 BNSS DoT 39.20    │ - Merkle Root Lineage   │
│ - #4 ATM Noida (SBI)    │ - NPCI Switch Audit     │ - Official Digital Seal │
│ - #5 Sameer Khan (ICICI)│ - I4C Samanvaya Link    │                         │
│ [Expandable Detail View]│ [Copy Directive / SFTP] │ [Download Official PDF] │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## 3. Key Feature Specifications

### 1. Case Context Header & 6-Stage Stepper
- Displays Case ID (`CASE-2026-001`), FIR Number (`149/2026`), Complainant (`Sunil Kumar`), Police Station (`Noida Cyber Crime PS`), Assigned IO (`Insp. Rajeshwar Rao`), and live Golden Hour countdown (`118m Remaining`).
- Integrated `HorizontalStepper` highlights Stage 6 (`Actions & Report`) with full backward navigation to previous stages.

### 2. Single Compact Financial Summary Bar
Replaces the four separate cards with a unified 5-column dashboard widget:
- **Reported Loss:** `₹5,00,000` (Victim booked loss, CBS Audited)
- **Verified Audit:** `₹5,00,000` (Deterministic Z3 SMT Proved)
- **Shielded / Frozen:** `₹3,80,000` (`76.0% Recovered / Capital Secured`)
- **Pending Action:** `₹1,20,000` (2 Target accounts requiring IO signature)
- **Directives & Fast Simulation:** Displays enforced directive count (`3 of 5 Enforced`) with an interactive `Simulate Bank Freeze` quick action button.

### 3. Ranked Priority Account Directives Table
- Ranked list of conduit beneficiary accounts sorted by hop distance and velocity.
- Explicit lifecycle status badges:
  - `Suggested` (Default automated proposal)
  - `Drafted` / `Reviewed` (Amber, awaiting supervisor check)
  - `Approved` / `Submitted` (Blue, transmitted to nodal desk)
  - `Acknowledged` / `Delivered` (Green, capital frozen by bank)
  - `Rejected` / `Failed` (Red, rejected by bank with reason)
- **Expandable Detail View** on each directive reveals:
  - **Transaction Chain & Velocity:** Inflow amount, timestamp, RRN, downstream outflow, hop depth.
  - **Supporting Evidence Lineage:** Exhibit ID, SHA-256 content hash, CAS bitstream verification.
  - **Statutory Power & Justification:** Section 106(1) BNSS Proportional Debit Lien / Section 107 BNSS Judicial Attachment under MHA Golden Hour SOP.
  - **Recommended Next Step:** Clear operational instruction for the officer.
  - **Interactive Lifecycle Transitions:** Instant state switching (`Drafted` → `Approved` → `Submitted` → `Acknowledged`).

### 4. Informative Empty State
When zero directives are present (e.g. before evidence ingestion):
- Renders an informative card with a legal scale icon, title, and descriptive explanation.
- Provides a direct CTA button: `Ingest Case Evidence` to guide the investigator.

### 5. Statutory Bank Notices Workspace
- Pre-formatted statutory letters for:
  - `FORM 27-B: Bank Debit Lien` under Section 106(1) BNSS.
  - `Application for Judicial Attachment of Proceeds of Crime` under Section 107 BNSS.
  - `Telecom Requisition` under Section 94 BNSS & DoT 39.20.
  - `NPCI Switch Settlement Telemetry` under BSA §63(4).
  - `I4C Samanvaya Multi-State Syndicate Notice`.
- Features visual `DRAFT · PENDING IO DIGITAL SIGNATURE` badge, 2-hour mandatory SLA disclaimer, and one-click copy/SFTP transmission.

### 6. Admissible Court Dossier (BSA §63(4) Certified)
- Official State Police Cyber Crime Investigation Division letterhead.
- Statutory preamble for the Court of Special CJM.
- Executive accounting schedule table.
- Cryptographic Merkle Root hash chain (`89c20491823091ffeed891241aa44591aefc48201...`).
- High-resolution PDF export and browser print trigger.

---

## 4. Verification

- **TypeScript Compilation:** Zero errors under `verbatimModuleSyntax` and `strict`.
- **Vite Bundler:** Bundled cleanly as chunk `dist/assets/ActionsReportScreen-Byk7DiA6.js` (36.89 kB).
- **Vitest Suites:** `src/pages/v5/__tests__/reportScreen.test.ts` (16/16 PASSED).
