from typing import Any


SIGNAL_LABELS = {
    "modus_operandi": "Modus operandi similarity",
    "person_overlap": "Shared person references",
    "vehicle_overlap": "Shared vehicle association",
    "temporal_proximity": "Temporal proximity",
    "geographic_proximity": "Geographic proximity",
    "communication_path": "Communication path",
}


def build_explanation(
    signals: list[dict[str, Any]],
) -> dict[str, Any]:
    supporting_signals: list[dict[str, Any]] = []
    contradictions: list[str] = []
    missing_data: list[str] = []

    for signal in signals:
        signal_type = signal["type"]

        label = SIGNAL_LABELS.get(
            signal_type,
            signal_type,
        )

        if signal.get("missing"):
            missing_data.append(
                f"{label} data unavailable"
            )
            continue

        strength = float(signal["strength"])

        if strength >= 0.5:
            supporting_signals.append(
                {
                    "type": signal_type,
                    "label": label,
                    "strength": strength,
                    "evidence": signal["evidence"],
                }
            )

        elif strength == 0.0:
            contradictions.append(
                f"No supporting {label.lower()} signal"
            )

    supporting_signals.sort(
        key=lambda signal: signal["strength"],
        reverse=True,
    )

    return {
        "supporting_signals": supporting_signals,
        "contradictions": contradictions,
        "missing_data": missing_data,
    }