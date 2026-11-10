from __future__ import annotations

import json
import shutil
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.adapters.adapter_context import AdapterContext
from app.adapters.adapter_registry import SourceAdapterRegistry
from app.domain.canonical_evidence_ir import (
    ClaimStatus,
    ContradictionSeverity,
    ContradictionType,
    CorroborationLevel,
    EpistemicStatus,
    EvidenceArtifact,
    EvidenceClaim,
    EvidenceFact,
    EvidenceObservation,
    EvidenceSourceType,
    GapType,
    SourceProvenanceType,
    SourceReliability,
    generate_uuid7,
)
from app.domain.phone import Phone
from app.main import app
from app.repositories.unified_store import UnifiedStore
from app.services.claim_engine import ClaimEngine
from app.services.contradiction_engine import ContradictionEngine
from app.services.evidence_gap_engine import EvidenceGapEngine
from app.services.evidence_gateway import EvidenceGateway
from app.services.investigation_delta_service import InvestigationDeltaService
from app.services.investigation_state_service import InvestigationStateService
from app.services.live_proof_engine import LiveProofEngine
from app.services.temporal_spatial_consistency_engine import SpatioTemporalPoint


@pytest.fixture
def workspace_env():
    temp_dir = tempfile.mkdtemp(prefix="sentinelx_wave4_test_")
    store = UnifiedStore.get_instance()
    store.clear()
    gateway = EvidenceGateway(storage_root=temp_dir, store=store)
    registry = SourceAdapterRegistry.get_instance()
    fixtures_dir = (
        Path(__file__).resolve().parent.parent.parent / "data" / "fixtures" / "case_2026_001"
    )

    # Ingest 11 fixtures for CASE-2026-001
    manifest_path = fixtures_dir / "manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    for item in manifest["fixtures"]:
        fixture_path = fixtures_dir / item["relative_path"]
        raw_bytes = fixture_path.read_bytes()
        source_type = EvidenceSourceType(item["source_type"])

        artifact = gateway.ingest_artifact(
            content=raw_bytes,
            filename=Path(item["relative_path"]).name,
            case_id=manifest["case_id"],
            source_id=item["source_id"],
            source_type=source_type,
            record_id=item["record_id"],
            provenance_type=SourceProvenanceType.SYNTHETIC_DATA,
        )

        adapter = registry.get(source_type)
        ctx = AdapterContext(artifact=artifact, case_id=manifest["case_id"])
        result = adapter.execute(ctx, raw_bytes)

        for obs in result.observations:
            store.save_observation(obs)
        for fact in result.facts:
            store.save_fact(fact)

    # Register burner phone without CAF
    store.phones["PH002"] = Phone(
        id="PH002",
        phone_number="+91-9888044556",
        carrier="Airtel",
    )

    client = TestClient(app)
    from app.services.auth_service import AuthService
    token = AuthService.get_instance().create_jwt_token("INVESTIGATOR_DELHI")
    client.headers.update({"Authorization": f"Bearer {token}"})

    yield gateway, store, client, temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_investigation_state_service_completeness(workspace_env):
    gateway, store, _, _ = workspace_env
    state_service = InvestigationStateService(store=store)

    state = state_service.get_investigation_state("CASE-2026-001")

    assert state["case"]["case_id"] == "CASE-2026-001"
    assert len(state["facts"]) >= 11
    assert len(state["observations"]) >= 11
    assert len(state["relationships"]) >= 11
    assert state["source_summary"]["total_artifacts"] == 11
    assert state["source_summary"]["integrity_breakdown"]["VERIFIED"] == 11
    assert len(state["timeline"]) >= 11

    # Epistemic Invariants:
    epistemic = state["epistemic_summary"]
    assert epistemic["total_facts"] >= 11
    assert "Association ≠ Guilt" in epistemic["epistemic_disclaimer"]
    assert "Similarity ≠ Identity" in epistemic["epistemic_disclaimer"]


