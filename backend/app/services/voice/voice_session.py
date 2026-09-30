from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Dict, Optional
from uuid import uuid4

from app.domain.interaction import InteractionContext
from app.domain.voice import (
    InvalidVoiceStateTransition,
    VoiceSession,
    VoiceSessionStatus,
    VoiceTurn,
    VoiceTurnStatus,
)

logger = logging.getLogger("sentinelx.voice.voice_session")


class VoiceSessionManager:
    """
    Manages active VoiceSession lifecycles, state transitions, and OperatingContext bindings.
    """

    def __init__(self) -> None:
        self._sessions: Dict[str, VoiceSession] = {}

    def create_session(
        self,
        investigator_id: str,
        case_id: str = "CASE-2026-001",
        operating_context_id: str = "CTX-DEFAULT",
        jurisdiction: str = "Delhi NCR / Special Cell",
        language: str = "en-IN",
        provider: str = "livekit",
    ) -> VoiceSession:
        session = VoiceSession(
            session_id=f"VS-{uuid4().hex[:8]}",
            investigator_id=investigator_id,
            operating_context_id=operating_context_id,
            case_id=case_id,
            jurisdiction=jurisdiction,
            language=language,
            provider=provider,
            status=VoiceSessionStatus.CREATED,
        )
        self._sessions[session.session_id] = session

        # Transition CREATED -> CONNECTING -> CONNECTED
        session.transition_to(VoiceSessionStatus.CONNECTING)
        session.transition_to(VoiceSessionStatus.CONNECTED)

        logger.info(f"VoiceSession created: session_id={session.session_id}, investigator={investigator_id}, case={case_id}")
        return session

    def get_session(self, session_id: str) -> Optional[VoiceSession]:
        return self._sessions.get(session_id)

    def update_session_status(self, session_id: str, new_status: VoiceSessionStatus) -> bool:
        session = self.get_session(session_id)
        if not session:
            logger.warning(f"Voice session '{session_id}' not found.")
            return False

        try:
            session.transition_to(new_status)
            logger.info(f"Voice session '{session_id}' transitioned to {new_status}")
            return True
        except InvalidVoiceStateTransition as e:
            logger.error(f"Invalid transition for session '{session_id}': {e}")
            return False

    def start_turn(self, session_id: str) -> Optional[VoiceTurn]:
        session = self.get_session(session_id)
        if not session:
            return None

        seq = len(session.turns) + 1
        turn = VoiceTurn(
            turn_id=f"VT-{uuid4().hex[:8]}",
            session_id=session_id,
            sequence_number=seq,
            language=session.language,
            status=VoiceTurnStatus.CREATED,
        )
        session.turns.append(turn)

        if session.status in [VoiceSessionStatus.CONNECTED, VoiceSessionStatus.SPEAKING, VoiceSessionStatus.INTERRUPTED]:
            self.update_session_status(session_id, VoiceSessionStatus.LISTENING)

        return turn

    def close_session(self, session_id: str) -> None:
        session = self.get_session(session_id)
        if session:
            try:
                session.transition_to(VoiceSessionStatus.CLOSING)
                session.transition_to(VoiceSessionStatus.CLOSED)
            except Exception as e:
                logger.warning(f"Error during session close: {e}")
                session.status = VoiceSessionStatus.CLOSED
            logger.info(f"Voice session '{session_id}' closed.")
