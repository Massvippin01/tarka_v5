from __future__ import annotations

import hashlib
import json
import os
import shutil
import tempfile
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from app.adapters.adapter_context import AdapterContext
from app.adapters.adapter_registry import SourceAdapterRegistry
from app.domain.canonical_entity import CanonicalEntity, EntityType
from app.domain.canonical_evidence_ir import (
    ClaimStatus,
    ContradictionSeverity,
    ContradictionType,
    CorroborationLevel,
    CustodyEventType,
    EpistemicStatus,
    EvidenceArtifact,
    EvidenceClaim,
    EvidenceContradiction,
    EvidenceCustodyEvent,
    EvidenceFact,
    EvidenceGap,
    EvidenceHypothesis,
    EvidenceObservation,
    EvidenceProvenance,
    EvidenceSourceType,
    GapType,
    IntegrityStatus,
    SourceProvenanceType,
    SourceReliability,
    generate_uuid7,
)
from app.domain.phone import Phone
from app.repositories.unified_store import UnifiedStore
from app.services.claim_engine import ClaimEngine
from app.services.contradiction_engine import ContradictionEngine
from app.services.evidence_gap_engine import EvidenceGapEngine
from app.services.evidence_gateway import EvidenceGateway
from app.services.evidence_integrity_validator import EvidenceIntegrityValidator
from app.services.live_proof_engine import LiveProofEngine
from app.services.temporal_spatial_consistency_engine import (
    ConsistencyVerdict,
    SpatioTemporalPoint,
    TemporalSpatialConsistencyEngine,
    TravelModel,
)


@pytest.fixture
def reasoning_env():
    temp_dir = tempfile.mkdtemp(prefix="sentinelx_reasoning_test_")
    store = UnifiedStore.get_instance()
    store.clear()
    gateway = EvidenceGateway(storage_root=temp_dir, store=store)
    registry = SourceAdapterRegistry.get_instance()
    fixtures_dir = (
        Path(__file__).resolve().parent.parent.parent / "data" / "fixtures" / "case_2026_001"
    )

    yield gateway, store, registry, fixtures_dir, temp_dir
    shutil.rmtree(temp_dir, ignore_errors=True)


# =========================================================================
# 1. CLAIM ENGINE TESTS
# =========================================================================

