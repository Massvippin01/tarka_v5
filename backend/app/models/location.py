from typing import Optional

from pydantic import BaseModel


class LocationBase(BaseModel):
    id: str

    name: str

    address: Optional[str] = None

    latitude: float

    longitude: float


class LocationCreate(LocationBase):
    pass


class LocationRead(LocationBase):
    model_config = {
        "from_attributes": True
    }