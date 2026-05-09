from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_option import PocOption
from ..schemas.poc_option import PocOptionCreate, PocOptionUpdate, PocOptionOut
from ..middleware.auth import require_admin

router = APIRouter(prefix="/api/options", tags=["options"])


@router.get("/{category}", response_model=list[PocOptionOut])
def list_options(category: str, db: Session = Depends(get_db)):
    return (
        db.query(PocOption)
        .filter(PocOption.category == category)
        .order_by(PocOption.sort_order)
        .all()
    )


@router.post("/", response_model=PocOptionOut)
def create_option(data: PocOptionCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    option = PocOption(**data.model_dump())
    db.add(option)
    db.commit()
    db.refresh(option)
    return PocOptionOut.model_validate(option)


@router.put("/{option_id}", response_model=PocOptionOut)
def update_option(option_id: int, data: PocOptionUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    option = db.query(PocOption).filter(PocOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    if data.label is not None:
        option.label = data.label
    if data.sort_order is not None:
        option.sort_order = data.sort_order
    db.commit()
    db.refresh(option)
    return PocOptionOut.model_validate(option)


@router.delete("/{option_id}")
def delete_option(option_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    option = db.query(PocOption).filter(PocOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Option not found")
    if option.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default option")
    db.delete(option)
    db.commit()
    return {"ok": True}