def test_claim_lifecycle_and_epistemic_statuses(reasoning_env):
    gateway, store, _, _, _ = reasoning_env
    claim_engine = ClaimEngine(store=store)

    # Ingest two distinct artifacts
    art1 = gateway.ingest_artifact(
        content=b"ARTIFACT_1_TELECOM_DATA",
        filename="cdr1.txt",
        case_id="CASE-2026-001",
        source_id="SRC-TEL-1",
        source_type=EvidenceSourceType.CDR_TELECOM,
        record_id="CDR-REC-1",
    )
    art2 = gateway.ingest_artifact(
        content=b"ARTIFACT_2_FINANCIAL_LOG",
        filename="bank1.json",
        case_id="CASE-2026-001",
        source_id="SRC-BANK-1",
        source_type=EvidenceSourceType.FINANCIAL_TRANSACTION,
        record_id="TX-REC-1",
    )

    # 1. Fact 1
    fact1 = EvidenceFact(
        fact_id=generate_uuid7(),
        case_id="CASE-2026-001",
        subject="P001",
        predicate="COMMUNICATED_WITH",
        object="P044",
        source_artifact_id=art1.artifact_id,
        source_location="Row 10",
        source_reliability=SourceReliability.B_USUALLY_RELIABLE,
    )
    store.save_fact(fact1)

    # Initial Claim with Fact 1 -> SUPPORTED (single source)
    claim = claim_engine.create_claim(
        case_id="CASE-2026-001",
        assertion_text="Suspect P001 coordinated with associate P044.",
        claim_type=EpistemicStatus.INFERENCE,
        supporting_fact_ids=[fact1.fact_id],
    )

    assert claim.status == ClaimStatus.SUPPORTED
    assert claim.corroboration == CorroborationLevel.SINGLE_SOURCE
    # Non-accusatory validation: No TRUE/FALSE/GUILTY/INNOCENT
    for invalid_word in ("TRUE", "FALSE", "GUILTY", "INNOCENT"):
        assert invalid_word not in claim.status.value

    # 2. Corroborate with Fact 2 from second distinct artifact -> CORROBORATED
    fact2 = EvidenceFact(
        fact_id=generate_uuid7(),
        case_id="CASE-2026-001",
        subject="P001",
        predicate="TRANSFERRED_FUNDS",
        object="P044",
        source_artifact_id=art2.artifact_id,
        source_location="Tx #998",
        source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
    )
    store.save_fact(fact2)
    claim_engine.attach_supporting_fact(claim.claim_id, fact2.fact_id)

    updated_claim = store.get_claim(claim.claim_id)
    assert updated_claim.status == ClaimStatus.CORROBORATED
    assert updated_claim.corroboration == CorroborationLevel.CORROBORATED
    assert updated_claim.source_reliability == SourceReliability.A_COMPLETELY_RELIABLE
    assert updated_claim.confidence_score >= 0.8

    # 3. Introduce Contradicting Fact -> CONTRADICTED
    fact_contra = EvidenceFact(
        fact_id=generate_uuid7(),
        case_id="CASE-2026-001",
        subject="P001",
        predicate="REFUTED_COMMUNICATION",
        object="P044",
        source_artifact_id=art1.artifact_id,
        source_location="Row 99",
    )
    store.save_fact(fact_contra)
    claim_engine.attach_contradicting_fact(claim.claim_id, fact_contra.fact_id)

    contra_claim = store.get_claim(claim.claim_id)
    assert contra_claim.status == ClaimStatus.CONTRADICTED
    assert contra_claim.corroboration == CorroborationLevel.CONTRADICTED


# =========================================================================
# 2. TEMPORAL / SPATIAL CONSISTENCY ENGINE TESTS
# =========================================================================

def test_temporal_spatial_consistency_kinematics():
    engine = TemporalSpatialConsistencyEngine()

    t0 = datetime(2026, 9, 22, 9, 0, 0, tzinfo=UTC)
    # Point A: Connaught Place, New Delhi (28.6315, 77.2167)
    pA = SpatioTemporalPoint(timestamp=t0, lat=28.6315, lng=77.2167, label="Connaught Place")

    # Case 1: 5 km away in 15 minutes (~20 km/h) -> CONSISTENT
    t1 = t0 + timedelta(minutes=15)
    p_near = SpatioTemporalPoint(timestamp=t1, lat=28.5900, lng=77.2200, label="India Gate")
    eval_consistent = engine.evaluate_points(pA, p_near)
    assert eval_consistent.verdict == ConsistencyVerdict.CONSISTENT
    assert eval_consistent.required_speed_kmh < 50.0

    # Case 2: South Delhi to DND Toll (14 km in 3 minutes = ~280 km/h ground speed) -> INCONSISTENT
    # (Without hardcoded heuristic: derived strictly from Urban Ground Vehicle model)
    t2 = t0 + timedelta(minutes=3)
    p_dnd = SpatioTemporalPoint(timestamp=t2, lat=28.5772, lng=77.2917, label="DND Toll Plaza")
    eval_inconsistent = engine.evaluate_points(pA, p_dnd)
    assert eval_inconsistent.verdict == ConsistencyVerdict.INCONSISTENT
    assert eval_inconsistent.required_speed_kmh > 120.0
    assert "Physically implausible transit" in eval_inconsistent.explanation

    # Case 3: Missing coordinates -> INSUFFICIENT_INFORMATION
    p_no_coords = SpatioTemporalPoint(timestamp=t0, lat=None, lng=None)
    eval_missing = engine.evaluate_points(pA, p_no_coords)
    assert eval_missing.verdict == ConsistencyVerdict.INSUFFICIENT_INFORMATION


