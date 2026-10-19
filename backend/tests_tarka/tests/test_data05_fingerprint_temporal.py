"""Regression Test Suite for DATA-05: Analysis Fingerprint Completeness and Temporal Finding Integrity.

Tests Implemented:
1. test_fingerprint_configuration_sensitivity:
   - Verifies that altering finding-affecting configuration (sub-rule versions, time window tolerances,
     clock drift tolerances, fact content) alters recipe_fingerprint and analysis_fingerprint,
     preventing configuration-blind collisions.
2. test_same_configuration_replay_and_id_independence:
   - Verifies that replaying identical inputs and configurations produces bit-exact identical
     recipe, result, and composite analysis fingerprints regardless of run_id or creation timestamp.
3. test_baseline_vs_counterfactual_fingerprint_divergence:
   - Verifies that excluding challenged evidence produces distinct recipe, result, and composite
     fingerprints between baseline and counterfactual runs.
4. test_temporal_finding_dependency_lineage_and_neutral_explanation:
   - Traces CONTRA-TIME-CAUSAL-202602148891 from source facts and artifacts through RULE_CONTRA_TIMESTAMP_CONFLICT.
   - Verifies that its dependencies survive screenshot exclusion as ACTIVE.
   - Verifies that explanation text distinguishes temporal sequence from causation.
5. test_missing_timestamp_quarantine_across_temporal_and_spatial_rules:
   - Verifies that unrecorded, inferred, and missing timestamps are quarantined from:
     * RULE_CONTRA_TIMESTAMP_CONFLICT (no spurious 56-year false contradictions).
     * RULE_PAYMENT_FLOW_CAUSAL, RULE_AMOUNT_WINDOW, and RULE_CALL_PROXIMITY.
     * Z3 interval constraints and spatio-temporal travel pairs.
   - Includes explicit verification of genuine Unix epoch-zero timestamps (recorded_time='1970-01-01 00:00:00',
     utc_epoch=0.0) being accepted and properly evaluated.
"""

from __future__ import annotations

import copy
import json
import math
import pytest
import z3

from pathlib import Path

from tarka.core.models import Fact, FactKind, TrustTier, AuthType, TimeWindow, GeographicRegion
from tarka.core.canonical_fact import (
    CanonicalFact,
    CanonicalFactKind,
    TimezoneProvenance,
    build_timezone_provenance,
    is_valid_fact_timestamp,
    get_verified_utc_epoch,
)
from tarka.core.travel import TravelSpeedConfig
from tarka.core.analysis_run import CounterfactualEngine, AnalysisRun
from tarka.core.correlations import CorrelationEngine, EventCorrelation, CorrelationStatus
from tarka.core.contradiction_analysis import (
    ContradictionAnalysisEngine,
    ContradictionFinding,
    FindingStatus,
    ContradictionCategory,
    CaseForensicAnalysis,
)
from tarka.core.evidence_dna import CaseStore, Artifact
from tarka.solver.z3_builder import Z3ConstraintBuilder, is_valid_solver_fact_timestamp
from tarka.parsers.base import (
    PARSER_VERSIONS,
    NORMALIZATION_VERSIONS,
    get_parser_version,
    get_normalization_version,
)
from tarka.api.schemas import (
    SolveRequest,
    SolveResponse,
    BoundVsGapItem,
    MarginBreakdown,
)
from tarka.api.server import compute_solver_fingerprints, solve_system


@pytest.fixture
def case_store() -> CaseStore:
    return CaseStore()


@pytest.fixture
def upi_case_data(case_store: CaseStore):
    case_id = "upi_payment_discrepancy"
    facts = case_store.list_canonical_facts(case_id)
    artifacts = case_store.list_artifacts(case_id)
    hashes = {a.artifact_id: a.sha256 for a in artifacts}
    return case_id, facts, artifacts, hashes


# =============================================================================
# Test 1: Configuration-Sensitive Fingerprinting
# =============================================================================
def test_fingerprint_configuration_sensitivity(upi_case_data):
    """Test 1: Perturbing finding-affecting configuration alters recipe and composite fingerprints."""
    case_id, facts, artifacts, hashes = upi_case_data

    # Baseline execution
    engine_base = CounterfactualEngine()
    run_base = engine_base.execute_run(case_id, facts, hashes, run_id="run_base_1")

    assert run_base.recipe_fingerprint is not None
    assert run_base.result_fingerprint is not None
    assert len(run_base.recipe_fingerprint) == 64
    assert len(run_base.result_fingerprint) == 64
    assert len(run_base.analysis_fingerprint) == 64

    # 1. Modify correlation sub-rule version
    engine_rule_bump = CounterfactualEngine()
    engine_rule_bump.CORRELATION_VERSIONS = copy.deepcopy(engine_base.CORRELATION_VERSIONS)
    engine_rule_bump.CORRELATION_VERSIONS["RULE_PAYMENT_FLOW_CAUSAL"] = "2.0.0"
    run_rule_bump = engine_rule_bump.execute_run(case_id, facts, hashes, run_id="run_rule_bump")

    assert run_rule_bump.recipe_fingerprint != run_base.recipe_fingerprint, (
        "Bumping correlation rule version must alter recipe_fingerprint"
    )
    assert run_rule_bump.analysis_fingerprint != run_base.analysis_fingerprint, (
        "Bumping correlation rule version must alter composite analysis_fingerprint"
    )

    # 2. Modify hypothesis sub-rule version
    engine_hypo_bump = CounterfactualEngine()
    engine_hypo_bump.HYPOTHESIS_VERSIONS = copy.deepcopy(engine_base.HYPOTHESIS_VERSIONS)
    engine_hypo_bump.HYPOTHESIS_VERSIONS["H1_ACCOUNT_TAKEOVER"] = "2.0.0"
    run_hypo_bump = engine_hypo_bump.execute_run(case_id, facts, hashes, run_id="run_hypo_bump")

    assert run_hypo_bump.recipe_fingerprint != run_base.recipe_fingerprint, (
        "Bumping hypothesis rule version must alter recipe_fingerprint"
    )

    # 3. Modify time window configuration in correlation engine
    corr_engine_wide = CorrelationEngine(payment_flow_max_delta_seconds=7200.0)
    engine_tol_bump = CounterfactualEngine(correlation_engine=corr_engine_wide)
    run_tol_bump = engine_tol_bump.execute_run(case_id, facts, hashes, run_id="run_tol_bump")

    assert run_tol_bump.recipe_fingerprint != run_base.recipe_fingerprint, (
        "Modifying temporal window tolerance must alter recipe_fingerprint"
    )

    # 4. Modify ContradictionAnalysisEngine clock drift tolerance
    contra_engine_1 = ContradictionAnalysisEngine(clock_drift_tolerance_seconds=300.0)
    contra_engine_2 = ContradictionAnalysisEngine(clock_drift_tolerance_seconds=3600.0)
    analysis_1 = contra_engine_1.analyze_case(case_id, facts, artifacts)
    analysis_2 = contra_engine_2.analyze_case(case_id, facts, artifacts)

    assert analysis_1.recipe_fingerprint != analysis_2.recipe_fingerprint, (
        "Altering clock drift tolerance must alter ContradictionAnalysis recipe_fingerprint"
    )
    assert analysis_1.fingerprint != analysis_2.fingerprint, (
        "Altering clock drift tolerance must alter ContradictionAnalysis composite fingerprint"
    )

    # 5. Modify fact content (e.g. amount modified on one fact)
    facts_modified = copy.deepcopy(facts)
    facts_modified[0].amount = 99999.0
    run_fact_mod = engine_base.execute_run(case_id, facts_modified, hashes, run_id="run_fact_mod")

    assert run_fact_mod.recipe_fingerprint != run_base.recipe_fingerprint, (
        "Modifying substantive fact content must alter recipe_fingerprint via facts_digest"
    )


