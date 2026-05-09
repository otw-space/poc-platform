from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserOut, PasswordReset
from ..services.auth import hash_password, get_user_by_username
from ..middleware.auth import require_admin, get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
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


@router.put("/{user_id}/password")
def reset_password(user_id: str, data: PasswordReset, db: Session = Depends(get_db), _=Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"ok": True}


@router.put("/{user_id}/toggle-active")
def toggle_active(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot disable yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    return {"ok": True, "is_active": user.is_active}