# =========================================================================
# 3. CONTRADICTION ENGINE TESTS
# =========================================================================

def test_contradiction_engine_detection_and_invariants(reasoning_env):
    _, store, _, _, _ = reasoning_env
    contradiction_engine = ContradictionEngine(store=store)

    t_base = datetime(2026, 9, 22, 9, 38, 0, tzinfo=UTC)
    t_toll = t_base + timedelta(minutes=3)

    p1 = SpatioTemporalPoint(timestamp=t_base, lat=28.5355, lng=77.2189, label="South Delhi Tower")
    p2 = SpatioTemporalPoint(timestamp=t_toll, lat=28.5772, lng=77.2917, label="DND Toll Camera")

    # Evaluate kinematic pair
    contra = contradiction_engine.evaluate_spatiotemporal_pair(
        case_id="CASE-2026-001",
        fact_a_id="FACT-CDR-SOUTH-DELHI",
        fact_b_id="FACT-ANPR-DND-TOLL",
        point_a=p1,
        point_b=p2,
    )

    assert contra is not None
    assert contra.contradiction_type == ContradictionType.SPATIAL
    assert contra.severity in (ContradictionSeverity.CRITICAL, ContradictionSeverity.HIGH)
    assert contra.status == "OPEN"
    assert "Kinematic impossibility" in contra.reason
    assert len(contra.required_verification) > 0

    # Invariant: Must NOT silently resolve contradiction
    saved_contra = store.get_contradiction(contra.contradiction_id)
    assert saved_contra is not None
    assert saved_contra.status == "OPEN"
    assert saved_contra.resolved_at is None


# =========================================================================
# 4. EVIDENCE GAP ENGINE TESTS
# =========================================================================

def test_evidence_gap_engine_formal_deduction(reasoning_env):
    gateway, store, _, _, _ = reasoning_env
    gap_engine = EvidenceGapEngine(store=store)

    # Register phone entity PH002 without CAF
    phone_burner = Phone(
        id="PH002",
        phone_number="+91-9888044556",
        carrier="Airtel",
    )
    store.phones["PH002"] = phone_burner

    # Ingest CDR artifact (available evidence)
    art_cdr = gateway.ingest_artifact(
        content=b"CDR_LOG_BURNER_SIM_EXCHANGE",
        filename="cdr_log.txt",
        case_id="CASE-2026-001",
        source_id="SRC-AIRTEL-CDR",
        source_type=EvidenceSourceType.CDR_TELECOM,
        record_id="CDR-REC-991",
    )

    # Synthesize gaps
    gaps = gap_engine.synthesize_gaps_for_case("CASE-2026-001")

    # Verify missing CAF gap is generated
    caf_gap = next((g for g in gaps if g.gap_type == GapType.IDENTITY_VERIFICATION), None)
    assert caf_gap is not None
    assert "PH002" in caf_gap.title or "9888044556" in caf_gap.description
    assert caf_gap.severity == "CRITICAL"
    assert "Section 91 CrPC" in caf_gap.recommended_action
    assert art_cdr.artifact_id in caf_gap.available_evidence_ids


# =========================================================================
# 5. LIVE PROOF ENGINE (BACKWARD & FORWARD LINEAGE) TESTS
# =========================================================================

