from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class Case(UniversalEntity):

    entity_type: EntityType = EntityType.CASE

    case_number: str = ""
    fir_number: str = ""
    title: str = ""
    description: str = ""

    police_station: str = ""

    crime_type: str = ""

    priority: str = "MEDIUM"

    investigation_status: str = "OPEN"

    opened_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    closed_at: datetime | None = None

    lead_officer: str | None = None

    officer_ids: list[str] = field(default_factory=list)

    suspect_ids: list[str] = field(default_factory=list)

    victim_ids: list[str] = field(default_factory=list)

    witness_ids: list[str] = field(default_factory=list)

    evidence_ids: list[str] = field(default_factory=list)

    event_ids: list[str] = field(default_factory=list)

    location_ids: list[str] = field(default_factory=list)

    recommendation_ids: list[str] = field(default_factory=list)

    alert_ids: list[str] = field(default_factory=list)

    def assign_officer(self, officer_id: str):
        if officer_id not in self.officer_ids:
            self.officer_ids.append(officer_id)

    def add_evidence(self, evidence_id: str):
        if evidence_id not in self.evidence_ids:
            self.evidence_ids.append(evidence_id)

    def add_suspect(self, person_id: str):
        if person_id not in self.suspect_ids:
            self.suspect_ids.append(person_id)

    def add_victim(self, person_id: str):
        if person_id not in self.victim_ids:
            self.victim_ids.append(person_id)

    def add_event(self, event_id: str):
        if event_id not in self.event_ids:
            self.event_ids.append(event_id)
