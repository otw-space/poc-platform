from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.diagram import Diagram
from ..models.user import User
from ..schemas.diagram import DiagramCreate, DiagramUpdate, DiagramOut
from ..middleware.auth import get_current_user
from ..services.logger import log_operation

router = APIRouter(prefix="/api/diagrams", tags=["diagrams"])


@router.get("/", response_model=list[DiagramOut])
def list_diagrams(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    diagrams = db.query(Diagram).filter(Diagram.is_deleted == False).order_by(Diagram.updated_at.desc()).all()
    return diagrams


@router.post("/", response_model=DiagramOut, status_code=201)
def create_diagram(data: DiagramCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    diagram = Diagram(name=data.name, data=data.data, created_by=current_user.id)
    db.add(diagram)
    db.commit()
    db.refresh(diagram)
    log_operation(db, current_user, "create", "diagram", diagram.name)
    return diagram


@router.get("/{diagram_id}", response_model=DiagramOut)
def get_diagram(diagram_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    diagram = db.query(Diagram).filter(Diagram.id == diagram_id, Diagram.is_deleted == False).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    return diagram


@router.put("/{diagram_id}", response_model=DiagramOut)
def update_diagram(diagram_id: str, data: DiagramUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    diagram = db.query(Diagram).filter(Diagram.id == diagram_id, Diagram.is_deleted == False).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    if data.name is not None:
        diagram.name = data.name
    if data.data is not None:
        diagram.data = data.data
    db.commit()
    db.refresh(diagram)
    log_operation(db, current_user, "update", "diagram", diagram.name)
    return diagram


@router.post("/{diagram_id}/copy", response_model=DiagramOut, status_code=201)
def copy_diagram(diagram_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    original = db.query(Diagram).filter(Diagram.id == diagram_id, Diagram.is_deleted == False).first()
    if not original:
        raise HTTPException(status_code=404, detail="Diagram not found")
    copy = Diagram(name=f"{original.name} (副本)", data=original.data, created_by=current_user.id)
    db.add(copy)
    db.commit()
    db.refresh(copy)
    log_operation(db, current_user, "create", "diagram", copy.name)
    return copy


@router.delete("/{diagram_id}")
def delete_diagram(diagram_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    diagram = db.query(Diagram).filter(Diagram.id == diagram_id, Diagram.is_deleted == False).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagram not found")
    diagram.is_deleted = True
    diagram.deleted_at = datetime.utcnow()
    diagram.deleted_by = current_user.display_name or current_user.username
    db.commit()
    log_operation(db, current_user, "delete", "diagram", diagram.name)
    return {"ok": True}
