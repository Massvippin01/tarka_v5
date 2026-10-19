"""Hypothesis Engine: "What Must Be False?" & Weighted MaxSMT Minimal Corrections.

Computes mathematically minimal correction sets (MCS) of soft facts to restore consistency,
ranked by explicit reliability cost models (carrier CDR, bank log, device log, user claim).
Computes leave-one-out sensitivity for every fact in conflict cores.

Rules:
1. No probabilities or Bayesian likelihoods; strictly ranked minimal corrections with explicit cost model.
2. Every hypothesis statement follows the canonical form:
   "To restore consistency, ONE of these must be wrong: ..."
3. 100% verified against Z3 satisfiability.
"""

from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field
import z3

from tarka.core.models import Fact, FactKind, TrustTier, AuthType
from tarka.core.travel import TravelSpeedConfig
from tarka.core.display import build_fact_display_model
from tarka.solver.marco_mus import enumerate_all_mus
from tarka.solver.z3_builder import Z3ConstraintBuilder


class ReliabilitySourceType(str, Enum):
    CARRIER_CDR = "carrier_cdr"
    BANK_LOG = "bank_log"
    DEVICE_LOG = "device_log"
    USER_SUPPLIED = "user_supplied"


DEFAULT_SOURCE_WEIGHTS: Dict[str, int] = {
    ReliabilitySourceType.CARRIER_CDR.value: 100,
    ReliabilitySourceType.BANK_LOG.value: 100,
    ReliabilitySourceType.DEVICE_LOG.value: 40,
    ReliabilitySourceType.USER_SUPPLIED.value: 10,
}


def classify_fact_source(fact: Fact) -> Tuple[ReliabilitySourceType, int]:
    """Classifies a fact into a forensic reliability category with its default cost weight."""
    kind_str = fact.kind.value if hasattr(fact.kind, "value") else str(fact.kind)

    if any(k in kind_str for k in ("CDR", "TELCO", "CELL")):
        st = ReliabilitySourceType.CARRIER_CDR
    elif any(k in kind_str for k in ("UPI", "BANK", "ATM", "FINANCIAL")):
        st = ReliabilitySourceType.BANK_LOG
    elif any(k in kind_str for k in ("CHAT", "WA", "EXIF", "DEVICE", "FILE")):
        st = ReliabilitySourceType.DEVICE_LOG
    elif any(k in kind_str for k in ("CLAIM", "STATEMENT", "TESTIMONY", "WITNESS")):
        st = ReliabilitySourceType.USER_SUPPLIED
    else:
        # Fall back to trust tier
        tier_str = fact.tier.value if hasattr(fact.tier, "value") else str(fact.tier)
        if tier_str == "T1":
            st = ReliabilitySourceType.CARRIER_CDR
        elif tier_str == "T2":
            st = ReliabilitySourceType.DEVICE_LOG
        else:
            st = ReliabilitySourceType.USER_SUPPLIED

    return st, DEFAULT_SOURCE_WEIGHTS[st.value]


class FactReference(BaseModel):
    id: str
    kind: str
    tier: str
    source_type: str
    weight: int
    source_file: str
    line_ref: str
    sha256_prefix: str
    reported_time_iso: str
    has_location: bool
    summary: str
    display_title: Optional[str] = None
    display_time: Optional[str] = None
    display_place: Optional[str] = None
    display_source: Optional[str] = None



class HypothesisItem(BaseModel):
    rank: int
    hypothesis_type: str = Field(
        default="MINIMAL_CORRECTION_SET",
        description="Type: MINIMAL_CORRECTION_SET | TRACK_DECOUPLING",
    )
    statement: str = Field(
        description="Formal hypothesis statement: 'To restore consistency, ONE of these must be wrong: ...'"
    )
    display_statement: Optional[str] = Field(
        default=None,
        description="Human-readable plain language statement with event titles and source labels",
    )
    cost: int = Field(description="Total penalty cost according to the reliability cost model")
    cost_breakdown: Dict[str, int] = Field(description="Penalty points grouped by source category")
    cost_model: Dict[str, int] = Field(description="The source reliability weight model applied")
    conflicting_facts: List[FactReference] = Field(
        description="Facts excluded under this hypothesis to restore consistency"
    )
    supporting_facts: List[FactReference] = Field(
        description="Facts preserved in the affected conflict cores"
    )
    cores_resolved: List[int] = Field(description="0-indexed conflict cores eliminated by this hypothesis")
    is_verified_sat: bool = Field(description="Z3 independent mathematical SAT verification")


