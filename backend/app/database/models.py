from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, JSONVariant


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CaseModel(Base):
    """
    Authoritative transactional persistence for investigative cases.
    """
    __tablename__ = "cases"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    case_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    fir_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    crime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    priority: Mapped[str] = mapped_column(String(32), default="MEDIUM", nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="OPEN", nullable=False)
    police_station: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    source: Mapped[str] = mapped_column(String(64), default="MANUAL_ENTRY", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    artifacts: Mapped[List["EvidenceArtifactModel"]] = relationship(
        "EvidenceArtifactModel", back_populates="case", cascade="all, delete-orphan"
    )
    observations: Mapped[List["EvidenceObservationModel"]] = relationship(
        "EvidenceObservationModel", back_populates="case", cascade="all, delete-orphan"
    )
    claims: Mapped[List["EvidenceClaimModel"]] = relationship(
        "EvidenceClaimModel", back_populates="case", cascade="all, delete-orphan"
    )
    contradictions: Mapped[List["EvidenceContradictionModel"]] = relationship(
        "EvidenceContradictionModel", back_populates="case", cascade="all, delete-orphan"
    )
    gaps: Mapped[List["EvidenceGapModel"]] = relationship(
        "EvidenceGapModel", back_populates="case", cascade="all, delete-orphan"
    )


class EvidenceArtifactModel(Base):
    """
    Authoritative metadata and provenance for forensic evidence artifacts.
    Raw evidence bytes reside outside PostgreSQL (in CAS storage / S3).
    """
    __tablename__ = "evidence_artifacts"

    artifact_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id: Mapped[str] = mapped_column(String(64), nullable=False)
    source_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    record_id: Mapped[str] = mapped_column(String(128), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    storage_uri: Mapped[str] = mapped_column(String(512), nullable=False)
    integrity_status: Mapped[str] = mapped_column(String(32), default="VERIFIED", nullable=False)
    provenance_type: Mapped[str] = mapped_column(String(64), default="SYNTHETIC_DATA", nullable=False)
    collector_agent_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    source_institution: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    acquisition_method: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    legal_basis: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)

    # Relationships
    case: Mapped["CaseModel"] = relationship("CaseModel", back_populates="artifacts")
    observations: Mapped[List["EvidenceObservationModel"]] = relationship(
        "EvidenceObservationModel", back_populates="artifact", cascade="all, delete-orphan"
    )
    facts: Mapped[List["EvidenceFactModel"]] = relationship(
        "EvidenceFactModel", back_populates="artifact", cascade="all, delete-orphan"
    )
    custody_events: Mapped[List["EvidenceCustodyRecordModel"]] = relationship(
        "EvidenceCustodyRecordModel", back_populates="artifact"
    )


class EvidenceObservationModel(Base):
    """
    Extracted forensic observations anchored to an authoritative artifact.
    """
    __tablename__ = "evidence_observations"

    observation_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    artifact_id: Mapped[str] = mapped_column(String(64), ForeignKey("evidence_artifacts.artifact_id", ondelete="CASCADE"), nullable=False, index=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    observed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    source_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    extracted_fields: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    case: Mapped["CaseModel"] = relationship("CaseModel", back_populates="observations")
    artifact: Mapped["EvidenceArtifactModel"] = relationship("EvidenceArtifactModel", back_populates="observations")


class EvidenceFactModel(Base):
    """
    Derived atomic facts extracted from evidence observations.
    """
    __tablename__ = "evidence_facts"

    fact_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    source_artifact_id: Mapped[str] = mapped_column(String(64), ForeignKey("evidence_artifacts.artifact_id", ondelete="CASCADE"), nullable=False, index=True)
    source_location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    subject: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    predicate: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    object: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    extraction_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    epistemic_status: Mapped[str] = mapped_column(String(32), default="CONFIRMED", nullable=False)
    supporting_evidence_ids: Mapped[List[str]] = mapped_column(JSONVariant, default=list, nullable=False)
    contradicting_evidence_ids: Mapped[List[str]] = mapped_column(JSONVariant, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    artifact: Mapped["EvidenceArtifactModel"] = relationship("EvidenceArtifactModel", back_populates="facts")


class EvidenceCustodyRecordModel(Base):
    """
    Append-only chain of custody events for evidence artifacts.
    Updates and deletes are strictly prohibited by repository invariants.
    """
    __tablename__ = "evidence_custody_records"

    custody_event_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    artifact_id: Mapped[str] = mapped_column(String(64), ForeignKey("evidence_artifacts.artifact_id", ondelete="RESTRICT"), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    acting_agent_id: Mapped[str] = mapped_column(String(128), nullable=False)
    action: Mapped[str] = mapped_column(String(64), nullable=False)
    previous_custody_event_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    verification_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    artifact: Mapped["EvidenceArtifactModel"] = relationship("EvidenceArtifactModel", back_populates="custody_events")


class EvidenceClaimModel(Base):
    """
    Epistemic investigative claims with explicit non-binary lifecycle status.
    Strictly prohibits GUILTY / INNOCENT or TRUE / FALSE boolean collapsing.
    """
    __tablename__ = "evidence_claims"

    claim_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PROPOSED", nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    source_node: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    target_node: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    relationship_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    supporting_fact_ids: Mapped[List[str]] = mapped_column(JSONVariant, default=list, nullable=False)
    contradicting_fact_ids: Mapped[List[str]] = mapped_column(JSONVariant, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    case: Mapped["CaseModel"] = relationship("CaseModel", back_populates="claims")


class EvidenceContradictionModel(Base):
    """
    First-class evidentiary conflicts preserved without silent resolution.
    """
    __tablename__ = "evidence_contradictions"

    contradiction_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    claim_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    contradiction_type: Mapped[str] = mapped_column(String(64), nullable=False)
    severity: Mapped[str] = mapped_column(String(32), default="HIGH", nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    first_observation_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    second_observation_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    details_json: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    case: Mapped["CaseModel"] = relationship("CaseModel", back_populates="contradictions")


class EvidenceGapModel(Base):
    """
    Formal evidential deduction gaps flagging missing statutory or evidential proof.
    """
    __tablename__ = "evidence_gaps"

    gap_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    case_id: Mapped[str] = mapped_column(String(64), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    hypothesis_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    missing_evidence_type: Mapped[str] = mapped_column(String(64), nullable=False)
    required_for: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    statutory_action: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    case: Mapped["CaseModel"] = relationship("CaseModel", back_populates="gaps")


class EntityModel(Base):
    """
    Authoritative transactional record for real-world entities.
    """
    __tablename__ = "entities"

    entity_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    name_or_title: Mapped[str] = mapped_column(String(255), nullable=False)
    canonical_identifier: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    risk_level: Mapped[str] = mapped_column(String(32), default="UNKNOWN", nullable=False)
    source: Mapped[str] = mapped_column(String(64), default="SYSTEM", nullable=False)
    properties_json: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)


class RelationshipModel(Base):
    """
    Authoritative transactional evidence-anchored relationship between entities.
    """
    __tablename__ = "relationships"

    relationship_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    source_entity_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    target_entity_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    relationship_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    confidence_level: Mapped[str] = mapped_column(String(32), default="DOCUMENTED", nullable=False)
    evidence_references: Mapped[List[str]] = mapped_column(JSONVariant, default=list, nullable=False)
    source: Mapped[str] = mapped_column(String(64), default="SYSTEM", nullable=False)
    reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    review_status: Mapped[str] = mapped_column(String(32), default="APPROVED", nullable=False)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("ix_rel_src_tgt_type", "source_entity_id", "target_entity_id", "relationship_type"),
    )


class AuditEventModel(Base):
    """
    Append-only governance and policy decision audit ledger.
    """
    __tablename__ = "audit_events"

    event_id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    case_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, index=True)
    actor_id: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(64), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(64), nullable=False)
    policy_decision_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    payload_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    details_json: Mapped[Dict[str, Any]] = mapped_column(JSONVariant, default=dict, nullable=False)
