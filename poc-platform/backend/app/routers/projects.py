import os
import json
import uuid as uuid_lib
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_project import PocProject
from ..models.poc_option import PocOption
from ..schemas.poc_project import PocProjectCreate, PocProjectUpdate, PocProjectOut, PocProjectListOut
from ..services.holiday import calculate_workdays
from ..services.project import execute_dashboard_query
from ..services.logger import log_operation
from ..middleware.auth import get_current_user, require_permission
from ..schemas.dashboard import DashboardQueryRequest
from ..models.user import User

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("/", response_model=PocProjectListOut)
def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    name: str | None = None,
    region: str | None = None,
    city: str | None = None,
    sales: str | None = None,
    status_id: int | None = None,
    poc_type_id: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    _=Depends(require_permission("project", "view")),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(PocProject).filter(PocProject.is_deleted == False)
    if current_user.role != "admin":
        query = query.filter(PocProject.created_by == current_user.id)
    if name:
        query = query.filter(PocProject.name.like(f"%{name}%"))
    if region:
        query = query.filter(PocProject.region == region)
    if city:
        query = query.filter(PocProject.city == city)
    if sales:
        query = query.filter(PocProject.sales == sales)
    if status_id:
        query = query.filter(PocProject.status_id == status_id)
    if poc_type_id:
        query = query.filter(PocProject.poc_type_id == poc_type_id)
    if date_from:
        query = query.filter(PocProject.start_date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(PocProject.end_date <= date.fromisoformat(date_to))

    total = query.count()
    items = query.order_by(PocProject.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    for item in items:
        item.duration_days = calculate_workdays(item.start_date, item.end_date)

    return PocProjectListOut(
        items=[PocProjectOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}", response_model=PocProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), _=Depends(require_permission("project", "view")), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id, PocProject.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.duration_days = calculate_workdays(project.start_date, project.end_date)
    return PocProjectOut.model_validate(project)


@router.post("/", response_model=PocProjectOut, status_code=201)
def create_project(data: PocProjectCreate, db: Session = Depends(get_db), _=Depends(require_permission("project", "create")), current_user: User = Depends(get_current_user)):
    duration = calculate_workdays(data.start_date, data.end_date)
    project = PocProject(**data.model_dump(), duration_days=duration, created_by=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    log_operation(db, current_user, "create", "project", project.name)
    return PocProjectOut.model_validate(project)


@router.put("/{project_id}", response_model=PocProjectOut)
def update_project(project_id: str, data: PocProjectUpdate, db: Session = Depends(get_db), _=Depends(require_permission("project", "edit")), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)

    # Compute details for audit log
    field_labels = {
        "name": "项目名称", "region": "区域", "city": "城市", "sales": "销售",
        "pm": "项目经理", "start_date": "开始日期", "end_date": "完成日期",
        "poc_type_id": "PoC类型", "impl_method_id": "实施方式", "status_id": "状态",
        "result": "结果", "plan_file": "实施方案", "report_file": "总结报告",
    }
    # Resolve option IDs to labels for friendly display
    option_ids = set()
    for key in ("poc_type_id", "impl_method_id", "status_id"):
        val = update_data.get(key)
        if val is not None:
            option_ids.add(val)
            old_val = getattr(project, key, None)
            if old_val is not None:
                option_ids.add(old_val)
    id_to_label = {}
    if option_ids:
        options = db.query(PocOption).filter(PocOption.id.in_(option_ids)).all()
        id_to_label = {o.id: o.label for o in options}

    def format_val(key: str, val) -> str:
        if isinstance(val, date):
            return val.isoformat()
        if key in ("poc_type_id", "impl_method_id", "status_id"):
            return id_to_label.get(val, str(val))
        return str(val)

    changes = []
    for key, new_val in update_data.items():
        old_val = getattr(project, key, None)
        if key in ("plan_file", "report_file"):
            changes.append(f"{field_labels.get(key, key)}: 已更新")
        elif old_val != new_val:
            changes.append(f"{field_labels.get(key, key)}: {format_val(key, old_val)} → {format_val(key, new_val)}")

    for key, value in update_data.items():
        setattr(project, key, value)

    if "start_date" in update_data or "end_date" in update_data:
        project.duration_days = calculate_workdays(project.start_date, project.end_date)

    db.commit()
    db.refresh(project)
    details = "; ".join(changes) if changes else None
    log_operation(db, current_user, "update", "project", project.name, details=details)
    return PocProjectOut.model_validate(project)


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), _=Depends(require_permission("project", "delete")), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id, PocProject.is_deleted == False).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.is_deleted = True
    project.deleted_at = datetime.utcnow()
    project.deleted_by = current_user.display_name or current_user.username
    db.commit()
    log_operation(db, current_user, "delete", "project", project.name)
    return {"ok": True}


UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
ALLOWED_PLAN_EXT = {".doc", ".docx", ".pdf"}
ALLOWED_REPORT_EXT = {".ppt", ".pptx", ".pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024


def _ensure_upload_dir(project_id: str, file_type: str) -> str:
    path = os.path.join(UPLOAD_DIR, project_id, file_type)
    os.makedirs(path, exist_ok=True)
    return path


@router.post("/{project_id}/upload/{file_type}")
def upload_file(
    project_id: str,
    file_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if file_type not in ("plan", "report"):
        raise HTTPException(status_code=400, detail="file_type must be 'plan' or 'report'")
    allowed = ALLOWED_PLAN_EXT if file_type == "plan" else ALLOWED_REPORT_EXT
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")

    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = getattr(project, f"{file_type}_file", None)
    if existing:
        try:
            existing_data = json.loads(existing) if isinstance(existing, str) else existing
            old_path = os.path.join(UPLOAD_DIR, project_id, file_type, existing_data.get("stored_filename", ""))
            if os.path.exists(old_path):
                os.remove(old_path)
        except (json.JSONDecodeError, OSError):
            pass

    stored_name = str(uuid_lib.uuid4()) + ext
    save_dir = _ensure_upload_dir(project_id, file_type)
    save_path = os.path.join(save_dir, stored_name)

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    with open(save_path, "wb") as f:
        f.write(content)

    metadata = json.dumps({
        "original_filename": file.filename,
        "stored_filename": stored_name,
        "size": len(content),
        "uploaded_at": datetime.utcnow().isoformat(),
    })

    setattr(project, f"{file_type}_file", metadata)
    db.commit()
    return {"ok": True, "file": json.loads(metadata)}


@router.get("/{project_id}/download/{file_type}")
def download_file(
    project_id: str,
    file_type: str,
    inline: bool = Query(False),
    db: Session = Depends(get_db),
):
    if file_type not in ("plan", "report"):
        raise HTTPException(status_code=400, detail="file_type must be 'plan' or 'report'")

    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing = getattr(project, f"{file_type}_file", None)
    if not existing:
        raise HTTPException(status_code=404, detail="No file uploaded")

    try:
        metadata = json.loads(existing) if isinstance(existing, str) else existing
    except json.JSONDecodeError:
        raise HTTPException(status_code=404, detail="File metadata corrupted")

    file_path = os.path.join(UPLOAD_DIR, project_id, file_type, metadata["stored_filename"])
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    from urllib.parse import quote

    filename = metadata.get("original_filename", "download")
    ext = os.path.splitext(filename)[1].lower()

    MIME_TYPES = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }
    media_type = MIME_TYPES.get(ext, "application/octet-stream")

    disposition = "inline" if inline else "attachment"

    encoded_filename = quote(filename, safe='')
    content_disposition = f"{disposition}; filename*=UTF-8''{encoded_filename}"

    return FileResponse(
        file_path,
        media_type=media_type,
        headers={"Content-Disposition": content_disposition},
    )


@router.post("/query")
def query_data(data: DashboardQueryRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    results = execute_dashboard_query(db, data.x_field, data.y_field, [f.model_dump() for f in data.filters], aggregate=data.aggregate, filter_mode=data.filter_mode)
    return {"data": results}
