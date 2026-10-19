from __future__ import annotations

import json
import shutil
import tempfile
from pathlib import Path

import pytest
from app.adapters.adapter_context import AdapterContext
from app.adapters.adapter_registry import SourceAdapterRegistry
from app.domain.canonical_entity import CanonicalEntity, EntityType
from app.domain.canonical_evidence_ir import EvidenceSourceType, SourceProvenanceType
from app.repositories.unified_store import UnifiedStore
from app.services.evidence_gateway import EvidenceGateway
from app.services.evidence_integrity_validator import EvidenceIntegrityValidator
from app.services.layered_entity_resolution import LayeredEntityResolutionEngine
from app.services.normalization_service import NormalizationService


@pytest.fixture
def golden_case_env():
    temp_dir = tempfile.mkdtemp(prefix="sentinelx_golden_test_")
    store = UnifiedStore.get_instance()
    store.clear()
    gateway = EvidenceGateway(storage_root=temp_dir, store=store)
    registry = SourceAdapterRegistry.get_instance()

    fixtures_dir = (
        Path(__file__).resolve().parent.parent.parent / "data" / "fixtures" / "case_2026_001"
    )

    yield gateway, store, registry, fixtures_dir, temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_golden_case_cross_source_pipeline(golden_case_env):
    gateway, store, registry, fixtures_dir, _ = golden_case_env

    # 1. Load Manifest
    manifest_path = fixtures_dir / "manifest.json"
    assert manifest_path.exists(), f"Manifest missing at {manifest_path}"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assert manifest["case_id"] == "CASE-2026-001"
    assert manifest["synthetic"] is True
    assert len(manifest["fixtures"]) == 11

    # 2. Iterate and process all 11 fixtures through Evidence Gateway & Adapters
    ingested_artifacts = []
    total_observations = []
    total_facts = []
    total_events = []

    for item in manifest["fixtures"]:
        fixture_path = fixtures_dir / item["relative_path"]
        assert fixture_path.exists(), f"Fixture file missing: {fixture_path}"

        raw_bytes = fixture_path.read_bytes()
        source_type = EvidenceSourceType(item["source_type"])

        # 3. Ingestion through Evidence Gateway (authoritative boundary)
        artifact = gateway.ingest_artifact(
            content=raw_bytes,
            filename=Path(item["relative_path"]).name,
            case_id=manifest["case_id"],
            source_id=item["source_id"],
            source_type=source_type,
            record_id=item["record_id"],
            provenance_type=SourceProvenanceType.SYNTHETIC_DATA,
            operator_id="ACP_RAJESH_KUMAR",
            jurisdiction=manifest["jurisdiction"],
            classification="CONFIDENTIAL_LAW_ENFORCEMENT",
        )
        ingested_artifacts.append(artifact)

        # Verify Gateway invariants: UUIDv7 artifact_id != 64-char SHA-256
        assert len(artifact.artifact_id) == 36
        assert len(artifact.content_hash) == 64
        assert artifact.integrity_status.value == "VERIFIED"

        # 4. Resolve adapter from registry
        adapter = registry.get(source_type)
        assert adapter is not None, f"No adapter registered for {source_type}"

        # 5. Execute adapter parsing and extraction
        ctx = AdapterContext(artifact=artifact, case_id=manifest["case_id"])
        result = adapter.execute(ctx, raw_bytes)
        assert len(result.errors) == 0, f"Adapter error in {adapter.adapter_id}: {result.errors}"

        # 6. Validate & Persist Evidence IR objects
        for obs in result.observations:
            val_obs = EvidenceIntegrityValidator.validate_observation(obs, store)
            assert val_obs.is_valid is True, f"Invalid observation: {val_obs.errors}"
            store.save_observation(obs)
            total_observations.append(obs)

        for fact in result.facts:
            val_fact = EvidenceIntegrityValidator.validate_fact(fact, store)
            assert val_fact.is_valid is True, f"Invalid fact: {val_fact.errors}"
            store.save_fact(fact)
            total_facts.append(fact)

        for ev in result.events:
            val_ev = EvidenceIntegrityValidator.validate_event(ev, store)
            assert val_ev.is_valid is True, f"Invalid event: {val_ev.errors}"
            total_events.append(ev)

    # Ingestion Assertions
    assert len(ingested_artifacts) == 11
    assert len(total_observations) >= 11
    assert len(total_facts) >= 11
    assert len(store.artifacts) == 11

    # 7. Test Cross-Source Entity Resolution (Preserving LayeredEntityResolutionEngine)
    # Target: Vikram Singh from CCTNS FIR
    # Candidate: Bikram Sing from Mobile UFED dump
    e1 = CanonicalEntity(
        id="P001",
        type=EntityType.PERSON,
        display_name="Vikram Singh",
        canonical_identifiers={"aadhaar": "998811223344"},
        aliases=["Vicky", "Vicky Don"],
        source_references=["FIR-2026-001"],
    )
    e2 = CanonicalEntity(
        id="P001-MOB",
        type=EntityType.PERSON,
        display_name="Bikram Sing",  # Transliteration / spelling variation
        canonical_identifiers={},
        aliases=["Vicky"],
        source_references=["UFED-OP11-001"],
    )

    er_engine = LayeredEntityResolutionEngine()
    er_result = er_engine.resolve_entities(
        target=e1,
        candidate=e2,
        contextual_data={
            "shared_phones": ["919999011223"],
            "shared_cases": ["CASE-2026-001"],
            "shared_locations": ["DND Toll Flyway Plaza"],
        },
    )

    # Ambiguity check: Must be a CANDIDATE_MATCH or HIGHLY_LIKELY, NOT an automatic silent merge
    assert er_result.resolution_status in ("CANDIDATE_MATCH", "HIGHLY_LIKELY")
    assert er_result.requires_human_review is True
    assert "not identity certainty" in er_result.epistemic_disclaimer
    assert len(er_result.supporting_signals) >= 2  # Alias, transliteration, contextual phone

    # 8. Verify Source Locations and Provenance on Facts
    for fact in total_facts:
        assert fact.source_location is not None and len(fact.source_location) > 0
        assert fact.source_artifact_id in store.artifacts
        # Verify backward trace to original artifact and custody
        artifact = store.get_artifact(fact.source_artifact_id)
        assert artifact is not None
        assert len(artifact.custody_chain) >= 1

    # 9. Verify Intentional Contradictions are Preserved Independently
    # Contradiction A: ANPR vehicle sighting vs Cell Tower Ping
    anpr_facts = [f for f in total_facts if "DND Toll" in str(f.object)]
    cell_facts = [f for f in total_facts if "TOWER-DEL-SOUTH-88" in str(f.object)]
    assert len(anpr_facts) >= 1
    assert len(cell_facts) >= 1
    # Both facts exist side-by-side with separate observation IDs and source locations
    assert anpr_facts[0].source_artifact_id != cell_facts[0].source_artifact_id

    # Contradiction B: Witness alibi statement vs Toll Sighting
    alibi_facts = [f for f in total_facts if f.predicate == "TESTIFIED_IN_DOCUMENT"]
    assert len(alibi_facts) >= 1
    # The alibi fact is preserved as a fact of testimony (epistemic separation: testimony != truth)
    assert alibi_facts[0].source_reliability.value == "B_USUALLY_RELIABLE"

    # 10. Verify Graph Relationships Created
    assert len(store.relationships) >= len(total_facts)
    # Check that relationship has evidence references
    contact_rel = next((r for r in store.relationships if r.relationship_type == "CONTACTED"), None)
    assert contact_rel is not None
    assert len(contact_rel.evidence_references) >= 1
