"""TARKA AI / Model Orchestration.

Exposes model adapters, prompt firewall containment enclaves, and investigative reasoners.
"""

from tarka.ai.adapters import (
    BaseLLMAdapter,
    DeterministicRuleAdapter,
    LLMInferenceResult,
    OpenAICompatibleAdapter,
)
from tarka.ai.prompt_defense import PromptFirewall
from tarka.ai.investigative_reasoner import InvestigativeReasoner

__all__ = [
    "BaseLLMAdapter",
    "DeterministicRuleAdapter",
    "LLMInferenceResult",
    "OpenAICompatibleAdapter",
    "PromptFirewall",
    "InvestigativeReasoner",
]
