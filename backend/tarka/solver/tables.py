"""Bound-vs-Gap audit table for spatio-temporal telemetry verification."""

from __future__ import annotations

from typing import Dict, List, Optional
from tarka.core.models import Fact
from tarka.core.travel import TravelSpeedConfig, compute_travel_lower_bound


def generate_bound_vs_gap_table(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
) -> str:
    """Generates an auditable Bound-vs-Gap comparison table for all relevant pairs.

    For each pair of facts:
    - Nominal time difference
    - Maximum allowable clock skew relaxation from bounded intervals
    - Maximum available transit time
    - Minimum physical travel lower bound across transportation modes
    - Spatial gap/deficit (Deficit = Available - Required)
    - Consistency status (FEASIBLE vs IMPOSSIBLE)
    """
    cfg = speed_config or TravelSpeedConfig()
    lines: List[str] = []

    header = (
        f"{'Pair':<32} | {'Nominal(s)':<10} | {'Skew(s)':<8} | {'Avail(s)':<10} | "
        f"{'Dist(km)':<10} | {'Req(s)':<9} | {'Gap(s)':<10} | {'Mode':<8} | {'Status'}"
    )
    separator = "-" * len(header)
    lines.append(separator)
    lines.append(header)
    lines.append(separator)

    n = len(facts)
    sorted_facts = sorted(facts, key=lambda f: f.time_window.reported_epoch)

    for i in range(n):
        for j in range(i + 1, n):
            f1 = sorted_facts[i]
            f2 = sorted_facts[j]

            pair_label = f"{f1.id} -> {f2.id}"
            if len(pair_label) > 32:
                pair_label = pair_label[:29] + "..."

            t1 = f1.time_window.reported_epoch
            t2 = f2.time_window.reported_epoch
            dt_nominal = t2 - t1

            skew1 = clock_bounds.get(f1.clock_id, 0.0)
            skew2 = clock_bounds.get(f2.clock_id, 0.0)
            max_skew_buffer = skew1 + skew2

            # Maximum possible time available under bounded skews
            dt_avail = dt_nominal + max_skew_buffer

            if f1.region is None or f2.region is None:
                dist_km = 0.0
                req_sec = 0.0
                gap_sec = dt_avail
                mode_str = "UNLOCATED"
                status = "FEASIBLE"
            else:
                travel = compute_travel_lower_bound(f1.region, f2.region, config=cfg)
                dist_km = travel.effective_distance_km
                req_sec = travel.min_travel_seconds
                gap_sec = dt_avail - req_sec
                mode_str = travel.governing_mode
                status = "FEASIBLE" if gap_sec >= 0 else f"DEFICIT ({abs(gap_sec):.1f}s)"

            row = (
                f"{pair_label:<32} | {dt_nominal:<10.1f} | {max_skew_buffer:<8.1f} | {dt_avail:<10.1f} | "
                f"{dist_km:<10.1f} | {req_sec:<9.1f} | {gap_sec:<10.1f} | "
                f"{mode_str:<8} | {status}"
            )
            lines.append(row)

    lines.append(separator)
    return "\n".join(lines)


def print_bound_vs_gap_table(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    title: Optional[str] = None,
) -> None:
    """Prints the Bound-vs-Gap table to standard output."""
    if title:
        print(f"\n=== BOUND-VS-GAP TABLE: {title} ===")
    print(generate_bound_vs_gap_table(facts, clock_bounds, speed_config))
