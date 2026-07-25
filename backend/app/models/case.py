from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CaseBase(BaseModel):
    id: str = Field(..., description="Unique Case ID")
    fir_number: str
    title: str

    crime_type: str
    status: str

    occurred_at: datetime

    description: Optional[str] = None


class CaseCreate(CaseBase):
    pass


class CaseUpdate(BaseModel):
    title: Optional[str] = None
    crime_type: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None


class CaseRead(CaseBase):
    model_config = {
        "from_attributes": True
    }