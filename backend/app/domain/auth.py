from __future__ import annotations

from datetime import UTC, datetime
from enum import Enum
from typing import List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field


class UserRoleEnum(str, Enum):
    INVESTIGATOR = "INVESTIGATOR"
    SUPERVISOR = "SUPERVISOR"
    ANALYST = "ANALYST"
    FORENSIC_ANALYST = "FORENSIC_ANALYST"
    INTELLIGENCE_OFFICER = "INTELLIGENCE_OFFICER"
    CASE_ADMINISTRATOR = "CASE_ADMINISTRATOR"
    AUDITOR = "AUDITOR"
    SYSTEM_ADMINISTRATOR = "SYSTEM_ADMINISTRATOR"


class AccessPermissionEnum(str, Enum):
    READ_CASE = "READ_CASE"
    READ_ENTITY = "READ_ENTITY"
    READ_EVIDENCE = "READ_EVIDENCE"
    RUN_GRAPH_QUERY = "RUN_GRAPH_QUERY"
    RUN_ANALYTICAL_QUERY = "RUN_ANALYTICAL_QUERY"
    USE_COPILOT = "USE_COPILOT"
    USE_VOICE = "USE_VOICE"
    MODIFY_EVIDENCE = "MODIFY_EVIDENCE"
    DELETE_EVIDENCE = "DELETE_EVIDENCE"
    EXPORT_DATA = "EXPORT_DATA"
    AUDIT_READ = "AUDIT_READ"
    SECURITY_ADMIN = "SECURITY_ADMIN"


class CaseAccessScope(BaseModel):
    allowed_cases: List[str] = Field(default_factory=lambda: ["C102", "C114"])
    jurisdictions: List[str] = Field(default_factory=lambda: ["Delhi NCR / Gurugram"])
    max_sensitivity_clearance: str = "RESTRICTED"  # PUBLIC_DEMO, INTERNAL, RESTRICTED, HIGHLY_RESTRICTED


class UserIdentity(BaseModel):
    user_id: str = Field(..., min_length=1)
    display_name: str
    badge_number: str = "POL-2026-88"
    role: UserRoleEnum = UserRoleEnum.INVESTIGATOR
    organization: str = "Delhi Special Cell / Crime Branch"
    unit: str = "Cyber Crime Investigation Unit"
    scope: CaseAccessScope = Field(default_factory=CaseAccessScope)
    permissions: List[AccessPermissionEnum] = Field(default_factory=list)
    authenticated_at: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

    @property
    def clearance(self) -> str:
        return self.scope.max_sensitivity_clearance if self.scope else "RESTRICTED"

    @property
    def jurisdiction(self) -> str:
        if self.scope and self.scope.jurisdictions:
            return self.scope.jurisdictions[0]
        return self.organization or "Delhi NCR / Special Cell"


class AuthTokenRequest(BaseModel):
    username: str
    password: str = ""


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 3600
    user: UserIdentity
