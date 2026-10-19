"""Unit tests for Phase 2: Z3 SMT Constraint Formulation, Solving & Track Separation.

Verifies:
1. Case B proof strictly from real Fact objects via Z3ConstraintBuilder (pairwise SAT, globally UNSAT).
2. Independent brute-force MUS check verifying minimal unsatisfiable subsets mathematically.
3. Near-miss and boundary condition test cases.
4. Case A evaluation with air overhead = 0 minutes.
5. Bound-vs-Gap table generation and deficit auditing.
6. Track separation: passive device vs active authentication, and the 'handset_with_third_party' hypothesis toggle.
7. Entity link assumption participation in conflict reasoning.
8. Scalability and pair-pruning verification on 200+ distractor facts case.
"""

import time
import pytest
import z3

from tarka.core.travel import TravelSpeedConfig, compute_travel_lower_bound
from tarka.generator.synthetic_cases import (
    generate_case_a_impossible_alibi,
    generate_case_b_cyclic_skew_trap,
    generate_case_c_consistent_control,
    generate_case_d_dual_cores,
    generate_case_near_miss,
    generate_case_boundary,
    generate_case_200_distractors,
)
from tarka.solver.z3_builder import Z3ConstraintBuilder
from tarka.solver.brute_mus import brute_force_find_all_mus
from tarka.solver.tables import generate_bound_vs_gap_table, print_bound_vs_gap_table


def test_case_b_reworked_via_real_facts_builder() -> None:
    """CRITICAL REQUIREMENT: Proves Case B pairwise-SAT and globally-UNSAT from real Facts via Builder.

    Uses real Fact objects and clock bounds through Z3ConstraintBuilder.
    """
    case_b = generate_case_b_cyclic_skew_trap(seed=42)
    facts = case_b.facts
    bounds = case_b.clock_bounds
    assert len(facts) == 4

    builder = Z3ConstraintBuilder()

    # Test that EVERY PAIR among all 4 facts is SAT (6 pairs total)
    n = len(facts)
    for i in range(n):
        for j in range(i + 1, n):
            pair = [facts[i], facts[j]]
            s, lmap, _ = builder.build_solver(pair, bounds)
            res = s.check(builder.get_assumptions_for_facts(pair, lmap))
            assert res == z3.sat, f"Pair {facts[i].id} <-> {facts[j].id} must be SAT"

    # Test Joint System {F1, F2, F3, F4} all together is globally UNSAT
    s_all, lmap_all, bundle = builder.build_solver(facts, bounds)
    assumps_all = builder.get_assumptions_for_facts(facts, lmap_all)
    res_all = s_all.check(assumps_all)
    assert res_all == z3.unsat, (
        f"Joint 4-fact system from builder must be UNSAT! Got {res_all}."
    )


def test_brute_force_mus_independent_verification() -> None:
    """CRITICAL REQUIREMENT: Exhaustive brute-force MUS check on small cases without hardcoded JSON."""
    # Case A: should have 2 minimal conflict cores
    case_a = generate_case_a_impossible_alibi(seed=42)
    mus_a = brute_force_find_all_mus(case_a.facts, case_a.clock_bounds)
    assert len(mus_a) == 2
    assert ["FACT_CASE_A_CDR_BLR", "FACT_CASE_A_UPI_DEL"] in mus_a
    assert ["FACT_CASE_A_CLAIM_ALIBI", "FACT_CASE_A_UPI_DEL"] in mus_a

    # Case B: 2 ternary conflict cores along the circular transit loop
    case_b = generate_case_b_cyclic_skew_trap(seed=42)
    mus_b = brute_force_find_all_mus(case_b.facts, case_b.clock_bounds)
    assert len(mus_b) == 2
    assert sorted(mus_b) == sorted(case_b.expected_conflict_cores)

    # Case C (Consistent Control): 0 conflict cores
    case_c = generate_case_c_consistent_control(seed=42)
    mus_c = brute_force_find_all_mus(case_c.facts, case_c.clock_bounds)
    assert len(mus_c) == 0

    # Case D (Dual Cores): 2 disjoint conflict cores
    case_d = generate_case_d_dual_cores(seed=42)
    mus_d = brute_force_find_all_mus(case_d.facts, case_d.clock_bounds)
    assert len(mus_d) == 2
    assert ["FACT_D1_MUM_CDR", "FACT_D2_GOA_UPI"] in mus_d
    assert ["FACT_D3_KOL_WA", "FACT_D4_GUW_ATM"] in mus_d


def test_near_miss_and_boundary_cases() -> None:
    """Verifies precision handling in near-miss and boundary transit cases."""
    # Near Miss Case
    case_nm = generate_case_near_miss(seed=42)
    builder = Z3ConstraintBuilder()
    s_nm, lmap_nm, _ = builder.build_solver(case_nm.facts, case_nm.clock_bounds)
    res_nm = s_nm.check(builder.get_assumptions_for_facts(case_nm.facts, lmap_nm))
    assert res_nm == z3.unsat, "Near-miss with nominal bounds must be UNSAT"

    # Relaxing clock skew bounds by +10s makes the near-miss SAT!
    relaxed_bounds = {"clk_nm_1": 15.0, "clk_nm_2": 15.0}
    s_rel, lmap_rel, _ = builder.build_solver(case_nm.facts, relaxed_bounds)
    res_rel = s_rel.check(builder.get_assumptions_for_facts(case_nm.facts, lmap_rel))
    assert res_rel == z3.sat, "Near-miss under relaxed skew bound must become SAT"

    # Boundary Case (Exactly matches lower bound time)
    case_bnd = generate_case_boundary(seed=42)
    s_bnd, lmap_bnd, _ = builder.build_solver(case_bnd.facts, case_bnd.clock_bounds)
    res_bnd = s_bnd.check(builder.get_assumptions_for_facts(case_bnd.facts, lmap_bnd))
    assert res_bnd == z3.sat, "Boundary condition must be SAT"


