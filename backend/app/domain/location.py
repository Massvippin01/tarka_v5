from __future__ import annotations

from dataclasses import dataclass, field

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class Location(UniversalEntity):

    entity_type: EntityType = EntityType.LOCATION

    name: str = ""

    address: str = ""

    city: str = ""

    district: str = ""

    state: str = ""

    country: str = "India"

    postal_code: str = ""

    latitude: float | None = None

    longitude: float | None = None

    landmark: str = ""

    location_type: str = ""

    case_ids: list[str] = field(default_factory=list)

    event_ids: list[str] = field(default_factory=list)

    def coordinates(self) -> tuple[float | None, float | None]:
        return (self.latitude, self.longitude)