from pydantic import Field

from .common import BaseSchema


class PersonCreate(BaseSchema):
    first_name: str = Field(..., min_length=1)
    middle_name: str | None = None
    last_name: str = Field(..., min_length=1)


class PersonResponse(BaseSchema):
    id: str
    first_name: str
    middle_name: str | None = None
    last_name: str
    full_name: str
