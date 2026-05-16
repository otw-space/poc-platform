from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.operation_log import OperationLog
from ..schemas.operation_log import OperationLogOut, OperationLogListOut
from ..middleware.auth import require_permission

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


@router.get("/", response_model=OperationLogListOut)
def list_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: str | None = None,
    target_type: str | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_permission("settings", "view")),
):
    query = db.query(OperationLog)
    if action:
        query = query.filter(OperationLog.action == action)
    if target_type:
        query = query.filter(OperationLog.target_type == target_type)

    total = query.count()
    items = query.order_by(OperationLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return OperationLogListOut(
        items=[OperationLogOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.delete("/all")
def clear_all_logs(db: Session = Depends(get_db), _=Depends(require_permission("settings", "edit"))):
    count = db.query(OperationLog).delete()
    db.commit()
    return {"ok": True, "count": count}


@router.delete("/batch/delete")
def batch_delete_logs(ids: list[int], db: Session = Depends(get_db), _=Depends(require_permission("settings", "edit"))):
    count = db.query(OperationLog).filter(OperationLog.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return {"ok": True, "count": count}


@router.delete("/{log_id}")
def delete_log(log_id: int, db: Session = Depends(get_db), _=Depends(require_permission("settings", "edit"))):
    log = db.query(OperationLog).filter(OperationLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    db.delete(log)
    db.commit()
    return {"ok": True}