def test_case_a_with_zero_air_overhead() -> None:
    """CRITICAL REQUIREMENT: Report Case A with air overhead = 0."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    f_blr = next(f for f in case_a.facts if f.id == "FACT_CASE_A_CDR_BLR")
    f_del = next(f for f in case_a.facts if f.id == "FACT_CASE_A_UPI_DEL")

    # Evaluate travel lower bound with zero air overhead (instantaneous security, boarding, taxiing)
    cfg_zero_overhead = TravelSpeedConfig(
        air_overhead_minutes=0.0,
        air_max_speed_kmh=900.0,
    )
    travel = compute_travel_lower_bound(f_blr.region, f_del.region, config=cfg_zero_overhead)

    # 1740 km / 900 km/h = 1.933 hours = 6960 seconds
    assert travel.governing_mode == "AIR"
    assert travel.min_travel_seconds > 6800.0

    nominal_available = f_del.time_window.reported_epoch - f_blr.time_window.reported_epoch
    assert nominal_available == 1800.0

    deficit = travel.min_travel_seconds - nominal_available
    assert deficit > 5000.0

    # Confirm Z3 solver also rejects with zero overhead
    builder = Z3ConstraintBuilder(speed_config=cfg_zero_overhead)
    solver, lmap, _ = builder.build_solver([f_blr, f_del], case_a.clock_bounds)
    res = solver.check(builder.get_assumptions_for_facts([f_blr, f_del], lmap))
    assert res == z3.unsat, "Case A must remain strictly UNSAT even with zero air overhead"


def test_bound_vs_gap_table_output() -> None:
    """CRITICAL REQUIREMENT: Prints and validates the Bound-vs-Gap table."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    table_str = generate_bound_vs_gap_table(case_a.facts, case_a.clock_bounds)

    assert "DEFICIT" in table_str
    assert "Dist(km)" in table_str
    assert "Req(s)" in table_str
    assert "Gap(s)" in table_str

    # Print to console for audit log visibility
    print_bound_vs_gap_table(case_a.facts, case_a.clock_bounds, title="Case A (Impossible Alibi)")


def test_track_separation_and_hypothesis_switch() -> None:
    """Verifies passive vs active track separation and 'handset_with_third_party' toggle."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    facts_cdr_upi = [
        next(f for f in case_a.facts if f.id == "FACT_CASE_A_CDR_BLR"),  # PASSIVE (Device tower ping)
        next(f for f in case_a.facts if f.id == "FACT_CASE_A_UPI_DEL"),  # ACTIVE (User UPI PIN payment)
    ]

    # Baseline: handset_with_third_party = False (Default: user holds handset)
    builder_default = Z3ConstraintBuilder(handset_with_third_party=False)
    s_def, lmap_def, _ = builder_default.build_solver(facts_cdr_upi, case_a.clock_bounds)
    assert s_def.check(builder_default.get_assumptions_for_facts(facts_cdr_upi, lmap_def)) == z3.unsat

    # Hypothesis Switch: handset_with_third_party = True (Handset was with associate/third party)
    # Passive device presence and Active UPI PIN are DECOUPLED!
    builder_switch = Z3ConstraintBuilder(handset_with_third_party=True)
    s_sw, lmap_sw, bundle_sw = builder_switch.build_solver(facts_cdr_upi, case_a.clock_bounds)
    assumps_sw = builder_switch.get_assumptions_for_facts(facts_cdr_upi, lmap_sw)
    assert s_sw.check(assumps_sw) == z3.sat
    assert lmap_sw["hypo_handset_with_owner"] not in assumps_sw


def test_entity_resolution_and_core_assumptions() -> None:
    """Verifies that entity link assumptions are generated and tracked."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    builder = Z3ConstraintBuilder()
    _, lmap, bundle = builder.build_solver(case_a.facts, case_a.clock_bounds)

    entity_assumps = [k for k in bundle.assumptions_map if k.startswith("assump_entity_")]
    assert len(entity_assumps) >= len(case_a.facts)
    for k in entity_assumps:
        assert "linked to entity" in bundle.assumptions_map[k]


def test_200_distractor_facts_scalability_and_pair_pruning() -> None:
    """CRITICAL REQUIREMENT: 200+ distractor facts case solved with pair-pruning verification."""
    case_dist = generate_case_200_distractors(seed=42)
    assert len(case_dist.facts) >= 200

    builder = Z3ConstraintBuilder()
    t_start = time.perf_counter()

    solver, lmap, bundle = builder.build_solver(case_dist.facts, case_dist.clock_bounds)
    build_time = time.perf_counter() - t_start

    # Verify that the pair-pruning rule pruned the vast majority of combinations
    # Total pairs for 203 facts is 203 * 202 / 2 = 20,503 pairs
    assert bundle.total_pairs_considered > 20000
    assert bundle.pruned_pairs_count > 19000
    prune_ratio = bundle.pruned_pairs_count / bundle.total_pairs_considered
    assert prune_ratio > 0.95, f"Pair pruning ratio {prune_ratio:.2%} should exceed 95%"

    # Solver check
    t_solve_start = time.perf_counter()
    res = solver.check(builder.get_assumptions_for_facts(case_dist.facts, lmap))
    solve_time = time.perf_counter() - t_solve_start

    # Case A conflict inside distractor set must still be detected
    assert res == z3.unsat
    # Real measured execution performance (completes in < 2 seconds due to pruning)
    assert (build_time + solve_time) < 5.0
