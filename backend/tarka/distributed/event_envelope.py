"""
TARKA SUTRAM 2026 — WORKSTREAM B3
Canonical Distributed Evidence Event Envelope and Event Model.

Defines a versioned, tamper-evident, cryptographically chained event envelope for
inter-institutional evidence synchronization and state tracking.
Seamlessly integrates with CanonicalInstitutionEvent (Canonical v1 contract).
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

from tarka.contracts.canonical_v1 import (
    CanonicalInstitutionEvent,
    CausalityMetadata,
    EventValidationState,
    InstitutionEventType,
)


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
    vector_clock: Dict[str, int] = field(default_factory=dict)
    lamport_ts: int = 0

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
            "vector_clock": self.vector_clock,
            "lamport_ts": self.lamport_ts,
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

    def to_canonical(self) -> CanonicalInstitutionEvent:
        """Convert to CanonicalInstitutionEvent (Pydantic Canonical v1 contract)."""
        src_iso = datetime.fromtimestamp(self.source_timestamp, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        recv_iso = datetime.fromtimestamp(self.received_timestamp, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Map EventType -> InstitutionEventType
        type_mapping = {
            EventType.EVIDENCE_INGESTED: InstitutionEventType.EVIDENCE_INGESTED,
            EventType.TRANSACTION_FLAGGED: InstitutionEventType.TRANSACTION_FLAGGED,
            EventType.FREEZE_DIRECTIVE_ISSUED: InstitutionEventType.FREEZE_DIRECTIVE_ISSUED,
            EventType.IDENTITY_LINK_PROPOSED: InstitutionEventType.IDENTITY_LINK_PROPOSED,
            EventType.CASE_STATE_UPDATED: InstitutionEventType.CASE_STATE_UPDATED,
            EventType.AUDIT_CHECKPOINT: InstitutionEventType.AUDIT_CHECKPOINT,
        }

        # Map EventStatus -> EventValidationState
        val_mapping = {
            EventStatus.COMMITTED: EventValidationState.COMMITTED,
            EventStatus.PENDING: EventValidationState.PENDING,
            EventStatus.CONFLICTED: EventValidationState.CONFLICTED,
            EventStatus.QUARANTINED: EventValidationState.QUARANTINED,
        }

        return CanonicalInstitutionEvent(
            event_id=self.event_id,
            institution_id=self.institution_id,
            event_type=type_mapping.get(self.event_type, InstitutionEventType.AUDIT_CHECKPOINT),
            schema_version="v1.0.0",
            sequence_number=self.sequence_number,
            source_timestamp_utc=src_iso,
            received_timestamp_utc=recv_iso,
            idempotency_key=self.idempotency_key,
            payload_commitment=self.payload_commitment,
            correlation_id=self.correlation_id,
            causality_metadata=CausalityMetadata(
                lamport_ts=self.lamport_ts,
                vector_clock=self.vector_clock
            ),
            event_validation_state=val_mapping.get(self.event_status, EventValidationState.COMMITTED),
            prior_event_reference=self.prior_event_reference if self.prior_event_reference != "GENESIS_ROOT" else None,
            signature_reference=self.signature_reference,
            payload=self.payload
        )

    @classmethod
    def from_canonical(cls, canon: CanonicalInstitutionEvent, issuer_id: str = "SYSTEM") -> EventEnvelope:
        """Construct EventEnvelope from CanonicalInstitutionEvent."""
        try:
            dt_src = datetime.fromisoformat(canon.source_timestamp_utc.replace("Z", "+00:00"))
            src_ts = dt_src.timestamp()
        except Exception:
            src_ts = time.time()

        try:
            dt_recv = datetime.fromisoformat(canon.received_timestamp_utc.replace("Z", "+00:00"))
            recv_ts = dt_recv.timestamp()
        except Exception:
            recv_ts = time.time()

        type_mapping = {
            InstitutionEventType.EVIDENCE_INGESTED: EventType.EVIDENCE_INGESTED,
            InstitutionEventType.TRANSACTION_FLAGGED: EventType.TRANSACTION_FLAGGED,
            InstitutionEventType.FREEZE_DIRECTIVE_ISSUED: EventType.FREEZE_DIRECTIVE_ISSUED,
            InstitutionEventType.IDENTITY_LINK_PROPOSED: EventType.IDENTITY_LINK_PROPOSED,
            InstitutionEventType.CASE_STATE_UPDATED: EventType.CASE_STATE_UPDATED,
            InstitutionEventType.AUDIT_CHECKPOINT: EventType.AUDIT_CHECKPOINT,
        }

        val_mapping = {
            EventValidationState.COMMITTED: EventStatus.COMMITTED,
            EventValidationState.PENDING: EventStatus.PENDING,
            EventValidationState.CONFLICTED: EventStatus.CONFLICTED,
            EventValidationState.QUARANTINED: EventStatus.QUARANTINED,
        }

        return cls(
            event_id=canon.event_id,
            issuer_id=issuer_id,
            institution_id=canon.institution_id,
            event_type=type_mapping.get(canon.event_type, EventType.AUDIT_CHECKPOINT),
            schema_version=canon.schema_version,
            sequence_number=canon.sequence_number,
            source_timestamp=src_ts,
            received_timestamp=recv_ts,
            correlation_id=canon.correlation_id,
            idempotency_key=canon.idempotency_key,
            payload_commitment=canon.payload_commitment,
            prior_event_reference=canon.prior_event_reference or "GENESIS_ROOT",
            signature_reference=canon.signature_reference or "",
            event_status=val_mapping.get(canon.event_validation_state, EventStatus.COMMITTED),
            payload=canon.payload,
            vector_clock=canon.causality_metadata.vector_clock,
            lamport_ts=canon.causality_metadata.lamport_ts
        )


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
    vector_clock: Optional[Dict[str, int]] = None,
    lamport_ts: int = 0,
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

    vc = vector_clock if vector_clock is not None else {institution_id: sequence_number}
    l_ts = lamport_ts if lamport_ts > 0 else sequence_number

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
        vector_clock=vc,
        lamport_ts=l_ts,
    )


def create_canonical_institution_event(
    event_id: str,
    institution_id: str,
    event_type: InstitutionEventType,
    sequence_number: int,
    correlation_id: str,
    idempotency_key: str,
    payload: Dict[str, Any],
    lamport_ts: int = 0,
    vector_clock: Optional[Dict[str, int]] = None,
    prior_event_ref: Optional[str] = None,
    secret_key: str = "DEFAULT_INST_SIGNING_KEY",
) -> CanonicalInstitutionEvent:
    """Factory creating a fully compliant CanonicalInstitutionEvent contract instance."""
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload_commit = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()

    sig = hmac.new(
        secret_key.encode("utf-8"),
        f"{event_id}:{institution_id}:{sequence_number}:{payload_commit}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    vc = vector_clock if vector_clock is not None else {institution_id: sequence_number}
    l_ts = lamport_ts if lamport_ts > 0 else sequence_number

    return CanonicalInstitutionEvent(
        event_id=event_id,
        institution_id=institution_id,
        event_type=event_type,
        schema_version="v1.0.0",
        sequence_number=sequence_number,
        source_timestamp_utc=now_utc,
        received_timestamp_utc=now_utc,
        idempotency_key=idempotency_key,
        payload_commitment=payload_commit,
        correlation_id=correlation_id,
        causality_metadata=CausalityMetadata(
            lamport_ts=l_ts,
            vector_clock=vc
        ),
        event_validation_state=EventValidationState.COMMITTED,
        prior_event_reference=prior_event_ref,
        signature_reference=sig,
        payload=payload
    )
