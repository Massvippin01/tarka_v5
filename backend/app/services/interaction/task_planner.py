from __future__ import annotations

import logging
from typing import Optional

from app.domain.interaction import (
    InteractionContext,
    InteractionIntent,
    TaskPlan,
)
from app.services.interaction.reasoning_provider import (
    DeterministicMockReasoningProvider,
    ReasoningProvider,
)

logger = logging.getLogger("sentinelx.interaction.task_planner")


class TaskPlanner:
    """
    Decomposes natural language goals or InteractionIntents into ordered,
    governed multi-step execution plans (TaskPlan).
    """

    def __init__(self, reasoning_provider: Optional[ReasoningProvider] = None) -> None:
        self.provider = reasoning_provider or DeterministicMockReasoningProvider()

    async def plan(
        self, intent: InteractionIntent, context: InteractionContext
    ) -> TaskPlan:
        plan: TaskPlan = await self.provider.complete_structured(
            prompt=intent.raw_query or intent.intent_name,
            schema=TaskPlan,
            context=context,
        )
        plan.case_id = context.case_id
        return plan
