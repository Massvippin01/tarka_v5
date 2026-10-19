"""Live Provider End-to-End Synthesis Smoke Test for Sarvam Bulbul.

Mandates:
1. Skips with a clear reason if SARVAM_API_KEY is missing or RUN_LIVE_SARVAM_TEST is not enabled.
2. Never consumes API credits during ordinary unit/regression tests.
3. Validates real WAV audio response (RIFF header, non-empty base64, sample format).
4. Validates that diagnostic telemetry captures the call without credential leakage.
5. Keeps live provider testing isolated from mocked unit tests.
"""

import base64
import os
import pytest

from app.core.config import settings
from app.intelligence.sarvam_voice_service import SarvamVoiceService


def _is_live_test_enabled() -> bool:
    has_key = bool(settings.SARVAM_API_KEY or os.getenv("SARVAM_API_KEY"))
    run_flag = os.getenv("RUN_LIVE_SARVAM_TEST", "").lower() in ("1", "true", "yes")
    return has_key and run_flag


@pytest.mark.skipif(
    not _is_live_test_enabled(),
    reason="Live Sarvam smoke test requires SARVAM_API_KEY and RUN_LIVE_SARVAM_TEST=1 to prevent credit consumption in CI.",
)
def test_live_sarvam_bulbul_synthesis_smoke():
    """Validates real neural audio synthesis against official Sarvam Bulbul endpoint."""
    service = SarvamVoiceService.get_instance()
    assert service.effective_api_key, "API key must be resolved"

    test_phrase = "TARKA digital forensics platform operational. Evidence verification in progress."
    
    result = service.synthesize_speech(
        text=test_phrase,
        target_language_code="en-IN",
        speaker="priya_enhi_conversational", # Test alias mapping
    )

    assert result["tts_unavailable"] is False, f"TTS reported unavailable: {result.get('error_message')}"
    assert result["provider"] == "SARVAM_CLOUD_BULBUL"
    assert result["speaker"] == "simran_enhi_companion" # Confirmed mapped to Bulbul v4 catalog
    
    audio_b64 = result.get("audio_base64")
    assert audio_b64 is not None and len(audio_b64) > 1000, "Expected non-empty base64 audio response"
    
    # Validate audio decoding and WAV RIFF header
    audio_bytes = base64.b64decode(audio_b64)
    assert len(audio_bytes) > 5000, f"Expected substantial audio byte length, got {len(audio_bytes)}"
    assert audio_bytes.startswith(b"RIFF"), "Generated audio must have standard RIFF WAV header"
    assert b"WAVE" in audio_bytes[:16], "Audio header must contain WAVE marker"

    # Validate diagnostic state
    diag = service.get_last_diagnostic()
    assert diag["last_synthesis_result"] == "success"
    assert diag["http_status"] == 200
    assert diag["error_category"] is None
    assert diag["audio_returned_and_decoded"] is True
    assert diag["configured_speaker"] == "simran_enhi_companion"
    assert "api_key" not in diag, "Diagnostic must never leak credentials"


def test_offline_diagnostic_unconfigured(monkeypatch):
    """Validates truthful fail-closed offline diagnostic when credentials are absent."""
    service = SarvamVoiceService.get_instance()
    monkeypatch.setattr(SarvamVoiceService, "effective_api_key", property(lambda self: ""))
    res = service.synthesize_speech(text="Test offline sentence", target_language_code="en-IN")
    assert res["tts_unavailable"] is True
    assert res["audio_base64"] is None
    assert res["error_category"] in ("UNCONFIGURED", "TEST_BYPASS")
    assert "unavailable" in res["note"].lower()
    diag = service.get_last_diagnostic()
    assert diag["api_configured"] is False
    assert diag["last_synthesis_result"] == "failure"
    assert diag["audio_returned_and_decoded"] is False
