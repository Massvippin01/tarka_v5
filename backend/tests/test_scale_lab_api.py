"""Scale Lab endpoint: a real (small) planted-gang validation run is recorded and listed."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api import scale_lab_api
from app.api.ingestion_api import get_current_user


def test_scale_run_records_measured_report(tmp_path, monkeypatch):
    monkeypatch.setattr(scale_lab_api, "_OUT", tmp_path)
    monkeypatch.setattr(scale_lab_api, "_LOG", tmp_path / "runs.jsonl")
    app = FastAPI()
    app.include_router(scale_lab_api.router, prefix="/b")
    app.dependency_overrides[get_current_user] = lambda: object()
    c = TestClient(app)

    assert c.get("/b/scale-runs").json() == {"runs": [], "running": False}
    r = c.post("/b/scale-runs?rows=5000&gangs=3").json()
    assert r["synthetic"] is True and r["rows"] >= 5000 and r["ingest_rows_per_s"] > 0
    assert 0 <= r["precision"] <= 1 and 0 <= r["recall"] <= 1
    assert not list(tmp_path.glob("*.csv"))
    assert c.get("/b/scale-runs").json()["runs"][0]["ran_at"] == r["ran_at"]
