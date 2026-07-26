"""
SentinelX AI Platform

Feature Vector Model

Canonical feature representation consumed by every
AI engine.

This object contains only normalized features.

No database logic.
No Neo4j.
No FastAPI.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class FeatureVector:
    """
    Normalized AI feature vector.

    Every investigation entity should eventually be
    convertible into this representation.
    """

    persons: frozenset[str] = field(default_factory=frozenset)

    phones: frozenset[str] = field(default_factory=frozenset)

    vehicles: frozenset[str] = field(default_factory=frozenset)

    locations: frozenset[str] = field(default_factory=frozenset)

    organizations: frozenset[str] = field(default_factory=frozenset)

    communication: frozenset[str] = field(default_factory=frozenset)

    timeline: frozenset[str] = field(default_factory=frozenset)

    modus_operandi: frozenset[str] = field(default_factory=frozenset)

    financial: frozenset[str] = field(default_factory=frozenset)

    digital: frozenset[str] = field(default_factory=frozenset)

    documents: frozenset[str] = field(default_factory=frozenset)

    fingerprint: frozenset[str] = field(default_factory=frozenset)

    dna: frozenset[str] = field(default_factory=frozenset)

    face: frozenset[str] = field(default_factory=frozenset)
