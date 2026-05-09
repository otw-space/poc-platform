from fastapi import APIRouter, Depends, HTTPException, Query
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


@router.post("/query")
def query_data(data: DashboardQueryRequest, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    results = execute_dashboard_query(db, data.x_field, data.y_field, [f.model_dump() for f in data.filters])
    return {"data": results}
