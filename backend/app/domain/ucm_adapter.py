"""
Bidirectional Compatibility Adapters between Universal Case Model (UCM)
and existing domain/database models (CaseModel, Case, EvidenceArtifactModel, etc.).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Dict, Optional

from app.database.models import (
    CaseModel,
    EvidenceArtifactModel,
    EvidenceObservationModel,
    EvidenceClaimModel,
    EntityModel,
    RelationshipModel,
)
from app.domain.case import Case
from app.domain.universal_case_model import (
    CaseClassification,
    CaseStatus,
    EntityMatchBasis,
    EvidenceProcessingStatus,
    ExtractedObservation,
    FindingStatus,
    FindingType,
    ObservationType,
    UniversalCase,
    UniversalEntity,
    UniversalEvidence,
    UniversalFinding,
    UniversalRelationship,
)


class UCMAdapter:
    """Provides non-destructive conversion between legacy models and canonical UCM."""

    @staticmethod
    def case_to_ucm(case: Case) -> UniversalCase:
        return UniversalCase(
            case_id=case.id,
            case_type=case.crime_type or "CYBER_FINANCIAL_FRAUD",
            title=case.title or f"Case {case.case_number}",
            description=case.description or "",
            jurisdiction=case.police_station or "IN_DELHI",
            status=CaseStatus.ACTIVE if case.investigation_status == "OPEN" else CaseStatus.CLOSED,
            classification=CaseClassification.CONFIDENTIAL,
            created_at=case.opened_at.isoformat() if case.opened_at else datetime.now(UTC).isoformat(),
            updated_at=datetime.now(UTC).isoformat(),
            metadata={
                "case_number": case.case_number,
                "fir_number": case.fir_number,
                "lead_officer": case.lead_officer,
                "officer_ids": case.officer_ids,
            },
        )

    @staticmethod
    def ucm_to_case(ucm: UniversalCase) -> Case:
        c = Case(
            id=ucm.case_id,
            case_number=ucm.metadata.get("case_number", ucm.case_id),
            fir_number=ucm.metadata.get("fir_number", ""),
            title=ucm.title,
            description=ucm.description or "",
            crime_type=ucm.case_type,
            police_station=ucm.jurisdiction,
            investigation_status="OPEN" if ucm.status == CaseStatus.ACTIVE else "CLOSED",
        )
        return c

    @staticmethod
    def db_case_to_ucm(db_case: CaseModel) -> UniversalCase:
        return UniversalCase(
            case_id=db_case.id,
            case_type=db_case.crime_type,
            title=db_case.title,
            description=db_case.description or "",
            jurisdiction=db_case.police_station or "IN_DELHI",
            status=CaseStatus.ACTIVE if db_case.status == "OPEN" else CaseStatus.CLOSED,
            classification=CaseClassification.CONFIDENTIAL,
            created_at=db_case.created_at.isoformat() if db_case.created_at else datetime.now(UTC).isoformat(),
            updated_at=db_case.updated_at.isoformat() if db_case.updated_at else datetime.now(UTC).isoformat(),
            metadata=dict(db_case.metadata_json or {}),
        )

    @staticmethod
    def db_artifact_to_ucm_evidence(art: EvidenceArtifactModel) -> UniversalEvidence:
        return UniversalEvidence(
            evidence_id=art.artifact_id,
            case_id=art.case_id,
            original_filename=art.record_id or f"artifact_{art.artifact_id}",
            media_type=art.mime_type,
            file_size=art.file_size_bytes,
            sha256=art.content_hash,
            storage_reference=art.storage_uri,
            source_channel=art.source_type,
            processing_status=EvidenceProcessingStatus.EXTRACTED if art.integrity_status == "VERIFIED" else EvidenceProcessingStatus.RECEIVED,
            custody_reference=art.artifact_id,
            metadata=dict(art.metadata_json or {}),
        )
