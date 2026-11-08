"""Core data structures and schemas for TARKA."""

from __future__ import annotations

import hashlib
import json
from enum import Enum
from typing import Any, Dict, List, Optional
try:
    from pydantic import BaseModel, Field, field_validator, model_validator
except ImportError:
    class BaseModel:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def model_dump(self, mode: str = "python") -> Dict[str, Any]:
            res = {}
            for k, v in self.__dict__.items():
                if isinstance(v, Enum):
                    res[k] = v.value
                elif isinstance(v, list):
                    res[k] = [item.model_dump() if hasattr(item, "model_dump") else item for item in v]
                elif hasattr(v, "model_dump"):
                    res[k] = v.model_dump()
                else:
                    res[k] = v
            return res

    def field_validator(*args, **kwargs):  # type: ignore
        def dec(fn):
            return fn
        return dec

    def model_validator(*args, **kwargs):  # type: ignore
        def dec(fn):
            return fn
        return dec

    def Field(default=None, default_factory=None, **kwargs):  # type: ignore
        if default_factory is not None:
            return default_factory()
        return default


class TrustTier(str, Enum):
    """Forensic trust tier ranking evidence source tamper resistance."""
    T1 = "T1"  # Third-party held: Telco CDRs, Core Banking, Gateway logs
    T2 = "T2"  # Device logs: OS syslog, secure app sandbox databases
    T3 = "T3"  # User-controllable: WhatsApp txt exports, gallery EXIF, manual claims


class AuthType(str, Enum):
    """Separates device presence telemetry from intentional human authentication."""
    PASSIVE = "passive"  # Tower ping, Wi-Fi beacon, background push (device presence only)
    ACTIVE = "active"    # UPI PIN entered, biometric unlock, call answered, claim attested


class FactKind(str, Enum):
    """Categorical classification of ingested digital evidence and claims."""
    CDR_CALL = "CDR_CALL"
    CDR_SMS = "CDR_SMS"
    CDR_DATA = "CDR_DATA"
    UPI_PAYMENT = "UPI_PAYMENT"
    BANK_TXN = "BANK_TXN"
    WA_MESSAGE = "WA_MESSAGE"
    EXIF_PHOTO = "EXIF_PHOTO"
    CLAIM = "CLAIM"  # Testimonial or alibi statements (e.g. suspect/witness statement)


class TimeWindow(BaseModel):
    """Bounded epoch time interval capturing instrument precision and uncertainty."""
    start_epoch: float = Field(description="Earliest bound of event (epoch seconds)")
    end_epoch: float = Field(description="Latest bound of event (epoch seconds)")
    reported_epoch: float = Field(description="Nominal reported timestamp (epoch seconds)")

    @model_validator(mode="after")
    def validate_time_window(self) -> TimeWindow:
        if self.end_epoch < self.start_epoch:
            raise ValueError(f"end_epoch ({self.end_epoch}) cannot be earlier than start_epoch ({self.start_epoch})")
        if not (self.start_epoch <= self.reported_epoch <= self.end_epoch):
            # Allow micro-epsilon for floating point comparisons
            eps = 1e-4
            if self.reported_epoch < (self.start_epoch - eps) or self.reported_epoch > (self.end_epoch + eps):
                raise ValueError(
                    f"reported_epoch ({self.reported_epoch}) must fall within "
                    f"[{self.start_epoch}, {self.end_epoch}]"
                )
        return self


class GeographicRegion(BaseModel):
    """Geographic centroid with spatial uncertainty radius."""
    latitude: float = Field(ge=-90.0, le=90.0, description="Latitude in decimal degrees")
    longitude: float = Field(ge=-180.0, le=180.0, description="Longitude in decimal degrees")
    radius_meters: float = Field(ge=0.0, description="Spatial uncertainty radius in meters")


class Fact(BaseModel):
    """Canonical atomic unit of digital evidence or formal testimonial claim."""
    id: str = Field(description="Deterministic unique identifier (e.g., FACT_001)")
    source_file: str = Field(description="Identifier or path of raw evidence artifact")
    sha256: str = Field(description="SHA-256 hex digest of raw source artifact")
    line_ref: str = Field(description="Human-auditable record locator (row, line, offset)")
    kind: FactKind = Field(description="Categorical kind of fact")
    time_window: TimeWindow = Field(description="Temporal interval and nominal timestamp")
    region: Optional[GeographicRegion] = Field(
        default=None,
        description="Spatial centroid and uncertainty radius if available (None if unlocated)"
    )
    tier: TrustTier = Field(description="Evidence trust tier")
    device_id: str = Field(description="Hardware or subscriber anchor (IMEI, phone, account)")
    clock_id: str = Field(description="Clock reference domain (e.g. telco_ntp, handset_rtc)")
    entity_refs: List[str] = Field(
        default_factory=list,
        description="Associated entity identifiers (persons, accounts, handles)"
    )
    auth_type: AuthType = Field(description="Separates physical presence from deliberate action")
    raw_payload: Dict[str, Any] = Field(
        default_factory=dict,
        description="Preserved raw source fields for forensic auditing"
    )
    display: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Human-readable display model (title, time_display, place_name, source_label)"
    )

    @field_validator("sha256")
    def validate_sha256(cls, v: str) -> str:
        clean = v.strip().lower()
        if len(clean) != 64 or not all(c in "0123456789abcdef" for c in clean):
            raise ValueError(f"Invalid SHA-256 hash string: {v}")
        return clean

    def canonical_json(self) -> str:
        """Returns deterministic canonical JSON string for hashing and custody."""
        d = self.model_dump(mode="json")
        d.pop("display", None)
        return json.dumps(d, sort_keys=True, separators=(",", ":"))


    def compute_fact_sha256(self) -> str:
        """Computes SHA-256 hash of the canonical fact payload."""
        return hashlib.sha256(self.canonical_json().encode("utf-8")).hexdigest()


class CustodyEntry(BaseModel):
    """A single link in the tamper-evident hash-chained custody ledger."""
    seq: int = Field(ge=0, description="Monotonically increasing sequence number")
    prev_hash: str = Field(description="SHA-256 hash of the preceding block")
    timestamp_iso: str = Field(description="UTC timestamp of the custody action")
    action: str = Field(description="Forensic action performed (INGEST, VERIFY, QUERY, etc.)")
    fact_id: Optional[str] = Field(default=None, description="Related Fact ID if applicable")
    payload_sha256: str = Field(description="SHA-256 hash of associated payload or action data")
    entry_hash: str = Field(description="SHA-256 hash of this entry sealing the chain")
