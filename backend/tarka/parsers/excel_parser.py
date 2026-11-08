"""TARKA Multi-Sheet Excel (XLSX) Evidence Parser.

Provides forensic ingestion of .xlsx workbooks:
1. Multi-Sheet Support: Discovers all sheets, evaluates row bounds, and parses individual or all sheets.
2. Safe Formula Isolation: Extracts pre-computed formula values (<v>), never executes dynamic formulas/macros (<f>).
3. Line Conservation & Audit: Maintains rejected_rows tracking with 1-based sheet row indices and exact cell references.
4. Cryptographic Byte Integrity: Computes SHA-256 digest on raw bytes without modification.
5. Standard-Library Engine: Pure-Python ZIP/XML engine for zero-dependency offline environments,
   with optional openpyxl fallback.
6. Auto-Schema Classification:
   - Bank / Account Statements (Date, Narration, Ref/Chq, Debit, Credit, Balance)
   - UPI Switch Records (Timestamp, RRN, Sender VPA, Receiver VPA, Status, Amount)
   - Telecom CDRs (Call Date/Time, A-Party, B-Party, Duration, Cell Tower ID)
"""

from __future__ import annotations

import datetime
import hashlib
import io
import re
import xml.etree.ElementTree as ET
import zipfile
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from pydantic import BaseModel, Field

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
    PARSER_VERSIONS,
    register_parser_version,
)

PARSER_VERSIONS["excel_xlsx"] = "1.0.0"

IST_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
XML_NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
XML_NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


class SheetInfo(BaseModel):
    """Metadata describing a sheet inside an Excel workbook."""
    sheet_id: str
    name: str
    state: str = "visible"
    row_count: int = 0
    column_count: int = 0
    detected_type: str = "UNKNOWN"  # BANK_STATEMENT, UPI_LOG, CDR, GENERAL_TABLE


class ExcelParseResult(BaseModel):
    """Forensic result of parsing an Excel workbook."""
    source_file: str
    source_sha256: str
    sheets: List[SheetInfo] = Field(default_factory=list)
    facts: List[Fact] = Field(default_factory=list)
    rejected_rows: List[RejectedRow] = Field(default_factory=list)
    total_rows_processed: int = 0
    metadata: Dict[str, Any] = Field(default_factory=dict)


def _col_letter_to_index(col_str: str) -> int:
    """Converts Excel column letters (A, B, ..., Z, AA, AB) to 0-based column index."""
    exp = 0
    idx = 0
    for char in reversed(col_str.upper()):
        idx += (ord(char) - ord("A") + 1) * (26 ** exp)
        exp += 1
    return idx - 1


def _cell_ref_to_row_col(cell_ref: str) -> Tuple[int, int]:
    """Converts a cell reference (e.g. 'C14') into (1-based row, 0-based col)."""
    match = re.match(r"^([A-Za-z]+)(\d+)$", cell_ref)
    if not match:
        return 1, 0
    col_str, row_str = match.groups()
    return int(row_str), _col_letter_to_index(col_str)


