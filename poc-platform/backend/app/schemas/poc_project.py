import json
from datetime import date, datetime
from pydantic import BaseModel, field_validator


class PocProjectCreate(BaseModel):
    name: str
    region: str
    city: str
    sales: str
    pm: str
    start_date: date
    end_date: date
    poc_type_id: int
    impl_method_id: int
    status_id: int
    result: str | None = None


class PocProjectUpdate(BaseModel):
    name: str | None = None
    region: str | None = None
    city: str | None = None
    sales: str | None = None
    pm: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    poc_type_id: int | None = None
    impl_method_id: int | None = None
    status_id: int | None = None
    result: str | None = None
    plan_file: dict | None = None
    report_file: dict | None = None


class PocProjectOut(BaseModel):
    id: str
    name: str
    region: str
    city: str
    sales: str
    pm: str
    start_date: date
    end_date: date
    duration_days: int | None
    poc_type_id: int
    impl_method_id: int
    status_id: int
    result: str | None
    plan_file: dict | None = None
    report_file: dict | None = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator('plan_file', 'report_file', mode='before')
    @classmethod
    def parse_file_json(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v


class PocProjectListOut(BaseModel):
    items: list[PocProjectOut]
    total: int
    page: int
    page_size: int
