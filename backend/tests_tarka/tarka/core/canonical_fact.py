"""TARKA Canonical Fact & Forensic Event Bridge.

Implements Phase 2 Canonical Fact models:
1. CanonicalFact / ForensicEvent model representing:
   - chat_message
   - payment_request
   - bank_transaction
   - cdr_call
   - media_metadata
   - extracted_identifier
   - contradiction
   - evidence_gap
2. Explicit source pointers back to Evidence DNA (evidence_id, artifact_id, line_ref).
3. Timezone-aware normalization: converts to UTC epoch and ISO-8601 while preserving
   original recorded time, stated timezone, assumed timezone, and conversion rationale.
4. Preserves extraction status (directly_recorded, machine_extracted, inferred, human_confirmed).
5. Strict non-accusatory forensic vocabulary.
"""

from __future__ import annotations

import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from tarka.core.models import (
    Fact,
    FactKind,
    TrustTier,
    AuthType,
    TimeWindow,
    GeographicRegion,
)
from tarka.core.timezones import parse_datetime_forensic, IST_TIMEZONE


class ExtractionStatus(str, Enum):
    """Forensic status of an extracted field or fact."""
    DIRECTLY_RECORDED = "directly_recorded"
    MACHINE_EXTRACTED = "machine_extracted"
    INFERRED = "inferred"
    HUMAN_CONFIRMED = "human_confirmed"


class CanonicalFactKind(str, Enum):
    """Extended categorical classification for Phase 2 Forensic Facts."""
    CHAT_MESSAGE = "chat_message"
    PAYMENT_REQUEST = "payment_request"
    BANK_TRANSACTION = "bank_transaction"
    CDR_CALL = "cdr_call"
    MEDIA_METADATA = "media_metadata"
    EXTRACTED_IDENTIFIER = "extracted_identifier"
    CONTRADICTION = "contradiction"
    EVIDENCE_GAP = "evidence_gap"


class ExtractedField(BaseModel):
    """Fine-grained extracted field preserving source location, raw value, and normalization."""
    case_id: str = Field(description="Associated case identifier")
    artifact_id: str = Field(description="Parent artifact identifier")
    field_name: str = Field(description="Canonical field name (e.g. amount, vpa, msisdn, timestamp)")
    parser_name: str = Field(description="Name of parser responsible for extraction")
    parser_version: str = Field(default="1.0.0", description="Parser semver string")
    source_filename: str = Field(description="Original filename containing this field")
    source_location: str = Field(description="Human-auditable location (e.g. row:14, chat_index:5, exif:DateTimeOriginal)")
    raw_source_value: str = Field(description="Verbatim raw text or byte representation from source")
    normalized_value: Any = Field(description="Normalized typed value (float, ISO string, E.164 phone, lowercase VPA)")
    extraction_status: ExtractionStatus = Field(
        default=ExtractionStatus.MACHINE_EXTRACTED,
        description="Extraction certainty level",
    )
    extraction_confidence: Optional[float] = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Confidence indicator for heuristic or fuzzy extractions",
    )
    parser_warning: Optional[str] = Field(default=None, description="Audit warning if field format was irregular")
    rejection_reason: Optional[str] = Field(default=None, description="Technical rejection rationale if unparseable")


class TimezoneProvenance(BaseModel):
    """Forensic breakdown of timestamp conversion and timezone assumptions."""
    recorded_time: str = Field(description="Verbatim timestamp text as recorded in source")
    stated_timezone: Optional[str] = Field(default=None, description="Timezone explicitly declared in source if any")
    assumed_timezone: str = Field(
        default="Asia/Kolkata (UTC+05:30)",
        description="Timezone assumed during normalization",
    )
    conversion_rationale: str = Field(
        description="Auditable technical rationale explaining UTC conversion calculation",
    )
    utc_iso: str = Field(description="Normalized UTC ISO-8601 string (e.g. 2026-02-14T04:45:00Z)")
    utc_epoch: float = Field(description="Normalized UTC unix epoch seconds for mathematical SMT solving")
    is_inferred: bool = Field(
        default=False,
        description="True if timestamp was not recorded in source evidence and is an inferred/unresolved fallback.",
    )


