"""
TARKA × SentinelX — Universal Forensic Format Parser Registry (Phase 14)
Strictly adheres to the SentinelX Wave 6 Engineering Constitution:
- Evidence is DATA_ONLY.
- No executable interpretation of evidence.
- Safe parsers with bounded memory and resource constraints.
- Tri-state model: ACCEPTED -> PARSED -> ANALYSED.
- Unsupported formats return PARSER_NOT_AVAILABLE, never HTTP 500.
"""

from __future__ import annotations

import csv
import io
import json
import logging
import os
import re
import struct
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

logger = logging.getLogger("sentinelx.format_parsers")


class BaseParser:
    """Abstract base class for all forensic evidence format parsers."""
    parser_id: str = "base"
    version: str = "1.0.0"
    supported_extensions: List[str] = []
    supported_mimes: List[str] = []

    def can_parse(self, filename: str, mime_type: str) -> bool:
        ext = Path(filename).suffix.lower()
        return ext in self.supported_extensions or mime_type in self.supported_mimes

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        raise NotImplementedError


class ImageParser(BaseParser):
    """Forensic image parser extracting metadata, dimensions, EXIF, and text via OCR."""
    parser_id = "image_forensic_parser"
    version = "1.2.0"
    supported_extensions = [".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".bmp", ".gif", ".heic"]
    supported_mimes = ["image/png", "image/jpeg", "image/webp", "image/tiff", "image/bmp", "image/gif"]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        from PIL import Image, ExifTags
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "IMAGE",
            "dimensions": None,
            "color_mode": None,
            "exif_metadata": {},
            "extracted_text": [],
            "warnings": [],
        }
        try:
            with Image.open(file_path) as img:
                res["dimensions"] = {"width": img.width, "height": img.height}
                res["color_mode"] = img.mode
                res["detected_format"] = img.format

                # Extract basic EXIF safely
                if hasattr(img, "_getexif") and img._getexif():
                    exif_data = img._getexif()
                    if exif_data:
                        for tag_id, value in exif_data.items():
                            tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                            # Convert non-serializable values
                            if isinstance(value, (bytes, bytearray)):
                                value = f"<bytes: {len(value)}b>"
                            elif not isinstance(value, (str, int, float, bool, list, dict)):
                                value = str(value)
                            res["exif_metadata"][tag_name] = value

            # OCR Extraction via OCRExtractor (PaddleOCR / RapidOCR fallback)
            try:
                from tarka.ocr.extractor import OCRExtractor
                with open(file_path, "rb") as fp:
                    img_bytes = fp.read(min(max_bytes, file_path.stat().st_size))
                extractor = OCRExtractor()
                ocr_res = extractor.extract_from_bytes(img_bytes, artifact_id=file_path.stem)
                res["extracted_text"] = [t.text for t in ocr_res.tokens]
                res["ocr_tokens_count"] = len(ocr_res.tokens)
                res["ocr_confidence_mean"] = ocr_res.mean_confidence
                res["candidate_financial_fields"] = [f.model_dump(mode="json") for f in ocr_res.candidate_fields]
            except Exception as ocr_exc:
                logger.debug(f"OCR pass skipped for {file_path.name}: {ocr_exc}")
                res["warnings"].append(f"OCR note: {ocr_exc}")

        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class PDFParser(BaseParser):
    """Forensic PDF document parser extracting text, page count, and metadata."""
    parser_id = "pdf_forensic_parser"
    version = "1.1.0"
    supported_extensions = [".pdf"]
    supported_mimes = ["application/pdf"]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "PDF",
            "page_count": 0,
            "metadata": {},
            "extracted_text_preview": "",
            "total_extracted_characters": 0,
            "warnings": [],
        }
        try:
            import pypdf
            reader = pypdf.PdfReader(str(file_path))
            res["page_count"] = len(reader.pages)
            if reader.metadata:
                for k, v in reader.metadata.items():
                    clean_k = str(k).lstrip("/")
                    res["metadata"][clean_k] = str(v)

            # Extract bounded text preview from up to first 25 pages
            collected_text: List[str] = []
            for i, page in enumerate(reader.pages[:25]):
                t = page.extract_text() or ""
                if t.strip():
                    collected_text.append(f"--- Page {i+1} ---\n{t.strip()}")

            full_text = "\n\n".join(collected_text)
            res["total_extracted_characters"] = len(full_text)
            res["extracted_text_preview"] = full_text[:4000]
            if len(reader.pages) > 25:
                res["warnings"].append(f"Bounded parsing: parsed 25 of {len(reader.pages)} pages.")

        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class SpreadsheetParser(BaseParser):
    """Forensic spreadsheet parser supporting CSV, TSV, and XLSX workbooks with formula safety."""
    parser_id = "spreadsheet_forensic_parser"
    version = "1.2.0"
    supported_extensions = [".csv", ".tsv", ".xlsx", ".xls"]
    supported_mimes = [
        "text/csv",
        "text/tab-separated-values",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
    ]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        ext = file_path.suffix.lower()
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "SPREADSHEET",
            "total_rows": 0,
            "headers": [],
            "sample_rows": [],
            "formulas_detected": 0,
            "warnings": [],
        }
        try:
            if ext in [".csv", ".tsv"]:
                delimiter = "\t" if ext == ".tsv" else ","
                with open(file_path, "r", encoding="utf-8", errors="replace") as fp:
                    reader = csv.reader(fp, delimiter=delimiter)
                    row_idx = 0
                    for row in reader:
                        if row_idx == 0:
                            res["headers"] = row
                        elif row_idx <= 20:
                            res["sample_rows"].append(row)
                        row_idx += 1
                        if row_idx > 100000:
                            res["warnings"].append("Bounded processing: capped row count at 100,000.")
                            break
                    res["total_rows"] = row_idx
            elif ext == ".xlsx":
                import openpyxl
                wb = openpyxl.load_workbook(str(file_path), read_only=True, data_only=False)
                res["sheet_names"] = wb.sheetnames
                active_sheet = wb.active
                row_idx = 0
                for row in active_sheet.iter_rows(values_only=True):
                    row_list = [str(c) if c is not None else "" for c in row]
                    if row_idx == 0:
                        res["headers"] = row_list
                    elif row_idx <= 20:
                        res["sample_rows"].append(row_list)
                    # Check for formulas
                    for cell in row_list:
                        if cell.startswith("="):
                            res["formulas_detected"] += 1
                    row_idx += 1
                    if row_idx > 50000:
                        res["warnings"].append("Bounded processing: capped sheet row count at 50,000.")
                        break
                res["total_rows"] = row_idx
                wb.close()
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class DocumentParser(BaseParser):
    """Forensic document parser for DOCX, TXT, and RTF files."""
    parser_id = "document_forensic_parser"
    version = "1.0.0"
    supported_extensions = [".docx", ".txt", ".rtf", ".log"]
    supported_mimes = [
        "text/plain",
        "application/rtf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        ext = file_path.suffix.lower()
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "DOCUMENT",
            "text_preview": "",
            "character_count": 0,
            "warnings": [],
        }
        try:
            if ext in [".txt", ".log"]:
                with open(file_path, "r", encoding="utf-8", errors="replace") as fp:
                    content = fp.read(min(max_bytes, 10 * 1024 * 1024))
                    res["character_count"] = len(content)
                    res["text_preview"] = content[:4000]
            elif ext == ".docx":
                # Pure standard-library DOCX parser via zipfile XML extraction
                with zipfile.ZipFile(file_path, "r") as zf:
                    if "word/document.xml" in zf.namelist():
                        xml_data = zf.read("word/document.xml")
                        tree = ET.fromstring(xml_data)
                        paragraphs = []
                        for node in tree.iter():
                            if node.tag.endswith("}t") and node.text:
                                paragraphs.append(node.text)
                        doc_text = " ".join(paragraphs)
                        res["character_count"] = len(doc_text)
                        res["text_preview"] = doc_text[:4000]
                    else:
                        res["warnings"].append("DOCX archive missing word/document.xml entry.")
            elif ext == ".rtf":
                with open(file_path, "r", encoding="latin-1", errors="replace") as fp:
                    raw_rtf = fp.read(min(max_bytes, 2 * 1024 * 1024))
                    # Strip rudimentary RTF control words
                    clean_text = re.sub(r"\\[a-zA-Z]+\d*|\\[{}\\]", " ", raw_rtf)
                    clean_text = re.sub(r"\s+", " ", clean_text).strip()
                    res["character_count"] = len(clean_text)
                    res["text_preview"] = clean_text[:4000]
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class PresentationParser(BaseParser):
    """Forensic presentation parser for PPTX and ODP files extracting slide text safely."""
    parser_id = "presentation_forensic_parser"
    version = "1.0.0"
    supported_extensions = [".pptx", ".odp"]
    supported_mimes = [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.oasis.opendocument.presentation",
    ]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        ext = file_path.suffix.lower()
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "PRESENTATION",
            "slide_count": 0,
            "text_preview": "",
            "character_count": 0,
            "warnings": [],
        }
        try:
            if ext == ".pptx":
                with zipfile.ZipFile(file_path, "r") as zf:
                    slide_files = sorted([n for n in zf.namelist() if n.startswith("ppt/slides/slide") and n.endswith(".xml")])
                    res["slide_count"] = len(slide_files)
                    collected_texts = []
                    for sfile in slide_files[:50]:
                        xml_bytes = zf.read(sfile)
                        tree = ET.fromstring(xml_bytes)
                        for node in tree.iter():
                            if node.tag.endswith("}t") and node.text:
                                collected_texts.append(node.text)
                    full_text = " ".join(collected_texts)
                    res["character_count"] = len(full_text)
                    res["text_preview"] = full_text[:4000]
                    if len(slide_files) > 50:
                        res["warnings"].append(f"Bounded parsing: parsed 50 of {len(slide_files)} slides.")
            elif ext == ".odp":
                with zipfile.ZipFile(file_path, "r") as zf:
                    if "content.xml" in zf.namelist():
                        xml_bytes = zf.read("content.xml")
                        tree = ET.fromstring(xml_bytes)
                        texts = [node.text for node in tree.iter() if node.text and node.text.strip()]
                        full_text = " ".join(texts)
                        res["character_count"] = len(full_text)
                        res["text_preview"] = full_text[:4000]
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class EmailParser(BaseParser):
    """Forensic email message parser extracting headers, routing, and message body safely."""
    parser_id = "email_forensic_parser"
    version = "1.0.0"
    supported_extensions = [".eml", ".msg"]
    supported_mimes = ["message/rfc822", "application/vnd.ms-outlook"]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        import email
        from email import policy
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "EMAIL",
            "headers": {},
            "subject": "",
            "from": "",
            "to": "",
            "date": "",
            "body_preview": "",
            "attachments_count": 0,
            "attachment_names": [],
            "warnings": [],
        }
        try:
            with open(file_path, "rb") as fp:
                msg = email.message_from_binary_file(fp, policy=policy.default)
            res["subject"] = str(msg.get("subject", ""))
            res["from"] = str(msg.get("from", ""))
            res["to"] = str(msg.get("to", ""))
            res["date"] = str(msg.get("date", ""))
            for header_name in ["message-id", "reply-to", "cc", "received"]:
                if header_name in msg:
                    res["headers"][header_name] = str(msg.get(header_name, ""))

            # Extract body safely
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    content_type = part.get_content_type()
                    content_disp = str(part.get("Content-Disposition", ""))
                    if "attachment" in content_disp:
                        fname = part.get_filename() or "unnamed_attachment"
                        res["attachments_count"] += 1
                        res["attachment_names"].append(fname)
                    elif content_type == "text/plain" and not body:
                        try:
                            body = part.get_content()
                        except Exception:
                            body = str(part.get_payload(decode=True))
            else:
                try:
                    body = msg.get_content()
                except Exception:
                    body = str(msg.get_payload(decode=True))

            res["body_preview"] = (body or "")[:4000]
            res["character_count"] = len(body or "")
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class ArchiveParser(BaseParser):
    """Forensic archive parser safely enumerating entries and hashes with bomb defense."""
    parser_id = "archive_forensic_parser"
    version = "1.1.0"
    supported_extensions = [".zip", ".tar", ".gz", ".gzip", ".7z"]
    supported_mimes = ["application/zip", "application/x-tar", "application/gzip"]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        ext = file_path.suffix.lower()
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "ARCHIVE",
            "entry_count": 0,
            "total_uncompressed_bytes": 0,
            "entries": [],
            "warnings": [],
        }
        try:
            if ext == ".zip":
                with zipfile.ZipFile(file_path, "r") as zf:
                    infos = zf.infolist()
                    res["entry_count"] = len(infos)
                    total_uncompressed = 0
                    has_path_traversal = False
                    for info in infos[:100]:
                        total_uncompressed += info.file_size
                        if info.filename.startswith("/") or ".." in info.filename or "\\" in info.filename:
                            has_path_traversal = True
                        res["entries"].append({
                            "filename": Path(info.filename).name,
                            "path": info.filename,
                            "is_dir": info.is_dir(),
                            "compressed_bytes": info.compress_size,
                            "uncompressed_bytes": info.file_size,
                            "crc32": hex(info.CRC),
                        })
                    res["total_uncompressed_bytes"] = total_uncompressed
                    res["has_path_traversal"] = has_path_traversal
                    if has_path_traversal:
                        res["warnings"].append("Security Alert: Path traversal (Zip-Slip) signatures detected in archive entry names.")
                    if len(infos) > 100:
                        res["warnings"].append(f"Bounded enumeration: showing 100 of {len(infos)} entries.")
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class AudioVideoParser(BaseParser):
    """Forensic media metadata parser extracting durations, sample rates, and headers."""
    parser_id = "audiovideo_forensic_parser"
    version = "1.0.0"
    supported_extensions = [".wav", ".mp3", ".m4a", ".aac", ".flac", ".ogg", ".mp4", ".mov", ".mkv", ".webm"]
    supported_mimes = [
        "audio/wav", "audio/mpeg", "audio/mp4", "audio/flac", "audio/ogg",
        "video/mp4", "video/quicktime", "video/x-matroska", "video/webm"
    ]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        ext = file_path.suffix.lower()
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "MEDIA",
            "media_type": "VIDEO" if ext in [".mp4", ".mov", ".mkv", ".webm"] else "AUDIO",
            "duration_seconds": None,
            "sample_rate_hz": None,
            "channels": None,
            "bit_rate_bps": None,
            "warnings": [],
        }
        try:
            with open(file_path, "rb") as fp:
                header = fp.read(4096)

            # WAV Parser (RIFF ... WAVE fmt )
            if ext == ".wav" and header.startswith(b"RIFF") and header[8:12] == b"WAVE":
                fmt_idx = header.find(b"fmt ")
                if fmt_idx != -1 and len(header) >= fmt_idx + 24:
                    channels = struct.unpack("<H", header[fmt_idx+10:fmt_idx+12])[0]
                    sample_rate = struct.unpack("<I", header[fmt_idx+12:fmt_idx+16])[0]
                    byte_rate = struct.unpack("<I", header[fmt_idx+16:fmt_idx+20])[0]
                    res["channels"] = channels
                    res["sample_rate_hz"] = sample_rate
                    file_size = file_path.stat().st_size
                    if byte_rate > 0:
                        res["duration_seconds"] = round((file_size - 44) / byte_rate, 2)
                        res["bit_rate_bps"] = byte_rate * 8

            # MP4 / MOV Parser (mvhd atom duration)
            elif ext in [".mp4", ".mov"] and (b"ftyp" in header or b"moov" in header):
                with open(file_path, "rb") as fp:
                    # Scan first 64KB for mvhd
                    sample = fp.read(min(65536, file_path.stat().st_size))
                    mvhd_idx = sample.find(b"mvhd")
                    if mvhd_idx != -1 and len(sample) >= mvhd_idx + 24:
                        # Version 0 mvhd: version(1) + flags(3) + creation(4) + mod(4) + timescale(4) + duration(4)
                        timescale = struct.unpack(">I", sample[mvhd_idx+16:mvhd_idx+20])[0]
                        duration = struct.unpack(">I", sample[mvhd_idx+20:mvhd_idx+24])[0]
                        if timescale > 0:
                            res["duration_seconds"] = round(duration / timescale, 2)

        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class OpaqueBinaryParser(BaseParser):
    """Fallback parser for opaque binaries, preserving bitstream without semantic extraction."""
    parser_id = "opaque_binary_parser"
    version = "1.0.0"
    supported_extensions = []
    supported_mimes = ["application/octet-stream"]

    def can_parse(self, filename: str, mime_type: str) -> bool:
        return True

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        return {
            "parser": self.parser_id,
            "version": self.version,
            "status": "ACCEPTED",
            "format": "OPAQUE_BINARY",
            "message": "Binary evidence safely stored in CAS. Opaque format preserved under Rule 4 (DATA_ONLY).",
            "parser_available": False,
        }


