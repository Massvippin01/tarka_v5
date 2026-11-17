"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: TRANSFORMATION PROVENANCE TRACKER

Maintains a cryptographic chain-of-custody audit trail linking raw
institutional exhibits to Canonical v1 entities and transactions.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from tarka.contracts.canonical_v1 import TransformationStep


class TransformationProvenanceRecord(BaseModel):
    """
    Forensic record documenting the exact transformation pipeline execution,
    raw input hash, parser version, and output canonical artifact hashes.
    """
    provenance_id: str
    institution_id: str
    adapter_name: str
    adapter_version: str
    mapping_profile: str
    transformation_timestamp_utc: str
    raw_payload_sha256: str
    canonical_records_count: int
    canonical_hashes: List[str] = Field(default_factory=list)
    quarantined_count: int = 0
    transformation_steps: List[TransformationStep] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TransformationProvenanceTracker:
    """
    Generates and verifies cryptographic provenance for all adapter transformations.
    """

    @staticmethod
    def compute_hash(data: Any) -> str:
        """Compute SHA-256 digest of arbitrary payload."""
        if isinstance(data, (bytes, bytearray)):
            return hashlib.sha256(data).hexdigest()
        serialized = json.dumps(data, sort_keys=True, default=str).encode("utf-8")
        return hashlib.sha256(serialized).hexdigest()

    @classmethod
    def create_provenance_record(
        cls,
        institution_id: str,
        adapter_name: str,
        adapter_version: str,
        mapping_profile: str,
        raw_payload: Any,
        canonical_records: List[Any],
        quarantined_count: int = 0,
        additional_notes: Optional[str] = None
    ) -> TransformationProvenanceRecord:
        """Create an immutable provenance record for a transformation batch."""
        raw_hash = cls.compute_hash(raw_payload)
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        output_hashes = []
        for rec in canonical_records:
            if hasattr(rec, "model_dump"):
                rec_dict = rec.model_dump()
            elif isinstance(rec, dict):
                rec_dict = rec
            else:
                rec_dict = str(rec)
            output_hashes.append(cls.compute_hash(rec_dict))

        prov_id = f"PROV_{institution_id}_{now_utc.replace(':', '').replace('-', '')}_{raw_hash[:8]}"

        steps = [
            TransformationStep(
                step_number=1,
                operation="RAW_INGEST_HASH",
                tool_or_parser=f"{adapter_name}:{adapter_version}",
                timestamp_utc=now_utc,
                output_hash=raw_hash
            ),
            TransformationStep(
                step_number=2,
                operation=f"SCHEMA_MAPPING_{mapping_profile}",
                tool_or_parser="CanonicalSchemaMappingEngine:v1.0.0",
                timestamp_utc=now_utc,
                output_hash=cls.compute_hash(output_hashes)
            )
        ]

        return TransformationProvenanceRecord(
            provenance_id=prov_id,
            institution_id=institution_id,
            adapter_name=adapter_name,
            adapter_version=adapter_version,
            mapping_profile=mapping_profile,
            transformation_timestamp_utc=now_utc,
            raw_payload_sha256=raw_hash,
            canonical_records_count=len(canonical_records),
            canonical_hashes=output_hashes,
            quarantined_count=quarantined_count,
            transformation_steps=steps,
            metadata={"notes": additional_notes} if additional_notes else {}
        )

    @classmethod
    def verify_provenance(
        cls,
        record: TransformationProvenanceRecord,
        raw_payload: Any,
        canonical_records: List[Any]
    ) -> bool:
        """
        Verify that a provenance record strictly matches the provided raw payload
        and output canonical records.
        """
        raw_hash = cls.compute_hash(raw_payload)
        if raw_hash != record.raw_payload_sha256:
            return False

        if len(canonical_records) != record.canonical_records_count:
            return False

        for i, rec in enumerate(canonical_records):
            if hasattr(rec, "model_dump"):
                rec_dict = rec.model_dump()
            elif isinstance(rec, dict):
                rec_dict = rec
            else:
                rec_dict = str(rec)
            if cls.compute_hash(rec_dict) != record.canonical_hashes[i]:
                return False

        return True

