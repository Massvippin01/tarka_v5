"""One-command clean demo database builder.

    PYTHONPATH=backend venv/Scripts/python backend/tools/build_demo_db.py [--small] [--rows N] [--dry-run]
    (data root: --data-dir, or env TARKA_INGESTION_DIR, default data/ingestion; the server reads the same env var)

Moves any existing data root to data/_backup_<timestamp>/ (never deletes), then builds:
project "Operation Jamtara" + the 50-gang case (+ NCRP complaints), CASE-2026-001..004 if
backend/tools/seed_canonical_cases.py exists, and demo_evidence_files/ocr/* uploaded via normal ingestion.
"""
from __future__ import annotations

import argparse
import asyncio
import importlib
import json
import os
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for p in (ROOT / "backend", ROOT / "backend" / "tools"):
    if str(p) not in sys.path:
        sys.path.insert(0, str(p))

PROJECT_NAME = "Operation Jamtara"
OWNER = "usr-supervisor-01"
SMALL_ROWS = 200_000


def backup_existing(data_dir: Path) -> Path | None:
    if not data_dir.exists() or not any(data_dir.iterdir()):
        return None
    dest = data_dir.parent / f"_backup_{time.strftime('%Y%m%d_%H%M%S')}" / data_dir.name
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(data_dir), str(dest))
    return dest.parent


async def _upload(mgr, case_id: str, path: Path) -> str:
    from app.services.ingestion.large_evidence_engine import MAX_CHUNK_BYTES

    data = path.read_bytes()
    job = mgr.create_job(case_id, path.name, len(data), intake_officer=OWNER)
    for off in range(0, max(len(data), 1), MAX_CHUNK_BYTES):
        await mgr.append_chunk(job.job_id, off, data[off:off + MAX_CHUNK_BYTES])
    return f"{path.name}: {job.stage.value}"


def upload_ocr_files(data_dir: Path, case_id: str) -> list[str]:
    from app.services.ingestion.large_evidence_engine import IngestionJobManager

    files = sorted(f for f in (ROOT / "demo_evidence_files" / "ocr").rglob("*") if f.is_file())
    mgr = IngestionJobManager(base_dir=data_dir)

    async def run():
        return [await _upload(mgr, case_id, f) for f in files]

    return asyncio.run(run())


def seed_canonical(data_dir: Path) -> str:
    try:
        mod = importlib.import_module("seed_canonical_cases")
    except ImportError:
        return "skipped (backend/tools/seed_canonical_cases.py not found)"
    fn = getattr(mod, "seed_canonical_cases", None) or getattr(mod, "seed", None)
    if fn:
        fn(base_dir=data_dir)
    else:  # fall back to the script's CLI
        old = sys.argv
        sys.argv = ["seed_canonical_cases", "--base-dir", str(data_dir)]
        try:
            mod.main()
        finally:
            sys.argv = old
    return "seeded CASE-2026-001..004"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Build a clean TARKA demo database.")
    ap.add_argument("--rows", type=int, default=1_000_000)
    ap.add_argument("--small", action="store_true", help=f"{SMALL_ROWS:,} rows for quick runs")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--data-dir", default=os.environ.get("TARKA_INGESTION_DIR") or "data/ingestion")
    a = ap.parse_args(argv)
    rows = SMALL_ROWS if a.small else a.rows
    data_dir = Path(a.data_dir)
    ocr_dir = ROOT / "demo_evidence_files" / "ocr"
    canon = (ROOT / "backend" / "tools" / "seed_canonical_cases.py").exists()

    print(f"Data root: {data_dir}  rows: {rows:,}")
    print(f"Plan: back up existing data root; seed '{PROJECT_NAME}' demo case; "
          f"canonical cases {'yes' if canon else 'skipped (script absent)'}; "
          f"OCR files {'yes' if ocr_dir.is_dir() else 'skipped (folder absent)'}")
    if a.dry_run:
        print("Dry run: nothing changed.")
        return 0

    t0 = time.perf_counter()
    backup = backup_existing(data_dir)
    print(f"Existing data backed up to: {backup}" if backup else "No existing data to back up.")
    os.environ["TARKA_INGESTION_DIR"] = str(data_dir)
    from app.services.ingestion.large_evidence_engine import IngestionJobManager
    IngestionJobManager._instance = None  # server-side singleton must follow the new root

    from seed_golden_hour_demo import seed_demo_workspace
    res = seed_demo_workspace(
        base_dir=data_dir,
        out_dir=data_dir.parent / "validation" / "golden_hour_demo",
        project_name=PROJECT_NAME,
        rows=rows,
        owner=OWNER,
    )
    print(f"Demo case {res['case_id']} seeded.")
    print("Canonical cases:", seed_canonical(data_dir) if canon else "skipped (seed_canonical_cases.py absent)")
    if ocr_dir.is_dir():
        print("OCR uploads:", "; ".join(upload_ocr_files(data_dir, res["case_id"])) or "no files")
    else:
        print("OCR uploads: skipped (demo_evidence_files/ocr absent)")

    from app.services.ingestion.projects_store import ProjectsStore
    store = ProjectsStore(data_dir)
    summary = {
        "projects": [p["name"] for p in store.list()],
        "cases": [c["case_id"] for c in store.all_cases()],
        "rows": res["rows_accepted"],
        "networks": res["networks_found"],
        "mules": res["mules_total"],
        "seconds": round(time.perf_counter() - t0, 1),
    }
    print("SUMMARY " + json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
