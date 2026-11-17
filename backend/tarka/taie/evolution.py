"""
TARKA SUTRAM 2026 — PROBLEM STATEMENT PS04
TAIE INTEGRATION FOUNDATION: SCHEMA EVOLUTION ANALYZER

Detects breaking changes, field removals, type mutations, and backward/forward
compatibility across institutional schema versions.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field


class EvolutionReport(BaseModel):
    old_version: str
    new_version: str
    is_backward_compatible: bool
    breaking_changes: List[str] = Field(default_factory=list)
    non_breaking_changes: List[str] = Field(default_factory=list)
    added_fields: List[str] = Field(default_factory=list)
    removed_fields: List[str] = Field(default_factory=list)
    modified_types: List[str] = Field(default_factory=list)


class SchemaEvolutionAnalyzer:
    """
    Evaluates schema modifications to prevent runtime parsing breakages.
    """

    @classmethod
    def compare_schema_specs(
        cls,
        old_spec: Dict[str, Any],
        new_spec: Dict[str, Any],
        old_version: str = "1.0.0",
        new_version: str = "1.1.0"
    ) -> EvolutionReport:
        """
        Compare two schema field specifications.
        Each spec dictionary maps field_name -> {"type": str, "required": bool}.
        """
        breaking: List[str] = []
        non_breaking: List[str] = []
        added: List[str] = []
        removed: List[str] = []
        type_changes: List[str] = []

        old_fields = set(old_spec.keys())
        new_fields = set(new_spec.keys())

        # Check removed fields
        for f in (old_fields - new_fields):
            was_required = old_spec[f].get("required", False)
            removed.append(f)
            if was_required:
                breaking.append(f"Required field '{f}' was removed in {new_version}.")
            else:
                non_breaking.append(f"Optional field '{f}' was removed in {new_version}.")

        # Check added fields
        for f in (new_fields - old_fields):
            is_required = new_spec[f].get("required", False)
            added.append(f)
            if is_required:
                breaking.append(f"New mandatory field '{f}' added without default in {new_version}.")
            else:
                non_breaking.append(f"Optional field '{f}' added in {new_version}.")

        # Check common fields for type mutations
        for f in (old_fields & new_fields):
            old_type = old_spec[f].get("type")
            new_type = new_spec[f].get("type")
            if old_type and new_type and old_type != new_type:
                type_changes.append(f"{f}: {old_type} -> {new_type}")
                breaking.append(f"Field '{f}' changed type from '{old_type}' to '{new_type}'.")

        is_backward_compatible = (len(breaking) == 0)

        return EvolutionReport(
            old_version=old_version,
            new_version=new_version,
            is_backward_compatible=is_backward_compatible,
            breaking_changes=breaking,
            non_breaking_changes=non_breaking,
            added_fields=added,
            removed_fields=removed,
            modified_types=type_changes
        )

