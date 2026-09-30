from __future__ import annotations

import logging
from typing import Any, AsyncIterator, Dict, Optional, Tuple
from uuid import uuid4

from app.domain.auth import UserIdentity
from app.domain.command import CommandExecutionResult, CommandStatus
from app.domain.interaction import InteractionContext
from app.domain.voice import (
    Transcript,
    VoiceCommandCandidate,
    VoiceResponse,
    VoiceSession,
    VoiceSessionStatus,
    VoiceTurn,
    VoiceTurnStatus,
)
from app.services.command.command_bus import CommandBus
from app.services.voice.command_interpreter import VoiceCommandInterpreter
from app.services.voice.interruption import InterruptionHandler
from app.services.voice.providers.livekit import DeterministicVoiceTransportProvider, VoiceTransportProvider
from app.services.voice.response_planner import VoiceResponsePlanner
from app.services.voice.stt import STTService
from app.services.voice.tts import TTSService
from app.services.voice.voice_session import VoiceSessionManager

logger = logging.getLogger("sentinelx.voice.voice_gateway")


class VoiceGateway:
    """
    CENTRAL REALTIME VOICE CONTROL PLANE GATEWAY.

    Orchestrates:
    MIC / WebRTC -> Audio Ingestion -> VAD / Turn Detection -> Streaming STT
    -> Multilingual Code-Switch Metadata -> VoiceCommandInterpreter
    -> Canonical Command -> Phase 2 CommandBus -> OperatingContext + PolicyGateway
    -> ActionExecutor / AgentSupervisor -> ResponsePlanner -> Streaming TTS -> WebRTC -> Investigator.

    ABSOLUTE INVARIANT:
    VOICE MUST NEVER BYPASS COMMAND BUS.
    """

    _instance: Optional[VoiceGateway] = None

    def __init__(
        self,
        transport_provider: Optional[VoiceTransportProvider] = None,
        stt_service: Optional[STTService] = None,
        tts_service: Optional[TTSService] = None,
        interpreter: Optional[VoiceCommandInterpreter] = None,
        command_bus: Optional[CommandBus] = None,
        response_planner: Optional[VoiceResponsePlanner] = None,
        session_manager: Optional[VoiceSessionManager] = None,
    ) -> None:
        self.transport = transport_provider or DeterministicVoiceTransportProvider()
        self.stt = stt_service or STTService()
        self.tts = tts_service or TTSService()
        self.interpreter = interpreter or VoiceCommandInterpreter()
        self.command_bus = command_bus or CommandBus.get_instance()
        self.response_planner = response_planner or VoiceResponsePlanner()
        self.session_manager = session_manager or VoiceSessionManager()
        self.interruption_handler = InterruptionHandler(
            command_bus=self.command_bus,
            tts_service=self.tts,
        )

    @classmethod
    def get_instance(cls) -> VoiceGateway:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    async def create_voice_session(
        self,
        user: UserIdentity,
        case_id: str = "CASE-2026-001",
        operating_context_id: str = "CTX-DEFAULT",
        jurisdiction: str = "Delhi NCR / Special Cell",
        language: str = "en-IN",
    ) -> Tuple[VoiceSession, Dict[str, Any]]:
        """
        Create a new voice session bound to OperatingContext and issue WebRTC transport token.
        """
        session = self.session_manager.create_session(
            investigator_id=user.user_id,
            case_id=case_id,
            operating_context_id=operating_context_id,
            jurisdiction=jurisdiction,
            language=language,
        )

        transport_info = await self.transport.connect(
            user_id=user.user_id,
            case_id=case_id,
            operating_context_id=operating_context_id,
        )

        logger.info(f"VoiceGateway session created: session_id={session.session_id}")
        return session, transport_info

    async def process_voice_turn(
        self,
        session_id: str,
        transcript_text: Optional[str] = None,
        user: Optional[UserIdentity] = None,
    ) -> VoiceResponse:
        """
        Process a single voice turn:
        1. Obtain Transcript (from audio or text direct)
        2. VoiceCommandInterpreter -> VoiceCommandCandidate
        3. Check Ambiguity -> return ambiguity response if unclear
        4. Candidate -> Command -> CommandBus.dispatch (through PolicyGateway!)
        5. ExecutionResult -> VoiceResponsePlanner -> VoiceResponse
        6. Synthesize TTS response
        """
        session = self.session_manager.get_session(session_id)
        if not session:
            return self.response_planner.plan_error_response(
                session_id=session_id,
                turn_id="UNKNOWN",
                error_message=f"Session '{session_id}' not found.",
            )

        turn = self.session_manager.start_turn(session_id)
        if not turn:
            return self.response_planner.plan_error_response(
                session_id=session_id,
                turn_id="UNKNOWN",
                error_message="Failed to start voice turn.",
            )

        try:
            # 1. Obtain Transcript
            self.session_manager.update_session_status(session_id, VoiceSessionStatus.PROCESSING)
            turn.status = VoiceTurnStatus.TRANSCRIBING

            if transcript_text is not None:
                transcript = await self.stt.transcribe_text_direct(
                    text=transcript_text,
                    language_hint=session.language,
                )
            else:
                # Stream from transport
                audio_stream = self.transport.subscribe_audio(session_id)
                transcript = None
                async for partial in self.stt.transcribe_audio_stream(audio_stream, language_hint=session.language):
                    transcript = partial
                if not transcript:
                    transcript = Transcript(text="", is_final=True, confidence=0.0)

            turn.transcript = transcript

            # 2. Interpret Transcript -> VoiceCommandCandidate
            turn.status = VoiceTurnStatus.INTERPRETING
            context = InteractionContext(
                user_id=user.user_id if user else session.investigator_id,
                user_role=user.role.value if user and hasattr(user.role, "value") else "INVESTIGATOR",
                case_id=session.case_id,
                jurisdiction=session.jurisdiction,
                clearance=user.clearance if user else "RESTRICTED",
            )

            candidate = self.interpreter.interpret_transcript(transcript, context)

            if candidate.is_ambiguous:
                turn.status = VoiceTurnStatus.COMPLETED
                self.session_manager.update_session_status(session_id, VoiceSessionStatus.CONNECTED)
                return self.response_planner.plan_ambiguity_response(
                    session_id=session_id,
                    turn_id=turn.turn_id,
                    transcript_text=transcript.text,
                )

            # 3. Create Canonical Command & Dispatch to CommandBus
            turn.status = VoiceTurnStatus.EXECUTING
            command = self.interpreter.create_command(candidate, context, correlation_id=session.correlation_id)
            turn.command_id = command.command_id

            # Dispatch via CommandBus (ENFORCES PolicyGateway & ActionExecutor)
            execution_result = await self.command_bus.dispatch(command, user=user)
            turn.execution_status = execution_result.status.value

            # Extract agent finding if applicable
            agent_finding = None
            if execution_result.output_data and "agent_finding" in execution_result.output_data:
                agent_finding = execution_result.output_data["agent_finding"]

            # 4. Formulate VoiceResponse
            voice_response = self.response_planner.plan_response(
                execution_result=execution_result,
                session_id=session_id,
                turn_id=turn.turn_id,
                agent_finding=agent_finding,
            )

            # 5. Synthesize TTS response
            self.session_manager.update_session_status(session_id, VoiceSessionStatus.SPEAKING)
            turn.status = VoiceTurnStatus.SPEAKING

            # Stream audio to transport
            tts_stream = self.tts.synthesize_stream(
                text=voice_response.spoken_text,
                language=session.language,
            )
            await self.transport.publish_audio(session_id, tts_stream)

            turn.status = VoiceTurnStatus.COMPLETED
            self.session_manager.update_session_status(session_id, VoiceSessionStatus.CONNECTED)

            return voice_response

        except Exception as e:
            logger.error(f"Voice turn processing error: {e}", exc_info=True)
            turn.status = VoiceTurnStatus.FAILED
            self.session_manager.update_session_status(session_id, VoiceSessionStatus.CONNECTED)
            return self.response_planner.plan_error_response(
                session_id=session_id,
                turn_id=turn.turn_id,
                error_message=str(e),
            )

    async def handle_interruption(self, session_id: str) -> Dict[str, Any]:
        """Handle barge-in interruption for session."""
        session = self.session_manager.get_session(session_id)
        if not session:
            return {"status": "NO_SESSION", "session_id": session_id}

        interruption = await self.interruption_handler.handle_barge_in(
            session=session,
            transport_provider=self.transport,
        )

        return {
            "status": "INTERRUPTED",
            "interruption_id": interruption.interruption_id,
            "session_id": session_id,
            "turn_id": interruption.turn_id,
        }

    async def close_session(self, session_id: str) -> None:
        """Cleanly terminate voice session and transport."""
        await self.transport.disconnect(session_id)
        self.session_manager.close_session(session_id)
