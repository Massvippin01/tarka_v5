"""Investigator verdicts on accounts ("Confirm mule" / "Not a mule") and on probable same-person pairs
("Merge" / "Not same"), keyed by case, with an append-only hash-chained audit log.

Keys are party keys (lower(trim(label)), as in networks.py); a pair key is the two party keys sorted, joined by "|".
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

ACCOUNT_VERDICTS = ("CONFIRMED_MULE", "NOT_MULE")
PAIR_VERDICTS = ("MERGE", "NOT_SAME")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS entity_verdict (
  case_id TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, verdict TEXT NOT NULL, reason TEXT,
  updated_by TEXT, updated_at REAL, PRIMARY KEY (case_id, kind, key));
CREATE TABLE IF NOT EXISTS entity_verdict_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, actor TEXT,
  at REAL, before_json TEXT, after_json TEXT, prev_hash TEXT, hash TEXT);
"""


def party_key(label: str) -> str:
    return label.strip().lower()


def pair_key(a: str, b: str) -> str:
    return "|".join(sorted((party_key(a), party_key(b))))


class VerdictStore:
    def __init__(self, base_dir: Path):
        base_dir.mkdir(parents=True, exist_ok=True)
        self.path = base_dir / "projects.sqlite"
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript(_SCHEMA)

    def all(self, case_id: str, kind: str) -> Dict[str, Dict[str, Any]]:
        with closing(sqlite3.connect(self.path)) as db:
            rows = db.execute("SELECT key, verdict, reason, updated_by, updated_at FROM entity_verdict "
                              "WHERE case_id = ? AND kind = ?", (case_id, kind)).fetchall()
        return {k: {"verdict": v, "reason": r, "updated_by": u, "updated_at": t} for k, v, r, u, t in rows}

    def set(self, case_id: str, kind: str, key: str, actor: str, verdict: Optional[str],
            reason: str = "") -> Dict[str, Any]:
        """verdict None clears it (back to the computed score). Every change is audit-logged."""
        allowed = ACCOUNT_VERDICTS if kind == "account" else PAIR_VERDICTS
        reason = (reason or "").strip()[:500]
        if verdict is not None and verdict not in allowed:
            raise ValueError(f"Verdict must be one of {', '.join(allowed)}.")
        if verdict in ("NOT_MULE", "NOT_SAME") and not reason:
            raise ValueError("Say why (this goes into the audit log).")
        now = time.time()
        before = self.all(case_id, kind).get(key)
        after = {"verdict": verdict, "reason": reason or None, "updated_by": actor, "updated_at": now} if verdict else None
        with closing(sqlite3.connect(self.path)) as db:
            if after:
                db.execute("INSERT OR REPLACE INTO entity_verdict VALUES (?,?,?,?,?,?,?)",
                           (case_id, kind, key, verdict, after["reason"], actor, now))
            else:
                db.execute("DELETE FROM entity_verdict WHERE case_id = ? AND kind = ? AND key = ?", (case_id, kind, key))
            prev = db.execute("SELECT hash FROM entity_verdict_log ORDER BY seq DESC LIMIT 1").fetchone()
            prev_hash = prev[0] if prev else ""
            b, a = json.dumps(before, sort_keys=True), json.dumps(after, sort_keys=True)
            h = hashlib.sha256(f"{prev_hash}|{case_id}|{kind}|{key}|{actor}|{now}|{b}|{a}".encode()).hexdigest()
            db.execute("INSERT INTO entity_verdict_log (case_id, kind, key, actor, at, before_json, after_json, prev_hash, hash)"
                       " VALUES (?,?,?,?,?,?,?,?,?)", (case_id, kind, key, actor, now, b, a, prev_hash, h))
            db.commit()
        return {"key": key, "kind": kind, **(after or {"verdict": None})}

    def history(self, case_id: str, kind: str, key: str) -> List[Dict[str, Any]]:
        with closing(sqlite3.connect(self.path)) as db:
            rows = db.execute("SELECT seq, actor, at, before_json, after_json, hash FROM entity_verdict_log "
                              "WHERE case_id = ? AND kind = ? AND key = ? ORDER BY seq", (case_id, kind, key)).fetchall()
        return [{"seq": s, "actor": ac, "at": at, "before": json.loads(b), "after": json.loads(a), "hash": h}
                for s, ac, at, b, a, h in rows]

    def verify_chain(self) -> bool:
        with closing(sqlite3.connect(self.path)) as db:
            rows = db.execute("SELECT case_id, kind, key, actor, at, before_json, after_json, prev_hash, hash "
                              "FROM entity_verdict_log ORDER BY seq").fetchall()
        prev = ""
        for c, k, key, ac, at, b, a, ph, h in rows:
            if ph != prev or h != hashlib.sha256(f"{ph}|{c}|{k}|{key}|{ac}|{at}|{b}|{a}".encode()).hexdigest():
                return False
            prev = h
        return True
