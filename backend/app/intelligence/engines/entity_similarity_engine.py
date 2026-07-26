from __future__ import annotations

from dataclasses import dataclass

from app.intelligence.core.weights import WeightProfile, registry
from app.intelligence.models.feature_vector import FeatureVector


@dataclass(frozen=True, slots=True)
class SimilarityResult:
    score: float
    matched_features: dict[str, int]
    explanation: list[str]


class EntitySimilarityEngine:
    def __init__(
        self,
        profile: WeightProfile | None = None,
    ) -> None:
        self.profile = profile or registry.get()

    @staticmethod
    def _jaccard(
        left: frozenset[str],
        right: frozenset[str],
    ) -> float:
        if not left and not right:
            return 1.0

        union = left | right

        if not union:
            return 0.0

        return len(left & right) / len(union)

    def compare(
        self,
        left: FeatureVector,
        right: FeatureVector,
    ) -> SimilarityResult:

        weights = self.profile

        features = {
            "persons": (left.persons, right.persons, weights.person),
            "phones": (left.phones, right.phones, weights.phone),
            "vehicles": (left.vehicles, right.vehicles, weights.vehicle),
            "locations": (left.locations, right.locations, weights.location),
            "organizations": (
                left.organizations,
                right.organizations,
                weights.organization,
            ),
            "communication": (
                left.communication,
                right.communication,
                weights.communication,
            ),
            "timeline": (
                left.timeline,
                right.timeline,
                weights.timeline,
            ),
            "modus_operandi": (
                left.modus_operandi,
                right.modus_operandi,
                weights.modus_operandi,
            ),
            "financial": (
                left.financial,
                right.financial,
                weights.financial,
            ),
            "digital": (
                left.digital,
                right.digital,
                weights.digital,
            ),
            "documents": (
                left.documents,
                right.documents,
                weights.document,
            ),
            "fingerprint": (
                left.fingerprint,
                right.fingerprint,
                weights.fingerprint,
            ),
            "dna": (
                left.dna,
                right.dna,
                weights.dna,
            ),
            "face": (
                left.face,
                right.face,
                weights.face,
            ),
        }

        score = 0.0
        explanation = []
        matched = {}

        for name, (a, b, weight) in features.items():

            similarity = self._jaccard(a, b)

            score += similarity * weight

            overlap = len(a & b)

            matched[name] = overlap

            if overlap:
                explanation.append(f"{name}: {overlap} shared value(s)")

        return SimilarityResult(
            score=min(score, 1.0),
            matched_features=matched,
            explanation=explanation,
        )
