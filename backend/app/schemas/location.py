from .common import BaseSchema


class LocationResponse(BaseSchema):
    id: str
    name: str
    address: str
    city: str
    state: str
