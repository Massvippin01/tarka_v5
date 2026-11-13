# SENTINELX NEXUS — AI Governance & Voice Security Specification

## 1. Voice Security Boundaries
1. **VOICE ≠ AUTHORIZATION**: Voice recognition serves strictly as an input modality. Speech recognition confidence is NEVER used as proof of investigator identity or permission level.
2. **High-Risk Action Confirmation Safeguard**: Consequential actions (modifying records, deleting evidence, changing permissions) REQUIRE explicit investigator preview confirmation (`YOU SAID` / `INTERPRETED AS` / `ACTION` / `SCOPE`) before execution. Voice commands NEVER silently execute high-risk operations.
3. **Auditability**: Every processed voice command is logged in `AuditService` with transcript, interpreted intent, scope, authorization decision, confirmation state, and resulting domain events.

## 2. Realtime Event & Copilot Immutability
1. **Scoped Subscriptions**: Realtime domain events (`CASE_UPDATED`, `EVIDENCE_ADDED`, `ANALYTICAL_SIGNAL_CREATED`) are filtered by active case and jurisdiction before delivery (`REALTIME EVENT ≠ TRUSTED UNRESTRICTED DATA`).
2. **AI Copilot Result Immutability**: Completed Copilot answers remain immutable and auditable when new evidence arrives. Incoming events surface a non-blocking banner (`"1 new evidence record received since analysis began"`) offering:
   - `[REVIEW NEW EVIDENCE]`
   - `[RE-RUN ANALYSIS]`
   - `[KEEP CURRENT RESULT]`
3. **No Unverified Hallucinations**: Ground-truth claim verification validates entity, relationship, and evidence references against `UnifiedStore` ground truth before returning answers.
