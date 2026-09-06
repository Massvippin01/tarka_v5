from __future__ import annotations

import logging
from typing import Dict, Optional
from fastapi import HTTPException
from app.domain.auth import (
    AccessPermissionEnum,
    CaseAccessScope,
    UserIdentity,
    UserRoleEnum,
)

logger = logging.getLogger("sentinelx.auth")


class AuthService:
    _instance: Optional[AuthService] = None

    def __init__(self):
        # Pre-configured Synthetic User Directory
        self.users: Dict[str, UserIdentity] = {
            "INVESTIGATOR_DELHI": UserIdentity(
                user_id="usr-delhi-01",
                display_name="Insp. Vikramaditya (Delhi Cell)",
                badge_number="POL-DEL-102",
                role=UserRoleEnum.INVESTIGATOR,
                organization="Delhi Police Special Cell",
                unit="Cyber Financial Crime Unit",
                scope=CaseAccessScope(
                    allowed_cases=["C102", "C114"],
                    jurisdictions=["Delhi NCR / Gurugram"],
                    max_sensitivity_clearance="RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.RUN_GRAPH_QUERY,
                    AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                    AccessPermissionEnum.USE_COPILOT,
                    AccessPermissionEnum.USE_VOICE,
                ],
            ),
            "INVESTIGATOR_GURUGRAM": UserIdentity(
                user_id="usr-gurugram-01",
                display_name="Insp. Rajesh Sharma (Gurugram Crime)",
                badge_number="POL-GUR-481",
                role=UserRoleEnum.INVESTIGATOR,
                organization="Haryana Police Crime Branch",
                unit="Cyber Crime Police Station Gurugram",
                scope=CaseAccessScope(
                    allowed_cases=["C481", "C512"],
                    jurisdictions=["Gurugram / Haryana"],
                    max_sensitivity_clearance="RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.RUN_GRAPH_QUERY,
                    AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                    AccessPermissionEnum.USE_COPILOT,
                    AccessPermissionEnum.USE_VOICE,
                ],
            ),
            "SUPERVISOR_NCR": UserIdentity(
                user_id="usr-supervisor-01",
                display_name="ACP S. K. Verma (NCR Joint Task Force)",
                badge_number="POL-NCR-001",
                role=UserRoleEnum.SUPERVISOR,
                organization="National Crime Records Bureau / Joint TF",
                unit="Inter-State Cyber Intelligence Cell",
                scope=CaseAccessScope(
                    allowed_cases=["C102", "C114", "C481", "C512", "C201"],
                    jurisdictions=["Delhi NCR / Gurugram", "Gurugram / Haryana", "National"],
                    max_sensitivity_clearance="HIGHLY_RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.RUN_GRAPH_QUERY,
                    AccessPermissionEnum.RUN_ANALYTICAL_QUERY,
                    AccessPermissionEnum.USE_COPILOT,
                    AccessPermissionEnum.USE_VOICE,
                    AccessPermissionEnum.MODIFY_EVIDENCE,
                    AccessPermissionEnum.EXPORT_DATA,
                ],
            ),
            "AUDITOR": UserIdentity(
                user_id="usr-auditor-01",
                display_name="Director M. K. Rao (Governance Auditor)",
                badge_number="AUD-NAT-99",
                role=UserRoleEnum.AUDITOR,
                organization="National Intelligence Governance Oversight",
                unit="Compliance & Provenance Audit Bureau",
                scope=CaseAccessScope(
                    allowed_cases=["C102", "C114", "C481", "C512", "C201"],
                    jurisdictions=["National"],
                    max_sensitivity_clearance="HIGHLY_RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.READ_CASE,
                    AccessPermissionEnum.READ_ENTITY,
                    AccessPermissionEnum.READ_EVIDENCE,
                    AccessPermissionEnum.AUDIT_READ,
                ],
            ),
            "SYSTEM_ADMIN": UserIdentity(
                user_id="usr-admin-01",
                display_name="Admin Systems Engineer",
                badge_number="SYS-ADM-00",
                role=UserRoleEnum.SYSTEM_ADMINISTRATOR,
                organization="SentinelX Infrastructure Team",
                unit="Platform Operations",
                scope=CaseAccessScope(
                    allowed_cases=["C102", "C114", "C481"],
                    jurisdictions=["National"],
                    max_sensitivity_clearance="HIGHLY_RESTRICTED",
                ),
                permissions=[
                    AccessPermissionEnum.SECURITY_ADMIN,
                    AccessPermissionEnum.AUDIT_READ,
                ],
            ),
        }

    @classmethod
    def get_instance(cls) -> AuthService:
        if cls._instance is None:
            cls._instance = AuthService()
        return cls._instance

    def authenticate_token(self, token: Optional[str]) -> UserIdentity:
        if not token:
            # Default to INVESTIGATOR_DELHI for backward compatibility in local dev
            return self.users["INVESTIGATOR_DELHI"]

        token_clean = token.replace("Bearer ", "").strip()
        if token_clean in self.users:
            return self.users[token_clean]

        # Check if user_id matches
        for user in self.users.values():
            if user.user_id == token_clean:
                return user

        return self.users["INVESTIGATOR_DELHI"]

    def validate_case_scope(self, user: UserIdentity, case_id: str) -> bool:
        # SUPERVISOR, AUDITOR, or user with allowed_cases match
        if user.role in [UserRoleEnum.SUPERVISOR, UserRoleEnum.AUDITOR, UserRoleEnum.SYSTEM_ADMINISTRATOR]:
            return True
        return case_id in user.scope.allowed_cases

    def has_permission(self, user: UserIdentity, permission: AccessPermissionEnum) -> bool:
        if user.role == UserRoleEnum.SYSTEM_ADMINISTRATOR and permission == AccessPermissionEnum.SECURITY_ADMIN:
            return True
        return permission in user.permissions

    def enforce_case_access(self, user: UserIdentity, case_id: str):
        if not self.validate_case_scope(user, case_id):
            raise HTTPException(
                status_code=403,
                detail=f"ACCESS_DENIED: User '{user.user_id}' ({user.role}) is not authorized to access case '{case_id}' under jurisdiction scope.",
            )
