"""Indian Banking & UPI Transaction Statement Parser.

Handles Core Banking CSV exports, NPCI UPI logs, and account statements.
Extracts transaction timestamps, RRN, VPAs, amounts, and merchant terminals.
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
from decimal import Decimal, InvalidOperation

IST_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))


class BankUPIParser:
    """Parses Indian Banking (SBI, HDFC, ICICI) and UPI (NPCI, PhonePe, GPay) CSV statements."""

    PARSER_NAME: str = "bank_upi"
    PARSER_VERSION: str = PARSER_VERSIONS.get("bank_upi", "1.0.0")

    def __init__(
        self,
        clock_id: str = "clk_npci_core",
        tz: Optional[datetime.tzinfo] = None,
    ) -> None:
        self.clock_id = clock_id
        self.tz = tz
        self.defaulted_tz = False
        if self.tz is None:
            self.tz = IST_TIMEZONE
            self.defaulted_tz = True

    @staticmethod
    def _clean_amount(amt_str: str) -> Optional[Decimal]:
        """Strips currency symbols (Rs., ₹, INR), commas, and whitespace into Decimal."""
        s = amt_str.replace(",", "").strip()
        # Remove currency words/symbols like Rs., Rs, INR, ₹
        s = re.sub(r"(?i)\b(?:rs\.?|inr)\b", "", s)
        s = s.replace("₹", "").strip()
        match = re.search(r"[-+]?\d+(?:\.\d+)?", s)
        if match:
            try:
                return Decimal(match.group(0))
            except InvalidOperation:
                return None
        return None

    @staticmethod
    def map_columns(header: List[str]) -> Dict[str, int]:
        """Header cells → {date,time,payer,payee,amount,ref,lat,lon: column index}."""
        col_indices: Dict[str, int] = {}
        for i, col in enumerate(c.strip().lower() for c in header):
            if any(k in col for k in ["txn_date", "date", "txndate"]):
                col_indices["date"] = i
            elif any(k in col for k in ["txn_time", "time"]):
                col_indices["time"] = i
            elif any(k in col for k in ["payer", "from", "debit_acc"]):
                col_indices["payer"] = i
            elif any(k in col for k in ["payee", "to", "beneficiary", "merchant"]):
                col_indices["payee"] = i
            elif any(k in col for k in ["amount", "amt", "debit", "withdrawal"]):
                col_indices["amount"] = i
            elif any(k in col for k in ["rrn", "ref_no", "utr", "txn_id"]):
                col_indices["ref"] = i
            elif any(k in col for k in ["lat", "terminal_lat"]):
                col_indices["lat"] = i
            elif any(k in col for k in ["lon", "terminal_lon", "lng"]):
                col_indices["lon"] = i
        return col_indices

    def parse_text(self, csv_text: str, filename: str = "bank_statement.csv") -> ParseResult:
        """Parses bank statement CSV into canonical Facts and rejection logs."""
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
                col_indices = self.map_columns(header)
                continue

            raw_line = ",".join(row)

            # Mandatory Date column
            if "date" not in col_indices or col_indices["date"] >= len(row) or not row[col_indices["date"]].strip():
                rejected.append(
                    RejectedRow(
                        line_number=line_idx,
                        raw_content=raw_line,
                        reason="Missing or empty transaction date field",
                    )
                )
                continue

            date_str = row[col_indices["date"]].strip()
            time_str = row[col_indices["time"]].strip() if "time" in col_indices and col_indices["time"] < len(row) else ""
            combined_dt = f"{date_str} {time_str}".strip()

            try:
                parsed_dt = dt_parser.parse(combined_dt, dayfirst=True)
                if parsed_dt.tzinfo is None:
                    parsed_dt = parsed_dt.replace(tzinfo=self.tz)
                epoch_sec = parsed_dt.timestamp()
            except Exception as e:
                rejected.append(
                    RejectedRow(
                        line_number=line_idx,
                        raw_content=raw_line,
                        reason=f"Failed to parse datetime '{combined_dt}': {e}",
                    )
                )
                continue

            # Amount as Decimal
            amount_val = Decimal("0.00")
            if "amount" in col_indices and col_indices["amount"] < len(row):
                parsed_amt = self._clean_amount(row[col_indices["amount"]])
                if parsed_amt is not None:
                    amount_val = parsed_amt

            payer = row[col_indices["payer"]].strip() if "payer" in col_indices and col_indices["payer"] < len(row) else "ACCOUNT_HOLDER"
            payee = row[col_indices["payee"]].strip() if "payee" in col_indices and col_indices["payee"] < len(row) else "BENEFICIARY"
            ref = row[col_indices["ref"]].strip() if "ref" in col_indices and col_indices["ref"] < len(row) else f"TXN_{line_idx}"

            # Coordinates if terminal/merchant POS geolocated
            region: Optional[GeographicRegion] = None
            if "lat" in col_indices and "lon" in col_indices:
                if col_indices["lat"] < len(row) and col_indices["lon"] < len(row):
                    lat_str = row[col_indices["lat"]].strip()
                    lon_str = row[col_indices["lon"]].strip()
                    try:
                        lat_f = float(lat_str)
                        lon_f = float(lon_str)
                        if -90.0 <= lat_f <= 90.0 and -180.0 <= lon_f <= 180.0:
                            region = GeographicRegion(latitude=lat_f, longitude=lon_f, radius_meters=100.0)
                    except ValueError:
                        region = None

            fact_id = f"FACT_BANK_L{line_idx}"
            facts.append(
                Fact(
                    id=fact_id,
                    source_file=filename,
                    sha256=sha256_hash,
                    line_ref=f"line:{line_idx}",
                    kind=FactKind.UPI_PAYMENT if ("@" in payer or "@" in payee) else FactKind.BANK_TXN,
                    time_window=TimeWindow(
                        start_epoch=epoch_sec,
                        end_epoch=epoch_sec + 5.0,  # 5s network gateway settlement tolerance
                        reported_epoch=epoch_sec,
                    ),
                    region=region,
                    tier=TrustTier.T1,
                    device_id=f"VPA_{payer}" if "@" in payer else f"ACC_{payer}",
                    clock_id=self.clock_id,
                    entity_refs=[f"ENTITY_{payer}"],
                    auth_type=AuthType.ACTIVE,  # Active user PIN or OTP authorization
                    raw_payload={
                        "line_number": line_idx,
                        "lines_consumed": 1,
                        "ref_no": ref,
                        "payer": payer,
                        "payee": payee,
                        "amount_inr": amount_val,
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
        """Parses a local bank statement CSV."""
        p = Path(file_path)
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return self.parse_text(content, filename=p.name)
