"""
TARKA Authentication API — Google Two-Account OAuth2 & Session Lifecycle.

Enforces:
- Google ID token verification (signature, issuer, audience, expiry, verified email)
- Strict two-account allowlist (DEMO_ADMIN_EMAIL -> SUPER_ADMIN, DEMO_TESTER_EMAIL -> INVESTIGATOR_QA)
- Case-level scope enforcement and RBAC authorization
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.domain.auth import UserIdentity, UserRoleEnum
from app.services.auth_service import AuthService, get_current_user

logger = logging.getLogger("tarka.api.auth")
router = APIRouter(prefix="", tags=["Authentication"])


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., description="Google OAuth2 / OIDC ID token string")


class GoogleAuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_seconds: int
    user_id: str
    email: str
    display_name: str
    role: str
    organization: str
    unit: str
    allowed_cases: List[str]
    permissions: List[str]


class UserProfileResponse(BaseModel):
    user_id: str
    display_name: str
    badge_number: str
    role: str
    organization: str
    unit: str
    clearance: str
    allowed_cases: List[str]
    permissions: List[str]


@router.post("/google", response_model=GoogleAuthResponse)
async def authenticate_google(request: GoogleAuthRequest) -> GoogleAuthResponse:
    """
    Authenticate investigator or administrator using Google ID token.
    Fails closed if token signature, issuer, audience, or allowlist checks fail.
    """
    auth_service = AuthService.get_instance()
    jwt_token, user, claims = auth_service.authenticate_google_user(request.id_token)

    return GoogleAuthResponse(
        access_token=jwt_token,
        token_type="bearer",
        expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user_id=user.user_id,
        email=claims.get("email", ""),
        display_name=user.display_name,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        organization=user.organization,
        unit=user.unit,
        allowed_cases=user.scope.allowed_cases if user.scope else [],
        permissions=[p.value if hasattr(p, "value") else str(p) for p in user.permissions],
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(user: UserIdentity = Depends(get_current_user)) -> UserProfileResponse:
    """
    Return currently authenticated user identity and RBAC permissions.
    """
    return UserProfileResponse(
        user_id=user.user_id,
        display_name=user.display_name,
        badge_number=user.badge_number,
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        organization=user.organization,
        unit=user.unit,
        clearance=user.clearance,
        allowed_cases=user.scope.allowed_cases if user.scope else [],
        permissions=[p.value if hasattr(p, "value") else str(p) for p in user.permissions],
    )


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    Revoke currently active session token.
    """
    if not authorization:
        raise HTTPException(status_code=400, detail="Missing Authorization header")
    token_clean = authorization.replace("Bearer ", "").strip()
    auth_service = AuthService.get_instance()
    revoked = auth_service.revoke_jwt_token(token_clean)
    return {"status": "success", "revoked": revoked}
