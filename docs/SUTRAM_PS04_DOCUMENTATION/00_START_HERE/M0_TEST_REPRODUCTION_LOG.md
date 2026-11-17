# TARKA SUTRAM 2026 PS04: M0 TEST REPRODUCTION LOG
## Clean-Room Execution Metrics, Timing Logs & Test Count Ledger

**Document Version:** 1.0.0-PS04-TEST-LOG  
**Date:** November 5, 2026  
**Auditor:** Principal Software Architect & QA Lead  
**Repository Branch:** `feat/sutram-2026-ps04-member-b`  
**Git Baseline Commit:** `976a6e4`  

---

# 1. TEST SUITE REPRODUCTION LEDGER

All commands executed in Windows PowerShell from the repo root (`C:\PROJECTS\tarka_v5`):

```
+---------------------------------------------------------------------------------------------------------+
| TARKA REPRODUCED TEST SUITE EXECUTION LEDGER                                                            |
+----+----------------------------+-----------------------------+-------+--------+--------+---------------+
| #  | Subsystem Suite            | Exact Command               | Total | Passed | Failed | Duration (Exit|
+----+----------------------------+-----------------------------+-------+--------+--------+---------------+
| 01 | Canonical Contracts V1     | `pytest backend/tests/test_`| 15    | 15     | 0      | 2.90s (Exit 0)|
|    |                            | `canonical_contracts_v1.py` |       |        |        |               |
| 02 | Specialized PS04 Suite     | `pytest backend/tests/ -k`  | 41    | 41     | 0      | 85.11s(Exit 0)|
|    |                            | `ps04`                      |       |        |        |               |
| 03 | Core Forensics Suite       | `pytest backend/tests_tarka/` 317   | 317    | 0      | 29.94s(Exit 0)|
| 04 | Frontend Vitest Unit Suite | `cd frontend && npx vitest` | 37    | 37     | 0      | 2.34s (Exit 0)|
|    |                            | `run --isolate false`       |       |        |        |               |
| 05 | Frontend Production Build  | `cd frontend && npm run`    | 2,901 | 2,901  | 0      | 22.86s(Exit 0)|
|    |                            | `build` (modules)           |       |        |        |               |
+----+----------------------------+-----------------------------+-------+--------+--------+---------------+
|    | TOTAL AUTOMATED TEST CASES |                             | 410   | 410    | 0      | 100% GREEN    |
+----+----------------------------+-----------------------------+-------+--------+--------+---------------+
```

---

# 2. TEST COUNT NON-OVERLAPPING AUDIT (ZERO DOUBLE-COUNTING)

To mathematically verify that no tests are counted twice:

1. **Suite 1: Canonical Contracts V1 (`backend/tests/test_canonical_contracts_v1.py`):**
   - 15 test functions (`test_canonical_case_roundtrip`, `test_canonical_evidence_sha256_validation`, etc.).
   - Explicitly excluded by `-k ps04` in Suite 2 (deselected: 1037 items).
2. **Suite 2: Specialized PS04 Suite (`backend/tests/test_ps04_*.py`):**
   - 41 test functions across 8 files (`test_ps04_bft.py` (4), `test_ps04_claim_compiler.py` (5), `test_ps04_counterfactual.py` (2), `test_ps04_distributed_events.py` (6), `test_ps04_formal_verification.py` (5), `test_ps04_psi.py` (9), `test_ps04_vector_clock.py` (4), `test_ps04_zkp.py` (6)).
3. **Suite 3: Core Forensics Suite (`backend/tests_tarka/`):**
   - 317 test functions across 23 test modules under `backend/tests_tarka/tests/`. Completely separate directory tree from `backend/tests/`.
4. **Suite 4: Frontend Vitest Suite (`frontend/src/**/__tests__/*.test.ts`):**
   - 37 test functions across 8 files:
     - `benchmark.test.ts` (6)
     - `canonicalV1.test.ts` (4)
     - `deriveGateVerdict.test.ts` (4)
     - `forensicCrypto.test.ts` (7)
     - `investigationReconstructor.test.ts` (6)
     - `layoutNetwork.test.ts` (3)
     - `recoveryModel.test.ts` (3)
     - `statutoryDirectives.test.ts` (4)

**Total distinct automated test cases = $15 + 41 + 317 + 37 = 410$ tests.** Zero double-counting verified.