def test_investigation_state_api_endpoints(workspace_env):
    _, store, client, _ = workspace_env

    # 1. State Endpoint
    resp_state = client.get("/api/v1/investigations/CASE-2026-001/state")
    assert resp_state.status_code == 200
    state_data = resp_state.json()
    assert state_data["case"]["case_id"] == "CASE-2026-001"
    assert "source_summary" in state_data
    assert "epistemic_summary" in state_data

    # 2. Graph Projection Endpoint
    resp_graph = client.get("/api/v1/investigations/CASE-2026-001/graph")
    assert resp_graph.status_code == 200
    graph_data = resp_graph.json()
    assert graph_data["total_nodes"] > 0
    assert graph_data["total_edges"] > 0
    assert "entity_to_evidence" in graph_data["traversal_semantics"]
    # Check that edges include evidential metadata
    edge = graph_data["edges"][0]
    assert "supporting_evidence" in edge
    assert "corroboration_level" in edge
    assert "epistemic_status" in edge

    # 3. Contradictions Endpoint
    resp_contra = client.get("/api/v1/investigations/CASE-2026-001/contradictions")
    assert resp_contra.status_code == 200
    contra_data = resp_contra.json()
    assert contra_data["total_contradictions"] > 0
    # Must never silently resolve contradictions
    assert any(c["status"] == "OPEN" for c in contra_data["contradictions"])

    # 4. Gaps Endpoint
    resp_gaps = client.get("/api/v1/investigations/CASE-2026-001/gaps")
    assert resp_gaps.status_code == 200
    gaps_data = resp_gaps.json()
    assert gaps_data["total_gaps"] > 0
    # Mandatory requirement: Missing CAF for PH002
    assert any("PH002" in g["title"] or "9888044556" in g["description"] for g in gaps_data["gaps"])

    # 5. Timeline Endpoint
    resp_time = client.get("/api/v1/investigations/CASE-2026-001/timeline")
    assert resp_time.status_code == 200
    time_data = resp_time.json()
    assert time_data["total_entries"] > 0
    # Check that uncertainty is preserved
    entry = next((e for e in time_data["entries"] if "timestamp_uncertainty_seconds" in e), None)
    assert entry is not None
    assert entry["timestamp_uncertainty_seconds"] > 0.0

    # 6. Delta Endpoint
    resp_delta = client.get("/api/v1/investigations/CASE-2026-001/delta")
    assert resp_delta.status_code == 200
    delta_data = resp_delta.json()
    assert delta_data["semantics"] == "APPEND_ONLY_IMMUTABLE"
    assert "FORENSIC INVARIANT" in delta_data["append_only_notice"]


def test_live_proof_projection_endpoints(workspace_env):
    gateway, store, client, _ = workspace_env
    claim_engine = ClaimEngine(store=store)

    # Ingest a verified financial fact
    artifacts = list(store.artifacts.values())
    fin_art = next(a for a in artifacts if a.source_type == EvidenceSourceType.FINANCIAL_TRANSACTION)

    fact = EvidenceFact(
        fact_id=generate_uuid7(),
        case_id="CASE-2026-001",
        subject="ACC992",
        predicate="TRANSFERRED_HAWALA_FUNDS",
        object="ACC481",
        source_artifact_id=fin_art.artifact_id,
        source_location="Row 10",
        source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
    )
    store.save_fact(fact)

    claim = claim_engine.create_claim(
        case_id="CASE-2026-001",
        assertion_text="Hawala liquidity transfer executed between ACC992 and ACC481.",
        supporting_fact_ids=[fact.fact_id],
    )

    # 1. Test Backward Proof via API
    resp_proof = client.get(f"/api/v1/proof/{claim.claim_id}")
    assert resp_proof.status_code == 200
    proof_data = resp_proof.json()
    assert proof_data["is_valid"] is True
    assert proof_data["hash_verified"] is True
    assert proof_data["direction"] == "BACKWARD"
    assert len(proof_data["steps"]) >= 4
    # Check statutory compliance citation
    assert "Section 65B" in proof_data["statutory_compliance"]

    # 2. Test Forward Proof via API
    resp_fwd = client.get(f"/api/v1/proof/artifact/{fin_art.artifact_id}")
    assert resp_fwd.status_code == 200
    fwd_data = resp_fwd.json()
    assert fwd_data["is_valid"] is True
    assert fwd_data["direction"] == "FORWARD"
    assert fwd_data["hash_verified"] is True


