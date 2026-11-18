"""Projects (operations) CRUD, case lifecycle, and fraud networks per case (triage)."""

from __future__ import annotations

import time
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.api.ingestion_api import _checked_case_id, get_current_user
from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService
from app.services.ingestion.derived_store import DerivedStore
from app.services.ingestion.large_evidence_engine import IngestionJobManager, ensure_inside
from app.services.ingestion.network_decisions import NetworkDecisionStore
from app.services.ingestion.networks import MAX_MEMBERS_SHOWN, _ids, case_networks, inr
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
    new_case_id: Optional[str] = None  # omitted: TARKA opens a fresh case owned by the officer
    title: str = ""


class IntakeRequest(BaseModel):
    name: str = Field("", max_length=120)


class CreateCasesRequest(BaseModel):
    network_ids: List[str] = Field(..., min_length=1, max_length=2000)
    titles: Dict[str, str] = {}


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
        return _store().create(req.name, req.description, user.user_id)
    except ValueError as e:
        raise HTTPException(422, str(e))


class CaseDetails(BaseModel):
    """What the officer types when opening a case; kept with the case, never invented."""
    fir_number: str = Field("", max_length=80)
    police_station: str = Field("", max_length=160)
    ncrp_ack_no: str = Field("", max_length=80)
    complainant_name: str = Field("", max_length=160)
    lead_investigator: str = Field("", max_length=160)
    typology: str = Field("", max_length=60)
    priority: str = Field("", max_length=40)
    claimed_loss_inr: float = Field(0, ge=0, le=1e12)


class NewCase(BaseModel):
    title: str = Field("", max_length=160)
    project_id: Optional[str] = None
    details: CaseDetails = CaseDetails()


