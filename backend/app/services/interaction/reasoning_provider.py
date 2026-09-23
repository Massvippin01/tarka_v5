from __future__ import annotations

import abc
import json
from typing import Any, AsyncIterator, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel

from app.domain.interaction import (
    ActionRiskClass,
    InteractionContext,
    InteractionIntent,
    InteractionModality,
    PlanStep,
    PlanStepStatus,
    TaskPlan,
)
from app.domain.intelligence_contract import (
    CitedArtifactReference,
    EpistemicStatusEnum,
    IntelligenceResponseContract,
)

T = TypeVar("T", bound=BaseModel)


class ReasoningProvider(abc.ABC):
    """
    Abstract interface for reasoning providers.
    CRITICAL RULES:
    1. Output must parse into validated typed Pydantic models.
    2. Zero exposure or streaming of private chain-of-thought.
       stream_response() streams ONLY authorized user-facing text.
    """

    @abc.abstractmethod
    async def complete_structured(
        self, prompt: str, schema: Type[T], context: InteractionContext
    ) -> T:
        """Produce validated structured output conforming to the given schema."""
        pass

    @abc.abstractmethod
    async def stream_response(
        self, prompt: str, context: InteractionContext
    ) -> AsyncIterator[str]:
        """Stream authorized, user-facing narrative tokens."""
        pass


