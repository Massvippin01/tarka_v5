"""Base parser abstractions and rejection loggers for TARKA evidence ingestion.

Hard Forensic Invariant:
Never silently drop rows. If a record cannot be parsed or lacks mandatory temporal bounds,
it is logged in 'rejected_rows' with its exact source line number and technical rationale.
"""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional
try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
        def model_dump(self, mode: str = "python") -> Dict[str, Any]:
            res = {}
            for k, v in self.__dict__.items():
                if hasattr(v, "model_dump"):
                    res[k] = v.model_dump()
                elif isinstance(v, list):
                    res[k] = [item.model_dump() if hasattr(item, "model_dump") else item for item in v]
                else:
                    res[k] = v
            return res

    def Field(default=None, default_factory=None, **kwargs):  # type: ignore
        if default_factory is not None:
            return default_factory()
        return default

# Centralized Forensic Parser and Normalization Version Registries
PARSER_VERSIONS: Dict[str, str] = {
    "bank_upi": "1.0.0",
    "cdr": "1.0.0",
    "whatsapp": "1.0.0",
    "exif_triage": "1.0.0",
}

NORMALIZATION_VERSIONS: Dict[str, str] = {
    "canonical_fact_schema": "2.0.0",
    "timezone_provenance": "1.0.0",
    "financial_amount": "1.0.0",
    "identifier_rrn_vpa_phone": "1.0.0",
    "geographic_region": "1.0.0",
}

from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from tarka.core.models import Fact


def get_parser_version(parser_name: str) -> str:
    """Returns the registered version string for a given parser."""
    return PARSER_VERSIONS.get(parser_name, "1.0.0")


def get_normalization_version(norm_name: str) -> str:
    """Returns the registered version string for a given normalization domain."""
    return NORMALIZATION_VERSIONS.get(norm_name, "1.0.0")


def list_registered_parsers() -> Dict[str, str]:
    """Returns a copy of the centralized parser version registry."""
    return dict(PARSER_VERSIONS)


def list_registered_normalizations() -> Dict[str, str]:
    """Returns a copy of the centralized normalization version registry."""
    return dict(NORMALIZATION_VERSIONS)


def register_parser_version(parser_name: str, version: str) -> None:
    """Registers or updates a parser version in the centralized registry."""
    PARSER_VERSIONS[parser_name] = version


def register_normalization_version(norm_name: str, version: str) -> None:
    """Registers or updates a normalization version in the centralized registry."""
    NORMALIZATION_VERSIONS[norm_name] = version


class RejectedRow(BaseModel):
    """Auditable log entry for any ingested record that could not be parsed into a Fact."""
    line_number: int = Field(description="1-based source line or record index")
    raw_content: str = Field(description="Raw string content of the unparseable line")
    reason: str = Field(description="Specific technical reason for parser rejection")


class ParseResult(BaseModel):
    """Standardized output emitted by all evidence parsers."""
    source_file: str = Field(description="Identifier or filename of raw evidence artifact")
    source_sha256: str = Field(description="Cryptographic SHA-256 digest of raw source file")
    facts: List[Fact] = Field(default_factory=list, description="Extracted canonical Facts")
    rejected_rows: List[RejectedRow] = Field(
        default_factory=list,
        description="Records that failed validation with exact line numbers"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Audit warnings (e.g. date format ambiguity, unmapped cell towers)"
    )
    total_lines_read: int = Field(description="Total lines or records scanned in the source artifact")
    is_date_ambiguous: bool = Field(
        default=False,
        description="True if date format across entire file could not be definitively resolved"
    )


def compute_sha256_for_file(file_path: str | Path) -> str:
    """Computes SHA-256 hash of a local file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def compute_sha256_for_content(content: str | bytes) -> str:
    """Computes SHA-256 hash of a text or byte string."""
    raw = content.encode("utf-8") if isinstance(content, str) else content
    return hashlib.sha256(raw).hexdigest()
