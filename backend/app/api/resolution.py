from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.domain.canonical_entity import CanonicalEntity, EntityType, ProvenanceMetadata
from app.repositories.unified_store import UnifiedStore
from app.services.layered_entity_resolution import LayeredEntityResolutionEngine, ResolutionResult

router = APIRouter()


class ResolutionRequest(BaseModel):
    target_entity: CanonicalEntity
    candidate_entity: CanonicalEntity
    contextual_data: Optional[Dict[str, Any]] = None


@router.post("/resolve", response_model=ResolutionResult)
def resolve_entity_pair(req: ResolutionRequest):
    engine = LayeredEntityResolutionEngine()
    return engine.resolve_entities(
        target=req.target_entity,
        candidate=req.candidate_entity,
        contextual_data=req.contextual_data,
    )


@router.get("/matches/{entity_id}", response_model=List[ResolutionResult])
def find_candidate_matches(entity_id: str):
    store = UnifiedStore.get_instance()
    engine = LayeredEntityResolutionEngine()

    target = None
    if entity_id in store.persons:
        p = store.persons[entity_id]
        target = CanonicalEntity(
            id=p.id,
            type=EntityType.PERSON,
            display_name=p.full_name,
            canonical_identifiers={
                "aadhaar": p.aadhaar,
                "driving_license": p.driving_license,
                "passport": p.passport_number,
            },
            aliases=p.aliases,
            source_references=[p.source_record_id] if p.source_record_id else [],
            provenance=ProvenanceMetadata(
                source_system=p.source or "CCTNS",
                confidence_level=p.confidence or "DOCUMENTED",
                evidence_references=[p.evidence_reference] if p.evidence_reference else [],
            ),
        )

    if not target:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found for resolution comparison")

    results = []
    for other_p in store.persons.values():
        if other_p.id == entity_id:
            continue

        cand = CanonicalEntity(
            id=other_p.id,
            type=EntityType.PERSON,
            display_name=other_p.full_name,
            canonical_identifiers={
                "aadhaar": other_p.aadhaar,
                "driving_license": other_p.driving_license,
                "passport": other_p.passport_number,
            },
            aliases=other_p.aliases,
            source_references=[other_p.source_record_id] if other_p.source_record_id else [],
            provenance=ProvenanceMetadata(
                source_system=other_p.source or "CCTNS",
                confidence_level=other_p.confidence or "DOCUMENTED",
                evidence_references=[other_p.evidence_reference] if other_p.evidence_reference else [],
            ),
        )

        res = engine.resolve_entities(target, cand)
        if res.resolution_confidence >= 0.40:
            results.append(res)

    results.sort(key=lambda r: r.resolution_confidence, reverse=True)
    return results