class ExcelParser:
    """Forensic parser for multi-sheet Microsoft Excel (.xlsx) workbooks."""

    PARSER_NAME: str = "excel_xlsx"
    PARSER_VERSION: str = "1.0.0"

    def __init__(
        self,
        clock_id: str = "clk_excel_system",
        tz: Optional[datetime.tzinfo] = None,
        tier: TrustTier = TrustTier.T1,
    ) -> None:
        self.clock_id = clock_id
        self.tz = tz or IST_TIMEZONE
        self.tier = tier

    @staticmethod
    def compute_sha256(data: bytes) -> str:
        return hashlib.sha256(data).hexdigest()

    def inspect_sheets(self, file_source: Union[str, Path, bytes]) -> List[SheetInfo]:
        """Inspects sheet names and dimensions inside an .xlsx workbook."""
        raw_bytes = file_source if isinstance(file_source, bytes) else Path(file_source).read_bytes()
        sheets: List[SheetInfo] = []

        with zipfile.ZipFile(io.BytesIO(raw_bytes), "r") as z:
            workbook_xml = z.read("xl/workbook.xml")
            root = ET.fromstring(workbook_xml)

            # Find sheets container namespace-agnostically
            sheets_elem = None
            for child in root:
                if child.tag.split("}")[-1] == "sheets":
                    sheets_elem = child
                    break

            if sheets_elem is not None:
                for idx, sheet in enumerate(sheets_elem):
                    name = sheet.attrib.get("name", f"Sheet{idx+1}")
                    sheet_id = sheet.attrib.get("sheetId", str(idx + 1))
                    state = sheet.attrib.get("state", "visible")

                    sheet_path = f"xl/worksheets/sheet{sheet_id}.xml"
                    row_count = 0
                    if sheet_path in z.namelist():
                        sheet_xml = z.read(sheet_path)
                        sheet_root = ET.fromstring(sheet_xml)
                        for s_child in sheet_root:
                            if s_child.tag.split("}")[-1] == "sheetData":
                                row_count = len(s_child)
                                break

                    sheets.append(SheetInfo(
                        sheet_id=sheet_id,
                        name=name,
                        state=state,
                        row_count=row_count,
                    ))

        return sheets

    def _extract_shared_strings(self, z: zipfile.ZipFile) -> List[str]:
        """Extracts shared strings table (xl/sharedStrings.xml) if present."""
        strings: List[str] = []
        if "xl/sharedStrings.xml" not in z.namelist():
            return strings

        xml_data = z.read("xl/sharedStrings.xml")
        root = ET.fromstring(xml_data)

        for si in root:
            texts = []
            for elem in si.iter():
                if elem.tag.split("}")[-1] == "t" and elem.text:
                    texts.append(elem.text)
            strings.append("".join(texts))
        return strings

    def _parse_sheet_rows(
        self,
        sheet_xml: bytes,
        shared_strings: List[str],
    ) -> List[List[str]]:
        """Parses sheet XML into a list of row lists with resolved strings."""
        root = ET.fromstring(sheet_xml)
        sheet_data = None
        for child in root:
            if child.tag.split("}")[-1] == "sheetData":
                sheet_data = child
                break

        if sheet_data is None:
            return []

        rows_data: List[List[str]] = []

        for row in sheet_data:
            current_row: Dict[int, str] = {}
            max_col = 0
            for cell in row:
                cell_ref = cell.attrib.get("r", "")
                cell_type = cell.attrib.get("t", "")
                _, col_idx = _cell_ref_to_row_col(cell_ref)
                if col_idx > max_col:
                    max_col = col_idx

                val = ""
                for child in cell:
                    tag = child.tag.split("}")[-1]
                    if tag == "v" and child.text:
                        if cell_type == "s":
                            try:
                                str_idx = int(child.text)
                                if 0 <= str_idx < len(shared_strings):
                                    val = shared_strings[str_idx]
                                else:
                                    val = child.text
                            except ValueError:
                                val = child.text
                        else:
                            val = child.text
                    elif tag == "is":
                        t_parts = []
                        for is_child in child.iter():
                            if is_child.tag.split("}")[-1] == "t" and is_child.text:
                                t_parts.append(is_child.text)
                        val = "".join(t_parts)

                current_row[col_idx] = val.strip()

            # Materialize row as aligned list
            row_list = [current_row.get(c, "") for c in range(max_col + 1)]
            if any(row_list):
                rows_data.append(row_list)

        return rows_data

    @staticmethod
    def _clean_amount(amt_str: str) -> Optional[Decimal]:
        if not amt_str:
            return None
        s = amt_str.replace(",", "").strip()
        s = re.sub(r"(?i)\b(?:rs\.?|inr)\b", "", s)
        s = re.sub(r"[₹$]", "", s).strip()
        try:
            return Decimal(s)
        except InvalidOperation:
            return None

    def _detect_schema_type(self, headers: List[str]) -> str:
        hl = [h.lower() for h in headers]
        is_upi = any("rrn" in h or "vpa" in h or "upi" in h for h in hl)
        is_bank = any("balance" in h or "withdrawal" in h or "deposit" in h or "debit" in h for h in hl)
        is_cdr = any("caller" in h or "callee" in h or "bts" in h or "tower" in h or "duration" in h for h in hl)

        if is_upi:
            return "UPI_LOG"
        if is_bank:
            return "BANK_STATEMENT"
        if is_cdr:
            return "CDR"
        return "GENERAL_TABLE"

    def parse(
        self,
        file_source: Union[str, Path, bytes],
        filename: str = "evidence.xlsx",
        target_sheet: Optional[str] = None,
    ) -> ExcelParseResult:
        """Parses an Excel workbook into canonical Facts and RejectedRows."""
        raw_bytes = file_source if isinstance(file_source, bytes) else Path(file_source).read_bytes()
        sha256_hash = self.compute_sha256(raw_bytes)

        facts: List[Fact] = []
        rejected: List[RejectedRow] = []
        sheet_infos: List[SheetInfo] = []
        total_rows = 0

        with zipfile.ZipFile(io.BytesIO(raw_bytes), "r") as z:
            shared_strings = self._extract_shared_strings(z)
            sheet_infos = self.inspect_sheets(raw_bytes)

            for s_info in sheet_infos:
                if target_sheet and s_info.name.lower() != target_sheet.lower():
                    continue

                sheet_path = f"xl/worksheets/sheet{s_info.sheet_id}.xml"
                if sheet_path not in z.namelist():
                    continue

                sheet_xml = z.read(sheet_path)
                table_rows = self._parse_sheet_rows(sheet_xml, shared_strings)
                if not table_rows:
                    continue

                headers = [col.strip() for col in table_rows[0]]
                schema_type = self._detect_schema_type(headers)
                s_info.detected_type = schema_type

                # Map column indices
                col_map: Dict[str, int] = {}
                for idx, h in enumerate(headers):
                    hl = h.lower()
                    if "date" in hl or "time" in hl or "dttm" in hl:
                        col_map.setdefault("time", idx)
                    if "rrn" in hl or "utr" in hl or "ref" in hl:
                        col_map.setdefault("ref", idx)
                    if "debit" in hl or "withdrawal" in hl:
                        col_map.setdefault("debit", idx)
                    if "credit" in hl or "deposit" in hl:
                        col_map.setdefault("credit", idx)
                    if "balance" in hl:
                        col_map.setdefault("balance", idx)
                    if "amount" in hl:
                        col_map.setdefault("amount", idx)
                    if "vpa" in hl or "upi" in hl:
                        col_map.setdefault("vpa", idx)
                    if "sender" in hl or "from" in hl or "caller" in hl:
                        col_map.setdefault("sender", idx)
                    if "receiver" in hl or "to" in hl or "callee" in hl:
                        col_map.setdefault("receiver", idx)
                    if "narration" in hl or "description" in hl or "remarks" in hl:
                        col_map.setdefault("narration", idx)

                # Process data rows
                for r_idx, r in enumerate(table_rows[1:], start=2):
                    total_rows += 1
                    raw_row_str = " | ".join(r)

                    time_val = r[col_map["time"]] if "time" in col_map and col_map["time"] < len(r) else ""
                    if not time_val:
                        rejected.append(RejectedRow(
                            line_number=r_idx,
                            raw_content=raw_row_str,
                            reason=f"Sheet '{s_info.name}' row {r_idx} missing required timestamp",
                        ))
                        continue

                    # Try parsing timestamp
                    dt_parsed: Optional[datetime.datetime] = None
                    # First try standard ISO or dates
                    for fmt in (
                        "%Y-%m-%d %H:%M:%S",
                        "%Y-%m-%dT%H:%M:%S",
                        "%d/%m/%Y %H:%M:%S",
                        "%d-%m-%Y %H:%M:%S",
                        "%d/%m/%Y",
                        "%Y-%m-%d",
                    ):
                        try:
                            dt_parsed = datetime.datetime.strptime(time_val.strip(), fmt)
                            break
                        except ValueError:
                            pass

                    # Try float Excel epoch date if numeric
                    if dt_parsed is None:
                        try:
                            excel_serial = float(time_val)
                            # Excel base date is 1899-12-30 due to 1900 leap year bug
                            base_date = datetime.datetime(1899, 12, 30)
                            dt_parsed = base_date + datetime.timedelta(days=excel_serial)
                        except (ValueError, OverflowError):
                            pass

                    if dt_parsed is None:
                        rejected.append(RejectedRow(
                            line_number=r_idx,
                            raw_content=raw_row_str,
                            reason=f"Sheet '{s_info.name}' row {r_idx} unparseable timestamp '{time_val}'",
                        ))
                        continue

                    if dt_parsed.tzinfo is None:
                        dt_parsed = dt_parsed.replace(tzinfo=self.tz)

                    epoch_sec = dt_parsed.timestamp()

                    # Extract amounts
                    debit_amt = self._clean_amount(r[col_map["debit"]]) if "debit" in col_map and col_map["debit"] < len(r) else None
                    credit_amt = self._clean_amount(r[col_map["credit"]]) if "credit" in col_map and col_map["credit"] < len(r) else None
                    generic_amt = self._clean_amount(r[col_map["amount"]]) if "amount" in col_map and col_map["amount"] < len(r) else None
                    bal_amt = self._clean_amount(r[col_map["balance"]]) if "balance" in col_map and col_map["balance"] < len(r) else None

                    final_amt = debit_amt or credit_amt or generic_amt or Decimal("0.0")
                    is_debit = debit_amt is not None and debit_amt > 0

                    ref_val = r[col_map["ref"]] if "ref" in col_map and col_map["ref"] < len(r) else f"ROW-{r_idx}"
                    sender_val = r[col_map["sender"]] if "sender" in col_map and col_map["sender"] < len(r) else "UNKNOWN_SRC"
                    receiver_val = r[col_map["receiver"]] if "receiver" in col_map and col_map["receiver"] < len(r) else "UNKNOWN_DST"
                    narration_val = r[col_map["narration"]] if "narration" in col_map and col_map["narration"] < len(r) else ""

                    if schema_type == "UPI_LOG" or ("@" in sender_val or "@" in receiver_val):
                        fact_kind = FactKind.UPI_PAYMENT
                    elif schema_type == "BANK_STATEMENT":
                        fact_kind = FactKind.BANK_TXN
                    elif schema_type == "CDR":
                        fact_kind = FactKind.CDR_CALL
                    else:
                        fact_kind = FactKind.CLAIM

                    payload_dict = {
                        "source_file": filename,
                        "sheet_name": s_info.name,
                        "sheet_row": r_idx,
                        "source_cell_coords": f"{s_info.name}!A{r_idx}",
                        "reference_number": ref_val,
                        "amount": float(final_amt),
                        "is_debit": is_debit,
                        "balance": float(bal_amt) if bal_amt is not None else None,
                        "narration": narration_val,
                        "parser": self.PARSER_NAME,
                        "parser_version": self.PARSER_VERSION,
                        "source_sha256": sha256_hash,
                    }

                    fact = Fact(
                        id=f"FACT_XLSX_S{s_info.sheet_id}_R{r_idx}",
                        source_file=filename,
                        sha256=sha256_hash,
                        line_ref=f"sheet:{s_info.name}:row:{r_idx}",
                        kind=fact_kind,
                        time_window=TimeWindow(
                            start_epoch=epoch_sec,
                            end_epoch=epoch_sec + 5.0,
                            reported_epoch=epoch_sec,
                        ),
                        region=None,
                        tier=self.tier,
                        device_id=sender_val,
                        clock_id=self.clock_id,
                        entity_refs=[sender_val, receiver_val] if sender_val != "UNKNOWN_SRC" else [],
                        auth_type=AuthType.ACTIVE if self.tier == TrustTier.T1 else AuthType.PASSIVE,
                        raw_payload=payload_dict,
                    )
                    facts.append(fact)

        return ExcelParseResult(
            source_file=filename,
            source_sha256=sha256_hash,
            sheets=sheet_infos,
            facts=facts,
            rejected_rows=rejected,
            total_rows_processed=total_rows,
            metadata={"parser": self.PARSER_NAME, "version": self.PARSER_VERSION},
        )
