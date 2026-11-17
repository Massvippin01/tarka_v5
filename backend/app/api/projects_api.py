"""Projects (operations) CRUD, case lifecycle, and fraud networks per case (triage)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.ingestion_api import _checked_case_id, get_current_user
from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService
from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.large_evidence_engine import IngestionJobManager, ensure_inside
from app.services.ingestion.network_decisions import NetworkDecisionStore
from app.services.ingestion.networks import case_networks
from app.services.ingestion.projects_store import ProjectsStore

router = APIRouter()  # mounted at /api/v1/projects
networks_router = APIRouter()  # mounted at /api/v1/cases


def _store() -> ProjectsStore:
    return ProjectsStore(IngestionJobManager.get_instance().base_dir)


def _visible(project: Dict[str, Any], user: UserIdentity) -> Dict[str, Any]:
    auth = AuthService.get_instance()
    return {**project, "cases": [c for c in project["cases"] if auth.validate_case_scope(user, c["case_id"])]}


def _case(case_id: str, user: UserIdentity) -> str:
    case_id = _checked_case_id(case_id)
    AuthService.get_instance().enforce_case_access(user, case_id)
    return case_id


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    description: str = ""


class ProjectPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    archived: Optional[bool] = None


class CaseLink(BaseModel):
    case_id: str


class CasePatch(BaseModel):
    lifecycle: Optional[str] = None
    assignee: Optional[str] = None


class SplitRequest(BaseModel):
    new_case_id: str


class NetworkDecision(BaseModel):
    decision: Optional[str] = None  # INVESTIGATE / MAKE_CASE / MERGE_FIR / DISMISS
    status: Optional[str] = None  # bare status change, e.g. FREEZES_SENT
    reason: str = Field("", max_length=500)
    target_case_id: Optional[str] = None


def _decisions() -> NetworkDecisionStore:
    return NetworkDecisionStore(IngestionJobManager.get_instance().base_dir)


@router.get("")
async def list_projects(user: UserIdentity = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return [_visible(p, user) for p in _store().list()]


@router.post("")
async def create_project(req: ProjectCreate, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return _store().create(req.name, req.description)
    except ValueError as e:
        raise HTTPException(422, str(e))


class NewCase(BaseModel):
    title: str = Field("", max_length=160)
    project_id: Optional[str] = None


@router.post("/cases")
async def create_case(req: NewCase, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Open a new case; the creator gets access to it."""
    try:
        return _store().register_case(user.user_id, req.title, req.project_id)
    except KeyError:
        raise HTTPException(404, f"Project '{req.project_id}' not found.")


@router.get("/cases")
async def list_cases(user: UserIdentity = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Every case the user can open: registered cases, project members and cases with uploads."""
    auth = AuthService.get_instance()
    known = {c["case_id"]: c for c in _store().all_cases()}
    for job in IngestionJobManager.get_instance().jobs.values():
        if not job.is_cancelled and job.case_id not in known:
            known[job.case_id] = {"case_id": job.case_id, "title": "", "owner_id": None, "created_at": None,
                                  "project_id": None, "lifecycle": "INTAKE", "assignee": None}
    return [c for cid, c in sorted(known.items()) if auth.validate_case_scope(user, cid)]


@router.patch("/cases/{case_id}")
async def patch_case(case_id: str, req: CasePatch, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return _store().set_case(_case(case_id, user), lifecycle=req.lifecycle, assignee=req.assignee)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.get("/{project_id}")
async def get_project(project_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    p = _store().get(project_id)
    if not p:
        raise HTTPException(404, f"Project '{project_id}' not found.")
    return _visible(p, user)


@router.patch("/{project_id}")
async def patch_project(project_id: str, req: ProjectPatch, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    try:
        return _visible(_store().update(project_id, req.name, req.description, req.archived), user)
    except KeyError:
        raise HTTPException(404, f"Project '{project_id}' not found.")
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.post("/{project_id}/cases")
async def link_case(project_id: str, req: CaseLink, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Link a case to this project (moves it if it was in another)."""
    try:
        return _store().set_case(_case(req.case_id, user), project_id, link=True)
    except KeyError:
        raise HTTPException(404, f"Project '{project_id}' not found.")


@networks_router.get("/{case_id}/networks")
async def get_networks(case_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Networks (connected money flows) with mule scores, hop distance, review queue and cross-case hits."""
    mgr = IngestionJobManager.get_instance()
    result = case_networks(mgr.derived_dir, _case(case_id, user))
    auth = AuthService.get_instance()
    # Name only other cases this user may see.
    for hit in result["cross_case_hits"]:
        hit["case_ids"] = [c for c in hit["case_ids"] if auth.validate_case_scope(user, c)]
    result["cross_case_hits"] = [h for h in result["cross_case_hits"] if h["case_ids"]]
    decided = _decisions().all(case_id)
    for n in result["networks"]:
        n["triage"] = decided.get(n["network_id"]) or NetworkDecisionStore._blank(n["network_id"])
    return result


@networks_router.put("/{case_id}/networks/{network_id}/status")
async def set_network_status(case_id: str, network_id: str, req: NetworkDecision,
                             user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Record the investigator's decision / status for one network (audit-logged, hash-chained)."""
    case_id = _case(case_id, user)
    if not (req.decision or req.status):
        raise HTTPException(422, "Send a decision or a status.")
    target = _case(req.target_case_id, user) if req.target_case_id else None
    if target == case_id:
        raise HTTPException(422, "Pick a different case to merge into.")
    mgr = IngestionJobManager.get_instance()
    if not any(n["network_id"] == network_id for n in case_networks(mgr.derived_dir, case_id)["networks"]):
        raise HTTPException(404, f"Network '{network_id}' not found in {case_id}.")
    try:
        return _decisions().set(case_id, network_id, user.user_id, decision=req.decision, status=req.status,
                                reason=req.reason, target_case_id=target)
    except ValueError as e:
        raise HTTPException(422, str(e))


@networks_router.get("/{case_id}/networks/{network_id}/history")
async def network_status_history(case_id: str, network_id: str,
                                 user: UserIdentity = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return _decisions().history(_case(case_id, user), network_id)


@networks_router.post("/{case_id}/networks/{network_id}/split")
async def split_network(case_id: str, network_id: str, req: SplitRequest,
                        user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Copy one network's transactions into a new linked case (same project, lifecycle Investigating)."""
    mgr = IngestionJobManager.get_instance()
    case_id = _case(case_id, user)
    new_id = _case(req.new_case_id, user)
    if new_id == case_id:
        raise HTTPException(422, "Pick a different case id for the split.")
    net = next((n for n in case_networks(mgr.derived_dir, case_id)["networks"] if n["network_id"] == network_id), None)
    if not net:
        raise HTTPException(404, f"Network '{network_id}' not found in {case_id}.")
    src = DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / case_id))
    dst = DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / new_id))
    if net["member_count"] > len(net["members"]):
        # shortcut: members list is capped at MAX_MEMBERS_SHOWN; page members to split bigger networks.
        raise HTTPException(409, "Network is too large to split from the triage view yet.")
    rows = src.copy_subgraph(dst, {m["id"] for m in net["members"]}, f"SPLIT-{case_id}-{network_id}")
    store = _store()
    project_id = store.case_meta(case_id)["project_id"]
    if project_id:
        store.set_case(new_id, project_id, link=True)
    store.set_case(new_id, lifecycle="INVESTIGATING")
    return {"case_id": new_id, "rows_copied": rows, "project_id": project_id}
