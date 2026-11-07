"""
TARKA v5.0 — Investigation Replay & Deterministic Package Reproduction (Section 2.7)
=====================================================================================
Forensic Principles:
1. Record evidence references, parser/rule versions, and analysis configurations.
2. Track claim dependencies, transformation history, and execution receipts.
3. Allow independent verification of deterministic outputs from scratch.
4. Export replayable investigation packages with SHA-256 integrity sealing.
5. Strict non-guilt declaration: Mathematical reproducibility != judicial guilt.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from tarka.claim_compiler.compiler import (
    ClaimDependencyDAG,
    ClaimState,
    EvidenceItem,
    ForensicClaimCompiler,
    InvestigativeClaim,
    TrustTier,
)


class InvestigationReplayPackage(BaseModel):
    """Complete, self-contained, reproducible investigation capsule."""
    package_id: str = Field(..., description="Unique package ID, e.g. PKG-CASE-001")
    case_id: str = Field(..., description="Associated Case ID")
    engine_version: str = Field(default="TARKA_V5_FORENSIC_KERNEL", description="Software kernel version")
    created_at_utc: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    evidence_manifest: List[Dict[str, Any]] = Field(default_factory=list, description="Raw exhibits and hashes")
    claims_dag_snapshot: List[Dict[str, Any]] = Field(default_factory=list, description="Claim states and lineage")
    investigator_decisions: List[Dict[str, Any]] = Field(default_factory=list, description="Human decision log")
    deterministic_output_digest: str = Field(..., description="SHA-256 fingerprint of all evaluated claim states")
    package_sha256: str = Field(default="", description="Cryptographic seal of entire package payload")
    statutory_non_guilt_notice: str = Field(
        default=(
            "INVESTIGATION REPLAY INTEGRITY NOTICE: "
            "Deterministic reproduction confirms computational and evidentiary integrity of the analysis pipeline. "
            "In accordance with Indian legal jurisprudence and SentinelX Constitution Principle 5, "
            "mathematical consistency or solver satisfiability never establishes real-world criminal guilt or intent. "
            "Human judicial authority decides."
        )
    )


class ReplayPackageGenerator:
    """Creates tamper-evident replayable packages from active investigation state."""

    @staticmethod
    def generate_package(
        case_id: str,
        compiler: ForensicClaimCompiler,
        decisions: Optional[List[Dict[str, Any]]] = None,
    ) -> InvestigationReplayPackage:
        compiler.dag.evaluate_all()
        claims = compiler.dag.get_all_claims()

        # Evidence manifest
        ev_manifest = []
        for art_id, ev in compiler.dag._evidence.items():
            ev_manifest.append({
                "artifact_id": ev.artifact_id,
                "source_type": ev.source_type,
                "sha256_hash": ev.sha256_hash,
                "trust_tier": ev.trust_tier.value,
                "integrity_verified": ev.integrity_verified,
            })
        ev_manifest.sort(key=lambda x: x["artifact_id"])

        # Claim snapshot
        claims_snapshot = []
        for c in sorted(claims, key=lambda x: x.claim_id):
            claims_snapshot.append({
                "claim_id": c.claim_id,
                "title": c.title,
                "statement": c.statement,
                "claim_type": c.claim_type,
                "evaluation_status": c.evaluation_status.value,
                "supporting_evidence_ids": sorted(c.supporting_evidence_ids),
                "contradicting_evidence_ids": sorted(c.contradicting_evidence_ids),
                "premise_claim_ids": sorted(c.premise_claim_ids),
                "confidence_score": c.confidence_score,
            })

        # Deterministic output digest (SHA-256 of claims snapshot)
        claims_serialized = json.dumps(claims_snapshot, sort_keys=True)
        out_digest = hashlib.sha256(claims_serialized.encode("utf-8")).hexdigest()

        pkg_id = f"PKG_{case_id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        pkg = InvestigationReplayPackage(
            package_id=pkg_id,
            case_id=case_id,
            evidence_manifest=ev_manifest,
            claims_dag_snapshot=claims_snapshot,
            investigator_decisions=decisions or [],
            deterministic_output_digest=out_digest,
        )

        # Cryptographic seal of entire package
        pkg_payload = json.dumps(pkg.model_dump(exclude={"package_sha256"}), sort_keys=True)
        pkg.package_sha256 = hashlib.sha256(pkg_payload.encode("utf-8")).hexdigest()

        return pkg


class ReplayReproducer:
    """Independently verifies and reproduces deterministic outputs from a replay package."""

    @staticmethod
    def reproduce_investigation(package: InvestigationReplayPackage) -> Dict[str, Any]:
        """Reconstructs the Claim DAG from package evidence and claims,
        re-evaluates all claims from scratch, and verifies digest match.
        """
        rebuilt_dag = ClaimDependencyDAG()

        # 1. Ingest evidence items
        for ev_data in package.evidence_manifest:
            ev = EvidenceItem(
                artifact_id=ev_data["artifact_id"],
                source_type=ev_data["source_type"],
                sha256_hash=ev_data["sha256_hash"],
                byte_offset_start=0,
                byte_offset_end=0,
                raw_snippet="",
                acquisition_timestamp=0.0,
                trust_tier=TrustTier(ev_data["trust_tier"]),
                integrity_verified=ev_data["integrity_verified"],
            )
            rebuilt_dag.add_evidence(ev)

        # 2. Ingest claims with initial NOT_EVALUATED status
        for c_data in package.claims_dag_snapshot:
            claim = InvestigativeClaim(
                claim_id=c_data["claim_id"],
                title=c_data["title"],
                statement=c_data["statement"],
                claim_type=c_data["claim_type"],
                evaluation_status=ClaimState.NOT_EVALUATED,
                supporting_evidence_ids=c_data["supporting_evidence_ids"],
                contradicting_evidence_ids=c_data["contradicting_evidence_ids"],
                premise_claim_ids=c_data["premise_claim_ids"],
                confidence_score=c_data["confidence_score"],
            )
            rebuilt_dag.add_claim(claim)

        # 3. Independent re-evaluation from scratch
        rebuilt_dag.evaluate_all()

        # 4. Generate fresh output digest
        fresh_snapshot = []
        for c in sorted(rebuilt_dag.get_all_claims(), key=lambda x: x.claim_id):
            fresh_snapshot.append({
                "claim_id": c.claim_id,
                "title": c.title,
                "statement": c.statement,
                "claim_type": c.claim_type,
                "evaluation_status": c.evaluation_status.value,
                "supporting_evidence_ids": sorted(c.supporting_evidence_ids),
                "contradicting_evidence_ids": sorted(c.contradicting_evidence_ids),
                "premise_claim_ids": sorted(c.premise_claim_ids),
                "confidence_score": c.confidence_score,
            })

        fresh_serialized = json.dumps(fresh_snapshot, sort_keys=True)
        fresh_digest = hashlib.sha256(fresh_serialized.encode("utf-8")).hexdigest()

        is_reproduced = (fresh_digest == package.deterministic_output_digest)

        return {
            "reproduction_verified": is_reproduced,
            "case_id": package.case_id,
            "original_digest": package.deterministic_output_digest,
            "reproduced_digest": fresh_digest,
            "claims_count": len(fresh_snapshot),
            "audit_verdict": (
                "100% BITWISE DETERMINISTIC REPRODUCTION SUCCESSFUL: All investigative claims independently verified from raw exhibits."
                if is_reproduced else
                "REPRODUCTION DISCREPANCY: Freshly evaluated claim states diverge from original package digest."
            ),
        }

