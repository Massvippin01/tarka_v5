from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class CallRecord(UniversalEntity):
    entity_type: EntityType = EntityType.CALL_RECORD

    caller_number: str = ""
    receiver_number: str = ""
    duration_seconds: int = 0
    call_type: str = "INCOMING"  # INCOMING, OUTGOING, MISSED
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    cell_tower_id: str = ""
    imei: str = ""


@dataclass(slots=True)
class ANPRObservation(UniversalEntity):
    entity_type: EntityType = EntityType.ANPR_OBSERVATION

    plate_number: str = ""
    camera_id: str = ""
    camera_location: str = ""
    lat: float = 0.0
    lng: float = 0.0
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    confidence_score: float = 0.95
    image_ref: str = ""
