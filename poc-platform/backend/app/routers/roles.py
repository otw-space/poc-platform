from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.role import Role, RolePermission
from ..models.user import User
from ..schemas.role import RoleCreate, RoleUpdate, RoleOut
from ..services.logger import log_operation
from ..middleware.auth import get_current_user, require_permission

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("/", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Role).order_by(Role.created_at.asc()).all()


@router.post("/", response_model=RoleOut, status_code=201)
def create_role(data: RoleCreate, db: Session = Depends(get_db), current_user=Depends(require_permission("settings", "edit"))):
    existing = db.query(Role).filter(Role.name == data.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Role name already exists")
    role = Role(name=data.name, description=data.description)
    db.add(role)
    db.flush()
    for p in data.permissions:
        db.add(RolePermission(role_id=role.id, module=p.module, action=p.action))
    db.commit()
    db.refresh(role)
    log_operation(db, current_user, "create", "role", role.name)
    return role


@router.put("/{role_id}", response_model=RoleOut)
def update_role(role_id: str, data: RoleUpdate, db: Session = Depends(get_db), current_user=Depends(require_permission("settings", "edit"))):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_super:
        raise HTTPException(status_code=403, detail="Cannot modify super admin role")
    changes = []
    if data.name is not None:
        existing = db.query(Role).filter(Role.name == data.name, Role.id != role_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Role name already exists")
        if data.name != role.name:
            changes.append(f"名称: {role.name} → {data.name}")
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.permissions is not None:
        old_count = len(role.permissions) if role.permissions else 0
        db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        for p in data.permissions:
            db.add(RolePermission(role_id=role_id, module=p.module, action=p.action))
        changes.append(f"权限: {old_count} → {len(data.permissions)} 项")
    db.commit()
    db.refresh(role)
    log_operation(db, current_user, "update", "role", role.name, details="; ".join(changes) if changes else None)
    return role


@router.delete("/{role_id}")
def delete_role(role_id: str, db: Session = Depends(get_db), current_user=Depends(require_permission("settings", "edit"))):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_super:
        raise HTTPException(status_code=403, detail="Cannot delete super admin role")
    # Unassign users with this role before deleting
    db.query(User).filter(User.role_id == role_id).update({User.role_id: None})
    log_operation(db, current_user, "delete", "role", role.name)
    db.delete(role)
    db.commit()
    return {"ok": True}
