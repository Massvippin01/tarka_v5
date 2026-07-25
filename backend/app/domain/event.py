from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, UTC

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class Event(UniversalEntity):
    """
    Represents an occurrence relevant to one or more investigations.
    """

    entity_type: EntityType = EntityType.EVENT

    event_type: str = ""

    title: str = ""

    description: str = ""

    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    reported_at: datetime | None = None

    location_id: str | None = None

    case_ids: list[str] = field(default_factory=list)

    participant_ids: list[str] = field(default_factory=list)

    evidence_ids: list[str] = field(default_factory=list)

    timeline_order: int = 0

    severity: str = "LOW"

    def add_participant(self, person_id: str) -> None:
        if person_id not in self.participant_ids:
            self.participant_ids.append(person_id)

    def add_evidence(self, evidence_id: str) -> None:
        if evidence_id not in self.evidence_ids:
            self.evidence_ids.append(evidence_id)

    def add_case(self, case_id: str) -> None:
        if case_id not in self.case_ids:
            self.case_ids.append(case_id)