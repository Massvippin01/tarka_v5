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
MIN_VERDICTS_FOR_TUNING = 30

FEATURE_NAMES = (
    "passthrough",
    "burst_72h",
    "high_value",
    "multi_sender",
    "below_limit_structuring",
    "near_identical_splits",
    "rapid_fan_out",
    "round_amounts",
    "device_shared",
)

DEFAULT_FEATURE_WEIGHTS: Dict[str, float] = {
    "passthrough": 0.35,
    "burst_72h": 0.35,
    "high_value": 0.15,
    "multi_sender": 0.15,
    "below_limit_structuring": 0.20,
    "near_identical_splits": 0.15,
    "rapid_fan_out": 0.20,
    "round_amounts": 0.10,
    "device_shared": 0.25,
}

_SCHEMA = """
CREATE TABLE IF NOT EXISTS entity_verdict (
  case_id TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, verdict TEXT NOT NULL, reason TEXT,
  updated_by TEXT, updated_at REAL, PRIMARY KEY (case_id, kind, key));
CREATE TABLE IF NOT EXISTS entity_verdict_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, case_id TEXT NOT NULL, kind TEXT NOT NULL, key TEXT NOT NULL, actor TEXT,
  at REAL, before_json TEXT, after_json TEXT, prev_hash TEXT, hash TEXT);
CREATE TABLE IF NOT EXISTS account_features (
  case_id TEXT NOT NULL, key TEXT NOT NULL, features_json TEXT NOT NULL, updated_at REAL,
  PRIMARY KEY (case_id, key));
CREATE TABLE IF NOT EXISTS model_tune_log (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, tuned_at REAL NOT NULL, verdicts_count INTEGER NOT NULL,
  positives INTEGER NOT NULL, negatives INTEGER NOT NULL, weights_json TEXT NOT NULL,
  intercept REAL NOT NULL, accuracy REAL NOT NULL, prev_hash TEXT NOT NULL, hash TEXT NOT NULL);
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

    def save_features(self, case_id: str, features_by_key: Dict[str, Dict[str, float]]) -> None:
        """Persist computed [0, 1] signal feature vectors so later verdicts can re-tune logistic regression."""
        if not features_by_key:
            return
        now = time.time()
        rows = [
            (case_id, k, json.dumps({f: float(v.get(f, 0.0)) for f in FEATURE_NAMES}, sort_keys=True), now)
            for k, v in features_by_key.items()
        ]
        with closing(sqlite3.connect(self.path)) as db:
            db.executemany("INSERT OR REPLACE INTO account_features VALUES (?,?,?,?)", rows)
            db.commit()

    def count_account_verdicts(self) -> int:
        with closing(sqlite3.connect(self.path)) as db:
            row = db.execute("SELECT COUNT(*) FROM entity_verdict WHERE kind = 'account'").fetchone()
            return int(row[0]) if row else 0

    def maybe_retune(self, min_verdicts: int = MIN_VERDICTS_FOR_TUNING) -> Optional[Dict[str, Any]]:
        """Re-fit explainable LogisticRegression over stored verdicts + feature vectors when >= min_verdicts exist."""
        with closing(sqlite3.connect(self.path)) as db:
            rows = db.execute(
                """
                SELECT v.verdict, f.features_json
                FROM entity_verdict v
                JOIN account_features f ON f.case_id = v.case_id AND f.key = v.key
                WHERE v.kind = 'account' AND v.verdict IN ('CONFIRMED_MULE', 'NOT_MULE')
                ORDER BY v.updated_at, v.key
                """
            ).fetchall()
        if len(rows) < min_verdicts:
            return None
        X: List[List[float]] = []
        y: List[int] = []
        for verdict, fjson in rows:
            feat = json.loads(fjson)
            X.append([float(feat.get(f, 0.0)) for f in FEATURE_NAMES])
            y.append(1 if verdict == "CONFIRMED_MULE" else 0)
        pos = sum(y)
        neg = len(y) - pos
        if pos == 0 or neg == 0:
            return None

        from sklearn.linear_model import LogisticRegression

        clf = LogisticRegression(C=1.0, max_iter=500, random_state=42)
        clf.fit(X, y)
        coefs = [max(0.0, float(c)) for c in clf.coef_[0]]
        total_c = sum(coefs)
        # Keep explainable normalized weights summing near default core budget (or normalized positive weights)
        if total_c > 0:
            weights = {f: round(coefs[i], 4) for i, f in enumerate(FEATURE_NAMES)}
        else:
            weights = dict(DEFAULT_FEATURE_WEIGHTS)
        intercept = round(float(clf.intercept_[0]), 4)
        preds = clf.predict(X)
        accuracy = round(sum(int(p == t) for p, t in zip(preds, y)) / len(y), 4)
        now = time.time()
        w_json = json.dumps(weights, sort_keys=True)

        with closing(sqlite3.connect(self.path)) as db:
            prev = db.execute("SELECT hash FROM model_tune_log ORDER BY seq DESC LIMIT 1").fetchone()
            prev_hash = prev[0] if prev else ""
            h = hashlib.sha256(
                f"{prev_hash}|{now}|{len(y)}|{pos}|{neg}|{w_json}|{intercept}|{accuracy}".encode()
            ).hexdigest()
            db.execute(
                "INSERT INTO model_tune_log (tuned_at, verdicts_count, positives, negatives, weights_json, intercept, accuracy, prev_hash, hash) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                (now, len(y), pos, neg, w_json, intercept, accuracy, prev_hash, h),
            )
            db.commit()
        return {
            "mode": "calibrated",
            "verdicts_used": len(y),
            "positives": pos,
            "negatives": neg,
            "last_tuned_at": now,
            "weights": weights,
            "intercept": intercept,
            "accuracy": accuracy,
            "label": f"weights last tuned on {len(y)} verdicts",
        }

    def active_weights(self, min_verdicts: int = MIN_VERDICTS_FOR_TUNING) -> Dict[str, Any]:
        """Return latest LogisticRegression weights if >= min_verdicts verdicts exist, else defaults."""
        total = self.count_account_verdicts()
        with closing(sqlite3.connect(self.path)) as db:
            row = db.execute(
                "SELECT seq, tuned_at, verdicts_count, positives, negatives, weights_json, intercept, accuracy "
                "FROM model_tune_log ORDER BY seq DESC LIMIT 1"
            ).fetchone()
        if row and total >= min_verdicts:
            seq, ts, cnt, pos, neg, w_json, intercept, acc = row
            return {
                "mode": "calibrated",
                "seq": seq,
                "verdicts_used": cnt,
                "positives": pos,
                "negatives": neg,
                "last_tuned_at": ts,
                "weights": json.loads(w_json),
                "intercept": intercept,
                "accuracy": acc,
                "label": f"weights last tuned on {cnt} verdicts",
            }
        return {
            "mode": "default",
            "verdicts_used": total,
            "min_required": min_verdicts,
            "last_tuned_at": None,
            "weights": dict(DEFAULT_FEATURE_WEIGHTS),
            "intercept": None,
            "accuracy": None,
            "label": f"default weights ({total}/{min_verdicts} verdicts)",
        }

    def tune_history(self) -> List[Dict[str, Any]]:
        with closing(sqlite3.connect(self.path)) as db:
            rows = db.execute(
                "SELECT seq, tuned_at, verdicts_count, positives, negatives, weights_json, intercept, accuracy, hash "
                "FROM model_tune_log ORDER BY seq DESC"
            ).fetchall()
        return [
            {
                "seq": s,
                "tuned_at": t,
                "verdicts_count": vc,
                "positives": pos,
                "negatives": neg,
                "weights": json.loads(wj),
                "intercept": ic,
                "accuracy": acc,
                "hash": h,
            }
            for s, t, vc, pos, neg, wj, ic, acc, h in rows
        ]
