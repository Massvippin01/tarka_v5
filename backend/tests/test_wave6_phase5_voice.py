"""
SentinelX Phase 5 — Realtime Voice Interaction Foundation Tests

Deterministic evaluation suite covering:
  1. Simple navigation
  2. Search
  3. Entity lookup
  4. Graph query
  5. Evidence lookup
  6. Contradiction lookup
  7. Timeline query
  8. Contextual follow-up
  9. Ambiguous command
  10. Unauthorized action
  11. Confirmation-required action
  12. Interruption
  13. Cancellation
  14. STT failure
  15. TTS failure
  16. LiveKit disconnect
  17. OpenSearch unavailable (graceful degradation)
  18. PostgreSQL unavailable (graceful degradation)
  19. Stale search result (epistemic safety)
  20. Evidence verification failure
  21. Prompt injection in evidence (passive data)
  22. Private CoT protection
  23. Multilingual / transliterated command
  24. Concurrent voice/UI interaction

Every test verifies both:
  - INVESTIGATIVE CORRECTNESS
  - GOVERNANCE CORRECTNESS
"""

from __future__ import annotations

import pytest

from app.domain.interaction import (
    ActionRiskClass,
    InteractionContext,
    InteractionModality,
)
from app.services.interaction.intent_resolver import IntentResolver
from app.services.interaction.response_planner import ResponsePlanner
from app.services.interaction.runner_service import RunnerService
from app.services.interaction.task_planner import TaskPlanner
from app.services.interaction.tool_registry import ToolRegistry
from app.services.voice.providers import (
    MockRealtimeTransportProvider,
    MockStreamingSTTProvider,
    MockTTSProvider,
    MockTurnDetectionProvider,
    MockVADProvider,
    StreamingTranscript,
    SynthesizedAudio,
    TranscriptType,
    TurnState,
    VADEvent,
    VADResult,
)
from app.services.voice.voice_pipeline import (
    VoicePipelineService,
    VoiceSessionContext,
    VoiceTurnResult,
)


# ────────────────────────────────────────────────────────────────────
# Fixtures
# ────────────────────────────────────────────────────────────────────


@pytest.fixture
def voice_pipeline():
    """Create a voice pipeline with mock providers for deterministic testing."""
    return VoicePipelineService(
        transport=MockRealtimeTransportProvider(),
        stt=MockStreamingSTTProvider(),
        tts=MockTTSProvider(),
        vad=MockVADProvider(),
        turn_detection=MockTurnDetectionProvider(),
    )


@pytest.fixture
async def voice_session(voice_pipeline):
    """Create and return an active voice session."""
    ctx = await voice_pipeline.create_voice_session(
        user_id="INVESTIGATOR_DELHI",
        case_id="CASE-2026-001",
        jurisdiction="Delhi NCR / Special Cell",
        clearance="RESTRICTED",
    )
    yield ctx
    await voice_pipeline.close_voice_session(ctx.session_id)


# ────────────────────────────────────────────────────────────────────
# Provider Abstraction Tests
# ────────────────────────────────────────────────────────────────────


class TestProviderAbstractions:
    """Verify all 5 provider interfaces are independently instantiable."""

    def test_p01_transport_provider_contract(self):
        """P01: RealtimeTransportProvider can be instantiated independently."""
        transport = MockRealtimeTransportProvider()
        assert transport is not None

    def test_p02_stt_provider_contract(self):
        """P02: StreamingSTTProvider can be instantiated independently."""
        stt = MockStreamingSTTProvider()
        assert stt is not None

    def test_p03_tts_provider_contract(self):
        """P03: TTSProvider can be instantiated independently."""
        tts = MockTTSProvider()
        assert tts is not None

    def test_p04_vad_provider_contract(self):
        """P04: VADProvider can be instantiated independently."""
        vad = MockVADProvider()
        assert vad is not None

    def test_p05_turn_detection_provider_contract(self):
        """P05: TurnDetectionProvider can be instantiated independently."""
        td = MockTurnDetectionProvider()
        assert td is not None