class LeaveOneOutFactSensitivity(BaseModel):
    fact_id: str
    flips_verdict: bool = Field(
        description="True if removing this single fact alone completely eliminates all conflict cores (verdict becomes CONSISTENT)"
    )
    remaining_cores_count: int = Field(
        description="Number of conflict cores that persist if this fact is removed"
    )
    cores_participating: List[int] = Field(description="Indices of conflict cores containing this fact")
    kind: str
    tier: str
    source_type: str
    weight: int
    source_file: str
    line_ref: str
    sha256_prefix: str
    display_title: Optional[str] = None
    display_time: Optional[str] = None
    display_place: Optional[str] = None
    display_source: Optional[str] = None


class HypothesisEngineReport(BaseModel):
    is_consistent: bool
    total_cores_found: int
    cost_model: Dict[str, int]
    hypotheses: List[HypothesisItem] = Field(description="Ranked minimal correction sets from MaxSMT")
    track_decoupling_hypothesis: Optional[HypothesisItem] = Field(
        default=None,
        description="Dual-track decoupling hypothesis ('device present, person not' due to relay, SIM swap, or remote access)",
    )
    leave_one_out_sensitivity: List[LeaveOneOutFactSensitivity]


def _build_fact_ref(fact: Fact, source_type: str, weight: int) -> FactReference:
    import datetime
    dt_str = datetime.datetime.fromtimestamp(
        fact.time_window.reported_epoch, tz=datetime.timezone.utc
    ).strftime("%Y-%m-%d %H:%M:%S UTC")

    loc_str = (
        f"({fact.region.latitude:.4f}, {fact.region.longitude:.4f})"
        if fact.region
        else "Unlocated"
    )
    summary = f"{fact.kind.value if hasattr(fact.kind, 'value') else fact.kind} @ {loc_str} ({dt_str})"
    disp = build_fact_display_model(fact)

    return FactReference(
        id=fact.id,
        kind=fact.kind.value if hasattr(fact.kind, "value") else str(fact.kind),
        tier=fact.tier.value if hasattr(fact.tier, "value") else str(fact.tier),
        source_type=source_type,
        weight=weight,
        source_file=fact.source_file,
        line_ref=fact.line_ref,
        sha256_prefix=fact.sha256[:12] if fact.sha256 else "000000000000",
        reported_time_iso=dt_str,
        has_location=fact.region is not None,
        summary=summary,
        display_title=disp.title,
        display_time=disp.time_display,
        display_place=disp.place_name,
        display_source=disp.source_label,
    )


