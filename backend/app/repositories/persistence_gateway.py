from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.database.models import (
    CaseModel,
    EntityModel,
    EvidenceArtifactModel,
    EvidenceClaimModel,
    EvidenceContradictionModel,
    EvidenceCustodyRecordModel,
    EvidenceFactModel,
    EvidenceGapModel,
    EvidenceObservationModel,
    RelationshipModel,
)
from app.domain.canonical_evidence_ir import (
    EvidenceArtifact,
    EvidenceClaim,
    EvidenceContradiction,
    EvidenceCustodyEvent,
    EvidenceFact,
    EvidenceGap as CanonicalEvidenceGap,
    EvidenceObservation,
    EvidenceProvenance,
    IntegrityStatus,
    EvidenceSourceType,
    SourceProvenanceType,
    CustodyEventType,
    ClaimStatus,
    EpistemicStatus,
)
from app.domain.case import Case
from app.domain.relationship import EntityRelationship

logger = logging.getLogger("sentinelx.persistence.gateway")


class PersistenceGateway:
    """
    Translates between canonical Waves 1-5 Domain Pydantic models
    and PostgreSQL SQLAlchemy declarative models.
    """

    # --- Cases ---
    @staticmethod
    def case_to_model(case: Case) -> CaseModel:
        return CaseModel(
            id=case.id,
            case_number=case.case_number,
            title=case.title,
            fir_number=case.fir_number,
            crime_type=case.crime_type,
            priority=case.priority.value if hasattr(case.priority, "value") else str(case.priority),
            status=case.investigation_status.value if hasattr(case.investigation_status, "value") else str(case.investigation_status),
            police_station=case.police_station,
            source=case.source,
            description=getattr(case, "description", None),
            metadata_json=getattr(case, "metadata", {}) or {},
        )

    @staticmethod
    def model_to_case(m: CaseModel) -> Case:
        return Case(
            id=m.id,
            case_number=m.case_number,
            title=m.title,
            fir_number=m.fir_number,
            crime_type=m.crime_type,
            priority=m.priority,
            investigation_status=m.status,
            police_station=m.police_station,
            source=m.source,
        )

    # --- Artifacts ---
    @staticmethod
    def artifact_to_model(art: EvidenceArtifact) -> EvidenceArtifactModel:
        c_at = art.created_at
        if isinstance(c_at, str):
            try:
                c_at = datetime.fromisoformat(c_at)
            except Exception:
                c_at = datetime.now()
        prov_type = getattr(art, "provenance_type", None)
        if hasattr(prov_type, "value"):
            prov_type_str = prov_type.value
        elif prov_type:
            prov_type_str = str(prov_type)
        elif getattr(art, "provenance", None) and hasattr(art.provenance, "origin_type"):
            prov_type_str = str(art.provenance.origin_type)
        else:
            prov_type_str = "SYNTHETIC_DATA"

        return EvidenceArtifactModel(
            artifact_id=art.artifact_id,
            case_id=art.case_id,
            source_id=art.source_id,
            source_type=art.source_type.value if hasattr(art.source_type, "value") else str(art.source_type),
            record_id=art.record_id,
            content_hash=art.content_hash,
            mime_type=art.mime_type,
            file_size_bytes=art.file_size_bytes,
            storage_uri=art.storage_uri,
            integrity_status=art.integrity_status.value if hasattr(art.integrity_status, "value") else str(art.integrity_status),
            provenance_type=prov_type_str,
            collector_agent_id=getattr(art, "operator_id", None),
            source_institution=art.source_id,
            acquisition_method=getattr(art, "acquisition_method", None),
            legal_basis=getattr(art, "jurisdiction", None),
            metadata_json=getattr(art, "metadata", {}) or {},
            created_at=c_at,
        )

    @staticmethod
    def model_to_artifact(m: EvidenceArtifactModel) -> EvidenceArtifact:
        return EvidenceArtifact(
            artifact_id=m.artifact_id,
            case_id=m.case_id,
            source_id=m.source_id,
            source_type=EvidenceSourceType(m.source_type) if m.source_type in EvidenceSourceType._value2member_map_ else EvidenceSourceType.FORENSIC_DOCUMENT,
            provenance_type=SourceProvenanceType(m.provenance_type) if m.provenance_type in SourceProvenanceType._value2member_map_ else SourceProvenanceType.SYNTHETIC_DATA,
            record_id=m.record_id,
            artifact_type="CANONICAL_FORENSIC_ARTIFACT",
            content_hash=m.content_hash,
            mime_type=m.mime_type,
            file_size_bytes=m.file_size_bytes,
            storage_uri=m.storage_uri,
            integrity_status=IntegrityStatus(m.integrity_status) if m.integrity_status in IntegrityStatus._value2member_map_ else IntegrityStatus.VERIFIED,
            metadata=m.metadata_json or {},
            created_at=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
        )

    # --- Facts ---
    @staticmethod
    def fact_to_model(fact: EvidenceFact) -> EvidenceFactModel:
        c_at = getattr(fact, "created_at", None)
        if isinstance(c_at, str):
            try:
                c_at = datetime.fromisoformat(c_at)
            except Exception:
                c_at = datetime.now()
        elif not isinstance(c_at, datetime):
            c_at = datetime.now()
        return EvidenceFactModel(
            fact_id=fact.fact_id,
            source_artifact_id=fact.source_artifact_id,
            source_location=fact.source_location,
            subject=fact.subject,
            predicate=fact.predicate,
            object=fact.object,
            extraction_confidence=fact.extraction_confidence,
            epistemic_status=fact.epistemic_status.value if hasattr(fact.epistemic_status, "value") else str(fact.epistemic_status),
            supporting_evidence_ids=fact.supporting_evidence_ids or [],
            contradicting_evidence_ids=fact.contradicting_evidence_ids or [],
            created_at=c_at,
        )

    @staticmethod
    def model_to_fact(m: EvidenceFactModel) -> EvidenceFact:
        return EvidenceFact(
            fact_id=m.fact_id,
            case_id="DEFAULT_CASE",
            source_artifact_id=m.source_artifact_id,
            source_location=m.source_location or "",
            subject=m.subject,
            predicate=m.predicate,
            object=m.object,
            extraction_confidence=m.extraction_confidence,
            epistemic_status=EpistemicStatus(m.epistemic_status) if m.epistemic_status in EpistemicStatus._value2member_map_ else EpistemicStatus.FACT,
            supporting_evidence_ids=m.supporting_evidence_ids or [],
            contradicting_evidence_ids=m.contradicting_evidence_ids or [],
            created_at=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
        )

    # --- Custody ---
    @staticmethod
    def custody_to_model(ev: EvidenceCustodyEvent) -> EvidenceCustodyRecordModel:
        ts = getattr(ev, "timestamp", None)
        if isinstance(ts, str):
            try:
                ts = datetime.fromisoformat(ts)
            except Exception:
                ts = datetime.now()
        elif not isinstance(ts, datetime):
            ts = datetime.now()
        action_val = ev.event_type.value if hasattr(ev.event_type, "value") else str(getattr(ev, "action", "ACQUIRED"))
        return EvidenceCustodyRecordModel(
            custody_event_id=ev.custody_event_id,
            artifact_id=ev.artifact_id,
            timestamp=ts,
            acting_agent_id=getattr(ev, "actor_id", "INVESTIGATOR"),
            action=action_val,
            previous_custody_event_id=getattr(ev, "previous_event_id", None) or getattr(ev, "previous_custody_event_id", None),
            verification_hash=getattr(ev, "content_hash_at_event", None) or getattr(ev, "verification_hash", "HASH"),
            notes=getattr(ev, "action_description", None) or getattr(ev, "notes", None),
        )

    @staticmethod
    def model_to_custody(m: EvidenceCustodyRecordModel) -> EvidenceCustodyEvent:
        event_type = CustodyEventType.TRANSFER_CUSTODY
        for ct in CustodyEventType:
            if ct.value == m.action:
                event_type = ct
                break
        return EvidenceCustodyEvent(
            custody_event_id=m.custody_event_id,
            artifact_id=m.artifact_id,
            event_type=event_type,
            timestamp=m.timestamp.isoformat() if hasattr(m.timestamp, "isoformat") else str(m.timestamp),
            actor_id=m.acting_agent_id,
            actor_role="INVESTIGATOR",
            action_description=m.notes or m.action,
            content_hash_at_event=m.verification_hash,
            storage_location="SECURE_CUSTODY",
            previous_event_id=m.previous_custody_event_id,
        )

    # --- Claims ---
    @staticmethod
    def claim_to_model(claim: EvidenceClaim) -> EvidenceClaimModel:
        stmt = getattr(claim, "assertion_text", None) or getattr(claim, "statement", "")
        conf = getattr(claim, "confidence_score", None) or getattr(claim, "confidence", 0.5)
        c_at = getattr(claim, "created_at", None)
        if isinstance(c_at, str):
            try:
                c_at = datetime.fromisoformat(c_at)
            except Exception:
                c_at = datetime.now()
        elif not isinstance(c_at, datetime):
            c_at = datetime.now()
        return EvidenceClaimModel(
            claim_id=claim.claim_id,
            case_id=claim.case_id,
            statement=stmt,
            status=claim.status.value if hasattr(claim.status, "value") else str(claim.status),
            confidence=conf,
            source_node=getattr(claim, "source_node", None),
            target_node=getattr(claim, "target_node", None),
            relationship_type=getattr(claim, "relationship_type", None),
            supporting_fact_ids=claim.supporting_fact_ids or [],
            contradicting_fact_ids=claim.contradicting_fact_ids or [],
            created_at=c_at,
        )

    @staticmethod
    def model_to_claim(m: EvidenceClaimModel) -> EvidenceClaim:
        return EvidenceClaim(
            claim_id=m.claim_id,
            case_id=m.case_id,
            assertion_text=m.statement,
            status=ClaimStatus(m.status) if m.status in ClaimStatus._value2member_map_ else ClaimStatus.PROPOSED,
            confidence_score=m.confidence,
            supporting_fact_ids=m.supporting_fact_ids or [],
            contradicting_fact_ids=m.contradicting_fact_ids or [],
            created_at=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
        )
