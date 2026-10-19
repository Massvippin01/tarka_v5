from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from app.domain.voice import (
    VoiceCommandRequest,
    VoiceCommandResponse,
    VoiceInterpretation,
    VoiceStateEnum,
)
from app.services.audit_service import AuditService
from app.services.realtime_dispatcher import RealtimeDispatcher

logger = logging.getLogger("sentinelx.voice")


class VoiceInterpreterService:
    def __init__(self):
        self.audit_service = AuditService.get_instance()
        self.dispatcher = RealtimeDispatcher.get_instance()

    def process_command(self, req: VoiceCommandRequest) -> VoiceCommandResponse:
        t_lower = req.transcript.strip().lower()

        # Bounded Command Taxonomy Parsing
        intent = "NAVIGATE"
        action = "FOCUS_ENTITY"
        params: Dict[str, Any] = {}
        conf = 0.95
        requires_confirm = False
        risk_level = "LOW"
        confirm_msg = None

        # 1. Navigation / Focus Commands
        if "open case c102" in t_lower or "c102" in t_lower:
            action = "OPEN_CASE"
            params = {"case_id": "C102"}
        elif "open case c481" in t_lower or "c481" in t_lower:
            action = "OPEN_CASE"
            params = {"case_id": "C481"}
        elif "find p001" in t_lower or "vikram singh" in t_lower or "p001" in t_lower:
            action = "FOCUS_ENTITY"
            params = {"entity_id": "P001"}
        elif "find p044" in t_lower or "rahul verma" in t_lower or "p044" in t_lower:
            action = "FOCUS_ENTITY"
            params = {"entity_id": "P044"}
        elif "relationship" in t_lower or "between p001 and ph002" in t_lower:
            action = "FOCUS_RELATIONSHIP"
            params = {"rel_id": "rel-p1-p2"}

        # 2. View Mode Toggles
        elif "gis" in t_lower or "map" in t_lower:
            action = "SWITCH_MODE"
            params = {"mode": "GIS"}
        elif "3d" in t_lower:
            action = "SWITCH_MODE"
            params = {"mode": "3D"}
        elif "2d" in t_lower or "graph" in t_lower:
            action = "SWITCH_MODE"
            params = {"mode": "2D"}

        # 3. Rail & Inspector Views
        elif "contradiction" in t_lower:
            action = "SHOW_CONTRADICTIONS"
            params = {"tab": "gaps"}
        elif "gap" in t_lower:
            action = "SHOW_GAPS"
            params = {"tab": "gaps"}
        elif "intelligence" in t_lower or "signal" in t_lower:
            action = "SHOW_INTELLIGENCE"
            params = {"tab": "signals"}

        # 4. Copilot Command
        elif "copilot" in t_lower or "ask" in t_lower:
            intent = "COPILOT"
            action = "ASK_COPILOT"
            params = {"query": req.transcript}

        # 5. High-Risk Action Guardrail
        elif "delete" in t_lower or "modify" in t_lower or "remove" in t_lower:
            intent = "MODIFY_RECORD"
            action = "DELETE_RECORD"
            requires_confirm = True
            risk_level = "HIGH"
            confirm_msg = f"Confirmation required: High-risk action '{t_lower.upper()}'."

        interpretation = VoiceInterpretation(
            intent=intent,
            action=action,
            parameters=params,
            confidence=conf,
            requires_confirmation=requires_confirm,
            risk_level=risk_level,
            confirmation_message=confirm_msg,
        )

        exec_status = "CONFIRMATION_REQUIRED" if requires_confirm else "SUCCESS"
        state = VoiceStateEnum.CONFIRMATION_REQUIRED if requires_confirm else VoiceStateEnum.COMPLETED

        # Log Audit Event
        audit_entry = self.audit_service.log_query_event(
            query=f"VOICE: {req.transcript}",
            scope={"case": req.active_case_id, "intent": intent, "action": action},
            tools_invoked=["process_voice_command"],
            records_accessed=list(params.values()),
            response_id=req.command_id,
            verification_rate=1.0,
        )

        # Publish Realtime Event
        ev = self.dispatcher.publish_event(
            event_type="VOICE_COMMAND_EXECUTED",
            payload={
                "command_id": req.command_id,
                "transcript": req.transcript,
                "action": action,
                "parameters": params,
                "execution_status": exec_status,
            },
            case_id=req.active_case_id or "C102",
        )

        return VoiceCommandResponse(
            command_id=req.command_id,
            transcript=req.transcript,
            state=state,
            interpretation=interpretation,
            execution_status=exec_status,
            resulting_domain_events=[ev.event_id],
            audit_event_id=audit_entry["audit_id"],
        )
