"""EXIF & File-System Metadata Anomaly Triage Engine.

Hard Forensic Invariant:
Flags structural anomalies ONLY using strictly objective, neutral forensic terminology.
Never claims 'user forged photo' or 'fake image'.
Allowed terminology: 'temporal discrepancy indicates inconsistency between camera clock and GPS satellite clock',
'file modification timestamp precedes EXIF creation timestamp'.
"""

from __future__ import annotations

import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from dateutil import parser as dt_parser

from tarka.core.models import (
    Fact,
    FactKind,
    TrustTier,
    AuthType,
    TimeWindow,
    GeographicRegion,
)
from tarka.parsers.base import (
    ParseResult,
    compute_sha256_for_file,
    compute_sha256_for_content,
    PARSER_VERSIONS,
)

IST_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


class StructuralAnomaly(BaseModel):
    """An objective, non-accusatory structural discrepancy detected in media metadata."""
    anomaly_code: str
    description: str
    measured_delta_seconds: Optional[float] = None
    affected_tags: List[str]


class EXIFTriageReport(BaseModel):
    """Forensic triage audit for digital images and media files."""
    source_file: str
    sha256: str
    extracted_fact: Optional[Fact] = None
    structural_anomalies: List[StructuralAnomaly] = Field(default_factory=list)
    has_structural_anomalies: bool = False
    audit_notes: List[str] = Field(default_factory=list)


def parse_exif_dttm(
    dttm_str: str,
    offset_str: Optional[str] = None,
    default_tz: Optional[datetime.tzinfo] = None,
) -> Tuple[Optional[datetime.datetime], bool]:
    """Parses standard EXIF format 'YYYY:MM:DD HH:MM:SS'.

    Returns (datetime, is_timezone_naive).
    Under EXIF 2.2/2.3 specifications, DateTimeOriginal is strictly timezone-naive unless
    accompanied by OffsetTimeOriginal (tag 0x9011) or OffsetTime (tag 0x9010).
    """
    clean = dttm_str.strip()
    try:
        if len(clean) >= 19 and clean[4] == ":" and clean[7] == ":":
            clean = f"{clean[:4]}-{clean[5:7]}-{clean[8:]}"
        dt = dt_parser.parse(clean)
        is_naive = True

        if offset_str and offset_str.strip():
            try:
                # e.g. "+05:30", "-04:00", "Z"
                off_clean = offset_str.strip()
                if off_clean.upper() == "Z":
                    dt = dt.replace(tzinfo=datetime.timezone.utc)
                    is_naive = False
                elif (off_clean.startswith("+") or off_clean.startswith("-")) and ":" in off_clean:
                    sign = 1 if off_clean.startswith("+") else -1
                    h_m = off_clean[1:].split(":")
                    hours, mins = int(h_m[0]), int(h_m[1])
                    dt = dt.replace(tzinfo=datetime.timezone(sign * datetime.timedelta(hours=hours, minutes=mins)))
                    is_naive = False
            except Exception:
                pass

        if is_naive:
            tz_to_use = default_tz or IST_TIMEZONE
            dt = dt.replace(tzinfo=tz_to_use)

        return dt, is_naive
    except Exception:
        return None, True


