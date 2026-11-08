"""Deterministic Entity Resolution & Link Assumption Generator for TARKA.

Hard Rules:
1. Deterministic-ID resolution ONLY for automatic linking (exact normalized MSISDN, IMEI, UPI VPA, Transaction Reference).
2. Fuzzy / partial matches (names, unformatted strings) are never automatically merged;
   they are emitted as flagged candidate items requiring explicit human verification.
3. Every entity link is generated as a labeled assumption literal that can appear
   inside Z3 conflict cores (MUS), allowing investigators to test whether an identity
   assumption is the root cause of an apparent physical contradiction.
4. Hard Veto Engine: Strong identifier conflicts (e.g. conflicting phone numbers or VPAs)
   produce an immediate hard veto, marking match status as 'rejected' and setting review state to 'review_required'.
5. Non-accusatory vocabulary: Descriptions explain technical criteria objectively.
"""

from __future__ import annotations

import ipaddress
import re
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple
from pydantic import BaseModel, Field

from tarka.core.models import Fact


class CandidateFuzzyMatch(BaseModel):
    """Flagged ambiguous entity match requiring explicit investigator review."""
    field_name: str
    observed_value: str
    candidate_entity_id: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    reason: str


class EntityResolutionResult(BaseModel):
    """Outcome of entity resolution across facts."""
    entity_clusters: Dict[str, Set[str]] = Field(
        description="Canonical Entity ID -> Set of associated Device/Account IDs"
    )
    fact_to_entity: Dict[str, str] = Field(
        description="Fact ID -> Resolved Canonical Entity ID"
    )
    entity_link_assumptions: Dict[str, str] = Field(
        description="Assumption name (e.g. 'assump_entity_F1_E1') -> Description"
    )
    flagged_candidates: List[CandidateFuzzyMatch] = Field(
        default_factory=list,
        description="Ambiguous fuzzy matches flagged for human forensic triage"
    )


class MatchStatus(str, Enum):
    """Deterministic entity match classification."""
    CONFIRMED = "confirmed"
    STRONGLY_SUPPORTED = "strongly_supported"
    PROPOSED = "proposed"
    REJECTED = "rejected"


class ExaminerReviewState(str, Enum):
    """Audit status of an entity match proposal."""
    UNREVIEWED = "unreviewed"
    PROPOSED = "proposed"
    CONFIRMED = "confirmed"
    REJECTED = "rejected"
    REVIEW_REQUIRED = "review_required"


class EntityMatch(BaseModel):
    """Explainable deterministic match or veto proposal between two evidence items."""
    match_id: str = Field(description="Unique deterministic identifier for this match comparison")
    match_type: str = Field(description="Identifier type: PHONE_NUMBER, UPI_VPA, TXN_REF, ACCOUNT_SUFFIX, IMEI, or PERSON_NAME")
    normalized_values_compared: Dict[str, Any] = Field(
        description="Normalized key-value pairs evaluated (e.g. {'item_a': '+91...', 'item_b': '+91...'}"
    )
    evidence_ids: List[str] = Field(description="List of Evidence DNA IDs linked by this match")
    artifact_ids: List[str] = Field(description="List of parent Artifact IDs")
    deterministic_rule_applied: str = Field(description="Formal rule code (e.g. EXACT_PHONE_MATCH, WEAK_NAME_MATCH, HARD_VETO_PHONE_CONFLICT)")
    match_status: MatchStatus = Field(description="Outcome status: confirmed, strongly_supported, proposed, or rejected")
    conflict_or_veto_reason: Optional[str] = Field(
        default=None,
        description="Technical conflict or veto reason if rejected or requiring review",
    )
    examiner_review_state: ExaminerReviewState = Field(
        default=ExaminerReviewState.UNREVIEWED,
        description="Human audit state",
    )
    explanation: str = Field(description="Objective, non-accusatory explanation of match evidence")


