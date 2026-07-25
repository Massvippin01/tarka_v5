from typing import Optional

from pydantic import BaseModel


class PhoneBase(BaseModel):
    id: str

    number: str

    provider: Optional[str] = None

    imei: Optional[str] = None


class PhoneCreate(PhoneBase):
    pass


class PhoneRead(PhoneBase):
    model_config = {
        "from_attributes": True
    }