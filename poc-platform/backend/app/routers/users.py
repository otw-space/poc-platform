from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserUpdate, UserOut, PasswordReset
from ..services.auth import hash_password, get_user_by_username
from ..services.logger import log_operation
from ..middleware.auth import get_current_user, require_permission

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_permission("settings", "edit"))):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        uo = UserOut.model_validate(u)
        if u.role_obj:
            uo.role_name = u.role_obj.name
        result.append(uo)
    return result


@router.post("/", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("settings", "edit"))):
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        role=data.role,
        role_id=data.role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    log_operation(db, current_user, "create", "user", user.display_name or user.username)
    return UserOut.model_validate(user)


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: str, data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("settings", "edit"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    changes = []
    if data.username is not None:
        existing = db.query(User).filter(User.username == data.username, User.id != user_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already exists")
        if data.username != user.username:
            changes.append(f"账号: {user.username} → {data.username}")
        user.username = data.username
    if data.display_name is not None:
        if data.display_name != user.display_name:
            changes.append(f"用户名: {user.display_name} → {data.display_name}")
        user.display_name = data.display_name
    if data.role_id is not None:
        user.role_id = data.role_id
    db.commit()
    db.refresh(user)
    log_operation(db, current_user, "update", "user", user.display_name or user.username, details="; ".join(changes) if changes else None)
    return UserOut.model_validate(user)


@router.delete("/{user_id}")
def delete_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_permission("settings", "edit"))):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    log_operation(db, current_user, "delete", "user", user.display_name or user.username)
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.put("/{user_id}/password")
def reset_password(user_id: str, data: PasswordReset, db: Session = Depends(get_db), current_user: User = Depends(require_permission("settings", "edit"))):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    log_operation(db, current_user, "update", "user", user.display_name or user.username, details="重置密码")
    return {"ok": True}


@router.put("/{user_id}/toggle-active")
def toggle_active(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_permission("settings", "edit"))):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    log_operation(db, current_user, "update", "user", user.display_name or user.username, details=f"{'禁用' if not user.is_active else '启用'}用户")
    return {"ok": True, "is_active": user.is_active}