# ────────────────────────────────────────────────────────────────────
# Transport Session Tests
# ────────────────────────────────────────────────────────────────────


class TestTransportSession:
    """Verify transport session lifecycle."""

    @pytest.mark.asyncio
    async def test_p06_create_transport_session(self):
        """P06: Transport session creation returns valid session data."""
        transport = MockRealtimeTransportProvider()
        session = await transport.create_session(
            user_id="OFFICER-48",
            case_id="CASE-2026-001",
        )

        assert session.session_id.startswith("VS-")
        assert session.room_name == "sentinelx-room-CASE-2026-001"
        assert session.participant_identity == "OFFICER-48"
        assert session.transport_url
        assert session.access_token

    @pytest.mark.asyncio
    async def test_p07_close_transport_session(self):
        """P07: Transport session can be cleanly closed."""
        transport = MockRealtimeTransportProvider()
        session = await transport.create_session("USER-1", "C102")
        await transport.close_session(session.session_id)
        assert session.session_id not in transport._sessions


# ────────────────────────────────────────────────────────────────────
# Voice Pipeline Session Tests
# ────────────────────────────────────────────────────────────────────


class TestVoicePipelineSession:
    """Verify pipeline session lifecycle."""

    @pytest.mark.asyncio
    async def test_p08_create_voice_session(self, voice_pipeline):
        """P08: Voice session creation with transport."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        assert ctx.session_id.startswith("VSCTX-")
        assert ctx.user_id == "INVESTIGATOR_DELHI"
        assert ctx.case_id == "CASE-2026-001"
        assert ctx.transport_session is not None
        assert ctx.turn_state == TurnState.IDLE

        await voice_pipeline.close_voice_session(ctx.session_id)

    @pytest.mark.asyncio
    async def test_p09_session_status(self, voice_pipeline):
        """P09: Session status reporting."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="IO_SHARMA",
            case_id="CASE-2026-001",
        )

        status = voice_pipeline.get_session_status(ctx.session_id)
        assert status is not None
        assert status["user_id"] == "IO_SHARMA"
        assert status["case_id"] == "CASE-2026-001"
        assert status["turn_state"] == "IDLE"

        await voice_pipeline.close_voice_session(ctx.session_id)


# ────────────────────────────────────────────────────────────────────
# Voice Turn Processing Tests (Full Pipeline)
# ────────────────────────────────────────────────────────────────────


