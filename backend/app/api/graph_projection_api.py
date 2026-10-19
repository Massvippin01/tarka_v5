from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from app.domain.auth import UserIdentity
from app.domain.graph_projection import (
    GraphConsistencyReport,
    GraphDelta,
    GraphProjectionHealth,
    GraphSnapshot,
)
from app.services.auth_service import AuthService, get_current_user
from app.services.graph_projection_engine import GraphProjectionEngine
from app.services.investigation_state_service import InvestigationStateService

logger = logging.getLogger("sentinelx.api.graph_projection")


def enforce_case_projection_access(case_id: str, user: UserIdentity = Depends(get_current_user)) -> UserIdentity:
    AuthService.get_instance().enforce_case_access(user, case_id)
    return user


router = APIRouter(dependencies=[Depends(enforce_case_projection_access)])
engine = GraphProjectionEngine.get_instance()
state_service = InvestigationStateService()


@router.get("/{case_id}/snapshot", response_model=GraphSnapshot)
def get_graph_snapshot(case_id: str) -> GraphSnapshot:
    """
    GET /api/v1/graph-projection/{case_id}/snapshot
    Returns point-in-time full graph projection snapshot for initial load or recovery.
    """
    try:
        snapshot = engine.get_case_snapshot(case_id)
        if snapshot.total_nodes == 0:
            # If not yet projected into engine, hydrate from canonical state
            state = state_service.get_investigation_state(case_id)
            snapshot = engine.rebuild_projection_for_case(
                case_id=case_id,
                canonical_entities=state.get("entities", []),
                canonical_relationships=state.get("relationships", []),
                jurisdiction=state.get("case_meta", {}).get("jurisdiction", "Delhi NCR / Special Cell"),
            )
        return snapshot
    except Exception as e:
        logger.error(f"Error generating graph snapshot for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/deltas")
def get_graph_deltas(
    case_id: str,
    since_version: int = Query(..., ge=0, description="Last known version received by client"),
) -> Dict[str, Any]:
    """
    GET /api/v1/graph-projection/{case_id}/deltas?since_version=V
    Retrieves missed deltas for a reconnecting client to catch up incrementally.
    """
    try:
        can_resume, deltas = engine.get_deltas_since(case_id, since_version)
        if not can_resume:
            return {
                "can_resume": False,
                "message": "Delta gap too large or buffer expired. Full snapshot required.",
                "deltas": [],
            }
        return {
            "can_resume": True,
            "case_id": case_id,
            "since_version": since_version,
            "delta_count": len(deltas),
            "deltas": [d.model_dump() for d in deltas],
        }
    except Exception as e:
        logger.error(f"Error fetching deltas for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/health", response_model=GraphProjectionHealth)
def get_graph_health(case_id: str) -> GraphProjectionHealth:
    """
    GET /api/v1/graph-projection/{case_id}/health
    Exposes graph projection synchronization health status.
    """
    try:
        return engine.get_projection_health(case_id)
    except Exception as e:
        logger.error(f"Error fetching projection health for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{case_id}/rebuild", response_model=GraphSnapshot)
def rebuild_graph_projection(case_id: str) -> GraphSnapshot:
    """
    POST /api/v1/graph-projection/{case_id}/rebuild
    Governed rebuild of Neo4j analytical projection from authoritative PostgreSQL state.
    """
    try:
        state = state_service.get_investigation_state(case_id)
        snapshot = engine.rebuild_projection_for_case(
            case_id=case_id,
            canonical_entities=state.get("entities", []),
            canonical_relationships=state.get("relationships", []),
            jurisdiction=state.get("case_meta", {}).get("jurisdiction", "Delhi NCR / Special Cell"),
        )
        return snapshot
    except Exception as e:
        logger.error(f"Error rebuilding projection for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/neighborhood/{entity_id}")
def get_entity_neighborhood(
    case_id: str,
    entity_id: str,
    max_hops: int = Query(1, ge=1, le=5),
    entity_types: Optional[List[str]] = Query(None),
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
) -> Dict[str, Any]:
    """
    GET /api/v1/graph-projection/{case_id}/neighborhood/{entity_id}
    Bounded k-hop expansion with temporal and entity type filtering.
    """
    try:
        temp_filter = (start_time, end_time) if start_time and end_time else None
        return engine.get_neighborhood(
            case_id=case_id,
            entity_id=entity_id,
            max_hops=max_hops,
            entity_types=entity_types,
            min_confidence=min_confidence,
            temporal_filter=temp_filter,
        )
    except Exception as e:
        logger.error(f"Error retrieving neighborhood for {entity_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{case_id}/validate-consistency", response_model=GraphConsistencyReport)
