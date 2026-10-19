r"""Independent brute-force Minimal Unsatisfiable Subset (MUS) verifier.

Performs exhaustive combinatorial subset checking for small fact sets (< 15 facts)
independent of ground-truth JSON annotations to provide an unassailable mathematical
ground truth benchmark for SMT solver correctness.
"""

from __future__ import annotations

import itertools
from typing import Callable, Dict, List, Optional, Set
import z3

from tarka.core.models import Fact
from tarka.core.travel import TravelSpeedConfig
from tarka.solver.z3_builder import Z3ConstraintBuilder


def brute_force_find_all_mus(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
) -> List[List[str]]:
    """Exhaustively discovers all Minimal Unsatisfiable Subsets (MUS) by combinatorial search.

    Definition:
      A subset M of facts is an MUS iff:
      1. M is UNSAT.
      2. For all f in M, M \ {f} is SAT (Minimality).

    This function tests candidate subsets of increasing size k = 1, 2, ..., |facts|.
    """
    builder = Z3ConstraintBuilder(
        speed_config=speed_config,
        handset_with_third_party=handset_with_third_party,
    )

    def is_subset_sat(subset: List[Fact]) -> bool:
        if not subset:
            return True
        solver, literal_map, bundle = builder.build_solver(subset, clock_bounds)
        # Assert both fact literals and their entity link assumptions
        assumptions = builder.get_assumptions_for_facts(subset, literal_map, include_entity_links=True)
        result = solver.check(assumptions)
        return result == z3.sat

    # 1. If entire set is SAT, return empty list
    if is_subset_sat(facts):
        return []

    discovered_mus_sets: List[Set[str]] = []
    discovered_mus_ids: List[List[str]] = []

    n = len(facts)
    fact_dict = {f.id: f for f in facts}
    fact_ids = [f.id for f in facts]

    for k in range(1, n + 1):
        for combo_ids in itertools.combinations(fact_ids, k):
            combo_set = set(combo_ids)

            # Optimization: If combo_set is a strict superset of an already found MUS,
            # it cannot be minimal
            if any(prev_mus.issubset(combo_set) for prev_mus in discovered_mus_sets):
                continue

            combo_facts = [fact_dict[fid] for fid in combo_ids]
            if not is_subset_sat(combo_facts):
                # Verify minimality: Every proper subset of size k-1 must be SAT
                is_minimal = True
                for elem in combo_facts:
                    reduced = [f for f in combo_facts if f.id != elem.id]
                    if not is_subset_sat(reduced):
                        is_minimal = False
                        break

                if is_minimal:
                    discovered_mus_sets.append(combo_set)
                    discovered_mus_ids.append(sorted(list(combo_ids)))

    return discovered_mus_ids
