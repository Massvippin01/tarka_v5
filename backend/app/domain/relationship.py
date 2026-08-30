from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import List
from uuid import uuid4


@dataclass(slots=True)
class EntityRelationship:
    relationship_id: str = field(default_factory=lambda: str(uuid4()))
    relationship_type: str = ""
    source_entity: str = ""
    target_entity: str = ""

    confidence: float = 1.0
    confidence_level: str = "DOCUMENTED"  # CONFIRMED, DOCUMENTED, OBSERVED, REPORTED, INFERRED, POTENTIAL
    status: str = "DOCUMENTED"  # OBSERVED, DOCUMENTED, CONFIRMED, CORROBORATED, INFERRED, POTENTIAL, CONTRADICTED, UNRESOLVED, REQUIRES_REVIEW

    observed_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    valid_from: datetime = field(default_factory=lambda: datetime.now(UTC))
    valid_to: datetime | None = None

    source: str = "SYNTHETIC_ENGINE"
    source_record_id: str = ""
    evidence_ids: List[str] = field(default_factory=list)
    evidence_reference: str = ""
    evidence_references: List[str] = field(default_factory=list)

    supporting_observations: List[str] = field(default_factory=list)
    contradictory_observations: List[str] = field(default_factory=list)

    analytical_method: str = "DIRECT_RECORD"
    entity_resolution_basis: str = "EXACT_IDENTIFIER_MATCH"
    review_status: str = "APPROVED"  # APPROVED, PENDING_INVESTIGATOR_REVIEW, CONTESTED

    alternative_explanation: str = ""
    evidence_gaps: List[str] = field(default_factory=list)
    next_verification: str = ""
    reason: str = ""
