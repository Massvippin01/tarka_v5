from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.domain.auth import UserIdentity
from app.domain.operating_context import (
    ClientEnvironmentReport,
    InteractionModeEnum,
    MicPermissionStateEnum,
    OnboardingActionOption,
    OnboardingIntentEnum,
    OnboardingState,
    OperatingContext,
)
from app.repositories.unified_store import UnifiedStore

logger = logging.getLogger("sentinelx.context")

# Canonical case registry dictionary for human-readable labels
KNOWN_CASES_CATALOG: Dict[str, Dict[str, str]] = {
    "CASE-2026-001": {
        "title": "Operation Triad Nexus",
        "description": "Multi-Source Telecom/ANPR/Hawala cross-jurisdictional syndicate (Golden Case)",
        "jurisdiction": "Delhi NCR / Special Cell",
    },
    "C102": {
        "title": "Hawala Syndicate - NCR",
        "description": "Cross-border illicit hawala money transfer network linking Delhi and Gurugram",
        "jurisdiction": "Delhi NCR / Gurugram",
    },
    "C114": {
        "title": "Inter-State Cyber Fraud Cell",
        "description": "Phishing and SIM-swap banking cybercrime operations across NCR corridors",
        "jurisdiction": "Delhi NCR / Special Cell",
    },
    "C481": {
        "title": "Gurugram Financial Crimes Desk",
        "description": "Corporate mule accounts and fast-moving bank ledger diversion investigation",
        "jurisdiction": "Gurugram / Haryana",
    },
    "C512": {
        "title": "NCR Extortion & Threat Intelligence",
        "description": "Digital extortion ring leveraging VoIP gateway hops and burner devices",
        "jurisdiction": "Gurugram / Haryana",
    },
    "C201": {
        "title": "National Counter-Infiltration Desk",
        "description": "High-clearance interstate organized cybercrime task force operations",
        "jurisdiction": "National",
    },
}


