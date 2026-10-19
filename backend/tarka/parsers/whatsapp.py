"""WhatsApp Chat Export Parser for TARKA.

Hard Forensic Invariants:
1. Whole-file Date/Locale Ambiguity Detection:
   Scans the entire file before parsing. If all day/month tokens are <= 12,
   flags ambiguity (is_date_ambiguous = True) rather than guessing.
2. Multiline Support: Continues previous message text across line breaks.
3. System Message Handling: Distinguishes system events from deliberate human actions.
4. Rejection Logging: Records all unparseable lines with exact line numbers.
"""

from __future__ import annotations

import datetime
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
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

# Standard WhatsApp timestamp patterns (iOS & Android)
# Examples:
# [24/01/26, 14:32:10] Sender Name: Message
# 24/01/26, 2:32 pm - Sender Name: Message
# [24/01/2026, 14:32:10] Sender Name: Message
WA_MSG_REGEX = re.compile(
    r"^(?:\[)?(?P<date>\d{1,4}[/\-\.]\d{1,2}[/\-\.]\d{2,4}),?\s+(?P<time>\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)(?:\])?(?:\s+-\s+|\s+)(?P<rest>.*)$"
)

SYSTEM_PATTERNS = [
    "messages and calls are end-to-end encrypted",
    "created group",
    "added you",
    "was added",
    "left",
    "changed the subject",
    "changed this group's icon",
    "security code changed",
    "you're now an admin",
]


