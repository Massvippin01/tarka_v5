"""
Feature Vector Builder

Converts raw investigation data into a canonical
AI feature representation.
"""

from __future__ import annotations

from app.intelligence.models.feature_vector import FeatureVector


class FeatureVectorBuilder:
    """
    Builder responsible for constructing immutable
    FeatureVector objects.
    """

    def build(
        self,
        *,
        persons: set[str] | None = None,
        phones: set[str] | None = None,
        vehicles: set[str] | None = None,
        locations: set[str] | None = None,
        organizations: set[str] | None = None,
        communication: set[str] | None = None,
        timeline: set[str] | None = None,
        modus_operandi: set[str] | None = None,
        financial: set[str] | None = None,
        digital: set[str] | None = None,
        documents: set[str] | None = None,
        fingerprint: set[str] | None = None,
        dna: set[str] | None = None,
        face: set[str] | None = None,
    ) -> FeatureVector:

        return FeatureVector(
            persons=frozenset(persons or ()),
            phones=frozenset(phones or ()),
            vehicles=frozenset(vehicles or ()),
            locations=frozenset(locations or ()),
            organizations=frozenset(organizations or ()),
            communication=frozenset(communication or ()),
            timeline=frozenset(timeline or ()),
            modus_operandi=frozenset(modus_operandi or ()),
            financial=frozenset(financial or ()),
            digital=frozenset(digital or ()),
            documents=frozenset(documents or ()),
            fingerprint=frozenset(fingerprint or ()),
            dna=frozenset(dna or ()),
            face=frozenset(face or ()),
        )
