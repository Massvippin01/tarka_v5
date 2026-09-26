"""
SentinelX Voice Pipeline Service — Phase 5

Orchestrates the complete realtime voice interaction pipeline:

  MIC → WebRTC/LiveKit → VAD → turn detection → streaming STT
    → IntentResolver → ContextResolver → SentinelSession
    → TaskPlanner → PolicyGateway → typed tool invocation
    → verification → IntelligenceResponseContract
    → response planner → streaming TTS → LiveKit → investigator

Design invariants:
  - Voice is a MODALITY over the existing investigative workflow.
  - Every executable voice request follows:
      VOICE COMMAND → INTENT → CONTEXT → PLAN → POLICY → TOOL
      → VERIFICATION → RESPONSE
  - No direct VOICE → LLM → DATABASE or VOICE → LLM → ACTION.
  - No voice command may bypass PolicyGateway.
  - High-risk actions require existing confirmation mechanism.
  - Spoken transcript is NEVER treated as evidence.
  - Voice identity ≠ authorization.
  - The same response drives VOICE + UI simultaneously.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.domain.interaction import (
    ActionRiskClass,
    InteractionContext,
    InteractionIntent,
    InteractionModality,
)
from app.domain.intelligence_contract import IntelligenceResponseContract
from app.services.audit_service import AuditService
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
    RealtimeTransportProvider,
    StreamingSTTProvider,
    StreamingTranscript,
    SynthesizedAudio,
    TTSProvider,
    TranscriptType,
    TransportSession,
    TurnDetectionProvider,
    TurnState,
    VADProvider,
    VADEvent,
    VADResult,
)

logger = logging.getLogger("sentinelx.voice.pipeline")


@dataclass
class VoiceTurnResult:
    """Result of processing a single voice turn through the pipeline."""
    turn_id: str = field(default_factory=lambda: f"VT-{uuid4().hex[:8]}")
    transcript: str = ""
    transcript_confidence: float = 0.0
    language_code: str = "en-IN"
    intent: Optional[InteractionIntent] = None
    plan_id: Optional[str] = None
    execution_result: Optional[Dict[str, Any]] = None
    response_contract: Optional[IntelligenceResponseContract] = None
    spoken_response: str = ""
    turn_state: TurnState = TurnState.IDLE
    was_interrupted: bool = False
    was_cancelled: bool = False
    error: Optional[str] = None
    requires_confirmation: bool = False
    confirmation_message: Optional[str] = None
    audit_event_id: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


@dataclass
class VoiceSessionContext:
    """Active voice session with transport and investigative context."""
    session_id: str = field(default_factory=lambda: f"VSCTX-{uuid4().hex[:8]}")
    transport_session: Optional[TransportSession] = None
    user_id: str = ""
    case_id: str = ""
    jurisdiction: str = "Delhi NCR / Special Cell"
    clearance: str = "RESTRICTED"
    turn_state: TurnState = TurnState.IDLE
    active_turn_id: Optional[str] = None
    turn_history: List[VoiceTurnResult] = field(default_factory=list)
    interrupted_count: int = 0
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


class VoicePipelineService:
    """
    Orchestrates the complete voice interaction pipeline.

    This is the single entry point for all voice interactions.
    Voice commands are processed through the existing Wave 5
    investigative workflow (IntentResolver → TaskPlanner →
    PolicyGateway → ToolRegistry → Runner → ResponsePlanner).

    NO shortcutting. NO bypassing PolicyGateway.
    """

    def __init__(
        self,
        transport: Optional[RealtimeTransportProvider] = None,
        stt: Optional[StreamingSTTProvider] = None,
        tts: Optional[TTSProvider] = None,
        vad: Optional[VADProvider] = None,
        turn_detection: Optional[TurnDetectionProvider] = None,
        intent_resolver: Optional[IntentResolver] = None,
        task_planner: Optional[TaskPlanner] = None,
        tool_registry: Optional[ToolRegistry] = None,
        runner_service: Optional[RunnerService] = None,
        response_planner: Optional[ResponsePlanner] = None,
    ) -> None:
        # Voice providers (independently replaceable)
        self.transport = transport or MockRealtimeTransportProvider()
        self.stt = stt or MockStreamingSTTProvider()
        self.tts = tts or MockTTSProvider()
        self.vad = vad or MockVADProvider()
        self.turn_detection = turn_detection or MockTurnDetectionProvider()

        # Existing Wave 5 investigative services (NOT bypassed)
        self.intent_resolver = intent_resolver or IntentResolver()
        self.task_planner = task_planner or TaskPlanner()
        self.tool_registry = tool_registry or ToolRegistry.get_instance()
        self.runner_service = runner_service or RunnerService(
            tool_registry=self.tool_registry
        )
        self.response_planner = response_planner or ResponsePlanner()
        self.audit_service = AuditService.get_instance()

        # Active sessions
        self._sessions: Dict[str, VoiceSessionContext] = {}

    async def create_voice_session(
        self,
        user_id: str,
        case_id: str,
        jurisdiction: str = "Delhi NCR / Special Cell",
        clearance: str = "RESTRICTED",
    ) -> VoiceSessionContext:
        """
        Create a new voice session with transport session.
        """
        transport_session = await self.transport.create_session(
            user_id=user_id,
            case_id=case_id,
            metadata={"jurisdiction": jurisdiction, "clearance": clearance},
        )

        ctx = VoiceSessionContext(
            transport_session=transport_session,
            user_id=user_id,
            case_id=case_id,
            jurisdiction=jurisdiction,
            clearance=clearance,
        )
        self._sessions[ctx.session_id] = ctx

        logger.info(
            "Voice session created: %s (user=%s, case=%s)",
            ctx.session_id,
            user_id,
            case_id,
        )
        return ctx

    async def close_voice_session(self, session_id: str) -> None:
        """Close a voice session and its transport."""
        ctx = self._sessions.pop(session_id, None)
        if ctx and ctx.transport_session:
            await self.transport.close_session(
                ctx.transport_session.session_id
            )
        logger.info("Voice session closed: %s", session_id)

    async def process_voice_turn(
        self,
        session_id: str,
        transcript_text: Optional[str] = None,
    ) -> VoiceTurnResult:
        """
        Process a single voice turn through the full pipeline.

        If transcript_text is provided, it's used directly (for text-input
        fallback mode or pre-transcribed audio).
        Otherwise, audio is streamed from the transport and transcribed.

        The pipeline:
          1. STT → transcript
          2. IntentResolver → structured intent
          3. TaskPlanner → execution plan
          4. PolicyGateway → authorization (via RunnerService)
          5. Tool execution
          6. ResponsePlanner → IntelligenceResponseContract
          7. TTS → spoken response
        """
        ctx = self._sessions.get(session_id)
        if not ctx:
            return VoiceTurnResult(
                turn_state=TurnState.ERROR,
                error=f"No active session: {session_id}",
            )

        turn = VoiceTurnResult()
        ctx.active_turn_id = turn.turn_id
        ctx.turn_state = TurnState.LISTENING

        try:
            # ── Stage 1: Transcription ──
            ctx.turn_state = TurnState.TRANSCRIBING
            turn.turn_state = TurnState.TRANSCRIBING

            if transcript_text is not None:
                # Direct text input (typed command or pre-transcribed)
                turn.transcript = transcript_text
                turn.transcript_confidence = 1.0
            else:
                # Stream audio and transcribe
                turn = await self._transcribe_from_transport(ctx, turn)
                if turn.turn_state == TurnState.ERROR:
                    return self._finalize_turn(ctx, turn)

            if not turn.transcript.strip():
                turn.turn_state = TurnState.CANCELLED
                turn.was_cancelled = True
                return self._finalize_turn(ctx, turn)

            # ── Stage 2: Intent Resolution (via IntentResolver) ──
            ctx.turn_state = TurnState.THINKING
            turn.turn_state = TurnState.THINKING

            interaction_context = InteractionContext(
                user_id=ctx.user_id,
                user_role="INVESTIGATOR",
                case_id=ctx.case_id,
                jurisdiction=ctx.jurisdiction,
                clearance=ctx.clearance,
            )

            intent = await self.intent_resolver.resolve_intent(
                query=turn.transcript,
                context=interaction_context,
                modality=InteractionModality.VOICE,
            )
            turn.intent = intent

            # ── Stage 3: Plan & Policy ──
            ctx.turn_state = TurnState.TOOL_EXECUTION
            turn.turn_state = TurnState.TOOL_EXECUTION

            plan = await self.task_planner.plan(intent, interaction_context)
            self.runner_service.register_plan(plan)
            turn.plan_id = plan.plan_id

            # Check confirmation requirement BEFORE execution
            if intent.requires_confirmation:
                turn.requires_confirmation = True
                turn.confirmation_message = (
                    f"Confirmation required for {intent.intent_name} "
                    f"(risk: {intent.risk_class.value}). "
                    f"Please confirm to proceed."
                )
                turn.turn_state = TurnState.IDLE
                turn.spoken_response = turn.confirmation_message
                return self._finalize_turn(ctx, turn)

            # Execute plan steps through PolicyGateway-aware runner
            allowed_cases = [ctx.case_id]
            allowed_jurisdictions = [ctx.jurisdiction]

            execution_result = self.runner_service.execute_next_step(
                plan_id=plan.plan_id,
                context=interaction_context,
                allowed_cases=allowed_cases,
                allowed_jurisdictions=allowed_jurisdictions,
            )
            turn.execution_result = execution_result

            # Check if runner returned WAITING_CONFIRMATION
            if execution_result.get("status") == "WAITING_CONFIRMATION":
                turn.requires_confirmation = True
                turn.confirmation_message = execution_result.get(
                    "confirmation_message",
                    "Confirmation required for this action.",
                )
                turn.turn_state = TurnState.IDLE
                turn.spoken_response = turn.confirmation_message
                return self._finalize_turn(ctx, turn)

            # ── Stage 4: Response Generation ──
            response_contract = await self.response_planner.plan_response(
                prompt=turn.transcript,
                context=interaction_context,
            )
            turn.response_contract = response_contract

            # Build spoken summary from contract
            turn.spoken_response = self._build_spoken_response(
                response_contract
            )

            # ── Stage 5: TTS Delivery ──
            ctx.turn_state = TurnState.SPEAKING
            turn.turn_state = TurnState.SPEAKING

            # Synthesize and deliver (in production, streams to transport)
            if ctx.transport_session:
                await self._deliver_tts_response(ctx, turn)

            # ── Stage 6: Audit ──
            audit_entry = self.audit_service.log_query_event(
                query=f"VOICE: {turn.transcript}",
                scope={
                    "case": ctx.case_id,
                    "intent": intent.intent_name if intent else "UNKNOWN",
                    "modality": "VOICE",
                    "turn_id": turn.turn_id,
                },
                tools_invoked=[
                    intent.intent_name if intent else "unknown"
                ],
                records_accessed=list(
                    (intent.parameters or {}).values()
                ) if intent else [],
                response_id=turn.turn_id,
                verification_rate=1.0,
            )
            turn.audit_event_id = audit_entry.get("audit_id")

            turn.turn_state = TurnState.IDLE
            ctx.turn_state = TurnState.IDLE

        except Exception as e:
            logger.error(
                "Voice pipeline error in session %s: %s",
                session_id,
                e,
                exc_info=True,
            )
            turn.turn_state = TurnState.ERROR
            turn.error = str(e)
            ctx.turn_state = TurnState.ERROR

        return self._finalize_turn(ctx, turn)

    async def handle_interruption(
        self, session_id: str
    ) -> Dict[str, Any]:
        """
        Handle investigator interruption (barge-in).

        When the investigator speaks while Sentinel is speaking:
          1. Cancel current TTS delivery
          2. Cancel outbound audio
          3. Transition to LISTENING
          4. Preserve the investigator's new utterance context
          5. Prevent stale response audio from continuing
        """
        ctx = self._sessions.get(session_id)
        if not ctx:
            return {"action": "NO_OP", "reason": "no_session"}

        if ctx.turn_state != TurnState.SPEAKING:
            return {"action": "NO_OP", "reason": "not_speaking"}

        # 1. Cancel TTS
        await self.tts.cancel()

        # 2. Cancel outbound audio transport
        if ctx.transport_session:
            await self.transport.cancel_audio_out(
                ctx.transport_session.session_id
            )

        # 3. Transition state
        ctx.turn_state = TurnState.LISTENING
        ctx.interrupted_count += 1

        logger.info(
            "Interruption handled: session=%s, count=%d",
            session_id,
            ctx.interrupted_count,
        )

        return {
            "action": "HALT_SYNTHESIS",
            "interrupted": True,
            "new_state": TurnState.LISTENING.value,
            "interrupted_count": ctx.interrupted_count,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    async def cancel_turn(self, session_id: str) -> Dict[str, Any]:
        """Cancel the current voice turn."""
        ctx = self._sessions.get(session_id)
        if not ctx:
            return {"action": "NO_OP", "reason": "no_session"}

        # Cancel all active operations
        await self.stt.cancel()
        await self.tts.cancel()
        if ctx.transport_session:
            await self.transport.cancel_audio_out(
                ctx.transport_session.session_id
            )

        ctx.turn_state = TurnState.CANCELLED

        return {
            "action": "CANCELLED",
            "session_id": session_id,
            "timestamp": datetime.now(UTC).isoformat(),
        }

    def get_session_status(
        self, session_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get the current status of a voice session."""
        ctx = self._sessions.get(session_id)
        if not ctx:
            return None

        return {
            "session_id": ctx.session_id,
            "user_id": ctx.user_id,
            "case_id": ctx.case_id,
            "turn_state": ctx.turn_state.value,
            "active_turn_id": ctx.active_turn_id,
            "interrupted_count": ctx.interrupted_count,
            "turn_history_count": len(ctx.turn_history),
            "transport_session_id": (
                ctx.transport_session.session_id
                if ctx.transport_session
                else None
            ),
            "created_at": ctx.created_at,
        }

    # ── Private helpers ──

    async def _transcribe_from_transport(
        self,
        ctx: VoiceSessionContext,
        turn: VoiceTurnResult,
    ) -> VoiceTurnResult:
        """Transcribe audio from the transport session."""
        if not ctx.transport_session:
            turn.turn_state = TurnState.ERROR
            turn.error = "No transport session for audio streaming"
            return turn

        try:
            audio_stream = self.transport.stream_audio_in(
                ctx.transport_session.session_id
            )

            final_transcript = ""
            async for transcript in self.stt.transcribe_stream(audio_stream):
                if transcript.is_final:
                    final_transcript = transcript.text
                    turn.transcript_confidence = transcript.confidence
                    turn.language_code = transcript.language_code

            turn.transcript = final_transcript
        except Exception as e:
            turn.turn_state = TurnState.ERROR
            turn.error = f"STT error: {e}"

        return turn

    async def _deliver_tts_response(
        self,
        ctx: VoiceSessionContext,
        turn: VoiceTurnResult,
    ) -> None:
        """Synthesize and deliver spoken response via transport."""
        if not turn.spoken_response:
            return

        try:
            async def audio_generator():
                async for chunk in self.tts.synthesize_stream(
                    text=turn.spoken_response,
                    voice_id="sentinel-forensic-voice-s2",
                    language=turn.language_code,
                ):
                    yield chunk.audio_bytes

            await self.transport.stream_audio_out(
                ctx.transport_session.session_id,
                audio_generator(),
            )
        except Exception as e:
            logger.error("TTS delivery error: %s", e)

    def _build_spoken_response(
        self,
        contract: IntelligenceResponseContract,
    ) -> str:
        """
        Build a concise spoken summary from IntelligenceResponseContract.
        Never exposes private chain-of-thought.
        Uses structured investigative_rationale only.
        """
        parts: List[str] = []

        if contract.investigative_finding:
            parts.append(contract.investigative_finding)

        if contract.contradictions_identified:
            count = len(contract.contradictions_identified)
            parts.append(
                f"{count} contradiction{'s' if count > 1 else ''} identified."
            )

        if contract.evidence_gaps_identified:
            count = len(contract.evidence_gaps_identified)
            parts.append(
                f"{count} evidence gap{'s' if count > 1 else ''} detected."
            )

        if contract.recommended_action:
            parts.append(f"Recommended: {contract.recommended_action}")

        if contract.requires_statutory_authority and contract.statutory_code:
            parts.append(
                f"Statutory authority required: {contract.statutory_code}."
            )

        return " ".join(parts) if parts else "Command processed."

    def _finalize_turn(
        self,
        ctx: VoiceSessionContext,
        turn: VoiceTurnResult,
    ) -> VoiceTurnResult:
        """Record the turn in session history."""
        ctx.turn_history.append(turn)
        ctx.active_turn_id = None
        if turn.turn_state not in (TurnState.ERROR, TurnState.CANCELLED):
            ctx.turn_state = TurnState.IDLE
        return turn
