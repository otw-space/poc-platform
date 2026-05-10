from datetime import datetime
from pydantic import BaseModel


class ChartConfig(BaseModel):
    id: str
    type: str
    title: str
    x_field: str
    y_field: str
    group_field: str | None = None
    w: int = 6
    h: int = 400
    x: int | None = None
    y: int | None = None
    colorScheme: str | None = None


class FilterConfig(BaseModel):
    field: str
    op: str
    value: str | list[str]


class DashboardConfig(BaseModel):
    filters: list[FilterConfig] = []
    charts: list[ChartConfig] = []


class DashboardCreate(BaseModel):
    name: str
    config: DashboardConfig
    is_public: bool = False


class DashboardUpdate(BaseModel):
    name: str | None = None
    config: DashboardConfig | None = None
    is_public: bool | None = None


class DashboardOut(BaseModel):
    id: str
    name: str
    user_id: str
    config: dict
    is_public: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DashboardQueryRequest(BaseModel):
    filters: list[FilterConfig] = []
    x_field: str
    y_field: str
    group_field: str | None = None
