---
description: SentinelX Phase Execution
---

# SENTINELX PHASE EXECUTION

Execute exactly one approved SentinelX Wave 6 phase at a time.

## PRE-FLIGHT

1. Inspect the actual repository state.
2. Inspect git status and recent commits.
3. Inspect the relevant existing implementation.
4. Read the applicable Wave 6 phase requirements.
5. Determine what is already implemented.
6. Determine the exact remaining implementation delta.
7. Check all Wave 1–5 architectural invariants.

## IMPLEMENTATION

8. Implement only the required phase scope.
9. Preserve all canonical Waves 1–5 behavior.
10. Prefer the smallest production-safe implementation.
11. Do not add unrelated product features.
12. Do not migrate frameworks unless explicitly approved.

## VERIFICATION

13. Run phase-specific tests.
14. Run the complete regression suite.
15. Run the frontend production build when applicable.
16. Run integration tests when applicable.
17. Run security tests when applicable.
18. Verify actual runtime behavior where required.

## REVIEW

19. Inspect git diff.
20. Check for accidental framework changes.
21. Check evidence and provenance invariants.
22. Check authorization and policy invariants.
23. Check for secrets or unsafe configuration.
24. Check for duplicated or conflicting architecture.
25. Check that mocks are not being represented as production validation.

## REPORT

Produce a structured Artifact containing:

- phase completed
- objective
- implementation summary
- files changed
- architecture impact
- tests executed
- test results
- build results
- integration status
- security status
- runtime verification
- known limitations
- external dependencies
- blockers
- production-readiness classification

## STATE

Update PROJECT_STATE.md using only verified information.

Do not claim completion based on intended behavior.

## CHECKPOINT

After all mandatory verification passes:

1. Review the final diff.
2. Create an atomic phase-level git commit.
3. Record the commit identifier.
4. Stop at the phase boundary.

Do not automatically begin the next phase.

## FAILURE

If a mandatory verification fails:

- stop implementation
- preserve the failure state
- report the exact failure
- identify affected files
- identify the likely cause
- do not fabricate a workaround
- do not silently bypass the failed gate
- do not mark the phase complete

Wait for human direction when the failure requires an architectural,
security, destructive, or irreversible decision.