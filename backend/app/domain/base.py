from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4

from .enums import (
    EntityStatus,
    EntityType,
    LifecycleState,
    SecurityClassification,
    VerificationStatus,
)


@dataclass(slots=True)
class UniversalEntity:
    id: str = field(default_factory=lambda: str(uuid4()))

    entity_type: EntityType | None = None

    status: EntityStatus = EntityStatus.ACTIVE
    verification_status: VerificationStatus = VerificationStatus.UNVERIFIED
    lifecycle_state: LifecycleState = LifecycleState.CREATED
    security_classification: SecurityClassification = SecurityClassification.INTERNAL

    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    created_by: str | None = None
    updated_by: str | None = None

    # Provenance & Fact vs Intelligence tracking
    source: str = "SYNTHETIC_ENGINE"
    source_record_id: str = ""
    evidence_reference: str = ""
    confidence: str = "DOCUMENTED"
    analytical_method: str = "DIRECT_RECORD"
    review_status: str = "APPROVED"

    tags: list[str] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)

    def touch(self) -> None:
        self.updated_at = datetime.now(UTC)

    def add_tag(self, tag: str) -> None:
        if tag not in self.tags:
            self.tags.append(tag)
            self.touch()

    def remove_tag(self, tag: str) -> None:
        if tag in self.tags:
            self.tags.remove(tag)
            self.touch()

    def set_metadata(self, key: str, value) -> None:
        self.metadata[key] = value
        self.touch()
