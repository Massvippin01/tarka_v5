"""Massive Evidence Ingestion Engine, Resource-Aware Admission Controller, and Real-Time Analytics.

Governed by SentinelX Wave 6 Engineering Constitution & SUTRAM 2026 Mandate:
- Bounded Memory Buffering: Never load multi-gigabyte or streaming evidence entirely into memory.
- 10-Stage Explicit Lifecycle: Every file transitions through strict, observable stages.
- Resource-Aware Threshold Model: Dynamically budgets memory based on host capacity, format expansion, and worker concurrency.
- Cryptographic Integrity: Chunked 64KB hashing + overall SHA-256 digest calculation.
- Archive Safety Quarantine: Protection against zip bombs, recursive nesting, and path traversal.
- Evidence Immutable & DATA_ONLY: Original bytes sealed in object storage; derived projections separately managed.
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import json
import logging
import math
import os
from pathlib import Path
import re
import shutil
import sqlite3
import time
from contextlib import closing
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
import zipfile

from app.services.ingestion.device_store import ingest_device_csv, looks_like_device_log
from app.services.ingestion.derived_store import (
    DerivedStore,
    columns_from_names,
    looks_like_bank_statement,
    read_header,
    read_sample_rows,
)

try:
    import psutil
except ImportError:
    psutil = None

logger = logging.getLogger("tarka.ingestion.engine")


# ────────────────────────────────────────────────────────────────────
# 1. Pipeline Stages & Operational Classes
# ────────────────────────────────────────────────────────────────────

class IngestionStage(str, Enum):
    STAGE_1_FILE_RECEIVED = "FILE_RECEIVED"
    STAGE_2_UPLOAD_COMPLETED = "UPLOAD_COMPLETED"
    STAGE_3_FILE_VALIDATED = "FILE_VALIDATED"
    STAGE_4_HASH_CALCULATED = "HASH_CALCULATED"
    STAGE_5_EVIDENCE_ADMITTED = "EVIDENCE_ADMITTED"
    STAGE_6_CONTENT_EXTRACTED = "CONTENT_EXTRACTED"
    STAGE_7_CONTENT_INDEXED = "CONTENT_INDEXED"
    STAGE_8_ANALYTICS_COMPLETED = "ANALYTICAL_PROCESSING_COMPLETED"
    STAGE_9_RESULTS_VALIDATED = "RESULTS_VALIDATED"
    STAGE_10_EVIDENCE_AVAILABLE = "EVIDENCE_AVAILABLE"
    # Terminal side-states
    NEEDS_MAPPING = "NEEDS_MAPPING"  # tabular file whose columns we don't recognise yet
    REJECTED = "REJECTED"  # failed format / archive safety checks
    DUPLICATE = "DUPLICATE"  # same SHA-256 as a file already admitted


class OperationalClass(str, Enum):
    SMALL = "SMALL"                # < 5 MB
    MEDIUM = "MEDIUM"              # 5 MB - 50 MB
    LARGE = "LARGE"                # 50 MB - 500 MB
    VERY_LARGE = "VERY_LARGE"      # 500 MB - 5 GB
    BULK_DATASET = "BULK_DATASET"  # > 5 GB


class AdmissionDecision(str, Enum):
    ADMIT_IMMEDIATE = "ADMIT_IMMEDIATE"
    QUEUE_CONSTRAINED = "QUEUE_CONSTRAINED"
    REJECT_UNSAFE = "REJECT_UNSAFE"


# ────────────────────────────────────────────────────────────────────
# 2. Format Signature & Magic Byte Validator
# ────────────────────────────────────────────────────────────────────

class FormatSignatureValidator:
    """Validates file authenticity by inspecting magic byte signatures rather than trusting extensions."""

    MAGIC_SIGNATURES: Dict[str, List[bytes]] = {
        "pdf": [b"%PDF-"],
        "zip": [b"PK\x03\x04", b"PK\x05\x06", b"PK\x07\x08"],
        "docx": [b"PK\x03\x04"],
        "xlsx": [b"PK\x03\x04"],
        "png": [b"\x89PNG\r\n\x1a\n"],
        "jpeg": [b"\xff\xd8\xff"],
        "gif": [b"GIF87a", b"GIF89a"],
        "bmp": [b"BM"],
        "tiff": [b"II*\x00", b"MM\x00*"],
        "wav": [b"RIFF"],
        "mp3": [b"ID3", b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"],
        "flac": [b"fLaC"],
        "ogg": [b"OggS"],
        "mkv": [b"\x1a\x45\xdf\xa3"],
        "7z": [b"7z\xbc\xaf\x27\x1c"],
        "gz": [b"\x1f\x8b"],
        "pcap": [b"\xd4\xc3\xb2\xa1", b"\xa1\xb2\xc3\xd4", b"\n\r\r\n"],
    }

    MALICIOUS_SIGNATURES: List[Tuple[bytes, str]] = [
        (b"MZ", "Windows PE executable / DLL"),
        (b"\x7fELF", "Linux ELF executable / shared object"),
        (b"\xca\xfe\xba\xbe", "Mach-O / Java universal binary"),
        (b"\xce\xfa\xed\xfe", "Mach-O 32-bit binary"),
        (b"\xcf\xfa\xed\xfe", "Mach-O 64-bit binary"),
        (b"#!/bin/sh", "Unix shell script"),
        (b"#!/bin/bash", "Bash shell script"),
        (b"#!/usr/bin/env", "Script interpreter shebang"),
    ]

    @classmethod
    def validate_signature(cls, filename: str, header_bytes: bytes) -> Tuple[bool, str, str]:
        """Validates that the file header matches known forensic signatures or safe plain text.
        
        Returns: (is_valid, detected_format, diagnostic_message)
        """
        if not header_bytes:
            return False, "unknown", "File header is empty (0 bytes)."

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

        # Reject executable / script payloads regardless of extension (Rule 4: DATA_ONLY)
        for sig, desc in cls.MALICIOUS_SIGNATURES:
            if header_bytes.startswith(sig):
                return False, "malicious_executable", f"Malicious or executable payload rejected ({desc})."

        lower_hdr = header_bytes.lower()
        if (b"<script" in lower_hdr or b"<iframe" in lower_hdr or b"javascript:" in lower_hdr) and ext in (
            "png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tif", "pdf", "csv", "tsv", "xlsx"
        ):
            return False, "disguised_script", f"Disguised active script directive detected in '{filename}'."

        # WebP: RIFF....WEBP
        if header_bytes.startswith(b"RIFF") and len(header_bytes) >= 12 and header_bytes[8:12] == b"WEBP":
            return True, "webp", "Magic bytes match WEBP image signature."

        # MP4 / MOV / M4A: ISO Base Media File Format ('ftyp' at byte 4)
        if len(header_bytes) >= 12 and header_bytes[4:8] == b"ftyp":
            fmt = ext if ext in ("mp4", "mov", "m4a") else "mp4"
            return True, fmt, f"Magic bytes match ISO BMFF ({fmt.upper()}) container."

        # Binary signature checks
        for fmt, sigs in cls.MAGIC_SIGNATURES.items():
            if any(header_bytes.startswith(sig) for sig in sigs):
                if ext in ("docx", "xlsx", "zip") and fmt in ("zip", "docx", "xlsx"):
                    return True, ext or "zip", f"Verified ZIP-container format for {ext.upper()}."
                if ext == fmt:
                    return True, fmt, f"Magic bytes match expected {fmt.upper()} signature."
                if ext in ("jpg", "jpeg") and fmt == "jpeg":
                    return True, "jpeg", "Magic bytes match JPEG signature."
                if ext in ("tif", "tiff") and fmt == "tiff":
                    return True, "tiff", "Magic bytes match TIFF signature."
                if ext in ("webm", "mkv") and fmt == "mkv":
                    return True, ext, f"Magic bytes match {ext.upper()} signature."
                if ext in ("gz", "gzip") and fmt == "gz":
                    return True, "gz", "Magic bytes match GZIP signature."
                return True, fmt, f"Detected authentic {fmt.upper()} payload with extension .{ext}."

        # Plain text formats: CSV, TSV, JSON, XML, TXT, LOG, RTF
        if ext in ("csv", "tsv", "txt", "log", "json", "xml", "rtf"):
            try:
                sample = header_bytes[:512].decode("utf-8", errors="strict")
                if ext == "json":
                    stripped = sample.strip()
                    if stripped.startswith(("{", "[")):
                        return True, "json", "Header verified as valid UTF-8 JSON structure."
                elif ext == "xml":
                    if sample.strip().startswith(("<", "<?xml")):
                        return True, "xml", "Header verified as valid XML payload."
                elif ext == "rtf" and sample.lstrip().startswith("{\\rtf"):
                    return True, "rtf", "Header verified as RTF document."
                return True, ext, f"Header verified as valid UTF-8 plain text for {ext.upper()}."
            except UnicodeDecodeError:
                return False, "binary_unknown", f"File .{ext} claimed to be plain text, but contains non-UTF-8 binary data."

        # Default fallback for forensic raw images / dumps
        if ext in ("raw", "dd", "bin", "eml", "mbox", "tar", "aac", "xls"):
            return True, ext, f"Accepted under raw forensic stream policy for .{ext}."

        return False, "unsupported", f"Unrecognized or unsupported file format signature for file '{filename}'."

    @classmethod
    def validate_file_security(cls, file_path: Path, detected_fmt: str) -> Tuple[bool, str]:
        """Deep security checks on staged file: PNG/ZIP polyglots, PDF active scripts, CSV formula injection."""
        try:
            size = file_path.stat().st_size
            if detected_fmt == "png":
                with open(file_path, "rb") as fp:
                    sample = fp.read(min(size, 2 * 1024 * 1024))
                iend_pos = sample.find(b"IEND\xaeB`\x82")
                if iend_pos != -1 and b"PK\x03\x04" in sample[iend_pos + 8 :]:
                    return False, "Polyglot payload detected: ZIP archive appended after PNG IEND chunk."
            elif detected_fmt == "pdf":
                with open(file_path, "rb") as fp:
                    sample = fp.read(min(size, 512 * 1024)).lower()
                if b"/javascript" in sample or b"/launch" in sample:
                    return False, "Active executable directive (/JavaScript or /Launch) detected in PDF."
            elif detected_fmt in ("csv", "tsv"):
                with open(file_path, "rb") as fp:
                    sample = fp.read(min(size, 64 * 1024)).decode("utf-8", errors="ignore")
                for line in sample.splitlines()[:50]:
                    for cell in line.split("\t" if detected_fmt == "tsv" else ","):
                        c = cell.strip().strip('"').strip("'")
                        if c and c[0] in ("=", "+", "-", "@", "|"):
                            lc = c.lower()
                            if any(d in lc for d in ("cmd", "powershell", "certutil", "cscript", "mshta", "rundll32", "dde", "exec")):
                                return False, f"Formula injection / DDE command detected in tabular cell '{c[:25]}'."
        except Exception as exc:
            return False, f"Security scan failed: {exc}"
        return True, "OK"


# ────────────────────────────────────────────────────────────────────
# 3. Archive Safety Quarantine (Zip Bomb & Traversal Defense)
# ────────────────────────────────────────────────────────────────────

class ArchiveSafetyQuarantine:
    """Guards against archive decompression hazards, zip bombs, recursive nesting, and directory traversal."""

    MAX_EXPANSION_RATIO = 10.0  # Max 10:1 ratio between uncompressed and compressed
    MAX_FILE_COUNT = 1000       # Max files in single archive
    MAX_NESTING_DEPTH = 2       # Max directory depth
    MAX_SINGLE_FILE_BYTES = 500 * 1024 * 1024  # 500 MB per extracted entry

    @classmethod
    def audit_archive_file(cls, archive_path: Path) -> Tuple[bool, str, Dict[str, Any]]:
        """Safely inspects zip header metadata without decompressing to evaluate safety margins."""
        compressed_size = archive_path.stat().st_size
        if compressed_size == 0:
            return False, "Archive is empty.", {}

        try:
            with zipfile.ZipFile(archive_path, "r") as zf:
                infolist = zf.infolist()
                file_count = len(infolist)
                if file_count > cls.MAX_FILE_COUNT:
                    return False, f"Archive exceeds maximum file count limit ({file_count} > {cls.MAX_FILE_COUNT}).", {}

                total_uncompressed = 0
                for info in infolist:
                    filename = info.filename
                    # Path traversal defense
                    if ".." in filename or filename.startswith(("/", "\\")):
                        return False, f"Directory traversal detected in archive entry: '{filename}'.", {}

                    # Nesting depth check
                    parts = [p for p in filename.replace("\\", "/").split("/") if p]
                    if len(parts) > cls.MAX_NESTING_DEPTH + 1:
                        return False, f"Archive nesting depth exceeds limit ({len(parts)} > {cls.MAX_NESTING_DEPTH}).", {}

                    # Single file size check
                    if info.file_size > cls.MAX_SINGLE_FILE_BYTES:
                        return False, f"Entry '{filename}' uncompressed size exceeds 500MB safety limit ({info.file_size} bytes).", {}

                    total_uncompressed += info.file_size

                ratio = total_uncompressed / max(compressed_size, 1)
                if ratio > cls.MAX_EXPANSION_RATIO and total_uncompressed > 10 * 1024 * 1024:
                    return False, f"Decompression expansion ratio {ratio:.1f}:1 exceeds safety threshold {cls.MAX_EXPANSION_RATIO}:1 (potential zip bomb).", {}

                telemetry = {
                    "file_count": file_count,
                    "compressed_size_bytes": compressed_size,
                    "uncompressed_size_bytes": total_uncompressed,
                    "expansion_ratio": round(ratio, 2),
                }
                return True, "Archive verified safe for quarantined extraction.", telemetry
        except zipfile.BadZipFile:
            return False, "Malformed or corrupted ZIP archive header.", {}
        except Exception as e:
            return False, f"Archive inspection error: {e}", {}


# ────────────────────────────────────────────────────────────────────
# 4. Resource Admission Controller & Threshold Model
# ────────────────────────────────────────────────────────────────────

class ResourceAdmissionController:
    """
    Implements the mathematical per-file resource model:
    available_memory = total_memory - reserved_memory - current_memory_usage
    safe_worker_memory = available_memory / permitted_concurrent_workers
    estimated_job_memory = input_memory + parser_overhead + expansion_overhead + processing_buffers
    """

    RESERVED_OS_MEMORY_BYTES = 32 * 1024 * 1024  # 32 MB bounded OS cushion
    DEFAULT_MAX_WORKERS = 4

    @classmethod
    def get_system_memory_headroom(cls) -> Dict[str, int]:
        """Calculates current host memory headroom in bytes."""
        if psutil:
            mem = psutil.virtual_memory()
            total = mem.total
            used = mem.used
            available = mem.available
        else:
            # Fallback estimation for containerized environments without psutil
            total = 8 * 1024 * 1024 * 1024   # 8 GB
            used = 3 * 1024 * 1024 * 1024    # 3 GB
            available = total - used

        # Dynamic reserve: at most 15% of available memory or 32 MB
        reserved = min(cls.RESERVED_OS_MEMORY_BYTES, int(available * 0.15))
        safe_available = max(available - reserved, min(available, 64 * 1024 * 1024))
        return {
            "total_bytes": total,
            "used_bytes": used,
            "available_bytes": available,
            "safe_headroom_bytes": safe_available,
        }

    @classmethod
    def classify_workload(cls, file_size_bytes: int) -> OperationalClass:
        """Categorizes ingestion jobs into operational workload tiers."""
        mb = file_size_bytes / (1024 * 1024)
        if mb < 5:
            return OperationalClass.SMALL
        elif mb <= 50:
            return OperationalClass.MEDIUM
        elif mb <= 500:
            return OperationalClass.LARGE
        elif mb <= 5000:
            return OperationalClass.VERY_LARGE
        else:
            return OperationalClass.BULK_DATASET

    @classmethod
    def estimate_job_resource_budget(
        cls, file_size_bytes: int, filename: str
    ) -> Dict[str, Any]:
        """Computes conservative memory amplification and CPU estimates."""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        op_class = cls.classify_workload(file_size_bytes)

        # Multipliers based on format parser characteristics
        if ext in ("csv", "tsv"):
            parser_mult = 2.5   # In-memory dataframe / ledger representations
            expansion_mult = 1.2
        elif ext in ("xlsx", "docx", "zip"):
            parser_mult = 4.0   # Decompression + XML DOM trees
            expansion_mult = 3.5
        elif ext in ("pdf",):
            parser_mult = 3.0   # PDF stream decoding + layout text extraction
            expansion_mult = 1.5
        elif ext in ("json", "xml"):
            parser_mult = 3.5   # Nested AST / dict allocations
            expansion_mult = 1.0
        elif ext in ("png", "jpg", "jpeg"):
            parser_mult = 1.8   # Raw pixel array buffers
            expansion_mult = 1.0
        else:
            parser_mult = 1.5   # Generic streaming binary buffer
            expansion_mult = 1.0

        buffer_overhead = (
            1 * 1024 * 1024 if op_class == OperationalClass.SMALL
            else 4 * 1024 * 1024 if op_class == OperationalClass.MEDIUM
            else 16 * 1024 * 1024
        )
        estimated_memory = int(file_size_bytes * (parser_mult + expansion_mult) + buffer_overhead)

        # For very large / bulk datasets, force bounded disk-backed chunk processing
        if op_class in (OperationalClass.VERY_LARGE, OperationalClass.BULK_DATASET):
            # Capped because columnar chunking / disk streaming is mandatory
            estimated_memory = min(estimated_memory, 512 * 1024 * 1024)

        return {
            "file_size_bytes": file_size_bytes,
            "operational_class": op_class.value,
            "estimated_memory_bytes": estimated_memory,
            "parser_multiplier": parser_mult,
            "expansion_multiplier": expansion_mult,
            "recommended_strategy": (
                "DIRECT_SYNCHRONOUS"
                if op_class == OperationalClass.SMALL
                else "STREAMING_BACKGROUND_WORKER"
                if op_class in (OperationalClass.MEDIUM, OperationalClass.LARGE)
                else "PARTITIONED_COLUMNAR_PIPELINE"
            ),
        }

    @classmethod
    def evaluate_admission(
        cls,
        file_size_bytes: int,
        filename: str,
        current_active_workers: int = 1,
        permitted_concurrent_workers: int = DEFAULT_MAX_WORKERS,
    ) -> Dict[str, Any]:
        """Evaluates dynamic admission control decision."""
        headroom = cls.get_system_memory_headroom()
        budget = cls.estimate_job_resource_budget(file_size_bytes, filename)
        estimated_mem = budget["estimated_memory_bytes"]

        safe_worker_mem = headroom["safe_headroom_bytes"] // max(1, permitted_concurrent_workers)
        # Parsing streams in bounded memory; disk is what runs out: staging + sealed copy + derived rows ≈ 3× the file.
        disk_root = IngestionJobManager.get_instance().base_dir
        free_disk = shutil.disk_usage(disk_root if disk_root.exists() else Path(".")).free
        needed_disk = 3 * file_size_bytes

        if needed_disk > free_disk:
            decision = AdmissionDecision.REJECT_UNSAFE
            reason = (
                f"Not enough disk space: this file needs about {needed_disk / 1e9:.1f} GB "
                f"(upload, sealed copy and processed rows), {free_disk / 1e9:.1f} GB is free."
            )
        elif estimated_mem > headroom["safe_headroom_bytes"]:
            decision = AdmissionDecision.REJECT_UNSAFE
            reason = (
                f"Estimated job memory ({estimated_mem / (1024*1024):.1f} MB) exceeds safe system "
                f"headroom ({headroom['safe_headroom_bytes'] / (1024*1024):.1f} MB). Operation halted to prevent OOM crash."
            )
        elif current_active_workers >= permitted_concurrent_workers or estimated_mem > safe_worker_mem:
            decision = AdmissionDecision.QUEUE_CONSTRAINED
            reason = (
                f"System workers constrained ({current_active_workers}/{permitted_concurrent_workers} busy) or "
                f"estimated memory ({estimated_mem / (1024*1024):.1f} MB) exceeds per-worker budget ({safe_worker_mem / (1024*1024):.1f} MB). Job will be queued."
            )
        else:
            decision = AdmissionDecision.ADMIT_IMMEDIATE
            reason = (
                f"Job approved for immediate execution. Operational tier: {budget['operational_class']}, "
                f"budget: {estimated_mem / (1024*1024):.1f} MB."
            )

        return {
            "decision": decision.value,
            "reason": reason,
            "system_headroom": headroom,
            "budget": budget,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# ────────────────────────────────────────────────────────────────────
# 5. Streaming Chunked Hasher & Integrity Verifier
# ────────────────────────────────────────────────────────────────────

class StreamingChunkedHasher:
    """Calculates whole-object cryptographic digest and 64KB chunk manifests incrementally."""

    CHUNK_SIZE = 64 * 1024  # 64 KB bounded blocks

    def __init__(self):
        self.hasher = hashlib.sha256()
        self.chunk_manifest: List[Dict[str, Any]] = []
        self.total_bytes = 0

    def update(self, chunk: bytes) -> None:
        if not chunk:
            return
        chunk_len = len(chunk)
        chunk_hash = hashlib.sha256(chunk).hexdigest()
        self.chunk_manifest.append({
            "offset": self.total_bytes,
            "length": chunk_len,
            "sha256": chunk_hash,
        })
        self.hasher.update(chunk)
        self.total_bytes += chunk_len

    @property
    def hexdigest(self) -> str:
        return self.hasher.hexdigest()


# ────────────────────────────────────────────────────────────────────
# 6. Ingestion Job Model & Management Enclave
# ────────────────────────────────────────────────────────────────────

class IngestionJob:
    """Tracks state, checkpoints, throughput, and analytical disposition of an ingestion job."""

    def __init__(
        self,
        job_id: str,
        case_id: str,
        filename: str,
        total_size_bytes: int,
        intake_officer: str,
    ):
        self.job_id = job_id
        self.case_id = case_id
        self.filename = filename
        self.total_size_bytes = total_size_bytes
        self.intake_officer = intake_officer
        self.operational_class = ResourceAdmissionController.classify_workload(total_size_bytes)
        
        self.stage = IngestionStage.STAGE_1_FILE_RECEIVED
        self.bytes_uploaded = 0
        self.hasher: Optional[StreamingChunkedHasher] = StreamingChunkedHasher()
        self.start_time = time.time()
        self.last_chunk_time = time.time()
        self.throughput_mbps = 0.0
        self.eta_seconds = 0.0

        self.staging_path: Optional[Path] = None
        self.admitted_artifact_id: Optional[str] = None
        self.sha256_digest: Optional[str] = None
        self.error_message: Optional[str] = None
        self.is_paused = False
        self.is_cancelled = False
        self.retry_count = 0
        self.checkpoints: List[int] = [0]
        self.analytics_summary: Dict[str, Any] = {}
        self.column_map: Optional[Dict[str, str]] = None  # investigator's {field: header name}, when set
        self.processing: Optional[Dict[str, Any]] = None  # live step / rows / ETA after the upload finishes

    def to_dict(self) -> Dict[str, Any]:
        pct = 100.0 if self.total_size_bytes == 0 else min(100.0, (self.bytes_uploaded / self.total_size_bytes) * 100.0)
        return {
            "job_id": self.job_id,
            "case_id": self.case_id,
            "filename": self.filename,
            "total_size_bytes": self.total_size_bytes,
            "bytes_uploaded": self.bytes_uploaded,
            "progress_pct": round(pct, 2),
            "stage": self.stage.value,
            "operational_class": self.operational_class.value,
            "throughput_mbps": round(self.throughput_mbps, 2),
            "eta_seconds": round(self.eta_seconds, 1),
            "sha256": self.sha256_digest,
            "admitted_artifact_id": self.admitted_artifact_id,
            "is_paused": self.is_paused,
            "is_cancelled": self.is_cancelled,
            "retry_count": self.retry_count,
            "error_message": self.error_message,
            "analytics_summary": self.analytics_summary,
            "elapsed_seconds": round(time.time() - self.start_time, 2),
            "processing": self.processing,
            "intake_officer": self.intake_officer,
            "started_at": self.start_time,
        }


_CASE_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$")
MAX_CHUNK_BYTES = 16 * 1024 * 1024


def validate_case_id(case_id: str) -> str:
    """Case ids become directory names: allow only [A-Za-z0-9_-]."""
    if not isinstance(case_id, str) or not _CASE_ID_RE.match(case_id):
        raise ValueError(f"Invalid case id: {case_id!r}")
    return case_id


def safe_filename(filename: str) -> str:
    """Reduce a client-supplied name to a plain basename with no path or control characters."""
    name = re.split(r"[\\/]", filename or "")[-1]
    name = re.sub(r"[^A-Za-z0-9._ ()-]", "_", name).strip(" .")
    return name[:180] or "upload.bin"


def ensure_inside(base: Path, target: Path) -> Path:
    """Fail closed if a resolved path escapes its storage root."""
    resolved = target.resolve()
    if not resolved.is_relative_to(base.resolve()):
        raise ValueError("Resolved path escapes storage root.")
    return resolved


class IngestionJobManager:
    """Manages resumable chunked file ingestion, storage separation, and pipeline execution."""

    _instance: Optional["IngestionJobManager"] = None

    @classmethod
    def get_instance(cls) -> "IngestionJobManager":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    _TERMINAL = {"EVIDENCE_AVAILABLE", "NEEDS_MAPPING", "REJECTED", "DUPLICATE"}

    def __init__(self, base_dir: Path = Path("data/ingestion")):
        self.jobs: Dict[str, IngestionJob] = {}
        self._tasks: set = set()  # strong refs so background pipelines are not garbage-collected
        self.base_dir = Path(base_dir)
        self.staging_dir = self.base_dir / "staging"
        self.evidence_dir = self.base_dir / "evidence"
        self.derived_dir = self.base_dir / "derived"

        for d in (self.staging_dir, self.evidence_dir, self.derived_dir):
            d.mkdir(parents=True, exist_ok=True)

        # shortcut: job table in a local SQLite file (single backend process); move to the main DB for multi-node.
        self._db_path = self.base_dir / "jobs.sqlite"
        with closing(sqlite3.connect(self._db_path)) as db:
            db.execute(
                "CREATE TABLE IF NOT EXISTS jobs (job_id TEXT PRIMARY KEY, case_id TEXT, filename TEXT, "
                "total_size_bytes INTEGER, intake_officer TEXT, stage TEXT, sha256 TEXT, artifact_id TEXT, "
                "error_message TEXT, analytics_json TEXT, is_cancelled INTEGER, start_time REAL)"
            )
            if "column_map" not in {r[1] for r in db.execute("PRAGMA table_info(jobs)")}:
                db.execute("ALTER TABLE jobs ADD COLUMN column_map TEXT")
            # Chain of custody: append-only, one row per thing that happened to a file.
            db.execute(
                "CREATE TABLE IF NOT EXISTS custody (job_id TEXT, case_id TEXT, ts REAL, actor TEXT, action TEXT, detail TEXT)"
            )
            db.execute(
                "CREATE TABLE IF NOT EXISTS mapping_templates (name TEXT PRIMARY KEY, headers_json TEXT, columns_json TEXT)"
            )
            db.commit()
        self._load_jobs()

    def _save(self, job: IngestionJob) -> None:
        with closing(sqlite3.connect(self._db_path)) as db:
            db.execute(
                "INSERT OR REPLACE INTO jobs VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                (job.job_id, job.case_id, job.filename, job.total_size_bytes, job.intake_officer, job.stage.value,
                 job.sha256_digest, job.admitted_artifact_id, job.error_message,
                 json.dumps(job.analytics_summary, default=str), int(job.is_cancelled), job.start_time,
                 json.dumps(job.column_map) if job.column_map else None),
            )
            db.commit()

    SYSTEM_ACTOR = "TARKA (automatic)"
    _SEAL_ACTIONS = {"Evidence sealed", "Sealed in evidence store", "Fingerprint taken"}

    def _custody(self, job: IngestionJob, action: str, detail: str = "", actor: Optional[str] = None) -> None:
        with closing(sqlite3.connect(self._db_path)) as db:
            db.execute("INSERT INTO custody VALUES (?,?,?,?,?,?)",
                       (job.job_id, job.case_id, time.time(), actor or self.SYSTEM_ACTOR, action, detail))
            db.commit()

    def custody_events(self, case_id: str) -> List[Dict[str, Any]]:
        """Who did what to this case's files, oldest first. Files uploaded before the log existed get
        their events rebuilt from the job record (upload start, sealing time, outcome), marked reconstructed."""
        with closing(sqlite3.connect(self._db_path)) as db:
            rows = db.execute(
                "SELECT job_id, ts, actor, action, detail FROM custody WHERE case_id=? ORDER BY ts, rowid", (case_id,)
            ).fetchall()
        logged = {r[0] for r in rows}
        events, seen = [], set()
        for j, ts, a, act, d in rows:
            # The same file (same fingerprint) sealed again under the same job is a re-upload, not a second seal.
            if act in self._SEAL_ACTIONS and (j, act, d) in seen:
                act, d = "Duplicate re-upload", f"identical file already sealed; {d}"
            seen.add((j, act, d))
            events.append({"job_id": j, "ts": ts, "actor": a, "action": act, "detail": d, "reconstructed": False})
        for job in self.list_jobs({case_id}):
            if job.job_id in logged:
                continue
            ev = lambda ts, actor, action, detail="": events.append(
                {"job_id": job.job_id, "ts": ts, "actor": actor, "action": action, "detail": detail, "reconstructed": True})
            ev(job.start_time, job.intake_officer, "Upload started", job.filename)
            sealed = job.analytics_summary.get("timestamp")
            sealed_ts = datetime.fromisoformat(sealed).timestamp() if sealed else job.start_time
            if job.sha256_digest:
                ev(sealed_ts, self.SYSTEM_ACTOR, "Fingerprint taken", f"SHA-256 {job.sha256_digest}")
            ev(sealed_ts, self.SYSTEM_ACTOR, *self._outcome(job))
            if job.is_cancelled:
                ev(sealed_ts, job.intake_officer, "Upload cancelled", job.filename)
        return sorted(events, key=lambda e: e["ts"])

    @staticmethod
    def _outcome(job: IngestionJob) -> tuple:
        stage = job.stage
        if job.error_message and stage.value not in IngestionJobManager._TERMINAL:
            return ("Processing failed", job.error_message)
        if stage == IngestionStage.STAGE_10_EVIDENCE_AVAILABLE:
            a = job.analytics_summary
            if a.get("parser"):
                return ("Ready", f"{a.get('rows_accepted', 0):,} rows accepted, {a.get('rows_rejected', 0):,} rejected")
            return ("Ready", "Stored as evidence (no reader for this file type yet)")
        if stage == IngestionStage.REJECTED:
            return ("Rejected", job.error_message or "")
        if stage == IngestionStage.DUPLICATE:
            return ("Marked duplicate", job.analytics_summary.get("note", ""))
        if stage == IngestionStage.NEEDS_MAPPING:
            return ("Waiting for column mapping", job.analytics_summary.get("note", ""))
        return ("In progress", stage.value)

    def _load_jobs(self) -> None:
        """Rebuild jobs after a restart. Upload progress = bytes already in the staging file."""
        with closing(sqlite3.connect(self._db_path)) as db:
            rows = db.execute("SELECT * FROM jobs").fetchall()
        for (job_id, case_id, filename, total, officer, stage, sha, art, err, analytics, cancelled, started, cmap) in rows:
            job = IngestionJob(job_id, case_id, filename, total, officer)
            job.stage = IngestionStage(stage)
            job.sha256_digest, job.admitted_artifact_id, job.error_message = sha, art, err
            job.analytics_summary = json.loads(analytics or "{}")
            job.is_cancelled = bool(cancelled)
            job.start_time = started
            job.column_map = json.loads(cmap) if cmap else None
            job.staging_path = self.staging_dir / f"{job_id}_{filename}"
            job.hasher = None  # rebuilt from the staging file on next use
            if job.stage == IngestionStage.STAGE_1_FILE_RECEIVED:
                job.bytes_uploaded = job.staging_path.stat().st_size if job.staging_path.exists() else 0
            else:
                job.bytes_uploaded = total
            in_flight = job.stage.value not in self._TERMINAL and job.stage != IngestionStage.STAGE_1_FILE_RECEIVED
            if in_flight and not job.is_cancelled:
                job.error_message = job.error_message or "Processing was interrupted by a server restart. Resume to re-run it."
            self.jobs[job_id] = job

    @staticmethod
    def _rehash(path: Path) -> StreamingChunkedHasher:
        hasher = StreamingChunkedHasher()
        if path.exists():
            with open(path, "rb") as f:
                while block := f.read(8 * 1024 * 1024):
                    hasher.update(block)
        return hasher

    def _spawn_pipeline(self, job: IngestionJob) -> None:
        task = asyncio.create_task(self._process_admitted_pipeline(job))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    def create_job(
        self,
        case_id: str,
        filename: str,
        total_size_bytes: int,
        intake_officer: str = "Forensic Examiner",
    ) -> IngestionJob:
        validate_case_id(case_id)
        filename = safe_filename(filename)
        job_id = f"JOB-{hashlib.sha256(f'{case_id}:{filename}:{time.time()}'.encode()).hexdigest()[:12].upper()}"
        job = IngestionJob(
            job_id=job_id,
            case_id=case_id,
            filename=filename,
            total_size_bytes=total_size_bytes,
            intake_officer=intake_officer,
        )
        job_staging_path = ensure_inside(self.staging_dir, self.staging_dir / f"{job_id}_{filename}")
        job.staging_path = job_staging_path
        # Clear any prior stale staging file
        if job_staging_path.exists():
            job_staging_path.unlink()
        self.jobs[job_id] = job
        self._save(job)
        self._custody(job, "Upload started", f"{filename} ({total_size_bytes:,} bytes)", actor=intake_officer)
        logger.info(f"Created ingestion job {job_id} for case {case_id}: {filename} ({total_size_bytes} bytes)")
        return job

    async def append_chunk(self, job_id: str, offset: int, chunk_bytes: bytes) -> Dict[str, Any]:
        """Appends a streaming chunk to the job staging buffer."""
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(f"Ingestion job '{job_id}' not found.")
        if job.is_cancelled:
            raise ValueError(f"Ingestion job '{job_id}' has been cancelled.")
        if job.stage != IngestionStage.STAGE_1_FILE_RECEIVED:
            raise ValueError(f"Ingestion job '{job_id}' already received all bytes.")
        if len(chunk_bytes) > MAX_CHUNK_BYTES:
            raise OverflowError(f"Chunk exceeds {MAX_CHUNK_BYTES} bytes.")
        if job.bytes_uploaded + len(chunk_bytes) > job.total_size_bytes:
            raise ValueError(
                f"Chunk overflows declared size for job '{job_id}': "
                f"{job.bytes_uploaded + len(chunk_bytes)} > {job.total_size_bytes} bytes."
            )

        if offset != job.bytes_uploaded:
            # Resumable alignment mismatch
            raise ValueError(
                f"Byte offset mismatch for job '{job_id}': expected {job.bytes_uploaded}, received {offset}."
            )

        if job.hasher is None:
            job.hasher = await asyncio.to_thread(self._rehash, job.staging_path)

        now = time.time()
        # Append chunk to staging file on disk (bounded memory)
        with open(job.staging_path, "ab") as f:
            f.write(chunk_bytes)

        # Update chunked hasher
        job.hasher.update(chunk_bytes)
        job.bytes_uploaded += len(chunk_bytes)
        job.checkpoints.append(job.bytes_uploaded)

        # Telemetry calculations
        delta_t = max(0.001, now - job.last_chunk_time)
        chunk_mb = len(chunk_bytes) / (1024 * 1024)
        instant_speed = chunk_mb / delta_t
        job.throughput_mbps = (job.throughput_mbps * 0.7) + (instant_speed * 0.3)
        job.last_chunk_time = now

        remaining_bytes = max(0, job.total_size_bytes - job.bytes_uploaded)
        if job.throughput_mbps > 0.01:
            job.eta_seconds = (remaining_bytes / (1024 * 1024)) / job.throughput_mbps
        else:
            job.eta_seconds = 0.0

        if job.bytes_uploaded >= job.total_size_bytes:
            job.stage = IngestionStage.STAGE_2_UPLOAD_COMPLETED
            self._custody(job, "Upload received", f"All {job.total_size_bytes:,} bytes", actor=job.intake_officer)
            if job.operational_class == OperationalClass.SMALL:
                await self._process_admitted_pipeline(job)
            else:
                self._spawn_pipeline(job)
        self._save(job)

        return job.to_dict()

    async def _process_admitted_pipeline(self, job: IngestionJob) -> None:
        """Stages 3-10: validate, hash, seal, parse, index, summarise, self-check, publish."""
        job.error_message = None
        try:
            # Stage 3: File Validated
            job.stage = IngestionStage.STAGE_3_FILE_VALIDATED
            with open(job.staging_path, "rb") as f:
                header = f.read(512)
            is_valid, detected_fmt, msg = FormatSignatureValidator.validate_signature(job.filename, header)
            if not is_valid:
                job.stage = IngestionStage.REJECTED
                job.error_message = f"Format validation failed: {msg}"
                logger.error(f"Job {job.job_id} failed stage 3: {msg}")
                return

            sec_ok, sec_msg = await asyncio.to_thread(
                FormatSignatureValidator.validate_file_security, job.staging_path, detected_fmt
            )
            if not sec_ok:
                job.stage = IngestionStage.REJECTED
                job.error_message = f"Security validation failed: {sec_msg}"
                logger.error(f"Job {job.job_id} failed security scan: {sec_msg}")
                return

            # If zip archive, perform quarantine audit
            if detected_fmt in ("zip", "docx", "xlsx"):
                safe, arc_msg, arc_telemetry = ArchiveSafetyQuarantine.audit_archive_file(job.staging_path)
                if not safe:
                    job.stage = IngestionStage.REJECTED
                    job.error_message = f"Archive quarantine rejection: {arc_msg}"
                    logger.error(f"Job {job.job_id} archive audit failed: {arc_msg}")
                    return

            # Stage 4: Hash Calculated (rebuilt from disk if the server restarted mid-upload)
            job.stage = IngestionStage.STAGE_4_HASH_CALCULATED
            if job.hasher is None or job.hasher.total_bytes != job.bytes_uploaded:
                job.hasher = await asyncio.to_thread(self._rehash, job.staging_path)
            job.sha256_digest = job.hasher.hexdigest
            self._custody(job, "Fingerprint taken", f"SHA-256 {job.sha256_digest}")
            original = self.find_duplicate(job)
            if original:
                job.stage = IngestionStage.DUPLICATE
                job.analytics_summary = {
                    "sha256": job.sha256_digest,
                    "duplicate_of": {"job_id": original.job_id, "case_id": original.case_id, "filename": original.filename},
                    "note": f"Same file already uploaded to {original.case_id} as {original.filename}.",
                }
                return

            # Stage 5: Evidence Admitted
            job.stage = IngestionStage.STAGE_5_EVIDENCE_ADMITTED
            artifact_id = f"ART-{job.sha256_digest[:10].upper()}"
            job.admitted_artifact_id = artifact_id

            # Seal into permanent evidence directory (WORM layout)
            sealed_case_dir = ensure_inside(self.evidence_dir, self.evidence_dir / validate_case_id(job.case_id))
            sealed_case_dir.mkdir(parents=True, exist_ok=True)
            sealed_target = ensure_inside(sealed_case_dir, sealed_case_dir / f"{artifact_id}_{job.filename}")
            if not sealed_target.exists():
                # Copy off the event loop: multi-GB files would otherwise block every request.
                await asyncio.to_thread(shutil.copyfile, job.staging_path, sealed_target)
            self._custody(job, "Sealed in evidence store", f"Read-only copy {artifact_id}")

            base_summary = {
                "artifact_id": artifact_id,
                "sha256": job.sha256_digest,
                "file_size": job.total_size_bytes,
                "detected_format": detected_fmt,
                "intake_officer": job.intake_officer,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "chunk_count": len(job.hasher.chunk_manifest),
            }

            # Stage 6: Content Extracted via tabular streaming + FormatParserRegistry + TRACE OCR forensics
            job.stage = IngestionStage.STAGE_6_CONTENT_EXTRACTED
            parse_summary: Dict[str, Any] = {
                "parser": None,
                "note": f"No parser for .{detected_fmt} files yet; stored as evidence only.",
            }
            case_dir = ensure_inside(self.derived_dir, self.derived_dir / job.case_id)
            handled_whatsapp = False
            if detected_fmt == "txt":
                def _maybe_whatsapp() -> Optional[Dict[str, Any]]:
                    from app.adapters.whatsapp_parser import looks_like_whatsapp_export, parse_whatsapp_export

                    with open(sealed_target, "r", encoding="utf-8", errors="replace") as fp:
                        head_txt = fp.read(16384)
                    if not looks_like_whatsapp_export(head_txt):
                        return None
                    full_txt = sealed_target.read_text(encoding="utf-8", errors="replace")
                    parsed_wa = parse_whatsapp_export(full_txt, filename=job.filename)
                    return DerivedStore(case_dir).ingest_whatsapp_export(job.job_id, parsed_wa)

                wa_summary = await asyncio.to_thread(_maybe_whatsapp)
                if wa_summary is not None:
                    parse_summary = wa_summary
                    handled_whatsapp = True

            if not handled_whatsapp and detected_fmt in ("csv", "txt", "tsv"):
                headers = await asyncio.to_thread(read_header, sealed_target)
                template = None if job.column_map else self.template_for(headers)
                names = job.column_map or (template["columns"] if template else None)
                columns = None
                if names:
                    columns = columns_from_names(headers, names)
                    base_summary["column_mapping"] = template["name"] if template else "manual"
                elif looks_like_device_log(headers):
                    columns = "device"
                elif not looks_like_bank_statement(",".join(headers)):
                    job.stage = IngestionStage.NEEDS_MAPPING
                    job.analytics_summary = {
                        **base_summary,
                        "detected_headers": headers[:60],
                        "sample_rows": await asyncio.to_thread(read_sample_rows, sealed_target),
                        "note": "Columns not recognised. Map the date and amount columns to continue.",
                    }
                    return
                if columns == "device":  # CDR / IPDR / bank login log → device_events
                    parse_summary = await asyncio.to_thread(ingest_device_csv, case_dir, job.job_id, sealed_target)
                else:
                    job.processing = {"step": "WAITING", "note": "Waiting for another file in this case to finish"}
                    started = [0.0]

                    def progress(rows: int, done: int) -> None:  # runs in the worker thread
                        now = time.time()
                        if not started[0]:
                            started[0] = now
                        elapsed = max(now - started[0], 1e-6)
                        total = max(job.total_size_bytes, 1)
                        rate = done / elapsed
                        job.processing = {
                            "step": "READING_ROWS",
                            "rows": rows,
                            "rows_per_sec": int(rows / elapsed) if rows else 0,
                            "bytes_done": min(done, total),
                            "bytes_total": total,
                            "pct": round(min(99.0, 100 * done / total), 1),
                            "eta_seconds": round((total - done) / rate, 1) if rate > 0 and done else None,
                            "elapsed_seconds": round(elapsed, 1),
                        }

                    parse_summary = await asyncio.to_thread(
                        DerivedStore(case_dir).ingest_bank_csv, job.job_id, sealed_target, columns, progress)
                    read = parse_summary.get("rows_read", 0)
                    job.processing = {**(job.processing or {}), "step": "FINDING_NETWORKS", "rows": read, "pct": 99.0,
                                      "eta_seconds": None}
                    try:  # warm the networks cache so the review board opens instantly; never fails the upload
                        from app.services.ingestion.networks import case_networks  # local: networks imports this layer

                        await asyncio.to_thread(case_networks, self.derived_dir, job.case_id)
                    except Exception:
                        logger.exception("Network warm-up failed for %s", job.case_id)
                    job.processing = {**job.processing, "step": "DONE", "pct": 100.0}
            elif detected_fmt in ("png", "jpeg", "webp", "tiff", "bmp", "gif"):
                def _run_image_forensics() -> Dict[str, Any]:
                    from app.adapters.format_parser_registry import FormatParserRegistry
                    from app.adapters.trace_payment_forensics import TracePaymentForensics

                    parsed = FormatParserRegistry.get_instance().parse_file(sealed_target)
                    img_bytes = sealed_target.read_bytes()
                    exam = TracePaymentForensics().examine_payment_screenshot(
                        img_bytes, filename=job.filename, artifact_id=artifact_id, case_id=job.case_id
                    )
                    job_names = {j.job_id: j.filename for j in self.list_jobs({job.case_id})}
                    saved = DerivedStore(case_dir).save_receipt_forensics(
                        job.job_id, artifact_id, job.filename, exam, job_names=job_names
                    )
                    fields = saved["extracted_fields"]
                    ident_counts: Dict[str, int] = {}
                    if fields.get("vpa"):
                        ident_counts["vpa"] = 1
                    if fields.get("utr_rrn"):
                        ident_counts["utr"] = 1
                    return {
                        "parser": "payment_receipt",
                        "format": "IMAGE",
                        "parser_status": parsed.get("status", "PARSED"),
                        "dimensions": parsed.get("dimensions"),
                        "exif_present": (exam.get("metadata_analysis") or {}).get("exif_present", False),
                        "ocr_token_count": (exam.get("ocr_analysis") or {}).get("token_count", 0),
                        "ocr_engine": (exam.get("ocr_analysis") or {}).get("engine"),
                        "extracted_fields": {k: v for k, v in fields.items() if k not in ("field_provenance", "ambiguities")},
                        "composite_anomaly_score": saved["composite_anomaly_score"],
                        "preliminary_assessment": saved["preliminary_assessment"],
                        "reconciliation": saved["reconciliation"],
                        "identifiers_by_kind": ident_counts,
                    }

                parse_summary = await asyncio.to_thread(_run_image_forensics)
            elif detected_fmt == "pdf":
                def _run_pdf_forensics() -> Dict[str, Any]:
                    from app.adapters.format_parser_registry import FormatParserRegistry
                    from app.adapters.trace_payment_forensics import TracePaymentForensics

                    parsed = FormatParserRegistry.get_instance().parse_file(sealed_target)
                    text_preview = parsed.get("extracted_text_preview") or ""
                    out: Dict[str, Any] = {
                        "parser": parsed.get("parser", "pdf_forensic_parser"),
                        "parser_status": parsed.get("status", "PARSED"),
                        "format": "PDF",
                        "page_count": parsed.get("page_count", 0),
                        "total_extracted_characters": parsed.get("total_extracted_characters", 0),
                        "metadata": parsed.get("metadata", {}),
                    }
                    # If PDF is scanned/image-only or contains payment receipt cues, run OCR & reconciliation
                    has_payment_cues = any(
                        kw in text_preview.lower()
                        for kw in ("upi", "utr", "rrn", "paid to", "payment", "₹", "rs.", "inr", "@")
                    )
                    exam: Optional[Dict[str, Any]] = None
                    if parsed.get("total_extracted_characters", 0) < 40:
                        try:
                            import pypdfium2 as pdfium

                            pdf_doc = pdfium.PdfDocument(str(sealed_target))
                            if len(pdf_doc) > 0:
                                bmp = pdf_doc[0].render(scale=2.0)
                                pil_page = bmp.to_pil()
                                buf = io.BytesIO()
                                pil_page.save(buf, format="PNG")
                                exam = TracePaymentForensics().examine_payment_screenshot(
                                    buf.getvalue(), filename=job.filename, artifact_id=artifact_id, case_id=job.case_id
                                )
                        except Exception as pdf_img_exc:
                            logger.debug("PDF page render OCR skipped for %s: %s", job.filename, pdf_img_exc)
                    elif has_payment_cues:
                        # Extract payment fields from PDF text without running image-only ELA
                        import re as _re
                        amt_m = _re.search(r"(?:₹|Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)", text_preview)
                        rrn_m = _re.search(r"\b(\d{12})\b", text_preview)
                        vpa_m = _re.search(r"\b([a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32})\b", text_preview)
                        d_m = _re.search(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", text_preview)
                        t_m = _re.search(r"\b(\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?)\b", text_preview, _re.IGNORECASE)
                        fields = {
                            "amount": float(amt_m.group(1).replace(",", "")) if amt_m else None,
                            "currency": "INR",
                            "utr_rrn": rrn_m.group(1) if rrn_m else None,
                            "vpa": vpa_m.group(1).lower() if vpa_m else None,
                            "transaction_date": d_m.group(1) if d_m else None,
                            "transaction_time": t_m.group(1) if t_m else None,
                            "upi_app": None,
                            "status": "UNKNOWN",
                        }
                        if any(fields.get(k) is not None for k in ("amount", "utr_rrn", "vpa")):
                            exam = {
                                "artifact_id": artifact_id,
                                "filename": job.filename,
                                "case_id": job.case_id,
                                "composite_anomaly_score": 0.0,
                                "preliminary_assessment": "PDF text extracted — needs examiner review",
                                "metadata_analysis": {"format": "PDF", "exif_present": False, "pdf_metadata": parsed.get("metadata", {})},
                                "ocr_analysis": {
                                    "engine": "pypdf",
                                    "extracted_fields": fields,
                                    "token_count": len(text_preview.split()),
                                    "bounding_polygons": [],
                                    "raw_text_sample": text_preview[:1000],
                                },
                                "manipulation_analysis": {
                                    "composite_anomaly_score": 0.0,
                                    "classification": "PDF text extracted — needs examiner review",
                                    "ela_preview_base64": "",
                                    "resampling_edge_score": 0.0,
                                },
                            }
                    if exam is not None:
                        job_names = {j.job_id: j.filename for j in self.list_jobs({job.case_id})}
                        saved = DerivedStore(case_dir).save_receipt_forensics(
                            job.job_id, artifact_id, job.filename, exam, job_names=job_names
                        )
                        out["parser"] = "pdf_forensics"
                        out["extracted_fields"] = {
                            k: v for k, v in saved["extracted_fields"].items() if k not in ("field_provenance", "ambiguities")
                        }
                        out["composite_anomaly_score"] = saved["composite_anomaly_score"]
                        out["preliminary_assessment"] = saved["preliminary_assessment"]
                        out["reconciliation"] = saved["reconciliation"]
                    return out

                parse_summary = await asyncio.to_thread(_run_pdf_forensics)
            elif not handled_whatsapp:
                def _run_registry_parser() -> Dict[str, Any]:
                    from app.adapters.format_parser_registry import FormatParserRegistry

                    parsed = FormatParserRegistry.get_instance().parse_file(sealed_target)
                    p_status = parsed.get("status", "PARSED")
                    summary_out: Dict[str, Any] = {
                        "parser": parsed.get("parser"),
                        "parser_status": p_status,
                        "format": parsed.get("format"),
                        "warnings": parsed.get("warnings", []),
                    }
                    if p_status == "PARSER_NOT_AVAILABLE":
                        summary_out["note"] = parsed.get("message") or f"No semantic parser for .{detected_fmt}; stored as evidence."
                    for k in ("total_rows", "headers", "formulas_detected", "sheet_names",
                              "entry_count", "total_uncompressed_bytes", "has_path_traversal",
                              "character_count", "media_type", "duration_seconds", "sample_rate_hz"):
                        if k in parsed:
                            summary_out[k] = parsed[k]
                    return summary_out

                parse_summary = await asyncio.to_thread(_run_registry_parser)

            # Stage 7: Content Indexed (rows + identifiers are in the case's derived store)
            job.stage = IngestionStage.STAGE_7_CONTENT_INDEXED

            # Stage 8: Analytics summary from real counts
            job.stage = IngestionStage.STAGE_8_ANALYTICS_COMPLETED
            job.analytics_summary = {**base_summary, **parse_summary}

            # Stage 9: Results Validated. Every non-empty data row is either accepted or rejected.
            job.stage = IngestionStage.STAGE_9_RESULTS_VALIDATED
            if parse_summary.get("parser") in ("bank_upi", "device_log"):
                accounted = parse_summary["rows_accepted"] + parse_summary["rows_rejected"]
                if accounted != parse_summary["rows_read"]:
                    raise RuntimeError(f"Row count mismatch: read {parse_summary['rows_read']}, accounted {accounted}.")
                job.analytics_summary["row_accounting"] = "ALL_ROWS_ACCOUNTED"

            # Stage 10: Evidence Available
            job.stage = IngestionStage.STAGE_10_EVIDENCE_AVAILABLE
            from app.services.ingestion.projects_store import ProjectsStore  # local: projects_store is a leaf module

            store_meta = ProjectsStore(self.base_dir)
            if store_meta.case_meta(job.case_id)["lifecycle"] in ("INTAKE", "PROCESSING"):
                store_meta.set_case(job.case_id, lifecycle="INVESTIGATING")
            logger.info(f"Ingestion job {job.job_id} successfully reached STAGE_10_EVIDENCE_AVAILABLE.")

        except Exception as e:
            job.error_message = f"Pipeline execution failure: {str(e)}"
            logger.exception(f"Ingestion job {job.job_id} encountered unexpected failure: {e}")
        finally:
            self._save(job)
            self._custody(job, *self._outcome(job))

    def find_duplicate(self, job: IngestionJob) -> Optional[IngestionJob]:
        """An earlier, still-valid job with the same SHA-256 (any case)."""
        for other in self.jobs.values():
            if (other.job_id != job.job_id and other.sha256_digest == job.sha256_digest and not other.is_cancelled
                    and other.stage not in (IngestionStage.REJECTED, IngestionStage.DUPLICATE)):
                return other
        return None

    def list_jobs(self, case_ids: Optional[set] = None) -> List[IngestionJob]:
        jobs = [j for j in self.jobs.values() if case_ids is None or j.case_id in case_ids]
        return sorted(jobs, key=lambda j: j.start_time, reverse=True)

    # Column mapping & per-bank templates
    def templates(self) -> List[Dict[str, Any]]:
        with closing(sqlite3.connect(self._db_path)) as db:
            rows = db.execute("SELECT name, headers_json, columns_json FROM mapping_templates ORDER BY name").fetchall()
        return [{"name": n, "headers": json.loads(h), "columns": json.loads(c)} for n, h, c in rows]

    def template_for(self, headers: List[str]) -> Optional[Dict[str, Any]]:
        key = [h.strip().lower() for h in headers]
        return next((t for t in self.templates() if [h.strip().lower() for h in t["headers"]] == key), None)

    async def apply_mapping(self, job_id: str, columns: Dict[str, str], template_name: Optional[str] = None,
                            actor: Optional[str] = None) -> Dict[str, Any]:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(f"Job '{job_id}' not found.")
        if job.stage != IngestionStage.NEEDS_MAPPING or job.is_cancelled:
            raise ValueError("Only a file waiting for column mapping can be mapped.")
        headers = job.analytics_summary.get("detected_headers") or []
        names = {k: v for k, v in columns.items() if v}
        columns_from_names(headers, names)  # raises ValueError with a plain message
        if template_name and template_name.strip():
            with closing(sqlite3.connect(self._db_path)) as db:
                db.execute("INSERT OR REPLACE INTO mapping_templates VALUES (?,?,?)",
                           (template_name.strip()[:80], json.dumps(headers), json.dumps(names)))
                db.commit()
        job.column_map = names
        job.stage = IngestionStage.STAGE_2_UPLOAD_COMPLETED
        self._save(job)
        self._custody(job, "Columns mapped", ", ".join(f"{k} = {v}" for k, v in names.items()), actor=actor)
        if job.operational_class == OperationalClass.SMALL:
            await self._process_admitted_pipeline(job)
        else:
            self._spawn_pipeline(job)
        return job.to_dict()

    def pause_job(self, job_id: str) -> Dict[str, Any]:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(f"Job '{job_id}' not found.")
        job.is_paused = True
        return job.to_dict()

    def resume_job(self, job_id: str) -> Dict[str, Any]:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(f"Job '{job_id}' not found.")
        job.is_paused = False
        job.retry_count += 1
        upload_done = job.bytes_uploaded >= job.total_size_bytes and job.stage != IngestionStage.STAGE_1_FILE_RECEIVED
        if upload_done and not job.is_cancelled and job.stage.value not in self._TERMINAL:
            self._spawn_pipeline(job)  # re-run processing interrupted by a restart or failure
        return job.to_dict()

    def cancel_job(self, job_id: str) -> Dict[str, Any]:
        job = self.jobs.get(job_id)
        if not job:
            raise KeyError(f"Job '{job_id}' not found.")
        job.is_cancelled = True
        if job.staging_path and job.staging_path.exists():
            job.staging_path.unlink()
        self._save(job)
        self._custody(job, "Upload cancelled", job.filename, actor=job.intake_officer)
        return job.to_dict()

