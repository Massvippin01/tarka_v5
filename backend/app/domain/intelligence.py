from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from .base import UniversalEntity
from .enums import EntityType


@dataclass(slots=True)
class AnalyticalSignal(UniversalEntity):
    entity_type: EntityType = EntityType.ANALYTICAL_SIGNAL

    signal_type: str = ""  # HIDDEN_COMMUNICATION_LINK, MONEY_MULE_PATTERN, VEHICLE_LOCATION_OVERLAP, CO_ACCUSED_LINK
    title: str = ""
    description: str = ""
    primary_entity_id: str = ""
    secondary_entity_id: str = ""
    case_ids: list[str] = field(default_factory=list)
    confidence: float = 0.85
    confidence_level: str = "INFERRED"  # INFERRED, POTENTIAL, DOCUMENTED
    supporting_evidence: list[str] = field(default_factory=list)
    path_nodes: list[str] = field(default_factory=list)
    analytical_method: str = "GRAPH_PATH_CORRELATION"


@dataclass(slots=True)
class GoldenScenario(UniversalEntity):
    scenario_id: str = ""
    family: str = ""  # repeat_offender, cyber_fraud, money_mule, etc.
    title: str = ""
    description: str = ""
    known_entities: list[str] = field(default_factory=list)
    hidden_relationships: list[dict] = field(default_factory=list)
    timeline: list[dict] = field(default_factory=list)
    expected_path: list[str] = field(default_factory=list)
    expected_signals: list[str] = field(default_factory=list)
    expected_answer: str = ""
