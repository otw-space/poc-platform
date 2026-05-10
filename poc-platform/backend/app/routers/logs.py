from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_project import PocProject
from ..models.poc_project_log import PocProjectLog
from ..schemas.poc_project_log import PocProjectLogCreate, PocProjectLogUpdate, PocProjectLogOut
from ..middleware.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/projects/{project_id}/logs", tags=["logs"])


@router.get("/", response_model=list[PocProjectLogOut])
def list_logs(project_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    logs = db.query(PocProjectLog).filter(PocProjectLog.project_id == project_id)\
        .order_by(PocProjectLog.log_date.desc()).all()
    return [PocProjectLogOut.model_validate(log) for log in logs]


@router.post("/", response_model=PocProjectLogOut, status_code=201)
def create_log(
    project_id: str,
    data: PocProjectLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    log = PocProjectLog(project_id=project_id, **data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return PocProjectLogOut.model_validate(log)


@router.put("/{log_id}", response_model=PocProjectLogOut)
def update_log(
    project_id: str,
    log_id: str,
    data: PocProjectLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(PocProjectLog).filter(
        PocProjectLog.id == log_id, PocProjectLog.project_id == project_id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(log, key, value)
    db.commit()
    db.refresh(log)
    return PocProjectLogOut.model_validate(log)


@router.delete("/{log_id}")
def delete_log(
    project_id: str,
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(PocProjectLog).filter(
        PocProjectLog.id == log_id, PocProjectLog.project_id == project_id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"ok": True}
