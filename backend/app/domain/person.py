from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class Person(UniversalEntity):
    """
    Core domain model representing a human involved in an investigation.
    """

    entity_type: EntityType = EntityType.PERSON

    # Identity
    first_name: str = ""
    middle_name: str = ""
    last_name: str = ""
    aliases: list[str] = field(default_factory=list)

    # Demographics
    gender: str = ""
    date_of_birth: date | None = None
    nationality: str = ""
    occupation: str = ""

    # Government IDs
    aadhaar: str | None = None
    passport_number: str | None = None
    driving_license: str | None = None

    # Contact
    phone_ids: list[str] = field(default_factory=list)
    email_ids: list[str] = field(default_factory=list)

    # Addresses
    address_ids: list[str] = field(default_factory=list)

    # Assets
    vehicle_ids: list[str] = field(default_factory=list)
    bank_account_ids: list[str] = field(default_factory=list)

    # Investigation
    case_ids: list[str] = field(default_factory=list)
    evidence_ids: list[str] = field(default_factory=list)

    # Intelligence
    risk_level: str = "LOW"
    threat_score: float = 0.0

    @property
    def full_name(self) -> str:
        return " ".join(
            part
            for part in [
                self.first_name,
                self.middle_name,
                self.last_name,
            ]
            if part
        )

    def add_alias(self, alias: str) -> None:
        if alias not in self.aliases:
            self.aliases.append(alias)

    def add_case(self, case_id: str) -> None:
        if case_id not in self.case_ids:
            self.case_ids.append(case_id)

    def add_vehicle(self, vehicle_id: str) -> None:
        if vehicle_id not in self.vehicle_ids:
            self.vehicle_ids.append(vehicle_id)

    def add_phone(self, phone_id: str) -> None:
        if phone_id not in self.phone_ids:
            self.phone_ids.append(phone_id)

    def add_evidence(self, evidence_id: str) -> None:
        if evidence_id not in self.evidence_ids:
            self.evidence_ids.append(evidence_id)