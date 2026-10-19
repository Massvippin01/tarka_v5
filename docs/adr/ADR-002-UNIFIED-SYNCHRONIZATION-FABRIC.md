# ADR-002: Event-Driven Unified Investigation Synchronization Fabric

- **Status**: Approved & Implemented
- **Date**: 2026-08-30
- **Context**: In fragmented investigation platforms, analysts lose critical context when jumping between disconnected pages (Graph, GIS Map, Timeline, Evidence, Dossier, Copilot). Ad-hoc prop drilling creates stale selection states and uncoordinated component views.

## Decision
1. **Canonical Investigation Context**: Establish a single, durable `InvestigationContext` governing `activeCaseId`, `selectedEntityId`, `selectedRelationshipId`, `selectedEvidenceId`, `selectedEventId`, `selectedLocationId`, `selectedHypothesisId`, shared filters (`timeRange`, `jurisdiction`, `entityFilters`, `relationshipFilters`, `confidenceFilter`), and `canvasMode`.
2. **Domain Event Dispatcher**: Every investigative action emits a typed domain event (`ENTITY_SELECTED`, `RELATIONSHIP_SELECTED`, `EVIDENCE_SELECTED`, `EVENT_SELECTED`, `LOCATION_SELECTED`, `CASE_CHANGED`, `FILTER_CHANGED`).
3. **Bidirectional Surface Synchronization**:
   - **Graph Node Selection**: Updates dossier, evidence, timeline, GIS map marker, and Copilot context without reloading graph viewport.
   - **Graph Edge Selection**: Opens Relationship Inspector modal displaying WHY? breakdown, source records, and evidence citations.
   - **GIS Pin Selection**: Emits `LOCATION_SELECTED`, highlighting associated entity and timeline event.
   - **Timeline Event Selection**: Highlights corresponding WebGL graph node and GIS camera marker.
   - **Copilot Scope Awareness**: Automatically injects active case, entity, relationship, evidence, time window, and jurisdiction into Copilot prompt executions.
4. **Context-Preserving Viewport Switching**: Preserves selected entity, relationship, case, filters, and time window across 2D ↔ 3D ↔ GIS canvas mode toggles.
5. **Safe Session Restoration**: Encodes non-sensitive workspace parameters into URL search strings (`?case=C102&entity=P001&rel=rel-p1-p2&mode=2D`) for session bookmarking/restoration without exposing PII.

## Consequences
- **Positive**:
  - Single point of truth for investigative selections.
  - Zero context loss across mode switches or drawer toggles.
  - High-frequency WebGL rendering state remains local to prevent global React re-renders.