class EntityProfile(BaseModel):
    """Resolved entity cluster grouping corroborated identifiers."""
    entity_id: str = Field(description="Canonical entity handle (e.g. ENTITY-PHONE-9876543210 or ENTITY-USER-A)")
    display_name: str = Field(default="", description="Human-readable label for investigator view")
    identifiers: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Normalized identifiers grouped by type (phone, vpa, account_suffix, rrn, imei, name)",
    )
    associated_evidence_ids: List[str] = Field(default_factory=list, description="Linked Evidence DNA IDs")
    associated_artifact_ids: List[str] = Field(default_factory=list, description="Linked Artifact IDs")
    has_unresolved_conflicts: bool = Field(default=False, description="True if this cluster contains conflicting signals")
    review_state: ExaminerReviewState = Field(
        default=ExaminerReviewState.UNREVIEWED,
        description="Review state for entity grouping",
    )

    def __init__(
        self,
        entity_id: str,
        display_name: Optional[str] = None,
        canonical_name: Optional[str] = None,
        normalized_phone: Optional[str] = None,
        normalized_upi_vpa: Optional[str] = None,
        normalized_device_imei: Optional[str] = None,
        normalized_account_number: Optional[str] = None,
        identifiers: Optional[Dict[str, List[str]]] = None,
        **kwargs: Any,
    ) -> None:
        ident_dict = dict(identifiers or {})
        if canonical_name and "name" not in ident_dict:
            ident_dict["name"] = [canonical_name]
        if normalized_phone and "phone" not in ident_dict:
            ident_dict["phone"] = [normalized_phone]
        if normalized_upi_vpa and "vpa" not in ident_dict:
            ident_dict["vpa"] = [normalized_upi_vpa]
        if normalized_device_imei and "imei" not in ident_dict:
            ident_dict["imei"] = [normalized_device_imei]
        if normalized_account_number and "account_number" not in ident_dict:
            ident_dict["account_number"] = [normalized_account_number]

        disp = display_name or canonical_name or (ident_dict.get("phone", [None])[0]) or (ident_dict.get("vpa", [None])[0]) or entity_id

        super().__init__(
            entity_id=entity_id,
            display_name=disp,
            identifiers=ident_dict,
            **kwargs,
        )

    @property
    def canonical_name(self) -> Optional[str]:
        names = self.identifiers.get("name", [])
        return names[0] if names else self.display_name

    @property
    def normalized_phone(self) -> Optional[str]:
        phones = self.identifiers.get("phone", [])
        return phones[0] if phones else None

    @property
    def normalized_upi_vpa(self) -> Optional[str]:
        vpas = self.identifiers.get("vpa", [])
        return vpas[0] if vpas else None

    @property
    def normalized_device_imei(self) -> Optional[str]:
        imeis = self.identifiers.get("imei", [])
        return imeis[0] if imeis else None

    @property
    def normalized_account_number(self) -> Optional[str]:
        accs = self.identifiers.get("account_number", []) or self.identifiers.get("account_suffix", [])
        return accs[0] if accs else None



def normalize_msisdn(phone: str) -> Optional[str]:
    """Normalizes Indian phone numbers to canonical +91XXXXXXXXXX."""
    cleaned = re.sub(r"[^\d+]", "", phone.strip())
    if cleaned.startswith("+91") and len(cleaned) == 13:
        return cleaned
    if cleaned.startswith("91") and len(cleaned) == 12:
        return f"+{cleaned}"
    if len(cleaned) == 10 and cleaned[0] in "6789":
        return f"+91{cleaned}"
    if cleaned.startswith("0") and len(cleaned) == 11 and cleaned[1] in "6789":
        return f"+91{cleaned[1:]}"
    return None


def normalize_vpa(vpa: str) -> Optional[str]:
    """Normalizes UPI Virtual Payment Address (e.g., user@oksbi)."""
    cleaned = vpa.strip().lower()
    if "@" in cleaned and len(cleaned) >= 5:
        return cleaned
    return None


def normalize_imei(imei: str) -> Optional[str]:
    """Validates and normalizes 15-digit IMEI."""
    digits = re.sub(r"\D", "", imei.strip())
    if len(digits) == 15:
        return digits
    return None


def normalize_account_suffix(acc: str) -> Optional[str]:
    """Extracts and normalizes masked account number suffix (last 4 digits)."""
    cleaned = acc.strip().upper()
    digits = re.findall(r"\d+", cleaned)
    if digits:
        last_block = digits[-1]
        if len(last_block) >= 4:
            return last_block[-4:]
        elif len(last_block) >= 2:
            return last_block
    return None


def normalize_txn_ref(ref: str) -> Optional[str]:
    """Normalizes transaction reference, RRN, or invoice code."""
    cleaned = re.sub(r"[\s\-\_]", "", ref.strip().upper())
    if len(cleaned) >= 4:
        return cleaned
    return None


def normalize_person_name(name: str) -> Optional[str]:
    """Normalizes person or contact name to lowercase alphanumeric tokens."""
    cleaned = re.sub(r"[^\w\s]", "", name.strip().lower())
    cleaned = re.sub(r"\s+", " ", cleaned)
    if len(cleaned) >= 2 and cleaned not in ["system", "unknown", "user", "admin"]:
        return cleaned
    return None


def normalize_ip(ip_str: str) -> Optional[Dict[str, Any]]:
    """Normalizes IPv4 or IPv6 string, strips ports, and identifies CGNAT/private ranges.

    Enforces DoT License Clause 39.20:
    Public and CGNAT gateway IPs require dynamic NAT port translation records.
    Constitutional Invariant: Never attribute an individual from an IP address alone.
    """
    cleaned = ip_str.strip()
    port: Optional[int] = None

    # Handle IPv4 with port: 103.21.144.92:44321
    if ":" in cleaned and not cleaned.startswith("[") and cleaned.count(":") == 1:
        ip_part, port_part = cleaned.split(":")
        try:
            port = int(port_part)
            cleaned = ip_part
        except ValueError:
            pass
    # Handle IPv6 with port: [2405:201:...]:8080
    elif cleaned.startswith("[") and "]:" in cleaned:
        ip_part, port_part = cleaned.split("]:")
        cleaned = ip_part.lstrip("[")
        try:
            port = int(port_part)
        except ValueError:
            pass

    try:
        ip_obj = ipaddress.ip_address(cleaned)
    except ValueError:
        return None

    cgnat_network = ipaddress.ip_network("100.64.0.0/10")
    is_cgnat = ip_obj in cgnat_network if ip_obj.version == 4 else False
    is_private = ip_obj.is_private

    statutory_caution: Optional[str] = None
    if is_cgnat:
        statutory_caution = (
            "RFC 6598 CGNAT Shared Pool IP (100.64.0.0/10). "
            "DoT Clause 39.20 mandates source port allocation records to correlate subscriber session. "
            "Individual attribution prohibited without verified ISP NAT IPDR translation."
        )
    elif ip_obj.is_global and not port:
        statutory_caution = (
            "Public Gateway IP without source port translation record. "
            "DoT Clause 39.20 mandates external port binding for multi-tenant gateway disambiguation."
        )

    return {
        "canonical_ip": str(ip_obj),
        "port": port,
        "ip_version": ip_obj.version,
        "is_cgnat": is_cgnat,
        "is_private": is_private,
        "is_public_gateway": ip_obj.is_global,
        "requires_port_translation": is_cgnat or (ip_obj.is_global and port is None),
        "statutory_caution": statutory_caution,
    }


