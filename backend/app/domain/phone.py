from __future__ import annotations

from dataclasses import dataclass

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class Phone(UniversalEntity):

    entity_type: EntityType = EntityType.PHONE

    phone_number: str = ""

    country_code: str = "+91"

    sim_number: str = ""

    imei: str = ""

    carrier: str = ""

    owner_id: str | None = None

    activated_on: str | None = None

    deactivated_on: str | None = None

    is_primary: bool = False