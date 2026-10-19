"""Forensic Analysis Engine: Robustness Margin, Leave-One-Out, MaxSAT & Sensitivity.

Hard Rules:
1. No black-box scores; pure Z3 optimization and monotone binary search.
2. Robustness margin computed per assumption (clock skew, claim window, tower radius).
3. Weight-sensitivity analysis re-runs MaxSAT across 4 distinct tier weight profiles
   to verify whether conclusions depend on subjective tier weight assignments.
"""

from __future__ import annotations

import copy
import time
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field
import z3

from tarka.core.models import Fact, FactKind, TrustTier
from tarka.core.travel import TravelSpeedConfig
from tarka.solver.z3_builder import Z3ConstraintBuilder


class RobustnessMarginReport(BaseModel):
    """Forensic margin audit revealing minimum parameter relaxations required to restore satisfiability."""
    is_initially_satisfiable: bool
    overall_skew_margin_seconds: float = Field(
        description="Minimum uniform clock skew relaxation restoring global SAT"
    )
    breakdown_margins: Dict[str, float] = Field(
        description="Independent margins for clock_skew (s), claim_window (s), tower_radius (m)"
    )
    model_assumptions: Dict[str, str]


class LeaveOneOutReport(BaseModel):
    """Leave-one-out analysis determining if removing any single fact restores consistency."""
    restores_sat_fact_ids: List[str] = Field(
        description="Facts whose individual removal restores global satisfiability"
    )
    fact_corroboration_counts: Dict[str, int] = Field(
        description="Fact ID -> Number of independent conflict cores sharing this fact"
    )


class MaxSATProfileResult(BaseModel):
    """Result of weighted partial MaxSAT under a specific trust tier weight profile."""
    profile_name: str
    weights_used: Dict[str, int]
    rejected_fact_ids: List[str]
    total_penalty_cost: int
    retained_fact_ids: List[str]


class WeightSensitivityReport(BaseModel):
    """Forensic sensitivity run evaluating if MaxSAT conclusions change under shifting tier weights."""
    profiles_evaluated: List[MaxSATProfileResult]
    is_conclusion_weight_invariant: bool = Field(
        description="True if identical facts are rejected regardless of tier weighting"
    )
    analysis_narrative: str


def compute_corroboration_and_leave_one_out(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    mus_cores: List[List[str]],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
) -> LeaveOneOutReport:
    """Computes corroboration counts and checks if dropping item X restores global SAT."""
    # 1. Corroboration counts (occurrences in minimal cores)
    corroboration: Dict[str, int] = {f.id: 0 for f in facts}
    for core in mus_cores:
        for fid in core:
            if fid in corroboration:
                corroboration[fid] += 1

    # 2. Leave-One-Out check
    builder = Z3ConstraintBuilder(speed_config=speed_config)
    restores_sat: List[str] = []

    for target_fact in facts:
        reduced_facts = [f for f in facts if f.id != target_fact.id]
        if not reduced_facts:
            continue

        solver, lmap, _ = builder.build_solver(reduced_facts, clock_bounds)
        assumps = builder.get_assumptions_for_facts(
            reduced_facts, lmap, handset_with_third_party=handset_with_third_party
        )
        if solver.check(assumps) == z3.sat:
            restores_sat.append(target_fact.id)

    return LeaveOneOutReport(
        restores_sat_fact_ids=restores_sat,
        fact_corroboration_counts=corroboration,
    )


