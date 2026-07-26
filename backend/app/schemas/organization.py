from .common import BaseSchema


class OrganizationResponse(BaseSchema):
    id: str
    legal_name: str
    organization_type: str
