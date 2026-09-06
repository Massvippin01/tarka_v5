from __future__ import annotations

import pytest
from app.domain.canonical_entity import CanonicalEntity, EntityType, ProvenanceMetadata
from app.domain.canonical_relationship import CanonicalRelationship, RelationshipType
from app.graph.graph_algorithms import GraphAlgorithms
from app.generators.scenario_generator import ScenarioGenerator
from app.repositories.unified_store import UnifiedStore
from app.services.layered_entity_resolution import LayeredEntityResolutionEngine
from app.services.normalization_service import NormalizationService


def test_normalization_pipeline_phone():
    res = NormalizationService.normalize_phone("+91 98765-43210", source_ref="TEST_CDR")
    assert res.raw_value == "+91 98765-43210"
    assert res.normalized_value == "919876543210"
    assert res.normalization_method == "PHONE_E164_STANDARDIZATION"
    assert res.source_reference == "TEST_CDR"


def test_normalization_pipeline_vehicle():
    res = NormalizationService.normalize_vehicle_registration("ka 05-ab 1234", source_ref="TEST_ANPR")
    assert res.raw_value == "ka 05-ab 1234"
    assert res.normalized_value == "KA05AB1234"
    assert res.normalization_method == "VEHICLE_REG_ALPHA_NUMERIC_UPPERCASE"


def test_normalization_pipeline_name():
    res = NormalizationService.normalize_name("Shri Vikram Dev Singh.", source_ref="TEST_CCTNS")
    assert res.raw_value == "Shri Vikram Dev Singh."
    assert res.normalized_value == "Vikram Dev Singh"
    assert res.normalization_method == "NAME_UNICODE_HONORIFIC_STRIP_TITLECASE"


def test_normalization_pipeline_alias():
    res = NormalizationService.normalize_alias("Vicky 'Don'!")
    assert res.raw_value == "Vicky 'Don'!"
    assert res.normalized_value == "vicky don"


def test_normalization_pipeline_address():
    res = NormalizationService.normalize_address("Plot No. 42, St. 5, Sect. 12")
    assert "Street" in res.normalized_value
    assert "Sector" in res.normalized_value
    assert "Number" in res.normalized_value


def test_normalization_pipeline_organization():
    res = NormalizationService.normalize_organization("Sentinel Solutions Private Limited")
    assert res.normalized_value == "Sentinel Solutions Pvt Ltd"


def test_canonical_entity_safe_masking():
    entity = CanonicalEntity(
        id="P-101",
        type=EntityType.PERSON,
        display_name="Vikram Singh",
        canonical_identifiers={
            "aadhaar": "998811223344",
            "pan": "ABCDE1234F",
            "account_number": "3099882211",
        },
    )
    safe = entity.to_safe_dict()
    masked = safe["canonical_identifiers_masked"]
    assert masked["aadhaar"] == "XXXX-XXXX-3344"
    assert masked["pan"] == "ABXXXXX34F"
    assert masked["account_number"] == "XXXXXX2211"


def test_layered_resolution_exact_match():
    e1 = CanonicalEntity(
        id="P-001",
        type=EntityType.PERSON,
        display_name="Vikram Singh",
        canonical_identifiers={"aadhaar": "998811223344"},
        aliases=["Vicky"],
    )
    e2 = CanonicalEntity(
        id="P-002",
        type=EntityType.PERSON,
        display_name="V. Singh",
        canonical_identifiers={"aadhaar": "998811223344"},
        aliases=["Vicky Don"],
    )
    engine = LayeredEntityResolutionEngine()
    res = engine.resolve_entities(e1, e2)
    assert res.resolution_status in ("CONFIRMED_MATCH", "HIGHLY_LIKELY")
    assert res.resolution_confidence >= 0.85
    assert res.requires_human_review is True
    assert len(res.supporting_signals) >= 1
    assert any(s.stage_name == "EXACT_DETERMINISTIC_IDENTIFIER" for s in res.supporting_signals)


def test_layered_resolution_contradictory_identifiers():
    e1 = CanonicalEntity(
        id="P-001",
        type=EntityType.PERSON,
        display_name="Vikram Singh",
        canonical_identifiers={"aadhaar": "998811223344"},
    )
    e2 = CanonicalEntity(
        id="P-002",
        type=EntityType.PERSON,
        display_name="Vikram Singh",
        canonical_identifiers={"aadhaar": "111122223333"},
    )
    engine = LayeredEntityResolutionEngine()
    res = engine.resolve_entities(e1, e2)
    assert res.resolution_status == "CONTRADICTED"
    assert len(res.contradicting_signals) >= 1
    assert any(s.stage_name == "EXACT_DETERMINISTIC_IDENTIFIER" for s in res.contradicting_signals)


def test_canonical_relationship_provenance():
    rel = CanonicalRelationship(
        relationship_id="REL-001",
        source_id="P001",
        target_id="PH001",
        type=RelationshipType.USES,
        evidence_refs=["CDR Log #CDR001"],
        valid_from="2026-05-01T00:00:00Z",
        valid_to="2026-08-30T00:00:00Z",
    )
    assert rel.confidence == 1.0
    assert "CDR Log #CDR001" in rel.evidence_refs
    assert rel.valid_from == "2026-05-01T00:00:00Z"


def test_graph_temporal_filtering():
    store = UnifiedStore.get_instance()
    store.clear()
    ScenarioGenerator.generate_golden_vertical_slice()

    alg = GraphAlgorithms(store)
    subgraph = alg.temporal_filtered_subgraph(start_date="2026-01-01", end_date="2026-12-31")
    assert subgraph["nodes_count"] > 0
    assert subgraph["edges_count"] > 0


def test_graph_community_detection_safety():
    store = UnifiedStore.get_instance()
    store.clear()
    ScenarioGenerator.generate_golden_vertical_slice()

    alg = GraphAlgorithms(store)
    comm = alg.community_detection()
    assert "safety_notice" in comm
    assert "NOT a criminal syndicate" in comm["safety_notice"]
    assert len(comm["communities"]) >= 1


def test_graph_centrality_safety():
    store = UnifiedStore.get_instance()
    store.clear()
    ScenarioGenerator.generate_golden_vertical_slice()

    alg = GraphAlgorithms(store)
    deg = alg.degree_centrality()
    assert "safety_notice" in deg
    assert "does NOT imply criminality" in deg["safety_notice"]


def test_golden_vertical_slice_reproducibility():
    store = UnifiedStore.get_instance()
    store.clear()
    scen = ScenarioGenerator.generate_golden_vertical_slice()

    assert scen.scenario_id == "SCENARIO-001"
    assert "P001" in store.persons
    assert "P044" in store.persons
    assert "C102" in store.cases
    assert "C481" in store.cases

    alg = GraphAlgorithms(store)
    path = alg.shortest_path("C102", "C481")
    path_ids = [n["id"] for n in path]
    assert "C102" in path_ids
    assert "C481" in path_ids
    assert len(path) > 1
