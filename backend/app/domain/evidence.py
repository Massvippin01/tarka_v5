from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class Evidence(UniversalEntity):

    entity_type: EntityType = EntityType.EVIDENCE

    evidence_number: str = ""

    evidence_type: str = ""

    description: str = ""

    collected_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    collected_by: str = ""

    storage_location: str = ""

    chain_of_custody: list[str] = field(default_factory=list)

    file_hash: str = ""

    file_uri: str = ""

    case_id: str = ""

    related_entities: list[str] = field(default_factory=list)

    is_verified: bool = False

    def verify(self):
        self.is_verified = True

    def attach_entity(self, entity_id: str):
        if entity_id not in self.related_entities:
            self.related_entities.append(entity_id)
