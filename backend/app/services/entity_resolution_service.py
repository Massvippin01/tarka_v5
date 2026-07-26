from __future__ import annotations

from app.domain.person import Person


class EntityResolutionService:
    """
    Detect duplicate identities.

    Future:
    Aadhaar
    Phone
    Face
    Fingerprint
    Email
    """

    def score(
        self,
        left: Person,
        right: Person,
    ) -> float:

        score = 0.0

        if left.full_name == right.full_name:
            score += 0.40

        if left.date_of_birth == right.date_of_birth:
            score += 0.30

        if left.phone_ids == right.phone_ids:
            score += 0.30

        return min(score, 1.0)

    def is_duplicate(
        self,
        left: Person,
        right: Person,
        threshold: float = 0.85,
    ) -> bool:

        return self.score(left, right) >= threshold
