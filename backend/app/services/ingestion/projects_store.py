"""Projects (operations) and per-case lifecycle/assignee.

shortcut: a SQLite file beside the ingestion job table (single backend process); move to the main DB for multi-node.
"""

from __future__ import annotations

import json
import sqlite3
import time
import uuid
from contextlib import closing
from pathlib import Path
from typing import Any, Dict, List, Optional

LIFECYCLE = ("INTAKE", "PROCESSING", "INVESTIGATING", "ACTION_PENDING", "COURT_READY", "CLOSED")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS projects (project_id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT,
                                     archived INTEGER DEFAULT 0, created_at REAL);
CREATE TABLE IF NOT EXISTS case_meta (case_id TEXT PRIMARY KEY, project_id TEXT, lifecycle TEXT, assignee TEXT);
CREATE TABLE IF NOT EXISTS case_registry (case_id TEXT PRIMARY KEY, title TEXT, owner_id TEXT, created_at REAL);
"""


class ProjectsStore:
    def __init__(self, base_dir: Path):
        base_dir.mkdir(parents=True, exist_ok=True)
        self.path = base_dir / "projects.sqlite"
        with closing(sqlite3.connect(self.path)) as db:
            db.executescript(_SCHEMA)
            if "details_json" not in {r[1] for r in db.execute("PRAGMA table_info(case_registry)")}:
                db.execute("ALTER TABLE case_registry ADD COLUMN details_json TEXT")
            if "owner_id" not in {r[1] for r in db.execute("PRAGMA table_info(projects)")}:
                db.execute("ALTER TABLE projects ADD COLUMN owner_id TEXT")  # NULL for projects made before owners
            db.commit()

    def _db(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    def list(self) -> List[Dict[str, Any]]:
        with closing(self._db()) as db:
            projects = db.execute(
                "SELECT project_id, name, description, archived, created_at, owner_id FROM projects ORDER BY created_at DESC"
            ).fetchall()
            cases = db.execute("SELECT case_id, project_id, lifecycle, assignee FROM case_meta ORDER BY case_id").fetchall()
        out = []
        for pid, name, desc, archived, created, owner in projects:
            out.append({
                "project_id": pid, "name": name, "description": desc or "", "archived": bool(archived),
                "created_at": created, "owner_id": owner,
                "cases": [{"case_id": c, "lifecycle": lc, "assignee": a} for c, p, lc, a in cases if p == pid],
            })
        return out

    def get(self, project_id: str) -> Optional[Dict[str, Any]]:
        return next((p for p in self.list() if p["project_id"] == project_id), None)

    def create(self, name: str, description: str = "", owner_id: Optional[str] = None) -> Dict[str, Any]:
        name = name.strip()
        if not name:
            raise ValueError("Project name is required.")
        pid = f"PRJ-{uuid.uuid4().hex[:8].upper()}"
        with closing(self._db()) as db:
            db.execute("INSERT INTO projects (project_id, name, description, archived, created_at, owner_id) "
                       "VALUES (?,?,?,0,?,?)", (pid, name[:120], description[:2000], time.time(), owner_id))
            db.commit()
        return self.get(pid)

    def update(self, project_id: str, name: Optional[str] = None, description: Optional[str] = None,
               archived: Optional[bool] = None) -> Dict[str, Any]:
        if not self.get(project_id):
            raise KeyError(project_id)
        if name is not None and not name.strip():
            raise ValueError("Project name is required.")
        with closing(self._db()) as db:
            for col, val in (("name", name and name.strip()[:120]), ("description", description),
                             ("archived", None if archived is None else int(archived))):
                if val is not None:
                    db.execute(f"UPDATE projects SET {col} = ? WHERE project_id = ?", (val, project_id))
            db.commit()
        return self.get(project_id)

    def _ensure_handover_schema(self, db: sqlite3.Connection) -> None:
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS case_handover_log (
                seq INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                network_id TEXT,
                from_officer TEXT,
                to_officer TEXT NOT NULL,
                note TEXT,
                actor TEXT NOT NULL,
                at REAL NOT NULL,
                prev_hash TEXT NOT NULL,
                hash TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS network_assignees (
                case_id TEXT NOT NULL,
                network_id TEXT NOT NULL,
                assignee TEXT,
                updated_by TEXT,
                updated_at REAL,
                PRIMARY KEY (case_id, network_id)
            );
            """
        )

    def case_meta(self, case_id: str) -> Dict[str, Any]:
        with closing(self._db()) as db:
            row = db.execute("SELECT project_id, lifecycle, assignee FROM case_meta WHERE case_id = ?", (case_id,)).fetchone()
        p, lc, a = row or (None, "INTAKE", None)
        return {"case_id": case_id, "project_id": p, "lifecycle": lc or "INTAKE", "assignee": a}

    def handover(self, case_id: str, to_officer: str, actor: str, *, note: str = "", network_id: Optional[str] = None) -> Dict[str, Any]:
        """Assign a case or specific network to an officer, append-only hash-chained handover log."""
        import hashlib

        target = to_officer.strip()[:120]
        if not target:
            raise ValueError("Specify the officer receiving the handover.")
        clean_note = (note or "").strip()[:500]
        now = time.time()
        with closing(self._db()) as db:
            self._ensure_handover_schema(db)
            if network_id:
                cur = db.execute(
                    "SELECT assignee FROM network_assignees WHERE case_id = ? AND network_id = ?",
                    (case_id, network_id),
                ).fetchone()
                from_officer = cur[0] if cur else None
                db.execute(
                    "INSERT OR REPLACE INTO network_assignees (case_id, network_id, assignee, updated_by, updated_at) VALUES (?,?,?,?,?)",
                    (case_id, network_id, target, actor, now),
                )
            else:
                meta = db.execute("SELECT project_id, lifecycle, assignee FROM case_meta WHERE case_id = ?", (case_id,)).fetchone()
                p, lc, from_officer = meta or (None, "INTAKE", None)
                db.execute(
                    "INSERT OR REPLACE INTO case_meta (case_id, project_id, lifecycle, assignee) VALUES (?,?,?,?)",
                    (case_id, p, lc or "INTAKE", target),
                )
            prev = db.execute("SELECT hash FROM case_handover_log ORDER BY seq DESC LIMIT 1").fetchone()
            prev_hash = prev[0] if prev else ""
            h = hashlib.sha256(
                f"{prev_hash}|{case_id}|{network_id or ''}|{from_officer or ''}|{target}|{clean_note}|{actor}|{now}".encode()
            ).hexdigest()
            db.execute(
                "INSERT INTO case_handover_log (case_id, network_id, from_officer, to_officer, note, actor, at, prev_hash, hash) "
                "VALUES (?,?,?,?,?,?,?,?,?)",
                (case_id, network_id, from_officer, target, clean_note, actor, now, prev_hash, h),
            )
            db.commit()
        entry = {
            "case_id": case_id,
            "network_id": network_id,
            "from_officer": from_officer,
            "to_officer": target,
            "note": clean_note,
            "actor": actor,
            "at": now,
            "hash": h,
        }
        return {"handover": entry, "history": self.handover_history(case_id, network_id=network_id)}

    def handover_history(self, case_id: str, *, network_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with closing(self._db()) as db:
            self._ensure_handover_schema(db)
            if network_id:
                rows = db.execute(
                    "SELECT seq, case_id, network_id, from_officer, to_officer, note, actor, at, hash "
                    "FROM case_handover_log WHERE case_id = ? AND network_id = ? ORDER BY seq DESC",
                    (case_id, network_id),
                ).fetchall()
            else:
                rows = db.execute(
                    "SELECT seq, case_id, network_id, from_officer, to_officer, note, actor, at, hash "
                    "FROM case_handover_log WHERE case_id = ? ORDER BY seq DESC",
                    (case_id,),
                ).fetchall()
        return [
            {
                "seq": r[0], "case_id": r[1], "network_id": r[2], "from_officer": r[3],
                "to_officer": r[4], "note": r[5] or "", "actor": r[6], "at": r[7], "hash": r[8],
            }
            for r in rows
        ]

    def network_assignees(self, case_id: str) -> Dict[str, str]:
        with closing(self._db()) as db:
            self._ensure_handover_schema(db)
            rows = db.execute("SELECT network_id, assignee FROM network_assignees WHERE case_id = ?", (case_id,)).fetchall()
        return {r[0]: r[1] for r in rows if r[1]}

    def merge_ncrp_details(self, case_id: str, complaint: Dict[str, Any]) -> None:
        """Attach verified NCRP complaint fields onto the case's victim record when present, without inventing blanks."""
        with closing(self._db()) as db:
            row = db.execute("SELECT details_json FROM case_registry WHERE case_id = ?", (case_id,)).fetchone()
            if not row:
                return
            details = json.loads(row[0] or "{}")
            if complaint.get("ack_no") and not details.get("ncrp_ack_no"):
                details["ncrp_ack_no"] = complaint["ack_no"]
            if complaint.get("victim_name") and not details.get("complainant_name"):
                details["complainant_name"] = complaint["victim_name"]
            if complaint.get("phone") and not details.get("complainant_phone"):
                details["complainant_phone"] = complaint["phone"]
            if complaint.get("account_vpa") and not details.get("complainant_account"):
                details["complainant_account"] = complaint["account_vpa"]
            if complaint.get("typology") and not details.get("typology"):
                details["typology"] = complaint["typology"]
            if complaint.get("amount_inr") and not details.get("claimed_loss_inr"):
                details["claimed_loss_inr"] = complaint["amount_inr"]
            if complaint.get("complaint_ts") and not details.get("complaint_ts"):
                details["complaint_ts"] = complaint["complaint_ts"]
            db.execute("UPDATE case_registry SET details_json = ? WHERE case_id = ?", (json.dumps(details), case_id))
            db.commit()

    def set_case(self, case_id: str, project_id: Optional[str] = None, lifecycle: Optional[str] = None,
                 assignee: Optional[str] = None, *, link: bool = False) -> Dict[str, Any]:
        """Upsert one case's project / lifecycle / assignee. `link` = set project_id even when moving."""
        if link and not self.get(project_id):
            raise KeyError(project_id)
        if lifecycle is not None and lifecycle not in LIFECYCLE:
            raise ValueError(f"Lifecycle must be one of {', '.join(LIFECYCLE)}.")
        cur = self.case_meta(case_id)
        new = (project_id if link else cur["project_id"], lifecycle or cur["lifecycle"],
               cur["assignee"] if assignee is None else (assignee.strip()[:120] or None))
        with closing(self._db()) as db:
            db.execute("INSERT OR REPLACE INTO case_meta VALUES (?,?,?,?)", (case_id, *new))
            db.commit()
        return self.case_meta(case_id)

    # Cases created in TARKA (not seeded): the creator gets access; title shown in pickers.
    def register_case(self, owner_id: str, title: str = "", project_id: Optional[str] = None,
                      details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if project_id and not self.get(project_id):
            raise KeyError(project_id)
        case_id = f"CASE-{time.strftime('%Y')}-{uuid.uuid4().hex[:8].upper()}"
        with closing(self._db()) as db:
            db.execute("INSERT INTO case_registry (case_id, title, owner_id, created_at, details_json) VALUES (?,?,?,?,?)",
                       (case_id, title.strip()[:160], owner_id, time.time(), json.dumps(details or {})))
            db.commit()
        self.set_case(case_id, project_id, "INTAKE", link=bool(project_id))
        return self.registered(case_id)

    def registered(self, case_id: str) -> Optional[Dict[str, Any]]:
        with closing(self._db()) as db:
            row = db.execute("SELECT case_id, title, owner_id, created_at, details_json FROM case_registry WHERE case_id = ?",
                             (case_id,)).fetchone()
        if not row:
            return None
        return {"case_id": row[0], "title": row[1], "owner_id": row[2], "created_at": row[3],
                "details": json.loads(row[4] or "{}"), **{
            k: v for k, v in self.case_meta(case_id).items() if k != "case_id"}}

    def all_cases(self) -> List[Dict[str, Any]]:
        """Every case TARKA knows locally: registered, in a project, or with status set (two queries, not two per case)."""
        with closing(self._db()) as db:
            reg = {r[0]: r for r in db.execute("SELECT case_id, title, owner_id, created_at, details_json FROM case_registry")}
            meta = {r[0]: r for r in db.execute("SELECT case_id, project_id, lifecycle, assignee FROM case_meta")}
        out = []
        for cid in sorted(reg.keys() | meta.keys()):
            m = meta.get(cid)
            fields = {"project_id": m[1] if m else None, "lifecycle": (m[2] if m else None) or "INTAKE",
                      "assignee": m[3] if m else None}
            r = reg.get(cid)
            out.append({"case_id": cid, "title": r[1], "owner_id": r[2], "created_at": r[3],
                        "details": json.loads(r[4] or "{}"), **fields} if r else
                       {"case_id": cid, "title": "", "owner_id": None, "created_at": None, **fields})
        return out

    def case_ids(self, project_id: str) -> set:
        p = self.get(project_id)
        return {c["case_id"] for c in p["cases"]} if p else set()
