from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_option import PocOption
from ..models.user import User
from ..schemas.poc_option import PocOptionCreate, PocOptionUpdate, PocOptionOut
from ..middleware.auth import require_permission
from ..services.logger import log_operation

router = APIRouter(prefix="/api/options", tags=["options"])


@router.get("/{category}", response_model=list[PocOptionOut])
def list_options(category: str, db: Session = Depends(get_db)):
    return (
        db.query(PocOption)
        .filter(PocOption.category == category, PocOption.is_deleted == False)
        .order_by(PocOption.sort_order)
        .all()
    )


@router.post("/", response_model=PocOptionOut)
def create_option(data: PocOptionCreate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("settings", "edit"))):
    option = PocOption(**data.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    log_operation(db, current_user, "create", "option", option.label)
    return PocOptionOut.model_validate(option)


@router.put("/{option_id}", response_model=PocOptionOut)
def update_option(option_id: int, data: PocOptionUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_permission("settings", "edit"))):
    option = db.query(PocOption).filter(PocOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    old_label = option.label
    if data.label is not None:
        option.label = data.label
    if data.sort_order is not None:
        option.sort_order = data.sort_order
    db.commit()
    db.refresh(option)
    details = f"标签: {old_label} → {option.label}" if data.label is not None and old_label != option.label else None
    log_operation(db, current_user, "update", "option", option.label, details=details)
    return PocOptionOut.model_validate(option)


@router.delete("/{option_id}")
def delete_option(option_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_permission("settings", "edit"))):
    option = db.query(PocOption).filter(PocOption.id == option_id, PocOption.is_deleted == False).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    if option.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default option")
    option.is_deleted = True
    option.deleted_at = datetime.utcnow()
    option.deleted_by = current_user.display_name or current_user.username
    db.commit()
    log_operation(db, current_user, "delete", "option", option.label)
    return {"ok": True}