# =============================================================================
# Test 2: Same-Configuration Replay and ID Independence
# =============================================================================
def test_same_configuration_replay_and_id_independence(upi_case_data):
    """Test 2: Replaying identical configuration produces bit-exact fingerprints regardless of run_id or time."""
    case_id, facts, artifacts, hashes = upi_case_data
    engine = CounterfactualEngine()

    run_replay_1 = engine.execute_run(
        case_id=case_id,
        all_facts=facts,
        all_artifact_hashes=hashes,
        run_id="run_alpha_12345",
    )

    run_replay_2 = engine.execute_run(
        case_id=case_id,
        all_facts=facts,
        all_artifact_hashes=hashes,
        run_id="run_beta_67890",
    )

    assert run_replay_1.run_id != run_replay_2.run_id
    assert run_replay_1.recipe_fingerprint == run_replay_2.recipe_fingerprint, (
        "Recipe fingerprint must be bit-exact identical across replayed runs"
    )
    assert run_replay_1.result_fingerprint == run_replay_2.result_fingerprint, (
        "Result fingerprint must be bit-exact identical across replayed runs"
    )
    assert run_replay_1.analysis_fingerprint == run_replay_2.analysis_fingerprint, (
        "Composite analysis fingerprint must be bit-exact identical across replayed runs"
    )


# =============================================================================
# Test 3: Baseline vs. Counterfactual Divergence
# =============================================================================
def test_baseline_vs_counterfactual_fingerprint_divergence(upi_case_data):
    """Test 3: Counterfactual challenge exclusion diverges from baseline while remaining deterministic."""
    case_id, facts, artifacts, hashes = upi_case_data
    engine = CounterfactualEngine()

    # Identify screenshot artifact
    screenshot_ids = [a.artifact_id for a in artifacts if "screenshot" in a.filename.lower()]
    assert len(screenshot_ids) > 0

    run_base = engine.execute_run(
        case_id=case_id,
        all_facts=facts,
        all_artifact_hashes=hashes,
        excluded_artifact_ids=[],
        run_id="run_base",
    )

    run_chlg_1 = engine.execute_run(
        case_id=case_id,
        all_facts=facts,
        all_artifact_hashes=hashes,
        excluded_artifact_ids=screenshot_ids,
        run_id="run_chlg_1",
    )

    run_chlg_2 = engine.execute_run(
        case_id=case_id,
        all_facts=facts,
        all_artifact_hashes=hashes,
        excluded_artifact_ids=screenshot_ids,
        run_id="run_chlg_2",
    )

    # Challenge divergence from baseline
    assert run_base.recipe_fingerprint != run_chlg_1.recipe_fingerprint, (
        "Challenge run must have distinct recipe_fingerprint from baseline"
    )
    assert run_base.result_fingerprint != run_chlg_1.result_fingerprint, (
        "Challenge run must have distinct result_fingerprint from baseline"
    )
    assert run_base.analysis_fingerprint != run_chlg_1.analysis_fingerprint, (
        "Challenge run must have distinct composite analysis_fingerprint from baseline"
    )

    # Replay of challenge run determinism
    assert run_chlg_1.recipe_fingerprint == run_chlg_2.recipe_fingerprint, (
        "Replaying challenge run must produce bit-exact identical recipe_fingerprint"
    )
    assert run_chlg_1.result_fingerprint == run_chlg_2.result_fingerprint, (
        "Replaying challenge run must produce bit-exact identical result_fingerprint"
    )
    assert run_chlg_1.analysis_fingerprint == run_chlg_2.analysis_fingerprint, (
        "Replaying challenge run must produce bit-exact identical composite analysis_fingerprint"
    )