def normalize_bank_account(account_str: str, ifsc: Optional[str] = None) -> Optional[Dict[str, str]]:
    """Normalizes Indian core banking account numbers and IFSC.

    Validates account length (9-18 digits for Indian CBS),
    validates IFSC format (4 letters, '0', 6 alphanumeric characters),
    and generates canonical composite keys and masked representations.
    """
    cleaned_acc = re.sub(r"[^\d]", "", account_str.strip())
    if not (9 <= len(cleaned_acc) <= 18):
        return None

    canonical_ifsc: Optional[str] = None
    bank_code: Optional[str] = None
    if ifsc:
        cleaned_ifsc = re.sub(r"[\s\-]", "", ifsc.strip().upper())
        if re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", cleaned_ifsc):
            canonical_ifsc = cleaned_ifsc
            bank_code = cleaned_ifsc[:4]

    suffix_last4 = cleaned_acc[-4:]
    masked_acc = f"**** **** {suffix_last4}"
    composite_key = f"{canonical_ifsc}:{cleaned_acc}" if canonical_ifsc else cleaned_acc

    return {
        "account_number": cleaned_acc,
        "ifsc": canonical_ifsc,
        "bank_code": bank_code,
        "composite_key": composite_key,
        "masked_account": masked_acc,
        "suffix_last4": suffix_last4,
    }


def normalize_upi_id(vpa_str: str) -> Optional[Dict[str, str]]:
    """Normalizes and validates UPI Virtual Payment Address (VPA).

    Extracts handle username and PSP domain (e.g. oksbi, okhdfcbank, paytm, ybl, axl, ibl).
    Validates character bounds (2-256 chars, allowed symbols: . _ -).
    """
    cleaned = vpa_str.strip().lower()
    if "@" not in cleaned:
        return None

    parts = cleaned.split("@", 1)
    username, psp_handle = parts[0], parts[1]

    if not re.match(r"^[a-z0-9.\-_]{2,256}$", username):
        return None
    if not re.match(r"^[a-z0-9]{2,64}$", psp_handle):
        return None

    canonical_vpa = f"{username}@{psp_handle}"
    return {
        "canonical_vpa": canonical_vpa,
        "username": username,
        "psp_handle": psp_handle,
    }


class HardVetoEngine:
    """Enforces deterministic hard vetoes when conflicting statutory or identity signals coexist."""

    @staticmethod
    def evaluate_veto(
        id_type: str,
        val_a: Optional[str],
        val_b: Optional[str],
    ) -> Optional[Tuple[str, str]]:
        """Returns (rule_code, reason) if a hard conflict exists, else None."""
        if not val_a or not val_b:
            return None
        if val_a != val_b:
            return (
                f"HARD_VETO_{id_type}_MISMATCH",
                f"Hard identifier conflict: records carry conflicting {id_type} values ('{val_a}' vs '{val_b}'). Automatic merge rejected.",
            )
        return None


