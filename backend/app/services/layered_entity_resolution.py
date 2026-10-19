from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from app.domain.canonical_entity import CanonicalEntity, EntityType
from app.services.normalization_service import NormalizationService


def soundex(name: str) -> str:
    """
    Standard Soundex algorithm implementation for phonetic similarity.
    """
    if not name:
        return "0000"
    name = name.upper()
    soundex_mapping = {
        "B": "1", "F": "1", "P": "1", "V": "1",
        "C": "2", "G": "2", "J": "2", "K": "2", "Q": "2", "S": "2", "X": "2", "Z": "2",
        "D": "3", "T": "3",
        "L": "4",
        "M": "5", "N": "5",
        "R": "6"
    }
    first_char = name[0]
    coded = [first_char]
    for char in name[1:]:
        code = soundex_mapping.get(char, "")
        if code and code != coded[-1]:
            coded.append(code)

    digits = [c for c in coded if c.isdigit()]
    result = first_char + "".join(digits)
    return (result + "0000")[:4]


def indic_transliteration_similarity(s1: str, s2: str) -> float:
    """
    Calculates transliteration-aware similarity for Indic names written in English.
    Handles common variations: v/w, i/ee, u/oo, s/sh, th/t, kh/k.
    """
    def simplify(text: str) -> str:
        t = text.lower()
        t = re.sub(r"sh", "s", t)
        t = re.sub(r"th", "t", t)
        t = re.sub(r"kh", "k", t)
        t = re.sub(r"ee", "i", t)
        t = re.sub(r"oo", "u", t)
        t = re.sub(r"w", "v", t)
        t = re.sub(r"ks", "x", t)
        return re.sub(r"[^\w]", "", t)

    t1 = simplify(s1)
    t2 = simplify(s2)
    if not t1 or not t2:
        return 0.0
    return difflib.SequenceMatcher(None, t1, t2).ratio()


class ResolutionSignal(BaseModel):
    stage_number: int
    stage_name: str
    signal_type: str  # SUPPORTING or CONTRADICTING
    weight: float
    description: str
    evidence_ref: Optional[str] = None


