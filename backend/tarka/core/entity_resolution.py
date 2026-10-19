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

import re
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
    display_name: str = Field(description="Human-readable label for investigator view")
    identifiers: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Normalized identifiers grouped by type (phone, vpa, account_suffix, rrn, imei, names)",
    )
    associated_evidence_ids: List[str] = Field(default_factory=list, description="Linked Evidence DNA IDs")
    associated_artifact_ids: List[str] = Field(default_factory=list, description="Linked Artifact IDs")
    has_unresolved_conflicts: bool = Field(default=False, description="True if this cluster contains conflicting signals")
    review_state: ExaminerReviewState = Field(
        default=ExaminerReviewState.UNREVIEWED,
        description="Review state for entity grouping",
    )



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