class EntityResolver:
    """Performs deterministic identity linking, hard veto checks, and generates assumption literals."""

    def __init__(self) -> None:
        self.known_entity_anchors: Dict[str, str] = {}  # Normalized ID -> Entity ID
        self.entity_clusters: Dict[str, Set[str]] = {}  # Entity ID -> Set of IDs
        self.veto_engine = HardVetoEngine()

    def register_anchor(self, entity_id: str, identifier: str) -> None:
        """Explicitly associates an identifier with an entity cluster."""
        norm_id = (
            normalize_msisdn(identifier)
            or normalize_vpa(identifier)
            or normalize_imei(identifier)
            or normalize_txn_ref(identifier)
            or identifier.strip()
        )
        self.known_entity_anchors[norm_id] = entity_id
        if entity_id not in self.entity_clusters:
            self.entity_clusters[entity_id] = set()
        self.entity_clusters[entity_id].add(norm_id)

    def resolve_facts(self, facts: List[Fact]) -> EntityResolutionResult:
        """Resolves facts to entity clusters using deterministic rules only.

        Emits labeled assumption literals for every fact-to-entity link,
        so that assumptions can participate in Z3 conflict core enumeration.
        """
        fact_to_entity: Dict[str, str] = {}
        assumptions: Dict[str, str] = {}
        flagged: List[CandidateFuzzyMatch] = []

        for fact in facts:
            resolved_entity: Optional[str] = None

            # 1. Check if fact already carries explicit entity_refs
            if fact.entity_refs:
                resolved_entity = fact.entity_refs[0]

            # 2. Check device_id exact anchor match
            if not resolved_entity:
                norm_dev = (
                    normalize_msisdn(fact.device_id)
                    or normalize_vpa(fact.device_id)
                    or normalize_imei(fact.device_id)
                    or normalize_txn_ref(fact.device_id)
                    or fact.device_id.strip()
                )
                if norm_dev in self.known_entity_anchors:
                    resolved_entity = self.known_entity_anchors[norm_dev]

            # 3. Check raw_payload deterministic fields (calling_num, rrn, etc.)
            if not resolved_entity and fact.raw_payload:
                for k, v in fact.raw_payload.items():
                    if isinstance(v, str):
                        norm_v = (
                            normalize_msisdn(v)
                            or normalize_vpa(v)
                            or normalize_imei(v)
                            or normalize_txn_ref(v)
                        )
                        if norm_v and norm_v in self.known_entity_anchors:
                            resolved_entity = self.known_entity_anchors[norm_v]
                            break

            # 4. Check for fuzzy / candidate name matches in payload (do NOT automatically link)
            if fact.raw_payload:
                for k, v in fact.raw_payload.items():
                    if isinstance(v, str) and ("suspect" in v.lower() or "associate" in v.lower()):
                        if not resolved_entity:
                            flagged.append(
                                CandidateFuzzyMatch(
                                    field_name=k,
                                    observed_value=v,
                                    candidate_entity_id="ENTITY_SUSPECT_A",
                                    confidence_score=0.70,
                                    reason="Partial text mention in payload; requires corroborating subscriber registration",
                                )
                            )

            # Assign fallback anonymous entity if unresolved
            if not resolved_entity:
                resolved_entity = f"ANON_ENTITY_{fact.device_id}"

            fact_to_entity[fact.id] = resolved_entity

            # Create labeled assumption literal for this entity link
            assump_key = f"assump_entity_{fact.id}_{resolved_entity}"
            assumptions[assump_key] = (
                f"Assumption: Fact {fact.id} is bound to personal identity {resolved_entity}"
            )

        return EntityResolutionResult(
            entity_clusters=self.entity_clusters,
            fact_to_entity=fact_to_entity,
            entity_link_assumptions=assumptions,
            flagged_candidates=flagged,
        )

    def match_entities_explainable(
        self,
        records: List[Dict[str, Any]],
    ) -> Tuple[List[EntityProfile], List[EntityMatch]]:
        """Performs pairwise deterministic matching across extracted records.

        Emits confirmed, strongly supported, proposed (weak name), and rejected (hard veto) matches.
        """
        matches: List[EntityMatch] = []
        profiles_by_id: Dict[str, EntityProfile] = {}

        # First pass: Build individual entity profiles
        for idx, rec in enumerate(records, start=1):
            ent_id = rec.get("entity_id") or f"ENT-{idx:03d}"
            raw_phone = rec.get("phone") or rec.get("msisdn")
            raw_vpa = rec.get("vpa")
            raw_rrn = rec.get("rrn") or rec.get("txn_ref")
            raw_acc = rec.get("account") or rec.get("account_suffix")
            raw_imei = rec.get("imei")
            raw_name = rec.get("name") or rec.get("sender")

            norm_phone = normalize_msisdn(raw_phone) if raw_phone else None
            norm_vpa = normalize_vpa(raw_vpa) if raw_vpa else None
            norm_rrn = normalize_txn_ref(raw_rrn) if raw_rrn else None
            norm_acc = normalize_account_suffix(raw_acc) if raw_acc else None
            norm_imei = normalize_imei(raw_imei) if raw_imei else None
            norm_name = normalize_person_name(raw_name) if raw_name else None

            ident_map: Dict[str, List[str]] = {}
            if norm_phone:
                ident_map["phone"] = [norm_phone]
            if norm_vpa:
                ident_map["vpa"] = [norm_vpa]
            if norm_rrn:
                ident_map["rrn"] = [norm_rrn]
            if norm_acc:
                ident_map["account_suffix"] = [norm_acc]
            if norm_imei:
                ident_map["imei"] = [norm_imei]
            if norm_name:
                ident_map["name"] = [norm_name]

            disp_name = (
                norm_name.title() if norm_name
                else (norm_phone or norm_vpa or ent_id)
            )

            profile = EntityProfile(
                entity_id=ent_id,
                display_name=disp_name,
                identifiers=ident_map,
                associated_evidence_ids=[rec.get("evidence_id", f"DNA-{idx}")],
                associated_artifact_ids=[rec.get("artifact_id", "ART-001")],
            )
            profiles_by_id[ent_id] = profile

        # Second pass: Pairwise deterministic matching and hard veto evaluation
        ent_keys = list(profiles_by_id.keys())
        match_counter = 1

        for i in range(len(ent_keys)):
            for j in range(i + 1, len(ent_keys)):
                k1, k2 = ent_keys[i], ent_keys[j]
                p1, p2 = profiles_by_id[k1], profiles_by_id[k2]

                p1_phone = p1.identifiers.get("phone", [None])[0]
                p2_phone = p2.identifiers.get("phone", [None])[0]
                p1_vpa = p1.identifiers.get("vpa", [None])[0]
                p2_vpa = p2.identifiers.get("vpa", [None])[0]
                p1_name = p1.identifiers.get("name", [None])[0]
                p2_name = p2.identifiers.get("name", [None])[0]
                p1_rrn = p1.identifiers.get("rrn", [None])[0]
                p2_rrn = p2.identifiers.get("rrn", [None])[0]
                p1_acc = p1.identifiers.get("account_suffix", [None])[0]
                p2_acc = p2.identifiers.get("account_suffix", [None])[0]
                p1_imei = p1.identifiers.get("imei", [None])[0]
                p2_imei = p2.identifiers.get("imei", [None])[0]

                # Check Hard Vetoes first:
                # If they share a weak signal (name) or claim same context but have conflicting strong IDs
                has_shared_name = (p1_name and p2_name and p1_name == p2_name)
                phone_conflict = self.veto_engine.evaluate_veto("PHONE", p1_phone, p2_phone)
                vpa_conflict = self.veto_engine.evaluate_veto("VPA", p1_vpa, p2_vpa)

                if has_shared_name and (phone_conflict or vpa_conflict):
                    rule_code, reason = phone_conflict or vpa_conflict  # type: ignore
                    match = EntityMatch(
                        match_id=f"MATCH-{match_counter:04d}",
                        match_type="PHONE_OR_VPA_CONFLICT",
                        normalized_values_compared={
                            "name": p1_name,
                            "phone_a": p1_phone,
                            "phone_b": p2_phone,
                            "vpa_a": p1_vpa,
                            "vpa_b": p2_vpa,
                        },
                        evidence_ids=p1.associated_evidence_ids + p2.associated_evidence_ids,
                        artifact_ids=list(set(p1.associated_artifact_ids + p2.associated_artifact_ids)),
                        deterministic_rule_applied=rule_code,
                        match_status=MatchStatus.REJECTED,
                        conflict_or_veto_reason=reason,
                        examiner_review_state=ExaminerReviewState.REVIEW_REQUIRED,
                        explanation=f"Hard veto: Matching name token '{p1_name}' rejected due to conflicting strong identifiers ({reason}).",
                    )
                    matches.append(match)
                    match_counter += 1
                    p1.has_unresolved_conflicts = True
                    p2.has_unresolved_conflicts = True
                    continue

                # 1. Exact Phone Match
                if p1_phone and p2_phone and p1_phone == p2_phone:
                    matches.append(
                        EntityMatch(
                            match_id=f"MATCH-{match_counter:04d}",
                            match_type="PHONE_NUMBER",
                            normalized_values_compared={"phone_a": p1_phone, "phone_b": p2_phone},
                            evidence_ids=p1.associated_evidence_ids + p2.associated_evidence_ids,
                            artifact_ids=list(set(p1.associated_artifact_ids + p2.associated_artifact_ids)),
                            deterministic_rule_applied="EXACT_PHONE_MATCH",
                            match_status=MatchStatus.CONFIRMED,
                            examiner_review_state=ExaminerReviewState.CONFIRMED,
                            explanation=f"Exact normalized phone match ({p1_phone}) corroborates common subscriber anchor.",
                        )
                    )
                    match_counter += 1

                # 2. Exact VPA Match
                if p1_vpa and p2_vpa and p1_vpa == p2_vpa:
                    matches.append(
                        EntityMatch(
                            match_id=f"MATCH-{match_counter:04d}",
                            match_type="UPI_VPA",
                            normalized_values_compared={"vpa_a": p1_vpa, "vpa_b": p2_vpa},
                            evidence_ids=p1.associated_evidence_ids + p2.associated_evidence_ids,
                            artifact_ids=list(set(p1.associated_artifact_ids + p2.associated_artifact_ids)),
                            deterministic_rule_applied="EXACT_VPA_MATCH",
                            match_status=MatchStatus.CONFIRMED,
                            examiner_review_state=ExaminerReviewState.CONFIRMED,
                            explanation=f"Exact UPI Virtual Payment Address match ({p1_vpa}) links payment requests to transaction.",
                        )
                    )
                    match_counter += 1

                # 3. Exact Transaction Reference Match
                if p1_rrn and p2_rrn and p1_rrn == p2_rrn:
                    matches.append(
                        EntityMatch(
                            match_id=f"MATCH-{match_counter:04d}",
                            match_type="TXN_REF",
                            normalized_values_compared={"rrn_a": p1_rrn, "rrn_b": p2_rrn},
                            evidence_ids=p1.associated_evidence_ids + p2.associated_evidence_ids,
                            artifact_ids=list(set(p1.associated_artifact_ids + p2.associated_artifact_ids)),
                            deterministic_rule_applied="EXACT_TXN_REF_MATCH",
                            match_status=MatchStatus.CONFIRMED,
                            examiner_review_state=ExaminerReviewState.CONFIRMED,
                            explanation=f"Exact banking transaction reference match (RRN: {p1_rrn}) links records.",
                        )
                    )
                    match_counter += 1

                # 4. Exact IMEI Match
                if p1_imei and p2_imei and p1_imei == p2_imei:
                    matches.append(
                        EntityMatch(
                            match_id=f"MATCH-{match_counter:04d}",
                            match_type="IMEI",
                            normalized_values_compared={"imei_a": p1_imei, "imei_b": p2_imei},
                            evidence_ids=p1.associated_evidence_ids + p2.associated_evidence_ids,
                            artifact_ids=list(set(p1.associated_artifact_ids + p2.associated_artifact_ids)),
                            deterministic_rule_applied="EXACT_IMEI_MATCH",
                            match_status=MatchStatus.CONFIRMED,
                            examiner_review_state=ExaminerReviewState.CONFIRMED,
                            explanation=f"Exact hardware IMEI match ({p1_imei}) links device presence.",
                        )
                    )
                    match_counter += 1

                # 5. Masked Account Suffix Match (Strongly Supported)
                if p1_acc and p2_acc and p1_acc == p2_acc:
                    matches.append(
                        EntityMatch(
                            match_id=f"MATCH-{match_counter:04d}",
                            match_type="ACCOUNT_SUFFIX",
                            normalized_values_compared={"acc_suffix_a": p1_acc, "acc_suffix_b": p2_acc},
                            evidence_ids=p1.associated_evidence_ids + p2.associated_evidence_ids,
                            artifact_ids=list(set(p1.associated_artifact_ids + p2.associated_artifact_ids)),
                            deterministic_rule_applied="MATCHING_ACCOUNT_SUFFIX",
                            match_status=MatchStatus.STRONGLY_SUPPORTED,
                            examiner_review_state=ExaminerReviewState.UNREVIEWED,
                            explanation=f"Matching bank account suffix (...{p1_acc}) provides strong corroboration of shared banking anchor.",
                        )
                    )
                    match_counter += 1

                # 6. Weak Person Name Match (Requires Review)
                if has_shared_name and not (p1_phone and p2_phone and p1_phone == p2_phone):
                    matches.append(
                        EntityMatch(
                            match_id=f"MATCH-{match_counter:04d}",
                            match_type="PERSON_NAME",
                            normalized_values_compared={"name_a": p1_name, "name_b": p2_name},
                            evidence_ids=p1.associated_evidence_ids + p2.associated_evidence_ids,
                            artifact_ids=list(set(p1.associated_artifact_ids + p2.associated_artifact_ids)),
                            deterministic_rule_applied="WEAK_NAME_MATCH",
                            match_status=MatchStatus.PROPOSED,
                            conflict_or_veto_reason="Person name is a weak non-unique signal; requires independent subscriber or KYC corroboration.",
                            examiner_review_state=ExaminerReviewState.REVIEW_REQUIRED,
                            explanation=f"Weak name match ('{p1_name}'). Do not automatically merge without corroborating MSISDN or VPA.",
                        )
                    )
                    match_counter += 1

        return list(profiles_by_id.values()), matches


