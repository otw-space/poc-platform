# RBAC Permission Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace simple admin/user binary with role-based access control (RBAC) — custom roles, per-module × per-action permissions, role assignment on user creation.

**Architecture:** Two new models (Role, RolePermission) + new `/api/roles` router + `require_permission` middleware replacing `require_admin` + frontend role management UI with permission checkbox matrix + menu/route-level permission filtering.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + Pydantic v2 + React 18 + TypeScript + Ant Design 5

---

### Task 1: Backend models — Role and RolePermission

**Files:**
- Create: `poc-platform/backend/app/models/role.py`
- Modify: `poc-platform/backend/app/models/__init__.py`
- Modify: `poc-platform/backend/app/models/user.py:16` (add role_id FK)

- [ ] **Step 1: Create Role and RolePermission models**

```python
# poc-platform/backend/app/models/role.py
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..database import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_super: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    permissions: Mapped[list["RolePermission"]] = relationship(cascade="all, delete-orphan")
    users: Mapped[list["User"]] = relationship(back_populates="role_obj")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    role_id: Mapped[str] = mapped_column(String(36), ForeignKey("roles.id"), nullable=False, index=True)
    module: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
```

- [ ] **Step 2: Update User model to add role_id and relationship**

In `poc-platform/backend/app/models/user.py`, add after the `role` column line:

```python
role_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("roles.id"), nullable=True)
role_obj: Mapped["Role | None"] = relationship(back_populates="users")
```

Also add the `Role` import at the top of user.py (or use forward reference as shown above).

- [ ] **Step 3: Update models/__init__.py**

Add import in `poc-platform/backend/app/models/__init__.py`:

```python
from .role import Role, RolePermission
```

- [ ] **Step 4: Add migration entries**

In `poc-platform/backend/app/migration.py`, add `"roles"` and `"role_permissions"` to the `tables` list. Add `"users"` with `extra_cols` for `role_id`:

```python
tables = [..., "roles", "role_permissions", "users"]
extra_cols = {
    ...,
    "users": [("role_id", "VARCHAR(36)")],
}
```

Also add a `perform_data_migration` function that runs AFTER column additions to create default roles and assign existing users. Add at end of `run_migrations`:

```python
# Data migration: create default roles and assign users
_perform_data_migration(conn)
```

```python
def _perform_data_migration(conn):
    """Create default roles if they don't exist, and assign role_id to users."""
    import uuid

    # Check if roles table is empty
    count = conn.execute(text("SELECT COUNT(*) FROM roles")).scalar()
    if count > 0:
        return  # already migrated

    # Create super admin role
    super_role_id = str(uuid.uuid4())
    conn.execute(text(
        "INSERT INTO roles (id, name, description, is_super, created_at) "
        "VALUES (:id, '超级管理员', '系统内置超级管理员，拥有全部权限', 1, datetime('now'))"
    ), {"id": super_role_id})

    # Create 普通用户 role
    user_role_id = str(uuid.uuid4())
    conn.execute(text(
        "INSERT INTO roles (id, name, description, is_super, created_at) "
        "VALUES (:id, '普通用户', '默认普通用户，仅拥有各模块查看权限', 0, datetime('now'))"
    ), {"id": user_role_id})

    # Grant all permissions to super admin
    modules = ["project", "dashboard", "sop", "recycle_bin", "settings"]
    actions = ["view", "create", "edit", "delete"]
    for m in modules:
        for a in actions:
            conn.execute(text(
                "INSERT INTO role_permissions (role_id, module, action) VALUES (:rid, :m, :a)"
            ), {"rid": super_role_id, "m": m, "a": a})

    # Grant view-only permissions to 普通用户
    for m in modules:
        conn.execute(text(
            "INSERT INTO role_permissions (role_id, module, action) VALUES (:rid, :m, 'view')"
        ), {"rid": user_role_id, "m": m})

    # Assign existing users to roles
    conn.execute(text(
        "UPDATE users SET role_id = :rid WHERE role = 'admin'"
    ), {"rid": super_role_id})
    conn.execute(text(
        "UPDATE users SET role_id = :rid WHERE role = 'user'"
    ), {"rid": user_role_id})
    conn.commit()
```

- [ ] **Step 5: Commit**

```bash
git add poc-platform/backend/app/models/role.py poc-platform/backend/app/models/__init__.py poc-platform/backend/app/models/user.py poc-platform/backend/app/migration.py
git commit -m "feat: add Role and RolePermission models with migration"
```

---

### Task 2: Backend schemas for roles

