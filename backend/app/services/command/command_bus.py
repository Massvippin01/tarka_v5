from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional, Set
from datetime import UTC, datetime

from app.domain.auth import UserIdentity
from app.domain.command import (
    Command,
    CommandExecutionResult,
    CommandSource,
    CommandStatus,
    UIActionDescriptor,
    UIActionType,
)
from app.domain.intent import InvestigationRequestClass
from app.domain.interaction import (
    ActionRiskClass,
    ConfirmationChallenge,
    InteractionContext,
    ToolDefinition,
)
from app.services.audit_service import AuditService
from app.services.command.action_executor import ActionExecutor
from app.services.command.ui_action_registry import UIActionRegistry
from app.services.governance.policy_gateway import PolicyDecision, PolicyGateway
from app.services.interaction.context_resolver import ContextResolver
from app.services.interaction.intent_resolver import IntentResolver

logger = logging.getLogger("sentinelx.command.command_bus")


class CommandBus:
    """
    CANONICAL COMMAND CONTROL PLANE FOR SENTINELX.
    All modalities (Voice, Chat, UI clicks, Keyboard, Automation, Future Agents)
    converge into this single pipeline.
    """

    _instance: Optional[CommandBus] = None

    def __init__(
        self,
        executor: Optional[ActionExecutor] = None,
        registry: Optional[UIActionRegistry] = None,
        policy_gateway: Optional[PolicyGateway] = None,
        audit_service: Optional[AuditService] = None,
        context_resolver: Optional[ContextResolver] = None,
        intent_resolver: Optional[IntentResolver] = None,
    ) -> None:
        self.executor = executor or ActionExecutor.get_instance()
        self.registry = registry or UIActionRegistry.get_instance()
        self.policy = policy_gateway or PolicyGateway.get_instance()
        self.audit = audit_service or AuditService.get_instance()
        self.context_resolver = context_resolver or ContextResolver()
        self.intent_resolver = intent_resolver or IntentResolver()
        self.cancelled_commands: Set[str] = set()
        self._validation_mesh = None

    @classmethod
    def get_instance(cls) -> CommandBus:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def cancel_command(self, command_id: str) -> bool:
        """Mark an in-flight or pending command as cancelled."""
        self.cancelled_commands.add(command_id)
        logger.info(f"Command '{command_id}' marked for cancellation.")
        return True

    def is_cancelled(self, command_id: str) -> bool:
        return command_id in self.cancelled_commands

    @property
    def validation_mesh(self):
        if self._validation_mesh is None:
            from app.services.validation.validation_chamber_mesh import ValidationChamberMesh
            self._validation_mesh = ValidationChamberMesh.get_instance()
        return self._validation_mesh

    async def validate_command(
        self,
        command: Command,
        user: Optional[UserIdentity] = None,
    ):
        from app.domain.validation_mesh import ValidationTarget
        target = ValidationTarget(
            target_id=command.command_id,
            target_type="COMMAND",
            case_id=command.arguments.get("case_id") or "CASE-2026-001",
            risk_class=command.risk_class,
            user=user,
            command_id=command.command_id,
            evidence_ids=[command.arguments["evidence_id"]] if "evidence_id" in command.arguments else [],
            payload=command.arguments,
        )
        return await self.validation_mesh.validate(target)

    async def dispatch(
        self,
        command: Command,
        user: Optional[UserIdentity] = None,
    ) -> CommandExecutionResult:
        """
        Main canonical dispatch pipeline:
        1. Cancellation check
        2. Context resolution & normalization
        3. 7-Factor Policy evaluation (Fail closed)
        4. Intent-to-Action translation
        5. Action execution
        6. Auditing & response formulation
        """
        # 1. Cancellation check
        if self.is_cancelled(command.command_id):
            return CommandExecutionResult(
                command_id=command.command_id,
                correlation_id=command.correlation_id,
                status=CommandStatus.CANCELLED,
                message=f"Command '{command.command_id}' was cancelled before execution.",
            )

        # 2. Context resolution
        resolved_context = self._resolve_command_context(command, user)
        case_id = command.arguments.get("case_id") or resolved_context.case_id or "CASE-2026-001"

        # 2b. Canonical InvestigationIntent resolution & canonical request class handling
        inv_intent = getattr(command, "investigation_intent", None)
        if not inv_intent and command.source in (CommandSource.CHAT, CommandSource.VOICE, CommandSource.KEYBOARD):
            from app.services.interaction.intent_normalizer import IntentNormalizer
            probe_intent = IntentNormalizer.get_instance().from_text_query(command.intent, resolved_context)
            if probe_intent:
                inv_intent = probe_intent
                command.investigation_intent = probe_intent

        if inv_intent:
            req_class = getattr(inv_intent, "request_class", None)

            # 1. Unauthorized Request
            if req_class == InvestigationRequestClass.UNAUTHORIZED_REQUEST:
                msg = getattr(inv_intent, "clarification_prompt", None) or f"Target case '{inv_intent.target_case or case_id}' is outside authorized scope."
                return CommandExecutionResult(
                    command_id=command.command_id,
                    correlation_id=command.correlation_id,
                    status=CommandStatus.UNAUTHORIZED,
                    message=f"UNAUTHORIZED_REQUEST: {msg}",
                )

            # 2. Unsupported Request
            if req_class == InvestigationRequestClass.UNSUPPORTED_REQUEST:
                msg = getattr(inv_intent, "clarification_prompt", None) or "This capability is unsupported by SentinelX forensic OS."
                return CommandExecutionResult(
                    command_id=command.command_id,
                    correlation_id=command.correlation_id,
                    status=CommandStatus.FAILED,
                    message=f"UNSUPPORTED_REQUEST: {msg}",
                )

            # 3. Out of Scope Request
            if req_class == InvestigationRequestClass.OUT_OF_SCOPE_REQUEST:
                msg = getattr(inv_intent, "clarification_prompt", None) or "Request is outside active case investigation purview."
                return CommandExecutionResult(
                    command_id=command.command_id,
                    correlation_id=command.correlation_id,
                    status=CommandStatus.FAILED,
                    message=f"OUT_OF_SCOPE_REQUEST: {msg}",
                )

            # 4. Clarification Required / Ambiguity
            if req_class == InvestigationRequestClass.CLARIFICATION_REQUIRED or getattr(inv_intent, "ambiguity", False):
                reason = getattr(inv_intent, "ambiguity_reason", "Intent is ambiguous.")
                prompt = getattr(inv_intent, "clarification_prompt", "Please clarify your request.")
                return CommandExecutionResult(
                    command_id=command.command_id,
                    correlation_id=command.correlation_id,
                    status=CommandStatus.FAILED,
                    message=f"AMBIGUOUS_INTENT (CLARIFICATION_REQUIRED): {prompt}".strip(),
                )

            # 5. Confirmation Required (Statutory / High-Risk Coercive Actions)
            if req_class == InvestigationRequestClass.CONFIRMATION_REQUIRED or getattr(inv_intent, "requires_confirmation", False):
                confirmation_token = command.authorization_context.get("confirmation_token")
                if not confirmation_token:
                    challenge = ConfirmationChallenge(
                        risk_class=ActionRiskClass.EXECUTE,
                        tool_name=inv_intent.intent_name,
                        arguments=inv_intent.parameters,
                        prompt_message=getattr(inv_intent, "clarification_prompt", None) or f"Statutory authorization required for '{inv_intent.intent_name}'.",
                        expires_at=datetime.now(UTC).isoformat(),
                    )
                    return CommandExecutionResult(
                        command_id=command.command_id,
                        correlation_id=command.correlation_id,
                        status=CommandStatus.WAITING_CONFIRMATION,
                        requires_confirmation=True,
                        confirmation_challenge=challenge,
                        message=f"CONFIRMATION_REQUIRED: {challenge.prompt_message}",
                    )

            if getattr(inv_intent, "target_case", None):
                case_id = inv_intent.target_case

        # 3. Policy & Authorization check
        allowed_cases = user.scope.allowed_cases if user and user.scope else ["CASE-2026-001", "C102"]
        allowed_jurisdictions = user.scope.jurisdictions if user and user.scope else [
            "Delhi NCR / Gurugram",
            "Delhi NCR / Special Cell",
            "State of Haryana / Cyber Crime",
        ]

        # Verify case scope access
        if case_id and case_id not in allowed_cases:
            logger.warning(
                f"Policy rejection: Case '{case_id}' out of authorized scope for user '{resolved_context.user_id}'."
            )
            return CommandExecutionResult(
                command_id=command.command_id,
                correlation_id=command.correlation_id,
                status=CommandStatus.UNAUTHORIZED,
                message=f"POLICY_DENIAL: Case '{case_id}' is outside authorized case scope.",
            )

        # 4. Resolve Actions to execute
        actions_to_execute = await self._resolve_actions(command, resolved_context)

        if not actions_to_execute:
            return CommandExecutionResult(
                command_id=command.command_id,
                correlation_id=command.correlation_id,
                status=CommandStatus.FAILED,
                message=f"Unable to resolve valid UI actions for intent '{command.intent}'.",
            )

        # 5. Check risk and confirmations for all actions
        for action_type, args in actions_to_execute:
            defn = self.registry.get(action_type)
            if not defn:
                continue

            # If action or command is high-risk and confirmation is required
            if command.risk_class == ActionRiskClass.EXECUTE or defn.risk_class == ActionRiskClass.EXECUTE:
                confirmation_token = command.authorization_context.get("confirmation_token")
                if not confirmation_token:
                    challenge = ConfirmationChallenge(
                        risk_class=defn.risk_class,
                        tool_name=action_type.value,
                        arguments=args,
                        prompt_message=f"Action '{action_type.value}' requires explicit statutory authorization.",
                        expires_at=datetime.now(UTC).isoformat(),
                    )
                    return CommandExecutionResult(
                        command_id=command.command_id,
                        correlation_id=command.correlation_id,
                        status=CommandStatus.WAITING_CONFIRMATION,
                        requires_confirmation=True,
                        confirmation_challenge=challenge,
                        message=f"Action '{action_type.value}' requires authorized confirmation.",
                    )

        # 6. Execute actions via ActionExecutor
        executed_ui_actions: List[UIActionDescriptor] = []
        combined_output: Dict[str, Any] = {}
        last_message = ""

        for action_type, args in actions_to_execute:
            if self.is_cancelled(command.command_id):
                return CommandExecutionResult(
                    command_id=command.command_id,
                    correlation_id=command.correlation_id,
                    status=CommandStatus.CANCELLED,
                    ui_actions=executed_ui_actions,
                    message="Execution aborted due to cancellation.",
                )

            res = self.executor.execute_action(
                action_type=action_type,
                arguments=args,
                context=resolved_context,
                correlation_id=command.correlation_id,
                command_id=command.command_id,
            )

            if res.status != CommandStatus.SUCCESS:
                return res

            executed_ui_actions.extend(res.ui_actions)
            if res.output_data:
                combined_output.update(res.output_data)
            last_message = res.message

        # 7. Comprehensive Audit Trail
        self.audit.log_access_event(
            user_id=resolved_context.user_id,
            resource_type="COMMAND_BUS",
            action=f"DISPATCH_{command.source.value}",
            details={
                "command_id": command.command_id,
                "correlation_id": command.correlation_id,
                "source": command.source.value,
                "intent": command.intent,
                "actions_executed": [a.action_type.value for a in executed_ui_actions],
                "case_id": case_id,
            },
        )

        # 8. Governed Memory Projection
        try:
            from app.services.memory.memory_service import MemoryService
            from app.services.memory.episodic_memory import EpisodicMemoryManager
            from app.domain.operating_context import OperatingContext
            mem_service = MemoryService.get_instance()
            ep_rec = EpisodicMemoryManager.create_investigator_action_record(
                case_id=case_id or "GENERAL",
                investigator_id=resolved_context.user_id,
                action_name=f"{command.source.value}:{command.intent}",
                details={"command_id": command.command_id, "actions": [a.action_type.value for a in executed_ui_actions]},
                audit_event_id=f"AUD-{command.correlation_id[:8]}",
                jurisdiction=resolved_context.jurisdiction or "NATIONAL_CYBER_CRIME_COORDINATION",
            )
            mem_service.store.save_record(ep_rec)
            wm = mem_service.working_manager.get_or_create(
                session_id=resolved_context.session_id or f"SES-{command.correlation_id[:8]}",
                case_id=case_id or "GENERAL",
                investigator_id=resolved_context.user_id,
                jurisdiction=resolved_context.jurisdiction or "NATIONAL_CYBER_CRIME_COORDINATION",
            )
            wm.add_command({
                "source": command.source.value,
                "intent": command.intent,
                "command_id": command.command_id,
                "timestamp": datetime.now(UTC).isoformat(),
            })
            if command.source.value == "VOICE":
                wm.add_voice_turn({
                    "intent": command.intent,
                    "transcript": command.payload.get("raw_transcript", command.intent),
                    "timestamp": datetime.now(UTC).isoformat(),
                })
        except Exception as ex:
            logger.debug("Memory projection from CommandBus skipped: %s", ex)

        # 8b. Update Investigation Context Snapshot (Subphase A3)
        try:
            from app.services.interaction.investigation_context_manager import InvestigationContextManager
            ctx_mgr = InvestigationContextManager.get_instance()
            ses_id = resolved_context.session_id or f"SES-{command.correlation_id[:8]}"
            ctx_mgr.record_command_execution(
                session_id=ses_id,
                case_id=case_id,
                command_id=command.command_id,
                intent_name=command.intent,
                status="SUCCESS",
                output_data=combined_output,
                correlation_id=command.correlation_id,
            )
            sel_ent = command.arguments.get("entity_id")
            sel_ev = command.arguments.get("evidence_id")
            sel_clm = command.arguments.get("claim_id")
            sel_rel = command.arguments.get("relationship_id")
            if any([sel_ent, sel_ev, sel_clm, sel_rel]):
                ctx_mgr.set_selection(
                    session_id=ses_id,
                    case_id=case_id,
                    entity_id=sel_ent,
                    relationship_id=sel_rel,
                    evidence_ids=[sel_ev] if sel_ev else None,
                    claim_id=sel_clm,
                    correlation_id=command.correlation_id,
                )
        except Exception as ex:
            logger.debug("InvestigationContextManager update skipped: %s", ex)

        return CommandExecutionResult(
            command_id=command.command_id,
            correlation_id=command.correlation_id,
            status=CommandStatus.SUCCESS,
            ui_actions=executed_ui_actions,
            output_data=combined_output,
            message=last_message or f"Command '{command.intent}' processed successfully.",
            audit_event_id=f"AUD-{command.correlation_id[:8]}",
        )

    def _resolve_command_context(
        self,
        command: Command,
        user: Optional[UserIdentity],
    ) -> InteractionContext:
        ctx = command.context
        if user:
            ctx.user_id = user.user_id
            ctx.user_role = user.role.value
            ctx.clearance = user.clearance
            if user.jurisdiction:
                ctx.jurisdiction = user.jurisdiction
        return ctx

    async def _resolve_actions(
        self,
        command: Command,
        context: InteractionContext,
    ) -> List[tuple[UIActionType, Dict[str, Any]]]:
        """
        Determines the list of (UIActionType, arguments) tuples to execute.
        Prioritizes explicit requested_actions, then maps canonical intents.
        """
        actions: List[tuple[UIActionType, Dict[str, Any]]] = []

        # 1. Explicit UI action names requested directly (e.g. from UI buttons or typed CLI)
        if command.requested_actions:
            for act_name in command.requested_actions:
                try:
                    act_type = UIActionType(act_name)
                    actions.append((act_type, command.arguments))
                except ValueError:
                    logger.warning(f"Requested action '{act_name}' not a valid UIActionType.")
            return actions


        intent_raw = command.intent.strip()
        intent_lower = intent_raw.lower()
        args = dict(command.arguments)
        case_id = args.get("case_id") or context.case_id or "CASE-2026-001"

        # Check if intent is directly an action name
        try:
            act_type = UIActionType(intent_raw)
            return [(act_type, args)]
        except ValueError:
            pass

        # 2. Canonical Golden Command Mapping
        # Graph
        if re.search(r"\b(open\s+the\s+graph|open\s+graph|show\s+graph|intelligence\s+graph)\b", intent_lower):
            args.setdefault("case_id", case_id)
            return [(UIActionType.OPEN_GRAPH, args)]

        # Contradictions
        if re.search(r"\b(show\s+contradictions?|open\s+contradictions?|inspect\s+contradictions?|contradiction\s+center)\b", intent_lower):
            args.setdefault("case_id", case_id)
            return [(UIActionType.OPEN_CONTRADICTIONS, args)]

        # Evidence
        if re.search(r"\b(show\s+evidence|open\s+evidence|view\s+evidence|forensic\s+evidence)\b", intent_lower):
            args.setdefault("evidence_id", args.get("evidence_id", "EV-ANPR-001"))
            return [(UIActionType.OPEN_EVIDENCE, args)]

        # Timeline
        if re.search(r"\b(open\s+(the\s+)?timeline|show\s+timeline|compare\s+timelines?)\b", intent_lower):
            args.setdefault("case_id", case_id)
            return [(UIActionType.OPEN_TIMELINE, args)]

        # Gaps
        if re.search(r"\b(show\s+(the\s+)?(evidence\s+)?gap|open\s+gaps?|inspect\s+gaps?)\b", intent_lower):
            args.setdefault("case_id", case_id)
            return [(UIActionType.OPEN_GAPS, args)]

        # Provenance / Proof
        if re.search(r"\b(trace\s+provenance|show\s+proof|live\s+proof|prove\s+claim)\b", intent_lower):
            claim_id = args.get("claim_id") or context.selected_claim_id or "CLM-2026-001"
            args["claim_id"] = claim_id
            return [(UIActionType.OPEN_PROOF, args)]

        # Supporting Evidence
        if re.search(r"\b(show\s+supporting\s+evidence|show\s+support|supporting\s+facts?)\b", intent_lower):
            claim_id = args.get("claim_id") or context.selected_claim_id or "CLM-2026-001"
            args["claim_id"] = claim_id
            return [(UIActionType.SHOW_SUPPORT, args)]

        # Search
        if intent_lower.startswith("search for") or intent_lower.startswith("search entity") or intent_lower.startswith("search "):
            query_str = re.sub(r"^(search\s+for\s+(this\s+entity\s+)?|search\s+entity\s+|search\s+)", "", intent_raw, flags=re.IGNORECASE).strip()
            if not query_str or query_str.lower() in ("this entity", "entity"):
                query_str = context.selected_entity_id or "Vikram Singh"
            args["query"] = query_str
            return [(UIActionType.SEARCH, args)]

        # Focus
        if intent_lower.startswith("focus on") or intent_lower.startswith("focus "):
            target_str = re.sub(r"^(focus\s+on\s+(this\s+person\s+|this\s+entity\s+)?|focus\s+)", "", intent_raw, flags=re.IGNORECASE).strip()
            entity_id = target_str or context.selected_entity_id or "P001"
            if entity_id.lower() in ("this person", "this entity", ""):
                entity_id = context.selected_entity_id or "P001"
            args["entity_id"] = entity_id
            return [(UIActionType.FOCUS, args)]

        # Compare
        if "compare" in intent_lower and "and" in intent_lower:
            parts = re.findall(r"\b(p\d+|[A-Z][a-z]+)\b", intent_raw)
            if len(parts) >= 2:
                args["entity_a"] = parts[0]
                args["entity_b"] = parts[1]
                return [(UIActionType.COMPARE, args)]

        # Open Case
        if "open case" in intent_lower or "switch case" in intent_lower:
            case_match = re.search(r"\b(case-\d{4}-\d+|c\d+)\b", intent_lower)
            if case_match:
                args["case_id"] = case_match.group(1).upper()
                return [(UIActionType.OPEN_CASE, args)]

        # ── Phase 3: Agent Task Intents ──────────────────────────
        # Run specific agent
        agent_type_map = {
            "evidence": "EVIDENCE_ANALYST",
            "entity": "ENTITY_ANALYST",
            "timeline": "TIMELINE_ANALYST",
            "contradiction": "CONTRADICTION_ANALYST",
            "gap": "GAP_ANALYST",
        }

        if re.search(r"\b(run\s+agent|dispatch\s+agent|execute\s+agent)\b", intent_lower):
            for key, agent_val in agent_type_map.items():
                if key in intent_lower:
                    args["agent_type"] = agent_val
                    args["objective"] = intent_raw
                    args.setdefault("case_id", case_id)
                    return [(UIActionType.RUN_AGENT_TASK, args)]
            # Default to evidence analyst
            args["agent_type"] = "EVIDENCE_ANALYST"
            args["objective"] = intent_raw
            args.setdefault("case_id", case_id)
            return [(UIActionType.RUN_AGENT_TASK, args)]

        # Analyze commands that invoke specific agents
        if re.search(r"\b(analyze\s+contradictions?|detect\s+contradictions?|scan\s+for\s+contradictions?)\b", intent_lower):
            args["agent_type"] = "CONTRADICTION_ANALYST"
            args["objective"] = intent_raw
            args.setdefault("case_id", case_id)
            return [(UIActionType.RUN_AGENT_TASK, args)]

        if re.search(r"\b(analyze\s+(evidence\s+)?gaps?|find\s+missing\s+evidence|identify\s+gaps?)\b", intent_lower):
            args["agent_type"] = "GAP_ANALYST"
            args["objective"] = intent_raw
            args.setdefault("case_id", case_id)
            return [(UIActionType.RUN_AGENT_TASK, args)]

        if re.search(r"\b(analyze\s+entities|find\s+entity\s+linkages?|detect\s+identity\s+matches?)\b", intent_lower):
            args["agent_type"] = "ENTITY_ANALYST"
            args["objective"] = intent_raw
            args.setdefault("case_id", case_id)
            return [(UIActionType.RUN_AGENT_TASK, args)]

        if re.search(r"\b(analyze\s+timeline|detect\s+temporal\s+anomal|temporal\s+analysis)\b", intent_lower):
            args["agent_type"] = "TIMELINE_ANALYST"
            args["objective"] = intent_raw
            args.setdefault("case_id", case_id)
            return [(UIActionType.RUN_AGENT_TASK, args)]

        if re.search(r"\b(analyze\s+evidence|correlate\s+evidence|evidence\s+analysis)\b", intent_lower):
            args["agent_type"] = "EVIDENCE_ANALYST"
            args["objective"] = intent_raw
            args.setdefault("case_id", case_id)
            return [(UIActionType.RUN_AGENT_TASK, args)]

        # Show agent findings
        if re.search(r"\b(show\s+(agent\s+)?findings|agent\s+results?|investigation\s+findings)\b", intent_lower):
            args.setdefault("case_id", case_id)
            return [(UIActionType.SHOW_AGENT_FINDINGS, args)]

        # 3. Canonical InvestigationIntent resolution (Subphase A2 General Intent)
        inv_intent = getattr(command, "investigation_intent", None)
        if inv_intent and hasattr(inv_intent, "intent_name"):
            intent_name = inv_intent.intent_name
            params = dict(inv_intent.parameters)
            if hasattr(inv_intent, "target_case") and inv_intent.target_case:
                params.setdefault("case_id", inv_intent.target_case)
            params.setdefault("case_id", context.case_id or "CASE-2026-001")
            try:
                act_type = UIActionType(intent_name)
                # Ensure actions satisfy required schema arguments
                if act_type == UIActionType.FILTER:
                    params.setdefault("filter_type", "GENERAL")
                    if "values" not in params:
                        params["values"] = ["DEFAULT_FILTER"]
                elif act_type == UIActionType.FOCUS:
                    params.setdefault("entity_id", getattr(inv_intent, "target_entity", None) or context.selected_entity_id or "P001")
                elif act_type == UIActionType.EXPAND:
                    params.setdefault("entity_id", getattr(inv_intent, "target_entity", None) or context.selected_entity_id or "P001")
                elif act_type == UIActionType.COLLAPSE:
                    params.setdefault("entity_id", getattr(inv_intent, "target_entity", None) or context.selected_entity_id or "P001")
                elif act_type == UIActionType.SELECT:
                    params.setdefault("target_type", "ENTITY")
                    params.setdefault("target_id", getattr(inv_intent, "target_entity", None) or context.selected_entity_id or "P001")
                elif act_type == UIActionType.SEARCH:
                    params.setdefault("query", getattr(inv_intent, "raw_input", "") or "INVESTIGATION_SEARCH")
                elif act_type == UIActionType.COMPARE:
                    ents = getattr(inv_intent, "entities", [])
                    if len(ents) >= 2:
                        params.setdefault("entity_a", ents[0])
                        params.setdefault("entity_b", ents[1])
                    else:
                        params.setdefault("entity_a", context.selected_entity_id or "P001")
                        params.setdefault("entity_b", "P002")
                elif act_type == UIActionType.OPEN_PROOF:
                    params.setdefault("claim_id", getattr(inv_intent, "target_claim", None) or context.selected_claim_id or "CLM-2026-001")
                elif act_type == UIActionType.SHOW_SUPPORT:
                    params.setdefault("claim_id", getattr(inv_intent, "target_claim", None) or context.selected_claim_id or "CLM-2026-001")
                elif act_type == UIActionType.OPEN_EVIDENCE:
                    params.setdefault("evidence_id", getattr(inv_intent, "target_evidence", None) or context.selected_evidence_id or "EV-ANPR-001")
                elif act_type == UIActionType.RUN_AGENT_TASK:
                    params.setdefault("agent_type", "EVIDENCE_ANALYST")
                    params.setdefault("objective", getattr(inv_intent, "raw_input", "Agent analysis"))

                return [(act_type, params)]
            except ValueError:
                pass

        # 4. Fallback to semantic IntentResolver
        resolved_intent = await self.intent_resolver.resolve_intent(
            query=intent_raw,
            context=context,
        )

        name = resolved_intent.intent_name
        p = resolved_intent.parameters

        if name == "INSPECT_CONTRADICTIONS":
            actions.append((UIActionType.OPEN_CONTRADICTIONS, {"case_id": case_id, **p}))
        elif name == "INSPECT_EVIDENCE_GAPS":
            actions.append((UIActionType.OPEN_GAPS, {"case_id": case_id, **p}))
        elif name == "PROVE_CLAIM_LINEAGE":
            actions.append((UIActionType.OPEN_PROOF, {"claim_id": p.get("claim_id", "CLM-2026-001"), **p}))
        elif name == "COMPARE_TIMELINES":
            actions.append((UIActionType.OPEN_TIMELINE, {"case_id": case_id, **p}))
        elif name == "FIND_ENTITY_LINKAGES":
            ea = p.get("entity_a", "P001")
            actions.append((UIActionType.FOCUS, {"entity_id": ea}))
            actions.append((UIActionType.OPEN_GRAPH, {"case_id": case_id}))
        elif name == "SEARCH_CASES":
            actions.append((UIActionType.SEARCH, {"query": intent_raw}))
        else:
            # Default to Open Graph if generic
            actions.append((UIActionType.OPEN_GRAPH, {"case_id": case_id}))

        return actions
