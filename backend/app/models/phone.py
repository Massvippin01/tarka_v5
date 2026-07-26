from pydantic import BaseModel


class PhoneBase(BaseModel):
    id: str

    number: str

    provider: str | None = None

    imei: str | None = None


class PhoneCreate(PhoneBase):
    pass


class PhoneRead(PhoneBase):
    model_config = {"from_attributes": True}
