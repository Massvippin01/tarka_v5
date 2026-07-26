from datetime import datetime
from math import asin, cos, radians, sin, sqrt
from typing import Any


def calculate_set_similarity(
    values_a: set[str],
    values_b: set[str],
) -> float:
    if not values_a and not values_b:
        return 0.0

    union = values_a | values_b

    if not union:
        return 0.0

    intersection = values_a & values_b

    return len(intersection) / len(union)


def extract_modus_operandi_signal(
    case_a: dict[str, Any],
    case_b: dict[str, Any],
) -> dict[str, Any]:
    mo_a = case_a.get("modus_operandi")
    mo_b = case_b.get("modus_operandi")

    if not mo_a or not mo_b:
        return {
            "type": "modus_operandi",
            "strength": 0.0,
            "evidence": [],
            "missing": True,
        }

    attributes = [
        "entry_method",
        "target_type",
        "time_window",
        "power_disabled",
        "cctv_avoided",
    ]

    matches: list[str] = []
    comparable_attributes = 0

    for attribute in attributes:
        value_a = mo_a.get(attribute)
        value_b = mo_b.get(attribute)

        if value_a is None or value_b is None:
            continue

        comparable_attributes += 1

        if value_a == value_b:
            matches.append(f"{attribute}: {value_a}")

    if comparable_attributes == 0:
        strength = 0.0
    else:
        strength = len(matches) / comparable_attributes

    return {
        "type": "modus_operandi",
        "strength": round(strength, 4),
        "evidence": matches,
        "missing": False,
    }


def extract_person_overlap_signal(
    case_a: dict[str, Any],
    case_b: dict[str, Any],
) -> dict[str, Any]:
    person_ids_a = {
        person["id"] for person in case_a.get("persons", []) if person.get("id")
    }

    person_ids_b = {
        person["id"] for person in case_b.get("persons", []) if person.get("id")
    }

    shared_ids = person_ids_a & person_ids_b

    strength = calculate_set_similarity(
        person_ids_a,
        person_ids_b,
    )

    return {
        "type": "person_overlap",
        "strength": round(strength, 4),
        "evidence": sorted(shared_ids),
        "missing": (not person_ids_a or not person_ids_b),
    }


def extract_vehicle_overlap_signal(
    case_a: dict[str, Any],
    case_b: dict[str, Any],
) -> dict[str, Any]:
    vehicle_ids_a = {
        vehicle["id"] for vehicle in case_a.get("vehicles", []) if vehicle.get("id")
    }

    vehicle_ids_b = {
        vehicle["id"] for vehicle in case_b.get("vehicles", []) if vehicle.get("id")
    }

    shared_ids = vehicle_ids_a & vehicle_ids_b

    strength = calculate_set_similarity(
        vehicle_ids_a,
        vehicle_ids_b,
    )

    return {
        "type": "vehicle_overlap",
        "strength": round(strength, 4),
        "evidence": sorted(shared_ids),
        "missing": (not vehicle_ids_a or not vehicle_ids_b),
    }


def parse_neo4j_datetime(value: Any) -> datetime | None:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def extract_temporal_signal(
    case_a: dict[str, Any],
    case_b: dict[str, Any],
) -> dict[str, Any]:
    occurred_a = parse_neo4j_datetime(case_a["case"].get("occurred_at"))

    occurred_b = parse_neo4j_datetime(case_b["case"].get("occurred_at"))

    if occurred_a is None or occurred_b is None:
        return {
            "type": "temporal_proximity",
            "strength": 0.0,
            "evidence": [],
            "missing": True,
        }

    difference = abs(occurred_a - occurred_b)

    days_apart = difference.total_seconds() / 86400

    if days_apart <= 7:
        strength = 1.0
    elif days_apart <= 14:
        strength = 0.8
    elif days_apart <= 30:
        strength = 0.5
    elif days_apart <= 90:
        strength = 0.2
    else:
        strength = 0.0

    return {
        "type": "temporal_proximity",
        "strength": strength,
        "evidence": [f"{round(days_apart, 2)} days apart"],
        "missing": False,
    }


def haversine_distance_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    earth_radius_km = 6371.0

    latitude_difference = radians(latitude_b - latitude_a)

    longitude_difference = radians(longitude_b - longitude_a)

    value = (
        sin(latitude_difference / 2) ** 2
        + cos(radians(latitude_a))
        * cos(radians(latitude_b))
        * sin(longitude_difference / 2) ** 2
    )

    angular_distance = 2 * asin(sqrt(value))

    return earth_radius_km * angular_distance


def extract_geographic_signal(
    case_a: dict[str, Any],
    case_b: dict[str, Any],
) -> dict[str, Any]:
    location_a = case_a.get("location")
    location_b = case_b.get("location")

    if not location_a or not location_b:
        return {
            "type": "geographic_proximity",
            "strength": 0.0,
            "evidence": [],
            "missing": True,
        }

    coordinates = [
        location_a.get("latitude"),
        location_a.get("longitude"),
        location_b.get("latitude"),
        location_b.get("longitude"),
    ]

    if any(value is None for value in coordinates):
        return {
            "type": "geographic_proximity",
            "strength": 0.0,
            "evidence": [],
            "missing": True,
        }

    distance_km = haversine_distance_km(
        float(location_a["latitude"]),
        float(location_a["longitude"]),
        float(location_b["latitude"]),
        float(location_b["longitude"]),
    )

    if distance_km <= 5:
        strength = 1.0
    elif distance_km <= 15:
        strength = 0.8
    elif distance_km <= 30:
        strength = 0.5
    elif distance_km <= 75:
        strength = 0.2
    else:
        strength = 0.0

    return {
        "type": "geographic_proximity",
        "strength": strength,
        "evidence": [f"{round(distance_km, 2)} km apart"],
        "missing": False,
    }


def extract_communication_signal(
    communication_path: dict[str, Any],
) -> dict[str, Any]:
    if not communication_path["exists"]:
        return {
            "type": "communication_path",
            "strength": 0.0,
            "evidence": [],
            "missing": False,
        }

    path_length = communication_path["path_length"]

    if path_length == 1:
        strength = 1.0
    elif path_length == 2:
        strength = 0.75
    elif path_length == 3:
        strength = 0.5
    else:
        strength = 0.0

    return {
        "type": "communication_path",
        "strength": strength,
        "evidence": [f"Phone communication path within {path_length} hop(s)"],
        "missing": False,
    }
