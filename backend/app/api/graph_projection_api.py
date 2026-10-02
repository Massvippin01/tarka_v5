from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.domain.graph_projection import (
    GraphConsistencyReport,
    GraphDelta,
    GraphProjectionHealth,
    GraphSnapshot,
)
from app.services.graph_projection_engine import GraphProjectionEngine
from app.services.investigation_state_service import InvestigationStateService

logger = logging.getLogger("sentinelx.api.graph_projection")

router = APIRouter()
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
