from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional, Tuple
from threading import RLock

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.investigation_context import (
    ContextEvent,
    ContextEventType,
    InvestigationContextSnapshot,
    ResultSetReference,
    TemporalContextReference,
)

logger = logging.getLogger("sentinelx.interaction.context_manager")


class InvestigationContextManager:
    """
    CANONICAL INVESTIGATION CONTEXT MANAGER (Subphase A3).

    Maintains active investigation context stacks, event lineages, and case-bound
    isolation across all sessions. Ensures deterministic rehydration, versioning,
    and audit logging for context transitions.
    """

    _instance: Optional[InvestigationContextManager] = None

    def __init__(self) -> None:
        self._lock = RLock()
        # Key: (session_id, case_id) -> InvestigationContextSnapshot
        self._snapshots: Dict[Tuple[str, str], InvestigationContextSnapshot] = {}
        # Key: (session_id, case_id) -> List[ContextEvent]
        self._event_logs: Dict[Tuple[str, str], List[ContextEvent]] = {}
        # Key: session_id -> active_case_id
        self._session_active_cases: Dict[str, str] = {}

    @classmethod
    def get_instance(cls) -> InvestigationContextManager:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _get_key(self, session_id: str, case_id: str) -> Tuple[str, str]:
        return (session_id or "SES-DEFAULT", case_id or "CASE-2026-001")

    def get_current_snapshot(
        self,
        session_id: str = "SES-DEFAULT",
        case_id: str = "CASE-2026-001",
        jurisdiction: str = "Delhi NCR / Special Cell",
    ) -> InvestigationContextSnapshot:
        """
        Get or initialize the canonical snapshot for a session and case.
        """
        with self._lock:
            key = self._get_key(session_id, case_id)
            if key not in self._snapshots:
                snap = InvestigationContextSnapshot(
                    context_id=generate_uuid7(),
                    session_id=session_id,
                    case_id=case_id,
                    jurisdiction=jurisdiction,
                    version=1,
                )
                self._snapshots[key] = snap
                init_event = ContextEvent(
                    event_type=ContextEventType.CONTEXT_REFERENCE_CREATED,
                    context_id=snap.context_id,
                    case_id=case_id,
                    session_id=session_id,
                    previous_version=0,
                    new_version=1,
                    payload={"action": "INITIALIZE_CONTEXT"},
                    reason="Initial context creation for session and case",
                    correlation_id=snap.correlation_id,
                )
                self._event_logs[key] = [init_event]
                self._session_active_cases[session_id] = case_id
            return self._snapshots[key]

    def set_selection(
        self,
        session_id: str,
        case_id: str,
        entity_id: Optional[str] = None,
        relationship_id: Optional[str] = None,
        evidence_ids: Optional[List[str]] = None,
        claim_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> InvestigationContextSnapshot:
        """
        Update active selection focus on the context snapshot.
        """
        with self._lock:
            current = self.get_current_snapshot(session_id, case_id)
            updates: Dict[str, Any] = {}
            if entity_id is not None:
                updates["selected_entity_id"] = entity_id
            if relationship_id is not None:
                updates["selected_relationship_id"] = relationship_id
            if evidence_ids is not None:
                updates["selected_evidence_ids"] = list(evidence_ids)
            if claim_id is not None:
                updates["selected_claim_id"] = claim_id

            new_snap, event = current.create_next_version(updates, correlation_id=correlation_id)
            key = self._get_key(session_id, case_id)
            self._snapshots[key] = new_snap
            self._event_logs.setdefault(key, []).append(event)
            return new_snap

    def set_result_set(
        self,
        session_id: str,
        case_id: str,
        result_set: ResultSetReference,
        correlation_id: Optional[str] = None,
    ) -> InvestigationContextSnapshot:
        """
        Record a newly produced result set in the context snapshot.
        """
        with self._lock:
            current = self.get_current_snapshot(session_id, case_id)
            new_snap, event = current.create_next_version(
                {"result_set": result_set},
                correlation_id=correlation_id,
            )
            key = self._get_key(session_id, case_id)
            self._snapshots[key] = new_snap
            self._event_logs.setdefault(key, []).append(event)
            return new_snap

    def add_filter(
        self,
        session_id: str,
        case_id: str,
        filter_key: str,
        filter_value: Any,
        correlation_id: Optional[str] = None,
    ) -> InvestigationContextSnapshot:
        """
        Add or update an analytical filter in the context snapshot.
        """
        with self._lock:
            current = self.get_current_snapshot(session_id, case_id)
            filters = dict(current.active_filters)
            filters[filter_key] = filter_value
            new_snap, event = current.create_next_version(
                {"active_filters": filters},
                correlation_id=correlation_id,
            )
            event.event_type = ContextEventType.CONTEXT_FILTER_ADDED
            event.payload = {"active_filters": filters, "filter_key": filter_key, "filter_value": filter_value}
            key = self._get_key(session_id, case_id)
            self._snapshots[key] = new_snap
            self._event_logs.setdefault(key, []).append(event)
            return new_snap

    def remove_filter(
        self,
        session_id: str,
        case_id: str,
        filter_key: str,
        correlation_id: Optional[str] = None,
    ) -> InvestigationContextSnapshot:
        """
        Remove an analytical filter from the context snapshot.
        """
        with self._lock:
            current = self.get_current_snapshot(session_id, case_id)
            filters = dict(current.active_filters)
            if filter_key in filters:
                del filters[filter_key]
            new_snap, event = current.create_next_version(
                {"active_filters": filters},
                correlation_id=correlation_id,
            )
            event.event_type = ContextEventType.CONTEXT_FILTER_REMOVED
            event.payload = {"active_filters": filters, "removed_filter_key": filter_key}
            key = self._get_key(session_id, case_id)
            self._snapshots[key] = new_snap
            self._event_logs.setdefault(key, []).append(event)
            return new_snap

    def apply_correction(
        self,
        session_id: str,
        case_id: str,
        target_id: str,
        target_type: str = "ENTITY",
        correlation_id: Optional[str] = None,
    ) -> InvestigationContextSnapshot:
        """
        Explicitly apply a user correction (e.g. "No, I meant P002").
        Emits CONTEXT_REFERENCE_CORRECTED event.
        """
        with self._lock:
            current = self.get_current_snapshot(session_id, case_id)
            updates: Dict[str, Any] = {}
            if target_type == "ENTITY":
                updates["selected_entity_id"] = target_id
            elif target_type == "RELATIONSHIP":
                updates["selected_relationship_id"] = target_id
            elif target_type == "EVIDENCE":
                updates["selected_evidence_ids"] = [target_id]

            new_snap, event = current.create_next_version(updates, correlation_id=correlation_id)
            event.event_type = ContextEventType.CONTEXT_REFERENCE_CORRECTED
            event.payload = {**updates, "target_id": target_id, "target_type": target_type}
            event.reason = f"Investigator corrected target reference to '{target_id}'."
            key = self._get_key(session_id, case_id)
            self._snapshots[key] = new_snap
            self._event_logs.setdefault(key, []).append(event)
            return new_snap

    def reset_case_context(
        self,
        session_id: str,
        new_case_id: str,
        jurisdiction: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> InvestigationContextSnapshot:
        """
        Reset case-bound references when investigator switches case scope.
        Strict Case Boundary Invariant: Invalidate all selections and result sets.
        """
        with self._lock:
            old_case = self._session_active_cases.get(session_id, "CASE-2026-001")
            old_key = self._get_key(session_id, old_case)
            old_snap = self._snapshots.get(old_key) or self.get_current_snapshot(session_id, old_case)

            new_snap, event = old_snap.reset_for_case(
                new_case_id=new_case_id,
                jurisdiction=jurisdiction,
                correlation_id=correlation_id,
            )

            new_key = self._get_key(session_id, new_case_id)
            self._snapshots[new_key] = new_snap
            self._session_active_cases[session_id] = new_case_id
            self._event_logs.setdefault(new_key, []).append(event)
            return new_snap

    def record_command_execution(
        self,
        session_id: str,
        case_id: str,
        command_id: str,
        intent_name: str,
        status: str,
        output_data: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ) -> InvestigationContextSnapshot:
        """
        Update context snapshot with results of a dispatched command.
        Updates last_command_id, last_intent_name, and extends evidence thread.
        """
        with self._lock:
            current = self.get_current_snapshot(session_id, case_id)
            updates: Dict[str, Any] = {
                "last_command_id": command_id,
                "last_intent_name": intent_name,
                "last_result_status": status,
            }

            # If command produced entities or relationships, update evidence thread
            if output_data and status == "SUCCESS":
                thread = list(current.evidence_thread)
                thread.append({
                    "command_id": command_id,
                    "intent": intent_name,
                    "timestamp": datetime.now(UTC).isoformat(),
                    "summary": f"Executed {intent_name}",
                })
                updates["evidence_thread"] = thread[-20:]  # keep last 20 thread entries

            new_snap, event = current.create_next_version(updates, correlation_id=correlation_id)
            key = self._get_key(session_id, case_id)
            self._snapshots[key] = new_snap
            self._event_logs.setdefault(key, []).append(event)
            return new_snap

    def get_history(self, session_id: str, case_id: str) -> List[ContextEvent]:
        """Retrieve the immutable audit event log for the active context."""
        with self._lock:
            key = self._get_key(session_id, case_id)
            return list(self._event_logs.get(key, []))

    def replay_context(
        self,
        session_id: str,
        case_id: str,
        target_version: Optional[int] = None,
    ) -> InvestigationContextSnapshot:
        """
        Deterministically reconstruct context state up to target_version from the event log.
        """
        with self._lock:
            key = self._get_key(session_id, case_id)
            events = self._event_logs.get(key, [])
            if not events:
                return self.get_current_snapshot(session_id, case_id)

            # Reconstruct from initial state
            snapshot = InvestigationContextSnapshot(
                context_id=events[0].context_id,
                session_id=session_id,
                case_id=case_id,
                version=1,
            )

            for evt in events:
                if target_version is not None and evt.new_version > target_version:
                    break
                if evt.event_type == ContextEventType.CONTEXT_CASE_CHANGED:
                    snapshot = InvestigationContextSnapshot(
                        context_id=evt.context_id,
                        session_id=session_id,
                        case_id=evt.case_id,
                        version=evt.new_version,
                    )
                else:
                    data = snapshot.model_dump()
                    data.update(evt.payload)
                    data["version"] = evt.new_version
                    snapshot = InvestigationContextSnapshot(**data)

            return snapshot
