"""TARKA SMT Constraint Formulation, Solving and Analysis Engine."""

from tarka.solver.z3_builder import Z3ConstraintBuilder, Z3ModelBundle
from tarka.solver.pairwise_feasibility import check_pairwise_feasibility_pure_python
from tarka.solver.brute_mus import brute_force_find_all_mus
from tarka.solver.marco_mus import enumerate_all_mus, MUSResult
from tarka.solver.analysis import (
    compute_corroboration_and_leave_one_out,
    compute_robustness_margin,
    run_weighted_maxsat_sensitivity,
    RobustnessMarginReport,
    LeaveOneOutReport,
    WeightSensitivityReport,
)
from tarka.solver.ranking import (
    rank_next_evidence,
    CandidateEvidenceItem,
    CandidateEvidenceOutcome,
    EvidenceRankingReport,
)
from tarka.solver.tables import generate_bound_vs_gap_table, print_bound_vs_gap_table

__all__ = [
    "Z3ConstraintBuilder",
    "Z3ModelBundle",
    "check_pairwise_feasibility_pure_python",
    "brute_force_find_all_mus",
    "enumerate_all_mus",
    "MUSResult",
    "compute_corroboration_and_leave_one_out",
    "compute_robustness_margin",
    "run_weighted_maxsat_sensitivity",
    "RobustnessMarginReport",
    "LeaveOneOutReport",
    "WeightSensitivityReport",
    "rank_next_evidence",
    "CandidateEvidenceItem",
    "CandidateEvidenceOutcome",
    "EvidenceRankingReport",
    "generate_bound_vs_gap_table",
    "print_bound_vs_gap_table",
    "compute_hypothesis_report",
    "HypothesisEngineReport",
    "HypothesisItem",
    "LeaveOneOutFactSensitivity",
    "infer_required_clock_offsets",
    "ClockSkewInferenceReport",
    "ClockOffsetInference",
    "TamperRiskLevel",
]
from tarka.solver.hypotheses import (
    compute_hypothesis_report,
    HypothesisEngineReport,
    HypothesisItem,
    LeaveOneOutFactSensitivity,
)
from tarka.solver.skew_inference import (
    infer_required_clock_offsets,
    ClockSkewInferenceReport,
    ClockOffsetInference,
    TamperRiskLevel,
)
