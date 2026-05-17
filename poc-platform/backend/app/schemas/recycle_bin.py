from datetime import datetime
from pydantic import BaseModel


class RecycleBinItem(BaseModel):
    id: str
    type: str
    name: str
    deleted_at: datetime
    deleted_by: str | None
    extra: dict | None = None


class RecycleBinResponse(BaseModel):
    items: list[RecycleBinItem]
    total: int
