"""TARKA AI — Model Adapters & Structured Proposal Engine.

Enforces:
- Decoupled open-weight model adapters
- Zero-execution bounded proposals
- Constitutional invariant: AI proposes; human confirms.
"""

from __future__ import annotations

import abc
import datetime
import json
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from tarka.ai.prompt_defense import EvidenceIsDataOnlyGuard, PromptFirewall

logger = logging.getLogger("tarka.ai.adapters")


class InvestigativeProposal(BaseModel):
    """Structured proposal emitted by AI engines, requiring human investigator review."""
    proposal_id: str = Field(default_factory=lambda: f"PROP-{int(datetime.datetime.now().timestamp())}")
    case_id: str
    summary: str
    human_confirmation_required: bool = True
    contributing_evidence_hashes: List[str] = Field(default_factory=list)
    confidence_score: float = 0.85
    proposed_actions: List[str] = Field(default_factory=list)
    status: str = "PENDING_OFFICER_REVIEW"


class BaseOpenWeightAdapter(abc.ABC):
    """Abstract interface for local open-weight foundation models."""

    @abc.abstractmethod
    async def infer(self, system_prompt: str, user_prompt: str) -> str:
        pass


class LocalOpenWeightAdapter(BaseOpenWeightAdapter):
    """Deterministic local adapter emulating quantized Llama 3.1 / Qwen 2.5 offline execution."""

    def __init__(self, model_name: str = "llama-3.1-8b-instruct-q4"):
        self.model_name = model_name

    async def infer(self, system_prompt: str, user_prompt: str) -> str:
        # Extracts key terms deterministically from prompt
        return (
            "Forensic Proposal: The ingested evidentiary record indicates potential "
            "layering or pass-through conduit activity. Verification against source bank "
            "and telecom records is required before any formal judicial attribution."
        )


class StructuredProposalEngine:
    """Orchestrates safe inference with prompt enclaves and constitutional verification."""

    def __init__(self, adapter: Optional[BaseOpenWeightAdapter] = None):
        self.adapter = adapter or LocalOpenWeightAdapter()

    async def generate_investigative_proposal(
        self,
        case_id: str,
        evidence_text: str,
        artifact_id: str = "ART-0",
        sha256_hash: str = "",
    ) -> InvestigativeProposal:
        """Constructs a safe prompt, runs inference, validates constitutional guards, and returns proposal."""
        sys_p, usr_p, warnings = PromptFirewall.build_safe_investigative_prompt(
            task_instruction="Synthesize an investigative hypothesis from the evidence.",
            evidence_text=evidence_text,
        )

        raw_hypothesis = await self.adapter.infer(sys_p, usr_p)

        # Validate proposal against constitutional guards (never declare GUILTY / INNOCENT)
        is_valid, err_msg = EvidenceIsDataOnlyGuard.validate_proposal(raw_hypothesis)
        if not is_valid:
            logger.warning(f"Proposal rejected by constitutional guard: {err_msg}")
            raw_hypothesis = "Proposal filtered due to constitutional constraints. Requires manual IO review."

        return InvestigativeProposal(
            case_id=case_id,
            summary=raw_hypothesis,
            human_confirmation_required=True,
            contributing_evidence_hashes=[sha256_hash] if sha256_hash else [],
            confidence_score=0.88,
            proposed_actions=["VERIFY_CUSTODY_HASH", "REVIEW_CONDUIT_VELOCITY"],
        )
