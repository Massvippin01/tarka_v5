from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from uuid import uuid4

from app.domain.voice import VoiceInterruption, VoiceSession, VoiceSessionStatus, VoiceTurnStatus
from app.services.command.command_bus import CommandBus
from app.services.voice.providers.livekit import VoiceTransportProvider
from app.services.voice.tts import TTSService

logger = logging.getLogger("sentinelx.voice.interruption")


class InterruptionHandler:
    """
    Manages investigator barge-in / interruption during assistant audio output.

    Sequence:
    1. Detect investigator speech during SPEAKING state.
    2. Halt active TTS synthesis.
    3. Cancel outbound audio stream on transport.
    4. Mark current turn INTERRUPTED.
    5. Cancel active command execution if in-flight.
    6. Transition session state to LISTENING / PROCESSING for new turn.
    """

    def __init__(
        self,
        command_bus: Optional[CommandBus] = None,
        tts_service: Optional[TTSService] = None,
    ) -> None:
        self.command_bus = command_bus or CommandBus.get_instance()
        self.tts_service = tts_service or TTSService()

    async def handle_barge_in(
        self,
        session: VoiceSession,
        active_command_id: Optional[str] = None,
        transport_provider: Optional[VoiceTransportProvider] = None,
    ) -> VoiceInterruption:
        """Execute barge-in interruption sequence."""
        current_speaking_turn_id = ""
        for turn in reversed(session.turns):
            if turn.status == VoiceTurnStatus.SPEAKING:
                turn.status = VoiceTurnStatus.INTERRUPTED
                current_speaking_turn_id = turn.turn_id
                break

        # 1. Stop active TTS synthesis
        await self.tts_service.cancel()

        # 2. Cancel transport audio out
        if transport_provider:
            await transport_provider.cancel_audio_out(session.session_id)

        # 3. Cancel command execution if cancellable
        if active_command_id:
            self.command_bus.cancel_command(active_command_id)

        # 4. Transition session state
        try:
            session.transition_to(VoiceSessionStatus.INTERRUPTED)
        except Exception as e:
            logger.warning(f"Session transition error during interruption: {e}")
            session.status = VoiceSessionStatus.INTERRUPTED

        interruption = VoiceInterruption(
            interruption_id=f"VINT-{uuid4().hex[:8]}",
            session_id=session.session_id,
            turn_id=current_speaking_turn_id or f"VT-{uuid4().hex[:8]}",
            interrupted_speaking_turn_id=current_speaking_turn_id,
            reason="INVESTIGATOR_BARGE_IN_SPEECH",
        )

        logger.info(f"Barge-in handled for session '{session.session_id}', speaking_turn='{current_speaking_turn_id}'")
        return interruption