# ==============================================================================
# SECTION 2.1: IDENTITY CONFLICT DETECTION & INVESTIGATOR DECISION ENGINE
# ==============================================================================

class IdentityConflictType(str, Enum):
    """Categorization of identity contradictions, ambiguities, and data completeness gaps."""
    NAME_MISMATCH = "NAME_MISMATCH"
    DUPLICATE_ACCOUNT = "DUPLICATE_ACCOUNT"
    ORPHAN_VPA = "ORPHAN_VPA"
    SHARED_CGNAT_AMBIGUITY = "SHARED_CGNAT_AMBIGUITY"
    SHARED_DEVICE_AMBIGUITY = "SHARED_DEVICE_AMBIGUITY"
    TIME_WINDOW_DISJOINT = "TIME_WINDOW_DISJOINT"
    INCOMPLETE_IDENTIFIERS = "INCOMPLETE_IDENTIFIERS"


class IdentityConflict(BaseModel):
    """Forensic record of detected conflicting or ambiguous identity attributes."""
    conflict_id: str = Field(..., description="Unique conflict identifier (e.g. CNF-001)")
    conflict_type: IdentityConflictType = Field(..., description="Type of identity contradiction or ambiguity")
    entity_ids: List[str] = Field(default_factory=list, description="IDs of affected entities")
    conflicting_attributes: Dict[str, Any] = Field(default_factory=dict, description="Attribute keys and conflicting values")
    evidence_refs: List[str] = Field(default_factory=list, description="Exhibits proving the conflict")
    statutory_caution: str = Field(..., description="Legal/statutory warning explaining constitutional constraints")
    resolution_required: bool = Field(default=True, description="True if manual investigator review is required before merging")


