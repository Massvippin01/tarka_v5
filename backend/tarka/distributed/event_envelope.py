"""
TARKA SUTRAM 2026 — WORKSTREAM B3
Canonical Distributed Evidence Event Envelope and Event Model.

Defines a versioned, tamper-evident, cryptographically chained event envelope for
inter-institutional evidence synchronization and state tracking.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class EventStatus(str, Enum):
    COMMITTED = "COMMITTED"
    PENDING = "PENDING"
    CONFLICTED = "CONFLICTED"
    QUARANTINED = "QUARANTINED"


class EventType(str, Enum):
    EVIDENCE_INGESTED = "EVIDENCE_INGESTED"
    TRANSACTION_FLAGGED = "TRANSACTION_FLAGGED"
    FREEZE_DIRECTIVE_ISSUED = "FREEZE_DIRECTIVE_ISSUED"
    IDENTITY_LINK_PROPOSED = "IDENTITY_LINK_PROPOSED"
    CASE_STATE_UPDATED = "CASE_STATE_UPDATED"
    AUDIT_CHECKPOINT = "AUDIT_CHECKPOINT"


@dataclass
class EventEnvelope:
    """Canonical versioned event envelope for distributed evidence synchronization."""
    event_id: str
    issuer_id: str
    institution_id: str
    event_type: EventType
    schema_version: str
    sequence_number: int
    source_timestamp: float
    received_timestamp: float
    correlation_id: str
    idempotency_key: str
    payload_commitment: str
    prior_event_reference: str
    signature_reference: str
    event_status: EventStatus = EventStatus.COMMITTED
    payload: Dict[str, Any] = field(default_factory=dict)

    def compute_envelope_digest(self) -> str:
        """Computes SHA-256 digest of envelope fields for Merkle chaining."""
        core_fields = {
            "event_id": self.event_id,
            "issuer_id": self.issuer_id,
            "institution_id": self.institution_id,
            "event_type": self.event_type.value,
            "schema_version": self.schema_version,
            "sequence_number": self.sequence_number,
            "source_timestamp": f"{self.source_timestamp:.6f}",
            "correlation_id": self.correlation_id,
            "idempotency_key": self.idempotency_key,
            "payload_commitment": self.payload_commitment,
            "prior_event_reference": self.prior_event_reference,
        }
        raw = json.dumps(core_fields, sort_keys=True).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()

    def verify_payload_integrity(self) -> bool:
        """Verifies that payload matches the recorded SHA-256 commitment."""
        computed = hashlib.sha256(json.dumps(self.payload, sort_keys=True).encode("utf-8")).hexdigest()
        return computed == self.payload_commitment

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["event_type"] = self.event_type.value
        d["event_status"] = self.event_status.value
        return d


def create_event(
    event_id: str,
    issuer_id: str,
    institution_id: str,
    event_type: EventType,
    sequence_number: int,
    correlation_id: str,
    idempotency_key: str,
    payload: Dict[str, Any],
    prior_event_ref: str = "GENESIS_ROOT",
    source_timestamp: Optional[float] = None,
    secret_key: str = "DEFAULT_INST_SIGNING_KEY",
) -> EventEnvelope:
    """Factory helper creating a fully signed, chained EventEnvelope."""
    now = time.time()
    src_ts = source_timestamp if source_timestamp is not None else now
    payload_commit = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

    sig = hmac.new(
        secret_key.encode("utf-8"),
        f"{event_id}:{institution_id}:{sequence_number}:{payload_commit}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return EventEnvelope(
        event_id=event_id,
        issuer_id=issuer_id,
        institution_id=institution_id,
        event_type=event_type,
        schema_version="1.0.0",
        sequence_number=sequence_number,
        source_timestamp=src_ts,
        received_timestamp=now,
        correlation_id=correlation_id,
        idempotency_key=idempotency_key,
        payload_commitment=payload_commit,
        prior_event_reference=prior_event_ref,
        signature_reference=sig,
        event_status=EventStatus.COMMITTED,
        payload=payload,
    )

