import json
import urllib.request
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_project import PocProject
from ..models.poc_project_log import PocProjectLog
from ..schemas.poc_project_log import PocProjectLogCreate, PocProjectLogUpdate, PocProjectLogOut
from ..middleware.auth import get_current_user, require_permission
from ..services.logger import log_operation
from ..models.user import User

router = APIRouter(prefix="/api/projects/{project_id}/logs", tags=["logs"])


@router.get("/", response_model=list[PocProjectLogOut])
def list_logs(project_id: str, db: Session = Depends(get_db), _=Depends(require_permission("project", "view"))):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    logs = db.query(PocProjectLog).filter(
        PocProjectLog.project_id == project_id, PocProjectLog.is_deleted == False
    ).order_by(PocProjectLog.log_date.desc()).all()
    return [PocProjectLogOut.model_validate(log) for log in logs]


@router.post("/", response_model=PocProjectLogOut, status_code=201)
def create_log(
    project_id: str,
    data: PocProjectLogCreate,
    db: Session = Depends(get_db),
    _=Depends(require_permission("project", "edit")),
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
        PocProjectLog.id == log_id, PocProjectLog.project_id == project_id, PocProjectLog.is_deleted == False
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")
    log.is_deleted = True
    log.deleted_at = datetime.utcnow()
    log.deleted_by = current_user.display_name or current_user.username
    db.commit()
    log_operation(db, current_user, "delete", "project_log", log.log_date.isoformat())
    return {"ok": True}


@router.post("/{log_id}/push")
def push_log(project_id: str, log_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id, PocProject.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.webhook_url:
        raise HTTPException(status_code=400, detail="项目未配置企业微信 Webhook 地址")

    log_entry = db.query(PocProjectLog).filter(
        PocProjectLog.id == log_id, PocProjectLog.project_id == project_id
    ).first()
    if not log_entry:
        raise HTTPException(status_code=404, detail="Log not found")

    # Build markdown message
    lines = [
        f"## 📋 {project.name} - 项目日志",
        f"**日期**：{log_entry.log_date.isoformat()}",
        f"**进度**：{log_entry.progress or '（无）'}",
        f"**问题与风险**：{log_entry.issues or '（无）'}",
        f"**下一步计划**：{log_entry.plan or '（无）'}",
        f"",
        f"> 推送人：{current_user.display_name or current_user.username}",
    ]
    payload = {
        "msgtype": "markdown",
        "markdown": {"content": "\n".join(lines)},
    }

    try:
        req = urllib.request.Request(
            project.webhook_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        if result.get("errcode") != 0:
            raise HTTPException(status_code=502, detail=f"企业微信返回错误: {result.get('errmsg', '未知错误')}")
        return {"ok": True, "msg": "推送成功"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"推送失败: {str(e)}")