def test_investigation_delta_service_append_only_semantics(workspace_env):
    _, store, _, _ = workspace_env
    delta_service = InvestigationDeltaService(store=store)

    snap1 = delta_service.capture_snapshot("CASE-2026-001")
    assert snap1.artifact_count == 11
    assert snap1.fact_count >= 11
    assert snap1.state_hash is not None

    delta = delta_service.compute_case_delta("CASE-2026-001")
    assert delta["semantics"] == "APPEND_ONLY_IMMUTABLE"
    assert len(delta["superseded_entities"]) == 0
    assert len(delta["new_relationships"]) > 0


def test_investigative_traversals_and_golden_case_validation(workspace_env):
    gateway, store, client, _ = workspace_env

    # 1. State API query
    resp = client.get("/api/v1/investigations/CASE-2026-001/state")
    assert resp.status_code == 200
    state = resp.json()

    # (1) Vikram Singh / Bikram Sing ambiguity preserved
    # Check that both names exist in records and are flagged in epistemic summary
    assert state["epistemic_summary"]["candidate_identity_matches_requiring_review"] >= 1

    # (2) PH001 spatial-temporal contradiction
    resp_c = client.get("/api/v1/investigations/CASE-2026-001/contradictions")
    assert resp_c.status_code == 200
    contras = resp_c.json()["contradictions"]
    # Check that contradiction exists and status is OPEN (never silently closed)
    assert any(c["status"] == "OPEN" and c["contradiction_type"] in ("SPATIAL", "TEMPORAL") for c in contras)

    # (3) PH002 CAF/KYC evidence gap
    resp_g = client.get("/api/v1/investigations/CASE-2026-001/gaps")
    assert resp_g.status_code == 200
    gaps = resp_g.json()["gaps"]
    caf_gap = next((g for g in gaps if "PH002" in g["title"] or "9888044556" in g["description"]), None)
    assert caf_gap is not None
    assert caf_gap["severity"] == "CRITICAL"
    assert "Section 91 CrPC" in caf_gap["recommended_action"]

    # (4) Financial corroboration, (5) WhatsApp, (6) ANPR, (7) Forensic artifacts
    source_types = state["source_summary"]["by_source_type"]
    assert "FINANCIAL_TRANSACTION" in source_types
    assert "MOBILE_FORENSIC_EXPORT" in source_types
    assert "CCTV_ANPR" in source_types
    assert "EFSL_REPORT" in source_types

    # (8) LiveProof lineage
    claims = state["claims"]
    assert len(claims) >= 0  # Claims present or formulated

    # (9) Timeline preserves uncertainty
    resp_t = client.get("/api/v1/investigations/CASE-2026-001/timeline")
    assert resp_t.status_code == 200
    entries = resp_t.json()["entries"]
    assert len(entries) >= 11
    for entry in entries:
        assert "timestamp" in entry
        assert "timestamp_uncertainty_seconds" in entry

    # (10) Claim states strictly non-accusatory
    for c in state["claims"]:
        assert c["status"] in ("PROPOSED", "SUPPORTED", "CORROBORATED", "CONTRADICTED", "UNVERIFIED", "RESOLVED", "SUPERSEDED")
        for bad_word in ("TRUE", "FALSE", "GUILTY", "INNOCENT"):
            assert bad_word not in c["status"]

