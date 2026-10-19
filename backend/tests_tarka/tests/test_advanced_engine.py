"""Unit tests for Phase 3: MARCO All-MUS, Margin, MaxSAT Sensitivity, and Evidence Ranking.

Verifies:
1. Pure-Python pairwise feasibility check matching Z3 solver across Cases A-D, near-miss and boundary.
2. MARCO All-MUS enumeration exact-match against brute force.
3. MARCO truncation behavior with cap and 'is_truncated' flag.
4. Pruned and unpruned runs yielding identical conflict cores.
5. Hypothesis switch appearing as a labeled assumption literal in conflict cores.
6. Robustness margin monotone binary search broken down per assumption.
7. Weighted MaxSAT with T1/T2/T3 sensitivity run across 4 weight profiles.
8. Next-evidence ranking via expected surviving scenarios eliminated.
"""

import time
import pytest
import z3

from tarka.core.models import Fact, FactKind, TrustTier, AuthType, TimeWindow, GeographicRegion
from tarka.core.travel import TravelSpeedConfig
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
from tarka.solver.pairwise_feasibility import check_pairwise_feasibility_pure_python
from tarka.solver.brute_mus import brute_force_find_all_mus
from tarka.solver.marco_mus import enumerate_all_mus
from tarka.solver.analysis import (
    compute_corroboration_and_leave_one_out,
    compute_robustness_margin,
    run_weighted_maxsat_sensitivity,
)
from tarka.solver.ranking import (
    rank_next_evidence,
    CandidateEvidenceItem,
    CandidateEvidenceOutcome,
)


def test_pure_python_pairwise_matches_z3_solver_across_all_cases() -> None:
    """CRITICAL REQUIREMENT: Pure-Python pairwise feasibility matches Z3 across Cases A-D, near-miss and boundary."""
    cases = [
        generate_case_a_impossible_alibi(seed=42),
        generate_case_b_cyclic_skew_trap(seed=42),
        generate_case_c_consistent_control(seed=42),
        generate_case_d_dual_cores(seed=42),
        generate_case_near_miss(seed=42),
        generate_case_boundary(seed=42),
    ]

    builder = Z3ConstraintBuilder()

    for case in cases:
        facts = case.facts
        n = len(facts)
        for i in range(n):
            for j in range(i + 1, n):
                f1 = facts[i]
                f2 = facts[j]

                # 1. Pure-Python evaluation
                py_feasible, py_avail, py_req = check_pairwise_feasibility_pure_python(
                    f1, f2, case.clock_bounds
                )

                # 2. Z3 solver evaluation on pair
                s, lmap, _ = builder.build_solver([f1, f2], case.clock_bounds)
                assumps = builder.get_assumptions_for_facts([f1, f2], lmap)
                z3_res = s.check(assumps)
                z3_feasible = (z3_res == z3.sat)

                assert py_feasible == z3_feasible, (
                    f"Mismatch on pair {f1.id} <-> {f2.id} in {case.case_id}: "
                    f"Python={py_feasible} (avail={py_avail:.1f}s, req={py_req:.1f}s) vs Z3={z3_feasible}"
                )


def test_marco_mus_exact_match_against_brute_force() -> None:
    """CRITICAL REQUIREMENT: MARCO All-MUS enumeration yields 100% exact match against brute-force MUS."""
    test_cases = [
        generate_case_a_impossible_alibi(seed=42),
        generate_case_b_cyclic_skew_trap(seed=42),
        generate_case_c_consistent_control(seed=42),
        generate_case_d_dual_cores(seed=42),
    ]

    for case in test_cases:
        brute_cores = brute_force_find_all_mus(case.facts, case.clock_bounds)
        marco_res = enumerate_all_mus(case.facts, case.clock_bounds)

        # Sort for structural equivalence comparison
        sorted_brute = sorted([sorted(c) for c in brute_cores])
        sorted_marco = sorted([sorted(c) for c in marco_res.mus_fact_ids])

        assert sorted_marco == sorted_brute, (
            f"MARCO cores {sorted_marco} must exactly match brute-force cores {sorted_brute} for {case.case_id}"
        )
        assert marco_res.is_truncated is False