class ResolutionResult(BaseModel):
    target_entity_id: str
    candidate_entity_id: str
    candidate_display_name: str
    resolution_status: str  # CONFIRMED_MATCH, HIGHLY_LIKELY, CANDIDATE_MATCH, UNLIKELY_MATCH, CONTRADICTED
    resolution_confidence: float
    confidence_percentage: int
    resolution_method: str
    supporting_signals: List[ResolutionSignal] = Field(default_factory=list)
    contradicting_signals: List[ResolutionSignal] = Field(default_factory=list)
    source_records: List[str] = Field(default_factory=list)
    evidence_references: List[str] = Field(default_factory=list)
    requires_human_review: bool = True
    epistemic_disclaimer: str = (
        "AI/ML entity resolution proposals represent analytical candidate matches, "
        "not identity certainty or proof of legal identity. Final confirmation requires human investigator decision."
    )
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class LayeredEntityResolutionEngine:
    """
    9-Stage Layered Entity Resolution Engine:
    1. Exact deterministic identifiers
    2. Canonical normalization matching
    3. Alias matching
    4. String similarity
    5. Phonetic similarity
    6. Transliteration matching
    7. Contextual similarity
    8. Temporal corroboration
    9. Graph corroboration
    """

    def resolve_entities(
        self,
        target: CanonicalEntity,
        candidate: CanonicalEntity,
        contextual_data: Optional[Dict[str, Any]] = None,
    ) -> ResolutionResult:
        supporting: List[ResolutionSignal] = []
        contradicting: List[ResolutionSignal] = []
        source_records: Set[str] = set(target.source_references + candidate.source_references)
        evidence_refs: Set[str] = set()

        if target.provenance.evidence_references:
            evidence_refs.update(target.provenance.evidence_references)
        if candidate.provenance.evidence_references:
            evidence_refs.update(candidate.provenance.evidence_references)

        # Stage 1: Exact Deterministic Identifiers
        t_ids = target.canonical_identifiers
        c_ids = candidate.canonical_identifiers

        for key in ["aadhaar", "pan", "passport", "driving_license", "imei", "vehicle_reg", "vpa"]:
            t_val = t_ids.get(key)
            c_val = c_ids.get(key)
            if t_val and c_val:
                t_norm = NormalizationService.normalize_identifier(key, str(t_val)).normalized_value
                c_norm = NormalizationService.normalize_identifier(key, str(c_val)).normalized_value
                if t_norm and c_norm:
                    if t_norm == c_norm:
                        supporting.append(
                            ResolutionSignal(
                                stage_number=1,
                                stage_name="EXACT_DETERMINISTIC_IDENTIFIER",
                                signal_type="SUPPORTING",
                                weight=0.85,
                                description=f"Exact match on canonical identifier '{key}': {t_norm}",
                                evidence_ref=f"IDENTIFIER_{key.upper()}",
                            )
                        )
                    else:
                        contradicting.append(
                            ResolutionSignal(
                                stage_number=1,
                                stage_name="EXACT_DETERMINISTIC_IDENTIFIER",
                                signal_type="CONTRADICTING",
                                weight=0.40,
                                description=f"Contradictory identifier for '{key}': target has '{t_norm}', candidate has '{c_norm}'",
                                evidence_ref=f"IDENTIFIER_CONFLICT_{key.upper()}",
                            )
                        )

        # Stage 2: Canonical Normalization Matching
        t_name_norm = NormalizationService.normalize_name(target.display_name).normalized_value
        c_name_norm = NormalizationService.normalize_name(candidate.display_name).normalized_value

        if t_name_norm and c_name_norm and t_name_norm == c_name_norm:
            supporting.append(
                ResolutionSignal(
                    stage_number=2,
                    stage_name="CANONICAL_NORMALIZATION",
                    signal_type="SUPPORTING",
                    weight=0.25,
                    description=f"Normalized display names match exactly: '{t_name_norm}'",
                )
            )

        # Stage 3: Alias Matching
        t_aliases = [NormalizationService.normalize_alias(a).normalized_value for a in target.aliases if a]
        c_aliases = [NormalizationService.normalize_alias(a).normalized_value for a in candidate.aliases if a]

        alias_match = False
        for ta in t_aliases:
            if ta and (ta in c_aliases or ta == c_name_norm.lower()):
                alias_match = True
                supporting.append(
                    ResolutionSignal(
                        stage_number=3,
                        stage_name="ALIAS_MATCHING",
                        signal_type="SUPPORTING",
                        weight=0.18,
                        description=f"Matched alias '{ta}' across entity records",
                    )
                )
                break

        # Stage 4: String Similarity
        str_sim = difflib.SequenceMatcher(None, t_name_norm.lower(), c_name_norm.lower()).ratio()
        if str_sim > 0.70:
            supporting.append(
                ResolutionSignal(
                    stage_number=4,
                    stage_name="STRING_SIMILARITY",
                    signal_type="SUPPORTING",
                    weight=0.15 * str_sim,
                    description=f"Levenshtein string similarity of {int(str_sim * 100)}% between names",
                )
            )
        elif str_sim < 0.30 and not alias_match:
            contradicting.append(
                ResolutionSignal(
                    stage_number=4,
                    stage_name="STRING_SIMILARITY",
                    signal_type="CONTRADICTING",
                    weight=0.15,
                    description=f"Low string similarity ({int(str_sim * 100)}%) between '{t_name_norm}' and '{c_name_norm}'",
                )
            )

        # Stage 5: Phonetic Similarity
        t_soundex = soundex(t_name_norm)
        c_soundex = soundex(c_name_norm)
        if t_soundex and c_soundex and t_soundex == c_soundex:
            supporting.append(
                ResolutionSignal(
                    stage_number=5,
                    stage_name="PHONETIC_SIMILARITY",
                    signal_type="SUPPORTING",
                    weight=0.12,
                    description=f"Soundex phonetic match code '{t_soundex}'",
                )
            )

        # Stage 6: Transliteration Matching
        trans_sim = indic_transliteration_similarity(target.display_name, candidate.display_name)
        if trans_sim > 0.82 and str_sim <= 0.80:
            supporting.append(
                ResolutionSignal(
                    stage_number=6,
                    stage_name="TRANSLITERATION_MATCHING",
                    signal_type="SUPPORTING",
                    weight=0.14,
                    description=f"Indic-English transliteration similarity score {int(trans_sim * 100)}%",
                )
            )

        # Contextual inputs (if provided)
        ctx = contextual_data or {}

        # Stage 7: Contextual Similarity
        shared_locations = ctx.get("shared_locations", [])
        shared_cases = ctx.get("shared_cases", [])
        shared_phones = ctx.get("shared_phones", [])

        if shared_phones:
            supporting.append(
                ResolutionSignal(
                    stage_number=7,
                    stage_name="CONTEXTUAL_SIMILARITY",
                    signal_type="SUPPORTING",
                    weight=0.20,
                    description=f"Entities share {len(shared_phones)} phone number(s): {', '.join(shared_phones)}",
                    evidence_ref="CDR_PHONE_OVERLAP",
                )
            )
        if shared_locations:
            supporting.append(
                ResolutionSignal(
                    stage_number=7,
                    stage_name="CONTEXTUAL_SIMILARITY",
                    signal_type="SUPPORTING",
                    weight=0.10,
                    description=f"Entities share {len(shared_locations)} co-location point(s)",
                    evidence_ref="GIS_LOCATION_OVERLAP",
                )
            )
        if shared_cases:
            supporting.append(
                ResolutionSignal(
                    stage_number=7,
                    stage_name="CONTEXTUAL_SIMILARITY",
                    signal_type="SUPPORTING",
                    weight=0.10,
                    description=f"Entities co-occur in case(s): {', '.join(shared_cases)}",
                    evidence_ref="CASE_CO_OCCURRENCE",
                )
            )

        # Stage 8: Temporal Corroboration
        temporal_overlap = ctx.get("temporal_overlap_hours", None)
        if temporal_overlap is not None:
            if temporal_overlap <= 2:
                supporting.append(
                    ResolutionSignal(
                        stage_number=8,
                        stage_name="TEMPORAL_CORROBORATION",
                        signal_type="SUPPORTING",
                        weight=0.15,
                        description=f"Tight temporal observation window overlap ({temporal_overlap:.1f} hours)",
                        evidence_ref="TIMELINE_CO_OCCURRENCE",
                    )
                )
            elif temporal_overlap > 720: # > 30 days gap in conflicting activity
                contradicting.append(
                    ResolutionSignal(
                        stage_number=8,
                        stage_name="TEMPORAL_CORROBORATION",
                        signal_type="CONTRADICTING",
                        weight=0.10,
                        description="Significant temporal divergence between entity activity windows",
                    )
                )

        # Stage 9: Graph Corroboration
        shared_neighbors_count = ctx.get("shared_graph_neighbors", 0)
        if shared_neighbors_count >= 2:
            supporting.append(
                ResolutionSignal(
                    stage_number=9,
                    stage_name="GRAPH_CORROBORATION",
                    signal_type="SUPPORTING",
                    weight=0.15,
                    description=f"Graph topological corroboration: {shared_neighbors_count} shared 1-hop neighbor nodes",
                    evidence_ref="GRAPH_TOPOLOGY_COMMUNITY",
                )
            )

        # Compute Score
        support_score = sum(s.weight for s in supporting)
        contradict_penalty = sum(s.weight for s in contradicting)
        final_score = max(0.0, min(1.0, support_score - (contradict_penalty * 0.7)))

        # Determine Status
        if contradicting and any(s.stage_number == 1 for s in contradicting):
            status = "CONTRADICTED"
            final_score = min(final_score, 0.25)
        elif final_score >= 0.85:
            status = "CONFIRMED_MATCH" if any(s.stage_number == 1 for s in supporting) else "HIGHLY_LIKELY"
        elif final_score >= 0.55:
            status = "CANDIDATE_MATCH"
        else:
            status = "UNLIKELY_MATCH"

        method_chain = " → ".join(sorted(list({s.stage_name for s in supporting + contradicting})))

        return ResolutionResult(
            target_entity_id=target.id,
            candidate_entity_id=candidate.id,
            candidate_display_name=candidate.display_name,
            resolution_status=status,
            resolution_confidence=round(final_score, 4),
            confidence_percentage=int(final_score * 100),
            resolution_method=f"9_STAGE_PIPELINE[{method_chain}]",
            supporting_signals=supporting,
            contradicting_signals=contradicting,
            source_records=list(source_records),
            evidence_references=list(evidence_refs),
            requires_human_review=True,
        )
