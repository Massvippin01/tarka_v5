from .common import BaseSchema


class VehicleResponse(BaseSchema):
    id: str
    registration_number: str
    manufacturer: str
    model: str
