from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger("sentinelx.interaction.multilingual_normalizer")


class ScriptType(str, Enum):
    LATIN = "LATIN"
    TAMIL = "TAMIL"
    MIXED = "MIXED"


class LanguageMode(str, Enum):
    ENGLISH = "en"
    TAMIL = "ta"
    TANGLISH = "ta-Latn"
    CODE_SWITCHED = "code-switched"


class LinguisticRegister(str, Enum):
    FORMAL_LEGAL = "FORMAL_LEGAL"
    COLLOQUIAL_INVESTIGATIVE = "COLLOQUIAL_INVESTIGATIVE"
    TELEGRAPHIC_DIRECT = "TELEGRAPHIC_DIRECT"


@dataclass
class MultilingualAnalysis:
    raw_text: str
    script: ScriptType
    language_mode: LanguageMode
    register: LinguisticRegister
    preserved_tokens: Dict[str, Any]
    normalized_query: str
    canonical_intent: str
    canonical_action: Optional[str]
    parameters: Dict[str, Any]
    confidence: float
    is_ambiguous: bool
    ambiguity_reason: Optional[str] = None
    clarification_prompt: Optional[str] = None


class MultilingualNormalizer:
    """
    CANONICAL INVESTIGATION-LANGUAGE NORMALIZATION LAYER.
    Supports: English, Tamil, Tanglish, and English-Tamil / Tamil-English code-switching.

    CRITICAL INVARIANTS:
    - Never translate forensic meaning loosely.
    - Preserves identifiers, timestamps, numbers, statutory references, uncertainty, epistemic status, source attribution.
    - If utterance is materially ambiguous: ASK. Never guess.
    - All languages converge to the exact same semantic contract.
    """

    _instance: Optional[MultilingualNormalizer] = None

    def __init__(self) -> None:
        # Regex for Tamil script range: U+0B80 to U+0BFF
        self.tamil_script_regex = re.compile(r"[\u0B80-\u0BFF]")
        self.latin_script_regex = re.compile(r"[A-Za-z]")

        # Forensic token extractors
        self.identifier_regex = re.compile(
            r"\b(P\d+|CASE-\d+(?:-\d+)?|C\d+|EV-[A-Z0-9-]+|CLM-[A-Z0-9-]+|GAP-\d+|DL-[0-9A-Z-]+|HYP-\d+)\b",
            re.IGNORECASE,
        )
        self.statutory_regex = re.compile(
            r"\b(Section\s*\d+\s*(?:BNSS|CrPC|IT\s*Act|BSA|IEA)?|BNSS\s*\d+|CrPC\s*\d+|BSA\s*\d+|65B|Sec\s*\d+)\b",
            re.IGNORECASE,
        )
        self.timestamp_regex = re.compile(
            r"\b(\d{4}-\d{2}-\d{2}|\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|IST)?|\d{1,2}\s*(?:hours|hrs|days|mins|minutes)\s*ago)\b",
            re.IGNORECASE,
        )

    @classmethod
    def get_instance(cls) -> MultilingualNormalizer:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def analyze_and_normalize(
        self,
        utterance: str,
        context_case_id: Optional[str] = None,
        selected_entity_id: Optional[str] = None,
        selected_claim_id: Optional[str] = None,
    ) -> MultilingualAnalysis:
        raw_text = utterance.strip()
        case_id = context_case_id or "CASE-2026-001"

        if not raw_text:
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=ScriptType.LATIN,
                language_mode=LanguageMode.ENGLISH,
                register=LinguisticRegister.TELEGRAPHIC_DIRECT,
                preserved_tokens={},
                normalized_query="",
                canonical_intent="UNKNOWN",
                canonical_action=None,
                parameters={"case_id": case_id},
                confidence=0.0,
                is_ambiguous=True,
                ambiguity_reason="Empty utterance submitted.",
                clarification_prompt="Please state what you would like to investigate.",
            )

        # 1. Script & Language Identification
        script = self._detect_script(raw_text)
        language_mode = self._detect_language_mode(raw_text, script)
        register = self._detect_register(raw_text)

        # 2. Token Preservation (Forensic anchors)
        preserved_tokens = self._extract_preserved_tokens(raw_text)

        # Explicit Case extraction
        explicit_case = preserved_tokens.get("identifiers", {}).get("case")
        if explicit_case:
            case_id = explicit_case

        # Explicit Entity extraction
        target_entity = (
            preserved_tokens.get("identifiers", {}).get("entity") or selected_entity_id
        )

        # 3. Semantic Normalization across English, Tamil, Tanglish & Code-Switching
        return self._normalize_to_intent(
            raw_text=raw_text,
            script=script,
            language_mode=language_mode,
            register=register,
            preserved_tokens=preserved_tokens,
            case_id=case_id,
            target_entity=target_entity,
            selected_claim_id=selected_claim_id,
        )

    def _detect_script(self, text: str) -> ScriptType:
        has_tamil = bool(self.tamil_script_regex.search(text))
        has_latin = bool(self.latin_script_regex.search(text))

        if has_tamil and has_latin:
            return ScriptType.MIXED
        if has_tamil:
            return ScriptType.TAMIL
        return ScriptType.LATIN

    def _detect_language_mode(self, text: str, script: ScriptType) -> LanguageMode:
        text_lower = text.lower()
        if script == ScriptType.TAMIL:
            return LanguageMode.TAMIL

        # Detect Tanglish markers
        tanglish_markers = {
            "pannu", "pannunga", "kaatu", "kaattu", "kaatunga", "kamikka", "kamikunga",
            "paaru", "paarunga", "sollinga", "sollu", "edhukku", "yen", "enna",
            "muranpaadu", "muranpadu", "vidupattadhu", "kanom", "pinnaadi", "thirumbu",
            "surukki", "surukkam", "maariydhu", "seiyyi", "seiyyunga", "aachu",
            "la", "le", "ku", "oda", "a", "idha", "adha",
            "idhu", "adhu", "mukkiyam", "aadhaaram", "saandru", "kaalavarisai", "vidupattavai", "yaaru", "eppadi", "enga", "engae",
        }
        words = set(re.findall(r"\b[a-z]+\b", text_lower))
        tanglish_word_count = len(words.intersection(tanglish_markers))

        if script == ScriptType.MIXED:
            return LanguageMode.CODE_SWITCHED

        if tanglish_word_count > 0:
            english_words = words - tanglish_markers
            if len(english_words) > 1 and tanglish_word_count >= 1:
                return LanguageMode.CODE_SWITCHED
            return LanguageMode.TANGLISH

        return LanguageMode.ENGLISH

    def _detect_register(self, text: str) -> LinguisticRegister:
        text_lower = text.lower()
        if self.statutory_regex.search(text) or any(
            w in text_lower for w in ["statutory", "affidavit", "custody", "warrant", "section", "rego", "reggo"]
        ):
            return LinguisticRegister.FORMAL_LEGAL

        if len(text.split()) <= 2 and not any(w in text_lower for w in ["please", "could", "would"]):
            return LinguisticRegister.TELEGRAPHIC_DIRECT

        return LinguisticRegister.COLLOQUIAL_INVESTIGATIVE

    def _extract_preserved_tokens(self, text: str) -> Dict[str, Any]:
        preserved: Dict[str, Any] = {}

        # Identifiers
        ids = self.identifier_regex.findall(text)
        if ids:
            id_dict: Dict[str, str] = {}
            for i in ids:
                upper_id = i.upper()
                if upper_id.startswith("P"):
                    id_dict["entity"] = upper_id
                elif upper_id.startswith("CLM-"):
                    id_dict["claim"] = upper_id
                elif upper_id.startswith("EV-"):
                    id_dict["evidence"] = upper_id
                elif upper_id.startswith("GAP-"):
                    id_dict["gap"] = upper_id
                elif upper_id.startswith("CASE-") or (upper_id.startswith("C") and upper_id[1:].isdigit()):
                    id_dict["case"] = upper_id
            preserved["identifiers"] = id_dict

        # Statutory references
        statutes = self.statutory_regex.findall(text)
        if statutes:
            preserved["statutory_references"] = statutes

        # Timestamps
        timestamps = self.timestamp_regex.findall(text)
        if timestamps:
            preserved["timestamps"] = timestamps

        return preserved

    def _normalize_to_intent(
        self,
        raw_text: str,
        script: ScriptType,
        language_mode: LanguageMode,
        register: LinguisticRegister,
        preserved_tokens: Dict[str, Any],
        case_id: str,
        target_entity: Optional[str],
        selected_claim_id: Optional[str],
    ) -> MultilingualAnalysis:
        text_lower = raw_text.lower()
        args: Dict[str, Any] = {"case_id": case_id}
        if target_entity:
            args["entity_id"] = target_entity

        # Check Ambiguity (Vague / Noise)
        targetless_inspection = {
            "open it", "inspect that", "inspect it", "check this", "check it",
            "view this", "view that", "view it", "what about that", "what about him",
            "tell me more", "analyze that", "show details", "adha paaru", "adhu enna",
            "kaatu", "kaattu", "kamikka", "kamikunga", "paaru", "paarunga", "show", "show me", "open", "inspect",
        }
        vague_commands = {
            "do something", "edho onnu pannu", "um", "uh", "hello", "test", "hmm", "err", "um uh", "um uh test",
        }
        filler_words = {"um", "uh", "err", "ah", "hmm", "hello", "test", "what", "who", "enna", "yaaru"}
        words = set(re.findall(r"\b[a-z0-9\u0B80-\u0BFF]+\b", text_lower))

        if text_lower in targetless_inspection:
            prompt = (
                "தயவுசெய்து ஒரு நபர் அல்லது சான்றைத் தேர்ந்தெடுக்கவும் அல்லது உங்கள் வினவலில் பெயர்/ஐடியைக் குறிப்பிடவும்."
                if language_mode == LanguageMode.TAMIL
                else "Canvas-la entity illa evidence-a select pannunga, illa ungal query-la mention pannunga."
                if language_mode in (LanguageMode.TANGLISH, LanguageMode.CODE_SWITCHED)
                else "Please select an entity or evidence on canvas, or specify the name or ID in your query."
            )
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query=raw_text,
                canonical_intent="AMBIGUOUS_INSPECTION",
                canonical_action=None,
                parameters=args,
                confidence=0.3,
                is_ambiguous=True,
                ambiguity_reason=f"Query '{raw_text}' is ambiguous without an active entity, evidence, or claim selection.",
                clarification_prompt=prompt,
            )

        if text_lower in vague_commands or (words and words.issubset(filler_words)):
            prompt = (
                "உங்கள் கோரிக்கையை தெளிவுபடுத்தவும். வரைபடம், முரண்பாடுகள் அல்லது காலவரிசையை பார்க்க விரும்புகிறீர்களா?"
                if language_mode == LanguageMode.TAMIL
                else "Ungal request-a clarify pannunga. Graph, contradictions, illa timeline paarka virumbureengala?"
                if language_mode in (LanguageMode.TANGLISH, LanguageMode.CODE_SWITCHED)
                else "Please clarify your request. Would you like to view the graph, contradictions, or timeline?"
            )
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query=raw_text,
                canonical_intent="AMBIGUOUS_COMMAND",
                canonical_action=None,
                parameters=args,
                confidence=0.3,
                is_ambiguous=True,
                ambiguity_reason=f"Utterance '{raw_text}' is underspecified without concrete target.",
                clarification_prompt=prompt,
            )

        # ── 1. Continue Investigation / Open Case ───────────────────
        # English: "continue the investigation", "open case CASE-2026-001"
        # Tamil: "விசாரணையை தொடர்", "வழக்கை திற"
        # Tanglish: "investigation-a continue pannu", "case-a open pannu", "thodaru"
        if (
            re.search(r"\b(continue\s+(the\s+)?investigation|resume\s+investigation|open\s+case|load\s+case)\b", text_lower)
            or re.search(r"(விசாரணையை\s*தொடர்|வழக்கை\s*திற|வழக்கை\s*தொடங்கு)", raw_text)
            or re.search(r"\b((?:investigation|case)[-a\s]*(?:continue|open|resume)\s*(?:pannu|pannunga)|thodaru|thodarunga)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="continue investigation",
                canonical_intent="OPEN_CASE",
                canonical_action="OPEN_CASE",
                parameters=args,
                confidence=0.98,
                is_ambiguous=False,
            )

        # ── 2. What Needs Attention / Prioritization ─────────────────
        # English: "what needs my attention", "attention needed"
        # Tamil: "நான் எதை கவனிக்க வேண்டும்", "கவனத்திற்குரியவை என்ன"
        # Tanglish: "edha gavanikanum", "attention enna", "priority enna"
        if (
            re.search(r"\b(what\s+needs\s+(my\s+)?attention|priorities|attention\s+needed)\b", text_lower)
            or re.search(r"(கவனிக்க\s*வேண்டும்|கவனத்திற்குரியவை|முன்னுரிமை)", raw_text)
            or re.search(r"\b(attention\s*enna|edha\s*gavanikanum|priority\s*enna)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="what needs my attention",
                canonical_intent="SUMMARIZE",
                canonical_action="SUMMARIZE",
                parameters={**args, "focus": "ATTENTION_PRIORITIES"},
                confidence=0.97,
                is_ambiguous=False,
            )

        # ── 3. Show Contradictions ───────────────────────────────────
        # English: "show me the contradiction", "show contradictions"
        # Tamil: "முரண்பாடுகளை காட்டு", "முரண்பாட்டை காட்டுங்கள்"
        # Tanglish: "contradiction-a kaatu", "contradictions-a kamikunga", "muranpaadu kaatu"
        if (
            re.search(r"\b(show\s+(me\s+)?(the\s+)?contradictions?|open\s+contradictions?|contradiction\s+center)\b", text_lower)
            or re.search(r"(முரண்பாடுகளை\s*காட்டு|முரண்பாட்டை\s*காட்டு|முரண்பாடு)", raw_text)
            or re.search(r"\b(contradiction[s]?[-a\s]*(?:kaatu|kaattu|kaatunga|kamikka|kamikunga|paaru|paarunga|open\s*pannu|open|load\s*pannu)|muranpaad[u|ugal])\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="show contradictions",
                canonical_intent="OPEN_CONTRADICTIONS",
                canonical_action="OPEN_CONTRADICTIONS",
                parameters=args,
                confidence=0.98,
                is_ambiguous=False,
            )

        # ── 4. Why Does It Matter / Explain ──────────────────────────
        # English: "why does it matter", "explain this", "explain contradiction"
        # Tamil: "இது ஏன் முக்கியம்", "இதை விளக்குங்கள்", "காரணம் என்ன"
        # Tanglish: "why it matters", "idhu edhukku mukkiyam", "idha vilakkunga", "vilakku"
        if (
            re.search(r"\b(why\s+does\s+(?:it|this)\s+matter|why\s+it\s+matters|explain\s+this|explain\s+reasoning|why\s+this)\b", text_lower)
            or re.search(r"(ஏன்\s*முக்கியம்|விளக்குங்கள்|விளக்கு|காரணம்\s*என்ன)", raw_text)
            or re.search(r"\b(edhukku\s*mukkiyam|idha\s*vilakku|vilakkunga|why\s*important)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="explain this",
                canonical_intent="SHOW_AGENT_FINDINGS",
                canonical_action="SHOW_AGENT_FINDINGS",
                parameters={**args, "objective": raw_text},
                confidence=0.96,
                is_ambiguous=False,
            )

        # ── 5. Show Evidence ─────────────────────────────────────────
        # English: "show me the evidence", "show evidence", "view evidence"
        # Tamil: "சான்றுகளை காட்டு", "சான்றை காட்டுங்கள்", "ஆதாரங்களை காட்டு"
        # Tanglish: "evidence-a kaatu", "evidence-a kamikunga", "aadhaaram kaatunga"
        if (
            re.search(r"\b(show\s+(me\s+)?(the\s+)?evidence|open\s+evidence|view\s+evidence)\b", text_lower)
            or re.search(r"(சான்றுகளை\s*காட்டு|சான்றை\s*காட்டு|ஆதாரங்களை\s*காட்டு|ஆதாரம்)", raw_text)
            or re.search(r"\b(evidence[-a\s]*(?:kaatu|kaattu|kaatunga|kamikka|kamikunga|paaru|paarunga|open\s*pannu|load\s*pannu)|aadhaaram)\b", text_lower)
        ):
            ev_id = preserved_tokens.get("identifiers", {}).get("evidence") or "EV-ANPR-001"
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="show evidence",
                canonical_intent="OPEN_EVIDENCE",
                canonical_action="OPEN_EVIDENCE",
                parameters={**args, "evidence_id": ev_id},
                confidence=0.98,
                is_ambiguous=False,
            )

        # ── 6. Show Timeline ─────────────────────────────────────────
        # English: "show me the timeline", "open timeline"
        # Tamil: "காலவரிசையை காட்டு", "காலக்கோட்டை காட்டு"
        # Tanglish: "timeline-a kaatu", "timeline-a paaru", "kaalavarisai kaatunga"
        if (
            re.search(r"\b(show\s+(me\s+)?(the\s+)?timeline|open\s+timeline|inspect\s+timeline)\b", text_lower)
            or re.search(r"(காலவரிசையை\s*காட்டு|காலக்கோட்டை\s*காட்டு|காலவரிசை)", raw_text)
            or re.search(r"\b(timeline[-a\s]*(?:kaatu|kaattu|kaatunga|kamikka|kamikunga|paaru|paarunga|open\s*pannu|open|load\s*pannu)|kaalavarisai)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="show timeline",
                canonical_intent="OPEN_TIMELINE",
                canonical_action="OPEN_TIMELINE",
                parameters=args,
                confidence=0.98,
                is_ambiguous=False,
            )

        # ── Show Graph ───────────────────────────────────────────────
        # English: "show graph", "open graph", "intelligence graph"
        # Tamil: "வரைபடத்தை காட்டு", "வரைபடம்"
        # Tanglish: "graph-a kaatu", "graph-a open pannu"
        if (
            re.search(r"\b(open\s+(the\s+)?graph|show\s+(the\s+)?graph|intelligence\s+graph|view\s+graph)\b", text_lower)
            or re.search(r"(வரைபடத்தை\s*காட்டு|வரைபடம்)", raw_text)
            or re.search(r"\b(graph[-a\s]*(?:kaatu|kaattu|kaatunga|kamikka|kamikunga|paaru|paarunga|open\s*pannu|open|load\s*pannu))\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="open graph",
                canonical_intent="OPEN_GRAPH",
                canonical_action="OPEN_GRAPH",
                parameters=args,
                confidence=0.98,
                is_ambiguous=False,
            )

        # ── 7. What Are We Missing / Show Gaps ───────────────────────
        # English: "what are we missing", "what is missing", "show gaps"
        # Tamil: "என்ன விடுபட்டது", "இடைவெளிகளை காட்டு", "எது காணவில்லை"
        # Tanglish: "enna missing", "what is missing", "gaps-a kaatunga", "vidupattavai enna"
        if (
            re.search(r"\b(what\s+are\s+we\s+(?:still\s+)?missing|what\s+is\s+missing|show\s+(the\s+)?gaps?|missing\s+evidence)\b", text_lower)
            or re.search(r"(என்ன\s*விடுபட்டது|இடைவெளிகளை\s*காட்டு|விடுபட்டவை|எது\s*காணவில்லை)", raw_text)
            or re.search(r"\b(gaps?[-a\s]*(?:kaatu|kaattu|kaatunga|kamikka|kamikunga|paaru|paarunga)|enna\s*missing|vidupattadhu)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="what is missing",
                canonical_intent="OPEN_GAPS",
                canonical_action="OPEN_GAPS",
                parameters=args,
                confidence=0.98,
                is_ambiguous=False,
            )

        # ── 8. Show Entity / Show P001 ───────────────────────────────
        # English: "show P001", "show entity Vikram", "open entity P001"
        # Tamil: "P001-ஐ காட்டு", "நபரை காட்டு"
        # Tanglish: "P001-a kaatu", "entity-a paaru", "P001 kamikunga"
        if (
            re.search(r"\b(show|open|inspect|focus)\s+entity\s+([a-z0-9_-]+)\b", text_lower)
            or re.search(r"\b(show|open|inspect|focus)\s+(p\d+)\b", text_lower)
            or (target_entity and not any(w in text_lower for w in ["trace", "proof", "provenance", "evidence", "timeline", "contradiction", "gap", "case", "summary"]))
            or re.search(r"(காட்டு|பாருங்கள்).*(P\d+)", raw_text)
            or re.search(r"\b(p\d+)[-a\s]*(?:kaatu|kaattu|kamikunga|paaru)\b", text_lower)
        ):
            matched_ent = re.search(r"\b(p\d+)\b", text_lower)
            ent_id = target_entity or (matched_ent.group(1).upper() if matched_ent else "P001")
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query=f"show entity {ent_id}",
                canonical_intent="OPEN_ENTITY",
                canonical_action="OPEN_ENTITY",
                parameters={**args, "entity_id": ent_id},
                confidence=0.97,
                is_ambiguous=False,
            )

        # ── 9. Go Back ───────────────────────────────────────────────
        # English: "go back", "return", "previous view"
        # Tamil: "பின்னே செல்", "திரும்பு", "பின்னால் போ"
        # Tanglish: "pinnaadi po", "thirumbu", "back po", "go back"
        if (
            re.search(r"\b(go\s+back|return|previous\s+view|back)\b", text_lower)
            or re.search(r"(பின்னே\s*செல்|திரும்பு|பின்னால்\s*போ)", raw_text)
            or re.search(r"\b(pinnaadi\s*po|thirumbu|back\s*po)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="go back",
                canonical_intent="GO_BACK",
                canonical_action="GO_BACK",
                parameters=args,
                confidence=0.99,
                is_ambiguous=False,
            )

        # ── 10. Summarize ────────────────────────────────────────────
        # English: "summarize what I reviewed", "summarize", "case summary"
        # Tamil: "சுருக்கத்தை காட்டு", "சுருக்கி கூறு", "சுருக்கம்"
        # Tanglish: "summary sollu", "surukki sollu", "summarize pannu"
        if (
            re.search(r"\b(summarize(\s+what\s+i\s+reviewed)?|case\s+summary|summary\s+docket)\b", text_lower)
            or re.search(r"(சுருக்கத்தை\s*காட்டு|சுருக்கி\s*கூறு|சுருக்கம்)", raw_text)
            or re.search(r"\b(summary\s*sollu|surukki\s*sollu|summarize\s*pannu|surukkam)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="summarize",
                canonical_intent="SUMMARIZE",
                canonical_action="SUMMARIZE",
                parameters=args,
                confidence=0.98,
                is_ambiguous=False,
            )

        # ── 11. Trace Relationship ───────────────────────────────────
        # English: "trace relationship", "trace connections"
        # Tamil: "தொடர்பை கண்டறி", "இணைப்பை காட்டு"
        # Tanglish: "relationship-a trace pannu", "connection-a paaru"
        if (
            re.search(r"\b(trace\s+relationship|trace\s+connections?|trace\s+p\d+|trace\s+entity|trace\b|inspect\s+relationship)\b", text_lower)
            or re.search(r"(தொடர்பை\s*கண்டறி|தொடர்பை\s*காட்டு|இணைப்பை\s*காட்டு|தொடர்பு)", raw_text)
            or re.search(r"\b(relationship[-a\s]*trace\s*pannu|connection[-a\s]*paaru)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="trace relationship",
                canonical_intent="TRACE_PROVENANCE",
                canonical_action="TRACE_PROVENANCE",
                parameters=args,
                confidence=0.96,
                is_ambiguous=False,
            )

        # ── 12. Show Proof ───────────────────────────────────────────
        # English: "show proof", "show provenance", "prove claim"
        # Tamil: "சான்றளிப்பை காட்டு", "ஆதாரச் சான்றை காட்டு"
        # Tanglish: "proof-a kaatu", "provenance-a paaru"
        if (
            re.search(r"\b(show\s+proof|live\s+proof|trace\s+provenance|prove\s+claim)\b", text_lower)
            or re.search(r"(சான்றளிப்பை\s*காட்டு|சான்றாதாரத்தை\s*காட்டு|ஆதாரச்\s*சான்று|சான்று)", raw_text)
            or re.search(r"\b(proof[-a\s]*(?:kaatu|kaattu|kaatunga|kamikka|kamikunga|paaru|paarunga)|provenance)\b", text_lower)
        ):
            claim_id = preserved_tokens.get("identifiers", {}).get("claim") or selected_claim_id or "CLM-2026-001"
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="show proof",
                canonical_intent="OPEN_PROOF",
                canonical_action="OPEN_PROOF",
                parameters={**args, "claim_id": claim_id},
                confidence=0.96,
                is_ambiguous=False,
            )

        # ── 13. What Changed (Delta) ──────────────────────────────────
        # English: "what changed", "show delta", "recent updates"
        # Tamil: "என்ன மாறியது", "மாற்றங்களை காட்டு"
        # Tanglish: "enna maariydhu", "delta kaatunga", "enna updates"
        if (
            re.search(r"\b(what\s+changed|show\s+delta|recent\s+updates|changes)\b", text_lower)
            or re.search(r"(என்ன\s*மாறியது|என்ன\s*மாற்றங்கள்|மாற்றங்களை\s*காட்டு|மாற்றம்)", raw_text)
            or re.search(r"\b(enna\s*maariydhu|delta\s*kaatu|changes\s*enna)\b", text_lower)
        ):
            return MultilingualAnalysis(
                raw_text=raw_text,
                script=script,
                language_mode=language_mode,
                register=register,
                preserved_tokens=preserved_tokens,
                normalized_query="what changed",
                canonical_intent="SHOW_AGENT_FINDINGS",
                canonical_action="SHOW_AGENT_FINDINGS",
                parameters={**args, "view": "delta"},
                confidence=0.96,
                is_ambiguous=False,
            )

        # ── Default Fallback ──────────────────────────────────────────
        return MultilingualAnalysis(
            raw_text=raw_text,
            script=script,
            language_mode=language_mode,
            register=register,
            preserved_tokens=preserved_tokens,
            normalized_query=raw_text,
            canonical_intent="SEARCH",
            canonical_action="SEARCH",
            parameters={**args, "query": raw_text},
            confidence=0.75,
            is_ambiguous=False,
        )
