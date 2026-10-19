"""Conservative multi-modal travel physics model for TARKA.

Computes physical travel lower bounds between two geographic regions
taking the minimum across conservative transportation modes (Road, Rail, Air),
subtracting positional uncertainty radii to guarantee forensically safe bounds.
Speeds and parameters are fully configurable and recorded in all output reports.
"""

from __future__ import annotations

import math
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

from tarka.core.models import GeographicRegion


class TravelSpeedConfig(BaseModel):
    """Configurable conservative travel velocity limits and logistical overheads."""
    ground_max_speed_kmh: float = Field(
        default=140.0,
        description="Conservative maximum road transit speed (km/h)"
    )
    rail_max_speed_kmh: float = Field(
        default=180.0,
        description="Conservative maximum high-speed rail transit speed (km/h)"
    )
    air_max_speed_kmh: float = Field(
        default=900.0,
        description="Conservative maximum commercial flight cruising speed (km/h)"
    )
    air_min_distance_km: float = Field(
        default=80.0,
        description="Minimum transit distance for commercial flight eligibility (km)"
    )
    air_overhead_minutes: float = Field(
        default=75.0,
        description="Logistical flight overhead (airport check-in, security, boarding) in minutes"
    )
    road_factor: float = Field(
        default=0.85,
        description="Offline road factor lower bound multiplier"
    )


class TravelBoundResult(BaseModel):
    """Forensic travel feasibility bounds between two spatial coordinates."""
    haversine_distance_km: float = Field(description="Great-circle distance between centroids")
    effective_distance_km: float = Field(description="Distance minus combined uncertainty radii")
    min_travel_seconds: float = Field(description="Absolute minimum physical travel time in seconds")
    governing_mode: str = Field(description="Mode offering the fastest lower bound (GROUND, RAIL, AIR)")
    speed_config_used: Dict[str, Any] = Field(description="Audit record of configuration parameters used")


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance in kilometers using the Haversine formula."""
    r_earth = 6371.0088  # Mean Earth radius in km

    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r_earth * c


def compute_travel_lower_bound(
    r1: GeographicRegion,
    r2: GeographicRegion,
    config: Optional[TravelSpeedConfig] = None,
) -> TravelBoundResult:
    """Computes the conservative minimum travel time between two regions.

    1. Calculates centroid great-circle distance.
    2. Subtracts combined positional uncertainty radii (r1.radius + r2.radius).
    3. Evaluates Ground, Rail, and Air (if distance > air_min_distance_km).
    4. Chooses the minimum time across modes.
    5. Returns result alongside exact config used for audit logging.
    """
    cfg = config or TravelSpeedConfig()

    d_raw = haversine_distance_km(r1.latitude, r1.longitude, r2.latitude, r2.longitude)
    uncertainty_km = (r1.radius_meters + r2.radius_meters) / 1000.0
    d_eff = max(0.0, d_raw - uncertainty_km)

    if d_eff <= 1e-4:
        return TravelBoundResult(
            haversine_distance_km=round(d_raw, 4),
            effective_distance_km=0.0,
            min_travel_seconds=0.0,
            governing_mode="CO_LOCATED",
            speed_config_used=cfg.model_dump(),
        )

    # 1. Ground lower bound (0.85 road factor applied or max ground speed)
    effective_ground_speed = cfg.ground_max_speed_kmh / cfg.road_factor
    time_ground_sec = (d_eff / effective_ground_speed) * 3600.0

    # 2. Rail lower bound
    time_rail_sec = (d_eff / cfg.rail_max_speed_kmh) * 3600.0

    # 3. Air lower bound (available only if distance exceeds minimum flight threshold)
    if d_eff >= cfg.air_min_distance_km:
        flight_hours = d_eff / cfg.air_max_speed_kmh
        overhead_hours = cfg.air_overhead_minutes / 60.0
        time_air_sec = (flight_hours + overhead_hours) * 3600.0
    else:
        time_air_sec = float("inf")

    # Minimum across modes
    candidates = [
        ("GROUND", time_ground_sec),
        ("RAIL", time_rail_sec),
        ("AIR", time_air_sec),
    ]
    governing_mode, min_seconds = min(candidates, key=lambda x: x[1])

    return TravelBoundResult(
        haversine_distance_km=round(d_raw, 4),
        effective_distance_km=round(d_eff, 4),
        min_travel_seconds=round(min_seconds, 2),
        governing_mode=governing_mode,
        speed_config_used=cfg.model_dump(),
    )