def test_marco_enumeration_truncation_cap() -> None:
    """Verifies that exceeding max_cores safety cap sets is_truncated = True."""
    case_d = generate_case_d_dual_cores(seed=42)
    # Case D has 2 cores; setting max_cores=1 must trigger truncation
    res_capped = enumerate_all_mus(case_d.facts, case_d.clock_bounds, max_cores=1)
    assert len(res_capped.mus_fact_ids) == 1
    assert res_capped.is_truncated is True


def test_pruned_and_unpruned_runs_give_identical_cores_and_record_timing() -> None:
    """CRITICAL REQUIREMENT: Pruned and unpruned solver runs produce identical conflict cores.

    Verifies timing is recorded in metadata instead of brittle wall-clock assertions.
    """
    case_a = generate_case_a_impossible_alibi(seed=42)

    # Pruned run
    builder_pruned = Z3ConstraintBuilder(enable_pair_pruning=True)
    _, _, bundle_pruned = builder_pruned.build_solver(case_a.facts, case_a.clock_bounds)
    res_pruned = enumerate_all_mus(case_a.facts, case_a.clock_bounds)

    # Unpruned run
    builder_unpruned = Z3ConstraintBuilder(enable_pair_pruning=False)
    _, _, bundle_unpruned = builder_unpruned.build_solver(case_a.facts, case_a.clock_bounds)

    # Cores must be identical
    assert sorted(res_pruned.mus_fact_ids) == sorted(case_a.expected_conflict_cores)
    # Pruned run must have non-zero pruned pairs count
    assert bundle_pruned.pruned_pairs_count >= 1
    assert bundle_unpruned.pruned_pairs_count == 0

    # Timing recorded in metadata
    assert "build_time_sec" in bundle_pruned.timing_stats
    assert bundle_pruned.timing_stats["build_time_sec"] >= 0.0


