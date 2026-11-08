"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: BASE INSTITUTIONAL ADAPTER SDK

Standardized interface contract for all institutional connectors.
Enforces health checks, connection lifecycle, raw exhibit hashing,
and forensic provenance emission.
"""

from __future__ import annotations

import abc
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from tarka.taie.manifest import InstitutionCapabilityManifest


class IngestBatchResult(BaseModel):
    """Container for batch ingest outputs."""
    raw_payload_hash: str
    record_count: int
    raw_records: List[Dict[str, Any]]
    ingest_timestamp_utc: str
    institution_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseInstitutionalAdapter(abc.ABC):
    """
    Abstract Base Class for all institutional data adapters.
    Guarantees consistent error handling, cryptographic hashing, and forensic provenance.
    """

    def __init__(self, manifest: InstitutionCapabilityManifest, adapter_version: str = "1.0.0"):
        self.manifest = manifest
        self.institution_id = manifest.institution_id
        self.adapter_version = adapter_version
        self.connected = False
        self._consecutive_failures = 0
        self._total_requests = 0
        self._total_errors = 0

    @abc.abstractmethod
    def connect(self) -> bool:
        """Establish connection or session to external or simulated source."""
        pass

    @abc.abstractmethod
    def disconnect(self) -> bool:
        """Safely terminate session and clean up resources."""
        pass

    @abc.abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Perform active diagnostic check and return standardized status dict."""
        pass

    @abc.abstractmethod
    def fetch_raw(self, query: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch raw unnormalized exhibit payload from the institutional source."""
        pass

    @abc.abstractmethod
    def transform(self, raw_payload: Dict[str, Any]) -> Any:
        """Normalize raw payload into Canonical v1 domain objects."""
        pass

    @abc.abstractmethod
    def emit_provenance(self, raw_payload: Dict[str, Any], canonical_records: List[Any]) -> Dict[str, Any]:
        """Generate tamper-evident provenance record connecting raw exhibit to canonical records."""
        pass

    @staticmethod
    def compute_sha256(data: Any) -> str:
        """Compute deterministic SHA-256 hex digest of dictionary or raw bytes."""
        if isinstance(data, (bytes, bytearray)):
            return hashlib.sha256(data).hexdigest()
        serialized = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()

    def quarantine_record(self, raw_record: Dict[str, Any], reason: str) -> Dict[str, Any]:
        """Wrap an unparseable or malformed raw record in a quarantine structure."""
        return {
            "quarantined": True,
            "institution_id": self.institution_id,
            "reason": reason,
            "raw_record": raw_record,
            "timestamp_utc": datetime.now(timezone.utc).isoformat(),
            "sha256": self.compute_sha256(raw_record)
        }

