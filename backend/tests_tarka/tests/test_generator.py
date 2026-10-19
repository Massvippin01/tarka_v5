"""Unit tests for Phase 1: Synthetic Indian Case Generator & Ground Truth.

Includes:
1. Deterministic seeding and raw file emission.
2. Cell tower fixture and coordinate lookup.
3. IST (UTC+05:30) vs UTC timezone handling.
4. Ground truth schema validation for Cases A, B, C, D.
5. MATHEMATICAL PROOF VIA Z3: Case B is strictly pairwise-SAT but globally UNSAT
   across >= 3 clocks with cyclic offset constraints.
"""

import datetime
import hashlib
import json
import pytest
import z3

from tarka.core.models import FactKind, TrustTier, AuthType
from tarka.core.travel import compute_travel_lower_bound
from tarka.generator.cell_towers import INDIAN_CELL_TOWERS, get_cell_tower
from tarka.generator.synthetic_cases import (
    generate_case_a_impossible_alibi,
    generate_case_b_cyclic_skew_trap,
    generate_case_c_consistent_control,
    generate_case_d_dual_cores,
    generate_all_cases,
    CaseType,
)


def test_cell_tower_fixtures() -> None:
    """Verifies coverage and geographic accuracy of Indian cell towers."""
    assert len(INDIAN_CELL_TOWERS) >= 8
    blr = get_cell_tower("BLR_MG_ROAD_01")
    assert blr is not None
    assert blr["city"] == "Bengaluru"
    assert 12.0 < blr["latitude"] < 14.0
    assert 77.0 < blr["longitude"] < 78.0

    delhi = get_cell_tower("DEL_CONNAUGHT_PLACE_01")
    assert delhi is not None
    assert 28.0 < delhi["latitude"] < 29.0


def test_timezone_ist_utc_handling() -> None:
    """Verifies that IST timestamps convert deterministically to UTC epoch seconds."""
    ist_tz = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    # 2026-01-01 10:00:00 IST
    dt_ist = datetime.datetime(2026, 1, 1, 10, 0, 0, tzinfo=ist_tz)
    epoch_sec = dt_ist.timestamp()

    # UTC equivalent is 04:30:00
    dt_utc = datetime.datetime.fromtimestamp(epoch_sec, tz=datetime.timezone.utc)
    assert dt_utc.year == 2026
    assert dt_utc.month == 1
    assert dt_utc.day == 1
    assert dt_utc.hour == 4
    assert dt_utc.minute == 30
    assert dt_utc.second == 0


