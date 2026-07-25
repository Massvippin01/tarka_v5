from fastapi import APIRouter, HTTPException

from app.intelligence.similarity_engine import (
    compare_cases,
)
from app.services.case_intelligence_service import (
    get_case_context,
    has_communication_path,
)


router = APIRouter()


@router.get(
    "/compare/{case_a_id}/{case_b_id}"
)
def compare_case_pair(
    case_a_id: str,
    case_b_id: str,
):
    if case_a_id == case_b_id:
        raise HTTPException(
            status_code=400,
            detail="A case cannot be compared with itself.",
        )

    case_a = get_case_context(case_a_id)
    case_b = get_case_context(case_b_id)

    if case_a is None:
        raise HTTPException(
            status_code=404,
            detail=f"Case {case_a_id} was not found.",
        )

    if case_b is None:
        raise HTTPException(
            status_code=404,
            detail=f"Case {case_b_id} was not found.",
        )

    communication_path = has_communication_path(
        case_a_id,
        case_b_id,
    )

    return compare_cases(
        case_a,
        case_b,
        communication_path,
    )