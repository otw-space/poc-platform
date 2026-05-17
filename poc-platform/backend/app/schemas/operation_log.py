from datetime import datetime
from pydantic import BaseModel


class OperationLogOut(BaseModel):
    id: int
    user_id: str
    username: str
    action: str
    target_type: str
    target_name: str
    details: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class OperationLogListOut(BaseModel):
    items: list[OperationLogOut]
    total: int
    page: int
    page_size: int