**Files:**
- Create: `poc-platform/backend/app/schemas/role.py`

- [ ] **Step 1: Create role schemas**

```python
# poc-platform/backend/app/schemas/role.py
from pydantic import BaseModel


class RolePermissionOut(BaseModel):
    module: str
    action: str

    model_config = {"from_attributes": True}


class RoleCreate(BaseModel):
    name: str
    description: str | None = None
    permissions: list[RolePermissionOut] = []


class RoleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: list[RolePermissionOut] | None = None


class RoleOut(BaseModel):
    id: str
    name: str
    description: str | None = None
    is_super: bool
    permissions: list[RolePermissionOut] = []

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/backend/app/schemas/role.py
git commit -m "feat: add role Pydantic schemas"
```

---

### Task 3: Backend roles router

**Files:**
- Create: `poc-platform/backend/app/routers/roles.py`
- Modify: `poc-platform/backend/app/main.py:7,28`

- [ ] **Step 1: Create roles router**

```python
# poc-platform/backend/app/routers/roles.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.role import Role, RolePermission
from ..schemas.role import RoleCreate, RoleUpdate, RoleOut
from ..middleware.auth import get_current_user

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("/", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Role).order_by(Role.created_at.asc()).all()


@router.post("/", response_model=RoleOut, status_code=201)
def create_role(data: RoleCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
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
    return role


@router.put("/{role_id}", response_model=RoleOut)
def update_role(role_id: str, data: RoleUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_super:
        raise HTTPException(status_code=403, detail="Cannot modify super admin role")
    if data.name is not None:
        existing = db.query(Role).filter(Role.name == data.name, Role.id != role_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Role name already exists")
        role.name = data.name
    if data.description is not None:
        role.description = data.description
    if data.permissions is not None:
        db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()
        for p in data.permissions:
            db.add(RolePermission(role_id=role_id, module=p.module, action=p.action))
    db.commit()
    db.refresh(role)
    return role


@router.delete("/{role_id}")
def delete_role(role_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    if role.is_super:
        raise HTTPException(status_code=403, detail="Cannot delete super admin role")
    # Unassign users with this role
    from ..models.user import User
    db.query(User).filter(User.role_id == role_id).update({User.role_id: None})
    db.delete(role)
    db.commit()
    return {"ok": True}
```

- [ ] **Step 2: Register router in main.py**

In `poc-platform/backend/app/main.py`:
- Add `roles` to the import on line 7: `from .routers import auth, projects, options, dashboards, users, logs, audit_logs, sops, recycle_bin, roles`
- Add `app.include_router(roles.router)` after the existing router registrations (e.g., after line 28)

- [ ] **Step 3: Commit**

```bash
git add poc-platform/backend/app/routers/roles.py poc-platform/backend/app/main.py
git commit -m "feat: add roles CRUD router"
```

---

### Task 4: Permission middleware and auth/me update

**Files:**
- Modify: `poc-platform/backend/app/middleware/auth.py`
- Modify: `poc-platform/backend/app/routers/auth.py:24-25`
- Modify: `poc-platform/backend/app/schemas/user.py:11-17`

- [ ] **Step 1: Add require_permission helper and update UserOut**

In `poc-platform/backend/app/middleware/auth.py`, add after `require_admin`:

```python
from ..models.role import RolePermission


def require_permission(module: str, action: str):
    def checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        # Super admin role bypasses all checks
        if current_user.role_obj and current_user.role_obj.is_super:
            return current_user
        # Check specific permission
        has = db.query(RolePermission).filter(
            RolePermission.role_id == current_user.role_id,
            RolePermission.module == module,
            RolePermission.action == action,
        ).first()
        if not has:
            raise HTTPException(status_code=403, detail="无此操作权限")
        return current_user
    return checker
```

Also add `from sqlalchemy.orm import Session` import at top.

- [ ] **Step 2: Update UserOut schema to include role_id and role_name**

In `poc-platform/backend/app/schemas/user.py`:

```python
class UserOut(BaseModel):
    id: str
    username: str
    display_name: str
    role: str
    role_id: str | None = None
    role_name: str | None = None
    is_active: bool

    model_config = {"from_attributes": True}
```

- [ ] **Step 3: Update /auth/me to return permissions**

In `poc-platform/backend/app/routers/auth.py`, update the `/me` endpoint:

```python
from ..models.role import RolePermission

@router.get("/me")
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = UserOut.model_validate(current_user)
    if current_user.role_obj:
        result.role_name = current_user.role_obj.name
    return result
```

