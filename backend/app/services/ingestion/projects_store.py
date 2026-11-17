"""Projects (operations) and per-case lifecycle/assignee.

shortcut: a SQLite file beside the ingestion job table (single backend process); move to the main DB for multi-node.
"""

from __future__ import annotations

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

    def _db(self) -> sqlite3.Connection:
        return sqlite3.connect(self.path)

    def list(self) -> List[Dict[str, Any]]:
        with closing(self._db()) as db:
            projects = db.execute(
                "SELECT project_id, name, description, archived, created_at FROM projects ORDER BY created_at DESC"
            ).fetchall()
            cases = db.execute("SELECT case_id, project_id, lifecycle, assignee FROM case_meta ORDER BY case_id").fetchall()
        out = []
        for pid, name, desc, archived, created in projects:
            out.append({
                "project_id": pid, "name": name, "description": desc or "", "archived": bool(archived),
                "created_at": created,
                "cases": [{"case_id": c, "lifecycle": lc, "assignee": a} for c, p, lc, a in cases if p == pid],
            })
        return out

    def get(self, project_id: str) -> Optional[Dict[str, Any]]:
        return next((p for p in self.list() if p["project_id"] == project_id), None)

    def create(self, name: str, description: str = "") -> Dict[str, Any]:
        name = name.strip()
        if not name:
            raise ValueError("Project name is required.")
        pid = f"PRJ-{uuid.uuid4().hex[:8].upper()}"
        with closing(self._db()) as db:
            db.execute("INSERT INTO projects VALUES (?,?,?,0,?)", (pid, name[:120], description[:2000], time.time()))
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

    def case_meta(self, case_id: str) -> Dict[str, Any]:
        with closing(self._db()) as db:
            row = db.execute("SELECT project_id, lifecycle, assignee FROM case_meta WHERE case_id = ?", (case_id,)).fetchone()
        p, lc, a = row or (None, "INTAKE", None)
        return {"case_id": case_id, "project_id": p, "lifecycle": lc or "INTAKE", "assignee": a}

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
    def register_case(self, owner_id: str, title: str = "", project_id: Optional[str] = None) -> Dict[str, Any]:
        if project_id and not self.get(project_id):
            raise KeyError(project_id)
        case_id = f"CASE-{time.strftime('%Y')}-{uuid.uuid4().hex[:6].upper()}"
        with closing(self._db()) as db:
            db.execute("INSERT INTO case_registry VALUES (?,?,?,?)", (case_id, title.strip()[:160], owner_id, time.time()))
            db.commit()
        self.set_case(case_id, project_id, "INTAKE", link=bool(project_id))
        return self.registered(case_id)

    def registered(self, case_id: str) -> Optional[Dict[str, Any]]:
        with closing(self._db()) as db:
            row = db.execute("SELECT case_id, title, owner_id, created_at FROM case_registry WHERE case_id = ?",
                             (case_id,)).fetchone()
        if not row:
            return None
        return {"case_id": row[0], "title": row[1], "owner_id": row[2], "created_at": row[3], **{
            k: v for k, v in self.case_meta(case_id).items() if k != "case_id"}}

    def all_cases(self) -> List[Dict[str, Any]]:
        """Every case TARKA knows locally: registered, in a project, or with status set."""
        with closing(self._db()) as db:
            ids = [r[0] for r in db.execute(
                "SELECT case_id FROM case_registry UNION SELECT case_id FROM case_meta ORDER BY 1")]
        out = []
        for cid in ids:
            reg = self.registered(cid)
            out.append(reg or {"case_id": cid, "title": "", "owner_id": None, "created_at": None,
                               **{k: v for k, v in self.case_meta(cid).items() if k != "case_id"}})
        return out

    def case_ids(self, project_id: str) -> set:
        p = self.get(project_id)
        return {c["case_id"] for c in p["cases"]} if p else set()
