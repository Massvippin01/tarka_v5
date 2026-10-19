from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from app.repositories.unified_store import UnifiedStore
from app.graph.graph_algorithms import GraphAlgorithms
from app.services.auth_service import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/graph")
def get_full_graph():
    store = UnifiedStore.get_instance()
    nodes = [
        {"id": n.id, "labels": [n.label], "properties": n.properties}
        for n in store.nodes.values()
    ]
    edges = [
        {"id": e.id, "source": e.source, "target": e.target, "type": e.type, "properties": e.properties}
        for e in store.edges
    ]
    return {"nodes": nodes, "edges": edges}


@router.get("/node/{node_id}")
def get_node_details(node_id: str):
    store = UnifiedStore.get_instance()
    k_hop = store.get_k_hop(node_id, k=2)
    return k_hop


@router.get("/search")
def search_explorer(q: str = Query(...)):
    store = UnifiedStore.get_instance()
    return store.search_entities(q)
