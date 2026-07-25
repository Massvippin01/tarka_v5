from datetime import date
from typing import Optional

from pydantic import BaseModel


class PersonBase(BaseModel):
    id: str

    name: str

    gender: Optional[str] = None

    age: Optional[int] = None

    dob: Optional[date] = None

    nationality: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonRead(PersonBase):
    model_config = {
        "from_attributes": True
    }