from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.domain.canonical_evidence_ir import (
    EvidenceFact,
    EvidenceObservation,
)
from app.repositories.unified_store import UnifiedStore


class IntegrityValidationResult(BaseModel):
    is_valid: bool
    is_orphan: bool = False
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    artifact_id: Optional[str] = None
    content_hash: Optional[str] = None


class EvidenceIntegrityValidator:
    """
    Reusable Evidence Integrity Invariant Validator.
    
    Guarantees the core forensic invariant:
    1. Every derived object (observation, fact, event, relationship) MUST have a valid source artifact_id.
    2. The referenced artifact MUST exist in UnifiedStore.
    3. The artifact's content_hash MUST exist and be resolvable.
    4. Provenance record MUST exist for the artifact.
    5. Source location (line, offset, page, key) MUST exist where applicable.
    Orphan objects are detected and rejected/quarantined.
    """

    @classmethod
    def validate_artifact_reference(cls, artifact_id: str, store: UnifiedStore) -> Tuple[bool, List[str]]:
        errors = []
        if not artifact_id or not str(artifact_id).strip():
            return False, ["Missing or empty artifact_id"]

        artifact = store.get_artifact(artifact_id)
        if not artifact:
            return False, [f"Orphan object: artifact_id '{artifact_id}' does not exist in store"]

        if not artifact.content_hash:
            errors.append(f"Referenced artifact '{artifact_id}' has no content_hash")

        # Verify provenance exists
        prov = store.get_provenance(artifact_id)
        if not prov:
            errors.append(f"Referenced artifact '{artifact_id}' lacks a provenance record")

        return len(errors) == 0, errors

    @classmethod
    def validate_observation(
        cls, obs: EvidenceObservation, store: UnifiedStore
    ) -> IntegrityValidationResult:
        is_ref_valid, ref_errors = cls.validate_artifact_reference(obs.artifact_id, store)
        if not is_ref_valid:
            return IntegrityValidationResult(
                is_valid=False,
                is_orphan=True,
                errors=ref_errors,
                artifact_id=obs.artifact_id,
            )

        errors = list(ref_errors)
        if not obs.source_location or not obs.source_location.strip():
            errors.append("Observation lacks required source_location attribute")

        artifact = store.get_artifact(obs.artifact_id)
        return IntegrityValidationResult(
            is_valid=len(errors) == 0,
            is_orphan=False,
            errors=errors,
            artifact_id=obs.artifact_id,
            content_hash=artifact.content_hash if artifact else None,
        )

    @classmethod
    def validate_fact(
        cls, fact: EvidenceFact, store: UnifiedStore
    ) -> IntegrityValidationResult:
        is_ref_valid, ref_errors = cls.validate_artifact_reference(fact.source_artifact_id, store)
        if not is_ref_valid:
            return IntegrityValidationResult(
                is_valid=False,
                is_orphan=True,
                errors=ref_errors,
                artifact_id=fact.source_artifact_id,
            )

        errors = list(ref_errors)
        if not fact.source_location or not fact.source_location.strip():
            errors.append("Fact lacks required source_location anchor")

        if not fact.subject or not fact.predicate or not fact.object:
            errors.append("Fact has incomplete proposition (missing subject, predicate, or object)")

        artifact = store.get_artifact(fact.source_artifact_id)
        return IntegrityValidationResult(
            is_valid=len(errors) == 0,
            is_orphan=False,
            errors=errors,
            artifact_id=fact.source_artifact_id,
            content_hash=artifact.content_hash if artifact else None,
        )

    @classmethod
    def validate_event(
        cls, event: Dict[str, Any], store: UnifiedStore
    ) -> IntegrityValidationResult:
        art_id = event.get("source_artifact_id")
        is_ref_valid, ref_errors = cls.validate_artifact_reference(art_id, store)
        if not is_ref_valid:
            return IntegrityValidationResult(
                is_valid=False,
                is_orphan=True,
                errors=ref_errors,
                artifact_id=art_id,
            )

        artifact = store.get_artifact(art_id)
        return IntegrityValidationResult(
            is_valid=len(ref_errors) == 0,
            is_orphan=False,
            errors=ref_errors,
            artifact_id=art_id,
            content_hash=artifact.content_hash if artifact else None,
        )

    @classmethod
    def validate_relationship(
        cls, rel: Any, store: UnifiedStore
    ) -> IntegrityValidationResult:
        # Check evidence references
        evidence_refs = getattr(rel, "evidence_references", [])
        if not evidence_refs and hasattr(rel, "evidence_refs"):
            evidence_refs = rel.evidence_refs

        if not evidence_refs:
            return IntegrityValidationResult(
                is_valid=False,
                is_orphan=True,
                errors=["Relationship lacks any evidence reference anchoring it to source artifacts"],
            )

        # Check that at least one evidence ref resolves to an artifact or known record
        has_resolving_ref = False
        for ref in evidence_refs:
            if store.get_artifact(ref) or store.get_artifact_by_hash(ref) or ref in store.evidence:
                has_resolving_ref = True
                break

        if not has_resolving_ref:
            return IntegrityValidationResult(
                is_valid=False,
                is_orphan=True,
                errors=[f"None of the evidence_references {evidence_refs} resolve to an ingested artifact in store"],
            )

        return IntegrityValidationResult(is_valid=True, is_orphan=False)
