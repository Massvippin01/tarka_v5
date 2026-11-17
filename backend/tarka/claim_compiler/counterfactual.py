"""
TARKA SUTRAM 2026 — WORKSTREAM A3
Counterfactual Impact Analysis and Evidence Removal Engine.

Allows an investigator to simulate the exclusion of disputed or tainted evidence
and mathematically isolates which findings dissolve and which independent corroborations survive.
"""

from __future__ import annotations

import copy
from typing import Any, Dict, List, Optional, Set
from .compiler import ClaimDependencyDAG, ClaimState, InvestigativeClaim


class CounterfactualEngine:
    """
    Executes controlled counterfactual evidence exclusions over a Claim DAG.
    Computes exact differential impact graphs and surviving corroborated findings.
    """

    def __init__(self, baseline_dag: ClaimDependencyDAG):
        self.baseline_dag = baseline_dag

    def simulate_evidence_exclusion(self, excluded_artifact_id: str) -> Dict[str, Any]:
        """Simulates single evidence artifact exclusion."""
        res = self.simulate_multi_evidence_exclusion([excluded_artifact_id])
        res["excluded_artifact_id"] = excluded_artifact_id
        return res

    def simulate_multi_evidence_exclusion(self, excluded_artifact_ids: List[str]) -> Dict[str, Any]:
        """
        Simulates the removal of one or more evidence artifacts and re-evaluates all downstream claims.
        Returns a complete differential impact analysis report (ChallengeDiff).
        """
        excluded_set = set(excluded_artifact_ids)

        # 1. Identify directly affected claims (claims supported by any excluded artifact)
        directly_affected: Set[str] = set()
        for claim in self.baseline_dag.get_all_claims():
            if any(art_id in excluded_set for art_id in claim.supporting_evidence_ids):
                directly_affected.add(claim.claim_id)

        # 2. Identify transitively affected claims (descendants in the DAG)
        transitively_affected: Set[str] = set()
        for cid in directly_affected:
            desc = self.baseline_dag.get_descendants(cid)
            transitively_affected.update(desc)

        all_affected = directly_affected.union(transitively_affected)

        # 3. Create challenger DAG with artifacts removed
        challenger_dag = ClaimDependencyDAG()

        # Copy evidence items except excluded ones
        for art_id, item in self.baseline_dag._evidence.items():
            if art_id not in excluded_set:
                challenger_dag.add_evidence(copy.deepcopy(item))

        # Copy claims with excluded artifacts removed from supporting lists
        for claim in self.baseline_dag.get_all_claims():
            c_copy = copy.deepcopy(claim)
            c_copy.supporting_evidence_ids = [a for a in c_copy.supporting_evidence_ids if a not in excluded_set]
            c_copy.contradicting_evidence_ids = [a for a in c_copy.contradicting_evidence_ids if a not in excluded_set]
            challenger_dag.add_claim(c_copy)

        # 4. Evaluate challenger DAG
        challenger_dag.evaluate_all()

        # 5. Compute differential deltas (ChallengeDiff)
        deactivated_claims = []
        surviving_claims = []
        dissolved_contradictions = []

        for baseline_claim in self.baseline_dag.get_all_claims():
            cid = baseline_claim.claim_id
            challenger_claim = challenger_dag.get_claim(cid)

            if not challenger_claim:
                continue

            base_status = baseline_claim.evaluation_status
            chal_status = challenger_claim.evaluation_status

            # Finding dissolved from supported to unsupported/uncertain
            if base_status == ClaimState.SUPPORTED and chal_status in (ClaimState.UNSUPPORTED, ClaimState.UNCERTAIN):
                deactivated_claims.append({
                    "claim_id": cid,
                    "title": baseline_claim.title,
                    "previous_status": base_status.value,
                    "new_status": chal_status.value,
                    "reason": f"Lost primary evidentiary support from excluded artifacts {list(excluded_set)}",
                })

            # Finding survives because it has independent corroboration
            elif base_status == ClaimState.SUPPORTED and chal_status == ClaimState.SUPPORTED:
                surviving_claims.append({
                    "claim_id": cid,
                    "title": baseline_claim.title,
                    "status": chal_status.value,
                    "remaining_supporting_evidence": challenger_claim.supporting_evidence_ids,
                    "corroboration": "Independently verified by surviving corroborating artifacts",
                })

            # Contradiction dissolved because the challenged evidence was the conflicting premise
            if base_status == ClaimState.CONTRADICTED and chal_status != ClaimState.CONTRADICTED:
                dissolved_contradictions.append({
                    "claim_id": cid,
                    "title": baseline_claim.title,
                    "previous_status": base_status.value,
                    "new_status": chal_status.value,
                    "resolution": f"Contradiction resolved upon excluding disputed artifacts {list(excluded_set)}",
                })

        excl_str = ", ".join(sorted(list(excluded_set)))
        return {
            "excluded_artifact_ids": sorted(list(excluded_set)),
            "total_claims_in_case": len(self.baseline_dag.get_all_claims()),
            "directly_affected_claims_count": len(directly_affected),
            "directly_affected_claim_ids": sorted(list(directly_affected)),
            "transitively_affected_claims_count": len(transitively_affected),
            "transitively_affected_claim_ids": sorted(list(transitively_affected)),
            "deactivated_claims": deactivated_claims,
            "surviving_claims": surviving_claims,
            "dissolved_contradictions": dissolved_contradictions,
            "counterfactual_verdict": (
                f"Exclusion of [{excl_str}] dissolved {len(deactivated_claims)} claims and "
                f"{len(dissolved_contradictions)} contradictions. {len(surviving_claims)} claims survive "
                "with independent corroboration."
            ),
        }