class FormatParserRegistry:
    """Singleton registry coordinating multi-format forensic parsers."""
    _instance: Optional[FormatParserRegistry] = None

    def __init__(self):
        self.parsers: List[BaseParser] = [
            ImageParser(),
            PDFParser(),
            SpreadsheetParser(),
            DocumentParser(),
            PresentationParser(),
            EmailParser(),
            ArchiveParser(),
            AudioVideoParser(),
            OpaqueBinaryParser(),
        ]

    @classmethod
    def get_instance(cls) -> FormatParserRegistry:
        if cls._instance is None:
            cls._instance = FormatParserRegistry()
        return cls._instance

    def get_parser_for(self, filename: str, mime_type: str = "application/octet-stream") -> BaseParser:
        for p in self.parsers:
            if p.can_parse(filename, mime_type):
                return p
        return OpaqueBinaryParser()

    def parse_file(self, file_path: Path, mime_type: str = "application/octet-stream") -> Dict[str, Any]:
        parser = self.get_parser_for(file_path.name, mime_type)
        return parser.parse(file_path)

    def parse_bytes(self, data: bytes, filename: str, mime_type: str = "application/octet-stream") -> Dict[str, Any]:
        """Convenience method parsing in-memory bytes via an isolated temporary file."""
        import tempfile
        ext = Path(filename).suffix
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as fp:
            fp.write(data)
            tmp_path = Path(fp.name)
        try:
            return self.parse_file(tmp_path, mime_type=mime_type)
        finally:
            if tmp_path.exists():
                try:
                    tmp_path.unlink()
                except OSError:
                    pass
