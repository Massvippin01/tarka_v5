from .common import BaseSchema


class CaseCreate(BaseSchema):
    case_number: str
    fir_number: str
    title: str
    description: str


class CaseResponse(BaseSchema):
    id: str
    case_number: str
    fir_number: str
    title: str
    description: str
