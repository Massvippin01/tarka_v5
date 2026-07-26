from pydantic import BaseModel


class VehicleBase(BaseModel):
    id: str

    registration: str

    manufacturer: str | None = None

    model: str | None = None

    color: str | None = None

    vehicle_type: str | None = None


class VehicleCreate(VehicleBase):
    pass


class VehicleRead(VehicleBase):
    model_config = {"from_attributes": True}