@router.post("/intake")
async def start_intake(req: IntakeRequest, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Files first, cases later: a new project plus a holding case to upload everything into."""
    name = req.name.strip() or f"Intake {time.strftime('%d %b %Y, %H:%M')}"
    store = _store()
    project = store.create(name, "Files added before the cases were known; TARKA proposes the cases from them.",
                           user.user_id)
    holding = store.register_case(user.user_id, f"{name} · all files", project["project_id"])
    return {"project_id": project["project_id"], "case_id": holding["case_id"], "name": name}


@router.post("/cases")
async def create_case(req: NewCase, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Open a new case; the creator gets access to it."""
    try:
        return _store().register_case(user.user_id, req.title, req.project_id, req.details.model_dump())
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


def _editable_project(project_id: str, user: UserIdentity) -> Dict[str, Any]:
    """Only the creator, or someone who can open one of its cases, may change a project."""
    p = _store().get(project_id)
    if not p:
        raise HTTPException(404, f"Project '{project_id}' not found.")
    auth = AuthService.get_instance()
    if p.get("owner_id") == user.user_id or any(auth.validate_case_scope(user, c["case_id"]) for c in p["cases"]):
        return p
    if p.get("owner_id") is None and not p["cases"]:
        return p  # made before projects had owners, and holds nothing: anyone may tidy it up
    raise HTTPException(403, "Only the officer who created this project, or someone on its cases, can change it.")


@router.patch("/{project_id}")
async def patch_project(project_id: str, req: ProjectPatch, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    _editable_project(project_id, user)
    try:
        return _visible(_store().update(project_id, req.name, req.description, req.archived), user)
    except KeyError:
        raise HTTPException(404, f"Project '{project_id}' not found.")
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.post("/{project_id}/cases")
async def link_case(project_id: str, req: CaseLink, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Link a case to this project (moves it if it was in another)."""
    _editable_project(project_id, user)
    try:
        return _store().set_case(_case(req.case_id, user), project_id, link=True)
    except KeyError:
        raise HTTPException(404, f"Project '{project_id}' not found.")


@networks_router.get("/{case_id}/networks")
async def get_networks(case_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Networks (connected money flows) with mule scores, hop distance, review queue and cross-case hits."""
    case_id = _case(case_id, user)
    result = _visible_networks(case_id, user, max_members=MAX_MEMBERS_SHOWN)  # names only cases the user may see
    decided = _decisions().all(case_id)
    for n in result["networks"]:
        n["triage"] = decided.get(n["network_id"]) or NetworkDecisionStore._blank(n["network_id"])
    _add_proposals(case_id, result)
    return result


def _visible_networks(case_id: str, user: UserIdentity, max_members: Optional[int]) -> Dict[str, Any]:
    result = case_networks(IngestionJobManager.get_instance().derived_dir, case_id, max_members)
    auth = AuthService.get_instance()
    for hit in result["cross_case_hits"]:
        hit["case_ids"] = [c for c in hit["case_ids"] if auth.validate_case_scope(user, c)]
    result["cross_case_hits"] = [h for h in result["cross_case_hits"] if h["case_ids"]]
    return result


def _add_proposals(case_id: str, result: Dict[str, Any]) -> None:
    """What to do with each network: a new case, add it to a case it shares identifiers with, or a minor one.

    Expects cross_case_hits already limited to cases the user can open.
    """
    elsewhere = {(h["kind"], h["identifier"]): h["case_ids"] for h in result["cross_case_hits"]}
    for n in result["networks"]:
        shared, values = Counter(), defaultdict(set)
        for m in n["members"]:
            for ident in _ids(m["label"]):
                for other in elsewhere.get(ident, []):
                    if other != case_id:
                        shared[other] += 1
                        values[other].add(ident[1])
        lead = next((m for m in n["members"] if m["role"] == "MULE"), n["members"][0])
        title = f"{lead['label']} network · {n['mule_count']} mules, {n['victim_count']} victims · {inr(n['amount_inr'])}"
        if shared:
            target = shared.most_common(1)[0][0]
            n["proposal"] = {"action": "ATTACH", "suggested_title": title, "attach_case_id": target,
                             "shared_identifiers": sorted(values[target])[:10]}
        elif n["mule_count"] <= 1 and n["victim_count"] <= 1:
            n["proposal"] = {"action": "MINOR", "suggested_title": title}
        else:
            n["proposal"] = {"action": "NEW_CASE", "suggested_title": title}


@networks_router.post("/{case_id}/networks/create-cases")
async def create_cases_from_networks(case_id: str, req: CreateCasesRequest,
                                     user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Officer-confirmed: turn proposed networks into cases (or add them to the matching case). Never repeats one."""
    case_id = _case(case_id, user)
    mgr = IngestionJobManager.get_instance()
    result = _visible_networks(case_id, user, max_members=None)  # full membership: every row must move
    _add_proposals(case_id, result)
    by_id = {n["network_id"]: n for n in result["networks"]}
    decisions, store = _decisions(), _store()
    project_id = store.case_meta(case_id)["project_id"]
    src = DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / case_id))
    created, attached, failed = [], [], []
    for nid in dict.fromkeys(req.network_ids):
        n = by_id.get(nid)
        if not n:
            failed.append({"network_id": nid, "reason": "Network not found in this case."})
            continue
        done = decisions.get(case_id, nid)
        if done["status"] == "CASE_OPENED":
            failed.append({"network_id": nid, "reason": f"Already a case: {done['target_case_id']}."})
            continue
        keys, job = {m["id"] for m in n["members"]}, f"SPLIT-{case_id}-{nid}"
        try:
            if n["proposal"]["action"] == "ATTACH":
                target = n["proposal"]["attach_case_id"]
                rows = src.copy_subgraph(DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / target)), keys, job)
                decisions.set(case_id, nid, user.user_id, decision="MERGE_FIR", target_case_id=target)
                attached.append({"network_id": nid, "case_id": target, "rows_copied": rows})
            else:
                title = (req.titles.get(nid) or "").strip()[:160] or n["proposal"]["suggested_title"]
                new = store.register_case(user.user_id, title, project_id)
                rows = src.copy_subgraph(DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / new["case_id"])),
                                         keys, job)
                store.set_case(new["case_id"], lifecycle="INVESTIGATING")
                decisions.set(case_id, nid, user.user_id, decision="MAKE_CASE", target_case_id=new["case_id"])
                created.append({"network_id": nid, "case_id": new["case_id"], "title": title, "rows_copied": rows})
        except Exception as e:  # one bad network must not stop the batch; the officer sees why
            failed.append({"network_id": nid, "reason": str(e)[:300]})
    return {"created": created, "attached": attached, "failed": failed}


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
    store = _store()
    project_id = store.case_meta(case_id)["project_id"]
    if req.new_case_id:
        new_id = _case(req.new_case_id, user)
    else:
        new_id = store.register_case(user.user_id, req.title or f"Split from {case_id}", project_id)["case_id"]
    if new_id == case_id:
        raise HTTPException(422, "Pick a different case id for the split.")
    net = next((n for n in case_networks(mgr.derived_dir, case_id, max_members=None)["networks"]
                if n["network_id"] == network_id), None)
    if not net:
        raise HTTPException(404, f"Network '{network_id}' not found in {case_id}.")
    src = DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / case_id))
    dst = DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / new_id))
    rows = src.copy_subgraph(dst, {m["id"] for m in net["members"]}, f"SPLIT-{case_id}-{network_id}")
    if project_id:
        store.set_case(new_id, project_id, link=True)
    store.set_case(new_id, lifecycle="INVESTIGATING")
    return {"case_id": new_id, "rows_copied": rows, "project_id": project_id}
