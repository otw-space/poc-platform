# RBAC 权限管理系统

**Goal:** 将平台从简单的 admin/user 二分角色升级为基于角色的权限控制（RBAC），支持自定义角色、细粒度权限分配。

**Architecture:** 新增 Role 和 RolePermission 两张数据库表，通过中间件层注入权限检查。前端实现角色管理 UI（权限矩阵）和菜单/路由级权限过滤。

**Tech Stack:** FastAPI + SQLAlchemy 2.0 + SQLite + React 18 + TypeScript + Ant Design 5

---

## 数据模型

### Role（角色表）
- id: UUID, PK
- name: String(50), unique, 角色名称
- description: Text, nullable, 角色描述
- is_super: Boolean, default False, 超级管理员标记（不可删除、不可编辑权限）
- created_at: DateTime

### RolePermission（角色权限表）
- id: Integer, PK, autoincrement
- role_id: String(36), FK → Role.id, 关联角色
- module: String(50), 模块标识
- action: String(50), 操作标识（view / create / edit / delete）

### User 表变更
- 新增 role_id: String(36), FK → Role.id, nullable
- 保留现有 role 字段（迁移后逐步废弃）

### 5 个模块 × 4 种操作 = 20 个权限项

| 模块标识 | 模块名称 | 可选操作 |
|---------|---------|---------|
| project | 项目管理 | view, create, edit, delete |
| dashboard | 数据仪表盘 | view, create, edit, delete |
| sop | SOP中心 | view, create, edit, delete |
| recycle_bin | 回收站 | view, create, edit, delete |
| settings | 系统设置 | view, create, edit, delete |

---

## 迁移策略

1. 自动创建「超级管理员」角色（is_super=True, 20项权限全选）
2. 自动创建「普通用户」角色（is_super=False, 仅有各模块 view 权限）
3. 现有 role='admin' 用户 → role_id = 超级管理员角色
4. 现有 role='user' 用户 → role_id = 普通用户角色
5. 超级管理员角色不可删除、不可修改权限配置

---

## 后端设计

### 新路由 /api/roles

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | /api/roles/ | settings:view | 列出所有角色及其权限 |
| POST | /api/roles/ | settings:create | 创建角色 + 权限 |
| PUT | /api/roles/{id} | settings:edit | 更新角色信息及权限 |
| DELETE | /api/roles/{id} | settings:delete | 删除角色（is_super 禁止删除） |

### 权限中间件

```python
def require_permission(module: str, action: str):
    """依赖注入：检查当前用户是否拥有指定模块的操作权限"""
    def checker(current_user = Depends(get_current_user), db = Depends(get_db)):
        if current_user.role_obj and current_user.role_obj.is_super:
            return current_user
        has = db.query(RolePermission).filter(
            RolePermission.role_id == current_user.role_id,
            RolePermission.module == module,
            RolePermission.action == action,
        ).first()
        if not has:
            raise HTTPException(403, "无此操作权限")
        return current_user
    return checker
```

### 现有路由权限替换

- 项目管理、仪表盘、SOP中心、回收站：`require_permission(module, "view/create/edit/delete")`
- 系统设置：`require_permission("settings", action)`
- 操作日志：`require_permission("settings", "view")`
- 不再使用 `require_admin`

### 用户 API 变更

- `POST /api/users/` — 参数 `role_id` 替代 `role`
- `GET /api/users/{id}/permissions` — 返回当前用户所有权限列表（供前端判断菜单显示）

---

## 前端设计

### Settings 新增 Tab：「角色管理」

- 角色列表表格：角色名称、描述、用户数、操作（编辑/删除）
- 新建角色按钮

### 角色编辑弹窗（权限矩阵）

- 角色名称 + 描述输入框
- 5 行 × 4 列 Checkbox 矩阵（模块 × 操作）
- 全选/全不选快捷按钮
- 超级管理员角色不显示编辑/删除按钮

### 用户管理改造

- 新建用户弹窗：角色下拉改为从 GET /api/roles/ 加载
- 用户列表「角色」列显示角色名称

### 菜单和路由权限控制

- AuthContext 新增 `permissions: string[]`（格式 `"module:action"`）
- 侧边栏菜单：根据 `module:view` 权限过滤
- 路由保护：无 `view` 权限返回 403 或首页
- 页面内按钮：根据 `create/edit/delete` 权限显示/隐藏

### 权限列表 API

- `GET /api/auth/me` 返回中增加 `permissions` 字段
- 前端启动时获取并缓存

---

## 验证项

1. 启动后端，确认 Role/RolePermission 表创建成功
2. 确认迁移自动创建两个默认角色
3. 确认现有 admin 用户拥有所有权限，现有 user 用户只有查看权限
4. 前端角色管理：新建角色、配置权限矩阵、删除角色
5. 前端用户管理：新建用户选择角色
6. 菜单过滤：不同角色看到不同菜单
7. 权限验证：无权限用户直接访问 API 返回 403
