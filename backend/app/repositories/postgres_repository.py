from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import select
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

    async def update(self, case: CaseModel) -> CaseModel:
        await self.session.flush()
        return case

    async def delete(self, case_id: str) -> None:
        case = await self.get(case_id)
        if case:
            await self.session.delete(case)
            await self.session.flush()

    async def list_filtered(
        self,
        status: Optional[str] = None,
        q: Optional[str] = None,
        io: Optional[str] = None,
        typology: Optional[str] = None,
        sort: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[List[CaseModel], int]:
        all_cases = await self.list_all()
        filtered: List[CaseModel] = []
        for c in all_cases:
            meta = c.metadata_json or {}
            # Status filter
            if status:
                st = (c.status or "").upper()
                target_st = status.upper()
                if target_st == "INVESTIGATING" and st in ("INVESTIGATION_ACTIVE", "INVESTIGATING"):
                    pass
                elif st != target_st:
                    continue

            # Typology filter
            if typology:
                c_typology = (meta.get("typology") or c.crime_type or "").lower()
                if typology.lower() not in c_typology:
                    continue

            # IO filter
            if io:
                c_io = (meta.get("assigned_io") or meta.get("lead_investigator") or "").lower()
                if io.lower() not in c_io:
                    continue

            # Text search filter
            if q:
                search_term = q.lower()
                complainant = str(meta.get("complainant_name", "")).lower()
                searchable = f"{c.id} {c.case_number} {c.fir_number or ''} {c.title} {complainant} {c.description or ''}".lower()
                if search_term not in searchable:
                    continue

            filtered.append(c)

        # Sort
        if sort:
            parts = sort.split(":")
            sort_field = parts[0].lower()
            descending = len(parts) > 1 and parts[1].lower() == "desc"

            def sort_key(item: CaseModel):
                m = item.metadata_json or {}
                if sort_field == "created_at":
                    return item.created_at
                elif sort_field == "priority":
                    p_order = {
                        "CRITICAL_GOLDEN_HOUR": 0, "P1_CRITICAL": 0,
                        "HIGH_SYNDICATE": 1, "P2_HIGH": 1,
                        "MEDIUM": 2, "P3_MEDIUM": 2,
                        "LOW": 3, "P4_LOW": 3
                    }
                    return p_order.get(item.priority, 99)
                elif sort_field in ("loss", "loss_amount", "booked_loss_inr"):
                    return float(m.get("booked_loss_inr", 0))
                elif sort_field == "title":
                    return item.title.lower()
                return item.id

            filtered.sort(key=sort_key, reverse=descending)

        total_count = len(filtered)
        start_idx = max(0, (page - 1) * page_size)
        end_idx = start_idx + page_size
        return filtered[start_idx:end_idx], total_count


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