def compute_hypothesis_report(
    facts: List[Fact],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
    mus_cores: Optional[List[List[str]]] = None,
    custom_weights: Optional[Dict[str, int]] = None,
    max_hypotheses: int = 5,
) -> HypothesisEngineReport:
    """Computes ranked Minimal Correction Sets (hypotheses) and leave-one-out sensitivity."""
    cost_model = dict(DEFAULT_SOURCE_WEIGHTS)
    if custom_weights:
        cost_model.update(custom_weights)

    # 1. Enumerate conflict cores if not already provided
    if mus_cores is None:
        mus_res = enumerate_all_mus(
            facts=facts,
            clock_bounds=clock_bounds,
            speed_config=speed_config,
            handset_with_third_party=handset_with_third_party,
        )
        mus_cores = mus_res.mus_fact_ids

    total_cores = len(mus_cores)
    if total_cores == 0:
        return HypothesisEngineReport(
            is_consistent=True,
            total_cores_found=0,
            cost_model=cost_model,
            hypotheses=[],
            leave_one_out_sensitivity=[],
        )

    fact_map: Dict[str, Fact] = {f.id: f for f in facts}
    fact_sources: Dict[str, Tuple[str, int]] = {}
    for f in facts:
        st, _ = classify_fact_source(f)
        w = cost_model.get(st.value, DEFAULT_SOURCE_WEIGHTS.get(st.value, 10))
        fact_sources[f.id] = (st.value, w)

    # Core participation mapping
    core_membership: Dict[str, List[int]] = {f.id: [] for f in facts}
    for c_idx, core in enumerate(mus_cores):
        for fid in core:
            if fid in core_membership:
                core_membership[fid].append(c_idx)

    # 2. Leave-One-Out Sensitivity Analysis
    builder = Z3ConstraintBuilder(speed_config=speed_config)
    loo_sensitivity: List[LeaveOneOutFactSensitivity] = []

    # Check only facts that appear in at least one conflict core
    conflict_facts = [f for f in facts if core_membership[f.id]]

    for target_fact in conflict_facts:
        reduced_facts = [f for f in facts if f.id != target_fact.id]
        if not reduced_facts:
            continue

        # Count remaining cores that do not contain target_fact
        remaining_cores = [
            c_idx for c_idx, core in enumerate(mus_cores) if target_fact.id not in core
        ]
        remaining_count = len(remaining_cores)

        # Mathematical SAT check on reduced set
        solver, lmap, _ = builder.build_solver(reduced_facts, clock_bounds)
        assumps = builder.get_assumptions_for_facts(
            reduced_facts, lmap, handset_with_third_party=handset_with_third_party
        )
        is_sat = solver.check(assumps) == z3.sat

        st_val, w_val = fact_sources[target_fact.id]
        disp_loo = build_fact_display_model(target_fact)
        loo_sensitivity.append(
            LeaveOneOutFactSensitivity(
                fact_id=target_fact.id,
                flips_verdict=is_sat,
                remaining_cores_count=remaining_count,
                cores_participating=core_membership[target_fact.id],
                kind=target_fact.kind.value if hasattr(target_fact.kind, "value") else str(target_fact.kind),
                tier=target_fact.tier.value if hasattr(target_fact.tier, "value") else str(target_fact.tier),
                source_type=st_val,
                weight=w_val,
                source_file=target_fact.source_file,
                line_ref=target_fact.line_ref,
                sha256_prefix=target_fact.sha256[:12] if target_fact.sha256 else "000000000000",
                display_title=disp_loo.title,
                display_time=disp_loo.time_display,
                display_place=disp_loo.place_name,
                display_source=disp_loo.source_label,
            )
        )

    # Sort LOO sensitivity: facts that flip verdict first, then by remaining cores ascending
    loo_sensitivity.sort(key=lambda s: (not s.flips_verdict, s.remaining_cores_count, -s.weight))

    # 3. Weighted MaxSMT Minimal Correction Sets (MCS)
    # Formulate hitting set optimization problem over mus_cores with soft weights
    opt = z3.Optimize()
    drop_vars: Dict[str, z3.BoolRef] = {fid: z3.Bool(f"drop_{fid}") for fid in fact_map}

    # Hard hitting constraint: at least one fact from each core must be dropped
    for c_idx, core in enumerate(mus_cores):
        opt.add(z3.Or([drop_vars[fid] for fid in core if fid in drop_vars]))

    # Cost expression to minimize
    cost_expr = z3.IntVal(0)
    for fid, (st_val, w_val) in fact_sources.items():
        cost_expr = cost_expr + z3.If(drop_vars[fid], z3.IntVal(w_val), z3.IntVal(0))
    opt.minimize(cost_expr)

    hypotheses: List[HypothesisItem] = []

    for rank_idx in range(1, max_hypotheses + 1):
        if opt.check() != z3.sat:
            break

        model = opt.model()
        dropped_ids = [fid for fid in fact_map if z3.is_true(model.eval(drop_vars[fid]))]
        if not dropped_ids:
            break

        # Verification: check if remaining facts are satisfiable
        remaining_facts = [f for f in facts if f.id not in dropped_ids]
        s_verify, lm_v, _ = builder.build_solver(remaining_facts, clock_bounds)
        assumps_v = builder.get_assumptions_for_facts(
            remaining_facts, lm_v, handset_with_third_party=handset_with_third_party
        )
        is_sat_verified = s_verify.check(assumps_v) == z3.sat

        # Cost breakdown
        breakdown: Dict[str, int] = {}
        total_cost = 0
        for fid in dropped_ids:
            st_val, w_val = fact_sources[fid]
            breakdown[st_val] = breakdown.get(st_val, 0) + w_val
            total_cost += w_val

        # Supporting facts in affected conflict cores
        affected_cores: Set[int] = set()
        for fid in dropped_ids:
            affected_cores.update(core_membership.get(fid, []))

        supporting_ids: Set[str] = set()
        for c_idx in affected_cores:
            for fid in mus_cores[c_idx]:
                if fid not in dropped_ids:
                    supporting_ids.add(fid)

        conflicting_refs = [_build_fact_ref(fact_map[fid], fact_sources[fid][0], fact_sources[fid][1]) for fid in dropped_ids]
        supporting_refs = [_build_fact_ref(fact_map[fid], fact_sources[fid][0], fact_sources[fid][1]) for fid in sorted(supporting_ids)]

        # Format statement strictly per prompt specification:
        # "To restore consistency, ONE of these must be wrong: ..."
        dropped_descriptions = [
            f"{ref.id} ({ref.kind}, {ref.source_type}, cost {ref.weight})"
            for ref in conflicting_refs
        ]
        statement = f"To restore consistency, ONE of these must be wrong: {', '.join(dropped_descriptions)}."

        disp_dropped = [
            f"{ref.display_title or ref.id} ({ref.display_source or ref.source_type})"
            for ref in conflicting_refs
        ]
        display_statement = f"To restore consistency, ONE of these events cannot be reconciled: {', '.join(disp_dropped)}."

        hypotheses.append(
            HypothesisItem(
                rank=rank_idx,
                statement=statement,
                display_statement=display_statement,
                cost=total_cost,
                cost_breakdown=breakdown,
                cost_model=cost_model,
                conflicting_facts=conflicting_refs,
                supporting_facts=supporting_refs,
                cores_resolved=sorted(affected_cores),
                is_verified_sat=is_sat_verified,
            )
        )

        # Block this exact minimal correction set from recurring
        # In any subsequent MCS, at least one of the dropped facts must NOT be dropped
        opt.add(z3.Or([z3.Not(drop_vars[fid]) for fid in dropped_ids]))

    # 4. Dual-Track Decoupling Hypothesis ("device present, person not (relay, SIM swap, remote access)")
    # If any conflict core mixes PASSIVE presence facts and ACTIVE authentication facts,
    # evaluate which cores are dissolved when handset custody is decoupled from the owner.
    track_decoupling_hypo: Optional[HypothesisItem] = None
    cores_with_both_tracks: List[int] = []
    for c_idx, core in enumerate(mus_cores):
        has_passive = any(fid in fact_map and fact_map[fid].auth_type == AuthType.PASSIVE for fid in core)
        has_active = any(fid in fact_map and fact_map[fid].auth_type == AuthType.ACTIVE for fid in core)
        if has_passive and has_active:
            cores_with_both_tracks.append(c_idx)

    if cores_with_both_tracks and not handset_with_third_party:
        # Check if the specific cores mixing passive and active become SAT when decoupled
        sub_facts = [fact_map[fid] for c_idx in cores_with_both_tracks for fid in mus_cores[c_idx] if fid in fact_map]
        s_target, lm_t, _ = builder.build_solver(sub_facts, clock_bounds)
        assumps_t = builder.get_assumptions_for_facts(sub_facts, lm_t, handset_with_third_party=True)
        is_sub_sat = s_target.check(assumps_t) == z3.sat

        # Collect affected passive and active facts
        p_fids = {fid for c_idx in cores_with_both_tracks for fid in mus_cores[c_idx] if fact_map[fid].auth_type == AuthType.PASSIVE}
        a_fids = {fid for c_idx in cores_with_both_tracks for fid in mus_cores[c_idx] if fact_map[fid].auth_type == AuthType.ACTIVE}

        passive_refs = [_build_fact_ref(fact_map[fid], fact_sources[fid][0], fact_sources[fid][1]) for fid in sorted(p_fids)]
        active_refs = [_build_fact_ref(fact_map[fid], fact_sources[fid][0], fact_sources[fid][1]) for fid in sorted(a_fids)]

        decouple_statement = (
            "To restore consistency, ONE of these must be wrong: Handset co-location assumption "
            "('device present, person not' due to relay, SIM swap, physical theft, or remote access)."
        )
        track_decoupling_hypo = HypothesisItem(
            rank=0,
            hypothesis_type="TRACK_DECOUPLING",
            statement=decouple_statement,
            display_statement=(
                "To restore consistency, ONE of these assumptions cannot be reconciled: "
                "The person and the phone were in different locations (e.g., someone else used the phone, SIM swap, or remote relay)."
            ),
            cost=50,
            cost_breakdown={"track_decoupling_hypothesis": 50},
            cost_model=cost_model,
            conflicting_facts=passive_refs,
            supporting_facts=active_refs,
            cores_resolved=cores_with_both_tracks,
            is_verified_sat=is_sub_sat,
        )

    return HypothesisEngineReport(
        is_consistent=False,
        total_cores_found=total_cores,
        cost_model=cost_model,
        hypotheses=hypotheses,
        track_decoupling_hypothesis=track_decoupling_hypo,
        leave_one_out_sensitivity=loo_sensitivity,
    )

