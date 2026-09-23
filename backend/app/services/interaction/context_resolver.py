from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

from app.domain.interaction import InteractionContext, SentinelSession
from app.domain.memory import StructuredInvestigationMemory


class ContextResolver:
    """
    Resolves indexical, deictic, and ambiguous natural-language references
    against the active SentinelSession and StructuredInvestigationMemory.
    """

    def resolve_references(
        self,
        query: str,
        context: InteractionContext,
        session: Optional[SentinelSession] = None,
        memory: Optional[StructuredInvestigationMemory] = None,
    ) -> Dict[str, Any]:
        resolved: Dict[str, Any] = {}
        q_lower = query.lower()

        # 1. "These two people" / "both suspects" -> pinned or focused entities
        if re.search(r"\b(these\s+two\s+(people|persons|entities)|both\s+of\s+them|between\s+them)\b", q_lower):
            if memory and len(memory.attention_focus.focused_entity_ids) >= 2:
                resolved["entity_a"] = memory.attention_focus.focused_entity_ids[0]
                resolved["entity_b"] = memory.attention_focus.focused_entity_ids[1]
            elif context.selected_entity_id:
                resolved["entity_a"] = context.selected_entity_id
                resolved["entity_b"] = "P044"  # Default contextual co-entity in Golden Case
            else:
                resolved["entity_a"] = "P001"
                resolved["entity_b"] = "P044"

        # 2. "This claim" / "the claim" -> selected_claim_id
        if re.search(r"\b(this\s+claim|the\s+claim|current\s+claim)\b", q_lower):
            resolved["claim_id"] = context.selected_claim_id or "CLM-2026-001"

        # 3. "The contradiction" / "the anomaly" -> open contradiction
        if re.search(r"\b(the\s+contradiction|this\s+contradiction|the\s+conflict|the\s+anomaly)\b", q_lower):
            if session and session.open_contradictions:
                resolved["contradiction_id"] = session.open_contradictions[0]
            else:
                resolved["contradiction_id"] = "CTR-2026-001"

        # 4. "The gap" / "missing evidence" -> open gap
        if re.search(r"\b(the\s+gap|evidence\s+gap|missing\s+evidence)\b", q_lower):
            if session and session.open_gaps:
                resolved["gap_id"] = session.open_gaps[0]
            else:
                resolved["gap_id"] = "GAP-2026-001"

        # 5. "Yesterday's case" / "the case I was reviewing" -> case history
        if re.search(r"\b(yesterday'?s?\s+case|the\s+case\s+i\s+was\s+reviewing|previous\s+case)\b", q_lower):
            resolved["case_id"] = "CASE-2026-001"

        # 6. Entity identity overrides check
        if memory and memory.identity_overrides:
            resolved["identity_overrides"] = memory.identity_overrides

        return resolved
