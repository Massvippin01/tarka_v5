from fastapi import APIRouter, Depends

from app.core.dependencies import investigation_service
from app.domain.auth import UserIdentity
from app.services.auth_service import AuthService, get_current_user
from app.services.investigation_service import InvestigationService

router = APIRouter()


@router.post("/cases/{case_id}/suspects/{person_id}")
def assign_suspect(
    case_id: str,
    person_id: str,
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    AuthService.get_instance().enforce_case_access(user, case_id)
    service.assign_person_to_case(person_id, case_id)

    return {
        "success": True,
        "relationship": "SUSPECT_IN",
    }


@router.post("/cases/{case_id}/victims/{person_id}")
def assign_victim(
    case_id: str,
    person_id: str,
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    AuthService.get_instance().enforce_case_access(user, case_id)
    service.assign_victim(person_id, case_id)

    return {
        "success": True,
        "relationship": "VICTIM_IN",
    }


@router.post("/cases/{case_id}/witnesses/{person_id}")
def assign_witness(
    case_id: str,
    person_id: str,
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    AuthService.get_instance().enforce_case_access(user, case_id)
    service.assign_witness(person_id, case_id)

    return {
        "success": True,
        "relationship": "WITNESS_IN",
    }


@router.post("/persons/{person_id}/phones/{phone_id}")
def assign_phone(
    person_id: str,
    phone_id: str,
    service: InvestigationService = Depends(investigation_service),
    user: UserIdentity = Depends(get_current_user),
):
    service.assign_phone(person_id, phone_id)

    return {
        "success": True,
        "relationship": "USES_PHONE",
    }


@router.post("/persons/{person_id}/vehicles/{vehicle_id}")
def assign_vehicle(
    person_id: str,
    vehicle_id: str,
    service: InvestigationService = Depends(investigation_service),
):
    service.assign_vehicle(person_id, vehicle_id)

    return {
        "success": True,
        "relationship": "USES_VEHICLE",
    }
