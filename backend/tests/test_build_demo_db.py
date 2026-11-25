"""build_demo_db: clean state, backs up (never deletes) old data, re-run is idempotent."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
import build_demo_db  # noqa: E402

from app.services.ingestion.large_evidence_engine import IngestionJobManager  # noqa: E402
from app.services.ingestion.projects_store import ProjectsStore  # noqa: E402


def _state(d):
    s = ProjectsStore(d)
    cases = [c["case_id"] for c in s.all_cases()]
    return [p["name"] for p in s.list()], cases


def test_build_clean_and_idempotent(tmp_path, monkeypatch):
    monkeypatch.setattr(IngestionJobManager, "_instance", None)
    d = tmp_path / "ingestion"
    d.mkdir()
    (d / "stray.txt").write_text("old data")
    args = ["--rows", "3000", "--data-dir", str(d)]
    assert build_demo_db.main(args + ["--dry-run"]) == 0 and (d / "stray.txt").exists()
    assert build_demo_db.main(args) == 0
    backups = list(tmp_path.glob("_backup_*/ingestion/stray.txt"))
    assert len(backups) == 1  # old data moved, not deleted
    names1, cases1 = _state(d)
    assert names1 == ["Operation Jamtara"]
    assert 1 <= len(cases1) <= 5 and not (d / "stray.txt").exists()
    mgr = IngestionJobManager(base_dir=d)
    seals = [e for e in mgr.custody_events(cases1[0]) if e["action"] == "Evidence sealed"]
    assert len(seals) == len({e["job_id"] for e in seals})
    # second run on top of existing data: same shape
    import time; time.sleep(1.1)  # distinct backup folder name
    assert build_demo_db.main(args) == 0
    names2, cases2 = _state(d)
    assert names2 == names1 and len(cases2) == len(cases1)
