from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.interaction import InteractionContext


class ContextReferenceType(str, Enum):
    """Types of indexical/contextual references resolved by the engine."""
    PERSON = "PERSON"
    ENTITY = "ENTITY"
    RELATIONSHIP = "RELATIONSHIP"
    EVIDENCE = "EVIDENCE"
    CLAIM = "CLAIM"
    RESULT_ITEM = "RESULT_ITEM"
    TEMPORAL = "TEMPORAL"
    SPATIAL = "SPATIAL"
    GRAPH_HOP = "GRAPH_HOP"
    FILTER = "FILTER"
    LENS = "LENS"


class ContextResolutionStatus(str, Enum):
    """Deterministic status resulting from reference resolution."""
    RESOLVED = "RESOLVED"
    AMBIGUOUS = "AMBIGUOUS"
    UNRESOLVED = "UNRESOLVED"
    INVALID = "INVALID"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"
    STALE = "STALE"
    UNAUTHORIZED = "UNAUTHORIZED"


class ContextEventType(str, Enum):
    """Explicit, immutable transitions on the investigation context stack."""
    CONTEXT_REFERENCE_CREATED = "CONTEXT_REFERENCE_CREATED"
    CONTEXT_REFERENCE_RESOLVED = "CONTEXT_REFERENCE_RESOLVED"
    CONTEXT_REFERENCE_AMBIGUOUS = "CONTEXT_REFERENCE_AMBIGUOUS"
    CONTEXT_REFERENCE_REJECTED = "CONTEXT_REFERENCE_REJECTED"
    CONTEXT_REFERENCE_CORRECTED = "CONTEXT_REFERENCE_CORRECTED"
    CONTEXT_FILTER_ADDED = "CONTEXT_FILTER_ADDED"
    CONTEXT_FILTER_REMOVED = "CONTEXT_FILTER_REMOVED"
    CONTEXT_SELECTION_CHANGED = "CONTEXT_SELECTION_CHANGED"
    CONTEXT_RESET = "CONTEXT_RESET"
    CONTEXT_CASE_CHANGED = "CONTEXT_CASE_CHANGED"


class ContextFailureCode(str, Enum):
    """Governed failure taxonomy for investigation context."""
    CONTEXT_MISSING = "CONTEXT_MISSING"
    CONTEXT_STALE = "CONTEXT_STALE"
    CONTEXT_AMBIGUOUS = "CONTEXT_AMBIGUOUS"
    CONTEXT_OUT_OF_SCOPE = "CONTEXT_OUT_OF_SCOPE"
    CONTEXT_UNAUTHORIZED = "CONTEXT_UNAUTHORIZED"
    REFERENCE_NOT_FOUND = "REFERENCE_NOT_FOUND"
    RESULT_SET_EXPIRED = "RESULT_SET_EXPIRED"
    CASE_CONTEXT_RESET = "CASE_CONTEXT_RESET"
    AUTHORIZATION_CHANGED = "AUTHORIZATION_CHANGED"
    CLARIFICATION_REQUIRED = "CLARIFICATION_REQUIRED"


class TemporalContextReference(BaseModel):
    """
    Deterministic structural representation of temporal follow-ups.
    Never persists ambiguous raw relative strings without normalization.
    """
    reference_time: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    resolved_start: Optional[str] = None
    resolved_end: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    resolution_method: str = "RELATIVE_TO_CANONICAL_REFERENCE"
    relative_expression: Optional[str] = None


class ResultSetReference(BaseModel):
    """
    Bounded result-set reference representing active candidate entities or connections.
    Does NOT store raw evidence bytes or arbitrary data payloads.
    """
    result_set_id: str = Field(default_factory=generate_uuid7)
    source_command_id: Optional[str] = None
    case_id: str
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    query_signature: str = ""
    entity_ids: List[str] = Field(default_factory=list)
    relationship_ids: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    filters: Dict[str, Any] = Field(default_factory=dict)
    sort_by: Optional[str] = None
    limit: int = 50
    is_stale: bool = False


class ContextCandidate(BaseModel):
    """A scored candidate target for reference resolution."""
    candidate_id: str
    candidate_type: str  # PERSON, VEHICLE, PHONE, RELATIONSHIP, EVIDENCE, etc.
    display_label: str
    confidence_score: float = 0.0
    provenance_details: Dict[str, Any] = Field(default_factory=dict)


class ContextEvent(BaseModel):
    """
    Immutable audit record of a context transition.
    """
    event_id: str = Field(default_factory=generate_uuid7)
    event_type: ContextEventType
    context_id: str
    case_id: str
    session_id: str
    previous_version: int
    new_version: int
    payload: Dict[str, Any] = Field(default_factory=dict)
    reason: Optional[str] = None
    correlation_id: str = Field(default_factory=generate_uuid7)
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class ContextResolutionResult(BaseModel):
    """
    The output contract of ContextReferenceResolver.
    """
    status: ContextResolutionStatus
    reference_type: Optional[ContextReferenceType] = None
    resolved_id: Optional[str] = None
    resolved_value: Any = None
    candidates: List[ContextCandidate] = Field(default_factory=list)
    ambiguity_reason: Optional[str] = None
    clarification_prompt: Optional[str] = None
    failure_code: Optional[ContextFailureCode] = None
    context_id: str = ""
    version: int = 1
    correlation_id: str = Field(default_factory=generate_uuid7)
    latency_ms: float = 0.0