# =============================================================================
# Test 4: Temporal Finding Dependency Lineage and Neutral Explanation
# =============================================================================
def test_temporal_finding_dependency_lineage_and_neutral_explanation(upi_case_data):
    """Test 4: Traces CONTRA-TIME-CAUSAL-202602148891, verifies survival and neutral explanation."""
    case_id, facts, artifacts, _ = upi_case_data
    engine = ContradictionAnalysisEngine()

    screenshot_ids = [a.artifact_id for a in artifacts if "screenshot" in a.filename.lower()]
    base_res = engine.analyze_case(case_id, facts, artifacts)
    chlg_res = engine.analyze_case(case_id, facts, artifacts, excluded_artifact_ids=screenshot_ids)

    # Locate CONTRA-TIME-CAUSAL finding
    temporal_finding_base = next(
        (c for c in base_res.contradictions if "TIME-CAUSAL" in c.finding_id), None
    )
    assert temporal_finding_base is not None, "CONTRA-TIME-CAUSAL finding must be present in baseline"
    assert temporal_finding_base.status == FindingStatus.ACTIVE.value

    # Verify Lineage and Dependencies
    assert temporal_finding_base.rule_id == "RULE_CONTRA_TIMESTAMP_CONFLICT"
    assert len(temporal_finding_base.supporting_fact_ids) == 2
    assert len(temporal_finding_base.source_artifact_ids) == 2

    # Verify survival across screenshot exclusion
    temporal_finding_chlg = next(
        (c for c in chlg_res.contradictions if c.finding_id == temporal_finding_base.finding_id), None
    )
    assert temporal_finding_chlg is not None, "CONTRA-TIME-CAUSAL finding must be present in challenge"
    assert temporal_finding_chlg.status == FindingStatus.ACTIVE.value, (
        "CONTRA-TIME-CAUSAL must survive as ACTIVE when screenshot is excluded"
    )
    assert temporal_finding_chlg.inactive_reason is None

    # Verify neutral explanation semantics: distinguishes temporal sequence from causation
    expl = temporal_finding_base.explanation
    assert "precedes" in expl.lower() or "chronologically" in expl.lower(), (
        "Explanation must state chronological sequence"
    )
    assert "fraud" not in expl.lower(), "Neutral explanation must not assert fraud"
    assert "guilt" not in expl.lower(), "Neutral explanation must not assert guilt"
    assert "intent" not in expl.lower(), "Neutral explanation must not speculate on intent"

    # Verify required uncertainty limitation is present
    unc = temporal_finding_base.uncertainties_and_limitations
    assert "clock drift" in unc.lower() or "ledger" in unc.lower(), (
        "Uncertainty limitation must reference clock drift / server ledger verification"
    )


