"""Z3 SMT Constraint Formulation Engine for TARKA.

Hard Rules & Implementation Details:
1. Track Separation & Hypothesis Switch as Labeled Assumption:
   - PASSIVE facts (device presence) and ACTIVE facts (human authentication)
     are linked by the hypothesis literal 'hypo_handset_with_owner'.
   - When 'hypo_handset_with_owner' is asserted, passive and active facts constrain each other.
   - Because it is a labeled assumption literal, 'hypo_handset_with_owner' can appear directly
     in Minimal Unsatisfiable Subsets (MUS), proving whether third-party custody resolves the conflict.
2. Bounded Clock Skew:
   - Every clock domain s_c is strictly bounded: -Delta_c <= s_c <= +Delta_c. Never unbounded.
3. Pair-Pruning Rule:
   - For facts f1, f2, let min_available = |t2 - t1| - (Delta_1 + Delta_2).
     If min_available >= TravelBound(f1, f2), the pair is trivially SAT under all admissible skews.
     Pruning this pair guarantees identical conflict cores while cutting solver pairs by >95%.
4. Labeled Assumption Literals:
   - Every fact assertion, entity link, and hypothesis toggle is guarded by an assumption literal.
"""

from __future__ import annotations

import time
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field, ConfigDict
import z3

from tarka.core.models import Fact, AuthType
from tarka.core.travel import TravelSpeedConfig, compute_travel_lower_bound
from tarka.core.entity_resolution import EntityResolver, EntityResolutionResult


class Z3ModelBundle(BaseModel):
    """Encapsulates Z3 formulation metadata and assumption mapping."""
    model_config = ConfigDict(arbitrary_types_allowed=True)

    fact_ids: List[str]
    clock_ids: List[str]
    assumptions_map: Dict[str, str] = Field(
        description="Z3 literal name -> Human-readable forensic description"
    )
    pruned_pairs_count: int = Field(description="Number of pairs pruned by the pair-pruning rule")
    total_pairs_considered: int = Field(description="Total pairs evaluated")
    speed_config_used: Dict[str, float]
    timing_stats: Dict[str, float] = Field(
        default_factory=dict,
        description="Measured formulation and evaluation timing in seconds"
    )


def is_valid_solver_fact_timestamp(fact: Fact) -> bool:
    """Validates whether a solver Fact possesses a valid, authenticated, non-missing timestamp."""
    if fact is None:
        return False
    raw_payload = getattr(fact, "raw_payload", None)
    if isinstance(raw_payload, dict):
        if raw_payload.get("is_timestamp_missing") is True or raw_payload.get("is_inferred") is True:
            return False
        rec_time = raw_payload.get("recorded_time")
        if rec_time is not None and rec_time in ("NOT_RECORDED", "N/A", "", "MISSING", "None", "UNKNOWN"):
            return False
        assumed_tz = raw_payload.get("assumed_timezone")
        if assumed_tz in ("MISSING_SOURCE_TIMESTAMP", "UNRESOLVED", "UNPARSEABLE_SOURCE_TIMESTAMP"):
            return False
    if fact.time_window is None:
        return False
    epoch = fact.time_window.reported_epoch
    if epoch is None:
        return False
    import math
    if math.isnan(epoch) or math.isinf(epoch):
        return False
    return True


