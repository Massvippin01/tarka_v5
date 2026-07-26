from typing import Any

SIGNAL_WEIGHTS = {
    "modus_operandi": 0.30,
    "person_overlap": 0.15,
    "vehicle_overlap": 0.20,
    "temporal_proximity": 0.10,
    "geographic_proximity": 0.10,
    "communication_path": 0.15,
}


def calculate_link_score(
    signals: list[dict[str, Any]],
) -> dict[str, Any]:
    weighted_score = 0.0
    available_weight = 0.0

    contributions: list[dict[str, Any]] = []

    for signal in signals:
        signal_type = signal["type"]

        weight = SIGNAL_WEIGHTS.get(
            signal_type,
            0.0,
        )

        if signal.get("missing"):
            continue

        strength = float(signal["strength"])

        contribution = strength * weight

        weighted_score += contribution
        available_weight += weight

        contributions.append(
            {
                "signal": signal_type,
                "strength": strength,
                "weight": weight,
                "contribution": round(
                    contribution,
                    4,
                ),
            }
        )

    if available_weight == 0:
        normalized_score = 0.0
    else:
        normalized_score = weighted_score / available_weight

    score = round(normalized_score * 100)

    if score >= 80:
        classification = "strong_potential_link"
    elif score >= 60:
        classification = "moderate_potential_link"
    elif score >= 35:
        classification = "weak_potential_link"
    else:
        classification = "limited_link_evidence"

    return {
        "score": score,
        "classification": classification,
        "contributions": contributions,
    }
