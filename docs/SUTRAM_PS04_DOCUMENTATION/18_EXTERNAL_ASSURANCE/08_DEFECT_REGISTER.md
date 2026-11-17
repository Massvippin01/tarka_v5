# SUTRAM 2026 PS04 — INDEPENDENT ASSURANCE PROGRAMME
## 08: FORMAL DEFECT REGISTER & REMEDIATION TRACKER

**Document Identifier:** `TARKA-ASSURANCE-DEFECTS-2026-V1`  
**Working Branch:** `phase-13/independent-assurance`  
**Auditor:** Quality Assurance Lead & Systems Defect Manager  
**Governing Doctrine:** AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.  
**Classification:** SUTRAM 2026 Competition Documentation / Defect Register

---

### 1. DEFECT CLASSIFICATION & TRIAGE HIERARCHY

In strict compliance with Section 11 of the Phase 13 Directive, every issue identified during reproducibility testing, usability audits, cryptographic reviews, and security scanning was logged, triaged, and assigned a remediation owner according to the constitutional priority hierarchy:

1. Evidence Integrity Defects (P0)
2. Security & Authorization Defects (P0)
3. Incorrect Analytical Conclusions (P1)
4. Cryptographic Correctness Defects (P1)
5. Data-Loss & Recovery Defects (P1)
6. Statutory Report Defects (P2)
7. Usability & Cognitive Friction Defects (P2)
8. Performance & Latency Defects (P3)

---

### 2. THE MASTER DEFECT REGISTER

```
=============================================================================================================
                           TARKA INDEPENDENT ASSURANCE DEFECT REGISTER
=============================================================================================================
Defect ID  Sev. Priority Category            Affected Module        Status     Remediation / Resolution
-------------------------------------------------------------------------------------------------------------
DEF-001    Low   P2      Usability / Docs     ForensicWorkstation    REMEDIATED Expanded "MUS" tooltip to
                                                                                "Minimal Unsatisfiable Sub-proof"
DEF-002    Low   P2      UI / Ergonomics      TarkaGlobalShell.tsx   REMEDIATED Keyboard shortcuts displayed on
                                                                                sidebar tooltips (Alt+0..8)
DEF-003    Med   P1      Security / Gateway   backend/app/main.py    REMEDIATED Enforced 100MB upload limit on
                                                                                Evidence Gateway intake endpoint
DEF-004    Info  P3      Crypto / PSI         backend/tarka/psi.py   REGISTERED Documented cardinality leakage
                                                                                boundary; bucket padding planned
DEF-005    Low   P2      UI / Deep Linking    useTarkaUiStore.ts     REMEDIATED Handled ?view= URL query param
                                                                                routing to active stage
=============================================================================================================
```

---

### 3. DETAILED DEFECT INVESTIGATION RECORDS

#### DEF-001: Ambiguity in Formal Methods "MUS" Terminology
- **Severity:** Low | Priority: P2 | Owner: Member A
- **Description:** During the simulated usability walkthrough, the acronym "MUS" in the SMT solver status panel caused confusion for non-mathematician investigators.
- **Root Cause:** Academic term "Minimal Unsatisfiable Subset" used directly in user-facing status tag.
- **Remediation:** Updated UI tooltip and explanation modals to display: *"Minimal Unsatisfiable Sub-proof (Core Mathematical Contradiction Identified by Z3 SMT Solver)"*.
- **Regression Verification:** Tooltip verified in UI; zero test failures.

#### DEF-002: Keyboard Chord Discoverability in Sidebar
- **Severity:** Low | Priority: P2 | Owner: Member C
- **Description:** Unfamiliar investigators using mouse clicks took longer to discover fast keyboard chords (`Alt+0` through `Alt+8`).
- **Root Cause:** Keyboard shortcut annotations were present in code listeners but subtle in visual badges.
- **Remediation:** Added explicit `(Alt+<N>)` chord badges to all sidebar button tooltips.
- **Regression Verification:** Verified across all 10 navigation items.

#### DEF-003: Unbounded File Upload Ceiling Protection
- **Severity:** Medium | Priority: P1 | Owner: Member C
- **Description:** While CAS checks content hashes, the Evidence Gateway endpoint did not enforce an explicit pre-ingest byte-stream limit.
- **Root Cause:** Relied on reverse-proxy Nginx limits rather than application-layer assertion.
- **Remediation:** Added application-level middleware check rejecting raw file streams exceeding 100MB with `HTTP 413 Payload Too Large`.
- **Regression Verification:** Tested with 120MB synthetic payload; rejected cleanly without memory bloat.

#### DEF-004: Set Cardinality Exposure in Asymmetric ECDH-PSI
- **Severity:** Informational | Priority: P3 | Owner: Member B
- **Description:** ECDH-PSI reveals the number of suspect accounts held by participating institutions ($|X|$ and $|Y|$), though no plaintext data is leaked.
- **Root Cause:** Standard mathematical property of unpadded Diffie-Hellman set intersection.
- **Remediation:** Explicitly documented in `18_OPEN_LIMITATIONS_REGISTER.md`. Added architectural requirement for power-of-two dummy padding in the production pilot roadmap.
- **Status:** Documented with Accepted Limitation.

#### DEF-005: Deep-Link Route Resolution on URL Query Parameter
- **Severity:** Low | Priority: P2 | Owner: Member C
- **Description:** Loading `http://127.0.0.1:5173/?view=intake` initially resolved `activePage` to `"workspaces"` instead of `"workbench"`.
- **Root Cause:** `useTarkaUiStore.ts` checked `params.get("stage")` but did not check `params.get("view")`.
- **Remediation:** Added `const view = params.get("view"); if (view && view !== "workspace") return "workbench";` in `useTarkaUiStore.ts`.
- **Regression Verification:** TypeScript typecheck (`tsc -b`) and Vite build verified 100% clean.

---

### 4. DEFECT CLOSURE SUMMARY

All P0 and P1 actionable defects have been fully remediated. Zero critical, high-severity, or unhandled exceptions remain open in the codebase.
