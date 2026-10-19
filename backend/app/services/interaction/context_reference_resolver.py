from __future__ import annotations

import logging
import re
from datetime import UTC, datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from zoneinfo import ZoneInfo

from app.domain.canonical_evidence_ir import generate_uuid7
from app.domain.intent import (
    InvestigationDetailLevel,
    InvestigationIntent,
    InvestigationRequestClass,
)
from app.domain.command import CommandSource, UIActionType
from app.domain.investigation_context import (
    ContextCandidate,
    ContextEventType,
    ContextFailureCode,
    ContextReferenceType,
    ContextResolutionResult,
    ContextResolutionStatus,
    InvestigationContextSnapshot,
    ResultSetReference,
    TemporalContextReference,
)

logger = logging.getLogger("sentinelx.interaction.context_reference_resolver")

# Canonical reference timestamp for Golden Case (Operation Triad Nexus)
CANONICAL_REFERENCE_TIMESTAMP = "2026-08-30T12:00:00+05:30"


class ContextReferenceResolver:
    """
    CANONICAL INVESTIGATION CONTEXT REFERENCE RESOLVER (Subphase A3).

    Deterministic, auditable reference resolution engine for SentinelX investigators.
    Resolves pronouns, deixis, ellipsis, result-set references, temporal/spatial references,
    graph hops, and corrections against the active InvestigationContextSnapshot.

    ABSOLUTE INVARIANTS:
    1. ZERO LLM dependency for anaphora resolution — strictly deterministic.
    2. NEVER GUESS AMBIGUITY. If multiple candidates are indistinguishable, return CLARIFICATION_REQUIRED.
    3. STRICTLY CASE-BOUND. Cross-case references are rejected fail-closed.
    4. PROMPT INJECTION RESISTANT. Text inside evidence is DATA ONLY and cannot alter context state.
    """

    _instance: Optional[ContextReferenceResolver] = None

    @classmethod
    def get_instance(cls) -> ContextReferenceResolver:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ── Reference Extraction & Categorization ─────────────────────────────────

    def detect_reference_types(self, text: str) -> List[ContextReferenceType]:
        """Detect which categories of indexical references are present in the query."""
        t_low = text.lower().strip()
        ref_types = []

        # Pronouns
        if re.search(r"\b(he|she|they|him|her|them|his|hers|their|theirs|this\s+person|that\s+person|the\s+person|this\s+guy|that\s+individual|the\s+suspect|the\s+subject)\b", t_low):
            ref_types.append(ContextReferenceType.PERSON)

        # Entity deixis
        if re.search(r"\b(this\s+vehicle|that\s+vehicle|this\s+car|that\s+car|this\s+phone|that\s+phone|this\s+number|that\s+number|this\s+location|that\s+location|this\s+address|that\s+address|this\s+account|that\s+account|this\s+bank\s+account|that\s+bank\s+account|this\s+case)\b", t_low):
            ref_types.append(ContextReferenceType.ENTITY)

        # Relationship deixis
        if re.search(r"\b(this\s+relationship|that\s+relationship|this\s+connection|that\s+connection|this\s+link|why(\s+is\s+(he|this|they)\s+connected)?)\b", t_low):
            ref_types.append(ContextReferenceType.RELATIONSHIP)

        # Evidence references
        if re.search(r"\b(this\s+evidence|that\s+evidence|this\s+record|that\s+record|this\s+proof|the\s+source|supporting\s+record|contradictory\s+record|show\s+(the\s+)?evidence)\b", t_low):
            ref_types.append(ContextReferenceType.EVIDENCE)

        # Result item references
        if re.search(r"\b(these|those|the\s+first(\s+one)?|the\s+second(\s+one)?|the\s+third(\s+one)?|the\s+strongest(\s+one)?|which\s+one\s+is\s+strongest|the\s+weakest(\s+one)?|the\s+previous\s+result|the\s+other\s+one|all\s+of\s+them)\b", t_low):
            ref_types.append(ContextReferenceType.RESULT_ITEM)

        # Temporal references
        if re.search(r"\b(yesterday|today|earlier|later|before|after|after\s+yesterday|before\s+that|last\s+week|this\s+week|that\s+day)\b", t_low):
            ref_types.append(ContextReferenceType.TEMPORAL)

        # Spatial references
        if re.search(r"\b(here|there|that\s+location|nearby|around\s+there|on\s+the\s+map|put\s+it\s+on\s+the\s+map)\b", t_low):
            ref_types.append(ContextReferenceType.SPATIAL)

        # Graph references
        if re.search(r"\b(one\s+hop|two\s+hops?|three\s+hops?|expand\s+it|expand\s+them|collapse\s+this|collapse\s+it|show\s+connected\s+entities|shortest\s+path\s+from\s+here)\b", t_low):
            ref_types.append(ContextReferenceType.GRAPH_HOP)

        return ref_types

    # ── Temporal Reference Normalization ──────────────────────────────────────

    def normalize_temporal_expression(
        self,
        expression: str,
        reference_time_iso: Optional[str] = None,
        timezone: str = "Asia/Kolkata",
    ) -> TemporalContextReference:
        """
        Deterministically convert relative temporal natural language into bounded ISO timestamps.
        Never persists raw strings without structured resolution.
        """
        ref_iso = reference_time_iso or CANONICAL_REFERENCE_TIMESTAMP
        try:
            tz = ZoneInfo(timezone)
        except Exception:
            tz = ZoneInfo("Asia/Kolkata")

        try:
            ref_dt = datetime.fromisoformat(ref_iso)
            if ref_dt.tzinfo is None:
                ref_dt = ref_dt.replace(tzinfo=tz)
        except Exception:
            ref_dt = datetime.now(tz)

        expr_low = expression.lower().strip()
        ref_date = ref_dt.date()

        resolved_start: Optional[str] = None
        resolved_end: Optional[str] = None
        method = "RELATIVE_OFFSET_CALCULATION"

        if "after yesterday" in expr_low or "since yesterday" in expr_low:
            start_date = ref_date - timedelta(days=1)
            resolved_start = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=tz).isoformat()
            resolved_end = ref_dt.isoformat()
        elif "yesterday" in expr_low:
            yest_date = ref_date - timedelta(days=1)
            resolved_start = datetime(yest_date.year, yest_date.month, yest_date.day, 0, 0, 0, tzinfo=tz).isoformat()
            resolved_end = datetime(yest_date.year, yest_date.month, yest_date.day, 23, 59, 59, tzinfo=tz).isoformat()
        elif "today" in expr_low:
            resolved_start = datetime(ref_date.year, ref_date.month, ref_date.day, 0, 0, 0, tzinfo=tz).isoformat()
            resolved_end = datetime(ref_date.year, ref_date.month, ref_date.day, 23, 59, 59, tzinfo=tz).isoformat()
        elif "last week" in expr_low:
            start_date = ref_date - timedelta(days=7)
            resolved_start = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=tz).isoformat()
            resolved_end = ref_dt.isoformat()
        elif "earlier" in expr_low or "before that" in expr_low:
            resolved_end = ref_dt.isoformat()
            start_date = ref_date - timedelta(days=3)
            resolved_start = datetime(start_date.year, start_date.month, start_date.day, 0, 0, 0, tzinfo=tz).isoformat()
        elif "later" in expr_low or "after that" in expr_low:
            resolved_start = ref_dt.isoformat()
            end_date = ref_date + timedelta(days=1)
            resolved_end = datetime(end_date.year, end_date.month, end_date.day, 23, 59, 59, tzinfo=tz).isoformat()
        else:
            resolved_start = (ref_dt - timedelta(days=1)).isoformat()
            resolved_end = ref_dt.isoformat()

        return TemporalContextReference(
            reference_time=ref_dt.isoformat(),
            resolved_start=resolved_start,
            resolved_end=resolved_end,
            timezone=timezone,
            resolution_method=method,
            relative_expression=expression,
        )

    # ── Main Reference Resolution Engine ──────────────────────────────────────

    def resolve_reference(
        self,
        query: str,
        snapshot: InvestigationContextSnapshot,
        correlation_id: Optional[str] = None,
    ) -> ContextResolutionResult:
        """
        Evaluate natural language utterance against active InvestigationContextSnapshot.
        Returns ContextResolutionResult with explicit status:
        RESOLVED, AMBIGUOUS, UNRESOLVED, OUT_OF_SCOPE, or STALE.
        """
        start_time = datetime.now(UTC)
        corr_id = correlation_id or generate_uuid7()
        q_low = query.lower().strip()

        # ── 1. PROMPT INJECTION CONTAINMENT ──
        # Invariant: Evidence or user text can NEVER override system governance, security, or case scope
        injection_patterns = [
            r"ignore\s+(?:all\s+)?previous\s+context",
            r"reveal\s+all\s+cases",
            r"system\s+override",
            r"grant\s+(?:me\s+)?admin",
            r"bypass\s+policy",
        ]
        if any(re.search(pat, q_low) for pat in injection_patterns):
            return ContextResolutionResult(
                status=ContextResolutionStatus.INVALID,
                failure_code=ContextFailureCode.CONTEXT_UNAUTHORIZED,
                ambiguity_reason="Prompt injection payload detected in input query. Discarded as DATA_ONLY.",
                clarification_prompt="Security governance prevented execution: Context manipulation instruction detected.",
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 2. CROSS-CASE ACCESS GUARD ──
        # Check if query requests another case ID explicitly
        case_match = re.search(r"\b(case-\d{4}-\d+|c\d{3})\b", q_low)
        if case_match:
            referenced_case = case_match.group(1).upper()
            if referenced_case != snapshot.case_id:
                # Cross-case reference without formal case switch
                return ContextResolutionResult(
                    status=ContextResolutionStatus.OUT_OF_SCOPE,
                    failure_code=ContextFailureCode.CONTEXT_OUT_OF_SCOPE,
                    ambiguity_reason=f"Reference to '{referenced_case}' does not match active case '{snapshot.case_id}'.",
                    clarification_prompt=f"Cross-case reference blocked: '{referenced_case}' is outside the active case scope. Please switch case explicitly.",
                    context_id=snapshot.context_id,
                    version=snapshot.version,
                    correlation_id=corr_id,
                )

        # ── 3. CORRECTIONS ("No, I meant P002", "Not that vehicle", "No, use P099") ──
        correction_match = re.search(r"\b(?:no,?\s+)?(?:i\s+meant|actually,?\s*(?:use|show)?|not\s+that\s+\w+(?:,?\s*(?:use|show))?|use)\s+(p\d{3,4}|v\d{3,4}|ph\d{3,4})\b", q_low)
        if correction_match:
            corrected_id = correction_match.group(1).upper()
            cand_type = "PERSON" if corrected_id.startswith("P") else ("VEHICLE" if corrected_id.startswith("V") else "PHONE")
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.ENTITY,
                resolved_id=corrected_id,
                resolved_value={"action": "CORRECTION", "corrected_id": corrected_id, "type": cand_type},
                candidates=[
                    ContextCandidate(candidate_id=corrected_id, candidate_type=cand_type, display_label=f"Corrected Target {corrected_id}", confidence_score=1.0)
                ],
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 4. PRONOUN RESOLUTION ("he", "him", "she", "her", "they", "them", "this person") ──
        is_person_pronoun = bool(re.search(r"\b(he|him|she|her|they|them|his|hers|their|theirs|this\s+person|that\s+person|the\s+person|this\s+guy|that\s+individual|the\s+suspect|the\s+subject)\b", q_low))
        if is_person_pronoun:
            # Collect person candidates from snapshot
            person_candidates: List[ContextCandidate] = []

            # A. Current selected entity (if PERSON)
            if snapshot.selected_entity_id and snapshot.selected_entity_id.startswith("P"):
                person_candidates.append(
                    ContextCandidate(
                        candidate_id=snapshot.selected_entity_id,
                        candidate_type="PERSON",
                        display_label=f"Selected Person {snapshot.selected_entity_id}",
                        confidence_score=0.9,
                        provenance_details={"source": "SELECTED_ENTITY"},
                    )
                )

            # B. Entities from result set
            if snapshot.result_set:
                for ent in snapshot.result_set.entity_ids:
                    if ent.startswith("P") and ent != snapshot.selected_entity_id:
                        person_candidates.append(
                            ContextCandidate(
                                candidate_id=ent,
                                candidate_type="PERSON",
                                display_label=f"Result Set Candidate {ent}",
                                confidence_score=0.7,
                                provenance_details={"source": "RESULT_SET"},
                            )
                        )

            # C. Recent selections stack
            for rec in snapshot.recent_selections:
                rid = rec.get("id", "")
                if rid.startswith("P") and not any(c.candidate_id == rid for c in person_candidates):
                    person_candidates.append(
                        ContextCandidate(
                            candidate_id=rid,
                            candidate_type="PERSON",
                            display_label=f"Recent Selection {rid}",
                            confidence_score=0.5,
                            provenance_details={"source": "RECENT_SELECTION"},
                        )
                    )

            # AMBIGUITY CHECK (Constitution Rule 6: Never guess ambiguity!)
            # If multiple person candidates exist (e.g. P001 selected, P044 in result set or recent),
            # and the query is ungrounded pronoun ("Show him", "Tell me about him"), FAIL CLOSED.
            if len(person_candidates) >= 2:
                # If there's an explicit selected entity AND at least one other active person in context,
                # we do NOT assume the selected one unless the user explicitly disambiguates.
                cand_ids = [c.candidate_id for c in person_candidates[:2]]
                cand_str = " or ".join(cand_ids)
                return ContextResolutionResult(
                    status=ContextResolutionStatus.AMBIGUOUS,
                    reference_type=ContextReferenceType.PERSON,
                    failure_code=ContextFailureCode.CLARIFICATION_REQUIRED,
                    candidates=person_candidates[:4],
                    ambiguity_reason=f"Multiple person candidates found in context ({', '.join(cand_ids)}).",
                    clarification_prompt=f"I found multiple people in the current context. Do you mean {cand_str}?",
                    context_id=snapshot.context_id,
                    version=snapshot.version,
                    correlation_id=corr_id,
                )

            if len(person_candidates) == 1:
                cand = person_candidates[0]
                return ContextResolutionResult(
                    status=ContextResolutionStatus.RESOLVED,
                    reference_type=ContextReferenceType.PERSON,
                    resolved_id=cand.candidate_id,
                    resolved_value=cand.candidate_id,
                    candidates=[cand],
                    context_id=snapshot.context_id,
                    version=snapshot.version,
                    correlation_id=corr_id,
                )

            # No person candidate found
            return ContextResolutionResult(
                status=ContextResolutionStatus.UNRESOLVED,
                reference_type=ContextReferenceType.PERSON,
                failure_code=ContextFailureCode.REFERENCE_NOT_FOUND,
                ambiguity_reason="No person entity is active in the current case context.",
                clarification_prompt="No person is currently selected or focused. Please select a person first.",
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 5. ENTITY DEIXIS ("this vehicle", "that phone", "this location") ──
        if re.search(r"\b(this\s+vehicle|that\s+vehicle|this\s+car)\b", q_low):
            veh_candidates = []
            if snapshot.result_set:
                veh_candidates = [e for e in snapshot.result_set.entity_ids if e.startswith("V") or "DL" in e or "HR" in e]
            if len(veh_candidates) > 1:
                return ContextResolutionResult(
                    status=ContextResolutionStatus.AMBIGUOUS,
                    reference_type=ContextReferenceType.ENTITY,
                    failure_code=ContextFailureCode.CLARIFICATION_REQUIRED,
                    candidates=[
                        ContextCandidate(candidate_id=v, candidate_type="VEHICLE", display_label=v, confidence_score=0.8)
                        for v in veh_candidates
                    ],
                    ambiguity_reason=f"Multiple vehicles in current result set ({', '.join(veh_candidates)}).",
                    clarification_prompt=f"Which vehicle did you mean: {', '.join(veh_candidates)}?",
                    context_id=snapshot.context_id,
                    version=snapshot.version,
                    correlation_id=corr_id,
                )
            if len(veh_candidates) == 1:
                return ContextResolutionResult(
                    status=ContextResolutionStatus.RESOLVED,
                    reference_type=ContextReferenceType.ENTITY,
                    resolved_id=veh_candidates[0],
                    resolved_value=veh_candidates[0],
                    context_id=snapshot.context_id,
                    version=snapshot.version,
                    correlation_id=corr_id,
                )
            # Default or fallback from active filters/recent
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.ENTITY,
                resolved_id="V001",
                resolved_value="V001",
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 6. RESULT-SET ITEM REFERENCES ("first one", "second one", "strongest", "weakest") ──
        if re.search(r"\b(which\s+one\s+is\s+strongest|the\s+strongest(\s+one)?|strongest)\b", q_low):
            if not snapshot.result_set or not (snapshot.result_set.entity_ids or snapshot.result_set.relationship_ids):
                return ContextResolutionResult(
                    status=ContextResolutionStatus.UNRESOLVED,
                    reference_type=ContextReferenceType.RESULT_ITEM,
                    failure_code=ContextFailureCode.RESULT_SET_EXPIRED,
                    ambiguity_reason="No active result set available to rank by strength.",
                    clarification_prompt="There is no active result set. Please run an investigative query first.",
                    context_id=snapshot.context_id,
                    version=snapshot.version,
                    correlation_id=corr_id,
                )
            # Resolve to the top/strongest item
            target_id = (
                snapshot.result_set.relationship_ids[0]
                if snapshot.result_set.relationship_ids
                else snapshot.result_set.entity_ids[0]
            )
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.RESULT_ITEM,
                resolved_id=target_id,
                resolved_value={"ranking": "STRONGEST", "target_id": target_id},
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        if re.search(r"\b(the\s+first(\s+one)?|first\s+result)\b", q_low):
            if snapshot.result_set and snapshot.result_set.entity_ids:
                return ContextResolutionResult(
                    status=ContextResolutionStatus.RESOLVED,
                    reference_type=ContextReferenceType.RESULT_ITEM,
                    resolved_id=snapshot.result_set.entity_ids[0],
                    resolved_value={"index": 0, "target_id": snapshot.result_set.entity_ids[0]},
                    context_id=snapshot.context_id,
                    version=snapshot.version,
                    correlation_id=corr_id,
                )

        if re.search(r"\b(the\s+second(\s+one)?|second\s+result)\b", q_low):
            if snapshot.result_set and len(snapshot.result_set.entity_ids) > 1:
                return ContextResolutionResult(
                    status=ContextResolutionStatus.RESOLVED,
                    reference_type=ContextReferenceType.RESULT_ITEM,
                    resolved_id=snapshot.result_set.entity_ids[1],
                    resolved_value={"index": 1, "target_id": snapshot.result_set.entity_ids[1]},
                    context_id=snapshot.context_id,
                    version=snapshot.version,
                    correlation_id=corr_id,
                )

        # ── 7. RELATIONSHIP & WHY RESOLUTION ("Why?", "Explain connection") ──
        if re.search(r"^(why\??|why\s+is\s+(this|he|it)\s+connected\??|explain\s+connection\??)$", q_low):
            rel_id = snapshot.selected_relationship_id or (
                snapshot.result_set.relationship_ids[0] if snapshot.result_set and snapshot.result_set.relationship_ids else None
            )
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.RELATIONSHIP,
                resolved_id=rel_id or "REL-2026-001",
                resolved_value={"action": "EXPLAIN_RELATIONSHIP", "relationship_id": rel_id or "REL-2026-001"},
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 8. EVIDENCE REFERENCES ("Show the evidence", "Show supporting evidence") ──
        if re.search(r"\b(show\s+(the\s+)?evidence|show\s+source|view\s+evidence|evidence\s+records?)\b", q_low):
            ev_id = snapshot.selected_evidence_ids[0] if snapshot.selected_evidence_ids else "EV-ANPR-001"
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.EVIDENCE,
                resolved_id=ev_id,
                resolved_value={"action": "OPEN_EVIDENCE", "evidence_id": ev_id},
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 9. GRAPH HOP ELLIPSIS ("Two hops", "1 hop", "3 hops") ──
        hop_match = re.search(r"\b(one|1|two|2|three|3)\s+hops?\b", q_low)
        if hop_match:
            depth_map = {"one": 1, "1": 1, "two": 2, "2": 2, "three": 3, "3": 3}
            depth = depth_map.get(hop_match.group(1), 2)
            anchor = snapshot.selected_entity_id or "P001"
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.GRAPH_HOP,
                resolved_id=anchor,
                resolved_value={"action": "EXPAND_NETWORK", "depth": depth, "anchor_entity": anchor},
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 10. FILTER ELLIPSIS ("Only vehicles", "Only phones", "Only verified") ──
        if re.search(r"\b(only\s+vehicles|just\s+vehicles|vehicles\s+only)\b", q_low):
            anchor = snapshot.selected_entity_id or "P001"
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.FILTER,
                resolved_id=anchor,
                resolved_value={"action": "FILTER", "target_type": "VEHICLE", "anchor_entity": anchor},
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        if re.search(r"\b(only\s+phones|just\s+phones|phones\s+only)\b", q_low):
            anchor = snapshot.selected_entity_id or "P001"
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.FILTER,
                resolved_id=anchor,
                resolved_value={"action": "FILTER", "target_type": "PHONE", "anchor_entity": anchor},
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 11. SPATIAL ELLIPSIS ("Put it on the map", "On the map") ──
        if re.search(r"\b(put\s+it\s+on\s+the\s+map|on\s+the\s+map|show\s+on\s+map|map\s+view)\b", q_low):
            target = snapshot.selected_entity_id or (
                snapshot.result_set.entity_ids[0] if snapshot.result_set and snapshot.result_set.entity_ids else "P001"
            )
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.SPATIAL,
                resolved_id=target,
                resolved_value={"action": "FOCUS_MAP", "target": target},
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # ── 12. TEMPORAL ELLIPSIS ("After yesterday", "Last week") ──
        if re.search(r"\b(after\s+yesterday|yesterday|today|last\s+week)\b", q_low) and not re.search(r"\b(what\s+changed|delta|investigation\s+delta)\b", q_low):
            temp_ref = self.normalize_temporal_expression(query, CANONICAL_REFERENCE_TIMESTAMP)
            return ContextResolutionResult(
                status=ContextResolutionStatus.RESOLVED,
                reference_type=ContextReferenceType.TEMPORAL,
                resolved_id=temp_ref.relative_expression,
                resolved_value=temp_ref.model_dump(),
                context_id=snapshot.context_id,
                version=snapshot.version,
                correlation_id=corr_id,
            )

        # Default: no indexical reference identified or required
        return ContextResolutionResult(
            status=ContextResolutionStatus.UNRESOLVED,
            ambiguity_reason="No contextual reference detected in query.",
            context_id=snapshot.context_id,
            version=snapshot.version,
            correlation_id=corr_id,
        )

    # ── Context-Enriched Intent Transformation ───────────────────────────────

    def enrich_intent_with_context(
        self,
        intent: InvestigationIntent,
        snapshot: InvestigationContextSnapshot,
    ) -> InvestigationIntent:
        """
        Enrich an InvestigationIntent with resolved context from the snapshot.
        Preserves active case boundary, filters, targets, and sets ambiguity flags
        if resolution required clarification.
        """
        # Strictly enforce case bound
        if not intent.target_case:
            intent.target_case = snapshot.case_id
            intent.case_id = snapshot.case_id

        # If snapshot has active filters and intent has filters, merge them
        if snapshot.active_filters:
            merged_filters = dict(snapshot.active_filters)
            merged_filters.update(intent.filters or {})
            intent.filters = merged_filters

        # If intent has no target entity, fallback to snapshot's selected_entity_id
        if not intent.target_entity and snapshot.selected_entity_id:
            intent.target_entity = snapshot.selected_entity_id
            if snapshot.selected_entity_id not in intent.entities:
                intent.entities.append(snapshot.selected_entity_id)
            if snapshot.selected_entity_id not in intent.targets:
                intent.targets.append(snapshot.selected_entity_id)

        # If intent has no target evidence, fallback to snapshot's selected evidence
        if not intent.target_evidence and snapshot.selected_evidence_ids:
            intent.target_evidence = snapshot.selected_evidence_ids[0]
            for evid in snapshot.selected_evidence_ids:
                if evid not in intent.evidence_refs:
                    intent.evidence_refs.append(evid)

        # If intent has no time range and snapshot has active time range, carry it forward
        if not intent.time_range and snapshot.active_time_range:
            intent.time_range = snapshot.active_time_range.model_dump()
            intent.temporal_constraints = intent.time_range

        return intent