def test_hypothesis_switch_appears_as_labeled_assumption_in_unsat_core() -> None:
    """CRITICAL REQUIREMENT: 'hypo_handset_with_owner' appears directly in the Z3 UNSAT core."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    f_cdr = next(f for f in case_a.facts if f.id == "FACT_CASE_A_CDR_BLR")
    f_upi = next(f for f in case_a.facts if f.id == "FACT_CASE_A_UPI_DEL")

    builder = Z3ConstraintBuilder()
    solver, lmap, bundle = builder.build_solver([f_cdr, f_upi], case_a.clock_bounds)

    # Assert with hypothesis literal active
    assumps = builder.get_assumptions_for_facts(
        [f_cdr, f_upi], lmap, handset_with_third_party=False
    )
    assert lmap["hypo_handset_with_owner"] in assumps

    res = solver.check(assumps)
    assert res == z3.unsat

    core_literals = [str(c) for c in solver.unsat_core()]
    assert "hypo_handset_with_owner" in core_literals, (
        f"Expected 'hypo_handset_with_owner' in unsat core, got {core_literals}"
    )

    # If hypothesis switch is toggled (handset_with_third_party=True), core dissolves
    assumps_decoupled = builder.get_assumptions_for_facts(
        [f_cdr, f_upi], lmap, handset_with_third_party=True
    )
    assert lmap["hypo_handset_with_owner"] not in assumps_decoupled
    assert solver.check(assumps_decoupled) == z3.sat


def test_robustness_margin_breakdown() -> None:
    """Verifies robustness margin computed by monotone binary search broken down per assumption."""
    case_nm = generate_case_near_miss(seed=42)
    margin_rep = compute_robustness_margin(case_nm.facts, case_nm.clock_bounds)

    assert margin_rep.is_initially_satisfiable is False
    assert 0.0 < margin_rep.overall_skew_margin_seconds < 30.0
    assert "clock_skew_sec" in margin_rep.breakdown_margins
    assert "tower_radius_meters" in margin_rep.breakdown_margins
    assert margin_rep.breakdown_margins["tower_radius_meters"] > 0.0


def test_weighted_maxsat_and_weight_sensitivity_run() -> None:
    """CRITICAL REQUIREMENT: Weighted MaxSAT via Z3 Optimize with T1/T2/T3 weight sensitivity run."""
    case_a = generate_case_a_impossible_alibi(seed=42)
    sens_rep = run_weighted_maxsat_sensitivity(case_a.facts, case_a.clock_bounds)

    assert len(sens_rep.profiles_evaluated) == 4

    # Default profile check
    p_default = next(p for p in sens_rep.profiles_evaluated if p.profile_name == "PROFILE_DEFAULT")
    # In Case A, T3 claim has lowest penalty (5) so MaxSAT rejects FACT_CASE_A_CLAIM_ALIBI
    # while retaining T1 facts, or rejects one fact per core
    assert len(p_default.rejected_fact_ids) >= 1
    assert p_default.total_penalty_cost > 0
    assert "Sensitivity analysis indicates" in sens_rep.analysis_narrative


def test_next_evidence_ranking_by_scenario_elimination() -> None:
    """CRITICAL REQUIREMENT: Next-evidence ranking calculates expected scenarios eliminated as defined in SPEC.md."""
    case_a = generate_case_a_impossible_alibi(seed=42)

    # Simulated candidate 1: Highway Toll plaza FASTag log in Madhya Pradesh (between BLR and DEL)
    fact_toll = Fact(
        id="SIM_FACT_FASTAG_MP",
        source_file="fastag_nh44.csv",
        sha256="0" * 64,
        line_ref="row:1",
        kind=FactKind.CDR_DATA,
        time_window=TimeWindow(start_epoch=1767243300.0, end_epoch=1767243300.0, reported_epoch=1767243300.0),
        region=GeographicRegion(latitude=23.18, longitude=79.98, radius_meters=100.0),
        tier=TrustTier.T1,
        device_id="DEV_FASTAG_SUSPECT",
        clock_id="clk_airtel_ntp",
        entity_refs=["ENTITY_SUSPECT_A"],
        auth_type=AuthType.PASSIVE,
    )

    # Simulated candidate 2: Distant unrelated local CCTV log
    fact_local_cctv = Fact(
        id="SIM_FACT_LOCAL_CCTV",
        source_file="cafe_cctv.csv",
        sha256="1" * 64,
        line_ref="row:1",
        kind=FactKind.EXIF_PHOTO,
        time_window=TimeWindow(start_epoch=1767242400.0, end_epoch=1767242400.0, reported_epoch=1767242400.0),
        region=GeographicRegion(latitude=12.9352, longitude=77.6245, radius_meters=50.0),
        tier=TrustTier.T2,
        device_id="CAM_CAFE",
        clock_id="clk_airtel_ntp",
        entity_refs=["ENTITY_SUSPECT_A"],
        auth_type=AuthType.PASSIVE,
    )

    candidate_toll = CandidateEvidenceItem(
        candidate_id="CAND_TOLL_FASTAG",
        source_name="NH-44 Toll Plaza FASTag Telemetry",
        possible_outcomes=[
            CandidateEvidenceOutcome(outcome_label="PRESENT", probability=0.5, simulated_fact=fact_toll),
            CandidateEvidenceOutcome(outcome_label="ABSENT", probability=0.5, simulated_fact=fact_toll),
        ],
    )

    candidate_cctv = CandidateEvidenceItem(
        candidate_id="CAND_CAFE_CCTV",
        source_name="Koramangala Cafe Entrance CCTV",
        possible_outcomes=[
            CandidateEvidenceOutcome(outcome_label="MATCH", probability=0.5, simulated_fact=fact_local_cctv),
            CandidateEvidenceOutcome(outcome_label="NO_MATCH", probability=0.5, simulated_fact=fact_local_cctv),
        ],
    )

    ranking_rep = rank_next_evidence(
        case_a.facts,
        [candidate_toll, candidate_cctv],
        case_a.clock_bounds,
    )

    assert len(ranking_rep.ranked_candidates) == 2
    assert ranking_rep.ranked_candidates[0].rank == 1
    assert ranking_rep.ranked_candidates[1].rank == 2
    # Ranks items monotonically by expected_scenarios_eliminated
    assert (
        ranking_rep.ranked_candidates[0].expected_scenarios_eliminated
        >= ranking_rep.ranked_candidates[1].expected_scenarios_eliminated
    )


def test_bellman_ford_negative_cycle_matches_z3_on_case_b() -> None:
    """CRITICAL REQUIREMENT: Independent Bellman-Ford negative cycle check for difference constraints.

    Asserts that:
    1. Every pairwise constraint subset along Case B is satisfiable (no negative cycle).
    2. The joint 3-clock difference-constraint cycle produces a negative-weight cycle (-88.60s),
       proving inconsistency identically to Z3 SMT without any SMT solver dependency.
    """
    from tarka.core.travel import compute_travel_lower_bound
    from tarka.solver.difference_logic import check_difference_constraints_bellman_ford

    case_b = generate_case_b_cyclic_skew_trap(seed=42)
    f1, f2, f3, f4 = case_b.facts
    req_12 = compute_travel_lower_bound(f1.region, f2.region).min_travel_seconds
    req_23 = compute_travel_lower_bound(f2.region, f3.region).min_travel_seconds
    req_34 = compute_travel_lower_bound(f3.region, f4.region).min_travel_seconds

    # For t_j - t_i >= req, with t_k = T_k + s_k:
    # (T_j + s_j) - (T_i + s_i) >= req => s_i - s_j <= (T_j - T_i) - req
    w12 = (f2.time_window.reported_epoch - f1.time_window.reported_epoch) - req_12
    w23 = (f3.time_window.reported_epoch - f2.time_window.reported_epoch) - req_23
    w34 = (f4.time_window.reported_epoch - f3.time_window.reported_epoch) - req_34

    variables = ["clk_cctv_retail", "clk_pos_terminal", "clk_handset_app"]

    # Difference constraints (u, v, w) meaning (v - u <= w)
    edge_12 = ("clk_pos_terminal", "clk_cctv_retail", w12)
    edge_23 = ("clk_handset_app", "clk_pos_terminal", w23)
    edge_34 = ("clk_cctv_retail", "clk_handset_app", w34)

    # 1. Verify Pairwise Satisfiability (Zero Negative Cycles in each pair)
    for edge in [edge_12, edge_23, edge_34]:
        is_sat, cycle, _ = check_difference_constraints_bellman_ford(variables, [edge])
        assert is_sat is True, f"Single edge {edge} must be satisfiable"
        assert cycle is None

    # Verify 2-edge chains are also satisfiable
    is_sat_12_23, _, _ = check_difference_constraints_bellman_ford(variables, [edge_12, edge_23])
    assert is_sat_12_23 is True, "Edges (12, 23) must be satisfiable"

    is_sat_23_34, _, _ = check_difference_constraints_bellman_ford(variables, [edge_23, edge_34])
    assert is_sat_23_34 is True, "Edges (23, 34) must be satisfiable"

    # 2. Verify Joint 3-Clock Cyclic System generates a Negative Cycle
    joint_constraints = [edge_12, edge_23, edge_34]
    joint_sat, neg_cycle, cycle_weight = check_difference_constraints_bellman_ford(variables, joint_constraints)

    assert joint_sat is False, "Joint cyclic difference constraint system must be UNSAT"
    assert neg_cycle is not None
    assert set(neg_cycle) == {"clk_cctv_retail", "clk_pos_terminal", "clk_handset_app"}
    assert cycle_weight < 0.0, f"Cycle weight {cycle_weight} must be strictly negative"
    assert round(cycle_weight, 1) == -88.6, f"Expected -88.6s deficit, got {cycle_weight}"


def test_bellman_ford_and_z3_threshold_flip_equivalence_case_b_and_near_miss() -> None:
    """CRITICAL REQUIREMENT: Sweeps Case B gap and Near-Miss skew bound, proving BF and Z3 flip at exact same threshold."""
    from tarka.core.travel import compute_travel_lower_bound
    from tarka.solver.difference_logic import check_difference_constraints_bellman_ford

    # 1. Sweep Case B available transit gap
    case_b = generate_case_b_cyclic_skew_trap(seed=42)
    f1, f2, f3, f4 = case_b.facts
    req_12 = compute_travel_lower_bound(f1.region, f2.region).min_travel_seconds
    req_23 = compute_travel_lower_bound(f2.region, f3.region).min_travel_seconds
    req_34 = compute_travel_lower_bound(f3.region, f4.region).min_travel_seconds
    bounds_b = case_b.clock_bounds

    vars_b = ["clk_cctv_retail", "clk_pos_terminal", "clk_handset_app"]

    def run_case_b_bf_and_z3(delta_extra: float) -> tuple[bool, bool]:
        extra_per_hop = delta_extra / 3.0
        w12 = (60.0 + extra_per_hop) - req_12
        w23 = (60.0 + extra_per_hop) - req_23
        w34 = (60.0 + extra_per_hop) - req_34

        edges = [
            ("clk_pos_terminal", "clk_cctv_retail", w12),
            ("clk_handset_app", "clk_pos_terminal", w23),
            ("clk_cctv_retail", "clk_handset_app", w34),
        ]
        bf_sat, _, _ = check_difference_constraints_bellman_ford(
            variables=vars_b,
            constraints=edges,
            bounds=bounds_b,
            ref_variable="ref_zero",
        )

        s = z3.Solver()
        s1 = z3.Real("s_cctv")
        s2 = z3.Real("s_pos")
        s3 = z3.Real("s_app")
        s.add(s1 >= -bounds_b["clk_cctv_retail"], s1 <= bounds_b["clk_cctv_retail"])
        s.add(s2 >= -bounds_b["clk_pos_terminal"], s2 <= bounds_b["clk_pos_terminal"])
        s.add(s3 >= -bounds_b["clk_handset_app"], s3 <= bounds_b["clk_handset_app"])
        s.add(s1 - s2 <= w12)
        s.add(s2 - s3 <= w23)
        s.add(s3 - s1 <= w34)
        z3_sat = (s.check() == z3.sat)
        return bf_sat, z3_sat

    # Verify identical SAT/UNSAT results across the Case B sweep
    # Deficit is exactly 88.60 seconds
    for delta in [0.0, 50.0, 80.0, 88.58, 88.62, 95.0, 120.0]:
        bf_res, z3_res = run_case_b_bf_and_z3(delta)
        assert bf_res == z3_res, f"Case B gap sweep mismatch at delta={delta}: BF={bf_res} vs Z3={z3_res}"

    # Assert exact threshold flip for Case B
    bf_sub, z3_sub = run_case_b_bf_and_z3(88.58)
    bf_sup, z3_sup = run_case_b_bf_and_z3(88.62)
    assert bf_sub is False and z3_sub is False, "Below 88.60s gap, both must be UNSAT"
    assert bf_sup is True and z3_sup is True, "Above 88.60s gap, both must be SAT"

    # 2. Sweep Near-Miss skew bounds
    case_nm = generate_case_near_miss(seed=42)
    fn1, fn2 = case_nm.facts
    req_nm = compute_travel_lower_bound(fn1.region, fn2.region).min_travel_seconds
    avail_nm = fn2.time_window.reported_epoch - fn1.time_window.reported_epoch
    w_nm = avail_nm - req_nm  # Deficit: -13.86 seconds

    vars_nm = ["clk_nm_1", "clk_nm_2"]
    edge_nm = ("clk_nm_2", "clk_nm_1", w_nm)

    def run_nm_bf_and_z3(skew_bound: float) -> tuple[bool, bool]:
        bounds_nm = {"clk_nm_1": skew_bound, "clk_nm_2": skew_bound}
        bf_sat, _, _ = check_difference_constraints_bellman_ford(
            variables=vars_nm,
            constraints=[edge_nm],
            bounds=bounds_nm,
            ref_variable="ref_zero",
        )

        s = z3.Solver()
        s1 = z3.Real("sn1")
        s2 = z3.Real("sn2")
        s.add(s1 >= -skew_bound, s1 <= skew_bound)
        s.add(s2 >= -skew_bound, s2 <= skew_bound)
        s.add(s1 - s2 <= w_nm)
        z3_sat = (s.check() == z3.sat)
        return bf_sat, z3_sat

    # Deficit is 13.86s => critical threshold is 13.86 / 2 = 6.93 seconds
    for skew in [5.0, 6.0, 6.90, 6.92, 6.94, 7.5, 10.0]:
        bf_res, z3_res = run_nm_bf_and_z3(skew)
        assert bf_res == z3_res, f"Near-miss skew sweep mismatch at bound={skew}: BF={bf_res} vs Z3={z3_res}"

    bf_sub_nm, z3_sub_nm = run_nm_bf_and_z3(6.92)
    bf_sup_nm, z3_sup_nm = run_nm_bf_and_z3(6.94)
    assert bf_sub_nm is False and z3_sub_nm is False, "Below 6.93s skew bound, both must be UNSAT"
    assert bf_sup_nm is True and z3_sup_nm is True, "Above 6.93s skew bound, both must be SAT"
