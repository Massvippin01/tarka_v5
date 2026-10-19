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


# ─────────────────────────────────────────────────────────────────────────────
# 1. BENCHMARK SUITE EXECUTION
# ─────────────────────────────────────────────────────────────────────────────

def test_multilingual_benchmark_coverage(normalizer: MultilingualNormalizer, benchmark_data):
    """
    Execute all cases in multilingual_benchmark.json and verify:
    - utterance
    - language & language mode
    - script detection
    - expected intent
    - expected action
    - expected ambiguity
    - expected entities / preserved identifiers
    """
    test_cases = benchmark_data["test_cases"]
    assert len(test_cases) >= 25, "Benchmark dataset must contain comprehensive coverage"

    for tc in test_cases:
        tc_id = tc["id"]
        utterance = tc["utterance"]
        expected_intent = tc["expected_intent"]
        expected_action = tc["expected_action"]
        expected_ambiguity = tc["expected_ambiguity"]
        expected_lang = tc.get("language_mode")
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

        # Check canonical action
        assert analysis.canonical_action == expected_action, f"[{tc_id}] Action mismatch for '{utterance}': expected {expected_action}, got {analysis.canonical_action}"

        # Check expected entities / preserved identifiers
        expected_entities = tc.get("expected_entities") or tc.get("preserved_identifiers", {})
        if expected_entities:
            preserved_ids = analysis.preserved_tokens.get("identifiers", {})
            for id_type, expected_val in expected_entities.items():
                assert preserved_ids.get(id_type) == expected_val, f"[{tc_id}] Failed to preserve identifier {id_type}={expected_val}"

        # If ambiguous, check clarification prompt localization
        if expected_ambiguity:
            assert analysis.clarification_prompt is not None, f"[{tc_id}] Missing clarification prompt for ambiguous query"
            if expected_lang == "ta":
                assert any(ord(c) >= 0x0B80 and ord(c) <= 0x0BFF for c in analysis.clarification_prompt)


# ─────────────────────────────────────────────────────────────────────────────
# 2. FORENSIC TOKEN PRESERVATION & REGISTER DETECTION
# ─────────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────────
# 3. SEMANTIC INTENT CONVERGENCE ACROSS MODALITIES
# ─────────────────────────────────────────────────────────────────────────────

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
    ambig_inputs = ["do something", "adha paaru", "check it", "view that", "kaatu", "kamikunga"]

    for inp in ambig_inputs:
        intent = intent_normalizer.from_text_query(inp)
        assert intent.ambiguity is True, f"Failed to mark '{inp}' as ambiguous"
        assert intent.clarification_prompt is not None
        assert intent.confidence <= 0.3


# ─────────────────────────────────────────────────────────────────────────────
# 4. TANGLISH SEMANTIC VARIANTS & CONFIDENCE
# ─────────────────────────────────────────────────────────────────────────────

def test_tanglish_semantic_variants_confidence(normalizer: MultilingualNormalizer):
    """
    Support natural variation rather than brittle phrases.
    Normalize semantic variants such as kaatu, kaattu, kamikka, kamikunga
    ONLY when sufficiently confident (i.e. target specified). Standalone variants
    without targets must fail closed into clarification request.
    """
    confident_variants = [
        ("contradiction-a kaatu", "OPEN_CONTRADICTIONS"),
        ("contradiction-a kaattu", "OPEN_CONTRADICTIONS"),
        ("contradiction-a kamikka", "OPEN_CONTRADICTIONS"),
        ("contradiction-a kamikunga", "OPEN_CONTRADICTIONS"),
        ("evidence-a kaatu", "OPEN_EVIDENCE"),
        ("evidence-a kamikunga", "OPEN_EVIDENCE"),
        ("timeline-a kaatu", "OPEN_TIMELINE"),
        ("timeline-a kamikka", "OPEN_TIMELINE"),
        ("P001-a kaatu", "OPEN_ENTITY"),
        ("P001-a kamikunga", "OPEN_ENTITY"),
        ("gaps-a kaatunga", "OPEN_GAPS"),
        ("proof-a kaatu", "OPEN_PROOF"),
    ]

    for utterance, expected_intent in confident_variants:
        analysis = normalizer.analyze_and_normalize(utterance)
        assert analysis.canonical_intent == expected_intent
        assert analysis.confidence >= 0.96
        assert analysis.is_ambiguous is False

    # Standalone variants without targets must ask, never guess
    standalone_variants = ["kaatu", "kaattu", "kamikka", "kamikunga", "paaru", "show", "open"]
    for utterance in standalone_variants:
        analysis = normalizer.analyze_and_normalize(utterance)
        assert analysis.is_ambiguous is True, f"Expected '{utterance}' to be ambiguous"
        assert analysis.confidence <= 0.3
        assert analysis.clarification_prompt is not None


# ─────────────────────────────────────────────────────────────────────────────
# 5. CORE COMMAND VOCABULARY (14 COMMANDS)
# ─────────────────────────────────────────────────────────────────────────────

def test_14_core_commands_vocabulary(normalizer: MultilingualNormalizer):
    """
    Verify complete 14-item Core Command Vocabulary:
    1. open case
    2. continue investigation
    3. show contradictions
    4. show evidence
    5. show timeline
    6. show entity
    7. trace relationship
    8. show gaps
    9. show proof
    10. explain this
    11. go back
    12. summarize
    13. what changed
    14. what is missing
    """
    vocab_tests = [
        ("open case CASE-2026-001", "OPEN_CASE", "OPEN_CASE"),
        ("continue investigation", "OPEN_CASE", "OPEN_CASE"),
        ("show contradictions", "OPEN_CONTRADICTIONS", "OPEN_CONTRADICTIONS"),
        ("show evidence", "OPEN_EVIDENCE", "OPEN_EVIDENCE"),
        ("show timeline", "OPEN_TIMELINE", "OPEN_TIMELINE"),
        ("show entity P001", "OPEN_ENTITY", "OPEN_ENTITY"),
        ("trace relationship", "TRACE_PROVENANCE", "TRACE_PROVENANCE"),
        ("show gaps", "OPEN_GAPS", "OPEN_GAPS"),
        ("show proof", "OPEN_PROOF", "OPEN_PROOF"),
        ("explain this", "SHOW_AGENT_FINDINGS", "SHOW_AGENT_FINDINGS"),
        ("go back", "GO_BACK", "GO_BACK"),
        ("summarize", "SUMMARIZE", "SUMMARIZE"),
        ("what changed", "SHOW_AGENT_FINDINGS", "SHOW_AGENT_FINDINGS"),
        ("what is missing", "OPEN_GAPS", "OPEN_GAPS"),
    ]

    for utterance, expected_intent, expected_action in vocab_tests:
        analysis = normalizer.analyze_and_normalize(utterance)
        assert analysis.canonical_intent == expected_intent, f"Failed for '{utterance}': expected {expected_intent}, got {analysis.canonical_intent}"
        assert analysis.canonical_action == expected_action, f"Failed for '{utterance}': expected {expected_action}, got {analysis.canonical_action}"
        assert analysis.is_ambiguous is False
