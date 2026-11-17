"""
TARKA SUTRAM 2026 — WORKSTREAM B3/A1/A2 INTEGRATION
Claim Recomputation Bridge: Distributed Event Fabric -> Formal SMT Claim Compiler.

When distributed institutional events arrive (evidence ingest, freeze directives, transaction flags):
1. Identifies affected evidence dependencies and accounts.
2. Identifies dependent formal claims.
3. Invalidates prior verification results (resets state to NOT_EVALUATED).
4. Triggers controlled Z3 SMT formal re-verification.
5. Preserves complete audit history of recomputation rationale.

Operating Doctrine:
AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from tarka.claim_compiler.formal_verifier import FormalSMTVerifier
from tarka.contracts.canonical_v1 import (
    CanonicalClaim,
    ClaimState,
    ClaimType,
    InstitutionEventType,
)
from tarka.distributed.event_envelope import EventEnvelope


class RecomputedClaimResult(BaseModel):
    claim_id: str
    claim_statement: str
    previous_state: ClaimState
    updated_state: ClaimState
    recomputation_reason: str
    solver_result: Dict[str, Any]
    counterexamples: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp_utc: str


class ClaimRecomputationReport(BaseModel):
    triggering_event_id: str
    triggering_event_type: str
    affected_dependencies: List[str]
    total_claims_evaluated: int
    impacted_claims_count: int
    recomputed_claims: List[RecomputedClaimResult] = Field(default_factory=list)
    human_action_required: bool
    summary: str


class ClaimRecomputationBridge:
    """
    Subscribes to or processes events from the Distributed Event Fabric,
    detecting when active investigative claims are affected and re-running formal Z3 verification.
    """

    def __init__(self, verifier: Optional[FormalSMTVerifier] = None):
        self.verifier = verifier or FormalSMTVerifier()

    def evaluate_event_impact(
        self,
        event: EventEnvelope,
        active_claims: List[CanonicalClaim],
        account_balances: Optional[Dict[str, float]] = None,
    ) -> ClaimRecomputationReport:
        """
        Processes an incoming distributed event and recomputes impacted formal claims.
        """
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # 1. Extract affected dependencies from event payload
        payload = event.payload or {}
        affected_deps: Set[str] = set()

        if "artifact_id" in payload:
            affected_deps.add(payload["artifact_id"])
        if "evidence_id" in payload:
            affected_deps.add(payload["evidence_id"])
        if "account_number" in payload:
            affected_deps.add(payload["account_number"])
        if "vpa" in payload:
            affected_deps.add(payload["vpa"])
        if "msisdn" in payload:
            affected_deps.add(payload["msisdn"])
        if event.correlation_id:
            affected_deps.add(event.correlation_id)

        recomputed: List[RecomputedClaimResult] = []

        for claim in active_claims:
            claim_deps = set(claim.evidence_dependencies)
            # Also check assumptions or statements for matching account / correlation refs
            matches = claim_deps & affected_deps
            for dep in affected_deps:
                if dep in claim.claim_statement:
                    matches.add(dep)

            if matches:
                # Claim is impacted by incoming event
                prev_state = claim.claim_state
                # Immediately reset state to indicate invalidation
                claim.claim_state = ClaimState.NOT_EVALUATED

                reason = (
                    f"Invalidated by event '{event.event_id}' ({event.event_type.value}) "
                    f"affecting dependencies {list(matches)}."
                )

                # Execute controlled Z3 re-verification if financial or balance claim
                solver_out: Dict[str, Any] = {}
                new_state = ClaimState.NOT_EVALUATED
                counterexamples: List[Dict[str, Any]] = []

                if claim.claim_type == ClaimType.FUND_DISSIPATION and account_balances:
                    acc = next((d for d in affected_deps if d in account_balances), None)
                    if acc:
                        b_final = account_balances[acc]
                        inflows = payload.get("inflows", [])
                        outflows = payload.get("outflows", [payload.get("amount", 0.0)])
                        b_init = payload.get("initial_balance", b_final + sum(outflows) - sum(inflows))

                        res = self.verifier.verify_financial_conservation(
                            initial_balance=b_init,
                            inflows=inflows,
                            outflows=outflows,
                            final_balance=b_final,
                        )
                        solver_out = res
                        if res.get("invariant_satisfied") is True:
                            new_state = ClaimState.SUPPORTED
                        else:
                            new_state = ClaimState.CONTRADICTED
                            counterexamples.append({
                                "type": "DISCREPANCY_COUNTEREXAMPLE",
                                "discrepancy": res.get("reconciliation_discrepancy"),
                                "counterexample": res.get("counterexample"),
                                "solver_model": res.get("solver_verdict")
                            })
                else:
                    # Generic formal verification placeholder: requires investigator review
                    solver_out = {
                        "status": "RECOMPUTATION_FLAGGED",
                        "affected_dependencies": list(matches),
                        "verification_type": "EVENT_DEPENDENCY_TRIGGERED"
                    }
                    new_state = ClaimState.UNCERTAIN

                claim.claim_state = new_state
                recomputed.append(
                    RecomputedClaimResult(
                        claim_id=claim.claim_id,
                        claim_statement=claim.claim_statement,
                        previous_state=prev_state,
                        updated_state=new_state,
                        recomputation_reason=reason,
                        solver_result=solver_out,
                        counterexamples=counterexamples,
                        timestamp_utc=now_utc,
                    )
                )

        return ClaimRecomputationReport(
            triggering_event_id=event.event_id,
            triggering_event_type=event.event_type.value,
            affected_dependencies=list(affected_deps),
            total_claims_evaluated=len(active_claims),
            impacted_claims_count=len(recomputed),
            recomputed_claims=recomputed,
            human_action_required=len(recomputed) > 0,
            summary=f"Processed event {event.event_id}: re-evaluated {len(recomputed)} of {len(active_claims)} active claims.",
        )
