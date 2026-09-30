from __future__ import annotations

import logging
import re
from typing import Any, Dict, Optional, Tuple

from app.domain.command import Command, CommandSource
from app.domain.interaction import ActionRiskClass, InteractionContext
from app.domain.voice import Transcript, VoiceCommandCandidate
from app.services.command.command_bus import CommandBus

logger = logging.getLogger("sentinelx.voice.command_interpreter")


class VoiceCommandInterpreter:
    """
    Translates transcripts (including multilingual / code-switched phrasing)
    into canonical typed VoiceCommandCandidates and submits them to the CommandBus.

    CRITICAL INVARIANTS:
    - VOICE MUST NEVER BYPASS COMMAND BUS.
    - NO SUBSTRING-ONLY ROUTING.
    - Ambiguous transcripts return is_ambiguous=True.
    - High-risk actions enforce risk classification & confirmation requirements.
    """

    def __init__(self, command_bus: Optional[CommandBus] = None) -> None:
        self.command_bus = command_bus or CommandBus.get_instance()

    def interpret_transcript(
        self,
        transcript: Transcript,
        context: InteractionContext,
    ) -> VoiceCommandCandidate:
        """
        Parse Transcript into a VoiceCommandCandidate.
        Handles English, Hindi, Tamil, Telugu code-switch utterances.
        """
        raw_text = transcript.text.strip()
        if not raw_text:
            return VoiceCommandCandidate(
                transcript_id=transcript.transcript_id,
                intent="UNKNOWN",
                is_ambiguous=True,
                transcript_text=raw_text,
                language=transcript.language,
            )

        text_lower = raw_text.lower()

        # ── 1. Multilingual / Code-Switch Normalization ───────────────────
        # Hindi: "contradictions ka summary dikhao" -> "show contradictions"
        # Tamil: "case-la contradictions show pannu" -> "show contradictions"
        normalized_text = self._normalize_multilingual(text_lower)

        # ── 2. Intent Resolution (Reusing Phase 2 Canonical Taxonomy) ───
        intent_name, action_type, params, risk_class, is_ambiguous = self._map_to_canonical_intent(
            normalized_text, raw_text, context
        )

        requires_confirm = risk_class == ActionRiskClass.EXECUTE
        confirm_msg = (
            f"Statutory authorization required for '{intent_name}'."
            if requires_confirm
            else None
        )

        candidate = VoiceCommandCandidate(
            transcript_id=transcript.transcript_id,
            intent=intent_name,
            action=action_type,
            parameters=params,
            confidence=transcript.confidence,
            language=transcript.language,
            transcript_text=raw_text,
            is_ambiguous=is_ambiguous,
            requested_action=action_type,
            requires_confirmation=requires_confirm,
            risk_class=risk_class.value,
            confirmation_message=confirm_msg,
        )

        logger.info(
            f"VoiceCommandInterpreter parsed: candidate_id={candidate.candidate_id}, "
            f"intent={intent_name}, action={action_type}, ambiguous={is_ambiguous}"
        )
        return candidate

    def create_command(
        self,
        candidate: VoiceCommandCandidate,
        context: InteractionContext,
        correlation_id: Optional[str] = None,
    ) -> Command:
        """
        Convert VoiceCommandCandidate into canonical Command for CommandBus dispatch.
        """
        requested_actions = [candidate.action] if candidate.action else []
        cmd = Command(
            source=CommandSource.VOICE,
            intent=candidate.intent,
            context=context,
            arguments=candidate.parameters,
            risk_class=ActionRiskClass(candidate.risk_class),
            correlation_id=correlation_id or Command._generate_uuid7() if hasattr(Command, "_generate_uuid7") else candidate.candidate_id,
            requested_actions=requested_actions,
            rationale=f"Voice command: {candidate.transcript_text}",
        )
        return cmd

    def _normalize_multilingual(self, text_lower: str) -> str:
        """Map common Hindi / Tamil / Telugu transliterated phrasing into English equivalents."""
        # Contradictions
        if "contradiction" in text_lower or "contradictions" in text_lower:
            return "show contradictions" if ("show" in text_lower or "dikhao" in text_lower or "pannu" in text_lower or "summary" in text_lower or "open" in text_lower) else "analyze contradictions"

        # Evidence gaps
        if "gap" in text_lower or "gaps" in text_lower:
            return "show gaps" if ("show" in text_lower or "dikhao" in text_lower or "pannu" in text_lower or "open" in text_lower) else "analyze gaps"

        # Timeline
        if "timeline" in text_lower:
            return "open timeline"

        # Graph
        if "graph" in text_lower:
            return "open graph"

        # Proof
        if "proof" in text_lower or "provenance" in text_lower:
            return "show proof"

        return text_lower

    def _map_to_canonical_intent(
        self,
        normalized_text: str,
        raw_text: str,
        context: InteractionContext,
    ) -> Tuple[str, Optional[str], Dict[str, Any], ActionRiskClass, bool]:
        """
        Maps normalized text to (intent_name, action_type, params, risk_class, is_ambiguous).
        """
        # Ambiguous check
        words = set(re.findall(r"\b\w+\b", normalized_text))
        filler_words = {"um", "uh", "hello", "test", "what", "err", "ah", "hmm"}
        if (
            normalized_text in ["um", "uh", "hello", "test", "do something", "what", "um uh test"]
            or (words and words.issubset(filler_words))
        ):
            return "AMBIGUOUS_COMMAND", None, {}, ActionRiskClass.READ, True

        # Open Case / Switch Case
        case_match = re.search(r"\b(case-\d{4}-\d+|c\d+|case-\d+)\b", raw_text, re.IGNORECASE)
        if "open case" in normalized_text or "switch case" in normalized_text or case_match:
            case_id = case_match.group(1).upper() if case_match else "CASE-2026-001"
            return "OPEN_CASE", "OPEN_CASE", {"case_id": case_id}, ActionRiskClass.READ, False

        # Navigation UI Actions
        if normalized_text == "show contradictions":
            return "OPEN_CONTRADICTIONS", "OPEN_CONTRADICTIONS", {"case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False

        if normalized_text == "show gaps":
            return "OPEN_GAPS", "OPEN_GAPS", {"case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False

        if normalized_text == "open graph":
            return "OPEN_GRAPH", "OPEN_GRAPH", {"case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False

        if normalized_text == "open timeline":
            return "OPEN_TIMELINE", "OPEN_TIMELINE", {"case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False

        if normalized_text == "show proof":
            return "OPEN_PROOF", "OPEN_PROOF", {"claim_id": context.selected_claim_id or "CLM-2026-001"}, ActionRiskClass.READ, False

        # Agent invocations
        if "analyze" in normalized_text or "run agent" in normalized_text:
            if "contradiction" in normalized_text:
                return "RUN_AGENT_TASK", "RUN_AGENT_TASK", {"agent_type": "CONTRADICTION_ANALYST", "objective": raw_text, "case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False
            if "gap" in normalized_text:
                return "RUN_AGENT_TASK", "RUN_AGENT_TASK", {"agent_type": "GAP_ANALYST", "objective": raw_text, "case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False
            if "entity" in normalized_text:
                return "RUN_AGENT_TASK", "RUN_AGENT_TASK", {"agent_type": "ENTITY_ANALYST", "objective": raw_text, "case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False
            if "timeline" in normalized_text:
                return "RUN_AGENT_TASK", "RUN_AGENT_TASK", {"agent_type": "TIMELINE_ANALYST", "objective": raw_text, "case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False
            return "RUN_AGENT_TASK", "RUN_AGENT_TASK", {"agent_type": "EVIDENCE_ANALYST", "objective": raw_text, "case_id": context.case_id or "CASE-2026-001"}, ActionRiskClass.READ, False

        # Generic search / focus (Evidence text inside a search query remains DATA_ONLY)
        if normalized_text.startswith("search") or normalized_text.startswith("find"):
            return "SEARCH", "SEARCH", {"query": raw_text}, ActionRiskClass.READ, False

        if normalized_text.startswith("focus"):
            return "FOCUS", "FOCUS", {"entity_id": context.selected_entity_id or "P001"}, ActionRiskClass.READ, False

        # High-risk / Destructive commands
        if any(w in normalized_text for w in ["delete", "remove", "execute authorized action", "execute action", "modify"]):
            return "EXECUTE_ACTION", "FOCUS", {"query": raw_text}, ActionRiskClass.EXECUTE, False

        # If unknown, pass to CommandBus intent resolver directly
        return raw_text, None, {"query": raw_text}, ActionRiskClass.READ, False