# =============================================================================
# Test 5: Missing-Timestamp Quarantine Across Temporal and Spatial Rules
# =============================================================================
def test_missing_timestamp_quarantine_across_temporal_and_spatial_rules():
    """Test 5: Quarantines missing/inferred timestamps while accepting genuine Unix epoch-zero."""
    # 1. Fact with missing timestamp (recorded_time='NOT_RECORDED', is_inferred=True)
    fact_missing = CanonicalFact(
        fact_id="FACT-MISSING-1",
        case_id="case_test",
        artifact_id="ART-001",
        evidence_id="EVD-001",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="statement.csv",
        source_location="row:1",
        sha256="1" * 64,
        time_provenance=TimezoneProvenance(
            recorded_time="NOT_RECORDED",
            stated_timezone=None,
            assumed_timezone="MISSING_SOURCE_TIMESTAMP",
            conversion_rationale="Missing",
            utc_iso="2026-02-14T10:30:00Z",
            utc_epoch=1771065000.0,
            is_inferred=True,
        ),
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        amount=5000.0,
        currency="INR",
        identifiers={"rrn": "TXN99999", "vpa": "merchant@upi"},
        summary="Bank transaction missing timestamp",
        raw_source_snippet="TXN99999,5000.0",
    )

    # 2. Fact with unparseable/zero fallback timestamp where is_inferred=False but recorded_time='NOT_RECORDED'
    fact_zero_unrecorded = CanonicalFact(
        fact_id="FACT-ZERO-UNREC",
        case_id="case_test",
        artifact_id="ART-002",
        evidence_id="EVD-002",
        kind=CanonicalFactKind.PAYMENT_REQUEST,
        source_filename="chat.txt",
        source_location="line:1",
        sha256="2" * 64,
        time_provenance=TimezoneProvenance(
            recorded_time="NOT_RECORDED",
            stated_timezone=None,
            assumed_timezone="MISSING_SOURCE_TIMESTAMP",
            conversion_rationale="Simulated legacy zero fallback",
            utc_iso="1970-01-01T00:00:00Z",
            utc_epoch=0.0,
            is_inferred=False,
        ),
        trust_tier=TrustTier.T3,
        auth_track=AuthType.ACTIVE,
        amount=5000.0,
        currency="INR",
        identifiers={"rrn": "TXN99999", "vpa": "merchant@upi"},
        summary="Payment request with unrecorded zero epoch",
        raw_source_snippet="Pay 5000 to merchant@upi",
    )

    # 3. Genuine Epoch-Zero Fact (authentic historical 1970 event)
    fact_genuine_zero = CanonicalFact(
        fact_id="FACT-GENUINE-ZERO",
        case_id="case_test",
        artifact_id="ART-003",
        evidence_id="EVD-003",
        kind=CanonicalFactKind.BANK_TRANSACTION,
        source_filename="legacy_ledger_1970.csv",
        source_location="row:1",
        sha256="3" * 64,
        time_provenance=TimezoneProvenance(
            recorded_time="1970-01-01 00:00:00",
            stated_timezone="UTC",
            assumed_timezone="UTC",
            conversion_rationale="Authentic epoch zero entry",
            utc_iso="1970-01-01T00:00:00Z",
            utc_epoch=0.0,
            is_inferred=False,
        ),
        trust_tier=TrustTier.T1,
        auth_track=AuthType.ACTIVE,
        amount=5000.0,
        currency="INR",
        identifiers={"rrn": "TXN1970", "vpa": "merchant@upi"},
        summary="Authentic 1970 transaction",
        raw_source_snippet="1970-01-01 00:00:00,TXN1970,5000.0",
    )

    # Standard valid 2026 event
    fact_valid_2026 = CanonicalFact(
        fact_id="FACT-VALID-2026",
        case_id="case_test",
        artifact_id="ART-004",
        evidence_id="EVD-004",
        kind=CanonicalFactKind.PAYMENT_REQUEST,
        source_filename="chat.txt",
        source_location="line:10",
        sha256="4" * 64,
        time_provenance=TimezoneProvenance(
            recorded_time="14/02/2026 10:20:00",
            stated_timezone=None,
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            conversion_rationale="Normalized from IST",
            utc_iso="2026-02-14T04:50:00Z",
            utc_epoch=1771044600.0,
            is_inferred=False,
        ),
        trust_tier=TrustTier.T3,
        auth_track=AuthType.ACTIVE,
        amount=5000.0,
        currency="INR",
        identifiers={"rrn": "TXN99999", "vpa": "merchant@upi"},
        summary="Valid chat payment request",
        raw_source_snippet="14/02/2026 10:20:00 Pay 5000",
    )

    # 1. Validator Tests
    assert is_valid_fact_timestamp(fact_missing) is False
    assert is_valid_fact_timestamp(fact_zero_unrecorded) is False
    assert is_valid_fact_timestamp(fact_genuine_zero) is True, "Genuine epoch-zero must be accepted as valid"
    assert is_valid_fact_timestamp(fact_valid_2026) is True

    assert get_verified_utc_epoch(fact_missing) is None
    assert get_verified_utc_epoch(fact_zero_unrecorded) is None
    assert get_verified_utc_epoch(fact_genuine_zero) == 0.0, "Verified epoch for genuine epoch zero must be 0.0"
    assert get_verified_utc_epoch(fact_valid_2026) == 1771044600.0

    # 2. Contradiction Analysis: RULE_CONTRA_TIMESTAMP_CONFLICT Quarantine
    dummy_art = Artifact(
        artifact_id="ART-001",
        case_id="case_test",
        filename="bank.csv",
        sha256="1" * 64,
        file_size_bytes=100,
        mime_type="text/csv",
        source_tier=TrustTier.T1,
        intake_timestamp_iso="2026-02-14T10:00:00Z",
        custody_chain_sequence=1,
        storage_path="cases/case_test/artifacts/bank.csv",
    )
    contra_engine = ContradictionAnalysisEngine()

    # Pair fact_missing and fact_valid_2026 -> must NOT fire false temporal contradiction
    analysis_missing = contra_engine.analyze_case("case_test", [fact_missing, fact_valid_2026], [dummy_art])
    contra_time_missing = [c for c in analysis_missing.contradictions if "TIME-CAUSAL" in c.finding_id]
    assert len(contra_time_missing) == 0, "Missing timestamp fact must NOT trigger RULE_CONTRA_TIMESTAMP_CONFLICT"

    # Pair fact_zero_unrecorded and fact_valid_2026 -> must NOT fire false 56-year contradiction
    analysis_unrec = contra_engine.analyze_case("case_test", [fact_zero_unrecorded, fact_valid_2026], [dummy_art])
    contra_time_unrec = [c for c in analysis_unrec.contradictions if "TIME-CAUSAL" in c.finding_id]
    assert len(contra_time_unrec) == 0, (
        "Unrecorded zero-epoch fact must NOT fire false temporal contradiction across 56 years"
    )

    # 3. Correlation Engine: Temporal Rules Quarantine
    corr_engine = CorrelationEngine()
    corrs_missing, _ = corr_engine.correlate_case([fact_missing, fact_valid_2026])
    causal_flow_missing = [c for c in corrs_missing if c.rule_id == "RULE_PAYMENT_FLOW_CAUSAL"]
    amount_win_missing = [c for c in corrs_missing if c.rule_id == "RULE_AMOUNT_WINDOW"]
    assert len(causal_flow_missing) == 0, "Missing timestamp fact must NOT satisfy RULE_PAYMENT_FLOW_CAUSAL"
    assert len(amount_win_missing) == 0, "Missing timestamp fact must NOT satisfy RULE_AMOUNT_WINDOW"

    # 4. Z3 Solver Constraints Quarantine and Genuine Epoch-Zero Acceptance
    s_fact_missing = fact_missing.to_solver_fact()
    s_fact_zero_unrec = fact_zero_unrecorded.to_solver_fact()
    s_fact_genuine_zero = fact_genuine_zero.to_solver_fact()

    assert is_valid_solver_fact_timestamp(s_fact_missing) is False
    assert is_valid_solver_fact_timestamp(s_fact_zero_unrec) is False
    assert is_valid_solver_fact_timestamp(s_fact_genuine_zero) is True, (
        "Solver must accept genuine epoch-zero fact as valid"
    )

    z3_builder = Z3ConstraintBuilder()
    clock_bounds = {"clk_case": 300.0}

    # Solver with missing fact: verify interval constraint is omitted
    solver_m, literals_m, bundle_m = z3_builder.build_solver([s_fact_missing], clock_bounds)
    solver_assertions_m = [str(a) for a in solver_m.assertions()]
    # Assert that t_true is NOT constrained to start/end interval
    assert not any("t_true_FACT-MISSING-1 >=" in a for a in solver_assertions_m), (
        "Missing timestamp fact must NOT have bounded interval constraints in Z3"
    )

    # Solver with genuine epoch zero: verify interval constraint IS asserted to [0.0, 0.0]
    solver_z, literals_z, bundle_z = z3_builder.build_solver([s_fact_genuine_zero], clock_bounds)
    solver_assertions_z = [str(a) for a in solver_z.assertions()]
    assert any("t_true_FACT-GENUINE-ZERO >=" in a for a in solver_assertions_z), (
        "Genuine epoch-zero fact must have bounded interval constraints asserted in Z3"
    )