Also add a new endpoint to return current user's permissions:

```python
@router.get("/me/permissions")
def my_permissions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role_obj and current_user.role_obj.is_super:
        modules = ["project", "dashboard", "sop", "recycle_bin", "settings"]
        actions = ["view", "create", "edit", "delete"]
        return [f"{m}:{a}" for m in modules for a in actions]
    perms = db.query(RolePermission).filter(RolePermission.role_id == current_user.role_id).all()
    return [f"{p.module}:{p.action}" for p in perms]
```

- [ ] **Step 4: Commit**

```bash
git add poc-platform/backend/app/middleware/auth.py poc-platform/backend/app/schemas/user.py poc-platform/backend/app/routers/auth.py
git commit -m "feat: add require_permission middleware and permissions endpoint"
```

---

### Task 5: Update existing routers with permission checks

**Files:**
- Modify: `poc-platform/backend/app/routers/projects.py`
- Modify: `poc-platform/backend/app/routers/dashboards.py`
- Modify: `poc-platform/backend/app/routers/options.py`
- Modify: `poc-platform/backend/app/routers/users.py`
- Modify: `poc-platform/backend/app/routers/logs.py`
- Modify: `poc-platform/backend/app/routers/recycle_bin.py`
- Modify: `poc-platform/backend/app/routers/sops.py`
- Modify: `poc-platform/backend/app/routers/audit_logs.py`

- [ ] **Step 1: Replace require_admin → require_permission in each file**

Pattern: replace `from ..middleware.auth import require_admin` with `from ..middleware.auth import require_permission` and replace `Depends(require_admin)` with `Depends(require_permission("module", "action"))`.

**projects.py** — apply permission checks:
- GET list, GET detail: `require_permission("project", "view")`
- POST create: `require_permission("project", "create")`
- PUT update: `require_permission("project", "edit")`
- DELETE delete: `require_permission("project", "delete")`
- Project log endpoints: `require_permission("project", "view")`

**dashboards.py** — apply permission checks:
- GET list, GET detail: `require_permission("dashboard", "view")`
- POST create: `require_permission("dashboard", "create")`
- PUT update: `require_permission("dashboard", "edit")`
- DELETE dashboard, DELETE chart, POST restore: `require_permission("dashboard", "edit")`

**options.py** — replace `require_admin` with:
- GET list: open (no auth needed for reading options)
- POST create, PUT update, DELETE: `require_permission("settings", "edit")`

**users.py** — replace `require_admin` with:
- GET list, POST create, PUT reset_password, PUT toggle_active: `require_permission("settings", "edit")`

**logs.py** — apply permission checks:
- GET list, POST create, POST batch create: `require_permission("project", "view")` (or "project", "edit" for mutations)

**recycle_bin.py** — apply permission checks:
- GET list: `require_permission("recycle_bin", "view")`
- POST restore: `require_permission("recycle_bin", "edit")`
- DELETE permanent: `require_permission("recycle_bin", "delete")`

**sops.py** — apply permission checks:
- GET endpoints: `require_permission("sop", "view")`
- POST create/upload: `require_permission("sop", "create")`
- PUT update: `require_permission("sop", "edit")`
- DELETE: `require_permission("sop", "delete")`

**audit_logs.py** — replace `require_admin` with:
- GET list: `require_permission("settings", "view")`
- DELETE endpoints: `require_permission("settings", "edit")`

For each file, replace the import from `require_admin` to `require_permission`, and replace each usage accordingly. The exact diff will vary per file.

Example for `projects.py`:

```python
# replace: from ..middleware.auth import require_admin
# with:
from ..middleware.auth import require_permission

# replace: _=Depends(require_admin)
# with appropriate permission, e.g.:
def list_projects(..., _=Depends(require_permission("project", "view"))):
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/backend/app/routers/
git commit -m "feat: apply require_permission to all routers"
```

---

### Task 6: Update users router — role_id support

**Files:**
- Modify: `poc-platform/backend/app/routers/users.py`
- Modify: `poc-platform/backend/app/schemas/user.py:3-8`

- [ ] **Step 1: Update UserCreate schema to accept role_id**

In `poc-platform/backend/app/schemas/user.py`:

```python
class UserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    role: str = "user"  # kept for backward compat
    role_id: str | None = None
```

- [ ] **Step 2: Update users router create_user to use role_id**

In `poc-platform/backend/app/routers/users.py`, modify the `create_user` function to set `role_id`:

