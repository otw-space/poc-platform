from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.dashboard import Dashboard
from ..models.user import User
from ..schemas.dashboard import DashboardCreate, DashboardUpdate, DashboardOut
from ..middleware.auth import get_current_user, require_permission
from ..services.logger import log_operation

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])


@router.get("/", response_model=list[DashboardOut])
def list_dashboards(db: Session = Depends(get_db), _=Depends(require_permission("dashboard", "view")), current_user: User = Depends(get_current_user)):
    return (
        db.query(Dashboard)
        .filter(Dashboard.is_deleted == False)
        .filter((Dashboard.user_id == current_user.id) | (Dashboard.is_public == True))
        .order_by(Dashboard.updated_at.desc())
        .all()
    )


@router.get("/{dashboard_id}", response_model=DashboardOut)
def get_dashboard(dashboard_id: str, db: Session = Depends(get_db), _=Depends(require_permission("dashboard", "view")), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.is_deleted == False).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id and not dashboard.is_public:
        raise HTTPException(status_code=403, detail="Access denied")
    return DashboardOut.model_validate(dashboard)


@router.delete("/{dashboard_id}/charts/{chart_id}")
def delete_chart(dashboard_id: str, chart_id: str, db: Session = Depends(get_db), _=Depends(require_permission("dashboard", "edit")), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.is_deleted == False).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    charts = dashboard.config.get("charts", [])
    chart = next((c for c in charts if c.get("id") == chart_id), None)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    chart_name = chart.get("title", "未命名图表")

    # Move chart from config to deleted_charts
    dashboard.config["charts"] = [c for c in charts if c.get("id") != chart_id]
    deleted = dashboard.deleted_charts or []
    deleted.append({
        **chart,
        "deleted_at": datetime.utcnow().isoformat(),
        "deleted_by": current_user.display_name or current_user.username,
    })
    dashboard.deleted_charts = deleted
    db.commit()
    log_operation(db, current_user, "delete", "chart", chart_name)
    return {"ok": True}


@router.post("/{dashboard_id}/charts/{chart_id}/restore")
def restore_chart(dashboard_id: str, chart_id: str, db: Session = Depends(get_db), _=Depends(require_permission("dashboard", "edit")), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.is_deleted == False).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    deleted = dashboard.deleted_charts or []
    chart = next((c for c in deleted if c.get("id") == chart_id), None)
    if not chart:
        raise HTTPException(status_code=404, detail="Chart not found")

    chart_name = chart.get("title", "未命名图表")

    # Move chart from deleted_charts back to config
    dashboard.deleted_charts = [c for c in deleted if c.get("id") != chart_id]
    restored = {k: v for k, v in chart.items() if k not in ("deleted_at", "deleted_by")}
    charts = dashboard.config.get("charts", [])
    charts.append(restored)
    dashboard.config["charts"] = charts
    db.commit()
    log_operation(db, current_user, "restore", "chart", chart_name)
    return {"ok": True}


@router.post("/", response_model=DashboardOut, status_code=201)
def create_dashboard(data: DashboardCreate, db: Session = Depends(get_db), _=Depends(require_permission("dashboard", "create")), current_user: User = Depends(get_current_user)):
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
def update_dashboard(dashboard_id: str, data: DashboardUpdate, db: Session = Depends(get_db), _=Depends(require_permission("dashboard", "edit")), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.is_deleted == False).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    update_data = data.model_dump(exclude_unset=True)
    changes = []
    for key, new_val in update_data.items():
        old_val = getattr(dashboard, key, None)
        if key == "config":
            continue  # Skip layout/position changes — too noisy
        elif key == "name" and old_val != new_val:
            changes.append(f"名称: {old_val} → {new_val}")
        elif key == "is_public" and old_val != new_val:
            changes.append(f"公开状态: {'是' if new_val else '否'}")
    for key, value in update_data.items():
        setattr(dashboard, key, value)
    db.commit()
    db.refresh(dashboard)
    if changes:
        log_operation(db, current_user, "update", "dashboard", dashboard.name, details="; ".join(changes))
    return DashboardOut.model_validate(dashboard)


@router.delete("/{dashboard_id}")
def delete_dashboard(dashboard_id: str, db: Session = Depends(get_db), _=Depends(require_permission("dashboard", "delete")), current_user: User = Depends(get_current_user)):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id, Dashboard.is_deleted == False).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    if dashboard.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    dashboard.is_deleted = True
    dashboard.deleted_at = datetime.utcnow()
    dashboard.deleted_by = current_user.display_name or current_user.username
    db.commit()
    log_operation(db, current_user, "delete", "dashboard", dashboard.name)
    return {"ok": True}
