from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import investigation_service
from app.domain.auth import UserIdentity
from app.domain.case import Case
from app.schemas.case import CaseCreate, CaseResponse
from app.services.auth_service import AuthService, get_current_user
from app.services.investigation_service import InvestigationService

router = APIRouter()


@router.post(
    "",
    response_model=CaseResponse,
)
def create_case(
    request: CaseCreate,
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    case = Case(
        case_number=request.case_number,
        fir_number=request.fir_number,
        title=request.title,
        description=request.description,
    )

    created = service.create_case(case)
    # Grant access to the creating investigator
    if user.scope and created.id not in user.scope.allowed_cases:
        user.scope.allowed_cases.append(created.id)

    return CaseResponse.model_validate(created)


@router.get(
    "",
    response_model=list[CaseResponse],
)
def list_cases(
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    auth_service = AuthService.get_instance()
    all_cases = service.list_cases()
    return [
        CaseResponse.model_validate(c)
        for c in all_cases
        if auth_service.validate_case_scope(user, c.id) or auth_service.validate_case_scope(user, c.case_number)
    ]


@router.get(
    "/{case_id}",
    response_model=CaseResponse,
)
def get_case(
    case_id: str,
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    AuthService.get_instance().enforce_case_access(user, case_id)
    case = service.get_case(case_id)

    if case is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    return CaseResponse.model_validate(case)


@router.put(
    "/{case_id}",
    response_model=CaseResponse,
)
def update_case(
    case_id: str,
    request: CaseCreate,
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    AuthService.get_instance().enforce_case_access(user, case_id)
    existing = service.get_case(case_id)

    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="Case not found",
        )

    existing.case_number = request.case_number
    existing.fir_number = request.fir_number
    existing.title = request.title
    existing.description = request.description

    updated = service.update_case(existing)

    return CaseResponse.model_validate(updated)


@router.delete("/{case_id}")
def delete_case(
    case_id: str,
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    AuthService.get_instance().enforce_case_access(user, case_id)
    service.delete_case(case_id)

    return {
        "success": True,
        "message": "Case deleted",
    }
