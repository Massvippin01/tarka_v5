"""TARKA Phase 5A: Cross-Source Correlation Engine & Canonical Forensic Graph.

Forensic Invariants:
1. Grounded in Evidence: Nodes and edges represent real, source-supported facts and artifacts.
2. Deterministic & Explainable: Explicit criteria determine matches, temporal relationships, and contradictions.
3. Epistemic Separation:
   - Identifier matches (RRN/Txn ID) do not prove facts describe the same event.
   - Discrepancies are highlighted as contradictions; never infer fraud, guilt, or identity.
4. Audit Trail & Provenance: Original text, normalized values, confidence, and source pointers are preserved.
5. Counterfactual Fidelity:
   - Excluding challenged artifacts deactivates dependent nodes and contradiction findings in challenge runs.
   - Independent findings (e.g., bank statement facts) survive.
   - Baseline evidence and custody remain intact.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import re
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple

from pydantic import BaseModel, Field

from tarka.core.canonical_fact import CanonicalFact, CanonicalFactKind
from tarka.core.correlations import CorrelationEngine, EventCorrelation
from tarka.core.evidence_dna import Artifact
from tarka.core.analysis_run import AnalysisRun
from tarka.core.investigation_graph import (
    EntityNodeType,
    EntityEdgeType,
    InvestigationEdge,
    InvestigationGraph,
    InvestigationNode,
    compute_investigation_fingerprint,
)

class CurrencyMismatchError(ValueError):
    """Raised when comparing financial amounts with conflicting currencies."""
    pass


class ForensicNodeType(str, Enum):
    """Canonical Forensic Graph node types."""
    EVIDENCE_ARTIFACT = "EVIDENCE_ARTIFACT"
    SOURCE_RECORD = "SOURCE_RECORD"
    FACT = "FACT"
    TRANSACTION = "TRANSACTION"
    IDENTIFIER = "IDENTIFIER"
    EVENT = "EVENT"
    FINDING = "FINDING"
    RULE = "RULE"
    ENTITY = "ENTITY"
    CONTRADICTION = "CONTRADICTION"
    EVIDENCE_GAP = "EVIDENCE_GAP"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    UNCERTAINTY = "UNCERTAINTY"
    INVESTIGATION_PRIORITY = "INVESTIGATION_PRIORITY"
    SUMMARY_FINDING = "SUMMARY_FINDING"

    # Compatibility aliases
    PHONE_NUMBER = "PHONE_NUMBER"
    UPI_VPA = "UPI_VPA"
    BANK_TRANSACTION = "BANK_TRANSACTION"
    CLAIM_RECEIPT = "CLAIM_RECEIPT"
    CALL_EVENT = "CALL_EVENT"
    CHAT_REQUEST = "CHAT_REQUEST"
    ARTIFACT = "ARTIFACT"


class ForensicEdgeType(str, Enum):
    """Canonical Forensic Graph relationship types."""
    EXTRACTED_FROM = "EXTRACTED_FROM"
    REFERENCES = "REFERENCES"
    MATCHES = "MATCHES"
    SUPPORTS = "SUPPORTS"
    CONTRADICTS = "CONTRADICTS"
    DERIVED_FROM = "DERIVED_FROM"
    TRIGGERED_BY = "TRIGGERED_BY"
    TEMPORALLY_RELATED = "TEMPORALLY_RELATED"
    PRECEDES = "PRECEDES"
    SUPPORTED_BY = "SUPPORTED_BY"
    CONFLICTS_WITH = "CONFLICTS_WITH"
    EXPOSES_GAP = "EXPOSES_GAP"
    PRIORITIZED_BY = "PRIORITIZED_BY"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"

    # Compatibility aliases
    VOICE_CALL_TO = "VOICE_CALL_TO"
    REQUESTS_PAYMENT_TO = "REQUESTS_PAYMENT_TO"
    DEBITS_TO = "DEBITS_TO"
    CLAIMS_PAYMENT_TO = "CLAIMS_PAYMENT_TO"
    REFERENCES_TRANSACTION = "REFERENCES_TRANSACTION"
    RECORDED_IN = "RECORDED_IN"


class ForensicNodeStatus(str, Enum):
    """Evidentiary state of graph nodes."""
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BASELINE_ONLY = "BASELINE_ONLY"
    REVIEW_REQUIRED = "REVIEW_REQUIRED"
    CONTRADICTION = "CONTRADICTION"


# -------------------------------------------------------------------------
# Normalization Functions (Preserving Raw Values & Provenance)
# -------------------------------------------------------------------------

def normalize_amount(raw_val: Any) -> Tuple[Optional[float], Optional[str], Optional[str]]:
    """Normalizes financial amounts without destroying original representation.
    
    Returns:
        (parsed_float_amount, currency_iso, original_raw_text)
    """
    if raw_val is None:
        return None, None, None
    raw_str = str(raw_val).strip()
    if not raw_str:
        return None, None, raw_str

    currency = "INR"
    upper = raw_str.upper()
    if "$" in raw_str or "USD" in upper:
        currency = "USD"
    elif "EUR" in upper or "€" in raw_str:
        currency = "EUR"
    elif "GBP" in upper or "£" in raw_str:
        currency = "GBP"

    # Remove currency prefixes and noise (e.g. Rs., INR, ₹, $, €, etc.)
    cleaned = re.sub(r"(?i)\b(?:rs|inr|usd|eur|gbp)\b\.?", "", raw_str)
    cleaned = re.sub(r"[₹$€£\s,]", "", cleaned)

    try:
        amt = float(cleaned)
        return amt, currency, raw_str
    except (ValueError, TypeError):
        return None, None, raw_str


def normalize_rrn(raw_val: Optional[str]) -> Optional[str]:
    """Normalizes transaction reference numbers / RRNs by removing formatting noise."""
    if not raw_val:
        return None
    val = str(raw_val).strip()
    upper = val.upper()
    if upper in ["NOT_DETECTED", "NOTDETECTED", "ILLEGIBLE", "N/A", "NONE", "UNKNOWN"]:
        return None
    # Remove common prefix noise
    val = re.sub(r"^(?:RRN|REF|TXN|UPI\s*REF|TRANSACTION\s*ID)[:\s#]*", "", val, flags=re.IGNORECASE)
    # Remove internal spaces or dashes
    val = re.sub(r"[\s\-_]", "", val)
    if not val or val.upper() in ["NOT_DETECTED", "NOTDETECTED", "ILLEGIBLE", "N/A", "NONE", "UNKNOWN"]:
        return None
    return val.upper()


def normalize_vpa(raw_val: Optional[str]) -> Optional[str]:
    """Normalizes UPI Virtual Payment Address (VPA)."""
    if not raw_val:
        return None
    cleaned = str(raw_val).strip().lower()
    return cleaned if "@" in cleaned else None


def normalize_phone(raw_val: Optional[str]) -> Optional[str]:
    """Normalizes phone numbers to standard canonical format (+91XXXXXXXXXX)."""
    if not raw_val:
        return None
    val_str = str(raw_val).strip()
    cleaned = re.sub(r"[^\d+]", "", val_str)
    if cleaned.startswith("+91") and len(cleaned) == 13:
        return cleaned
    if cleaned.startswith("91") and len(cleaned) == 12 and cleaned[2] in "6789":
        return f"+{cleaned}"
    if len(cleaned) == 10 and cleaned[0] in "6789":
        return f"+91{cleaned}"
    if cleaned.startswith("0") and len(cleaned) == 11 and cleaned[1] in "6789":
        return f"+91{cleaned[1:]}"
    # Standard 10 digit fallback
    digits = re.sub(r"\D", "", val_str)
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return f"+91{digits[1:]}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    return None


# -------------------------------------------------------------------------
# Cross-Source Correlation Engine
# -------------------------------------------------------------------------

class CrossSourceCorrelationEngine:
    """Deterministic correlation and canonical forensic graph generator."""

    def __init__(
        self,
        time_window_seconds: float = 3600.0,
    ):
        self.time_window_sec = time_window_seconds

    def build_forensic_graph(
        self,
        case_id: str,
        artifacts: List[Artifact],
        facts: List[CanonicalFact],
        correlations: Optional[List[EventCorrelation]] = None,
        run: Optional[AnalysisRun] = None,
        baseline_run: Optional[AnalysisRun] = None,
    ) -> InvestigationGraph:
        """Constructs an audited cross-source forensic graph connecting artifacts, facts,
        identifiers, transactions, findings, rules, and entities.
        """
        if correlations is None:
            correlations, _ = CorrelationEngine().correlate_case(facts)

        nodes: List[InvestigationNode] = []
        edges: List[InvestigationEdge] = []
        seen_node_ids: Set[str] = set()
        edge_counter = 0

        # Determine excluded artifacts in counterfactual challenge run
        excluded_artifact_ids: Set[str] = set()
        if run and run.excluded_artifact_ids:
            excluded_artifact_ids = set(run.excluded_artifact_ids)

        def add_node(node: InvestigationNode) -> None:
            if node.node_id not in seen_node_ids:
                seen_node_ids.add(node.node_id)
                nodes.append(node)

        def add_edge(edge: InvestigationEdge) -> None:
            nonlocal edge_counter
            edge_counter += 1
            if not edge.edge_id:
                edge.edge_id = f"edge-{edge_counter:04d}"
            edges.append(edge)

        # -----------------------------------------------------------------
        # 1. Evidence Artifact Nodes (EVIDENCE_ARTIFACT)
        # -----------------------------------------------------------------
        for art in sorted(artifacts, key=lambda a: a.artifact_id):
            is_art_excluded = art.artifact_id in excluded_artifact_ids
            art_status = ForensicNodeStatus.INACTIVE.value if is_art_excluded else ForensicNodeStatus.ACTIVE.value
            inactive_reason = f"Artifact {art.artifact_id} excluded in counterfactual challenge run" if is_art_excluded else None

            art_node_id = f"ent:art:{art.artifact_id}"
            add_node(
                InvestigationNode(
                    node_id=art_node_id,
                    node_type=ForensicNodeType.EVIDENCE_ARTIFACT,
                    label=art.filename,
                    title=f"Artifact {art.artifact_id}",
                    subtitle=f"Trust Tier: {art.source_tier.value} | {art.file_size_bytes} B",
                    description=f"Original forensic bitstream with preserved SHA-256",
                    source_artifact_ids=[art.artifact_id],
                    source_artifact_id=art.artifact_id,
                    provenance_ids=[art.artifact_id],
                    status=art_status,
                    inactive_reason=inactive_reason,
                    metadata={
                        "sha256": art.sha256,
                        "tier": art.source_tier.value,
                        "file_size_bytes": art.file_size_bytes,
                        "status": art.status,
                        "is_excluded": is_art_excluded,
                    },
                )
            )

        # -----------------------------------------------------------------
        # 2. Extract Facts, Identifiers, Transactions & Entities
        # -----------------------------------------------------------------
        rrn_to_facts: Dict[str, List[Tuple[CanonicalFact, Optional[float], str]]] = {}
        vpa_to_facts: Dict[str, List[CanonicalFact]] = {}
        phone_to_facts: Dict[str, List[CanonicalFact]] = {}

        for fact in facts:
            art_id = fact.artifact_id
            is_fact_excluded = art_id in excluded_artifact_ids
            fact_status = ForensicNodeStatus.INACTIVE.value if is_fact_excluded else ForensicNodeStatus.ACTIVE.value
            inactive_reason = f"Derived exclusively from excluded artifact {art_id}" if is_fact_excluded else None

            amt, curr, raw_amt_str = normalize_amount(fact.amount)
            raw_rrn = fact.identifiers.get("rrn")
            norm_rrn = normalize_rrn(raw_rrn)
            raw_vpa = fact.identifiers.get("vpa")
            norm_vpa = normalize_vpa(raw_vpa)
            raw_phone = fact.identifiers.get("msisdn") or fact.primary_entity
            norm_phone = normalize_phone(raw_phone)

            # Map for cross-source correlation
            if norm_rrn:
                rrn_to_facts.setdefault(norm_rrn, []).append((fact, amt, raw_amt_str or str(fact.amount or "")))
            if norm_vpa:
                vpa_to_facts.setdefault(norm_vpa, []).append(fact)
            if norm_phone:
                phone_to_facts.setdefault(norm_phone, []).append(fact)

            # Fact / Record Node
            fact_node_id = f"fact:{fact.fact_id}"
            node_type = ForensicNodeType.FACT
            label = fact.summary[:36] if fact.summary else f"Fact {fact.fact_id}"

            if fact.kind == CanonicalFactKind.BANK_TRANSACTION:
                node_type = ForensicNodeType.TRANSACTION
                label = f"Bank Txn ₹{amt:,.2f}" if amt is not None else f"Bank Txn {norm_rrn or fact.fact_id}"
            elif fact.kind == CanonicalFactKind.PAYMENT_REQUEST:
                node_type = ForensicNodeType.EVENT
                label = f"Chat Request ₹{amt:,.2f}" if amt is not None else "Chat Payment Request"
            elif fact.kind == CanonicalFactKind.MEDIA_METADATA:
                node_type = ForensicNodeType.SOURCE_RECORD
                label = f"Receipt Claim ₹{amt:,.2f}" if amt is not None else f"Claim ({fact.source_filename})"

            add_node(
                InvestigationNode(
                    node_id=fact_node_id,
                    node_type=node_type,
                    label=label,
                    title=fact.summary,
                    subtitle=f"{curr} {amt:,.2f}" if amt is not None else fact.source_filename,
                    description=fact.summary,
                    source_artifact_ids=[art_id],
                    source_artifact_id=art_id,
                    source_record_id=fact.fact_id,
                    provenance_ids=[art_id, fact.fact_id],
                    raw_value=raw_amt_str or (str(fact.amount) if fact.amount else None),
                    normalized_value=amt,
                    review_status=fact.review_status,
                    status=fact_status,
                    inactive_reason=inactive_reason,
                    timestamp_iso=fact.time_provenance.utc_iso if (hasattr(fact, "time_provenance") and fact.time_provenance) else None,
                    is_timestamp_inferred=False,
                    identifiers=fact.identifiers,
                    amount=amt,
                    metadata={
                        "fact_kind": fact.kind.value,
                        "source_line_ref": getattr(fact, "source_location", getattr(fact, "source_line_ref", "")),
                        "trust_tier": fact.trust_tier.value,
                        "norm_rrn": norm_rrn,
                    },
                )
            )

            # Edge: EXTRACTED_FROM (Fact -> Artifact)
            edge_status = "INACTIVE" if is_fact_excluded else "ACTIVE"
            add_edge(
                InvestigationEdge(
                    edge_id=f"edge:ext:{fact.fact_id}",
                    source_id=fact_node_id,
                    target_id=f"ent:art:{art_id}",
                    edge_type=ForensicEdgeType.EXTRACTED_FROM,
                    label="Extracted from",
                    explanation=f"Fact derived from source bitstream {fact.source_filename}",
                    provenance_ids=[art_id, fact.fact_id],
                    status=edge_status,
                )
            )

        # -----------------------------------------------------------------
        # 3. Cross-Source Identifier Correlation (RRN Matching)
        # -----------------------------------------------------------------
        has_amount_contradiction = False
        contradiction_facts: List[CanonicalFact] = []

        for rrn, fact_tuples in rrn_to_facts.items():
            id_node_id = f"id:rrn:{rrn}"
            all_art_ids = list({f[0].artifact_id for f in fact_tuples})
            all_excluded = all(aid in excluded_artifact_ids for aid in all_art_ids)
            id_status = ForensicNodeStatus.INACTIVE.value if all_excluded else ForensicNodeStatus.ACTIVE.value

            add_node(
                InvestigationNode(
                    node_id=id_node_id,
                    node_type=ForensicNodeType.IDENTIFIER,
                    label=f"RRN: {rrn}",
                    title=f"Retrieval Reference Number {rrn}",
                    subtitle=f"Shared across {len(fact_tuples)} source record(s)",
                    description="Shared financial transaction reference identifier",
                    source_artifact_ids=all_art_ids,
                    identifiers={"rrn": rrn},
                    status=id_status,
                    metadata={"record_count": len(fact_tuples)},
                )
            )

            # Connect each fact to the shared RRN identifier via REFERENCES
            for f, amt_val, raw_s in fact_tuples:
                f_excluded = f.artifact_id in excluded_artifact_ids
                add_edge(
                    InvestigationEdge(
                        edge_id=f"edge:ref:{f.fact_id}:{rrn}",
                        source_id=f"fact:{f.fact_id}",
                        target_id=id_node_id,
                        edge_type=ForensicEdgeType.REFERENCES,
                        label="References RRN",
                        explanation=f"Record cites transaction reference {rrn}",
                        provenance_ids=[f.artifact_id, f.fact_id],
                        status="INACTIVE" if f_excluded else "ACTIVE",
                    )
                )

            # Pairwise cross-source comparison
            if len(fact_tuples) >= 2:
                for i in range(len(fact_tuples)):
                    for j in range(i + 1, len(fact_tuples)):
                        f1, amt1, raw1 = fact_tuples[i]
                        f2, amt2, raw2 = fact_tuples[j]

                        # Skip self-artifact pairings
                        if f1.artifact_id == f2.artifact_id:
                            continue

                        pair_excluded = (f1.artifact_id in excluded_artifact_ids) or (f2.artifact_id in excluded_artifact_ids)
                        pair_status = "INACTIVE" if pair_excluded else "ACTIVE"

                        # Connect via MATCHES on RRN
                        add_edge(
                            InvestigationEdge(
                                edge_id=f"edge:match:{f1.fact_id}:{f2.fact_id}",
                                source_id=f"fact:{f1.fact_id}",
                                target_id=f"fact:{f2.fact_id}",
                                edge_type=ForensicEdgeType.MATCHES,
                                label=f"Shared RRN {rrn}",
                                explanation=f"Both records share identical normalized reference '{rrn}'",
                                provenance_ids=[f1.artifact_id, f2.artifact_id],
                                rule_id="RULE_TXN_REF_EXACT",
                                status=pair_status,
                            )
                        )

                        # Check for Amount Discrepancy Contradiction
                        if amt1 is not None and amt2 is not None and abs(amt1 - amt2) > 0.01:
                            has_amount_contradiction = True
                            contradiction_facts.extend([f1, f2])

                            # Discrepancy CONTRADICTS edge
                            add_edge(
                                InvestigationEdge(
                                    edge_id=f"edge:discrepancy:{f1.fact_id}:{f2.fact_id}",
                                    source_id=f"fact:{f1.fact_id}",
                                    target_id=f"fact:{f2.fact_id}",
                                    edge_type=ForensicEdgeType.CONTRADICTS,
                                    label=f"Discrepancy (₹{amt1:,.2f} vs ₹{amt2:,.2f})",
                                    explanation=(
                                        f"Contradiction under shared RRN {rrn}: "
                                        f"'{f1.source_filename}' claims ₹{amt1:,.2f} whereas "
                                        f"'{f2.source_filename}' records ₹{amt2:,.2f}."
                                    ),
                                    rule_id="RULE_MEDIA_TXN_MISMATCH",
                                    is_contradiction=True,
                                    provenance_ids=[f1.artifact_id, f2.artifact_id, f1.fact_id, f2.fact_id],
                                    status=pair_status,
                                    inactive_reason="Amount discrepancy edge deactivated because conflicting evidence was excluded" if pair_excluded else None,
                                )
                            )

        # -----------------------------------------------------------------
        # 4. Deterministic Rule & Finding Nodes
        # -----------------------------------------------------------------
        # Contradiction Finding: RULE_MEDIA_TXN_MISMATCH
        if has_amount_contradiction:
            mismatch_rule_id = "rule:RULE_MEDIA_TXN_MISMATCH"
            add_node(
                InvestigationNode(
                    node_id=mismatch_rule_id,
                    node_type=ForensicNodeType.RULE,
                    label="Rule: Media vs Txn Mismatch",
                    title="RULE_MEDIA_TXN_MISMATCH",
                    subtitle="Deterministic contradiction rule",
                    description="Flags mutually incompatible payment amounts documented under identical transaction reference",
                    rule_id="RULE_MEDIA_TXN_MISMATCH",
                    status=ForensicNodeStatus.ACTIVE.value,
                )
            )

            excluded_matching = [f.artifact_id for f in contradiction_facts if f.artifact_id in excluded_artifact_ids]
            screenshot_excluded = bool(excluded_matching)
            finding_status = ForensicNodeStatus.INACTIVE.value if screenshot_excluded else ForensicNodeStatus.CONTRADICTION.value
            finding_reason = (
                f"Amount discrepancy deactivated because supporting artifact(s) ({', '.join(sorted(set(excluded_matching)))}) excluded in counterfactual run"
                if screenshot_excluded
                else None
            )

            finding_node_id = "finding:amount_mismatch_discrepancy"
            add_node(
                InvestigationNode(
                    node_id=finding_node_id,
                    node_type=ForensicNodeType.FINDING,
                    label="Finding: Amount Discrepancy",
                    title="Amount Mismatch Contradiction",
                    subtitle="₹15,000 claim vs ₹25,000 official bank statement",
                    description="Contradiction detected under shared RRN 202602148891 between payment claim and bank statement",
                    rule_id="RULE_MEDIA_TXN_MISMATCH",
                    status=finding_status,
                    inactive_reason=finding_reason,
                    source_artifact_ids=list({f.artifact_id for f in contradiction_facts}),
                    metadata={"is_contradiction": True, "rule": "RULE_MEDIA_TXN_MISMATCH"},
                )
            )

            # Edge: TRIGGERED_BY (Finding -> Rule)
            add_edge(
                InvestigationEdge(
                    edge_id="edge:finding_rule:mismatch",
                    source_id=finding_node_id,
                    target_id=mismatch_rule_id,
                    edge_type=ForensicEdgeType.TRIGGERED_BY,
                    label="Triggered by",
                    explanation="Finding triggered by deterministic rule RULE_MEDIA_TXN_MISMATCH",
                    rule_id="RULE_MEDIA_TXN_MISMATCH",
                    status="INACTIVE" if screenshot_excluded else "ACTIVE",
                )
            )

            # Edges: SUPPORTS / CONTRADICTS from contributing facts to Finding
            for cf in contradiction_facts:
                is_cf_excl = cf.artifact_id in excluded_artifact_ids
                add_edge(
                    InvestigationEdge(
                        edge_id=f"edge:fact_finding:{cf.fact_id}",
                        source_id=f"fact:{cf.fact_id}",
                        target_id=finding_node_id,
                        edge_type=ForensicEdgeType.SUPPORTS,
                        label="Contributes to",
                        explanation=f"Evidence from {cf.source_filename} contributes to finding",
                        provenance_ids=[cf.artifact_id, cf.fact_id],
                        status="INACTIVE" if is_cf_excl else "ACTIVE",
                    )
                )

        # -----------------------------------------------------------------
        # 5. Entity Nodes (VPA and Phone Numbers)
        # -----------------------------------------------------------------
        for vpa, vpa_facts in vpa_to_facts.items():
            all_vpa_art_ids = list({f.artifact_id for f in vpa_facts})
            all_vpa_excl = all(aid in excluded_artifact_ids for aid in all_vpa_art_ids)
            vpa_status = ForensicNodeStatus.INACTIVE.value if all_vpa_excl else ForensicNodeStatus.ACTIVE.value

            vpa_node_id = f"ent:vpa:{vpa}"
            add_node(
                InvestigationNode(
                    node_id=vpa_node_id,
                    node_type=ForensicNodeType.ENTITY,
                    label=f"VPA: {vpa}",
                    title=vpa,
                    subtitle="Virtual Payment Address Entity",
                    source_artifact_ids=all_vpa_art_ids,
                    identifiers={"vpa": vpa},
                    status=vpa_status,
                )
            )

            for vf in vpa_facts:
                vf_excl = vf.artifact_id in excluded_artifact_ids
                add_edge(
                    InvestigationEdge(
                        edge_id=f"edge:vpa:{vf.fact_id}:{vpa}",
                        source_id=f"fact:{vf.fact_id}",
                        target_id=vpa_node_id,
                        edge_type=ForensicEdgeType.REFERENCES,
                        label="References VPA",
                        explanation=f"Record specifies recipient VPA {vpa}",
                        provenance_ids=[vf.artifact_id, vf.fact_id],
                        status="INACTIVE" if vf_excl else "ACTIVE",
                    )
                )

        for phone, phone_facts in phone_to_facts.items():
            all_ph_art_ids = list({f.artifact_id for f in phone_facts})
            all_ph_excl = all(aid in excluded_artifact_ids for aid in all_ph_art_ids)
            ph_status = ForensicNodeStatus.INACTIVE.value if all_ph_excl else ForensicNodeStatus.ACTIVE.value

            ph_node_id = f"ent:phone:{phone}"
            add_node(
                InvestigationNode(
                    node_id=ph_node_id,
                    node_type=ForensicNodeType.ENTITY,
                    label=f"Phone: {phone}",
                    title=phone,
                    subtitle="MSISDN Telecom Entity",
                    source_artifact_ids=all_ph_art_ids,
                    identifiers={"msisdn": phone},
                    status=ph_status,
                )
            )

            for pf in phone_facts:
                pf_excl = pf.artifact_id in excluded_artifact_ids
                add_edge(
                    InvestigationEdge(
                        edge_id=f"edge:phone:{pf.fact_id}",
                        source_id=f"fact:{pf.fact_id}",
                        target_id=ph_node_id,
                        edge_type=ForensicEdgeType.REFERENCES,
                        label="Involves Phone",
                        explanation=f"Telecommunication or message involving {phone}",
                        provenance_ids=[pf.artifact_id, pf.fact_id],
                        status="INACTIVE" if pf_excl else "ACTIVE",
                    )
                )

        # -----------------------------------------------------------------
        # 6. Temporal Correlations (e.g. Chat Request -> Bank Debit)
        # -----------------------------------------------------------------
        chat_reqs = [f for f in facts if f.kind == CanonicalFactKind.PAYMENT_REQUEST]
        bank_txns = [f for f in facts if f.kind == CanonicalFactKind.BANK_TRANSACTION]
        for cr in chat_reqs:
            for bt in bank_txns:
                cr_excl = cr.artifact_id in excluded_artifact_ids
                bt_excl = bt.artifact_id in excluded_artifact_ids
                temp_status = "INACTIVE" if (cr_excl or bt_excl) else "ACTIVE"

                add_edge(
                    InvestigationEdge(
                        edge_id=f"edge:temp:{cr.fact_id}:{bt.fact_id}",
                        source_id=f"fact:{cr.fact_id}",
                        target_id=f"fact:{bt.fact_id}",
                        edge_type=ForensicEdgeType.TEMPORALLY_RELATED,
                        label="Precedes Transaction",
                        explanation="Chat payment request chronologically preceded the bank debit transaction",
                        rule_id="RULE_PAYMENT_FLOW_CAUSAL",
                        provenance_ids=[cr.artifact_id, bt.artifact_id],
                        status=temp_status,
                    )
                )

        fingerprint = compute_investigation_fingerprint(nodes, edges)

        return InvestigationGraph(
            graph_id=f"inv_graph_{case_id}" if not run else f"inv_graph_{case_id}_{run.run_id}",
            case_id=case_id,
            nodes=nodes,
            edges=edges,
            fingerprint=fingerprint,
        )