def validate_graph_consistency(case_id: str) -> GraphConsistencyReport:
    """
    POST /api/v1/graph-projection/{case_id}/validate-consistency
    Compares PostgreSQL canonical entities & relationships vs Neo4j/projection.
    """
    try:
        state = state_service.get_investigation_state(case_id)
        return engine.validate_consistency(
            case_id=case_id,
            canonical_entities=state.get("entities", []),
            canonical_relationships=state.get("relationships", []),
        )
    except Exception as e:
        logger.error(f"Error validating consistency for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# -------------------------------------------------------------------------
# Subphase A6: Advanced Investigative Graph Analytical Endpoints
# -------------------------------------------------------------------------

from app.services.graph_analytical_service import GraphAnalyticalService

analytical_service = GraphAnalyticalService.get_instance()


@router.get("/{case_id}/path")
def get_graph_path(
    case_id: str,
    source: str = Query(..., description="Source entity ID"),
    target: str = Query(..., description="Target entity ID"),
    mode: str = Query("investigative", description="'investigative' or 'topological'"),
    min_confidence: float = Query(0.5, ge=0.0, le=1.0),
    require_evidence: bool = Query(True),
) -> Dict[str, Any]:
    """
    GET /api/v1/graph-projection/{case_id}/path?source=P001&target=V188&mode=investigative
    Computes path, strictly distinguishing topological from evidence-backed paths.
    """
    try:
        if mode.lower() == "topological":
            return analytical_service.find_shortest_path(case_id, source, target)
        return analytical_service.find_investigative_path(
            case_id=case_id,
            source=source,
            target=target,
            min_confidence=min_confidence,
            require_evidence=require_evidence,
        )
    except Exception as e:
        logger.error(f"Error computing path for {source}->{target}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/compare")
def compare_graph_entities(
    case_id: str,
    entity_a: str = Query(..., description="First entity ID"),
    entity_b: str = Query(..., description="Second entity ID"),
) -> Dict[str, Any]:
    """
    GET /api/v1/graph-projection/{case_id}/compare?entity_a=P001&entity_b=P044
    Multi-dimensional comparison between two entities across shared phones, vehicles, evidence.
    """
    try:
        return analytical_service.compare_entities(case_id, entity_a, entity_b)
    except Exception as e:
        logger.error(f"Error comparing {entity_a} vs {entity_b}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/contradictions-view")
def get_graph_contradictions_view(case_id: str) -> Dict[str, Any]:
    """
    GET /api/v1/graph-projection/{case_id}/contradictions-view
    Returns subgraph highlighting conflicting relationships and kinematic anomalies.
    """
    try:
        return analytical_service.get_contradiction_graph(case_id)
    except Exception as e:
        logger.error(f"Error generating contradiction graph for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/evidence-thread/{object_type}/{object_id}")
def get_graph_evidence_thread(
    case_id: str,
    object_type: str,
    object_id: str,
) -> Dict[str, Any]:
    """
    GET /api/v1/graph-projection/{case_id}/evidence-thread/relationship/{relationship_id}
    Traces unbroken lineage from source artifact to entity/relationship.
    """
    try:
        return analytical_service.get_evidence_thread(case_id, object_type, object_id)
    except Exception as e:
        logger.error(f"Error tracing evidence thread for {object_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{case_id}/bounded-expand")
def post_bounded_expand(
    case_id: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """
    POST /api/v1/graph-projection/{case_id}/bounded-expand
    Bounded neighborhood expansion with metadata (nodes_added, edges_added, truncated).
    """
    try:
        entity_id = payload.get("entity_id")
        if not entity_id:
            raise HTTPException(status_code=400, detail="entity_id is required")
        depth = payload.get("depth", 1)
        entity_types = payload.get("entity_types")
        min_confidence = payload.get("min_confidence", 0.0)
        temporal_filter = payload.get("temporal_filter")
        max_nodes = payload.get("max_nodes", 50)

        return analytical_service.expand_bounded(
            case_id=case_id,
            entity_id=entity_id,
            depth=depth,
            entity_types=entity_types,
            min_confidence=min_confidence,
            temporal_filter=tuple(temporal_filter) if temporal_filter else None,
            max_nodes=max_nodes,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error performing bounded expansion for {payload.get('entity_id')}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{case_id}/clusters")
def get_graph_clusters(case_id: str) -> List[Dict[str, Any]]:
    """
    GET /api/v1/graph-projection/{case_id}/clusters
    Returns neutral analytical clusters (relationship_cluster, interaction_cluster).
    """
    try:
        return analytical_service.get_clusters(case_id)
    except Exception as e:
        logger.error(f"Error fetching clusters for {case_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
