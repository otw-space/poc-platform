from pydantic import BaseModel


class PocOptionCreate(BaseModel):
    category: str
    label: str
    sort_order: int = 0


class PocOptionUpdate(BaseModel):
    label: str | None = None
    sort_order: int | None = None


class PocOptionOut(BaseModel):
    id: int
    category: str
    label: str
    is_default: bool
    sort_order: int

    model_config = {"from_attributes": True}
