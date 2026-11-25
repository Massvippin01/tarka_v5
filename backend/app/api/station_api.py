"""Station overview: one lightweight summary for every case the user can open."""

from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from app.api.ingestion_api import get_current_user
from app.domain.auth import UserIdentity
from app.services.ingestion.large_evidence_engine import IngestionJobManager
from app.services.ingestion.station_summary import station_summary

router = APIRouter()  # mounted at /api/v1/station


@router.get("/summary")
async def get_station_summary(user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Per-case rows (money, golden hour, networks, mules, cross-case hits) plus station totals."""
    mgr = IngestionJobManager.get_instance()
    return await run_in_threadpool(station_summary, user, mgr.base_dir, mgr.derived_dir)
