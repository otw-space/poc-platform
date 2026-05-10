from datetime import date, datetime
from pydantic import BaseModel


class PocProjectLogCreate(BaseModel):
    log_date: date
    progress: str = ""
    issues: str = ""
    plan: str = ""


class PocProjectLogUpdate(BaseModel):
    log_date: date | None = None
    progress: str | None = None
    issues: str | None = None
    plan: str | None = None


class PocProjectLogOut(BaseModel):
    id: str
    project_id: str
    log_date: date
    progress: str
    issues: str
    plan: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
