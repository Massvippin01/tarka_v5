"""Projects (operations) CRUD, case lifecycle, and fraud networks per case (triage)."""

from __future__ import annotations

import json
import time
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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


def _ncrp() -> "NcrpComplaintStore":
    from app.services.ingestion.ncrp_complaints import NcrpComplaintStore

    return NcrpComplaintStore(IngestionJobManager.get_instance().base_dir)


class HandoverRequest(BaseModel):
    to_officer: str = Field(..., min_length=1, max_length=120)
    note: str = Field("", max_length=500)
    network_id: Optional[str] = Field(None, max_length=80)


class NcrpTextImportRequest(BaseModel):
    csv_text: str = Field(..., min_length=1, max_length=5_000_000)
    case_id: Optional[str] = None


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
    holding = store.register_case(user.user_id, f"{name} · all files", project["project_id"], {"holding": True})
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


@router.get("/cases/{case_id}/handover")
async def get_case_handover(case_id: str, network_id: Optional[str] = None,
                            user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    cid = _case(case_id, user)
    store = _store()
    meta = store.case_meta(cid)
    return {
        "case_id": cid,
        "assignee": meta.get("assignee"),
        "network_assignees": store.network_assignees(cid),
        "history": store.handover_history(cid, network_id=network_id),
    }


@router.post("/cases/{case_id}/handover")
async def post_case_handover(case_id: str, req: HandoverRequest,
                             user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    cid = _case(case_id, user)
    store = _store()
    try:
        res = store.handover(cid, req.to_officer, user.user_id, note=req.note, network_id=req.network_id)
    except ValueError as e:
        raise HTTPException(422, str(e))
    return {
        "case_id": cid,
        "assignee": store.case_meta(cid).get("assignee"),
        "network_assignees": store.network_assignees(cid),
        **res,
    }


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
    # Proposals belong to intake holding cases only; ordinary cases keep their normal triage view.
    if ((_store().registered(case_id) or {}).get("details") or {}).get("holding"):
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
    # Other intake holding cases are temporary containers, never a case to add a gang to.
    holding = {c["case_id"] for c in _store().all_cases() if (c.get("details") or {}).get("holding")}
    # Cases this one already filed its gangs into hold copies of those gangs: never propose "add to" them.
    holding |= {d["target_case_id"] for d in _decisions().all(case_id).values()
                if d.get("decision") == "MAKE_CASE" and d.get("target_case_id")}
    elsewhere = {(h["kind"], h["identifier"]): [c for c in h["case_ids"] if c not in holding]
                 for h in result["cross_case_hits"]}
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
    wanted = [nid for nid in dict.fromkeys(req.network_ids) if nid in by_id]
    # One scan of the holding case for every requested network (53 networks: 37 s -> a few seconds).
    rows_of = src.rows_for_groups({nid: {m["id"] for m in by_id[nid]["members"]} for nid in wanted})
    for nid in dict.fromkeys(req.network_ids):
        n = by_id.get(nid)
        if not n:
            failed.append({"network_id": nid, "reason": "Network not found in this case."})
            continue
        done = decisions.get(case_id, nid)
        if done["status"] == "CASE_OPENED":
            failed.append({"network_id": nid, "reason": f"Already a case: {done['target_case_id']}."})
            continue
        job = f"SPLIT-{case_id}-{nid}"
        try:
            if n["proposal"]["action"] == "ATTACH":
                target = n["proposal"]["attach_case_id"]
                rows = src.copy_rows(DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / target)), rows_of[nid], job)
                decisions.set(case_id, nid, user.user_id, decision="MERGE_FIR", target_case_id=target)
                attached.append({"network_id": nid, "case_id": target, "rows_copied": rows})
            else:
                title = (req.titles.get(nid) or "").strip()[:160] or n["proposal"]["suggested_title"]
                new = store.register_case(user.user_id, title, project_id)
                rows = src.copy_rows(DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / new["case_id"])),
                                     rows_of[nid], job)
                store.set_case(new["case_id"], lifecycle="INVESTIGATING")
                decisions.set(case_id, nid, user.user_id, decision="MAKE_CASE", target_case_id=new["case_id"])
                created.append({"network_id": nid, "case_id": new["case_id"], "title": title, "rows_copied": rows})
        except Exception as e:  # one bad network must not stop the batch; the officer sees why
            failed.append({"network_id": nid, "reason": str(e)[:300]})
    return {"created": created, "attached": attached, "failed": failed}


