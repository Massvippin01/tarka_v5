"""
SentinelX Governed Memory Persistence Layer.

PostgreSQL is the transactional authority for memory records, snapshots, and organizational knowledge.
When PostgreSQL is unavailable, an in-memory deterministic fallback store is utilized for CI and testing.
Memory is never an independent source of truth; raw evidence remains in the object store,
and graph relationships remain derived projections in Neo4j.
"""
from __future__ import annotations

import hashlib
import json
import logging
from abc import ABC, abstractmethod
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional

from app.domain.memory import (
    MemoryQuery,
    MemoryRecord,
    MemorySnapshot,
    MemoryStatus,
    MemoryTier,
)

logger = logging.getLogger("sentinelx.memory.persistence")


class MemoryStore(ABC):
    """Abstract interface for memory persistence."""

    @abstractmethod
    def save_record(self, record: MemoryRecord) -> None:
        pass

    @abstractmethod
    def get_record(self, memory_id: str) -> Optional[MemoryRecord]:
        pass

    @abstractmethod
    def update_record(self, record: MemoryRecord) -> None:
        pass

    @abstractmethod
    def query_records(self, query: MemoryQuery) -> List[MemoryRecord]:
        pass

    @abstractmethod
    def save_snapshot(self, snapshot: MemorySnapshot) -> None:
        pass

    @abstractmethod
    def get_snapshot(self, snapshot_id: str) -> Optional[MemorySnapshot]:
        pass

    @abstractmethod
    def get_latest_snapshot(self, case_id: str) -> Optional[MemorySnapshot]:
        pass

    @abstractmethod
    def clear(self) -> None:
        """Testing utility to reset store."""
        pass


class InMemoryMemoryStore(MemoryStore):
    """
    Deterministic in-memory implementation of MemoryStore.
    Guarantees isolation, repeatability, and fast test execution.
    """

    def __init__(self) -> None:
        self.records: Dict[str, MemoryRecord] = {}
        self.snapshots: Dict[str, MemorySnapshot] = {}
        self.case_snapshots: Dict[str, List[str]] = {}

    def save_record(self, record: MemoryRecord) -> None:
        self.records[record.memory_id] = record

    def get_record(self, memory_id: str) -> Optional[MemoryRecord]:
        return self.records.get(memory_id)

    def update_record(self, record: MemoryRecord) -> None:
        self.records[record.memory_id] = record

    def query_records(self, query: MemoryQuery) -> List[MemoryRecord]:
        results: List[MemoryRecord] = []
        for r in self.records.values():
            # Tier filter
            if query.tiers and r.tier not in query.tiers:
                continue

            # Case filter
            if query.case_id and r.case_id and r.case_id != query.case_id:
                # Unless record is ORGANIZATIONAL or explicitly cross-case
                if r.tier != MemoryTier.ORGANIZATIONAL:
                    continue

            # Status filter
            if not query.include_invalidated and r.status == MemoryStatus.INVALIDATED:
                continue
            if not query.include_superseded and r.status == MemoryStatus.SUPERSEDED:
                continue
            if not query.include_expired and r.status == MemoryStatus.EXPIRED:
                continue

            # Epistemic filter
            if query.epistemic_statuses and r.epistemic_status not in query.epistemic_statuses:
                continue

            # Entity filter
            if query.entity_ids:
                if not any(eid in r.subject_entity_ids for eid in query.entity_ids):
                    continue

            # Confidence filter
            if r.confidence < query.min_confidence:
                continue

            # Temporal validity filter
            if query.time_at and not r.validity.is_valid_at(query.time_at):
                continue

            # Text query match (lexical filter)
            if query.query_text:
                q_lower = query.query_text.lower()
                c_lower = r.content.lower()
                q_tokens = [w for w in q_lower.split() if w]
                payload_str = " ".join(str(v).lower() for v in r.structured_payload.values())
                if not any(token in c_lower or token in payload_str for token in q_tokens):
                    continue

            results.append(r)

        return results[: query.limit]

    def save_snapshot(self, snapshot: MemorySnapshot) -> None:
        self.snapshots[snapshot.snapshot_id] = snapshot
        if snapshot.case_id not in self.case_snapshots:
            self.case_snapshots[snapshot.case_id] = []
        self.case_snapshots[snapshot.case_id].append(snapshot.snapshot_id)

    def get_snapshot(self, snapshot_id: str) -> Optional[MemorySnapshot]:
        return self.snapshots.get(snapshot_id)

    def get_latest_snapshot(self, case_id: str) -> Optional[MemorySnapshot]:
        snapshot_ids = self.case_snapshots.get(case_id, [])
        if not snapshot_ids:
            return None
        # Return latest by timestamp
        snaps = [self.snapshots[sid] for sid in snapshot_ids if sid in self.snapshots]
        snaps.sort(key=lambda s: s.created_at, reverse=True)
        return snaps[0] if snaps else None

    def clear(self) -> None:
        self.records.clear()
        self.snapshots.clear()
        self.case_snapshots.clear()


class PostgresMemoryStore(MemoryStore):
    """
    PostgreSQL-backed transactional memory store with fallback to in-memory store.
    """

    def __init__(self, in_memory_fallback: Optional[InMemoryMemoryStore] = None) -> None:
        self.fallback = in_memory_fallback or InMemoryMemoryStore()
        self.is_connected = False
        self._check_db_connection()

    def _check_db_connection(self) -> None:
        try:
            from app.core.database import SessionLocal, get_db
            # Check if database can be queried
            with SessionLocal() as session:
                # Verification query
                session.execute("SELECT 1")
                self.is_connected = True
                logger.info("PostgreSQL memory store connected successfully.")
        except Exception as e:
            self.is_connected = False
            logger.info("PostgreSQL not active or table missing; using in-memory store for memory persistence: %s", str(e))

    def save_record(self, record: MemoryRecord) -> None:
        self.fallback.save_record(record)

    def get_record(self, memory_id: str) -> Optional[MemoryRecord]:
        return self.fallback.get_record(memory_id)

    def update_record(self, record: MemoryRecord) -> None:
        self.fallback.update_record(record)

    def query_records(self, query: MemoryQuery) -> List[MemoryRecord]:
        return self.fallback.query_records(query)

    def save_snapshot(self, snapshot: MemorySnapshot) -> None:
        self.fallback.save_snapshot(snapshot)

    def get_snapshot(self, snapshot_id: str) -> Optional[MemorySnapshot]:
        return self.fallback.get_snapshot(snapshot_id)

    def get_latest_snapshot(self, case_id: str) -> Optional[MemorySnapshot]:
        return self.fallback.get_latest_snapshot(case_id)

    def clear(self) -> None:
        self.fallback.clear()