class HardVetoViolationError(Exception):
    """Raised when an automated or investigator action violates a constitutional hard veto constraint."""
    pass


class IdentityConflictDetector:
    """Detects duplicate, conflicting, ambiguous, and incomplete identity attributes."""

    @staticmethod
    def detect_conflicts(
        profiles: List[EntityProfile],
        records: Optional[List[Dict[str, Any]]] = None,
    ) -> List[IdentityConflict]:
        conflicts: List[IdentityConflict] = []
        c_counter = 1

        # 1. Detect Incomplete Identifiers
        for p in profiles:
            has_anchor = bool(
                p.normalized_phone
                or p.normalized_upi_vpa
                or p.normalized_device_imei
                or p.normalized_account_number
            )
            if not has_anchor:
                conflicts.append(
                    IdentityConflict(
                        conflict_id=f"CNF-{c_counter:04d}",
                        conflict_type=IdentityConflictType.INCOMPLETE_IDENTIFIERS,
                        entity_ids=[p.entity_id],
                        conflicting_attributes={"name": p.canonical_name},
                        evidence_refs=p.associated_evidence_ids,
                        statutory_caution=(
                            "Entity profile lacks verified anchors (phone, account, VPA, IMEI). "
                            "Incomplete identity must not be linked without corroborating evidence."
                        ),
                        resolution_required=True,
                    )
                )
                c_counter += 1

        # 2. Pairwise Profile Conflicts (Duplicate Account, Name Mismatch, Shared Ambiguity)
        for i in range(len(profiles)):
            for j in range(i + 1, len(profiles)):
                p1 = profiles[i]
                p2 = profiles[j]

                # Check Name Mismatch across identical phone or account
                same_anchor = (
                    (p1.normalized_phone and p2.normalized_phone and p1.normalized_phone == p2.normalized_phone)
                    or (p1.normalized_account_number and p2.normalized_account_number and p1.normalized_account_number == p2.normalized_account_number)
                )
                if same_anchor and p1.canonical_name and p2.canonical_name:
                    n1 = p1.canonical_name.strip().upper()
                    n2 = p2.canonical_name.strip().upper()
                    if n1 != n2 and n1 not in n2 and n2 not in n1:
                        conflicts.append(
                            IdentityConflict(
                                conflict_id=f"CNF-{c_counter:04d}",
                                conflict_type=IdentityConflictType.NAME_MISMATCH,
                                entity_ids=[p1.entity_id, p2.entity_id],
                                conflicting_attributes={"name_p1": p1.canonical_name, "name_p2": p2.canonical_name},
                                evidence_refs=list(set(p1.associated_evidence_ids + p2.associated_evidence_ids)),
                                statutory_caution=(
                                    f"Conflicting KYC names ('{p1.canonical_name}' vs '{p2.canonical_name}') "
                                    f"linked to common anchor. Requires verification against core banking records."
                                ),
                                resolution_required=True,
                            )
                        )
                        c_counter += 1

                # Check Shared Device Ambiguity without common ownership
                if (
                    p1.normalized_device_imei
                    and p2.normalized_device_imei
                    and p1.normalized_device_imei == p2.normalized_device_imei
                    and p1.entity_id != p2.entity_id
                ):
                    conflicts.append(
                        IdentityConflict(
                            conflict_id=f"CNF-{c_counter:04d}",
                            conflict_type=IdentityConflictType.SHARED_DEVICE_AMBIGUITY,
                            entity_ids=[p1.entity_id, p2.entity_id],
                            conflicting_attributes={"shared_imei": p1.normalized_device_imei},
                            evidence_refs=list(set(p1.associated_evidence_ids + p2.associated_evidence_ids)),
                            statutory_caution=(
                                "Shared IMEI / Hardware Device detected across multiple entities. "
                                "Constitutional Rule: Common ownership must never be inferred from shared hardware alone."
                            ),
                            resolution_required=False,  # Ambiguity noted, not a blocking merge conflict
                        )
                    )
                    c_counter += 1

        # 3. Detect Orphan VPAs and CGNAT Ambiguities from auxiliary records
        if records:
            for rec in records:
                vpa = rec.get("vpa")
                acc = rec.get("account_number")
                phone = rec.get("msisdn")
                if vpa and not acc and not phone:
                    conflicts.append(
                        IdentityConflict(
                            conflict_id=f"CNF-{c_counter:04d}",
                            conflict_type=IdentityConflictType.ORPHAN_VPA,
                            entity_ids=[rec.get("entity_id", "UNKNOWN")],
                            conflicting_attributes={"vpa": vpa},
                            evidence_refs=[rec.get("evidence_id", "EV-UNKNOWN")],
                            statutory_caution=(
                                f"UPI VPA '{vpa}' lacks underlying bank account or registered mobile subscriber record."
                            ),
                            resolution_required=True,
                        )
                    )
                    c_counter += 1

                ip_str = rec.get("ip_address")
                if ip_str:
                    norm_ip_data = normalize_ip(ip_str)
                    if norm_ip_data and norm_ip_data.get("requires_port_translation"):
                        conflicts.append(
                            IdentityConflict(
                                conflict_id=f"CNF-{c_counter:04d}",
                                conflict_type=IdentityConflictType.SHARED_CGNAT_AMBIGUITY,
                                entity_ids=[rec.get("entity_id", "UNKNOWN")],
                                conflicting_attributes={"ip_address": ip_str},
                                evidence_refs=[rec.get("evidence_id", "EV-UNKNOWN")],
                                statutory_caution=norm_ip_data.get("statutory_caution") or (
                                    "Shared IP gateway ambiguity. DoT Clause 39.20 prohibits individual attribution without NAT port records."
                                ),
                                resolution_required=False,
                            )
                        )
                        c_counter += 1

        return conflicts


