from pydantic import BaseModel


class LocationBase(BaseModel):
    id: str

    name: str

    address: str | None = None

    latitude: float

    longitude: float


class LocationCreate(LocationBase):
    pass


class LocationRead(LocationBase):
    model_config = {"from_attributes": True}
