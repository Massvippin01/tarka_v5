from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4
from pydantic import BaseModel, Field

from app.domain.interaction import ActionRiskClass, ToolDefinition
from app.services.audit_service import AuditService
from app.services.governance.legal_authority_registry import LegalAuthorityRegistry

logger = logging.getLogger("sentinelx.governance.policy_gateway")


class PolicyDecision(BaseModel):
    """
    Immutable audit record representing an evaluated 7-factor policy authorization decision.
    """
    decision_id: str = Field(default_factory=lambda: f"DEC-{uuid4().hex[:8]}")
    policy_version: str = "2026.1"
    allowed: bool
    requires_confirmation: bool = False
    confirmation_challenge_id: Optional[str] = None
    reason: str
    authorization_context: Dict[str, Any]
    tool: str
    risk_class: ActionRiskClass
    authority_code: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())


class PolicyGateway:
    """
    7-Factor Governance Gateway.
    Evaluates: Role + Clearance + Case Scope + Jurisdiction + Operational Purpose + Tool Authorization + Action Risk Class.
    CRITICAL RULE: The LLM or reasoning provider can NEVER directly authorize tools.
    All invocations must pass this gateway.
    """
    _instance: Optional[PolicyGateway] = None

    CLEARANCE_HIERARCHY: Dict[str, int] = {
        "UNCLASSIFIED": 0,
        "INTERNAL": 1,
        "CONFIDENTIAL": 2,
        "RESTRICTED": 3,
        "SECRET": 4,
        "TOP_SECRET": 5,
    }

    def __init__(self) -> None:
        self.audit_service = AuditService.get_instance()
        self.authority_registry = LegalAuthorityRegistry.get_instance()
        self.decisions: List[PolicyDecision] = []

    @classmethod
    def get_instance(cls) -> PolicyGateway:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def evaluate(
        self,
        tool_def: ToolDefinition,
        officer_role: str,
        officer_clearance: str,
        case_id: str,
        allowed_cases: List[str],
        jurisdiction: str,
        allowed_jurisdictions: List[str],
        operational_purpose: str,
        confirmation_token: Optional[str] = None,
    ) -> PolicyDecision:
        auth_context = {
            "officer_role": officer_role,
            "officer_clearance": officer_clearance,
            "case_id": case_id,
            "allowed_cases": allowed_cases,
            "jurisdiction": jurisdiction,
            "allowed_jurisdictions": allowed_jurisdictions,
            "operational_purpose": operational_purpose,
            "has_confirmation_token": bool(confirmation_token),
        }

        # 1. Operational Purpose Factor
        if not operational_purpose or len(operational_purpose.strip()) < 5:
            decision = PolicyDecision(
                allowed=False,
                reason="OPERATIONAL_PURPOSE_REQUIRED: A valid operational reason must be supplied for this investigation action.",
                authorization_context=auth_context,
                tool=tool_def.name,
                risk_class=tool_def.risk_class,
            )
            self._record_decision(decision)
            return decision

        # 2. Case Scope Factor
        if tool_def.case_scope_required and allowed_cases and case_id not in allowed_cases:
            decision = PolicyDecision(
                allowed=False,
                reason=f"CASE_SCOPE_VIOLATION: Officer is not assigned to or authorized for case '{case_id}'.",
                authorization_context=auth_context,
                tool=tool_def.name,
                risk_class=tool_def.risk_class,
            )
            self._record_decision(decision)
            return decision

        # 3. Jurisdiction Factor
        if allowed_jurisdictions and jurisdiction not in allowed_jurisdictions:
            decision = PolicyDecision(
                allowed=False,
                reason=f"JURISDICTION_MISMATCH: Action target '{jurisdiction}' is outside officer's authorized operational jurisdictions.",
                authorization_context=auth_context,
                tool=tool_def.name,
                risk_class=tool_def.risk_class,
            )
            self._record_decision(decision)
            return decision

        # 4. Clearance Factor
        user_clearance_rank = self.CLEARANCE_HIERARCHY.get(officer_clearance.upper(), 0)
        tool_clearance_rank = self.CLEARANCE_HIERARCHY.get(tool_def.required_clearance.upper(), 0)
        if user_clearance_rank < tool_clearance_rank:
            decision = PolicyDecision(
                allowed=False,
                reason=f"INSUFFICIENT_CLEARANCE: Tool '{tool_def.name}' requires {tool_def.required_clearance} clearance; officer holds {officer_clearance}.",
                authorization_context=auth_context,
                tool=tool_def.name,
                risk_class=tool_def.risk_class,
            )
            self._record_decision(decision)
            return decision

        # 5. Role Authorization Factor
        if tool_def.required_role != "*" and officer_role != tool_def.required_role:
            # Check supervisor override or role equivalence
            if officer_role not in ["SUPERVISOR", "CASE_ADMINISTRATOR", tool_def.required_role]:
                decision = PolicyDecision(
                    allowed=False,
                    reason=f"ROLE_UNAUTHORIZED: Tool '{tool_def.name}' requires role '{tool_def.required_role}'; officer holds '{officer_role}'.",
                    authorization_context=auth_context,
                    tool=tool_def.name,
                    risk_class=tool_def.risk_class,
                )
                self._record_decision(decision)
                return decision

        # 6. Statutory Authority Factor (if applicable)
        if tool_def.statutory_power_code:
            statutory_spec = self.authority_registry.get_authority(tool_def.statutory_power_code)
            if not statutory_spec:
                decision = PolicyDecision(
                    allowed=False,
                    reason=f"UNKNOWN_STATUTORY_AUTHORITY: Code '{tool_def.statutory_power_code}' is not registered.",
                    authorization_context=auth_context,
                    tool=tool_def.name,
                    risk_class=tool_def.risk_class,
                )
                self._record_decision(decision)
                return decision

            if officer_role not in statutory_spec.permitted_roles and officer_role not in ["SUPERVISOR", "CASE_ADMINISTRATOR"]:
                decision = PolicyDecision(
                    allowed=False,
                    reason=f"STATUTORY_ROLE_DEFICIENCY: Requisition under {statutory_spec.section} requires one of {statutory_spec.permitted_roles}.",
                    authorization_context=auth_context,
                    tool=tool_def.name,
                    risk_class=tool_def.risk_class,
                    authority_code=statutory_spec.code,
                )
                self._record_decision(decision)
                return decision

        # 7. Action Risk Class & Authorized Confirmation
        if tool_def.risk_class == ActionRiskClass.EXECUTE or tool_def.confirmation_required:
            if not confirmation_token:
                challenge_id = f"CHAL-{uuid4().hex[:8]}"
                decision = PolicyDecision(
                    allowed=False,
                    requires_confirmation=True,
                    confirmation_challenge_id=challenge_id,
                    reason=f"CONFIRMATION_REQUIRED: Action '{tool_def.name}' has risk class {tool_def.risk_class} and requires authorized confirmation.",
                    authorization_context=auth_context,
                    tool=tool_def.name,
                    risk_class=tool_def.risk_class,
                    authority_code=tool_def.statutory_power_code,
                )
                self._record_decision(decision)
                return decision

        # Passed all 7 factors
        decision = PolicyDecision(
            allowed=True,
            requires_confirmation=False,
            reason="AUTHORIZED: All 7 governance factors satisfied.",
            authorization_context=auth_context,
            tool=tool_def.name,
            risk_class=tool_def.risk_class,
            authority_code=tool_def.statutory_power_code,
        )
        self._record_decision(decision)
        return decision

    def _record_decision(self, decision: PolicyDecision) -> None:
        self.decisions.append(decision)
        # Record into immutable audit ledger
        self.audit_service.log_access_event(
            user_id=decision.authorization_context.get("officer_role", "UNKNOWN"),
            resource_type=f"TOOL_{decision.tool}",
            action="POLICY_EVALUATION",
            details={
                "decision_id": decision.decision_id,
                "allowed": decision.allowed,
                "risk_class": decision.risk_class.value,
                "reason": decision.reason,
                "tool": decision.tool,
                "authority_code": decision.authority_code,
            },
        )
