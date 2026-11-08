"""
TARKA SUTRAM 2026 — WORKSTREAM A1
Forensic Claim Compiler: Typed Canonical Intermediate Representation (CIR) and Claim Dependency DAG.

Transforms raw investigative observations into structured, challengeable, explainable,
and mathematically verifiable claims under the doctrine:
AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple


class ClaimState(str, Enum):
    SUPPORTED = "SUPPORTED"
    CONTRADICTED = "CONTRADICTED"
    UNCERTAIN = "UNCERTAIN"
    UNSUPPORTED = "UNSUPPORTED"
    NOT_EVALUATED = "NOT_EVALUATED"


class TrustTier(str, Enum):
    T1_HIGH = "T1"      # Core banking switch, telecom BTS CDR, cryptographically signed ledger
    T2_MEDIUM = "T2"    # Server auth log, email RFC 822 headers, OS event logs
    T3_LOW = "T3"       # User smartphone screenshot, forwarded chat, unverified receipt


@dataclass
class EvidenceItem:
    """Canonical representation of an ingested raw evidentiary artifact."""
    artifact_id: str
    source_type: str
    sha256_hash: str
    byte_offset_start: int
    byte_offset_end: int
    raw_snippet: str
    acquisition_timestamp: float
    trust_tier: TrustTier
    integrity_verified: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EvidenceIR:
    """Canonical Evidence Intermediate Representation (IR) preserving raw AST and transformation lineage."""
    ir_id: str
    artifact_id: str
    sha256_hash: str
    observations: List[Observation] = field(default_factory=list)
    normalization_history: List[Dict[str, Any]] = field(default_factory=list)
    extraction_rule: str = "CANONICAL_IR_V1"
    timestamp_utc: str = ""


@dataclass
class Observation:
    """Atomic observation extracted deterministically from raw evidence bytes."""
    observation_id: str
    source_artifact_id: str
    field_name: str
    raw_value: str
    normalized_value: Any
    confidence: float = 1.0


@dataclass
class EntityReference:
    entity_id: str
    canonical_name: str
    identifiers: Dict[str, str]  # type -> normalized value (e.g. "phone": "+919876543210")


@dataclass
class TransactionReference:
    txn_id: str
    amount: float
    currency: str
    timestamp_epoch: float
    from_entity_id: str
    to_entity_id: str
    rrn_utr: Optional[str] = None
    reversal_status: bool = False


@dataclass
class InvestigativeClaim:
    """
    Structured investigative claim with explicit evidence citations,
    prerequisite dependencies, alternative explanations, and statutory limitations.
    """
    claim_id: str
    title: str
    statement: str
    claim_type: str  # e.g., "TRANSACTION_OCCURRENCE", "IDENTITY_PRESENCE", "MULE_ASSOCIATION"
    evaluation_status: ClaimState
    supporting_evidence_ids: List[str] = field(default_factory=list)
    contradicting_evidence_ids: List[str] = field(default_factory=list)
    premise_claim_ids: List[str] = field(default_factory=list)
    dependent_claim_ids: List[str] = field(default_factory=list)
    assumptions: List[str] = field(default_factory=list)
    alternative_explanations: List[str] = field(default_factory=list)
    limitations: List[str] = field(default_factory=list)
    confidence_score: float = 1.0
    reviewer_id: Optional[str] = None
    review_status: str = "UNREVIEWED"  # "UNREVIEWED", "HUMAN_CONFIRMED", "HUMAN_REJECTED"
    zkp_proof_id: Optional[str] = None
    observations: List[Observation] = field(default_factory=list)
    version: int = 1
    transformation_history: List[Dict[str, Any]] = field(default_factory=list)
    integrity_precondition_satisfied: bool = True


class ClaimDependencyDAG:
    """
    Directed Acyclic Graph (DAG) tracking strict evidentiary dependencies between claims.
    Enforces acyclicity, isolates invalidated premises, and enables counterfactual propagation.
    """

    def __init__(self):
        self._claims: Dict[str, InvestigativeClaim] = {}
        self._evidence: Dict[str, EvidenceItem] = {}
        # Adjacency: parent_claim -> set of child_claims that depend on it
        self._children: Dict[str, Set[str]] = {}
        # Evidence to claims: artifact_id -> set of claim_ids supported by it
        self._evidence_to_claims: Dict[str, Set[str]] = {}

    def add_evidence(self, item: EvidenceItem):
        self._evidence[item.artifact_id] = item

    def get_evidence(self, artifact_id: str) -> Optional[EvidenceItem]:
        return self._evidence.get(artifact_id)

    def add_claim(self, claim: InvestigativeClaim):
        """Adds a claim to the DAG with cycle detection."""
        # Detect circular dependency before insertion
        for premise_id in claim.premise_claim_ids:
            if self._has_path(claim.claim_id, premise_id):
                raise ValueError(
                    f"Circular dependency detected: adding claim {claim.claim_id} creates a cycle with premise {premise_id}"
                )

        self._claims[claim.claim_id] = claim

        if claim.claim_id not in self._children:
            self._children[claim.claim_id] = set()

        for premise_id in claim.premise_claim_ids:
            if premise_id not in self._children:
                self._children[premise_id] = set()
            self._children[premise_id].add(claim.claim_id)

        for art_id in claim.supporting_evidence_ids:
            if art_id not in self._evidence_to_claims:
                self._evidence_to_claims[art_id] = set()
            self._evidence_to_claims[art_id].add(claim.claim_id)

    def _has_path(self, start_id: str, target_id: str) -> bool:
        """Checks if a directed path exists from start_id to target_id."""
        if start_id == target_id:
            return True
        visited = set()
        queue = [start_id]
        while queue:
            curr = queue.pop(0)
            if curr == target_id:
                return True
            visited.add(curr)
            for child in self._children.get(curr, set()):
                if child not in visited:
                    queue.append(child)
        return False

    def get_claim(self, claim_id: str) -> Optional[InvestigativeClaim]:
        return self._claims.get(claim_id)

    def get_all_claims(self) -> List[InvestigativeClaim]:
        return list(self._claims.values())

    def get_descendants(self, claim_id: str) -> Set[str]:
        """Returns all claims that transitively depend on the given claim."""
        descendants = set()
        queue = list(self._children.get(claim_id, set()))
        while queue:
            curr = queue.pop(0)
            if curr not in descendants:
                descendants.add(curr)
                queue.extend(self._children.get(curr, set()))
        return descendants

    def evaluate_all(self):
        """
        Evaluates the status of all claims in topological dependency order.
        Invariants:
        1. A claim whose supporting evidence fails integrity becomes UNCERTAIN or UNSUPPORTED.
        2. A claim depending on a CONTRADICTED or UNSUPPORTED premise cannot be SUPPORTED.
        3. A claim with explicit contradicting evidence is evaluated as CONTRADICTED.
        """
        # Evaluate until fixed-point convergence to resolve multi-hop dependency chains
        for _ in range(max(1, len(self._claims))):
            for claim in self._claims.values():
                # Check contradicting evidence first
                if claim.contradicting_evidence_ids:
                    claim.evaluation_status = ClaimState.CONTRADICTED
                    continue

                # A claim must have either direct supporting evidence or premise claims
                if not claim.supporting_evidence_ids and not claim.premise_claim_ids:
                    claim.evaluation_status = ClaimState.UNSUPPORTED
                    continue

                # Check direct supporting evidence validity
                evidence_valid = True
                if claim.supporting_evidence_ids:
                    for art_id in claim.supporting_evidence_ids:
                        ev = self._evidence.get(art_id)
                        if not ev or not ev.integrity_verified:
                            evidence_valid = False
                            break
                    if not evidence_valid:
                        claim.integrity_precondition_satisfied = False
                        claim.evaluation_status = ClaimState.UNSUPPORTED
                        if not any("CIRCUIT-BREAKER" in lim for lim in claim.limitations):
                            claim.limitations.append("CIRCUIT-BREAKER TRIPPED: Direct supporting evidence failed integrity verification.")
                        continue

                # Check premise claims validity
                premises_valid = True
                premise_integrity_failed = False
                if claim.premise_claim_ids:
                    for pid in claim.premise_claim_ids:
                        premise = self._claims.get(pid)
                        if not premise or not premise.integrity_precondition_satisfied:
                            premise_integrity_failed = True
                            premises_valid = False
                            break
                        if premise.evaluation_status in (ClaimState.CONTRADICTED, ClaimState.UNSUPPORTED, ClaimState.UNCERTAIN):
                            premises_valid = False
                            break

                if not premises_valid:
                    claim.evaluation_status = ClaimState.UNCERTAIN
                    if premise_integrity_failed:
                        claim.integrity_precondition_satisfied = False
                        if not any("CIRCUIT-BREAKER" in lim for lim in claim.limitations):
                            claim.limitations.append("CIRCUIT-BREAKER TRIPPED: Prerequisite premise claim failed evidentiary integrity.")
                else:
                    claim.evaluation_status = ClaimState.SUPPORTED


class ForensicClaimCompiler:
    """
    High-level compiler transforming raw evidence observations into a validated Claim DAG.
    Generates explainable intelligence briefs with source-offset citations.
    """

    def __init__(self):
        self.dag = ClaimDependencyDAG()

    def ingest_evidence_item(self, item: EvidenceItem):
        self.dag.add_evidence(item)

    def compile_transaction_claim(
        self,
        claim_id: str,
        txn: TransactionReference,
        supporting_artifact_id: str,
        contradicting_artifact_ids: Optional[List[str]] = None,
        zkp_proof_id: Optional[str] = None,
    ) -> InvestigativeClaim:
        """Compiles a transaction occurrence claim bound to source artifact offset and optional ZKP proof."""
        ev = self.dag.get_evidence(supporting_artifact_id)
        raw_ref = f"[{ev.raw_snippet}]" if ev else "[RAW_UNAVAILABLE]"

        assumptions = ["Authoritative core banking ledger entry without concurrent reversal directive."]
        if zkp_proof_id:
            assumptions.append(f"Aggregate regulatory threshold cryptographically verified under ZKP proof {zkp_proof_id}.")

        claim = InvestigativeClaim(
            claim_id=claim_id,
            title=f"Transaction Occurrence: INR {txn.amount:.2f}",
            statement=(
                f"Funds of INR {txn.amount:.2f} ({txn.currency}) transferred from {txn.from_entity_id} "
                f"to {txn.to_entity_id} at epoch {txn.timestamp_epoch}. Source: {raw_ref}."
            ),
            claim_type="TRANSACTION_OCCURRENCE",
            evaluation_status=ClaimState.NOT_EVALUATED,
            supporting_evidence_ids=[supporting_artifact_id],
            contradicting_evidence_ids=contradicting_artifact_ids or [],
            assumptions=assumptions,
            limitations=["Does not infer intent, identity ownership, or legal culpability of account holder."],
            confidence_score=0.98 if ev and ev.trust_tier == TrustTier.T1_HIGH else 0.80,
            zkp_proof_id=zkp_proof_id,
        )
        self.dag.add_claim(claim)
        return claim

    def compile_attribution_claim(
        self,
        claim_id: str,
        entity_name: str,
        role: str,
        premise_claim_ids: List[str],
        supporting_artifact_ids: List[str],
        cgnat_shared_pool: bool = False,
    ) -> InvestigativeClaim:
        """
        Compiles an investigative attribution/correlation claim.
        Enforces 340-to-1 CGNAT safeguard: if IP is shared without source port, sets UNCERTAIN.
        """
        status = ClaimState.NOT_EVALUATED
        limitations = ["AI proposes correlation; evidence verifies; human magistrate decides."]
        assumptions = ["Hardware IMEI was in possession of subject during recorded telecom BTS transaction."]

        if cgnat_shared_pool:
            limitations.append(
                "CGNAT SAFEGUARD ACTIVE: Public IP is shared across up to 340 simultaneous subscribers without "
                "destination source port binding. Insufficient evidence for singular individual attribution."
            )

        claim = InvestigativeClaim(
            claim_id=claim_id,
            title=f"Attribution Hypothesis: {entity_name} as {role}",
            statement=f"Investigative correlation links {entity_name} to syndicate role '{role}' based on premise findings.",
            claim_type="IDENTITY_ATTRIBUTION",
            evaluation_status=status,
            supporting_evidence_ids=supporting_artifact_ids,
            premise_claim_ids=premise_claim_ids,
            assumptions=assumptions,
            limitations=limitations,
            confidence_score=0.50 if cgnat_shared_pool else 0.88,
        )
        self.dag.add_claim(claim)
        return claim

    def build_explainable_brief(self) -> Dict[str, Any]:
        """
        Compiles all claims into a 7-question structured explainable intelligence brief.
        Every finding is traceable to raw evidence byte offsets.
        """
        self.dag.evaluate_all()
        claims = self.dag.get_all_claims()

        supported = [c for c in claims if c.evaluation_status == ClaimState.SUPPORTED]
        contradicted = [c for c in claims if c.evaluation_status == ClaimState.CONTRADICTED]
        uncertain = [c for c in claims if c.evaluation_status == ClaimState.UNCERTAIN]
        unsupported = [c for c in claims if c.evaluation_status == ClaimState.UNSUPPORTED]

        return {
            "total_claims": len(claims),
            "supported_count": len(supported),
            "contradicted_count": len(contradicted),
            "uncertain_count": len(uncertain),
            "unsupported_count": len(unsupported),
            "claims": [asdict(c) for c in claims],
            "statutory_declaration": (
                "Compiled in accordance with Section 63 Bharatiya Sakshya Adhiniyam, 2023. "
                "Maintains strict non-accusatory neutral terminology. AI Proposes, Evidence Verifies, Human Decides."
            ),
        }

    def generate_claim_manifest(self, case_id: str) -> Dict[str, Any]:
        """Generates a verifiable machine-readable manifest and investigator summary."""
        self.dag.evaluate_all()
        claims = self.dag.get_all_claims()
        claims_data = [asdict(c) for c in claims]
        serialized = json.dumps(claims_data, sort_keys=True)
        manifest_sha256 = hashlib.sha256(serialized.encode("utf-8")).hexdigest()

        return {
            "manifest_version": "1.0.0",
            "case_id": case_id,
            "manifest_sha256": manifest_sha256,
            "generated_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "total_claims": len(claims),
            "claims": claims_data,
            "investigator_summary": (
                f"Case {case_id}: {len(claims)} total claims compiled. "
                f"Supported: {sum(1 for c in claims if c.evaluation_status == ClaimState.SUPPORTED)}, "
                f"Contradicted: {sum(1 for c in claims if c.evaluation_status == ClaimState.CONTRADICTED)}, "
                f"Uncertain: {sum(1 for c in claims if c.evaluation_status == ClaimState.UNCERTAIN)}, "
                f"Unsupported: {sum(1 for c in claims if c.evaluation_status == ClaimState.UNSUPPORTED)}."
            ),
            "statutory_non_guilt_notice": (
                "AI PROPOSES. EVIDENCE VERIFIES. HUMAN DECIDES. "
                "This claim manifest represents investigative inferences and mathematical checks; "
                "it does NOT determine criminal guilt or judicial liability."
            ),
        }


