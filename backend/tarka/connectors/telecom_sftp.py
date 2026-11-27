"""TARKA Universal Connector SDK — Telecom SFTP Feed Adapter.

Ingests and normalizes Call Detail Records (CDRs) and IPDRs delivered over SFTP or directory drop:
- Standard Indian telco headers (Jio, Airtel, Vi, BSNL)
- Automated E.164 phone normalization
- IMEI / IMSI / Cell Tower ID extraction
"""

from __future__ import annotations

import csv
import datetime
import io
import logging
from typing import Any, AsyncIterator, Dict, List, Optional
from pathlib import Path

from tarka.connectors.base import BaseConnector, ConnectorHealth, ConnectorState, NormalizedEntity

logger = logging.getLogger("tarka.connectors.telecom")


class TelecomSFTPConnector(BaseConnector):
    """Adapter for telecom carrier CDR and IPDR data feeds."""

    def __init__(self, connector_id: str = "CONN-TELCO-SFTP-01"):
        super().__init__(
            connector_id=connector_id,
            connector_type="TELECOM_SFTP",
            rate_limit_rps=50.0,
            failure_threshold=5,
        )
        self.carrier_name: str = "Generic Carrier"
        self.watch_directory: Optional[Path] = None

    async def _on_initialize(self, config: Dict[str, Any]) -> None:
        self.carrier_name = config.get("operator_name") or config.get("carrier_name", "Telecom Service Provider")
        self.operator_name = self.carrier_name
        watch_dir = config.get("watch_directory", "data/telecom_ingress")
        self.watch_directory = Path(watch_dir)
        self.watch_directory.mkdir(parents=True, exist_ok=True)

    async def health_check(self) -> ConnectorHealth:
        return ConnectorHealth(
            connector_id=self.connector_id,
            state=self.state,
            circuit_state=self.circuit_breaker.state,
            last_check_timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            details={
                "carrier": self.carrier_name,
                "watch_directory": str(self.watch_directory),
            },
        )

    def parse_cdr_csv(self, csv_content: str | bytes) -> List[Dict[str, Any]]:
        """Parses CDR CSV text into raw record dictionaries with standardized keys."""
        if isinstance(csv_content, bytes):
            text = csv_content.decode("utf-8", errors="replace")
        else:
            text = csv_content

        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            return []

        header = [c.strip().upper() for c in rows[0]]
        records: List[Dict[str, Any]] = []

        # Find column indices dynamically
        col_map: Dict[str, int] = {}
        for idx, col in enumerate(header):
            if any(k in col for k in ("CALLING", "A_PARTY", "CALLER", "MSISDN")):
                col_map["calling"] = idx
            elif any(k in col for k in ("CALLED", "B_PARTY", "DIALED", "RECEIVER")):
                col_map["called"] = idx
            elif any(k in col for k in ("DATE", "START_TIME", "TIMESTAMP", "TIME")):
                if "date" not in col_map:
                    col_map["date"] = idx
            elif any(k in col for k in ("DURATION", "DUR", "CALL_DURATION")):
                col_map["duration"] = idx
            elif any(k in col for k in ("IMEI",)):
                col_map["imei"] = idx
            elif any(k in col for k in ("IMSI",)):
                col_map["imsi"] = idx
            elif any(k in col for k in ("CELL", "SITE", "TOWER", "AZIMUTH")):
                col_map["cell_id"] = idx

        for line_idx, row in enumerate(rows[1:], start=2):
            if not row or all(not c.strip() for c in row):
                continue
            record = {
                "calling_number": row[col_map["calling"]].strip() if "calling" in col_map and col_map["calling"] < len(row) else None,
                "called_number": row[col_map["called"]].strip() if "called" in col_map and col_map["called"] < len(row) else None,
                "timestamp": row[col_map["date"]].strip() if "date" in col_map and col_map["date"] < len(row) else None,
                "duration_seconds": int(row[col_map["duration"]].strip()) if "duration" in col_map and col_map["duration"] < len(row) and row[col_map["duration"]].strip().isdigit() else 0,
                "imei": row[col_map["imei"]].strip() if "imei" in col_map and col_map["imei"] < len(row) else None,
                "imsi": row[col_map["imsi"]].strip() if "imsi" in col_map and col_map["imsi"] < len(row) else None,
                "cell_id": row[col_map["cell_id"]].strip() if "cell_id" in col_map and col_map["cell_id"] < len(row) else None,
                "line_ref": f"row:{line_idx}",
            }
            records.append(record)

        return records

    async def fetch_records(self, query: Dict[str, Any]) -> AsyncIterator[Dict[str, Any]]:
        csv_payload = query.get("csv_payload", "")
        records = self.parse_cdr_csv(csv_payload)
        for r in records:
            yield r

    def normalize_record(self, raw_record: Any) -> List[NormalizedEntity]:
        """Normalizes raw CDR row (dict or CSV line string) to Canonical Fraud Schema representation."""
        if isinstance(raw_record, str):
            parts = [p.strip() for p in raw_record.split(",")]
            calling = parts[0] if len(parts) > 0 else ""
            called = parts[1] if len(parts) > 1 else ""
            ts = parts[2] if len(parts) > 2 else ""
            dur = int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0
            imei = parts[4] if len(parts) > 4 else ""
            cell = parts[5] if len(parts) > 5 else ""
        else:
            calling = raw_record.get("calling_number") or ""
            called = raw_record.get("called_number") or ""
            ts = raw_record.get("timestamp") or ""
            dur = raw_record.get("duration_seconds", 0)
            imei = raw_record.get("imei") or ""
            cell = raw_record.get("cell_id") or ""

        # Normalize to E.164 +91 format
        digits = "".join(filter(str.isdigit, calling))
        if len(digits) == 10:
            norm_calling = f"+91{digits}"
        elif len(digits) == 12 and digits.startswith("91"):
            norm_calling = f"+{digits}"
        else:
            norm_calling = calling

        op_name = getattr(self, "operator_name", getattr(self, "carrier_name", "Telecom Service Provider"))
        return [
            NormalizedEntity(
                entity_type="Phone",
                entity_id=f"TEL-{norm_calling}",
                attributes={
                    "msisdn": norm_calling,
                    "service_provider": op_name,
                },
                provenance_connector=self.connector_id,
            ),
            NormalizedEntity(
                entity_type="Device",
                entity_id=f"DEV-{imei}",
                attributes={
                    "imei_primary": imei,
                    "last_cell_tower": cell,
                },
                provenance_connector=self.connector_id,
            ),
        ]
