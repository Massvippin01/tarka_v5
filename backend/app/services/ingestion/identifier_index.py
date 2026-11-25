"""Global identifier index: (kind, value, case_id) for every case's derived.sqlite, so cross-case lookups hit one table.

Kept beside the other ingestion stores (data/ingestion/identifier_index.sqlite). A case is re-read only when its
derived.sqlite (or WAL) stat signature differs from the one recorded at the last read, so it also repairs itself
after any writer that does not call refresh_case (copy_rows, restores, manual edits).
"""

from __future__ import annotations

import sqlite3
import threading
from collections import defaultdict
from contextlib import closing
from pathlib import Path
from typing import Dict, List

_SCHEMA = """
CREATE TABLE IF NOT EXISTS ident (kind TEXT NOT NULL, value TEXT NOT NULL, case_id TEXT NOT NULL,
                                  PRIMARY KEY (kind, value, case_id)) WITHOUT ROWID;
CREATE INDEX IF NOT EXISTS ident_case ON ident(case_id);
CREATE TABLE IF NOT EXISTS ident_state (case_id TEXT PRIMARY KEY, sig TEXT NOT NULL);
"""
_LOCK = threading.Lock()


def file_sig(db_path: Path) -> tuple:
    """Changes when a SQLite file's content does. The WAL counts only while it holds data: opening and closing a
    connection creates and deletes an empty -wal file, which must not look like a change."""
    out = []
    for q, only_if_data in ((db_path, False), (db_path.with_name(db_path.name + "-wal"), True)):
        try:
            st = q.stat()
            out.append(None if only_if_data and st.st_size == 0 else (st.st_mtime_ns, st.st_size))
        except OSError:
            out.append(None)
    return tuple(out)


def _sig(db_path: Path) -> str:
    return repr(file_sig(db_path))


class IdentifierIndex:
    def __init__(self, derived_dir: Path):
        self.derived_dir = derived_dir
        self.path = derived_dir.parent / "identifier_index.sqlite"
        with closing(self._db()) as db:
            db.executescript(_SCHEMA)

    def _db(self) -> sqlite3.Connection:
        db = sqlite3.connect(self.path, timeout=30)
        db.execute("PRAGMA journal_mode=WAL")
        db.execute("PRAGMA synchronous=NORMAL")
        return db

    def _reindex(self, db: sqlite3.Connection, case_id: str, src: Path) -> None:
        db.execute("DELETE FROM ident WHERE case_id = ?", (case_id,))
        try:
            with closing(sqlite3.connect(f"file:{src.as_posix()}?mode=ro", uri=True)) as case_db:
                rows = case_db.execute("SELECT DISTINCT kind, value FROM identifiers").fetchall()
        except sqlite3.Error:
            rows = []
        db.executemany("INSERT OR IGNORE INTO ident VALUES (?,?,?)", ((k, v, case_id) for k, v in rows))
        db.execute("INSERT OR REPLACE INTO ident_state VALUES (?,?)", (case_id, _sig(src)))

    def sync(self, only: str | None = None) -> None:
        """Bring the index up to date: re-read cases whose derived.sqlite changed, drop cases that are gone."""
        present = {d.name: d / "derived.sqlite" for d in self.derived_dir.iterdir()
                   if d.is_dir() and (d / "derived.sqlite").exists()}
        with _LOCK, closing(self._db()) as db:
            known = dict(db.execute("SELECT case_id, sig FROM ident_state"))
            todo = [c for c, p in present.items() if (only is None or c == only) and known.get(c) != _sig(p)]
            gone = [c for c in known if c not in present] if only is None else []
            if not todo and not gone:
                return
            db.execute("BEGIN IMMEDIATE")
            for c in gone:
                db.execute("DELETE FROM ident WHERE case_id = ?", (c,))
                db.execute("DELETE FROM ident_state WHERE case_id = ?", (c,))
            for c in todo:
                self._reindex(db, c, present[c])
            db.commit()

    def refresh_case(self, case_id: str) -> None:
        self.sync(only=case_id)

    def lookup(self, mine: set, exclude_case: str) -> Dict[tuple, List[str]]:
        """{(kind, value): [other case ids]} for the identifiers in `mine`."""
        self.sync()
        found: Dict[tuple, List[str]] = defaultdict(list)
        if not mine:
            return found
        with closing(self._db()) as db:
            db.execute("CREATE TEMP TABLE mine (kind TEXT, value TEXT, PRIMARY KEY (kind, value))")
            db.executemany("INSERT OR IGNORE INTO mine VALUES (?,?)", list(mine))
            for k, v, c in db.execute(
                "SELECT i.kind, i.value, i.case_id FROM mine m JOIN ident i ON i.kind = m.kind AND i.value = m.value "
                "WHERE i.case_id <> ?", (exclude_case,)):
                found[(k, v)].append(c)
        return found

    def shared(self) -> Dict[tuple, List[str]]:
        """Every identifier held by two or more cases, {(kind, value): [case ids]}: one pass for a whole-station sweep."""
        self.sync()
        out: Dict[tuple, List[str]] = {}
        with closing(self._db()) as db:
            for k, v, cases in db.execute(
                "SELECT kind, value, GROUP_CONCAT(case_id, char(31)) FROM ident GROUP BY kind, value HAVING COUNT(*) > 1"):
                out[(k, v)] = cases.split("")
        return out
