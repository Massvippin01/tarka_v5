from datetime import datetime

from pydantic import BaseModel, Field


class CaseBase(BaseModel):
    id: str = Field(..., description="Unique Case ID")
    fir_number: str
    title: str

    crime_type: str
    status: str

    occurred_at: datetime

    description: str | None = None


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: str | None = None
    crime_type: str | None = None
    status: str | None = None
    description: str | None = None


class CaseRead(CaseBase):
    model_config = {"from_attributes": True}
