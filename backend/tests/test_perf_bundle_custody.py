"""Bundle memoised per case data version; repeated seals show as a duplicate re-upload; endpoints stay off the event loop."""

import inspect

from app.api import case as case_api
from app.api import ingestion_api, people_api, projects_api
from app.services.ingestion.large_evidence_engine import IngestionJobManager


def test_bundle_is_memoised_until_data_version_changes(tmp_path, monkeypatch):
    monkeypatch.setattr(IngestionJobManager, "_instance", IngestionJobManager(base_dir=tmp_path))
    case_api._BUNDLE_CACHE.clear()
    calls = []
    monkeypatch.setattr(case_api, "uploaded_bundle", lambda cid, rec=None: calls.append(cid) or {"caseId": cid})
    rec = {"title": "t"}
    assert case_api.cached_uploaded_bundle("CASE-X", rec) == {"caseId": "CASE-X"}
    case_api.cached_uploaded_bundle("CASE-X", rec)
    assert len(calls) == 1  # second call served from cache
    (tmp_path / "projects.sqlite").write_bytes(b"changed")  # registry / verdicts changed -> new data version
    case_api.cached_uploaded_bundle("CASE-X", rec)
    assert len(calls) == 2


def test_duplicate_seal_is_its_own_event(tmp_path):
    m = IngestionJobManager(base_dir=tmp_path)
    job = type("J", (), {"job_id": "J1", "case_id": "CASE-1"})()
    m._custody(job, "Evidence sealed", "SHA-256 abc", actor="admin")
    m._custody(job, "Evidence sealed", "SHA-256 abc", actor="usr-supervisor-01")
    m._custody(job, "Evidence sealed", "SHA-256 def", actor="admin")  # changed file: a real new seal
    acts = [(e["action"], e["actor"]) for e in m.custody_events("CASE-1")]
    assert acts == [("Evidence sealed", "admin"), ("Duplicate re-upload", "usr-supervisor-01"), ("Evidence sealed", "admin")]


def test_heavy_endpoints_are_threadpool_defs():
    for fn in (projects_api.get_networks, projects_api.list_cases, people_api.set_account_verdict, ingestion_api.case_custody):
        assert not inspect.iscoroutinefunction(fn), fn.__name__
