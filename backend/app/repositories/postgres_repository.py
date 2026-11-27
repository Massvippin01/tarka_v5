from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import select, and_, or_, func, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.models import (
    AuditEventModel,
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

logger = logging.getLogger("sentinelx.repositories.postgres")


class PostgresCaseRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, case: CaseModel) -> CaseModel:
        self.session.add(case)
        await self.session.flush()
        return case

    async def get(self, case_id: str) -> Optional[CaseModel]:
        stmt = select(CaseModel).where(CaseModel.id == case_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_case_number(self, case_number: str) -> Optional[CaseModel]:
        stmt = select(CaseModel).where(CaseModel.case_number == case_number)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self) -> List[CaseModel]:
        stmt = select(CaseModel).order_by(CaseModel.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_filtered(
        self,
        status: Optional[str] = None,
        q: Optional[str] = None,
        io: Optional[str] = None,
        typology: Optional[str] = None,
        sort: Optional[str] = None,
        page: int = 1,
        page_size: int = 100,
    ) -> tuple[List[CaseModel], int]:
        stmt = select(CaseModel)
        count_stmt = select(func.count(CaseModel.id))

        filters = []
        if status:
            filters.append(CaseModel.status == status)
        if q:
            term = f"%{q.strip()}%"
            filters.append(
                or_(
                    CaseModel.case_number.ilike(term),
                    CaseModel.title.ilike(term),
                    CaseModel.description.ilike(term),
                    CaseModel.fir_number.ilike(term),
                )
            )
        if io:
            term = f"%{io.strip()}%"
            filters.append(
                or_(
                    CaseModel.police_station.ilike(term),
                    cast(CaseModel.metadata_json, String).ilike(term),
                )
            )
        if typology:
            term = f"%{typology.strip()}%"
            filters.append(
                or_(
                    CaseModel.crime_type == typology,
                    CaseModel.crime_type.ilike(term),
                )
            )

        if filters:
            stmt = stmt.where(and_(*filters))
            count_stmt = count_stmt.where(and_(*filters))

        if sort == "created_asc":
            stmt = stmt.order_by(CaseModel.created_at.asc())
        elif sort == "priority":
            stmt = stmt.order_by(CaseModel.priority.desc(), CaseModel.created_at.desc())
        else:
            stmt = stmt.order_by(CaseModel.created_at.desc())

        offset = max(0, (page - 1) * page_size)
        stmt = stmt.offset(offset).limit(page_size)

        total_res = await self.session.execute(count_stmt)
        total = total_res.scalar() or 0

        res = await self.session.execute(stmt)
        return list(res.scalars().all()), total

    async def delete(self, case_id: str) -> bool:
        case = await self.get(case_id)
        if case:
            await self.session.delete(case)
            await self.session.flush()
            return True
        return False


class PostgresEvidenceRepository:
    """
    Transactional repository for evidence metadata, observations, facts, and custody records.
    Raw evidence bytes remain in external CAS storage / S3.
    """
    def __init__(self, session: AsyncSession):
        self.session = session

    # --- Evidence Artifacts ---
    async def save_artifact(self, artifact: EvidenceArtifactModel) -> EvidenceArtifactModel:
        self.session.add(artifact)
        await self.session.flush()
        return artifact

    async def get_artifact(self, artifact_id: str) -> Optional[EvidenceArtifactModel]:
        stmt = select(EvidenceArtifactModel).where(EvidenceArtifactModel.artifact_id == artifact_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_artifact_by_hash(self, content_hash: str) -> Optional[EvidenceArtifactModel]:
        stmt = select(EvidenceArtifactModel).where(EvidenceArtifactModel.content_hash == content_hash.lower().strip())
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_artifacts_by_case(self, case_id: str) -> List[EvidenceArtifactModel]:
        stmt = select(EvidenceArtifactModel).where(EvidenceArtifactModel.case_id == case_id).order_by(EvidenceArtifactModel.created_at.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # --- Observations ---
    async def save_observation(self, obs: EvidenceObservationModel) -> EvidenceObservationModel:
        self.session.add(obs)
        await self.session.flush()
        return obs

    async def get_observation(self, observation_id: str) -> Optional[EvidenceObservationModel]:
        stmt = select(EvidenceObservationModel).where(EvidenceObservationModel.observation_id == observation_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_observations_by_artifact(self, artifact_id: str) -> List[EvidenceObservationModel]:
        stmt = select(EvidenceObservationModel).where(EvidenceObservationModel.artifact_id == artifact_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # --- Facts ---
    async def save_fact(self, fact: EvidenceFactModel) -> EvidenceFactModel:
        self.session.add(fact)
        await self.session.flush()
        return fact

    async def get_fact(self, fact_id: str) -> Optional[EvidenceFactModel]:
        stmt = select(EvidenceFactModel).where(EvidenceFactModel.fact_id == fact_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_facts_by_artifact(self, artifact_id: str) -> List[EvidenceFactModel]:
        stmt = select(EvidenceFactModel).where(EvidenceFactModel.source_artifact_id == artifact_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def list_facts_by_subject(self, subject: str) -> List[EvidenceFactModel]:
        stmt = select(EvidenceFactModel).where(EvidenceFactModel.subject == subject)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # --- Custody Records (Append-Only Invariant) ---
    async def append_custody_record(self, record: EvidenceCustodyRecordModel) -> EvidenceCustodyRecordModel:
        """
        Append a new custody event. Invariant: Historical custody events are strictly immutable.
        """
        self.session.add(record)
        await self.session.flush()
        return record

    async def get_custody_events(self, artifact_id: str) -> List[EvidenceCustodyRecordModel]:
        stmt = select(EvidenceCustodyRecordModel).where(
            EvidenceCustodyRecordModel.artifact_id == artifact_id
        ).order_by(EvidenceCustodyRecordModel.timestamp.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class PostgresEpistemicRepository:
    """
    Transactional repository for claims, contradictions, and evidence gaps.
    """
    def __init__(self, session: AsyncSession):
        self.session = session

    # --- Claims ---
    async def save_claim(self, claim: EvidenceClaimModel) -> EvidenceClaimModel:
        self.session.add(claim)
        await self.session.flush()
        return claim

    async def get_claim(self, claim_id: str) -> Optional[EvidenceClaimModel]:
        stmt = select(EvidenceClaimModel).where(EvidenceClaimModel.claim_id == claim_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_claims_by_case(self, case_id: str) -> List[EvidenceClaimModel]:
        stmt = select(EvidenceClaimModel).where(EvidenceClaimModel.case_id == case_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # --- Contradictions ---
    async def save_contradiction(self, contradiction: EvidenceContradictionModel) -> EvidenceContradictionModel:
        self.session.add(contradiction)
        await self.session.flush()
        return contradiction

    async def get_contradiction(self, contradiction_id: str) -> Optional[EvidenceContradictionModel]:
        stmt = select(EvidenceContradictionModel).where(EvidenceContradictionModel.contradiction_id == contradiction_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_contradictions_by_case(self, case_id: str) -> List[EvidenceContradictionModel]:
        stmt = select(EvidenceContradictionModel).where(EvidenceContradictionModel.case_id == case_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # --- Gaps ---
    async def save_gap(self, gap: EvidenceGapModel) -> EvidenceGapModel:
        self.session.add(gap)
        await self.session.flush()
        return gap

    async def get_gap(self, gap_id: str) -> Optional[EvidenceGapModel]:
        stmt = select(EvidenceGapModel).where(EvidenceGapModel.gap_id == gap_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_gaps_by_case(self, case_id: str) -> List[EvidenceGapModel]:
        stmt = select(EvidenceGapModel).where(EvidenceGapModel.case_id == case_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class PostgresEntityRepository:
    """
    Transactional repository for authoritative entities and relationships.
    """
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_entity(self, entity: EntityModel) -> EntityModel:
        self.session.add(entity)
        await self.session.flush()
        return entity

    async def get_entity(self, entity_id: str) -> Optional[EntityModel]:
        stmt = select(EntityModel).where(EntityModel.entity_id == entity_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_canonical_identifier(self, identifier: str) -> Optional[EntityModel]:
        stmt = select(EntityModel).where(EntityModel.canonical_identifier == identifier)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def save_relationship(self, rel: RelationshipModel) -> RelationshipModel:
        self.session.add(rel)
        await self.session.flush()
        return rel

    async def get_relationship(self, rel_id: str) -> Optional[RelationshipModel]:
        stmt = select(RelationshipModel).where(RelationshipModel.relationship_id == rel_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_relationships_for_entity(self, entity_id: str) -> List[RelationshipModel]:
        stmt = select(RelationshipModel).where(
            (RelationshipModel.source_entity_id == entity_id) | (RelationshipModel.target_entity_id == entity_id)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class PostgresAuditRepository:
    """
    Append-only governance and policy decision audit ledger.
    """
    def __init__(self, session: AsyncSession):
        self.session = session

    async def append_event(self, event: AuditEventModel) -> AuditEventModel:
        self.session.add(event)
        await self.session.flush()
        return event

    async def get_event(self, event_id: str) -> Optional[AuditEventModel]:
        stmt = select(AuditEventModel).where(AuditEventModel.event_id == event_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_events_by_case(self, case_id: str) -> List[AuditEventModel]:
        stmt = select(AuditEventModel).where(AuditEventModel.case_id == case_id).order_by(AuditEventModel.timestamp.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