def test_live_proof_engine_unbroken_backward_and_forward(reasoning_env):
    gateway, store, _, _, _ = reasoning_env
    proof_engine = LiveProofEngine(store=store)
    claim_engine = ClaimEngine(store=store)

    # 1. Ingest physical artifact with gateway
    raw_content = b'{"transaction_id": "HAWALA-8819", "amount": 2500000, "beneficiary": "P044"}'
    artifact = gateway.ingest_artifact(
        content=raw_content,
        filename="hawala_transfer.json",
        case_id="CASE-2026-001",
        source_id="SRC-FIN-SPECIAL-CELL",
        source_type=EvidenceSourceType.FINANCIAL_TRANSACTION,
        record_id="HAWALA-8819",
        provenance_type=SourceProvenanceType.SIMULATED_AUTHORIZED_SOURCE,
    )

    # 2. Create observation
    obs = EvidenceObservation(
        observation_id=generate_uuid7(),
        artifact_id=artifact.artifact_id,
        case_id="CASE-2026-001",
        source_location="hawala_transfer.json -> Line 1",
        observation_type="HAWALA_TRANSFER",
        raw_data={"amount": 2500000},
    )
    store.save_observation(obs)

    # 3. Create fact
    fact = EvidenceFact(
        fact_id=generate_uuid7(),
        case_id="CASE-2026-001",
        subject="P001",
        predicate="FURNISHED_HAWALA_CAPITAL",
        object="P044",
        source_artifact_id=artifact.artifact_id,
        source_observation_id=obs.observation_id,
        source_location=obs.source_location,
        source_reliability=SourceReliability.A_COMPLETELY_RELIABLE,
    )
    store.save_fact(fact)

    # 4. Formulate claim
    claim = claim_engine.create_claim(
        case_id="CASE-2026-001",
        assertion_text="P001 furnished Hawala liquidity to P044.",
        supporting_fact_ids=[fact.fact_id],
    )

    # 5. Execute Backward Proof: CLAIM -> RELATIONSHIP -> FACT -> OBSERVATION -> ARTIFACT -> SHA-256 -> PROVENANCE -> CUSTODY
    proof_bwd = proof_engine.prove_claim_backward(claim.claim_id)
    assert proof_bwd.is_valid is True, f"Backward proof failed: {proof_bwd.errors}"
    assert proof_bwd.hash_verified is True
    assert proof_bwd.provenance_verified is True
    assert proof_bwd.custody_verified is True
    assert proof_bwd.source_location_verified is True

    # 6. Execute Forward Proof: ARTIFACT -> OBSERVATION -> FACT -> RELATIONSHIP -> CLAIM -> HYPOTHESIS
    proof_fwd = proof_engine.prove_artifact_forward(artifact.artifact_id)
    assert proof_fwd.is_valid is True, f"Forward proof failed: {proof_fwd.errors}"
    assert proof_fwd.hash_verified is True
    assert any(s.level == "CLAIM" and s.identifier == claim.claim_id for s in proof_fwd.steps)


def test_live_proof_engine_broken_lineage_detection(reasoning_env):
    gateway, store, _, _, _ = reasoning_env
    proof_engine = LiveProofEngine(store=store)
    claim_engine = ClaimEngine(store=store)

    # Ingest artifact
    artifact = gateway.ingest_artifact(
        content=b"AUTHENTIC_CONTENT_DATA",
        filename="doc.txt",
        case_id="CASE-2026-001",
        source_id="SRC-DOC-1",
        source_type=EvidenceSourceType.FORENSIC_DOCUMENT,
        record_id="DOC-1",
    )

    fact = EvidenceFact(
        fact_id=generate_uuid7(),
        case_id="CASE-2026-001",
        subject="P001",
        predicate="SIGNED_AGREEMENT",
        object="AGREEMENT-001",
        source_artifact_id=artifact.artifact_id,
        source_location="Page 1",
    )
    store.save_fact(fact)

    claim = claim_engine.create_claim(
        case_id="CASE-2026-001",
        assertion_text="P001 signed agreement.",
        supporting_fact_ids=[fact.fact_id],
    )

    # Corrupt the artifact content hash to simulate tamper
    corrupted_art = store.get_artifact(artifact.artifact_id)
    corrupted_art.content_hash = "0" * 64
    store.save_artifact(corrupted_art)

    proof = proof_engine.prove_claim_backward(claim.claim_id)
    # Proof MUST fail
    assert proof.is_valid is False
    assert proof.hash_verified is False
    assert any("Cryptographic hash mismatch" in err or "mismatch" in err.lower() for err in proof.errors)


# =========================================================================
# 6. GOLDEN CASE (CASE-2026-001) COMPLETE REASONING WORKFLOW
# =========================================================================

