from datetime import datetime
from pydantic import BaseModel


class DiagramCreate(BaseModel):
    name: str
    data: str = ""


class DiagramUpdate(BaseModel):
    name: str | None = None
    data: str | None = None


class DiagramOut(BaseModel):
    id: str
    name: str
    data: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
