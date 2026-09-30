"""
SentinelX Tier 3 — Governed Semantic Investigation Memory.

Semantic memory represents "What SentinelX currently knows about this investigation":
- Canonical entities (Persons, Vehicles, Phones, Accounts)
- Relationships and interactions
- Validated timeline facts and claims
- Contradictions and evidence gaps
- Investigative hypotheses

CRITICAL INVARIANTS:
1. Never a shadow database: semantic memory is a governed projection derived from
   and pointing directly to canonical evidence artifacts, facts, and state.
2. Conflict detection: If new semantic memory conflicts with existing memory
   (e.g., entity at two places at the same time), PRESERVE BOTH as a MemoryConflict.
   Never silently overwrite.
3. Provenance & Epistemic preservation:
   - Facts derived directly from verified evidence: FACT / OBSERVED
   - Claims inferred by correlation/agents: INFERRED / PROPOSED
   - Claims verified across independent sources: CORROBORATED
   - Contradicted claims: CONTRADICTED
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional, Tuple

from app.domain.canonical_evidence_ir import EvidenceFact, generate_uuid7
from app.domain.memory import (
    MemoryConflict,
    MemoryEpistemicStatus,
    MemoryProvenance,
    MemoryRecord,
    MemoryScope,
    MemorySensitivity,
    MemoryStatus,
    MemoryTier,
    MemoryValidity,
)
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.memory.semantic")


class SemanticMemoryManager:
    """Builder and projector for Tier 3 semantic memory records."""

    @staticmethod
    def project_from_fact(
        fact: EvidenceFact,
        jurisdiction: str = "NATIONAL_CYBER_CRIME_COORDINATION",
    ) -> MemoryRecord:
        """Project a canonical EvidenceFact into a Semantic MemoryRecord."""
        now = datetime.now(UTC).isoformat()
        
        # Epistemic mapping
        epistemic = MemoryEpistemicStatus.OBSERVED
        if fact.epistemic_status.value == "INFERENCE":
            epistemic = MemoryEpistemicStatus.INFERRED
        elif fact.epistemic_status.value == "HYPOTHESIS":
            epistemic = MemoryEpistemicStatus.PROPOSED

        if fact.corroboration_level.value == "CONTRADICTED":
            epistemic = MemoryEpistemicStatus.CONTRADICTED
        elif fact.corroboration_level.value == "CORROBORATED":
            epistemic = MemoryEpistemicStatus.CORROBORATED

        provenance = MemoryProvenance(
            source_type="EVIDENCE",
            source_ids=[fact.source_artifact_id],
            evidence_ids=[fact.source_artifact_id] + fact.supporting_evidence_ids,
            fact_ids=[fact.fact_id],
            created_by="FACT_PROJECTOR",
            created_at=now,
        )
        provenance.lineage_hash = provenance.compute_hash()

        entities = [fact.subject]
        if fact.object and not fact.object.replace(".", "").isdigit():
            entities.append(fact.object)

        content = f"{fact.subject} {fact.predicate} {fact.object}"

        return MemoryRecord(
            tier=MemoryTier.SEMANTIC,
            scope=MemoryScope.CASE,
            case_id=fact.case_id,
            jurisdiction=jurisdiction,
            subject_entity_ids=entities,
            content=content,
            structured_payload={
                "fact_id": fact.fact_id,
                "subject": fact.subject,
                "predicate": fact.predicate,
                "object": fact.object,
                "extraction_method": fact.extraction_method,
                "source_location": fact.source_location,
            },
            epistemic_status=epistemic,
            confidence=fact.extraction_confidence,
            provenance=provenance,
            validity=MemoryValidity(
                observed_at=fact.observed_at,
                valid_from=fact.valid_from or fact.observed_at,
                valid_to=fact.valid_to,
            ),
            created_by="FACT_PROJECTOR",
            source_type="EVIDENCE",
            source_ids=[fact.source_artifact_id],
            evidence_ids=[fact.source_artifact_id] + fact.supporting_evidence_ids,
            fact_ids=[fact.fact_id],
            sensitivity=MemorySensitivity.RESTRICTED,
            status=MemoryStatus.ACTIVE,
        )

    @staticmethod
    def detect_conflicts(
        candidate: MemoryRecord,
        existing_records: List[MemoryRecord],
    ) -> Optional[MemoryConflict]:
        """
        Check whether the candidate memory record contradicts an existing active record.
        Example: The same subject entity has mutually exclusive attributes or locations
        within an overlapping temporal validity window.
        """
        if candidate.tier != MemoryTier.SEMANTIC:
            return None

        cand_subj = candidate.subject_entity_ids
        if not cand_subj:
            return None

        for existing in existing_records:
            if existing.status != MemoryStatus.ACTIVE or existing.tier != MemoryTier.SEMANTIC:
                continue
            if existing.case_id != candidate.case_id:
                continue

            # Check entity overlap
            common_entities = set(cand_subj).intersection(set(existing.subject_entity_ids))
            if not common_entities:
                continue

            # Check temporal overlap
            cand_time = candidate.validity.observed_at or candidate.validity.valid_from
            exist_time = existing.validity.observed_at or existing.validity.valid_from

            # If same entity, opposing predicates or location claims at similar timestamps
            p1 = candidate.structured_payload.get("predicate")
            p2 = existing.structured_payload.get("predicate")
            o1 = candidate.structured_payload.get("object")
            o2 = existing.structured_payload.get("object")

            if p1 and p2 and p1 == p2 and o1 and o2 and o1 != o2:
                # Mutually exclusive attribute/sighting (e.g. LOCATED_AT Delhi vs Mumbai)
                if cand_time and exist_time and cand_time[:10] == exist_time[:10]:
                    reason = (
                        f"Temporal-spatial conflict for entity {common_entities}: "
                        f"'{candidate.content}' contradicts existing '{existing.content}' on {cand_time[:10]}"
                    )
                    return MemoryConflict(
                        existing_memory_id=existing.memory_id,
                        conflicting_content=candidate.content,
                        reason=reason,
                    )

        return None
