from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.repositories.unified_store import UnifiedStore
from app.services.investigation_delta_service import InvestigationDeltaService
from app.services.investigation_state_service import InvestigationStateService
from app.services.live_proof_engine import LiveProofEngine

logger = logging.getLogger("sentinelx.api.investigations")

router = APIRouter()
store = UnifiedStore.get_instance()
state_service = InvestigationStateService(store=store)
delta_service = InvestigationDeltaService(store=store)
proof_engine = LiveProofEngine(store=store)


@router.get("/{case_id}/state")
def get_investigation_state(case_id: str) -> Dict[str, Any]:
    """
    GET /api/v1/investigations/{case_id}/state
    Exposes complete canonical InvestigationState projection.
    """
    try:
        state = state_service.get_investigation_state(case_id)
        return state
    except Exception as e:
        logger.error(f"Error retrieving investigation state for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/graph")
def get_investigation_graph(case_id: str) -> Dict[str, Any]:
    """
    GET /api/v1/investigations/{case_id}/graph
    Exposes evidence-aware graph projection with full traversal metadata.
    """
    try:
        state = state_service.get_investigation_state(case_id)

        # Graph Nodes: Entities + Evidence Artifacts
        nodes = []
        for e in state["entities"]:
            nodes.append({
                "id": e["entity_id"],
                "label": e["display_name"],
                "node_type": e["type"],
                "epistemic_level": "CANONICAL_ENTITY",
                "risk_level": e.get("risk_level", "UNKNOWN"),
            })

        for art in store.artifacts.values():
            if art.case_id == case_id:
                nodes.append({
                    "id": art.artifact_id,
                    "label": f"{art.source_type.value}: {art.record_id}",
                    "node_type": "EVIDENCE_ARTIFACT",
                    "epistemic_level": "ROOT_EVIDENCE",
                    "content_hash": art.content_hash,
                    "integrity_status": art.integrity_status.value,
                })

        # Graph Edges: Relationships with Evidential Anchoring
        edges = []
        for r in state["relationships"]:
            edges.append({
                "id": r["relationship_id"],
                "source": r["source_entity"],
                "target": r["target_entity"],
                "relationship_type": r["relationship_type"],
                "supporting_evidence": r["supporting_evidence"],
                "contradicting_evidence": r["contradicting_evidence"],
                "observed_at": r["observed_at"],
                "valid_from": r["valid_from"],
                "valid_to": r["valid_to"],
                "epistemic_status": r["epistemic_status"],
                "corroboration_level": r["corroboration_level"],
                "source_count": r["source_count"],
                "confidence": r["confidence"],
            })

        return {
            "case_id": case_id,
            "nodes": nodes,
            "edges": edges,
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "traversal_semantics": {
                "entity_to_evidence": "entity -> relationship -> supporting_evidence -> artifact",
                "claim_to_custody": "claim -> fact -> observation -> artifact -> provenance -> custody",
            },
        }
    except Exception as e:
        logger.error(f"Error projecting graph for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/contradictions")
def get_case_contradictions(case_id: str) -> Dict[str, Any]:
    """
    GET /api/v1/investigations/{case_id}/contradictions
    Exposes all open contradictions for a case.
    """
    try:
        state = state_service.get_investigation_state(case_id)
        contradictions = state.get("contradictions", [])
        return {
            "case_id": case_id,
            "total_contradictions": len(contradictions),
            "open_count": sum(1 for c in contradictions if c["status"] == "OPEN"),
            "contradictions": contradictions,
            "forensic_policy": "Never silently resolve or overwrite contradictory facts.",
        }
    except Exception as e:
        logger.error(f"Error retrieving contradictions for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/gaps")
