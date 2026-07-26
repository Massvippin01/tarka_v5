from datetime import date

from pydantic import BaseModel


class PersonBase(BaseModel):
    id: str

    name: str

    gender: str | None = None

    age: int | None = None

    dob: date | None = None

    nationality: str | None = None


class PersonCreate(PersonBase):
    pass


class PersonRead(PersonBase):
    model_config = {"from_attributes": True}
