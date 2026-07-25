from .common import BaseSchema


class EvidenceCreate(BaseSchema):
    evidence_type: str
    description: str


class EvidenceResponse(BaseSchema):
    id: str
    evidence_number: str
    evidence_type: str
    description: str