```python
@router.post("/", response_model=UserOut, status_code=201)
def create_user(data: UserCreate, db: Session = Depends(get_db), _=Depends(require_permission("settings", "edit"))):
    if get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
        role=data.role,
        role_id=data.role_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)
```

Also add `role_name` to user list response by including role_obj relationship in the response. Since UserOut uses model_validate, the role_name should be populated from the role_obj relationship.

Actually, since `role_name` is not a column on User, let's compute it in the response. In the list_users endpoint, add:

```python
@router.get("/", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_permission("settings", "edit"))):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        uo = UserOut.model_validate(u)
        if u.role_obj:
            uo.role_name = u.role_obj.name
        result.append(uo)
    return result
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/backend/app/routers/users.py poc-platform/backend/app/schemas/user.py
git commit -m "feat: support role_id in user creation"
```

---

### Task 7: Frontend API client — roles

**Files:**
- Create: `poc-platform/frontend/src/api/roles.ts`
- Modify: `poc-platform/frontend/src/api/auth.ts`
- Modify: `poc-platform/frontend/src/api/users.ts`

- [ ] **Step 1: Create roles API client**

```typescript
// poc-platform/frontend/src/api/roles.ts
import client from './client';

export interface RolePermission {
  module: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_super: boolean;
  permissions: RolePermission[];
}

export function getRoles() {
  return client.get<Role[]>('/roles/');
}

export function createRole(data: { name: string; description?: string; permissions: RolePermission[] }) {
  return client.post<Role>('/roles/', data);
}

export function updateRole(id: string, data: { name?: string; description?: string; permissions?: RolePermission[] }) {
  return client.put<Role>(`/roles/${id}`, data);
}

export function deleteRole(id: string) {
  return client.delete(`/roles/${id}`);
}
```

- [ ] **Step 2: Update auth.ts — add permissions field and fetchPermissions**

```typescript
// Add to poc-platform/frontend/src/api/auth.ts
export function getMyPermissions() {
  return client.get<string[]>('/auth/me/permissions');
}
```

Also add `role_id` and `role_name` to the User interface:

```typescript
export interface User {
  id: string;
  username: string;
  display_name: string;
  role: string;
  role_id?: string | null;
  role_name?: string | null;
  is_active: boolean;
}
```

- [ ] **Step 3: Update users.ts — change role to role_id in createUser**

```typescript
// Update createUser to accept role_id
export function createUser(data: { username: string; password: string; display_name: string; role_id: string }) {
  return client.post<User>('/users/', data);
}
```

- [ ] **Step 4: Commit**

```bash
git add poc-platform/frontend/src/api/roles.ts poc-platform/frontend/src/api/auth.ts poc-platform/frontend/src/api/users.ts
git commit -m "feat: add frontend roles API client and update auth/users APIs"
```

---

### Task 8: Frontend AuthContext — permissions

**Files:**
- Modify: `poc-platform/frontend/src/context/AuthContext.tsx`

- [ ] **Step 1: Add permissions to AuthContext**

```typescript
// poc-platform/frontend/src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getMe, getMyPermissions, type User } from '../api/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  isAdmin: boolean;
  permissions: string[];  // e.g. ["project:view", "project:create", ...]
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  setUser: () => {},
  isAdmin: false,
  permissions: [],
  hasPermission: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      Promise.all([getMe(), getMyPermissions()])
        .then(([userRes, permsRes]) => {
          setUser(userRes.data);
          setPermissions(permsRes.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const hasPermission = (module: string, action: string) => {
    return permissions.includes(`${module}:${action}`);
  };

  const isAdmin = !!user?.role_obj?.is_super || user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, setUser, isAdmin, permissions, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/frontend/src/context/AuthContext.tsx
git commit -m "feat: add permissions to AuthContext"
```

---

### Task 9: Frontend — Role management UI in Settings

**Files:**
- Modify: `poc-platform/frontend/src/pages/Settings.tsx`

- [ ] **Step 1: Add RoleManager component to Settings tabs**

In `poc-platform/frontend/src/pages/Settings.tsx`, add import:

```typescript
import { getRoles, createRole, updateRole, deleteRole, type Role, type RolePermission } from '../api/roles';
```

Add the "角色管理" tab to the Tabs items array:

```typescript
{ key: 'roles', label: '角色管理', children: <RoleManager /> },
```

- [ ] **Step 2: Implement RoleManager component**

The component should:

1. Fetch roles via `getRoles()` on mount
2. Show a Table with columns: 角色名称, 描述, 用户数 (from `role.users` or calculated), 操作
3. "新建角色" button opens a Modal
4. Edit/Delete buttons per row (hidden for is_super roles)

