"""
TARKA x SentinelX — Forensic Format Parser Registry.

Strictly adheres to the SentinelX Wave 6 Engineering Constitution:
- Evidence is DATA_ONLY.
- No executable interpretation of evidence.
- Bounded-memory streaming parsers (CSV/TSV/XLSX stream row-by-row).
- Unsupported formats return PARSER_NOT_AVAILABLE, never HTTP 500.
"""

from __future__ import annotations

import csv
import logging
import re
import struct
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional

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
    """Forensic image parser extracting metadata, dimensions, EXIF, and OCR text."""

    parser_id = "image_forensic_parser"
    version = "1.2.0"
    supported_extensions = [".png", ".jpg", ".jpeg", ".webp", ".tiff", ".tif", ".bmp", ".gif"]
    supported_mimes = ["image/png", "image/jpeg", "image/webp", "image/tiff", "image/bmp", "image/gif"]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        from PIL import ExifTags, Image, ImageOps

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
            with Image.open(file_path) as raw_img:
                res["detected_format"] = raw_img.format
                raw_exif = getattr(raw_img, "_getexif", lambda: None)()
                img = ImageOps.exif_transpose(raw_img) or raw_img
                res["dimensions"] = {"width": img.width, "height": img.height}
                res["color_mode"] = img.mode

                if raw_exif:
                    for tag_id, value in raw_exif.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        if isinstance(value, (bytes, bytearray)):
                            value = f"<bytes: {len(value)}b>"
                        elif not isinstance(value, (str, int, float, bool, list, dict)):
                            value = str(value)
                        res["exif_metadata"][tag_name] = value

            try:
                from tarka.ocr.extractor import OCRExtractor

                with open(file_path, "rb") as fp:
                    img_bytes = fp.read(min(max_bytes, file_path.stat().st_size))
                extractor = OCRExtractor()
                ocr_res = extractor.extract_from_bytes(img_bytes, artifact_id=file_path.stem)
                res["extracted_text"] = [t.text for t in ocr_res.tokens]
                res["ocr_tokens_count"] = len(ocr_res.tokens)
                res["ocr_confidence_mean"] = (
                    round(sum(t.confidence for t in ocr_res.tokens) / len(ocr_res.tokens), 4)
                    if ocr_res.tokens
                    else 0.0
                )
                res["candidate_financial_fields"] = [c.model_dump(mode="json") for c in ocr_res.candidates]
            except Exception as ocr_exc:
                logger.debug("OCR pass skipped for %s: %s", file_path.name, ocr_exc)
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
                    res["metadata"][str(k).lstrip("/")] = str(v)

            collected_text: List[str] = []
            for i, page in enumerate(reader.pages[:25]):
                t = page.extract_text() or ""
                if t.strip():
                    collected_text.append(f"--- Page {i + 1} ---\n{t.strip()}")

            full_text = "\n\n".join(collected_text)
            res["total_extracted_characters"] = len(full_text)
            res["extracted_text_preview"] = full_text[:8000]
            if len(reader.pages) > 25:
                res["warnings"].append(f"Bounded parsing: parsed 25 of {len(reader.pages)} pages.")
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class SpreadsheetParser(BaseParser):
    """Streaming spreadsheet parser for CSV, TSV, and XLSX with bounded memory and formula checks."""

    parser_id = "spreadsheet_forensic_parser"
    version = "1.3.0"
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
            if ext in (".csv", ".tsv"):
                delimiter = "\t" if ext == ".tsv" else ","
                with open(file_path, "r", encoding="utf-8", errors="replace", newline="") as fp:
                    reader = csv.reader(fp, delimiter=delimiter)
                    row_idx = 0
                    for row in reader:
                        if row_idx == 0:
                            res["headers"] = row[:60]
                        elif row_idx <= 20:
                            res["sample_rows"].append([c[:200] for c in row[:60]])
                        for cell in row[:60]:
                            if cell.startswith("="):
                                res["formulas_detected"] += 1
                        row_idx += 1
                    res["total_rows"] = row_idx
            elif ext == ".xlsx":
                import openpyxl

                wb = openpyxl.load_workbook(str(file_path), read_only=True, data_only=False)
                try:
                    res["sheet_names"] = list(wb.sheetnames)
                    active_sheet = wb.active
                    row_idx = 0
                    if active_sheet is not None:
                        for row in active_sheet.iter_rows(values_only=True):
                            row_list = [str(c)[:200] if c is not None else "" for c in row[:60]]
                            if row_idx == 0:
                                res["headers"] = row_list
                            elif row_idx <= 20:
                                res["sample_rows"].append(row_list)
                            for cell in row_list:
                                if cell.startswith("="):
                                    res["formulas_detected"] += 1
                            row_idx += 1
                    res["total_rows"] = row_idx
                finally:
                    wb.close()
            else:
                res["status"] = "PARSER_NOT_AVAILABLE"
                res["parser_available"] = False
                res["warnings"].append(f"Legacy binary spreadsheet format '{ext}' is stored as evidence only.")
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class DocumentParser(BaseParser):
    """Forensic document parser for DOCX, TXT, LOG, JSON, XML, and RTF files."""

    parser_id = "document_forensic_parser"
    version = "1.1.0"
    supported_extensions = [".docx", ".txt", ".rtf", ".log", ".json", ".xml"]
    supported_mimes = [
        "text/plain",
        "application/rtf",
        "application/json",
        "application/xml",
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
            if ext in (".txt", ".log", ".json", ".xml"):
                with open(file_path, "r", encoding="utf-8", errors="replace") as fp:
                    content = fp.read(min(max_bytes, 10 * 1024 * 1024))
                res["character_count"] = len(content)
                res["text_preview"] = content[:4000]
            elif ext == ".docx":
                with zipfile.ZipFile(file_path, "r") as zf:
                    if "word/document.xml" in zf.namelist():
                        xml_data = zf.read("word/document.xml")
                        tree = ET.fromstring(xml_data)
                        paragraphs = [node.text for node in tree.iter() if node.tag.endswith("}t") and node.text]
                        doc_text = " ".join(paragraphs)
                        res["character_count"] = len(doc_text)
                        res["text_preview"] = doc_text[:4000]
                    else:
                        res["warnings"].append("DOCX archive missing word/document.xml entry.")
            elif ext == ".rtf":
                with open(file_path, "r", encoding="latin-1", errors="replace") as fp:
                    raw_rtf = fp.read(min(max_bytes, 2 * 1024 * 1024))
                clean_text = re.sub(r"\\[a-zA-Z]+\d*|\\[{}\\]", " ", raw_rtf)
                clean_text = re.sub(r"\s+", " ", clean_text).strip()
                res["character_count"] = len(clean_text)
                res["text_preview"] = clean_text[:4000]
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class ArchiveParser(BaseParser):
    """Forensic archive parser safely enumerating ZIP entries with traversal checks."""

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
                        res["warnings"].append("Path traversal signatures detected in archive entry names.")
                    if len(infos) > 100:
                        res["warnings"].append(f"Bounded enumeration: showing 100 of {len(infos)} entries.")
            else:
                res["status"] = "PARSER_NOT_AVAILABLE"
                res["parser_available"] = False
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
        "video/mp4", "video/quicktime", "video/x-matroska", "video/webm",
    ]

    def parse(self, file_path: Path, max_bytes: int = 100 * 1024 * 1024) -> Dict[str, Any]:
        ext = file_path.suffix.lower()
        res: Dict[str, Any] = {
            "parser": self.parser_id,
            "version": self.version,
            "status": "PARSED",
            "format": "MEDIA",
            "media_type": "VIDEO" if ext in (".mp4", ".mov", ".mkv", ".webm") else "AUDIO",
            "duration_seconds": None,
            "sample_rate_hz": None,
            "channels": None,
            "bit_rate_bps": None,
            "warnings": [],
        }
        try:
            with open(file_path, "rb") as fp:
                header = fp.read(4096)

            if ext == ".wav" and header.startswith(b"RIFF") and header[8:12] == b"WAVE":
                fmt_idx = header.find(b"fmt ")
                if fmt_idx != -1 and len(header) >= fmt_idx + 24:
                    channels = struct.unpack("<H", header[fmt_idx + 10 : fmt_idx + 12])[0]
                    sample_rate = struct.unpack("<I", header[fmt_idx + 12 : fmt_idx + 16])[0]
                    byte_rate = struct.unpack("<I", header[fmt_idx + 16 : fmt_idx + 20])[0]
                    res["channels"] = channels
                    res["sample_rate_hz"] = sample_rate
                    file_size = file_path.stat().st_size
                    if byte_rate > 0:
                        res["duration_seconds"] = round((file_size - 44) / byte_rate, 2)
                        res["bit_rate_bps"] = byte_rate * 8

            elif ext in (".mp4", ".mov") and (b"ftyp" in header or b"moov" in header):
                with open(file_path, "rb") as fp:
                    sample = fp.read(min(65536, file_path.stat().st_size))
                mvhd_idx = sample.find(b"mvhd")
                if mvhd_idx != -1 and len(sample) >= mvhd_idx + 24:
                    timescale = struct.unpack(">I", sample[mvhd_idx + 16 : mvhd_idx + 20])[0]
                    duration = struct.unpack(">I", sample[mvhd_idx + 20 : mvhd_idx + 24])[0]
                    if timescale > 0:
                        res["duration_seconds"] = round(duration / timescale, 2)
        except Exception as exc:
            res["status"] = "PARSE_ERROR"
            res["error"] = str(exc)
        return res


class OpaqueBinaryParser(BaseParser):
    """Fallback parser for unsupported/opaque binaries: returns PARSER_NOT_AVAILABLE, never 500."""

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
            "status": "PARSER_NOT_AVAILABLE",
            "format": "OPAQUE_BINARY",
            "message": "Binary evidence preserved in read-only storage under DATA_ONLY; no semantic parser for this format.",
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
        try:
            return parser.parse(file_path)
        except Exception as exc:
            logger.warning("Parser %s failed on %s: %s", parser.parser_id, file_path.name, exc)
            return {
                "parser": parser.parser_id,
                "status": "PARSER_NOT_AVAILABLE",
                "parser_available": False,
                "error": str(exc),
            }

    def parse_bytes(self, data: bytes, filename: str, mime_type: str = "application/octet-stream") -> Dict[str, Any]:
        """Parse in-memory bytes via a temporary file."""
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