class OperatingContextService:
    """
    Service responsible for negotiating and establishing the operating context
    when an investigator opens SentinelX.
    Prevents unauthorized or silent assumption of investigation state.
    """
    _instance: Optional[OperatingContextService] = None

    def __init__(self, store: Optional[UnifiedStore] = None):
        self.store = store or UnifiedStore.get_instance()
        self.active_contexts: Dict[str, OperatingContext] = {}

    @classmethod
    def get_instance(cls) -> OperatingContextService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def resolve_context(
        self,
        user: UserIdentity,
        client_report: Optional[ClientEnvironmentReport] = None,
        session_id: Optional[str] = None,
        requested_case_id: Optional[str] = None,
    ) -> OperatingContext:
        """
        Safely construct or retrieve the operating context without intrusive device fingerprinting.
        """
        # If existing session ID is valid and cached, re-use and update
        if session_id and session_id in self.active_contexts:
            ctx = self.active_contexts[session_id]
            if requested_case_id and requested_case_id != ctx.current_case_id:
                ctx.current_case_id = requested_case_id
                ctx.is_first_open = False
            return ctx

        # Determine allowed cases based on user scope
        allowed_case_ids = (
            user.scope.allowed_cases
            if user.scope and user.scope.allowed_cases
            else ["CASE-2026-001", "C102"]
        )

        allowed_cases_meta = []
        for cid in allowed_case_ids:
            info = KNOWN_CASES_CATALOG.get(
                cid,
                {"title": f"Case {cid}", "description": "Active police investigation docket", "jurisdiction": "Delhi NCR"},
            )
            allowed_cases_meta.append({
                "case_id": cid,
                "title": info["title"],
                "description": info["description"],
                "jurisdiction": info.get("jurisdiction", "Delhi NCR"),
            })

        # Determine interaction modes
        modes = [
            InteractionModeEnum.KEYBOARD,
            InteractionModeEnum.POINTER,
            InteractionModeEnum.UI_DIRECT,
        ]
        has_mic = False
        mic_state = MicPermissionStateEnum.NOT_REQUESTED

        if client_report:
            has_mic = client_report.has_audio_input
            mic_state = client_report.mic_permission
            if has_mic or mic_state in (MicPermissionStateEnum.GRANTED, MicPermissionStateEnum.PROMPT):
                modes.append(InteractionModeEnum.VOICE)
        else:
            # Default to voice supported capability
            modes.append(InteractionModeEnum.VOICE)

        # Decide whether this is first open
        is_first = True
        actual_case_id = None

        if requested_case_id:
            # Explicit request overrides first-open
            if requested_case_id in allowed_case_ids:
                actual_case_id = requested_case_id
                is_first = False
            else:
                logger.warning("Requested case %s is outside user scope %s", requested_case_id, allowed_case_ids)

        new_ctx = OperatingContext(
            session_id=session_id or f"CTX-{uuid4().hex[:8]}",
            is_authenticated=True,
            investigator_id=user.user_id,
            display_name=user.display_name or "Sworn Investigator",
            badge_number=getattr(user, "badge_number", "POL-DEL-102") or "POL-DEL-102",
            role=user.role.value if hasattr(user.role, "value") else str(user.role),
            clearance=(
                user.scope.max_sensitivity_clearance
                if user.scope and user.scope.max_sensitivity_clearance
                else "RESTRICTED"
            ),
            permissions=[
                p.value if hasattr(p, "value") else str(p) for p in (user.permissions or [])
            ],
            allowed_cases=allowed_cases_meta,
            jurisdiction_scope=(
                user.scope.jurisdictions
                if user.scope and user.scope.jurisdictions
                else ["Delhi NCR / Special Cell"]
            ),
            microphone_state=mic_state,
            supported_interaction_modes=modes,
            current_case_id=actual_case_id,
            current_route="command" if actual_case_id else "onboarding",
            is_first_open=is_first,
        )

        self.active_contexts[new_ctx.session_id] = new_ctx
        return new_ctx

    def get_onboarding_state(self, context: OperatingContext) -> OnboardingState:
        """
        Generate actionable, governed onboarding options for the assistant.
        """
        options: List[OnboardingActionOption] = [
            OnboardingActionOption(
                intent_code=OnboardingIntentEnum.START_INVESTIGATION,
                title="Start Investigation",
                description="Initiate a new forensic docket and register formal statutory scope.",
                suggested_action="CREATE_CASE",
                requires_input=True,
                input_placeholder="Enter FIR / Crime Case reference (e.g. FIR 182/2026 Special Cell)",
                target_route="command",
            ),
            OnboardingActionOption(
                intent_code=OnboardingIntentEnum.OPEN_CASE,
                title="Open Case",
                description="Access an authorized active docket and explore its intelligence graph.",
                suggested_action="OPEN_CASE",
                requires_input=False,
                available_targets=context.allowed_cases,
                target_route="graph",
            ),
            OnboardingActionOption(
                intent_code=OnboardingIntentEnum.SEARCH_ENTITY,
                title="Search Entity",
                description="Query suspect, phone identifier, vehicle tag, or bank account.",
                suggested_action="SEARCH_ENTITY",
                requires_input=True,
                input_placeholder="Enter phone, plate number, person name, or IMEI",
                target_route="search",
            ),
            OnboardingActionOption(
                intent_code=OnboardingIntentEnum.REVIEW_EVIDENCE,
                title="Review Evidence",
                description="Audit ingested CAS forensic artifacts, verify SHA-256 hashes and custody.",
                suggested_action="REVIEW_EVIDENCE",
                requires_input=False,
                target_route="evidence",
            ),
            OnboardingActionOption(
                intent_code=OnboardingIntentEnum.CONTINUE_INVESTIGATION,
                title="Continue Investigation",
                description="Resume the last active docket and inspect recent material changes.",
                suggested_action="CONTINUE_INVESTIGATION",
                requires_input=False,
                available_targets=context.allowed_cases[:1],
                target_route="command",
            ),
            OnboardingActionOption(
                intent_code=OnboardingIntentEnum.OTHER,
                title="Natural Language Objective",
                description="State any complex investigative goal via typed query or authorized voice command.",
                suggested_action="DISPATCH_INTENT",
                requires_input=True,
                input_placeholder="What would you like to investigate? (e.g. 'Identify connections for phone PH002')",
                target_route="command",
            ),
        ]

        default_case = context.allowed_cases[0]["case_id"] if context.allowed_cases else "CASE-2026-001"

        return OnboardingState(
            is_first_open=context.is_first_open,
            greeting_title="Welcome to SentinelX.",
            greeting_prompt="What would you like to investigate?",
            action_options=options,
            default_case_scope=default_case,
            recommended_intent=OnboardingIntentEnum.OPEN_CASE,
        )

    def activate_scope(
        self,
        session_id: str,
        case_id: str,
        route: str = "command",
    ) -> OperatingContext:
        """
        Transitions an onboarding session into an active case scope.
        """
        ctx = self.active_contexts.get(session_id)
        if not ctx:
            raise KeyError(f"Session '{session_id}' not found.")

        # Validate that case is in allowed cases
        allowed_ids = [c["case_id"] for c in ctx.allowed_cases]
        if case_id not in allowed_ids:
            raise PermissionError(f"Case '{case_id}' is outside authorized scope: {allowed_ids}")

        ctx.current_case_id = case_id
        ctx.current_route = route
        ctx.is_first_open = False
        return ctx
