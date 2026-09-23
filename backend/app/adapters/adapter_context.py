from __future__ import annotations

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import EvidenceArtifact


class AdapterContext(BaseModel):
    """
    Context passed to a source adapter during artifact processing.
    The artifact has already been acquired, hashed, and stored immutably by Evidence Gateway.
    """
    artifact: EvidenceArtifact
    case_id: str
    operator_id: str = "SYSTEM_INGEST"
    options: Dict[str, Any] = Field(default_factory=dict)
