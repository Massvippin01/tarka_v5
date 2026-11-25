"""Per-network triage status + investigator decision, keyed by (case_id, network_id), with an append-only audit log.

shortcut: a SQLite file beside projects.sqlite (single backend process); move to the main DB for multi-node.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
import time
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional

STATUSES = ("NEW", "UNDER_REVIEW", "CASE_OPENED", "FREEZES_SENT", "CLOSED")
# decision → status it moves the network to
DECISIONS = {"INVESTIGATE": "UNDER_REVIEW", "MAKE_CASE": "CASE_OPENED", "MERGE_FIR": "CASE_OPENED", "DISMISS": "CLOSED"}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS network_status (
  case_id TEXT NOT NULL, network_id TEXT NOT NULL, status TEXT NOT NULL, decision TEXT, reason TEXT,
  target_case_id TEXT, updated_by TEXT, updated_at REAL, PRIMARY KEY (case_id, network_id));
CREATE TABLE IF NOT EXISTS network_status_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL, network_id TEXT NOT NULL, actor TEXT, at REAL,
  before_json TEXT, after_json TEXT, prev_hash TEXT, hash TEXT);
"""
_COLS = ("status", "decision", "reason", "target_case_id", "updated_by", "updated_at")


class NetworkDecisionStore:
    def __init__(self, base_dir: Path):
        base_dir.mkdir(parents=True, exist_ok=True)
        self.path = base_dir / "projects.sqlite"
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript(_SCHEMA)

    def _db(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    @staticmethod
    def _blank(network_id: str) -> Dict[str, Any]:
        return {"network_id": network_id, "status": "NEW", "decision": None, "reason": None,
                "target_case_id": None, "updated_by": None, "updated_at": None}

    def all(self, case_id: str) -> Dict[str, Dict[str, Any]]:
        with closing(self._db()) as db:
            rows = db.execute(f"SELECT network_id, {', '.join(_COLS)} FROM network_status WHERE case_id = ?",
                              (case_id,)).fetchall()
        return {r[0]: {"network_id": r[0], **dict(zip(_COLS, r[1:]))} for r in rows}

    def get(self, case_id: str, network_id: str) -> Dict[str, Any]:
        return self.all(case_id).get(network_id) or self._blank(network_id)

    def set(self, case_id: str, network_id: str, actor: str, *, decision: Optional[str] = None,
            status: Optional[str] = None, reason: Optional[str] = None,
            target_case_id: Optional[str] = None) -> Dict[str, Any]:
        """Record a decision (which implies a status) or a bare status change; every change is audit-logged."""
        reason = (reason or "").strip()[:500] or None
        if decision is not None:
            if decision not in DECISIONS:
                raise ValueError(f"Decision must be one of {', '.join(DECISIONS)}.")
            if decision == "DISMISS" and not reason:
                raise ValueError("Say why the network is dismissed.")
            if decision == "MERGE_FIR" and not target_case_id:
                raise ValueError("Pick the FIR / case to merge into.")
            status = DECISIONS[decision]
        if status not in STATUSES:
            raise ValueError(f"Status must be one of {', '.join(STATUSES)}.")
        before = self.get(case_id, network_id)
        after = {**before, "status": status, "decision": decision or before["decision"],
                 "reason": reason if decision else (reason or before["reason"]),
                 "target_case_id": target_case_id if decision else before["target_case_id"],
                 "updated_by": actor, "updated_at": time.time()}
        with closing(self._db()) as db:
            db.execute(f"INSERT OR REPLACE INTO network_status (case_id, network_id, {', '.join(_COLS)}) "
                       "VALUES (?,?,?,?,?,?,?,?)", (case_id, network_id, *(after[c] for c in _COLS)))
            prev = db.execute("SELECT hash FROM network_status_log ORDER BY seq DESC LIMIT 1").fetchone()
            prev_hash = prev[0] if prev else ""
            b, a = json.dumps(before, sort_keys=True), json.dumps(after, sort_keys=True)
            h = hashlib.sha256(f"{prev_hash}|{case_id}|{network_id}|{actor}|{after['updated_at']}|{b}|{a}".encode()).hexdigest()
            db.execute("INSERT INTO network_status_log (case_id, network_id, actor, at, before_json, after_json, prev_hash, hash)"
                       " VALUES (?,?,?,?,?,?,?,?)", (case_id, network_id, actor, after["updated_at"], b, a, prev_hash, h))
            db.commit()
        return after

    def history(self, case_id: str, network_id: str) -> List[Dict[str, Any]]:
        with closing(self._db()) as db:
            rows = db.execute("SELECT seq, actor, at, before_json, after_json, hash FROM network_status_log "
                              "WHERE case_id = ? AND network_id = ? ORDER BY seq", (case_id, network_id)).fetchall()
        return [{"seq": s, "actor": ac, "at": at, "before": json.loads(b), "after": json.loads(a), "hash": h}
                for s, ac, at, b, a, h in rows]

    def verify_chain(self) -> bool:
        """True when no audit row was edited or removed (each hash covers the previous one)."""
        with closing(self._db()) as db:
            rows = db.execute("SELECT case_id, network_id, actor, at, before_json, after_json, prev_hash, hash "
                              "FROM network_status_log ORDER BY seq").fetchall()
        prev = ""
        for c, n, ac, at, b, a, ph, h in rows:
            if ph != prev or h != hashlib.sha256(f"{ph}|{c}|{n}|{ac}|{at}|{b}|{a}".encode()).hexdigest():
                return False
            prev = h
        return True
