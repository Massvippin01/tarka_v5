from dataclasses import dataclass, field
from datetime import datetime, UTC
from uuid import uuid4


@dataclass(slots=True)
class EntityRelationship:

    relationship_id: str = field(default_factory=lambda: str(uuid4()))

    relationship_type: str = ""

    source_entity: str = ""

    target_entity: str = ""

    confidence: float = 1.0

    weight: float = 1.0

    valid_from: datetime = field(default_factory=lambda: datetime.now(UTC))

    valid_to: datetime | None = None

    evidence_ids: list[str] = field(default_factory=list)

    reason: str = ""