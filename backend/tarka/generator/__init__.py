"""TARKA Synthetic Indian Case Generator package."""

from tarka.generator.synthetic_cases import (
    CaseType,
    GeneratedCase,
    generate_case_a_impossible_alibi,
    generate_case_b_cyclic_skew_trap,
    generate_case_c_consistent_control,
    generate_case_d_dual_cores,
    generate_all_cases,
)

__all__ = [
    "CaseType",
    "GeneratedCase",
    "generate_case_a_impossible_alibi",
    "generate_case_b_cyclic_skew_trap",
    "generate_case_c_consistent_control",
    "generate_case_d_dual_cores",
    "generate_all_cases",
]
