"""Forensic Terminology Compliance Test.

Enforces Hard Forensic Rule (4):
"scope the banned-term rule to statements about evidence, and add a test scanning all UI strings and templates"

Banned terms in statements about evidence or actors:
- "culprit"
- "guilty"
- "court-ready" (must be "supports Section 63 review")
- "proves identity"
- "proof of identity"
- "forged"
- "tampered" (except in technical references to system integrity check / tamper-detection demo)
"""

from __future__ import annotations

import re
from pathlib import Path
import pytest

BANNED_EVIDENCE_PATTERNS = [
    (re.compile(r"\bculprit\b", re.IGNORECASE), "culprit"),
    (re.compile(r"\bguilty\b", re.IGNORECASE), "guilty"),
    (re.compile(r"\bcourt[\s\-_]ready\b", re.IGNORECASE), "court-ready"),
    (re.compile(r"\bproves\s+identity\b", re.IGNORECASE), "proves identity"),
    (re.compile(r"\bproof\s+of\s+identity\b", re.IGNORECASE), "proof of identity"),
]

# Patterns for claims about evidence being forged or tampered
EVIDENCE_VERDICT_PATTERNS = [
    (re.compile(r"\b(evidence|record|fact|file|image|photo|alibi)\s+is\s+(forged|tampered|fake)\b", re.IGNORECASE), "evidence is forged/tampered"),
    (re.compile(r"\bforged\s+(evidence|record|fact|file|image|photo)\b", re.IGNORECASE), "forged evidence"),
]

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
WEB_SRC = WORKSPACE_ROOT / "web" / "src"
API_SRC = WORKSPACE_ROOT / "tarka" / "api"


def test_ui_strings_and_templates_contain_no_banned_terms():
    """Scans all UI components, pages, and templates in web/src for banned terms."""
    assert WEB_SRC.exists(), f"Web src directory does not exist: {WEB_SRC}"

    violations = []
    for filepath in WEB_SRC.rglob("*"):
        if filepath.suffix not in [".tsx", ".ts", ".jsx", ".js", ".html"]:
            continue

        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception:
            continue

        lines = content.splitlines()
        for idx, line in enumerate(lines, start=1):
            # Skip code comments that explicitly discuss banned terms or rule definitions
            clean_line = line.strip()
            if clean_line.startswith("//") or clean_line.startswith("/*") or clean_line.startswith("*"):
                if "banned" in clean_line.lower() or "prohibited" in clean_line.lower():
                    continue

            for pattern, name in BANNED_EVIDENCE_PATTERNS:
                if pattern.search(line):
                    violations.append(
                        f"{filepath.relative_to(WORKSPACE_ROOT)}:{idx}: Found banned term '{name}' in: {line.strip()}"
                    )

            for pattern, name in EVIDENCE_VERDICT_PATTERNS:
                if pattern.search(line):
                    violations.append(
                        f"{filepath.relative_to(WORKSPACE_ROOT)}:{idx}: Found prohibited claim '{name}' in: {line.strip()}"
                    )

    assert not violations, "Banned terminology violations detected in UI:\n" + "\n".join(violations)


def test_api_schemas_and_templates_contain_no_banned_terms():
    """Scans all API schemas and server user-facing strings for banned terms."""
    assert API_SRC.exists(), f"API src directory does not exist: {API_SRC}"

    violations = []
    for filepath in API_SRC.rglob("*.py"):
        try:
            content = filepath.read_text(encoding="utf-8")
        except Exception:
            continue

        lines = content.splitlines()
        for idx, line in enumerate(lines, start=1):
            clean_line = line.strip()
            # Skip comments mentioning banned words
            if clean_line.startswith("#") and ("banned" in clean_line.lower() or "prohibited" in clean_line.lower()):
                continue

            for pattern, name in BANNED_EVIDENCE_PATTERNS:
                if pattern.search(line):
                    violations.append(
                        f"{filepath.relative_to(WORKSPACE_ROOT)}:{idx}: Found banned term '{name}' in: {line.strip()}"
                    )

            for pattern, name in EVIDENCE_VERDICT_PATTERNS:
                if pattern.search(line):
                    violations.append(
                        f"{filepath.relative_to(WORKSPACE_ROOT)}:{idx}: Found prohibited claim '{name}' in: {line.strip()}"
                    )

    assert not violations, "Banned terminology violations detected in API:\n" + "\n".join(violations)