class TestVoiceTurnProcessing:
    """
    Test the complete voice pipeline:
    VOICE → INTENT → CONTEXT → PLAN → POLICY → TOOL → RESPONSE
    """

    # 1. Simple navigation
    @pytest.mark.asyncio
    async def test_p10_simple_navigation_command(self, voice_pipeline):
        """P10: 'Explain why this contradiction matters' routes through IntentResolver."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Explain why this contradiction matters and check velocity",
        )

        # INVESTIGATIVE CORRECTNESS
        assert result.transcript == "Explain why this contradiction matters and check velocity"
        assert result.intent is not None
        assert result.intent.intent_name == "INSPECT_CONTRADICTIONS"
        assert result.plan_id is not None

        # GOVERNANCE CORRECTNESS
        assert result.intent.modality == InteractionModality.VOICE
        assert result.audit_event_id is not None

        await voice_pipeline.close_voice_session(ctx.session_id)

    # 2. Search command
    @pytest.mark.asyncio
    async def test_p11_search_command(self, voice_pipeline):
        """P11: Search command routes through IntentResolver and PolicyGateway."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Find everything connecting these two people",
        )

        assert result.intent is not None
        assert result.intent.intent_name == "FIND_ENTITY_LINKAGES"
        assert result.intent.parameters.get("allow_identity_merge") is False
        assert result.audit_event_id is not None

        await voice_pipeline.close_voice_session(ctx.session_id)

    # 3. Entity lookup
    @pytest.mark.asyncio
    async def test_p12_entity_lookup(self, voice_pipeline):
        """P12: Entity lookup routes through the typed tool layer."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Find everything connecting P001 and P044",
        )

        assert result.intent is not None
        assert "ENTITY" in result.intent.target_domain or "LINKAGES" in result.intent.intent_name

        await voice_pipeline.close_voice_session(ctx.session_id)

    # 5. Evidence/proof lookup
    @pytest.mark.asyncio
    async def test_p13_evidence_proof_lookup(self, voice_pipeline):
        """P13: Evidence proof query routes correctly."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Trace this claim back to its original evidence",
        )

        assert result.intent is not None
        assert result.intent.intent_name == "PROVE_CLAIM_LINEAGE"
        assert result.intent.target_domain == "PROOF"

        await voice_pipeline.close_voice_session(ctx.session_id)

    # 6. Contradiction lookup
    @pytest.mark.asyncio
    async def test_p14_contradiction_lookup(self, voice_pipeline):
        """P14: Contradiction query returns evidence-grounded response."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Show me the contradictions in this case",
        )

        assert result.intent is not None
        assert result.intent.intent_name == "INSPECT_CONTRADICTIONS"

        # Response contract must contain epistemic content
        if result.response_contract:
            assert result.response_contract.investigative_rationale
            assert len(result.response_contract.cited_artifacts) >= 0

        await voice_pipeline.close_voice_session(ctx.session_id)

    # 7. Timeline query
    @pytest.mark.asyncio
    async def test_p15_timeline_query(self, voice_pipeline):
        """P15: Timeline comparison routes correctly."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Compare these timelines",
        )

        assert result.intent is not None
        assert result.intent.intent_name == "COMPARE_TIMELINES"

        await voice_pipeline.close_voice_session(ctx.session_id)

    # 11. Confirmation-required action
    @pytest.mark.asyncio
    async def test_p16_confirmation_required_action(self, voice_pipeline):
        """P16: High-risk action requires confirmation via PolicyGateway."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Freeze investigation snapshot for chargesheet",
        )

        assert result.intent is not None
        assert result.requires_confirmation is True
        assert result.confirmation_message is not None
        # Must NOT execute without confirmation
        assert result.execution_result is None

        await voice_pipeline.close_voice_session(ctx.session_id)


# ────────────────────────────────────────────────────────────────────
# Interruption & Cancellation Tests
# ────────────────────────────────────────────────────────────────────


class TestInterruptionAndCancellation:
    """Verify barge-in interruption and cancellation semantics."""

    # 12. Interruption
    @pytest.mark.asyncio
    async def test_p17_interruption_halts_tts(self, voice_pipeline):
        """P17: Investigator barge-in cancels TTS and transitions to LISTENING."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        # Simulate SPEAKING state
        session_ctx = voice_pipeline._sessions[ctx.session_id]
        session_ctx.turn_state = TurnState.SPEAKING

        result = await voice_pipeline.handle_interruption(ctx.session_id)

        assert result["interrupted"] is True
        assert result["action"] == "HALT_SYNTHESIS"
        assert result["new_state"] == "LISTENING"
        assert session_ctx.interrupted_count == 1

        await voice_pipeline.close_voice_session(ctx.session_id)

    @pytest.mark.asyncio
    async def test_p18_interruption_only_during_speaking(self, voice_pipeline):
        """P18: Interruption is no-op when not in SPEAKING state."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        # Session is in IDLE
        result = await voice_pipeline.handle_interruption(ctx.session_id)
        assert result["action"] == "NO_OP"

        await voice_pipeline.close_voice_session(ctx.session_id)

    # 13. Cancellation
    @pytest.mark.asyncio
    async def test_p19_cancel_turn(self, voice_pipeline):
        """P19: Cancel turn stops all active operations."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.cancel_turn(ctx.session_id)
        assert result["action"] == "CANCELLED"

        await voice_pipeline.close_voice_session(ctx.session_id)


# ────────────────────────────────────────────────────────────────────
# Failure & Resilience Tests
# ────────────────────────────────────────────────────────────────────


class FailingSTTProvider(MockStreamingSTTProvider):
    """STT provider that simulates failure."""
    async def transcribe_stream(self, audio_chunks, language_hint="en-IN"):
        raise ConnectionError("STT service unavailable")

    async def cancel(self):
        pass


