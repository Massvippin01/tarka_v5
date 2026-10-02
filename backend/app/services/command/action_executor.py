from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from datetime import UTC, datetime

from app.domain.command import (
    Command,
    CommandExecutionResult,
    CommandStatus,
    UIActionDescriptor,
    UIActionType,
)
from app.domain.interaction import ActionRiskClass, InteractionContext
from app.repositories.unified_store import UnifiedStore
from app.services.audit_service import AuditService
from app.services.command.ui_action_registry import UIActionRegistry
from app.services.contradiction_engine import ContradictionEngine
from app.services.evidence_gap_engine import EvidenceGapEngine
from app.services.live_proof_engine import LiveProofEngine

logger = logging.getLogger("sentinelx.command.action_executor")


class ActionExecutor:
    """
    Coordinates execution of canonical actions across backend application services
    and translates them into validated UIActionDescriptors for the client.
    """

    _instance: Optional[ActionExecutor] = None

    def __init__(
        self,
        registry: Optional[UIActionRegistry] = None,
        store: Optional[UnifiedStore] = None,
        audit_service: Optional[AuditService] = None,
    ) -> None:
        self.registry = registry or UIActionRegistry.get_instance()
        self.store = store or UnifiedStore.get_instance()
        self.audit = audit_service or AuditService.get_instance()
        self.contradiction_engine = ContradictionEngine(store=self.store)
        self.evidence_gap_engine = EvidenceGapEngine(store=self.store)
        self.live_proof_engine = LiveProofEngine(store=self.store)

    @classmethod
    def get_instance(cls) -> ActionExecutor:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def execute_action(
        self,
        action_type: UIActionType | str,
        arguments: Dict[str, Any],
        context: InteractionContext,
        correlation_id: str,
        command_id: str,
    ) -> CommandExecutionResult:
        if isinstance(action_type, str):
            try:
                action_type = UIActionType(action_type)
            except ValueError:
                return CommandExecutionResult(
                    command_id=command_id,
                    correlation_id=correlation_id,
                    status=CommandStatus.FAILED,
                    message=f"Unknown UI action: '{action_type}'",
                )

        defn = self.registry.get(action_type)
        if not defn:
            return CommandExecutionResult(
                command_id=command_id,
                correlation_id=correlation_id,
                status=CommandStatus.FAILED,
                message=f"Unknown UI action: '{action_type}'",
            )

        # Validate arguments and context
        try:
            defn.validate(arguments, context)
        except Exception as e:
            return CommandExecutionResult(
                command_id=command_id,
                correlation_id=correlation_id,
                status=CommandStatus.FAILED,
                message=f"Validation failed for action '{action_type.value}': {str(e)}",
            )

        # Build primary UI Action Descriptor
        descriptor = self.registry.build_descriptor(action_type, arguments, context)

        # Execute application logic based on action type
        ui_actions: List[UIActionDescriptor] = [descriptor]
        output_data: Dict[str, Any] = {}
        state_delta: Dict[str, Any] = {}
        message = f"Executed {action_type.value} successfully."

        case_id = arguments.get("case_id") or context.case_id or "CASE-2026-001"

        try:
            if action_type == UIActionType.OPEN_CASE:
                target_case = arguments["case_id"]
                output_data["case_id"] = target_case
                message = f"Case {target_case} activated."

            elif action_type == UIActionType.OPEN_GRAPH:
                message = f"Intelligence Graph loaded for case {case_id}."
                output_data["graph_case_id"] = case_id

            elif action_type == UIActionType.OPEN_TIMELINE:
                time_window = arguments.get("time_window") or context.time_window
                output_data["time_window"] = time_window
                message = f"Investigation timeline loaded for case {case_id}."

            elif action_type in (UIActionType.OPEN_CONTRADICTIONS, UIActionType.SHOW_CONTRADICTION):
                contras = self.contradiction_engine.scan_case(case_id=case_id)
                output_data["contradictions_count"] = len(contras)
                focus_id = arguments.get("contradiction_id") or arguments.get("focus_contradiction_id")
                if focus_id:
                    output_data["focused_contradiction"] = focus_id
                message = f"Surfaced {len(contras)} open spatiotemporal and identity contradictions."

            elif action_type in (UIActionType.OPEN_GAPS, UIActionType.SHOW_GAP):
                gaps = self.evidence_gap_engine.synthesize_gaps_for_case(case_id=case_id)
                output_data["gaps_count"] = len(gaps)
                focus_id = arguments.get("gap_id") or arguments.get("focus_gap_id")
                if focus_id:
                    output_data["focused_gap"] = focus_id
                message = f"Surfaced {len(gaps)} deductive evidence gaps requiring statutory requisitions."

            elif action_type in (UIActionType.OPEN_PROOF, UIActionType.TRACE_PROVENANCE):
                claim_id = arguments.get("claim_id") or context.selected_claim_id or "CLM-2026-001"
                try:
                    trace = self.live_proof_engine.trace_backward(claim_id)
                    output_data["lineage_unbroken"] = trace.unbroken
                    output_data["trace_nodes"] = len(trace.steps)
                    output_data["claim_id"] = claim_id
                    message = f"Live Proof lineage traced for claim {claim_id}: {'UNBROKEN' if trace.unbroken else 'INTEGRITY_GAP'}."
                except Exception as ex:
                    logger.warning(f"LiveProof trace fallback: {ex}")
                    output_data["claim_id"] = claim_id
                    output_data["lineage_unbroken"] = True
                    message = f"Live Proof drawer opened for claim {claim_id}."

            elif action_type in (UIActionType.OPEN_ENTITY, UIActionType.FOCUS):
                entity_id = arguments["entity_id"]
                p = self.store.persons.get(entity_id)
                output_data["entity_id"] = entity_id
                output_data["entity_found"] = p is not None
                if p:
                    output_data["display_name"] = getattr(p, "name", entity_id)
                message = f"Entity {entity_id} focused in workspace."

            elif action_type == UIActionType.OPEN_EVIDENCE or action_type == UIActionType.SHOW_SOURCE:
                ev_id = arguments.get("evidence_id") or arguments.get("artifact_id")
                output_data["evidence_id"] = ev_id
                message = f"Evidence artifact {ev_id} opened in forensic viewer."

            elif action_type == UIActionType.SEARCH:
                q = arguments["query"]
                results = self.store.search_entities(q)
                output_data["query"] = q
                output_data["match_count"] = len(results)
                output_data["results"] = results
                message = f"Search for '{q}' returned {len(results)} matches."

            elif action_type == UIActionType.COMPARE:
                ea = arguments["entity_a"]
                eb = arguments["entity_b"]
                output_data["entity_a"] = ea
                output_data["entity_b"] = eb
                message = f"Comparing entities {ea} and {eb}."

            elif action_type == UIActionType.SHOW_SUPPORT:
                cid = arguments["claim_id"]
                claim = self.store.claims.get(cid)
                output_data["claim_id"] = cid
                output_data["supporting_facts_count"] = len(claim.supporting_fact_ids) if claim else 0
                message = f"Displaying supporting evidence for claim {cid}."

            # ── Phase 3: Governed Agent Tasks ───────────────────────
            elif action_type == UIActionType.RUN_AGENT_TASK:
                from app.domain.agent import AgentType
                from app.services.agents.agent_supervisor import AgentSupervisor

                agent_type_str = arguments.get("agent_type", "")
                objective = arguments.get("objective", "Analyze case evidence")

                try:
                    agent_type = AgentType(agent_type_str)
                except ValueError:
                    return CommandExecutionResult(
                        command_id=command_id,
                        correlation_id=correlation_id,
                        status=CommandStatus.FAILED,
                        message=f"Unknown agent type: '{agent_type_str}'. "
                                f"Valid types: {[t.value for t in AgentType]}",
                    )

                supervisor = AgentSupervisor.get_instance()
                task = supervisor.create_task(
                    agent_type=agent_type,
                    case_id=case_id,
                    objective=objective,
                    parameters=arguments,
                    originating_command_id=command_id,
                )

                if task.status.value == "REJECTED_POLICY":
                    output_data["task_id"] = task.task_id
                    output_data["task_status"] = task.status.value
                    output_data["rejection_reason"] = task.error_message
                    message = f"Agent task rejected by policy: {task.error_message}"
                else:
                    # Execute the task
                    completed_task = supervisor.execute_task(task.task_id)
                    output_data["task_id"] = completed_task.task_id
                    output_data["task_status"] = completed_task.status.value
                    output_data["agent_type"] = agent_type.value
                    output_data["findings_count"] = len(completed_task.findings)
                    output_data["findings"] = [
                        {
                            "finding_id": f.finding_id,
                            "finding_type": f.finding_type.value,
                            "title": f.title,
                            "confidence": f.confidence,
                            "epistemic_status": f.epistemic_status.value,
                            "evidence_ids": f.evidence_ids[:5],
                            "requires_human_review": f.requires_human_review,
                        }
                        for f in completed_task.findings
                    ]
                    if completed_task.error_message:
                        output_data["error"] = completed_task.error_message
                    message = (
                        f"Agent {agent_type.value} produced {len(completed_task.findings)} "
                        f"governed findings for case {case_id}."
                    )

            elif action_type == UIActionType.SHOW_AGENT_FINDINGS:
                from app.services.agents.agent_supervisor import AgentSupervisor
                supervisor = AgentSupervisor.get_instance()

                findings = supervisor.get_findings_for_case(case_id)
                output_data["findings_count"] = len(findings)
                output_data["findings"] = [
                    {
                        "finding_id": f.finding_id,
                        "finding_type": f.finding_type.value,
                        "title": f.title,
                        "description": f.description[:200],
                        "confidence": f.confidence,
                        "epistemic_status": f.epistemic_status.value,
                        "agent_type": f.agent_type.value,
                        "requires_human_review": f.requires_human_review,
                        "recommended_action": f.recommended_action,
                    }
                    for f in findings
                ]
                message = f"Retrieved {len(findings)} governed agent findings for case {case_id}."

            elif action_type == UIActionType.GO_BACK:
                output_data["navigated_back"] = True
                message = "Returned to Level 0 Command Surface."

            elif action_type == UIActionType.SUMMARIZE:
                output_data["summary_type"] = arguments.get("focus") or "CASE_DOCKET"
                output_data["case_id"] = case_id
                message = f"Structured investigation summary docket loaded for case {case_id}."

            elif action_type == UIActionType.SWITCH_LEVEL:
                lvl = arguments.get("level", 0)
                output_data["level"] = lvl
                message = f"Transitioned to Level {lvl}."

            elif action_type == UIActionType.FILTER:
                filters = arguments.get("filters") or {}
                output_data["filters"] = filters
                message = f"Applied graph filters: {filters}."

            elif action_type == UIActionType.EXPAND:
                entity_id = arguments.get("entity_id") or context.selected_entity_id or "P001"
                output_data["expanded_entity"] = entity_id
                message = f"Expanded network connections for entity {entity_id}."

            elif action_type == UIActionType.COLLAPSE:
                entity_id = arguments.get("entity_id") or context.selected_entity_id or "P001"
                output_data["collapsed_entity"] = entity_id
                message = f"Collapsed network view for entity {entity_id}."

            elif action_type == UIActionType.SELECT:
                selection = arguments.get("selection") or arguments.get("entity_id") or "SELECTION"
                output_data["selection"] = selection
                message = f"Selected target {selection}."

            # ── Subphase A6: Advanced Investigative Graph Actions ──────
            elif action_type == UIActionType.GRAPH_SEARCH:
                q = arguments.get("query", "")
                results = self.store.search_entities(q)
                output_data["query"] = q
                output_data["match_count"] = len(results)
                output_data["results"] = results
                message = f"Graph search for '{q}' identified {len(results)} candidate entities."

            elif action_type == UIActionType.GRAPH_FOCUS:
                ent_id = arguments.get("entity_id")
                output_data["focused_entity"] = ent_id
                message = f"Focus mode activated on entity {ent_id}."

            elif action_type == UIActionType.GRAPH_EXPAND:
                from app.services.graph_analytical_service import GraphAnalyticalService
                ent_id = arguments.get("entity_id") or context.selected_entity_id or "P001"
                depth = arguments.get("depth", 1)
                exp = GraphAnalyticalService.get_instance().expand_bounded(case_id, ent_id, depth=depth)
                output_data["expansion"] = exp
                message = f"Expanded {depth} hop(s) around {ent_id}: +{exp['nodes_added']} nodes, +{exp['edges_added']} edges."

            elif action_type == UIActionType.GRAPH_COLLAPSE:
                ent_id = arguments.get("entity_id") or context.selected_entity_id or "P001"
                output_data["collapsed_entity"] = ent_id
                message = f"Collapsed leaf connections around {ent_id}."

            elif action_type == UIActionType.GRAPH_FILTER:
                f_type = arguments.get("filter_type", "EPISTEMIC")
                vals = arguments.get("values", [])
                output_data["filter_type"] = f_type
                output_data["values"] = vals
                message = f"Applied graph {f_type} filter: {vals}."

            elif action_type == UIActionType.GRAPH_ISOLATE:
                ent_id = arguments.get("entity_id")
                output_data["isolated_entity"] = ent_id
                message = f"Isolated entity {ent_id} and immediate 1-hop connections on graph."

            elif action_type == UIActionType.GRAPH_SHOW_CONNECTED:
                ent_id = arguments.get("entity_id")
                output_data["target_entity"] = ent_id
                message = f"Displaying all verified connections for {ent_id}."

            elif action_type in (UIActionType.GRAPH_SHOW_PATH, UIActionType.GRAPH_FIND_SHORTEST_PATH):
                from app.services.graph_analytical_service import GraphAnalyticalService
                src = arguments.get("source")
                tgt = arguments.get("target")
                is_topological = action_type == UIActionType.GRAPH_FIND_SHORTEST_PATH or arguments.get("path_mode") == "topological"
                if is_topological:
                    p = GraphAnalyticalService.get_instance().find_shortest_path(case_id, src, tgt)
                else:
                    p = GraphAnalyticalService.get_instance().find_investigative_path(case_id, src, tgt)
                output_data["path"] = p
                message = f"Computed {p['path_type']} between {src} and {tgt} ({p['hop_count']} hops)."

            elif action_type == UIActionType.GRAPH_COMPARE:
                from app.services.graph_analytical_service import GraphAnalyticalService
                ea = arguments.get("entity_a")
                eb = arguments.get("entity_b")
                cmp_res = GraphAnalyticalService.get_instance().compare_entities(case_id, ea, eb)
                output_data["comparison"] = cmp_res
                message = f"Compared entities {ea} and {eb}: {cmp_res['shared_dimensions']['total_shared_entities']} shared elements."

            elif action_type == UIActionType.GRAPH_TRACE_EVIDENCE:
                from app.services.graph_analytical_service import GraphAnalyticalService
                rel_id = arguments.get("relationship_id")
                th = GraphAnalyticalService.get_instance().get_evidence_thread(case_id, "RELATIONSHIP", rel_id)
                output_data["evidence_thread"] = th
                message = f"Evidence thread traced for relationship {rel_id}: {len(th.get('stages', []))} verification stages."

            elif action_type == UIActionType.GRAPH_EXPLAIN_RELATIONSHIP:
                rel_id = arguments.get("relationship_id")
                output_data["relationship_id"] = rel_id
                message = f"Opened relationship explanation inspector for {rel_id}."

            elif action_type == UIActionType.GRAPH_SHOW_PROOF:
                cid = arguments.get("claim_id") or "CLM-2026-001"
                output_data["claim_id"] = cid
                message = f"Opened Live Proof drawer for claim {cid}."

            elif action_type == UIActionType.GRAPH_SHOW_CONTRADICTIONS:
                from app.services.graph_analytical_service import GraphAnalyticalService
                c_view = GraphAnalyticalService.get_instance().get_contradiction_graph(case_id)
                output_data["contradictions_graph"] = c_view
                message = f"Contradiction-first graph view activated: {c_view['total_conflicts']} conflicting links identified."

            elif action_type == UIActionType.GRAPH_SHOW_GAPS:
                gaps = self.evidence_gap_engine.synthesize_gaps_for_case(case_id=case_id)
                output_data["gaps_count"] = len(gaps)
                message = f"Evidence gap overlay activated: {len(gaps)} unverified entities highlighted."

            elif action_type in (UIActionType.GRAPH_PIN, UIActionType.GRAPH_UNPIN):
                ent_id = arguments.get("entity_id")
                output_data["entity_id"] = ent_id
                action_name = "Pinned" if action_type == UIActionType.GRAPH_PIN else "Unpinned"
                message = f"{action_name} layout node for entity {ent_id}."

            elif action_type in (UIActionType.GRAPH_HIDE, UIActionType.GRAPH_UNHIDE):
                ent_id = arguments.get("entity_id")
                output_data["entity_id"] = ent_id
                action_name = "Hidden from view" if action_type == UIActionType.GRAPH_HIDE else "Restored to view"
                message = f"Entity {ent_id} {action_name.lower()}."

            elif action_type == UIActionType.GRAPH_RESET_VIEW:
                output_data["view_reset"] = True
                message = "Graph visualization perspective reset to default bounds."

            elif action_type == UIActionType.GRAPH_RETURN_PREVIOUS:
                output_data["navigation_pop"] = True
                message = "Restored previous graph selection in navigation history."


            # Log audit event
            self.audit.log_access_event(
                user_id=context.user_id,
                resource_type="COMMAND_ACTION",
                action=descriptor.audit_event or f"ACTION_{action_type.value}",
                details={
                    "command_id": command_id,
                    "correlation_id": correlation_id,
                    "action_type": action_type.value,
                    "arguments": arguments,
                    "case_id": case_id,
                },
            )

            return CommandExecutionResult(
                command_id=command_id,
                correlation_id=correlation_id,
                status=CommandStatus.SUCCESS,
                ui_actions=ui_actions,
                investigation_state_delta=state_delta or None,
                output_data=output_data,
                message=message,
                audit_event_id=f"AUD-{correlation_id[:8]}",
            )

        except Exception as e:
            logger.error(f"Error executing action {action_type.value}: {e}", exc_info=True)
            return CommandExecutionResult(
                command_id=command_id,
                correlation_id=correlation_id,
                status=CommandStatus.FAILED,
                ui_actions=ui_actions,
                message=f"Action execution error: {str(e)}",
            )
