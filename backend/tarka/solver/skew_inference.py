"""Clock-Skew and Timestamp Tamper Inference Engine for TARKA.

Hard Forensic Rules:
1. Every per-device/per-clock offset is a first-class solver VARIABLE with a documented
   bounded range (default: [-86400.0s, +86400.0s], i.e., +/- 24 hours).
2. The solver mathematically infers the minimal offset required to reconcile the timeline
   and reports it in human-readable terms:
   "Device B clock must be +13.2 min ahead for this alibi to hold."
3. Implausible offsets exceeding physical hardware drift limits (RTC > 5 min, NTP > 30s)
   are explicitly flagged as possible timestamp tampering or clock rollback.
4. Non-accusatory neutral wording: states physical necessity and anomalies; never asserts guilt.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field
import z3

from tarka.core.models import Fact, AuthType
from tarka.core.travel import TravelSpeedConfig, compute_travel_lower_bound
from tarka.solver.z3_builder import Z3ConstraintBuilder


class TamperRiskLevel(str, Enum):
    NORMAL = "NORMAL"
    ANOMALOUS_DESYNC = "ANOMALOUS_DESYNC"
    IMPLAUSIBLE_CLOCK_OFFSET = "IMPLAUSIBLE_CLOCK_OFFSET"
    IMPLAUSIBLE_TAMPER_FLAG = "IMPLAUSIBLE_CLOCK_OFFSET"  # Backwards compatibility alias

ClockOffsetStatus = TamperRiskLevel


class ClockOffsetInference(BaseModel):
    """Forensic report of the solver-inferred clock offset for a specific clock domain."""
    clock_id: str
    device_id: Optional[str] = None
    clock_type: str = Field(
        description="Clock domain classification: NTP_STRATUM_1, HANDSET_RTC, CCTV_INTERNAL, TESTIMONIAL"
    )
    nominal_bound_seconds: float = Field(
        description="Nominal tolerance specified in stated model (seconds)"
    )
    inferred_offset_seconds: float = Field(
        description="Signed offset in seconds required to reconcile the timeline"
    )
    inferred_offset_minutes: float = Field(
        description="Signed offset in minutes required to reconcile the timeline"
    )
    is_within_nominal_bounds: bool
    is_implausible_tamper_suspect: bool = Field(
        description="True if offset exceeds physical hardware drift boundaries, indicating possible timestamp tampering"
    )
    tamper_risk_level: TamperRiskLevel
    formatted_narrative: str
    forensic_assessment: str
    affected_fact_ids: List[str]


class ClockSkewInferenceReport(BaseModel):
    """Overall solver clock-skew and tamper inference report for the case."""
    is_case_reconciled: bool
    total_clocks_evaluated: int
    max_search_bound_seconds: float = Field(
        default=86400.0,
        description="Documented solver variable search bound: [-86400s, +86400s] (+/- 24 hours)"
    )
    inferred_offsets: List[ClockOffsetInference]
    tamper_alerts: List[str]
    forensic_summary: str


def _classify_clock_type(clock_id: str) -> Tuple[str, float, float]:
    """Returns (clock_type, nominal_drift_limit_sec, max_plausible_limit_sec)."""
    c_lower = clock_id.lower()
    if any(k in c_lower for k in ("ntp", "telco", "npci", "core", "switch", "server")):
        return "NTP_STRATUM_1", 10.0, 30.0
    if any(k in c_lower for k in ("cctv", "dvr", "cam")):
        return "CCTV_INTERNAL", 180.0, 600.0
    if any(k in c_lower for k in ("handset", "phone", "app", "rtc", "device")):
        return "HANDSET_RTC", 120.0, 300.0  # 2 min nominal, 5 min max plausible
    if any(k in c_lower for k in ("claim", "witness", "statement", "subjective")):
        return "TESTIMONIAL", 300.0, 1800.0  # 5 min nominal, 30 min max plausible
    return "HANDSET_RTC", 120.0, 300.0


def infer_required_clock_offsets(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
    mus_cores: Optional[List[List[str]]] = None,
    max_search_bound_seconds: float = 86400.0,
) -> ClockSkewInferenceReport:
    """Uses Z3 Optimize to infer the minimal per-device/per-clock offsets required to reconcile the timeline."""
    cfg = speed_config or TravelSpeedConfig()
    fact_map: Dict[str, Fact] = {f.id: f for f in facts}

    # Collect participating clock domains
    participating_clocks: Set[str] = set()
    for f in facts:
        participating_clocks.add(f.clock_id)

    if not mus_cores or len(mus_cores) == 0:
        # Consistent case: no offsets required
        offsets = []
        for c_id in sorted(participating_clocks):
            c_type, nom_lim, _ = _classify_clock_type(c_id)
            nom_bound = clock_bounds.get(c_id, nom_lim)
            f_ids = [f.id for f in facts if f.clock_id == c_id]
            dev_id = next((f.device_id for f in facts if f.clock_id == c_id and f.device_id), None)
            dev_str = f"Device {dev_id} ({c_id})" if dev_id else f"Clock {c_id}"

            offsets.append(
                ClockOffsetInference(
                    clock_id=c_id,
                    device_id=dev_id,
                    clock_type=c_type,
                    nominal_bound_seconds=nom_bound,
                    inferred_offset_seconds=0.0,
                    inferred_offset_minutes=0.0,
                    is_within_nominal_bounds=True,
                    is_implausible_tamper_suspect=False,
                    tamper_risk_level=TamperRiskLevel.NORMAL,
                    formatted_narrative=f"{dev_str} timeline is consistent under nominal bounds (+0.0 min).",
                    forensic_assessment="Clock operates within nominal bounds; no reconciliation offset required.",
                    affected_fact_ids=f_ids,
                )
            )
        return ClockSkewInferenceReport(
            is_case_reconciled=True,
            total_clocks_evaluated=len(participating_clocks),
            max_search_bound_seconds=max_search_bound_seconds,
            inferred_offsets=offsets,
            tamper_alerts=[],
            forensic_summary="Case timeline is already consistent under stated model; 0.0s clock adjustments required.",
        )

    # Inconsistent case: Formulate Z3 Optimize to find minimal reconciliation offsets
    opt = z3.Optimize()

    # Declare per-clock offset variables bounded by [-max_search_bound, +max_search_bound]
    clock_vars: Dict[str, z3.ArithRef] = {}
    abs_vars: Dict[str, z3.ArithRef] = {}

    for c_id in participating_clocks:
        v = z3.Real(f"offset_{c_id}")
        clock_vars[c_id] = v
        opt.add(v >= -float(max_search_bound_seconds))
        opt.add(v <= float(max_search_bound_seconds))

        # Absolute value for penalty minimization
        a = z3.Real(f"abs_off_{c_id}")
        abs_vars[c_id] = a
        opt.add(a >= v)
        opt.add(a >= -v)

    # Anchor NTP Stratum-1 clock to 0 if present to establish absolute ground truth reference
    ntp_clocks = [c for c in participating_clocks if "ntp" in c.lower() or "telco" in c.lower()]
    if ntp_clocks:
        anchor_c = ntp_clocks[0]
        opt.add(clock_vars[anchor_c] == 0.0)
    else:
        # Anchor the clock of the chronologically earliest fact
        valid_facts = [f for f in facts if not f.raw_payload.get("is_timestamp_missing", False)]
        earliest_f = min(valid_facts or facts, key=lambda f: f.time_window.reported_epoch)
        opt.add(clock_vars[earliest_f.clock_id] == 0.0)

    # Minimize weighted sum of absolute offsets
    total_cost = z3.RealVal(0)
    for c_id, a_var in abs_vars.items():
        c_type, _, _ = _classify_clock_type(c_id)
        w = 100.0 if c_type == "NTP_STRATUM_1" else (10.0 if c_type == "HANDSET_RTC" else 1.0)
        total_cost = total_cost + (z3.RealVal(w) * a_var)
    opt.minimize(total_cost)

    # Add physical transit constraints between all facts participating in conflict cores
    conflict_facts_ids: Set[str] = set()
    for core in mus_cores:
        conflict_facts_ids.update(core)

    conflict_facts = [fact_map[fid] for fid in conflict_facts_ids if fid in fact_map]
    n_cf = len(conflict_facts)

    for i in range(n_cf):
        for j in range(i + 1, n_cf):
            f1, f2 = conflict_facts[i], conflict_facts[j]

            # Track separation: if handset_with_third_party is True, passive and active do not constrain
            if handset_with_third_party and (f1.auth_type != f2.auth_type):
                continue

            if (
                f1.region is None
                or f2.region is None
                or f1.raw_payload.get("is_timestamp_missing", False)
                or f2.raw_payload.get("is_timestamp_missing", False)
            ):
                continue

            travel = compute_travel_lower_bound(f1.region, f2.region, config=cfg)
            min_req = travel.min_travel_seconds
            if min_req <= 0:
                continue

            # Effective event times with inferred offsets
            t1_eff = f1.time_window.reported_epoch + clock_vars[f1.clock_id]
            t2_eff = f2.time_window.reported_epoch + clock_vars[f2.clock_id]

            # Physical non-teleportation constraint
            opt.add(
                z3.Or(
                    (t2_eff - t1_eff) >= float(min_req),
                    (t1_eff - t2_eff) >= float(min_req),
                )
            )

    is_reconciled = opt.check() == z3.sat
    inferred_list: List[ClockOffsetInference] = []
    tamper_alerts: List[str] = []

    if is_reconciled:
        model = opt.model()

        for c_id in sorted(participating_clocks):
            c_type, nom_lim, max_plausible = _classify_clock_type(c_id)
            nom_bound = clock_bounds.get(c_id, nom_lim)
            f_ids = [f.id for f in facts if f.clock_id == c_id]
            dev_id = next((f.device_id for f in facts if f.clock_id == c_id and f.device_id), None)
            dev_str = f"Device {dev_id} ({c_id})" if dev_id else f"Clock {c_id}"

            val_sec = 0.0
            if c_id in clock_vars and model.eval(clock_vars[c_id]) is not None:
                val_eval = model.eval(clock_vars[c_id])
                try:
                    val_sec = float(val_eval.as_fraction())
                except AttributeError:
                    val_sec = float(val_eval.as_decimal(4))

            val_min = round(val_sec / 60.0, 1)
            is_within_nom = abs(val_sec) <= nom_bound
            is_implausible = abs(val_sec) > max_plausible

            if is_implausible:
                risk = TamperRiskLevel.IMPLAUSIBLE_CLOCK_OFFSET
                narrative = (
                    f"{dev_str} clock must be {val_min:+.1f} min ahead for this alibi to hold."
                )
                assessment = (
                    f"Implausible clock offset ({val_min:+.1f} min exceeds maximum plausible physical drift limit of "
                    f"{max_plausible/60.0:.1f} min for {c_type}). Requires unusual clock desynchronization or possible timestamp tampering under the stated model."
                )
                tamper_alerts.append(
                    f"FLAGGED: Implausible clock offset on {dev_str} ({val_min:+.1f} min). "
                    f"Exceeds physical {c_type} tolerance by {abs(val_sec)/nom_bound:.1f}x."
                )
            elif not is_within_nom:
                risk = TamperRiskLevel.ANOMALOUS_DESYNC
                narrative = (
                    f"{dev_str} clock must be {val_min:+.1f} min ahead for this alibi to hold."
                )
                assessment = (
                    f"Anomalous clock desynchronization ({val_min:+.1f} min exceeds nominal bound of {nom_bound:.1f}s, "
                    f"but remains within maximum hardware drift envelope)."
                )
            else:
                risk = TamperRiskLevel.NORMAL
                narrative = (
                    f"{dev_str} operates within nominal bounds ({val_min:+.1f} min required offset)."
                )
                assessment = "Offset is within normal clock synchronization tolerances."

            inferred_list.append(
                ClockOffsetInference(
                    clock_id=c_id,
                    device_id=dev_id,
                    clock_type=c_type,
                    nominal_bound_seconds=nom_bound,
                    inferred_offset_seconds=round(val_sec, 2),
                    inferred_offset_minutes=val_min,
                    is_within_nominal_bounds=is_within_nom,
                    is_implausible_tamper_suspect=is_implausible,
                    tamper_risk_level=risk,
                    formatted_narrative=narrative,
                    forensic_assessment=assessment,
                    affected_fact_ids=f_ids,
                )
            )

    # Sort so most anomalous/tamper-flagged clocks appear first
    inferred_list.sort(key=lambda x: (not x.is_implausible_tamper_suspect, not (x.tamper_risk_level == TamperRiskLevel.ANOMALOUS_DESYNC), -abs(x.inferred_offset_seconds)))

    summary = (
        f"Inferred {len(inferred_list)} clock offset(s) across stated domains. "
        f"{len(tamper_alerts)} implausible clock offset(s) flagged under the stated model."
    )

    return ClockSkewInferenceReport(
        is_case_reconciled=is_reconciled,
        total_clocks_evaluated=len(participating_clocks),
        max_search_bound_seconds=max_search_bound_seconds,
        inferred_offsets=inferred_list,
        tamper_alerts=tamper_alerts,
        forensic_summary=summary,
    )
