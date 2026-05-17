from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str = "123456"
    display_name: str = ""
    role: str = "user"
    role_id: str | None = None


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    role: str
    role_id: str | None = None
    role_name: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    username: str | None = None
    display_name: str | None = None
    role_id: str | None = None


class PasswordReset(BaseModel):
    new_password: str
