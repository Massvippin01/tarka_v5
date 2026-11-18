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
import re
import sqlite3
from collections import defaultdict, deque
from contextlib import closing
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from app.services.ingestion.account_verdicts import VerdictStore, pair_key
from app.services.ingestion.derived_store import DerivedStore, extract_identifiers

CASH_OUT_RE = re.compile(r"\b(atm|cash|withdraw\w*|crypto|usdt|binance|wazirx|gold|pos)\b", re.I)
BURST_SECONDS = 72 * 3600  # mule accounts are typically used for a few hours or days, then dropped
PASS_THROUGH = 0.8
HIGH_VALUE_INR = 25_000
HUB_DEGREE = 50  # parties with this many counterparties are treated as hubs (merchants, payroll, ATMs)
MULE_THRESHOLD = 0.7  # pass-through + short burst both required
MAX_MEMBERS_SHOWN = 200
ANALYSIS_VERSION = "6"

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


def _score(row: tuple) -> Dict[str, Any]:
    n, label, ins, incnt, outs, fst, lst, senders, receivers = row
    why: List[str] = []
    score = 0.0
    money = {"in_inr": round(ins, 2), "out_inr": round(outs, 2), "first_ts": fst, "last_ts": lst}
    if CASH_OUT_RE.search(label) and outs == 0:
        return {"id": n, "label": label, "kind": "cash_out", "role": "CASH_OUT", "mule_score": 0.0, "hop": None,
                "why": "money leaves the banking system here (cash / ATM / crypto)", **money}
    if ins > 0 and outs > 0:
        passthrough = min(ins, outs) / max(ins, outs)
        why.append(f"passes on {passthrough:.0%} of what it receives")
        if passthrough >= PASS_THROUGH:
            score += 0.35
        span = lst - fst
        if span <= BURST_SECONDS:
            score += 0.35
            why.append(f"all its activity happened within {span / 3600:.1f} h")
    if incnt and ins / incnt >= HIGH_VALUE_INR:
        score += 0.15
        why.append(f"average credit {inr(ins / incnt)}")
    if senders >= 2:
        score += 0.15
        why.append(f"{senders} senders, {receivers} receivers")
    return {"id": n, "label": label, "kind": _kind(label), "role": "MULE" if score >= MULE_THRESHOLD else "UNKNOWN",
            "mule_score": round(min(score, 1.0), 2), "hop": None, "why": "; ".join(why) or "no pass-through pattern",
            **money}