class CanonicalFact(BaseModel):
    """Canonical forensic event bridging Evidence DNA to SMT reconstruction and correlation."""
    fact_id: str = Field(description="Unique deterministic fact identifier (e.g. FACT-DNA-001)")
    case_id: str = Field(description="Associated case identifier")
    artifact_id: str = Field(description="Parent artifact identifier")
    evidence_id: str = Field(description="Linked Evidence DNA identifier")
    kind: CanonicalFactKind = Field(description="Categorical kind of forensic fact")
    source_filename: str = Field(description="Source artifact filename")
    source_location: str = Field(description="Human-auditable locator in original file (row, line, offset)")
    sha256: str = Field(description="SHA-256 digest of original artifact bitstream")
    time_provenance: TimezoneProvenance = Field(description="Timezone-aware timestamp provenance")
    trust_tier: TrustTier = Field(description="Evidence trust tier ranking")
    auth_track: AuthType = Field(description="Distinguishes passive device presence from active human action")
    primary_entity: Optional[str] = Field(default=None, description="Originating entity or sender")
    secondary_entity: Optional[str] = Field(default=None, description="Target entity, recipient, or callee")
    amount: Optional[float] = Field(default=None, description="Monetary amount if financial event")
    currency: Optional[str] = Field(default="INR", description="Currency code")
    identifiers: Dict[str, str] = Field(
        default_factory=dict,
        description="Extracted normalized identifiers (msisdn, vpa, rrn, imei, account_suffix)",
    )
    extracted_fields: List[ExtractedField] = Field(
        default_factory=list,
        description="Fine-grained audit trail of all extracted fields",
    )
    summary: str = Field(description="Objective factual summary of this event")
    raw_source_snippet: str = Field(description="Unaltered verbatim raw line or record from source")
    inferred_notes: Optional[str] = Field(default=None, description="Explicit rationale for any inferred attribute")
    review_status: str = Field(default="UNREVIEWED", description="Audit status: UNREVIEWED, VERIFIED, or FLAGGED")
    reviewed_by: Optional[str] = Field(default=None, description="Forensic examiner identifier")
    review_notes: Optional[str] = Field(default=None, description="Examiner notes")
    region: Optional[GeographicRegion] = Field(
        default=None,
        description="Spatial coordinates and uncertainty radius if available (None if unlocated)",
    )

    def to_solver_fact(self) -> Fact:
        """Converts canonical fact into SMT Fact for Z3 reconstruction."""
        # Map CanonicalFactKind to FactKind
        kind_mapping = {
            CanonicalFactKind.CHAT_MESSAGE: FactKind.WA_MESSAGE,
            CanonicalFactKind.PAYMENT_REQUEST: FactKind.UPI_PAYMENT,
            CanonicalFactKind.BANK_TRANSACTION: FactKind.BANK_TXN,
            CanonicalFactKind.CDR_CALL: FactKind.CDR_CALL,
            CanonicalFactKind.MEDIA_METADATA: FactKind.EXIF_PHOTO,
            CanonicalFactKind.EXTRACTED_IDENTIFIER: FactKind.CLAIM,
            CanonicalFactKind.CONTRADICTION: FactKind.CLAIM,
            CanonicalFactKind.EVIDENCE_GAP: FactKind.CLAIM,
        }
        mapped_kind = kind_mapping.get(self.kind, FactKind.CLAIM)
        epoch = self.time_provenance.utc_epoch
        tw = TimeWindow(start_epoch=epoch, end_epoch=epoch, reported_epoch=epoch)

        entity_refs = []
        if self.primary_entity:
            entity_refs.append(self.primary_entity)
        if self.secondary_entity:
            entity_refs.append(self.secondary_entity)

        return Fact(
            id=self.fact_id,
            source_file=self.source_filename,
            sha256=self.sha256,
            line_ref=self.source_location,
            kind=mapped_kind,
            time_window=tw,
            region=self.region,
            tier=self.trust_tier,
            device_id=self.primary_entity or "DEV_UNKNOWN",
            clock_id="clk_case",
            entity_refs=entity_refs,
            auth_type=self.auth_track,
            raw_payload={
                "summary": self.summary,
                "raw_source_snippet": self.raw_source_snippet,
                "identifiers": self.identifiers,
                "amount": self.amount,
                "evidence_id": self.evidence_id,
                "artifact_id": self.artifact_id,
                "review_status": self.review_status,
                "recorded_time": getattr(self.time_provenance, "recorded_time", None),
                "is_inferred": bool(getattr(self.time_provenance, "is_inferred", False)),
                "is_timestamp_missing": not is_valid_fact_timestamp(self),
            },
        )


