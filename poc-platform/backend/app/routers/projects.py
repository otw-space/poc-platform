import os
import json
import uuid as uuid_lib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_project import PocProject
from ..schemas.poc_project import PocProjectCreate, PocProjectUpdate, PocProjectOut, PocProjectListOut
from ..services.holiday import calculate_workdays
from ..services.project import execute_dashboard_query
from ..middleware.auth import get_current_user
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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(PocProject)
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

    total = query.count()
    items = query.order_by(PocProject.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PocProjectListOut(
        items=[PocProjectOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{project_id}", response_model=PocProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return PocProjectOut.model_validate(project)


@router.post("/", response_model=PocProjectOut, status_code=201)
def create_project(data: PocProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    duration = calculate_workdays(data.start_date, data.end_date)
    project = PocProject(**data.model_dump(), duration_days=duration, created_by=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return PocProjectOut.model_validate(project)


@router.put("/{project_id}", response_model=PocProjectOut)
def update_project(project_id: str, data: PocProjectUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)

    if "start_date" in update_data or "end_date" in update_data:
        project.duration_days = calculate_workdays(project.start_date, project.end_date)

    db.commit()
    db.refresh(project)
    return PocProjectOut.model_validate(project)


@router.delete("/{project_id}")
def delete_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(PocProject).filter(PocProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()
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
    is_pdf = filename.lower().endswith(".pdf")
    media_type = "application/pdf" if is_pdf else None
    disposition = "inline" if (inline and is_pdf) else "attachment"

    encoded_filename = quote(filename, safe='')
    content_disposition = f"{disposition}; filename*=UTF-8''{encoded_filename}"

    return FileResponse(
        file_path,
        media_type=media_type,
        headers={"Content-Disposition": content_disposition},
    )


@router.post("/query")
def query_data(data: DashboardQueryRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    results = execute_dashboard_query(db, data.x_field, data.y_field, [f.model_dump() for f in data.filters])
    return {"data": results}