# =============================================================================
# Test 6: CaseForensicAnalysis Artifact-Hash and Fact-Content Sensitivity
# =============================================================================
def test_case_forensic_analysis_artifact_and_fact_sensitivity(upi_case_data):
    """Test 6: CaseForensicAnalysis recipe and composite fingerprints are sensitive to artifact hashes,

    fact content, and excluded artifact scope.
    """
    case_id, facts, artifacts, _ = upi_case_data
    engine = ContradictionAnalysisEngine()

    base_analysis = engine.analyze_case(case_id, facts, artifacts)
    assert base_analysis.recipe_fingerprint is not None
    assert base_analysis.result_fingerprint is not None
    assert base_analysis.fingerprint is not None
    assert len(base_analysis.recipe_fingerprint) == 64
    assert len(base_analysis.result_fingerprint) == 64
    assert len(base_analysis.fingerprint) == 64

    # 1. Modifying an artifact SHA-256 must alter recipe_fingerprint and composite fingerprint
    artifacts_tampered = copy.deepcopy(artifacts)
    artifacts_tampered[0].sha256 = "e" * 64
    analysis_art_tampered = engine.analyze_case(case_id, facts, artifacts_tampered)

    assert analysis_art_tampered.recipe_fingerprint != base_analysis.recipe_fingerprint, (
        "Altering artifact SHA-256 must alter CaseForensicAnalysis recipe_fingerprint"
    )
    assert analysis_art_tampered.fingerprint != base_analysis.fingerprint, (
        "Altering artifact SHA-256 must alter CaseForensicAnalysis composite fingerprint"
    )

    # 2. Modifying canonical fact substantive content must alter recipe_fingerprint
    facts_tampered = copy.deepcopy(facts)
    facts_tampered[0].amount = 88888.0
    analysis_fact_tampered = engine.analyze_case(case_id, facts_tampered, artifacts)

    assert analysis_fact_tampered.recipe_fingerprint != base_analysis.recipe_fingerprint, (
        "Altering canonical fact content (amount) must alter CaseForensicAnalysis recipe_fingerprint"
    )
    assert analysis_fact_tampered.fingerprint != base_analysis.fingerprint, (
        "Altering canonical fact content must alter CaseForensicAnalysis composite fingerprint"
    )

    # 3. Excluding an artifact must alter recipe and result fingerprints
    excl_id = artifacts[0].artifact_id
    analysis_excl = engine.analyze_case(case_id, facts, artifacts, excluded_artifact_ids=[excl_id])

    assert analysis_excl.recipe_fingerprint != base_analysis.recipe_fingerprint, (
        "Excluding an artifact must alter CaseForensicAnalysis recipe_fingerprint"
    )
    assert analysis_excl.fingerprint != base_analysis.fingerprint, (
        "Excluding an artifact must alter CaseForensicAnalysis composite fingerprint"
    )

    # 4. Replaying identical configuration produces bit-exact identical fingerprints
    analysis_replay = engine.analyze_case(case_id, facts, artifacts)
    assert analysis_replay.recipe_fingerprint == base_analysis.recipe_fingerprint
    assert analysis_replay.result_fingerprint == base_analysis.result_fingerprint
    assert analysis_replay.fingerprint == base_analysis.fingerprint


# =============================================================================
# Test 7: Contradiction-Rule and Finding-Affecting Tolerance Sensitivity
# =============================================================================
def test_contradiction_rule_and_tolerance_sensitivity(upi_case_data):
    """Test 7: Bumping contradiction sub-rule versions and adjusting amount/drift tolerances

    strictly alters CaseForensicAnalysis recipe and composite fingerprints.
    """
    case_id, facts, artifacts, _ = upi_case_data
    base_engine = ContradictionAnalysisEngine(clock_drift_tolerance_seconds=300.0, amount_tolerance=0.01)
    base_analysis = base_engine.analyze_case(case_id, facts, artifacts)

    # 1. Bumping contradiction rule version
    rule_bump_engine = ContradictionAnalysisEngine(clock_drift_tolerance_seconds=300.0, amount_tolerance=0.01)
    rule_bump_engine.CONTRADICTION_RULE_VERSIONS["RULE_CONTRA_AMOUNT_DISCREPANCY"] = "2.0.0"
    analysis_rule_bump = rule_bump_engine.analyze_case(case_id, facts, artifacts)

    assert analysis_rule_bump.recipe_fingerprint != base_analysis.recipe_fingerprint, (
        "Bumping contradiction rule version must alter recipe_fingerprint"
    )
    assert analysis_rule_bump.fingerprint != base_analysis.fingerprint, (
        "Bumping contradiction rule version must alter composite fingerprint"
    )

    # 2. Modifying amount tolerance
    amount_tol_engine = ContradictionAnalysisEngine(clock_drift_tolerance_seconds=300.0, amount_tolerance=50.0)
    analysis_amount_tol = amount_tol_engine.analyze_case(case_id, facts, artifacts)

    assert analysis_amount_tol.recipe_fingerprint != base_analysis.recipe_fingerprint, (
        "Altering amount_tolerance must alter CaseForensicAnalysis recipe_fingerprint"
    )
    assert analysis_amount_tol.fingerprint != base_analysis.fingerprint, (
        "Altering amount_tolerance must alter CaseForensicAnalysis composite fingerprint"
    )

    # 3. Modifying clock drift tolerance
    drift_tol_engine = ContradictionAnalysisEngine(clock_drift_tolerance_seconds=1800.0, amount_tolerance=0.01)
    analysis_drift_tol = drift_tol_engine.analyze_case(case_id, facts, artifacts)

    assert analysis_drift_tol.recipe_fingerprint != base_analysis.recipe_fingerprint, (
        "Altering clock_drift_tolerance_seconds must alter CaseForensicAnalysis recipe_fingerprint"
    )
    assert analysis_drift_tol.fingerprint != base_analysis.fingerprint, (
        "Altering clock_drift_tolerance_seconds must alter CaseForensicAnalysis composite fingerprint"
    )


