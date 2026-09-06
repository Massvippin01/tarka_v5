from __future__ import annotations

from datetime import UTC, datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ProvenanceChainNode(BaseModel):
    node_id: str
    step_type: str  # SOURCE_RECORD, OBSERVATION, ENTITY_RESOLUTION, RELATIONSHIP, SIGNAL, EVIDENCE, CLAIM, AI_RESPONSE
    source_system: str = "SYNTHETIC_INGESTION_ENGINE"
    description: str
    confidence: float = 0.95
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    parent_ids: List[str] = Field(default_factory=list)


class EvidenceIntegrityMetadata(BaseModel):
    evidence_id: str
    content_hash: str  # SHA-256
    integrity_status: str = "INTEGRITY_VERIFIED"  # INTEGRITY_VERIFIED, UNVERIFIED, CORRUPTED
    source_reference: str
    created_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class ProvenanceTraceResponse(BaseModel):
    record_id: str
    record_type: str
    integrity: EvidenceIntegrityMetadata
    chain: List[ProvenanceChainNode] = Field(default_factory=list)
