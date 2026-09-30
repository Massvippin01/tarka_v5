from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.domain.agent import AgentType
from app.domain.command import CommandSource, UIActionType
from app.domain.intent import InvestigationDetailLevel, InvestigationIntent
from app.domain.interaction import ActionRiskClass, InteractionContext
from app.domain.voice import VoiceCommandCandidate
from app.services.command.ui_action_registry import UIActionRegistry

logger = logging.getLogger("sentinelx.interaction.intent_normalizer")


class IntentNormalizer:
    """
    CANONICAL INTENT NORMALIZATION & FACTORY SERVICE.

    Normalizes all investigator modalities (VOICE, TEXT/CHAT, UI, KEYBOARD, AGENT)
    into the canonical InvestigationIntent contract, eliminating modality-specific
    divergence and ensuring semantic convergence into CommandBus.
    """

    _instance: Optional[IntentNormalizer] = None

    def __init__(self, registry: Optional[UIActionRegistry] = None) -> None:
        self.registry = registry or UIActionRegistry.get_instance()

    @classmethod
    def get_instance(cls) -> IntentNormalizer:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── 1. UI Modality ──────────────────────────────────────────────────────────

    def from_ui_action(
        self,
        action_type: UIActionType | str,
        arguments: Optional[Dict[str, Any]] = None,
        context: Optional[InteractionContext] = None,
        correlation_id: Optional[str] = None,
    ) -> InvestigationIntent:
        """
        Normalize a direct UI interaction (button click, menu selection, table row click)
        into a canonical InvestigationIntent.
        """
        args = dict(arguments or {})
        ctx = context or InteractionContext()

        if isinstance(action_type, str):
            try:
                act_enum = UIActionType(action_type)
            except ValueError:
                # Custom or unlisted action
                act_enum = None
        else:
            act_enum = action_type

        intent_name = act_enum.value if act_enum else str(action_type)

        target_case = args.get("case_id") or ctx.case_id or "CASE-2026-001"
        target_entity = args.get("entity_id") or ctx.selected_entity_id
        target_evidence = args.get("evidence_id") or ctx.selected_evidence_id
        target_claim = args.get("claim_id") or ctx.selected_claim_id

        # Determine risk class from UIActionRegistry
        risk_class = ActionRiskClass.READ
        if act_enum:
            defn = self.registry.get(act_enum)
            if defn:
                risk_class = defn.risk_class
        requires_confirm = risk_class == ActionRiskClass.EXECUTE
        statutory_code = "BNSS_94" if requires_confirm else None

        intent = InvestigationIntent(
            intent_name=intent_name,
            target_case=target_case,
            target_entity=target_entity,
            target_evidence=target_evidence,
            target_claim=target_claim,
            modality=CommandSource.UI,
            language="en-IN",
            risk_class=risk_class,
            requires_confirmation=requires_confirm,
            statutory_power_code=statutory_code,
            parameters=args,
            confidence=1.0,
            ambiguity=False,
            raw_input=f"UI:{intent_name}",
        )
        if correlation_id:
            intent.correlation_id = correlation_id
        return intent

    # ── 2. Voice Modality ───────────────────────────────────────────────────────

    def from_voice_candidate(
        self,
        candidate: VoiceCommandCandidate,
        context: Optional[InteractionContext] = None,
        correlation_id: Optional[str] = None,
    ) -> InvestigationIntent:
        """
        Normalize a VoiceCommandCandidate into a canonical InvestigationIntent.
        """
        ctx = context or InteractionContext()
        args = dict(candidate.parameters)

        target_case = args.get("case_id") or ctx.case_id or "CASE-2026-001"
        target_entity = args.get("entity_id") or ctx.selected_entity_id
        target_evidence = args.get("evidence_id") or ctx.selected_evidence_id
        target_claim = args.get("claim_id") or ctx.selected_claim_id

        try:
            risk_class = ActionRiskClass(candidate.risk_class)
        except ValueError:
            risk_class = ActionRiskClass.READ

        # If voice command is ambiguous, preserve ambiguity and clarification prompt
        ambiguity = candidate.is_ambiguous or candidate.intent == "UNKNOWN"
        ambiguity_reason = (
            f"Voice command candidate is ambiguous for utterance: '{candidate.transcript_text}'"
            if ambiguity
            else None
        )
        clarification_prompt = (
            f"Could you please clarify your request? Did you want to open the graph, timeline, or contradictions?"
            if ambiguity
            else None
        )

        intent = InvestigationIntent(
            intent_name=candidate.intent,
            target_case=target_case,
            target_entity=target_entity,
            target_evidence=target_evidence,
            target_claim=target_claim,
            modality=CommandSource.VOICE,
            language=candidate.language or "en-IN",
            risk_class=risk_class,
            requires_confirmation=candidate.requires_confirmation,
            parameters=args,
            confidence=candidate.confidence,
            ambiguity=ambiguity,
            ambiguity_reason=ambiguity_reason,
            clarification_prompt=clarification_prompt,
            raw_input=candidate.transcript_text,
        )
        if correlation_id:
            intent.correlation_id = correlation_id
        return intent

    # ── 3. Agent Modality ───────────────────────────────────────────────────────

    def from_agent_task(
        self,
        agent_type: AgentType | str,
        objective: str,
        case_id: str,
        parameters: Optional[Dict[str, Any]] = None,
        context: Optional[InteractionContext] = None,
        correlation_id: Optional[str] = None,
    ) -> InvestigationIntent:
        """
        Normalize an investigative agent task invocation into an InvestigationIntent.
        """
        args = dict(parameters or {})
        ag_type_str = agent_type.value if isinstance(agent_type, AgentType) else str(agent_type)
        args["agent_type"] = ag_type_str
        args["objective"] = objective
        args["case_id"] = case_id

        ctx = context or InteractionContext(case_id=case_id)

        intent = InvestigationIntent(
            intent_name=UIActionType.RUN_AGENT_TASK.value,
            target_case=case_id,
            target_entity=args.get("entity_id") or ctx.selected_entity_id,
            target_evidence=args.get("evidence_id") or ctx.selected_evidence_id,
            modality=CommandSource.AGENT,
            language="en-IN",
            risk_class=ActionRiskClass.ANALYZE,
            parameters=args,
            confidence=1.0,
            ambiguity=False,
            raw_input=f"AGENT:{ag_type_str} - {objective}",
        )
        if correlation_id:
            intent.correlation_id = correlation_id
        return intent

    # ── 4. Keyboard Modality ────────────────────────────────────────────────────

    def from_keyboard_action(
        self,
        shortcut: str,
        context: Optional[InteractionContext] = None,
        arguments: Optional[Dict[str, Any]] = None,
        correlation_id: Optional[str] = None,
    ) -> InvestigationIntent:
        """
        Normalize a keyboard shortcut trigger into an InvestigationIntent.
        """
        ctx = context or InteractionContext()
        args = dict(arguments or {})

        key_normalized = shortcut.strip().lower()

        # Shortcut mappings
        shortcut_map = {
            "g": UIActionType.OPEN_GRAPH,
            "ctrl+g": UIActionType.OPEN_GRAPH,
            "alt+g": UIActionType.OPEN_GRAPH,
            "t": UIActionType.OPEN_TIMELINE,
            "ctrl+t": UIActionType.OPEN_TIMELINE,
            "alt+t": UIActionType.OPEN_TIMELINE,
            "c": UIActionType.OPEN_CONTRADICTIONS,
            "ctrl+c": UIActionType.OPEN_CONTRADICTIONS,
            "p": UIActionType.OPEN_PROOF,
            "ctrl+p": UIActionType.OPEN_PROOF,
            "e": UIActionType.OPEN_EVIDENCE,
            "ctrl+e": UIActionType.OPEN_EVIDENCE,
            "f": UIActionType.SEARCH,
            "ctrl+f": UIActionType.SEARCH,
            "/": UIActionType.SEARCH,
        }

        act_type = shortcut_map.get(key_normalized)
        if not act_type:
            # Check if shortcut is directly a UIActionType name
            try:
                act_type = UIActionType(shortcut.upper())
            except ValueError:
                act_type = None

        if not act_type:
            return InvestigationIntent(
                intent_name="UNKNOWN_KEYBOARD_SHORTCUT",
                target_case=ctx.case_id,
                modality=CommandSource.KEYBOARD,
                confidence=0.0,
                ambiguity=True,
                ambiguity_reason=f"Unrecognized keyboard shortcut: '{shortcut}'",
                clarification_prompt="Shortcut not bound to an investigative action.",
                raw_input=shortcut,
            )

        intent = self.from_ui_action(
            action_type=act_type,
            arguments=args,
            context=ctx,
            correlation_id=correlation_id,
        )
        intent.modality = CommandSource.KEYBOARD
        intent.raw_input = f"KEYBOARD:{shortcut}"
        return intent

    # ── 5. Text / Chat Modality ─────────────────────────────────────────────────

    def from_text_query(
        self,
        query: str,
        context: Optional[InteractionContext] = None,
        language: str = "en-IN",
        correlation_id: Optional[str] = None,
    ) -> InvestigationIntent:
        """
        Normalize a natural language text / chat query into a canonical InvestigationIntent.
        Detects ambiguous requests and prevents silent guessing.
        """
        raw_text = query.strip()
        ctx = context or InteractionContext()
        text_lower = raw_text.lower()
        args: Dict[str, Any] = {}

        case_id = ctx.case_id or "CASE-2026-001"

        # Explicit Case extraction if present
        case_match = re.search(r"\b(case-\d{4}-\d+|c\d+)\b", text_lower)
        if case_match:
            case_id = case_match.group(1).upper()
            args["case_id"] = case_id

        # 1. Empty or whitespace check
        if not raw_text:
            return InvestigationIntent(
                intent_name="UNKNOWN",
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.0,
                ambiguity=True,
                ambiguity_reason="Empty text query submitted",
                clarification_prompt="Please enter an investigative question or command.",
                raw_input=raw_text,
            )

        # 2. Ambiguity check: Vague pronouns or actions without targets
        vague_phrases = [
            "open it",
            "show details",
            "inspect that",
            "check this",
            "view this",
            "tell me more",
            "analyze that",
            "what about him",
        ]
        if any(text_lower == vp for vp in vague_phrases):
            has_selection = bool(ctx.selected_entity_id or ctx.selected_evidence_id or ctx.selected_claim_id)
            if not has_selection:
                return InvestigationIntent(
                    intent_name="AMBIGUOUS_INSPECTION",
                    target_case=case_id,
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.3,
                    ambiguity=True,
                    ambiguity_reason=f"Query '{raw_text}' is ambiguous without an active entity, evidence, or claim selection.",
                    clarification_prompt="Please select an entity or evidence on canvas, or specify the name or ID in your query.",
                    raw_input=raw_text,
                )

        # 3. Canonical Semantic Mapping
        # Graph
        if re.search(r"\b(open\s+(the\s+)?graph|show\s+graph|intelligence\s+graph|view\s+graph)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_GRAPH.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

        # Contradictions
        if re.search(r"\b(show\s+contradictions?|open\s+contradictions?|inspect\s+contradictions?|contradiction\s+center)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_CONTRADICTIONS.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

        # Evidence Gaps
        if re.search(r"\b(show\s+(the\s+)?(evidence\s+)?gaps?|open\s+gaps?|inspect\s+gaps?|missing\s+evidence)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_GAPS.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

        # Timeline
        if re.search(r"\b(open\s+(the\s+)?timeline|show\s+timeline|inspect\s+timeline|chronology)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_TIMELINE.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

        # Proof / Provenance
        if re.search(r"\b(show\s+proof|live\s+proof|trace\s+provenance|prove\s+claim)\b", text_lower):
            claim_id = args.get("claim_id") or ctx.selected_claim_id or "CLM-2026-001"
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_PROOF.value,
                target_case=case_id,
                target_claim=claim_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "claim_id": claim_id, **args},
                raw_input=raw_text,
            )

        # Evidence
        if re.search(r"\b(show\s+evidence|open\s+evidence|view\s+evidence)\b", text_lower):
            evidence_id = args.get("evidence_id") or ctx.selected_evidence_id or "EV-ANPR-001"
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_EVIDENCE.value,
                target_case=case_id,
                target_evidence=evidence_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "evidence_id": evidence_id, **args},
                raw_input=raw_text,
            )

        # Supporting Evidence
        if re.search(r"\b(show\s+supporting\s+evidence|show\s+support|supporting\s+facts?)\b", text_lower):
            claim_id = args.get("claim_id") or ctx.selected_claim_id or "CLM-2026-001"
            return InvestigationIntent(
                intent_name=UIActionType.SHOW_SUPPORT.value,
                target_case=case_id,
                target_claim=claim_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "claim_id": claim_id, **args},
                raw_input=raw_text,
            )

        # Agent invocations
        if re.search(r"\b(analyze\s+contradictions?|detect\s+contradictions?|scan\s+for\s+contradictions?)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.RUN_AGENT_TASK.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                risk_class=ActionRiskClass.ANALYZE,
                confidence=0.98,
                parameters={"agent_type": "CONTRADICTION_ANALYST", "objective": raw_text, "case_id": case_id, **args},
                raw_input=raw_text,
            )

        if re.search(r"\b(analyze\s+(evidence\s+)?gaps?|find\s+missing\s+evidence|identify\s+gaps?)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.RUN_AGENT_TASK.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                risk_class=ActionRiskClass.ANALYZE,
                confidence=0.98,
                parameters={"agent_type": "GAP_ANALYST", "objective": raw_text, "case_id": case_id, **args},
                raw_input=raw_text,
            )

        if re.search(r"\b(analyze\s+entities|find\s+entity\s+linkages?|detect\s+identity\s+matches?)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.RUN_AGENT_TASK.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                risk_class=ActionRiskClass.ANALYZE,
                confidence=0.98,
                parameters={"agent_type": "ENTITY_ANALYST", "objective": raw_text, "case_id": case_id, **args},
                raw_input=raw_text,
            )

        if re.search(r"\b(analyze\s+timeline|detect\s+temporal\s+anomal|temporal\s+analysis)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.RUN_AGENT_TASK.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                risk_class=ActionRiskClass.ANALYZE,
                confidence=0.98,
                parameters={"agent_type": "TIMELINE_ANALYST", "objective": raw_text, "case_id": case_id, **args},
                raw_input=raw_text,
            )

        if re.search(r"\b(analyze\s+evidence|correlate\s+evidence|evidence\s+analysis)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.RUN_AGENT_TASK.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                risk_class=ActionRiskClass.ANALYZE,
                confidence=0.98,
                parameters={"agent_type": "EVIDENCE_ANALYST", "objective": raw_text, "case_id": case_id, **args},
                raw_input=raw_text,
            )

        if re.search(r"\b(show\s+(agent\s+)?findings|agent\s+results?|investigation\s+findings)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.SHOW_AGENT_FINDINGS.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

        if re.search(r"\b(run\s+agent|dispatch\s+agent|execute\s+agent|analyze\s+with\s+agent)\b", text_lower):
            agent_type = "EVIDENCE_ANALYST"
            if "contradiction" in text_lower:
                agent_type = "CONTRADICTION_ANALYST"
            elif "gap" in text_lower:
                agent_type = "GAP_ANALYST"
            elif "entity" in text_lower:
                agent_type = "ENTITY_ANALYST"
            elif "timeline" in text_lower:
                agent_type = "TIMELINE_ANALYST"

            return InvestigationIntent(
                intent_name=UIActionType.RUN_AGENT_TASK.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                risk_class=ActionRiskClass.ANALYZE,
                confidence=0.95,
                parameters={"agent_type": agent_type, "objective": raw_text, "case_id": case_id, **args},
                raw_input=raw_text,
            )

        # Focus / Inspect Entity
        if text_lower.startswith("focus on") or text_lower.startswith("focus "):
            target_str = re.sub(r"^(focus\s+on\s+(this\s+person\s+|this\s+entity\s+)?|focus\s+)", "", raw_text, flags=re.IGNORECASE).strip()
            entity_id = target_str or ctx.selected_entity_id or "P001"
            return InvestigationIntent(
                intent_name=UIActionType.FOCUS.value,
                target_case=case_id,
                target_entity=entity_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "entity_id": entity_id, **args},
                raw_input=raw_text,
            )

        # Search
        if text_lower.startswith("search for") or text_lower.startswith("search ") or text_lower.startswith("find "):
            query_str = re.sub(r"^(search\s+for\s+|search\s+|find\s+)", "", raw_text, flags=re.IGNORECASE).strip()
            return InvestigationIntent(
                intent_name=UIActionType.SEARCH.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "query": query_str, **args},
                raw_input=raw_text,
            )

        # Default fallback: Treat as open investigation query or search
        return InvestigationIntent(
            intent_name=UIActionType.SEARCH.value,
            target_case=case_id,
            modality=CommandSource.CHAT,
            language=language,
            confidence=0.75,
            parameters={"case_id": case_id, "query": raw_text, **args},
            raw_input=raw_text,
        )

    # ── 6. Semantic Equivalence Evaluation ──────────────────────────────────────

    @staticmethod
    def are_equivalent(
        intent_a: InvestigationIntent,
        intent_b: InvestigationIntent,
    ) -> bool:
        """
        Verify whether two intents from different modalities represent the same
        canonical investigator intention.
        """
        # Primary intent name must match
        if intent_a.intent_name != intent_b.intent_name:
            return False

        # Case must match if specified on either
        if intent_a.target_case and intent_b.target_case:
            if intent_a.target_case != intent_b.target_case:
                return False

        # Entity target match if specified
        if intent_a.target_entity and intent_b.target_entity:
            if intent_a.target_entity != intent_b.target_entity:
                return False

        # Evidence target match if specified
        if intent_a.target_evidence and intent_b.target_evidence:
            if intent_a.target_evidence != intent_b.target_evidence:
                return False

        # Risk class should be consistent
        if intent_a.risk_class != intent_b.risk_class:
            return False

        return True