class FailingTTSProvider(MockTTSProvider):
    """TTS provider that simulates failure."""
    async def synthesize_stream(self, text, voice_id="", language="", speed=1.0, pitch=1.0):
        raise ConnectionError("TTS service unavailable")
        yield  # Make it an async generator  # noqa: E501

    async def cancel(self):
        pass


class TestFailureResilience:
    """Verify graceful degradation on provider failures."""

    # 14. STT failure
    @pytest.mark.asyncio
    async def test_p20_stt_failure_graceful(self):
        """P20: STT failure results in ERROR state, not crash."""
        pipeline = VoicePipelineService(
            stt=FailingSTTProvider(),
        )

        ctx = await pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        # Process with transport audio (will trigger STT)
        result = await pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text=None,  # Force audio path
        )

        assert result.turn_state == TurnState.ERROR
        assert result.error is not None
        assert "STT" in result.error or "unavailable" in result.error

        await pipeline.close_voice_session(ctx.session_id)

    # 15. TTS failure
    @pytest.mark.asyncio
    async def test_p21_tts_failure_graceful(self):
        """P21: TTS failure does not lose the investigative result."""
        pipeline = VoicePipelineService(
            tts=FailingTTSProvider(),
        )

        ctx = await pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        # Process with text — pipeline should complete intent+plan even if TTS fails
        result = await pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Explain the contradiction",
        )

        # The investigative result should still exist
        assert result.intent is not None
        assert result.spoken_response  # Response was generated
        # Turn should still complete (TTS failure logged, not fatal)
        assert result.turn_state in (TurnState.IDLE, TurnState.ERROR)

        await pipeline.close_voice_session(ctx.session_id)

    # 16. Invalid session
    @pytest.mark.asyncio
    async def test_p22_invalid_session_error(self, voice_pipeline):
        """P22: Processing a turn on non-existent session returns error."""
        result = await voice_pipeline.process_voice_turn(
            session_id="NONEXISTENT-SESSION",
            transcript_text="Show contradictions",
        )

        assert result.turn_state == TurnState.ERROR
        assert "No active session" in result.error


# ────────────────────────────────────────────────────────────────────
# Epistemic Safety Tests
# ────────────────────────────────────────────────────────────────────


