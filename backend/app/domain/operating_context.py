from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class InteractionModeEnum(str, Enum):
    """Interaction modalities safely negotiated by the environment."""
    KEYBOARD = "KEYBOARD"
    POINTER = "POINTER"
    VOICE = "VOICE"
    UI_DIRECT = "UI_DIRECT"


class MicPermissionStateEnum(str, Enum):
    """Microphone capability / permission states without fingerprinting."""
    GRANTED = "GRANTED"
    PROMPT = "PROMPT"
    DENIED = "DENIED"
    UNSUPPORTED = "UNSUPPORTED"
    NOT_REQUESTED = "NOT_REQUESTED"


class OnboardingIntentEnum(str, Enum):
    """6 canonical actionable intents for first-open onboarding."""
    START_INVESTIGATION = "START_INVESTIGATION"
    OPEN_CASE = "OPEN_CASE"
    SEARCH_ENTITY = "SEARCH_ENTITY"
    REVIEW_EVIDENCE = "REVIEW_EVIDENCE"
    CONTINUE_INVESTIGATION = "CONTINUE_INVESTIGATION"
    OTHER = "OTHER"


class OnboardingActionOption(BaseModel):
    """A single actionable choice presented on first open."""
    intent_code: OnboardingIntentEnum
    title: str
    description: str
    suggested_action: str
    requires_input: bool = False
    input_placeholder: Optional[str] = None
    target_route: str = "command"
    available_targets: List[Dict[str, str]] = Field(default_factory=list)


class ClientEnvironmentReport(BaseModel):
    """
    Safely provided client capabilities.
    Explicitly collects ZERO unnecessary hardware fingerprints.
    """
    client_session_id: Optional[str] = None
    has_audio_input: bool = False
    mic_permission: MicPermissionStateEnum = MicPermissionStateEnum.NOT_REQUESTED
    browser_family: str = "Standard Web Browser"
    preferred_language: str = "en-IN"
    is_mobile_viewport: bool = False


class OnboardingState(BaseModel):
    """Actionable onboarding state presented to the investigator."""
    is_first_open: bool = True
    greeting_title: str = "Welcome to SentinelX."
    greeting_prompt: str = "What would you like to investigate?"
    action_options: List[OnboardingActionOption] = Field(default_factory=list)
    default_case_scope: Optional[str] = None
    recommended_intent: OnboardingIntentEnum = OnboardingIntentEnum.OPEN_CASE


class OperatingContext(BaseModel):
    """
    Authoritative operational context negotiated upon session initialization.
    Contains only safely established information without invasive fingerprinting.
    """
    session_id: str = Field(default_factory=lambda: f"CTX-{uuid4().hex[:8]}")
    is_authenticated: bool = True
    investigator_id: str = "usr-delhi-01"
    display_name: str = "Insp. Vikramaditya (Delhi Cell)"
    badge_number: str = "POL-DEL-102"
    role: str = "INVESTIGATOR"
    clearance: str = "RESTRICTED"
    permissions: List[str] = Field(default_factory=list)
    allowed_cases: List[Dict[str, str]] = Field(default_factory=list)
    jurisdiction_scope: List[str] = Field(default_factory=list)
    voice_capability: Dict[str, Any] = Field(
        default_factory=lambda: {
            "supported": True,
            "transport": "WEBRTC_LIVEKIT",
            "stt": "STREAMING_STT",
            "languages": ["en-IN", "hi-IN", "hinglish"],
        }
    )
    microphone_state: MicPermissionStateEnum = MicPermissionStateEnum.NOT_REQUESTED
    supported_interaction_modes: List[InteractionModeEnum] = Field(
        default_factory=lambda: [
            InteractionModeEnum.KEYBOARD,
            InteractionModeEnum.POINTER,
            InteractionModeEnum.VOICE,
            InteractionModeEnum.UI_DIRECT,
        ]
    )
    current_case_id: Optional[str] = None
    current_route: str = "onboarding"
    is_first_open: bool = True
    established_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())
