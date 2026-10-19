"""Human-readable display model and template engine for TARKA evidence facts.

Part of Phase U (UI Rebuild: "Show the answer, not the database").
Transforms raw formal SMT facts (FACT_001, clk_telco, T1) into intuitive,
plain-language models for investigators without solver jargon.
"""

from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field

from tarka.core.models import Fact, FactKind, AuthType, GeographicRegion
from tarka.core.timezones import IST_TIMEZONE


class TechnicalDetails(BaseModel):
    """Raw forensic metadata isolated in collapsed technical drawers."""
    fact_id: str = Field(description="Raw internal ID, e.g. FACT_CASE_A_CDR_BLR")
    clock_id: str = Field(description="Raw clock domain ID, e.g. clk_telco_ntp")
    device_id: str = Field(description="Raw device/subscriber identifier")
    raw_kind: str = Field(description="Raw FactKind enum value")
    tier: str = Field(description="Trust tier: T1, T2, T3")
    auth_type: str = Field(description="Authentication track: passive, active")
    source_file: str = Field(description="Raw filename on disk")
    line_ref: str = Field(description="Source file line or row reference")
    sha256: str = Field(description="Full SHA-256 hash of raw source artifact")
    sha256_short: str = Field(description="Truncated SHA-256 prefix for quick visual reference")
    coordinates: Optional[Dict[str, float]] = Field(
        default=None,
        description="Raw decimal degrees lat/lon and uncertainty radius in meters"
    )
    raw_payload: Dict[str, Any] = Field(default_factory=dict)


class FactDisplayModel(BaseModel):
    """Investigator-facing plain-language representation of an evidence fact."""
    # Plain language identifiers
    title: str = Field(
        description="One-line plain language title, e.g. 'Phone connected to Bengaluru tower'"
    )
    time_display: str = Field(
        description="Formatted local time, e.g. '2:15 PM IST, 12 Mar'"
    )
    time_short: str = Field(description="Short time string, e.g. '2:15 PM'")
    date_display: str = Field(description="Formatted date, e.g. '12 Mar 2026'")
    is_timestamp_missing: bool = Field(
        default=False,
        description="True if the underlying evidence source lacked temporal metadata."
    )
    source_label: str = Field(
        description="Human-readable source badge, e.g. 'Airtel call records', 'SBI statement'"
    )
    place_name: str = Field(
        description="Human-readable location, e.g. 'Bengaluru (Koramangala)'"
    )
    lane: str = Field(
        description="Timeline lane: 'Phone activity' or 'Person actions'"
    )
    lane_id: str = Field(
        description="Lane identifier: 'phone' or 'person'"
    )
    lane_tooltip: str = Field(
        description="Explanation of the lane (passive device presence vs active human authentication)"
    )
    uncertainty_tooltip: str = Field(
        description="Clock uncertainty statement, e.g. 'Clock uncertainty ±2 min'"
    )
    uncertainty_seconds: float = Field(
        description="Nominal clock uncertainty in seconds for visual whisker scaling"
    )
    
    # Technical details isolated in collapsed drawer
    technical_details: TechnicalDetails


