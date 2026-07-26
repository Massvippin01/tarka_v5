from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import investigation_service
from app.domain.person import Person
from app.schemas.person import PersonCreate, PersonResponse
from app.services.investigation_service import InvestigationService

router = APIRouter()


@router.post(
    "",
    response_model=PersonResponse,
)
def create_person(
    request: PersonCreate,
    service: InvestigationService = Depends(investigation_service),
):

    person = Person(
        first_name=request.first_name,
        middle_name=request.middle_name or "",
        last_name=request.last_name,
    )

    created = service.register_person(person)

    return PersonResponse.model_validate(created)


@router.get(
    "/{person_id}",
    response_model=PersonResponse,
)
def get_person(
    person_id: str,
    service: InvestigationService = Depends(investigation_service),
):

    person = service.get_person(person_id)

    if person is None:
        raise HTTPException(
            status_code=404,
            detail="Person not found",
        )

    return PersonResponse.model_validate(person)


@router.get(
    "",
    response_model=list[PersonResponse],
)
def list_persons(
    service: InvestigationService = Depends(investigation_service),
):

    return [PersonResponse.model_validate(p) for p in service.list_persons()]


@router.delete("/{person_id}")
def delete_person(
    person_id: str,
    service: InvestigationService = Depends(investigation_service),
):

    service.delete_person(person_id)

    return {
        "success": True,
        "message": "Person deleted",
    }