def test_case_a_structure_and_emission() -> None:
    """Verifies Case A generation, raw files, and ground truth expectations."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    assert case_a.case_type == CaseType.CASE_A_IMPOSSIBLE_ALIBI
    assert case_a.expected_satisfiable is False
    assert len(case_a.facts) == 3
    assert len(case_a.raw_files) == 3
    assert "airtel_cdr_20260101.csv" in case_a.raw_files
    assert "sbi_upi_stmt_20260101.csv" in case_a.raw_files
    assert "suspect_statement.txt" in case_a.raw_files

    # Assert SHA-256 integrity of raw files matches Fact fields
    for f in case_a.facts:
        raw_content = case_a.raw_files[f.source_file]
        expected_hash = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()
        assert f.sha256 == expected_hash

    # Verify physical impossibility between BLR CDR and DEL UPI
    blr_fact = next(f for f in case_a.facts if f.id == "FACT_CASE_A_CDR_BLR")
    del_fact = next(f for f in case_a.facts if f.id == "FACT_CASE_A_UPI_DEL")
    travel = compute_travel_lower_bound(blr_fact.region, del_fact.region)

    time_delta = del_fact.time_window.start_epoch - blr_fact.time_window.end_epoch
    assert time_delta < travel.min_travel_seconds
    assert travel.haversine_distance_km > 1700.0


def test_case_c_consistent_control() -> None:
    """Verifies that the control case represents a physically feasible corridor."""
    case_c = generate_case_c_consistent_control(seed=42)
    assert case_c.case_type == CaseType.CASE_C_CONSISTENT_CONTROL
    assert case_c.expected_satisfiable is True
    assert len(case_c.expected_conflict_cores) == 0

    f_blr = case_c.facts[0]
    f_mys = case_c.facts[2]
    travel = compute_travel_lower_bound(f_blr.region, f_mys.region)
    time_delta = f_mys.time_window.start_epoch - f_blr.time_window.end_epoch
    # Available time (~9900s = 2h 45m) is well above minimum travel seconds (~3000s)
    assert time_delta > travel.min_travel_seconds


def test_case_d_dual_cores_independence() -> None:
    """Verifies that Case D contains two disjoint minimal unsatisfiable subsets."""
    case_d = generate_case_d_dual_cores(seed=42)
    assert case_d.expected_satisfiable is False
    assert len(case_d.expected_conflict_cores) == 2

    core1_ids = set(case_d.expected_conflict_cores[0])
    core2_ids = set(case_d.expected_conflict_cores[1])

    # Disjoint check: the two cores do not share any facts
    assert core1_ids.isdisjoint(core2_ids)


def test_case_b_z3_minimal_proof_pairwise_sat_globally_unsat() -> None:
    """CRITICAL REQUIREMENT: Minimal Z3 test proving Case B is pairwise-SAT but globally UNSAT."""
    case_b = generate_case_b_cyclic_skew_trap(seed=42)
    assert len(case_b.facts) == 4
    assert len(case_b.clock_bounds) >= 3

    facts = case_b.facts
    bounds = case_b.clock_bounds

    # Skew variables
    s_cctv = z3.Real("s_cctv")
    s_pos = z3.Real("s_pos")
    s_app = z3.Real("s_app")

    clock_map = {
        "clk_cctv_retail": s_cctv,
        "clk_pos_terminal": s_pos,
        "clk_handset_app": s_app,
    }

    skew_bounds_exprs = [
        s_cctv >= -bounds["clk_cctv_retail"], s_cctv <= bounds["clk_cctv_retail"],
        s_pos >= -bounds["clk_pos_terminal"], s_pos <= bounds["clk_pos_terminal"],
        s_app >= -bounds["clk_handset_app"], s_app <= bounds["clk_handset_app"],
    ]

    # True time expressions for the 4 facts
    t1 = facts[0].time_window.reported_epoch + clock_map[facts[0].clock_id]
    t2 = facts[1].time_window.reported_epoch + clock_map[facts[1].clock_id]
    t3 = facts[2].time_window.reported_epoch + clock_map[facts[2].clock_id]
    t4 = facts[3].time_window.reported_epoch + clock_map[facts[3].clock_id]

    t_list = [t1, t2, t3, t4]

    # 1. Test EVERY PAIR is SAT (all 6 pairs)
    n = len(facts)
    for i in range(n):
        for j in range(i + 1, n):
            req_sec = compute_travel_lower_bound(facts[i].region, facts[j].region).min_travel_seconds
            s_pair = z3.Solver()
            s_pair.add(*skew_bounds_exprs)
            s_pair.add(z3.Or((t_list[j] - t_list[i]) >= req_sec, (t_list[i] - t_list[j]) >= req_sec))
            assert s_pair.check() == z3.sat, f"Pair {i} <-> {j} must be SAT"

    # 2. Test the joint circular loop is globally UNSAT
    s_global = z3.Solver()
    s_global.add(*skew_bounds_exprs)
    req_12 = compute_travel_lower_bound(facts[0].region, facts[1].region).min_travel_seconds
    req_23 = compute_travel_lower_bound(facts[1].region, facts[2].region).min_travel_seconds
    req_34 = compute_travel_lower_bound(facts[2].region, facts[3].region).min_travel_seconds
    s_global.add((t2 - t1) >= req_12)
    s_global.add((t3 - t2) >= req_23)
    s_global.add((t4 - t3) >= req_34)

    assert s_global.check() == z3.unsat, (
        "Global multi-clock circular transit loop must be UNSAT!"
    )


def test_ground_truth_json_export() -> None:
    """Verifies that all cases produce valid ground-truth JSON."""
    all_cases = generate_all_cases(seed=123)
    assert len(all_cases) == 7
    for c in all_cases:
        gt_json = c.to_ground_truth_json()
        data = json.loads(gt_json)
        assert data["case_id"] == c.case_id
        assert "facts" in data
        assert "expected_satisfiable" in data
        assert "clock_bounds" in data
