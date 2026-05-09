from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    role: str = "user"


class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PasswordReset(BaseModel):
    new_password: str
