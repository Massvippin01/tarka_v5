"""Indian Cellular Call Detail Record (CDR) CSV Parser.

Hard Rules:
1. Tower coordinates strictly come from operator-supplied tower list input.
   If cell tower is unlisted, fact.region is set to None. Never invent coordinates.
2. Never silently drop rows: malformed or unparseable lines are recorded in 'rejected_rows'
   with exact line numbers and technical diagnostic reasons.
3. Automatically maps telecom call types (MOC, MTC, SMS, DATA) to canonical FactKinds.
"""

from __future__ import annotations

import csv
import datetime
import io
import re
from pathlib import Path
from typing import Dict, List, Optional
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
    RejectedRow,
    compute_sha256_for_file,
    compute_sha256_for_content,
    PARSER_VERSIONS,
)

IST_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


import json

class CDRParser:
    """Parses Airtel, Jio, Vi, and BSNL CDR CSV files."""

    PARSER_NAME: str = "cdr"
    PARSER_VERSION: str = PARSER_VERSIONS.get("cdr", "1.0.0")

    def __init__(
        self,
        tower_lookup: Optional[Dict[str, GeographicRegion] | Dict[str, Any] | str | Path] = None,
        clock_id: str = "clk_telco_ntp",
        tz: Optional[datetime.tzinfo] = None,
    ) -> None:
        self.clock_id = clock_id
        self.tz = tz
        self.defaulted_tz = False
        if self.tz is None:
            self.tz = IST_TIMEZONE
            self.defaulted_tz = True

        self.tower_lookup: Dict[str, GeographicRegion] = {}
        if tower_lookup is not None:
            if isinstance(tower_lookup, (str, Path)):
                p = Path(tower_lookup)
                with open(p, "r", encoding="utf-8") as f:
                    raw_dict = json.load(f)
                for k, v in raw_dict.items():
                    if isinstance(v, GeographicRegion):
                        self.tower_lookup[k] = v
                    elif isinstance(v, dict):
                        radius = v.get("radius_meters", v.get("coverage_radius_meters", 500.0))
                        self.tower_lookup[k] = GeographicRegion(
                            latitude=float(v["latitude"]),
                            longitude=float(v["longitude"]),
                            radius_meters=float(radius),
                        )
            elif isinstance(tower_lookup, dict):
                for k, v in tower_lookup.items():
                    if isinstance(v, GeographicRegion):
                        self.tower_lookup[k] = v
                    elif isinstance(v, dict):
                        radius = v.get("radius_meters", v.get("coverage_radius_meters", 500.0))
                        self.tower_lookup[k] = GeographicRegion(
                            latitude=float(v["latitude"]),
                            longitude=float(v["longitude"]),
                            radius_meters=float(radius),
                        )

    def parse_text(self, csv_text: str, filename: str = "cdr_export.csv") -> ParseResult:
        """Parses CDR CSV text into canonical Facts and rejection logs."""
        sha256_hash = compute_sha256_for_content(csv_text)
        facts: List[Fact] = []
        rejected: List[RejectedRow] = []
        warnings: List[str] = []

        if self.defaulted_tz:
            warnings.append("Timezone was not explicitly provided; defaulting to Indian Standard Time (IST, UTC+05:30).")

        lines = csv_text.splitlines()
        total_lines = len(lines)

        if not lines:
            return ParseResult(
                source_file=filename,
                source_sha256=sha256_hash,
                facts=[],
                rejected_rows=[RejectedRow(line_number=1, raw_content="", reason="Empty file")],
                warnings=["File was empty"],
                total_lines_read=0,
            )

        reader = csv.reader(io.StringIO(csv_text))
        header = None
        col_indices: Dict[str, int] = {}

        for line_idx, row in enumerate(reader, start=1):
            if not row or all(not cell.strip() for cell in row):
                continue

            if header is None:
                header = [c.strip().lower() for c in row]
                # Map column variations
                for i, col in enumerate(header):
                    if any(k in col for k in ["msisdn", "caller", "calling", "anum"]):
                        col_indices["caller"] = i
                    elif any(k in col for k in ["other_party", "called", "bnum", "dialed"]):
                        col_indices["called"] = i
                    elif any(k in col for k in ["date", "dttm", "call_date", "start_time"]):
                        col_indices["date"] = i
                    elif any(k in col for k in ["time", "call_time"]):
                        col_indices["time"] = i
                    elif any(k in col for k in ["duration", "dur_sec"]):
                        col_indices["duration"] = i
                    elif any(k in col for k in ["cell_id", "cgi", "first_cgi", "tower"]):
                        col_indices["cell_id"] = i
                    elif any(k in col for k in ["imei"]):
                        col_indices["imei"] = i
                    elif any(k in col for k in ["imsi"]):
                        col_indices["imsi"] = i
                    elif any(k in col for k in ["call_type", "service", "type"]):
                        col_indices["type"] = i
                continue

            # Process record row
            raw_line_str = ",".join(row)

            # Check minimum required fields: date or caller
            if "date" not in col_indices:
                rejected.append(
                    RejectedRow(
                        line_number=line_idx,
                        raw_content=raw_line_str,
                        reason="Missing identifiable date/timestamp column in header",
                    )
                )
                continue

            # Extract date string
            date_idx = col_indices["date"]
            if date_idx >= len(row) or not row[date_idx].strip():
                rejected.append(
                    RejectedRow(
                        line_number=line_idx,
                        raw_content=raw_line_str,
                        reason="Date field is empty or out of column bounds",
                    )
                )
                continue

            date_str = row[date_idx].strip()
            time_str = row[col_indices["time"]].strip() if "time" in col_indices and col_indices["time"] < len(row) else ""
            combined_dt_str = f"{date_str} {time_str}".strip()

            # Parse datetime
            try:
                parsed_dt = dt_parser.parse(combined_dt_str, dayfirst=True)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=self.tz)
                epoch_sec = parsed_dt.timestamp()
            except Exception as e:
                rejected.append(
                    RejectedRow(
                        line_number=line_idx,
                        raw_content=raw_line_str,
                        reason=f"Failed to parse datetime '{combined_dt_str}': {e}",
                    )
                )
                continue

            # Parse duration
            duration = 0.0
            if "duration" in col_indices and col_indices["duration"] < len(row):
                dur_raw = row[col_indices["duration"]].strip()
                try:
                    duration = max(0.0, float(dur_raw))
                except ValueError:
                    duration = 0.0

            # Caller & device ID
            caller = row[col_indices["caller"]].strip() if "caller" in col_indices and col_indices["caller"] < len(row) else "UNKNOWN_CALLER"
            imei = row[col_indices["imei"]].strip() if "imei" in col_indices and col_indices["imei"] < len(row) else ""
            device_id = f"IMEI_{imei}" if imei else f"PHONE_{caller}"

            # Call type & Auth type
            call_type_str = row[col_indices["type"]].strip().upper() if "type" in col_indices and col_indices["type"] < len(row) else "CALL"
            if "SMS" in call_type_str:
                kind = FactKind.CDR_SMS
                auth = AuthType.PASSIVE if "MT" in call_type_str else AuthType.ACTIVE
            elif "DATA" in call_type_str:
                kind = FactKind.CDR_DATA
                auth = AuthType.PASSIVE
            else:
                kind = FactKind.CDR_CALL
                auth = AuthType.ACTIVE if "MOC" in call_type_str else AuthType.PASSIVE

            # Tower Lookup: strictly operator-supplied list
            region: Optional[GeographicRegion] = None
            cell_id = ""
            if "cell_id" in col_indices and col_indices["cell_id"] < len(row):
                cell_id = row[col_indices["cell_id"]].strip()
                if cell_id in self.tower_lookup:
                    region = self.tower_lookup[cell_id]
                elif cell_id:
                    warnings.append(
                        f"Line {line_idx}: Cell ID '{cell_id}' not found in operator tower list; "
                        "fact recorded without geographic coordinates (never invented)."
                    )

            fact_id = f"FACT_CDR_L{line_idx}"
            facts.append(
                Fact(
                    id=fact_id,
                    source_file=filename,
                    sha256=sha256_hash,
                    line_ref=f"line:{line_idx}",
                    kind=kind,
                    time_window=TimeWindow(
                        start_epoch=epoch_sec,
                        end_epoch=epoch_sec + duration,
                        reported_epoch=epoch_sec,
                    ),
                    region=region,
                    tier=TrustTier.T1,
                    device_id=device_id,
                    clock_id=self.clock_id,
                    entity_refs=[f"ENTITY_{caller}"],
                    auth_type=auth,
                    raw_payload={
                        "line_number": line_idx,
                        "lines_consumed": 1,
                        "caller": caller,
                        "cell_id": cell_id,
                        "call_type": call_type_str,
                        "duration_sec": duration,
                    },
                )
            )

        return ParseResult(
            source_file=filename,
            source_sha256=sha256_hash,
            facts=facts,
            rejected_rows=rejected,
            warnings=warnings,
            total_lines_read=total_lines,
        )

    def parse_file(self, file_path: str | Path) -> ParseResult:
        """Parses a local CDR CSV file."""
        p = Path(file_path)
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return self.parse_text(content, filename=p.name)
