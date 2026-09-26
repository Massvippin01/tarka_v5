"""
SentinelX Voice API — Phase 5 Realtime Voice Interaction Endpoints

Provides:
  - POST /session/create — Create a voice transport session
  - POST /session/{session_id}/turn — Process a voice turn (text or audio)
  - POST /session/{session_id}/interrupt — Handle barge-in interruption
  - POST /session/{session_id}/cancel — Cancel current turn
  - GET  /session/{session_id}/status — Get session status
  - POST /session/{session_id}/close — Close a voice session

All voice endpoints enforce the existing SentinelX authorization model.
Voice commands pass through IntentResolver → PolicyGateway.
No voice command bypasses policy.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService
from app.services.voice.voice_pipeline import VoicePipelineService

logger = logging.getLogger("sentinelx.api.voice")

router = APIRouter()

# Singleton pipeline service (providers injected from config)
_pipeline: Optional[VoicePipelineService] = None


def get_pipeline() -> VoicePipelineService:
    """Get or create the voice pipeline singleton."""
    global _pipeline
    if _pipeline is None:
        from app.services.voice.provider_factory import (
            get_stt_provider,
            get_transport_provider,
            get_tts_provider,
            get_turn_detection_provider,
            get_vad_provider,
        )

        _pipeline = VoicePipelineService(
            transport=get_transport_provider(),
            stt=get_stt_provider(),
            tts=get_tts_provider(),
            vad=get_vad_provider(),
            turn_detection=get_turn_detection_provider(),
        )
    return _pipeline


def get_current_user(
    authorization: Optional[str] = Header(None),
) -> UserIdentity:
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization)


# ────────────────────────────────────────────────────────────────────
# Request / Response Models
# ────────────────────────────────────────────────────────────────────


class VoiceSessionCreateRequest(BaseModel):
    case_id: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    clearance: str = "RESTRICTED"


class VoiceSessionCreateResponse(BaseModel):
    session_id: str
    transport_url: str
    access_token: str
    room_name: str
    expires_in_seconds: int = 3600


class VoiceTurnRequest(BaseModel):
    transcript: Optional[str] = None  # Text input; if None, uses audio
    language_hint: str = "en-IN"


class VoiceTurnResponse(BaseModel):
    turn_id: str
    transcript: str
    intent_name: Optional[str] = None
    plan_id: Optional[str] = None
    spoken_response: str = ""
    turn_state: str = "IDLE"
    was_interrupted: bool = False
    was_cancelled: bool = False
    requires_confirmation: bool = False
    confirmation_message: Optional[str] = None
    error: Optional[str] = None
    audit_event_id: Optional[str] = None
    # UI synchronization fields
    ui_action: Optional[str] = None
    ui_parameters: Optional[Dict[str, Any]] = None


class VoiceSessionStatusResponse(BaseModel):
    session_id: str
    user_id: str
    case_id: str
    turn_state: str
    active_turn_id: Optional[str] = None
    interrupted_count: int = 0
    turn_history_count: int = 0
    transport_session_id: Optional[str] = None
    created_at: str


# ────────────────────────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────────────────────────


@router.post("/session/create", response_model=VoiceSessionCreateResponse)
async def create_voice_session(
    req: VoiceSessionCreateRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """Create a new voice transport session for the authenticated investigator."""
    pipeline = get_pipeline()

    ctx = await pipeline.create_voice_session(
        user_id=user.user_id,
        case_id=req.case_id,
        jurisdiction=req.jurisdiction,
        clearance=req.clearance,
    )

    transport = ctx.transport_session
    if not transport:
        raise HTTPException(
            status_code=500,
            detail="Transport session creation failed",
        )

    return VoiceSessionCreateResponse(
        session_id=ctx.session_id,
        transport_url=transport.transport_url,
        access_token=transport.access_token,
        room_name=transport.room_name,
        expires_in_seconds=transport.expires_in_seconds,
    )


@router.post(
    "/session/{session_id}/turn",
    response_model=VoiceTurnResponse,
)
async def process_voice_turn(
    session_id: str,
    req: VoiceTurnRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Process a voice turn through the full investigative pipeline.

    If req.transcript is provided, it's used as the input text
    (for typed commands or pre-transcribed audio).
    Otherwise, audio is streamed from the transport session.
    """
    pipeline = get_pipeline()

    result = await pipeline.process_voice_turn(
        session_id=session_id,
        transcript_text=req.transcript,
    )

    if result.turn_state.value == "ERROR" and "No active session" in (
        result.error or ""
    ):
        raise HTTPException(status_code=404, detail=result.error)

    # Build UI synchronization action from intent
    ui_action = None
    ui_parameters = None
    if result.intent:
        ui_action = result.intent.intent_name
        ui_parameters = result.intent.parameters

    return VoiceTurnResponse(
        turn_id=result.turn_id,
        transcript=result.transcript,
        intent_name=(
            result.intent.intent_name if result.intent else None
        ),
        plan_id=result.plan_id,
        spoken_response=result.spoken_response,
        turn_state=result.turn_state.value,
        was_interrupted=result.was_interrupted,
        was_cancelled=result.was_cancelled,
        requires_confirmation=result.requires_confirmation,
        confirmation_message=result.confirmation_message,
        error=result.error,
        audit_event_id=result.audit_event_id,
        ui_action=ui_action,
        ui_parameters=ui_parameters,
    )


@router.post("/session/{session_id}/interrupt")
async def handle_interruption(
    session_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Handle investigator barge-in interruption.
    Cancels TTS, halts audio output, transitions to LISTENING.
    """
    pipeline = get_pipeline()
    result = await pipeline.handle_interruption(session_id)
    return result


@router.post("/session/{session_id}/cancel")
async def cancel_voice_turn(
    session_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """Cancel the current voice turn."""
    pipeline = get_pipeline()
    result = await pipeline.cancel_turn(session_id)
    return result


@router.get(
    "/session/{session_id}/status",
    response_model=VoiceSessionStatusResponse,
)
async def get_session_status(
    session_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """Get the current status of a voice session."""
    pipeline = get_pipeline()
    status = pipeline.get_session_status(session_id)

    if not status:
        raise HTTPException(
            status_code=404,
            detail=f"Voice session not found: {session_id}",
        )

    return VoiceSessionStatusResponse(**status)


@router.post("/session/{session_id}/close")
async def close_voice_session(
    session_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """Close a voice session and release transport resources."""
    pipeline = get_pipeline()
    await pipeline.close_voice_session(session_id)
    return {"status": "closed", "session_id": session_id}
