"""People & Accounts page: investigator verdicts on accounts and on probable same-person pairs (audit-logged)."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.api.ingestion_api import _checked_case_id, get_current_user
from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService
from app.services.ingestion.account_verdicts import VerdictStore, pair_key, party_key
from app.services.ingestion.large_evidence_engine import IngestionJobManager
from app.services.ingestion.networks import case_networks

router = APIRouter()  # mounted at /api/v1/cases


class AccountVerdict(BaseModel):
    account: str = Field(..., min_length=1, max_length=500)  # party key or label
    verdict: Optional[Literal["CONFIRMED_MULE", "NOT_MULE"]] = None  # None clears it
    reason: str = Field("", max_length=500)


class PairVerdict(BaseModel):
    a: str = Field(..., min_length=1, max_length=500)
    b: str = Field(..., min_length=1, max_length=500)
    verdict: Optional[Literal["MERGE", "NOT_SAME"]] = None
    reason: str = Field("", max_length=500)


def _case(case_id: str, user: UserIdentity) -> str:
    case_id = _checked_case_id(case_id)
    AuthService.get_instance().enforce_case_access(user, case_id)
    return case_id


def _store() -> VerdictStore:
    return VerdictStore(IngestionJobManager.get_instance().base_dir)


def _networks(case_id: str) -> Dict[str, Any]:
    return case_networks(IngestionJobManager.get_instance().derived_dir, case_id)


@router.put("/{case_id}/accounts/verdict")
async def set_account_verdict(case_id: str, req: AccountVerdict,
                              user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Confirm mule / Not a mule (reason required). Network totals are recomputed with the verdict."""
    case_id = _case(case_id, user)
    key = party_key(req.account)
    if not any(m["id"] == key for n in _networks(case_id)["networks"] for m in n["members"]):
        raise HTTPException(404, f"Account '{req.account}' is not in any network of {case_id}.")
    try:
        store = _store()
        out = store.set(case_id, "account", key, user.user_id, req.verdict, req.reason)
        tuned = store.maybe_retune()
        if tuned:
            out["model_retuned"] = tuned
        out["scoring_meta"] = store.active_weights()
        return out
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.get("/{case_id}/weights/history")
async def scoring_weights_history(case_id: str, user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Current active scoring weights and audit log of LogisticRegression re-tunes."""
    _case(case_id, user)
    store = _store()
    return {"active": store.active_weights(), "history": store.tune_history()}


@router.get("/{case_id}/accounts/history")
async def account_verdict_history(case_id: str, account: str = Query(..., max_length=500),
                                  user: UserIdentity = Depends(get_current_user)) -> List[Dict[str, Any]]:
    return _store().history(_case(case_id, user), "account", party_key(account))


@router.put("/{case_id}/review/verdict")
async def set_pair_verdict(case_id: str, req: PairVerdict,
                           user: UserIdentity = Depends(get_current_user)) -> Dict[str, Any]:
    """Merge / Not same on a probable same-person pair from the review queue (reason required for Not same)."""
    case_id = _case(case_id, user)
    key = pair_key(req.a, req.b)
    if not any(r["key"] == key for r in _networks(case_id)["review_queue"]):
        raise HTTPException(404, "That pair is not in this case's review queue.")
    try:
        return _store().set(case_id, "pair", key, user.user_id, req.verdict, req.reason)
    except ValueError as e:
        raise HTTPException(422, str(e))
