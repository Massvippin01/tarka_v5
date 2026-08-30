from __future__ import annotations

import difflib
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from app.domain.person import Person
from app.repositories.unified_store import UnifiedStore


@dataclass(slots=True)
class EntityResolutionMatch:
    candidate_id: str
    candidate_name: str
    similarity_score: float
    percentage: int
    matching_features: List[str]
    explanation: str
    review_status: str = "PENDING_INVESTIGATOR_APPROVAL"


class EntityResolutionEngine:
    def __init__(self, store: Optional[UnifiedStore] = None):
        self.store = store or UnifiedStore.get_instance()

    def string_similarity(self, s1: str, s2: str) -> float:
        if not s1 or not s2:
            return 0.0
        return difflib.SequenceMatcher(None, s1.lower().strip(), s2.lower().strip()).ratio()

    def compare_persons(self, target: Person, existing: Person) -> Optional[EntityResolutionMatch]:
        matching_features = []
        scores = []
        weights = []

        # Exact ID matches (High confidence)
        if target.aadhaar and existing.aadhaar and target.aadhaar == existing.aadhaar:
            matching_features.append("Aadhaar Exact Match")
            scores.append(1.0)
            weights.append(0.4)

        if target.driving_license and existing.driving_license and target.driving_license == existing.driving_license:
            matching_features.append("Driving License Exact Match")
            scores.append(1.0)
            weights.append(0.3)

        if target.passport_number and existing.passport_number and target.passport_number == existing.passport_number:
            matching_features.append("Passport Exact Match")
            scores.append(1.0)
            weights.append(0.3)

        # Phone overlap
        target_phones = set(target.phone_ids)
        existing_phones = set(existing.phone_ids)
        if target_phones and existing_phones and target_phones.intersection(existing_phones):
            matching_features.append(f"Phone Match ({len(target_phones.intersection(existing_phones))} numbers)")
            scores.append(1.0)
            weights.append(0.25)

        # Name similarity
        name_sim = self.string_similarity(target.full_name, existing.full_name)
        if name_sim > 0.7:
            matching_features.append(f"Full Name Match ({int(name_sim * 100)}%)")
            scores.append(name_sim)
            weights.append(0.25)

        # Alias matching
        for alias in target.aliases:
            if alias in existing.aliases or self.string_similarity(alias, existing.full_name) > 0.85:
                matching_features.append(f"Alias Match: '{alias}'")
                scores.append(0.9)
                weights.append(0.15)
                break

        # Calculate weighted score
        if not scores:
            return None

        total_weight = sum(weights)
        weighted_score = sum(s * w for s, w in zip(scores, weights)) / total_weight if total_weight > 0 else 0.0

        if weighted_score < 0.5:
            return None

        pct = int(weighted_score * 100)
        explanation = (
            f"Candidate match between '{target.full_name}' and existing entity '{existing.full_name}' "
            f"based on {', '.join(matching_features)}. Analytical Confidence: {pct}%."
        )

        return EntityResolutionMatch(
            candidate_id=existing.id,
            candidate_name=existing.full_name,
            similarity_score=round(weighted_score, 4),
            percentage=pct,
            matching_features=matching_features,
            explanation=explanation,
            review_status="PENDING_INVESTIGATOR_APPROVAL",
        )

    def find_matches_for_person(self, person: Person) -> List[EntityResolutionMatch]:
        matches = []
        for existing_person in self.store.persons.values():
            if existing_person.id == person.id:
                continue
            match = self.compare_persons(person, existing_person)
            if match:
                matches.append(match)

        # Sort by similarity score descending
        matches.sort(key=lambda m: m.similarity_score, reverse=True)
        return matches
