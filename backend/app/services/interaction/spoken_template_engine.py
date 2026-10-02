from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

from app.domain.intelligence_contract import (
    FactCategoryEnum,
    ResponseLengthPolicyEnum,
)
from app.services.voice.tts import PronunciationLexicon

logger = logging.getLogger("sentinelx.interaction.spoken_template_engine")


class SpokenResponseTemplateEngine:
    """
    Deterministic Spoken & Text Response Template Engine for SentinelX.

    Core Invariants:
    1. ZERO Conversational Fluff: Never "Certainly!", "Sure!", "Great question!", "I'd be happy to".
    2. EPISTEMIC NON-GUILT: Never classify a person as GUILTY or INNOCENT. Never infer guilt from association.
    3. FACT / INFERENCE / UNKNOWN SEPARATION: Strictly separates verified facts, inferences, contradictions, and unknowns.
    4. LENGTH DISCIPLINE: Enforces MICRO (1 sentence), SHORT (1-2 sentences), STANDARD (2-4 sentences).
    5. PRONUNCIATION NORMALIZATION: Replaces case IDs, phone numbers, and forensic acronyms with natural spoken forms.
    """

    _FLUFF_PATTERNS = [
        r"\b(?:certainly|absolutely|of course|sure thing|great question|i'd be happy to|happy to help|as an ai)\b[,!]?",
        r"\b(?:hello there|glad to assist|no problem)\b[,!]?",
    ]

    _PROHIBITED_GUILT_PATTERNS = [
        (r"\b(?:is|was)\s+(?:guilty|the\s+criminal|the\s+perpetrator|the\s+culprit)\b", "is associated through available evidence"),
        (r"\bdefinitely\s+committed\s+the\s+crime\b", "is linked to key evidentiary events"),
        (r"\bai\s+knows\s+he\s+is\s+guilty\b", "evidence indicates an association"),
        (r"\bguilty\b", "associated with incident"),
        (r"\binnocent\b", "unimplicated in incident"),
    ]

    @classmethod
    def sanitize_text(cls, text: str) -> str:
        """Strip conversational fluff and replace prohibited guilt inferences with evidence-grounded phrasing."""
        if not text:
            return ""

        res = text
        for pat in cls._FLUFF_PATTERNS:
            res = re.sub(pat, "", res, flags=re.IGNORECASE)

        for pat, replacement in cls._PROHIBITED_GUILT_PATTERNS:
            res = re.sub(pat, replacement, res, flags=re.IGNORECASE)

        # Normalize whitespace
        res = re.sub(r"\s+", " ", res).strip()
        # Clean up leading commas or periods
        res = re.sub(r"^[,.:; ]+", "", res)
        return res

    @classmethod
    def enforce_length_policy(cls, text: str, policy: ResponseLengthPolicyEnum) -> str:
        """Truncate or format sentences according to the length policy."""
        if not text:
            return ""

        # Split into sentences using punctuation boundaries
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        if not sentences:
            return text

        if policy == ResponseLengthPolicyEnum.MICRO:
            return sentences[0]
        elif policy == ResponseLengthPolicyEnum.SHORT:
            return " ".join(sentences[:2])
        elif policy == ResponseLengthPolicyEnum.STANDARD:
            return " ".join(sentences[:4])
        return " ".join(sentences)

    @classmethod
    def render_spoken_response(
        cls,
        template_name: str,
        params: Dict[str, Any],
        language: str = "en-IN",
        length_policy: ResponseLengthPolicyEnum = ResponseLengthPolicyEnum.SHORT,
    ) -> str:
        """
        Render a deterministic, concise spoken response from structured parameters.
        Applies phonetic normalization via PronunciationLexicon.
        """
        # Tamil localization for core templates
        if language.startswith("ta"):
            spoken_raw = cls._render_tamil(template_name, params)
            return cls.sanitize_text(spoken_raw)

        # English / Indian-English templates
        spoken_raw = cls._render_english(template_name, params)
        sanitized = cls.sanitize_text(spoken_raw)
        bounded = cls.enforce_length_policy(sanitized, length_policy)
        normalized = PronunciationLexicon.normalize_for_speech(bounded)
        return normalized

    @classmethod
    def render(cls, template_name: str, **kwargs) -> str:
        """Convenience method rendering spoken response from kwargs."""
        return cls.render_spoken_response(template_name, kwargs)

    @classmethod
    def _render_english(cls, template_name: str, p: Dict[str, Any]) -> str:
        name = template_name.upper()

        if name == "SEARCH_RESULT":
            count = p.get("count", 0)
            entity_type = p.get("entity_type", "entities")
            query = p.get("query")
            if query:
                return f"Found {count} {entity_type} matching query {query}."
            return f"Found {count} {entity_type}."

        elif name == "ENTITY_CONNECTIONS":
            entity = p.get("entity", "Entity")
            count = p.get("count", 0)
            types = p.get("types", "entities")
            note = p.get("strongest_note", "")
            base = f"{entity} has {count} connected {types}."
            if note:
                return f"{base} {note}"
            return base

        elif name == "FILTER_RESULT":
            count = p.get("count", 0)
            entity_type = p.get("entity_type", "items")
            filt = p.get("filter_desc", "the current filters")
            return f"Found {count} {entity_type} matching {filt}."

        elif name == "STRONGEST_CONNECTION":
            entity = p.get("entity", "Entity")
            total = p.get("total_candidates")
            if total:
                return f"{entity} has the strongest evidence-supported connection among {total} candidates."
            return f"{entity} has the strongest evidence-supported connection."

        elif name == "WHY_RELATIONSHIP":
            entity_a = p.get("entity_a", "Entity")
            entity_b = p.get("entity_b")
            sources = p.get("sources", "available records")
            contra = p.get("contradiction_note", "")
            target_str = f"to {entity_b}" if entity_b else ""
            base = f"{entity_a} is linked {target_str} through {sources}."
            if contra:
                return f"{base} {contra}"
            return base

        elif name == "CONTRADICTION":
            subject = p.get("subject", "the investigation")
            supporting = p.get("supporting_summary", "One record indicates physical presence")
            contradicting = p.get("contradictory_summary", "while another sighting conflicts with that timeline")
            return f"I found a contradiction involving {subject}. {supporting}. {contradicting}."

        elif name == "EVIDENCE":
            source_count = p.get("source_count", 1)
            rec_str = "record" if source_count == 1 else "records"
            ev_id = p.get("evidence_id")
            if ev_id:
                return f"Displaying CAS artifact {ev_id}. This relationship is supported by {source_count} verified {rec_str}."
            return f"This relationship is supported by {source_count} {rec_str}."

        elif name == "EVIDENCE_GAP":
            requirement = p.get("requirement", "requested source")
            case_id = p.get("case_id", "the case")
            return f"Evidence is missing for {requirement} in {case_id}."

        elif name == "UNVERIFIED":
            subject = p.get("subject", "This relationship")
            return f"{subject} has not been verified."

        elif name == "CLARIFICATION":
            entity_type = p.get("entity_type", "entity")
            cand_a = p.get("candidate_a", "the first candidate")
            cand_b = p.get("candidate_b", "the second candidate")
            return f"Which {entity_type} do you mean: {cand_a} or {cand_b}?"

        elif name == "POLICY_DENIAL":
            reason = p.get("reason", "current authorization")
            return f"I can't perform that action under {reason}."

        elif name == "CONFIRMATION_REQUIRED":
            action = p.get("action", "this high-risk operation")
            return f"Confirmation required. Action {action} requires explicit statutory authorization."

        elif name == "MAP_VIEW":
            count = p.get("count", "relevant")
            return f"Loaded {count} geo-located observations on the map."

        elif name == "EXPAND_HOPS":
            depth = p.get("depth", 2)
            entity = p.get("entity", "entity")
            return f"Expanded network connections to {depth} hops around {entity}."

        elif name == "GO_BACK":
            return "Returning to Level 0 Command Surface."

        elif name == "CORRECTION":
            target = p.get("target", "target")
            return f"Updated focus to {target}."

        elif name == "OPEN_CASE":
            case_id = p.get("case_id", "CASE-2026-001")
            name_str = p.get("case_name", "Operation Triad Nexus")
            return f"Continuing investigation for {case_id}, {name_str}."

        elif name == "SUMMARY":
            case_id = p.get("case_id", "CASE-2026-001")
            entities_count = p.get("entities_count", 3)
            contras_count = p.get("contras_count", 1)
            gaps_count = p.get("gaps_count", 2)
            return f"Summary: Case {case_id} has {entities_count} priority entities, {contras_count} critical contradiction, and {gaps_count} evidence gaps."

        else:
            return p.get("message", "Action processed successfully.")

    @classmethod
    def _render_tamil(cls, template_name: str, p: Dict[str, Any]) -> str:
        name = template_name.upper()
        if name == "WELCOME":
            return "சென்டினல்-எக்ஸ்-க்கு வரவேற்கிறோம். நான் உங்கள் புலனாய்வு உதவியாளர். நீங்கள் எதை விசாரிக்க விரும்புகிறீர்கள் என்று சொல்லுங்கள்."
        elif name == "CONTRADICTION":
            return "ஒரு முரண்பாடு கண்டறியப்பட்டுள்ளது. கோப்புகள் மற்றும் பதிவுகள் பொருந்தவில்லை."
        elif name == "CLARIFICATION":
            return "தயவுசெய்து எந்த உருப்படியைக் குறிப்பிடுகிறீர்கள் என்பதை தெளிவுபடுத்தவும்."
        elif name == "POLICY_DENIAL":
            return "தற்போதைய அங்கீகாரத்தின் கீழ் இந்த நடவடிக்கையை செய்ய முடியாது."
        return p.get("message", "செயல் வெற்றிகரமாக முடிக்கப்பட்டது.")
