"""The global identifier index returns exactly what scanning every other case's derived.sqlite returns."""

import sqlite3
from contextlib import closing

from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.identifier_index import IdentifierIndex
from app.services.ingestion.networks import _sql_lookup


def _case(derived, case_id, idents):
    store = DerivedStore(derived / case_id)
    with closing(sqlite3.connect(store.path)) as db:
        db.execute("DELETE FROM identifiers")
        db.executemany("INSERT INTO identifiers VALUES ('j',?,?,1)", idents)
        db.commit()


def _scan(derived, me, mine):
    others = [(d.name, d / "derived.sqlite") for d in derived.iterdir() if d.name != me and (d / "derived.sqlite").exists()]
    return {k: sorted(v) for k, v in _sql_lookup(others)(mine).items()}


def test_indexed_lookup_matches_scan_and_follows_changes(tmp_path):
    derived = tmp_path / "derived"
    _case(derived, "A", [("vpa", "m1@ybl"), ("phone", "9876543210"), ("vpa", "only.a@ybl")])
    _case(derived, "B", [("vpa", "m1@ybl"), ("phone", "9876543210")])
    _case(derived, "C", [("vpa", "m1@ybl"), ("account", "123456789012")])
    index = IdentifierIndex(derived)
    mine = {("vpa", "m1@ybl"), ("phone", "9876543210"), ("account", "123456789012"), ("vpa", "nobody@ybl")}

    for me in "ABC":
        got = {k: sorted(v) for k, v in index.lookup(mine, me).items()}
        assert got == _scan(derived, me, mine)
    assert {k: sorted(v) for k, v in index.lookup(mine, "A").items()}[("vpa", "m1@ybl")] == ["B", "C"]

    _case(derived, "B", [("account", "123456789012")])  # a case's data changes behind the index's back
    assert {k: sorted(v) for k, v in index.lookup(mine, "A").items()} == _scan(derived, "A", mine)
    _case(derived, "D", [("phone", "9876543210")])  # new case appears
    assert {k: sorted(v) for k, v in index.lookup(mine, "A").items()} == _scan(derived, "A", mine)
