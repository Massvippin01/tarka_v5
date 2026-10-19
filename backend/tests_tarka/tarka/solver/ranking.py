"""Next-Evidence Ranking Engine based on Scenario Elimination.

Ranks candidate unverified evidence items (e.g. CCTV footage, FASTag toll records, ATM logs)
by information gain: the expected number of ambiguous surviving scenarios (Maximal Satisfiable Subsets)
eliminated upon acquisition of that item, as specified in SPEC.md Section 4.2.
"""

from __future__ import annotations

from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from tarka.core.models import Fact
from tarka.core.travel import TravelSpeedConfig
from tarka.solver.marco_mus import enumerate_all_mus


class CandidateEvidenceOutcome(BaseModel):
    """A possible factual outcome from acquiring candidate evidence."""
    outcome_label: str
    probability: float = Field(default=0.5, ge=0.0, le=1.0)
    simulated_fact: Fact


class CandidateEvidenceItem(BaseModel):
    """An unverified evidence source available for forensic subpoena."""
    candidate_id: str
    source_name: str
    possible_outcomes: List[CandidateEvidenceOutcome]


class RankedEvidenceItem(BaseModel):
    """Ranked candidate item with measured scenario elimination gain."""
    rank: int
    candidate_id: str
    source_name: str
    expected_scenarios_eliminated: float
    current_scenarios_count: int
    expected_surviving_scenarios: float
    outcome_surviving_breakdown: Dict[str, int]


class EvidenceRankingReport(BaseModel):
    """Comprehensive report ordering candidate investigative steps by information gain."""
    ranked_candidates: List[RankedEvidenceItem]
    initial_surviving_scenarios_count: int
    ranking_methodology: str


def rank_next_evidence(
    current_facts: List[Fact],
    candidate_items: List[CandidateEvidenceItem],
    clock_bounds: Dict[str, float],
    speed_config: Optional[TravelSpeedConfig] = None,
    handset_with_third_party: bool = False,
    max_scenarios: int = 50,
) -> EvidenceRankingReport:
    """Calculates expected scenarios eliminated for each candidate item and ranks them."""
    # 1. Compute current baseline surviving scenarios
    baseline_result = enumerate_all_mus(
        current_facts,
        clock_bounds,
        speed_config=speed_config,
        handset_with_third_party=handset_with_third_party,
        max_scenarios=max_scenarios,
    )
    s_current_count = len(baseline_result.mss_scenarios)
    if s_current_count == 0:
        s_current_count = 1  # If initially SAT, 1 scenario exists

    scored_candidates: List[RankedEvidenceItem] = []

    for item in candidate_items:
        expected_surviving = 0.0
        outcome_breakdown: Dict[str, int] = {}

        for outcome in item.possible_outcomes:
            augmented_facts = current_facts + [outcome.simulated_fact]
            res_outcome = enumerate_all_mus(
                augmented_facts,
                clock_bounds,
                speed_config=speed_config,
                handset_with_third_party=handset_with_third_party,
                max_scenarios=max_scenarios,
            )
            surviving_count = len(res_outcome.mss_scenarios)
            outcome_breakdown[outcome.outcome_label] = surviving_count
            expected_surviving += outcome.probability * surviving_count

        expected_eliminated = max(0.0, s_current_count - expected_surviving)

        scored_candidates.append(
            RankedEvidenceItem(
                rank=0,  # Assigned after sorting
                candidate_id=item.candidate_id,
                source_name=item.source_name,
                expected_scenarios_eliminated=round(expected_eliminated, 3),
                current_scenarios_count=s_current_count,
                expected_surviving_scenarios=round(expected_surviving, 3),
                outcome_surviving_breakdown=outcome_breakdown,
            )
        )

    # Sort descending by expected scenarios eliminated
    scored_candidates.sort(key=lambda x: x.expected_scenarios_eliminated, reverse=True)

    for idx, cand in enumerate(scored_candidates, 1):
        cand.rank = idx

    return EvidenceRankingReport(
        ranked_candidates=scored_candidates,
        initial_surviving_scenarios_count=s_current_count,
        ranking_methodology=(
            "InfoGain = |S_current| - E[|S(E=v)|], measuring expected reduction in surviving scenarios"
        ),
    )
