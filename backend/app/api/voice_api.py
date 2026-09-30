from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.domain.auth import UserIdentity
from app.domain.voice import VoiceResponse
from app.services.auth_service import AuthService
from app.services.voice.voice_gateway import VoiceGateway

logger = logging.getLogger("sentinelx.api.voice")

router = APIRouter()


def get_gateway() -> VoiceGateway:
    """Get the VoiceGateway singleton."""
    return VoiceGateway.get_instance()


def get_current_user(
    authorization: Optional[str] = Header(None),
) -> UserIdentity:
    auth_service = AuthService.get_instance()
    return auth_service.authenticate_token(authorization)


# ────────────────────────────────────────────────────────────────────
# Request / Response Schemas
# ────────────────────────────────────────────────────────────────────

class VoiceSessionCreateRequest(BaseModel):
    case_id: str = "CASE-2026-001"
    jurisdiction: str = "Delhi NCR / Special Cell"
    operating_context_id: str = "CTX-DEFAULT"
    language: str = "en-IN"


class VoiceSessionCreateResponse(BaseModel):
    session_id: str
    transport_url: str
    access_token: str
    room_name: str
    participant_identity: str
    expires_in_seconds: int = 3600


class VoiceTurnRequest(BaseModel):
    transcript: Optional[str] = None
    language_hint: str = "en-IN"


# ────────────────────────────────────────────────────────────────────
# Endpoints
# ────────────────────────────────────────────────────────────────────

@router.post("/session", response_model=VoiceSessionCreateResponse)
@router.post("/session/create", response_model=VoiceSessionCreateResponse)
async def create_voice_session(
    req: VoiceSessionCreateRequest,
    user: UserIdentity = Depends(get_current_user),
):
    """Create a new voice session bound to OperatingContext and issue WebRTC token."""
    gateway = get_gateway()
    session, transport = await gateway.create_voice_session(
        user=user,
        case_id=req.case_id,
        operating_context_id=req.operating_context_id,
        jurisdiction=req.jurisdiction,
        language=req.language,
    )

    return VoiceSessionCreateResponse(
        session_id=session.session_id,
        transport_url=transport.get("transport_url", ""),
        access_token=transport.get("access_token", ""),
        room_name=transport.get("room_name", ""),
        participant_identity=user.user_id,
    )


@router.post("/token")
async def issue_voice_token(
    case_id: str = "CASE-2026-001",
    user: UserIdentity = Depends(get_current_user),
):
    """Issue WebRTC LiveKit token for authenticated investigator."""
    gateway = get_gateway()
    _, transport = await gateway.create_voice_session(
        user=user,
        case_id=case_id,
    )
    return transport


@router.post("/session/{session_id}/turn", response_model=VoiceResponse)
@router.post("/command", response_model=VoiceResponse)
async def process_voice_turn(
    session_id: Optional[str] = None,
    req: Optional[VoiceTurnRequest] = None,
    transcript: Optional[str] = None,
    user: UserIdentity = Depends(get_current_user),
):
    """
    Process voice turn or command transcript through the canonical CommandBus pipeline.
    """
    gateway = get_gateway()
    target_session_id = session_id or "VS-DEFAULT"

    # If session doesn't exist, auto-create one for convenience
    if not gateway.session_manager.get_session(target_session_id):
        sess, _ = await gateway.create_voice_session(user=user)
        target_session_id = sess.session_id

    text = (req.transcript if req and req.transcript else transcript) or transcript

    response = await gateway.process_voice_turn(
        session_id=target_session_id,
        transcript_text=text,
        user=user,
    )
    return response


@router.post("/session/{session_id}/interrupt")
@router.post("/interrupt")
async def handle_interruption(
    session_id: Optional[str] = None,
    user: UserIdentity = Depends(get_current_user),
):
    """Handle barge-in interruption during voice response."""
    gateway = get_gateway()
    target_session_id = session_id or "VS-DEFAULT"
    result = await gateway.handle_interruption(target_session_id)
    return result


@router.get("/session/{session_id}")
@router.get("/session/{session_id}/status")
async def get_session_status(
    session_id: str,
    user: UserIdentity = Depends(get_current_user),
):
    """Get VoiceSession status and state."""
    gateway = get_gateway()
    session = gateway.session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail=f"Voice session '{session_id}' not found.")
    return session.model_dump()


@router.post("/session/{session_id}/close")
@router.post("/close")
async def close_voice_session(
    session_id: Optional[str] = None,
    user: UserIdentity = Depends(get_current_user),
):
    """Close voice session."""
    gateway = get_gateway()
    target_session_id = session_id or "VS-DEFAULT"
    await gateway.close_session(target_session_id)
    return {"status": "CLOSED", "session_id": target_session_id}