def is_valid_fact_timestamp(fact_or_provenance: Any) -> bool:
    """Validates that a fact or TimezoneProvenance possesses an authentic, parseable, non-missing timestamp.

    Rejection criteria:
    - None or empty provenance.
    - Explicitly inferred or fallback timestamps (is_inferred=True).
    - Sentinel unrecorded strings ('NOT_RECORDED', 'N/A', '', 'MISSING', 'None', None).
    - Unresolved timezone labels ('MISSING_SOURCE_TIMESTAMP', 'UNRESOLVED', 'UNPARSEABLE_SOURCE_TIMESTAMP').
    - Flagged raw_payload missingness (raw_payload.get('is_timestamp_missing') is True).
    - Non-finite numeric epochs (NaN, Inf).

    Genuine Epoch-Zero Guarantee:
    - A timestamp with utc_epoch == 0.0 is ACCEPTED if it has a legitimate recorded_time string
      (e.g., '1970-01-01 00:00:00', '1970-01-01T00:00:00Z', etc.) and is_inferred is False.
    """
    if fact_or_provenance is None:
        return False

    raw_payload = getattr(fact_or_provenance, "raw_payload", None)
    if isinstance(raw_payload, dict):
        if raw_payload.get("is_timestamp_missing") is True or raw_payload.get("is_inferred") is True:
            return False
        rec_time = raw_payload.get("recorded_time")
        if rec_time is not None and rec_time in ("NOT_RECORDED", "N/A", "", "MISSING", "None", "UNKNOWN"):
            return False
        assumed_tz = raw_payload.get("assumed_timezone")
        if assumed_tz in ("MISSING_SOURCE_TIMESTAMP", "UNRESOLVED", "UNPARSEABLE_SOURCE_TIMESTAMP"):
            return False

    # Check time_provenance if present
    tp = getattr(fact_or_provenance, "time_provenance", None)
    if tp is not None:
        if getattr(tp, "is_inferred", False):
            return False
        rec_time = getattr(tp, "recorded_time", None)
        if rec_time is not None and rec_time in ("NOT_RECORDED", "N/A", "", "MISSING", "None", "UNKNOWN"):
            return False
        assumed_tz = getattr(tp, "assumed_timezone", None)
        if assumed_tz in ("MISSING_SOURCE_TIMESTAMP", "UNRESOLVED", "UNPARSEABLE_SOURCE_TIMESTAMP"):
            return False
        epoch = getattr(tp, "utc_epoch", None)
    elif hasattr(fact_or_provenance, "utc_epoch"):
        if getattr(fact_or_provenance, "is_inferred", False):
            return False
        rec_time = getattr(fact_or_provenance, "recorded_time", None)
        if rec_time is not None and rec_time in ("NOT_RECORDED", "N/A", "", "MISSING", "None", "UNKNOWN"):
            return False
        assumed_tz = getattr(fact_or_provenance, "assumed_timezone", None)
        if assumed_tz in ("MISSING_SOURCE_TIMESTAMP", "UNRESOLVED", "UNPARSEABLE_SOURCE_TIMESTAMP"):
            return False
        epoch = getattr(fact_or_provenance, "utc_epoch", None)
    elif hasattr(fact_or_provenance, "time_window") and fact_or_provenance.time_window:
        epoch = fact_or_provenance.time_window.reported_epoch
    else:
        return False

    if epoch is None:
        return False

    try:
        import math
        epoch_flt = float(epoch)
        if math.isnan(epoch_flt) or math.isinf(epoch_flt):
            return False
    except (TypeError, ValueError):
        return False

    return True


