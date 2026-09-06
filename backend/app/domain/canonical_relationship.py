from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class RelationshipType(str, Enum):
    INVOLVED_IN = "INVOLVED_IN"
    CONTACTED = "CONTACTED"
    USES = "USES"
    OWNED_BY = "OWNED_BY"
    LOCATED_AT = "LOCATED_AT"
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    TRANSFERRED_TO = "TRANSFERRED_TO"
    MENTIONED_IN = "MENTIONED_IN"
    SUPPORTED_BY = "SUPPORTED_BY"
    CONTRADICTED_BY = "CONTRADICTED_BY"
    OCCURRED_AT = "OCCURRED_AT"
    RELATED_TO = "RELATED_TO"


class CanonicalRelationship(BaseModel):
    relationship_id: str
    source_id: str
    target_id: str
    type: RelationshipType
    observed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    confidence: float = 1.0
    confidence_level: str = "DOCUMENTED"  # DOCUMENTED, INFERRED, PROPOSED
    evidence_refs: List[str] = Field(default_factory=list)
    resolution_method: str = "DIRECT_FORENSIC_RECORD"
    source_records: List[str] = Field(default_factory=list)
    supporting_observations: List[str] = Field(default_factory=list)
    contradictory_observations: List[str] = Field(default_factory=list)
    review_status: str = "APPROVED"       # APPROVED, PENDING_INVESTIGATOR_REVIEW, REJECTED
    properties: Dict[str, Any] = Field(default_factory=dict)
