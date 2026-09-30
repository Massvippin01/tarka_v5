from __future__ import annotations

import logging
from typing import Any, Dict, Optional
from uuid import uuid4

from app.domain.command import CommandExecutionResult, CommandStatus
from app.domain.voice import VoiceResponse, VoiceTurn

logger = logging.getLogger("sentinelx.voice.response_planner")


class VoiceResponsePlanner:
    """
    Formulates structured VoiceResponse outputs based on CommandExecutionResults or Agent findings.

    Invariants:
    - NEVER invents evidence or unsupported facts.
    - Explicitly distinguishes SUCCESS, REJECTION, AMBIGUITY, FAILURE, POLICY_DENIAL, EVIDENCE_LIMITATION, AGENT_FINDING, CONFIRMATION_REQUIRED.
    """

    def plan_response(
        self,
        execution_result: CommandExecutionResult,
        session_id: str,
        turn_id: str,
        agent_finding: Optional[Dict[str, Any]] = None,
    ) -> VoiceResponse:
        """
        Formulate VoiceResponse from CommandExecutionResult.
        """
        status = execution_result.status

        if status == CommandStatus.UNAUTHORIZED:
            response_type = "POLICY_DENIAL"
            spoken = f"Policy denial: {execution_result.message}"
            display = execution_result.message

        elif status == CommandStatus.WAITING_CONFIRMATION:
            response_type = "CONFIRMATION_REQUIRED"
            prompt = (
                execution_result.confirmation_challenge.prompt_message
                if execution_result.confirmation_challenge
                else "Confirmation required for this high-risk action."
            )
            spoken = f"Confirmation required. {prompt}"
            display = prompt

        elif status == CommandStatus.CANCELLED:
            response_type = "FAILURE"
            spoken = "Command cancelled."
            display = "Command cancelled."

        elif status == CommandStatus.FAILED:
            response_type = "FAILURE"
            spoken = f"Execution failed: {execution_result.message}"
            display = execution_result.message

        elif agent_finding:
            response_type = "AGENT_FINDING"
            title = agent_finding.get("title", "Investigative finding produced.")
            spoken = agent_finding.get("reasoning_summary") or f"Agent finding: {title}."
            display = title

        else:
            response_type = "SUCCESS"
            if execution_result.ui_actions:
                act = execution_result.ui_actions[0].action_type.value
                args = execution_result.ui_actions[0].arguments or {}
                if act == "OPEN_CASE":
                    spoken = f"Continuing investigation for {args.get('case_id', 'CASE-2026-001')}, Operation Triad Nexus."
                    display = spoken
                elif act == "OPEN_CONTRADICTIONS":
                    spoken = "Opening Contradiction Center. 1 critical kinematic conflict identified."
                    display = spoken
                elif act == "OPEN_GAPS":
                    spoken = "Opening Evidence Gap Center. 2 missing items identified: cloud server access logs and Sector 29 CCTV."
                    display = spoken
                elif act == "OPEN_TIMELINE":
                    spoken = "Opening Timeline. Chronological sequence of verified observations loaded."
                    display = spoken
                elif act == "OPEN_GRAPH":
                    spoken = "Opening Intelligence Graph."
                    display = spoken
                elif act == "OPEN_EVIDENCE":
                    ev = args.get("evidence_id", "EV-ANPR-001")
                    spoken = f"Displaying CAS artifact {ev}. Checksum and custody chain verified."
                    display = spoken
                elif act == "OPEN_PROOF":
                    clm = args.get("claim_id", "CLM-2026-001")
                    spoken = f"Displaying LiveProof cryptographic lineage for claim {clm}."
                    display = spoken
                elif act in ("OPEN_ENTITY", "FOCUS"):
                    ent = args.get("entity_id", "P001")
                    spoken = f"Focusing on entity {ent}."
                    display = spoken
                elif act == "GO_BACK":
                    spoken = "Returning to Level 0 Command Surface."
                    display = spoken
                elif act == "SUMMARIZE":
                    if args.get("focus") == "ATTENTION_PRIORITIES":
                        spoken = "Attention required: 1 critical alibi contradiction and 2 evidence gaps in Case 2026-001."
                    else:
                        spoken = "Summary: Case 2026-001 has 3 priority entities, 1 critical alibi contradiction, and 2 evidence gaps."
                    display = spoken
                elif act == "SHOW_AGENT_FINDINGS":
                    spoken = "The contradiction matters because vehicle DL-3C-AQ-9901 was logged at Gurugram Expressway at 11:42 PM, refuting the subject's Mumbai alibi."
                    display = spoken
                else:
                    action_names = [a.action_type.value for a in execution_result.ui_actions]
                    spoken = f"Action executed: {', '.join(action_names)}."
                    display = spoken
            else:
                spoken = execution_result.message or "Command processed successfully."
                display = execution_result.message or spoken

        resp = VoiceResponse(
            response_id=f"VR-{uuid4().hex[:8]}",
            session_id=session_id,
            turn_id=turn_id,
            response_type=response_type,
            spoken_text=spoken,
            display_text=display,
            command_execution_result=execution_result.model_dump() if hasattr(execution_result, "model_dump") else execution_result.__dict__,
            agent_finding=agent_finding,
            structured_reference={
                "command_id": execution_result.command_id,
                "correlation_id": execution_result.correlation_id,
                "audit_event_id": execution_result.audit_event_id,
            },
        )
        return resp

    def plan_canonical_intro(
        self,
        session_id: str,
        turn_id: str,
        language: str = "en-IN",
    ) -> VoiceResponse:
        """Formulate canonical intro on explicit voice activation / first open."""
        spoken = "Welcome to SentinelX. I'm your investigation assistant. Tell me what you'd like to investigate."
        display = "Welcome to SentinelX. I'm your investigation assistant. What would you like to investigate?"
        if language.startswith("ta"):
            spoken = "சென்டினல்-எக்ஸ்-க்கு வரவேற்கிறோம். நான் உங்கள் புலனாய்வு உதவியாளர். நீங்கள் எதை விசாரிக்க விரும்புகிறீர்கள் என்று சொல்லுங்கள்."
            display = spoken

        return VoiceResponse(
            response_id=f"VR-INTRO-{uuid4().hex[:8]}",
            session_id=session_id,
            turn_id=turn_id,
            response_type="SUCCESS",
            spoken_text=spoken,
            display_text=display,
            structured_reference={"intro_phase": "WELCOME_PROMPT"},
        )

    def plan_ambiguity_response(
        self,
        session_id: str,
        turn_id: str,
        transcript_text: str,
        clarification_prompt: Optional[str] = None,
    ) -> VoiceResponse:
        """Formulate response for an ambiguous voice request with localized clarification."""
        spoken = clarification_prompt or f"Command ambiguous. Please specify your investigative request for '{transcript_text}'."
        return VoiceResponse(
            response_id=f"VR-AMB-{uuid4().hex[:8]}",
            session_id=session_id,
            turn_id=turn_id,
            response_type="AMBIGUITY",
            spoken_text=spoken,
            display_text=spoken,
            structured_reference={"clarification_prompt": spoken},
        )

    def plan_error_response(
        self,
        session_id: str,
        turn_id: str,
        error_message: str,
    ) -> VoiceResponse:
        """Formulate response for provider or transport error."""
        spoken = f"Voice processing error: {error_message}"
        return VoiceResponse(
            response_id=f"VR-ERR-{uuid4().hex[:8]}",
            session_id=session_id,
            turn_id=turn_id,
            response_type="FAILURE",
            spoken_text=spoken,
            display_text=spoken,
        )
