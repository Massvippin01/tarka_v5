"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: CLAIM IMPACT EVALUATOR

Evaluates downstream investigative hypotheses and formal claims
when incoming institutional evidence updates, invalidates, or adds
factual dependencies.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from tarka.contracts.canonical_v1 import CanonicalClaim, ClaimState


class ImpactedClaimSummary(BaseModel):
    claim_id: str
    claim_type: str
    claim_statement: str
    original_state: ClaimState
    recommended_state: ClaimState
    affected_evidence_ids: List[str]
    impact_rationale: str


class ClaimImpactReport(BaseModel):
    total_claims_analyzed: int
    impacted_claims_count: int
    impacted_claims: List[ImpactedClaimSummary] = Field(default_factory=list)
    requires_solver_recomputation: bool
    summary_notes: str


class ClaimImpactEvaluator:
    """
    Determines how modifications in the evidence layer or adapter mapping
    cascade into active investigative claims.
    """

    @classmethod
    def evaluate_evidence_modifications(
        cls,
        claims: List[CanonicalClaim],
        modified_evidence_ids: List[str],
        modification_reason: str = "EVIDENCE_UPDATED"
    ) -> ClaimImpactReport:
        """
        Scan all active claims to identify which ones depend on modified or newly ingested evidence exhibits.
        """
        mod_set = set(modified_evidence_ids)
        impacted: List[ImpactedClaimSummary] = []

        for claim in claims:
            # Check direct evidence_dependencies
            claim_deps = set(claim.evidence_dependencies)
            overlapping = claim_deps & mod_set

            # Check supporting/contradictory observations if present
            if not overlapping:
                for obs in (claim.supporting_observations + claim.contradictory_observations):
                    ev_id = obs.get("evidence_id") or obs.get("source_evidence_id")
                    if ev_id and ev_id in mod_set:
                        overlapping.add(ev_id)

            if overlapping:
                # Claim is impacted by modified evidence
                rec_state = (
                    ClaimState.NOT_EVALUATED
                    if claim.claim_state in (ClaimState.SUPPORTED, ClaimState.CONTRADICTED)
                    else claim.claim_state
                )

                rationale = (
                    f"Evidence dependency {list(overlapping)} modified ({modification_reason}). "
                    f"Formal solver verification required."
                )

                impacted.append(
                    ImpactedClaimSummary(
                        claim_id=claim.claim_id,
                        claim_type=str(claim.claim_type),
                        claim_statement=claim.claim_statement,
                        original_state=claim.claim_state,
                        recommended_state=rec_state,
                        affected_evidence_ids=list(overlapping),
                        impact_rationale=rationale
                    )
                )

        needs_recomp = len(impacted) > 0
        summary = (
            f"Found {len(impacted)} of {len(claims)} claims impacted by "
            f"evidence modifications to {len(modified_evidence_ids)} exhibits."
        )

        return ClaimImpactReport(
            total_claims_analyzed=len(claims),
            impacted_claims_count=len(impacted),
            impacted_claims=impacted,
            requires_solver_recomputation=needs_recomp,
            summary_notes=summary
        )