# Curated table of major Indian landmarks and city centroids for offline place-name resolution
KNOWN_INDIAN_LOCATIONS: List[Tuple[str, float, float]] = [
    # Bengaluru & Karnataka
    ("Koramangala, Bengaluru", 12.9352, 77.6245),
    ("MG Road, Bengaluru", 12.9756, 77.6066),
    ("Indiranagar, Bengaluru", 12.9784, 77.6408),
    ("Whitefield, Bengaluru", 12.9698, 77.7500),
    ("Kempegowda Airport, Bengaluru", 13.1986, 77.7066),
    ("Bengaluru", 12.9716, 77.5946),
    ("Tumakuru", 13.3409, 77.1010),
    ("Mysuru", 12.2958, 76.6394),
    ("Hosur", 12.7409, 77.8253),

    # Delhi NCR
    ("Connaught Place, New Delhi", 28.6315, 77.2167),
    ("IGI Airport, New Delhi", 28.5562, 77.1000),
    ("Nehru Place, New Delhi", 28.5494, 77.2536),
    ("New Delhi", 28.6139, 77.2090),
    ("Noida", 28.5355, 77.3910),
    ("Gurugram", 28.4595, 77.0266),

    # Mumbai & Maharashtra
    ("Bandra, Mumbai", 19.0596, 72.8295),
    ("Nariman Point, Mumbai", 18.9260, 72.8230),
    ("Andheri, Mumbai", 19.1136, 72.8697),
    ("CSMT, Mumbai", 18.9400, 72.8353),
    ("Mumbai", 19.0760, 72.8777),
    ("Pune", 18.5204, 73.8567),

    # Goa
    ("Panaji, Goa", 15.4909, 73.8278),
    ("Margao, Goa", 15.2736, 73.9580),
    ("Dabolim Airport, Goa", 15.3808, 73.8314),

    # Eastern & North-Eastern India
    ("Park Street, Kolkata", 22.5510, 88.3526),
    ("Howrah, Kolkata", 22.5850, 88.3426),
    ("Kolkata", 22.5726, 88.3639),
    ("Guwahati", 26.1445, 91.7362),
    ("Patna", 25.5941, 85.1376),

    # Southern & Western India
    ("Hyderabad", 17.3850, 78.4867),
    ("Chennai", 13.0827, 80.2707),
    ("Ahmedabad", 23.0225, 72.5714),
    ("Jaipur", 26.9124, 75.7873),
    ("Lucknow", 26.8467, 80.9462),
]


