"""Demo reset: move the live data root to a backup, rebuild the demo state, and make the running server follow it.

Nothing is deleted. All sqlite stores under the data root are opened per call (closing(...)), so no connection
outlives a request; what a running process does hold is the IngestionJobManager singleton (job table + pipeline
tasks) and a few in-memory caches, which are dropped here before the move and again after the rebuild.
"""
from __future__ import annotations

import asyncio
import os
import sys
import threading
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

_TOOLS = Path(__file__).resolve().parents[3] / "backend" / "tools"
_LOCK = threading.Lock()
_STATE: Dict[str, Any] = {"state": "idle", "step": None, "started_at": None, "finished_at": None,
                          "backup_path": None, "summary": None, "error": None}


def status() -> Dict[str, Any]:
    with _LOCK:
        out = dict(_STATE)
    root = _data_root()
    out["backups"] = [str(p) for p in sorted(root.parent.glob("_backup_*"), reverse=True)[:3]]
    return out


def _data_root() -> Path:
    return Path(os.environ.get("TARKA_INGESTION_DIR") or "data/ingestion")


def _set(**kw: Any) -> None:
    with _LOCK:
        _STATE.update(kw)


def busy_jobs() -> List[str]:
    from app.services.ingestion.large_evidence_engine import IngestionJobManager
    mgr = IngestionJobManager._instance
    if mgr is None:
        return []
    done = IngestionJobManager._TERMINAL
    return [j.job_id for j in mgr.jobs.values() if j.stage.value not in done and not j.is_cancelled]


def drop_caches() -> None:
    from app.api import case as case_api
    from app.services.ingestion import station_summary
    from app.services.ingestion.large_evidence_engine import IngestionJobManager
    station_summary._CACHE.clear()
    case_api._BUNDLE_CACHE.clear()
    IngestionJobManager._instance = None


async def stop_background_work() -> None:
    """Cancel running ingestion pipelines (on the event loop) and wait briefly for them to unwind."""
    from app.services.ingestion.large_evidence_engine import IngestionJobManager
    mgr = IngestionJobManager._instance
    tasks = list(mgr._tasks) if mgr else []
    for t in tasks:
        t.cancel()
    if tasks:
        await asyncio.wait(tasks, timeout=15)
    drop_caches()


def start(rows: int, small: bool, empty: bool = False) -> None:
    """Claim the single reset slot and run the rebuild (or clean empty wipe) in a thread. Raises RuntimeError if one is running."""
    with _LOCK:
        if _STATE["state"] == "running":
            raise RuntimeError("running")
        _STATE.update(state="running", step="Starting", started_at=time.time(), finished_at=None,
                      backup_path=None, summary=None, error=None)
    threading.Thread(target=_run, args=(rows, small, empty), name="demo-reset", daemon=True).start()


def _run(rows: int, small: bool, empty: bool = False) -> None:
    root = _data_root()
    try:
        if str(_TOOLS) not in sys.path:
            sys.path.insert(0, str(_TOOLS))
        import build_demo_db
        step = lambda s: _set(step=s)  # noqa: E731
        if empty:
            t0 = time.perf_counter()
            step("Moving current data to a backup folder")
            backup = build_demo_db.backup_existing(root)
            root.mkdir(parents=True, exist_ok=True)
            os.environ["TARKA_INGESTION_DIR"] = str(root)
            summary: Dict[str, Any] = {
                "projects": [],
                "cases": [],
                "demo_case_id": None,
                "rows": 0,
                "networks": 0,
                "mules": 0,
                "empty": True,
                "seconds": round(time.perf_counter() - t0, 1),
                "backup_path": str(backup) if backup else None,
            }
        else:
            n = build_demo_db.SMALL_ROWS if small else rows
            summary = build_demo_db.build_demo(root, n, log=lambda *a: None, step=step)
        step("Refreshing the running server")
        drop_caches()  # next request builds a manager on the new data
        from app.services.ingestion.large_evidence_engine import IngestionJobManager
        IngestionJobManager.get_instance()
        _set(state="done", step="Done", finished_at=time.time(), summary=summary, backup_path=summary.get("backup_path"))
    except Exception as exc:  # noqa: BLE001
        drop_caches()
        backups = sorted(root.parent.glob("_backup_*"), reverse=True)
        _set(state="failed", finished_at=time.time(), error=f"{type(exc).__name__}: {exc}",
             backup_path=str(backups[0]) if backups else None)
