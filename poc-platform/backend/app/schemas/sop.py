import json
from datetime import datetime
from pydantic import BaseModel, field_validator


# ── SopDocument ──

class SopDocumentCreate(BaseModel):
    category: str
    name: str
    content: str | None = None


class SopDocumentUpdate(BaseModel):
    name: str | None = None
    content: str | None = None
    file_json: dict | str | None = None


class SopDocumentOut(BaseModel):
    id: str
    category: str
    name: str
    content: str | None = None
    file_json: dict | None = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    @field_validator("file_json", mode="before")
    @classmethod
    def parse_json(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v

    model_config = {"from_attributes": True}


# ── TestCaseCategory ──

class TestCaseCategoryCreate(BaseModel):
    name: str


class TestCaseCategoryUpdate(BaseModel):
    name: str | None = None


class TestCaseCategoryOut(BaseModel):
    id: str
    name: str
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── TestCase ──

class TestCaseCreate(BaseModel):
    title: str
    category_id: str | None = None
    module: str | None = None
    priority: str = "P2"
    precondition: str | None = None
    steps: str | None = None
    expected_result: str | None = None
    status: str = "draft"
    remarks: str | None = None


class TestCaseUpdate(BaseModel):
    title: str | None = None
    category_id: str | None = None
    module: str | None = None
    priority: str | None = None
    precondition: str | None = None
    steps: str | None = None
    expected_result: str | None = None
    status: str | None = None
    remarks: str | None = None


class TestCaseOut(BaseModel):
    id: str
    title: str
    category_id: str | None = None
    module: str | None = None
    priority: str
    precondition: str | None = None
    steps: str | None = None
    expected_result: str | None = None
    status: str
    remarks: str | None = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TestCaseListOut(BaseModel):
    items: list[TestCaseOut]
    total: int
    page: int
    page_size: int


# ── ScriptFile ──

class ScriptCreate(BaseModel):
    name: str
    description: str | None = None


class ScriptUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ScriptOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    file_json: dict | None = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    @field_validator("file_json", mode="before")
    @classmethod
    def parse_json(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return None
        return v

    model_config = {"from_attributes": True}
