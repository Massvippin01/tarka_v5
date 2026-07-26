from __future__ import annotations

from dataclasses import dataclass

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class Vehicle(UniversalEntity):

    entity_type: EntityType = EntityType.VEHICLE

    registration_number: str = ""

    vin: str = ""

    manufacturer: str = ""

    model: str = ""

    variant: str = ""

    color: str = ""

    fuel_type: str = ""

    owner_id: str | None = None

    current_holder_id: str | None = None

    case_id: str | None = None

    status_note: str = ""
