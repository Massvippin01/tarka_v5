from fastapi import APIRouter, HTTPException

from app.services.graph_service import get_graph

router = APIRouter()


@router.get("/")
def read_graph():
    try:
        return get_graph()
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Unable to retrieve graph: {error}",
        ) from error