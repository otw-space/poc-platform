from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..schemas.user import UserLogin, Token, UserCreate, UserOut
from ..services.auth import authenticate_user, create_access_token, hash_password, get_user_by_username, verify_password
from ..middleware.auth import get_current_user
from ..models.user import User
from ..models.role import RolePermission

router = APIRouter(prefix="/api/auth", tags=["auth"])


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = authenticate_user(db, data.username, data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(user.id)
    return Token(
        access_token=token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = UserOut.model_validate(current_user)
    if current_user.role_obj:
        result.role_name = current_user.role_obj.name
    return result


@router.post("/register", response_model=UserOut)
def register(data: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/me/permissions")
def my_permissions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Super admin gets all permissions
    if current_user.role_obj and current_user.role_obj.is_super:
        modules = ["project", "dashboard", "sop", "recycle_bin", "settings"]
        actions = ["view", "create", "edit", "delete"]
        return [f"{m}:{a}" for m in modules for a in actions]
    # Other users get their role's permissions
    perms = db.query(RolePermission).filter(RolePermission.role_id == current_user.role_id).all()
    return [f"{p.module}:{p.action}" for p in perms]


@router.put("/me/password")
def change_my_password(data: PasswordChange, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="当前密码错误")
    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}
