from typing import Any

from app.intelligence.explanations import build_explanation
from app.intelligence.questions import generate_investigative_questions
from app.intelligence.scoring import calculate_link_score
from app.intelligence.signal_extractors import (
    extract_communication_signal,
    extract_geographic_signal,
    extract_modus_operandi_signal,
    extract_person_overlap_signal,
    extract_temporal_signal,
    extract_vehicle_overlap_signal,
)


def compare_cases(
    case_a: dict[str, Any],
    case_b: dict[str, Any],
    communication_path: dict[str, Any],
) -> dict[str, Any]:
    signals = [
        extract_modus_operandi_signal(
            case_a,
            case_b,
        ),
        extract_person_overlap_signal(
            case_a,
            case_b,
        ),
        extract_vehicle_overlap_signal(
            case_a,
            case_b,
        ),
        extract_temporal_signal(
            case_a,
            case_b,
        ),
        extract_geographic_signal(
            case_a,
            case_b,
        ),
        extract_communication_signal(
            communication_path,
        ),
    ]

    scoring = calculate_link_score(signals)

    explanation = build_explanation(signals)

    questions = generate_investigative_questions(signals)

    return {
        "case_a": case_a["case"]["id"],
        "case_b": case_b["case"]["id"],
        "score": scoring["score"],
        "classification": scoring["classification"],
        "signals": signals,
        "contributions": scoring["contributions"],
        "supporting_signals": explanation["supporting_signals"],
        "contradictions": explanation["contradictions"],
        "missing_data": explanation["missing_data"],
        "recommended_questions": questions,
    }