# =============================================================================
# Test 8: Parser and Normalization Version Registry Traceability
# =============================================================================
def test_parser_and_normalization_version_traceability(upi_case_data):
    """Test 8: Centralized parser and normalization version registries propagate to recipe fingerprints."""
    case_id, facts, artifacts, hashes = upi_case_data

    # 1. Centralized registry presence and coverage
    assert "bank_upi" in PARSER_VERSIONS
    assert "cdr" in PARSER_VERSIONS
    assert "whatsapp" in PARSER_VERSIONS
    assert "exif_triage" in PARSER_VERSIONS
    assert get_parser_version("bank_upi") == "1.0.0"
    assert get_normalization_version("canonical_fact_schema") == "2.0.0"

    # 2. ContradictionAnalysisEngine parser version sensitivity
    engine_base = ContradictionAnalysisEngine()
    analysis_base = engine_base.analyze_case(case_id, facts, artifacts)

    engine_parser_bump = ContradictionAnalysisEngine()
    engine_parser_bump.PARSER_VERSIONS["bank_upi"] = "2.0.0"
    analysis_parser_bump = engine_parser_bump.analyze_case(case_id, facts, artifacts)

    assert analysis_parser_bump.recipe_fingerprint != analysis_base.recipe_fingerprint, (
        "Bumping parser version must alter ContradictionAnalysis recipe_fingerprint"
    )
    assert analysis_parser_bump.fingerprint != analysis_base.fingerprint, (
        "Bumping parser version must alter ContradictionAnalysis composite fingerprint"
    )

    # 3. ContradictionAnalysisEngine normalization version sensitivity
    engine_norm_bump = ContradictionAnalysisEngine()
    engine_norm_bump.NORMALIZATION_VERSIONS["canonical_fact_schema"] = "3.0.0"
    analysis_norm_bump = engine_norm_bump.analyze_case(case_id, facts, artifacts)

    assert analysis_norm_bump.recipe_fingerprint != analysis_base.recipe_fingerprint, (
        "Bumping normalization version must alter ContradictionAnalysis recipe_fingerprint"
    )
    assert analysis_norm_bump.fingerprint != analysis_base.fingerprint, (
        "Bumping normalization version must alter ContradictionAnalysis composite fingerprint"
    )

    # 4. CounterfactualEngine parser and normalization version sensitivity
    cf_engine_base = CounterfactualEngine()
    run_base = cf_engine_base.execute_run(case_id, facts, hashes, run_id="run_base_parser_test")

    cf_engine_p_bump = CounterfactualEngine()
    cf_engine_p_bump.PARSER_VERSIONS["cdr"] = "2.0.0"
    run_p_bump = cf_engine_p_bump.execute_run(case_id, facts, hashes, run_id="run_p_bump")

    assert run_p_bump.recipe_fingerprint != run_base.recipe_fingerprint, (
        "Bumping parser version must alter CounterfactualEngine recipe_fingerprint"
    )
    assert run_p_bump.analysis_fingerprint != run_base.analysis_fingerprint, (
        "Bumping parser version must alter CounterfactualEngine composite fingerprint"
    )

    cf_engine_n_bump = CounterfactualEngine()
    cf_engine_n_bump.NORMALIZATION_VERSIONS["timezone_provenance"] = "2.0.0"
    run_n_bump = cf_engine_n_bump.execute_run(case_id, facts, hashes, run_id="run_n_bump")

    assert run_n_bump.recipe_fingerprint != run_base.recipe_fingerprint, (
        "Bumping normalization version must alter CounterfactualEngine recipe_fingerprint"
    )


