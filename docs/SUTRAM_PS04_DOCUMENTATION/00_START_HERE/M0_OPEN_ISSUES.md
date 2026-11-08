# TARKA SUTRAM 2026 PS04: M0 OPEN ISSUES & DEFECT LOG
## Known Boundary Conditions, Test Environment Findings & Technical Debt

**Document Version:** 1.0.0-PS04-OPEN-ISSUES  
**Date:** November 5, 2026  
**Auditor:** Principal Software Architect & QA Lead  
**Status:** ALL ISSUES DOCUMENTED & CONTROLLED (ZERO CRITICAL BLOCKERS)  

---

# 1. ISSUE LOG SUMMARY

```
+---------------------------------------------------------------------------------------------------------+
| TARKA M0 OPEN ISSUES LOG                                                                                |
+----+-----------------------------+----------+-----------------------------------+----------------------+
| ID | Issue Description           | Severity | Root Cause                        | Mitigation / Fix     |
+----+-----------------------------+----------+-----------------------------------+----------------------+
| 01 | Test Crossover Mutation on  | LOW      | Sequential run of `test_phase4c`  | Reset to unreviewed  |
|    | `evidence_dna.json`         |          | writes live review to disk case.  | baseline in fixture. |
+----+-----------------------------+----------+-----------------------------------+----------------------+
| 02 | High-Concurrency Vitest     | LOW      | 8 parallel Node worker processes  | Run with `--isolate  |
|    | Single-Thread Timer Spikes  |          | spike Windows CPU scheduler.      | false` (2.34s, 37/37)|
+----+-----------------------------+----------+-----------------------------------+----------------------+
| 03 | Deprecation Warning in      | INFO     | `starlette.formparsers` imports   | Harmless runtime     |
|    | Starlette `python-multipart`|          | `multipart` deprecated alias.     | warning; no impact.  |
+----+-----------------------------+----------+-----------------------------------+----------------------+
| 04 | Vite Chunk Size Warning     | INFO     | `index.js` bundle is 2.8MB        | Expected in single-  |
|    |                             |          | due to embedded D3 / XYFlow graphs| page forensics desk. |
+----+-----------------------------+----------+-----------------------------------+----------------------+
```

### Assessment:
None of the above issues represent functional defects, security vulnerabilities, or blockers to Milestone M1. All issues are categorized as **INFO / LOW** and are documented with clear mitigations.