def get_verified_utc_epoch(fact_or_provenance: Any) -> Optional[float]:
    """Returns the verified UTC epoch seconds if valid, or None if missing, inferred, or unparseable.

    Preserves genuine 0.0 without treating it as missing.
    """
    if not is_valid_fact_timestamp(fact_or_provenance):
        return None
    tp = getattr(fact_or_provenance, "time_provenance", None)
    if tp is not None and hasattr(tp, "utc_epoch"):
        return float(tp.utc_epoch)
    if hasattr(fact_or_provenance, "utc_epoch"):
        return float(fact_or_provenance.utc_epoch)
    if hasattr(fact_or_provenance, "time_window") and fact_or_provenance.time_window:
        return float(fact_or_provenance.time_window.reported_epoch)
    return None


def build_timezone_provenance(
    raw_timestamp_str: str,
    default_tz_name: str = "Asia/Kolkata",
) -> TimezoneProvenance:
    """Builds an auditable TimezoneProvenance object normalizing raw timestamp to UTC."""
    if not raw_timestamp_str or not str(raw_timestamp_str).strip():
        fallback_epoch = 1771065000.0
        fallback_iso = "2026-02-14T10:30:00Z"
        return TimezoneProvenance(
            recorded_time="NOT_RECORDED",
            stated_timezone=None,
            assumed_timezone="MISSING_SOURCE_TIMESTAMP",
            conversion_rationale="No source timestamp recorded; timeline position unresolved (case intake default used for indexing only).",
            utc_iso=fallback_iso,
            utc_epoch=fallback_epoch,
            is_inferred=True,
        )
    try:
        parsed = parse_datetime_forensic(raw_timestamp_str, default_tz_name=default_tz_name)
        if parsed.is_naive:
            rationale = (
                f"Source timestamp '{raw_timestamp_str}' was timezone-naive; "
                f"applied default jurisdiction timezone {default_tz_name} (offset +05:30) "
                f"and normalized to UTC epoch {parsed.utc_epoch:.1f}s."
            )
        else:
            rationale = (
                f"Source timestamp declared offset of {parsed.original_tz_offset_seconds}s "
                f"({parsed.original_tz_name}); converted deterministically to UTC."
            )
        return TimezoneProvenance(
            recorded_time=raw_timestamp_str,
            stated_timezone=None if parsed.is_naive else parsed.original_tz_name,
            assumed_timezone="Asia/Kolkata (UTC+05:30)",
            conversion_rationale=rationale,
            utc_iso=parsed.utc_iso,
            utc_epoch=parsed.utc_epoch,
            is_inferred=False,
        )
    except Exception as exc:
        # Fallback to stable default timestamp if unparseable
        fallback_epoch = 1771065000.0
        fallback_iso = "2026-02-14T10:30:00Z"
        return TimezoneProvenance(
            recorded_time=raw_timestamp_str or "UNKNOWN",
            stated_timezone=None,
            assumed_timezone="UNPARSEABLE_SOURCE_TIMESTAMP",
            conversion_rationale=f"Failed to parse timestamp ({exc}); fallback to intake timestamp.",
            utc_iso=fallback_iso,
            utc_epoch=fallback_epoch,
            is_inferred=True,
        )