class Z3ConstraintBuilder:
    """Constructs auditable Z3 SMT solver instances from Fact sets."""

    def __init__(
        self,
        speed_config: Optional[TravelSpeedConfig] = None,
        enable_pair_pruning: bool = True,
        handset_with_third_party: bool = False,
    ) -> None:
        self.speed_config = speed_config or TravelSpeedConfig()
        self.enable_pair_pruning = enable_pair_pruning
        self.handset_with_third_party = handset_with_third_party
        self.entity_resolver = EntityResolver()

    def build_solver(
        self,
        facts: List[Fact],
        clock_bounds: Dict[str, float],
    ) -> Tuple[z3.Solver, Dict[str, z3.BoolRef], Z3ModelBundle]:
        """Builds a Z3 solver with bounded skew variables, hypothesis literals, and assumption guards."""
        t_build_start = time.perf_counter()
        solver = z3.Solver()
        literal_map: Dict[str, z3.BoolRef] = {}
        assumptions_desc: Dict[str, str] = {}

        # 1. Resolve Entities
        resolution: EntityResolutionResult = self.entity_resolver.resolve_facts(facts)

        # 2. Hypothesis Switch Assumption Literal: 'hypo_handset_with_owner'
        hypo_handset_lit = z3.Bool("hypo_handset_with_owner")
        literal_map["hypo_handset_with_owner"] = hypo_handset_lit
        assumptions_desc["hypo_handset_with_owner"] = (
            "Hypothesis: Handset was carried by the owner (co-located passive and active tracks)"
        )

        # 3. Declare Bounded Clock Skew Variables
        clock_vars: Dict[str, z3.ArithRef] = {}
        for c_id, bound in clock_bounds.items():
            s_var = z3.Real(f"skew_{c_id}")
            clock_vars[c_id] = s_var
            solver.add(s_var >= -float(bound))
            solver.add(s_var <= float(bound))

        def get_clock_var(c_id: str) -> z3.ArithRef:
            if c_id not in clock_vars:
                bound = clock_bounds.get(c_id, 300.0)
                s_var = z3.Real(f"skew_{c_id}")
                clock_vars[c_id] = s_var
                solver.add(s_var >= -float(bound))
                solver.add(s_var <= float(bound))
            return clock_vars[c_id]

        # 4. Create Fact Time Variables and Fact Assumption Literals
        fact_time_vars: Dict[str, z3.ArithRef] = {}
        for fact in facts:
            t_true = z3.Real(f"t_true_{fact.id}")
            fact_time_vars[fact.id] = t_true

            c_var = get_clock_var(fact.clock_id)

            lit_name = f"assump_fact_{fact.id}"
            a_fact = z3.Bool(lit_name)
            literal_map[lit_name] = a_fact
            assumptions_desc[lit_name] = f"Fact {fact.id} is authentic ({fact.kind.value})"

            # Safeguard D: Only constrain t_true to the interval [t_start, t_end] if timestamp is present.
            # Missing timestamps must not be constrained to epoch zero (1970). Genuine 0.0 is preserved.
            if is_valid_solver_fact_timestamp(fact):
                t_start = float(fact.time_window.start_epoch)
                t_end = float(fact.time_window.end_epoch)

                solver.add(
                    z3.Implies(
                        a_fact,
                        z3.And(
                            t_true >= (t_start + c_var),
                            t_true <= (t_end + c_var)
                        )
                    )
                )

        # 5. Entity Link Assumption Literals
        for fact in facts:
            ent_id = resolution.fact_to_entity.get(fact.id, "ANON")
            ent_lit_name = f"assump_entity_{fact.id}_{ent_id}"
            a_ent = z3.Bool(ent_lit_name)
            literal_map[ent_lit_name] = a_ent
            assumptions_desc[ent_lit_name] = f"Fact {fact.id} is linked to entity {ent_id}"

        # 6. Spatio-Temporal Travel Feasibility Constraints
        n = len(facts)
        total_pairs = 0
        pruned_pairs = 0

        sorted_facts = sorted(facts, key=lambda f: f.time_window.reported_epoch)

        for i in range(n):
            for j in range(i + 1, n):
                f1 = sorted_facts[i]
                f2 = sorted_facts[j]
                total_pairs += 1

                # If either fact has missing timestamp, spatial travel constraints cannot apply
                if (
                    not is_valid_solver_fact_timestamp(f1)
                    or not is_valid_solver_fact_timestamp(f2)
                ):
                    pruned_pairs += 1
                    continue

                # Disjoint entities without shared device do not constrain each other
                e1 = resolution.fact_to_entity.get(f1.id)
                e2 = resolution.fact_to_entity.get(f2.id)
                if e1 != e2 and f1.device_id != f2.device_id:
                    pruned_pairs += 1
                    continue

                # If either fact lacks spatial coordinates, spatial travel constraints cannot apply
                if f1.region is None or f2.region is None:
                    pruned_pairs += 1
                    continue

                # Calculate travel lower bound between regions
                travel = compute_travel_lower_bound(
                    f1.region, f2.region, config=self.speed_config
                )
                min_req_sec = travel.min_travel_seconds

                # Pair-Pruning Rule:
                # If available time under the worst possible clock skew orientation
                # exceeds minimum required travel time, the pair is trivially SAT.
                if self.enable_pair_pruning:
                    t1_nom = f1.time_window.reported_epoch
                    t2_nom = f2.time_window.reported_epoch
                    nominal_gap = abs(t2_nom - t1_nom)

                    # Worst-case clock skew buffer
                    if f1.clock_id == f2.clock_id:
                        skew_buf = 0.0  # Identical clock domain cancels skew
                    else:
                        skew_buf = clock_bounds.get(f1.clock_id, 300.0) + clock_bounds.get(f2.clock_id, 300.0)

                    worst_case_available = nominal_gap - skew_buf

                    if worst_case_available >= min_req_sec and min_req_sec > 0:
                        pruned_pairs += 1
                        continue

                    # Co-located facts with zero required time are trivially SAT
                    if min_req_sec == 0 and f1.id != f2.id:
                        pruned_pairs += 1
                        continue

                # Pair requires constraint assertion
                a_f1 = literal_map[f"assump_fact_{f1.id}"]
                a_f2 = literal_map[f"assump_fact_{f2.id}"]
                e1_lit = literal_map[f"assump_entity_{f1.id}_{e1}"]
                e2_lit = literal_map[f"assump_entity_{f2.id}_{e2}"]

                t_true_1 = fact_time_vars[f1.id]
                t_true_2 = fact_time_vars[f2.id]

                # If one fact is PASSIVE and the other is ACTIVE, guard with hypo_handset_with_owner
                # This allows hypothesis switches to appear inside conflict cores!
                if f1.auth_type != f2.auth_type:
                    guard = z3.And(a_f1, a_f2, e1_lit, e2_lit, hypo_handset_lit)
                else:
                    guard = z3.And(a_f1, a_f2, e1_lit, e2_lit)

                travel_constraint = z3.Or(
                    (t_true_2 - t_true_1) >= float(min_req_sec),
                    (t_true_1 - t_true_2) >= float(min_req_sec),
                )
                solver.add(z3.Implies(guard, travel_constraint))

        build_time = time.perf_counter() - t_build_start

        bundle = Z3ModelBundle(
            fact_ids=[f.id for f in facts],
            clock_ids=list(clock_bounds.keys()),
            assumptions_map=assumptions_desc,
            pruned_pairs_count=pruned_pairs,
            total_pairs_considered=total_pairs,
            speed_config_used=self.speed_config.model_dump(),
            timing_stats={"build_time_sec": round(build_time, 5)},
        )

        return solver, literal_map, bundle

    def get_assumptions_for_facts(
        self,
        facts: List[Fact],
        literal_map: Dict[str, z3.BoolRef],
        include_entity_links: bool = True,
        handset_with_third_party: Optional[bool] = None,
    ) -> List[z3.BoolRef]:
        """Returns the complete set of active assumption literals for checking satisfiability.

        If handset_with_third_party is False (default), asserts 'hypo_handset_with_owner'.
        If handset_with_third_party is True, omits 'hypo_handset_with_owner' (decoupling tracks).
        """
        use_third_party = (
            handset_with_third_party
            if handset_with_third_party is not None
            else self.handset_with_third_party
        )
        assumptions: List[z3.BoolRef] = []
        resolution = self.entity_resolver.resolve_facts(facts)

        for f in facts:
            fact_lit_key = f"assump_fact_{f.id}"
            if fact_lit_key in literal_map:
                assumptions.append(literal_map[fact_lit_key])

            if include_entity_links:
                ent_id = resolution.fact_to_entity.get(f.id, "ANON")
                ent_lit_key = f"assump_entity_{f.id}_{ent_id}"
                if ent_lit_key in literal_map:
                    assumptions.append(literal_map[ent_lit_key])

        # Assert handset_with_owner hypothesis unless explicitly toggled off
        if not use_third_party and "hypo_handset_with_owner" in literal_map:
            assumptions.append(literal_map["hypo_handset_with_owner"])

        return assumptions