class DeterministicMockReasoningProvider(ReasoningProvider):
    """
    Deterministic provider for automated testing, CI, and reproducible Golden Case evaluation.
    Converts intent and context deterministically into validated typed data without external network calls.
    """

    async def complete_structured(
        self, prompt: str, schema: Type[T], context: InteractionContext
    ) -> T:
        p_lower = prompt.lower().strip()

        # Handle InteractionIntent schema
        if issubclass(schema, InteractionIntent):
            intent_name = "SEARCH_CASES"
            domain = "CASES"
            params: Dict[str, Any] = {}
            risk = ActionRiskClass.READ
            conf = 0.95
            requires_confirm = False

            if "contradiction" in p_lower or "velocity" in p_lower or "impossible" in p_lower:
                intent_name = "INSPECT_CONTRADICTIONS"
                domain = "CONTRADICTIONS"
                params = {"case_id": context.case_id, "focus": "CTR-2026-001"}
            elif "gap" in p_lower or "missing evidence" in p_lower:
                intent_name = "INSPECT_EVIDENCE_GAPS"
                domain = "GAPS"
                params = {"case_id": context.case_id}
            elif "trace" in p_lower or "claim" in p_lower or "proof" in p_lower:
                intent_name = "PROVE_CLAIM_LINEAGE"
                domain = "PROOF"
                params = {"claim_id": context.selected_claim_id or "CLM-2026-001"}
            elif "connect" in p_lower or "connecting" in p_lower or "between" in p_lower:
                intent_name = "FIND_ENTITY_LINKAGES"
                domain = "ENTITIES"
                params = {
                    "entity_a": context.selected_entity_id or "P001",
                    "entity_b": "P044",
                    "allow_identity_merge": False,
                }
            elif "briefing" in p_lower or "attention" in p_lower or "what changed" in p_lower or "five minutes" in p_lower:
                intent_name = "GET_INVESTIGATION_BRIEFING"
                domain = "CASES"
                params = {"case_id": context.case_id}
            elif "timeline" in p_lower or "compare" in p_lower:
                intent_name = "COMPARE_TIMELINES"
                domain = "TIMELINE"
                params = {"entity_ids": ["P001", "P044"], "time_window": context.time_window}
            elif "theme" in p_lower or "forensic paper" in p_lower or "night ops" in p_lower:
                intent_name = "SET_WORKSPACE_THEME"
                domain = "THEME"
                params = {"theme": "forensic-paper" if "paper" in p_lower else "night-ops"}
            elif "notice" in p_lower or "summons" in p_lower or "section 91" in p_lower or "bnss" in p_lower:
                intent_name = "PREPARE_STATUTORY_NOTICE"
                domain = "STATUTORY"
                params = {
                    "statutory_code": "BNSS_94",
                    "case_id": context.case_id,
                    "target_entity": "Airtel / Bharti Telecom",
                    "production_scope": "Certified CAF and CDR for +91-9888044556",
                }
                risk = ActionRiskClass.PREPARE
            elif "freeze" in p_lower or "snapshot" in p_lower:
                intent_name = "FREEZE_INVESTIGATION_SNAPSHOT"
                domain = "CASES"
                params = {"case_id": context.case_id, "justification": "Pre-chargesheet formal evidentiary lock."}
                risk = ActionRiskClass.EXECUTE
                requires_confirm = True

            result_obj = InteractionIntent(
                intent_name=intent_name,
                target_domain=domain,
                parameters=params,
                confidence=conf,
                raw_query=prompt,
                risk_class=risk,
                requires_confirmation=requires_confirm,
            )
            return schema.model_validate(result_obj.model_dump())

        # Handle TaskPlan schema
        if issubclass(schema, TaskPlan):
            steps: List[PlanStep] = []
            if "connecting" in p_lower or "between" in p_lower:
                steps = [
                    PlanStep(
                        step_index=0,
                        tool_name="focus_entity",
                        description="Focus on anchor entity P001 (Vikram Singh)",
                        mandatory=False,
                        risk_class=ActionRiskClass.READ,
                        input_params={"entity_id": "P001"},
                    ),
                    PlanStep(
                        step_index=1,
                        tool_name="find_entity_linkages",
                        description="Traverse multi-hop relationships without assuming identity equivalence",
                        mandatory=True,
                        risk_class=ActionRiskClass.ANALYZE,
                        input_params={"entity_a": "P001", "entity_b": "P044", "allow_identity_merge": False},
                    ),
                    PlanStep(
                        step_index=2,
                        tool_name="get_open_contradictions",
                        description="Verify kinematic consistency across shared observations",
                        mandatory=True,
                        risk_class=ActionRiskClass.ANALYZE,
                        input_params={"case_id": context.case_id},
                    ),
                ]
            else:
                steps = [
                    PlanStep(
                        step_index=0,
                        tool_name="get_investigation_briefing",
                        description="Load canonical case state and critical attention items",
                        mandatory=True,
                        risk_class=ActionRiskClass.ANALYZE,
                        input_params={"case_id": context.case_id},
                    ),
                    PlanStep(
                        step_index=1,
                        tool_name="get_open_contradictions",
                        description="Inspect open spatiotemporal contradictions",
                        mandatory=True,
                        risk_class=ActionRiskClass.ANALYZE,
                        input_params={"case_id": context.case_id},
                    ),
                ]

            plan = TaskPlan(
                case_id=context.case_id,
                objective=prompt,
                steps=steps,
                current_step_index=0,
                status="PENDING",
            )
            return schema.model_validate(plan.model_dump())

        # Handle IntelligenceResponseContract schema
        if issubclass(schema, IntelligenceResponseContract):
            response = IntelligenceResponseContract(
                investigative_rationale=(
                    "Factual spatiotemporal analysis of call detail record CDR-001 (09:38, South Delhi) "
                    "against ANPR toll sighting ANPR-004 (09:41, DND Toll) demonstrates a physical impossibility "
                    "at 220 km/h in urban traffic, confirming a kinematic contradiction. "
                    "Observations remain preserved independently without premature resolution."
                ),
                investigative_finding="Kinematic contradiction detected: CDR and ANPR observations cannot be reconciled for vehicle HR-26-DQ-5511.",
                epistemic_status=EpistemicStatusEnum.CONTRADICTED,
                cited_artifacts=[
                    CitedArtifactReference(
                        artifact_id="art-cdr-001",
                        sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                        source_type="CDR_TELECOM",
                        provenance_type="SYNTHETIC_DATA",
                        record_identifier="CDR-001",
                    ),
                    CitedArtifactReference(
                        artifact_id="art-anpr-004",
                        sha256_hash="cca9a71b2d03a1168f8448ebf5fc3ebf2bf052aa25b84c8310f8ae1a941efb78",
                        source_type="CCTV_ANPR",
                        provenance_type="SYNTHETIC_DATA",
                        record_identifier="ANPR-004",
                    ),
                ],
                contradictions_identified=["CTR-2026-001"],
                evidence_gaps_identified=["GAP-2026-001"],
                recommended_action="Requisition verified Tower BSS raw log and physical toll CCTV camera stream.",
                requires_statutory_authority=True,
                statutory_code="BNSS_94",
                confidence_score=0.96,
            )
            return schema.model_validate(response.model_dump())

        raise NotImplementedError(f"Schema {schema.__name__} not supported by mock provider.")

    async def stream_response(
        self, prompt: str, context: InteractionContext
    ) -> AsyncIterator[str]:
        tokens = [
            "There ",
            "are ",
            "three ",
            "changes ",
            "requiring ",
            "investigator ",
            "attention. ",
            "One ",
            "is ",
            "a ",
            "kinematic ",
            "contradiction ",
            "between ",
            "the ",
            "CDR ",
            "and ",
            "ANPR ",
            "records. ",
            "I ",
            "have ",
            "isolated ",
            "the ",
            "relevant ",
            "evidence ",
            "for ",
            "your ",
            "review.",
        ]
        for t in tokens:
            yield t