**Permission Matrix in the Modal:**

The Modal contains:
- Input for 角色名称
- Input for 描述
- A 5-row × 4-column table of Checkboxes:

```tsx
const MODULES = [
  { key: 'project', label: '项目管理' },
  { key: 'dashboard', label: '数据仪表盘' },
  { key: 'sop', label: 'SOP中心' },
  { key: 'recycle_bin', label: '回收站' },
  { key: 'settings', label: '系统设置' },
];
const ACTIONS = [
  { key: 'view', label: '查看' },
  { key: 'create', label: '新建' },
  { key: 'edit', label: '编辑' },
  { key: 'delete', label: '删除' },
];
```

Full implementation of RoleManager (~120 lines):

```tsx
function RoleManager() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [perms, setPerms] = useState<RolePermission[]>([]);

  const fetch = () => getRoles().then(r => setRoles(r.data));
  useEffect(() => { fetch(); }, []);

  const openCreate = () => {
    setEditingRole(null);
    setName('');
    setDesc('');
    setPerms([]);
    setModalOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setName(role.name);
    setDesc(role.description || '');
    setPerms([...role.permissions]);
    setModalOpen(true);
  };

  const handleSave = async () => {
    const data = { name, description: desc || undefined, permissions: perms };
    if (editingRole) {
      await updateRole(editingRole.id, data);
    } else {
      await createRole(data);
    }
    setModalOpen(false);
    fetch();
  };

  const handleDelete = async (id: string) => {
    await deleteRole(id);
    fetch();
  };

  const togglePerm = (module: string, action: string) => {
    setPerms(prev => {
      const exists = prev.some(p => p.module === module && p.action === action);
      if (exists) return prev.filter(p => !(p.module === module && p.action === action));
      return [...prev, { module, action }];
    });
  };

  const columns = [
    { title: '角色名称', dataIndex: 'name', key: 'name',
      render: (v: string, r: Role) => <span>{v} {r.is_super && <Tag color="blue">系统内置</Tag>}</span> },
    { title: '描述', dataIndex: 'description', key: 'description' },
    { title: '权限数', key: 'perm_count',
      render: (_: any, r: Role) => `${r.permissions.length} 项` },
    { title: '操作', key: 'actions',
      render: (_: any, r: Role) => {
        if (r.is_super) return <Tag>系统内置</Tag>;
        return (
          <Space>
            <a onClick={() => openEdit(r)}>编辑</a>
            <Popconfirm title="确认删除此角色？关联用户将失去角色。" onConfirm={() => handleDelete(r.id)}>
              <a style={{ color: '#ff4d4f' }}>删除</a>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ marginBottom: 16 }}>
        新建角色
      </Button>
      <Table rowKey="id" columns={columns} dataSource={roles} pagination={false} />
      <Modal title={editingRole ? '编辑角色' : '新建角色'} open={modalOpen}
        onOk={handleSave} onCancel={() => setModalOpen(false)} width={700}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <div style={{ marginBottom: 4 }}>角色名称</div>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="如：实施工程师" />
          </div>
          <div>
            <div style={{ marginBottom: 4 }}>描述</div>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="角色职责说明" />
          </div>
          <div>
            <div style={{ marginBottom: 8 }}>权限配置</div>
            <Space style={{ marginBottom: 8 }}>
              <Button size="small" onClick={() => {
                const all: RolePermission[] = [];
                MODULES.forEach(m => ACTIONS.forEach(a => all.push({ module: m.key, action: a.key })));
                setPerms(all);
              }}>全选</Button>
              <Button size="small" onClick={() => setPerms([])}>全不选</Button>
            </Space>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>模块</th>
                  {ACTIONS.map(a => (
                    <th key={a.key} style={{ padding: 8, borderBottom: '1px solid #f0f0f0', textAlign: 'center' }}>{a.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map(m => (
                  <tr key={m.key}>
                    <td style={{ padding: 8 }}>{m.label}</td>
                    {ACTIONS.map(a => (
                      <td key={a.key} style={{ padding: 8, textAlign: 'center' }}>
                        <input type="checkbox" checked={perms.some(p => p.module === m.key && p.action === a.key)}
                          onChange={() => togglePerm(m.key, a.key)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Space>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/frontend/src/pages/Settings.tsx
git commit -m "feat: add role management UI with permission matrix"
```

---

### Task 10: Frontend — Update user management to use role_id

