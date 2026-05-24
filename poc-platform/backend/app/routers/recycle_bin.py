from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.poc_project import PocProject
from ..models.dashboard import Dashboard
from ..models.poc_project_log import PocProjectLog
from ..models.poc_option import PocOption
from ..models.sop import SopDocument, TestCase, ScriptFile, TestCaseCategory
from ..models.diagram import Diagram
from ..models.user import User
from ..schemas.recycle_bin import RecycleBinItem, RecycleBinResponse
from ..middleware.auth import get_current_user, require_permission
from ..services.logger import log_operation

router = APIRouter(prefix="/api/recycle-bin", tags=["recycle-bin"])

TYPE_MAP = {
    "project": PocProject,
    "dashboard": Dashboard,
    "log": PocProjectLog,
    "option": PocOption,
    "sop_document": SopDocument,
    "test_case": TestCase,
    "script": ScriptFile,
    "sop_category": TestCaseCategory,
    "diagram": Diagram,
}


def _get_name(model, obj) -> str:
    if model is PocProjectLog:
        return f"日志 {obj.log_date.isoformat()}"
    if hasattr(obj, "name"):
        return obj.name
    if hasattr(obj, "label"):
        return obj.label
    if hasattr(obj, "title"):
        return obj.title
    return str(obj.id)


def _get_extra(model, obj) -> dict:
    extra = {}
    if model is PocProjectLog:
        extra["project_id"] = obj.project_id
    elif model is PocOption:
        extra["category"] = obj.category
    elif model is SopDocument:
        extra["category"] = obj.category
    elif model is TestCase:
        extra["category_id"] = obj.category_id
    return extra if extra else None


def _can_access(user: User, model, obj) -> bool:
    if user.role == "admin":
        return True
    if model is PocProject:
        return getattr(obj, "created_by", None) == user.id
    if model is Dashboard:
        return getattr(obj, "user_id", None) == user.id
    if model is PocProjectLog:
        return True
    if model is PocOption:
        return False
    # SOP items: users can access their own
    if getattr(obj, "created_by", None) == user.id:
        return True
    return False


@router.get("/", response_model=RecycleBinResponse)
def list_deleted_items(db: Session = Depends(get_db), _=Depends(require_permission("recycle_bin", "view")), current_user: User = Depends(get_current_user)):
    items: list[RecycleBinItem] = []

    for type_name, model in TYPE_MAP.items():
        query = db.query(model).filter(model.is_deleted == True)
        if current_user.role != "admin":
            if model is PocProject:
                query = query.filter(model.created_by == current_user.id)
            elif model is Dashboard:
                query = query.filter(model.user_id == current_user.id)
            elif model is PocOption:
                continue
            elif hasattr(model, 'created_by'):
                query = query.filter(model.created_by == current_user.id)
        for obj in query.order_by(model.deleted_at.desc()).all():
            # For SopDocument, use category-specific type
            actual_type = type_name
            if model is SopDocument:
                cat = getattr(obj, 'category', '')
                cat_map = {'sop': 'sop_sop', 'plan': 'sop_plan', 'report': 'sop_report'}
                actual_type = cat_map.get(cat, type_name)
            items.append(RecycleBinItem(
                id=str(obj.id),
                type=actual_type,
                name=_get_name(model, obj),
                deleted_at=obj.deleted_at,
                deleted_by=obj.deleted_by,
                extra=_get_extra(model, obj),
            ))

    # Collect deleted charts from dashboards
    chart_query = db.query(Dashboard).filter(Dashboard.deleted_charts != None)
    if current_user.role != "admin":
        chart_query = chart_query.filter(Dashboard.user_id == current_user.id)
    for dashboard in chart_query.all():
        for chart in (dashboard.deleted_charts or []):
            chart_type = chart.get("type", "column")
            items.append(RecycleBinItem(
                id=chart.get("id", ""),
                type="chart",
                name=chart.get("title", "未命名图表"),
                deleted_at=chart.get("deleted_at"),
                deleted_by=chart.get("deleted_by"),
                extra={"dashboard_id": dashboard.id, "dashboard_name": dashboard.name, "chart_type": chart_type},
            ))

    # Sort by deleted_at descending
    items.sort(key=lambda i: i.deleted_at, reverse=True)

    return RecycleBinResponse(items=items, total=len(items))


