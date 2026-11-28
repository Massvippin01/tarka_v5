"""POST /api/v1/system/demo-reset: moves data to a backup, rebuilds, single-flight, demo mode only."""
import time

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app
from app.services import demo_reset
from app.services.auth_service import AuthService
from app.services.ingestion.large_evidence_engine import IngestionJobManager
from app.services.ingestion.projects_store import ProjectsStore


@pytest.fixture
def client(tmp_path, monkeypatch):
    d = tmp_path / "ingestion"
    d.mkdir()
    (d / "stray.txt").write_text("old data")
    monkeypatch.setenv("TARKA_INGESTION_DIR", str(d))
    monkeypatch.setattr(IngestionJobManager, "_instance", None)
    monkeypatch.setattr(settings, "ENABLE_DEMO_AUTH", True)
    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setitem(demo_reset._STATE, "state", "idle")
    # shrink the build: the endpoint's small flag is covered by SMALL_ROWS, patched down for speed
    import sys
    sys.path.insert(0, str(demo_reset._TOOLS))
    import build_demo_db
    monkeypatch.setattr(build_demo_db, "SMALL_ROWS", 3000)

    auth = AuthService.get_instance()
    token = auth.create_jwt_token("SUPERVISOR_NCR")
    c = TestClient(app)
    c.headers["Authorization"] = f"Bearer {token}"
    return c, d


def test_reset_moves_data_and_rebuilds(client):
    c, d = client
    r = c.post("/api/v1/system/demo-reset", json={"small": True})
    assert r.status_code == 202
    assert c.post("/api/v1/system/demo-reset", json={"small": True}).status_code == 409
    for _ in range(300):
        st = c.get("/api/v1/system/demo-reset/status").json()
        if st["state"] != "running":
            break
        time.sleep(0.5)
    assert st["state"] == "done", st
    assert list(d.parent.glob("_backup_*/ingestion/stray.txt")) and not (d / "stray.txt").exists()
    store = ProjectsStore(d)
    assert [p["name"] for p in store.list()] == ["Operation Jamtara"]
    assert st["summary"]["demo_case_id"] in [x["case_id"] for x in store.all_cases()]
    assert st["backups"] and IngestionJobManager.get_instance().base_dir == d


def test_reset_empty_clean_dashboard(client):
    c, d = client
    r = c.post("/api/v1/system/demo-reset", json={"empty": True})
    assert r.status_code == 202
    for _ in range(100):
        st = c.get("/api/v1/system/demo-reset/status").json()
        if st["state"] != "running":
            break
        time.sleep(0.1)
    assert st["state"] == "done", st
    assert list(d.parent.glob("_backup_*/ingestion/stray.txt")) and not (d / "stray.txt").exists()
    assert st["summary"]["empty"] is True
    assert st["summary"]["cases"] == []
    assert ProjectsStore(d).list() == []


def test_reset_forbidden_in_production(client, monkeypatch):
    c, d = client
    monkeypatch.setattr(settings, "APP_ENV", "production")
    assert c.post("/api/v1/system/demo-reset", json={"small": True}).status_code == 403
    assert (d / "stray.txt").exists()
