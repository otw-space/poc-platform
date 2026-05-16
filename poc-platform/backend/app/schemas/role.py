from pydantic import BaseModel


class RolePermissionOut(BaseModel):
    module: str
    action: str

    model_config = {"from_attributes": True}


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permissions: list[RolePermissionOut] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: list[RolePermissionOut] | None = None


class RoleOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    is_super: bool
    permissions: list[RolePermissionOut] = []

    model_config = {"from_attributes": True}
