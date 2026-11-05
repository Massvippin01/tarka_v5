"""
TARKA SUTRAM 2026 — WORKSTREAM B3
Append-Only Distributed Event Sourcing Engine with Idempotency, Causal Dependency Tracking,
Institution-Level Isolation, and Replay.

Provides the foundational distributed event fabric for TARKA multi-institution coordination.
"""

from __future__ import annotations

import copy
import hashlib
import json
import time
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

from tarka.contracts.canonical_v1 import (
    CanonicalInstitutionEvent,
    EventValidationState,
    InstitutionEventType,
)
from tarka.distributed.event_envelope import EventEnvelope, EventStatus, EventType
from tarka.distributed.vector_clock import CausalRelation, VectorClock


class DistributedEventFabric:
    """
    Append-only distributed event sourcing engine.
    Enforces idempotency, cryptographic hash-chaining, causal dependency buffering,
    institution-level access isolation, and deterministic replay.
    """

    def __init__(self):
        self._events: List[EventEnvelope] = []
        self._events_by_id: Dict[str, EventEnvelope] = {}
        self._idempotency_keys: Dict[str, str] = {}  # idempotency_key -> event_id
        self._latest_chain_digest: str = "GENESIS_ROOT"
        self._institutional_sequences: Dict[str, int] = {}  # institution_id -> max_seq
        self._delivered_vector_clocks: Dict[str, VectorClock] = {}  # institution_id -> VectorClock
        self._global_delivered_vector_clock: VectorClock = VectorClock()

        # Causal dependency holding buffer: {event_id: EventEnvelope}
        self._pending_causal_buffer: Dict[str, EventEnvelope] = {}

        # Tenant/Institution authorized scopes: {institution_id: Set[case_id]}
        self._institution_case_authorizations: Dict[str, Set[str]] = {}

        # Listeners for event subscription
        self._event_listeners: List[Callable[[EventEnvelope], None]] = []

    def register_case_authorization(self, institution_id: str, case_id: str) -> None:
        """Grants an institution legal authority to observe or emit events for a case."""
        if institution_id not in self._institution_case_authorizations:
            self._institution_case_authorizations[institution_id] = set()
        self._institution_case_authorizations[institution_id].add(case_id)

    def check_access_authorization(self, institution_id: str, case_id: str) -> bool:
        """Enforces tenant-level institutional isolation. Fails closed if unauthorized."""
        if not case_id or case_id == "GLOBAL_AUDIT":
            return True
        authorized = self._institution_case_authorizations.get(institution_id, set())
        return case_id in authorized

    def append_event(
        self,
        event: EventEnvelope | CanonicalInstitutionEvent,
        enforce_access_control: bool = False
    ) -> Dict[str, Any]:
        """
        Appends an event to the ledger with strict integrity, idempotency,
        and causal dependency checks.
        """
        # Convert canonical to envelope if needed
        if isinstance(event, CanonicalInstitutionEvent):
            env = EventEnvelope.from_canonical(event)
        else:
            env = event

        # 0. Access Isolation Check
        if enforce_access_control:
            if not self.check_access_authorization(env.institution_id, env.correlation_id):
                env.event_status = EventStatus.QUARANTINED
                self._record_raw_event(env)
                return {
                    "status": "UNAUTHORIZED_INSTITUTION_ACCESS",
                    "event_id": env.event_id,
                    "message": f"Institution '{env.institution_id}' is not authorized for case '{env.correlation_id}'.",
                }

        # 1. Idempotency Check
        if env.idempotency_key in self._idempotency_keys:
            existing_id = self._idempotency_keys[env.idempotency_key]
            existing_event = self._events_by_id[existing_id]
            if existing_event.payload_commitment == env.payload_commitment:
                return {
                    "status": "DUPLICATE_IDEMPOTENT_IGNORE",
                    "event_id": existing_id,
                    "message": "Duplicate event delivered; already committed with identical payload.",
                }
            else:
                # Conflicting submission with same key but different payload
                env.event_status = EventStatus.CONFLICTED
                self._record_raw_event(env)
                return {
                    "status": "CONFLICTED_SUBMISSION",
                    "event_id": env.event_id,
                    "message": "Conflict: idempotency key reused with conflicting payload.",
                }

        # 2. Sequence and Out-of-Order Check
        last_seq = self._institutional_sequences.get(env.institution_id, 0)
        if env.sequence_number <= last_seq:
            # Late or out-of-order event
            env.event_status = EventStatus.QUARANTINED
            self._record_raw_event(env)
            return {
                "status": "OUT_OF_ORDER_QUARANTINED",
                "event_id": env.event_id,
                "message": f"Out-of-order event: sequence {env.sequence_number} <= authoritative {last_seq}",
            }

        # 3. Payload Integrity Check
        if not env.verify_payload_integrity():
            env.event_status = EventStatus.QUARANTINED
            self._record_raw_event(env)
            return {
                "status": "PAYLOAD_INTEGRITY_MISMATCH",
                "event_id": env.event_id,
                "message": "Event payload does not match recorded cryptographic commitment.",
            }

        # 4. Causal Dependency Check
        # Check if vector clock indicates missing prerequisites from peer nodes
        other_node_deps = {k: v for k, v in env.vector_clock.items() if k != env.institution_id}
        if other_node_deps:
            vc_obj = VectorClock(clock=env.vector_clock)
            is_ready, missing = vc_obj.is_causally_ready(self._global_delivered_vector_clock, env.institution_id)
            if not is_ready:
                # Store in causal buffer waiting for prerequisites
                env.event_status = EventStatus.PENDING
                self._pending_causal_buffer[env.event_id] = env
                self._record_raw_event(env)
                return {
                    "status": "CAUSAL_DEPENDENCY_PENDING",
                    "event_id": env.event_id,
                    "missing_dependencies": missing,
                    "message": "Event held in causal buffer until prerequisite events are delivered.",
                }

        # 5. Normal Chained Commit
        return self._commit_envelope(env)

    def _commit_envelope(self, env: EventEnvelope) -> Dict[str, Any]:
        """Performs immutable chain commitment and updates vector clocks."""
        env.prior_event_reference = self._latest_chain_digest
        event_digest = env.compute_envelope_digest()
        self._latest_chain_digest = event_digest
        self._institutional_sequences[env.institution_id] = env.sequence_number

        # Update delivered vector clocks
        self._global_delivered_vector_clock.tick(env.institution_id)
        if env.institution_id not in self._delivered_vector_clocks:
            self._delivered_vector_clocks[env.institution_id] = VectorClock()
        self._delivered_vector_clocks[env.institution_id].tick(env.institution_id)
        if env.vector_clock:
            self._global_delivered_vector_clock.merge(VectorClock(clock=env.vector_clock))

        env.event_status = EventStatus.COMMITTED
        self._record_raw_event(env)
        self._idempotency_keys[env.idempotency_key] = env.event_id

        # Notify subscribers
        for listener in self._event_listeners:
            try:
                listener(env)
            except Exception:
                pass

        # Check if any buffered events can now be released
        released_events = self._drain_causal_buffer()

        return {
            "status": "COMMITTED",
            "event_id": env.event_id,
            "chain_digest": event_digest,
            "sequence_number": env.sequence_number,
            "released_from_buffer": released_events,
        }

    def _drain_causal_buffer(self) -> List[str]:
        """Examines causal buffer and commits any events whose dependencies are now satisfied."""
        released = []
        progress = True

        while progress:
            progress = False
            for evt_id, buffered_env in list(self._pending_causal_buffer.items()):
                vc_obj = VectorClock(clock=buffered_env.vector_clock)
                is_ready, _ = vc_obj.is_causally_ready(self._global_delivered_vector_clock, buffered_env.institution_id)
                if is_ready:
                    del self._pending_causal_buffer[evt_id]
                    self._commit_envelope(buffered_env)
                    released.append(evt_id)
                    progress = True
                    break
        return released

    def _record_raw_event(self, event: EventEnvelope):
        if event.event_id not in self._events_by_id:
            self._events.append(event)
            self._events_by_id[event.event_id] = event
        else:
            self._events_by_id[event.event_id] = event

    def subscribe(self, listener: Callable[[EventEnvelope], None]) -> None:
        """Register a callback listener for committed events."""
        self._event_listeners.append(listener)

    def get_event(self, event_id: str) -> Optional[EventEnvelope]:
        return self._events_by_id.get(event_id)

    def get_all_events(self) -> List[EventEnvelope]:
        return list(self._events)

    def get_committed_events(self) -> List[EventEnvelope]:
        return [e for e in self._events if e.event_status == EventStatus.COMMITTED]

    def get_events_for_institution(self, institution_id: str) -> List[EventEnvelope]:
        return [e for e in self._events if e.institution_id == institution_id]

    def get_events_for_case(self, case_id: str, requesting_institution_id: Optional[str] = None) -> List[EventEnvelope]:
        """Returns case events with tenant isolation checks."""
        if requesting_institution_id and not self.check_access_authorization(requesting_institution_id, case_id):
            raise PermissionError(f"Institution {requesting_institution_id} unauthorized for case {case_id}")
        return [e for e in self._events if e.correlation_id == case_id]

    def verify_ledger_chain_integrity(self) -> Tuple[bool, Optional[str]]:
        """
        Traverses the full event ledger and mathematically verifies the cryptographic
        chain from genesis to HEAD.
        """
        expected_prior = "GENESIS_ROOT"
        for idx, event in enumerate(self.get_committed_events()):
            if event.prior_event_reference != expected_prior:
                return False, f"Broken chain at index {idx} ({event.event_id}): prior={event.prior_event_reference} != expected={expected_prior}"
            expected_prior = event.compute_envelope_digest()
        return True, None

    verify_chain_integrity = verify_ledger_chain_integrity

    def replay_state(
        self,
        target_or_from_seq: Any = None,
        up_to_sequence: Optional[int] = None,
        from_sequence: int = 1,
        institution_id: Optional[str] = None
    ) -> Any:
        """
        Deterministically replays the event ledger.
        If passed a correlation_id string, returns domain state reconstruction dictionary.
        If passed sequence numbers, returns List[EventEnvelope].
        """
        if isinstance(target_or_from_seq, str):
            # Correlation ID replay mode (B3 specification)
            corr_id = target_or_from_seq
            evidence_items = set()
            flagged_accounts = set()
            frozen_accounts = set()
            replayed_events = []

            for e in self.get_committed_events():
                if e.correlation_id != corr_id:
                    continue
                if up_to_sequence is not None and e.sequence_number > up_to_sequence:
                    continue

                replayed_events.append(e)
                payload = e.payload or {}
                if e.event_type == EventType.EVIDENCE_INGESTED:
                    if "artifact_id" in payload:
                        evidence_items.add(payload["artifact_id"])
                elif e.event_type == EventType.TRANSACTION_FLAGGED:
                    if "account_number" in payload:
                        flagged_accounts.add(payload["account_number"])
                elif e.event_type == EventType.FREEZE_DIRECTIVE_ISSUED:
                    if "target_account" in payload:
                        frozen_accounts.add(payload["target_account"])
                    elif "account_number" in payload:
                        frozen_accounts.add(payload["account_number"])

            return {
                "correlation_id": corr_id,
                "total_events_replayed": len(replayed_events),
                "evidence_items": evidence_items,
                "flagged_accounts": flagged_accounts,
                "frozen_accounts": frozen_accounts,
                "events": replayed_events,
            }

        # Sequence slice replay mode
        start_seq = target_or_from_seq if (target_or_from_seq is not None and isinstance(target_or_from_seq, int)) else from_sequence
        replayed = []
        for e in self.get_committed_events():
            if institution_id and e.institution_id != institution_id:
                continue
            if e.sequence_number < start_seq:
                continue
            if up_to_sequence is not None and e.sequence_number > up_to_sequence:
                continue
            replayed.append(copy.deepcopy(e))
        return replayed


# Backwards-compatible alias for existing tests
EventStore = DistributedEventFabric
