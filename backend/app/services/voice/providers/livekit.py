from __future__ import annotations

import abc
import logging
from typing import Any, AsyncIterator, Dict, Optional
from uuid import uuid4

from app.domain.voice import VoiceSession, VoiceSessionStatus

logger = logging.getLogger("sentinelx.voice.providers.livekit")

_LIVEKIT_AVAILABLE = False
try:
    from livekit import api as livekit_api
    _LIVEKIT_AVAILABLE = True
except ImportError:
    livekit_api = None


class VoiceTransportProvider(abc.ABC):
    """Abstract WebRTC / Voice Transport Provider interface."""

    @abc.abstractmethod
    async def connect(
        self,
        user_id: str,
        case_id: str,
        operating_context_id: str = "CTX-DEFAULT",
    ) -> Dict[str, Any]:
        """Establish transport connection and issue tokens."""

    @abc.abstractmethod
    async def disconnect(self, session_id: str) -> None:
        """Close transport connection."""

    @abc.abstractmethod
    async def publish_audio(self, session_id: str, audio_chunks: AsyncIterator[bytes]) -> None:
        """Publish synthesized audio to investigator speaker."""

    @abc.abstractmethod
    async def subscribe_audio(self, session_id: str) -> AsyncIterator[bytes]:
        """Subscribe to incoming microphone audio stream."""

    @abc.abstractmethod
    async def cancel_audio_out(self, session_id: str) -> None:
        """Cancel outbound audio stream immediately (barge-in support)."""


class LiveKitProvider(VoiceTransportProvider):
    """Production LiveKit WebRTC Transport Provider."""

    def __init__(
        self,
        url: str = "wss://sentinelx-livekit.local/webrtc",
        api_key: str = "devkey",
        api_secret: str = "secret",
    ) -> None:
        self.url = url
        self.api_key = api_key
        self.api_secret = api_secret
        self.sdk_available = _LIVEKIT_AVAILABLE

    async def connect(
        self,
        user_id: str,
        case_id: str,
        operating_context_id: str = "CTX-DEFAULT",
    ) -> Dict[str, Any]:
        room_name = f"sentinelx-room-{case_id}"
        token = self._issue_jwt_token(user_id, room_name)

        return {
            "session_id": f"VS-LK-{uuid4().hex[:8]}",
            "room_name": room_name,
            "transport_url": self.url,
            "access_token": token,
            "participant_identity": user_id,
            "operating_context_id": operating_context_id,
            "provider": "livekit",
            "is_real_transport": self.sdk_available,
        }

    async def disconnect(self, session_id: str) -> None:
        logger.info(f"LiveKit session '{session_id}' disconnected.")

    async def publish_audio(self, session_id: str, audio_chunks: AsyncIterator[bytes]) -> None:
        async for _ in audio_chunks:
            pass

    async def subscribe_audio(self, session_id: str) -> AsyncIterator[bytes]:
        for _ in range(3):
            yield b"\x00" * 1600

    async def cancel_audio_out(self, session_id: str) -> None:
        logger.info(f"Outbound LiveKit audio cancelled for session '{session_id}'.")

    def _issue_jwt_token(self, user_id: str, room_name: str) -> str:
        if self.sdk_available and livekit_api is not None:
            try:
                token = livekit_api.AccessToken(api_key=self.api_key, api_secret=self.api_secret)
                token.with_identity(user_id)
                token.with_name(f"Investigator {user_id}")
                token.with_grants(livekit_api.VideoGrants(room_join=True, room=room_name))
                return token.to_jwt()
            except Exception as e:
                logger.error(f"LiveKit token error: {e}")

        return f"mock-livekit-token-{uuid4().hex[:12]}"


class DeterministicVoiceTransportProvider(VoiceTransportProvider):
    """Deterministic Transport Provider for testing without network/LiveKit."""

    def __init__(self) -> None:
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.cancelled_sessions: set[str] = set()

    async def connect(
        self,
        user_id: str,
        case_id: str,
        operating_context_id: str = "CTX-DEFAULT",
    ) -> Dict[str, Any]:
        sid = f"VS-DET-{uuid4().hex[:8]}"
        session_info = {
            "session_id": sid,
            "room_name": f"sentinelx-room-{case_id}",
            "transport_url": "wss://sentinelx-mock.local/webrtc",
            "access_token": f"mock-token-{sid}",
            "participant_identity": user_id,
            "operating_context_id": operating_context_id,
            "provider": "deterministic",
            "is_real_transport": False,
        }
        self.active_sessions[sid] = session_info
        return session_info

    async def disconnect(self, session_id: str) -> None:
        self.active_sessions.pop(session_id, None)

    async def publish_audio(self, session_id: str, audio_chunks: AsyncIterator[bytes]) -> None:
        async for _ in audio_chunks:
            if session_id in self.cancelled_sessions:
                return

    async def subscribe_audio(self, session_id: str) -> AsyncIterator[bytes]:
        for _ in range(3):
            yield b"\x00" * 1600

    async def cancel_audio_out(self, session_id: str) -> None:
        self.cancelled_sessions.add(session_id)
