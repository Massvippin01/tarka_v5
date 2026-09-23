from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional, Tuple


class ConsistencyVerdict(str, Enum):
    CONSISTENT = "CONSISTENT"
    POSSIBLY_CONSISTENT = "POSSIBLY_CONSISTENT"
    INCONSISTENT = "INCONSISTENT"
    INSUFFICIENT_INFORMATION = "INSUFFICIENT_INFORMATION"


@dataclass(slots=True)
class TravelModel:
    model_name: str = "URBAN_GROUND_VEHICLE"
    max_feasible_speed_kmh: float = 90.0
    nominal_speed_kmh: float = 40.0
    impossibility_threshold_kmh: float = 120.0
    congestion_delay_factor: float = 1.3
    minimum_transition_seconds: float = 60.0


@dataclass(slots=True)
class SpatioTemporalPoint:
    timestamp: datetime
    lat: Optional[float] = None
    lng: Optional[float] = None
    label: Optional[str] = None
    location_uncertainty_meters: float = 100.0
    time_uncertainty_seconds: float = 15.0


@dataclass(slots=True)
class ConsistencyEvaluation:
    verdict: ConsistencyVerdict
    distance_km: float
    time_delta_seconds: float
    required_speed_kmh: float
    minimum_feasible_travel_seconds: float
    maximum_feasible_travel_seconds: float
    explanation: str
    travel_model: str


class TemporalSpatialConsistencyEngine:
    """
    Evaluates kinematic and temporal consistency between two geographic observations.
    Calculates geodesic distance, time delta, required transit speed, and feasibility bounds
    according to configurable physical travel models without hardcoded heuristics.
    """

    EARTH_RADIUS_KM = 6371.0

    @classmethod
    def haversine_distance_km(cls, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate the great-circle distance between two points on the Earth."""
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
        return cls.EARTH_RADIUS_KM * c

    @classmethod
    def parse_datetime(cls, val: Any) -> Optional[datetime]:
        if isinstance(val, datetime):
            return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
        if isinstance(val, str):
            try:
                dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
                return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            except ValueError:
                return None
        return None

    @classmethod
    def evaluate_points(
        cls,
        p1: SpatioTemporalPoint,
        p2: SpatioTemporalPoint,
        model: Optional[TravelModel] = None,
    ) -> ConsistencyEvaluation:
        t_model = model or TravelModel()

        # Check for sufficient information
        if p1.lat is None or p1.lng is None or p2.lat is None or p2.lng is None:
            return ConsistencyEvaluation(
                verdict=ConsistencyVerdict.INSUFFICIENT_INFORMATION,
                distance_km=0.0,
                time_delta_seconds=0.0,
                required_speed_kmh=0.0,
                minimum_feasible_travel_seconds=0.0,
                maximum_feasible_travel_seconds=0.0,
                explanation="Missing spatial coordinates for one or both observation points.",
                travel_model=t_model.model_name,
            )

        if not p1.timestamp or not p2.timestamp:
            return ConsistencyEvaluation(
                verdict=ConsistencyVerdict.INSUFFICIENT_INFORMATION,
                distance_km=0.0,
                time_delta_seconds=0.0,
                required_speed_kmh=0.0,
                minimum_feasible_travel_seconds=0.0,
                maximum_feasible_travel_seconds=0.0,
                explanation="Missing timestamp for one or both observation points.",
                travel_model=t_model.model_name,
            )

        # Calculate spatial distance
        raw_distance_km = cls.haversine_distance_km(p1.lat, p1.lng, p2.lat, p2.lng)
        # Apply route tortuosity factor (roads are rarely straight lines)
        estimated_road_distance_km = raw_distance_km * t_model.congestion_delay_factor

        # Calculate time delta and apply uncertainty window
        raw_time_delta_seconds = abs((p2.timestamp - p1.timestamp).total_seconds())
        total_time_uncertainty = p1.time_uncertainty_seconds + p2.time_uncertainty_seconds
        
        # Max feasible speed transit time (seconds)
        min_feasible_seconds = (estimated_road_distance_km / t_model.max_feasible_speed_kmh) * 3600.0
        # Nominal speed transit time (seconds)
        nominal_seconds = (estimated_road_distance_km / t_model.nominal_speed_kmh) * 3600.0

        # Required transit speed
        effective_time_hours = (raw_time_delta_seconds + total_time_uncertainty) / 3600.0
        if effective_time_hours > 0:
            required_speed_kmh = estimated_road_distance_km / effective_time_hours
        else:
            required_speed_kmh = float("inf") if estimated_road_distance_km > 0.1 else 0.0

        # Determine Verdict
        if raw_distance_km < 0.2 and raw_time_delta_seconds < 120:
            # Same location in close time
            verdict = ConsistencyVerdict.CONSISTENT
            explanation = f"Co-located observations within {raw_distance_km*1000:.0f}m."
        elif required_speed_kmh > t_model.impossibility_threshold_kmh:
            verdict = ConsistencyVerdict.INCONSISTENT
            explanation = (
                f"Physically implausible transit: requires {required_speed_kmh:.1f} km/h "
                f"to cover {estimated_road_distance_km:.1f} km in {raw_time_delta_seconds/60:.1f} minutes "
                f"(max threshold: {t_model.impossibility_threshold_kmh:.1f} km/h under {t_model.model_name})."
            )
        elif required_speed_kmh > t_model.max_feasible_speed_kmh:
            verdict = ConsistencyVerdict.POSSIBLY_CONSISTENT
            explanation = (
                f"High-speed transit required ({required_speed_kmh:.1f} km/h); "
                f"exceeds nominal {t_model.max_feasible_speed_kmh:.1f} km/h but within extreme bounds."
            )
        else:
            verdict = ConsistencyVerdict.CONSISTENT
            explanation = (
                f"Kinematically consistent: {estimated_road_distance_km:.1f} km traversed at "
                f"{required_speed_kmh:.1f} km/h over {raw_time_delta_seconds/60:.1f} minutes."
            )

        return ConsistencyEvaluation(
            verdict=verdict,
            distance_km=round(estimated_road_distance_km, 2),
            time_delta_seconds=raw_time_delta_seconds,
            required_speed_kmh=round(required_speed_kmh, 1),
            minimum_feasible_travel_seconds=round(min_feasible_seconds, 1),
            maximum_feasible_travel_seconds=round(nominal_seconds * 1.5, 1),
            explanation=explanation,
            travel_model=t_model.model_name,
        )
