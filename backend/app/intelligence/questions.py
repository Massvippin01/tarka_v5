from typing import Any


QUESTION_RULES = {
    "vehicle_overlap": (
        "Compare vehicle observation timestamps and "
        "camera records across both case locations."
    ),
    "communication_path": (
        "Review the communication timeline surrounding "
        "both incident windows."
    ),
    "modus_operandi": (
        "Compare entry method, target selection, and "
        "scene-control behaviour across both cases."
    ),
    "geographic_proximity": (
        "Examine travel corridors and intermediate "
        "observation points between both locations."
    ),
    "temporal_proximity": (
        "Compare the incident sequence for recurring "
        "time-of-day or day-of-week patterns."
    ),
    "person_overlap": (
        "Review the shared person's role, access, and "
        "documented presence in both cases."
    ),
}


def generate_investigative_questions(
    signals: list[dict[str, Any]],
) -> list[str]:
    ranked_signals = sorted(
        signals,
        key=lambda signal: signal["strength"],
        reverse=True,
    )

    questions: list[str] = []

    for signal in ranked_signals:
        if signal.get("missing"):
            continue

        if signal["strength"] < 0.5:
            continue

        question = QUESTION_RULES.get(
            signal["type"]
        )

        if question and question not in questions:
            questions.append(question)

        if len(questions) == 3:
            break

    if not questions:
        questions.append(
            "Collect additional entity, location, and "
            "timeline evidence before asserting a case link."
        )

    return questions