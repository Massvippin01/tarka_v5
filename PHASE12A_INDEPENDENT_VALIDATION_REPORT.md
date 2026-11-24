# TARKA × SENTINELX — PHASE 12A: INDEPENDENT VALIDATION REPORT
## Independent Forensic Systems Audit, Reproducibility Verification & Pilot Readiness Assessment

**Document ID:** `TARKA-AUDIT-PHASE12A-001`  
**Date of Audit:** 2026-11-23  
**Auditor:** Principal Forensic Systems Architect, Independent Validation Engineer & Security Reviewer  
**Governing Standard:** [SentinelX Wave 6 Engineering Constitution](file:///c:/PROJECTS/SentinelX/.agents/rules/sentinelx-wave-6-engineering-constitution.md)  
**Git Baseline:** Tag `phase10-baseline-freeze` (Commit `7d34482`) | Branch `fix/ci-post-merge-repair`  
**Final Production Gate Decision:** **`DECISION B: CONDITIONALLY APPROVED FOR CONTROLLED INVESTIGATOR PILOT`**  

---

## 1. Executive Summary & Objective

In accordance with Section 1 ("Repository Truth"), Section 9 ("Production Readiness"), and Section 14 ("Verification") of the SentinelX Engineering Constitution, this independent audit evaluates the actual executable state, scientific benchmark reproducibility, ingress security defenses, and end-to-end investigator workflows of the TARKA digital forensics platform following Phase 11 and Phase 11B.

Prior reports claimed 100% accuracy on TXBENCH v0.2.0 across 25 payment fraud scenarios and declared Phase 11 complete. This audit does not take those claims at face value. We independently re-ran the benchmark, examined the engine's internal decision rules, stress-tested security boundaries, and executed a 14-step investigator workflow from scratch.

### Key Audit Findings

1. **Benchmark Reproducibility Confirmed (Controlled Environment)**:
   - Independent execution of `scripts/evaluate_txbench_v02.py` in a clean Python 3.12 environment reproduced 100% accuracy, 1.0000 precision, 1.0000 recall, 0.00% FPR, 0.00% FNR, and 0.9018 mean IoU across all 25 scenarios.
   - P50 processing latency is 54.3ms (P90: 99.2ms, P99: 155.0ms), well within the 2,000ms SLA.
2. **Critical Leakage Finding — Controlled Calibration, Not Generalization**:
   - The dataset generation script (`scripts/generate_txbench_v02_dataset.py`) assigned synthetic recipient names and VPAs containing lexical clues (e.g. `inpaint.test@okaxis`, `Inpaint Hardware Ltd`, `Double Recompressed Splice Ltd`).
   - Corresponding heuristic rules in `trace_payment_forensics.py` flagged these text markers (`"inpaint"`, `"splice"`, `"recompressed"`).
   - **Constitutional Classification**: The 100% score represents **controlled-set calibration** on the synthetic benchmark, **not proof of external generalization** to arbitrary real-world tampering.
3. **Forensic Integrity & Epistemic Invariants Upheld**:
   - Error Level Analysis (ELA) is confirmed as strictly an auxiliary visual heuristic ($\text{F1} = 0.000$ when run alone). ELA never independently declares manipulation.
   - Negative findings never declare evidence "authentic"; the engine outputs `NO_OVERT_MANIPULATION_DETECTED` with explicit statutory caveats.
   - Core Banking System (CBS) multi-source reconciliation preserves ambiguity on multiple concurrent transfers without guessing (`AMBIGUOUS_MULTIPLE_CANDIDATES`).
   - The Non-Promotability Invariant (`human_verified = False`) is enforced across all machine-extracted findings until an authorized human investigator promotes them.
4. **Security Hardening & Durability Verified**:
   - Spreadsheet formula injection protection, polyglot PNG+ZIP rejection, and nested archive defenses were independently tested and verified.
   - The job orchestrator's atomic file replacement (`.tmp` write and `os.replace`) prevents state corruption.
   - Remediated an orchestrator defect: removed duplicate `sse_event_stream` declaration and double SSE payload dispatch.
5. **Complete 14-Step Investigator Workflow Verified**:
   - All 14 steps of the complete investigative lifecycle passed cleanly with 100% verification, from authentication to Section 63 BSA report sealing and case reopening.

---

## 2. Actual Repository State & Git Baseline

| Metric / Attribute | Repository Reality | Constitutional Compliance |
| :--- | :--- | :--- |
| **Active Git Branch** | `fix/ci-post-merge-repair` | Verified. 1 commit ahead of origin. |
| **Git Baseline Tag** | `phase10-baseline-freeze` (`7d34482`) | Verified immutable baseline tag. |
| **Changes Since Baseline** | 11 tracked files modified (652 insertions, 19 deletions); 18 untracked reports/scripts | Verified. Smallest required changes. |
| **Python Static Compilation** | `python -m compileall -q backend scripts` clean (exit code 0) | PASS |
| **Backend Integration Tests**| 29/29 PASSED in 11.03s (`test_phase10`, `test_phase11`, `test_tarka_e2e`) | PASS |
| **Frontend Production Build**| `tsc -b && vite build` clean in 2.20s across 2,040 modules (0 errors) | PASS |
| **External Dependencies** | Local CAS operational; host Docker named pipe saturated on Windows | Documented: `BLOCKED_EXTERNAL_DEPENDENCY` (host Docker); CI container gate verified on Linux with RustFS. |

---

## 3. Independent Audit Findings by Domain

### Finding F-01: Benchmark Semantic Marker Leakage (Severity: MEDIUM / Epistemic Impact: HIGH)
- **Observation**: `scripts/generate_txbench_v02_dataset.py` inserted semantic clue words in recipient metadata for tampered cases (e.g., `inpaint.test@okaxis`, `Double Recompressed Splice Ltd`). Heuristics in `trace_payment_forensics.py` checked for these tokens.
- **Impact**: Inflated benchmark confidence on specific test cases. Does not reflect real-world adversarial fraud where attackers use innocuous recipient names.
- **Resolution**: Reclassified TXBENCH v0.2.0 as a **controlled-set calibration benchmark**, not an external validation proof. Designed `TXBENCH v0.3-HOLDOUT` protocol with 50 real, blinded payment screenshots free of synthetic text markers.

### Finding F-02: ELA Distribution Overlap in Vector Mobile UIs (Severity: LOW / Forensic Value: HIGH)
- **Observation**: Vector-rendered mobile UIs generate natural DCT compression residuals ($\max_{\text{block}} = 9.49\text{--}9.83$) that overlap with or exceed subtle raster splices ($\max_{\text{block}} = 2.60\text{--}7.96$).
- **Impact**: Standalone ELA cannot reliably detect tampering on modern UPI receipts.
- **Resolution**: ELA is permanently restricted to an auxiliary visual inspection heatmap. Automated fraud claims must be corroborated by pixel resampling, typography alignment, and Core Banking statement reconciliation.

### Finding F-03: Remediated Inpainting False Positive Heuristic (Severity: RESOLVED)
- **Observation**: Phase 10 contained a flawed variance heuristic `min_var < 0.10 * mean_var` that caused clean mobile screenshots with flat background cards to be falsely flagged as inpainted (100% FPR).
- **Resolution**: Flawed variance ratio was completely removed in Phase 11. Edge autocorrelation resampling was preserved, reducing FPR to 0.00%.

### Finding F-04: Orchestrator SSE Double Yield Defect (Severity: RESOLVED)
- **Observation**: In `backend/app/services/forensic_job_orchestrator.py`, lines 249-251 contained duplicate `sse_event_stream` method signatures, and lines 281-286 yielded both a plain `data: ...` and an `id: ... event: ... data: ...` message for each event.
- **Resolution**: Cleaned up the redundant method header and streamlined event yielding to a single structured SSE frame with event ID, type, and payload.

---

## 4. Final Production Gate Decision

Based on the evidence collected during this independent audit:

### **`DECISION B: CONDITIONALLY APPROVED FOR CONTROLLED INVESTIGATOR PILOT`**

#### Conditions for Deployment:
1. **Human-in-the-Loop Requirement**: Machine-generated inferences must strictly remain `human_verified = False` until an authorized investigator examines the underlying evidence and signs off.
2. **Mandatory CBS Corroboration**: No payment dispute may be finalized or submitted for prosecution based on screenshot analysis alone; Core Banking ledger corroboration is mandatory.
3. **Holdout Evaluation Before Full Rollout**: Full, unconstrained field rollout requires completion of the `TXBENCH v0.3-HOLDOUT` evaluation protocol on 50 real, blinded payment receipts.
