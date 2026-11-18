"""Scale Lab: run the planted-gang validation (backend/tools/validate_mule_scoring.py) and list past runs.

Every figure the Benchmark screen shows comes from a run recorded here; the data is synthetic by design.
"""

from __future__ import annotations

import asyncio
import importlib.util
import json
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.ingestion_api import get_current_user
from app.domain.auth import UserIdentity

router = APIRouter()

_TOOL = Path(__file__).resolve().parents[2] / "tools" / "validate_mule_scoring.py"
_OUT = Path("data/validation/scale_lab")
_LOG = _OUT / "runs.jsonl"
_lock = threading.Lock()


def _load_tool():
    spec = importlib.util.spec_from_file_location("validate_mule_scoring", _TOOL)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


def _read_runs() -> List[Dict[str, Any]]:
    if not _LOG.exists():
        return []
    runs = []
    for line in _LOG.read_text(encoding="utf-8").splitlines():
        try:
            runs.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return runs[::-1]  # newest first


def _run(rows: int, gangs: int) -> Dict[str, Any]:
    if not _lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="A validation run is already in progress.")
    try:
        report = _load_tool().main(["--rows", str(rows), "--gangs", str(gangs), "--out", str(_OUT)])
        report = {**report, "gangs": gangs, "synthetic": True, "ran_at": datetime.now(UTC).isoformat(), "tool": "backend/tools/validate_mule_scoring.py"}
        _OUT.mkdir(parents=True, exist_ok=True)
        with _LOG.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(report) + "\n")
        for f in _OUT.glob(f"planted_{rows}*.csv"):  # the generated CSV is large and only needed during the run
            f.unlink(missing_ok=True)
        return report
    finally:
        _lock.release()


@router.get("/scale-runs")
def list_scale_runs(user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    return {"runs": _read_runs(), "running": _lock.locked()}


@router.post("/scale-runs")
async def start_scale_run(
    rows: int = Query(50_000, ge=5_000, le=500_000),  # shortcut: synchronous run capped at 500k rows (~15 s); move to a job queue for 1M+
    gangs: int = Query(10, ge=1, le=100),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    return await asyncio.to_thread(_run, rows, gangs)
