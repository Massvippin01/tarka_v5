from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, List
from uuid import uuid4

from app.domain.enums import SourceSystem


@dataclass(slots=True)
class CanonicalRecord:
    record_id: str = field(default_factory=lambda: str(uuid4()))
    source_system: SourceSystem = SourceSystem.SYNTHETIC_ENGINE
    source_record_id: str = ""
    entity_type: str = ""
    payload: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(UTC))
    evidence_reference: str = ""
    confidence: float = 1.0
    security_classification: str = "INTERNAL"


class BaseSourceAdapter(ABC):
    def __init__(self, source_system: SourceSystem):
        self.source_system = source_system

    @abstractmethod
    def fetch_records(self, limit: int = 100) -> List[CanonicalRecord]:
        """Fetch or emit canonical records from the source stream."""
        pass

    @abstractmethod
    def normalize_record(self, raw_record: Dict[str, Any]) -> CanonicalRecord:
        """Convert a raw system payload into a CanonicalRecord."""
        pass