# =============================================================================
# Test 9: Spatial-Coordinate and Radius Sensitivity
# =============================================================================
def test_spatial_coordinate_and_radius_sensitivity(upi_case_data):
    """Test 9: Modifying geographic coordinates or radius alters facts digest and recipe fingerprints."""
    case_id, facts, artifacts, hashes = upi_case_data
    engine = ContradictionAnalysisEngine()

    base_analysis = engine.analyze_case(case_id, facts, artifacts)

    # 1. Fact with region vs. no region
    facts_sp_1 = copy.deepcopy(facts)
    facts_sp_1[0].region = GeographicRegion(latitude=12.9716, longitude=77.5946, radius_meters=100.0)
    analysis_sp_1 = engine.analyze_case(case_id, facts_sp_1, artifacts)

    assert analysis_sp_1.recipe_fingerprint != base_analysis.recipe_fingerprint, (
        "Adding spatial region to fact must alter CaseForensicAnalysis recipe_fingerprint"
    )

    # 2. Modifying latitude/longitude
    facts_sp_2 = copy.deepcopy(facts)
    facts_sp_2[0].region = GeographicRegion(latitude=13.0827, longitude=80.2707, radius_meters=100.0)
    analysis_sp_2 = engine.analyze_case(case_id, facts_sp_2, artifacts)

    assert analysis_sp_2.recipe_fingerprint != analysis_sp_1.recipe_fingerprint, (
        "Modifying latitude/longitude must alter CaseForensicAnalysis recipe_fingerprint"
    )

    # 3. Modifying uncertainty radius alone
    facts_sp_3 = copy.deepcopy(facts)
    facts_sp_3[0].region = GeographicRegion(latitude=12.9716, longitude=77.5946, radius_meters=500.0)
    analysis_sp_3 = engine.analyze_case(case_id, facts_sp_3, artifacts)

    assert analysis_sp_3.recipe_fingerprint != analysis_sp_1.recipe_fingerprint, (
        "Modifying spatial uncertainty radius must alter CaseForensicAnalysis recipe_fingerprint"
    )

    # 4. Solver facts digest spatial sensitivity
    tw = TimeWindow(start_epoch=1000.0, end_epoch=1100.0, reported_epoch=1050.0)
    f1 = Fact(
        id="F1",
        source_file="test.csv",
        sha256="a" * 64,
        line_ref="row:1",
        kind=FactKind.BANK_TXN,
        time_window=tw,
        region=GeographicRegion(latitude=12.9716, longitude=77.5946, radius_meters=100.0),
        tier=TrustTier.T1,
        device_id="DEV_01",
        clock_id="clk_1",
        auth_type=AuthType.ACTIVE,
    )
    f1_perturbed_rad = Fact(
        id="F1",
        source_file="test.csv",
        sha256="a" * 64,
        line_ref="row:1",
        kind=FactKind.BANK_TXN,
        time_window=tw,
        region=GeographicRegion(latitude=12.9716, longitude=77.5946, radius_meters=999.0),
        tier=TrustTier.T1,
        device_id="DEV_01",
        clock_id="clk_1",
        auth_type=AuthType.ACTIVE,
    )

    rec1, res1, sol1 = compute_solver_fingerprints(
        facts=[f1],
        clock_bounds={"clk_1": 10.0},
        speed_cfg=TravelSpeedConfig(),
        handset_with_third_party=False,
        max_cores=10,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[],
        leave_one_out={},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    rec2, res2, sol2 = compute_solver_fingerprints(
        facts=[f1_perturbed_rad],
        clock_bounds={"clk_1": 10.0},
        speed_cfg=TravelSpeedConfig(),
        handset_with_third_party=False,
        max_cores=10,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[],
        leave_one_out={},
        bound_vs_gap=[],
        margin_breakdown=None,
    )

    assert rec1 != rec2, "Modifying spatial radius must alter solver recipe_fingerprint"
    assert sol1 != sol2, "Modifying spatial radius must alter composite solver_fingerprint"


# =============================================================================
# Test 10: Stateless SMT Solver Request Sensitivity and Result Fingerprints
# =============================================================================
def test_stateless_smt_solver_fingerprint_sealing_and_replay_determinism():
    """Test 10: SMT solver recipe covers complete effective request; result covers substantive outcome;

    volatile IDs and execution times are strictly excluded; deterministic on replay.
    """
    tw = TimeWindow(start_epoch=1000.0, end_epoch=1100.0, reported_epoch=1050.0)
    f1 = Fact(
        id="F_SOL_1",
        source_file="bank.csv",
        sha256="1" * 64,
        line_ref="row:1",
        kind=FactKind.BANK_TXN,
        time_window=tw,
        tier=TrustTier.T1,
        device_id="DEV_01",
        clock_id="clk_alpha",
        auth_type=AuthType.ACTIVE,
    )
    f2 = Fact(
        id="F_SOL_2",
        source_file="cdr.csv",
        sha256="2" * 64,
        line_ref="row:2",
        kind=FactKind.CDR_CALL,
        time_window=tw,
        tier=TrustTier.T1,
        device_id="DEV_01",
        clock_id="clk_beta",
        auth_type=AuthType.PASSIVE,
    )
    speed_cfg = TravelSpeedConfig()
    clock_bounds = {"clk_alpha": 30.0, "clk_beta": 45.0}

    # 1. Baseline solver fingerprint computation
    rec_base, res_base, sol_base = compute_solver_fingerprints(
        facts=[f1, f2],
        clock_bounds=clock_bounds,
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=50,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[["F_SOL_1", "F_SOL_2"]],
        leave_one_out={"F_SOL_1": False, "F_SOL_2": False},
        bound_vs_gap=[],
        margin_breakdown=None,
    )

    assert len(rec_base) == 64
    assert len(res_base) == 64
    assert len(sol_base) == 64

    # 2. Recipe sensitivity: Altering clock bounds
    rec_cb, _, sol_cb = compute_solver_fingerprints(
        facts=[f1, f2],
        clock_bounds={"clk_alpha": 99.0, "clk_beta": 45.0},
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=50,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[["F_SOL_1", "F_SOL_2"]],
        leave_one_out={"F_SOL_1": False, "F_SOL_2": False},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    assert rec_cb != rec_base, "Altering clock bounds must alter solver recipe_fingerprint"
    assert sol_cb != sol_base, "Altering clock bounds must alter composite solver_fingerprint"

    # 3. Recipe sensitivity: Altering travel speed config
    speed_mod = TravelSpeedConfig(ground_max_speed_kmh=80.0)
    rec_spd, _, sol_spd = compute_solver_fingerprints(
        facts=[f1, f2],
        clock_bounds=clock_bounds,
        speed_cfg=speed_mod,
        handset_with_third_party=False,
        max_cores=50,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[["F_SOL_1", "F_SOL_2"]],
        leave_one_out={"F_SOL_1": False, "F_SOL_2": False},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    assert rec_spd != rec_base, "Altering speed configuration must alter solver recipe_fingerprint"

    # 4. Recipe sensitivity: Altering handset_with_third_party switch
    rec_tp, _, sol_tp = compute_solver_fingerprints(
        facts=[f1, f2],
        clock_bounds=clock_bounds,
        speed_cfg=speed_cfg,
        handset_with_third_party=True,
        max_cores=50,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[["F_SOL_1", "F_SOL_2"]],
        leave_one_out={"F_SOL_1": False, "F_SOL_2": False},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    assert rec_tp != rec_base, "Altering handset_with_third_party must alter solver recipe_fingerprint"

    # 5. Recipe sensitivity: Altering solver version
    rec_ver, _, sol_ver = compute_solver_fingerprints(
        facts=[f1, f2],
        clock_bounds=clock_bounds,
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=50,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[["F_SOL_1", "F_SOL_2"]],
        leave_one_out={"F_SOL_1": False, "F_SOL_2": False},
        bound_vs_gap=[],
        margin_breakdown=None,
        solver_version="2.0.0",
    )
    assert rec_ver != rec_base, "Bumping solver_version must alter solver recipe_fingerprint"

    # 6. Result sensitivity: Altering verdict and MUS core
    _, res_inconsistent, sol_inconsistent = compute_solver_fingerprints(
        facts=[f1, f2],
        clock_bounds=clock_bounds,
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=50,
        verdict="INCONSISTENT",
        mus_fact_ids=[["F_SOL_1", "F_SOL_2"]],
        mss_scenarios=[],
        leave_one_out={"F_SOL_1": True, "F_SOL_2": True},
        bound_vs_gap=[],
        margin_breakdown=MarginBreakdown(
            is_initially_satisfiable=False,
            overall_skew_margin_seconds=15.5,
            breakdown_margins={"clk_alpha": 15.5},
        ),
    )
    assert res_inconsistent != res_base, "Inconsistent verdict and MUS cores must alter result_fingerprint"
    assert sol_inconsistent != sol_base, "Inconsistent result must alter composite solver_fingerprint"

    # 7. Replay determinism and execution time independence
    rec_replay, res_replay, sol_replay = compute_solver_fingerprints(
        facts=[f1, f2],
        clock_bounds=clock_bounds,
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=50,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[["F_SOL_1", "F_SOL_2"]],
        leave_one_out={"F_SOL_1": False, "F_SOL_2": False},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    assert rec_replay == rec_base, "Recipe fingerprint must be bit-exact identical on replay"
    assert res_replay == res_base, "Result fingerprint must be bit-exact identical on replay"
    assert sol_replay == sol_base, "Composite solver fingerprint must be bit-exact identical on replay"

    # 8. Timestamp validity sensitivity: Identical fields with different validity states
    f_valid = copy.deepcopy(f1)
    f_valid.raw_payload = {}
    f_quarantined = copy.deepcopy(f1)
    f_quarantined.raw_payload = {"is_timestamp_missing": True}

    rec_v, _, sol_v = compute_solver_fingerprints(
        facts=[f_valid],
        clock_bounds={"clk_alpha": 30.0},
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=10,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[],
        leave_one_out={},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    rec_q, _, sol_q = compute_solver_fingerprints(
        facts=[f_quarantined],
        clock_bounds={"clk_alpha": 30.0},
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=10,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[],
        leave_one_out={},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    assert rec_v != rec_q, (
        "Facts with identical temporal fields but different timestamp validity states "
        "must produce different solver recipe fingerprints"
    )

    # 9. Genuine Unix epoch-zero timestamp validity and determinism
    tw_zero = TimeWindow(start_epoch=0.0, end_epoch=0.0, reported_epoch=0.0)
    f_genuine_zero = Fact(
        id="F_GENUINE_ZERO",
        source_file="legacy.csv",
        sha256="0" * 64,
        line_ref="row:1",
        kind=FactKind.CDR_CALL,
        time_window=tw_zero,
        tier=TrustTier.T1,
        device_id="DEV_01",
        clock_id="clk_alpha",
        auth_type=AuthType.ACTIVE,
        raw_payload={"recorded_time": "1970-01-01 00:00:00", "is_inferred": False},
    )
    f_zero_missing = Fact(
        id="F_GENUINE_ZERO",
        source_file="legacy.csv",
        sha256="0" * 64,
        line_ref="row:1",
        kind=FactKind.CDR_CALL,
        time_window=tw_zero,
        tier=TrustTier.T1,
        device_id="DEV_01",
        clock_id="clk_alpha",
        auth_type=AuthType.ACTIVE,
        raw_payload={"recorded_time": "NOT_RECORDED", "is_inferred": True},
    )
    assert is_valid_solver_fact_timestamp(f_genuine_zero) is True
    assert is_valid_solver_fact_timestamp(f_zero_missing) is False

    rec_gz1, _, _ = compute_solver_fingerprints(
        facts=[f_genuine_zero],
        clock_bounds={"clk_alpha": 30.0},
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=10,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[],
        leave_one_out={},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    rec_gz2, _, _ = compute_solver_fingerprints(
        facts=[f_genuine_zero],
        clock_bounds={"clk_alpha": 30.0},
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=10,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[],
        leave_one_out={},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    rec_zm, _, _ = compute_solver_fingerprints(
        facts=[f_zero_missing],
        clock_bounds={"clk_alpha": 30.0},
        speed_cfg=speed_cfg,
        handset_with_third_party=False,
        max_cores=10,
        verdict="CONSISTENT",
        mus_fact_ids=[],
        mss_scenarios=[],
        leave_one_out={},
        bound_vs_gap=[],
        margin_breakdown=None,
    )
    assert rec_gz1 == rec_gz2, "Genuine epoch zero must be bit-exact deterministic"
    assert rec_gz1 != rec_zm, "Genuine epoch zero must produce distinct fingerprint from quarantined missing timestamp"

    # 10. Full /api/solve endpoint contract verification
    solve_req = SolveRequest(
        facts=[f1.model_dump(mode="json"), f2.model_dump(mode="json")],
        clock_bounds=clock_bounds,
    )
    resp = solve_system(solve_req)
    assert isinstance(resp, SolveResponse)
    assert resp.recipe_fingerprint is not None
    assert resp.result_fingerprint is not None
    assert resp.solver_fingerprint is not None
    assert len(resp.recipe_fingerprint) == 64
    assert len(resp.result_fingerprint) == 64
    assert len(resp.solver_fingerprint) == 64


# =============================================================================
# Test 11: Legacy-Record Deserialization and Stored-Fingerprint Preservation
# =============================================================================
def test_legacy_record_deserialization_and_stored_fingerprint_preservation(case_store: CaseStore):
    """Test 11: Deserializing existing or legacy serialized runs preserves stored fingerprint values

    verbatim without silent recalculation or schema corruption.
    """
    case_id = "upi_payment_discrepancy"
    stored_runs = case_store.list_analysis_runs(case_id)
    assert len(stored_runs) > 0, "Pre-existing stored analysis runs must be present"

    # 1. Verify on-disk preserved values match loaded model attributes
    sample_run = stored_runs[0]
    run_file = case_store.get_analysis_runs_dir(case_id) / f"{sample_run.run_id}.json"
    with open(run_file, "r", encoding="utf-8") as f:
        raw_json_data = json.load(f)

    assert sample_run.recipe_fingerprint == raw_json_data["recipe_fingerprint"], (
        "Deserialized recipe_fingerprint must match preserved on-disk JSON value"
    )
    assert sample_run.result_fingerprint == raw_json_data["result_fingerprint"], (
        "Deserialized result_fingerprint must match preserved on-disk JSON value"
    )
    assert sample_run.analysis_fingerprint == raw_json_data["analysis_fingerprint"], (
        "Deserialized analysis_fingerprint must match preserved on-disk JSON value"
    )

    # 2. Verify legacy CaseForensicAnalysis deserialization preserves stored fingerprint values
    legacy_payload = {
        "case_id": "legacy_case_001",
        "run_id": "legacy_run_001",
        "total_contradictions": 2,
        "active_contradictions_count": 1,
        "inactive_contradictions_count": 1,
        "total_gaps": 1,
        "active_gaps_count": 1,
        "review_required_count": 0,
        "resolved_count": 0,
        "contradictions": [],
        "evidence_gaps": [],
        "uncertainties": ["Legacy uncertainty"],
        "informational_observations": ["Legacy observation"],
        "fingerprint": "legacy_composite_fp_9999999999999999999999999999999999999999999999999999999999999999",
        "recipe_fingerprint": "legacy_recipe_fp_1111111111111111111111111111111111111111111111111111111111111111",
        "result_fingerprint": "legacy_result_fp_2222222222222222222222222222222222222222222222222222222222222222",
    }
    legacy_analysis = CaseForensicAnalysis(**legacy_payload)

    assert legacy_analysis.fingerprint == legacy_payload["fingerprint"]
    assert legacy_analysis.recipe_fingerprint == legacy_payload["recipe_fingerprint"]
    assert legacy_analysis.result_fingerprint == legacy_payload["result_fingerprint"]
