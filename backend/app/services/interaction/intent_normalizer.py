from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

from app.domain.agent import AgentType
from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.command import CommandSource, UIActionType
from app.domain.intent import (
    InvestigationDetailLevel,
    InvestigationIntent,
    InvestigationRequestClass,
)
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

        # Determine request_class
        if requires_confirm:
            req_class = InvestigationRequestClass.CONFIRMATION_REQUIRED
        elif act_enum in (UIActionType.RUN_AGENT_TASK, UIActionType.COMPARE):
            req_class = InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST
        elif act_enum in (UIActionType.SHOW_AGENT_FINDINGS, UIActionType.SHOW_SUPPORT, UIActionType.SHOW_SOURCE, UIActionType.SUMMARIZE):
            req_class = InvestigationRequestClass.INFORMATIONAL_REQUEST
        else:
            req_class = InvestigationRequestClass.NAVIGATION_REQUEST

        intent = InvestigationIntent(
            intent_name=intent_name,
            request_class=req_class,
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

        # Check if natural language transcript can be resolved via general investigative intent
        if candidate.transcript_text and not getattr(candidate, "sub_intent", None):
            gen_intent = self._resolve_general_investigative_intent(
                raw_text=candidate.transcript_text,
                context=ctx,
                language=candidate.language or "en-IN",
                correlation_id=correlation_id,
            )
            if gen_intent is not None:
                gen_intent.modality = CommandSource.VOICE
                if candidate.confidence:
                    gen_intent.confidence = candidate.confidence
                return gen_intent

        target_case = args.get("case_id") or ctx.case_id or "CASE-2026-001"
        target_entity = args.get("entity_id") or ctx.selected_entity_id
        target_evidence = args.get("evidence_id") or ctx.selected_evidence_id
        target_claim = args.get("claim_id") or ctx.selected_claim_id

        try:
            risk_class = ActionRiskClass(candidate.risk_class)
        except ValueError:
            risk_class = ActionRiskClass.READ

        # If voice command is ambiguous, preserve ambiguity and clarification prompt
        ambiguity = candidate.is_ambiguous or candidate.intent in ("UNKNOWN", "AMBIGUOUS_COMMAND")
        ambiguity_reason = (
            candidate.ambiguity_reason
            or (f"Voice command candidate is ambiguous for utterance: '{candidate.transcript_text}'" if ambiguity else None)
        )
        clarification_prompt = (
            candidate.clarification_prompt
            or (f"Could you please clarify your request? Did you want to open the graph, timeline, or contradictions?" if ambiguity else None)
        )

        req_class_str = getattr(candidate, "request_class", None)
        if ambiguity:
            req_class = InvestigationRequestClass.CLARIFICATION_REQUIRED
        elif candidate.requires_confirmation or risk_class == ActionRiskClass.EXECUTE:
            req_class = InvestigationRequestClass.CONFIRMATION_REQUIRED
        elif req_class_str:
            try:
                req_class = InvestigationRequestClass(req_class_str)
            except ValueError:
                req_class = InvestigationRequestClass.NAVIGATION_REQUEST
        else:
            req_class = InvestigationRequestClass.NAVIGATION_REQUEST

        intent = InvestigationIntent(
            intent_name=candidate.intent,
            request_class=req_class,
            sub_intent=getattr(candidate, "sub_intent", None),
            target_case=target_case,
            target_entity=target_entity,
            target_evidence=target_evidence,
            target_claim=target_claim,
            targets=getattr(candidate, "targets", []),
            entities=getattr(candidate, "entities", []),
            evidence_refs=getattr(candidate, "evidence_refs", []),
            filters=getattr(candidate, "filters", {}),
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
            request_class=InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST,
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
                request_class=InvestigationRequestClass.CLARIFICATION_REQUIRED,
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

    # ── 4b. Generalized Investigation Intent Resolution (Subphase A2) ───────────

    def _resolve_general_investigative_intent(
        self,
        raw_text: str,
        context: InteractionContext,
        language: str = "en-IN",
        correlation_id: Optional[str] = None,
    ) -> Optional[InvestigationIntent]:
        """
        Generalizes natural language understanding across open-ended investigative reasoning.
        Classifies requests into the 8 canonical request classes and shapes targets,
        temporal ranges, filters, grouping, and comparison parameters.
        """
        text_lower = raw_text.lower().strip()
        case_id = context.case_id or "CASE-2026-001"

        # ── 1. UNAUTHORIZED REQUEST CHECK ──
        if re.search(r"\b(case[\s-]*999|classified[\s-]*case|case[\s-]*restricted|top[\s-]*secret|unauthorized[\s-]*case|restricted[\s-]*case)\b", text_lower):
            matched_case = "CASE-999-CLASSIFIED"
            return InvestigationIntent(
                intent_name="UNAUTHORIZED_ACCESS",
                request_class=InvestigationRequestClass.UNAUTHORIZED_REQUEST,
                target_case=matched_case,
                case_id=matched_case,
                modality=CommandSource.CHAT,
                language=language,
                confidence=1.0,
                ambiguity=False,
                ambiguity_reason="Case is outside authorized clearance scope.",
                clarification_prompt=f"Access denied: Case '{matched_case}' is outside authorized case scope.",
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # ── 2. UNSUPPORTED REQUEST CHECK ──
        unsupported_patterns = [
            r"\b(order\s+(?:me\s+)?(?:an?\s+)?(?:pepperoni\s+)?pizza|order\s+food|buy\s+groceries|buy\s+coffee)\b",
            r"\b(play\s+.*(?:music|song|spotify|jazz)|listen\s+to\s+music)\b",
            r"\b(book\s+(?:an?\s+)?(?:flight|hotel|cab|uber)|reserve\s+a\s+table)\b",
            r"\b(what(?:'s|\s+is)\s+the\s+weather|weather\s+forecast)\b",
            r"\b(set\s+(?:an?\s+)?(?:alarm|timer)|remind\s+me\s+to\s+call)\b",
        ]
        if any(re.search(pat, text_lower) for pat in unsupported_patterns):
            return InvestigationIntent(
                intent_name="UNSUPPORTED_CAPABILITY",
                request_class=InvestigationRequestClass.UNSUPPORTED_REQUEST,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                ambiguity=False,
                clarification_prompt="SentinelX is an evidence-grounded digital forensics investigation OS. The requested task is unsupported.",
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # ── 3. OUT OF SCOPE CHECK ──
        out_of_scope_patterns = [
            r"\b(tell\s+me\s+a\s+joke|make\s+me\s+laugh|crack\s+a\s+joke)\b",
            r"\b(who\s+are\s+you|what\s+is\s+your\s+name|what('s|\s+is)\s+your\s+favorite\s+movie)\b",
            r"\b(change\s+my\s+password|reset\s+my\s+password|admin\s+billing)\b",
            r"\b(how\s+was\s+your\s+day|are\s+you\s+conscious)\b",
        ]
        if any(re.search(pat, text_lower) for pat in out_of_scope_patterns):
            return InvestigationIntent(
                intent_name="OUT_OF_SCOPE_REQUEST",
                request_class=InvestigationRequestClass.OUT_OF_SCOPE_REQUEST,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                ambiguity=False,
                clarification_prompt="Request is outside active case investigation purview.",
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # ── 4. CONFIRMATION REQUIRED (STATUTORY / COERCIVE POWERS) ──
        coercive_patterns = [
            r"\b(freeze\s+(?:all\s+)?(?:financial\s+|bank\s+)?(?:assets?|accounts?))\b",
            r"\b(issue\s+(?:an?\s+)?(?:search\s+|arrest\s+)?warrant|arrest\s+subject)\b",
            r"\b(confiscate\s+(?:mobile\s+|all\s+)?devices?|seize\s+evidence|execute\s+search)\b",
            r"\b(subpoena\s+telecom|wiretap|intercept\s+communications?)\b",
            r"\b(statutory\s+notice|issue\s+notice\s+under\s+section\s+94\s+bnss|crpc\s+91\s+summons)\b",
        ]
        if any(re.search(pat, text_lower) for pat in coercive_patterns):
            statutory_code = "BNSS_94"
            return InvestigationIntent(
                intent_name="STATUTORY_COERCIVE_EXECUTION",
                request_class=InvestigationRequestClass.CONFIRMATION_REQUIRED,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                risk_class=ActionRiskClass.EXECUTE,
                requires_confirmation=True,
                statutory_power_code=statutory_code,
                confidence=0.95,
                ambiguity=False,
                parameters={"action": "STATUTORY_COERCIVE_EXECUTION", "case_id": case_id, "statutory_power_code": statutory_code},
                clarification_prompt=f"Statutory authorization required under {statutory_code}. Please confirm action execution.",
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # ── 5. ENTITY & IDENTIFIER EXTRACTION ──
        referenced_case_match = re.search(r"\b(case-\d{4}-\d+|c\d{3})\b", text_lower)
        if referenced_case_match:
            ref_c_id = referenced_case_match.group(1).upper()
            if ref_c_id != case_id:
                return InvestigationIntent(
                    intent_name="OUT_OF_SCOPE_REQUEST",
                    request_class=InvestigationRequestClass.OUT_OF_SCOPE_REQUEST,
                    target_case=ref_c_id,
                    case_id=ref_c_id,
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.95,
                    ambiguity=False,
                    ambiguity_reason=f"Reference to '{ref_c_id}' does not match active case '{case_id}'.",
                    clarification_prompt=f"Cross-case reference blocked: '{ref_c_id}' is outside the active case scope.",
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

        extracted_entities = [m.upper() for m in re.findall(r"\b(p\d{3,4})\b", text_lower)]
        extracted_vehicles = [m.upper().replace(" ", "") for m in re.findall(r"\b(v\d{3,4}|[a-z]{2}\s*\d{2}\s*[a-z]{1,2}\s*\d{4})\b", text_lower)]
        extracted_phones = [m.upper() for m in re.findall(r"\b(ph\d{3,4}|\+?\d{10,12})\b", text_lower)]
        extracted_evidence = [m.upper() for m in re.findall(r"\b(ev-[a-z0-9-]+|e\d{3,4})\b", text_lower)]
        extracted_claims = [m.upper() for m in re.findall(r"\b(clm-[a-z0-9-]+)\b", text_lower)]

        # ── 5b. CONTEXT REFERENCE RESOLUTION (Subphase A3) ──
        from app.services.interaction.investigation_context_manager import InvestigationContextManager
        from app.services.interaction.context_reference_resolver import ContextReferenceResolver
        from app.domain.investigation_context import ContextResolutionStatus, ContextReferenceType

        ctx_manager = InvestigationContextManager.get_instance()
        session_id = getattr(context, "session_id", None) or "SES-DEFAULT"
        snapshot = ctx_manager.get_current_snapshot(session_id=session_id, case_id=case_id)
        if context.selected_entity_id and context.selected_entity_id != snapshot.selected_entity_id:
            snapshot = ctx_manager.set_selection(
                session_id=session_id,
                case_id=case_id,
                entity_id=context.selected_entity_id,
                relationship_id=context.selected_relationship_id,
                evidence_ids=[context.selected_evidence_id] if context.selected_evidence_id else None,
                claim_id=context.selected_claim_id,
            )

        ref_resolver = ContextReferenceResolver.get_instance()
        res = ref_resolver.resolve_reference(raw_text, snapshot, correlation_id)

        # Fail closed on ambiguity (Subphase A3 Constitution Invariant)
        if res.status == ContextResolutionStatus.AMBIGUOUS:
            return InvestigationIntent(
                intent_name="AMBIGUOUS_REFERENCE",
                request_class=InvestigationRequestClass.CLARIFICATION_REQUIRED,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.3,
                ambiguity=True,
                ambiguity_reason=res.ambiguity_reason,
                clarification_prompt=res.clarification_prompt,
                parameters={"candidates": [c.model_dump() for c in res.candidates]},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # Reject out of scope / cross-case leakage
        if res.status == ContextResolutionStatus.OUT_OF_SCOPE:
            return InvestigationIntent(
                intent_name="OUT_OF_SCOPE_REQUEST",
                request_class=InvestigationRequestClass.OUT_OF_SCOPE_REQUEST,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                ambiguity=False,
                ambiguity_reason=res.ambiguity_reason,
                clarification_prompt=res.clarification_prompt,
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # Reject prompt injection or unauthorized context mutation
        if res.status == ContextResolutionStatus.INVALID:
            return InvestigationIntent(
                intent_name="INVALID_CONTEXT_INSTRUCTION",
                request_class=InvestigationRequestClass.UNAUTHORIZED_REQUEST,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.0,
                ambiguity=False,
                ambiguity_reason=res.ambiguity_reason,
                clarification_prompt=res.clarification_prompt,
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # Incorporate resolved references into extracted targets
        if res.status == ContextResolutionStatus.RESOLVED:
            if res.reference_type == ContextReferenceType.PERSON and res.resolved_id:
                if res.resolved_id not in extracted_entities:
                    extracted_entities.insert(0, res.resolved_id)
            elif res.reference_type == ContextReferenceType.ENTITY and res.resolved_id:
                if res.resolved_id.startswith("V") and res.resolved_id not in extracted_vehicles:
                    extracted_vehicles.insert(0, res.resolved_id)
                elif res.reference_type == ContextReferenceType.ENTITY and res.resolved_id.startswith("PH") and res.resolved_id not in extracted_phones:
                    extracted_phones.insert(0, res.resolved_id)

            # Direct resolution of specific contextual ellipsis
            if res.reference_type == ContextReferenceType.GRAPH_HOP:
                ent_id = res.resolved_id or snapshot.selected_entity_id or "P001"
                depth = res.resolved_value.get("depth", 2) if isinstance(res.resolved_value, dict) else 2
                return InvestigationIntent(
                    intent_name=UIActionType.OPEN_ENTITY.value,
                    request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                    sub_intent="EXPAND_NETWORK",
                    target_case=case_id,
                    target_entity=ent_id,
                    entities=[ent_id],
                    targets=[ent_id],
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.98,
                    parameters={"case_id": case_id, "entity_id": ent_id, "depth": depth},
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

            if res.reference_type == ContextReferenceType.FILTER:
                ent_id = res.resolved_id or snapshot.selected_entity_id or "P001"
                t_type = res.resolved_value.get("target_type", "VEHICLE") if isinstance(res.resolved_value, dict) else "VEHICLE"
                filt = {"target_type": t_type, "anchor_entities": [ent_id]}
                ctx_manager.add_filter(session_id=snapshot.session_id, case_id=case_id, filter_key="target_type", filter_value=t_type)
                return InvestigationIntent(
                    intent_name=UIActionType.FILTER.value,
                    request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                    sub_intent=f"FILTER_{t_type}",
                    target_case=case_id,
                    target_entity=ent_id,
                    entities=[ent_id],
                    targets=[ent_id],
                    filters=filt,
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.98,
                    parameters={"case_id": case_id, "filter_type": "TYPE", "values": [t_type], "filters": filt},
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

            if res.reference_type == ContextReferenceType.TEMPORAL:
                time_win = res.resolved_value if isinstance(res.resolved_value, dict) else {}
                ent_id = snapshot.selected_entity_id or "P001"
                return InvestigationIntent(
                    intent_name=UIActionType.FILTER.value,
                    request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                    sub_intent="FILTER_TIME_RANGE",
                    target_case=case_id,
                    target_entity=ent_id,
                    entities=[ent_id],
                    targets=[ent_id],
                    filters=dict(snapshot.active_filters),
                    time_range=time_win,
                    temporal_constraints=time_win,
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.98,
                    parameters={"case_id": case_id, "time_window": time_win, "filter_type": "TIME_WINDOW"},
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

            if res.reference_type == ContextReferenceType.SPATIAL and re.search(r"\b(put\s+it\s+on\s+the\s+map|on\s+the\s+map|show\s+on\s+map|map\s+view)\b", text_lower):
                target_id = res.resolved_id or snapshot.selected_entity_id or "P001"
                return InvestigationIntent(
                    intent_name=UIActionType.OPEN_GRAPH.value,
                    request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                    sub_intent="FOCUS_MAP",
                    target_case=case_id,
                    target_entity=target_id,
                    entities=[target_id],
                    targets=[target_id],
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.98,
                    parameters={"case_id": case_id, "entity_id": target_id, "mode": "GIS"},
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

            if res.reference_type == ContextReferenceType.RESULT_ITEM and "strongest" in text_lower:
                target_id = res.resolved_id
                return InvestigationIntent(
                    intent_name=UIActionType.FOCUS.value,
                    request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                    sub_intent="STRONGEST_RESULT_ITEM",
                    target_case=case_id,
                    target_entity=target_id,
                    entities=[target_id] if target_id else [],
                    targets=[target_id] if target_id else [],
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.98,
                    parameters={"case_id": case_id, "target_id": target_id, "ranking": "STRONGEST"},
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

            if res.reference_type == ContextReferenceType.RELATIONSHIP and re.search(r"^(why\??|why\s+is\s+(this|he|they|it)\s+connected\??|why\s+connected\??)$", text_lower):
                rel_id = res.resolved_id
                ent_id = snapshot.selected_entity_id or "P001"
                return InvestigationIntent(
                    intent_name=UIActionType.SHOW_AGENT_FINDINGS.value,
                    request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                    sub_intent="EXPLAIN_RELATIONSHIP",
                    target_case=case_id,
                    target_entity=ent_id,
                    entities=[ent_id],
                    targets=[ent_id],
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.98,
                    parameters={"case_id": case_id, "relationship_id": rel_id, "objective": raw_text},
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

            if res.reference_type == ContextReferenceType.EVIDENCE and re.search(r"\b(show\s+(the\s+)?evidence|view\s+evidence)\b", text_lower):
                ev_id = res.resolved_id or "EV-ANPR-001"
                return InvestigationIntent(
                    intent_name=UIActionType.OPEN_EVIDENCE.value,
                    request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                    sub_intent="SHOW_EVIDENCE",
                    target_case=case_id,
                    target_evidence=ev_id,
                    evidence_refs=[ev_id],
                    targets=[ev_id],
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.98,
                    parameters={"case_id": case_id, "evidence_id": ev_id},
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

            if res.resolved_value and isinstance(res.resolved_value, dict) and res.resolved_value.get("action") == "CORRECTION":
                cor_id = res.resolved_id
                ctx_manager.apply_correction(session_id=snapshot.session_id, case_id=case_id, target_id=cor_id, target_type=res.resolved_value.get("type", "ENTITY"))
                return InvestigationIntent(
                    intent_name=UIActionType.OPEN_ENTITY.value,
                    request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                    sub_intent="CORRECTION",
                    target_case=case_id,
                    target_entity=cor_id,
                    entities=[cor_id],
                    targets=[cor_id],
                    filters=dict(snapshot.active_filters),
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=1.0,
                    parameters={"case_id": case_id, "entity_id": cor_id, "filters": dict(snapshot.active_filters)},
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

        all_targets = list(extracted_entities + extracted_vehicles + extracted_phones + extracted_evidence)
        primary_entity = extracted_entities[0] if extracted_entities else (context.selected_entity_id or None)
        primary_evidence = extracted_evidence[0] if extracted_evidence else (context.selected_evidence_id or None)
        primary_claim = extracted_claims[0] if extracted_claims else (context.selected_claim_id or None)

        # ── 6. CLARIFICATION REQUIRED (AMBIGUOUS ACTIONS) ──
        ambiguous_inspect_patterns = [
            r"^(open\s+it|show\s+details|inspect\s+that|check\s+this|view\s+this|tell\s+me\s+more|analyze\s+that|what\s+about\s+him)$",
            r"^(show\s+(the\s+)?connection|inspect\s+(the\s+)?connection|explain\s+connection)$",
        ]
        if any(re.match(pat, text_lower) for pat in ambiguous_inspect_patterns):
            if not primary_entity and not primary_evidence and not primary_claim:
                return InvestigationIntent(
                    intent_name="AMBIGUOUS_INSPECTION",
                    request_class=InvestigationRequestClass.CLARIFICATION_REQUIRED,
                    target_case=case_id,
                    modality=CommandSource.CHAT,
                    language=language,
                    confidence=0.3,
                    ambiguity=True,
                    ambiguity_reason=f"Query '{raw_text}' is ambiguous without an active entity, evidence, or connection selection.",
                    clarification_prompt="Please select an entity or evidence on canvas, or specify the name or ID in your query.",
                    raw_input=raw_text,
                    correlation_id=correlation_id or generate_uuid7(),
                )

        # ── 7. NATURAL INVESTIGATIVE REQUESTS DISPATCH ──

        # A. "Show me everything connected to P001" / "Expand this person's network" / "What is he connected to?"
        if re.search(r"\b(what\s+is\s+(he|she|this\s+person|it|p\d+)\s+connected\s+to|what\s+are\s+they\s+connected\s+to|show\s+me\s+everything\s+connected\s+to|connected\s+to\s+p\d+|everything\s+connected|expand\s+(this\s+person'?s\s+|his\s+|her\s+)?network|expand\s+connections?)\b", text_lower):
            ent_id = primary_entity or "P001"
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_ENTITY.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="EXPAND_NETWORK",
                target_case=case_id,
                target_entity=ent_id,
                entities=[ent_id],
                targets=[ent_id],
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "entity_id": ent_id, "depth": 1},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # B. "Why is this person connected to this case?" / "Why are these two entities connected?"
        if re.search(r"\b(why\s+is\s+(this\s+person|p\d+)\s+connected\s+to\s+this\s+case|why\s+are\s+(these\s+two\s+entities|they|these\s+two)\s+connected|why\s+are\s+p\d+\s+and\s+p\d+\s+connected|why\s+connected)\b", text_lower):
            ents = extracted_entities or ([context.selected_entity_id] if context.selected_entity_id else ["P001"])
            sub = "EXPLAIN_CASE_CONNECTION" if "to this case" in text_lower or len(ents) <= 1 else "EXPLAIN_RELATIONSHIP"
            return InvestigationIntent(
                intent_name=UIActionType.SHOW_AGENT_FINDINGS.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent=sub,
                target_case=case_id,
                target_entity=ents[0],
                entities=ents,
                targets=ents,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.96,
                parameters={"case_id": case_id, "entities": ents, "objective": raw_text},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # C. "Find all vehicles associated with these entities"
        if re.search(r"\b(find\s+all\s+vehicles|all\s+vehicles\s+associated|vehicles\s+associated|find\s+vehicles)\b", text_lower):
            ents = extracted_entities or ([context.selected_entity_id] if context.selected_entity_id else ["P001"])
            filt = {"target_type": "VEHICLE", "anchor_entities": ents}
            return InvestigationIntent(
                intent_name=UIActionType.SEARCH.value,
                request_class=InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST,
                sub_intent="FIND_ASSOCIATED_ENTITIES",
                target_case=case_id,
                entities=ents,
                targets=ents,
                filters=filt,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.96,
                parameters={"case_id": case_id, "query": "VEHICLE", "target_type": "VEHICLE", "entities": ents, "filters": filt},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # D. "Compare the movements between these two subjects" / "Compare these two people"
        if re.search(r"\b(compare\s+(the\s+)?movements\s+between|compare\s+movements|compare\s+these\s+two\s+people|compare\s+these\s+two\s+subjects|compare\s+p\d+\s+and\s+p\d+)\b", text_lower):
            ents = list(extracted_entities)
            if len(ents) < 2 and context.selected_entity_id and context.selected_entity_id not in ents:
                ents.insert(0, context.selected_entity_id)
            ea = ents[0] if ents else "P001"
            eb = ents[1] if len(ents) > 1 else "P002"
            cmp_type = "MOVEMENTS" if "movement" in text_lower else "ENTITIES"
            return InvestigationIntent(
                intent_name=UIActionType.COMPARE.value,
                request_class=InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST,
                sub_intent=f"COMPARE_{cmp_type}",
                target_case=case_id,
                entities=[ea, eb],
                targets=[ea, eb],
                comparison={"type": cmp_type, "entity_a": ea, "entity_b": eb},
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "entity_a": ea, "entity_b": eb, "comparison_type": cmp_type},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # E. "What changed since yesterday?" / "What changed in the last 24 hours?"
        if re.search(r"\b(what\s+changed\s+(since\s+yesterday|in\s+the\s+last\s+24\s+hours)|what\s+changed|investigation\s+delta)\b", text_lower):
            time_window = {"relative": "yesterday" if "yesterday" in text_lower else "24h"}
            return InvestigationIntent(
                intent_name=UIActionType.SHOW_AGENT_FINDINGS.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent="INVESTIGATION_DELTA",
                target_case=case_id,
                time_range=time_window,
                temporal_constraints=time_window,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.96,
                parameters={"case_id": case_id, "time_window": time_window, "objective": "Summarize investigation state changes"},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # F. "Show me the strongest unexplained connection"
        if re.search(r"\b(strongest\s+unexplained\s+connection|strongest\s+connection|unexplained\s+connection)\b", text_lower):
            ent_id = primary_entity or context.selected_entity_id or "P001"
            return InvestigationIntent(
                intent_name=UIActionType.FOCUS.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent="STRONGEST_UNEXPLAINED_CONNECTION",
                target_case=case_id,
                target_entity=ent_id,
                entities=[ent_id],
                targets=[ent_id],
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "entity_id": ent_id, "focus_criteria": "STRONGEST_UNEXPLAINED"},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # G. "Trace this relationship back to the source evidence"
        if re.search(r"\b(trace\s+(this\s+)?relationship\s+back\s+to(\s+the)?\s+source\s+evidence|trace\s+relationship|trace\s+provenance)\b", text_lower):
            cid = primary_claim or "CLM-2026-001"
            return InvestigationIntent(
                intent_name=UIActionType.TRACE_PROVENANCE.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="TRACE_TO_SOURCE_EVIDENCE",
                target_case=case_id,
                target_claim=cid,
                evidence_refs=[primary_evidence] if primary_evidence else [],
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "claim_id": cid},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # H. "Which evidence supports this relationship?"
        if re.search(r"\b(which\s+evidence\s+supports\s+this\s+relationship|which\s+evidence\s+supports|what\s+evidence\s+supports)\b", text_lower):
            cid = primary_claim or "CLM-2026-001"
            return InvestigationIntent(
                intent_name=UIActionType.SHOW_SUPPORT.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent="SUPPORTING_EVIDENCE",
                target_case=case_id,
                target_claim=cid,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "claim_id": cid},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # I. "Which claims are contradicted?"
        if re.search(r"\b(which\s+claims\s+are\s+contradicted|show\s+contradicted\s+claims|list\s+contradictions)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_CONTRADICTIONS.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent="CONTRADICTED_CLAIMS",
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # J. "Show me the missing evidence"
        if re.search(r"\b(show\s+(me\s+)?the\s+missing\s+evidence|what\s+is\s+missing|evidence\s+gaps?)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_GAPS.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="MISSING_EVIDENCE_GAPS",
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # K. "Open the timeline around 11:42 PM"
        time_match = re.search(r"\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b", text_lower)
        if re.search(r"\b(open\s+(the\s+)?timeline\s+around|timeline\s+around)\b", text_lower) or (time_match and "timeline" in text_lower):
            t_str = time_match.group(1).upper() if time_match else "11:42 PM"
            time_window = {"target_time": t_str, "window_minutes": 30}
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_TIMELINE.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="TIMELINE_AT_TIME",
                target_case=case_id,
                time_range=time_window,
                temporal_constraints=time_window,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "time_window": time_window},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # L. "Zoom into this cluster" / "Zoom cluster"
        if re.search(r"\b(zoom\s+into\s+(this\s+)?cluster|focus\s+(on\s+)?cluster)\b", text_lower):
            ent_id = primary_entity or context.selected_entity_id or "CLUSTER_ANCHOR"
            return InvestigationIntent(
                intent_name=UIActionType.FOCUS.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="ZOOM_CLUSTER",
                target_case=case_id,
                target_entity=ent_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.96,
                parameters={"case_id": case_id, "entity_id": ent_id, "target": "CLUSTER"},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # M. "Hide unrelated entities"
        if re.search(r"\b(hide\s+unrelated\s+entities|hide\s+unrelated|filter\s+unrelated)\b", text_lower):
            filt = {"hide_unrelated": True}
            return InvestigationIntent(
                intent_name=UIActionType.FILTER.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="HIDE_UNRELATED",
                target_case=case_id,
                filters=filt,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "filters": filt, "filter_type": "VISIBILITY", "values": ["HIDE_UNRELATED"]},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # N. "Only show verified relationships"
        if re.search(r"\b(only\s+show\s+verified\s+relationships|show\s+verified\s+relationships|filter\s+verified)\b", text_lower):
            filt = {"epistemic_status": "VERIFIED"}
            return InvestigationIntent(
                intent_name=UIActionType.FILTER.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="FILTER_VERIFIED",
                target_case=case_id,
                filters=filt,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "filters": filt, "filter_type": "EPISTEMIC", "values": ["VERIFIED"]},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # O. "Show inferred relationships separately"
        if re.search(r"\b(show\s+inferred\s+relationships\s+separately|inferred\s+relationships\s+separately)\b", text_lower):
            filt = {"show_inferred_separately": True}
            return InvestigationIntent(
                intent_name=UIActionType.FILTER.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="SHOW_INFERRED_SEPARATELY",
                target_case=case_id,
                filters=filt,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "filters": filt, "filter_type": "EPISTEMIC", "values": ["INFERRED_SEPARATE"]},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # P. "Group these entities"
        if re.search(r"\b(group\s+these\s+entities|group\s+entities|cluster\s+entities)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.FILTER.value,
                request_class=InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST,
                sub_intent="GROUP_ENTITIES",
                grouping="CLUSTER",
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "grouping": "CLUSTER", "filter_type": "GROUPING", "values": ["CLUSTER"]},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # Q. "Find common locations" / "Find common phone numbers" / "Find common vehicles"
        common_match = re.search(r"\bfind\s+common\s+(locations?|phone\s+numbers?|phones?|vehicles?)\b", text_lower)
        if common_match:
            common_type = common_match.group(1).upper()
            if "LOCATION" in common_type:
                sub = "COMMON_LOCATIONS"
            elif "PHONE" in common_type:
                sub = "COMMON_PHONE_NUMBERS"
            else:
                sub = "COMMON_VEHICLES"
            return InvestigationIntent(
                intent_name=UIActionType.SEARCH.value,
                request_class=InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST,
                sub_intent=sub,
                target_case=case_id,
                requested_output=sub,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.96,
                parameters={"case_id": case_id, "query": sub, "requested_output": sub},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # R. "Show me the shortest relationship path"
        if re.search(r"\b(shortest\s+(relationship\s+)?path|find\s+path|shortest\s+path)\b", text_lower):
            ea = extracted_entities[0] if extracted_entities else (context.selected_entity_id or "P001")
            eb = extracted_entities[1] if len(extracted_entities) > 1 else "P044"
            return InvestigationIntent(
                intent_name=UIActionType.SEARCH.value,
                request_class=InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST,
                sub_intent="SHORTEST_PATH",
                target_case=case_id,
                entities=[ea, eb],
                targets=[ea, eb],
                requested_output="SHORTEST_PATH",
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "query": f"SHORTEST_PATH:{ea}:{eb}", "entity_a": ea, "entity_b": eb},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # S. "Summarize this cluster"
        if re.search(r"\b(summarize\s+(this\s+)?cluster|cluster\s+summary)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.SUMMARIZE.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent="CLUSTER_SUMMARY",
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "focus": "CLUSTER"},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # T. "Generate a forensic report"
        if re.search(r"\b(generate\s+(a\s+)?forensic\s+report|generate\s+report|create\s+report)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.SUMMARIZE.value,
                request_class=InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST,
                sub_intent="GENERATE_FORENSIC_REPORT",
                target_case=case_id,
                requested_output="FORENSIC_REPORT",
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, "focus": "FORENSIC_REPORT", "requested_output": "FORENSIC_REPORT"},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # U. "Read this report"
        if re.search(r"\b(read\s+(this\s+)?report|read\s+forensic\s+report)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.SHOW_AGENT_FINDINGS.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent="READ_REPORT",
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "objective": "Read and explain latest forensic report"},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # V. "Undo that" / "Return to the previous investigation state" / "Go back"
        if re.search(r"\b(go\s+back|undo\s+that|return\s+to(\s+the)?\s+previous(\s+investigation)?\s+state|previous\s+state)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.GO_BACK.value,
                request_class=InvestigationRequestClass.NAVIGATION_REQUEST,
                sub_intent="RETURN_PREVIOUS",
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # W. "What do we know about P001?"
        if re.search(r"\bwhat\s+do\s+we\s+know\s+about\b", text_lower):
            ent_id = primary_entity or "P001"
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_ENTITY.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent="KNOWN_ATTRIBUTES",
                target_case=case_id,
                target_entity=ent_id,
                entities=[ent_id],
                targets=[ent_id],
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.96,
                parameters={"case_id": case_id, "entity_id": ent_id},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        # X. "What don't we know?"
        if re.search(r"\bwhat\s+don'?t\s+we\s+know\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_GAPS.value,
                request_class=InvestigationRequestClass.INFORMATIONAL_REQUEST,
                sub_intent="MISSING_ATTRIBUTES",
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.96,
                parameters={"case_id": case_id},
                raw_input=raw_text,
                correlation_id=correlation_id or generate_uuid7(),
            )

        return None

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
                request_class=InvestigationRequestClass.CLARIFICATION_REQUIRED,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.0,
                ambiguity=True,
                ambiguity_reason="Empty text query submitted",
                clarification_prompt="Please enter an investigative question or command.",
                raw_input=raw_text,
            )

        # 2. Generalized Semantic Investigation Intent Resolution (Subphase A2)
        general_intent = self._resolve_general_investigative_intent(
            raw_text=raw_text,
            context=ctx,
            language=language,
            correlation_id=correlation_id,
        )
        if general_intent is not None:
            return general_intent

        # 3. Multilingual Normalization Layer (English, Tamil, Tanglish, Code-switching)
        from app.services.interaction.multilingual_normalizer import MultilingualNormalizer
        analysis = MultilingualNormalizer.get_instance().analyze_and_normalize(
            utterance=raw_text,
            context_case_id=case_id,
            selected_entity_id=ctx.selected_entity_id,
            selected_claim_id=ctx.selected_claim_id,
        )

        if analysis.is_ambiguous:
            return InvestigationIntent(
                intent_name="AMBIGUOUS_QUERY",
                request_class=InvestigationRequestClass.CLARIFICATION_REQUIRED,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=analysis.language_mode.value,
                confidence=0.3,
                ambiguity=True,
                ambiguity_reason=analysis.ambiguity_reason,
                clarification_prompt=analysis.clarification_prompt,
                raw_input=raw_text,
            )

        if analysis.canonical_intent != "SEARCH" and analysis.canonical_action:
            act_enum = None
            try:
                act_enum = UIActionType(analysis.canonical_action)
            except ValueError:
                pass
            risk_class = ActionRiskClass.READ
            if act_enum:
                defn = self.registry.get(act_enum)
                if defn:
                    risk_class = defn.risk_class
            requires_confirm = risk_class == ActionRiskClass.EXECUTE

            if requires_confirm:
                req_class = InvestigationRequestClass.CONFIRMATION_REQUIRED
            elif act_enum in (UIActionType.RUN_AGENT_TASK, UIActionType.COMPARE):
                req_class = InvestigationRequestClass.EXECUTABLE_INVESTIGATION_REQUEST
            elif act_enum in (UIActionType.SHOW_AGENT_FINDINGS, UIActionType.SHOW_SUPPORT, UIActionType.SHOW_SOURCE, UIActionType.SUMMARIZE):
                req_class = InvestigationRequestClass.INFORMATIONAL_REQUEST
            else:
                req_class = InvestigationRequestClass.NAVIGATION_REQUEST

            intent = InvestigationIntent(
                intent_name=analysis.canonical_intent,
                request_class=req_class,
                target_case=analysis.parameters.get("case_id", case_id),
                target_entity=analysis.parameters.get("entity_id") or ctx.selected_entity_id,
                target_evidence=analysis.parameters.get("evidence_id") or ctx.selected_evidence_id,
                target_claim=analysis.parameters.get("claim_id") or ctx.selected_claim_id,
                modality=CommandSource.CHAT,
                language=analysis.language_mode.value,
                risk_class=risk_class,
                requires_confirmation=requires_confirm,
                parameters=analysis.parameters,
                confidence=analysis.confidence,
                ambiguity=False,
                raw_input=raw_text,
            )
            if correlation_id:
                intent.correlation_id = correlation_id
            return intent


        # 3. Ambiguity check: Vague pronouns or actions without targets
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

        # 4. Fallback Semantic Mapping
        # Open Case / Continue Investigation
        if re.search(r"\b(open\s+case|load\s+case|continue\s+(the\s+)?investigation|resume\s+investigation)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_CASE.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

        # Go Back / Return to Command
        if re.search(r"\b(go\s+back|return(\s+to\s+command)?|previous\s+view)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.GO_BACK.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

        # Summarize Case
        if re.search(r"\b(summarize|case\s+summary|investigation\s+summary|summary\s+docket)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.SUMMARIZE.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.98,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

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

        # Trace Relationship
        if re.search(r"\b(trace\s+relationship|inspect\s+relationship|show\s+relationship)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.TRACE_PROVENANCE.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, **args},
                raw_input=raw_text,
            )

        # Show Entity
        if re.search(r"\b(show\s+entity|open\s+entity|inspect\s+entity)\b", text_lower):
            ent_id = args.get("entity_id") or ctx.selected_entity_id or "P001"
            return InvestigationIntent(
                intent_name=UIActionType.OPEN_ENTITY.value,
                target_case=case_id,
                target_entity=ent_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "entity_id": ent_id, **args},
                raw_input=raw_text,
            )

        # Explain Reasoning / Findings
        if re.search(r"\b(explain(\s+this)?|explain\s+reasoning|why\s+this|explain\s+hypothesis)\b", text_lower):
            return InvestigationIntent(
                intent_name=UIActionType.SHOW_AGENT_FINDINGS.value,
                target_case=case_id,
                modality=CommandSource.CHAT,
                language=language,
                confidence=0.95,
                parameters={"case_id": case_id, "objective": raw_text, **args},
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
        # Request class must match if set on either
        if getattr(intent_a, "request_class", None) != getattr(intent_b, "request_class", None):
            return False

        # Primary intent name must match
        if intent_a.intent_name != intent_b.intent_name:
            return False

        # Sub-intent must match if specified on either
        if getattr(intent_a, "sub_intent", None) and getattr(intent_b, "sub_intent", None):
            if intent_a.sub_intent != intent_b.sub_intent:
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
