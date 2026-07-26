from fastapi import APIRouter

from app.services.graph_explorer_service import GraphExplorerService

router = APIRouter()

service = GraphExplorerService()


@router.get("/person/{person_id}")
def person(person_id: str):
    return service.person_network(person_id)


@router.get("/case/{case_id}")
def case(case_id: str):
    return service.case_network(case_id)


@router.get("/neighbors/{entity_id}")
def neighbors(entity_id: str):
    return service.neighbors(entity_id)