def test_golden_case_wave3_full_reasoning_pipeline(reasoning_env):
    gateway, store, registry, fixtures_dir, _ = reasoning_env
    claim_engine = ClaimEngine(store=store)
    consistency_engine = TemporalSpatialConsistencyEngine()
    contradiction_engine = ContradictionEngine(store=store)
    gap_engine = EvidenceGapEngine(store=store)
    proof_engine = LiveProofEngine(store=store)

    # 1. Ingest all 11 Golden Case Fixtures
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

    # Register entities
    store.phones["PH002"] = Phone(
        id="PH002",
        phone_number="+91-9888044556",
        carrier="Airtel",
    )

    # 2. Verify CDR/ANPR Temporal-Spatial Inconsistency
    t_cdr = datetime(2026, 9, 22, 9, 38, 0, tzinfo=UTC)
    t_anpr = datetime(2026, 9, 22, 9, 41, 0, tzinfo=UTC)
    p_cdr = SpatioTemporalPoint(timestamp=t_cdr, lat=28.5355, lng=77.2189, label="CDR South Delhi")
    p_anpr = SpatioTemporalPoint(timestamp=t_anpr, lat=28.5772, lng=77.2917, label="ANPR DND Toll")

    eval_result = consistency_engine.evaluate_points(p_cdr, p_anpr)
    assert eval_result.verdict == ConsistencyVerdict.INCONSISTENT

    # 3. Create First-Class EvidenceContradiction
    contra = contradiction_engine.evaluate_spatiotemporal_pair(
        case_id="CASE-2026-001",
        fact_a_id="FACT-CDR-0938",
        fact_b_id="FACT-ANPR-0941",
        point_a=p_cdr,
        point_b=p_anpr,
    )
    assert contra is not None
    assert contra.status == "OPEN"
    # Never automatically resolve contradiction or declare one as true
    assert contra.resolved_at is None

    # 4. Generate Missing CAF EvidenceGap for PH002
    gaps = gap_engine.synthesize_gaps_for_case("CASE-2026-001")
    caf_gap = next((g for g in gaps if g.gap_type == GapType.IDENTITY_VERIFICATION), None)
    assert caf_gap is not None
    assert "PH002" in caf_gap.title or "9888044556" in caf_gap.description

    # 5. Formulate Claims over Case Facts and Verify LiveProof
    facts = list(store.facts.values())
    assert len(facts) >= 11
    # Pick financial Hawala fact
    hawala_fact = next((f for f in facts if "BANK" in f.predicate or "ACCOUNT" in f.predicate or "TRANSFERRED" in f.predicate), facts[0])

    claim = claim_engine.create_claim(
        case_id="CASE-2026-001",
        assertion_text="Financial record indicates Hawala layer 1 transfer.",
        supporting_fact_ids=[hawala_fact.fact_id],
    )
    assert claim.status in (ClaimStatus.SUPPORTED, ClaimStatus.CORROBORATED)

    # 6. Execute Auditable Live Proof Chain
    proof = proof_engine.prove_claim_backward(claim.claim_id)
    assert proof.is_valid is True
    assert proof.hash_verified is True
    assert proof.provenance_verified is True
    assert proof.custody_verified is True

    # 7. Verification of Strict Invariants:
    # - 0 orphan observations
    # - 0 orphan facts
    for obs in store.evidence_observations.values():
        assert obs.artifact_id in store.artifacts
    for f in store.facts.values():
        assert f.source_artifact_id in store.artifacts

    # - 0 orphan claims
    for c in store.claims.values():
        for fid in c.supporting_fact_ids:
            assert fid in store.facts

    # - 0 orphan contradictions
    for ct in store.canonical_contradictions.values():
        assert ct.case_id == "CASE-2026-001"

    # - 0 orphan gaps
    for g in store.canonical_gaps.values():
        assert g.case_id == "CASE-2026-001"

    # - No binary guilt
    for c in store.claims.values():
        assert "GUILTY" not in c.assertion_text.upper()
        assert "GUILTY" not in c.status.value
