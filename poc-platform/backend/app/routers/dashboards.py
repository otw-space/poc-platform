from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.dashboard import Dashboard
from ..models.user import User
from ..schemas.dashboard import DashboardCreate, DashboardUpdate, DashboardOut
from ..middleware.auth import get_current_user
from ..services.logger import log_operation

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])


@router.get("/", response_model=list[DashboardOut])
def list_dashboards(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(Dashboard)
        .filter((Dashboard.user_id == current_user.id) | (Dashboard.is_public == True))
        .order_by(Dashboard.updated_at.desc())
        .all()
    )


@router.get("/{dashboard_id}", response_model=DashboardOut)
def get_dashboard(dashboard_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id and not dashboard.is_public:
        raise HTTPException(status_code=403, detail="Access denied")
    return DashboardOut.model_validate(dashboard)


@router.post("/", response_model=DashboardOut, status_code=201)
def create_dashboard(data: DashboardCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dashboard = Dashboard(
        name=data.name,
        config=data.config.model_dump(),
        user_id=current_user.id,
        is_public=data.is_public,
    )
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    log_operation(db, current_user, "create", "dashboard", dashboard.name)
    return DashboardOut.model_validate(dashboard)


@router.put("/{dashboard_id}", response_model=DashboardOut)
def update_dashboard(dashboard_id: str, data: DashboardUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(dashboard, key, value)
    db.commit()
    db.refresh(dashboard)
    log_operation(db, current_user, "update", "dashboard", dashboard.name)
    return DashboardOut.model_validate(dashboard)


@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    dashboard_name = dashboard.name
    db.delete(dashboard)
    db.commit()
    log_operation(db, current_user, "delete", "dashboard", dashboard_name)
    return {"ok": True}
