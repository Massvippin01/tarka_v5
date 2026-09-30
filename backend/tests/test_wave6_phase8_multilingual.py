from __future__ import annotations

import json
from pathlib import Path
import pytest

from app.domain.command import CommandSource, UIActionType
from app.services.interaction.intent_normalizer import IntentNormalizer
from app.services.interaction.multilingual_normalizer import (
    LanguageMode,
    LinguisticRegister,
    MultilingualNormalizer,
    ScriptType,
)


@pytest.fixture
def benchmark_data():
    fixture_path = Path(__file__).parent / "fixtures" / "multilingual_benchmark.json"
    with open(fixture_path, "r", encoding="utf-8") as f:
        return json.load(f)


@pytest.fixture
def normalizer() -> MultilingualNormalizer:
    return MultilingualNormalizer.get_instance()


@pytest.fixture
def intent_normalizer() -> IntentNormalizer:
    return IntentNormalizer.get_instance()


# ────────────────────────────────────────────────────────────────────
# 1. BENCHMARK SUITE EXECUTION
# ────────────────────────────────────────────────────────────────────

def test_multilingual_benchmark_coverage(normalizer: MultilingualNormalizer, benchmark_data):
    """
    Execute all cases in multilingual_benchmark.json and verify:
    - Language identification
    - Script detection
    - Semantic normalization to canonical intent
    - Ambiguity detection
    - Forensic token preservation
    """
    test_cases = benchmark_data["test_cases"]
    assert len(test_cases) >= 25, "Benchmark dataset must contain comprehensive coverage"

    for tc in test_cases:
        tc_id = tc["id"]
        utterance = tc["utterance"]
        expected_intent = tc["expected_intent"]
        expected_ambiguity = tc["expected_ambiguity"]
        expected_lang = tc["language_mode"]
        expected_script = tc["script"]

        analysis = normalizer.analyze_and_normalize(utterance)

        # Check script
        assert analysis.script.value == expected_script, f"[{tc_id}] Expected script {expected_script}, got {analysis.script.value}"

        # Check language mode
        assert analysis.language_mode.value == expected_lang, f"[{tc_id}] Expected lang {expected_lang}, got {analysis.language_mode.value}"

        # Check ambiguity
        assert analysis.is_ambiguous == expected_ambiguity, f"[{tc_id}] Ambiguity mismatch: expected {expected_ambiguity}, got {analysis.is_ambiguous}"

        # Check canonical intent
        assert analysis.canonical_intent == expected_intent, f"[{tc_id}] Intent mismatch for '{utterance}': expected {expected_intent}, got {analysis.canonical_intent}"

        # Check token preservation if specified
        if "preserved_identifiers" in tc:
            for id_type, expected_val in tc["preserved_identifiers"].items():
                preserved_ids = analysis.preserved_tokens.get("identifiers", {})
                assert preserved_ids.get(id_type) == expected_val, f"[{tc_id}] Failed to preserve identifier {id_type}={expected_val}"

        # If ambiguous, check clarification prompt localization
        if expected_ambiguity:
            assert analysis.clarification_prompt is not None, f"[{tc_id}] Missing clarification prompt for ambiguous query"
            if expected_lang == "ta":
                assert any(ord(c) >= 0x0B80 and ord(c) <= 0x0BFF for c in analysis.clarification_prompt)


# ────────────────────────────────────────────────────────────────────
# 2. FORENSIC TOKEN PRESERVATION & REGISTER DETECTION
# ────────────────────────────────────────────────────────────────────

def test_statutory_reference_preservation(normalizer: MultilingualNormalizer):
    """Forensic statute tokens (BNSS 94, CrPC 91, IT Act 69) must be preserved exactly."""
    query = "Issue summons for P001 under Section 94 BNSS immediately"
    analysis = normalizer.analyze_and_normalize(query)

    assert analysis.register == LinguisticRegister.FORMAL_LEGAL
    statutes = analysis.preserved_tokens.get("statutory_references", [])
    assert any("Section 94 BNSS" in s or "94" in s for s in statutes)
    assert analysis.preserved_tokens.get("identifiers", {}).get("entity") == "P001"


def test_timestamp_preservation(normalizer: MultilingualNormalizer):
    """Forensic timestamps must be preserved for chronological analysis."""
    query = "Show timeline from 2026-09-29 to 2026-09-30"
    analysis = normalizer.analyze_and_normalize(query)

    timestamps = analysis.preserved_tokens.get("timestamps", [])
    assert len(timestamps) >= 2
    assert "2026-09-29" in timestamps
    assert "2026-09-30" in timestamps


# ────────────────────────────────────────────────────────────────────
# 3. SEMANTIC INTENT CONVERGENCE ACROSS MODALITIES
# ────────────────────────────────────────────────────────────────────

def test_tamil_intent_normalizer_convergence(intent_normalizer: IntentNormalizer):
    """Tamil text/speech turns must produce identical InvestigationIntent to English."""
    # Tamil script
    intent_ta = intent_normalizer.from_text_query("முரண்பாடுகளை காட்டு")
    assert intent_ta.intent_name == "OPEN_CONTRADICTIONS"
    assert intent_ta.language == "ta"

    # Tanglish
    intent_tg = intent_normalizer.from_text_query("contradiction-a kaatu")
    assert intent_tg.intent_name == "OPEN_CONTRADICTIONS"
    assert intent_tg.language in ("ta-Latn", "code-switched")

    # English
    intent_en = intent_normalizer.from_text_query("Show contradictions")
    assert intent_en.intent_name == "OPEN_CONTRADICTIONS"

    # Semantic Equivalence Check
    assert IntentNormalizer.are_equivalent(intent_ta, intent_en)
    assert IntentNormalizer.are_equivalent(intent_tg, intent_en)


def test_ambiguity_no_silent_guessing(intent_normalizer: IntentNormalizer):
    """Ambiguous queries must NEVER silently guess actions."""
    ambig_inputs = ["do something", "adha paaru", "check it", "view that"]

    for inp in ambig_inputs:
        intent = intent_normalizer.from_text_query(inp)
        assert intent.ambiguity is True, f"Failed to mark '{inp}' as ambiguous"
        assert intent.clarification_prompt is not None
        assert intent.confidence <= 0.3
