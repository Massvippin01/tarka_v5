from fastapi import APIRouter, Depends

from app.core.dependencies import (
    graph_service,
)

from app.services.graph_analysis_service import (
    GraphAnalysisService,
)

router = APIRouter()


@router.get("/pagerank")
def pagerank(
    service: GraphAnalysisService = Depends(
        graph_service
    ),
):
    return service.page_rank()


@router.get("/similarity")
def similarity(
    service: GraphAnalysisService = Depends(
        graph_service
    ),
):
    return service.similarity()


@router.get("/shortest-path")
def shortest_path(
    source: str,
    target: str,
    service: GraphAnalysisService = Depends(
        graph_service
    ),
):
    return service.shortest_path(
        source,
        target,
    )