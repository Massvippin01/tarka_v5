"""Fraud networks from a case's derived money flows.

Entity resolution → mule score → victims (who paid a suspected mule) → networks grown around mules
(hubs never join two networks) → hop distance from victims, plus probable matches and cross-case hits.
Parties with no link to a suspected mule are counted, not listed.

Bounded memory: per-party totals and the mule filter run as SQL inside the case's SQLite file; Python only
holds suspected mules and their direct counterparties. Results are cached until the case's rows change.

shortcut: mule-seeded components stand in for community detection; add Louvain (networkx) if gangs
that share ordinary-looking intermediaries start merging. Weights/thresholds are tuned on synthetic
data only (backend/tools/validate_mule_scoring.py); recalibrate on labelled real cases.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import sqlite3
from collections import defaultdict, deque
from contextlib import closing
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, Set, Tuple

from app.services.ingestion.account_verdicts import (
    DEFAULT_FEATURE_WEIGHTS,
    FEATURE_NAMES,
    VerdictStore,
    pair_key,
)
from app.services.ingestion.derived_store import DerivedStore, extract_identifiers
from app.services.ingestion.identifier_index import IdentifierIndex
from app.services.ingestion.device_store import DEVICE_KINDS, device_clusters_from_db

CASH_OUT_RE = re.compile(r"\b(atm|cash|withdraw\w*|crypto|usdt|binance|wazirx|gold|pos)\b", re.I)
BURST_SECONDS = 72 * 3600  # sliding 72h burst window
FANOUT_WINDOW_SECONDS = 20 * 60  # rapid fan-out to many accounts within minutes (20 min)
FREEZE_HALF_LIFE_HOURS = 24.0  # likelihood of funds remaining halves every 24h after last outflow
PASS_THROUGH = 0.8
HIGH_VALUE_INR = 25_000
HUB_DEGREE = 50  # parties with this many counterparties are treated as hubs (merchants, payroll, ATMs)
MULE_THRESHOLD = 0.7
MAX_MEMBERS_SHOWN = 200
ANALYSIS_VERSION = "8"

_STRUCTURING_BANDS = (
    (9_900.0, 9_999.0),
    (48_500.0, 49_999.0),
    (98_000.0, 99_999.0),
    (195_000.0, 199_999.0),
    (490_000.0, 499_999.0),
)

Lookup = Callable[[set], Dict[tuple, List[str]]]  # my identifiers → {(kind, value): [other case ids]}


def inr(amount: float) -> str:
    """Indian digit grouping, as the UI's formatInr: 139450 -> ₹1,39,450."""
    s = str(round(amount))
    head, tail = s[:-3], s[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    return "₹" + ",".join(([head] if head else []) + groups + [tail])


def canonical(label: str) -> str:
    """Certain match: same label ignoring case and surrounding spaces (auto-merged). Mirrors SQL lower(trim())."""
    return label.strip().lower()


def _ids(label: str) -> set:
    return {(k, v) for k, v in extract_identifiers(label) if k in ("phone", "account", "vpa")}


def _kind(label: str) -> str:
    if CASH_OUT_RE.search(label):
        return "cash_out"
    found = extract_identifiers(label)
    return found[0][0] if found else "party"


_PREP = """
CREATE INDEX IF NOT EXISTS f_a ON f(a);
CREATE INDEX IF NOT EXISTS f_b ON f(b);
CREATE TEMP TABLE p AS
  SELECT n, MAX(label) AS label, SUM(inamt) AS ins, SUM(incnt) AS incnt, SUM(outamt) AS outs,
         MIN(fst) AS fst, MAX(lst) AS lst, SUM(sender) AS senders, SUM(receiver) AS receivers
  FROM (SELECT b AS n, lb AS label, amt AS inamt, cnt AS incnt, 0 AS outamt, fst, lst, 1 AS sender, 0 AS receiver FROM f
        UNION ALL
        SELECT a, la, 0, 0, amt, fst, lst, 0, 1 FROM f)
  GROUP BY n;
CREATE UNIQUE INDEX temp.p_n ON p(n);
"""


def _in_structuring_band(amount: float) -> bool:
    return any(lo <= amount <= hi for lo, hi in _STRUCTURING_BANDS)


def _best_72h_window(
    in_events: List[Tuple[float, str, float]],
    out_events: List[Tuple[float, str, float]],
    ins: float,
    incnt: int,
    outs: float,
    fst: float,
    lst: float,
    senders: int,
) -> Dict[str, Any]:
    """Compute sliding 72h burst metrics from raw events (or aggregate fallback if no raw events)."""
    span = max(0.0, lst - fst)
    if span <= BURST_SECONDS or (not in_events and not out_events):
        win_pt = min(ins, outs) / max(ins, outs) if ins > 0 and outs > 0 else 0.0
        avg_in = ins / incnt if incnt else 0.0
        return {
            "win_in": ins,
            "win_out": outs,
            "win_pt": win_pt,
            "win_span": span,
            "win_senders": senders,
            "win_avg_in": avg_in,
            "is_dormant_burst": False,
            "burst_share": 1.0,
        }

    # Merge chronological (ts, direction_is_in, counterparty, amt) and two-pointer slide <= 72h.
    merged: List[Tuple[float, bool, str, float]] = [(ts, True, cp, amt) for ts, cp, amt in in_events] + [
        (ts, False, cp, amt) for ts, cp, amt in out_events
    ]
    merged.sort(key=lambda x: x[0])

    best_score = -1.0
    best_state = None
    left = 0
    w_in = 0.0
    w_out = 0.0
    w_in_cnt = 0
    w_senders: Dict[str, int] = defaultdict(int)

    for right, (ts_r, is_in, cp, amt) in enumerate(merged):
        if is_in:
            w_in += amt
            w_in_cnt += 1
            w_senders[cp] += 1
        else:
            w_out += amt
        while merged[left][0] < ts_r - BURST_SECONDS:
            _, is_in_l, cp_l, amt_l = merged[left]
            if is_in_l:
                w_in -= amt_l
                w_in_cnt -= 1
                w_senders[cp_l] -= 1
                if w_senders[cp_l] <= 0:
                    del w_senders[cp_l]
            else:
                w_out -= amt_l
            left += 1
        if w_in > 0 and w_out > 0:
            pt = min(w_in, w_out) / max(w_in, w_out)
            metric = min(w_in, w_out) * pt
            if metric > best_score:
                best_score = metric
                best_state = (w_in, w_out, pt, max(0.0, ts_r - merged[left][0]), len(w_senders), w_in / max(1, w_in_cnt))

    if best_state is None:
        win_pt = min(ins, outs) / max(ins, outs) if ins > 0 and outs > 0 else 0.0
        return {
            "win_in": ins,
            "win_out": outs,
            "win_pt": win_pt,
            "win_span": span,
            "win_senders": senders,
            "win_avg_in": ins / incnt if incnt else 0.0,
            "is_dormant_burst": False,
            "burst_share": 1.0,
            "quiet_gap_s": 0.0,
        }

    wi, wo, wpt, wspan, wsend, wavg = best_state
    total_flow = ins + outs
    burst_share = (wi + wo) / total_flow if total_flow > 0 else 1.0
    # Longest idle gap anywhere in the account's chronological history (detects dormant-then-burst reactivation)
    quiet_gap_s = 0.0
    for idx_m in range(1, len(merged)):
        gap = merged[idx_m][0] - merged[idx_m - 1][0]
        if gap > quiet_gap_s:
            quiet_gap_s = gap
    return {
        "win_in": wi,
        "win_out": wo,
        "win_pt": wpt,
        "win_span": wspan,
        "win_senders": wsend,
        "win_avg_in": wavg,
        "is_dormant_burst": span > BURST_SECONDS and wpt >= PASS_THROUGH,
        "burst_share": burst_share,
        "quiet_gap_s": quiet_gap_s,
    }


def _compute_account_features(
    row: tuple,
    in_events: Optional[List[Tuple[float, str, float]]] = None,
    out_events: Optional[List[Tuple[float, str, float]]] = None,
    device_shared: bool = False,
    device_corroborated: bool = False,
) -> Tuple[Dict[str, float], List[str], Dict[str, Any]]:
    """Extract normalized [0, 1] explainable features and human-readable reasons for one party."""
    n, label, ins, incnt, outs, fst, lst, senders, receivers = row
    in_ev = in_events or []
    out_ev = out_events or []
    win = _best_72h_window(in_ev, out_ev, ins, incnt, outs, fst, lst, senders)

    features: Dict[str, float] = {f: 0.0 for f in FEATURE_NAMES}
    why: List[str] = []

    if ins > 0 and outs > 0:
        pt = win["win_pt"]
        if pt >= PASS_THROUGH:
            features["passthrough"] = 1.0
        why.append(f"passes on {pt:.0%} of what it receives" + (" in its busiest 72 h" if win["is_dormant_burst"] else ""))

        span = lst - fst
        if span <= BURST_SECONDS and min(ins, outs) / max(ins, outs) >= PASS_THROUGH:
            features["burst_72h"] = 1.0
            why.append(f"all its activity happened within {span / 3600:.1f} h")

    avg_credit = win["win_avg_in"] if win["is_dormant_burst"] else (ins / incnt if incnt else 0.0)
    if avg_credit >= HIGH_VALUE_INR:
        features["high_value"] = 1.0
        why.append(f"average credit {inr(avg_credit)}")

    active_senders = win["win_senders"] if win["is_dormant_burst"] else senders
    if active_senders >= 2:
        features["multi_sender"] = 1.0
        why.append(f"{senders} senders, {receivers} receivers")

    # Structuring & layering signals over timed outflows: transfers clustered tightly in time below limits
    timed_band_hits = sorted((ts, amt) for ts, _, amt in out_ev if amt > 0 and _in_structuring_band(amt))
    band_hits = [amt for _, amt in timed_band_hits]
    high_band_hits = [(ts, a) for ts, a in timed_band_hits if a >= 48_500.0]
    clustered_3_in_48h = any(
        timed_band_hits[k + 2][0] - timed_band_hits[k][0] <= 48 * 3600
        for k in range(len(timed_band_hits) - 2)
    )
    clustered_2_high_in_24h = any(
        high_band_hits[k + 1][0] - high_band_hits[k][0] <= 24 * 3600
        for k in range(len(high_band_hits) - 1)
    )
    clustered_band = clustered_3_in_48h or clustered_2_high_in_24h
    if clustered_band:
        features["below_limit_structuring"] = 1.0
        why.append(
            f"{len(band_hits)} transfers just below reporting thresholds (e.g. {inr(band_hits[0])})"
        )

    # Near-identical splits: >= 2 tranches >= ₹10,000 within 2% (or ₹500) happening within 24h of each other
    sig_timed_outs = sorted((ts, amt) for ts, _, amt in out_ev if amt >= 10_000.0)
    split_count = 0
    split_sample = 0.0
    if len(sig_timed_outs) >= 2:
        by_amt = sorted(sig_timed_outs, key=lambda x: x[1])
        i = 0
        while i < len(by_amt):
            j = i + 1
            while j < len(by_amt) and (by_amt[j][1] - by_amt[i][1]) <= max(500.0, 0.02 * by_amt[i][1]):
                j += 1
            cluster = [t for t, _ in by_amt[i:j]]
            if len(cluster) >= 2 and (max(cluster) - min(cluster)) <= 24 * 3600:
                if len(cluster) > split_count:
                    split_count = len(cluster)
                    split_sample = by_amt[i][1]
            i = j if j > i + 1 else i + 1
    if split_count >= 3 or (
        split_count >= 2
        and (clustered_band or (device_shared and device_corroborated) or (features["burst_72h"] == 1.0 and split_sample >= 25_000.0))
    ):
        features["near_identical_splits"] = 1.0
        why.append(f"split money into {split_count} nearly identical transfers (~{inr(split_sample)} each)")

    # Rapid fan-out: >= 3 distinct recipients paid >= ₹25,000 total within 60 minutes (high-velocity layering)
    if len(out_ev) >= 3:
        sorted_out = sorted(out_ev, key=lambda x: x[0])
        l_idx = 0
        rec_counts: Dict[str, int] = defaultdict(int)
        fan_sum = 0.0
        best_fan = 0
        best_mins = 0
        best_sum = 0.0
        for r_idx, (ts_r, cp_r, amt_r) in enumerate(sorted_out):
            rec_counts[cp_r] += 1
            fan_sum += amt_r
            while sorted_out[l_idx][0] < ts_r - FANOUT_WINDOW_SECONDS:
                _, cp_l, amt_l = sorted_out[l_idx]
                rec_counts[cp_l] -= 1
                fan_sum -= amt_l
                if rec_counts[cp_l] <= 0:
                    del rec_counts[cp_l]
                l_idx += 1
            if len(rec_counts) >= 3 and (len(rec_counts), fan_sum) > (best_fan, best_sum):
                best_fan = len(rec_counts)
                best_sum = fan_sum
                best_mins = max(1, int(round((ts_r - sorted_out[l_idx][0]) / 60)))
        if (best_fan >= 4 and best_sum >= 40_000.0) or (
            best_fan >= 3 and best_sum >= 75_000.0 and (best_sum / best_fan >= 25_000.0 or len(band_hits) >= 2)
        ):
            features["rapid_fan_out"] = 1.0
            why.append(f"forwarded {inr(best_sum)} to {best_fan} accounts within {best_mins} min")

    # Round amounts: >= 2 outflows >= ₹5,000 where >= 75% are exact multiples of ₹1,000
    out_amts = [amt for _, _, amt in out_ev if amt > 0]
    large_outs = [a for a in out_amts if a >= 5_000.0]
    if len(large_outs) >= 2:
        round_cnt = sum(1 for a in large_outs if abs(a % 1000.0) < 1e-6)
        if round_cnt >= 2 and round_cnt / len(large_outs) >= 0.75:
            features["round_amounts"] = 1.0
            why.append(f"{int(round(100 * round_cnt / len(large_outs)))}% of transfers are exact round-thousand amounts")

    if device_shared:
        features["device_shared"] = 1.0
        why.append("shares handset, SIM, or network identifier with other accounts")

    # Dormant-burst detection (sliding 72h window): catch accounts quiet >= 30 days (months) that suddenly burst,
    # or corroborated by structuring / mule-linked device attribution. Protects ordinary monthly salary-then-rent accounts.
    if features["burst_72h"] == 0.0 and win["is_dormant_burst"]:
        quiet_days = win["quiet_gap_s"] / 86400.0
        corroborated = (
            (quiet_days >= 30.0 and win["burst_share"] >= 0.80 and win["win_pt"] >= 0.80)
            or (
                win["burst_share"] >= 0.85
                and (
                    features["below_limit_structuring"] > 0
                    or split_count >= 3
                    or (device_shared and device_corroborated)
                )
            )
        )
        if corroborated:
            features["burst_72h"] = 1.0
            why.append(
                f"dormant account surged in a {win['win_span'] / 3600:.1f} h burst after {quiet_days:.0f} days quiet ({win['burst_share']:.0%} of all funds)"
            )

    meta = {"win_in": win["win_in"], "win_out": win["win_out"], "win_span": win["win_span"]}
    return features, why, meta


def _score(
    row: tuple,
    in_events: Optional[List[Tuple[float, str, float]]] = None,
    out_events: Optional[List[Tuple[float, str, float]]] = None,
    device_shared: bool = False,
    device_corroborated: bool = False,
    weights: Optional[Dict[str, float]] = None,
    intercept: Optional[float] = None,
    mode: str = "default",
) -> Dict[str, Any]:
    n, label, ins, incnt, outs, fst, lst, senders, receivers = row
    money = {"in_inr": round(ins, 2), "out_inr": round(outs, 2), "first_ts": fst, "last_ts": lst}
    if CASH_OUT_RE.search(label) and outs == 0:
        return {
            "id": n,
            "label": label,
            "kind": "cash_out",
            "role": "CASH_OUT",
            "mule_score": 0.0,
            "hop": None,
            "why": "money leaves the banking system here (cash / ATM / crypto)",
            "features": {f: 0.0 for f in FEATURE_NAMES},
            **money,
        }

    features, why, _ = _compute_account_features(
        row,
        in_events=in_events,
        out_events=out_events,
        device_shared=device_shared,
        device_corroborated=device_corroborated,
    )
    w = weights or DEFAULT_FEATURE_WEIGHTS
    if mode == "calibrated" and intercept is not None:
        logit = intercept + sum(float(w.get(f, 0.0)) * features[f] for f in FEATURE_NAMES)
        score = 1.0 / (1.0 + math.exp(-max(-30.0, min(30.0, logit))))
        for f in FEATURE_NAMES:
            wf = float(w.get(f, 0.0))
            if features[f] > 0 and wf < 0:
                why.append(f"{f.replace('_', ' ')} lowers suspicion (calibrated {wf:+.2f})")
        # Guard: device sharing is corroboration only and must never satisfy the mule guard on its own.
        is_mule = score >= 0.50 and (
            features["burst_72h"] > 0
            or (features["passthrough"] > 0 and (features["below_limit_structuring"] > 0 or features["rapid_fan_out"] > 0))
            or features["below_limit_structuring"] > 0
            or features["rapid_fan_out"] > 0
        )
    else:
        score = max(0.0, min(1.0, sum(float(w.get(f, DEFAULT_FEATURE_WEIGHTS[f])) * features[f] for f in FEATURE_NAMES)))
        # Guard: device sharing is corroboration only; legitimate users cannot be flagged merely on passthrough + device_shared.
        is_mule = score >= MULE_THRESHOLD and (
            features["burst_72h"] > 0
            or (features["passthrough"] > 0 and (features["below_limit_structuring"] > 0 or features["rapid_fan_out"] > 0))
        )

    return {
        "id": n,
        "label": label,
        "kind": _kind(label),
        "role": "MULE" if is_mule else "UNKNOWN",
        "mule_score": round(min(score, 1.0), 2),
        "hop": None,
        "why": "; ".join(why) or "no pass-through pattern",
        "features": features,
        **money,
    }


def _trace_time_aware(
    txns: List[Tuple[float, str, str, float]],
    mules: Set[str],
    cash_outs: Set[str],
    victims: Dict[str, float],
    labels: Dict[str, str],
) -> Dict[str, Any]:
    """Chronological forward-only LIBR trace from victims through mules.

    A debit from account u to v occurring BEFORE any victim funds arrived at u cannot transfer
    victim money; clean non-victim credits are exhausted first under LIBR before victim taint moves.
    """
    # At equal timestamps, process victim funding before downstream hops, and cash-out last.
    def _sort_key(item: Tuple[int, Tuple[float, str, str, float]]):
        idx, (ts, a, b, _) = item
        rk = 0 if a in victims else (2 if b in cash_outs else 1)
        return (ts, rk, idx)

    ordered = sorted(enumerate(txns), key=_sort_key)

    clean_bal: Dict[str, float] = defaultdict(float)
    victim_bal: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
    valid_links: Set[Tuple[str, str]] = set()
    tainted_flow: Dict[Tuple[str, str], float] = defaultdict(float)
    last_outflow_ts: Dict[str, float] = {}
    hop: Dict[str, int] = {v: 0 for v in victims}
    cashed_from_taint: Dict[str, float] = defaultdict(float)
    cashed_by_victim: Dict[Tuple[str, str], float] = defaultdict(float)  # (victim, cash_out_acct)
    moved_other_by_victim: Dict[Tuple[str, str], float] = defaultdict(float)

    # Track representative hop-by-hop routes per victim -> terminal step
    # path_pool[u][victim_id] = list of {"hops": [...], "timestamps": [...], "amount": float}
    path_pool: Dict[str, Dict[str, List[Dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))

    for _, (ts, a, b, amt) in ordered:
        if amt <= 0:
            continue
        last_outflow_ts[a] = max(last_outflow_ts.get(a, ts), ts)

        if a in victims and b in mules:
            # Direct victim payment into suspected mule establishes/adds taint at timestamp ts.
            victim_bal[b][a] += amt
            valid_links.add((a, b))
            tainted_flow[(a, b)] += amt
            if b not in hop or hop[b] > 1:
                hop[b] = 1
            path_pool[b][a].append({"hops": [a, b], "timestamps": [ts], "amount": amt})
            continue

        total_taint = sum(victim_bal[a].values())
        if total_taint <= 1e-9:
            # No victim funds held at `a` when this debit fired -> impossible in time for victim taint!
            clean_bal[a] = max(0.0, clean_bal[a] - amt)
            clean_bal[b] += amt
            continue

        # LIBR: clean funds are withdrawn before tainted victim balances.
        clean_used = min(clean_bal[a], amt)
        clean_bal[a] -= clean_used
        clean_bal[b] += clean_used
        rem = amt - clean_used
        if rem <= 1e-9:
            continue

        taint_out = min(total_taint, rem)
        ratio = taint_out / total_taint
        valid_links.add((a, b))
        tainted_flow[(a, b)] += taint_out

        if a in hop and (b not in hop or hop[b] > hop[a] + 1):
            hop[b] = hop[a] + 1

        # Move proportional victim shares forward cleanly
        for vid in list(victim_bal[a].keys()):
            share = victim_bal[a][vid] * ratio
            if share <= 1e-9:
                continue
            victim_bal[a][vid] -= share
            if victim_bal[a][vid] <= 1e-9:
                del victim_bal[a][vid]
            if b in cash_outs:
                cashed_from_taint[a] += share
                cashed_by_victim[(vid, b)] += share
            elif b in mules:
                victim_bal[b][vid] += share
            else:
                moved_other_by_victim[(vid, b)] += share

            # Extend path snippets forward proportionally (bounded to prevent combinatorial blowup)
            new_paths = []
            for p_item in path_pool[a].get(vid, []):
                take = p_item["amount"] * ratio
                p_item["amount"] -= take
                if take > 1.0:
                    new_paths.append({
                        "hops": (p_item["hops"] + [b])[-8:],
                        "timestamps": (p_item["timestamps"] + [ts])[-7:],
                        "amount": take,
                    })
            if new_paths:
                if b in mules:
                    path_pool[b][vid] = (path_pool[b][vid] + new_paths)[-16:]
                elif b in cash_outs or b not in victims:
                    path_pool[b][vid] = (path_pool[b][vid] + new_paths)[-16:]

    # Build per-victim readable traces
    victim_traces: List[Dict[str, Any]] = []
    for vid, paid in sorted(victims.items(), key=lambda kv: -kv[1]):
        paths_out: List[Dict[str, Any]] = []
        held_where: List[Dict[str, Any]] = []
        cashed_where: List[Dict[str, Any]] = []
        moved_where: List[Dict[str, Any]] = []

        for acct, per_v in victim_bal.items():
            rem_amt = round(per_v.get(vid, 0.0), 2)
            if rem_amt > 1.0 and acct in mules:
                held_where.append({"account": acct, "label": labels.get(acct, acct), "amount_inr": rem_amt})
                for p_item in path_pool[acct].get(vid, []):
                    if p_item["amount"] > 1.0:
                        paths_out.append({
                            "hops": p_item["hops"],
                            "hop_labels": [labels.get(h, h) for h in p_item["hops"]],
                            "timestamps": p_item["timestamps"],
                            "amount_inr": round(p_item["amount"], 2),
                            "outcome": "HELD",
                            "terminal_account": acct,
                        })

        for (v_k, acct), c_amt in cashed_by_victim.items():
            if v_k == vid and c_amt > 1.0:
                cashed_where.append({"account": acct, "label": labels.get(acct, acct), "amount_inr": round(c_amt, 2)})
                for p_item in path_pool[acct].get(vid, []):
                    if p_item["amount"] > 1.0:
                        paths_out.append({
                            "hops": p_item["hops"],
                            "hop_labels": [labels.get(h, h) for h in p_item["hops"]],
                            "timestamps": p_item["timestamps"],
                            "amount_inr": round(p_item["amount"], 2),
                            "outcome": "CASHED_OUT",
                            "terminal_account": acct,
                        })

        for (v_k, acct), m_amt in moved_other_by_victim.items():
            if v_k == vid and m_amt > 1.0:
                moved_where.append({"account": acct, "label": labels.get(acct, acct), "amount_inr": round(m_amt, 2)})
                for p_item in path_pool[acct].get(vid, []):
                    if p_item["amount"] > 1.0:
                        paths_out.append({
                            "hops": p_item["hops"],
                            "hop_labels": [labels.get(h, h) for h in p_item["hops"]],
                            "timestamps": p_item["timestamps"],
                            "amount_inr": round(p_item["amount"], 2),
                            "outcome": "MOVED_OTHER",
                            "terminal_account": acct,
                        })

        paths_out.sort(key=lambda x: -x["amount_inr"])
        victim_traces.append({
            "victim_id": vid,
            "victim_label": labels.get(vid, vid),
            "paid_in_inr": round(paid, 2),
            "paths": paths_out[:25],
            "where_now": {
                "held": sorted(held_where, key=lambda x: -x["amount_inr"]),
                "cashed_out": sorted(cashed_where, key=lambda x: -x["amount_inr"]),
                "moved_elsewhere": sorted(moved_where, key=lambda x: -x["amount_inr"]),
            },
        })

    libr_held = {acct: round(sum(per_v.values()), 2) for acct, per_v in victim_bal.items() if acct in mules and sum(per_v.values()) > 0.01}
    return {
        "valid_links": valid_links,
        "tainted_flow": tainted_flow,
        "hop": hop,
        "libr_held": libr_held,
        "cashed_from_taint": cashed_from_taint,
        "last_outflow_ts": last_outflow_ts,
        "victim_traces": victim_traces,
    }


def _controller_groups(
    comp: Set[str],
    mules: Dict[str, Dict[str, Any]],
    members: Dict[str, Dict[str, Any]],
    device_clusters: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Map shared-device clusters onto this network's accounts -> CONTROLLER_GROUP attribution."""
    out: List[Dict[str, Any]] = []
    if not device_clusters:
        return out
    comp_mules = comp & set(mules)
    for idx, cl in enumerate(device_clusters):
        matched = sorted(a for a in cl["accounts"] if a in comp)
        if len(matched) < 2:
            continue
        matched_mules = [a for a in matched if a in comp_mules]
        if not matched_mules:
            continue
        matched_set = set(matched)
        relevant_links = [
            {
                "kind": l["kind"],
                "value": l["value"],
                "accounts": sorted(a for a in l["accounts"] if a in matched_set),
                "events": l["events"],
                "first_ts": l["first_ts"],
                "last_ts": l["last_ts"],
            }
            for l in cl.get("links", [])
            if len([a for a in l["accounts"] if a in matched_set]) >= 2
        ]
        if not relevant_links:
            continue
        hw_links = [l for l in relevant_links if l["kind"] in ("imei", "device_id")]
        dev_cnt = len({(l["kind"], l["value"]) for l in hw_links}) if hw_links else len({(l["kind"], l["value"]) for l in relevant_links})
        strongest = relevant_links[0]["kind"]
        unit = ("phone" if dev_cnt == 1 else "phones") if strongest in ("imei", "device_id") else ("device" if dev_cnt == 1 else "devices")
        acct_cnt = len(matched_mules) if len(matched_mules) >= 2 else len(matched)
        role_word = "mule accounts" if len(matched_mules) >= 2 else "accounts"
        if acct_cnt == 1:
            role_word = role_word[:-1]
        summary = f"These {acct_cnt} {role_word} are operated from {dev_cnt} {unit}"
        ev_rows = [r for r in cl.get("evidence_rows", []) if r.get("account") in matched_set][:25]
        cid = f"CTRL-{cl.get('cluster_id', f'{idx + 1:03d}')}"
        why_parts = [f"share {l['kind'].upper()} {l['value']} ({len(l['accounts'])} accounts)" for l in relevant_links[:4]]
        out.append({
            "controller_id": cid,
            "role": "CONTROLLER_GROUP",
            "accounts": matched,
            "account_count": len(matched),
            "mule_count": len(matched_mules),
            "device_count": dev_cnt,
            "strongest_kind": strongest,
            "devices": relevant_links,
            "evidence_rows": ev_rows,
            "summary": summary,
            "why": f"{summary}: " + "; ".join(why_parts),
        })
    return out


def _detect_subgroups(
    network_id: str,
    comp: Set[str],
    edges: List[Tuple[str, str, float]],
    members: Dict[str, Dict[str, Any]],
    victim_amount: Dict[str, float],
    held: Dict[str, float],
) -> Tuple[List[Dict[str, Any]], Dict[str, str]]:
    """Run Louvain / LPA community detection for giant networks (> MAX_MEMBERS_SHOWN)."""
    import networkx as nx

    G = nx.Graph()
    for n in comp:
        G.add_node(n)
    for a, b, amt in edges:
        if a in comp and b in comp and a != b:
            prev_w = G[a][b]["weight"] if G.has_edge(a, b) else 0.0
            G.add_edge(a, b, weight=prev_w + max(1.0, float(amt)))

    try:
        comms = list(nx.community.louvain_communities(G, weight="weight", seed=42))
    except Exception:
        comms = list(nx.community.asyn_lpa_communities(G, weight="weight", seed=42))

    subgroups: List[Dict[str, Any]] = []
    member_sub: Dict[str, str] = {}
    sorted_comms = sorted(comms, key=lambda c: (-sum(victim_amount.get(x, 0.0) for x in c), -len(c)))
    for i, c in enumerate(sorted_comms):
        sg_id = f"{network_id}-G{i + 1}"
        for x in c:
            member_sub[x] = sg_id
        lead = max(c, key=lambda x: (members[x]["mule_score"], members[x]["in_inr"]))
        subgroups.append({
            "subgroup_id": sg_id,
            "label": members[lead]["label"],
            "member_count": len(c),
            "mule_count": sum(1 for x in c if members[x]["role"] == "MULE"),
            "victim_count": sum(1 for x in c if members[x]["role"] == "VICTIM"),
            "amount_inr": round(sum(victim_amount.get(x, 0.0) for x in c), 2),
            "held_inr": round(sum(held.get(x, 0.0) for x in c), 2),
        })
    return subgroups, member_sub


def _run(
    db: sqlite3.Connection,
    lookup: Optional[Lookup],
    max_members: Optional[int],
    verdicts: Optional[Dict[str, str]] = None,
    raw_table: Optional[str] = None,
    device_clusters: Optional[List[Dict[str, Any]]] = None,
    feature_weights: Optional[Dict[str, float]] = None,
    model_intercept: Optional[float] = None,
    scoring_meta: Optional[Dict[str, Any]] = None,
    raw_events_memory: Optional[List[Tuple[float, str, str, float]]] = None,
) -> Dict[str, Any]:
    """Expects table f(a, b, amt, cnt, fst, lst, la, lb): one row per canonical payer->payee pair, a != b."""
    verdicts = verdicts or {}
    device_clusters = device_clusters or []
    device_accts: Set[str] = {a for cl in device_clusters for a in cl.get("accounts", [])}
    meta_out = scoring_meta or {
        "mode": "default",
        "verdicts_used": 0,
        "label": "default weights (0/30 verdicts)",
    }
    mode = meta_out.get("mode", "default")

    db.executescript(_PREP)
    parties_total, case_latest_ts = db.execute("SELECT COUNT(*), COALESCE(MAX(lst), 0.0) FROM p").fetchone()

    # Stage 1 candidate selection in SQL (keeps non-candidates off Python heap on 1M+ rows)
    cand_set: Set[str] = set()
    for (n,) in db.execute(
        "SELECT n FROM p WHERE ins > 0 AND outs > 0 AND MIN(ins, outs) >= ? * MAX(ins, outs) AND lst - fst <= ?",
        (0.50, BURST_SECONDS),
    ):
        cand_set.add(n)

    cand_in: Dict[str, List[Tuple[float, str, float]]] = defaultdict(list)
    cand_out: Dict[str, List[Tuple[float, str, float]]] = defaultdict(list)
    cand_set |= device_accts
    cand_set |= {k for k, v in verdicts.items() if v == "CONFIRMED_MULE"}

    if raw_table == "txns":
        # One bounded streaming pass over txns collects:
        # 1) events for fast/device/confirmed candidates,
        # 2) daily buckets for dormant-burst check (only accounts with long lifespan and >=45% overall balance ratio),
        # 3) structuring band hits.
        long_totals: Dict[str, float] = {
            n: ins + outs
            for n, ins, outs in db.execute(
                "SELECT n, ins, outs FROM p WHERE ins > 0 AND outs > 0 AND lst - fst > ? AND MIN(ins, outs) >= 0.45 * MAX(ins, outs)",
                (BURST_SECONDS,),
            )
        }
        lc_in: Dict[str, Dict[int, float]] = defaultdict(lambda: defaultdict(float))
        lc_out: Dict[str, Dict[int, float]] = defaultdict(lambda: defaultdict(float))
        band_total: Dict[str, int] = defaultdict(int)
        band_high: Dict[str, int] = defaultdict(int)

        cur = db.execute("SELECT ts, lower(trim(payer)), lower(trim(payee)), amount FROM txns")
        while batch := cur.fetchmany(50_000):
            for ts, a, b, amt in batch:
                if a == b:
                    continue
                if b in cand_set:
                    cand_in[b].append((ts, a, amt))
                if a in cand_set:
                    cand_out[a].append((ts, b, amt))
                day_b = int(ts // 86400)
                if b in long_totals:
                    lc_in[b][day_b] += amt
                if a in long_totals:
                    lc_out[a][day_b] += amt
                if amt >= 9_900.0 and _in_structuring_band(amt):
                    band_total[a] += 1
                    if amt >= 48_500.0:
                        band_high[a] += 1

        extra_cand: Set[str] = {
            a for a, cnt in band_total.items() if cnt >= 3 or band_high.get(a, 0) >= 2
        }
        for n, tot in long_totals.items():
            days = sorted(set(lc_in.get(n, ())) | set(lc_out.get(n, ())))
            if not days:
                continue
            l_idx = 0
            wi = 0.0
            wo = 0.0
            n_in = lc_in.get(n, {})
            n_out = lc_out.get(n, {})
            for r_idx, d_r in enumerate(days):
                wi += n_in.get(d_r, 0.0)
                wo += n_out.get(d_r, 0.0)
                while days[l_idx] < d_r - 3:
                    d_l = days[l_idx]
                    wi -= n_in.get(d_l, 0.0)
                    wo -= n_out.get(d_l, 0.0)
                    l_idx += 1
                if wi > 0 and wo > 0 and min(wi, wo) >= 0.72 * max(wi, wo) and (wi + wo) >= 0.75 * tot:
                    extra_cand.add(n)
                    break
        lc_in.clear()
        lc_out.clear()
        long_totals.clear()

        extra_only = extra_cand - cand_set
        if extra_only:
            cand_set |= extra_only
            db.execute("CREATE TEMP TABLE ex_cand (n TEXT PRIMARY KEY)")
            db.executemany("INSERT OR IGNORE INTO ex_cand VALUES (?)", [(n,) for n in extra_only])
            for ts, a, b, amt in db.execute(
                """
                SELECT ts, lower(trim(payer)) AS a, lower(trim(payee)) AS b, amount
                FROM txns
                WHERE lower(trim(payer)) IN (SELECT n FROM ex_cand)
                   OR lower(trim(payee)) IN (SELECT n FROM ex_cand)
                """
            ):
                if a == b:
                    continue
                if b in extra_only:
                    cand_in[b].append((ts, a, amt))
                if a in extra_only:
                    cand_out[a].append((ts, b, amt))
    else:
        for (n,) in db.execute("SELECT n FROM p WHERE ins > 0 AND outs > 0"):
            cand_set.add(n)
        if cand_set and raw_events_memory is not None:
            for ts, a, b, amt in raw_events_memory:
                if a == b:
                    continue
                if b in cand_set:
                    cand_in[b].append((ts, a, amt))
                if a in cand_set:
                    cand_out[a].append((ts, b, amt))

    mules: Dict[str, Dict[str, Any]] = {}
    held: Dict[str, float] = {}
    features_to_save: Dict[str, Dict[str, float]] = {}
    corroborated_device_accts: Set[str] = set()

    if cand_set:
        db.execute("CREATE TEMP TABLE IF NOT EXISTS cand (n TEXT PRIMARY KEY)")
        db.execute("DELETE FROM cand")
        db.executemany("INSERT OR IGNORE INTO cand VALUES (?)", [(n,) for n in cand_set])
        cand_rows = db.execute("SELECT * FROM p WHERE n IN (SELECT n FROM cand)").fetchall()

        # Pass 1: score purely on financial behavior (device_shared=False)
        pass1_scores: Dict[str, tuple[tuple, Dict[str, Any]]] = {}
        non_device_mules: Set[str] = set()
        for row in cand_rows:
            nid = row[0]
            m = _score(
                row,
                in_events=cand_in.get(nid),
                out_events=cand_out.get(nid),
                device_shared=False,
                device_corroborated=False,
                weights=feature_weights,
                intercept=model_intercept,
                mode=mode,
            )
            pass1_scores[nid] = (row, m)
            if (m["role"] == "MULE" or verdicts.get(nid) == "CONFIRMED_MULE") and verdicts.get(nid) != "NOT_MULE":
                non_device_mules.add(nid)

        # Device corroboration counts ONLY for accounts sharing a device/network identifier with a Pass-1 flagged mule
        for cl in device_clusters:
            cl_accts = cl.get("accounts", [])
            if any(a in non_device_mules for a in cl_accts):
                corroborated_device_accts.update(cl_accts)

        # Pass 2: add device corroboration only for accounts linked to Pass-1 flagged mules
        for nid, (row, m1) in pass1_scores.items():
            if nid in corroborated_device_accts:
                m = _score(
                    row,
                    in_events=cand_in.get(nid),
                    out_events=cand_out.get(nid),
                    device_shared=True,
                    device_corroborated=True,
                    weights=feature_weights,
                    intercept=model_intercept,
                    mode=mode,
                )
            else:
                m = m1
            features_to_save[nid] = m["features"]
            if verdicts.get(nid) == "CONFIRMED_MULE":
                m["role"] = "MULE"
            if m["role"] == "MULE":
                mules[nid] = m
                held[nid] = max(0.0, row[2] - row[4])
                m["held_inr"] = round(held[nid], 2)

    for k in [k for k, v in verdicts.items() if v == "NOT_MULE" and k in mules]:
        mules[k].update(role="UNKNOWN", held_inr=0.0, freeze_value_inr=0.0)
        held.pop(k, None)

    if not mules:
        return {
            "networks": [],
            "review_queue": [],
            "cross_case_hits": [],
            "parties_total": parties_total,
            "parties_outside_networks": parties_total,
            "scoring_meta": meta_out,
            "_features": features_to_save,
        }

    db.execute("CREATE TEMP TABLE m (n TEXT PRIMARY KEY)")
    db.executemany("INSERT INTO m VALUES (?)", [(n,) for n in mules])
    edges = db.execute(
        "SELECT a, b, amt FROM f WHERE a IN (SELECT n FROM m) UNION SELECT a, b, amt FROM f WHERE b IN (SELECT n FROM m)"
    ).fetchall()
    succ, pred = defaultdict(set), defaultdict(set)
    link_amt = {(a, b): amt for a, b, amt in edges}
    for a, b, _ in edges:
        succ[a].add(b)
        pred[b].add(a)
    neighbours = (set(succ) | set(pred)) - set(mules)
    db.execute("CREATE TEMP TABLE nb (n TEXT PRIMARY KEY)")
    db.executemany("INSERT INTO nb VALUES (?)", [(n,) for n in neighbours])
    members: Dict[str, Dict[str, Any]] = dict(mules)
    degree: Dict[str, int] = {}
    for row in db.execute("SELECT * FROM p WHERE n IN (SELECT n FROM nb)"):
        nid_nb = row[0]
        is_corr = nid_nb in corroborated_device_accts
        members[nid_nb] = _score(
            row,
            device_shared=is_corr,
            device_corroborated=is_corr,
            weights=feature_weights,
            intercept=model_intercept,
            mode=mode,
        )
        degree[row[0]] = row[7] + row[8]

    def is_hub(n: str) -> bool:
        return (
            members[n]["role"] == "CASH_OUT"
            or bool(CASH_OUT_RE.search(members[n]["label"]))
            or degree.get(n, 0) >= HUB_DEGREE
        )

    victim_amount: Dict[str, float] = defaultdict(float)
    for a, b, amt in edges:
        if b in mules and a not in mules and members[a]["role"] != "CASH_OUT":
            victim_amount[a] += amt
    for n, paid in victim_amount.items():
        members[n].update(role="VICTIM", hop=0, why=f"paid {inr(paid)} into suspected mule accounts")
    for k, v in verdicts.items():
        if k in members:
            members[k]["verdict"] = v

    # Gather raw timestamped transactions touching suspected mules directly from cached cand_in/cand_out (zero extra scan)
    sub_txns: List[Tuple[float, str, str, float]] = []
    if raw_table == "txns":
        mule_ids = set(mules)
        for mid in mule_ids:
            for ts, b, amt in cand_out.get(mid, ()):
                sub_txns.append((ts, mid, b, amt))
            for ts, a, amt in cand_in.get(mid, ()):
                if a not in mule_ids:
                    sub_txns.append((ts, a, mid, amt))
    elif raw_events_memory is not None:
        sub_set = set(members)
        sub_txns = [(ts, a, b, amt) for ts, a, b, amt in raw_events_memory if a in sub_set or b in sub_set]
    else:
        sub_txns = [
            (fst, a, b, amt)
            for a, b, amt, _, fst, _ in db.execute(
                "SELECT a, b, amt, cnt, fst, lst FROM f WHERE a IN (SELECT n FROM m) OR b IN (SELECT n FROM m)"
            )
        ]

    cash_out_set = {n for n, m in members.items() if m["role"] == "CASH_OUT"}
    labels_map = {n: m["label"] for n, m in members.items()}
    trace_res = _trace_time_aware(sub_txns, set(mules), cash_out_set, dict(victim_amount), labels_map)

    # Hop distance strictly from temporally reachable paths (when raw timestamped txns ran); fallback only if zero traces
    t_hop = trace_res["hop"]
    for n, h in t_hop.items():
        if n in members:
            members[n]["hop"] = h

    # Fallback BFS ONLY over valid time-ordered edges (excludes debits that occurred before victim taint arrived!)
    valid_links = trace_res["valid_links"]
    q = deque(victim_amount)
    while q:
        n = q.popleft()
        for t in succ[n]:
            if (n, t) in valid_links and members[t]["hop"] is None:
                members[t]["hop"] = members[n]["hop"] + 1
                if not is_hub(t):
                    q.append(t)

    # Update held_inr with time-aware LIBR balances for active mules and compute freeze_value_inr
    libr_held = trace_res["libr_held"]
    last_outflow = trace_res["last_outflow_ts"]
    for nid, m in members.items():
        if nid in mules and verdicts.get(nid) != "NOT_MULE":
            # Use LIBR victim balance if victim funds reached the mule, else net balance
            h_val = libr_held[nid] if nid in libr_held else max(0.0, m["in_inr"] - m["out_inr"])
            # Cap at net balance if clean money buffered outflow
            h_val = min(h_val, max(0.0, m["in_inr"] - m["out_inr"])) if m["in_inr"] > m["out_inr"] else h_val
            held[nid] = round(h_val, 2)
            m["held_inr"] = held[nid]
        else:
            m["held_inr"] = 0.0

        h_amt = m["held_inr"]
        ref_ts = last_outflow.get(nid, m.get("last_ts") or case_latest_ts)
        hrs = max(0.0, (case_latest_ts - ref_ts) / 3600.0) if case_latest_ts and ref_ts else 0.0
        likelihood = max(0.01, min(1.0, 0.5 ** (hrs / FREEZE_HALF_LIFE_HOURS)))
        m["retention_likelihood"] = round(likelihood, 3)
        m["hours_since_last_outflow"] = round(hrs, 1)
        m["freeze_value_inr"] = round(h_amt * likelihood, 2)

    # Networks grow only around mules; hubs join as members but never link two networks.
    parent = {n: n for n in members if n in mules or not is_hub(n)}

    def find(x: str) -> str:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    hub_links = defaultdict(set)
    for a, b, _ in edges:
        for x, y in ((a, b), (b, a)):
            if x in mules:
                if is_hub(y) and y not in mules:
                    hub_links[y].add(x)
                else:
                    ra, rb = find(x), find(y)
                    if ra != rb:
                        parent[ra] = rb
    groups: Dict[str, set] = defaultdict(set)
    for n in parent:
        groups[find(n)].add(n)
    for hub, ms in hub_links.items():
        for root in {find(m) for m in ms}:
            groups[root].add(hub)

    networks = []
    cashed = trace_res["cashed_from_taint"]
    traces_by_victim = {vt["victim_id"]: vt for vt in trace_res["victim_traces"]}

    for comp in groups.values():
        loss = sum(victim_amount.get(n, 0.0) for n in comp)
        cash = min(loss, sum(cashed.get(n, 0.0) for n in comp))
        recoverable = min(loss - cash, sum(held.get(n, 0.0) for n in comp))
        net_id = "NET-" + hashlib.sha1(min(comp & set(mules)).encode()).hexdigest()[:8].upper()

        controllers = _controller_groups(comp, mules, members, device_clusters)
        ctrl_by_acct: Dict[str, Dict[str, Any]] = {}
        for cg in controllers:
            for ac in cg["accounts"]:
                ctrl_by_acct[ac] = cg
        for n in comp:
            if n in ctrl_by_acct:
                members[n]["controller_id"] = ctrl_by_acct[n]["controller_id"]
                members[n]["controller_summary"] = ctrl_by_acct[n]["summary"]

        subgroups: List[Dict[str, Any]] = []
        if len(comp) > MAX_MEMBERS_SHOWN:
            comp_edges = [(a, b, amt) for a, b, amt in edges if a in comp and b in comp]
            subgroups, member_sub = _detect_subgroups(net_id, comp, comp_edges, members, victim_amount, held)
            for n in comp:
                if n in member_sub:
                    members[n]["subgroup_id"] = member_sub[n]

        ranked = sorted((members[n] for n in comp), key=lambda m: (-m["mule_score"], m["label"]))
        shown = ranked if max_members is None else ranked[:max_members]
        ids = {m["id"] for m in shown}
        net_traces = [traces_by_victim[n] for n in sorted(comp) if n in traces_by_victim]

        networks.append({
            "network_id": net_id,
            "member_count": len(comp),
            "mule_count": sum(m["role"] == "MULE" for m in ranked),
            "victim_count": sum(m["role"] == "VICTIM" for m in ranked),
            "amount_inr": round(loss, 2),
            "cashed_out_inr": round(cash, 2),
            "recoverable_inr": round(recoverable, 2),
            "unaccounted_inr": round(max(0.0, loss - cash - recoverable), 2),
            "controllers": controllers,
            "traces": net_traces,
            "subgroups": subgroups,
            "members": shown,
            "links": [
                [a, b, round(link_amt[a, b], 2)]
                for a in ids
                for b in succ[a]
                if b in ids and ((a, b) in valid_links or a in victim_amount or not valid_links)
            ],
        })
    networks.sort(key=lambda n: (-n["amount_inr"], -n["member_count"]))

    # Probable matches: another party sharing a member's phone / account / VPA (review queue, never auto-merged).
    member_ids: Dict[tuple, List[str]] = defaultdict(list)
    for n, m in members.items():
        for ident in _ids(m["label"]):
            member_ids[ident].append(n)
    sharing: Dict[tuple, List[str]] = defaultdict(list)
    cur = db.execute("SELECT n, label FROM p")
    while batch := cur.fetchmany(20_000):
        for n, label in batch:
            for ident in _ids(label):
                if ident in member_ids and len(sharing[ident]) < 6:
                    sharing[ident].append(n)
    labels = {n: m["label"] for n, m in members.items()}
    missing = {n for ns in sharing.values() for n in ns if n not in labels}
    for n in missing:
        labels[n] = db.execute("SELECT label FROM p WHERE n = ?", (n,)).fetchone()[0]
    review, pairs = [], set()
    for (kind, value), ns in sharing.items():
        for i in range(len(ns)):
            for j in range(i + 1, len(ns)):
                pair = tuple(sorted((ns[i], ns[j])))
                if pair not in pairs:
                    pairs.add(pair)
                    review.append({"a": labels[pair[0]], "b": labels[pair[1]], "confidence": 0.8,
                                   "why": f"both contain the same {kind} {value}"})

    hits = []
    if lookup and member_ids:
        found = lookup(set(member_ids))
        hits = [{"identifier": v, "kind": k, "case_ids": sorted(found[(k, v)])} for k, v in sorted(found) if found[(k, v)]]

    return {
        "networks": networks,
        "review_queue": review[:500],
        "cross_case_hits": hits,
        "parties_total": parties_total,
        "parties_outside_networks": parties_total - len(set().union(*groups.values())),
        "scoring_meta": meta_out,
        "_features": features_to_save,
    }


_FROM_ROWS = """
CREATE TEMP TABLE f AS
  SELECT lower(trim(payer)) AS a, lower(trim(payee)) AS b, SUM(amount) AS amt, SUM(cnt) AS cnt,
         MIN(fst) AS fst, MAX(lst) AS lst, MAX(payer) AS la, MAX(payee) AS lb
  FROM {source} GROUP BY a, b HAVING a != b
"""


def analyze(
    flows: Iterable[Tuple],
    identifiers_elsewhere: Optional[Dict[str, set]] = None,
    max_members: Optional[int] = MAX_MEMBERS_SHOWN,
    verdicts: Optional[Dict[str, str]] = None,
    raw_txns: Optional[Iterable[Tuple[float, str, str, float]]] = None,
    device_clusters: Optional[List[Dict[str, Any]]] = None,
    feature_weights: Optional[Dict[str, float]] = None,
    model_intercept: Optional[float] = None,
    scoring_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """flows: (payer, payee, amount, count, first_ts, last_ts)."""
    flow_list = list(flows)
    raw_mem = (
        [(float(ts), canonical(pa), canonical(pb), float(amt)) for ts, pa, pb, amt in raw_txns]
        if raw_txns is not None
        else [(float(fst), canonical(pa), canonical(pb), float(amt)) for pa, pb, amt, cnt, fst, _ in flow_list]
    )
    with closing(sqlite3.connect(":memory:")) as db:
        db.execute("CREATE TEMP TABLE raw (payer TEXT, payee TEXT, amount REAL, cnt INTEGER, fst REAL, lst REAL)")
        db.executemany("INSERT INTO raw VALUES (?,?,?,?,?,?)", flow_list)
        db.execute(_FROM_ROWS.format(source="raw"))
        lookup = None
        if identifiers_elsewhere:
            lookup = lambda mine: {i: [c for c, ids in identifiers_elsewhere.items() if i in ids] for i in mine}
        res = _run(
            db,
            lookup,
            max_members,
            verdicts,
            raw_table=None,
            device_clusters=device_clusters,
            feature_weights=feature_weights,
            model_intercept=model_intercept,
            scoring_meta=scoring_meta,
            raw_events_memory=raw_mem,
        )
        res.pop("_features", None)
        return res


def analyze_store(
    store: DerivedStore,
    lookup: Optional[Lookup] = None,
    max_members: Optional[int] = MAX_MEMBERS_SHOWN,
    verdicts: Optional[Dict[str, str]] = None,
    feature_weights: Optional[Dict[str, float]] = None,
    model_intercept: Optional[float] = None,
    scoring_meta: Optional[Dict[str, Any]] = None,
    cache_only: bool = False,
) -> Optional[Dict[str, Any]]:
    """Run on a case's derived.sqlite; cached until txns, device_events, verdicts, or model weights change.

    cache_only: return None instead of running the analysis when nothing is cached for the current data."""
    with closing(sqlite3.connect(store.path)) as db:
        db.execute("CREATE TABLE IF NOT EXISTS analysis_cache (key TEXT PRIMARY KEY, result TEXT)")
        count, last = db.execute("SELECT COUNT(*), MAX(rowid) FROM txns").fetchone()
        dev_count = (
            db.execute("SELECT COUNT(*) FROM device_events").fetchone()[0]
            if db.execute("SELECT 1 FROM sqlite_master WHERE name='device_events'").fetchone()
            else 0
        )
        vkey = hashlib.sha1(json.dumps(sorted((verdicts or {}).items())).encode()).hexdigest()[:12]
        wkey = hashlib.sha1(json.dumps({"w": feature_weights, "i": model_intercept, "m": (scoring_meta or {}).get("mode")}, sort_keys=True).encode()).hexdigest()[:10]
        key = f"v{ANALYSIS_VERSION}:{count}:{last}:{dev_count}:{max_members}:{vkey}:{wkey}"
        hit = db.execute("SELECT result FROM analysis_cache WHERE key = ?", (key,)).fetchone()
        if hit:
            result = json.loads(hit[0])
        elif cache_only:
            return None
        else:
            dev = device_clusters_from_db(db, include_evidence=True)
            db.execute(_FROM_ROWS.format(source="(SELECT payer, payee, amount, 1 AS cnt, ts AS fst, ts AS lst FROM txns)"))
            result = _run(
                db,
                None,
                max_members,
                verdicts,
                raw_table="txns",
                device_clusters=dev.get("clusters", []),
                feature_weights=feature_weights,
                model_intercept=model_intercept,
                scoring_meta=scoring_meta,
            )
            features_snapshot = result.pop("_features", None)
            db.execute("DELETE FROM analysis_cache WHERE key NOT LIKE ?", (f"v{ANALYSIS_VERSION}:{count}:{last}:{dev_count}:%",))
            db.execute("INSERT INTO analysis_cache VALUES (?, ?)", (key, json.dumps(result)))
            db.commit()
            result["_features_snapshot"] = features_snapshot
    if lookup and result["networks"]:
        mine = {i for n in result["networks"] for m in n["members"] for i in _ids(m["label"])}
        found = lookup(mine)
        result["cross_case_hits"] = [
            {"identifier": v, "kind": k, "case_ids": sorted(found[(k, v)])}
            for k, v in sorted(found)
            if found[(k, v)]
        ]
    return result


def _sql_lookup(other_dbs: List[Tuple[str, Path]]) -> Lookup:
    """Reference scan of every other case's derived.sqlite (the pre-index behaviour; tests compare against it)."""
    def lookup(mine: set) -> Dict[tuple, List[str]]:
        found: Dict[tuple, List[str]] = defaultdict(list)
        for case_id, path in other_dbs:
            with closing(sqlite3.connect(path)) as db:
                db.execute("CREATE TEMP TABLE mine (kind TEXT, value TEXT)")
                db.executemany("INSERT INTO mine VALUES (?,?)", list(mine))
                for k, v in db.execute(
                    "SELECT DISTINCT i.kind, i.value FROM identifiers i JOIN mine USING (kind, value)"
                ):
                    found[(k, v)].append(case_id)
        return found

    return lookup


def _indexed_lookup(derived_dir: Path, case_id: str) -> Lookup:
    index = IdentifierIndex(derived_dir)
    return lambda mine: index.lookup(mine, case_id)


def case_networks(derived_dir: Path, case_id: str, max_members: Optional[int] = MAX_MEMBERS_SHOWN,
                  cache_only: bool = False, lookup: Optional[Lookup] = None) -> Optional[Dict[str, Any]]:
    case_dir = derived_dir / case_id
    if not (case_dir / "derived.sqlite").exists():
        return {
            "networks": [],
            "review_queue": [],
            "cross_case_hits": [],
            "parties_total": 0,
            "parties_outside_networks": 0,
            "scoring_meta": {"mode": "default", "verdicts_used": 0, "label": "default weights (0/30 verdicts)"},
        }
    store = VerdictStore(derived_dir.parent)  # projects.sqlite, beside the network decisions
    verdicts = {k: v["verdict"] for k, v in store.all(case_id, "account").items()}
    active_model = store.active_weights()
    result = analyze_store(
        DerivedStore(case_dir),
        lookup or _indexed_lookup(derived_dir, case_id),
        max_members=max_members,
        verdicts=verdicts,
        feature_weights=active_model["weights"],
        model_intercept=active_model.get("intercept"),
        scoring_meta={
            "mode": active_model["mode"],
            "verdicts_used": active_model["verdicts_used"],
            "last_tuned_at": active_model.get("last_tuned_at"),
            "label": active_model["label"],
        },
        cache_only=cache_only,
    )
    if result is None:
        return None
    snap = result.pop("_features_snapshot", None)
    if snap:
        store.save_features(case_id, snap)
    pairs = store.all(case_id, "pair")
    for item in result["review_queue"]:
        item["key"] = pair_key(item["a"], item["b"])
        item["verdict"] = (pairs.get(item["key"]) or {}).get("verdict")
    return result
