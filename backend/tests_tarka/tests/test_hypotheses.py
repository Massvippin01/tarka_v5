"""Tests for Checkpoint X1: "What Must Be False?" Hypothesis Engine.

Requirements tested:
1. Planted conflict with known minimal correction (Case A).
2. Case with two disjoint conflicts (Case D).
3. Consistent case returns no hypotheses (Case C).
4. Leave-one-out sensitivity: for each fact in the core, show whether removing it flips the verdict.
5. Canonical hypothesis wording: "To restore consistency, ONE of these must be wrong: ..."
6. API endpoint integration: /api/solve returns hypotheses, leave_one_out_sensitivity, cost_model.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from tarka.api.server import app
from tarka.core.models import FactKind
from tarka.generator.synthetic_cases import (
    generate_case_a_impossible_alibi,
    generate_case_c_consistent_control,
    generate_case_d_dual_cores,
)
from tarka.solver.hypotheses import compute_hypothesis_report, DEFAULT_SOURCE_WEIGHTS


@pytest.fixture
def client():
    return TestClient(app)


def test_planted_conflict_known_minimal_correction():
    """Test 1: Planted conflict with known minimal correction (Case A).
    
    Case A has 3 facts:
    - FACT_CASE_A_CDR_BLR (T1, carrier_cdr, cost 100)
    - FACT_CASE_A_UPI_DEL (T1, bank_log, cost 100)
    - FACT_CASE_A_CLAIM_ALIBI (T3, user_supplied, cost 10)
    
    Cores:
    - [CDR_BLR, UPI_DEL] (1740 km in 30 min)
    - [CLAIM_ALIBI, UPI_DEL] (Claim in BLR vs UPI in DEL)
    
    Both cores share UPI_DEL. Dropping UPI_DEL alone resolves both cores with cost 100.
    The alternate correction is dropping both CDR_BLR and CLAIM_ALIBI (cost 100 + 10 = 110).
    """
    case_a = generate_case_a_impossible_alibi()
    report = compute_hypothesis_report(
        facts=case_a.facts,
        clock_bounds=case_a.clock_bounds,
    )

    assert not report.is_consistent
    assert report.total_cores_found == 2
    assert len(report.hypotheses) >= 2

    # Check canonical wording rule: "To restore consistency, ONE of these must be wrong: ..."
    for hypo in report.hypotheses:
        assert hypo.statement.startswith("To restore consistency, ONE of these must be wrong:")
        assert hypo.is_verified_sat is True
        assert hypo.cost > 0
        assert len(hypo.conflicting_facts) >= 1
        assert len(hypo.supporting_facts) >= 1

    # Check top hypothesis is dropping UPI_DEL (cost 100)
    top_hypo = report.hypotheses[0]
    assert top_hypo.rank == 1
    assert top_hypo.cost == 100
    assert len(top_hypo.conflicting_facts) == 1
    assert top_hypo.conflicting_facts[0].id == "FACT_CASE_A_UPI_DEL"
    assert top_hypo.conflicting_facts[0].source_type == "bank_log"
    assert set(top_hypo.cores_resolved) == {0, 1}

    # Check second hypothesis is dropping both CDR and Claim (cost 110)
    second_hypo = report.hypotheses[1]
    assert second_hypo.rank == 2
    assert second_hypo.cost == 110
    dropped_ids = {f.id for f in second_hypo.conflicting_facts}
    assert dropped_ids == {"FACT_CASE_A_CDR_BLR", "FACT_CASE_A_CLAIM_ALIBI"}

    # Check Leave-One-Out sensitivity for Case A
    # UPI_DEL is in both cores; removing it flips the verdict to SAT
    loo_map = {s.fact_id: s for s in report.leave_one_out_sensitivity}
    assert "FACT_CASE_A_UPI_DEL" in loo_map
    assert loo_map["FACT_CASE_A_UPI_DEL"].flips_verdict is True
    assert loo_map["FACT_CASE_A_UPI_DEL"].remaining_cores_count == 0
    assert len(loo_map["FACT_CASE_A_UPI_DEL"].cores_participating) == 2

    # CDR_BLR is only in Core 1; removing it leaves Core 2
    assert loo_map["FACT_CASE_A_CDR_BLR"].flips_verdict is False
    assert loo_map["FACT_CASE_A_CDR_BLR"].remaining_cores_count == 1

    # CLAIM_ALIBI is only in Core 2; removing it leaves Core 1
    assert loo_map["FACT_CASE_A_CLAIM_ALIBI"].flips_verdict is False
    assert loo_map["FACT_CASE_A_CLAIM_ALIBI"].remaining_cores_count == 1


def test_case_with_two_disjoint_conflicts():
    """Test 2: Case with two disjoint conflicts (Case D).
    
    Case D has two non-overlapping cores:
    - Core 1: Mumbai CDR vs Goa UPI (dist ~440 km, ~15 min)
    - Core 2: Kolkata WA vs Guwahati ATM (dist ~500 km, ~20 min)
    
    Because the cores are disjoint, removing any single fact cannot resolve both cores.
    Therefore, for EVERY fact in the conflict cores:
    - flips_verdict must be False
    - remaining_cores_count must be 1
    
    Every minimal correction set must contain at least 2 facts (one from each core).
    """
    case_d = generate_case_d_dual_cores()
    report = compute_hypothesis_report(
        facts=case_d.facts,
        clock_bounds=case_d.clock_bounds,
    )

    assert not report.is_consistent
    assert report.total_cores_found == 2

    # 1. Leave-one-out sensitivity check: NO single fact flips the verdict
    assert len(report.leave_one_out_sensitivity) == 4  # 4 facts in total across 2 disjoint cores
    for s in report.leave_one_out_sensitivity:
        assert s.flips_verdict is False, f"Fact {s.fact_id} should not flip verdict alone in disjoint cores"
        assert s.remaining_cores_count == 1, f"Fact {s.fact_id} removal should leave exactly 1 remaining core"

    # 2. Every minimal correction set must have at least 2 facts
    assert len(report.hypotheses) == 4  # 2x2 = 4 combinations
    for hypo in report.hypotheses:
        assert hypo.statement.startswith("To restore consistency, ONE of these must be wrong:")
        assert len(hypo.conflicting_facts) == 2
        assert hypo.is_verified_sat is True
        assert set(hypo.cores_resolved) == {0, 1}

    # Verify costs of the 4 combinations:
    # Core 1: MUM (100) or GOA (100)
    # Core 2: KOL WA (40) or GUW ATM (100)
    # Combinations with WA (40) cost 140; combinations with ATM (100) cost 200
    costs = [h.cost for h in report.hypotheses]
    assert costs == [140, 140, 200, 200]


def test_consistent_case_returns_no_hypotheses():
    """Test 3: Consistent case returns no hypotheses (Case C).
    
    Case C is a consistent transit corridor (Bengaluru to Mysuru Vande Bharat).
    It is fully satisfiable:
    - is_consistent must be True
    - total_cores_found must be 0
    - hypotheses must be []
    - leave_one_out_sensitivity must be []
    """
    case_c = generate_case_c_consistent_control()
    report = compute_hypothesis_report(
        facts=case_c.facts,
        clock_bounds=case_c.clock_bounds,
    )

    assert report.is_consistent is True
    assert report.total_cores_found == 0
    assert report.hypotheses == []
    assert report.leave_one_out_sensitivity == []
    assert report.cost_model == DEFAULT_SOURCE_WEIGHTS


def test_api_solve_returns_hypotheses_and_sensitivity(client):
    """Test 4: /api/solve API endpoint integration.
    
    Asserts that /api/solve includes:
    - hypotheses: ranked list with canonical wording, cost, supporting and conflicting facts
    - leave_one_out_sensitivity: per-fact flips_verdict and remaining_cores_count
    - cost_model: reliability weights
    """
    case_a = generate_case_a_impossible_alibi()
    facts_json = [f.model_dump(mode="json") for f in case_a.facts]

    res = client.post(
        "/api/solve",
        json={
            "case_id": "test_hypo_solve",
            "facts": facts_json,
            "clock_bounds": case_a.clock_bounds,
        },
    )
    assert res.status_code == 200
    data = res.json()

    assert data["verdict"] == "INCONSISTENT"
    assert "hypotheses" in data
    assert "leave_one_out_sensitivity" in data
    assert "cost_model" in data

    # Verify hypotheses shape
    assert len(data["hypotheses"]) >= 2
    top = data["hypotheses"][0]
    assert top["rank"] == 1
    assert top["cost"] == 100
    assert top["statement"].startswith("To restore consistency, ONE of these must be wrong:")
    assert len(top["conflicting_facts"]) == 1
    assert top["conflicting_facts"][0]["id"] == "FACT_CASE_A_UPI_DEL"
    assert len(top["supporting_facts"]) == 2

    # Verify leave-one-out sensitivity shape
    sens = data["leave_one_out_sensitivity"]
    assert len(sens) == 3
    upi_sens = next(s for s in sens if s["fact_id"] == "FACT_CASE_A_UPI_DEL")
    assert upi_sens["flips_verdict"] is True
    assert upi_sens["remaining_cores_count"] == 0

    cdr_sens = next(s for s in sens if s["fact_id"] == "FACT_CASE_A_CDR_BLR")
    assert cdr_sens["flips_verdict"] is False
    assert cdr_sens["remaining_cores_count"] == 1


def test_custom_cost_weights_reorder_hypotheses():
    """Test 5: Custom reliability weights reorder hypotheses according to the user model."""
    case_a = generate_case_a_impossible_alibi()
    # Invert weights: make bank_log extremely expensive (cost 500) and carrier_cdr cheap (cost 20)
    custom = {"bank_log": 500, "carrier_cdr": 20, "user_supplied": 10}
    report = compute_hypothesis_report(
        facts=case_a.facts,
        clock_bounds=case_a.clock_bounds,
        custom_weights=custom,
    )

    # Now dropping CDR + Claim costs 20 + 10 = 30, which is cheaper than dropping UPI (cost 500)
    assert report.hypotheses[0].cost == 30
    dropped = {f.id for f in report.hypotheses[0].conflicting_facts}
    assert dropped == {"FACT_CASE_A_CDR_BLR", "FACT_CASE_A_CLAIM_ALIBI"}
    assert report.hypotheses[1].cost == 500
    assert report.hypotheses[1].conflicting_facts[0].id == "FACT_CASE_A_UPI_DEL"