class WhatsAppParser:
    """Parses WhatsApp plain text export files (.txt) with whole-file locale detection."""

    PARSER_NAME: str = "whatsapp"
    PARSER_VERSION: str = PARSER_VERSIONS.get("whatsapp", "1.0.0")

    def __init__(
        self,
        clock_id: str = "clk_handset_rtc",
        tz: Optional[datetime.tzinfo] = None,
        exclude_ambiguous_dates: bool = False,
    ) -> None:
        self.clock_id = clock_id
        self.tz = tz
        self.defaulted_tz = False
        if self.tz is None:
            self.tz = IST_TIMEZONE
            self.defaulted_tz = True
        self.exclude_ambiguous_dates = exclude_ambiguous_dates

    @staticmethod
    def _detect_file_date_order(lines: List[str]) -> Tuple[bool, bool]:
        """Scans all timestamp headers across the file to detect DD/MM vs MM/DD.

        Returns:
            (day_first: bool, is_ambiguous: bool)
        """
        day_first_evidence = False
        month_first_evidence = False

        for line in lines:
            m = WA_MSG_REGEX.match(line.strip())
            if m:
                date_part = m.group("date")
                parts = re.split(r"[/\-\.]", date_part)
                if len(parts) >= 3:
                    try:
                        p0, p1 = int(parts[0]), int(parts[1])
                        if p0 > 12:
                            day_first_evidence = True
                        elif p1 > 12:
                            month_first_evidence = True
                    except ValueError:
                        continue

        if day_first_evidence and not month_first_evidence:
            return True, False
        if month_first_evidence and not day_first_evidence:
            return False, False
        # If both are true or neither is true (all <= 12), format is ambiguous!
        return True, True

    def parse_text(self, text: str, filename: str = "whatsapp_export.txt") -> ParseResult:
        """Parses WhatsApp export text with whole-file date format detection and multiline support."""
        sha256_hash = compute_sha256_for_content(text)
        facts: List[Fact] = []
        rejected: List[RejectedRow] = []
        warnings: List[str] = []

        if self.defaulted_tz:
            warnings.append("Timezone was not explicitly provided; defaulting to Indian Standard Time (IST, UTC+05:30).")

        lines = text.splitlines()
        total_lines = len(lines)

        if not lines:
            return ParseResult(
                source_file=filename,
                source_sha256=sha256_hash,
                facts=[],
                rejected_rows=[RejectedRow(line_number=1, raw_content="", reason="Empty file")],
                warnings=warnings + ["File was empty"],
                total_lines_read=0,
                is_date_ambiguous=False,
            )

        day_first, is_ambiguous = self._detect_file_date_order(lines)
        if is_ambiguous:
            warnings.append(
                "Date format is ambiguous across entire chat (all day/month components <= 12). "
                "Widening time window to span both DD/MM and MM/DD readings; facts will not enter solver as definite points in time."
            )

        current_fact: Optional[Fact] = None
        current_line_start = 0

        for line_num, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped:
                continue

            match = WA_MSG_REGEX.match(stripped)

            if match:
                # Flush previous message if multiline
                if current_fact is not None:
                    facts.append(current_fact)
                    current_fact = None

                date_str = match.group("date")
                time_str = match.group("time")
                rest = match.group("rest").strip()

                combined_dt_str = f"{date_str} {time_str}"

                if is_ambiguous and self.exclude_ambiguous_dates:
                    rejected.append(
                        RejectedRow(
                            line_number=line_num,
                            raw_content=line,
                            reason="Excluded fact due to unresolved whole-file date format ambiguity",
                        )
                    )
                    continue

                try:
                    if is_ambiguous:
                        dt_dmy = dt_parser.parse(combined_dt_str, dayfirst=True)
                        dt_mdy = dt_parser.parse(combined_dt_str, dayfirst=False)
                        if dt_dmy.tzinfo is None:
                            dt_dmy = dt_dmy.replace(tzinfo=self.tz)
                        if dt_mdy.tzinfo is None:
                            dt_mdy = dt_mdy.replace(tzinfo=self.tz)
                        e1 = dt_dmy.timestamp()
                        e2 = dt_mdy.timestamp()
                        start_epoch = min(e1, e2)
                        end_epoch = max(e1, e2) + 60.0
                        reported_epoch = min(e1, e2)
                    else:
                        parsed_dt = dt_parser.parse(combined_dt_str, dayfirst=day_first)
                        if parsed_dt.tzinfo is None:
                            parsed_dt = parsed_dt.replace(tzinfo=self.tz)
                        start_epoch = parsed_dt.timestamp()
                        end_epoch = start_epoch + 5.0
                        reported_epoch = start_epoch
                except Exception as e:
                    rejected.append(
                        RejectedRow(
                            line_number=line_num,
                            raw_content=line,
                            reason=f"Failed to parse timestamp '{combined_dt_str}': {e}",
                        )
                    )
                    continue

                # Check if system message
                is_system = any(sys_pat in rest.lower() for sys_pat in SYSTEM_PATTERNS)
                if ":" in rest and not is_system:
                    sender, msg_body = rest.split(":", 1)
                    sender = sender.strip()
                    msg_body = msg_body.strip()
                    auth = AuthType.ACTIVE
                else:
                    sender = "SYSTEM"
                    msg_body = rest
                    auth = AuthType.PASSIVE

                fact_id = f"FACT_WA_L{line_num}"
                current_line_start = line_num

                current_fact = Fact(
                    id=fact_id,
                    source_file=filename,
                    sha256=sha256_hash,
                    line_ref=f"line:{line_num}",
                    kind=FactKind.WA_MESSAGE,
                    time_window=TimeWindow(
                        start_epoch=start_epoch,
                        end_epoch=end_epoch,
                        reported_epoch=reported_epoch,
                    ),
                    region=None,  # Chat exports do not provide verified GPS coordinates
                    tier=TrustTier.T3,  # User-controllable text export
                    device_id=f"SENDER_{sender}",
                    clock_id=self.clock_id,
                    entity_refs=[f"ENTITY_{sender}"] if sender != "SYSTEM" else [],
                    auth_type=auth,
                    raw_payload={
                        "line_number": line_num,
                        "lines_consumed": 1,
                        "sender": sender,
                        "message_text": msg_body,
                        "is_system_message": is_system,
                        "is_date_ambiguous": is_ambiguous,
                    },
                )
            else:
                # Continuation of multiline message
                if current_fact is not None:
                    current_fact.raw_payload["message_text"] += f"\n{line}"
                    current_fact.raw_payload["lines_consumed"] += 1
                else:
                    # Line without header and no preceding message
                    rejected.append(
                        RejectedRow(
                            line_number=line_num,
                            raw_content=line,
                            reason="Orphan text line without valid WhatsApp timestamp header",
                        )
                    )

        # Flush final message
        if current_fact is not None:
            facts.append(current_fact)

        return ParseResult(
            source_file=filename,
            source_sha256=sha256_hash,
            facts=facts,
            rejected_rows=rejected,
            warnings=warnings,
            total_lines_read=total_lines,
            is_date_ambiguous=is_ambiguous,
        )

    def parse_file(self, file_path: str | Path) -> ParseResult:
        """Parses a local WhatsApp text export file."""
        p = Path(file_path)
        with open(p, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return self.parse_text(content, filename=p.name)
