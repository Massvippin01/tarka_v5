from datetime import datetime

from .common import BaseSchema


class EventCreate(BaseSchema):
    title: str
    description: str
    occurred_at: datetime


class EventResponse(BaseSchema):
    id: str
    title: str
    description: str
    occurred_at: datetime