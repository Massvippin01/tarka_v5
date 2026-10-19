from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, Query

from app.graph.graph_algorithms import GraphAlgorithms
from app.services.auth_service import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/pagerank")
def pagerank():
    alg = GraphAlgorithms()
    return alg.page_rank()


@router.get("/centrality")
def centrality():
    alg = GraphAlgorithms()
    return alg.degree_centrality()


@router.get("/communities")
def communities():
    alg = GraphAlgorithms()
    return alg.community_detection()


@router.get("/similarity")
def similarity(source_id: Optional[str] = "P001", target_id: Optional[str] = "P044"):
    alg = GraphAlgorithms()
    return {
        "source": source_id,
        "target": target_id,
        "common_neighbors": alg.common_neighbors(source_id, target_id),
        "epistemic_safety": "Topological node similarity indicates shared connections only, not co-conspiratorial intent or identity equivalence.",
    }


@router.get("/shortest-path")
def shortest_path(
    source: str = Query(..., description="Source entity ID"),
    target: str = Query(..., description="Target entity ID"),
):
    alg = GraphAlgorithms()
    return alg.find_cross_case_linkages(source, target)


@router.get("/common-connections")
def common_connections(
    node1: str = Query(..., description="First entity ID"),
    node2: str = Query(..., description="Second entity ID"),
):
    alg = GraphAlgorithms()
    return {
        "node1": node1,
        "node2": node2,
        "common_entities": alg.common_neighbors(node1, node2),
        "epistemic_safety": "Shared neighbor nodes demonstrate analytical adjacency. Culpability requires verified evidence.",
    }


@router.get("/temporal")
def temporal_graph_slice(
    start_date: Optional[str] = Query(None, description="ISO Start Date / Timestamp"),
    end_date: Optional[str] = Query(None, description="ISO End Date / Timestamp"),
    relationship_types: Optional[List[str]] = Query(None, description="Filter relationship types"),
):
    alg = GraphAlgorithms()
    return alg.temporal_filtered_subgraph(
        start_date=start_date,
        end_date=end_date,
        relationship_types=relationship_types,
    )
