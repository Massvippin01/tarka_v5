from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.domain.interaction import (
    ActionRiskClass,
    InteractionContext,
    InteractionIntent,
    InteractionModality,
    SentinelSession,
)
from app.domain.memory import StructuredInvestigationMemory
from app.services.interaction.context_resolver import ContextResolver
from app.services.interaction.reasoning_provider import (
    DeterministicMockReasoningProvider,
    ReasoningProvider,
)

logger = logging.getLogger("sentinelx.interaction.intent_resolver")


class IntentResolver:
    """
    Semantic interaction layer interpreting open-ended natural language goals
    (English, Hindi transliterated, Hinglish) and mapping them into validated InteractionIntent models.
    """

    def __init__(self, reasoning_provider: Optional[ReasoningProvider] = None) -> None:
        self.provider = reasoning_provider or DeterministicMockReasoningProvider()
        self.context_resolver = ContextResolver()

    async def resolve_intent(
        self,
        query: str,
        context: InteractionContext,
        modality: InteractionModality = InteractionModality.VOICE,
        session: Optional[SentinelSession] = None,
        memory: Optional[StructuredInvestigationMemory] = None,
    ) -> InteractionIntent:
        # 1. Resolve indexical and contextual references
        resolved_refs = self.context_resolver.resolve_references(query, context, session, memory)

        # 2. Complete structured intent via ReasoningProvider
        intent: InteractionIntent = await self.provider.complete_structured(
            prompt=query,
            schema=InteractionIntent,
            context=context,
        )

        # 3. Merge resolved contextual references
        for k, v in resolved_refs.items():
            if k not in intent.parameters:
                intent.parameters[k] = v

        intent.modality = modality
        intent.raw_query = query
        return intent