class InvestigationContextSnapshot(BaseModel):
    """
    CANONICAL INVESTIGATION CONTEXT SNAPSHOT (Subphase A3).

    Deterministic, typed, versioned, case-bound state of the active investigation.
    Maintains active focus, recent selections, result sets, filters, and evidence thread
    without mutating canonical evidence authority.
    """
    context_id: str = Field(default_factory=generate_uuid7)
    session_id: str = "SES-DEFAULT"
    case_id: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    version: int = 1

    # Active Focus
    objective: Optional[str] = None
    active_lens: str = "Network"
    selected_entity_id: Optional[str] = None
    selected_relationship_id: Optional[str] = None
    selected_evidence_ids: List[str] = Field(default_factory=list)
    selected_claim_id: Optional[str] = None

    # Query & Result Context
    result_set: Optional[ResultSetReference] = None
    active_filters: Dict[str, Any] = Field(default_factory=dict)
    active_time_range: Optional[TemporalContextReference] = None
    active_location: Optional[Dict[str, Any]] = None

    # Lineage & History
    last_intent_name: Optional[str] = None
    last_command_id: Optional[str] = None
    last_result_status: Optional[str] = None
    recent_selections: List[Dict[str, Any]] = Field(default_factory=list)
    recent_references: List[Dict[str, Any]] = Field(default_factory=list)
    evidence_thread: List[Dict[str, Any]] = Field(default_factory=list)

    # Metadata & Correlation
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    correlation_id: str = Field(default_factory=generate_uuid7)

    def to_interaction_context(self) -> InteractionContext:
        """Project snapshot to lightweight InteractionContext for legacy/command compatibility."""
        time_win = None
        if self.active_time_range and self.active_time_range.resolved_start:
            time_win = [
                self.active_time_range.resolved_start,
                self.active_time_range.resolved_end or datetime.now(UTC).isoformat(),
            ]

        filt_list = []
        for k, v in self.active_filters.items():
            if isinstance(v, list):
                filt_list.extend([f"{k}:{item}" for item in v])
            else:
                filt_list.append(f"{k}:{v}")

        return InteractionContext(
            case_id=self.case_id,
            jurisdiction=self.jurisdiction,
            selected_entity_id=self.selected_entity_id,
            selected_relationship_id=self.selected_relationship_id,
            selected_evidence_id=self.selected_evidence_ids[0] if self.selected_evidence_ids else None,
            selected_claim_id=self.selected_claim_id,
            active_filters=filt_list,
            time_window=time_win,
        )

    def create_next_version(
        self,
        updates: Dict[str, Any],
        correlation_id: Optional[str] = None,
    ) -> tuple[InvestigationContextSnapshot, ContextEvent]:
        """
        Create a new immutable version snapshot while preserving lineage.
        """
        next_ver = self.version + 1
        data = self.model_dump()
        data.update(updates)
        data["version"] = next_ver
        data["updated_at"] = datetime.now(UTC).isoformat()
        if correlation_id:
            data["correlation_id"] = correlation_id

        # Maintain recent selection stack
        if "selected_entity_id" in updates and updates["selected_entity_id"]:
            sel_entry = {
                "type": "ENTITY",
                "id": updates["selected_entity_id"],
                "timestamp": datetime.now(UTC).isoformat(),
            }
            rec_sels = list(data.get("recent_selections", []))
            rec_sels.insert(0, sel_entry)
            data["recent_selections"] = rec_sels[:10]

        new_snapshot = InvestigationContextSnapshot(**data)
        event = ContextEvent(
            event_type=ContextEventType.CONTEXT_SELECTION_CHANGED if "selected_entity_id" in updates else ContextEventType.CONTEXT_REFERENCE_RESOLVED,
            context_id=self.context_id,
            case_id=self.case_id,
            session_id=self.session_id,
            previous_version=self.version,
            new_version=next_ver,
            payload=updates,
            correlation_id=correlation_id or self.correlation_id,
        )
        return new_snapshot, event

    def reset_for_case(
        self,
        new_case_id: str,
        jurisdiction: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> tuple[InvestigationContextSnapshot, ContextEvent]:
        """
        Case-boundary invariant: Invalidate all case-scoped references when case changes.
        Never leak selections, result sets, or evidence across cases.
        """
        next_ver = self.version + 1
        new_snapshot = InvestigationContextSnapshot(
            context_id=generate_uuid7(),
            session_id=self.session_id,
            case_id=new_case_id,
            jurisdiction=jurisdiction or self.jurisdiction,
            version=next_ver,
            active_lens=self.active_lens,
            selected_entity_id=None,
            selected_relationship_id=None,
            selected_evidence_ids=[],
            selected_claim_id=None,
            result_set=None,
            active_filters={},
            active_time_range=None,
            active_location=None,
            recent_selections=[],
            recent_references=[],
            evidence_thread=[],
            correlation_id=correlation_id or generate_uuid7(),
        )
        event = ContextEvent(
            event_type=ContextEventType.CONTEXT_CASE_CHANGED,
            context_id=new_snapshot.context_id,
            case_id=new_case_id,
            session_id=self.session_id,
            previous_version=self.version,
            new_version=next_ver,
            payload={"previous_case_id": self.case_id, "new_case_id": new_case_id},
            reason="Investigator switched active case scope. Reset case-bound references.",
            correlation_id=correlation_id or new_snapshot.correlation_id,
        )
        return new_snapshot, event