class EXIFTriageParser:
    """Performs structural integrity triage on image metadata."""

    PARSER_NAME: str = "exif_triage"
    PARSER_VERSION: str = PARSER_VERSIONS.get("exif_triage", "1.0.0")

    def __init__(
        self,
        clock_id: str = "clk_exif_camera",
        tz: Optional[datetime.tzinfo] = None,
    ) -> None:
        self.clock_id = clock_id
        self.tz = tz
        self.defaulted_tz = False
        if self.tz is None:
            self.tz = IST_TIMEZONE
            self.defaulted_tz = True

    def triage_metadata(
        self,
        metadata: Dict[str, Any],
        filename: str = "evidence_photo.jpg",
        file_sha256: Optional[str] = None,
        fs_modify_epoch: Optional[float] = None,
    ) -> EXIFTriageReport:
        """Evaluates dictionary of EXIF and filesystem metadata for structural anomalies."""
        sha_digest = file_sha256 or "0" * 64
        anomalies: List[StructuralAnomaly] = []
        notes: List[str] = []

        if self.defaulted_tz:
            notes.append("Timezone was not explicitly provided; defaulting to Indian Standard Time (IST, UTC+05:30).")

        dt_orig_str = metadata.get("DateTimeOriginal") or metadata.get("DateTime")
        dt_mod_str = metadata.get("ModifyDate")
        offset_orig = metadata.get("OffsetTimeOriginal") or metadata.get("OffsetTime")
        gps_date_str = metadata.get("GPSDateStamp")
        gps_time_tuple = metadata.get("GPSTimeStamp")

        dt_orig, is_orig_naive = (
            parse_exif_dttm(dt_orig_str, offset_str=offset_orig, default_tz=self.tz)
            if dt_orig_str
            else (None, True)
        )
        dt_exif_mod, _ = (
            parse_exif_dttm(dt_mod_str, default_tz=self.tz)
            if dt_mod_str
            else (None, True)
        )

        if dt_orig and is_orig_naive:
            notes.append(
                "EXIF DateTimeOriginal tag is timezone-naive (OffsetTimeOriginal absent); "
                f"interpreted against local timezone {self.tz}."
            )

        # 1. Structural Anomaly: File Modification Date Precedes EXIF Creation Date
        if dt_orig and fs_modify_epoch:
            orig_epoch = dt_orig.timestamp()
            if fs_modify_epoch < (orig_epoch - 5.0):
                delta = orig_epoch - fs_modify_epoch
                anomalies.append(
                    StructuralAnomaly(
                        anomaly_code="ANOMALY_FILE_MODIFY_PRECEDES_ORIGINAL",
                        description=(
                            f"Filesystem modification timestamp ({fs_modify_epoch}) differs from "
                            f"EXIF DateTimeOriginal ({orig_epoch}) by {delta:.1f} seconds "
                            "(modification timestamp precedes creation timestamp), "
                            "consistent with filesystem export, file transfer, or container recreation."
                        ),
                        measured_delta_seconds=delta,
                        affected_tags=["DateTimeOriginal", "FileModifyDate"],
                    )
                )

        # 2. Structural Anomaly: GPS satellite clock differs from camera clock
        if dt_orig and gps_date_str and gps_time_tuple:
            try:
                if isinstance(gps_time_tuple, (list, tuple)) and len(gps_time_tuple) >= 3:
                    h, m, s = gps_time_tuple[0], gps_time_tuple[1], gps_time_tuple[2]
                    h_val = float(h[0] / h[1]) if isinstance(h, tuple) else float(h)
                    m_val = float(m[0] / m[1]) if isinstance(m, tuple) else float(m)
                    s_val = float(s[0] / s[1]) if isinstance(s, tuple) else float(s)
                    gps_dt = dt_parser.parse(gps_date_str.replace(":", "-"))
                    gps_dt = gps_dt.replace(
                        hour=int(h_val), minute=int(m_val), second=int(s_val), tzinfo=datetime.timezone.utc
                    )
                    gps_epoch = gps_dt.timestamp()

                    delta_gps = abs(dt_orig.timestamp() - gps_epoch)
                    if delta_gps > 120.0:  # Beyond 2 minutes camera clock skew
                        anomalies.append(
                            StructuralAnomaly(
                                anomaly_code="ANOMALY_GPS_TIME_DISCREPANCY",
                                description=(
                                    f"GPS satellite timestamp differs from internal camera RTC timestamp "
                                    f"by {delta_gps:.1f} seconds, consistent with camera RTC clock skew."
                                ),
                                measured_delta_seconds=delta_gps,
                                affected_tags=["DateTimeOriginal", "GPSDateStamp", "GPSTimeStamp"],
                            )
                        )
            except Exception as e:
                notes.append(f"Could not parse GPS time components: {e}")

        # 3. Structural Anomaly: Software editing signature present
        software_tag = str(metadata.get("Software", "")).lower()
        if any(editor in software_tag for editor in ["photoshop", "gimp", "snapseed", "canva"]):
            anomalies.append(
                StructuralAnomaly(
                    anomaly_code="ANOMALY_IMAGE_EDITOR_SIGNATURE",
                    description=(
                        f"Metadata header signature differs from camera firmware default ('{software_tag}'), "
                        "consistent with external image post-processing suite."
                    ),
                    affected_tags=["Software"],
                )
            )

        # Build Fact if DateTimeOriginal exists
        extracted_fact: Optional[Fact] = None
        if dt_orig:
            epoch_sec = dt_orig.timestamp()
            # Extract GPS coords if present
            region: Optional[GeographicRegion] = None
            if "GPSLatitude" in metadata and "GPSLongitude" in metadata:
                try:
                    lat = float(metadata["GPSLatitude"])
                    lon = float(metadata["GPSLongitude"])
                    if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                        region = GeographicRegion(latitude=lat, longitude=lon, radius_meters=25.0)
                except (ValueError, TypeError):
                    region = None

            camera_model = metadata.get("Model", "UNKNOWN_CAMERA")
            extracted_fact = Fact(
                id=f"FACT_EXIF_{filename.replace('.', '_')}",
                source_file=filename,
                sha256=sha_digest,
                line_ref="exif:0",
                kind=FactKind.EXIF_PHOTO,
                time_window=TimeWindow(
                    start_epoch=epoch_sec,
                    end_epoch=epoch_sec + 2.0,
                    reported_epoch=epoch_sec,
                ),
                region=region,
                tier=TrustTier.T3,
                device_id=f"CAMERA_{camera_model}",
                clock_id=self.clock_id,
                entity_refs=[],
                auth_type=AuthType.ACTIVE,
                raw_payload={"camera_model": camera_model, "software": software_tag},
            )

        return EXIFTriageReport(
            source_file=filename,
            sha256=sha_digest,
            extracted_fact=extracted_fact,
            structural_anomalies=anomalies,
            has_structural_anomalies=len(anomalies) > 0,
            audit_notes=notes,
        )

    def triage_file(self, file_path: str | Path) -> EXIFTriageReport:
        """Extracts EXIF and filesystem metadata from a file on disk and runs structural triage."""
        p = Path(file_path)
        sha256_hash = compute_sha256_for_file(p)
        fs_mtime = p.stat().st_mtime

        meta: Dict[str, Any] = {}
        try:
            from PIL import Image, ExifTags
            with Image.open(p) as img:
                exif_data = img.getexif()
                if exif_data:
                    for tag_id, val in exif_data.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        meta[tag_name] = val
                    exif_ifd = exif_data.get_ifd(ExifTags.IFD.Exif)
                    if exif_ifd:
                        for sub_id, sub_val in exif_ifd.items():
                            sub_name = ExifTags.TAGS.get(sub_id, str(sub_id))
                            meta[sub_name] = sub_val
                    gps_ifd = exif_data.get_ifd(ExifTags.IFD.GPSInfo)
                    if gps_ifd:
                        for g_id, g_val in gps_ifd.items():
                            g_name = ExifTags.GPSTAGS.get(g_id, str(g_id))
                            meta[g_name] = g_val
        except Exception:
            pass

        return self.triage_metadata(
            metadata=meta,
            filename=p.name,
            file_sha256=sha256_hash,
            fs_modify_epoch=fs_mtime,
        )
