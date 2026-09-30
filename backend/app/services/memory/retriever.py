"""
SentinelX Governed Memory Retriever.

Retrieval Safety Pipeline Order:
1. AUTHORIZATION — Verify caller role, clearance, allowed cases, and jurisdictions via OperatingContext.
2. SCOPE — Filter to allowed case, jurisdiction, and tier boundaries. Cross-case access fails closed unless authorized.
3. TEMPORAL VALIDITY — Filter records by validity interval (valid_from <= query.time_at <= valid_to).
4. EPISTEMIC FILTER — Separate verified facts from unverified inferences and contradictions.
5. RELEVANCE RANKING — Rank remaining items by lexical match and entity intersection.

CRITICAL INVARIANT:
Memory is strictly DATA_ONLY.
Adversarial prompt injections in memory payloads (e.g. 'Ignore policy...') remain passive text
and are never elevated into instructions or executable directives.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import List, Optional

from app.domain.memory import (
    MemoryEpistemicStatus,
    MemoryQuery,
    MemoryRecord,
    MemoryRetrievalItem,
    MemoryRetrievalResult,
    MemoryScope,
    MemoryStatus,
    MemoryTier,
)
from app.domain.operating_context import OperatingContext
from app.services.memory.observability import MemorySpan, metrics
from app.services.memory.persistence import MemoryStore

logger = logging.getLogger("sentinelx.memory.retriever")


class MemoryRetriever:
    """Governed, policy-aware search and retrieval pipeline over all 4 memory tiers."""

    def __init__(self, store: MemoryStore) -> None:
        self.store = store

    def retrieve(
        self,
        query: MemoryQuery,
        context: OperatingContext,
    ) -> MemoryRetrievalResult:
        with MemorySpan("query", {"case_id": query.case_id, "investigator_id": context.investigator_id}):
            metrics.query_count += 1
            now = datetime.now(UTC).isoformat()

            # ── 1. AUTHORIZATION GATE ─────────────────────────────────────────
            # Case Boundary Check
            allowed_case_ids = [c.get("case_id") for c in context.allowed_cases]
            if query.case_id:
                if query.case_id not in allowed_case_ids:
                    metrics.authorization_denial_count += 1
                    metrics.cross_case_denial_count += 1
                    logger.warning(
                        "Policy denial: Investigator %s unauthorized for case %s",
                        context.investigator_id,
                        query.case_id,
                    )
                    return MemoryRetrievalResult(
                        items=[],
                        total_count=0,
                        denial_reason=f"POLICY_DENIAL: Investigator '{context.investigator_id}' lacks authorization for case '{query.case_id}'",
                        retrieved_at=now,
                    )

            # Jurisdiction Boundary Check
            if query.jurisdiction and context.jurisdiction_scope:
                if query.jurisdiction not in context.jurisdiction_scope:
                    metrics.authorization_denial_count += 1
                    logger.warning(
                        "Policy denial: Investigator %s unauthorized for jurisdiction %s",
                        context.investigator_id,
                        query.jurisdiction,
                    )
                    return MemoryRetrievalResult(
                        items=[],
                        total_count=0,
                        denial_reason=f"POLICY_DENIAL: Jurisdiction '{query.jurisdiction}' outside investigator scope",
                        retrieved_at=now,
                    )

            # ── 2. FETCH CANDIDATE RECORDS FROM PERSISTENCE ───────────────────
            candidates: List[MemoryRecord] = self.store.query_records(query)

            # ── 3. POST-QUERY SCOPE & SECURITY FILTERING ──────────────────────
            filtered_items: List[MemoryRetrievalItem] = []
            target_time = query.time_at or now

            for record in candidates:
                # Security: Cross-case isolation
                if record.tier != MemoryTier.ORGANIZATIONAL:
                    if record.case_id and record.case_id not in allowed_case_ids:
                        metrics.scope_denial_count += 1
                        continue

                # Clearance Hierarchy Check
                clearance_levels = {
                    "PUBLIC": 0,
                    "INTERNAL": 1,
                    "CONFIDENTIAL": 2,
                    "RESTRICTED": 3,
                    "SECRET": 4,
                    "TOP_SECRET": 5,
                }
                user_clr = clearance_levels.get(context.clearance, 2)
                req_clr = clearance_levels.get(record.access_policy.required_clearance, 3)
                if user_clr < req_clr:
                    metrics.authorization_denial_count += 1
                    continue

                # Temporal Validity
                if not record.validity.is_valid_at(target_time):
                    continue

                # Epistemic Filter
                if not query.include_invalidated and record.status == MemoryStatus.INVALIDATED:
                    continue
                if not query.include_superseded and record.status == MemoryStatus.SUPERSEDED:
                    continue
                if query.epistemic_statuses and record.epistemic_status not in query.epistemic_statuses:
                    continue

                # Relevance scoring (Deterministic lexical match + entity overlap)
                score = 1.0
                if query.query_text:
                    q_words = set(query.query_text.lower().split())
                    content_words = set(record.content.lower().split())
                    overlap = len(q_words.intersection(content_words))
                    score = overlap / max(len(q_words), 1)

                if query.entity_ids and record.subject_entity_ids:
                    common_eids = set(query.entity_ids).intersection(set(record.subject_entity_ids))
                    score += 0.5 * len(common_eids)

                needs_verification = record.epistemic_status in (
                    MemoryEpistemicStatus.PROPOSED,
                    MemoryEpistemicStatus.INFERRED,
                    MemoryEpistemicStatus.REQUIRES_VERIFICATION,
                    MemoryEpistemicStatus.UNKNOWN,
                )

                filtered_items.append(
                    MemoryRetrievalItem(
                        memory_id=record.memory_id,
                        record=record,
                        tier=record.tier,
                        relevance_score=round(score, 3),
                        epistemic_status=record.epistemic_status,
                        provenance=record.provenance,
                        scope=record.scope,
                        confidence=record.confidence,
                        validity=record.validity,
                        verification_required=needs_verification,
                    )
                )

            # Sort by relevance score descending
            filtered_items.sort(key=lambda item: item.relevance_score, reverse=True)
            paged_items = filtered_items[: query.limit]

            return MemoryRetrievalResult(
                items=paged_items,
                total_count=len(filtered_items),
                denial_reason=None,
                retrieved_at=now,
            )