**Files:**
- Modify: `poc-platform/frontend/src/pages/Settings.tsx` (UsersManager component)

- [ ] **Step 1: Update UsersManager**

In `UsersManager`:

1. Fetch roles on mount: `const [roles, setRoles] = useState<Role[]>([]);`
2. Replace the role Select with a Select that loads from roles list:

```tsx
// Replace: form.role with form.role_id
const [form, setForm] = useState({ username: '', password: '', display_name: '', role_id: '' });

// Fetch roles
useEffect(() => { getRoles().then(r => setRoles(r.data)); }, []);

// In Modal:
<Select
  value={form.role_id}
  onChange={(v) => setForm({ ...form, role_id: v })}
  options={roles.map(r => ({ label: r.name, value: r.id }))}
  style={{ width: '100%' }}
  placeholder="选择角色"
/>
```

3. Update the columns to show role name instead of role tag:

```tsx
{
  title: '角色', dataIndex: 'role_name', key: 'role',
  render: (v: string | null, r: User) => <Tag>{v || r.role_name || '未分配'}</Tag>,
}
```

4. Update createUser call to pass role_id:

```tsx
await createUser({ username: form.username, password: form.password, display_name: form.display_name, role_id: form.role_id });
```

- [ ] **Step 2: Commit**

```bash
git add poc-platform/frontend/src/pages/Settings.tsx
git commit -m "feat: update user management to use role_id from roles list"
```

---

### Task 11: Frontend — Menu and route permission filtering

**Files:**
- Modify: `poc-platform/frontend/src/components/Layout.tsx`
- Modify: `poc-platform/frontend/src/App.tsx`

- [ ] **Step 1: Filter sidebar menu by permissions**

In `Layout.tsx`, replace `isAdmin` with `hasPermission`:

```tsx
const { user, setUser, hasPermission } = useAuth();
```

Update `menuItems` to filter by view permission:

```tsx
const menuItems = [
  ...(hasPermission('project', 'view') ? [{ key: '/', icon: <HomeOutlined />, label: '数据概览' }] : []),
  ...(hasPermission('project', 'view') ? [{ key: '/projects', icon: <ProjectOutlined />, label: '项目管理' }] : []),
  ...(hasPermission('dashboard', 'view') ? [{ key: '/dashboards', icon: <DashboardOutlined />, label: '数据仪表盘' }] : []),
  ...(hasPermission('sop', 'view') ? [{ key: '/sop', icon: <BookOutlined />, label: 'SOP中心' }] : []),
  ...(hasPermission('recycle_bin', 'view') ? [{ key: '/recycle-bin', icon: <DeleteOutlined />, label: '回收站' }] : []),
  ...(hasPermission('settings', 'view') ? [{ key: '/settings', icon: <SettingOutlined />, label: '系统设置' }] : []),
];
```

- [ ] **Step 2: Add permission-based route guards in App.tsx**

Replace the `AdminRoute` component with a more general `PermissionRoute`:

```tsx
function PermissionRoute({ children, module, action = 'view' }: { children: React.ReactNode; module: string; action?: string }) {
  const { user, loading, hasPermission } = useAuth();
  if (loading) return <Spin style={{ display: 'block', margin: '200px auto' }} />;
  if (!user) return <Navigate to="/login" />;
  if (!hasPermission(module, action)) return <Navigate to="/" />;
  return <>{children}</>;
}
```

Then update the `/settings` route:

```tsx
<Route path="settings" element={<PermissionRoute module="settings"><Settings /></PermissionRoute>} />
```

- [ ] **Step 3: Commit**

```bash
git add poc-platform/frontend/src/components/Layout.tsx poc-platform/frontend/src/App.tsx
git commit -m "feat: filter menu and routes by permissions"
```

---

### Task 12: Integration verification

- [ ] **Step 1: Start backend and verify**

```bash
cd poc-platform/backend && python -m uvicorn app.main:app --reload
```

Verify:
- Backend starts without errors
- `/api/roles/` returns 2 default roles
- `/api/auth/me/permissions` returns permission list for current user
- Admin user can create/update/delete roles
- New user with custom role can only access permitted modules

- [ ] **Step 2: Start frontend and test**

```bash
cd poc-platform/frontend && npm run dev
```

Verify:
- Menu shows only permitted modules
- 系统设置 → 角色管理 tab visible for users with settings:view
- Can create/edit/delete roles with permission matrix
- User creation uses role dropdown
- Unpermissioned API calls return 403
- Super admin always has full access

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for RBAC system"
```
