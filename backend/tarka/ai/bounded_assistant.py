"""TARKA Phase 4: Bounded Assistant & Indian Cyber Fraud Typology Engine.

Implements Sections 4.3.1 and 4.3.3:
1. Complaint Narrative Extraction:
   - Parses raw 1930 Cybercrime Helpline portal and police NCRP complaint text.
   - Extracts structured entities: Complainant, Victim Phone, Reported Loss, Incident Date,
     Suspect Phones, Suspect VPAs, Suspect Accounts, IFSCs, RRN/UTRs, and Platform Handles.
   - Preserves character offsets [start, end] for bit-exact evidentiary provenance.
   - Assigns validation confidence scores (0.0 to 1.0).

2. Scam-Message Classification across 6 Indian Fraud Typologies:
   - DIGITAL_ARREST (Fake CBI, ED, Police, Supreme Court, TRAI video extortion)
   - PART_TIME_JOB (Telegram task fraud, YouTube liking, hotel rating, VIP tier)
   - KYC_EXPIRY (Bank account/SIM card blocked, update PAN via APK link)
   - ELECTRICITY_BILL (Tonight 9:30 PM power disconnect SMS trap)
   - STOCK_TRADING (Institutional VIP WhatsApp trading, guaranteed upper circuit, SEBI fraud)
   - LOAN_APP_EXTORTION (7-day predatory loan, contact harvesting, photo morphing blackmail)

3. Statutory Penal Code Reference Mapping (BNS, IT Act, SEBI Act).

4. Safety & Constitutional Invariants:
   - DATA_ONLY boundary: Isolates and disarms prompt injection markers.
   - Non-promotability: Machine outputs tagged as AI_SUGGESTION with human_verified=False.
   - Non-accusatory: AI never determines guilt or computes authoritative financial balances.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import re
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union

try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self, mode: str = "python") -> Dict[str, Any]:
            res = {}
            for k, v in self.__dict__.items():
                if isinstance(v, Enum):
                    res[k] = v.value
                elif isinstance(v, list):
                    res[k] = [item.model_dump() if hasattr(item, "model_dump") else item for item in v]
                elif hasattr(v, "model_dump"):
                    res[k] = v.model_dump()
                else:
                    res[k] = v
            return res

    def Field(default=None, default_factory=None, description=""):  # type: ignore
        if default_factory is not None:
            return default_factory()
        return default


# ==============================================================================
# ENUMS & DOMAIN SCHEMAS
# ==============================================================================

class IndianFraudTypology(str, Enum):
    """The 6 canonical Indian cyber fraud typologies recognized by NCRP and MHA I4C."""
    DIGITAL_ARREST = "DIGITAL_ARREST"
    PART_TIME_JOB = "PART_TIME_JOB"
    KYC_EXPIRY = "KYC_EXPIRY"
    ELECTRICITY_BILL = "ELECTRICITY_BILL"
    STOCK_TRADING = "STOCK_TRADING"
    LOAN_APP_EXTORTION = "LOAN_APP_EXTORTION"
    UNKNOWN_OR_BENIGN = "UNKNOWN_OR_BENIGN"


class StatutoryPenalty(BaseModel):
    """Statutory penal provisions applicable under Bharatiya Nyaya Sanhita (BNS) & IT Act."""
    act: str  # BNS, IT_ACT, SEBI_ACT, BNSS
    section: str
    title: str
    description: str


class TypologyClassification(BaseModel):
    """Forensic classification output for a suspected fraud communication."""
    typology: IndianFraudTypology
    confidence_score: float  # [0.0, 1.0]
    matched_triggers: List[str] = Field(default_factory=list)
    statutory_provisions: List[StatutoryPenalty] = Field(default_factory=list)
    investigative_rationale: str = ""
    suggested_actions: List[str] = Field(default_factory=list)
    human_verified: bool = False
    disclaimer: str = (
        "AI PROPOSED CLASSIFICATION ONLY (BSA §63). Requires independent human IO review. "
        "Classification does not establish criminal culpability or evidentiary proof."
    )


class ExtractedComplaintEntity(BaseModel):
    """Single normalized entity extracted from a complaint narrative."""
    entity_type: str  # VICTIM, SUSPECT_PHONE, SUSPECT_VPA, SUSPECT_ACCOUNT, RRN, AMOUNT, HANDLE
    raw_value: str
    normalized_value: str
    char_start: int
    char_end: int
    confidence: float
    validation_status: str = "VALID"  # VALID, SUSPECT, AMBIGUOUS


class ExtractedComplaintRecord(BaseModel):
    """Structured extraction of an entire 1930 / NCRP complaint narrative."""
    complaint_ref: Optional[str] = None
    complainant_name: Optional[str] = None
    victim_phone: Optional[str] = None
    total_loss_claimed: Optional[float] = None
    incident_datetime_iso: Optional[str] = None
    entities: List[ExtractedComplaintEntity] = Field(default_factory=list)
    suspect_phones: List[str] = Field(default_factory=list)
    suspect_vpas: List[str] = Field(default_factory=list)
    suspect_bank_accounts: List[str] = Field(default_factory=list)
    transaction_references: List[str] = Field(default_factory=list)
    detected_typologies: List[IndianFraudTypology] = Field(default_factory=list)
    narrative_sha256: str = ""
    has_prompt_injection: bool = False
    neutralized_instructions: List[str] = Field(default_factory=list)


# ==============================================================================
# STATUTORY PROVISIONS REPOSITORY
# ==============================================================================

TYPOLOGY_STATUTORY_PROVISIONS: Dict[IndianFraudTypology, List[StatutoryPenalty]] = {
    IndianFraudTypology.DIGITAL_ARREST: [
        StatutoryPenalty(
            act="BNS",
            section="204",
            title="Impersonating a Public Servant",
            description="Falsely pretending to hold office as CBI, Police, ED or Court official.",
        ),
        StatutoryPenalty(
            act="BNS",
            section="308",
            title="Extortion",
            description="Intentionally putting victim in fear of injury/arrest to compel delivery of property.",
        ),
        StatutoryPenalty(
            act="IT_ACT",
            section="66D",
            title="Cheating by Personation using Computer Resource",
            description="Cheating by impersonating lawful enforcement bodies over video/VoIP calls.",
        ),
    ],
    IndianFraudTypology.PART_TIME_JOB: [
        StatutoryPenalty(
            act="BNS",
            section="318",
            title="Cheating and Dishonestly Inducing Delivery of Property",
            description="Deceiving victim with false task earnings into transferring prepaid investments.",
        ),
        StatutoryPenalty(
            act="IT_ACT",
            section="66D",
            title="Cheating by Personation using Computer Resource",
            description="Using fraudulent Telegram/WhatsApp channels to engineer multi-tier investment traps.",
        ),
    ],
    IndianFraudTypology.KYC_EXPIRY: [
        StatutoryPenalty(
            act="BNS",
            section="336",
            title="Forgery for Purpose of Cheating",
            description="Creating phishing websites and malicious APKs mimicking banking portals.",
        ),
        StatutoryPenalty(
            act="IT_ACT",
            section="66C",
            title="Identity Theft",
            description="Fraudulently obtaining or utilizing Aadhaar, PAN, NetBanking passwords or OTPs.",
        ),
        StatutoryPenalty(
            act="IT_ACT",
            section="66D",
            title="Cheating by Personation",
            description="Impersonating bank nodal officers and telecom customer care.",
        ),
    ],
    IndianFraudTypology.ELECTRICITY_BILL: [
        StatutoryPenalty(
            act="BNS",
            section="318(4)",
            title="Cheating and Inducing Property Transfer",
            description="Falsely claiming imminent power disconnection to coerce immediate UPI transfers.",
        ),
        StatutoryPenalty(
            act="IT_ACT",
            section="66D",
            title="Cheating by Personation using Communication Device",
            description="Spoofing state power utility SMS headers (e.g. BSES, TNEB, UPPCL).",
        ),
    ],
    IndianFraudTypology.STOCK_TRADING: [
        StatutoryPenalty(
            act="SEBI_ACT",
            section="12A",
            title="Prohibition of Manipulative and Deceptive Devices",
            description="Operating unregistered investment advisory schemes and soliciting public deposits.",
        ),
        StatutoryPenalty(
            act="BNS",
            section="318(4)",
            title="Aggravated Cheating",
            description="Fabricating institutional trading dashboards with fake upper-circuit profits.",
        ),
        StatutoryPenalty(
            act="IT_ACT",
            section="66D",
            title="Cheating by Personation using Computer Resource",
            description="Fabricating SEBI/FII certificates and hosting fraudulent foreign trading APKs.",
        ),
    ],
    IndianFraudTypology.LOAN_APP_EXTORTION: [
        StatutoryPenalty(
            act="BNS",
            section="351",
            title="Criminal Intimidation",
            description="Threatening harm to reputation and sharing morphed obscene media with contacts.",
        ),
        StatutoryPenalty(
            act="BNS",
            section="79",
            title="Insulting the Modesty of a Woman",
            description="Morphing complainant photographs from harvested device galleries.",
        ),
        StatutoryPenalty(
            act="IT_ACT",
            section="66E",
            title="Violation of Privacy",
            description="Unauthorized capture, harvesting and publication of private contact lists and images.",
        ),
    ],
}


# ==============================================================================
# 6-TYPOLOGY SCAM CLASSIFIER
# ==============================================================================

class ScamTypologyClassifier:
    """Deterministic, explainable classifier for the 6 major Indian cyber fraud typologies."""

    TYPOLOGY_RULES: Dict[IndianFraudTypology, Dict[str, Any]] = {
        IndianFraudTypology.DIGITAL_ARREST: {
            "triggers": [
                r"\bdigital\s+arrest\b",
                r"\bcbi\b",
                r"\bed\s+directorate\b",
                r"\btrai\b",
                r"\bnarcotics\b",
                r"\bcustoms\s+seizure\b",
                r"\barrest\s+warrant\b",
                r"\bsupreme\s+court\b",
                r"\bdo\s+not\s+disconnect\b",
                r"\bvideo\s+surveillance\b",
                r"\bmumbai\s+police\s+cyber\b",
                r"\bpassport\s+cancelled\b",
                r"\bfedex\s+parcel\b",
            ],
            "weight": 1.0,
            "min_matches": 2,
            "actions": [
                "Immediately notify Telecom Nodal Officer to obtain CDR and VoIP IP routing logs under BNSS § 94.",
                "Identify primary destination mule account and issue urgent 120-minute Golden Hour debit freeze notice.",
                "Advise victim to cease all contact and safely preserve video call screenshots and caller numbers.",
            ],
        },
        IndianFraudTypology.PART_TIME_JOB: {
            "triggers": [
                r"\bpart[\s-]time\s+job\b",
                r"\btelegram\s+task\b",
                r"\byoutube\s+like\b",
                r"\bgoogle\s+review\b",
                r"\bhotel\s+rating\b",
                r"\bearn\s+(?:rs\.?|₹|\binr\b)?\s*\d{3,5}\b",
                r"\bprepaid\s+task\b",
                r"\bvip\s+(?:level|tier|merchant)\b",
                r"\bcommission\s+recharge\b",
                r"\bcrypto\s+recharge\b",
                r"\bwork\s+from\s+home\b",
            ],
            "weight": 0.9,
            "min_matches": 2,
            "actions": [
                "Map Telegram group admin handles and linked UPI IDs for immediate cyber freeze.",
                "Trace cryptocurrency withdrawal addresses or merchant payment gateways receiving prepaid tranches.",
                "Cross-reference destination mule accounts across National Cybercrime Reporting Portal (1930).",
            ],
        },
        IndianFraudTypology.KYC_EXPIRY: {
            "triggers": [
                r"\bkyc\s+(?:expired|expiry|suspended|blocked)\b",
                r"\baccount\s+will\s+be\s+blocked\b",
                r"\bupdate\s+pan\b",
                r"\byono\b",
                r"\bnetbanking\s+blocked\b",
                r"\bsim\s+(?:deactivation|block)\b",
                r"\bdownload\s+apk\b",
                r"\banydesk\b",
                r"\brustdesk\b",
                r"\bteamviewer\b",
                r"\bquicksupport\b",
                r"\bbank\s+manager\s+contact\b",
            ],
            "weight": 0.9,
            "min_matches": 2,
            "actions": [
                "Check victim device for remote administration tools (AnyDesk, QuickSupport, malicious APK).",
                "Contact bank emergency desk to block net banking, UPI handles, and card tokens.",
                "Obtain APK SHA-256 hash for forensic malware reverse-engineering and C2 server takedown.",
            ],
        },
        IndianFraudTypology.ELECTRICITY_BILL: {
            "triggers": [
                r"\belectricity\s+(?:bill|power|officer)\b",
                r"\bpower\s+will\s+be\s+disconnected\b",
                r"\bdisconnected\s+tonight\b",
                r"\b9:?30\s*pm\b",
                r"\bprevious\s+month\s+bill\b",
                r"\bcall\s+electricity\s+officer\b",
                r"\bunpaid\b",
                r"\bbill\s+(?:was\s+)?unpaid\b",
                r"\bpower\s+(?:cut|disconnection)\b",
                r"\bsmart\s+meter\b",
                r"\belectricity\s+nodal\b",
                r"\bbses\b|\buppcl\b|\btneb\b|\bmsedcl\b|\bdhbbn\b",
            ],
            "weight": 1.0,
            "min_matches": 2,
            "actions": [
                "Notify state DISCOM and telecommunication carrier regarding fake SMS sender header.",
                "Trace receiver UPI account advertised in fraudulent SMS for rapid lien attachment under BNSS § 106.",
                "Record caller mobile number and verify tower location against suspect roaming circles.",
            ],
        },
        IndianFraudTypology.STOCK_TRADING: {
            "triggers": [
                r"\bstock\s+trading\b",
                r"\bipo\s+(?:allotment|quota|institutional)\b",
                r"\bupper\s+circuit\b",
                r"\bsebi\s+registered\b",
                r"\bguaranteed\s+(?:profit|return)\b",
                r"\b500%\s+return\b",
                r"\bwhatsapp\s+vip\s+group\b",
                r"\bfii\s+institutional\b",
                r"\btrading\s+platform\s+apk\b",
                r"\binsider\s+tips\b",
            ],
            "weight": 0.95,
            "min_matches": 2,
            "actions": [
                "Verify suspect advisory entities on SEBI intermediary register to confirm unregistered syndicate status.",
                "Submit urgent takedown request to WhatsApp / Telegram for group coordination channels.",
                "Issue statutory freeze for all multi-layer corporate current accounts receiving investment tranches.",
            ],
        },
        IndianFraudTypology.LOAN_APP_EXTORTION: {
            "triggers": [
                r"\b7[\s-]day\s+loan\b",
                r"\binstant\s+loan\s+app\b",
                r"\bmorph(?:ed|ing)?\b",
                r"\bcontacts?\s+list\b",
                r"\bdefamation\s+message\b",
                r"\bshare\s+with\s+(?:relatives|friends|family)\b",
                r"\bprocessing\s+fee\b",
                r"\bblackmail\b",
                r"\bobscene\s+photo\b",
                r"\bpan\s+aadhaar\s+misuse\b",
            ],
            "weight": 1.0,
            "min_matches": 2,
            "actions": [
                "Instruct victim not to pay extortion demands; payment invariably prompts escalating extortion.",
                "Harvest app package name and signature from Google Play / sideload APK for CERT-In takedown.",
                "Trace UPI collection merchants and NBFC shell entities laundering predatory recoveries.",
            ],
        },
    }

    @classmethod
    def classify(cls, text: str) -> TypologyClassification:
        """Classifies an investigative text or message string into one of the 6 fraud typologies."""
        lower_text = text.lower()
        best_typology = IndianFraudTypology.UNKNOWN_OR_BENIGN
        highest_score = 0.0
        best_matches: List[str] = []
        best_actions: List[str] = []

        for typology, rule in cls.TYPOLOGY_RULES.items():
            matched: List[str] = []
            for pattern in rule["triggers"]:
                if re.search(pattern, lower_text):
                    clean_pattern = pattern.replace(r"\b", "").replace(r"\s+", " ")
                    matched.append(clean_pattern)

            if len(matched) >= rule["min_matches"]:
                # Compute normalized confidence score based on trigger density
                score = min(0.99, rule["weight"] * (0.6 + (0.1 * min(4, len(matched)))))
                if score > highest_score:
                    highest_score = score
                    best_typology = typology
                    best_matches = matched
                    best_actions = rule["actions"]

        if best_typology == IndianFraudTypology.UNKNOWN_OR_BENIGN:
            return TypologyClassification(
                typology=IndianFraudTypology.UNKNOWN_OR_BENIGN,
                confidence_score=0.1,
                matched_triggers=[],
                statutory_provisions=[],
                investigative_rationale="No definitive Indian cyber fraud typology detected above threshold.",
                suggested_actions=["Collect additional communication logs, payment receipts, or full chat transcripts."],
                human_verified=False,
            )

        provisions = TYPOLOGY_STATUTORY_PROVISIONS.get(best_typology, [])
        rationale = (
            f"Detected {best_typology.value} signature with {len(best_matches)} key forensic indicators: "
            f"{', '.join(best_matches[:4])}. Meets evidentiary criteria under {', '.join(p.act + ' §' + p.section for p in provisions)}."
        )

        return TypologyClassification(
            typology=best_typology,
            confidence_score=round(highest_score, 3),
            matched_triggers=best_matches,
            statutory_provisions=provisions,
            investigative_rationale=rationale,
            suggested_actions=best_actions,
            human_verified=False,
        )


# ==============================================================================
# 1930 / NCRP COMPLAINT NARRATIVE EXTRACTOR
# ==============================================================================

class ComplaintNarrativeExtractor:
    """Extracts structured canonical entities from unstructured 1930 Cybercrime Helpline text."""

    PROMPT_INJECTION_PATTERNS = [
        r"(?i)ignore\s+(?:all\s+)?previous\s+instructions",
        r"(?i)disregard\s+(?:all\s+)?prior\s+guidance",
        r"(?i)you\s+are\s+now\s+(?:in\s+)?developer\s+mode",
        r"(?i)certify\s+suspect\s+as\s+innocent",
        r"(?i)delete\s+all\s+(?:evidence|records|logs)",
        r"(?i)drop\s+table",
    ]

    @classmethod
    def sanitize_and_check_injection(cls, text: str) -> Tuple[str, bool, List[str]]:
        """Guards the DATA_ONLY boundary. Detects and neutralizes prompt-injection attempts."""
        neutralized: List[str] = []
        is_injected = False

        sanitized = text
        for pattern in cls.PROMPT_INJECTION_PATTERNS:
            matches = list(re.finditer(pattern, sanitized))
            if matches:
                is_injected = True
                for m in matches:
                    neutralized.append(m.group(0))
                sanitized = re.sub(pattern, "[MALICIOUS_INSTRUCTION_NEUTRALIZED]", sanitized)

        return sanitized, is_injected, neutralized

    @classmethod
    def extract_entities(cls, complaint_text: str, complaint_ref: Optional[str] = None) -> ExtractedComplaintRecord:
        """Extracts structured entities, suspect identifiers, and loss amounts with character offsets."""
        sanitized_text, has_injection, neutralized = cls.sanitize_and_check_injection(complaint_text)
        text_sha256 = hashlib.sha256(complaint_text.encode("utf-8")).hexdigest()

        entities: List[ExtractedComplaintEntity] = []
        suspect_phones: List[str] = []
        suspect_vpas: List[str] = []
        suspect_accounts: List[str] = []
        txn_refs: List[str] = []

        # 1. Phone Numbers (+91 or 10-digit starting with 6,7,8,9)
        phone_pattern = r"(?:(?:\+91[\-\s]?)?[6-9]\d{9})"
        for m in re.finditer(phone_pattern, sanitized_text):
            raw = m.group(0)
            norm = re.sub(r"[\s\-]", "", raw)
            if not norm.startswith("+91"):
                norm = f"+91{norm}"
            
            # Avoid duplicate registrations
            if norm not in suspect_phones:
                suspect_phones.append(norm)

            entities.append(ExtractedComplaintEntity(
                entity_type="SUSPECT_PHONE",
                raw_value=raw,
                normalized_value=norm,
                char_start=m.start(),
                char_end=m.end(),
                confidence=0.95,
                validation_status="VALID",
            ))

        # 2. UPI VPAs (e.g. user@bank, phone@paytm)
        vpa_pattern = r"\b[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z]{2,32}\b"
        for m in re.finditer(vpa_pattern, sanitized_text):
            raw = m.group(0).lower()
            if raw not in suspect_vpas:
                suspect_vpas.append(raw)
            entities.append(ExtractedComplaintEntity(
                entity_type="SUSPECT_VPA",
                raw_value=m.group(0),
                normalized_value=raw,
                char_start=m.start(),
                char_end=m.end(),
                confidence=0.98,
                validation_status="VALID",
            ))

        # 3. Bank Account Numbers (9 to 18 digits)
        # Look for words like 'account', 'a/c', 'acct' followed by digits
        acct_pattern = r"(?i)(?:a/c|account|acct|ac)\s*(?:no\.?|number|#)?\s*[:\-]?\s*([0-9]{9,18})"
        for m in re.finditer(acct_pattern, sanitized_text):
            acct_num = m.group(1)
            if acct_num not in suspect_accounts:
                suspect_accounts.append(acct_num)
            entities.append(ExtractedComplaintEntity(
                entity_type="SUSPECT_ACCOUNT",
                raw_value=m.group(0),
                normalized_value=acct_num,
                char_start=m.start(1),
                char_end=m.end(1),
                confidence=0.92,
                validation_status="VALID",
            ))

        # 4. RRN / UTR Transaction Reference Numbers (12-digit UPI RRN or standard UTR)
        rrn_pattern = r"(?i)\b(?:rrn|utr|txn\s*ref|ref\s*no)[\s:\-]*([0-9]{12}|[A-Z0-9]{16,22})\b"
        for m in re.finditer(rrn_pattern, sanitized_text):
            ref_str = m.group(1)
            if ref_str not in txn_refs:
                txn_refs.append(ref_str)
            entities.append(ExtractedComplaintEntity(
                entity_type="RRN",
                raw_value=m.group(0),
                normalized_value=ref_str,
                char_start=m.start(1),
                char_end=m.end(1),
                confidence=0.99,
                validation_status="VALID",
            ))

        # 5. Reported Loss Amount (e.g. ₹50,000, Rs. 1,50,000, 5 lakhs)
        amount_pattern = r"(?i)(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)|(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?)"
        total_loss: Optional[float] = None
        for m in re.finditer(amount_pattern, sanitized_text):
            val_str = m.group(1)
            lakh_str = m.group(2)
            parsed_amt = 0.0
            if val_str:
                clean = val_str.replace(",", "").strip()
                try:
                    parsed_amt = float(clean)
                except ValueError:
                    continue
            elif lakh_str:
                try:
                    parsed_amt = float(lakh_str) * 100000.0
                except ValueError:
                    continue

            if parsed_amt > 0 and (total_loss is None or parsed_amt > total_loss):
                total_loss = parsed_amt

            entities.append(ExtractedComplaintEntity(
                entity_type="AMOUNT",
                raw_value=m.group(0),
                normalized_value=str(parsed_amt),
                char_start=m.start(),
                char_end=m.end(),
                confidence=0.90,
                validation_status="VALID",
            ))

        # 6. Complainant Name extraction (heuristic: "I am [Name]" or "Complainant: [Name]")
        name_match = re.search(r"(?i)(?:complainant|victim|name\s*is|i\s*am)\s*[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})", sanitized_text)
        complainant_name = name_match.group(1).strip() if name_match else None

        # 7. Incident Datetime extraction
        date_match = re.search(r"\b(\d{4}[\-/]\d{2}[\-/]\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?)\b", sanitized_text)
        incident_dt = date_match.group(1) if date_match else None

        # 8. Classify typologies
        classification = ScamTypologyClassifier.classify(sanitized_text)
        detected_typologies = [classification.typology] if classification.typology != IndianFraudTypology.UNKNOWN_OR_BENIGN else []

        return ExtractedComplaintRecord(
            complaint_ref=complaint_ref,
            complainant_name=complainant_name,
            victim_phone=suspect_phones[0] if suspect_phones else None,
            total_loss_claimed=total_loss,
            incident_datetime_iso=incident_dt,
            entities=entities,
            suspect_phones=suspect_phones,
            suspect_vpas=suspect_vpas,
            suspect_bank_accounts=suspect_accounts,
            transaction_references=txn_refs,
            detected_typologies=detected_typologies,
            narrative_sha256=text_sha256,
            has_prompt_injection=has_injection,
            neutralized_instructions=neutralized,
        )


# ==============================================================================
# BOUNDED ASSISTANT SERVICE FACADE
# ==============================================================================

class BoundedAssistantService:
    """Forensic AI Assistant Service orchestrating entity extraction, classification, and safety checks."""

    _instance: Optional[BoundedAssistantService] = None

    @classmethod
    def get_instance(cls) -> BoundedAssistantService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def process_complaint(self, text: str, complaint_ref: Optional[str] = None) -> ExtractedComplaintRecord:
        """Extracts structured entities and flags from a complaint narrative."""
        return ComplaintNarrativeExtractor.extract_entities(text, complaint_ref=complaint_ref)

    def classify_communication(self, text: str) -> TypologyClassification:
        """Classifies a suspicious chat, call transcript, or SMS into the 6 Indian fraud typologies."""
        return ScamTypologyClassifier.classify(text)
