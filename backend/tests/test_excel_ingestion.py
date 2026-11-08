"""Unit tests for TARKA Multi-Sheet Excel (XLSX) Evidence Parser."""

import datetime
import io
import unittest
import zipfile
import xml.etree.ElementTree as ET

from tarka.core.models import FactKind, TrustTier
from tarka.parsers.excel_parser import ExcelParser, SheetInfo, ExcelParseResult


def create_synthetic_xlsx(
    sheets_data: dict[str, list[list[str]]],
) -> bytes:
    """Creates a valid in-memory .xlsx workbook for testing without external tools."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        # 1. [Content_Types].xml
        content_types = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n'
            '  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\n'
            '  <Default Extension="xml" ContentType="application/xml"/>\n'
            '  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>\n'
        )
        for idx in range(1, len(sheets_data) + 1):
            content_types += f'  <Override PartName="/xl/worksheets/sheet{idx}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>\n'
        content_types += "</Types>"
        z.writestr("[Content_Types].xml", content_types)

        # 2. _rels/.rels
        rels = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\n'
            '  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>\n'
            "</Relationships>"
        )
        z.writestr("_rels/.rels", rels)

        # 3. xl/workbook.xml
        wb_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">\n'
            '  <sheets>\n'
        )
        for idx, sheet_name in enumerate(sheets_data.keys(), start=1):
            wb_xml += f'    <sheet name="{sheet_name}" sheetId="{idx}" r:id="rId{idx}"/>\n'
        wb_xml += "  </sheets>\n</workbook>"
        z.writestr("xl/workbook.xml", wb_xml)

        # 4. xl/worksheets/sheet{N}.xml
        for idx, (sheet_name, rows) in enumerate(sheets_data.items(), start=1):
            sheet_xml = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">\n'
                '  <sheetData>\n'
            )
            for r_idx, row in enumerate(rows, start=1):
                sheet_xml += f'    <row r="{r_idx}">\n'
                for c_idx, val in enumerate(row):
                    col_letter = chr(ord("A") + c_idx)
                    cell_ref = f"{col_letter}{r_idx}"
                    # Use inlineStr
                    sheet_xml += (
                        f'      <c r="{cell_ref}" t="inlineStr">\n'
                        f'        <is><t>{val}</t></is>\n'
                        f"      </c>\n"
                    )
                sheet_xml += "    </row>\n"
            sheet_xml += "  </sheetData>\n</worksheet>"
            z.writestr(f"xl/worksheets/sheet{idx}.xml", sheet_xml)

    buf.seek(0)
    return buf.getvalue()


class TestExcelParser(unittest.TestCase):
    def setUp(self):
        self.parser = ExcelParser()

    def test_inspect_sheets_multi_sheet(self):
        sheets_data = {
            "BankLedger": [
                ["Date", "Narration", "RefNo", "Debit", "Credit", "Balance"],
                ["2026-09-22 10:35:00", "UPI-MULE-TRANSFER", "RRN-202602149921", "0", "50000", "50000"],
            ],
            "CDRRecords": [
                ["CallDate", "Caller", "Callee", "Duration", "CellTower"],
                ["2026-09-22 10:00:00", "+919876543210", "+919123456780", "120", "DEL_TOWER_01"],
            ],
        }
        xlsx_bytes = create_synthetic_xlsx(sheets_data)
        sheets = self.parser.inspect_sheets(xlsx_bytes)

        self.assertEqual(len(sheets), 2)
        self.assertEqual(sheets[0].name, "BankLedger")
        self.assertEqual(sheets[1].name, "CDRRecords")

    def test_parse_multi_sheet_facts_and_rejections(self):
        sheets_data = {
            "BankLedger": [
                ["Date", "Narration", "RefNo", "Debit", "Credit", "Balance"],
                ["2026-09-22 10:35:00", "UPI-MULE-TRANSFER", "RRN-202602149921", "0", "50000", "50000"],
                ["2026-09-22 11:00:00", "ATM-CASHOUT", "ATM-WDL-991", "20000", "0", "30000"],
                ["INVALID_TIME", "MALFORMED_ROW", "ERR-001", "100", "0", "29900"],
            ],
            "UPIEvents": [
                ["Timestamp", "RRN", "SenderVPA", "ReceiverVPA", "Amount"],
                ["2026-09-22 10:14:02", "RRN-UPI-8812", "victim@okhdfc", "mule1@okicici", "50000"],
            ],
        }
        xlsx_bytes = create_synthetic_xlsx(sheets_data)
        result = self.parser.parse(xlsx_bytes, filename="investigation_evidence.xlsx")

        self.assertIsInstance(result, ExcelParseResult)
        self.assertEqual(len(result.sheets), 2)
        # Expected: 2 bank facts + 1 UPI fact = 3 facts
        self.assertEqual(len(result.facts), 3)
        # 1 malformed row with INVALID_TIME rejected
        self.assertEqual(len(result.rejected_rows), 1)
        self.assertEqual(result.rejected_rows[0].line_number, 4)

        # Verify line conservation: facts + rejected == total_rows_processed (3 data rows in sheet 1 + 1 data row in sheet 2 = 4 rows)
        self.assertEqual(len(result.facts) + len(result.rejected_rows), result.total_rows_processed)
        self.assertEqual(result.total_rows_processed, 4)

        # Check bank fact properties
        bank_fact = result.facts[0]
        self.assertEqual(bank_fact.kind, FactKind.BANK_TXN)
        self.assertEqual(bank_fact.raw_payload["amount"], 50000.0)
        self.assertEqual(bank_fact.raw_payload["reference_number"], "RRN-202602149921")
        self.assertEqual(bank_fact.raw_payload["sheet_name"], "BankLedger")
        self.assertEqual(bank_fact.raw_payload["source_cell_coords"], "BankLedger!A2")

        # Check SHA-256 byte immutability
        expected_sha = ExcelParser.compute_sha256(xlsx_bytes)
        self.assertEqual(result.source_sha256, expected_sha)

    def test_target_single_sheet_filter(self):
        sheets_data = {
            "SheetA": [
                ["Date", "Amount", "Sender"],
                ["2026-09-22 10:00:00", "1000", "Alice"],
            ],
            "SheetB": [
                ["Date", "Amount", "Sender"],
                ["2026-09-22 11:00:00", "2000", "Bob"],
            ],
        }
        xlsx_bytes = create_synthetic_xlsx(sheets_data)
        result = self.parser.parse(xlsx_bytes, filename="test.xlsx", target_sheet="SheetB")

        self.assertEqual(len(result.facts), 1)
        self.assertEqual(result.facts[0].raw_payload["sheet_name"], "SheetB")
        self.assertEqual(result.facts[0].raw_payload["amount"], 2000.0)


if __name__ == "__main__":
    unittest.main()
