from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from app.domain.command import UIActionDescriptor, UIActionType
from app.domain.interaction import ActionRiskClass, InteractionContext

logger = logging.getLogger("sentinelx.command.ui_action_registry")


@dataclass(slots=True)
class UIActionDefinition:
    action_type: UIActionType
    description: str
    expected_ui_effect: str
    risk_class: ActionRiskClass = ActionRiskClass.READ
    required_arguments: List[str] = field(default_factory=list)
    optional_arguments: List[str] = field(default_factory=list)
    required_context: List[str] = field(default_factory=list)
    audit_event: str = ""
    validator: Optional[Callable[[Dict[str, Any], InteractionContext], None]] = None

    def validate(self, arguments: Dict[str, Any], context: InteractionContext) -> None:
        for req in self.required_arguments:
            if req not in arguments or arguments[req] is None or arguments[req] == "":
                raise ValueError(f"Action '{self.action_type.value}' missing required argument: '{req}'")

        for req_ctx in self.required_context:
            val = getattr(context, req_ctx, None)
            if not val and req_ctx not in arguments:
                raise ValueError(
                    f"Action '{self.action_type.value}' requires context field '{req_ctx}' which is unset in context and arguments."
                )

        if self.validator:
            self.validator(arguments, context)


class UIActionRegistry:
    """
    Authoritative registry of typed UI actions supported by SentinelX.
    Ensures action schemas are strictly validated and auditable.
    """

    _instance: Optional[UIActionRegistry] = None

    def __init__(self) -> None:
        self._actions: Dict[UIActionType, UIActionDefinition] = {}
        self._register_canonical_actions()

    @classmethod
    def get_instance(cls) -> UIActionRegistry:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def register(self, definition: UIActionDefinition) -> None:
        self._actions[definition.action_type] = definition
        logger.debug(f"Registered UI action: {definition.action_type.value}")

    def get(self, action_type: UIActionType | str) -> Optional[UIActionDefinition]:
        if isinstance(action_type, str):
            try:
                action_type = UIActionType(action_type)
            except ValueError:
                return None
        return self._actions.get(action_type)

    def list_actions(self) -> List[Dict[str, Any]]:
        return [
            {
                "action_type": defn.action_type.value,
                "description": defn.description,
                "expected_ui_effect": defn.expected_ui_effect,
                "risk_class": defn.risk_class.value,
                "required_arguments": defn.required_arguments,
                "optional_arguments": defn.optional_arguments,
                "required_context": defn.required_context,
            }
            for defn in self._actions.values()
        ]

    def build_descriptor(
        self,
        action_type: UIActionType | str,
        arguments: Dict[str, Any],
        context: InteractionContext,
    ) -> UIActionDescriptor:
        if isinstance(action_type, str):
            action_type = UIActionType(action_type)

        defn = self.get(action_type)
        if not defn:
            raise ValueError(f"Unknown UI action type: '{action_type}'")

        defn.validate(arguments, context)

        return UIActionDescriptor(
            action_type=action_type,
            arguments=arguments,
            risk_class=defn.risk_class,
            expected_ui_effect=defn.expected_ui_effect,
            audit_event=defn.audit_event or f"UI_ACTION_{action_type.value}",
        )

    def _register_canonical_actions(self) -> None:
        # 1. Navigation / Lens Openers
        self.register(
            UIActionDefinition(
                action_type=UIActionType.OPEN_CASE,
                description="Open and activate an authorized investigation case docket.",
                expected_ui_effect="Switches workspace context to the designated case and reloads state projections.",
                required_arguments=["case_id"],
                audit_event="UI_CASE_OPENED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.OPEN_ENTITY,
                description="Select and open the detailed entity dossier in the right analytical rail.",
                expected_ui_effect="Highlights the entity node on canvas and renders dossier with source citations.",
                required_arguments=["entity_id"],
                audit_event="UI_ENTITY_INSPECTED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.OPEN_EVIDENCE,
                description="Open specific evidence artifact in the forensic viewer.",
                expected_ui_effect="Renders bit-level artifact metadata, raw preview, and custody hash chain.",
                required_arguments=["evidence_id"],
                audit_event="UI_EVIDENCE_INSPECTED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.OPEN_GRAPH,
                description="Switch active workspace lens to the 2D/3D Intelligence Graph canvas.",
                expected_ui_effect="Positions view on entity-relationship intelligence graph.",
                optional_arguments=["case_id", "layout"],
                audit_event="UI_GRAPH_OPENED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.OPEN_TIMELINE,
                description="Switch active workspace view to the Chronological Investigation Timeline.",
                expected_ui_effect="Visualizes multi-source temporal events with explicit uncertainty intervals.",
                optional_arguments=["case_id", "time_window"],
                audit_event="UI_TIMELINE_OPENED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.OPEN_CONTRADICTIONS,
                description="Open the Contradiction Center surfacing kinematic and identity conflicts.",
                expected_ui_effect="Renders conflicting observation pairs without auto-reconciliation.",
                optional_arguments=["case_id", "focus_contradiction_id"],
                audit_event="UI_CONTRADICTIONS_OPENED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.OPEN_GAPS,
                description="Open the Evidence Gap Center showing missing records and required requisitions.",
                expected_ui_effect="Displays deductive holes and statutory requisition opportunities.",
                optional_arguments=["case_id", "focus_gap_id"],
                audit_event="UI_GAPS_OPENED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.OPEN_PROOF,
                description="Open the Live Proof bidirectional provenance drawer for a claim.",
                expected_ui_effect="Traces unbroken path from claim to SHA-256 CAS hash and custody events.",
                required_arguments=["claim_id"],
                audit_event="UI_PROOF_OPENED",
            )
        )

        # 2. Workspace Manipulations & Filters
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SEARCH,
                description="Perform cross-case entity, claim, or artifact search.",
                expected_ui_effect="Filters graph/list projections matching query criteria.",
                required_arguments=["query"],
                optional_arguments=["entity_type"],
                audit_event="UI_SEARCH_EXECUTED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.FILTER,
                description="Apply semantic or confidence filters to the workspace.",
                expected_ui_effect="Toggles visible node/relationship categories based on filter parameters.",
                required_arguments=["filter_type", "values"],
                audit_event="UI_FILTER_APPLIED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.FOCUS,
                description="Focus viewport camera and attention on a specific entity or event.",
                expected_ui_effect="Centers and zooms canvas to the designated target entity.",
                required_arguments=["entity_id"],
                audit_event="UI_ENTITY_FOCUSED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.EXPAND,
                description="Expand 1-hop or n-hop relationship neighborhood from an anchor entity.",
                expected_ui_effect="Fetches and projects adjacent connected nodes into current canvas.",
                required_arguments=["entity_id"],
                optional_arguments=["depth"],
                audit_event="UI_NEIGHBORHOOD_EXPANDED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.COLLAPSE,
                description="Collapse neighborhood nodes around an entity to declutter graph.",
                expected_ui_effect="Removes expanded leaves around the target entity from canvas view.",
                required_arguments=["entity_id"],
                audit_event="UI_NEIGHBORHOOD_COLLAPSED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SELECT,
                description="Select target element across any active view.",
                expected_ui_effect="Sets active selection cursor in context.",
                required_arguments=["target_type", "target_id"],
                audit_event="UI_ELEMENT_SELECTED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.COMPARE,
                description="Side-by-side comparative inspection between two entities or timelines.",
                expected_ui_effect="Opens comparative dual-entity analysis panel.",
                required_arguments=["entity_a", "entity_b"],
                audit_event="UI_ENTITIES_COMPARED",
            )
        )

        # 3. Evidentiary Traceability & Proof Actions
        self.register(
            UIActionDefinition(
                action_type=UIActionType.TRACE_PROVENANCE,
                description="Trigger lineage verification and open provenance inspector.",
                expected_ui_effect="Validates cryptographic chain and opens provenance trace drawer.",
                optional_arguments=["claim_id", "artifact_id"],
                audit_event="UI_PROVENANCE_TRACED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SHOW_SOURCE,
                description="Display primary source artifact backing an observation or claim.",
                expected_ui_effect="Opens source viewer positioned at exact record/timestamp.",
                required_arguments=["artifact_id"],
                audit_event="UI_SOURCE_DISPLAYED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SHOW_SUPPORT,
                description="Highlight all supporting observations and evidence items for a claim.",
                expected_ui_effect="Highlights corroborating graph edges and evidence chips in UI.",
                required_arguments=["claim_id"],
                audit_event="UI_SUPPORTING_EVIDENCE_SHOWN",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SHOW_CONTRADICTION,
                description="Focus and highlight a specific identified contradiction.",
                expected_ui_effect="Navigates to contradiction center and expands the anomaly details.",
                required_arguments=["contradiction_id"],
                audit_event="UI_CONTRADICTION_FOCUSED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SHOW_GAP,
                description="Focus and highlight a specific identified evidence gap.",
                expected_ui_effect="Navigates to gap center and displays draft requisition template.",
                required_arguments=["gap_id"],
                audit_event="UI_GAP_FOCUSED",
            )
        )

        # 4. Governed Agent Actions (Phase 3)
        self.register(
            UIActionDefinition(
                action_type=UIActionType.RUN_AGENT_TASK,
                description="Dispatch a governed investigative agent task through the AgentSupervisor.",
                expected_ui_effect="Executes agent analysis and returns governed findings with evidence lineage.",
                risk_class=ActionRiskClass.ANALYZE,
                required_arguments=["agent_type"],
                optional_arguments=["objective", "case_id"],
                audit_event="AGENT_TASK_DISPATCHED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SHOW_AGENT_FINDINGS,
                description="Display governed agent findings for the current case.",
                expected_ui_effect="Renders agent findings panel with evidence lineage and confidence scores.",
                optional_arguments=["case_id", "agent_type", "finding_type"],
                audit_event="AGENT_FINDINGS_DISPLAYED",
            )
        )

        # 5. Progressive Disclosure & Navigation Actions (Experience Refinement E1)
        self.register(
            UIActionDefinition(
                action_type=UIActionType.GO_BACK,
                description="Navigate back to previous view or return to Level 0 Command Surface.",
                expected_ui_effect="Transitions investigator back to previous state or command surface.",
                audit_event="UI_NAVIGATED_BACK",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SUMMARIZE,
                description="Display structured investigation summary docket.",
                expected_ui_effect="Transitions to Level 1 investigation focus docket.",
                optional_arguments=["case_id"],
                audit_event="UI_CASE_SUMMARIZED",
            )
        )
        self.register(
            UIActionDefinition(
                action_type=UIActionType.SWITCH_LEVEL,
                description="Switch active progressive disclosure experience level (0-4).",
                expected_ui_effect="Switches surface layout to specified experience level.",
                required_arguments=["level"],
                audit_event="UI_LEVEL_SWITCHED",
            )
        )
