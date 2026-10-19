"""Difference Constraint Logic & Bellman-Ford Negative Cycle Checker.

For systems of difference constraints of the form (x_j - x_i <= c_ij),
satisfiability is mathematically equivalent to the absence of negative-weight cycles
in the constraint graph (Cormen et al., Introduction to Algorithms).

Provides an independent, pure-graph-theoretic verification mechanism for clock skew
and temporal sequencing constraints completely independent of the Z3 SMT solver.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Set, Tuple


def check_difference_constraints_bellman_ford(
    variables: List[str],
    constraints: List[Tuple[str, str, float]],
    bounds: Optional[Dict[str, float]] = None,
    ref_variable: str = "ref_zero",
) -> Tuple[bool, Optional[List[str]], float]:
    """Evaluates difference constraints (x_j - x_i <= weight) via Bellman-Ford.

    Args:
        variables: List of variable identifiers.
        constraints: List of tuples (var_i, var_j, weight) representing (var_j - var_i <= weight).
        bounds: Optional map of variable -> bound_value representing (-bound <= var <= bound).
                Implemented via reference node edges: (ref -> v, bound) and (v -> ref, bound).
        ref_variable: Identifier for zero-reference node x_0.

    Returns:
        (is_satisfiable, negative_cycle_vertices, cycle_weight)
    """
    var_set = set(variables)
    augmented_constraints = list(constraints)

    if bounds:
        var_set.add(ref_variable)
        for var_name, b_val in bounds.items():
            # var - ref <= b_val  =>  edge (ref, var, b_val)
            augmented_constraints.append((ref_variable, var_name, float(b_val)))
            # ref - var <= b_val  =>  edge (var, ref, b_val)
            augmented_constraints.append((var_name, ref_variable, float(b_val)))

    all_vars_list = list(var_set)

    # Create auxiliary source vertex v0 connected to all variables with weight 0
    all_vertices = ["_v0_"] + all_vars_list
    edges = [("_v0_", v, 0.0) for v in all_vars_list] + augmented_constraints

    dist: Dict[str, float] = {v: float("inf") for v in all_vertices}
    pred: Dict[str, Optional[str]] = {v: None for v in all_vertices}
    dist["_v0_"] = 0.0

    # Relax edges |V| - 1 times
    for _ in range(len(all_vertices) - 1):
        updated = False
        for u, v, w in edges:
            if dist[u] != float("inf") and dist[u] + w < dist[v] - 1e-9:
                dist[v] = dist[u] + w
                pred[v] = u
                updated = True
        if not updated:
            break

    # Check for negative-weight cycles on the |V|-th pass
    for u, v, w in edges:
        if dist[u] != float("inf") and dist[u] + w < dist[v] - 1e-9:
            # Negative cycle detected! Trace back to find cycle nodes
            visited = set()
            curr = v
            for _ in range(len(all_vertices)):
                if curr is not None and curr in pred:
                    curr = pred[curr]

            cycle = []
            cycle_start = curr
            node = cycle_start
            cycle_weight = 0.0

            while True:
                cycle.append(node)
                p = pred[node]
                # find edge weight
                for su, sv, sw in edges:
                    if su == p and sv == node:
                        cycle_weight += sw
                        break
                node = p
                if node == cycle_start or node is None:
                    break

            cycle.reverse()
            # Filter out auxiliary vertex if present
            clean_cycle = [n for n in cycle if n != "_v0_"]
            return False, clean_cycle, round(cycle_weight, 4)

    return True, None, 0.0
