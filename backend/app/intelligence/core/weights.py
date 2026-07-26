"""
SentinelX AI Platform

Weight Profiles

Centralized AI weighting system.

Every AI algorithm must obtain weights from this module.

Never hardcode scoring values anywhere else.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class WeightProfile:

    phone: float

    vehicle: float

    location: float

    timeline: float

    person: float

    organization: float

    communication: float

    modus_operandi: float

    financial: float

    digital: float

    fingerprint: float

    dna: float

    face: float

    document: float

    other: float

    @property
    def total(self) -> float:

        return (
            self.phone
            + self.vehicle
            + self.location
            + self.timeline
            + self.person
            + self.organization
            + self.communication
            + self.modus_operandi
            + self.financial
            + self.digital
            + self.fingerprint
            + self.dna
            + self.face
            + self.document
            + self.other
        )

    def validate(self) -> None:

        if abs(self.total - 1.0) > 0.0001:
            raise ValueError(f"Weight profile must sum to 1.0 (found {self.total:.4f})")


DEFAULT_PROFILE = WeightProfile(
    phone=0.08,
    vehicle=0.08,
    location=0.10,
    timeline=0.07,
    person=0.18,
    organization=0.05,
    communication=0.10,
    modus_operandi=0.10,
    financial=0.05,
    digital=0.05,
    fingerprint=0.04,
    dna=0.04,
    face=0.01,
    document=0.005,
    other=0.045,
)

DEFAULT_PROFILE.validate()


class WeightRegistry:
    def __init__(self) -> None:
        self._profiles = {
            "default": DEFAULT_PROFILE,
        }

    def register(
        self,
        name: str,
        profile: WeightProfile,
    ) -> None:
        profile.validate()
        self._profiles[name] = profile

    def get(
        self,
        name: str = "default",
    ) -> WeightProfile:
        return self._profiles[name]


registry = WeightRegistry()