class DecisionType(str, Enum):
    """Investigator decision actions on candidate identity linkages."""
    ACCEPT_MATCH = "ACCEPT_MATCH"
    REJECT_MATCH = "REJECT_MATCH"
    MERGE_ENTITIES = "MERGE_ENTITIES"
    SPLIT_ENTITY = "SPLIT_ENTITY"


class EntityDecision(BaseModel):
    """Immutable audit record of human investigator entity resolution decision."""
    decision_id: str = Field(..., description="Unique decision ID (e.g. DEC-001)")
    decision_type: DecisionType = Field(..., description="Action taken by investigator")
    target_entity_ids: List[str] = Field(..., description="Target entities affected")
    investigator_id: str = Field(..., description="Badge or username of authorized investigator")
    justification: str = Field(..., description="Investigative rationale and evidence basis")
    timestamp_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    hard_veto_override: bool = Field(default=False, description="True only with statutory supervisor authorization")
    supervisor_signoff: Optional[str] = Field(default=None, description="Supervisor ID authorizing veto override")
    is_active: bool = Field(default=True)


class EntityDecisionManager:
    """Manages human-in-the-loop decisions, enforcing hard vetoes and maintaining audit history."""

    def __init__(self) -> None:
        self.decision_history: List[EntityDecision] = []

    def apply_merge(
        self,
        decision: EntityDecision,
        profile_a: EntityProfile,
        profile_b: EntityProfile,
    ) -> EntityProfile:
        """Merges two entity profiles into a unified cluster, strictly enforcing Hard Veto rules."""
        # 1. Evaluate Hard Vetoes
        veto_reason: Optional[str] = None
        if profile_a.normalized_phone and profile_b.normalized_phone and profile_a.normalized_phone != profile_b.normalized_phone:
            veto_reason = f"Conflicting phone numbers: '{profile_a.normalized_phone}' vs '{profile_b.normalized_phone}'"
        elif profile_a.normalized_account_number and profile_b.normalized_account_number and profile_a.normalized_account_number != profile_b.normalized_account_number:
            veto_reason = f"Conflicting bank accounts: '{profile_a.normalized_account_number}' vs '{profile_b.normalized_account_number}'"

        if veto_reason and not decision.hard_veto_override:
            raise HardVetoViolationError(
                f"Constitutional Veto: Cannot merge entity '{profile_a.entity_id}' and '{profile_b.entity_id}'. "
                f"Reason: {veto_reason}. "
                f"SentinelX Rule 5: Never perform automatic or unsanctioned identity merges across conflicting strong identifiers."
            )

        if veto_reason and decision.hard_veto_override and not decision.supervisor_signoff:
            raise HardVetoViolationError(
                "Constitutional Rule: Hard veto override requires verified supervisor_signoff."
            )

        # 2. Record Decision in History
        self.decision_history.append(decision)

        # 3. Create Merged Profile
        merged_id = f"ENT_MERGED_{profile_a.entity_id}_{profile_b.entity_id}"
        merged_name = profile_a.canonical_name or profile_b.canonical_name
        merged_phone = profile_a.normalized_phone or profile_b.normalized_phone
        merged_vpa = profile_a.normalized_upi_vpa or profile_b.normalized_upi_vpa
        merged_imei = profile_a.normalized_device_imei or profile_b.normalized_device_imei
        merged_acc = profile_a.normalized_account_number or profile_b.normalized_account_number

        combined_evidence = list(set(profile_a.associated_evidence_ids + profile_b.associated_evidence_ids))
        combined_artifacts = list(set(profile_a.associated_artifact_ids + profile_b.associated_artifact_ids))

        return EntityProfile(
            entity_id=merged_id,
            canonical_name=merged_name,
            normalized_phone=merged_phone,
            normalized_upi_vpa=merged_vpa,
            normalized_device_imei=merged_imei,
            normalized_account_number=merged_acc,
            associated_evidence_ids=combined_evidence,
            associated_artifact_ids=combined_artifacts,
            review_state=ExaminerReviewState.CONFIRMED,
            has_unresolved_conflicts=False,
        )

    def apply_reject(self, decision: EntityDecision) -> None:
        """Records rejection of candidate entity match."""
        self.decision_history.append(decision)

    def apply_split(
        self,
        decision: EntityDecision,
        merged_profile: EntityProfile,
        split_identifier: str,
    ) -> Tuple[EntityProfile, EntityProfile]:
        """Splits an entity profile by detaching a disputed identifier."""
        self.decision_history.append(decision)
        p1 = merged_profile.model_copy(deep=True)
        p1.entity_id = f"{merged_profile.entity_id}_SPLIT_1"
        p2 = EntityProfile(
            entity_id=f"{merged_profile.entity_id}_SPLIT_2",
            canonical_name=f"Detached: {split_identifier}",
            associated_evidence_ids=list(merged_profile.associated_evidence_ids),
            associated_artifact_ids=list(merged_profile.associated_artifact_ids),
            review_state=ExaminerReviewState.CONFIRMED,
        )

        for k, v in list(p1.identifiers.items()):
            if split_identifier in v:
                p1.identifiers[k] = [x for x in v if x != split_identifier]
                p2.identifiers[k] = [split_identifier]

        return p1, p2

