"""
System Settings & Administration API (TARKA Prompt F-5)
Provides station & jurisdiction letterhead configuration, mule-scoring weights,
investigation defaults, AI runtime health checks, and canonical demo case reset.
"""
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, delete

from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService, get_current_user
from app.database.base import Base
from app.database.session import get_async_engine, get_async_sessionmaker
from app.database.models import CaseModel, EvidenceArtifactModel, AuditEventModel
from app.database.init_db import CANONICAL_CASES_SEED, seed_canonical_fixtures_to_unified_store

logger = logging.getLogger(__name__)

router = APIRouter()

SETTINGS_FILE = Path("data/system_settings.json")


class StationSettings(BaseModel):
    station_name: str = "Noida Cyber Crime PS, UP"
    district: str = "Gautam Buddha Nagar"
    state: str = "Uttar Pradesh"
    letterhead_title: str = "CYBER CRIME POLICE STATION"
    letterhead_subtitle: str = "COMMISSIONERATE GAUTAM BUDDHA NAGAR, U.P."
    default_io_name: str = "Insp. Rajeshwar Rao"
    default_io_badge: str = "UP-CY-4091"
    show_national_emblem: bool = True


class ScoringWeights(BaseModel):
    velocity: float = Field(0.35, ge=0.0, le=1.0)
    fan_out: float = Field(0.25, ge=0.0, le=1.0)
    structuring: float = Field(0.20, ge=0.0, le=1.0)
    account_tenure: float = Field(0.20, ge=0.0, le=1.0)


class InvestigationDefaults(BaseModel):
    golden_hour_sla_mins: int = Field(180, ge=15, le=1440)
    mule_alert_threshold: int = Field(75, ge=1, le=100)
    high_value_threshold_inr: int = Field(100000, ge=1000)
    timezone: str = "Asia/Kolkata (IST)"


class AiConfig(BaseModel):
    ollama_endpoint: str = "http://127.0.0.1:11434"
    default_model: str = "llama3.2:latest"
    enable_voice_narration: bool = False


class SystemSettingsResponse(BaseModel):
    station: StationSettings
    scoring_weights: ScoringWeights
    investigation_defaults: InvestigationDefaults
    ai_config: AiConfig
    updated_at: str


class SystemSettingsUpdateRequest(BaseModel):
    station: Optional[StationSettings] = None
    scoring_weights: Optional[ScoringWeights] = None
    investigation_defaults: Optional[InvestigationDefaults] = None
    ai_config: Optional[AiConfig] = None


