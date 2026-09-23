from __future__ import annotations

from typing import Any, Dict, List
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import (
    EvidenceFact,
    EvidenceObservation,
    EvidenceSourceType,
)


class AdapterResult(BaseModel):
    """
    Standardized, canonical result emitted by all source adapters.
    Guarantees every adapter produces consistent Evidence IR objects with full provenance.
    """
    adapter_id: str
    adapter_version: str
    source_type: EvidenceSourceType
    schema_version: str
    observations: List[EvidenceObservation] = Field(default_factory=list)
    facts: List[EvidenceFact] = Field(default_factory=list)
    events: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)
    provenance_metadata: Dict[str, Any] = Field(default_factory=dict)
