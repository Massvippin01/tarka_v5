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
            spoken = f"Agent finding: {title}."
            display = title

        else:
            response_type = "SUCCESS"
            if execution_result.ui_actions:
                action_names = [a.action_type.value for a in execution_result.ui_actions]
                spoken = f"Action executed: {', '.join(action_names)}."
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

    def plan_ambiguity_response(
        self,
        session_id: str,
        turn_id: str,
        transcript_text: str,
    ) -> VoiceResponse:
        """Formulate response for an ambiguous voice request."""
        spoken = f"Command ambiguous. Please specify your investigative request for '{transcript_text}'."
        return VoiceResponse(
            response_id=f"VR-AMB-{uuid4().hex[:8]}",
            session_id=session_id,
            turn_id=turn_id,
            response_type="AMBIGUITY",
            spoken_text=spoken,
            display_text=spoken,
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