def _haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two decimal coordinates in km."""
    import math
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def resolve_place_name(region: Optional[GeographicRegion], raw_payload: Optional[Dict[str, Any]] = None) -> str:
    """Resolves coordinates into human-readable Indian city or landmark names."""
    if raw_payload:
        for key in ("city", "location_name", "place_name", "circle_name"):
            val = raw_payload.get(key)
            if val and isinstance(val, str) and val.strip():
                return val.strip()

    if region is None:
        return "Location not recorded"

    # Find closest known location
    best_name = None
    best_dist = float("inf")
    for name, k_lat, k_lon in KNOWN_INDIAN_LOCATIONS:
        dist = _haversine_distance_km(region.latitude, region.longitude, k_lat, k_lon)
        if dist < best_dist:
            best_dist = dist
            best_name = name

    # If within 25 km of known landmark/city, use it
    if best_name and best_dist <= 25.0:
        return best_name
    elif best_name and best_dist <= 60.0:
        return f"Near {best_name}"
    else:
        return f"Lat {region.latitude:.3f}°, Lon {region.longitude:.3f}°"


def resolve_source_label(source_file: str, kind: FactKind) -> str:
    """Converts raw source file names into human-readable source badges."""
    s_lower = source_file.lower()

    if "airtel" in s_lower:
        return "Airtel call records"
    if "jio" in s_lower:
        return "Jio call records"
    if "vodafone" in s_lower or "_vi_" in s_lower or s_lower.startswith("vi_") or "vi_cdr" in s_lower or "idea" in s_lower:
        return "Vodafone Idea call records"
    if "bsnl" in s_lower:
        return "BSNL call records"
    if "sbi" in s_lower:
        return "SBI bank statement"
    if "hdfc" in s_lower:
        return "HDFC Bank statement"
    if "icici" in s_lower:
        return "ICICI Bank statement"
    if "axis" in s_lower:
        return "Axis Bank statement"
    if "whatsapp" in s_lower or "wa_" in s_lower:
        return "WhatsApp chat export"
    if "witness" in s_lower or "alibi" in s_lower or "statement" in s_lower or "complaint" in s_lower:
        return "Witness statement"
    if "cctv" in s_lower:
        return "CCTV camera log"
    if "exif" in s_lower or s_lower.endswith(".jpg") or s_lower.endswith(".png"):
        return "Photo metadata (EXIF)"

    # Fallbacks based on FactKind
    if kind in (FactKind.CDR_CALL, FactKind.CDR_SMS, FactKind.CDR_DATA):
        return "Carrier call records"
    if kind == FactKind.UPI_PAYMENT:
        return "UPI payment statement"
    if kind == FactKind.BANK_TXN:
        return "Bank statement"
    if kind == FactKind.WA_MESSAGE:
        return "Chat export"
    if kind == FactKind.EXIF_PHOTO:
        return "Camera photo file"
    if kind == FactKind.CLAIM:
        return "Witness statement"

    return "Evidence record"


def format_epoch_to_local_ist(epoch_seconds: float) -> Tuple[str, str, str]:
    """Formats epoch seconds into local IST strings: (time_display, time_short, date_display).
    
    Example: (
        '10:15 AM IST, 26 Jan 2026',
        '10:15 AM',
        '26 Jan 2026'
    )
    """
    dt = datetime.datetime.fromtimestamp(epoch_seconds, tz=IST_TIMEZONE)
    time_str = dt.strftime("%I:%M %p").lstrip("0")
    date_str = dt.strftime("%d %b %Y").lstrip("0")
    time_display = f"{time_str} IST, {date_str}"
    return time_display, time_str, date_str


def generate_event_title(kind: FactKind, place_name: str, raw_payload: Optional[Dict[str, Any]] = None) -> str:
    """Generates plain-language one-line event titles from templates based on fact type."""
    raw = raw_payload or {}
    has_place = place_name and place_name != "Location not recorded"

    if kind == FactKind.CDR_CALL:
        call_type = str(raw.get("call_type", "")).lower()
        if "out" in call_type:
            return f"Outgoing phone call via {place_name} tower" if has_place else "Outgoing phone call"
        elif "in" in call_type:
            return f"Incoming phone call via {place_name} tower" if has_place else "Incoming phone call"
        return f"Phone connected to {place_name} tower" if has_place else "Phone connected to cellular network"

    elif kind == FactKind.CDR_SMS:
        return f"SMS transmitted via {place_name} tower" if has_place else "SMS transmitted"

    elif kind == FactKind.CDR_DATA:
        return f"Cellular data session active in {place_name}" if has_place else "Cellular data session active"

    elif kind == FactKind.UPI_PAYMENT:
        amount = raw.get("amount") or raw.get("amount_inr")
        vpa = raw.get("payee_vpa") or raw.get("vpa")
        amt_str = f" of ₹{float(amount):,.0f}" if amount is not None else ""
        vpa_str = f" to {vpa}" if vpa else ""
        if has_place:
            return f"UPI payment{amt_str}{vpa_str} sent in {place_name}"
        return f"UPI payment{amt_str}{vpa_str} sent"

    elif kind == FactKind.BANK_TXN:
        amount = raw.get("amount") or raw.get("amount_inr")
        txn_type = str(raw.get("type", "")).lower()
        amt_str = f" of ₹{float(amount):,.0f}" if amount is not None else ""
        if "atm" in txn_type or "cash" in txn_type:
            return f"ATM cash withdrawal{amt_str} in {place_name}" if has_place else f"ATM cash withdrawal{amt_str}"
        return f"Bank transaction{amt_str} recorded in {place_name}" if has_place else f"Bank transaction{amt_str} recorded"

    elif kind == FactKind.WA_MESSAGE:
        sender = raw.get("sender")
        sender_str = f" from {sender}" if sender else ""
        return f"WhatsApp message{sender_str} in {place_name}" if has_place else f"WhatsApp message{sender_str} sent"

    elif kind == FactKind.EXIF_PHOTO:
        camera = raw.get("camera_model")
        cam_str = f" with {camera}" if camera else ""
        return f"Photo captured{cam_str} in {place_name}" if has_place else f"Photo captured{cam_str}"

    elif kind == FactKind.CLAIM:
        person = raw.get("claimant") or "Claimant"
        return f"{person} claims presence in {place_name}" if has_place else f"{person} provides testimonial alibi"

    return f"Event recorded in {place_name}" if has_place else "Event recorded"


def format_uncertainty_tooltip(uncertainty_sec: float) -> str:
    """Formats instrument/clock uncertainty into user-friendly tooltip string."""
    if uncertainty_sec < 60.0:
        return f"Clock uncertainty ±{int(round(uncertainty_sec))} sec"
    mins = uncertainty_sec / 60.0
    if mins.is_integer():
        return f"Clock uncertainty ±{int(mins)} min"
    return f"Clock uncertainty ±{mins:.1f} min"


def build_fact_display_model(
    fact: Fact,
    clock_bounds: Optional[Dict[str, float]] = None,
) -> FactDisplayModel:
    """Transforms a raw Fact into a human-readable FactDisplayModel for investigators.
    
    All raw internal identifiers (FACT_..., clk_...) and technical metadata
    are encapsulated inside technical_details for the drawer only.
    """
    bounds = clock_bounds or {}
    c_bound = bounds.get(fact.clock_id, 120.0)

    # 1. Human-readable place name
    place = resolve_place_name(fact.region, fact.raw_payload)

    # 2. Plain-language title
    title = generate_event_title(fact.kind, place, fact.raw_payload)

    # 3. Source label badge
    source_label = resolve_source_label(fact.source_file, fact.kind)

    # 4. Formatted local IST time
    is_ts_missing = bool(fact.raw_payload.get("is_timestamp_missing", False))
    if is_ts_missing:
        t_disp = "Timestamp not recorded"
        t_short = "N/A"
        d_disp = "Date not recorded"
    else:
        t_disp, t_short, d_disp = format_epoch_to_local_ist(fact.time_window.reported_epoch)

    # 5. Lane allocation: Phone activity vs Person actions
    if fact.auth_type == AuthType.PASSIVE:
        lane = "Phone activity"
        lane_id = "phone"
        lane_tooltip = "Passive device telemetry (cellular tower ping, Wi-Fi beacon) proving mobile handset location only."
    else:
        lane = "Person actions"
        lane_id = "person"
        lane_tooltip = "Active human action (UPI PIN authorization, biometric unlock, chat response, testimonial statement)."

    # 6. Uncertainty tooltip
    # Use max of nominal clock bound and time-window half-width
    half_window = (fact.time_window.end_epoch - fact.time_window.start_epoch) / 2.0
    total_uncertainty = max(c_bound, half_window, 2.0)
    unc_tooltip = format_uncertainty_tooltip(total_uncertainty)

    # 7. Coordinates for technical drawer
    coords = None
    if fact.region:
        coords = {
            "latitude": fact.region.latitude,
            "longitude": fact.region.longitude,
            "radius_meters": fact.region.radius_meters,
        }

    tech_details = TechnicalDetails(
        fact_id=fact.id,
        clock_id=fact.clock_id,
        device_id=fact.device_id,
        raw_kind=fact.kind.value if hasattr(fact.kind, "value") else str(fact.kind),
        tier=fact.tier.value if hasattr(fact.tier, "value") else str(fact.tier),
        auth_type=fact.auth_type.value if hasattr(fact.auth_type, "value") else str(fact.auth_type),
        source_file=fact.source_file,
        line_ref=fact.line_ref,
        sha256=fact.sha256,
        sha256_short=fact.sha256[:12] if fact.sha256 else "0" * 12,
        coordinates=coords,
        raw_payload=fact.raw_payload,
    )

    return FactDisplayModel(
        title=title,
        time_display=t_disp,
        time_short=t_short,
        date_display=d_disp,
        is_timestamp_missing=is_ts_missing,
        source_label=source_label,
        place_name=place,
        lane=lane,
        lane_id=lane_id,
        lane_tooltip=lane_tooltip,
        uncertainty_tooltip=unc_tooltip,
        uncertainty_seconds=total_uncertainty,
        technical_details=tech_details,
    )
