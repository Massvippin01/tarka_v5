from typing import Optional

from pydantic import BaseModel


class VehicleBase(BaseModel):
    id: str

    registration: str

    manufacturer: Optional[str] = None

    model: Optional[str] = None

    color: Optional[str] = None

    vehicle_type: Optional[str] = None


class VehicleCreate(VehicleBase):
    pass


class VehicleRead(VehicleBase):
    model_config = {
        "from_attributes": True
    }