def compute_robustness_margin(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
    tolerance: float = 0.5,
    max_search_seconds: float = 7200.0,
) -> RobustnessMarginReport:
    """Computes robustness margin by monotone binary search broken down per assumption."""
    builder = Z3ConstraintBuilder(speed_config=speed_config)

    # Initial check
    s_init, lmap_init, _ = builder.build_solver(facts, clock_bounds)
    init_assumps = builder.get_assumptions_for_facts(
        facts, lmap_init, handset_with_third_party=handset_with_third_party
    )
    if s_init.check(init_assumps) == z3.sat:
        return RobustnessMarginReport(
            is_initially_satisfiable=True,
            overall_skew_margin_seconds=0.0,
            breakdown_margins={"clock_skew_sec": 0.0, "claim_window_sec": 0.0, "tower_radius_meters": 0.0},
            model_assumptions={"status": "Already satisfiable under nominal bounds"},
        )

    # 1. Clock Skew Margin (Additive uniform relaxation to all clock domains)
    def test_skew_relaxation(delta: float) -> bool:
        relaxed_bounds = {k: v + delta for k, v in clock_bounds.items()}
        s, lm, _ = builder.build_solver(facts, relaxed_bounds)
        a = builder.get_assumptions_for_facts(facts, lm, handset_with_third_party=handset_with_third_party)
        return s.check(a) == z3.sat

    low = 0.0
    high = max_search_seconds
    skew_margin = high

    # Verify high bound is satisfiable before searching
    if test_skew_relaxation(high):
        for _ in range(30):
            if (high - low) < tolerance:
                break
            mid = (low + high) / 2.0
            if test_skew_relaxation(mid):
                high = mid
                skew_margin = mid
            else:
                low = mid
    else:
        skew_margin = float("inf")

    # 2. Claim Window Margin (Expansion applied solely to FactKind.CLAIM time windows)
    def test_claim_relaxation(delta: float) -> bool:
        modified_facts = []
        has_claims = False
        for f in facts:
            if f.kind == FactKind.CLAIM:
                has_claims = True
                f_mod = f.model_copy(deep=True)
                f_mod.time_window.start_epoch -= delta
                f_mod.time_window.end_epoch += delta
                modified_facts.append(f_mod)
            else:
                modified_facts.append(f)
        if not has_claims:
            return False
        s, lm, _ = builder.build_solver(modified_facts, clock_bounds)
        a = builder.get_assumptions_for_facts(modified_facts, lm, handset_with_third_party=handset_with_third_party)
        return s.check(a) == z3.sat

    claim_margin = float("inf")
    low_c, high_c = 0.0, max_search_seconds
    if test_claim_relaxation(high_c):
        for _ in range(30):
            if (high_c - low_c) < tolerance:
                break
            mid = (low_c + high_c) / 2.0
            if test_claim_relaxation(mid):
                high_c = mid
                claim_margin = mid
            else:
                low_c = mid

    # 3. Tower Radius Margin (Expansion applied to cellular coverage radius in meters)
    def test_radius_relaxation(delta_meters: float) -> bool:
        modified_facts = []
        for f in facts:
            f_mod = f.model_copy(deep=True)
            f_mod.region.radius_meters += delta_meters
            modified_facts.append(f_mod)
        s, lm, _ = builder.build_solver(modified_facts, clock_bounds)
        a = builder.get_assumptions_for_facts(modified_facts, lm, handset_with_third_party=handset_with_third_party)
        return s.check(a) == z3.sat

    radius_margin = float("inf")
    low_r, high_r = 0.0, 500000.0  # Up to 500 km radius
    if test_radius_relaxation(high_r):
        for _ in range(30):
            if (high_r - low_r) < 10.0:  # 10m precision
                break
            mid = (low_r + high_r) / 2.0
            if test_radius_relaxation(mid):
                high_r = mid
                radius_margin = mid
            else:
                low_r = mid

    return RobustnessMarginReport(
        is_initially_satisfiable=False,
        overall_skew_margin_seconds=round(skew_margin, 2) if skew_margin != float("inf") else -1.0,
        breakdown_margins={
            "clock_skew_sec": round(skew_margin, 2) if skew_margin != float("inf") else -1.0,
            "claim_window_sec": round(claim_margin, 2) if claim_margin != float("inf") else -1.0,
            "tower_radius_meters": round(radius_margin, 2) if radius_margin != float("inf") else -1.0,
        },
        model_assumptions={
            "search_method": "Monotone binary search over bounded Z3 SMT solver",
            "skew_bounds_used": str(clock_bounds),
            "speed_model": str(speed_config.model_dump() if speed_config else "default"),
        },
    )


def run_weighted_maxsat_sensitivity(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
) -> WeightSensitivityReport:
    """Executes weighted partial MaxSAT across multiple trust profiles to assess weight sensitivity."""
    profiles = [
        ("PROFILE_DEFAULT", {"T1": 100, "T2": 20, "T3": 5}),
        ("PROFILE_EQUAL_WEIGHTS", {"T1": 10, "T2": 10, "T3": 10}),
        ("PROFILE_HEAVY_TELCO", {"T1": 1000, "T2": 10, "T3": 1}),
        ("PROFILE_SKEPTICAL_TELCO", {"T1": 20, "T2": 50, "T3": 5}),
    ]

    results: List[MaxSATProfileResult] = []

    for prof_name, tier_weights in profiles:
        builder = Z3ConstraintBuilder(speed_config=speed_config)
        # We build solver to get literal mapping and constraints
        s_base, lmap, _ = builder.build_solver(facts, clock_bounds)

        # Build Z3 Optimize instance
        opt = z3.Optimize()
        for c in s_base.assertions():
            opt.add(c)

        # Add entity link assumptions and hypothesis as HARD constraints
        resolution = builder.entity_resolver.resolve_facts(facts)
        for f in facts:
            ent = resolution.fact_to_entity.get(f.id, "ANON")
            ent_lit_key = f"assump_entity_{f.id}_{ent}"
            if ent_lit_key in lmap:
                opt.add(lmap[ent_lit_key])

        if not handset_with_third_party and "hypo_handset_with_owner" in lmap:
            opt.add(lmap["hypo_handset_with_owner"])

        # Add each fact assumption as a SOFT constraint weighted by its tier weight
        fact_soft_vars: Dict[str, z3.BoolRef] = {}
        for f in facts:
            f_lit = lmap[f"assump_fact_{f.id}"]
            weight = tier_weights.get(f.tier.value, 10)
            opt.add_soft(f_lit, weight=weight)
            fact_soft_vars[f.id] = f_lit

        check_res = opt.check()
        rejected: List[str] = []
        retained: List[str] = []
        penalty = 0

        if check_res == z3.sat:
            m = opt.model()
            for fid, f_lit in fact_soft_vars.items():
                if z3.is_true(m.eval(f_lit, model_completion=True)):
                    retained.append(fid)
                else:
                    rejected.append(fid)
                    f_obj = next(f for f in facts if f.id == fid)
                    penalty += tier_weights.get(f_obj.tier.value, 10)

        results.append(
            MaxSATProfileResult(
                profile_name=prof_name,
                weights_used=tier_weights,
                rejected_fact_ids=sorted(rejected),
                total_penalty_cost=penalty,
                retained_fact_ids=sorted(retained),
            )
        )

    # Check if rejected fact sets are identical across all weight profiles
    first_rejected = set(results[0].rejected_fact_ids)
    is_invariant = all(set(r.rejected_fact_ids) == first_rejected for r in results)

    narrative = (
        "Sensitivity analysis indicates that rejected facts are completely invariant to trust tier weights."
        if is_invariant
        else "Sensitivity analysis indicates that alternative tier weights shift the minimal penalty rejection set."
    )

    return WeightSensitivityReport(
        profiles_evaluated=results,
        is_conclusion_weight_invariant=is_invariant,
        analysis_narrative=narrative,
    )