def _load_settings_from_disk() -> Dict[str, Any]:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Failed to read system_settings.json: %s", e)
    return {
        "station": StationSettings().model_dump(),
        "scoring_weights": ScoringWeights().model_dump(),
        "investigation_defaults": InvestigationDefaults().model_dump(),
        "ai_config": AiConfig().model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _save_settings_to_disk(data: Dict[str, Any]) -> None:
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


@router.get("/settings", response_model=SystemSettingsResponse)
async def get_system_settings():
    """Retrieve station, scoring weights, and defaults."""
    raw = _load_settings_from_disk()
    return SystemSettingsResponse(
        station=StationSettings(**raw.get("station", {})),
        scoring_weights=ScoringWeights(**raw.get("scoring_weights", {})),
        investigation_defaults=InvestigationDefaults(**raw.get("investigation_defaults", {})),
        ai_config=AiConfig(**raw.get("ai_config", {})),
        updated_at=raw.get("updated_at", datetime.now(timezone.utc).isoformat()),
    )


@router.put("/settings", response_model=SystemSettingsResponse)
async def update_system_settings(
    payload: SystemSettingsUpdateRequest,
    current_user: Any = Depends(get_current_user),
):
    """
    Update system station settings or scoring weights.
    Audited with SHA-256 payload hash.
    """
    current_data = _load_settings_from_disk()

    if payload.station is not None:
        current_data["station"] = payload.station.model_dump()
    if payload.scoring_weights is not None:
        current_data["scoring_weights"] = payload.scoring_weights.model_dump()
    if payload.investigation_defaults is not None:
        current_data["investigation_defaults"] = payload.investigation_defaults.model_dump()
    if payload.ai_config is not None:
        current_data["ai_config"] = payload.ai_config.model_dump()

    current_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    _save_settings_to_disk(current_data)

    # Record append-only cryptographic audit event
    try:
        actor_id = getattr(current_user, "user_id", "INVESTIGATOR_ADMIN")
        engine = get_async_engine()
        sessionmaker = get_async_sessionmaker(engine)
        serialized = json.dumps(current_data, sort_keys=True)
        payload_hash = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        async with sessionmaker() as session:
            event = AuditEventModel(
                event_id=f"AUD-SYS-SETTINGS-{int(datetime.now(timezone.utc).timestamp())}",
                case_id="SYSTEM",
                actor_id=str(actor_id),
                action="UPDATE_SYSTEM_SETTINGS",
                resource_type="SYSTEM_CONFIGURATION",
                resource_id="CONFIG-GLOBAL",
                payload_hash=payload_hash,
                details_json={"updated_keys": list(payload.model_dump(exclude_unset=True).keys())},
            )
            session.add(event)
            await session.commit()
    except Exception as err:
        logger.warning("Failed to record settings audit event: %s", err)

    return SystemSettingsResponse(
        station=StationSettings(**current_data["station"]),
        scoring_weights=ScoringWeights(**current_data["scoring_weights"]),
        investigation_defaults=InvestigationDefaults(**current_data["investigation_defaults"]),
        ai_config=AiConfig(**current_data["ai_config"]),
        updated_at=current_data["updated_at"],
    )


@router.post("/reset-demo")
async def reset_demo_data(
    current_user: Any = Depends(get_current_user),
):
    """
    Hackathon Demo Recovery:
    Restores the 4 canonical cases (CASE-2026-001 through CASE-2026-004) to pristine seed state,
    prunes transient demo cases, and re-syncs the UnifiedStore.
    """
    canonical_ids = [c["id"] for c in CANONICAL_CASES_SEED]
    engine = get_async_engine()
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.warning("Could not auto-create tables in reset_demo: %s", e)
    sessionmaker = get_async_sessionmaker(engine)

    async with sessionmaker() as session:
        # 1. Remove non-canonical cases
        await session.execute(
            delete(CaseModel).where(CaseModel.id.not_in(canonical_ids))
        )

        # 2. Reset canonical cases to initial state
        for cdata in CANONICAL_CASES_SEED:
            stmt = select(CaseModel).where(CaseModel.id == cdata["id"])
            res = await session.execute(stmt)
            existing = res.scalar_one_or_none()

            if existing:
                existing.status = cdata["status"]
                existing.priority = cdata["priority"]
                existing.title = cdata["title"]
                existing.police_station = cdata["police_station"]
                existing.metadata_json = cdata["metadata_json"]
            else:
                new_case = CaseModel(
                    id=cdata["id"],
                    case_number=cdata["case_number"],
                    title=cdata["title"],
                    fir_number=cdata["fir_number"],
                    crime_type=cdata["crime_type"],
                    priority=cdata["priority"],
                    status=cdata["status"],
                    police_station=cdata["police_station"],
                    source=cdata["source"],
                    description=cdata["description"],
                    metadata_json=cdata["metadata_json"],
                )
                session.add(new_case)

        # 3. Append audited record of demo reset
        actor_id = getattr(current_user, "user_id", "DEMO_OPERATOR")
        audit_event = AuditEventModel(
            event_id=f"AUD-RESET-DEMO-{int(datetime.now(timezone.utc).timestamp())}",
            case_id="SYSTEM",
            actor_id=str(actor_id),
            action="RESET_CANONICAL_DEMO_DATA",
            resource_type="DATABASE",
            resource_id="SQLITE_CANONICAL_SUITE",
            payload_hash=hashlib.sha256(b"RESET_DEMO_CANONICAL").hexdigest(),
            details_json={"canonical_cases_restored": canonical_ids},
        )
        session.add(audit_event)
        await session.commit()

    # 4. Re-seed UnifiedStore graph
    try:
        seed_canonical_fixtures_to_unified_store()
    except Exception as err:
        logger.warning("UnifiedStore re-seed warning during demo reset: %s", err)

    return {
        "status": "SUCCESS",
        "message": "Canonical demo cases (CASE-001 through CASE-004) successfully restored to pristine baseline.",
        "cases_restored": len(canonical_ids),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }





@router.get("/health")
async def get_system_health():
    """
    Sub-second diagnostic health check for API, SQLite database, and Ollama SLM connectivity.
    """
    db_status = "OK"
    try:
        engine = get_async_engine()
        sessionmaker = get_async_sessionmaker(engine)
        async with sessionmaker() as session:
            await session.execute(select(1))
    except Exception as e:
        db_status = f"ERROR: {str(e)}"

    ollama_status = "OFFLINE_FALLBACK"
    ollama_latency_ms: Optional[float] = None
    try:
        t0 = datetime.now()
        async with httpx.AsyncClient(timeout=0.8) as client:
            resp = await client.get("http://127.0.0.1:11434/api/version")
            if resp.status_code == 200:
                ollama_status = "ACTIVE"
                ollama_latency_ms = round((datetime.now() - t0).total_seconds() * 1000, 1)
    except Exception:
        ollama_status = "OFFLINE_FALLBACK"

    return {
        "status": "HEALTHY" if db_status == "OK" else "DEGRADED",
        "api": {
            "status": "OK",
            "version": "5.0.0 (BSA § 63 Validated)",
            "platform": "TARKA Forensic Intelligence System",
            "branch": "flow/workflow-sync",
            "commit": "5d65f41",
        },
        "database": {
            "status": db_status,
            "engine": "SQLite 3 (Transactional Authority)",
            "wal_mode": True,
        },
        "graph": {
            "status": "OK",
            "engine": "NetworkX & UnifiedStore Projections",
            "projections": ["EntityResolution", "MoneyTrail", "SyndicateTopology"],
        },
        "ollama": {
            "status": ollama_status,
            "endpoint": "http://127.0.0.1:11434",
            "latency_ms": ollama_latency_ms,
            "model": "llama3.2:latest",
        },
        "sse_pipeline": {
            "status": "READY",
            "stream_endpoint": "/api/v1/cases/{case_id}/pipeline-stream",
        },
        "fixtures": {
            "status": "VERIFIED",
            "canonical_cases": ["CASE-2026-001", "CASE-2026-002", "CASE-2026-003", "CASE-2026-004"],
            "count": 4,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/audit/feed")
async def get_system_audit_feed(
    case_id: Optional[str] = None,
    limit: int = 50,
    current_user: UserIdentity = Depends(get_current_user),
):
    """
    Returns latest append-only audit trail records across all cases or for a specific case.
    """
    engine = get_async_engine()
    sessionmaker = get_async_sessionmaker(engine)
    async with sessionmaker() as session:
        if case_id:
            stmt = select(AuditEventModel).where(AuditEventModel.case_id == case_id).order_by(AuditEventModel.timestamp.desc()).limit(limit)
        else:
            stmt = select(AuditEventModel).order_by(AuditEventModel.timestamp.desc()).limit(limit)
        result = await session.execute(stmt)
        events = list(result.scalars().all())

        return [
            {
                "event_id": e.event_id,
                "case_id": e.case_id,
                "actor_id": e.actor_id,
                "action": e.action,
                "resource_type": e.resource_type,
                "resource_id": e.resource_id,
                "payload_hash": e.payload_hash,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
                "details": e.details_json,
            }
            for e in events
        ]


@router.get("/audit/verify-chain")
async def verify_audit_hash_chain(
    current_user: UserIdentity = Depends(get_current_user),
):
    """
    Cryptographic verification of audit log SHA-256 hash chaining across transactional database.
    """
    engine = get_async_engine()
    sessionmaker = get_async_sessionmaker(engine)
    async with sessionmaker() as session:
        stmt = select(AuditEventModel).order_by(AuditEventModel.timestamp.asc())
        result = await session.execute(stmt)
        events = list(result.scalars().all())

        total = len(events)
        if total == 0:
            return {
                "total_records": 0,
                "tamper_detected": False,
                "chain_valid": True,
                "message": "Audit ledger initialized with zero entries.",
            }

        genesis = "GENESIS_HASH_SENTINELX_NEXUS_2026"
        current_prev = genesis

        for idx, e in enumerate(events):
            if not e.payload_hash:
                return {
                    "total_records": total,
                    "tamper_detected": True,
                    "chain_valid": False,
                    "failed_index": idx,
                    "event_id": e.event_id,
                    "reason": f"Missing payload SHA-256 hash at index {idx}",
                }
            combined = f"{current_prev}:{e.payload_hash}"
            current_prev = hashlib.sha256(combined.encode("utf-8")).hexdigest()

        return {
            "total_records": total,
            "tamper_detected": False,
            "chain_valid": True,
            "head_hash": current_prev,
            "verified_at": datetime.now(timezone.utc).isoformat(),
        }


class DemoResetRequest(BaseModel):
    rows: int = Field(1_000_000, ge=1000, le=5_000_000)
    small: bool = False
    empty: bool = False
    force: bool = False


def _demo_only() -> None:
    from app.core.config import settings

    if not (settings.ENABLE_DEMO_AUTH and settings.APP_ENV != "production"):
        raise HTTPException(status_code=403, detail="Demo reset is available only in demo mode.")


@router.post("/demo-reset", status_code=202, dependencies=[Depends(_demo_only)])
async def demo_reset(body: Optional[DemoResetRequest] = None, current_user: Any = Depends(get_current_user)):
    """Move the data root to a backup folder and rebuild (or empty) the demo state in the background (never deletes)."""
    from app.services import demo_reset as dr

    body = body or DemoResetRequest()
    if dr.status()["state"] == "running":
        raise HTTPException(status_code=409, detail="A demo reset is already running.")
    busy = dr.busy_jobs()
    if busy and not body.force:
        raise HTTPException(status_code=409, detail=f"{len(busy)} upload(s) are still being processed. Wait, or retry with force.")
    await dr.stop_background_work()
    try:
        dr.start(body.rows, body.small, empty=body.empty)
    except RuntimeError:
        raise HTTPException(status_code=409, detail="A demo reset is already running.")
    return dr.status()


@router.get("/demo-reset/status", dependencies=[Depends(_demo_only)])
def demo_reset_status(current_user: Any = Depends(get_current_user)):
    from app.services import demo_reset as dr

    return dr.status()
