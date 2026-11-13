"""
SentinelX / TARKA — Mule Scoring API.
Mounted under `/api/v1/analyze`.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.services.auth_service import get_current_user
from app.services.mule_scoring_service import MuleScoringEngine

router = APIRouter()


class AnalyzeMuleScoresRequest(BaseModel):
    case_id: Optional[str] = "DYNAMIC_EVAL"
    transactions: List[Dict[str, Any]] = Field(default_factory=list)
    accounts: List[Dict[str, Any]] = Field(default_factory=list)
    complainant: Optional[Dict[str, Any]] = Field(default_factory=dict)


@router.post("/mule-scores")
async def analyze_mule_scores(
    payload: AnalyzeMuleScoresRequest,
    user: UserIdentity = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Computes explainable mule-account scores and feature contributions for a provided
    transaction graph and accounts list.
    """
    engine = MuleScoringEngine()
    return engine.score_transaction_graph(
        case_id=payload.case_id or "DYNAMIC_EVAL",
        transactions=payload.transactions,
        accounts=payload.accounts,
        complainant=payload.complainant or {},
    )
