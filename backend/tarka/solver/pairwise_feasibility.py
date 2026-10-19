"""Pure-Python pairwise spatio-temporal feasibility checker (Zero Z3 solver dependency).

Computes exact physical feasibility for any pair of facts using interval arithmetic:
1. Calculates maximum available time interval accounting for instrument windows and clock skews.
2. If both facts share the same clock domain, clock skew cancels out (s2 - s1 == 0).
3. If facts reside in different clock domains, skew buffer is Delta_1 + Delta_2.
4. Accounts for track separation (passive vs active) and entity bindings.
5. Compares available transit time against multi-modal travel lower bounds.
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple
from tarka.core.models import Fact
from tarka.core.travel import TravelSpeedConfig, compute_travel_lower_bound
from tarka.core.entity_resolution import EntityResolver


def check_pairwise_feasibility_pure_python(
    f1: Fact,
    f2: Fact,
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
    resolver: Optional[EntityResolver] = None,
) -> Tuple[bool, float, float]:
    """Pure-Python evaluation of pairwise spatio-temporal consistency without Z3.

    Returns:
        (is_feasible, max_available_seconds, min_required_seconds)
    """
    cfg = speed_config or TravelSpeedConfig()
    res = resolver or EntityResolver()

    # 1. Track Separation check
    if handset_with_third_party and (f1.auth_type != f2.auth_type):
        return True, float("inf"), 0.0

    # 2. Entity co-location check
    resolution = res.resolve_facts([f1, f2])
    e1 = resolution.fact_to_entity.get(f1.id)
    e2 = resolution.fact_to_entity.get(f2.id)
    if e1 != e2 and f1.device_id != f2.device_id:
        return True, float("inf"), 0.0

    # 3. If either fact lacks spatial coordinates or has missing timestamp, spatial travel constraints cannot apply
    if (
        f1.region is None
        or f2.region is None
        or f1.raw_payload.get("is_timestamp_missing", False)
        or f2.raw_payload.get("is_timestamp_missing", False)
    ):
        return True, float("inf"), 0.0

    # 4. Travel lower bound
    travel = compute_travel_lower_bound(f1.region, f2.region, config=cfg)
    t_req = travel.min_travel_seconds

    # 4. Maximum available time under bounded intervals and clock skew
    # Order chronologically
    early, late = (f1, f2) if f1.time_window.reported_epoch <= f2.time_window.reported_epoch else (f2, f1)

    t_early_min = early.time_window.start_epoch
    t_late_max = late.time_window.end_epoch
    nominal_span = t_late_max - t_early_min

    # Clock skew buffer
    if early.clock_id == late.clock_id:
        # Crucial forensic principle: on the same clock domain, skew cancels identically
        skew_buffer = 0.0
    else:
        skew_early = clock_bounds.get(early.clock_id, 300.0)
        skew_late = clock_bounds.get(late.clock_id, 300.0)
        skew_buffer = skew_early + skew_late

    max_available = nominal_span + skew_buffer

    # Feasibility condition
    is_feasible = max_available >= t_req
    return is_feasible, max_available, t_req
