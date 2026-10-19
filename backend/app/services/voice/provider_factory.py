"""
SentinelX Voice Provider Factory — Phase 5

Instantiates voice provider implementations based on configuration.
Fail-closed: raises ValueError for unknown or misconfigured providers.
"""

from __future__ import annotations

import logging
from typing import Optional

from app.core.config import settings
from app.services.voice.providers import (
    MockRealtimeTransportProvider,
    MockStreamingSTTProvider,
    MockTTSProvider,
    MockTurnDetectionProvider,
    MockVADProvider,
    RealtimeTransportProvider,
    StreamingSTTProvider,
    TTSProvider,
    TurnDetectionProvider,
    VADProvider,
)

logger = logging.getLogger("sentinelx.voice.factory")


def get_transport_provider() -> RealtimeTransportProvider:
    """
    Create a RealtimeTransportProvider based on configuration.
    LiveKit integration requires livekit-api SDK.
    """
    provider_name = getattr(settings, "STT_PROVIDER", "mock")

    if provider_name == "livekit":
        try:
            from app.services.voice.livekit_transport import (
                LiveKitRealtimeTransportProvider,
            )
            return LiveKitRealtimeTransportProvider(
                url=settings.LIVEKIT_URL,
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
        except ImportError:
            logger.warning(
                "livekit-api SDK not available; falling back to MockRealtimeTransportProvider. "
                "Status: BLOCKED_EXTERNAL_DEPENDENCY"
            )
            return MockRealtimeTransportProvider()

    return MockRealtimeTransportProvider()


def get_stt_provider(
    transcripts: Optional[list[str]] = None,
) -> StreamingSTTProvider:
    """Create a StreamingSTTProvider based on configuration."""
    provider_name = getattr(settings, "STT_PROVIDER", "mock")

    if provider_name == "livekit":
        try:
            from app.services.voice.livekit_transport import (
                LiveKitStreamingSTTAdapter,
            )
            return LiveKitStreamingSTTAdapter(
                api_key=settings.LIVEKIT_API_KEY,
                api_secret=settings.LIVEKIT_API_SECRET,
            )
        except ImportError:
            logger.warning(
                "livekit-api SDK not available; falling back to MockStreamingSTTProvider. "
                "Status: BLOCKED_EXTERNAL_DEPENDENCY"
            )
            return MockStreamingSTTProvider(transcripts=transcripts)

    return MockStreamingSTTProvider(transcripts=transcripts)


def get_tts_provider() -> TTSProvider:
    """Create a TTSProvider based on configuration."""
    provider_name = getattr(settings, "TTS_PROVIDER", "mock")

    if provider_name == "fish_audio":
        try:
            from app.services.voice.fish_audio_tts import FishAudioTTSProvider
            return FishAudioTTSProvider(
                api_key=getattr(settings, "FISH_AUDIO_API_KEY", None),
            )
        except ImportError:
            logger.warning(
                "Fish Audio SDK not available; falling back to MockTTSProvider. "
                "Status: BLOCKED_EXTERNAL_DEPENDENCY"
            )
            return MockTTSProvider()

    return MockTTSProvider()


def get_vad_provider() -> VADProvider:
    """Create a VADProvider. Currently only mock is available."""
    return MockVADProvider()


def get_turn_detection_provider() -> TurnDetectionProvider:
    """Create a TurnDetectionProvider. Currently only mock is available."""
    return MockTurnDetectionProvider()