@router.post("/restore/{type}/{item_id}")
def restore_item(type: str, item_id: str, db: Session = Depends(get_db), _=Depends(require_permission("recycle_bin", "edit")), current_user: User = Depends(get_current_user)):
    if type == "chart":
        # Find the dashboard containing this deleted chart
        dashboard = db.query(Dashboard).filter(
            Dashboard.is_deleted == False
        ).all()
        found = None
        chart_data = None
        for d in dashboard:
            for c in (d.deleted_charts or []):
                if c.get("id") == item_id:
                    found = d
                    chart_data = c
                    break
            if found:
                break
        if not found:
            raise HTTPException(status_code=404, detail="Chart not found in recycle bin")
        if not _can_access(current_user, Dashboard, found):
            raise HTTPException(status_code=403, detail="Access denied")

        found.deleted_charts = [c for c in (found.deleted_charts or []) if c.get("id") != item_id]
        restored = {k: v for k, v in chart_data.items() if k not in ("deleted_at", "deleted_by")}
        charts = found.config.get("charts", [])
        charts.append(restored)
        found.config["charts"] = charts
        db.commit()
        log_operation(db, current_user, "restore", "chart", chart_data.get("title", "未命名图表"))
        return {"ok": True}

    # Map category-specific SOP types back to sop_document
    lookup_type = type
    if type in ('sop_sop', 'sop_plan', 'sop_report'):
        lookup_type = 'sop_document'

    model = TYPE_MAP.get(lookup_type)
    if not model:
        raise HTTPException(status_code=400, detail=f"Invalid type: {type}")

    obj = db.query(model).filter(model.id == item_id, model.is_deleted == True).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item not found in recycle bin")

    if not _can_access(current_user, model, obj):
        raise HTTPException(status_code=403, detail="Access denied")

    # Check for name conflict with existing non-deleted items
    obj_name = getattr(obj, 'name', None) or getattr(obj, 'title', None)
    if obj_name and hasattr(model, 'name'):
        existing = db.query(model).filter(
            model.name == obj_name, model.is_deleted == False
        ).first()
        if existing and existing.id != obj.id:
            obj.name = f"{obj_name}_恢复"
            db.flush()
        elif existing and existing.id == obj.id:
            pass  # same object, no conflict

    obj.is_deleted = False
    obj.deleted_at = None
    obj.deleted_by = None
    db.commit()
    log_operation(db, current_user, "restore", type, _get_name(model, obj))
    return {"ok": True}


@router.delete("/permanent/{type}/{item_id}")
def permanent_delete(type: str, item_id: str, db: Session = Depends(get_db), _=Depends(require_permission("recycle_bin", "delete")), current_user: User = Depends(get_current_user)):
    if type == "chart":
        dashboard = db.query(Dashboard).filter(
            Dashboard.is_deleted == False
        ).all()
        found = None
        chart_data = None
        for d in dashboard:
            for c in (d.deleted_charts or []):
                if c.get("id") == item_id:
                    found = d
                    chart_data = c
                    break
            if found:
                break
        if not found:
            raise HTTPException(status_code=404, detail="Chart not found in recycle bin")
        if not _can_access(current_user, Dashboard, found):
            raise HTTPException(status_code=403, detail="Access denied")

        found.deleted_charts = [c for c in (found.deleted_charts or []) if c.get("id") != item_id]
        db.commit()
        log_operation(db, current_user, "permanent_delete", "chart", chart_data.get("title", "未命名图表"))
        return {"ok": True}

    # Map category-specific SOP types back to sop_document
    lookup_type = type
    if type in ('sop_sop', 'sop_plan', 'sop_report'):
        lookup_type = 'sop_document'

    model = TYPE_MAP.get(lookup_type)
    if not model:
        raise HTTPException(status_code=400, detail=f"Invalid type: {type}")

    obj = db.query(model).filter(model.id == item_id, model.is_deleted == True).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Item not found in recycle bin")

    if not _can_access(current_user, model, obj):
        raise HTTPException(status_code=403, detail="Access denied")

    name = _get_name(model, obj)

    if model is PocProject:
        db.query(PocProjectLog).filter(PocProjectLog.project_id == item_id).delete()

    db.delete(obj)
    db.commit()
    log_operation(db, current_user, "permanent_delete", type, name)
    return {"ok": True}