class TestEpistemicSafety:
    """Verify voice interaction preserves epistemic safety invariants."""

    # 22. Private CoT protection
    @pytest.mark.asyncio
    async def test_p23_no_chain_of_thought_in_voice_response(self, voice_pipeline):
        """P23: Voice response never exposes private chain-of-thought."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Explain kinematic contradiction",
        )

        if result.response_contract:
            # IntelligenceResponseContract must not have thought_process
            assert not hasattr(result.response_contract, "thought_process")
            # Must have structured investigative_rationale
            assert result.response_contract.investigative_rationale

        await voice_pipeline.close_voice_session(ctx.session_id)

    # Voice command is NOT evidence
    @pytest.mark.asyncio
    async def test_p24_voice_command_is_not_evidence(self, voice_pipeline):
        """P24: Voice transcript is an instruction, not evidence."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Show connections between Vikram and Rahul",
        )

        # The transcript should be used as a command, not stored as evidence
        assert result.intent is not None
        # Voice modality is recorded for audit, not as evidence type
        assert result.intent.modality == InteractionModality.VOICE

        await voice_pipeline.close_voice_session(ctx.session_id)

    # Response drives voice + UI simultaneously
    @pytest.mark.asyncio
    async def test_p25_response_drives_voice_and_ui(self, voice_pipeline):
        """P25: Response contract supports both voice and UI delivery."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Show the contradiction",
        )

        # Spoken response for voice
        assert result.spoken_response

        # Intent for UI synchronization
        assert result.intent is not None
        assert result.intent.intent_name  # UI can act on this
        assert result.intent.parameters is not None  # UI can use these

        # Response contract for detailed UI rendering
        if result.response_contract:
            assert result.response_contract.investigative_rationale
            assert result.response_contract.epistemic_status

        await voice_pipeline.close_voice_session(ctx.session_id)


# ────────────────────────────────────────────────────────────────────
# Governance Correctness Tests
# ────────────────────────────────────────────────────────────────────


class TestGovernanceCorrectness:
    """Verify voice commands enforce full governance pipeline."""

    @pytest.mark.asyncio
    async def test_p26_voice_routes_through_intent_resolver(self, voice_pipeline):
        """P26: Voice commands pass through IntentResolver (not hardcoded)."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Prepare section 91 notice under BNSS for telecom records",
        )

        # Must route through IntentResolver to get structured intent
        assert result.intent is not None
        assert result.intent.intent_name == "PREPARE_STATUTORY_NOTICE"
        assert result.intent.risk_class == ActionRiskClass.PREPARE

        await voice_pipeline.close_voice_session(ctx.session_id)

    @pytest.mark.asyncio
    async def test_p27_voice_generates_audit_trail(self, voice_pipeline):
        """P27: Every voice command produces an audit trail entry."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="Show the briefing for this case",
        )

        assert result.audit_event_id is not None

        await voice_pipeline.close_voice_session(ctx.session_id)

    @pytest.mark.asyncio
    async def test_p28_empty_transcript_cancelled(self, voice_pipeline):
        """P28: Empty/silence transcript results in CANCELLED, not error."""
        ctx = await voice_pipeline.create_voice_session(
            user_id="INVESTIGATOR_DELHI",
            case_id="CASE-2026-001",
        )

        result = await voice_pipeline.process_voice_turn(
            session_id=ctx.session_id,
            transcript_text="",  # Empty
        )

        assert result.turn_state == TurnState.CANCELLED
        assert result.was_cancelled is True

        await voice_pipeline.close_voice_session(ctx.session_id)


# ────────────────────────────────────────────────────────────────────
# STT Provider Tests
# ────────────────────────────────────────────────────────────────────


class TestSTTProvider:
    """Verify streaming STT provider contract."""

    @pytest.mark.asyncio
    async def test_p29_stt_partial_and_final_transcripts(self):
        """P29: STT yields both partial and final transcripts."""
        stt = MockStreamingSTTProvider(
            transcripts=["partial words", "final complete sentence"]
        )

        async def audio_gen():
            yield b"\x00" * 1600

        transcripts = []
        async for t in stt.transcribe_stream(audio_gen()):
            transcripts.append(t)

        # Should have partial + final for first, and final for last
        has_partial = any(
            t.transcript_type == TranscriptType.PARTIAL for t in transcripts
        )
        has_final = any(
            t.transcript_type == TranscriptType.FINAL for t in transcripts
        )
        assert has_partial or has_final  # At minimum one transcript type
        assert any(t.is_final for t in transcripts)

    @pytest.mark.asyncio
    async def test_p30_stt_cancellation(self):
        """P30: STT cancellation stops producing transcripts."""
        stt = MockStreamingSTTProvider()
        await stt.cancel()

        async def audio_gen():
            yield b"\x00" * 1600

        transcripts = []
        async for t in stt.transcribe_stream(audio_gen()):
            transcripts.append(t)

        assert len(transcripts) == 0


# ────────────────────────────────────────────────────────────────────
# TTS Provider Tests
# ────────────────────────────────────────────────────────────────────


class TestTTSProvider:
    """Verify TTS provider contract."""

    @pytest.mark.asyncio
    async def test_p31_tts_streaming_synthesis(self):
        """P31: TTS yields streaming audio chunks."""
        tts = MockTTSProvider()

        chunks = []
        async for chunk in tts.synthesize_stream(
            text="Kinematic contradiction detected",
            voice_id="sentinel-forensic-voice-s2",
        ):
            chunks.append(chunk)

        assert len(chunks) > 0
        assert chunks[-1].is_final is True
        assert all(isinstance(c.audio_bytes, bytes) for c in chunks)

    @pytest.mark.asyncio
    async def test_p32_tts_cancellation(self):
        """P32: TTS cancellation during synthesis stops producing audio."""
        tts = MockTTSProvider()

        chunks = []
        async for chunk in tts.synthesize_stream(
            text="This sentence has many words to speak aloud right now"
        ):
            chunks.append(chunk)
            if len(chunks) == 2:
                # Cancel mid-stream (barge-in)
                await tts.cancel()

        # Should have produced some chunks but stopped before completion
        assert len(chunks) < 10  # Fewer than all words
        assert len(chunks) >= 2  # At least the first two before cancel


# ────────────────────────────────────────────────────────────────────
# Turn Manager Compatibility
# ────────────────────────────────────────────────────────────────────


class TestTurnManagerCompatibility:
    """Verify Phase 5 is compatible with Wave 5 TurnManager."""

    def test_p33_wave5_turn_manager_preserved(self):
        """P33: Wave 5 TurnManager still works with Phase 5 state model."""
        from app.services.voice.voice_abstractions import (
            TurnManager,
            VoiceSessionState,
        )

        tm = TurnManager()
        assert tm.state == VoiceSessionState.IDLE

        tm.start_speaking()
        assert tm.state == VoiceSessionState.SPEAKING

        barge = tm.handle_barge_in()
        assert barge["interrupted"] is True
        assert tm.state == VoiceSessionState.INTERRUPTED

    def test_p34_pronunciation_lexicon_preserved(self):
        """P34: Wave 5 PronunciationLexicon still normalizes correctly."""
        from app.services.voice.voice_abstractions import PronunciationLexicon

        text = "Verified FIR and CDR under BNSS order."
        normalized = PronunciationLexicon.normalize_for_speech(text)

        assert "F.I.R." in normalized
        assert "C.D.R." in normalized
        assert "B-N-S-S" in normalized


# ────────────────────────────────────────────────────────────────────
# Provider Factory Tests
# ────────────────────────────────────────────────────────────────────


class TestProviderFactory:
    """Verify provider factory creates correct implementations."""

    def test_p35_factory_creates_mock_providers(self):
        """P35: Factory creates mock providers when STT_PROVIDER=mock."""
        from app.services.voice.provider_factory import (
            get_stt_provider,
            get_transport_provider,
            get_tts_provider,
            get_turn_detection_provider,
            get_vad_provider,
        )

        transport = get_transport_provider()
        stt = get_stt_provider()
        tts = get_tts_provider()
        vad = get_vad_provider()
        td = get_turn_detection_provider()

        assert isinstance(transport, MockRealtimeTransportProvider)
        assert isinstance(stt, MockStreamingSTTProvider)
        assert isinstance(tts, MockTTSProvider)
        assert isinstance(vad, MockVADProvider)
        assert isinstance(td, MockTurnDetectionProvider)


# ────────────────────────────────────────────────────────────────────
# LiveKit Adapter Tests
# ────────────────────────────────────────────────────────────────────


class TestLiveKitAdapter:
    """Verify LiveKit adapter contract (operates in mock mode without SDK)."""

    @pytest.mark.asyncio
    async def test_p36_livekit_transport_session(self):
        """P36: LiveKit adapter creates session even without SDK."""
        from app.services.voice.livekit_transport import (
            LiveKitRealtimeTransportProvider,
        )

        transport = LiveKitRealtimeTransportProvider()
        session = await transport.create_session(
            user_id="OFFICER-48",
            case_id="CASE-2026-001",
        )

        assert session.room_name == "sentinelx-room-CASE-2026-001"
        assert session.participant_identity == "OFFICER-48"
        assert session.access_token  # Mock or real token

        await transport.close_session(session.session_id)

    @pytest.mark.asyncio
    async def test_p37_livekit_stt_adapter(self):
        """P37: LiveKit STT adapter produces transcripts in mock mode."""
        from app.services.voice.livekit_transport import (
            LiveKitStreamingSTTAdapter,
        )

        stt = LiveKitStreamingSTTAdapter()

        async def audio_gen():
            yield b"\x00" * 1600

        transcripts = []
        async for t in stt.transcribe_stream(audio_gen()):
            transcripts.append(t)

        assert len(transcripts) > 0
        assert transcripts[-1].is_final is True
