"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: IDEMPOTENCY & CAUSAL ORDERING MANAGER

Provides deterministic deduplication, out-of-order event detection,
and causal Lamport sequence tracking across asynchronous institutional feeds.
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field


class IngestRecordEntry(BaseModel):
    idempotency_key: str
    event_id: str
    institution_id: str
    sequence_number: int
    source_timestamp_utc: str
    recorded_timestamp_utc: str
    is_out_of_order: bool = False


class IdempotencyManager:
    """
    Guarantees that repeated transmissions of the same event are idempotently handled
    and detects causal delays or sequence inversions.
    """

    def __init__(self):
        # Maps idempotency_key -> IngestRecordEntry
        self._entries: Dict[str, IngestRecordEntry] = {}
        # Tracks highest sequence number seen per institution
        self._highest_sequence: Dict[str, int] = {}
        # Tracks out of order counts
        self._out_of_order_count: int = 0

    @staticmethod
    def generate_idempotency_key(institution_id: str, natural_key: str, payload_hash: str) -> str:
        """Derive deterministic idempotency key from natural key and payload hash."""
        combined = f"{institution_id}::{natural_key}::{payload_hash}"
        return hashlib.sha256(combined.encode("utf-8")).hexdigest()

    def check_and_record(
        self,
        idempotency_key: str,
        event_id: str,
        institution_id: str,
        sequence_number: int,
        source_timestamp_utc: str
    ) -> Tuple[bool, str]:
        """
        Evaluate if event is duplicate, delayed/out-of-order, or fresh.
        Returns:
            (is_accepted, status_reason)
            - is_accepted=False if duplicate
            - is_accepted=True if fresh (in-order or out-of-order)
        """
        if idempotency_key in self._entries:
            return False, f"Duplicate event '{idempotency_key[:12]}' already processed."

        now_utc = datetime.now(timezone.utc).isoformat()
        last_seq = self._highest_sequence.get(institution_id, -1)
        is_ooo = False

        if sequence_number <= last_seq:
            # Out of order or delayed event
            is_ooo = True
            self._out_of_order_count += 1
            reason = f"Out-of-order event accepted (seq={sequence_number} <= highest={last_seq})."
        else:
            self._highest_sequence[institution_id] = sequence_number
            reason = f"In-order event accepted (seq={sequence_number})."

        entry = IngestRecordEntry(
            idempotency_key=idempotency_key,
            event_id=event_id,
            institution_id=institution_id,
            sequence_number=sequence_number,
            source_timestamp_utc=source_timestamp_utc,
            recorded_timestamp_utc=now_utc,
            is_out_of_order=is_ooo
        )
        self._entries[idempotency_key] = entry
        return True, reason

    def is_duplicate(self, idempotency_key: str) -> bool:
        """Check if an idempotency key was previously recorded."""
        return idempotency_key in self._entries

    def get_entry(self, idempotency_key: str) -> Optional[IngestRecordEntry]:
        """Fetch recorded entry details."""
        return self._entries.get(idempotency_key)

    @property
    def seen_count(self) -> int:
        return len(self._entries)

    @property
    def out_of_order_count(self) -> int:
        return self._out_of_order_count

    def clear(self) -> None:
        self._entries.clear()
        self._highest_sequence.clear()
        self._out_of_order_count = 0

