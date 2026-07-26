from .common import BaseSchema


class PhoneResponse(BaseSchema):
    id: str
    phone_number: str
    carrier: str