def get_case_evidence_gaps(case_id: str) -> Dict[str, Any]:
    """
    GET /api/v1/investigations/{case_id}/gaps
    Exposes formal evidence gaps deduced for the case.
    """
    try:
        state = state_service.get_investigation_state(case_id)
        gaps = state.get("evidence_gaps", [])
        return {
            "case_id": case_id,
            "total_gaps": len(gaps),
            "critical_count": sum(1 for g in gaps if g["severity"] == "CRITICAL"),
            "gaps": gaps,
            "deductive_framework": "HYPOTHESIS -> REQUIRED EVIDENCE -> AVAILABLE EVIDENCE -> MISSING EVIDENCE -> GAP",
        }
    except Exception as e:
        logger.error(f"Error retrieving evidence gaps for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/timeline")
def get_case_timeline(case_id: str) -> Dict[str, Any]:
    """
    GET /api/v1/investigations/{case_id}/timeline
    Exposes unified spatiotemporal projection retaining uncertainty.
    """
    try:
        state = state_service.get_investigation_state(case_id)
        timeline = state.get("timeline", [])
        return {
            "case_id": case_id,
            "total_entries": len(timeline),
            "entries": timeline,
            "temporal_model": "INDEPENDENT_UNCERTAINTY_PRESERVED",
        }
    except Exception as e:
        logger.error(f"Error projecting timeline for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/delta")
def get_case_delta(case_id: str, since: Optional[str] = Query(None)) -> Dict[str, Any]:
    """
    GET /api/v1/investigations/{case_id}/delta
    Exposes investigation state differential with append-only semantics.
    """
    try:
        delta = delta_service.compute_case_delta(case_id, since_timestamp=since)
        return delta
    except Exception as e:
        logger.error(f"Error computing delta for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# Standalone Proof Router
proof_router = APIRouter()


@proof_router.get("/{claim_id}")
def get_claim_proof(claim_id: str) -> Dict[str, Any]:
    """
    GET /api/v1/proof/{claim_id}
    Backward proof lineage traversal:
    CLAIM -> RELATIONSHIP -> FACT -> OBSERVATION -> ARTIFACT -> SHA-256 -> PROVENANCE -> CUSTODY
    """
    try:
        proof = proof_engine.prove_claim_backward(claim_id)
        return {
            "proof_id": proof.proof_id,
            "direction": proof.direction,
            "root_id": proof.root_id,
            "is_valid": proof.is_valid,
            "hash_verified": proof.hash_verified,
            "provenance_verified": proof.provenance_verified,
            "custody_verified": proof.custody_verified,
            "source_location_verified": proof.source_location_verified,
            "errors": proof.errors,
            "verified_at": proof.verified_at,
            "steps": [
                {
                    "level": s.level,
                    "identifier": s.identifier,
                    "status": s.status,
                    "details": s.details,
                    "error": s.error,
                }
                for s in proof.steps
            ],
            "statutory_compliance": "Section 65B Indian Evidence Act / Section 63 Bharatiya Sakshya Adhiniyam 2023",
        }
    except Exception as e:
        logger.error(f"Error generating proof for claim {claim_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@proof_router.get("/artifact/{artifact_id}")
def get_artifact_proof_forward(artifact_id: str) -> Dict[str, Any]:
    """
    GET /api/v1/proof/artifact/{artifact_id}
    Forward lineage traversal:
    ARTIFACT -> OBSERVATION -> FACT -> RELATIONSHIP -> CLAIM -> HYPOTHESIS
    """
    try:
        proof = proof_engine.prove_artifact_forward(artifact_id)
        return {
            "proof_id": proof.proof_id,
            "direction": proof.direction,
            "root_id": proof.root_id,
            "is_valid": proof.is_valid,
            "hash_verified": proof.hash_verified,
            "provenance_verified": proof.provenance_verified,
            "custody_verified": proof.custody_verified,
            "errors": proof.errors,
            "verified_at": proof.verified_at,
            "steps": [
                {
                    "level": s.level,
                    "identifier": s.identifier,
                    "status": s.status,
                    "details": s.details,
                    "error": s.error,
                }
                for s in proof.steps
            ],
        }
    except Exception as e:
        logger.error(f"Error generating forward proof for artifact {artifact_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
