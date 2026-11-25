"""Station overview in one payload: a lightweight row per case plus station totals.

Replaces the per-case GET /cases/{id}/bundle + /networks fan-out (~2 requests per case). Figures come from the same
sources the case pages use: the case's cached network analysis (analysis_cache in derived.sqlite), the projects
store, NCRP complaints, golden-hour steps and freeze notices. Cases whose analysis is not cached are analysed inline
when small; big ones report analysis="pending" until their case page (or ingestion) has run it once.

The user-independent rows are cached until any input file (every derived.sqlite, projects/jobs/freeze stores) changes.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.domain.auth import UserIdentity
from app.services.ingestion.identifier_index import IdentifierIndex, file_sig
from app.services.ingestion.large_evidence_engine import IngestionJobManager
from app.services.ingestion.ncrp_complaints import NcrpComplaintStore
from app.services.ingestion.networks import case_networks
from app.services.ingestion.projects_store import ProjectsStore

GOLDEN_MINS = 180
INLINE_ANALYSIS_MAX_BYTES = 30 * 1024 * 1024  # shortcut: bigger uncached cases wait for their own page; raise if warm-up allows
_LOCK = threading.Lock()
_CACHE: Dict[str, Any] = {}  # base_dir -> (version, rows)


def data_version(base_dir: Path, derived_dir: Path) -> tuple:
    files = [base_dir / n for n in ("projects.sqlite", "jobs.sqlite", "freeze_notices.sqlite")]
    files += [d / "derived.sqlite" for d in derived_dir.iterdir() if d.is_dir()]
    return tuple(file_sig(p) for p in files)


def _freeze_totals(base_dir: Path) -> Dict[str, float]:
    path = base_dir / "freeze_notices.sqlite"
    if not path.exists():
        return {}
    with closing(sqlite3.connect(path)) as db:
        rows = db.execute("SELECT case_id, notices_json FROM freeze_notices").fetchall()
    return {cid: round(sum(float(n.get("frozenInr") or 0) for n in json.loads(j) if n.get("status") == "FROZEN"), 2)
            for cid, j in rows}


def _case_row(case_id: str, reg: Dict[str, Any], complaints: List[Dict[str, Any]], golden: Dict[str, Any],
              frozen: float, derived_dir: Path, shared: Dict[tuple, List[str]]) -> Dict[str, Any]:
    details = reg.get("details") or {}
    lead = next((c for c in complaints if c["status"] == "MATCHED"), complaints[0] if complaints else None)
    db_path = derived_dir / case_id / "derived.sqlite"
    # same answer as the case page's lookup, from one in-memory table of identifiers held by 2+ cases
    elsewhere = lambda mine: {i: [c for c in shared[i] if c != case_id] for i in mine if i in shared}
    nets = None
    if db_path.exists():
        nets = case_networks(derived_dir, case_id, cache_only=True, lookup=elsewhere)
        if nets is None and db_path.stat().st_size <= INLINE_ANALYSIS_MAX_BYTES:
            nets = case_networks(derived_dir, case_id, lookup=elsewhere)
    n = nets["networks"] if nets else []
    total = lambda key: round(sum(x[key] for x in n), 2)
    return {
        "caseId": case_id,
        "title": reg.get("title") or "",
        "complainantName": details.get("complainant_name") or (lead["victim_name"] if lead else ""),
        "typology": details.get("typology") or (lead["typology"] if lead else ""),
        "claimedLossInr": details.get("claimed_loss_inr") or (lead["amount_inr"] if lead and lead.get("amount_inr") else 0),
        "lifecycle": reg.get("lifecycle") or "INTAKE",
        "assignee": reg.get("assignee"),
        "projectId": reg.get("project_id"),
        "analysis": "none" if not db_path.exists() else "ready" if nets is not None else "pending",
        "bookedLossInr": total("amount_inr"),
        "recoverableInr": total("recoverable_inr"),
        "cashedOutInr": total("cashed_out_inr"),
        "unaccountedInr": total("unaccounted_inr"),
        "frozenInr": frozen,
        "networks": len(n),
        "mules": sum(x["mule_count"] for x in n),
        "parties": nets["parties_total"] if nets else 0,
        "_goldenStartedAt": golden.get("started_at") if golden.get("active") else None,
        "_hitCases": [h["case_ids"] for h in nets["cross_case_hits"]] if nets else [],
        "_owner": reg.get("owner_id"),
    }


def _build_rows(base_dir: Path, derived_dir: Path) -> List[Dict[str, Any]]:
    store = ProjectsStore(base_dir)
    known = {c["case_id"]: c for c in store.all_cases()}
    for job in IngestionJobManager.get_instance().jobs.values():  # same universe as GET /projects/cases
        if not job.is_cancelled and job.case_id not in known:
            known[job.case_id] = {"case_id": job.case_id, "title": "", "owner_id": None, "project_id": None,
                                  "lifecycle": "INTAKE", "assignee": None}
    ncrp = NcrpComplaintStore(base_dir)
    with closing(ncrp._db()) as db:
        with_complaints = {r[0] for r in db.execute("SELECT DISTINCT case_id FROM ncrp_complaints")}
        with_golden = {r[0] for r in db.execute("SELECT case_id FROM golden_hour_steps")}
    frozen = _freeze_totals(base_dir)
    shared = IdentifierIndex(derived_dir).shared()
    return [
        _case_row(cid, reg, ncrp.list_for_case(cid) if cid in with_complaints else [],
                  ncrp.golden_hour_status(cid) if cid in with_golden else {}, frozen.get(cid, 0.0), derived_dir, shared)
        for cid, reg in sorted(known.items())
    ]


def cached_rows(base_dir: Path, derived_dir: Path) -> List[Dict[str, Any]]:
    key = str(base_dir.resolve())
    with _LOCK:  # one rebuild at a time; the version is taken after it, as analysis writes its own cache into derived.sqlite
        hit = _CACHE.get(key)
        if hit and hit[0] == data_version(base_dir, derived_dir):
            return hit[1]
        rows = _build_rows(base_dir, derived_dir)
        _CACHE[key] = (data_version(base_dir, derived_dir), rows)
        return rows


def _can_open(user: UserIdentity, case_id: str, owner_id: Optional[str]) -> bool:
    """AuthService.validate_case_scope with the registry owner already in hand (no per-case lookup)."""
    if not user or not user.scope:
        return False
    return case_id in (user.scope.allowed_cases or []) or bool(owner_id and owner_id == user.user_id)


def station_summary(user: UserIdentity, base_dir: Path, derived_dir: Path) -> Dict[str, Any]:
    rows = cached_rows(base_dir, derived_dir)
    owners = {r["caseId"]: r["_owner"] for r in rows}
    now = time.time()
    out = []
    for r in rows:
        if not _can_open(user, r["caseId"], r["_owner"]):
            continue
        started = r["_goldenStartedAt"]
        remaining = max(0, round(GOLDEN_MINS - (now - started) / 60)) if started else 0
        hits = sum(1 for cases in r["_hitCases"] if any(_can_open(user, c, owners.get(c)) for c in cases))
        out.append({**{k: v for k, v in r.items() if not k.startswith("_")},
                    "goldenHour": {"active": started is not None, "startedAt": started,
                                   "remainingMins": remaining, "expired": started is not None and remaining == 0},
                    "crossCaseHits": hits})
    sums = lambda key: round(sum(r[key] for r in out), 2)
    return {
        "generatedAt": now,
        "cases": out,
        "totals": {
            "cases": len(out),
            "bookedLossInr": sums("bookedLossInr"), "recoverableInr": sums("recoverableInr"),
            "cashedOutInr": sums("cashedOutInr"), "frozenInr": sums("frozenInr"),
            "networks": sum(r["networks"] for r in out), "mules": sum(r["mules"] for r in out),
            "crossCaseHits": sum(r["crossCaseHits"] for r in out),
            "goldenHourActive": sum(1 for r in out if r["goldenHour"]["remainingMins"] > 0),
            "goldenHourExpired": sum(1 for r in out if r["goldenHour"]["expired"]),
            "analysisPending": sum(1 for r in out if r["analysis"] == "pending"),
        },
    }