@networks_router.get("/{case_id}/attribution")
async def get_attribution(case_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Controller attribution groups (shared handsets, SIMs, Wi-Fi BSSIDs, IPs) per network."""
    case_id = _case(case_id, user)
    result = _visible_networks(case_id, user, max_members=None)
    controllers = []
    for n in result["networks"]:
        for cg in n.get("controllers") or []:
            controllers.append({"network_id": n["network_id"], **cg})
    return {"case_id": case_id, "controllers": controllers, "networks_count": len(result["networks"])}


@networks_router.get("/{case_id}/networks/{network_id}/members")
async def list_network_members(
    case_id: str,
    network_id: str,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    subgroup_id: Optional[str] = Query(None, max_length=80),
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """Paged members of one network (optionally filtered to a Louvain subgroup)."""
    case_id = _case(case_id, user)
    result = _visible_networks(case_id, user, max_members=None)
    net = next((n for n in result["networks"] if n["network_id"] == network_id), None)
    if net is None:
        raise HTTPException(404, f"Network '{network_id}' not found in {case_id}.")
    members = net["members"]
    if subgroup_id:
        members = [m for m in members if m.get("subgroup_id") == subgroup_id]
    return {
        "network_id": network_id,
        "subgroup_id": subgroup_id,
        "total": len(members),
        "offset": offset,
        "limit": limit,
        "items": members[offset : offset + limit],
    }


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


_EXPORT_FORMATS = ("i2", "stix", "suspects")


@networks_router.get("/{case_id}/export")
async def export_case(case_id: str, format: str = "i2", user: UserIdentity = Depends(get_current_user)):
    """Hand the case to other tools in formats they already import.

    i2: entity-link CSV for i2 Analyst's Notebook / Maltego. stix: STIX 2.1 bundle of mule identifiers (CERT-In / I4C).
    suspects: every suspected mule with its layer, score and reason, including layers beyond the first.
    """
    import csv
    import io
    import uuid
    from datetime import datetime, timezone

    from fastapi.responses import Response

    from app.services.ingestion.networks import _ids

    if format not in _EXPORT_FORMATS:
        raise HTTPException(422, f"format must be one of {', '.join(_EXPORT_FORMATS)}")
    case_id = _case(case_id, user)
    nets = _visible_networks(case_id, user, max_members=None)["networks"]
    role = {m["id"]: (m, n["network_id"]) for n in nets for m in n["members"]}
    out = io.StringIO()

    if format == "i2":
        mgr = IngestionJobManager.get_instance()
        flows = DerivedStore(ensure_inside(mgr.derived_dir, mgr.derived_dir / case_id)).rows_for_groups(
            {n["network_id"]: {m["id"] for m in n["members"]} for n in nets})
        agg: Dict[tuple, list] = {}
        for nid, rows in flows.items():
            for _line, ts, payer, payee, amount, _ref in rows:
                a = agg.setdefault((payer.strip().lower(), payee.strip().lower(), nid), [payer, payee, 0.0, 0, ts])
                a[2] += amount
                a[3] += 1
                a[4] = min(a[4], ts)
        w = csv.writer(out)
        w.writerow(["From", "From role", "To", "To role", "Amount (INR)", "Transactions", "First seen (UTC)", "Network"])
        for (pk, qk, nid), (payer, payee, amount, count, first) in sorted(agg.items(), key=lambda kv: -kv[1][2]):
            w.writerow([payer, role.get(pk, ({"role": ""},))[0]["role"], payee, role.get(qk, ({"role": ""},))[0]["role"],
                        round(amount, 2), count, datetime.fromtimestamp(first, timezone.utc).isoformat(), nid])
        media, ext = "text/csv", "csv"

    elif format == "suspects":
        w = csv.writer(out)
        w.writerow(["Identifier", "Kind", "Layer (hops from victim)", "Mule score", "Still held (INR)", "Network",
                    "Why flagged", "Case"])
        for m, nid in sorted(role.values(), key=lambda mn: (-mn[0]["mule_score"], mn[0]["label"])):
            if m["role"] == "MULE":
                w.writerow([m["label"], m["kind"], m["hop"], m["mule_score"], m.get("held_inr", 0), nid, m["why"], case_id])
        media, ext = "text/csv", "csv"

    else:  # STIX 2.1: one indicator per mule identifier, all under one TARKA identity
        now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
        ident = f"identity--{uuid.uuid5(uuid.NAMESPACE_URL, 'tarka')}"
        objects = [{"type": "identity", "spec_version": "2.1", "id": ident, "created": now, "modified": now,
                    "name": "TARKA", "identity_class": "system"}]
        for m, nid in role.values():
            if m["role"] != "MULE":
                continue
            for kind, value in sorted(_ids(m["label"])):
                objects.append({
                    "type": "indicator", "spec_version": "2.1",
                    "id": f"indicator--{uuid.uuid5(uuid.NAMESPACE_URL, f'{case_id}/{kind}/{value}')}",
                    "created": now, "modified": now, "created_by_ref": ident, "valid_from": now,
                    "name": f"Suspected money mule {kind}: {value}",
                    "description": f"{m['why']} (case {case_id}, network {nid}, layer {m['hop']})",
                    "indicator_types": ["malicious-activity"], "pattern_type": "stix",
                    "pattern": f"[user-account:user_id = '{value}']",
                    "confidence": int(round(m["mule_score"] * 100)), "labels": ["money-mule", f"upi-{kind}"],
                })
        json.dump({"type": "bundle", "id": f"bundle--{uuid.uuid4()}", "objects": objects}, out, indent=1)
        media, ext = "application/json", "json"

    return Response(out.getvalue(), media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="{case_id}-{format}.{ext}"'})


def _import_ncrp_rows(raw_csv: str | bytes, *, project_id: Optional[str], target_cases: List[str], actor: str) -> Dict[str, Any]:
    from app.services.ingestion.ncrp_complaints import match_complaint_to_case, parse_ncrp_csv

    parsed = parse_ncrp_csv(raw_csv)
    if not parsed:
        raise HTTPException(422, "The NCRP CSV contains no complaint rows.")
    mgr = IngestionJobManager.get_instance()
    net_cache: Dict[str, Dict[str, Any]] = {}
    for cid in target_cases:
        try:
            net_cache[cid] = case_networks(mgr.derived_dir, cid, max_members=None)
        except Exception:
            net_cache[cid] = {"networks": []}

    enriched: List[Dict[str, Any]] = []
    store = _store()
    for row in parsed:
        best: Optional[Dict[str, Any]] = None
        best_cid = target_cases[0]
        last_unmatched: Optional[Dict[str, Any]] = None
        for cid in target_cases:
            res = match_complaint_to_case(mgr.derived_dir, cid, row, net_cache.get(cid))
            if res["status"] == "MATCHED":
                best = res
                best_cid = cid
                break
            last_unmatched = res
        outcome = best or last_unmatched or {
            "status": "UNMATCHED",
            "match_reason": "No target case available to match against.",
            "matched_account": None,
            "matched_network_id": None,
            "matched_txns": [],
        }
        enriched.append({**row, **outcome, "case_id": best_cid})

    # Persist grouped by matched/default case_id and update victim record on matched cases
    saved_all: List[Dict[str, Any]] = []
    ncrp_store = _ncrp()
    by_case: Dict[str, List[Dict[str, Any]]] = {}
    for item in enriched:
        by_case.setdefault(item["case_id"], []).append(item)
    for cid, items in by_case.items():
        saved = ncrp_store.save_batch(project_id=project_id, case_id=cid, items=items, imported_by=actor)
        saved_all.extend(saved)
        for it in items:
            if it["status"] == "MATCHED":
                store.merge_ncrp_details(cid, it)
        if not any(it["status"] == "MATCHED" for it in items) and len(target_cases) == 1:
            # Attach explicitly imported single-case complaint context without inventing absent fields
            store.merge_ncrp_details(cid, items[0])

    matched_count = sum(1 for x in saved_all if x["status"] == "MATCHED")
    return {
        "imported": len(saved_all),
        "matched_count": matched_count,
        "unmatched_count": len(saved_all) - matched_count,
        "complaints": saved_all,
    }


@router.post("/{project_id}/ncrp-import")
async def import_ncrp_project(
    project_id: str,
    req: NcrpTextImportRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    proj = _visible(_editable_project(project_id, user), user)
    cases = [c["case_id"] for c in proj["cases"]]
    if req.case_id:
        cid = _case(req.case_id, user)
        cases = [cid]
    elif not cases:
        created = _store().register_case(user.user_id, f"{proj['name']} · NCRP intake", project_id, {})
        cases = [created["case_id"]]
    return _import_ncrp_rows(req.csv_text, project_id=project_id, target_cases=cases, actor=user.user_id)


@router.get("/{project_id}/ncrp-complaints")
async def list_ncrp_project(project_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    p = _store().get(project_id)
    if not p:
        raise HTTPException(404, f"Project '{project_id}' not found.")
    _visible(p, user)
    return {"project_id": project_id, "complaints": _ncrp().list_for_project(project_id)}


@networks_router.post("/{case_id}/ncrp-import")
async def import_ncrp_case(
    case_id: str,
    req: NcrpTextImportRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    cid = _case(case_id, user)
    meta = _store().case_meta(cid)
    res = _import_ncrp_rows(req.csv_text, project_id=meta.get("project_id"), target_cases=[cid], actor=user.user_id)
    return {**res, "golden_hour": _ncrp().golden_hour_status(cid)}


@networks_router.get("/{case_id}/ncrp-complaints")
async def list_ncrp_case(case_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    cid = _case(case_id, user)
    ncrp_store = _ncrp()
    return {
        "case_id": cid,
        "complaints": ncrp_store.list_for_case(cid),
        "golden_hour": ncrp_store.golden_hour_status(cid),
    }