def _run(db: sqlite3.Connection, lookup: Optional[Lookup], max_members: Optional[int],
         verdicts: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Expects table f(a, b, amt, cnt, fst, lst, la, lb): one row per canonical payer→payee pair, a != b.
    verdicts: {party key: CONFIRMED_MULE | NOT_MULE} from the investigator; they override the score."""
    verdicts = verdicts or {}
    db.executescript(_PREP)
    parties_total = db.execute("SELECT COUNT(*) FROM p").fetchone()[0]

    # Candidates in SQL (pass-through + burst are both required to reach the threshold), confirmed in Python.
    mules: Dict[str, Dict[str, Any]] = {}
    cur = db.execute(
        "SELECT * FROM p WHERE ins > 0 AND outs > 0 AND MIN(ins, outs) >= ? * MAX(ins, outs) AND lst - fst <= ?",
        (PASS_THROUGH, BURST_SECONDS),
    )
    held: Dict[str, float] = {}  # money still sitting in each mule account (in - out)
    for row in cur:
        m = _score(row)
        if m["role"] == "MULE":
            mules[m["id"]] = m
            held[m["id"]] = max(0.0, row[2] - row[4])
            m["held_inr"] = round(held[m["id"]], 2)  # still in the account: what a freeze can catch
    confirmed = [k for k, v in verdicts.items() if v == "CONFIRMED_MULE" and k not in mules]
    for row in db.execute(f"SELECT * FROM p WHERE n IN ({','.join('?' * len(confirmed))})", confirmed) if confirmed else ():
        m = _score(row)
        m["role"] = "MULE"
        mules[m["id"]] = m
        held[m["id"]] = max(0.0, row[2] - row[4])
        m["held_inr"] = round(held[m["id"]], 2)
    # "Not a mule" stays a seed (victims' loss and network ids don't move) but stops counting as a mule,
    # and its balance leaves recoverable (it lands in unaccounted, so the money still reconciles).
    for k in [k for k, v in verdicts.items() if v == "NOT_MULE" and k in mules]:
        mules[k].update(role="UNKNOWN", held_inr=0.0)
        held.pop(k, None)
    if not mules:
        return {"networks": [], "review_queue": [], "cross_case_hits": [],
                "parties_total": parties_total, "parties_outside_networks": parties_total}

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
        members[row[0]] = _score(row)
        degree[row[0]] = row[7] + row[8]

    def is_hub(n: str) -> bool:
        return members[n]["role"] == "CASH_OUT" or bool(CASH_OUT_RE.search(members[n]["label"])) \
            or degree.get(n, 0) >= HUB_DEGREE

    victim_amount: Dict[str, float] = defaultdict(float)
    for a, b, amt in edges:
        if b in mules and a not in mules and members[a]["role"] != "CASH_OUT":
            victim_amount[a] += amt
    for n, paid in victim_amount.items():
        members[n].update(role="VICTIM", hop=0, why=f"paid {inr(paid)} into suspected mule accounts")
    for k, v in verdicts.items():
        if k in members:
            members[k]["verdict"] = v

    # Hop distance from the nearest victim along the money direction (within the neighbourhood)
    q = deque(victim_amount)
    while q:
        n = q.popleft()
        for t in succ[n]:
            if members[t]["hop"] is None:
                members[t]["hop"] = members[n]["hop"] + 1
                if not is_hub(t):
                    q.append(t)

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
    cashed: Dict[str, float] = defaultdict(float)
    for a, b, amt in edges:
        if a in mules and b not in mules and members[b]["role"] == "CASH_OUT":
            cashed[a] += amt

    for comp in groups.values():
        loss = sum(victim_amount.get(n, 0.0) for n in comp)
        # Reconciles by construction: cashed out + still in mules + moved elsewhere = what victims lost.
        cash = min(loss, sum(cashed.get(n, 0.0) for n in comp))
        recoverable = min(loss - cash, sum(held.get(n, 0.0) for n in comp))
        ranked = sorted((members[n] for n in comp), key=lambda m: (-m["mule_score"], m["label"]))
        shown = ranked if max_members is None else ranked[:max_members]
        ids = {m["id"] for m in shown}
        networks.append({
            # id from its mules (hubs like a shared ATM sit in several networks)
            "network_id": "NET-" + hashlib.sha1(min(comp & set(mules)).encode()).hexdigest()[:8].upper(),
            "member_count": len(comp),
            "mule_count": sum(m["role"] == "MULE" for m in ranked),
            "victim_count": sum(m["role"] == "VICTIM" for m in ranked),
            "amount_inr": round(loss, 2),  # paid in by victims
            "cashed_out_inr": round(cash, 2),
            "recoverable_inr": round(recoverable, 2),
            "unaccounted_inr": round(loss - cash - recoverable, 2),
            "members": shown,
            # payer -> payee money links between the members shown (for the network explorer)
            "links": [[a, b, round(link_amt[a, b], 2)] for a in ids for b in succ[a] if b in ids],
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
                if ident in member_ids and len(sharing[ident]) < 6:  # cap fan-out for very common identifiers
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

    return {"networks": networks, "review_queue": review[:500], "cross_case_hits": hits,
            "parties_total": parties_total,
            "parties_outside_networks": parties_total - len(set().union(*groups.values()))}


_FROM_ROWS = """
CREATE TEMP TABLE f AS
  SELECT lower(trim(payer)) AS a, lower(trim(payee)) AS b, SUM(amount) AS amt, SUM(cnt) AS cnt,
         MIN(fst) AS fst, MAX(lst) AS lst, MAX(payer) AS la, MAX(payee) AS lb
  FROM {source} GROUP BY a, b HAVING a != b
"""


def analyze(flows: Iterable[Tuple], identifiers_elsewhere: Optional[Dict[str, set]] = None,
            max_members: Optional[int] = MAX_MEMBERS_SHOWN, verdicts: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """flows: (payer, payee, amount, count, first_ts, last_ts). identifiers_elsewhere: {case_id: {(kind, value)}}."""
    with closing(sqlite3.connect(":memory:")) as db:
        db.execute("CREATE TEMP TABLE raw (payer TEXT, payee TEXT, amount REAL, cnt INTEGER, fst REAL, lst REAL)")
        db.executemany("INSERT INTO raw VALUES (?,?,?,?,?,?)", flows)
        db.execute(_FROM_ROWS.format(source="raw"))
        lookup = None
        if identifiers_elsewhere:
            lookup = lambda mine: {i: [c for c, ids in identifiers_elsewhere.items() if i in ids] for i in mine}
        return _run(db, lookup, max_members, verdicts)


def analyze_store(store: DerivedStore, lookup: Optional[Lookup] = None,
                  max_members: Optional[int] = MAX_MEMBERS_SHOWN,
                  verdicts: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    """Run on a case's derived.sqlite; cached in the file until its transactions or the verdicts change."""
    with closing(sqlite3.connect(store.path)) as db:
        db.execute("CREATE TABLE IF NOT EXISTS analysis_cache (key TEXT PRIMARY KEY, result TEXT)")
        count, last = db.execute("SELECT COUNT(*), MAX(rowid) FROM txns").fetchone()
        vkey = hashlib.sha1(json.dumps(sorted((verdicts or {}).items())).encode()).hexdigest()[:12]
        key = f"v{ANALYSIS_VERSION}:{count}:{last}:{max_members}:{vkey}"
        hit = db.execute("SELECT result FROM analysis_cache WHERE key = ?", (key,)).fetchone()
        if hit:
            result = json.loads(hit[0])
        else:
            db.execute(_FROM_ROWS.format(source="(SELECT payer, payee, amount, 1 AS cnt, ts AS fst, ts AS lst FROM txns)"))
            result = _run(db, None, max_members, verdicts)
            db.execute("DELETE FROM analysis_cache")
            db.execute("INSERT INTO analysis_cache VALUES (?, ?)", (key, json.dumps(result)))
            db.commit()
    # Cross-case hits depend on other cases, so they are never cached.
    if lookup and result["networks"]:
        mine = {i for n in result["networks"] for m in n["members"] for i in _ids(m["label"])}
        found = lookup(mine)
        result["cross_case_hits"] = [{"identifier": v, "kind": k, "case_ids": sorted(found[(k, v)])}
                                     for k, v in sorted(found) if found[(k, v)]]
    return result


def _sql_lookup(other_dbs: List[Tuple[str, Path]]) -> Lookup:
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


def case_networks(derived_dir: Path, case_id: str, max_members: Optional[int] = MAX_MEMBERS_SHOWN) -> Dict[str, Any]:
    case_dir = derived_dir / case_id
    if not (case_dir / "derived.sqlite").exists():
        return {"networks": [], "review_queue": [], "cross_case_hits": [], "parties_total": 0, "parties_outside_networks": 0}
    # shortcut: one query per other case; keep a global identifier index past ~100 cases.
    others = [(d.name, d / "derived.sqlite") for d in derived_dir.iterdir()
              if d.is_dir() and d.name != case_id and (d / "derived.sqlite").exists()]
    store = VerdictStore(derived_dir.parent)  # projects.sqlite, beside the network decisions
    verdicts = {k: v["verdict"] for k, v in store.all(case_id, "account").items()}
    result = analyze_store(DerivedStore(case_dir), _sql_lookup(others), max_members=max_members, verdicts=verdicts)
    pairs = store.all(case_id, "pair")
    for item in result["review_queue"]:
        item["key"] = pair_key(item["a"], item["b"])
        item["verdict"] = (pairs.get(item["key"]) or {}).get("verdict")
    return result
