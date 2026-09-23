from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.domain.interaction import InteractionContext
from app.domain.intelligence_contract import (
    CitedArtifactReference,
    EpistemicStatusEnum,
    IntelligenceResponseContract,
)
from app.services.interaction.reasoning_provider import (
    DeterministicMockReasoningProvider,
    ReasoningProvider,
)

logger = logging.getLogger("sentinelx.interaction.response_planner")


class ResponsePlanner:
    """
    Produces concise, factual, evidence-grounded responses conforming to
    IntelligenceResponseContract.
    STRICT SENTINEL PERSONA:
    Never conversational fluff ("Sure!", "Great question!", "I'm happy to help!").
    Focus exclusively on changes, evidence, contradictions, uncertainty, and verification.
    """

    def __init__(self, reasoning_provider: Optional[ReasoningProvider] = None) -> None:
        self.provider = reasoning_provider or DeterministicMockReasoningProvider()

    async def plan_response(
        self,
        prompt: str,
        context: InteractionContext,
        tool_results: Optional[Dict[str, Any]] = None,
    ) -> IntelligenceResponseContract:
        # Use provider to structure response conforming to contract
        response: IntelligenceResponseContract = await self.provider.complete_structured(
            prompt=prompt,
            schema=IntelligenceResponseContract,
            context=context,
        )
        return response
