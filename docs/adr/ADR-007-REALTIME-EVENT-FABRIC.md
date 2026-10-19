# ADR-007: Realtime Investigation Event Fabric & Copilot Immutability

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: In dynamic intelligence operations, incoming agency events must update frontend projections without causing full-page reloads or silently altering existing completed AI analytical answers.

## Decision
1. **Server-Sent Events (SSE) Transport**: Implement `GET /api/v1/investigation/events/stream` streaming 17 typed domain events (`CASE_UPDATED`, `EVIDENCE_ADDED`, `ANALYTICAL_SIGNAL_CREATED`, etc.) with sequence ordering and correlation IDs.
2. **Scoped Event Subscriptions**: Subscriptions are scoped by active case and jurisdiction (`REALTIME EVENT ≠ TRUSTED UNRESTRICTED DATA`).
3. **Canonical State Integration**: Incoming events enter through the established `InvestigationContext` without triggering full page reloads. Out-of-order or duplicate events are safely deduplicated.
4. **AI Copilot Result Immutability**: Completed Copilot answers remain auditable and immutable when new evidence arrives. Surfacing a non-blocking banner (`"1 new evidence record received since analysis began"`) offering `[REVIEW NEW EVIDENCE]`, `[RE-RUN ANALYSIS]`, or `[KEEP CURRENT RESULT]`.
5. **Live Connection Status Pill**: Renders explicit connection indicator (`LIVE`, `RECONNECTING`, `OFFLINE`) with sequence counter tracking (`● LIVE | SEQ #14`).

## Consequences
- **Positive**:
  - Live event processing latency < 2.0ms.
  - Zero disruption to active investigator viewports or completed AI reasoning chains.
