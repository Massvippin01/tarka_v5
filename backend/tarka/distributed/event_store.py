"""
TARKA SUTRAM 2026 — WORKSTREAM B3
Append-Only Distributed Event Sourcing Engine with Idempotency, Conflict Detection, and Replay.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional, Set

from .event_envelope import EventEnvelope, EventStatus


class EventStore:
    """
    Append-only distributed event store.
    Enforces idempotency, cryptographic hash-chaining, out-of-order reconciliation,
    and state replay.
    """

    def __init__(self):
        self._events: List[EventEnvelope] = []
        self._events_by_id: Dict[str, EventEnvelope] = {}
        self._idempotency_keys: Dict[str, str] = {}  # idempotency_key -> event_id
        self._latest_chain_digest: str = "GENESIS_ROOT"
        self._institutional_sequences: Dict[str, int] = {}  # institution_id -> max_seq

    def append_event(self, event: EventEnvelope) -> Dict[str, Any]:
        """
        Appends an event to the ledger with strict integrity and idempotency checks.
        Returns a status dictionary.
        """
        # 1. Idempotency Check: if identical idempotency_key was already processed
        if event.idempotency_key in self._idempotency_keys:
            existing_id = self._idempotency_keys[event.idempotency_key]
            existing_event = self._events_by_id[existing_id]
            # If payload commitment matches, return idempotent success without duplicating
            if existing_event.payload_commitment == event.payload_commitment:
                return {
                    "status": "DUPLICATE_IDEMPOTENT_IGNORE",
                    "event_id": existing_id,
                    "message": "Duplicate event delivered; already committed with identical payload.",
                }
            else:
                # Conflicting submission with same key but different payload
                event.event_status = EventStatus.CONFLICTED
                self._record_raw_event(event)
                return {
                    "status": "CONFLICTED_SUBMISSION",
                    "event_id": event.event_id,
                    "message": "Conflict: idempotency key reused with conflicting payload.",
                }

        # 2. Sequence and Out-of-Order Check
        last_seq = self._institutional_sequences.get(event.institution_id, 0)
        if event.sequence_number <= last_seq:
            # Late or out-of-order event
            event.event_status = EventStatus.QUARANTINED
            self._record_raw_event(event)
            return {
                "status": "OUT_OF_ORDER_QUARANTINED",
                "event_id": event.event_id,
                "message": f"Out-of-order event: sequence {event.sequence_number} <= authoritative {last_seq}",
            }

        # 3. Payload Integrity Check
        if not event.verify_payload_integrity():
            event.event_status = EventStatus.QUARANTINED
            self._record_raw_event(event)
            return {
                "status": "PAYLOAD_INTEGRITY_MISMATCH",
                "event_id": event.event_id,
                "message": "Event payload does not match recorded cryptographic commitment.",
            }

        # 4. Normal Chained Commit
        event.prior_event_reference = self._latest_chain_digest
        event_digest = event.compute_envelope_digest()
        self._latest_chain_digest = event_digest
        self._institutional_sequences[event.institution_id] = event.sequence_number

        event.event_status = EventStatus.COMMITTED
        self._record_raw_event(event)
        self._idempotency_keys[event.idempotency_key] = event.event_id

        return {
            "status": "COMMITTED",
            "event_id": event.event_id,
            "chain_digest": event_digest,
            "sequence_number": event.sequence_number,
        }

    def _record_raw_event(self, event: EventEnvelope):
        self._events.append(event)
        self._events_by_id[event.event_id] = event

    def get_event(self, event_id: str) -> Optional[EventEnvelope]:
        return self._events_by_id.get(event_id)

    def get_all_events(self) -> List[EventEnvelope]:
        return list(self._events)

    def verify_chain_integrity(self) -> Tuple[bool, Optional[str]]:
        """
        Verifies the cryptographic Merkle hash-chain across all committed events.
        Detects historical tampering.
        """
        expected_prev = "GENESIS_ROOT"
        for i, ev in enumerate(self._events):
            if ev.event_status != EventStatus.COMMITTED:
                continue
            if ev.prior_event_reference != expected_prev:
                return False, f"Broken chain at index {i} (event {ev.event_id}): expected {expected_prev}, got {ev.prior_event_reference}"
            expected_prev = ev.compute_envelope_digest()
        return True, None

    def replay_state(self, correlation_id: str, up_to_sequence: Optional[int] = None) -> Dict[str, Any]:
        """
        Reconstructs the authoritative domain state for a given correlation_id
        by sequentially replaying committed events.
        """
        state: Dict[str, Any] = {
            "correlation_id": correlation_id,
            "flagged_accounts": set(),
            "frozen_accounts": set(),
            "evidence_items": [],
            "total_events_replayed": 0,
            "last_replayed_timestamp": 0.0,
        }

        for ev in self._events:
            if ev.correlation_id != correlation_id:
                continue
            if ev.event_status != EventStatus.COMMITTED:
                continue
            if up_to_sequence is not None and ev.sequence_number > up_to_sequence:
                break

            # Apply state transition
            state["total_events_replayed"] += 1
            state["last_replayed_timestamp"] = ev.source_timestamp

            if ev.event_type.value == "TRANSACTION_FLAGGED":
                acc = ev.payload.get("account_number")
                if acc:
                    state["flagged_accounts"].add(acc)
            elif ev.event_type.value == "FREEZE_DIRECTIVE_ISSUED":
                acc = ev.payload.get("target_account")
                if acc:
                    state["frozen_accounts"].add(acc)
            elif ev.event_type.value == "EVIDENCE_INGESTED":
                item_id = ev.payload.get("artifact_id")
                if item_id:
                    state["evidence_items"].append(item_id)

        # Convert sets to sorted lists for JSON serialization
        state["flagged_accounts"] = sorted(list(state["flagged_accounts"]))
        state["frozen_accounts"] = sorted(list(state["frozen_accounts"]))
        return state

