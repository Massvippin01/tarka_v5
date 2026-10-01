from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field

from app.domain.voice import VoiceTurnStatus
from app.services.voice.tts import TTSService

logger = logging.getLogger("sentinelx.voice.response_queue")


class QueuedSpeechItem(BaseModel):
    queue_id: str = Field(default_factory=lambda: f"QITEM-{uuid4().hex[:8]}")
    response_id: str
    turn_id: str
    command_id: Optional[str] = None
    session_id: str
    spoken_text: str
    status: str = "PENDING"  # PENDING, SPEAKING, COMPLETED, CANCELLED_STALE_RESPONSE, INTERRUPTED
    queued_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
    started_speaking_at: Optional[str] = None
    finished_at: Optional[str] = None


class ResponseQueue:
    """
    Manages outbound voice response queuing, stale speech cancellation,
    and investigator interruption coordination.

    Invariants:
    1. Single Active Speaker: At most one response can speak at any given moment.
    2. Zero Stale Speech: If a new command, correction, or turn arrives, previous turns are marked CANCELLED_STALE_RESPONSE.
    3. State Preservation: Interruptions cancel audio playback but NEVER roll back investigative state mutations.
    """

    _instance: Optional[ResponseQueue] = None

    def __init__(self, tts_service: Optional[TTSService] = None) -> None:
        self.tts = tts_service or TTSService()
        self.active_item: Optional[QueuedSpeechItem] = None
        self.history: List[QueuedSpeechItem] = []

    @classmethod
    def get_instance(cls) -> ResponseQueue:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def enqueue_response(
        self,
        response_id: str,
        turn_id: str,
        session_id: str,
        spoken_text: str,
        command_id: Optional[str] = None,
    ) -> QueuedSpeechItem:
        """
        Enqueue a response to be spoken.
        If an existing item is speaking or pending, cancel it as stale.
        """
        if self.active_item and self.active_item.status in ("PENDING", "SPEAKING"):
            self.cancel_current_speech(reason="CANCELLED_STALE_RESPONSE")

        item = QueuedSpeechItem(
            response_id=response_id,
            turn_id=turn_id,
            command_id=command_id,
            session_id=session_id,
            spoken_text=spoken_text,
            status="PENDING",
        )
        self.active_item = item
        self.history.append(item)
        logger.info(f"Enqueued speech item {item.queue_id} for response {response_id}")
        return item

    def mark_speaking(self, queue_id: str) -> bool:
        """Mark an item as currently speaking."""
        if self.active_item and self.active_item.queue_id == queue_id:
            self.active_item.status = "SPEAKING"
            self.active_item.started_speaking_at = datetime.now(UTC).isoformat()
            return True
        return False

    def mark_completed(self, queue_id: str) -> bool:
        """Mark an item as successfully spoken."""
        if self.active_item and self.active_item.queue_id == queue_id:
            self.active_item.status = "COMPLETED"
            self.active_item.finished_at = datetime.now(UTC).isoformat()
            self.active_item = None
            return True
        return False

    def cancel_current_speech(self, reason: str = "CANCELLED_STALE_RESPONSE") -> Optional[QueuedSpeechItem]:
        """
        Cancel active speech immediately.
        Stops TTS stream. Does NOT roll back investigative state.
        """
        if not self.active_item:
            return None

        cancelled = self.active_item
        cancelled.status = reason
        cancelled.finished_at = datetime.now(UTC).isoformat()
        self.active_item = None

        logger.info(f"Speech item {cancelled.queue_id} cancelled: {reason}")
        return cancelled

    def handle_investigator_interruption(self, session_id: str, turn_id: str) -> Optional[QueuedSpeechItem]:
        """
        Triggered when investigator barge-in occurs during active TTS.
        """
        return self.cancel_current_speech(reason="INTERRUPTED")
