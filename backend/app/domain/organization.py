from __future__ import annotations

from dataclasses import dataclass, field

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class Organization(UniversalEntity):

    entity_type: EntityType = EntityType.ORGANIZATION

    legal_name: str = ""

    trade_name: str = ""

    registration_number: str = ""

    organization_type: str = ""

    address_id: str | None = None

    employee_ids: list[str] = field(default_factory=list)

    case_ids: list[str] = field(default_factory=list)

    def add_employee(self, person_id: str) -> None:
        if person_id not in self.employee_ids:
            self.employee_ids.append(person_id)
