"""MARCO-style All-MUS (Minimal Unsatisfiable Subset) Enumerator.

Enumerates all minimal unsatisfiable subsets of forensic facts and assumptions using:
1. Active assumption literals.
2. Dual-solver exploration (SMT solver + boolean power-set map solver).
3. Deletion-based shrinking to guarantee strict minimality of every discovered core.
4. MSS (Maximal Satisfiable Subset / Scenario) dual extraction.
5. Hard cap on enumerated cores with an explicit 'is_truncated' boolean flag.
"""

from __future__ import annotations

import time
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field
import z3

from tarka.core.models import Fact
from tarka.core.travel import TravelSpeedConfig
from tarka.solver.z3_builder import Z3ConstraintBuilder, Z3ModelBundle


class MUSResult(BaseModel):
    """Forensic outcome of All-MUS enumeration and scenario extraction."""
    mus_fact_ids: List[List[str]] = Field(
        description="List of minimal unsatisfiable subsets expressed as Fact IDs"
    )
    mus_full_assumptions: List[List[str]] = Field(
        description="List of minimal unsatisfiable subsets including entity/hypothesis assumptions"
    )
    mss_scenarios: List[List[str]] = Field(
        description="List of maximal satisfiable subsets (scenarios) as Fact IDs"
    )
    is_truncated: bool = Field(
        description="True if enumeration was halted by the max_cores or max_scenarios safety cap"
    )
    total_solver_calls: int = Field(description="Total SMT solver check calls executed")
    execution_time_seconds: float = Field(description="Measured execution wall time in seconds")


def enumerate_all_mus(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
    max_cores: int = 100,
    max_scenarios: int = 50,
) -> MUSResult:
    """MARCO algorithm enumerating all Minimal Unsatisfiable Subsets and Maximal Satisfiable Subsets."""
    t_start = time.perf_counter()
    solver_calls = 0

    builder = Z3ConstraintBuilder(
        speed_config=speed_config,
        handset_with_third_party=handset_with_third_party,
    )
    solver, literal_map, bundle = builder.build_solver(facts, clock_bounds)

    active_assumps = builder.get_assumptions_for_facts(
        facts, literal_map, include_entity_links=True, handset_with_third_party=handset_with_third_party
    )

    lit_to_fact_id: Dict[str, str] = {}
    for f in facts:
        lit_to_fact_id[f"assump_fact_{f.id}"] = f.id

    # 1. Quick initial check: is entire set already SAT?
    solver_calls += 1
    if solver.check(active_assumps) == z3.sat:
        t_exec = time.perf_counter() - t_start
        return MUSResult(
            mus_fact_ids=[],
            mus_full_assumptions=[],
            mss_scenarios=[[f.id for f in facts]],
            is_truncated=False,
            total_solver_calls=solver_calls,
            execution_time_seconds=round(t_exec, 5),
        )

    # 2. Setup MAP solver for subset space exploration
    map_solver = z3.Solver()
    assump_dict: Dict[str, z3.BoolRef] = {str(a): a for a in active_assumps}
    assump_keys = list(assump_dict.keys())

    # Map variable for each assumption literal
    map_vars: Dict[str, z3.BoolRef] = {k: z3.Bool(f"map_{k}") for k in assump_keys}

    mus_fact_ids: List[List[str]] = []
    mus_full: List[List[str]] = []
    mss_scenarios: List[List[str]] = []
    is_truncated = False

    while True:
        if len(mus_fact_ids) >= max_cores or len(mss_scenarios) >= max_scenarios:
            is_truncated = True
            break

        if map_solver.check() == z3.unsat:
            # Map space completely explored
            break

        model = map_solver.model()
        # In MARCO top-down exploration, unconstrained variables in map_solver default to True
        seed_keys: List[str] = [
            k for k in assump_keys if not z3.is_false(model.eval(map_vars[k]))
        ]

        if not seed_keys:
            break

        seed_assumps = [assump_dict[k] for k in seed_keys]

        solver_calls += 1
        check_res = solver.check(seed_assumps)

        if check_res == z3.unsat:
            # UNSAT: Extract unsat core and shrink to MUS via deletion-based shrinking
            core_literals = solver.unsat_core()
            shrunk_keys = [str(c) for c in core_literals]

            # Deletion-based shrinking
            for cand in list(shrunk_keys):
                trial = [assump_dict[k] for k in shrunk_keys if k != cand]
                solver_calls += 1
                if solver.check(trial) == z3.unsat:
                    shrunk_keys.remove(cand)

            # Record shrunk MUS
            mus_fids = sorted(
                list({lit_to_fact_id[k] for k in shrunk_keys if k in lit_to_fact_id})
            )
            mus_full_keys = sorted(shrunk_keys)

            if mus_fids and mus_fids not in mus_fact_ids:
                mus_fact_ids.append(mus_fids)
                mus_full.append(mus_full_keys)

            # Block this MUS in map solver: at least one element of shrunk_keys must be False
            map_solver.add(z3.Or([z3.Not(map_vars[k]) for k in shrunk_keys]))

        elif check_res == z3.sat:
            # SAT: Grow seed to a Maximal Satisfiable Subset (MSS)
            mss_keys = list(seed_keys)
            remaining = [k for k in assump_keys if k not in mss_keys]

            for cand in remaining:
                trial = [assump_dict[k] for k in mss_keys + [cand]]
                solver_calls += 1
                if solver.check(trial) == z3.sat:
                    mss_keys.append(cand)

            mss_fids = sorted(
                list({lit_to_fact_id[k] for k in mss_keys if k in lit_to_fact_id})
            )
            if mss_fids and mss_fids not in mss_scenarios:
                mss_scenarios.append(mss_fids)

            # Block this MSS in map solver: at least one element outside mss_keys must be True
            unselected = [map_vars[k] for k in assump_keys if k not in mss_keys]
            if unselected:
                map_solver.add(z3.Or(unselected))
            else:
                break

    t_exec = time.perf_counter() - t_start
    return MUSResult(
        mus_fact_ids=mus_fact_ids,
        mus_full_assumptions=mus_full,
        mss_scenarios=mss_scenarios,
        is_truncated=is_truncated,
        total_solver_calls=solver_calls,
        execution_time_seconds=round(t_exec, 5),
    )
